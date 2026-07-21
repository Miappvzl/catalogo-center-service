'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// 1. Vincula al usuario con el afiliado al momento de crear la tienda
export async function processReferral(userId: string) {
  const cookieStore = await cookies()
  const refCode = cookieStore.get('preziso_ref')?.value

  if (!refCode) return { success: false, reason: 'no_cookie' }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() } } }
  )

  // Buscamos si el código de afiliado existe
  const { data: affiliate } = await supabase
    .from('saas_affiliates')
    .select('id')
    .eq('referral_code', refCode)
    .single()

  if (!affiliate) return { success: false, reason: 'invalid_code' }

  // Registramos el referido como pendiente
  const { error } = await supabase.from('saas_referrals').insert({
    affiliate_id: affiliate.id,
    referred_user_id: userId,
    status: 'pending'
  })

  if (!error) {
    // Limpiamos la cookie para no generar referidos duplicados en el futuro
    cookieStore.delete('preziso_ref')
    return { success: true }
  }

  return { success: false, error }
}

// 2. Dispara la comisión cuando tú apruebas el primer pago en el God Mode
export async function triggerCommission(userId: string) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() } } }
  )

  // Buscamos si este usuario era un referido pendiente
  const { data: referral } = await supabase
    .from('saas_referrals')
    .select('id, affiliate_id, saas_affiliates(commission_amount)')
    .eq('referred_user_id', userId)
    .eq('status', 'pending')
    .single()

  if (!referral) return { success: false, reason: 'no_pending_referral' }

  // 1. Marcamos al referido como convertido (ya pagó)
  await supabase
    .from('saas_referrals')
    .update({ status: 'converted' })
    .eq('id', referral.id)

  // 2. Generamos la deuda a favor del afiliado
  // @ts-ignore - Supabase tipa las relaciones anidadas como arrays u objetos dependiendo del esquema
  const commissionAmount = referral.saas_affiliates?.commission_amount || 0

  const { error } = await supabase.from('saas_commissions').insert({
    affiliate_id: referral.affiliate_id,
    referral_id: referral.id,
    amount_usd: commissionAmount,
    status: 'unpaid'
  })

  return { success: !error }
}