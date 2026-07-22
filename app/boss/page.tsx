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
    ArrowUpRight
} from 'lucide-react'
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
    
    // Estado de control para filas móviles colapsables
    const [expandedStoreId, setExpandedStoreId] = useState<string | null>(null)

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

    // --- ACCIONES DE GOD MODE ---

    const addCustomDays = async (store: any) => {
        const { value: days, isConfirmed } = await Swal.fire({
            title: `Renovar ${store.name}`,
            text: "Días a agregar a la suscripción actual:",
            input: 'number',
            inputValue: 30,
            showCancelButton: true,
            confirmButtonText: 'Confirmar renovación',
            confirmButtonColor: '#171717',
            cancelButtonText: 'Cancelar',
            customClass: { 
                popup: 'rounded-xl bg-white border border-neutral-200/80 p-6 font-sans shadow-[0_4px_20px_rgba(0,0,0,0.03)]',
                title: 'text-base font-semibold text-neutral-900 tracking-tight',
                htmlContainer: 'text-xs text-neutral-400 font-medium',
                confirmButton: 'rounded-lg text-xs font-semibold px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white transition-all',
                cancelButton: 'rounded-lg text-xs font-semibold px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 transition-all'
            },
            inputValidator: (value) => {
                if (!value || Number(value) <= 0) return 'Ingrese un valor válido mayor a 0'
            }
        })

        if (!isConfirmed || !days) return

        const daysToAdd = parseInt(days, 10)
        const now = new Date()

        const targetDateString = store.subscription_ends_at ? store.subscription_ends_at : store.trial_ends_at;
        const currentEndDate = new Date(targetDateString);
        
        const baseDate = currentEndDate > now ? currentEndDate : now;
        const newDate = new Date(baseDate);
        newDate.setDate(newDate.getDate() + daysToAdd);

        const { error } = await supabase.from('stores').update({
            subscription_status: 'active',
            subscription_ends_at: newDate.toISOString() 
        }).eq('id', store.id)

        if (error) {
            Swal.fire('Error', 'No se pudo actualizar.', 'error')
        } else {
            await triggerCommission(store.user_id).catch(console.error)

            Swal.fire({ 
                icon: 'success', 
                title: `+${daysToAdd} Días`, 
                toast: true, 
                position: 'top-end', 
                showConfirmButton: false, 
                timer: 1500, 
                customClass: { popup: 'bg-neutral-900 text-white rounded-lg text-xs font-medium border border-neutral-800 shadow-[0_4px_15px_rgba(0,0,0,0.05)]' } 
            })
            fetchStores()
        }
    }

    const pauseStore = async (store: any) => {
        const confirm = await Swal.fire({
            title: `¿Suspender ${store.name}?`,
            text: "Se bloqueará el acceso al panel inmediatamente por falta de pago.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Confirmar Suspensión',
            confirmButtonColor: '#171717',
            cancelButtonText: 'Cancelar',
            customClass: { 
                popup: 'rounded-xl bg-white border border-neutral-200/80 p-6 font-sans shadow-[0_4px_20px_rgba(0,0,0,0.03)]',
                title: 'text-base font-semibold text-neutral-900 tracking-tight',
                htmlContainer: 'text-xs text-neutral-400 font-medium',
                confirmButton: 'rounded-lg text-xs font-semibold px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white transition-all',
                cancelButton: 'rounded-lg text-xs font-semibold px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 transition-all'
            }
        })

        if (!confirm.isConfirmed) return

        const pastDate = new Date('2000-01-01').toISOString()
        const { error } = await supabase.from('stores').update({
            subscription_status: 'expired',
            subscription_ends_at: pastDate,
            trial_ends_at: pastDate
        }).eq('id', store.id)

        if (!error) {
            Swal.fire({ 
                icon: 'success', 
                title: 'Licencia Pausada', 
                toast: true, 
                position: 'top-end', 
                showConfirmButton: false, 
                timer: 1500, 
                customClass: { popup: 'bg-neutral-900 text-white rounded-lg text-xs font-medium border border-neutral-800 shadow-[0_4px_15px_rgba(0,0,0,0.05)]' } 
            })
            fetchStores()
        }
    }

    const deleteStore = async (store: any) => {
        const confirm = await Swal.fire({
            title: `¿Remover ${store.name}?`,
            text: "Esta acción es definitiva y eliminará toda la información relacionada.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Eliminar definitivamente',
            confirmButtonColor: '#171717',
            cancelButtonText: 'Cancelar',
            customClass: { 
                popup: 'rounded-xl bg-white border border-neutral-200/80 p-6 font-sans shadow-[0_4px_20px_rgba(0,0,0,0.03)]',
                title: 'text-base font-semibold text-neutral-900 tracking-tight',
                htmlContainer: 'text-xs text-neutral-400 font-medium',
                confirmButton: 'rounded-lg text-xs font-semibold px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white transition-all',
                cancelButton: 'rounded-lg text-xs font-semibold px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 transition-all'
            }
        })

        if (!confirm.isConfirmed) return

        const { error } = await supabase.from('stores').delete().eq('id', store.id)

        if (error) {
            Swal.fire({ title: 'Aviso', text: 'Por seguridad, remueva los productos asociados antes de eliminar la tienda.', icon: 'info', customClass: { popup: 'rounded-xl font-sans text-xs' }})
        } else {
            Swal.fire({ 
                icon: 'success', 
                title: 'Eliminado', 
                toast: true, 
                position: 'top-end', 
                showConfirmButton: false, 
                timer: 1500, 
                customClass: { popup: 'bg-neutral-900 text-white rounded-lg text-xs font-medium border border-neutral-800 shadow-[0_4px_15px_rgba(0,0,0,0.05)]' } 
            })
            fetchStores()
        }
    }

    const impersonateStore = async (store: any) => {
        const confirm = await Swal.fire({
            title: `Sesión de Soporte: ${store.name}`,
            text: "Se generará un ticket criptográfico temporal de acceso administrativo.",
            icon: 'info',
            showCancelButton: true,
            confirmButtonText: 'Generar Enlace',
            confirmButtonColor: '#171717',
            cancelButtonText: 'Cancelar',
            customClass: { 
                popup: 'rounded-xl bg-white border border-neutral-200/80 p-6 font-sans shadow-[0_4px_20px_rgba(0,0,0,0.03)]',
                title: 'text-base font-semibold text-neutral-900 tracking-tight',
                htmlContainer: 'text-xs text-neutral-400 font-medium',
                confirmButton: 'rounded-lg text-xs font-semibold px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white transition-all',
                cancelButton: 'rounded-lg text-xs font-semibold px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 transition-all'
            }
        })

        if (!confirm.isConfirmed) return

        Swal.fire({
            title: 'Validando ticket...',
            allowOutsideClick: false,
            customClass: { popup: 'rounded-xl bg-white border border-neutral-200 p-6 font-sans' },
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
                title: 'Llave de Acceso Generada',
                html: `
                    <div class="text-left mt-2">
                        <p class="text-xs text-neutral-400 mb-4 leading-relaxed font-sans">
                            La sesión actual de administración finalizará si utiliza el acceso directo en este navegador.
                        </p>
                        <button id="direct-access-btn" class="w-full bg-neutral-900 text-white px-4 py-2.5 rounded-lg text-xs font-semibold block text-center mb-4 hover:bg-neutral-800 transition-all shadow-sm">
                            Iniciar sesión directa
                        </button>
                        <p class="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-2 font-mono">Enlace para incógnito:</p>
                        <input type="text" id="magic-link-input" value="${data.url}" readonly 
                            class="w-full p-2.5 border border-neutral-200 rounded-lg text-xs font-mono bg-neutral-50 text-neutral-600 focus:outline-none focus:ring-1 focus:ring-neutral-400 cursor-pointer transition-all" 
                        />
                    </div>
                `,
                showConfirmButton: false,
                showCancelButton: true,
                cancelButtonText: 'Cerrar ventana',
                customClass: { 
                    popup: 'rounded-xl bg-white border border-neutral-200 p-6 font-sans shadow-sm',
                    cancelButton: 'rounded-lg text-xs font-semibold px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 transition-all w-full mt-2'
                },
                didOpen: () => {
                    const input = document.getElementById('magic-link-input') as HTMLInputElement;
                    const directBtn = document.getElementById('direct-access-btn') as HTMLButtonElement;

                    if (input) {
                        input.addEventListener('click', () => {
                            input.select();
                            navigator.clipboard.writeText(input.value).then(() => {
                                Swal.showValidationMessage('Copiado al portapapeles');
                            }).catch(() => {
                                Swal.showValidationMessage('No se pudo copiar.');
                            });
                        });
                    }

                    if (directBtn) {
                        directBtn.addEventListener('click', async () => {
                            directBtn.innerHTML = '<span class="flex items-center justify-center gap-2"><svg class="animate-spin h-3.5 w-3.5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Redirigiendo...</span>';
                            directBtn.disabled = true;
                            await supabase.auth.signOut();
                            window.location.href = data.url;
                        });
                    }
                }
            })
        } catch (error: any) {
            Swal.fire({ title: 'Error de Acceso', text: error.message, icon: 'error', customClass: { popup: 'rounded-xl font-sans' } })
        }
    }

    const kpis = useMemo(() => {
        const now = new Date()
        const active = stores.filter(store => {
            const targetDateString = store.subscription_ends_at || store.trial_ends_at;
            const endsAt = targetDateString ? new Date(targetDateString) : new Date();
            const isExpired = endsAt < now || store.subscription_status === 'expired';
            return !isExpired;
        }).length;

        const expired = stores.length - active;

        return {
            total: stores.length,
            active,
            expired,
            mrr: (active * PREZISO_BILLING.priceUSD).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        }
    }, [stores])

    const filteredStores = stores.filter(s => s.name.toLowerCase().includes(search.toLowerCase()) || s.slug.toLowerCase().includes(search.toLowerCase()))

    const toggleMobileStore = (id: string) => {
        setExpandedStoreId(prev => prev === id ? null : id)
    }

    if (!isAuthorized) return <div className="min-h-screen bg-[#FBFBFC]" />

    return (
        <div className="min-h-screen bg-[#FBFBFC] font-sans text-neutral-900 antialiased selection:bg-neutral-950 selection:text-white">
            
            {/* STICKY CLEAN HEADER */}
            <header className="sticky top-0 z-40 bg-[#FBFBFC]/95 backdrop-blur-sm border-b border-neutral-200/40 px-4 md:px-8 py-3.5">
                <div className="max-w-[1400px] mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-md bg-neutral-950 flex items-center justify-center text-white">
                            <ShieldAlert size={14} strokeWidth={2} />
                        </div>
                        <div className="flex items-baseline gap-2">
                            <h1 className="text-xs font-semibold tracking-tight text-neutral-900">Consola Central</h1>
                            <span className="text-[10px] font-mono text-neutral-400">v3.4.1</span>
                        </div>
                    </div>

                    <div>
                        <Link 
                            href="/admin" 
                            className="inline-flex items-center gap-1 text-[11px] font-medium text-neutral-500 hover:text-neutral-900 border border-neutral-200 bg-white px-2.5 py-1.5 rounded-lg transition-all"
                        >
                            <span>Salir del modo dios</span>
                            <ArrowUpRight size={12} className="text-neutral-400" />
                        </Link>
                    </div>
                </div>
            </header>

            <main className="max-w-[1400px] mx-auto px-4 md:px-8 py-8 space-y-6">
                
                {/* GRID DE MÉTRICAS CON COLOR DIFERENCIADOR DE ALTA GAMA */}
                <section className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 md:gap-4">
                    {/* TOTAL */}
                    <div className="bg-white p-4 rounded-xl border border-neutral-200/60 shadow-[0_1px_2px_rgba(0,0,0,0.01)] flex flex-col justify-between">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-[11px] font-medium text-neutral-400">Tiendas Registradas</span>
                            <div className="w-5 h-5 rounded bg-neutral-50 border border-neutral-100 flex items-center justify-center text-neutral-500">
                                <Store size={12} />
                            </div>
                        </div>
                        <span className="text-xl md:text-2xl font-semibold tracking-tight text-neutral-900 font-mono tabular-nums">{kpis.total}</span>
                    </div>

                    {/* SAGE GREEN (ACTIVE) */}
                    <div className="bg-white p-4 rounded-xl border border-neutral-200/60 shadow-[0_1px_2px_rgba(0,0,0,0.01)] flex flex-col justify-between">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-[11px] font-medium text-neutral-400">Licencias Activas</span>
                            <div className="w-5 h-5 rounded bg-emerald-50 border border-emerald-100/60 flex items-center justify-center text-emerald-700">
                                <CheckCircle2 size={12} />
                            </div>
                        </div>
                        <div className="flex items-baseline justify-between">
                            <span className="text-xl md:text-2xl font-semibold tracking-tight text-emerald-800 font-mono tabular-nums">{kpis.active}</span>
                            <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100/40 font-mono">
                                {kpis.total > 0 ? `${Math.round((kpis.active / kpis.total) * 100)}%` : '0%'}
                            </span>
                        </div>
                    </div>

                    {/* DUSTY ROSE (SUSPENDED) */}
                    <div className="bg-white p-4 rounded-xl border border-neutral-200/60 shadow-[0_1px_2px_rgba(0,0,0,0.01)] flex flex-col justify-between">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-[11px] font-medium text-neutral-400">Licencias Suspendidas</span>
                            <div className="w-5 h-5 rounded bg-rose-50 border border-rose-100/60 flex items-center justify-center text-rose-700">
                                <AlertCircle size={12} />
                            </div>
                        </div>
                        <span className="text-xl md:text-2xl font-semibold tracking-tight text-rose-800 font-mono tabular-nums">{kpis.expired}</span>
                    </div>

                    {/* SLATE BLUE (MRR) */}
                    <div className="bg-white p-4 rounded-xl border border-neutral-200/60 shadow-[0_1px_2px_rgba(0,0,0,0.01)] flex flex-col justify-between">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-[11px] font-medium text-neutral-400">Ingresos Estimados (MRR)</span>
                            <div className="w-5 h-5 rounded bg-blue-50 border border-blue-100/60 flex items-center justify-center text-blue-700">
                                <DollarSign size={12} />
                            </div>
                        </div>
                        <div className="flex items-baseline justify-between">
                            <span className="text-xl md:text-2xl font-semibold tracking-tight text-blue-900 font-mono tabular-nums">${kpis.mrr}</span>
                            <span className="text-[9px] text-neutral-400 uppercase font-mono">USD</span>
                        </div>
                    </div>
                </section>

                {/* SEARCH INPUT */}
                <section className="relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" size={14} />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Buscar por tienda, ID o slug..."
                        className="w-full bg-white border border-neutral-200 rounded-xl pl-9 pr-10 py-2.5 text-xs text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-400 transition-all"
                    />
                    <Command size={12} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-300" />
                </section>

                {/* STORES LISTINGS */}
                <section className="bg-white rounded-xl border border-neutral-200/50 overflow-hidden">
                    {loading ? (
                        <div className="py-20 flex flex-col items-center justify-center gap-2">
                            <Loader2 className="animate-spin text-neutral-300" size={20} />
                            <p className="text-[11px] text-neutral-400 font-medium">Sincronizando información...</p>
                        </div>
                    ) : filteredStores.length === 0 ? (
                        <div className="py-16 text-center space-y-1">
                            <p className="text-xs font-medium text-neutral-600">No se encontraron resultados</p>
                            <p className="text-[11px] text-neutral-400">Modifique los términos de búsqueda.</p>
                        </div>
                    ) : (
                        <>
                            {/* TABLE VIEW (DESKTOP) */}
                            <div className="hidden md:block overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-neutral-100 bg-neutral-50/40 text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
                                            <th className="py-3 px-6">
                                                <span className="inline-flex items-center gap-1.5">
                                                    <Store size={11} className="text-neutral-400" />
                                                    Entidad
                                                </span>
                                            </th>
                                            <th className="py-3 px-6">
                                                <span className="inline-flex items-center gap-1.5">
                                                    <Activity size={11} className="text-neutral-400" />
                                                    Estado del Sistema
                                                </span>
                                            </th>
                                            <th className="py-3 px-6 text-right">
                                                <span className="inline-flex items-center gap-1.5 justify-end w-full">
                                                    <Command size={11} className="text-neutral-400" />
                                                    Controles
                                                </span>
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-neutral-100 text-xs">
                                        {filteredStores.map(store => {
                                            const targetDateString = store.subscription_ends_at || store.trial_ends_at;
                                            const endsAt = targetDateString ? new Date(targetDateString) : new Date();
                                            const now = new Date();
                                            const isExpired = endsAt < now || store.subscription_status === 'expired';
                                            const diffDays = Math.ceil((endsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

                                            return (
                                                <tr key={store.id} className="hover:bg-neutral-50/20 transition-colors">
                                                    
                                                    {/* STORE LOGO & NAMES */}
                                                    <td className="py-3.5 px-6">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-md bg-neutral-50 border border-neutral-100 overflow-hidden flex items-center justify-center shrink-0">
                                                                {store.logo_url ? (
                                                                    <Image
                                                                        src={getOptimizedUrl(store.logo_url)}
                                                                        alt={store.name}
                                                                        width={32}
                                                                        height={32}
                                                                        className="w-full h-full object-cover"
                                                                    />
                                                                ) : (
                                                                    <Store size={14} className="text-neutral-400" />
                                                                )}
                                                            </div>
                                                          
                                                            <div className="space-y-0.5">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="font-semibold text-neutral-900 tracking-tight">{store.name}</span>
                                                                    {store.referrerName && (
                                                                        <span className="inline-flex items-center gap-1 bg-indigo-50/50 text-indigo-700 text-[10px] px-1.5 py-0.5 rounded border border-indigo-100/40">
                                                                            <Users size={10} />
                                                                            Vía: {store.referrerName}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <Link 
                                                                    href={`/${store.slug}`} 
                                                                    target="_blank" 
                                                                    className="inline-flex items-center gap-1 text-[11px] text-neutral-400 hover:text-neutral-900 transition-colors"
                                                                >
                                                                    <Globe size={10} className="opacity-60" />
                                                                    preziso.shop/{store.slug}
                                                                    <ExternalLink size={9} className="opacity-50" />
                                                                </Link>
                                                            </div>
                                                        </div>
                                                    </td>

                                                    {/* STATUS & EXPIRY */}
                                                    <td className="py-3.5 px-6">
                                                        <div className="space-y-1">
                                                            <div className="flex items-center gap-1.5">
                                                                <span className={`w-1.5 h-1.5 rounded-full ${isExpired ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                                                                <span className={`font-semibold text-[11px] ${isExpired ? 'text-rose-700 bg-rose-50/60 border border-rose-100/40 px-1.5 py-0.5 rounded' : 'text-emerald-700 bg-emerald-50/60 border border-emerald-100/40 px-1.5 py-0.5 rounded'}`}>
                                                                    {isExpired ? 'Suspendida' : `Activa (${diffDays}d)`}
                                                                </span>
                                                            </div>
                                                            <div className="text-[10px] text-neutral-400 flex items-center gap-1 font-mono">
                                                                <Clock size={10} />
                                                                <span>Corte: {endsAt.toLocaleDateString()}</span>
                                                            </div>
                                                        </div>
                                                    </td>

                                                    {/* ACTIONS */}
                                                    <td className="py-3.5 px-6 text-right">
                                                        <div className="flex items-center justify-end gap-1.5">
                                                            <button
                                                                onClick={() => addCustomDays(store)}
                                                                className="bg-neutral-900 hover:bg-neutral-800 text-white px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors inline-flex items-center gap-1"
                                                            >
                                                                <Clock size={11} />
                                                                Renovar
                                                            </button>
                                                            <button
                                                                onClick={() => impersonateStore(store)}
                                                                className="bg-white border border-neutral-200 hover:bg-neutral-50 text-neutral-700 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors inline-flex items-center gap-1"
                                                            >
                                                                <Eye size={11} />
                                                                Infiltrarse
                                                            </button>
                                                            <button
                                                                onClick={() => pauseStore(store)}
                                                                className="bg-white border border-neutral-200 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-100 text-neutral-500 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors inline-flex items-center gap-1"
                                                            >
                                                                <Lock size={11} />
                                                                Pausar
                                                            </button>
                                                            <div className="w-px h-4 bg-neutral-200 mx-1" />
                                                            <button
                                                                onClick={() => deleteStore(store)}
                                                                className="p-1.5 text-neutral-400 hover:text-rose-700 hover:bg-rose-50 rounded-md transition-colors"
                                                            >
                                                                <Trash2 size={13} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* MOBILE ACCORDION (COMPACT & SPACE-EFFICIENT UX) */}
                            <div className="block md:hidden divide-y divide-neutral-100">
                                {filteredStores.map(store => {
                                    const targetDateString = store.subscription_ends_at || store.trial_ends_at;
                                    const endsAt = targetDateString ? new Date(targetDateString) : new Date();
                                    const now = new Date();
                                    const isExpired = endsAt < now || store.subscription_status === 'expired';
                                    const diffDays = Math.ceil((endsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                                    const isExpanded = expandedStoreId === store.id;

                                    return (
                                        <div key={store.id} className="transition-all">
                                            
                                            {/* HEADER FILA (Solo 56px de alto, muy ordenado) */}
                                            <div 
                                                onClick={() => toggleMobileStore(store.id)}
                                                className="h-14 px-4 flex items-center justify-between cursor-pointer active:bg-neutral-50 transition-colors"
                                            >
                                                <div className="flex items-center gap-2.5 min-w-0">
                                                    <div className="w-7 h-7 rounded-md bg-neutral-50 border border-neutral-100 overflow-hidden flex items-center justify-center shrink-0">
                                                        {store.logo_url ? (
                                                            <Image
                                                                src={getOptimizedUrl(store.logo_url)}
                                                                alt=""
                                                                width={28}
                                                                height={28}
                                                                className="w-full h-full object-cover"
                                                            />
                                                        ) : (
                                                            <Store size={12} className="text-neutral-400" />
                                                        )}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="font-semibold text-neutral-900 text-xs truncate leading-tight">{store.name}</p>
                                                        <p className="text-[10px] text-neutral-400 font-mono truncate leading-tight">/{store.slug}</p>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-3 shrink-0">
                                                    <span className={`w-1.5 h-1.5 rounded-full ${isExpired ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                                                    {isExpanded ? (
                                                        <ChevronUp size={14} className="text-neutral-400" />
                                                    ) : (
                                                        <ChevronDown size={14} className="text-neutral-400" />
                                                    )}
                                                </div>
                                            </div>

                                            {/* SECCIÓN DESPLEGABLE */}
                                            {isExpanded && (
                                                <div className="bg-neutral-50/40 px-4 pb-4 pt-2.5 space-y-3 border-t border-neutral-100">
                                                    <div className="space-y-1.5 text-[11px] text-neutral-500 font-medium">
                                                        <div className="flex justify-between items-center">
                                                            <span className="flex items-center gap-1"><Activity size={11} /> Estado:</span>
                                                            <span className={`font-semibold ${isExpired ? 'text-rose-700' : 'text-emerald-700'}`}>
                                                                {isExpired ? 'Suspendida' : `Activa (${diffDays} días)`}
                                                            </span>
                                                        </div>
                                                        <div className="flex justify-between items-center">
                                                            <span className="flex items-center gap-1"><Clock size={11} /> Corte:</span>
                                                            <span className="font-mono text-neutral-700">{endsAt.toLocaleDateString()}</span>
                                                        </div>
                                                        {store.referrerName && (
                                                            <div className="flex justify-between items-center">
                                                                <span className="flex items-center gap-1"><Users size={11} /> Afiliado:</span>
                                                                <span className="bg-indigo-50 text-indigo-700 border border-indigo-100/40 px-1.5 py-0.5 rounded text-[10px] font-semibold">
                                                                    {store.referrerName}
                                                                </span>
                                                            </div>
                                                        )}
                                                        <div className="pt-1 flex items-center gap-1.5">
                                                            <CornerDownRight size={10} className="text-neutral-400" />
                                                            <Link 
                                                                href={`/${store.slug}`} 
                                                                target="_blank" 
                                                                className="text-neutral-400 hover:text-neutral-900 underline transition-colors flex items-center gap-1"
                                                            >
                                                                <Globe size={11} /> Ver tienda <ExternalLink size={9} />
                                                            </Link>
                                                        </div>
                                                    </div>

                                                    {/* BOTONERA MÓVIL */}
                                                    <div className="grid grid-cols-4 gap-1.5 pt-1">
                                                        <button
                                                            onClick={() => addCustomDays(store)}
                                                            className="bg-neutral-900 text-white text-[11px] font-medium py-2 rounded-md hover:bg-neutral-800 transition-colors flex flex-col items-center justify-center gap-0.5"
                                                        >
                                                            <Clock size={12} />
                                                            <span>Renovar</span>
                                                        </button>
                                                        <button
                                                            onClick={() => impersonateStore(store)}
                                                            className="bg-white border border-neutral-200 text-neutral-700 text-[11px] font-medium py-2 rounded-md hover:bg-neutral-50 transition-colors flex flex-col items-center justify-center gap-0.5"
                                                        >
                                                            <Eye size={12} />
                                                            <span>Infiltrar</span>
                                                        </button>
                                                        <button
                                                            onClick={() => pauseStore(store)}
                                                            className="bg-white border border-neutral-200 text-rose-600 text-[11px] font-medium py-2 rounded-md hover:bg-rose-50 transition-colors flex flex-col items-center justify-center gap-0.5"
                                                        >
                                                            <Lock size={12} />
                                                            <span>Pausar</span>
                                                        </button>
                                                        <button
                                                            onClick={() => deleteStore(store)}
                                                            className="bg-white border border-rose-100 text-neutral-400 hover:text-rose-700 py-2 rounded-md flex items-center justify-center transition-colors hover:bg-rose-50/50"
                                                        >
                                                            <Trash2 size={13} />
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
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