import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { 
  Plus, 
  Package, 
  TrendingUp, 
  AlertTriangle, 
  ArrowRight, 
  Clock, 
  DollarSign,
  Truck,
  Box,
  ChevronRight
} from 'lucide-react'
import RateWidget from '@/components/admin/RateWidget'
import AdminHeader from '@/components/admin/AdminHeader' // <--- IMPORTANTE

export default async function AdminDashboard() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() } } }
  )

  // 1. Auth Check
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // 2. Data Fetching (Paralelo)
  const today = new Date().toISOString().split('T')[0]
  
  const [storeRes, productsRes, variantsRes, ordersRes, configRes, recentOrdersRes] = await Promise.all([
    supabase.from('stores').select('*').eq('user_id', user.id).single(),
    supabase.from('products').select('id', { count: 'exact', head: true }),
    supabase.from('product_variants').select('stock').lte('stock', 3),
    supabase.from('orders').select('status, total_usd, total_bs, created_at'),
    supabase.from('app_config').select('usd_rate, eur_rate, updated_at').eq('id', 1).single(),
    supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(5)
  ])

  const store = storeRes.data
  const totalProducts = productsRes.count || 0
  const lowStockCount = variantsRes.data?.length || 0
  
  // KPIs Calculados
  const todayOrders = ordersRes.data?.filter(o => o.created_at.startsWith(today) && o.status !== 'cancelled') || []
  const salesTodayUSD = todayOrders.reduce((acc, o) => acc + Number(o.total_usd || 0), 0)
  const pendingOrdersCount = ordersRes.data?.filter(o => o.status === 'pending').length || 0

  // Widget Data
  const usdRate = configRes.data?.usd_rate ?? 0
  const eurRate = configRes.data?.eur_rate ?? 0
  const lastUpdated = configRes.data?.updated_at ?? null
  const storeCurrency = store?.currency_type === 'eur' ? 'eur' : 'usd'
  const currencySymbol = store?.currency_symbol || '$'
  const recentOrders = recentOrdersRes.data || []

  return (
    <div className="min-h-screen bg-[#F0F2F5] pb-32 font-sans text-gray-900 selection:bg-black selection:text-white relative">
      
      {/* FONDO AMBIENTAL (Mesh Gradient Sutil) */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-200/20 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-200/20 rounded-full blur-[120px]"></div>
      </div>

      {/* HEADER INTERACTIVO (Nuevo Componente) */}
      <AdminHeader store={store} />

      <main className="max-w-7xl mx-auto px-4 md:px-8 py-8 space-y-8 relative z-10">
        
        {/* --- BENTO GRID SYSTEM --- */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 auto-rows-[minmax(160px,auto)]">
            
            {/* 1. RATE WIDGET (Control Maestro) */}
            <div className="md:col-span-1 lg:col-span-1 row-span-2">
                <RateWidget 
                    storeCurrency={storeCurrency} 
                    usdRate={usdRate} 
                    eurRate={eurRate} 
                    lastUpdated={lastUpdated} 
                />
            </div>

            {/* 2. VENTAS HOY (Financial Card) */}
            <div className="md:col-span-1 lg:col-span-1 bg-white/70 backdrop-blur-lg p-6 rounded-[2rem] shadow-sm border border-white/50 flex flex-col justify-between group hover:border-green-200 transition-all hover:shadow-green-100/50 hover:-translate-y-1">
                <div className="flex justify-between items-start">
                    <div className="p-3.5 rounded-2xl bg-gradient-to-br from-green-50 to-green-100/50 text-green-600 shadow-inner">
                        <DollarSign size={24} strokeWidth={2.5}/>
                    </div>
                    <span className="text-[10px] font-bold bg-green-100 text-green-700 px-2.5 py-1 rounded-full uppercase tracking-wide border border-green-200/50">
                        Hoy
                    </span>
                </div>
                <div>
                    <p className="text-4xl font-black tracking-tighter text-gray-900 leading-none">
                        {currencySymbol}{salesTodayUSD.toFixed(0)}
                    </p>
                    <div className="flex items-center gap-1.5 mt-2 opacity-60">
                        <TrendingUp size={12} className="text-green-600"/>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Ingreso Neto</p>
                    </div>
                </div>
            </div>

            {/* 3. PEDIDOS PENDIENTES (Triage Card - Dark Mode Style) */}
            <Link href="/admin/orders" className="md:col-span-1 lg:col-span-1 bg-[#0A0A0A] text-white p-6 rounded-[2rem] shadow-2xl shadow-black/10 flex flex-col justify-between group relative overflow-hidden transition-all hover:scale-[1.02]">
                {/* Decoración */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none group-hover:bg-white/20 transition-all"></div>
                
                <div className="flex justify-between items-start relative z-10">
                    <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10">
                        <Clock size={24} strokeWidth={2.5}/>
                    </div>
                    {pendingOrdersCount > 0 && (
                        <div className="flex items-center gap-2 bg-red-500/20 px-2 py-1 rounded-lg border border-red-500/30">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                            </span>
                            <span className="text-[9px] font-bold text-red-200 uppercase">Acción</span>
                        </div>
                    )}
                </div>
                <div className="relative z-10">
                    <p className="text-4xl font-black tracking-tighter">{pendingOrdersCount}</p>
                    <div className="flex items-center justify-between mt-1">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest group-hover:text-white transition-colors">Por Despachar</p>
                        <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-white group-hover:text-black transition-all">
                            <ArrowRight size={12}/>
                        </div>
                    </div>
                </div>
            </Link>

            {/* 4. ÚLTIMOS PEDIDOS (List Card - Grande) */}
            <div className="md:col-span-2 lg:col-span-2 lg:row-span-2 bg-white/80 backdrop-blur-xl rounded-[2rem] border border-white shadow-sm flex flex-col overflow-hidden relative">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white/50">
                    <h3 className="font-black text-gray-900 flex items-center gap-2 text-lg">
                        <Truck size={20} className="text-gray-400"/> Actividad Reciente
                    </h3>
                    <Link href="/admin/orders" className="text-xs font-bold text-gray-400 hover:text-black transition-colors uppercase tracking-wide flex items-center gap-1">
                        Ver Todo <ChevronRight size={12}/>
                    </Link>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    {recentOrders.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-3 min-h-[200px]">
                            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center">
                                <Package size={24} className="opacity-30"/>
                            </div>
                            <p className="text-xs font-bold uppercase tracking-wider opacity-50">Sin pedidos recientes</p>
                        </div>
                    ) : (
                        recentOrders.map((order) => (
                            <div key={order.id} className="group flex items-center justify-between p-4 bg-white hover:bg-gray-50 border border-transparent hover:border-gray-200 rounded-2xl transition-all shadow-sm hover:shadow-md cursor-default">
                                <div className="flex items-center gap-4">
                                    {/* Icono de Estado */}
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg shadow-sm border ${
                                        order.status === 'pending' ? 'bg-yellow-50 text-yellow-600 border-yellow-100' :
                                        order.status === 'paid' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                        'bg-gray-50 text-gray-400 border-gray-100'
                                    }`}>
                                        {order.status === 'pending' ? '⏳' : order.status === 'paid' ? '💸' : '📦'}
                                    </div>
                                    <div>
                                        <p className="font-bold text-sm text-gray-900 leading-none mb-1.5">
                                            {order.customer_name}
                                        </p>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-mono text-gray-400 bg-gray-100 px-1.5 rounded">
                                                #{order.order_number}
                                            </span>
                                            <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">
                                                {new Date(order.created_at).toLocaleTimeString('es-VE', {hour: '2-digit', minute:'2-digit'})}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-black text-base text-gray-900 tracking-tight">${order.total_usd}</p>
                                    <span className={`inline-block mt-1 text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider ${
                                        order.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-emerald-100 text-emerald-700'
                                    }`}>
                                        {order.status === 'pending' ? 'Pendiente' : 'Pagado'}
                                    </span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* 5. ALERTAS DE INVENTARIO */}
            <Link href="/admin/inventory" className={`md:col-span-1 lg:col-span-1 bg-white/70 backdrop-blur-lg p-6 rounded-[2rem] shadow-sm border flex flex-col justify-between group transition-all hover:-translate-y-1 ${lowStockCount > 0 ? 'border-red-200 hover:border-red-300 hover:shadow-red-100/50' : 'border-white/50 hover:border-blue-200 hover:shadow-blue-100/50'}`}>
                <div className="flex justify-between items-start">
                    <div className={`p-3.5 rounded-2xl ${lowStockCount > 0 ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-500'}`}>
                        {lowStockCount > 0 ? <AlertTriangle size={24} strokeWidth={2.5} /> : <Box size={24} strokeWidth={2.5} />}
                    </div>
                </div>
                <div>
                    <p className={`text-4xl font-black tracking-tighter ${lowStockCount > 0 ? 'text-red-500' : 'text-gray-900'}`}>
                        {lowStockCount > 0 ? lowStockCount : totalProducts}
                    </p>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1 group-hover:text-gray-600 transition-colors">
                        {lowStockCount > 0 ? 'Stock Crítico' : 'Productos Activos'}
                    </p>
                </div>
            </Link>

            {/* 6. ACCIÓN RÁPIDA: NUEVO PRODUCTO (Diseño Minimalista) */}
            <Link href="/admin/product/new" className="md:col-span-1 lg:col-span-1 bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-dashed border-gray-200 hover:border-gray-400 p-6 rounded-[2rem] flex flex-col items-center justify-center gap-4 text-gray-400 hover:text-black transition-all group cursor-pointer hover:bg-white">
                <div className="w-14 h-14 bg-white rounded-full shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform duration-300 border border-gray-100">
                    <Plus size={28} strokeWidth={3} className="text-gray-300 group-hover:text-black transition-colors"/>
                </div>
                <p className="font-bold text-xs uppercase tracking-widest">Crear Producto</p>
            </Link>

        </div>
      </main>
    </div>
  )
}