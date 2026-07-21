'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function processReferral(userId: string) {
  const cookieStore = await cookies()
  const rawRefCode = cookieStore.get('preziso_ref')?.value

  console.log('=== [AFILIADOS DIAGNÓSTICO] ===')
  console.log('1. User ID:', userId)
  console.log('2. Cookie preziso_ref encontrada:', rawRefCode)

  if (!rawRefCode) {
    console.log('❌ Proceso abortado: No existe la cookie preziso_ref')
    return { success: false, reason: 'no_cookie' }
  }

  const refCode = rawRefCode.trim().toUpperCase()

  const supabase = createServerClient(
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

  // Buscamos si el código de afiliado existe (insensible a mayúsculas)
  const { data: affiliate, error: affError } = await supabase
    .from('saas_affiliates')
    .select('id')
    .ilike('referral_code', refCode)
    .single()

  if (affError || !affiliate) {
    console.log('❌ Proceso abortado: Código de afiliado no encontrado en BD:', refCode, affError)
    return { success: false, reason: 'invalid_code' }
  }

  console.log('3. Afiliado encontrado ID:', affiliate.id)

  // Registramos el referido como pendiente
  const { error: insertError } = await supabase.from('saas_referrals').insert({
    affiliate_id: affiliate.id,
    referred_user_id: userId,
    status: 'pending'
  })

  if (insertError) {
    console.error('❌ Error crítico insertando en saas_referrals:', insertError)
    throw new Error(`Error BD Referidos: ${insertError.message}`)
  }

  console.log('✅ ¡Referido insertado con éxito en saas_referrals!')

  // Limpiamos la cookie
  cookieStore.delete('preziso_ref')
  return { success: true }
}

export async function triggerCommission(userId: string) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
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

  const { data: referral, error: refErr } = await supabase
    .from('saas_referrals')
    .select('id, affiliate_id, saas_affiliates(commission_amount)')
    .eq('referred_user_id', userId)
    .eq('status', 'pending')
    .single()

  if (refErr || !referral) {
    console.log('No hay referidos pendientes para este usuario:', userId)
    return { success: false }
  }

  await supabase
    .from('saas_referrals')
    .update({ status: 'converted' })
    .eq('id', referral.id)

  // @ts-ignore
  const commissionAmount = referral.saas_affiliates?.commission_amount || 5.00

  const { error: commErr } = await supabase.from('saas_commissions').insert({
    affiliate_id: referral.affiliate_id,
    referral_id: referral.id,
    amount_usd: commissionAmount,
    status: 'unpaid'
  })

  if (commErr) {
    console.error('Error insertando comisión:', commErr)
    throw new Error(`Error BD Comisión: ${commErr.message}`)
  }

  return { success: true }
}