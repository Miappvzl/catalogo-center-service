'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'

const ADMIN_EMAIL = 'quanzosinc@gmail.com'

// Función auxiliar para crear el cliente de Supabase blindado en Server Actions
async function getSupabaseServerActionClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => 
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
}

// 1. Activar programa de afiliados para un usuario
export async function activateAffiliateProgram(storeSlug: string) {
  const supabase = await getSupabaseServerActionClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autorizado')

  // Generamos un código único basado en su tienda + un random corto
  const referralCode = `${storeSlug.toUpperCase()}${Math.floor(100 + Math.random() * 900)}`

  const { error } = await supabase.from('saas_affiliates').insert({
    user_id: user.id,
    referral_code: referralCode,
    discount_pct: 0,
    commission_amount: 5.00,
    payment_details: {}
  })

  if (error) {
    console.error("Error BD:", error)
    throw new Error('Error al activar el programa de afiliados. Intenta nuevamente.')
  }
  
  revalidatePath('/admin/affiliates')
  return { success: true }
}

// 2. Actualizar datos de Pago Móvil del afiliado
export async function updatePaymentDetails(details: { bank: string, phone: string, dni: string }) {
  const supabase = await getSupabaseServerActionClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autorizado')

  const { error } = await supabase.from('saas_affiliates')
    .update({ payment_details: details })
    .eq('user_id', user.id)

  if (error) throw new Error('Error al guardar los datos')
  
  revalidatePath('/admin/affiliates')
  return { success: true }
}

// 3. (GOD MODE) Liquidar comisión
export async function liquidateCommission(commissionId: string) {
  const supabase = await getSupabaseServerActionClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (user?.email !== ADMIN_EMAIL) throw new Error('Brecha de seguridad: Acceso denegado')

  // Blindaje de concurrencia: Verificamos que siga 'unpaid'
  const { data: current } = await supabase.from('saas_commissions').select('status').eq('id', commissionId).single()
  if (current?.status !== 'unpaid') throw new Error('Esta comisión ya fue pagada o no existe')

  const { error } = await supabase.from('saas_commissions')
    .update({ status: 'paid', paid_at: new Date().toISOString() })
    .eq('id', commissionId)

  if (error) throw new Error('Error al registrar el pago')
  return { success: true }
}

// 4. (GOD MODE) Cambiar el porcentaje de descuento que ofrece un afiliado
export async function updateAffiliateDiscount(affiliateId: string, discountPct: number) {
  const supabase = await getSupabaseServerActionClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (user?.email !== ADMIN_EMAIL) throw new Error('Acceso denegado')

  if (discountPct < 0 || discountPct > 100) throw new Error('Descuento no válido')

  const { error } = await supabase.from('saas_affiliates')
    .update({ discount_pct: discountPct })
    .eq('id', affiliateId)

  if (error) throw new Error('Error al actualizar el descuento')
  revalidatePath('/boss/affiliates')
  revalidatePath('/admin/affiliates')
  return { success: true }
}