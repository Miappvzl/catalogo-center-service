import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import AdminNavigation from '@/components/admin/AdminNavigation'


export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() } } }
  )

  // 1. Verificación de Usuario
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // 2. Verificación de Tienda (Filtro maestro)
  const { data: store } = await supabase
    .from('stores')
    .select('*')
    .eq('user_id', user.id)
    .single()

  // INTERCEPCIÓN A: Si no tiene tienda, al onboarding directo sin parpadeos.
  if (!store) {
    redirect('/onboarding')
  }

  // INTERCEPCIÓN B: Muro de pago
  const trialEnds = new Date(store.trial_ends_at)
  const now = new Date()
  if (store.subscription_status === 'trial' && trialEnds < now) {
    redirect('/subscription')
  }

  return (
    <div className="flex min-h-screen bg-[#F8F9FA] selection:bg-black selection:text-white">
      {/* Pasamos la tienda validada a la navegación */}
      <AdminNavigation store={store} />
      
      {/* El contenido de la página se inyecta aquí */}
      <div className="flex-1 lg:ml-64 relative z-10">
        {children}
        
      </div>
    </div>
  )
}