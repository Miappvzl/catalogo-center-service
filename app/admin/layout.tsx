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

  // ------------------------------------------------------------------
  // 🛡️ INTERCEPCIÓN B: Modo de Solo Lectura (Look but don't touch)
  // ------------------------------------------------------------------
  const targetDateString = store.subscription_ends_at || store.trial_ends_at;
  const expirationDate = targetDateString ? new Date(targetDateString) : new Date();
  const now = new Date();

  // Evaluamos si está vencido. ¡Ya NO hacemos redirect!
  const isExpired = expirationDate < now || store.subscription_status === 'expired';
  // ------------------------------------------------------------------

  return (
    <div className="flex min-h-screen bg-[#F8F9FA] selection:bg-black selection:text-white relative">
      {/* Pasamos la tienda y el estado de expiración a la navegación */}
     <AdminNavigation store={store} />
      
      <div className="flex-1 lg:ml-64 relative z-10 flex flex-col h-screen overflow-hidden">
        
       

        {/* 🚀 EL MAGICO CAMPO DE FUERZA (Fieldset) */}
        <div className="flex-1 overflow-y-auto">
            <fieldset 
                disabled={isExpired} 
                className={`min-h-full ${isExpired ? 'opacity-80 grayscale-[30%]' : ''}`}
            >
                {children}
            </fieldset>
        </div>

      </div>
    </div>
  )
}