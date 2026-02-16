import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { 
  Plus, 
  Package, 
  Settings, 
  ExternalLink, 
  TrendingUp, 
  AlertTriangle, 
  ChevronRight, 
  ShoppingBag, 
  Layers, 
  MessageCircle, 
  Clock 
} from 'lucide-react'
import RateWidget from '@/components/admin/RateWidget'

export default async function AdminDashboard() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
      },
    }
  )

  // 1. Verificación de Sesión
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/auth/login')
  }

  // 2. Carga de Datos Paralela (Bleeding Edge Performance)
  const today = new Date().toISOString().split('T')[0]
  
  const [storeRes, productsRes, variantsRes, ordersRes, configRes] = await Promise.all([
    // Tienda (Necesitamos currency_type)
    supabase.from('stores').select('*').eq('user_id', user.id).single(),
    
    // Productos
    supabase.from('products').select('*', { count: 'exact' }).order('created_at', { ascending: false }).limit(4),
    
    // Stock
    supabase.from('product_variants').select('stock'),
    
    // Pedidos
    supabase.from('orders').select('status, total_usd, created_at'),
    
    // Configuración Global (Tasas BCV)
    supabase.from('app_config').select('usd_rate, eur_rate, updated_at').eq('id', 1).single()
  ])

  // 3. Procesamiento de Datos
  const store = storeRes.data
  const recentProducts = productsRes.data || []
  const totalProducts = productsRes.count || 0
  
  // KPI Logic
  const lowStock = variantsRes.data?.filter(v => v.stock <= 3).length || 0
  const pendingOrders = ordersRes.data?.filter(o => o.status === 'pending').length || 0
  const salesToday = ordersRes.data
    ?.filter(o => o.created_at.startsWith(today) && o.status !== 'cancelled')
    .reduce((acc, o) => acc + Number(o.total_usd), 0) || 0

  // 4. Preparación de datos para el Widget de Moneda
  // Si no hay configuración en BD, usamos fallbacks seguros para evitar crashes
  const usdRate = configRes.data?.usd_rate ?? 0
  const eurRate = configRes.data?.eur_rate ?? 0
  const lastUpdated = configRes.data?.updated_at ?? null
  const storeCurrency = store?.currency_type === 'eur' ? 'eur' : 'usd' // Default to USD

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-20 font-sans text-gray-900 selection:bg-black selection:text-white">
      
      {/* HEADER */}
      <header className="bg-white border-b border-gray-100 px-6 py-8 md:px-12 md:py-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="flex items-center gap-5">
                <div className="w-16 h-16 rounded-2xl bg-gray-900 flex items-center justify-center shadow-xl shadow-gray-900/10 overflow-hidden border-4 border-white">
                    {store?.logo_url ? (
                        <img src={store.logo_url} className="w-full h-full object-contain bg-white" alt="Logo" />
                    ) : (
                        <ShoppingBag className="text-white" size={24} />
                    )}
                </div>
                <div>
                    <h1 className="text-2xl md:text-3xl font-black tracking-tight text-gray-900">
                      Hola, {store?.name || 'Admin'}
                    </h1>
                    <p className="text-sm font-medium text-gray-400">
                      Panel de Control &bull; {new Date().toLocaleDateString('es-VE', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </p>
                </div>
            </div>

            <div className="flex gap-3">
                 <Link 
                    href={`/${store?.slug || ''}`} 
                    target="_blank"
                    className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 rounded-full text-sm font-bold text-gray-600 hover:border-black hover:text-black transition-all shadow-sm"
                 >
                    <ExternalLink size={16}/> <span className="hidden md:inline">Ver Tienda</span>
                 </Link>
                 <Link 
                    href="/admin/settings" 
                    className="flex items-center gap-2 px-5 py-2.5 bg-gray-100 border border-transparent rounded-full text-sm font-bold text-gray-600 hover:bg-gray-200 transition-all"
                    title="Ajustes"
                 >
                    <Settings size={16}/>
                 </Link>
            </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 md:px-12 py-10 space-y-12">
        
        {/* SECCIÓN 1: KPIs y CONTROL MONETARIO */}
        {/* Usamos grid-dense para que el widget se acomode perfectamente */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 auto-rows-fr">
            
            {/* WIDGET DE TASA (Ahora ocupa 1 columna y tiene la misma altura/estilo) */}
            <div className="lg:col-span-1 row-span-1">
                <RateWidget 
                    storeCurrency={storeCurrency} 
                    usdRate={usdRate} 
                    eurRate={eurRate} 
                    lastUpdated={lastUpdated} 
                />
            </div>

             {/* Card 1: Pedidos Pendientes */}
            <Link href="/admin/orders" className="group bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-between h-48 hover:border-yellow-400 transition-colors relative overflow-hidden lg:col-span-1">
                {pendingOrders > 0 && <div className="absolute top-0 right-0 w-16 h-16 bg-yellow-400/10 blur-2xl rounded-full -mr-8 -mt-8"></div>}
                <div className="flex justify-between items-start">
                    <div className={`p-3 rounded-2xl ${pendingOrders > 0 ? 'bg-yellow-50 text-yellow-600' : 'bg-gray-50 text-gray-400'}`}>
                        <Clock size={24} />
                    </div>
                    {pendingOrders > 0 && <span className="flex h-3 w-3 relative"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-yellow-500"></span></span>}
                </div>
                <div>
                    <p className={`text-4xl font-black tracking-tight ${pendingOrders > 0 ? 'text-gray-900' : 'text-gray-400'}`}>{pendingOrders}</p>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest group-hover:text-yellow-600 transition-colors mt-1">Pedidos Pendientes</p>
                </div>
            </Link>

            {/* Card 2: Ventas Hoy */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-between h-48 lg:col-span-1">
                <div className="flex justify-between items-start">
                    <div className="p-3 rounded-2xl bg-green-50 text-green-600">
                        <TrendingUp size={24} />
                    </div>
                </div>
                <div>
                    <p className="text-4xl font-black tracking-tight text-gray-900">${salesToday.toFixed(0)}</p>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Ventas Hoy</p>
                </div>
            </div>

            {/* Card 3: Stock Alert (Combinado Stock y Productos para ahorrar espacio o dejarlo separado) */}
            <div className={`bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-between h-48 lg:col-span-1 ${lowStock > 0 ? 'hover:border-red-200' : ''}`}>
                <div className="flex justify-between items-start">
                    <div className={`p-3 rounded-2xl ${lowStock > 0 ? 'bg-red-50 text-red-500' : 'bg-gray-50 text-green-500'}`}>
                        {lowStock > 0 ? <AlertTriangle size={24} /> : <Package size={24} />}
                    </div>
                </div>
                <div>
                    <p className={`text-4xl font-black tracking-tight ${lowStock > 0 ? 'text-red-500' : 'text-gray-900'}`}>{lowStock}</p>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Alertas Stock</p>
                </div>
            </div>
        </div>

        {/* SECCIÓN 2: ACCIONES RÁPIDAS */}
        <div>
            <h2 className="text-lg font-black text-gray-900 mb-6 flex items-center gap-2">
                <TrendingUp size={20} className="text-gray-400"/> Acciones Rápidas
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* 1. NUEVO PRODUCTO */}
                <Link href="/admin/product/new" className="group relative bg-black rounded-3xl p-8 overflow-hidden shadow-xl shadow-black/10 hover:shadow-2xl hover:scale-[1.01] transition-all duration-300">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-white/20 transition-all"></div>
                    <div className="relative z-10 flex flex-col h-full justify-between min-h-[140px]">
                        <div className="bg-white/20 w-12 h-12 rounded-2xl flex items-center justify-center text-white mb-4">
                            <Plus size={24} strokeWidth={3} />
                        </div>
                        <div>
                            <h3 className="text-2xl font-black text-white mb-1">Nuevo Producto</h3>
                            <p className="text-white/60 text-sm font-medium">Agregar al catálogo</p>
                        </div>
                    </div>
                </Link>

                {/* 2. GESTIÓN PEDIDOS */}
                <Link href="/admin/orders" className="group relative bg-white border border-gray-200 rounded-3xl p-8 overflow-hidden shadow-sm hover:border-blue-500 hover:shadow-blue-500/10 transition-all duration-300">
                    <div className="relative z-10 flex flex-col h-full justify-between min-h-[140px]">
                        <div className="bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors w-12 h-12 rounded-2xl flex items-center justify-center mb-4">
                            <MessageCircle size={24} strokeWidth={2.5} />
                        </div>
                        <div className="flex justify-between items-end">
                            <div>
                                <h3 className="text-2xl font-black text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">Pedidos</h3>
                                <p className="text-gray-400 text-sm font-medium">Gestionar ventas ({pendingOrders})</p>
                            </div>
                            <div className="bg-gray-50 rounded-full p-2 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                <ChevronRight size={20}/>
                            </div>
                        </div>
                    </div>
                </Link>

                {/* 3. INVENTARIO */}
                <Link href="/admin/inventory" className="group relative bg-white border border-gray-200 rounded-3xl p-8 overflow-hidden shadow-sm hover:border-black hover:shadow-lg transition-all duration-300">
                    <div className="relative z-10 flex flex-col h-full justify-between min-h-[140px]">
                        <div className="bg-gray-100 group-hover:bg-black group-hover:text-white transition-colors w-12 h-12 rounded-2xl flex items-center justify-center text-black mb-4">
                            <Package size={24} strokeWidth={2.5} />
                        </div>
                        <div className="flex justify-between items-end">
                            <div>
                                <h3 className="text-2xl font-black text-gray-900 mb-1">Inventario</h3>
                                <p className="text-gray-400 text-sm font-medium group-hover:text-gray-600 transition-colors">Control de Stock ({totalProducts})</p>
                            </div>
                            <div className="bg-gray-50 rounded-full p-2 group-hover:bg-black group-hover:text-white transition-colors">
                                <ChevronRight size={20}/>
                            </div>
                        </div>
                    </div>
                </Link>
            </div>
        </div>

        {/* SECCIÓN 3: ACTIVIDAD RECIENTE */}
        <div className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-black text-gray-900">Últimos Productos</h2>
                <Link href="/admin/inventory" className="text-xs font-bold text-gray-400 hover:text-black transition-colors uppercase tracking-wide">Ver Todo</Link>
            </div>
            
            <div className="space-y-4">
                {recentProducts.length === 0 ? (
                    <div className="text-center py-10 text-gray-400 text-sm">Aún no hay productos.</div>
                ) : (
                    recentProducts.map(prod => (
                        <div key={prod.id} className="flex items-center justify-between group cursor-default">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-gray-50 border border-gray-100 overflow-hidden relative">
                                    {prod.image_url ? (
                                        <img src={prod.image_url} className="w-full h-full object-cover" alt={prod.name} />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-gray-300"><Package size={16}/></div>
                                    )}
                                </div>
                                <div>
                                    <p className="font-bold text-sm text-gray-900 group-hover:text-blue-600 transition-colors">{prod.name}</p>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase">{prod.category}</p>
                                </div>
                            </div>
                            <Link href={`/admin/product/edit/${prod.id}`} className="text-gray-300 hover:text-black p-2 transition-colors">
                                <Settings size={16} />
                            </Link>
                        </div>
                    ))
                )}
            </div>
        </div>

      </main>
    </div>
  )
}