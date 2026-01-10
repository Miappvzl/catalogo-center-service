import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
      },
    }
  )

  // 1. Verificar Usuario
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // 2. Verificar Suscripción
  const { data: store } = await supabase
    .from('stores')
    .select('subscription_status, trial_ends_at')
    .eq('user_id', user.id)
    .single()

  if (store) {
    const isExpired = store.subscription_status === 'expired'
    // Verificamos si la fecha de prueba ya pasó
    const trialEnded = store.trial_ends_at ? new Date(store.trial_ends_at) < new Date() : false
    const isTrial = store.subscription_status === 'trial'

    // REGLA DE ORO: Si está expirado O (está en trial Y el tiempo se acabó) -> A LA CÁRCEL
    if (isExpired || (isTrial && trialEnded)) {
      redirect('/subscription')
    }
  }

  // Si todo está bien, dejamos pasar
  return (
    <>
      {children}
    </>
  )
}