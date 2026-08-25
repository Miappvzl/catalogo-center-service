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
                    // Reposo: Amarillo sutil. Hover: Amarillo sólido. Active: Amarillo profundo.
                    iconWrapper:
                        "bg-yellow-50 text-yellow-700 group-hover:bg-yellow-500 group-hover:text-white active:bg-yellow-600",
                    dot: "bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.4)]",
                    label: "text-yellow-700",
                    text: "Pendiente",
                };
            case "paid":
                return {
                    // Reposo: Fondo sutil esmeralda. Hover: Esmeralda sólido. Active: Esmeralda oscuro.
                    iconWrapper:
                        "bg-emerald-50 text-emerald-600 group-hover:bg-emerald-500 group-hover:text-white active:bg-emerald-600",
                    dot: "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]",
                    label: "text-emerald-600",
                    text: "Pagado",
                };
            case "cancelled":
                return {
                    // Reposo: Fondo sutil rojo. Hover: Rojo sólido. Active: Rojo oscuro.
                    iconWrapper:
                        "bg-red-50 text-red-600 group-hover:bg-red-500 group-hover:text-white active:bg-red-600",
                    dot: "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]",
                    label: "text-red-600",
                    text: "Cancelado",
                };
            default: // Enviado / Otros
                return {
                    // Mantiene el alto contraste blanco/negro estándar
                    iconWrapper:
                        "bg-[#f6f6f6] text-gray-900 group-hover:bg-black group-hover:text-white active:bg-gray-800",
                    dot: "bg-gray-400 shadow-[0_0_8px_rgba(156,163,175,0.4)]",
                    label: "text-gray-500",
                    text: "Enviado",
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

            

            <main className="max-w-7xl mx-auto px-4 md:px-8 py-8 space-y-6 md:space-y-8 relative z-10">

                  {/* 🚀 INYECTA EL BANNER DE NOTIFICACIONES EN LA PARTE SUPERIOR DEL MAIN */}
                <PushNotificationManager storeId={store.id} />


                {/* --- BENTO GRID SYSTEM 2.0 (BORDERLESS) --- */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                    {/* 1. RATE WIDGET */}

                    <div className="col-span-1 min-h-[160px]">
                        <RateWidget
                            storeCurrency={storeCurrency}
                            usdRate={usdRate}
                            eurRate={eurRate}
                            lastUpdated={formattedLastUpdated}
                        />
                    </div>

                    {/* 2. VENTAS HOY */}
                    <div className="bg-white p-6 rounded-[var(--radius-card)] flex flex-col justify-between group min-h-[160px] transition-all duration-500 ease-out hover:shadow-[0_4px_20px_-10px_rgba(0,0,0,0.04)] active:scale-[0.98] active:bg-[#fafafa] cursor-default">
                        <div className="flex justify-between items-start relative z-10">
                            {/* Contenedor del Ícono: Polaridad Activa en Hover */}
                            <div className="w-11 h-11 rounded-[var(--radius-btn)] bg-[#f6f6f6] text-gray-900 group-hover:bg-black group-hover:text-white transition-all duration-500 ease-out flex items-center justify-center shrink-0">
                                <DollarSign
                                    size={18}
                                    strokeWidth={2.2}
                                    className="group-hover:scale-110 transition-transform duration-500 ease-out"
                                />
                            </div>

                            {/* Badge 'Hoy': Paleta Titanium con Status Dot en tiempo real */}
                            <div className="flex items-center gap-1.5 bg-gray-900 text-white px-2.5 py-1 rounded-[var(--radius-badge)] shadow-sm">
                                <span className="w-1 h-1 rounded-full bg-white animate-pulse"></span>
                                <span className="text-[9px] font-bold uppercase tracking-widest">
                                    Hoy
                                </span>
                            </div>
                        </div>

                        <div className="relative z-10 mt-2">
                            {/* Cifra Financiera: Tabular nums y Micro-desplazamiento */}
                            <p className="text-4xl font-black tracking-tighter text-gray-900 leading-none group-hover:translate-x-0.5 transition-transform duration-500 ease-out tabular-nums">
                                {currencySymbol}
                                {salesTodayUSD.toFixed(2)}
                            </p>

                            {/* Etiqueta Auxiliar: Contraste Editorial */}
                            <div className="flex items-center gap-2 mt-2.5">
                                <LineChart
                                    size={14}
                                    strokeWidth={2.5}
                                    className="text-gray-400 group-hover:text-gray-900 transition-colors duration-500 ease-out"
                                />
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest group-hover:text-gray-900 transition-colors duration-500 ease-out">
                                    Ingreso Neto
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* 3. PEDIDOS PENDIENTES (Dark Luxury Hardware Node) */}
                    <Link
                        href="/admin/orders"
                        className="bg-black text-white p-6 rounded-[var(--radius-card)] flex flex-col justify-between group relative overflow-hidden transition-all duration-500 ease-out active:scale-[0.98] active:bg-[#0a0a0a] hover:shadow-[0_8px_30px_-10px_rgba(0,0,0,0.5)] min-h-[160px]"
                    >
                        {/* Efecto Cinematográfico: Backlight Bloom */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none group-hover:bg-white/10 transition-all duration-500 ease-out"></div>

                        <div className="flex justify-between items-start relative z-10">
                            {/* Contenedor del Ícono: Regla matemática 11x11 y brillo interactivo */}
                            <div className="w-11 h-11 rounded-[var(--radius-btn)] bg-white/5 text-gray-300 group-hover:bg-white/10 group-hover:text-white transition-all duration-500 ease-out flex items-center justify-center shrink-0">
                                <Clock
                                    size={18}
                                    strokeWidth={2.2}
                                    className="group-hover:scale-110 transition-transform duration-500 ease-out"
                                />
                            </div>

                            {/* Badge de Acción: Estética Glassmorphism Premium (Cero rojo) */}
                            {pendingOrdersCount > 0 && (
                                <div className="flex items-center gap-1.5 bg-white/10 border border-white/5 px-2.5 py-1 rounded-[var(--radius-badge)] backdrop-blur-md shadow-sm">
                                    <span className="w-1 h-1 rounded-full bg-white shadow-[0_0_6px_rgba(255,255,255,0.9)] animate-pulse"></span>
                                    <span className="text-[9px] font-bold text-gray-200 uppercase tracking-widest mt-[1px]">
                                        Acción
                                    </span>
                                </div>
                            )}
                        </div>

                        <div className="relative z-10 mt-2">
                            {/* Cifra Inmutable: tabular-nums y micro-desplazamiento */}
                            <p className="text-4xl font-black tracking-tighter text-white leading-none mb-2.5 tabular-nums group-hover:translate-x-0.5 transition-transform duration-500 ease-out">
                                {pendingOrdersCount}
                            </p>

                            {/* Jerarquía de salida (Affordance) */}
                            <div className="flex items-center gap-2">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest group-hover:text-white transition-colors duration-500 ease-out">
                                    Por Despachar
                                </p>
                                <ArrowRight
                                    size={14}
                                    className="text-gray-500 group-hover:text-white transition-all duration-500 ease-out translate-x-0 group-hover:translate-x-1"
                                    strokeWidth={2.5}
                                />
                            </div>
                        </div>
                    </Link>

                  {/* 4. ALERTAS DE INVENTARIO (INTELIGENTES) */}
                    <CriticalStockCardWrapper
                        lowStockCount={lowStockCount}
                        totalProducts={totalProducts}
                        storeId={store.id}
                    />

                   


                    {/* --- FILA 2: GRÁFICO GIGANTE --- */}
                    <div className="col-span-1 md:col-span-2 lg:col-span-4 min-h-[350px]">
                        {store?.id ? <AnalyticsChart storeId={store.id} /> : null}
                    </div>

                    {/* 🚀 NUEVA FILA 3 REDISEÑADA: MICRO-ANALÍTICAS CON GRÁFICOS REALES */}
                    {store?.id && (
                        <div className="col-span-1 md:col-span-2 lg:col-span-4 grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                            
                            {/* Tarjeta 1: Visitantes con Histograma Real de 7 Días */}
                            <div className="bg-white p-6 rounded-[var(--radius-card)] flex flex-col justify-between group transition-all duration-500 ease-out hover:shadow-[0_4px_20px_-10px_rgba(0,0,0,0.04)] min-h-[190px] relative overflow-hidden">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="w-11 h-11 rounded-[var(--radius-btn)] bg-[#f6f6f6] text-gray-900 group-hover:bg-black group-hover:text-white transition-all duration-500 ease-out flex items-center justify-center shrink-0">
                                        <UsersIcon size={18} strokeWidth={2.2} className="group-hover:scale-110 transition-transform duration-500 ease-out" />
                                    </div>
                                    
                                    {/* Botón CTA Superior */}
                                    <Link 
                                        href="/admin/analytics" 
                                        className="group/btn flex items-center gap-1 bg-[#f6f6f6] hover:bg-neutral-900 text-neutral-500 hover:text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-1.5 rounded-full transition-all duration-300"
                                    >
                                        <span>Ver todo</span>
                                        <ArrowUpRight size={12} className="group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
                                    </Link>
                                </div>

                                <div className="flex items-end justify-between mt-auto">
                                    <div>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 group-hover:text-gray-900 transition-colors duration-500">
                                            Visitantes Únicos (30d)
                                        </p>
                                        <p className="text-4xl font-black tracking-tighter text-gray-900 leading-none tabular-nums group-hover:translate-x-0.5 transition-transform duration-500 ease-out">
                                            {visitsCount.toLocaleString()}
                                        </p>
                                    </div>

                                    {/* Histograma real de los últimos 7 días */}
                                    <div className="flex items-end gap-1 h-8 px-1">
                                        {dailyTrafficCounts.map((count, i) => {
                                            const heightPct = (count / maxDailyTraffic) * 100;
                                            return (
                                                <div 
                                                    key={i} 
                                                    className="w-1.5 bg-neutral-200 group-hover:bg-neutral-950 rounded-t-xs transition-all duration-500" 
                                                    style={{ height: `${Math.max(15, heightPct)}%` }}
                                                    title={`Día ${i + 1}: ${count} visitas`}
                                                />
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            {/* Tarjeta 2: Foco Geográfico con Desglose Top 2 */}
                            <div className="bg-white p-6 rounded-[var(--radius-card)] flex flex-col justify-between group transition-all duration-500 ease-out hover:shadow-[0_4px_20px_-10px_rgba(0,0,0,0.04)] min-h-[190px] relative">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="w-11 h-11 rounded-[var(--radius-btn)] bg-[#f6f6f6] text-gray-900 group-hover:bg-black group-hover:text-white transition-all duration-500 ease-out flex items-center justify-center shrink-0">
                                        <MapPin size={18} strokeWidth={2.2} className="group-hover:scale-110 transition-transform duration-500 ease-out" />
                                    </div>

                                    {/* Botón CTA Superior */}
                                    <Link 
                                        href="/admin/analytics" 
                                        className="group/btn flex items-center gap-1 bg-[#f6f6f6] hover:bg-neutral-900 text-neutral-500 hover:text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-1.5 rounded-full transition-all duration-300"
                                    >
                                        <span>Ver mapa</span>
                                        <ArrowUpRight size={12} className="group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
                                    </Link>
                                </div>

                                <div className="mt-auto space-y-3">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest group-hover:text-gray-900 transition-colors duration-500">
                                        Top Regiones
                                    </p>
                                    
                                    {topLocationsList.length === 0 ? (
                                        <p className="font-bold text-lg text-gray-900">Sin datos geográficos</p>
                                    ) : (
                                        <div className="space-y-2">
                                            {topLocationsList.map((loc, idx) => (
                                                <div key={loc.name} className="space-y-1">
                                                    <div className="flex justify-between text-xs font-bold text-gray-900">
                                                        <span className="truncate max-w-[140px]">{loc.name}</span>
                                                        <span className="font-mono tabular-nums text-neutral-500">{loc.pct}%</span>
                                                    </div>
                                                    <div className="h-1.5 w-full bg-neutral-100 rounded-full overflow-hidden">
                                                        <div 
                                                            className={`h-full transition-all duration-500 ${idx === 0 ? 'bg-neutral-950' : 'bg-neutral-400'}`} 
                                                            style={{ width: `${loc.pct}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Tarjeta 3: Horario Activo con Desglose de Fases del Día */}
                            <div className="bg-white p-6 rounded-[var(--radius-card)] flex flex-col justify-between group transition-all duration-500 ease-out hover:shadow-[0_4px_20px_-10px_rgba(0,0,0,0.04)] min-h-[190px] relative">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="w-11 h-11 rounded-[var(--radius-btn)] bg-[#f6f6f6] text-gray-900 group-hover:bg-black group-hover:text-white transition-all duration-500 ease-out flex items-center justify-center shrink-0">
                                        <Clock size={18} strokeWidth={2.2} className="group-hover:scale-110 transition-transform duration-500 ease-out" />
                                    </div>

                                    {/* Botón CTA Superior */}
                                    <Link 
                                        href="/admin/analytics" 
                                        className="group/btn flex items-center gap-1 bg-[#f6f6f6] hover:bg-neutral-900 text-neutral-500 hover:text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-1.5 rounded-full transition-all duration-300"
                                    >
                                        <span>Ver horas</span>
                                        <ArrowUpRight size={12} className="group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
                                    </Link>
                                </div>

                                <div className="mt-auto space-y-3">
                                    <div className="flex justify-between items-baseline">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest group-hover:text-gray-900 transition-colors duration-500">
                                            Afluencia por Bloques
                                        </p>
                                        {topBlock && topBlock.pct > 0 && (
                                            <span className="text-[10px] font-extrabold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded uppercase">
                                                Pico: {topBlock.name}
                                            </span>
                                        )}
                                    </div>

                                    {/* Barra horizontal segmentada con etiquetas claras */}
                                    <div className="grid grid-cols-4 gap-1.5 pt-1">
                                        {blockStats.map((block) => {
                                            const isPeak = block.name === topBlock?.name && block.pct > 0;
                                            return (
                                                <div key={block.name} className="flex flex-col items-center gap-1">
                                                    <div className="h-1.5 w-full bg-neutral-100 rounded-full overflow-hidden">
                                                        <div 
                                                            className={`h-full transition-all duration-500 ${isPeak ? 'bg-neutral-950' : 'bg-neutral-300'}`} 
                                                            style={{ width: `${Math.max(10, block.pct)}%` }}
                                                        />
                                                    </div>
                                                    <span className={`text-[9px] font-bold uppercase ${isPeak ? 'text-gray-900' : 'text-gray-400'}`}>
                                                        {block.name.substring(0, 3)}
                                                    </span>
                                                    <span className="text-[9px] font-mono tabular-nums text-gray-500">
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

                    {/* --- FILA 4: INTELIGENCIA Y ACTIVIDAD (Antes era la fila 3) --- */}
                    <div className="col-span-1 md:col-span-2 lg:col-span-2">
                        {store?.id ? <TopPerformers storeId={store.id} /> : null}
                    </div>

                   

                    {/* ÚLTIMOS PEDIDOS */}
                    <div className="col-span-1 md:col-span-2 lg:col-span-2 bg-white rounded-[var(--radius-card)] flex flex-col overflow-hidden relative">
                        {/* Header sin bordes sólidos, estructurado mediante Negative Space */}
                        <div className="p-6 flex justify-between items-center relative z-10">
                            <h3 className="font-black text-gray-900 flex items-center gap-2 text-xs uppercase tracking-widest">
                                Actividad Reciente
                            </h3>

                            {/* Botón fantasma con transición sutil (Titanium feel) */}
                            <Link
                                href="/admin/orders"
                                className="group text-[10px] font-bold text-gray-500 hover:text-gray-900 transition-all duration-300 uppercase tracking-widest rounded-full flex items-center gap-1.5 px-3 py-1.5 hover:bg-[#f6f6f6]"
                            >
                                Ver Todo{" "}
                                <ArrowUpRight
                                    size={14}
                                    className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-300"
                                />
                            </Link>
                        </div>

                        {/* Contenedor de lista utilizando padding y gap en lugar de líneas divisorias */}
                        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-1.5 no-scrollbar">
                            {recentOrders.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-3 min-h-[150px]">
                                    <div className="w-12 h-12 bg-[#f6f6f6] rounded-full flex items-center justify-center">
                                        <Package size={20} className="opacity-30 text-gray-600" />
                                    </div>
                                    <p className="text-[10px] font-bold uppercase tracking-widest opacity-60 text-gray-500">
                                        Sin pedidos recientes
                                    </p>
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
                                                    : Package;

                                    // 1. Invocamos la configuración de diseño para este estado exacto
                                    const theme = getStatusTheme(order.status);

                                    return (
                                        <Link
                                            href="/admin/orders"
                                            key={order.id}
                                            className="group flex items-center justify-between p-3.5 bg-white hover:bg-[#fafafa] active:bg-[#f0f0f0] active:scale-[0.98] transition-all duration-300 ease-out rounded-[var(--radius-card)] hover:shadow-[0_4px_20px_-10px_rgba(0,0,0,0.04)]"
                                        >
                                            <div className="flex items-center gap-4">
                                                {/* Contenedor de Ícono: Inyectamos los colores dinámicos del theme */}
                                                <div
                                                    className={`w-11 h-11 rounded-[var(--radius-btn)] transition-all duration-300 ease-out flex items-center justify-center shrink-0 ${theme.iconWrapper}`}
                                                >
                                                    <StatusIcon
                                                        size={18}
                                                        strokeWidth={2.2}
                                                        className="group-hover:scale-110 transition-transform duration-300 ease-out"
                                                    />
                                                </div>

                                                <div>
                                                    <p className="font-bold text-sm text-gray-900 leading-none mb-1.5 truncate max-w-[120px] sm:max-w-[200px] group-hover:translate-x-0.5 transition-transform duration-300">
                                                        {order.customer_name}
                                                    </p>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-wider">
                                                            #{order.order_number}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="text-right flex flex-col items-end">
                                                <p className="font-black text-sm text-gray-900">
                                                    ${Number(order.total_usd).toFixed(2)}
                                                </p>

                                                {/* Status Dot y Label: Eliminamos los ternarios y usamos el theme */}
                                                <div className="flex items-center gap-1.5 mt-1.5">
                                                    <span
                                                        className={`w-1.5 h-1.5 rounded-full ${theme.dot}`}
                                                    ></span>
                                                    <span
                                                        className={`text-[9px] font-bold uppercase tracking-widest ${theme.label}`}
                                                    >
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

            {/* 🚀 INYECCIÓN DEL MODAL DE BIENVENIDA */}
            <ThemeEngineAnnouncement/>
            <WelcomeModal storeName={store.name} />
        </div>
    );
}
