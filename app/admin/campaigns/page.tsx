import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AdminHeader from "@/components/admin/AdminHeader";
import CategorySorter from "@/components/admin/CategorySorter";
import { Megaphone, Lock, Sparkles, CheckCircle2, ArrowRight, MousePointerClick } from "lucide-react";
import Link from "next/link";

// 🚀 INTERRUPTOR DE SEGURIDAD (FEATURE FLAG DE PRODUCCIÓN)
// Cambie a 'false' para activar el módulo por completo para todos los usuarios.
const IS_LOCKED = true;

export default async function CampaignsPage() {
    const cookieStore = await cookies();
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { cookies: { getAll() { return cookieStore.getAll(); } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const { data: store } = await supabase
        .from("stores")
        .select("id, name, categories_order, logo_url, subscription_status, theme_config")
        .eq("user_id", user.id)
        .single();

    if (!store) redirect("/admin");

    const themeColor = store.theme_config?.colors?.primary || '#000000';

    // 🚀 RETORNO TEASER DE PREPARACIÓN (CERO CONSULTAS DE CÓMPUTO A SUPABASE)
    if (IS_LOCKED) {
        return (
            <div className="min-h-screen bg-[#FAFAFC] pb-32 font-sans text-neutral-900 selection:bg-neutral-950 selection:text-white antialiased">
                <AdminHeader store={store} />

                <main className="max-w-xl mx-auto px-4 md:px-8 py-16 text-center flex flex-col items-center">
                    {/* Escudo Flotante */}
                    <div className="w-16 h-16 bg-neutral-950 text-white rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-neutral-950/10 relative">
                        <Megaphone size={24} className="animate-pulse" />
                        <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-md border border-neutral-100">
                            <Lock size={12} className="text-neutral-500" />
                        </div>
                    </div>

                    <span className="inline-flex items-center gap-1 bg-neutral-100 text-neutral-500 text-[9px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border border-neutral-200/50 mb-3">
                        <Sparkles size={11} className="text-neutral-400" /> Próximamente
                    </span>

                    <h1 className="text-2xl md:text-3xl font-black tracking-tight text-neutral-900 leading-tight mb-2">
                        Campañas y Pasillos
                    </h1>
                    <p className="text-xs md:text-sm text-neutral-500 leading-relaxed font-medium max-w-md">
                        Estamos afinando los últimos detalles estructurales de este nuevo módulo. Prepárese para vender a través de un canal de marketing completamente optimizado.
                    </p>

                    {/* Adelanto de Beneficios Premium */}
                    <div className="w-full bg-white p-6 rounded-2xl border border-neutral-200/50 shadow-[0_1px_3px_rgba(0,0,0,0.01)] text-left mt-8 space-y-4">
                        <div className="flex items-start gap-3">
                            <CheckCircle2 size={16} className="text-neutral-400 mt-0.5 shrink-0" />
                            <div>
                                <h4 className="text-xs font-bold text-neutral-900">Atribución de Ventas por WhatsApp</h4>
                                <p className="text-[11px] text-neutral-400 mt-0.5 leading-relaxed font-medium">Rastree con exactitud qué historias de Instagram o estados de WhatsApp le están generando dinero real.</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <CheckCircle2 size={16} className="text-neutral-400 mt-0.5 shrink-0" />
                            <div>
                                <h4 className="text-xs font-bold text-neutral-900">Pasillos de Venta Flash</h4>
                                <p className="text-[11px] text-neutral-400 mt-0.5 leading-relaxed font-medium">Genere ofertas de tiempo limitado de 24 horas con un reloj de cuenta regresiva integrado en tiempo real.</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <CheckCircle2 size={16} className="text-neutral-400 mt-0.5 shrink-0" />
                            <div>
                                <h4 className="text-xs font-bold text-neutral-900">Smart Merchandising</h4>
                                <p className="text-[11px] text-neutral-400 mt-0.5 leading-relaxed font-medium">El sistema colocará de forma automática los productos por agotarse en la primera fila de sus pasillos.</p>
                            </div>
                        </div>
                    </div>

                    <Link
                        href="/admin"
                        className="mt-8 bg-neutral-950 hover:bg-black text-white px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all shadow-md shadow-neutral-950/10 active:scale-95"
                    >
                        Volver al Inicio
                    </Link>
                </main>
            </div>
        );
    }

    // 🚀 FLUJO COMPLETO ORIGINAL (Se activa al cambiar IS_LOCKED a false)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const { count: campaignClicks } = await supabase
        .from("analytics_raw_events")
        .select("id", { count: "exact", head: true })
        .eq("store_id", store.id)
        .gte("created_at", thirtyDaysAgo.toISOString())
        .like("url", "%utm_source=instagram%");

    return (
        <div className="min-h-screen bg-[#FAFAFC] pb-32 font-sans text-neutral-900 selection:bg-neutral-950 selection:text-white antialiased">
            <AdminHeader store={store} />

            <main className="max-w-6xl mx-auto px-4 md:px-8 py-8 space-y-8">
                
                {/* CABECERA EXECUTIVE CLEANLOOK */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-2">
                    <div className="max-w-2xl">
                        <div className="flex items-center gap-2.5 mb-3">
                            <div className="w-8 h-8 bg-neutral-950 text-white rounded-lg flex items-center justify-center shadow-xs">
                                <Megaphone size={14} />
                            </div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                                Growth Marketing
                            </span>
                        </div>
                        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-neutral-900 leading-tight">
                            Campañas y Pasillos
                        </h1>
                        <p className="text-xs md:text-sm text-neutral-500 mt-2 leading-relaxed font-medium">
                            Transforme sus categorías en enlaces de alta conversión. Aísle a sus clientes de distracciones, genere urgencia con ventas Flash y rastree el origen exacto de su tráfico.
                        </p>
                    </div>

                    {/* TARJETA BENTO DE ATRIBUCIÓN */}
                    <div className="bg-white p-5 md:p-6 rounded-xl border border-neutral-200/50 shadow-[0_1px_3px_rgba(0,0,0,0.01)] min-w-[240px] shrink-0 flex flex-col justify-between">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">Tráfico Atribuido</span>
                            <div className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-100/40 text-emerald-600 flex items-center justify-center">
                                <MousePointerClick size={14} />
                            </div>
                        </div>
                        <div>
                            <div className="flex items-baseline gap-2">
                                <span className="text-3xl md:text-4xl font-bold text-neutral-900 font-mono tabular-nums tracking-tighter leading-none">
                                    {campaignClicks || 0}
                                </span>
                            </div>
                            <div className="mt-2.5">
                                <span className="inline-flex items-center text-[9px] font-semibold uppercase tracking-wider text-emerald-700 bg-emerald-50/50 px-2 py-1 rounded border border-emerald-100/40">
                                    Visitas desde Instagram (30d)
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ORGANIZADOR DE CATEGORÍAS */}
                <CategorySorter 
                    storeId={store.id} 
                    initialOrder={store.categories_order || []} 
                    
                    // themeColor={themeColor} 
                />
            </main>
        </div>
    );
}