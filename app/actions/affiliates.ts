// app/actions/affiliates.ts
'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'

async function getSupabaseServerClient() {
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

/**
 * 1. Verifica en tiempo real si un Código Único de Partner existe y qué beneficio otorga.
 */
export async function verifyPartnerCodeAction(rawCode: string) {
  const cleanCode = (rawCode || '').trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '')
  if (!cleanCode || cleanCode.length < 3) {
    return { valid: false, message: 'Ingresa un código válido (mín. 3 caracteres)' }
  }

  const supabase = await getSupabaseServerClient()
  const {
    data: { user }
  } = await supabase.auth.getUser()

  const { data: affiliate, error } = await supabase
    .from('saas_affiliates')
    .select('id, user_id, referral_code, discount_pct')
    .ilike('referral_code', cleanCode)
    .maybeSingle()

  if (error || !affiliate) {
    return { valid: false, message: 'Este código de socio no existe' }
  }

  if (user && affiliate.user_id === user.id) {
    return { valid: false, message: 'No puedes utilizar tu propio código de socio' }
  }

  return {
    valid: true,
    affiliateId: affiliate.id,
    code: affiliate.referral_code.toUpperCase(),
    discountPct: Number(affiliate.discount_pct || 0),
    message:
      Number(affiliate.discount_pct || 0) > 0
        ? `Código aplicado: ${affiliate.discount_pct}% de descuento en tu suscripción`
        : `Código de partner ${affiliate.referral_code.toUpperCase()} verificado`
  }
}

/**
 * 2. Canjea y vincula un Código Único de Partner al usuario actual (en Onboarding o en Suscripción).
 */
export async function redeemPartnerCodeAction(rawCode: string) {
  const verification = await verifyPartnerCodeAction(rawCode)
  if (!verification.valid || !verification.affiliateId) {
    return { success: false, message: verification.message }
  }

  const supabase = await getSupabaseServerClient()
  const {
    data: { user }
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, message: 'Debes iniciar sesión para aplicar un código' }
  }

  // Verificar si ya tiene un referido registrado
  const { data: existingRef } = await supabase
    .from('saas_referrals')
    .select('id, status')
    .eq('referred_user_id', user.id)
    .maybeSingle()

  if (existingRef?.status === 'converted') {
    return {
      success: false,
      message: 'Tu cuenta ya cuenta con una afiliación consolidada previamente'
    }
  }

  if (existingRef) {
    const { error: updateErr } = await supabase
      .from('saas_referrals')
      .update({ affiliate_id: verification.affiliateId })
      .eq('id', existingRef.id)

    if (updateErr) {
      return { success: false, message: 'No se pudo actualizar el código de socio' }
    }
  } else {
    const { error: insertErr } = await supabase.from('saas_referrals').insert({
      affiliate_id: verification.affiliateId,
      referred_user_id: user.id,
      status: 'pending'
    })

    if (insertErr) {
      return { success: false, message: 'No se pudo vincular el código de socio' }
    }
  }

  // Limpiamos cookie legacy si existiera
  const cookieStore = await cookies()
  cookieStore.delete('preziso_ref')

  revalidatePath('/subscription')
  revalidatePath('/admin/affiliates')

  return {
    success: true,
    code: verification.code,
    discountPct: verification.discountPct,
    message: verification.message
  }
}

/**
 * 3. Procesa el referido al finalizar el Onboarding (prioriza código manual escrito, fallback a cookie).
 */
export async function processReferral(userId: string, manualCode?: string) {
  const cookieStore = await cookies()
  const rawRefCode = manualCode?.trim() || cookieStore.get('preziso_ref')?.value

  if (!rawRefCode) {
    return { success: false, reason: 'no_code' }
  }

  const refCode = rawRefCode.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '')
  if (!refCode) {
    return { success: false, reason: 'empty_code' }
  }

  const supabase = await getSupabaseServerClient()

  const { data: affiliate, error: affError } = await supabase
    .from('saas_affiliates')
    .select('id, user_id, referral_code, discount_pct')
    .ilike('referral_code', refCode)
    .maybeSingle()

  if (affError || !affiliate) {
    return { success: false, reason: 'invalid_code' }
  }

  // Bloqueo estricto de auto-referido
  if (affiliate.user_id === userId) {
    return { success: false, reason: 'self_referral' }
  }

  const { data: existing } = await supabase
    .from('saas_referrals')
    .select('id')
    .eq('referred_user_id', userId)
    .maybeSingle()

  if (!existing) {
    const { error: insertError } = await supabase.from('saas_referrals').insert({
      affiliate_id: affiliate.id,
      referred_user_id: userId,
      status: 'pending'
    })

    if (insertError) {
      console.error('❌ Error insertando en saas_referrals:', insertError)
      return { success: false, reason: 'db_error' }
    }
  }

  cookieStore.delete('preziso_ref')
  return {
    success: true,
    code: affiliate.referral_code,
    discountPct: Number(affiliate.discount_pct || 0)
  }
}

/**
 * 4. Dispara la comisión cuando el referido activa/renueva su suscripción.
 */
export async function triggerCommission(userId: string) {
  const supabase = await getSupabaseServerClient()

  const { data: referral, error: refErr } = await supabase
    .from('saas_referrals')
    .select('id, affiliate_id, saas_affiliates(commission_amount)')
    .eq('referred_user_id', userId)
    .eq('status', 'pending')
    .maybeSingle()

  if (refErr || !referral) {
    return { success: false, error: refErr }
  }

  const { error: updateErr } = await supabase
    .from('saas_referrals')
    .update({ status: 'converted' })
    .eq('id', referral.id)

  if (updateErr) {
    throw new Error(`Error actualizando referido: ${updateErr.message}`)
  }

  // @ts-ignore
  const commissionAmount = Number(referral.saas_affiliates?.commission_amount ?? 5.0)

  const { error: commErr } = await supabase.from('saas_commissions').insert({
    affiliate_id: referral.affiliate_id,
    referral_id: referral.id,
    amount_usd: commissionAmount,
    status: 'unpaid'
  })

  if (commErr) {
    throw new Error(`Error creando comisión: ${commErr.message}`)
  }

  return { success: true }
}