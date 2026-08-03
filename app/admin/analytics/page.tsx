import { createClient } from '@/utils/supabaseServer'
import { redirect } from 'next/navigation'
import {
    Users, ShoppingBag, Eye, MapPin, Smartphone,
    MousePointerClick, Sparkles, Clock, Globe, BarChart3
} from 'lucide-react'

export default async function AnalyticsDashboard() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { data: store } = await supabase
        .from('stores')
        .select('id, slug, name')
        .eq('user_id', user.id)
        .single()

    if (!store) redirect('/admin')

    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const fallbackDateString = thirtyDaysAgo.toISOString()

    const { data: firstEvent } = await supabase
        .from('analytics_raw_events')
        .select('created_at')
        .eq('store_id', store.id)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle()

    const trackingStartDateString = firstEvent?.created_at ? new Date(firstEvent.created_at).toISOString() : fallbackDateString

    // 🚀 EJECUCIÓN 100% EN BASE DE DATOS (0% CONSUMO DE RAM EN NEXT.JS)
    const [analyticsRes, ordersRes] = await Promise.all([
        supabase.rpc('get_store_analytics_summary', {
            p_store_id: store.id,
            p_start_date: trackingStartDateString
        }),
        // 🚀 HEAD REQUEST: Solo pedimos el contador, NO descargamos las órdenes
        supabase
            .from('orders')
            .select('id', { count: 'exact', head: true }) 
            .eq('store_id', store.id)
            .gte('created_at', trackingStartDateString)
    ])

    const analytics = analyticsRes.data || { totals: {}, hourly: [], locations: [], products: [] }
    const totals = analytics.totals || {}
    
    // 4. Cálculos Ultra Livianos
    const visits = totals.total_visits || 0
    const catalogViewers = totals.catalog_viewers || 0
    const totalOrders = ordersRes.count || 0

    const interestPct = visits > 0 ? Math.round((catalogViewers / visits) * 100) : 0
    const conversionRate = visits > 0 ? ((totalOrders / visits) * 100).toFixed(1) : '0.0'

    const totalDevices = (totals.mobile_visits || 0) + (totals.desktop_visits || 0)
    const mobilePct = totalDevices > 0 ? Math.round((totals.mobile_visits / totalDevices) * 100) : 0
    const desktopPct = totalDevices > 0 ? 100 - mobilePct : 0

    const totalReferrers = (totals.ig_visits || 0) + (totals.tk_visits || 0) + (totals.wa_visits || 0) + (totals.direct_visits || 0)
    const instagramPct = totalReferrers > 0 ? Math.round((totals.ig_visits / totalReferrers) * 100) : 0
    const tiktokPct = totalReferrers > 0 ? Math.round((totals.tk_visits / totalReferrers) * 100) : 0
    const whatsappPct = totalReferrers > 0 ? Math.round((totals.wa_visits / totalReferrers) * 100) : 0
    const directPct = totalReferrers > 0 ? 100 - (instagramPct + tiktokPct + whatsappPct) : 0

    // Procesar Horas y Bloques
    const hourlyTraffic = Array(24).fill(0)
    ;(analytics.hourly || []).forEach((h: any) => {
        if(h.hour_of_day >= 0 && h.hour_of_day <= 23) {
            hourlyTraffic[h.hour_of_day] = h.visits
        }
    })

    const maxTrafficHourCount = Math.max(...hourlyTraffic, 0)
    const peakHour = hourlyTraffic.indexOf(maxTrafficHourCount)

    const madrugada = hourlyTraffic.slice(0, 6).reduce((a, b) => a + b, 0)
    const manana = hourlyTraffic.slice(6, 12).reduce((a, b) => a + b, 0)
    const tarde = hourlyTraffic.slice(12, 18).reduce((a, b) => a + b, 0)
    const noche = hourlyTraffic.slice(18, 24).reduce((a, b) => a + b, 0)

    const totalHours = madrugada + manana + tarde + noche || 1
    const madrugadaPct = Math.round((madrugada / totalHours) * 100)
    const mananaPct = Math.round((manana / totalHours) * 100)
    const tardePct = Math.round((tarde / totalHours) * 100)
    const nochePct = totalHours > 0 ? Math.max(0, 100 - (madrugadaPct + mananaPct + tardePct)) : 0

    const format12Hour = (h: number) => {
        const ampm = h >= 12 ? 'PM' : 'AM'
        const displayH = h % 12 === 0 ? 12 : h % 12
        return `${displayH} ${ampm}`
    }
    const peakHourString = format12Hour(peakHour)

    const topLocations = (analytics.locations || []).map((loc: any) => {
        const cleanName = loc.name.replace('VE-', '')
        const stateMap: Record<string, string> = {
            'A': 'Distrito Capital', 'M': 'Miranda', 'B': 'Anzoátegui', 'C': 'Apure', 'D': 'Aragua',
            'E': 'Barinas', 'F': 'Bolívar', 'G': 'Carabobo', 'H': 'Cojedes', 'I': 'Falcón',
            'J': 'Guárico', 'K': 'Lara', 'L': 'Mérida', 'N': 'Monagas', 'O': 'Nueva Esparta',
            'P': 'Portuguesa', 'R': 'Sucre', 'S': 'Táchira', 'T': 'Trujillo', 'U': 'Yaracuy',
            'V': 'Zulia', 'X': 'La Guaira', 'Y': 'Delta Amacuro', 'Z': 'Amazonas', 'W': 'Dependencias Federales'
        }
        return {
            name: stateMap[cleanName] || cleanName || 'Desconocido',
            pct: visits > 0 ? Math.round((loc.visits / visits) * 100) : 0
        }
    })

    const topProducts = (analytics.products || []).map((p: any) => ({
        id: p.id,
        name: p.name || 'Producto',
        views: p.views,
        avgTime: `${p.avg_time}s`,
    }))

    return (
        <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-10 bg-[#f8f9fa] min-h-screen">

            {/* HEADER SECTION */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">Inteligencia de Tienda</h1>
                    <p className="text-sm text-neutral-400 mt-0.5">Métricas de tráfico, retención y conversión (Últimos 30 días)</p>
                </div>

                <div className="flex items-center gap-2 bg-neutral-100 text-neutral-600 text-xs font-semibold px-3 py-1.5 rounded-lg max-w-max border border-neutral-200/20">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <span>Captura Activa</span>
                </div>
            </div>

            {/* METRIC CARD GRID */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="bg-white p-6 md:p-7 rounded-xl shadow-[0_1px_2px_rgba(0,0,0,0.015)] flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-4 text-neutral-400">
                        <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Tráfico Único</span>
                        <div className="w-6 h-6 rounded bg-neutral-50 flex items-center justify-center border border-neutral-100/50">
                            <Users size={13} className="text-neutral-500" />
                        </div>
                    </div>
                    <div>
                        <p className="text-3xl md:text-4xl font-bold tracking-tight text-neutral-900 font-mono tabular-nums">
                            {visits.toLocaleString()}
                        </p>
                        <p className="text-xs text-neutral-400 mt-1.5">Clientes únicos que entraron</p>
                    </div>
                </div>

                <div className="bg-white p-6 md:p-7 rounded-xl shadow-[0_1px_2px_rgba(0,0,0,0.015)] flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-4 text-neutral-400">
                        <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Interés en Catálogo</span>
                        <div className="w-6 h-6 rounded bg-neutral-50 flex items-center justify-center border border-neutral-100/50">
                            <Eye size={13} className="text-neutral-500" />
                        </div>
                    </div>
                    <div>
                        <p className="text-3xl md:text-4xl font-bold tracking-tight text-neutral-900 font-mono tabular-nums">
                            {interestPct}%
                        </p>
                        <p className="text-xs text-neutral-400 mt-1.5">{catalogViewers} usuarios exploraron productos</p>
                    </div>
                </div>

                <div className="bg-white p-6 md:p-7 rounded-xl shadow-[0_1px_2px_rgba(0,0,0,0.015)] flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-4 text-neutral-400">
                        <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Tasa de Conversión</span>
                        <div className="w-6 h-6 rounded bg-neutral-50 flex items-center justify-center border border-neutral-100/50">
                            <ShoppingBag size={13} className="text-neutral-500" />
                        </div>
                    </div>
                    <div>
                        <p className="text-3xl md:text-4xl font-bold tracking-tight text-neutral-900 font-mono tabular-nums">
                            {conversionRate}%
                        </p>
                        <p className="text-xs text-neutral-400 mt-1.5">{totalOrders} pedidos consolidados</p>
                    </div>
                </div>
            </div>

            {/* EMBUDO DE CONVERSIÓN VISUAL */}
            <div className="bg-white p-6 md:p-8 rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.01)] space-y-6">
                <div>
                    <span className="inline-flex items-center gap-1 bg-neutral-100 text-neutral-600 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded mb-2">
                        <Sparkles size={11} className="text-neutral-500" /> Comportamiento de Compra
                    </span>
                    <h2 className="text-base font-bold text-neutral-900 tracking-tight">Embudo de Conversión de la Tienda</h2>
                    <p className="text-xs text-neutral-400 mt-0.5">Monitorea el flujo del cliente desde que entra hasta que concreta el pedido</p>
                </div>

                <div className="space-y-4">
                    <div className="space-y-1.5">
                        <div className="flex justify-between text-xs font-semibold text-neutral-900">
                            <span>1. Visitaron la tienda</span>
                            <span className="font-mono tabular-nums">{visits} (100%)</span>
                        </div>
                        <div className="h-6 w-full bg-neutral-50 rounded-md overflow-hidden border border-neutral-100/30 flex">
                            <div className="bg-neutral-950 h-full text-[10px] text-white flex items-center pl-3 font-semibold" style={{ width: '100%' }}>
                                Tráfico Inicial
                            </div>
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <div className="flex justify-between text-xs font-semibold text-neutral-900">
                            <span>2. Exploraron productos</span>
                            <span className="font-mono tabular-nums">{catalogViewers} ({interestPct}%)</span>
                        </div>
                        <div className="h-6 w-full bg-neutral-50 rounded-md overflow-hidden border border-neutral-100/30 flex">
                            <div className="bg-neutral-500 h-full text-[10px] text-white flex items-center pl-3 font-semibold transition-all duration-500" style={{ width: `${interestPct}%` }}>
                                {interestPct > 15 ? 'Abrieron catálogo' : ''}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <div className="flex justify-between text-xs font-semibold text-neutral-900">
                            <span>3. Enviaron Pedido al WhatsApp</span>
                            <span className="font-mono tabular-nums">{totalOrders} ({conversionRate}%)</span>
                        </div>
                        <div className="h-6 w-full bg-neutral-50 rounded-md overflow-hidden border border-neutral-100/30 flex">
                            <div className="bg-emerald-500 h-full text-[10px] text-white flex items-center pl-3 font-semibold transition-all duration-500" style={{ width: `${Math.max(4, Number(conversionRate))}%` }}>
                                {Number(conversionRate) > 5 ? 'Ventas' : ''}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* NUEVO SECTOR: TRÁFICO ADICIONAL Y HORAS PICO */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

                {/* FUENTES DE TRÁFICO */}
                <div className="bg-white p-6 md:p-8 rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.01)] flex flex-col justify-between space-y-6">
                    <div>
                        <h2 className="text-sm font-bold text-neutral-900 tracking-tight">Canales de Adquisición</h2>
                        <p className="text-xs text-neutral-400 mt-0.5">De dónde provienen tus clientes más activos</p>
                    </div>

                    {visits === 0 ? (
                        <p className="text-xs text-neutral-400 italic">Aún no hay visitas registradas para medir orígenes.</p>
                    ) : (
                        <div className="space-y-4">
                            {/* Instagram */}
                            <div>
                                <div className="flex justify-between text-xs font-semibold text-neutral-950 mb-1.5">
                                    <span>Instagram (App/Bio Link)</span>
                                    <span className="font-mono">{instagramPct}% <span className="text-[10px] text-neutral-400">({totals.ig_visits || 0} visitas)</span></span>
                                </div>
                                <div className="h-2.5 w-full bg-neutral-100 rounded-full overflow-hidden">
                                    <div className="bg-neutral-950 h-full transition-all duration-500" style={{ width: `${instagramPct}%` }}></div>
                                </div>
                            </div>

                            {/* TikTok */}
                            <div>
                                <div className="flex justify-between text-xs font-semibold text-neutral-950 mb-1.5">
                                    <span>TikTok (App/Video Link)</span>
                                    <span className="font-mono">{tiktokPct}% <span className="text-[10px] text-neutral-400">({totals.tk_visits || 0} visitas)</span></span>
                                </div>
                                <div className="h-2.5 w-full bg-neutral-100 rounded-full overflow-hidden">
                                    <div className="bg-neutral-500 h-full transition-all duration-500" style={{ width: `${tiktokPct}%` }}></div>
                                </div>
                            </div>

                            {/* WhatsApp Directo */}
                            <div>
                                <div className="flex justify-between text-xs font-semibold text-neutral-950 mb-1.5">
                                    <span>WhatsApp / Enlaces Directos</span>
                                    <span className="font-mono">{whatsappPct}% <span className="text-[10px] text-neutral-400">({totals.wa_visits || 0} visitas)</span></span>
                                </div>
                                <div className="h-2.5 w-full bg-neutral-100 rounded-full overflow-hidden">
                                    <div className="bg-neutral-300 h-full transition-all duration-500" style={{ width: `${whatsappPct}%` }}></div>
                                </div>
                            </div>

                            {/* Tráfico Directo */}
                            <div>
                                <div className="flex justify-between text-xs font-semibold text-neutral-950 mb-1.5">
                                    <span>Buscadores u Otros Sitios</span>
                                    <span className="font-mono">{directPct}% <span className="text-[10px] text-neutral-400">({totals.direct_visits || 0} visitas)</span></span>
                                </div>
                                <div className="h-2.5 w-full bg-neutral-100 rounded-full overflow-hidden">
                                    <div className="bg-neutral-100 h-full border border-neutral-200/50 transition-all duration-500" style={{ width: `${directPct}%` }}></div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* HORARIO PICO */}
                <div className="bg-white p-6 md:p-8 rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.01)] flex flex-col justify-between space-y-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="text-sm font-bold text-neutral-900 tracking-tight">Horario Pico de Conexión</h2>
                      <p className="text-xs text-neutral-400 mt-0.5">Distribución de visitas por bloques del día (Hora VE)</p>
                    </div>
                    {visits > 0 && maxTrafficHourCount > 0 && (
                      <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded">
                        <Clock size={11} className="mr-0.5 text-emerald-600" /> Pico: {peakHourString}
                      </span>
                    )}
                  </div>

                  {visits === 0 ? (
                    <p className="text-xs text-neutral-400 italic">No hay suficientes registros de visitas.</p>
                  ) : (
                    <div className="space-y-4">
                      {/* Mañana */}
                      <div>
                        <div className="flex justify-between text-xs font-semibold text-neutral-950 mb-1.5">
                          <span>Mañana (6:00 AM - 12:00 PM)</span>
                          <span className="font-mono">{mananaPct}% <span className="text-[10px] text-neutral-400">({manana} visitas)</span></span>
                        </div>
                        <div className="h-2.5 w-full bg-neutral-100 rounded-full overflow-hidden">
                          <div className="bg-neutral-950 h-full transition-all duration-500" style={{ width: `${mananaPct}%` }}></div>
                        </div>
                      </div>

                      {/* Tarde */}
                      <div>
                        <div className="flex justify-between text-xs font-semibold text-neutral-950 mb-1.5">
                          <span>Tarde (12:00 PM - 6:00 PM)</span>
                          <span className="font-mono">{tardePct}% <span className="text-[10px] text-neutral-400">({tarde} visitas)</span></span>
                        </div>
                        <div className="h-2.5 w-full bg-neutral-100 rounded-full overflow-hidden">
                          <div className="bg-neutral-500 h-full transition-all duration-500" style={{ width: `${tardePct}%` }}></div>
                        </div>
                      </div>

                      {/* Noche */}
                      <div>
                        <div className="flex justify-between text-xs font-semibold text-neutral-950 mb-1.5">
                          <span>Noche (6:00 PM - 12:00 AM)</span>
                          <span className="font-mono">{nochePct}% <span className="text-[10px] text-neutral-400">({noche} visitas)</span></span>
                        </div>
                        <div className="h-2.5 w-full bg-neutral-100 rounded-full overflow-hidden">
                          <div className="bg-neutral-300 h-full transition-all duration-500" style={{ width: `${nochePct}%` }}></div>
                        </div>
                      </div>

                      {/* Madrugada */}
                      <div>
                        <div className="flex justify-between text-xs font-semibold text-neutral-950 mb-1.5">
                          <span>Madrugada (12:00 AM - 6:00 AM)</span>
                          <span className="font-mono">{madrugadaPct}% <span className="text-[10px] text-neutral-400">({madrugada} visitas)</span></span>
                        </div>
                        <div className="h-2.5 w-full bg-neutral-100 rounded-full overflow-hidden">
                          <div className="bg-neutral-100 h-full border border-neutral-200/50 transition-all duration-500" style={{ width: `${madrugadaPct}%` }}></div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
            </div>

            {/* SECTOR SECUNDARIO: CATALOG PERFORMANCE & GEOLOC */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

                {/* TOP PRODUCTOS */}
                <div className="bg-white p-6 md:p-8 rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.01)] space-y-5">
                    <div>
                        <h2 className="text-sm font-bold text-neutral-900 tracking-tight">Rendimiento del Catálogo</h2>
                        <p className="text-xs text-neutral-400 mt-0.5">Productos con mayor retención visual (Dwell Time)</p>
                    </div>

                    {topProducts.length === 0 ? (
                        <p className="text-xs text-neutral-400 italic py-4">Aún no hay suficientes datos de visualización de productos.</p>
                    ) : (
                        <div className="space-y-3">
                            {topProducts.map((product: any) => (
                                <div key={product.id} className="p-4 bg-neutral-50/50 rounded-lg flex items-center justify-between border border-neutral-100/50">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded bg-white flex items-center justify-center text-neutral-400 border border-neutral-200/50 shadow-sm">
                                            <MousePointerClick size={14} />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-sm text-neutral-900 leading-tight truncate max-w-[180px] sm:max-w-[250px]">{product.name}</p>
                                            <p className="text-xs text-neutral-400 mt-0.5 flex items-center gap-1">
                                                <Clock size={10} /> Promedio: {product.avgTime} en pantalla
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-neutral-900 text-base font-mono tracking-tight">{product.views}</p>
                                        <p className="text-[10px] uppercase tracking-wider font-semibold text-neutral-400">Vistas</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* DEMOGRAFÍA Y DISPOSITIVOS */}
                <div className="bg-white p-6 md:p-8 rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.01)] flex flex-col space-y-8">

                    {/* Dispositivos */}
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h2 className="text-sm font-bold text-neutral-900 tracking-tight">Distribución por Dispositivo</h2>
                                <p className="text-xs text-neutral-400 mt-0.5">Optimiza tus imágenes según el formato</p>
                            </div>
                            <div className="w-6 h-6 rounded bg-neutral-50 flex items-center justify-center border border-neutral-100/50">
                                <Smartphone size={13} className="text-neutral-500" />
                            </div>
                        </div>

                        <div className="relative h-3 w-full bg-neutral-100 rounded-full overflow-hidden flex">
                            {totalDevices > 0 ? (
                                <>
                                    <div className="bg-neutral-900 h-full transition-all duration-1000" style={{ width: `${mobilePct}%` }}></div>
                                    <div className="bg-neutral-300 h-full transition-all duration-1000" style={{ width: `${desktopPct}%` }}></div>
                                </>
                            ) : (
                                <div className="bg-neutral-200 h-full w-full"></div>
                            )}
                        </div>
                        <div className="flex justify-between items-center mt-3 text-xs font-semibold">
                            <div className="flex items-center gap-1.5 text-neutral-900">
                                <span className="w-2 h-2 rounded-full bg-neutral-900"></span> Móvil ({mobilePct}%)
                            </div>
                            <div className="flex items-center gap-1.5 text-neutral-500">
                                <span className="w-2 h-2 rounded-full bg-neutral-300"></span> Escritorio ({desktopPct}%)
                            </div>
                        </div>
                    </div>

                    <div className="h-px w-full bg-neutral-100"></div>

                    {/* Ubicaciones */}
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h2 className="text-sm font-bold text-neutral-900 tracking-tight">Top Ubicaciones (Venezuela)</h2>
                                <p className="text-xs text-neutral-400 mt-0.5">Basado en nodos de conexión IP</p>
                            </div>
                            <div className="w-6 h-6 rounded bg-neutral-50 flex items-center justify-center border border-neutral-100/50">
                                <MapPin size={13} className="text-neutral-500" />
                            </div>
                        </div>

                        {topLocations.length === 0 ? (
                            <p className="text-xs text-neutral-400 italic">No hay datos de ubicación suficientes.</p>
                        ) : (
                            <div className="space-y-4">
                                {topLocations.map((loc: any, i: number) => {
                                    const colors = ['bg-neutral-900', 'bg-neutral-400', 'bg-neutral-200']
                                    return (
                                        <div key={loc.name}>
                                            <div className="flex justify-between text-xs font-semibold text-neutral-600 mb-1.5">
                                                <span>{loc.name === 'Desconocido' ? 'No detectado' : loc.name}</span>
                                                <span className="font-mono">{loc.pct}%</span>
                                            </div>
                                            <div className="h-1.5 w-full bg-neutral-100 rounded-full overflow-hidden">
                                                <div className={`${colors[i] || 'bg-neutral-200'} h-full`} style={{ width: `${loc.pct}%` }}></div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>

                </div>
            </div>

        </div>
    )
}