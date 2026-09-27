'use client'

import { useState, useEffect, useMemo } from 'react'
import { 
    ShieldAlert, 
    Store, 
    Search, 
    Edit3, 
    Loader2, 
    ExternalLink, 
    Clock, 
    Trash2, 
    ChevronDown, 
    ChevronUp,
    CornerDownRight,
    Activity,
    DollarSign,
    Users,
    CheckCircle2,
    AlertCircle,
    Command,
    Globe,
    Eye,
    Lock,
    ArrowUpRight,
    MessageCircle,
    Tag,
    Smartphone
} from 'lucide-react'
import { motion, AnimatePresence } from "framer-motion";
import { getSupabase } from '@/lib/supabase-client'
import { PREZISO_BILLING } from '@/lib/config/billing'
import Swal from 'sweetalert2'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { triggerCommission } from '@/app/actions/affiliates'
import { getOptimizedUrl } from '@/utils/cdn'

const ADMIN_EMAIL = 'quanzosinc@gmail.com'

export default function SuperAdminPage() {
    const supabase = getSupabase()
    const router = useRouter()

    const [loading, setLoading] = useState(true)
    const [stores, setStores] = useState<any[]>([])
    const [search, setSearch] = useState('')
    const [isAuthorized, setIsAuthorized] = useState(false)
    
    const [expandedStoreId, setExpandedStoreId] = useState<string | null>(null)

    // 1. MOTOR DE DATOS: INGESTA O(1)
    const fetchStores = async () => {
        setLoading(true)
        const { data: storesData } = await supabase
            .from('stores')
            .select('*')
            .order('created_at', { ascending: false })

        const { data: referralsData } = await supabase
            .from('saas_referrals')
            .select(`
                referred_user_id,
                saas_affiliates (
                    user_id,
                    referral_code
                )
            `)

        if (storesData) {
            const userToStoreNameMap = new Map(storesData.map((s: any) => [s.user_id, s.name]))

            const enrichedStores = storesData.map((st: any) => {
                const ref = referralsData?.find((r: any) => r.referred_user_id === st.user_id)
                let referrerName = null

                if (ref?.saas_affiliates) {
                    // @ts-ignore
                    const affUserId = ref.saas_affiliates.user_id
                    referrerName = userToStoreNameMap.get(affUserId) || ref.saas_affiliates.referral_code
                }

                return { ...st, referrerName }
            })

            setStores(enrichedStores)
        }
        setLoading(false)
    }

    useEffect(() => {
        const verifyAndFetch = async () => {
            const { data: { user } } = await supabase.auth.getUser()

            if (!user || user.email !== ADMIN_EMAIL) {
                router.replace('/admin')
                return
            }

            setIsAuthorized(true)
            await fetchStores()
        }
        verifyAndFetch()
    }, [router, supabase])

    // ============================================================================
    // 2. COMANDOS DE DIOS (GOD MODE ACTIONS) - ESTILO GRAPHITE
    // ============================================================================

    // 🚀 NUEVO: Asignar precio especial
    const setCustomPrice = async (store: any) => {
        const currentPrice = store.subscription_custom_price ?? '';
        const currentReason = store.subscription_custom_reason ?? '';

        const { value: formValues, isConfirmed } = await Swal.fire({
            title: `Modificar Tarifa: ${store.name}`,
            html: `
                <div class="text-left mt-4 space-y-4">
                    <div>
                        <label class="text-[10px] font-mono text-neutral-400 uppercase tracking-widest">Precio Especial USD</label>
                        <input id="swal-price" type="number" step="0.01" class="w-full mt-1.5 p-3 bg-[#121212] border border-neutral-800 text-white rounded-lg outline-none focus:border-neutral-500 font-mono" placeholder="${PREZISO_BILLING.priceUSD} (Base)" value="${currentPrice}">
                        <p class="text-[10px] text-neutral-500 mt-1">Deje vacío para restablecer a ${PREZISO_BILLING.priceUSD}.</p>
                    </div>
                    <div>
                        <label class="text-[10px] font-mono text-neutral-400 uppercase tracking-widest">Motivo / Nota Interna</label>
                        <input id="swal-reason" type="text" class="w-full mt-1.5 p-3 bg-[#121212] border border-neutral-800 text-white rounded-lg outline-none focus:border-neutral-500" placeholder="Ej: Fundador, Promoción especial..." value="${currentReason}">
                    </div>
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: 'Guardar Tarifa',
            cancelButtonText: 'Cancelar',
            customClass: { 
                popup: 'rounded-2xl bg-[#1A1A1A] border border-neutral-800 p-6 font-sans',
                title: 'text-base font-bold text-white tracking-tight',
                confirmButton: 'rounded-lg text-xs font-bold uppercase tracking-wider px-5 py-2.5 bg-white text-black hover:bg-neutral-200 transition-all',
                cancelButton: 'rounded-lg text-xs font-bold uppercase tracking-wider px-5 py-2.5 bg-transparent border border-neutral-700 text-neutral-400 hover:text-white transition-all'
            },
            preConfirm: () => {
                return {
                    price: (document.getElementById('swal-price') as HTMLInputElement).value,
                    reason: (document.getElementById('swal-reason') as HTMLInputElement).value
                }
            }
        });

        if (isConfirmed && formValues) {
            const finalPrice = formValues.price ? parseFloat(formValues.price) : null;
            const { error } = await supabase.from('stores').update({
                subscription_custom_price: finalPrice,
                subscription_custom_reason: formValues.reason || null
            }).eq('id', store.id);

            if (!error) {
                Swal.fire({ icon: 'success', title: 'Tarifa Guardada', toast: true, position: 'top-end', showConfirmButton: false, timer: 1500, customClass: { popup: 'bg-neutral-900 text-white border border-neutral-800 rounded-xl' }});
                fetchStores();
            }
        }
    };

// 🚀 MOTOR MAGIC LINK CORREGIDO: ENLACE RAÍZ, CERO CORRUPCIÓN UTF-8 Y ENLACE AZUL CLICKEABLE
    const sendMagicLink = async (store: any) => {
        let phone = store.owner_whatsapp || store.phone;
        
        if (!phone) {
            const { value: newPhone, isConfirmed } = await Swal.fire({
                title: 'WhatsApp del Dueño',
                text: 'Esta tienda no tiene número registrado. Ingrésalo para guardarlo y enviar el cobro.',
                input: 'text',
                inputPlaceholder: 'Ej: 04141234567',
                showCancelButton: true,
                confirmButtonText: 'Guardar y Enviar',
                cancelButtonText: 'Cancelar',
                customClass: { 
                    popup: 'rounded-2xl bg-[#1A1A1A] border border-neutral-800 p-6 font-sans',
                    title: 'text-base font-bold text-white tracking-tight',
                    htmlContainer: 'text-xs text-neutral-400',
                    confirmButton: 'rounded-lg text-xs font-bold uppercase tracking-wider px-5 py-2.5 bg-[#25D366] text-white hover:bg-[#20ba59] transition-all',
                    cancelButton: 'rounded-lg text-xs font-bold uppercase tracking-wider px-5 py-2.5 bg-transparent border border-neutral-700 text-neutral-400 hover:text-white transition-all',
                    input: 'bg-[#121212] border-neutral-800 text-white outline-none focus:border-neutral-500 rounded-lg text-center font-mono'
                }
            });

            if (isConfirmed && newPhone) {
                phone = newPhone.replace(/\D/g, '');
                await supabase.from('stores').update({ owner_whatsapp: phone }).eq('id', store.id);
                fetchStores();
            } else {
                return;
            }
        }

        const price = store.subscription_custom_price !== null ? Number(store.subscription_custom_price) : PREZISO_BILLING.priceUSD;
        
        // 🚀 RESOLUCIÓN DE RUTA: El checkout vive en el dominio raíz, NUNCA en el subdominio
        const isLocal = window.location.hostname.includes('localhost');
        const mainOrigin = isLocal ? `${window.location.protocol}//${window.location.host}` : 'https://www.preziso.shop';
        const magicLink = `${mainOrigin}/subscription?slug=${store.slug}&action=pay`;
        
        // Formato con saltos de línea estrictos (\n\n) para que WhatsApp subraye el link en azul
        const message = `Hola! Tu plataforma de E-commerce y Punto de Venta Preziso requiere tu atención.\n\nTu suscripción actual (Plan $${price.toFixed(2)}) está próxima a procesarse o ha vencido.\n\nPuedes renovar tu licencia y reportar el pago rápidamente en el siguiente enlace seguro:\n\n${magicLink}\n\nGracias por confiar en Preziso.`;
        
        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
    };
    const addCustomDays = async (store: any) => {
        const { value: days, isConfirmed } = await Swal.fire({
            title: `Renovar ${store.name}`,
            text: "Días a agregar a la suscripción actual:",
            input: 'number',
            inputValue: 30,
            showCancelButton: true,
            confirmButtonText: 'Añadir Días',
            cancelButtonText: 'Cancelar',
            customClass: { 
                popup: 'rounded-2xl bg-[#1A1A1A] border border-neutral-800 p-6 font-sans',
                title: 'text-base font-bold text-white tracking-tight',
                htmlContainer: 'text-xs text-neutral-400',
                confirmButton: 'rounded-lg text-xs font-bold uppercase tracking-wider px-5 py-2.5 bg-white text-black hover:bg-neutral-200 transition-all',
                cancelButton: 'rounded-lg text-xs font-bold uppercase tracking-wider px-5 py-2.5 bg-transparent border border-neutral-700 text-neutral-400 hover:text-white transition-all',
                input: 'bg-[#121212] border-neutral-800 text-white outline-none focus:border-neutral-500 rounded-lg text-center font-mono'
            },
            inputValidator: (value) => {
                if (!value || Number(value) <= 0) return 'Ingrese un valor válido mayor a 0'
            }
        })

        if (!isConfirmed || !days) return

        const daysToAdd = parseInt(days, 10)
        const now = new Date()

        const targetDateString = store.subscription_ends_at ? store.subscription_ends_at : store.trial_ends_at;
        const currentEndDate = targetDateString ? new Date(targetDateString) : now;
        
        const baseDate = currentEndDate > now ? currentEndDate : now;
        const newDate = new Date(baseDate);
        newDate.setDate(newDate.getDate() + daysToAdd);

        const { error } = await supabase.from('stores').update({
            subscription_status: 'active',
            subscription_ends_at: newDate.toISOString() 
        }).eq('id', store.id)

        if (!error) {
            await triggerCommission(store.user_id).catch(console.error)
            Swal.fire({ icon: 'success', title: `+${daysToAdd} Días`, toast: true, position: 'top-end', showConfirmButton: false, timer: 1500, customClass: { popup: 'bg-neutral-900 text-white border border-neutral-800 rounded-xl' } })
            fetchStores()
        }
    }

    const pauseStore = async (store: any) => {
        const confirm = await Swal.fire({
            title: `¿Suspender ${store.name}?`,
            text: "Se bloqueará el acceso al panel inmediatamente por falta de pago.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, suspender',
            cancelButtonText: 'Cancelar',
            customClass: { 
                popup: 'rounded-2xl bg-[#1A1A1A] border border-neutral-800 p-6 font-sans',
                title: 'text-base font-bold text-white tracking-tight',
                htmlContainer: 'text-xs text-neutral-400',
                confirmButton: 'rounded-lg text-xs font-bold uppercase tracking-wider px-5 py-2.5 bg-rose-600 text-white hover:bg-rose-700 transition-all',
                cancelButton: 'rounded-lg text-xs font-bold uppercase tracking-wider px-5 py-2.5 bg-transparent border border-neutral-700 text-neutral-400 hover:text-white transition-all'
            }
        })

        if (!confirm.isConfirmed) return

        const pastDate = new Date('2000-01-01').toISOString()
        await supabase.from('stores').update({
            subscription_status: 'expired',
            subscription_ends_at: pastDate,
            trial_ends_at: pastDate
        }).eq('id', store.id)
        
        fetchStores()
    }

    const deleteStore = async (store: any) => {
        const confirm = await Swal.fire({
            title: `¿Aniquilar ${store.name}?`,
            text: "Esta acción destruirá el comercio de la base de datos irreversiblemente.",
            icon: 'error',
            showCancelButton: true,
            confirmButtonText: 'Destruir tienda',
            cancelButtonText: 'Cancelar',
            customClass: { 
                popup: 'rounded-2xl bg-[#1A1A1A] border border-neutral-800 p-6 font-sans',
                title: 'text-base font-bold text-white tracking-tight',
                htmlContainer: 'text-xs text-neutral-400',
                confirmButton: 'rounded-lg text-xs font-bold uppercase tracking-wider px-5 py-2.5 bg-rose-900 text-rose-100 border border-rose-800 hover:bg-rose-800 transition-all',
                cancelButton: 'rounded-lg text-xs font-bold uppercase tracking-wider px-5 py-2.5 bg-transparent border border-neutral-700 text-neutral-400 hover:text-white transition-all'
            }
        })

        if (!confirm.isConfirmed) return

        const { error } = await supabase.from('stores').delete().eq('id', store.id)

        if (error) {
            Swal.fire({ title: 'Atención', text: 'Hay productos atados a esta tienda. Borre el catálogo primero.', icon: 'info', customClass: { popup: 'rounded-xl bg-neutral-900 text-white border-neutral-800 font-sans text-xs' }})
        } else {
            fetchStores()
        }
    }

    const impersonateStore = async (store: any) => {
        Swal.fire({
            title: 'Generando Ticket...',
            allowOutsideClick: false,
            customClass: { popup: 'rounded-2xl bg-[#1A1A1A] border border-neutral-800 p-6 font-sans text-white' },
            didOpen: () => Swal.showLoading()
        })

        try {
            const res = await fetch('/api/admin/impersonate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: store.user_id })
            })

            const data = await res.json()
            if (!res.ok) throw new Error(data.error)

            Swal.fire({
                title: 'Token Criptográfico',
                html: `
                    <div class="text-left mt-2">
                        <button id="direct-access-btn" class="w-full bg-white text-black px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider block text-center mb-4 hover:bg-neutral-200 transition-all shadow-sm">
                            Iniciar sesión In-Situ
                        </button>
                        <p class="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-2 font-mono">Link de Incógnito (Copia Oculta):</p>
                        <input type="text" id="magic-link-input" value="${data.url}" readonly 
                            class="w-full p-3 border border-neutral-800 rounded-xl text-[10px] font-mono bg-[#121212] text-neutral-300 focus:outline-none focus:border-neutral-500 cursor-pointer transition-all" 
                        />
                    </div>
                `,
                showConfirmButton: false,
                showCancelButton: true,
                cancelButtonText: 'Cerrar ventana',
                customClass: { 
                    popup: 'rounded-2xl bg-[#1A1A1A] border border-neutral-800 p-6 font-sans shadow-2xl',
                    title: 'text-base font-bold text-white tracking-tight',
                    cancelButton: 'rounded-lg text-xs font-bold uppercase tracking-wider px-5 py-2.5 bg-transparent border border-neutral-700 text-neutral-400 hover:text-white transition-all w-full mt-2'
                },
                didOpen: () => {
                    const input = document.getElementById('magic-link-input') as HTMLInputElement;
                    const directBtn = document.getElementById('direct-access-btn') as HTMLButtonElement;

                    if (input) {
                        input.addEventListener('click', () => {
                            input.select();
                            navigator.clipboard.writeText(input.value);
                            Swal.showValidationMessage('Token Copiado');
                        });
                    }

                    if (directBtn) {
                        directBtn.addEventListener('click', async () => {
                            directBtn.innerHTML = 'Conectando...';
                            directBtn.disabled = true;
                            await supabase.auth.signOut();
                            window.location.href = data.url;
                        });
                    }
                }
            })
        } catch (error: any) {
            Swal.fire({ title: 'Fallo de Acceso', text: error.message, icon: 'error', customClass: { popup: 'rounded-xl bg-neutral-900 text-white font-sans' } })
        }
    }

    // 3. CÁLCULO DE KPIs FINANCIEROS (MRR Dinámico O(1))
    const kpis = useMemo(() => {
        const now = new Date()
        let activeCount = 0;
        let mrrValue = 0;

        stores.forEach(store => {
            const targetDateString = store.subscription_ends_at || store.trial_ends_at;
            const endsAt = targetDateString ? new Date(targetDateString) : new Date();
            const isExpired = endsAt < now || store.subscription_status === 'expired';
            
            if (!isExpired) {
                activeCount++;
                // 🚀 ARQUITECTURA: Sumamos el precio real que le estamos cobrando
                mrrValue += store.subscription_custom_price !== null ? Number(store.subscription_custom_price) : PREZISO_BILLING.priceUSD;
            }
        });

        return {
            total: stores.length,
            active: activeCount,
            expired: stores.length - activeCount,
            mrr: mrrValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        }
    }, [stores])

    const filteredStores = stores.filter(s => s.name.toLowerCase().includes(search.toLowerCase()) || s.slug.toLowerCase().includes(search.toLowerCase()))

    const toggleMobileStore = (id: string) => {
        setExpandedStoreId(prev => prev === id ? null : id)
    }

    if (!isAuthorized) return <div className="min-h-screen bg-[#121212]" />

    return (
        <div className="min-h-screen bg-[#121212] font-sans text-neutral-300 antialiased selection:bg-white selection:text-black">
            
            {/* HEADER GRAPHITE */}
            <header className="sticky top-0 z-40 bg-[#121212]/95 backdrop-blur-md border-b border-neutral-800 px-4 md:px-8 py-3.5">
                <div className="max-w-[1400px] mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="bg-[#1A1A1A]  w-8 h-8 rounded-lg border-[0.5px] border-gray-800   flex items-center justify-center text-white">
                            <ShieldAlert size={16} strokeWidth={2.5} />
                        </div>
                        <div className="flex items-baseline gap-2">
                            <h1 className="text-sm font-bold tracking-tight text-white">Consola Terminal</h1>
                            <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest">Master</span>
                        </div>
                    </div>

                    <div>
                        <Link 
                            href="/admin" 
                            className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-neutral-400 hover:text-white border border-neutral-800 bg-[#1A1A1A] hover:bg-neutral-800 px-3 py-2 rounded-lg transition-all"
                        >
                            <span>Abandonar</span>
                            <ArrowUpRight size={12} />
                        </Link>
                    </div>
                </div>
            </header>

            <main className="max-w-[1400px] mx-auto px-4 md:px-8 py-8 space-y-6">
                
                {/* 🚀 THE TELEMETRY MONOLITH (Graphite Bento Grid) */}
                <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                    <div className="bg-[#1A1A1A] p-5 rounded-md border border-t-0 border-neutral-800 flex flex-col justify-between shadow-xs">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Inquilinos</span>
                            <Store size={14} className="text-neutral-500" />
                        </div>
                        <span className="text-2xl md:text-3xl font-light tracking-tighter text-white font-mono tabular-nums">{kpis.total}</span>
                    </div>

                    <div className="relative bg-[#1A1A1A] p-5 rounded-md  border border-t-0 border-neutral-800 flex flex-col justify-between shadow-xs overflow-hidden before:absolute before:inset-0 before:bg-[radial-gradient(circle_at_top,_rgba(192,222,8,0.2)_0%,_rgba(192,222,8,0.05)_50%,_transparent_100%)] before:pointer-events-none">

                        <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 blur-[40px] rounded-full pointer-events-none" />
                        <div className="flex items-center justify-between mb-4 relative z-10">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Licencias Activas</span>
                            <div className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#c0de08] animate-puls" />
                                <CheckCircle2 size={14} className="text-[#c0de08]" />
                            </div>
                        </div>
                        <div className="flex items-baseline justify-between relative z-10">
                            <span className="text-2xl md:text-3xl font-light tracking-tighter text-[#c0de08] font-mono tabular-nums">{kpis.active}</span>
                            <span className="text-[10px] font-bold text-neutral-400 bg-[#121212] px-2 py-0.5 rounded-md border border-neutral-800 font-mono">
                                {kpis.total > 0 ? `${Math.round((kpis.active / kpis.total) * 100)}%` : '0%'}
                            </span>
                        </div>
                    </div>

               <div className="relative bg-[#1A1A1A] p-5 rounded-md border-t-none border border-t-0 border-neutral-800 flex flex-col justify-between shadow-xs overflow-hidden before:absolute before:inset-0 before:bg-[radial-gradient(circle_at_top,_rgba(244,63,94,0.30)_0%,_rgba(244,63,94,0.06)_50%,_transparent_100%)] before:pointer-events-none">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Suspendidas</span>
                            <AlertCircle size={14} className="text-rose-500" />
                        </div>
                        <span className="text-2xl md:text-3xl font-light tracking-tighter text-neutral-400 font-mono tabular-nums">{kpis.expired}</span>
                    </div>

                    <div className="bg-[#1A1A1A] p-5 rounded-md border border-neutral-800 border-t-0 flex flex-col justify-between shadow-xs">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">MRR Real</span>
                            <DollarSign size={14} className="text-white" />
                        </div>
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-2xl md:text-3xl font-light tracking-tighter text-white font-mono tabular-nums">${kpis.mrr}</span>
                            <span className="text-[10px] font-bold text-neutral-500 font-mono">USD</span>
                        </div>
                    </div>
                </section>

                {/* THE COMMAND CAPSULE (Buscador) */}
                <section className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Search className="text-neutral-500 group-focus-within:text-white transition-colors" size={16} />
                    </div>
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Escriba el nombre, slug o teléfono..."
                        className="w-full h-[2.5rem] bg-[#1A1A1A] border border-neutral-800 focus:border-neutral-600 rounded-lg border-b-[2.6px] border-t-0 pl-11 pr-4 py-4 text-sm font-semibold text-white placeholder:text-neutral-600 outline-none transition-all shadow-xs"
                    />
                </section>

                {/* AQUI CORTAMOS EL ARCHIVO PARA LA PARTE 2 */}

                {/* 🚀 THE TENANT MATRIX (Listado de Tiendas) */}
                <section className="bg-[#1A1A1A] rounded-md border border-neutral-800 overflow-hidden shadow-xs">
                    {loading ? (
                        <div className="py-24 flex flex-col items-center justify-center gap-3">
                            <Loader2 className="animate-spin text-neutral-600" size={24} />
                            <p className="text-[10px] font-mono uppercase tracking-widest text-neutral-500 font-bold">Compilando datos del clúster...</p>
                        </div>
                    ) : filteredStores.length === 0 ? (
                        <div className="py-20 text-center space-y-2 flex flex-col items-center">
                            <div className="w-12 h-12 rounded-xl bg-[#121212] border border-neutral-800 flex items-center justify-center text-neutral-600 mb-2">
                                <Search size={20} />
                            </div>
                            <p className="text-sm font-bold text-white tracking-tight">No hay inquilinos en esta vista</p>
                            <p className="text-[11px] text-neutral-500 font-medium max-w-xs leading-relaxed">Modifique los parámetros de búsqueda para encontrar tiendas.</p>
                        </div>
                    ) : (
                        <>
                            {/* TABLE VIEW (DESKTOP) */}
                            <div className="hidden md:block overflow-x-auto no-scrollbar">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-neutral-800 bg-[#121212]/50 text-[9px] font-bold text-neutral-500 uppercase tracking-widest font-mono">
                                            <th className="py-4 px-6">Inquilino (Tenant)</th>
                                            <th className="py-4 px-6">Estado & Facturación</th>
                                            <th className="py-4 px-6 text-right">Comandos de Administración</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-neutral-800/50 text-xs">
                                        {filteredStores.map(store => {
                                            const targetDateString = store.subscription_ends_at || store.trial_ends_at;
                                            const endsAt = targetDateString ? new Date(targetDateString) : new Date();
                                            const now = new Date();
                                            const isExpired = endsAt < now || store.subscription_status === 'expired';
                                            const diffDays = Math.ceil((endsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                                            
                                            // 🚀 TELEMETRÍA DE PRECIOS
                                            const hasCustomPrice = store.subscription_custom_price !== null;
                                            const activePrice = hasCustomPrice ? store.subscription_custom_price : PREZISO_BILLING.priceUSD;

                                            return (
                                                <tr key={store.id} className="hover:bg-white/[0.02] transition-colors group">
                                                    
                                                    {/* STORE LOGO, NAMES & PHONE */}
                                                    <td className="py-4 px-6 align-top">
                                                        <div className="flex items-start gap-3.5">
                                                            <div className="w-10 h-10 rounded-xl bg-[#121212] border border-neutral-800 overflow-hidden flex items-center justify-center shrink-0 shadow-sm">
                                                                {store.logo_url ? (
                                                                    <Image
                                                                        src={getOptimizedUrl(store.logo_url)}
                                                                        alt={store.name}
                                                                        width={40}
                                                                        height={40}
                                                                        className="w-full h-full object-cover"
                                                                    />
                                                                ) : (
                                                                    <Store size={16} className="text-neutral-600" />
                                                                )}
                                                            </div>
                                                          
                                                            <div className="space-y-1">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="font-bold text-sm text-white tracking-tight leading-none">{store.name}</span>
                                                                    {store.referrerName && (
                                                                        <span className="inline-flex items-center gap-1 bg-indigo-500/10 text-indigo-400 text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border border-indigo-500/20">
                                                                            <Users size={8} /> Afiliado: {store.referrerName}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                
                                                                <Link 
                                                                    href={`/${store.slug}`} 
                                                                    target="_blank" 
                                                                    className="inline-flex items-center gap-1 text-[10px] text-neutral-500 hover:text-neutral-300 transition-colors font-mono"
                                                                >
                                                                    <Globe size={10} className="opacity-70" />
                                                                    {store.slug}.preziso.shop
                                                                    <ExternalLink size={9} className="opacity-50" />
                                                                </Link>

                                                                {/* Dueño y Teléfono */}
                                                                <div className="flex items-center gap-1.5 text-[9px] font-mono text-neutral-500 pt-0.5">
                                                                    <Smartphone size={10} />
                                                                    <span>{store.owner_whatsapp || store.phone || 'Sin número registrado'}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>

                                                    {/* STATUS, EXPIRY & PRICE */}
                                                    <td className="py-4 px-6 align-top">
                                                        <div className="space-y-2">
                                                            <div className="flex items-center gap-2">
                                                                <span className={`w-1.5 h-1.5 rounded-full ${isExpired ? 'bg-rose-500' : 'bg-[#c0de08]'}`} />
                                                                <span className={`font-bold text-[10px] uppercase tracking-wider ${isExpired ? 'text-rose-500' : 'text-[#c0de08]'}`}>
                                                                    {isExpired ? 'Suspendida' : `Activa (${diffDays} días)`}
                                                                </span>
                                                            </div>

                                                            <div className="flex flex-wrap items-center gap-2">
                                                                <span className="text-[10px] text-neutral-500 flex items-center gap-1 font-mono bg-[#121212] px-2 py-0.5 rounded border border-neutral-800">
                                                                    <Clock size={10} />
                                                                    Corte: {endsAt.toLocaleDateString()}
                                                                </span>
                                                                
                                                                {/* Tarifa Dinámica */}
                                                                <span className={`text-[10px] flex items-center gap-1 font-mono px-2 py-0.5 rounded border font-bold ${
                                                                    hasCustomPrice 
                                                                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' 
                                                                    : 'bg-[#121212] text-neutral-400 border-neutral-800'
                                                                }`}>
                                                                    <DollarSign size={10} />
                                                                    {activePrice.toFixed(2)}/mes
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </td>

                                                    {/* COMMAND ACTIONS */}
                                                    <td className="py-4 px-6 align-top text-right">
                                                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                                                            
                                                            {/* 🚀 MAGIC LINK WHATSAPP (BOTÓN PRIMARIO) */}
                                                            <button
                                                                onClick={() => sendMagicLink(store)}
                                                                className="bg-[#000000]/10 hover:bg-[#4d4949aa] text-[#e7ede9] hover:text-white border border-[#fff5]/20 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all inline-flex items-center gap-1.5 active:scale-95"
                                                                title="Enviar link de cobro"
                                                            >
                                                                <MessageCircle size={12} />
                                                                Cobrar
                                                            </button>

                                                            <div className="w-px h-4 bg-neutral-800 mx-1 hidden xl:block" />

                                                            <button
                                                                onClick={() => setCustomPrice(store)}
                                                                className="bg-[#121212] border border-neutral-800 hover:bg-neutral-800 hover:border-neutral-700 text-neutral-400 hover:text-white px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all inline-flex items-center gap-1.5 active:scale-95"
                                                                title="Editar Tarifa"
                                                            >
                                                                <Tag size={12} />
                                                                <span className="hidden xl:inline">Tarifa</span>
                                                            </button>

                                                            <button
                                                                onClick={() => addCustomDays(store)}
                                                                className="bg-[#121212] border border-neutral-800 hover:bg-neutral-800 hover:border-neutral-700 text-neutral-400 hover:text-white px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all inline-flex items-center gap-1.5 active:scale-95"
                                                            >
                                                                <Clock size={12} />
                                                                <span className="hidden xl:inline">Renovar</span>
                                                            </button>
                                                            
                                                            <button
                                                                onClick={() => impersonateStore(store)}
                                                                className="bg-[#121212] border border-neutral-800 hover:bg-neutral-800 hover:border-neutral-700 text-neutral-400 hover:text-white px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all inline-flex items-center gap-1.5 active:scale-95"
                                                                title="Sesión Soporte"
                                                            >
                                                                <Eye size={12} />
                                                            </button>
                                                            
                                                            <div className="w-px h-4 bg-neutral-800 mx-1" />
                                                            
                                                            <button
                                                                onClick={() => pauseStore(store)}
                                                                className="bg-[#121212] border border-neutral-800 hover:bg-rose-950/50 hover:text-rose-500 hover:border-rose-900/50 text-neutral-500 px-2 py-1.5 rounded-lg transition-all active:scale-95"
                                                                title="Pausar Suscripción"
                                                            >
                                                                <Lock size={12} />
                                                            </button>
                                                            <button
                                                                onClick={() => deleteStore(store)}
                                                                className="bg-[#121212] border border-neutral-800 hover:bg-red-950/50 hover:text-red-500 hover:border-red-900/50 text-neutral-600 px-2 py-1.5 rounded-lg transition-all active:scale-95"
                                                                title="Eliminar Tienda"
                                                            >
                                                                <Trash2 size={12} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* MOBILE ACCORDION (COMPACT & TACTICAL UX) */}
                            <div className="block md:hidden divide-y divide-neutral-800">
                                {filteredStores.map(store => {
                                    const targetDateString = store.subscription_ends_at || store.trial_ends_at;
                                    const endsAt = targetDateString ? new Date(targetDateString) : new Date();
                                    const now = new Date();
                                    const isExpired = endsAt < now || store.subscription_status === 'expired';
                                    const diffDays = Math.ceil((endsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                                    const isExpanded = expandedStoreId === store.id;

                                    const hasCustomPrice = store.subscription_custom_price !== null;
                                    const activePrice = hasCustomPrice ? store.subscription_custom_price : PREZISO_BILLING.priceUSD;

                                    return (
                                        <div key={store.id} className="transition-all">
                                            
                                            {/* HEADER FILA (Compacto 60px) */}
                                            <div 
                                                onClick={() => toggleMobileStore(store.id)}
                                                className="p-4 flex items-center justify-between cursor-pointer active:bg-[#121212] transition-colors"
                                            >
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className="w-8 h-8 rounded-lg bg-[#121212] border border-neutral-800 overflow-hidden flex items-center justify-center shrink-0">
                                                        {store.logo_url ? (
                                                            <Image
                                                                src={getOptimizedUrl(store.logo_url)}
                                                                alt=""
                                                                width={32}
                                                                height={32}
                                                                className="w-full h-full object-cover"
                                                            />
                                                        ) : (
                                                            <Store size={14} className="text-neutral-600" />
                                                        )}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <p className="font-bold text-white text-xs truncate leading-tight">{store.name}</p>
                                                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isExpired ? 'bg-rose-500' : 'bg-[#c0de08]'}`} />
                                                        </div>
                                                        <p className="text-[10px] text-neutral-500 font-mono truncate leading-tight mt-0.5">/{store.slug}</p>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-3 shrink-0 text-neutral-500">
                                                    <span className="font-mono text-xs font-bold text-neutral-400">${activePrice.toFixed(2)}</span>
                                                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                                </div>
                                            </div>

                                            {/* SECCIÓN DESPLEGABLE TÁCTICA */}
                                            <AnimatePresence>
                                                {isExpanded && (
                                                    <motion.div 
                                                        initial={{ height: 0, opacity: 0 }}
                                                        animate={{ height: 'auto', opacity: 1 }}
                                                        exit={{ height: 0, opacity: 0 }}
                                                        className="bg-[#121212]/50 px-4 pb-4 pt-1 space-y-4 border-t border-neutral-800 overflow-hidden"
                                                    >
                                                        {/* Info Metadata */}
                                                        <div className="space-y-2 text-[10px] text-neutral-400 font-mono pt-2">
                                                            <div className="flex justify-between items-center bg-[#1A1A1A] p-2 rounded-lg border border-neutral-800">
                                                                <span className="flex items-center gap-1.5"><Smartphone size={12} /> Contacto:</span>
                                                                <span className="text-neutral-300">{store.owner_whatsapp || store.phone || 'No registrado'}</span>
                                                            </div>
                                                            <div className="flex justify-between items-center bg-[#1A1A1A] p-2 rounded-lg border border-neutral-800">
                                                                <span className="flex items-center gap-1.5"><Clock size={12} /> Expiración:</span>
                                                                <span className={isExpired ? 'text-rose-500 font-bold' : 'text-emerald-500 font-bold'}>{endsAt.toLocaleDateString()}</span>
                                                            </div>
                                                            {store.subscription_custom_reason && (
                                                                <div className="flex justify-between items-center bg-[#1A1A1A] p-2 rounded-lg border border-neutral-800">
                                                                    <span className="flex items-center gap-1.5"><Tag size={12} /> Nota Precio:</span>
                                                                    <span className="text-amber-400 truncate max-w-[150px]">{store.subscription_custom_reason}</span>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* BOTONERA MÓVIL (Grid 2x3) */}
                                                        <div className="grid grid-cols-2 gap-2">
                                                            <button
                                                                onClick={() => sendMagicLink(store)}
                                                                className="col-span-2 bg-[#1A1A1A]  border border-[#34373a] text-white text-[11px] font-bold uppercase tracking-wider py-3 rounded-lg hover:bg-[#595e5b] transition-colors flex items-center justify-center gap-1.5 shadow-sm active:scale-[0.98]"
                                                            >
                                                                <MessageCircle size={14} />
                                                                <span>Cobrar vía WhatsApp</span>
                                                            </button>

                                                            <button
                                                                onClick={() => setCustomPrice(store)}
                                                                className="bg-[#1A1A1A] border border-neutral-800 text-neutral-300 text-[10px] font-bold uppercase tracking-wider py-2.5 rounded-lg hover:bg-neutral-800 transition-colors flex flex-col items-center justify-center gap-1 active:scale-95"
                                                            >
                                                                <Tag size={12} /> Tarifa
                                                            </button>
                                                            <button
                                                                onClick={() => addCustomDays(store)}
                                                                className="bg-[#1A1A1A] border border-neutral-800 text-neutral-300 text-[10px] font-bold uppercase tracking-wider py-2.5 rounded-lg hover:bg-neutral-800 transition-colors flex flex-col items-center justify-center gap-1 active:scale-95"
                                                            >
                                                                <Clock size={12} /> Renovar
                                                            </button>
                                                            <button
                                                                onClick={() => impersonateStore(store)}
                                                                className="bg-[#1A1A1A] border border-neutral-800 text-neutral-300 text-[10px] font-bold uppercase tracking-wider py-2.5 rounded-lg hover:bg-neutral-800 transition-colors flex flex-col items-center justify-center gap-1 active:scale-95"
                                                            >
                                                                <Eye size={12} /> Soporte
                                                            </button>
                                                            <button
                                                                onClick={() => pauseStore(store)}
                                                                className="bg-rose-950/30 border border-rose-900/50 text-rose-500 hover:text-rose-400 hover:bg-rose-900/50 text-[10px] font-bold uppercase tracking-wider py-2.5 rounded-lg transition-colors flex flex-col items-center justify-center gap-1 active:scale-95"
                                                            >
                                                                <Lock size={12} /> Pausar
                                                            </button>
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    )
                                })}
                            </div>
                        </>
                    )}
                </section>
            </main>
        </div>
    )
}