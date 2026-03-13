import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import Link from 'next/link'
import { 
  Plus, Package, TrendingUp, AlertTriangle, ArrowRight, 
  Clock, DollarSign, Truck, Box, ChevronRight
} from 'lucide-react'

// COMPONENTES IMPORTADOS
import RateWidget from '@/components/admin/RateWidget'
import AdminHeader from '@/components/admin/AdminHeader'
import AnalyticsChart from '@/components/admin/AnalyticsChart'
import TopPerformers from '@/components/admin/TopPerformers'

export default async function AdminDashboard() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() } } }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const today = new Date().toISOString().split('T')[0]
  
  const { data: store } = await supabase.from('stores').select('*').eq('user_id', user?.id).single()

  const [productsRes, variantsRes, pendingRes, todayOrdersRes, configRes, recentOrdersRes] = await Promise.all([
    supabase.from('products').select('id', { count: 'exact', head: true }).eq('store_id', store.id),
    supabase.from('product_variants').select('stock, products!inner(store_id)').eq('products.store_id', store.id).lte('stock', 3),
    supabase.from('orders').select('id', { count: 'exact', head: true }).eq('store_id', store.id).eq('status', 'pending'),
    supabase.from('orders').select('total_usd, total_bs, exchange_rate').eq('store_id', store.id).gte('created_at', `${today}T00:00:00Z`).neq('status', 'cancelled'),
    supabase.from('app_config').select('usd_rate, eur_rate, updated_at').eq('id', 1).single(),
    supabase.from('orders').select('*').eq('store_id', store.id).order('created_at', { ascending: false }).limit(5)
  ])

  const totalProducts = productsRes.count || 0
  const lowStockCount = variantsRes.data?.length || 0
  const pendingOrdersCount = pendingRes.count || 0
  const todayOrders = todayOrdersRes.data || []
  const salesTodayUSD = todayOrders.reduce((acc, o) => acc + Number(o.total_usd || 0), 0)

  const usdRate = configRes.data?.usd_rate ?? 0
  const eurRate = configRes.data?.eur_rate ?? 0
  const lastUpdated = configRes.data?.updated_at ?? null
  const storeCurrency = store?.currency_type === 'eur' ? 'eur' : 'usd'
  const currencySymbol = store?.currency_symbol || '$'
  const recentOrders = recentOrdersRes.data || []

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-32 font-sans text-gray-900 selection:bg-black selection:text-white relative">
      <AdminHeader store={store} />
      
      <main className="max-w-7xl mx-auto px-4 md:px-8 py-8 space-y-6 md:space-y-8 relative z-10">
        
        {/* --- BENTO GRID SYSTEM 2.0 (BORDERLESS) --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            
            {/* 1. RATE WIDGET */}
            <div className="col-span-1 min-h-[160px]">
                <RateWidget 
                    storeCurrency={storeCurrency} 
                    usdRate={usdRate} 
                    eurRate={eurRate} 
                    lastUpdated={lastUpdated} 
                />
            </div>

            {/* 2. VENTAS HOY */}
            <div className="bg-white p-6 rounded-[var(--radius-card)] card-interactive flex flex-col justify-between group min-h-[160px]">
                <div className="flex justify-between items-start">
                    <div className="p-3.5 pl-[1.5px] text-black">
                        <DollarSign size={24} strokeWidth={2.5}/>
                    </div>
                    <span className="text-[10px] font-bold bg-green-50 text-green-700 px-2.5 py-1 rounded-[var(--radius-badge)] uppercase tracking-wide">
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

            {/* 3. PEDIDOS PENDIENTES */}
            <Link href="/admin/orders" className="bg-black text-white p-6 rounded-[var(--radius-card)] shadow-subtle flex flex-col justify-between group relative overflow-hidden transition-all active:scale-[0.98] min-h-[160px]">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none group-hover:bg-white/10 transition-all"></div>
                <div className="flex justify-between items-start relative z-10">
                    <div className="p-3.5 pl-[1.5px] text-white">
                        <Clock size={24} strokeWidth={2.5}/>
                    </div>
                    {pendingOrdersCount > 0 && (
                        <div className="flex items-center gap-2 bg-red-500/20 px-2.5 py-1.5 rounded-[var(--radius-badge)]">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                            </span>
                            <span className="text-[9px] font-bold text-red-200 uppercase tracking-wide">Acción</span>
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

            {/* 4. ALERTAS DE INVENTARIO */}
            <Link href="/admin/inventory" className={`bg-white p-6 rounded-[var(--radius-card)] card-interactive flex flex-col justify-between group transition-colors active:scale-[0.98] min-h-[160px] ${lowStockCount > 0 ? 'hover:border-red-400' : 'hover:border-black'}`}>
                <div className="flex justify-between items-start">
                    <div className={`p-3.5 pl-[1.5px] ${lowStockCount > 0 ? 'text-red-500' : 'text-gray-900'}`}>
                        {lowStockCount > 0 ? <AlertTriangle size={24} strokeWidth={2.5} /> : <Box size={24} strokeWidth={2.5} />}
                    </div>
                </div>
                <div>
                    <p className={`text-4xl font-black tracking-tighter ${lowStockCount > 0 ? 'text-red-500' : 'text-gray-900'}`}>
                        {lowStockCount > 0 ? lowStockCount : totalProducts}
                    </p>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1 group-hover:text-gray-900 transition-colors">
                        {lowStockCount > 0 ? 'Stock Crítico' : 'Productos Activos'}
                    </p>
                </div>
            </Link>

            {/* --- FILA 2: GRÁFICO GIGANTE --- */}
            <div className="col-span-1 md:col-span-2 lg:col-span-4 min-h-[350px]">
                {store?.id ? <AnalyticsChart storeId={store.id} /> : null}
            </div>

            {/* --- FILA 3: INTELIGENCIA Y ACTIVIDAD --- */}
            <div className="col-span-1 md:col-span-2 lg:col-span-2">
                {store?.id ? <TopPerformers storeId={store.id} /> : null}
            </div>

            {/* ÚLTIMOS PEDIDOS */}
            <div className="col-span-1 md:col-span-2 lg:col-span-2 bg-white rounded-[var(--radius-card)] flex flex-col overflow-hidden relative">
                
                <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <h3 className="font-black text-gray-900 flex items-center gap-2 text-sm uppercase tracking-wider">
                        <Truck size={16} className="text-gray-400"/> Actividad Reciente
                    </h3>
                    
                    <Link href="/admin/orders" className="text-xs font-bold text-gray-600 hover:text-black transition-colors uppercase tracking-wide flex items-center gap-1 bg-white border border-transparent shadow-subtle hover:border-gray-200 px-3 py-1.5 rounded-[var(--radius-btn)]">
                        Ver Todo <ChevronRight size={14}/>
                    </Link>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-2 no-scrollbar">
                    {recentOrders.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-3 min-h-[150px]">
                            <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center border border-transparent">
                                <Package size={20} className="opacity-30"/>
                            </div>
                            <p className="text-[10px] font-bold uppercase tracking-widest opacity-60">Sin pedidos recientes</p>
                        </div>
                    ) : (
                        recentOrders.map((order) => {
                            const StatusIcon = order.status === 'pending' ? Clock : order.status === 'paid' ? DollarSign : Package;
                            return (
                            
                            <Link href="/admin/orders" key={order.id} className="group flex items-center justify-between p-4 bg-white hover:bg-gray-50 border border-transparent hover:border-gray-200 rounded-[var(--radius-btn)] transition-all">
                                <div className="flex items-center gap-4">
                                    <div className={`w-10 h-10 rounded-[var(--radius-btn)] flex items-center justify-center shrink-0 ${
                                        order.status === 'pending' ? 'bg-yellow-50 text-yellow-600' :
                                        order.status === 'paid' ? 'bg-emerald-50 text-emerald-600' :
                                        'bg-gray-50 text-gray-500'
                                    }`}>
                                        <StatusIcon size={18} strokeWidth={2.5} />
                                    </div>
                                    
                                    <div>
                                        <p className="font-bold text-sm text-gray-900 leading-none mb-1.5 truncate max-w-[120px] sm:max-w-[200px]">{order.customer_name}</p>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-mono font-bold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-[var(--radius-badge)]">
                                                #{order.order_number}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-black text-sm text-gray-900">${order.total_usd}</p>
                                    
                                    <span className={`inline-block mt-1 text-[9px] font-bold px-2 py-0.5 rounded-[var(--radius-badge)] uppercase tracking-wider ${
                                        order.status === 'pending' ? 'bg-yellow-50 text-yellow-700' : 
                                        order.status === 'paid' ? 'bg-emerald-50 text-emerald-700' :
                                        'bg-gray-100 text-gray-600'
                                    }`}>
                                        {order.status === 'pending' ? 'Pendiente' : order.status === 'paid' ? 'Pagado' : 'Enviado'}
                                    </span>
                                </div>
                            </Link>
                        )})
                    )}
                </div>
            </div>
        </div>
      </main>
    </div>
  )
}