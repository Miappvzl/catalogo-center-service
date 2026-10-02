

import { createServerClient } from "@supabase/ssr";

import { cookies } from "next/headers";

import Link from "next/link";


import {
   Package, ArrowRight, ArrowUpRight,
    Clock, DollarSign, Truck, XCircle, CheckCircle2, Circle, Play, Trophy, // Nuevos iconos
    MapPin, Users as UsersIcon,
    Lock, // 👈 AÑADE ESTOS ICONOS
} from 'lucide-react'

// COMPONENTES IMPORTADOS

import RateWidget from "@/components/admin/RateWidget";

import AdminHeader from "@/components/admin/AdminHeader";

import AnalyticsChart from "@/components/admin/AnalyticsChart";
import FoodTechAnnouncementModal from "@/components/admin/FoodTechAnnouncementModal"; // 🚀 IMPORTACIÓN
import TopPerformers from "@/components/admin/TopPerformers";
import CriticalStockCardWrapper from "@/components/admin/CriticalStockCardWrapper"; // <-- NUEVA IMPORTACIÓN
import WelcomeModal from "@/components/admin/WelcomeModal";
import PushNotificationManager from "@/components/admin/PushNotificationManager";
import TodaySalesWidget from "@/components/admin/TodaySalesWidget";
import FeatureCollectionModal from "@/components/admin/FeatureCollectionModal";
import { BentoGridWrapper, FadeInBlock } from "@/components/admin/DashboardAnimations";

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
                    iconWrapper: "bg-amber-50 text-amber-600 border border-amber-200/50",
                    dot: "bg-amber-500",
                    label: "text-amber-700 bg-amber-50 border border-amber-200/50",
                    text: "pendiente",
                };
            case "paid":
                return {
                    iconWrapper: "bg-emerald-50 text-emerald-600 border border-emerald-200/50",
                    dot: "bg-emerald-500",
                    label: "text-emerald-700 bg-emerald-50 border border-emerald-200/50",
                    text: "pagado",
                };
            case "cancelled":
                return {
                    iconWrapper: "bg-rose-50 text-rose-600 border border-rose-200/50",
                    dot: "bg-rose-500",
                    label: "text-rose-700 bg-rose-50 border border-rose-200/50",
                    text: "cancelado",
                };
            default: // Enviado / Otros
                return {
                    iconWrapper: "bg-blue-50 text-blue-600 border border-blue-200/50",
                    dot: "bg-blue-500",
                    label: "text-blue-700 bg-blue-50 border border-blue-200/50",
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

  const [
        productsRes,
        variantsRes,
        pendingRes,
        todayOrdersRes,
        configRes,
        recentOrdersRes,
        eventsRes,
    ] = await Promise.all([
        supabase.from("products").select("id", { count: "exact", head: true }).eq("store_id", store.id),
        supabase.from("product_variants").select("stock, products!inner(store_id)").eq("products.store_id", store.id).lte("stock", 3),
        supabase.from("orders").select("id", { count: "exact", head: true }).eq("store_id", store.id).eq("status", "pending"),
        supabase.from("orders").select("total_usd, total_bs, exchange_rate, payment_method").eq("store_id", store.id).gte("created_at", `${today}T00:00:00Z`).neq("status", "cancelled"),
        // 🚀 LECTURA DIRECTA O(1) DE TASAS ACTUALES Y PREVIAS
        supabase.from("app_config").select("usd_rate, eur_rate, previous_usd_rate, previous_eur_rate, updated_at").eq("id", 1).single(),
        supabase.from("orders").select("*").eq("store_id", store.id).order("created_at", { ascending: false }).limit(5),
        supabase.from("analytics_raw_events").select("session_id, event_type, location_state, created_at").eq("store_id", store.id).gte("created_at", fallbackDateString).limit(10000),
    ]);
    const totalProducts = productsRes.count || 0;
    const lowStockCount = variantsRes.data?.length || 0;
    const pendingOrdersCount = pendingRes.count || 0;
    const todayOrders = todayOrdersRes.data || [];

const usdRate = Number(configRes.data?.usd_rate ?? 0);
    const eurRate = Number(configRes.data?.eur_rate ?? 0);

    // 🚀 ASIGNACIÓN DIRECTA E INFALIBLE (0ms de latencia, 0 consumo de CPU)
    const prevUsdRate = Number(configRes.data?.previous_usd_rate ?? usdRate);
    const prevEurRate = Number(configRes.data?.previous_eur_rate ?? eurRate);
 // 🚀 MOTOR MATEMÁTICO DE LIQUIDEZ Y VENTAS HOY (100% Sincronizado)
    let salesTodayUSD = 0;
    let cashTotalUSD = 0;
    const digitalMethodsMap: Record<string, number> = {};

    todayOrders.forEach((o: any) => {
        const orderTotal = Number(o.total_usd || 0);
        salesTodayUSD += orderTotal;

        if (o.split_payments && Array.isArray(o.split_payments) && o.split_payments.length > 0) {
            // Audita pagos mixtos
            o.split_payments.forEach((sp: any) => {
                const spMethod = (sp.method || '').toLowerCase();
                const spAmountUsd = Number(sp.amount_usd || 0);
                if (spMethod.includes('efectivo') || spMethod === 'cash' || spMethod === 'usd') {
                    cashTotalUSD += spAmountUsd;
                } else {
                    const niceName = sp.method || 'Digital';
                    digitalMethodsMap[niceName] = (digitalMethodsMap[niceName] || 0) + spAmountUsd;
                }
            });
        } else {
            // Audita pagos únicos
            const method = (o.payment_method || '').toLowerCase();
            const niceName = o.payment_method || 'Digital';
            if (method.includes('efectivo') || method === 'cash' || method === 'usd') {
                cashTotalUSD += orderTotal;
            } else {
                digitalMethodsMap[niceName] = (digitalMethodsMap[niceName] || 0) + orderTotal;
            }
        }
    });

    // 🚀 PARIDAD MATEMÁTICA CON LA TASA EN PANTALLA ($30.00 * 842.20 = Bs 25.266,00)
    const salesTodayBs = salesTodayUSD * usdRate;

    const digitalTotalUSD = salesTodayUSD - cashTotalUSD;
    const cashPct = salesTodayUSD > 0 ? Math.round((cashTotalUSD / salesTodayUSD) * 100) : 0;
    const digitalPct = salesTodayUSD > 0 ? 100 - cashPct : 0;

    // Ordenamos los métodos digitales de mayor a menor volumen
    const sortedDigitalMethods = Object.entries(digitalMethodsMap)
        .sort((a, b) => b[1] - a[1])
        .map(([name, amount]) => ({ name, amount }));






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

    const missions = store.onboarding_missions || { mission_1: false, mission_2: false, mission_3: false, mission_4: false };
    const completedCount = [missions.mission_1, missions.mission_2, missions.mission_3, missions.mission_4].filter(Boolean).length;
    const allMissionsCompleted = completedCount === 4;

    // Solo mostramos el panel si tiene menos de 7 días y NO ha completado todo
    const showMissionControl = isEligibleForMissions && !allMissionsCompleted;
    const storeUrl = `${store.slug}.preziso.shop`;
    const isRestaurant = store.store_type === 'restaurant';
return (
     // 🚀 FIX: overflow-x-clip corta el desbordamiento fantasma SIN crear contexto de scroll y SIN romper position: sticky
<div className="min-h-screen w-full bg-[#F6F6F6] pb-32 font-sans text-gray-900 selection:bg-black selection:text-white relative overflow-x-clip">
            <AdminHeader store={store} />

            <main className="w-full max-w-7xl mx-auto px-3 sm:px-4 md:px-8 py-4 sm:py-6 md:py-8 space-y-4 sm:space-y-6 relative z-10">
                <PushNotificationManager storeId={store.id} />

                {/* =======================================================
                    MODO ENFOQUE: BENTO GRID COMPACTO DE ALTA DENSIDAD
                ======================================================= */}
                {showMissionControl ? (
                    <div className="w-full max-w-5xl mx-auto space-y-4 pt-2 md:pt-4 pb-16 animate-in fade-in duration-300">
                        
                        {/* Cabecera Técnica */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4 px-1">
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
                                    <h2 className="text-xs font-bold font-mono uppercase tracking-wider text-neutral-900">
                                        Modo Configuración
                                    </h2>
                                </div>
                                <p className="text-[11px] text-neutral-500 font-normal mt-0.5 leading-snug">
                                    Completa las misiones iniciales para activar la telemetría y métricas avanzadas.
                                </p>
                            </div>

                            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-neutral-200/60 shadow-[0_2px_8px_rgba(0,0,0,0.02)] self-start sm:self-auto shrink-0">
                                <span className="text-xs font-mono font-bold text-neutral-900 tabular-nums">
                                    {completedCount}/4
                                </span>
                                <span className="text-[9px] font-mono font-semibold text-neutral-400 uppercase tracking-wider">
                                    Completadas
                                </span>
                            </div>
                        </div>

                        {/* BENTO GRID SIMÉTRICO DE 3 COLUMNAS */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 w-full">
                            
                            {/* 1. MISIÓN OBSIDIANA CON GLOW INTERNO */}
                            <Link 
                                href={missions.mission_1 ? "#" : "/admin/product/new?mission=1"} 
                                className={`group md:col-span-2 bg-[#0C0D0E] text-white p-4 sm:p-5 md:p-6 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex flex-col justify-between relative overflow-hidden transition-all duration-200 border border-neutral-800 w-full ${missions.mission_1 ? 'opacity-70 cursor-default' : 'hover:border-neutral-700 active:scale-[0.995]'}`}
                            >
                                <div className="absolute inset-0 shadow-[inset_0_0_24px_rgba(255,255,255,0.06)] pointer-events-none rounded-xl" />
                                <div className="absolute -top-12 -right-12 w-40 h-40 bg-white/5 rounded-full blur-2xl pointer-events-none transform-gpu" />

                                <div className="flex justify-between items-start gap-2 relative z-10 w-full">
                                    <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1">
                                        <div className="w-8 h-8 rounded-lg bg-white/10 text-white flex items-center justify-center shrink-0 border border-white/5">
                                            {missions.mission_1 ? <CheckCircle2 size={15} className="text-emerald-400" /> : <span className="font-mono text-xs font-bold text-neutral-200">01</span>}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <span className="text-[9px] font-mono font-semibold text-neutral-400 uppercase tracking-wider block">
                                                Fase Inicial
                                            </span>
                                            <h3 className={`text-xs font-bold uppercase tracking-wider truncate ${missions.mission_1 ? 'text-neutral-500 line-through' : 'text-white'}`}>
                                                {isRestaurant ? "Tu Primer Plato" : "Tu Primer Producto"}
                                            </h3>
                                        </div>
                                    </div>

                                    {!missions.mission_1 && (
                                        <div className="flex items-center gap-1.5 text-[9px] font-mono font-bold uppercase tracking-wider text-neutral-900 bg-white px-2.5 py-1 rounded transition-colors group-hover:bg-neutral-200 shadow-xs shrink-0">
                                            <span>Iniciar</span>
                                            <Play size={9} className="fill-neutral-900" />
                                        </div>
                                    )}
                                </div>

                                <div className="relative z-10 mt-5 pt-3.5 border-t border-white/5 flex items-center justify-between gap-3 w-full">
                                    <p className="text-xs text-neutral-400 font-normal leading-relaxed min-w-0 flex-1">
                                        {isRestaurant ? "Registra un plato insignia y observa el cálculo a tasa BCV." : "Sube un producto básico para verificar el motor cambiario en vivo."}
                                    </p>
                                    {!missions.mission_1 && (
                                        <ArrowRight size={13} className="text-neutral-500 group-hover:text-white group-hover:translate-x-0.5 transition-all shrink-0" />
                                    )}
                                </div>
                            </Link>

                            {/* WIDGET BCV */}
                            <div className="col-span-1 h-full min-h-[190px] w-full">
                                <RateWidget 
                                    storeCurrency={storeCurrency} 
                                    usdRate={usdRate} 
                                    eurRate={eurRate} 
                                    prevUsdRate={prevUsdRate} 
                                    prevEurRate={prevEurRate} 
                                    lastUpdated={formattedLastUpdated} 
                                />
                            </div>

                            {/* 2. CARTA WHITE CLEAN (Misión 2) */}
                            <Link 
                                href={missions.mission_2 ? "#" : "/admin/product/new?mission=2"} 
                                className={`bg-white p-4 sm:p-5 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.02)] border border-neutral-200/60 flex flex-col justify-between group transition-all duration-200 w-full ${missions.mission_2 ? 'bg-neutral-50/50 opacity-60 cursor-default' : 'hover:border-neutral-300 hover:shadow-xs active:scale-[0.99]'}`}
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div className="w-8 h-8 rounded-lg bg-[#F6F6F6] text-neutral-900 flex items-center justify-center shrink-0 border border-neutral-100 font-mono text-xs font-bold">
                                        {missions.mission_2 ? <CheckCircle2 size={15} className="text-emerald-500" /> : "02"}
                                    </div>
                                    {!missions.mission_2 && (
                                        <ArrowUpRight size={13} strokeWidth={2.2} className="text-neutral-400 group-hover:text-neutral-900 transition-colors" />
                                    )}
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[9px] font-mono font-semibold text-neutral-400 uppercase tracking-wider mb-1">
                                        Estructura
                                    </p>
                                    <h3 className={`text-xs font-bold uppercase tracking-wider leading-snug truncate ${missions.mission_2 ? 'text-neutral-400 line-through' : 'text-neutral-900'}`}>
                                        {isRestaurant ? "Extras y Modificadores" : "Tallas y Colores"}
                                    </h3>
                                    <p className="text-xs text-neutral-500 font-normal leading-relaxed mt-1.5">
                                        {isRestaurant ? "Configura términos de cocina y adicionales." : "Genera combinaciones con control de stock individual."}
                                    </p>
                                </div>
                            </Link>

                            {/* 3. CARTA WHITE CLEAN (Misión 3) */}
                            <Link 
                                href={missions.mission_3 ? "#" : "/admin/product/new?mission=3"} 
                                className={`bg-white p-4 sm:p-5 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.02)] border border-neutral-200/60 flex flex-col justify-between group transition-all duration-200 w-full ${missions.mission_3 ? 'bg-neutral-50/50 opacity-60 cursor-default' : 'hover:border-neutral-300 hover:shadow-xs active:scale-[0.99]'}`}
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div className="w-8 h-8 rounded-lg bg-[#F6F6F6] text-neutral-900 flex items-center justify-center shrink-0 border border-neutral-100 font-mono text-xs font-bold">
                                        {missions.mission_3 ? <CheckCircle2 size={15} className="text-emerald-500" /> : "03"}
                                    </div>
                                    {!missions.mission_3 && (
                                        <ArrowUpRight size={13} strokeWidth={2.2} className="text-neutral-400 group-hover:text-neutral-900 transition-colors" />
                                    )}
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[9px] font-mono font-semibold text-neutral-400 uppercase tracking-wider mb-1">
                                        Estrategia
                                    </p>
                                    <h3 className={`text-xs font-bold uppercase tracking-wider leading-snug truncate ${missions.mission_3 ? 'text-neutral-400 line-through' : 'text-neutral-900'}`}>
                                        {isRestaurant ? "Tiempos y Ofertas" : "Estrategia de Ventas"}
                                    </h3>
                                    <p className="text-xs text-neutral-500 font-normal leading-relaxed mt-1.5">
                                        {isRestaurant ? "Establece preparación y platos destacados." : "Aplica descuentos, ventas al mayor y precios tachados."}
                                    </p>
                                </div>
                            </Link>

                            {/* 4. CARTA WHITE CLEAN (Misión 4) */}
                            <Link 
                                href={missions.mission_4 ? "#" : "/admin/product/new?mission=4"} 
                                className={`bg-white p-4 sm:p-5 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.02)] border border-neutral-200/60 flex flex-col justify-between group transition-all duration-200 w-full ${missions.mission_4 ? 'bg-neutral-50/50 opacity-60 cursor-default' : 'hover:border-neutral-300 hover:shadow-xs active:scale-[0.99]'}`}
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div className="w-8 h-8 rounded-lg bg-[#F6F6F6] text-neutral-900 flex items-center justify-center shrink-0 border border-neutral-100 font-mono text-xs font-bold">
                                        {missions.mission_4 ? <CheckCircle2 size={15} className="text-emerald-500" /> : "04"}
                                    </div>
                                    {!missions.mission_4 && (
                                        <ArrowUpRight size={13} strokeWidth={2.2} className="text-neutral-400 group-hover:text-neutral-900 transition-colors" />
                                    )}
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[9px] font-mono font-semibold text-neutral-400 uppercase tracking-wider mb-1">
                                        Rentabilidad
                                    </p>
                                    <h3 className={`text-xs font-bold uppercase tracking-wider leading-snug truncate ${missions.mission_4 ? 'text-neutral-400 line-through' : 'text-neutral-900'}`}>
                                        {isRestaurant ? "Margen Cambiario" : "Incentivo Divisas"}
                                    </h3>
                                    <p className="text-xs text-neutral-500 font-normal leading-relaxed mt-1.5">
                                        {isRestaurant ? "Protege tus costos y premia pagos en efectivo." : "Protege márgenes contra inflación y activa descuentos."}
                                    </p>
                                </div>
                            </Link>
                        </div>

                        {/* INCENTIVO DISCRETO */}
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-1.5 sm:gap-2 pt-3 text-center px-2">
                            <div className="flex items-center gap-1.5 text-neutral-400 shrink-0">
                                <Lock size={12} strokeWidth={2.2} />
                                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-500">
                                    Dashboard Bloqueado
                                </span>
                            </div>
                            <span className="hidden sm:inline text-neutral-300">•</span>
                            <p className="text-xs text-neutral-500 font-normal">
                                Completa las <strong className="text-neutral-900 font-semibold">{4 - completedCount} {4 - completedCount === 1 ? 'misión restante' : 'misiones restantes'}</strong> para desbloquear analítica geográfica, tráfico y flujo de caja en vivo.
                            </p>
                        </div>
                    </div>
                ) : (
                  /* =======================================================
                        MODO COMPLETO: DASHBOARD DESBLOQUEADO (MOMENTO WOW)
                    ======================================================= */
                    <BentoGridWrapper>
                        {/* FILA 1: RATE WIDGET */}
                        <FadeInBlock className="col-span-1 min-h-[160px] w-full">
                            <RateWidget storeCurrency={storeCurrency} usdRate={usdRate} eurRate={eurRate} prevUsdRate={prevUsdRate} prevEurRate={prevEurRate} lastUpdated={formattedLastUpdated} />
                        </FadeInBlock>

                       {/* FILA 1: VENTAS HOY (Estiramiento vertical forzado al 100% de la fila) */}
<FadeInBlock className="col-span-1 w-full h-full flex flex-col [&>*]:h-full [&>*]:flex-1 [&>*]:flex [&>*]:flex-col [&>*]:justify-between">
    <TodaySalesWidget
        currencySymbol={currencySymbol}
        salesTodayUSD={salesTodayUSD}
        salesTodayBs={salesTodayBs}
        cashPct={cashPct}
        digitalPct={digitalPct}
        cashTotalUSD={cashTotalUSD}
        digitalTotalUSD={digitalTotalUSD}
        sortedDigitalMethods={sortedDigitalMethods}
    />
</FadeInBlock>

                        {/* FILA 1: POR DESPACHAR */}
                        <FadeInBlock className="col-span-1 min-h-[140px] w-full">
                            <Link href="/admin/orders" className="bg-[#0a0a0a] text-white p-5 md:p-6 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] flex flex-col justify-between h-full group relative overflow-hidden transition-transform hover:-translate-y-1 active:scale-[0.99]">
                               <div className="absolute -top-10 -right-10 w-32 h-32 bg-amber-500/15 rounded-full blur-2xl pointer-events-none transform-gpu" />
<div className="absolute -bottom-10 -left-10 w-24 h-24 bg-amber-600/10 rounded-full blur-xl pointer-events-none transform-gpu" />
                                <div className="flex justify-between items-start relative z-10">
                                    <div className="w-10 h-10 rounded-xl bg-white/10 text-white flex items-center justify-center shrink-0">
                                        <Clock size={18} strokeWidth={2.2} />
                                    </div>
                                    {pendingOrdersCount > 0 ? (
                                        <div className="flex items-center gap-1.5 bg-amber-400/10 border-none px-2 py-0.5 rounded">
                                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                                            <span className="text-[9px] font-bold font-mono uppercase tracking-wider text-amber-300">Acción</span>
                                        </div>
                                    ) : (
                                        <span className="text-[9px] font-mono text-neutral-500 uppercase tracking-wider">Al día</span>
                                    )}
                                </div>
                                <div className="relative z-10 mt-4">
                                    <p className="text-4xl md:text-5xl font-mono font-bold tracking-tight text-white leading-none tabular-nums">{pendingOrdersCount}</p>
                                    <div className="flex items-center gap-1.5 mt-3 text-neutral-400 group-hover:text-amber-200 transition-colors">
                                        <p className="text-[10px] font-bold uppercase tracking-wider">Por Despachar</p>
                                        <ArrowRight size={12} className="transition-transform group-hover:translate-x-1" strokeWidth={2.5} />
                                    </div>
                                </div>
                            </Link>
                        </FadeInBlock>

                        {/* FILA 1: STOCK CRÍTICO */}
                        <FadeInBlock className="col-span-1 min-h-[140px] w-full">
                            <CriticalStockCardWrapper lowStockCount={lowStockCount} totalProducts={totalProducts} storeId={store.id} />
                        </FadeInBlock>

                        {/* FILA 2: GRÁFICO GIGANTE */}
                        <FadeInBlock className="col-span-1 md:col-span-2 lg:col-span-4 min-h-[350px] w-full">
                            {store?.id ? <AnalyticsChart storeId={store.id} /> : null}
                        </FadeInBlock>

                        {/* =======================================================
                            🚀 FILA 3 RESTAURADA: TELEMETRÍA NACIONAL (3 CARTAS)
                        ======================================================= */}
                        {store?.id && (
                            <FadeInBlock className="col-span-1 sm:col-span-2 lg:col-span-4 w-full">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-4 w-full">

                                    {/* Tarjeta 1: Visitantes con Histograma Real de 7 Días */}
                                    <div className="bg-white p-5 rounded-xl border border-neutral-100 shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex flex-col justify-between min-h-[160px] relative overflow-hidden">
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="w-8 h-8 rounded-lg bg-[#F6F6F6] text-neutral-900 flex items-center justify-center shrink-0 border border-neutral-100">
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
                                    <div className="bg-white p-5 rounded-xl border border-neutral-100 shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex flex-col justify-between min-h-[160px]">
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="w-8 h-8 rounded-lg bg-[#F6F6F6] text-neutral-900 flex items-center justify-center shrink-0 border border-neutral-100">
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
                                    <div className="bg-white p-5 rounded-xl border border-neutral-100 shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex flex-col justify-between min-h-[160px]">
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="w-8 h-8 rounded-lg bg-[#F6F6F6] text-neutral-900 flex items-center justify-center shrink-0 border border-neutral-100">
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
                            </FadeInBlock>
                        )}

                        {/* FILA 4: INTELIGENCIA DE VENTAS (TOP PERFORMERS) */}
                        <FadeInBlock className="col-span-1 sm:col-span-2 lg:col-span-2 w-full">
                            {store?.id ? <TopPerformers storeId={store.id} /> : null}
                        </FadeInBlock>

                        {/* FILA 4: ACTIVIDAD RECIENTE (ÚLTIMOS PEDIDOS) */}
                        <FadeInBlock className="col-span-1 sm:col-span-2 lg:col-span-2 bg-white p-6 rounded-2xl border border-neutral-100 shadow-[0_20px_50px_rgba(0,0,0,0.03)] flex flex-col justify-between overflow-hidden w-full">
                            <div className="flex justify-between items-center mb-5">
                                <div>
                                    <h3 className="text-sm font-black text-[#0a0a0a] uppercase tracking-wider leading-none">Actividad Reciente</h3>
                                    <p className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider mt-1.5">Últimos 5 registros</p>
                                </div>
                                <Link href="/admin/orders" className="flex items-center gap-1 text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-400 hover:text-[#0a0a0a] transition-colors">
                                    <span>Ver Todo</span>
                                    <ArrowUpRight size={12} strokeWidth={2.5} />
                                </Link>
                            </div>

                            <div className="space-y-1.5 overflow-y-auto no-scrollbar">
                                {recentOrders.length === 0 ? (
                                    <div className="py-8 text-center text-neutral-400 space-y-2">
                                        <Package size={20} className="mx-auto text-neutral-300" />
                                        <p className="text-[10px] font-mono uppercase tracking-wider">Sin pedidos recientes</p>
                                    </div>
                                ) : (
                                    recentOrders.map((order) => {
                                        const StatusIcon = order.status === "pending" ? Clock : order.status === "paid" ? DollarSign : order.status === "cancelled" ? XCircle : Truck;
                                        const theme = getStatusTheme(order.status);
                                        return (
                                            <Link href="/admin/orders" key={order.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-neutral-50 hover:shadow-sm border border-transparent hover:border-neutral-100 transition-all group">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-colors ${theme.iconWrapper}`}>
                                                        <StatusIcon size={16} strokeWidth={2.2} />
                                                    </div>
                                                    <div className="min-w-0 truncate">
                                                        <p className="font-bold text-sm text-[#0a0a0a] truncate leading-snug">{order.customer_name}</p>
                                                        <span className="text-[10px] font-mono text-neutral-400 font-medium">#{order.order_number}</span>
                                                    </div>
                                                </div>
                                                <div className="text-right flex flex-col items-end shrink-0 pl-2">
                                                    <p className="font-mono font-bold text-sm text-[#0a0a0a] tabular-nums">${Number(order.total_usd).toFixed(2)}</p>
                                                    <div className="flex items-center gap-1.5 mt-1">
                                                        <span className={`w-1.5 h-1.5 rounded-full ${theme.dot}`} />
                                                        <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border ${theme.label}`}>{theme.text}</span>
                                                    </div>
                                                </div>
                                            </Link>
                                        );
                                    })
                                )}
                            </div>
                        </FadeInBlock>
                    </BentoGridWrapper>
                )}
            </main>

            <WelcomeModal storeName={store.name} />
           
        </div>
    );
}