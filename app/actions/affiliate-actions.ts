// app/actions/affiliate-actions.ts
'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'

const ADMIN_EMAIL = 'quanzosinc@gmail.com'

async function getSupabaseServerActionClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        }
      }
    }
  )
}

function sanitizePartnerCode(raw: string): string {
  return (raw || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, '')
    .slice(0, 20)
}

// 1. Activar programa de afiliados generando un código limpio o personalizado
export async function activateAffiliateProgram(storeSlug: string, customCode?: string) {
  const supabase = await getSupabaseServerActionClient()

  const {
    data: { user }
  } = await supabase.auth.getUser()
  if (!user) throw new Error('No autorizado')

  const baseClean = sanitizePartnerCode(customCode || storeSlug) || 'SOCIO'
  let candidateCode = customCode
    ? baseClean
    : `${baseClean.slice(0, 12)}${Math.floor(10 + Math.random() * 90)}`

  if (candidateCode.length < 3) {
    candidateCode = `${candidateCode}${Math.floor(100 + Math.random() * 900)}`
  }

  const { data: existing } = await supabase
    .from('saas_affiliates')
    .select('id')
    .ilike('referral_code', candidateCode)
    .maybeSingle()

  if (existing) {
    if (customCode) {
      throw new Error(`El código "${candidateCode}" ya está en uso por otro socio. Elige otro.`)
    }
    candidateCode = `${baseClean.slice(0, 10)}${Math.floor(100 + Math.random() * 900)}`
  }

  const { error } = await supabase.from('saas_affiliates').insert({
    user_id: user.id,
    referral_code: candidateCode,
    discount_pct: 0,
    commission_amount: 5.0,
    payment_details: {}
  })

  if (error) {
    throw new Error('Error al activar tu código de socio. Intenta nuevamente.')
  }

  revalidatePath('/admin/affiliates')
  return { success: true, code: candidateCode }
}

// 2. Permitir al Partner personalizar su propio Código Único
export async function updateMyPartnerCode(newRawCode: string) {
  const supabase = await getSupabaseServerActionClient()

  const {
    data: { user }
  } = await supabase.auth.getUser()
  if (!user) throw new Error('No autorizado')

  const cleanCode = sanitizePartnerCode(newRawCode)
  if (cleanCode.length < 3 || cleanCode.length > 20) {
    throw new Error('El código debe tener entre 3 y 20 caracteres (letras o números).')
  }

  const { data: duplicate } = await supabase
    .from('saas_affiliates')
    .select('id, user_id')
    .ilike('referral_code', cleanCode)
    .maybeSingle()

  if (duplicate && duplicate.user_id !== user.id) {
    throw new Error(`El código "${cleanCode}" ya pertenece a otro socio. Prueba uno distinto.`)
  }

  const { error } = await supabase
    .from('saas_affiliates')
    .update({ referral_code: cleanCode })
    .eq('user_id', user.id)

  if (error) {
    throw new Error('No se pudo actualizar tu código. Intenta nuevamente.')
  }

  revalidatePath('/admin/affiliates')
  revalidatePath('/boss/affiliates')
  return { success: true, code: cleanCode }
}

// 3. Actualizar datos de Pago Móvil del afiliado
export async function updatePaymentDetails(details: {
  bank: string
  phone: string
  dni: string
}) {
  const supabase = await getSupabaseServerActionClient()

  const {
    data: { user }
  } = await supabase.auth.getUser()
  if (!user) throw new Error('No autorizado')

  const { error } = await supabase
    .from('saas_affiliates')
    .update({ payment_details: details })
    .eq('user_id', user.id)

  if (error) throw new Error('Error al guardar los datos')

  revalidatePath('/admin/affiliates')
  return { success: true }
}

// 4. (GOD MODE) Liquidar comisión
export async function liquidateCommission(commissionId: string) {
  const supabase = await getSupabaseServerActionClient()

  const {
    data: { user }
  } = await supabase.auth.getUser()
  if (user?.email !== ADMIN_EMAIL) throw new Error('Brecha de seguridad: Acceso denegado')

  const { data: current } = await supabase
    .from('saas_commissions')
    .select('status')
    .eq('id', commissionId)
    .single()
  if (current?.status !== 'unpaid')
    throw new Error('Esta comisión ya fue pagada o no existe')

  const { error } = await supabase
    .from('saas_commissions')
    .update({ status: 'paid', paid_at: new Date().toISOString() })
    .eq('id', commissionId)

  if (error) throw new Error('Error al registrar el pago')
  revalidatePath('/boss/affiliates')
  revalidatePath('/admin/affiliates')
  return { success: true }
}

// 5. (GOD MODE) Actualizar estrategia completa de un Partner (Código Único, % Descuento y $ Comisión)
export async function updateAffiliateDiscount(
  affiliateId: string,
  discountPct: number,
  customCode?: string,
  commissionAmount?: number
) {
  const supabase = await getSupabaseServerActionClient()

  const {
    data: { user }
  } = await supabase.auth.getUser()
  if (user?.email !== ADMIN_EMAIL) throw new Error('Acceso denegado')

  if (discountPct < 0 || discountPct > 100) throw new Error('Descuento no válido (0 a 100%)')

  const updatePayload: Record<string, any> = {
    discount_pct: discountPct
  }

  if (commissionAmount !== undefined && !isNaN(commissionAmount) && commissionAmount >= 0) {
    updatePayload.commission_amount = commissionAmount
  }

  if (customCode !== undefined) {
    const cleanCode = sanitizePartnerCode(customCode)
    if (cleanCode.length < 3) {
      throw new Error('El código debe tener al menos 3 caracteres.')
    }

    const { data: existing } = await supabase
      .from('saas_affiliates')
      .select('id')
      .ilike('referral_code', cleanCode)
      .neq('id', affiliateId)
      .maybeSingle()

    if (existing) {
      throw new Error(`El código "${cleanCode}" ya está asignado a otro socio.`)
    }

    updatePayload.referral_code = cleanCode
  }

  const { error } = await supabase
    .from('saas_affiliates')
    .update(updatePayload)
    .eq('id', affiliateId)

  if (error) throw new Error('Error al actualizar la configuración del socio')
  revalidatePath('/boss/affiliates')
  revalidatePath('/admin/affiliates')
  return { success: true }
}