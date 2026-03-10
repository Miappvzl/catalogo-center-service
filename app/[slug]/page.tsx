import { createClient } from '@/utils/supabaseServer'
import StoreInterface from '@/components/StoreInterface'
import { notFound } from 'next/navigation'
import { Rocket, Sparkles } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function StorePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()

  // 1. OBTENER TIENDA
  const { data: store } = await supabase
    .from('stores')
    .select('*, payment_config, shipping_config') 
    .eq('slug', slug)
    .single()

  if (!store) {
    return notFound()
  }

  // ------------------------------------------------------------------
  // 🛡️ EL ESCUDO DE REPUTACIÓN (LA LÓGICA DE CADUCIDAD)
  // ------------------------------------------------------------------
  const trialEnds = new Date(store.trial_ends_at)
  const now = new Date()
  const isExpired = store.subscription_status === 'trial' && trialEnds < now

  // Si está expirado, retornamos la pantalla del "OVNI/Cohete" y detenemos todo.
  // Cero queries extra a productos o configuraciones.
  if (isExpired) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex flex-col items-center justify-center p-6 text-center font-sans selection:bg-black selection:text-white relative overflow-hidden">
        
        {/* Fondo decorativo minimalista */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gray-200/40 rounded-full blur-3xl -z-10"></div>

        <div className="bg-white p-10 md:p-14 rounded-3xl border border-gray-200 shadow-sm max-w-md w-full relative z-10">
            {/* Animación del Cohete / OVNI */}
            <div className="w-20 h-20 bg-gray-50 border border-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-8 relative">
                <div className="absolute inset-0 bg-gray-100 rounded-2xl animate-ping opacity-50"></div>
                <Rocket size={32} strokeWidth={2} className="text-black relative z-10 -mt-1 -mr-1" />
                <Sparkles size={16} className="text-gray-400 absolute bottom-4 left-4" />
            </div>

            <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight mb-3">
                Mantenimiento
            </h1>
            <p className="text-gray-500 text-sm font-medium leading-relaxed">
                La tienda <b className="text-black">{store.name}</b> está recibiendo mejoras estructurales en su plataforma. 
            </p>
            
            <div className="mt-8 pt-6 border-t border-gray-100">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest animate-pulse">
                    Volveremos a estar en línea pronto
                </p>
            </div>
        </div>
      </div>
    )
  }
  // ------------------------------------------------------------------

  // 2. OBTENER PRODUCTOS (Solo se ejecuta si la tienda está al día)
  const { data: products } = await supabase
    .from('products')
    .select('*, product_variants(*)')
    .eq('user_id', store.user_id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  // 3. OBTENER TASAS
  const { data: rates } = await supabase
    .from('app_config')
    .select('*')
    .limit(1)
    .single()

  return (
    <StoreInterface 
      store={store} 
      products={products || []} 
      rates={rates || { usd_rate: 0, eur_rate: 0 }}
    />
  )
}