import { createServerClient } from "@supabase/ssr";

import { cookies } from "next/headers";

import Link from "next/link";


import {
    Plus, Package, TrendingUp, AlertTriangle, ArrowRight, ArrowUpRight,
    Clock, DollarSign, Truck, Box, ChevronRight, XCircle,
    SquareArrowOutUpRight, ChartNoAxesColumnIncreasing, LineChart,
    Sparkles, ExternalLink, CheckCircle2, Circle, Play, Trophy, // Nuevos iconos
    MapPin, Users as UsersIcon // 👈 AÑADE ESTOS ICONOS
} from 'lucide-react'

// COMPONENTES IMPORTADOS

import RateWidget from "@/components/admin/RateWidget";

import AdminHeader from "@/components/admin/AdminHeader";

import AnalyticsChart from "@/components/admin/AnalyticsChart";

import TopPerformers from "@/components/admin/TopPerformers";
import CriticalStockCardWrapper from "@/components/admin/CriticalStockCardWrapper"; // <-- NUEVA IMPORTACIÓN




import AffiliateLaunchModal from "@/components/admin/AffiliateLaunchModal";
import WelcomeModal from "@/components/admin/WelcomeModal";
import AnalyticsLaunchModal from "@/components/admin/AnalyticsLauchModal";
import PushNotificationManager from "@/components/admin/PushNotificationManager";
import ThemeEngineAnnouncement from "@/components/admin/ThemeEngineAnnouncement";

export default async function AdminDashboard() {
    const cookieStore = await cookies();

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,

        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,

        {
            cookies: {
                getAll() {
                    return cookieStore.getAll();
                },
            },
        },
    );

    const getStatusTheme = (status: string) => {
        switch (status) {
            case "pending":
                return {
                    iconWrapper: "bg-amber-50 text-amber-600 border border-amber-200/20",
                    dot: "bg-amber-500",
                    label: "text-amber-700 border-none font-semibold uppercase tracking-wider",
                    text: "pendiente",
                };
            case "paid":
                return {
                    iconWrapper: "bg-emerald-50 text-emerald-600 border border-emerald-200/20",
                    dot: "bg-emerald-500",
                    label: "text-emerald-700 border-none font-semibold uppercase tracking-wider",
                    text: "pagado",
                };
            case "cancelled":
                return {
                    iconWrapper: "bg-rose-50 text-rose-600 border border-rose-200/20",
                    dot: "bg-rose-500",
                    label: "text-rose-700 border-none font-semibold uppercase tracking-wider",
                    text: "cancelado",
                };
            default: // Enviado / Otros
                return {
                    iconWrapper: "bg-blue-50 text-blue-600 border border-blue-200/20",
                    dot: "bg-blue-500",
                    label: "text-blue-700 border-none font-semibold uppercase tracking-wider",
                    text: "enviado",
                };
        }
    };

    const {
        data: { user },
    } = await supabase.auth.getUser();

    const today = new Date().toISOString().split("T")[0];

    const { data: store } = await supabase
        .from("stores")
        .select("*")
        .eq("user_id", user?.id)
        .single();

    // 2. Define la fecha límite de analíticas (Últimos 30 días)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const fallbackDateString = thirtyDaysAgo.toISOString();

    // 3. Añade la consulta paralela "eventsRes" dentro de tu Promise.all existente:
    const [
        productsRes,
        variantsRes,
        pendingRes,
        todayOrdersRes,
        configRes,
        recentOrdersRes,
        eventsRes, // 👈 INYECTA ESTO
    ] = await Promise.all([
        supabase
            .from("products")
            .select("id", { count: "exact", head: true })
            .eq("store_id", store.id),

        supabase
            .from("product_variants")
            .select("stock, products!inner(store_id)")
            .eq("products.store_id", store.id)
            .lte("stock", 3),

        supabase
            .from("orders")
            .select("id", { count: "exact", head: true })
            .eq("store_id", store.id)
            .eq("status", "pending"),

        supabase
            .from("orders")
            .select("total_usd, total_bs, exchange_rate")
            .eq("store_id", store.id)
            .gte("created_at", `${today}T00:00:00Z`)
            .neq("status", "cancelled"),

        supabase
            .from("app_config")
            .select("usd_rate, eur_rate, updated_at")
            .eq("id", 1)
            .single(),

        supabase
            .from("orders")
            .select("*")
            .eq("store_id", store.id)
            .order("created_at", { ascending: false })
            .limit(5),

        // 👈 INYECTA ESTA CONSULTA PARALELA:
        supabase
            .from("analytics_raw_events")
            .select("session_id, event_type, location_state, created_at")
            .eq("store_id", store.id)
            .gte("created_at", fallbackDateString)
            .limit(10000) // Salvaguarda de memoria
    ]);

    const totalProducts = productsRes.count || 0;

    const lowStockCount = variantsRes.data?.length || 0;

    const pendingOrdersCount = pendingRes.count || 0;

    const todayOrders = todayOrdersRes.data || [];

    const salesTodayUSD = todayOrders.reduce(
        (acc, o) => acc + Number(o.total_usd || 0),
        0,
    );

    const usdRate = configRes.data?.usd_rate ?? 0;

    const eurRate = configRes.data?.eur_rate ?? 0;

    // --- PARCHE ARCHITECTURE: Server-Side Time Formatting ---

    let formattedLastUpdated = null;

    if (configRes.data?.updated_at) {
        formattedLastUpdated = new Intl.DateTimeFormat("es-VE", {
            timeZone: "America/Caracas",

            hour: "numeric",

            minute: "numeric",

            hour12: true,
        }).format(new Date(configRes.data.updated_at));
    }

    const storeCurrency = store?.currency_type === "eur" ? "eur" : "usd";

    const currencySymbol = store?.currency_symbol || "$";

    const recentOrders = recentOrdersRes.data || [];

    // Detectar si la tienda es nueva (menos de 24 horas) para mostrar el banner de éxito
    const isNewStore = new Date().getTime() - new Date(store.created_at).getTime() < 24 * 60 * 60 * 1000;

    // --- LÓGICA DE ANALÍTICAS ENRIQUECIDA PARA EL BENTO GRID ---
    const rawEvents = eventsRes.data || [];
    const uniqueSessions = new Set<string>();
    const locations: Record<string, number> = {};
    const hourlyTraffic = Array(24).fill(0);

    // Array para el histograma real de los últimos 7 días
    const currentDate = new Date(); // 👈 Renombrado de 'now' a 'currentDate' para evitar colisiones
    const last7DaysSessions = Array.from({ length: 7 }, () => new Set<string>());

    rawEvents.forEach((e: any) => {
        if (!uniqueSessions.has(e.session_id)) {
            uniqueSessions.add(e.session_id);

            // Ubicaciones
            const loc = e.location_state || 'Desconocido';
            locations[loc] = (locations[loc] || 0) + 1;

            // Horario Caracas (UTC-4)
            const eventDate = new Date(e.created_at);
            const caracasDate = new Date(eventDate.getTime() - (4 * 60 * 60 * 1000));
            const caracasHour = caracasDate.getUTCHours();
            hourlyTraffic[caracasHour]++;

            // Histograma de 7 días (0: hace 6 días, 6: hoy)
            const diffDays = Math.floor((currentDate.getTime() - eventDate.getTime()) / (1000 * 60 * 60 * 24));
            if (diffDays >= 0 && diffDays < 7) {
                last7DaysSessions[6 - diffDays].add(e.session_id);
            }
        }
    });

    const visitsCount = uniqueSessions.size;

    // 1. Datos para Histograma de 7 días
    const dailyTrafficCounts = last7DaysSessions.map(s => s.size);
    const maxDailyTraffic = Math.max(...dailyTrafficCounts, 1);

    // 2. Datos para Top Estados (Top 2 Desglosado)
    const stateMap: Record<string, string> = {
        'A': 'Distrito Capital', 'M': 'Miranda', 'B': 'Anzoátegui', 'C': 'Apure', 'D': 'Aragua',
        'E': 'Barinas', 'F': 'Bolívar', 'G': 'Carabobo', 'H': 'Cojedes', 'I': 'Falcón',
        'J': 'Guárico', 'K': 'Lara', 'L': 'Mérida', 'N': 'Monagas', 'O': 'Nueva Esparta',
        'P': 'Portuguesa', 'R': 'Sucre', 'S': 'Táchira', 'T': 'Trujillo', 'U': 'Yaracuy',
        'V': 'Zulia', 'X': 'La Guaira', 'Y': 'Delta Amacuro', 'Z': 'Amazonas', 'W': 'Dependencias Federales'
    };

    const sortedLocations = Object.entries(locations).sort((a, b) => b[1] - a[1]).slice(0, 2);
    const topLocationsList = sortedLocations.map(([code, count]) => {
        const cleanCode = code.replace('VE-', '');
        let name = stateMap[cleanCode] || cleanCode || 'Desconocido';
        if (name === 'Desconocido') name = 'No detectado';
        const pct = visitsCount > 0 ? Math.round((count / visitsCount) * 100) : 0;
        return { name, pct };
    });

    // 3. Datos para Fases del Día (Porcentajes Expuestos)
    const madrugada = hourlyTraffic.slice(0, 6).reduce((a, b) => a + b, 0);
    const manana = hourlyTraffic.slice(6, 12).reduce((a, b) => a + b, 0);
    const tarde = hourlyTraffic.slice(12, 18).reduce((a, b) => a + b, 0);
    const noche = hourlyTraffic.slice(18, 24).reduce((a, b) => a + b, 0);

    const totalHours = (manana + tarde + noche + madrugada) || 1;
    const blockStats = [
        { name: 'Mañana', pct: Math.round((manana / totalHours) * 100) },
        { name: 'Tarde', pct: Math.round((tarde / totalHours) * 100) },
        { name: 'Noche', pct: Math.round((noche / totalHours) * 100) },
        { name: 'Madrugada', pct: Math.round((madrugada / totalHours) * 100) },
    ];
    const topBlock = [...blockStats].sort((a, b) => b.pct - a.pct)[0];

    // --- LÓGICA DE MISIONES (REGLA DE 7 DÍAS) ---
    const storeCreatedAt = new Date(store.created_at).getTime();
    const now = new Date().getTime();
    const daysSinceCreation = (now - storeCreatedAt) / (1000 * 60 * 60 * 24);
    const isEligibleForMissions = daysSinceCreation <= 7;

    const missions = store.onboarding_missions || { mission_1: false, mission_2: false, mission_3: false };
    const completedCount = [missions.mission_1, missions.mission_2, missions.mission_3].filter(Boolean).length;
    const allMissionsCompleted = completedCount === 3;

    // Solo mostramos el panel si tiene menos de 7 días y NO ha completado todo
    const showMissionControl = isEligibleForMissions && !allMissionsCompleted;
    const storeUrl = `${store.slug}.preziso.shop`;




    return (
        <div className="min-h-screen bg-[#F6F6F6] pb-32 font-sans text-gray-900 selection:bg-black selection:text-white relative">
            <AdminHeader store={store} />

            {/* --- MISSION CONTROL BANNER (PLG) --- */}
            {showMissionControl && (
                <div className="max-w-7xl mx-auto px-4 md:px-8 mt-8">
                    <div className="bg-white  rounded-[var(--radius-card)] overflow-hidden ">
                        {/* Header del Panel */}
                        <div className="p-5 md:p-6 border-b border-neutral-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-neutral-50/50">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-black text-white rounded-xl flex items-center justify-center ">
                                    <Trophy size={20} />
                                </div>
                                <div>
                                    <h2 className="text-sm font-black uppercase tracking-widest text-gray-900">Academia Preziso</h2>
                                    <p className="text-xs text-gray-500 font-medium mt-0.5">Completa estas misiones para dominar tu tienda.</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border border-neutral-200 ">
                                <span className="text-xs font-bold text-gray-900">{completedCount}/3</span>
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Completadas</span>
                            </div>
                        </div>

                        {/* Lista de Misiones */}
                        <div className="flex flex-col">
                            {/* Misión 1 */}
                            <Link
                                href={missions.mission_1 ? "#" : "/admin/product/new?mission=1"}
                                className={`flex items-center justify-between p-4 md:p-5 transition-all ${missions.mission_1 ? 'bg-neutral-50 opacity-60 cursor-default' : 'hover:bg-neutral-50 cursor-pointer active:bg-neutral-100'} border-b border-neutral-100`}
                            >
                                <div className="flex items-center gap-4">
                                    {missions.mission_1 ? <CheckCircle2 className="text-emerald-500 shrink-0" size={24} /> : <Circle className="text-neutral-300 shrink-0" size={24} />}
                                    <div>
                                        <h3 className={`text-sm font-bold ${missions.mission_1 ? 'text-neutral-500 line-through' : 'text-gray-900'}`}>1. Tu Primer Producto</h3>
                                        <p className="text-xs text-gray-500 mt-0.5 hidden sm:block">Sube un producto básico y mira cómo calculamos los Bolívares.</p>
                                    </div>
                                </div>
                                {!missions.mission_1 && (
                                    <div className="flex items-center gap-2 text-[10px] font-bold text-black uppercase tracking-widest bg-neutral-100 px-3 py-1.5 rounded-full">
                                        Iniciar <Play size={12} className="fill-black" />
                                    </div>
                                )}
                            </Link>

                            {/* Misión 2 */}
                            <Link
                                href={missions.mission_2 ? "#" : "/admin/product/new?mission=2"}
                                className={`flex items-center justify-between p-4 md:p-5 transition-all ${missions.mission_2 ? 'bg-neutral-50 opacity-60 cursor-default' : 'hover:bg-neutral-50 cursor-pointer active:bg-neutral-100'} border-b border-neutral-100`}
                            >
                                <div className="flex items-center gap-4">
                                    {missions.mission_2 ? <CheckCircle2 className="text-emerald-500 shrink-0" size={24} /> : <Circle className="text-neutral-300 shrink-0" size={24} />}
                                    <div>
                                        <h3 className={`text-sm font-bold ${missions.mission_2 ? 'text-neutral-500 line-through' : 'text-gray-900'}`}>2. Tallas y Colores</h3>
                                        <p className="text-xs text-gray-500 mt-0.5 hidden sm:block">Aprende a usar el generador automático de variantes.</p>
                                    </div>
                                </div>
                                {!missions.mission_2 && (
                                    <div className="flex items-center gap-2 text-[10px] font-bold text-black uppercase tracking-widest bg-neutral-100 px-3 py-1.5 rounded-full">
                                        Iniciar <Play size={12} className="fill-black" />
                                    </div>
                                )}
                            </Link>

                            {/* Misión 3 */}
                            <Link
                                href={missions.mission_3 ? "#" : "/admin/product/new?mission=3"}
                                className={`flex items-center justify-between p-4 md:p-5 transition-all ${missions.mission_3 ? 'bg-neutral-50 opacity-60 cursor-default' : 'hover:bg-neutral-50 cursor-pointer active:bg-neutral-100'}`}
                            >
                                <div className="flex items-center gap-4">
                                    {missions.mission_3 ? <CheckCircle2 className="text-emerald-500 shrink-0" size={24} /> : <Circle className="text-neutral-300 shrink-0" size={24} />}
                                    <div>
                                        <h3 className={`text-sm font-bold ${missions.mission_3 ? 'text-neutral-500 line-through' : 'text-gray-900'}`}>3. Estrategia de Ventas</h3>
                                        <p className="text-xs text-gray-500 mt-0.5 hidden sm:block">Aplica descuentos, ventas al mayor y destaca tu producto.</p>
                                    </div>
                                </div>
                                {!missions.mission_3 && (
                                    <div className="flex items-center gap-2 text-[10px] font-bold text-black uppercase tracking-widest bg-neutral-100 px-3 py-1.5 rounded-full">
                                        Iniciar <Play size={12} className="fill-black" />
                                    </div>
                                )}
                            </Link>
                        </div>
                    </div>
                </div>
            )}



            <main className="max-w-7xl mx-auto px-4 md:px-8 py-6 md:py-8 space-y-6 relative z-10">

                {/* GESTOR DE NOTIFICACIONES */}
                <PushNotificationManager storeId={store.id} />

                {/* --- BENTO GRID: KPIS INDUSTRIALES DE ALTA DENSIDAD --- */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

                    {/* 1. TASA ACTIVA WIDGET */}
                    <div className="col-span-1 min-h-[140px]">
                        <RateWidget
                            storeCurrency={storeCurrency}
                            usdRate={usdRate}
                            eurRate={eurRate}
                            lastUpdated={formattedLastUpdated}
                        />
                    </div>

                    {/* 2. VENTAS HOY (Blanco Puro sobre #F6F6F6) */}
                    <div className="bg-white p-5 md:p-6 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex flex-col justify-between min-h-[140px] group transition-all cursor-default">
                        <div className="flex justify-between items-start">
                            <div className="w-8 h-8 rounded-lg bg-[#F6F6F6] text-neutral-900 flex items-center justify-center shrink-0">
                                <DollarSign size={16} strokeWidth={2.2} />
                            </div>

                            <span className="text-[9px] font-bold font-mono uppercase tracking-wider text-neutral-500 bg-[#F6F6F6] px-2 py-0.5 rounded">
                                Facturado Hoy
                            </span>
                        </div>

                        <div className="mt-4">
                            <p className="text-3xl md:text-4xl font-mono font-bold tracking-tight text-neutral-900 leading-none tabular-nums">
                                {currencySymbol}{salesTodayUSD.toFixed(2)}
                            </p>

                            <div className="flex items-center gap-1.5 mt-2 text-neutral-400">
                                <LineChart size={12} strokeWidth={2.2} />
                                <p className="text-[10px] font-bold uppercase tracking-wider">
                                    Ingreso Neto en Caja
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* 3. POR DESPACHAR: NODO OBSIDIANA CON RESPLANDOR ÁMBAR INTERNO */}
                    <Link
                        href="/admin/orders"
                        className="bg-[#0C0D0E] text-white p-5 md:p-6 rounded-xl shadow-[0_4px_16px_rgba(0,0,0,0.08)] flex flex-col justify-between min-h-[140px] group relative overflow-hidden transition-transform active:scale-[0.99]"
                    >
                        {/* 🚀 RESPLANDOR ÁMBAR DENTRO DE LA TARJETA (Ambient Backlight contenido) */}
                        <div className="absolute -top-10 -right-10 w-32 h-32 bg-amber-500/15 rounded-full blur-2xl pointer-events-none" />
                        <div className="absolute -bottom-10 -left-10 w-24 h-24 bg-amber-600/10 rounded-full blur-xl pointer-events-none" />

                        <div className="flex justify-between items-start relative z-10">
                            <div className="w-8 h-8 rounded-lg bg-white/10 text-neutral-200 flex items-center justify-center shrink-0">
                                <Clock size={16} strokeWidth={2.2} />
                            </div>

                            {/* Badge Ámbar de Acción Requerida */}
                            {pendingOrdersCount > 0 ? (
                                <div className="flex items-center gap-1.5 bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                                    <span className="text-[9px] font-bold font-mono uppercase tracking-wider text-amber-300">
                                        Acción
                                    </span>
                                </div>
                            ) : (
                                <span className="text-[9px] font-mono text-neutral-500 uppercase tracking-wider">Al día</span>
                            )}
                        </div>

                        <div className="relative z-10 mt-4">
                            <p className="text-3xl md:text-4xl font-mono font-bold tracking-tight text-white leading-none tabular-nums">
                                {pendingOrdersCount}
                            </p>

                            <div className="flex items-center gap-1.5 mt-2 text-neutral-400 group-hover:text-amber-200 transition-colors">
                                <p className="text-[10px] font-bold uppercase tracking-wider">
                                    Por Despachar
                                </p>
                                <ArrowRight size={12} className="transition-transform group-hover:translate-x-1" strokeWidth={2.5} />
                            </div>
                        </div>
                    </Link>

                    {/* 4. STOCK CRÍTICO (Alerta Roja Semántica) */}
                    <div className="col-span-1 min-h-[140px]">
                        <CriticalStockCardWrapper
                            lowStockCount={lowStockCount}
                            totalProducts={totalProducts}
                            storeId={store.id}
                        />
                    </div>




                    {/* --- FILA 2: GRÁFICO GIGANTE --- */}
                    <div className="col-span-1 md:col-span-2 lg:col-span-4 min-h-[350px]">
                        {store?.id ? <AnalyticsChart storeId={store.id} /> : null}
                    </div>

                    {/* --- FILA 3: TELEMETRÍA NACIONAL (Métricas Regionales & Horarios) --- */}
                    {store?.id && (
                        <div className="col-span-1 sm:col-span-2 lg:col-span-4 grid grid-cols-1 md:grid-cols-3 gap-4">

                            {/* Tarjeta 1: Visitantes con Histograma Real de 7 Días */}
                            <div className="bg-white p-5 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex flex-col justify-between min-h-[160px] relative overflow-hidden">
                                <div className="flex justify-between items-start mb-3">
                                    <div className="w-8 h-8 rounded-lg bg-[#F6F6F6] text-neutral-900 flex items-center justify-center shrink-0">
                                        <UsersIcon size={15} strokeWidth={2.2} />
                                    </div>

                                    <Link
                                        href="/admin/analytics"
                                        className="flex items-center gap-1 text-[9px] font-mono font-bold uppercase tracking-wider text-neutral-400 hover:text-neutral-900 transition-colors"
                                    >
                                        <span>Auditar</span>
                                        <ArrowUpRight size={11} strokeWidth={2.5} />
                                    </Link>
                                </div>

                                <div className="flex items-end justify-between mt-auto">
                                    <div>
                                        <p className="text-[9px] font-mono font-semibold text-neutral-400 uppercase tracking-wider mb-1">
                                            Visitantes Únicos (30d)
                                        </p>
                                        <p className="text-2xl md:text-3xl font-mono font-bold tracking-tight text-neutral-900 leading-none tabular-nums">
                                            {visitsCount.toLocaleString()}
                                        </p>
                                    </div>

                                    {/* Histograma real sin saturación */}
                                    <div className="flex items-end gap-1 h-7 px-1">
                                        {dailyTrafficCounts.map((count, i) => {
                                            const heightPct = (count / maxDailyTraffic) * 100;
                                            return (
                                                <div
                                                    key={i}
                                                    className="w-1.5 bg-neutral-200 hover:bg-neutral-900 rounded-t-xs transition-colors"
                                                    style={{ height: `${Math.max(15, heightPct)}%` }}
                                                    title={`Día ${i + 1}: ${count} visitas`}
                                                />
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            {/* Tarjeta 2: Foco Geográfico Nacional */}
                            <div className="bg-white p-5 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex flex-col justify-between min-h-[160px]">
                                <div className="flex justify-between items-start mb-3">
                                    <div className="w-8 h-8 rounded-lg bg-[#F6F6F6] text-neutral-900 flex items-center justify-center shrink-0">
                                        <MapPin size={15} strokeWidth={2.2} />
                                    </div>

                                    <Link
                                        href="/admin/analytics"
                                        className="flex items-center gap-1 text-[9px] font-mono font-bold uppercase tracking-wider text-neutral-400 hover:text-neutral-900 transition-colors"
                                    >
                                        <span>Detalle</span>
                                        <ArrowUpRight size={11} strokeWidth={2.5} />
                                    </Link>
                                </div>

                                <div className="mt-auto space-y-2.5">
                                    <p className="text-[9px] font-mono font-semibold text-neutral-400 uppercase tracking-wider">
                                        Distribución Regional
                                    </p>

                                    {topLocationsList.length === 0 ? (
                                        <p className="font-mono text-xs text-neutral-400">Sin datos geográficos</p>
                                    ) : (
                                        <div className="space-y-1.5">
                                            {topLocationsList.map((loc, idx) => (
                                                <div key={loc.name} className="space-y-1">
                                                    <div className="flex justify-between text-[11px] font-medium text-neutral-800">
                                                        <span className="truncate max-w-[140px]">{loc.name}</span>
                                                        <span className="font-mono tabular-nums font-bold text-neutral-900">{loc.pct}%</span>
                                                    </div>
                                                    <div className="h-1 w-full bg-neutral-100 rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full transition-all duration-300 ${idx === 0 ? 'bg-neutral-900' : 'bg-neutral-400'}`}
                                                            style={{ width: `${loc.pct}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Tarjeta 3: Horario Activo de Tráfico */}
                            <div className="bg-white p-5 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex flex-col justify-between min-h-[160px]">
                                <div className="flex justify-between items-start mb-3">
                                    <div className="w-8 h-8 rounded-lg bg-[#F6F6F6] text-neutral-900 flex items-center justify-center shrink-0">
                                        <Clock size={15} strokeWidth={2.2} />
                                    </div>

                                    {topBlock && topBlock.pct > 0 ? (
                                        <span className="text-[9px] font-mono font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded uppercase">
                                            Pico: {topBlock.name}
                                        </span>
                                    ) : null}
                                </div>

                                <div className="mt-auto space-y-2.5">
                                    <p className="text-[9px] font-mono font-semibold text-neutral-400 uppercase tracking-wider">
                                        Fases de Compra
                                    </p>

                                    <div className="grid grid-cols-4 gap-1.5">
                                        {blockStats.map((block) => {
                                            const isPeak = block.name === topBlock?.name && block.pct > 0;
                                            return (
                                                <div key={block.name} className="flex flex-col items-center gap-1">
                                                    <div className="h-1 w-full bg-neutral-100 rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full transition-all duration-300 ${isPeak ? 'bg-neutral-900' : 'bg-neutral-300'}`}
                                                            style={{ width: `${Math.max(10, block.pct)}%` }}
                                                        />
                                                    </div>
                                                    <span className={`text-[8px] font-mono font-bold uppercase ${isPeak ? 'text-neutral-900' : 'text-neutral-400'}`}>
                                                        {block.name.substring(0, 3)}
                                                    </span>
                                                    <span className="text-[9px] font-mono tabular-nums font-semibold text-neutral-500">
                                                        {block.pct}%
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                        </div>
                    )}

                    {/* --- FILA 4: INTELIGENCIA DE VENTAS & ACTIVIDAD RECIENTE --- */}
                    <div className="col-span-1 sm:col-span-2 lg:col-span-2">
                        {store?.id ? <TopPerformers storeId={store.id} /> : null}
                    </div>

                    {/* ÚLTIMOS PEDIDOS (Filas de contacto sin bordes pesados) */}
                    <div className="col-span-1 sm:col-span-2 lg:col-span-2 bg-white p-5 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex flex-col justify-between overflow-hidden">

                        {/* Header Limpio */}
                        <div className="flex justify-between items-center mb-4">
                            <div>
                                <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider leading-none">
                                    Actividad Reciente
                                </h3>
                                <p className="text-[9px] font-mono text-neutral-400 uppercase tracking-wider mt-1">
                                    Últimos 5 registros
                                </p>
                            </div>

                            <Link
                                href="/admin/orders"
                                className="flex items-center gap-1 text-[9px] font-mono font-bold uppercase tracking-wider text-neutral-400 hover:text-neutral-900 transition-colors"
                            >
                                <span>Ver Todo</span>
                                <ArrowUpRight size={11} strokeWidth={2.5} />
                            </Link>
                        </div>

                        {/* Filas de Pedidos */}
                        <div className="space-y-1.5 overflow-y-auto no-scrollbar">
                            {recentOrders.length === 0 ? (
                                <div className="py-8 text-center text-neutral-400 space-y-1.5">
                                    <Package size={18} className="mx-auto text-neutral-300" />
                                    <p className="text-[10px] font-mono uppercase tracking-wider">Sin pedidos recientes</p>
                                </div>
                            ) : (
                                recentOrders.map((order) => {
    const StatusIcon =
        order.status === "pending"
            ? Clock
            : order.status === "paid"
                ? DollarSign
                : order.status === "cancelled"
                    ? XCircle
                    : Truck;

    // 🚀 CONEXIÓN DIRECTA: Usamos la función global para eliminar el error de TypeScript y activar los estados en minúsculas
    const theme = getStatusTheme(order.status);

    return (
        <Link
            href="/admin/orders"
            key={order.id}
            className="flex items-center justify-between p-2.5 rounded-lg hover:bg-[#F6F6F6] transition-colors group"
        >
            <div className="flex items-center gap-3 min-w-0">
                <div className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 transition-colors ${theme.iconWrapper}`}>
                    <StatusIcon size={14} strokeWidth={2.2} />
                </div>

                <div className="min-w-0 truncate">
                    <p className="font-bold text-xs text-neutral-900 truncate leading-snug">
                        {order.customer_name}
                    </p>
                    <span className="text-[10px] font-mono text-neutral-400 font-medium">
                        #{order.order_number}
                    </span>
                </div>
            </div>

            <div className="text-right flex flex-col items-end shrink-0 pl-2">
                <p className="font-mono font-bold text-xs text-neutral-900 tabular-nums">
                    ${Number(order.total_usd).toFixed(2)}
                </p>

                {/* 🚀 BADGE CORREGIDO: Consume theme.label y theme.text sin errores */}
                <div className="flex items-center gap-1.5 mt-0.5">
                    <span className={`w-1 h-1 rounded-full ${theme.dot}`} />
                    <span className={`text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded border ${theme.label}`}>
                        {theme.text}
                    </span>
                </div>
            </div>
        </Link>
    );
})
                            )}
                        </div>
                    </div>

                </div>
            </main>

            {/* MODALES DEL SISTEMA */}
            <ThemeEngineAnnouncement />
            <WelcomeModal storeName={store.name} />
        </div>
    );
}