'use client'

import { useState, useEffect, useMemo } from 'react'
import { ShieldAlert, Store, Zap, Ban, Search, Edit3, Loader2, ExternalLink, TrendingUp, Clock, Trash2 } from 'lucide-react'
import { getSupabase } from '@/lib/supabase-client'
import { PREZISO_BILLING } from '@/lib/config/billing'
import Swal from 'sweetalert2'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { triggerCommission } from '@/app/actions/affiliates'
import { getOptimizedUrl } from '@/utils/cdn'

// 🔒 SEGURIDAD EXTREMA: El único correo con acceso al God Mode
const ADMIN_EMAIL = 'quanzosinc@gmail.com'

export default function SuperAdminPage() {
    const supabase = getSupabase()
    const router = useRouter()

    const [loading, setLoading] = useState(true)
    const [stores, setStores] = useState<any[]>([])
    const [search, setSearch] = useState('')
    const [isAuthorized, setIsAuthorized] = useState(false)

   const fetchStores = async () => {
        setLoading(true)
        // 1. Cargar todas las tiendas
        const { data: storesData } = await supabase
            .from('stores')
            .select('*')
            .order('created_at', { ascending: false })

        // 2. Cargar mapas de referidos para evitar errores de PostgREST
        const { data: referralsData } = await supabase
            .from('saas_referrals')
            .select(`
                referred_user_id,
                saas_affiliates (
                    user_id,
                    referral_code
                )
            `)

        // 3. Cruzar nombres de tiendas referentes
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

            // Redirección fantasma: Expulsamos a los intrusos sin mostrar alertas ni UI de fondo
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
            text: "¿Cuántos días exactos deseas agregarle a esta tienda?",
            input: 'number',
            inputValue: 30, // Valor por defecto
            showCancelButton: true,
            confirmButtonText: 'Agregar Días',
            confirmButtonColor: '#000',
            cancelButtonText: 'Cancelar',
            customClass: { popup: 'rounded-[2rem] bg-white/90 backdrop-blur-xl border border-gray-100 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)]' },
            inputValidator: (value) => {
                if (!value || Number(value) <= 0) return 'Ingresa un número válido mayor a 0'
            }
        })

        if (!isConfirmed || !days) return

        const daysToAdd = parseInt(days, 10)
        const now = new Date()

        // LÓGICA FINANCIERA INTELIGENTE (CORREGIDA):
        // 1. Identificamos cuál es la fecha real de vencimiento (priorizando si ya pagó antes)
        const targetDateString = store.subscription_ends_at ? store.subscription_ends_at : store.trial_ends_at;
        const currentEndDate = new Date(targetDateString);
        
        // 2. Si la tienda ya expiró, sumamos desde HOY. Si no, desde su FECHA DE CORTE.
        const baseDate = currentEndDate > now ? currentEndDate : now;
        const newDate = new Date(baseDate);
        newDate.setDate(newDate.getDate() + daysToAdd);

         // 3. Actualizamos 'subscription_ends_at' para que el Banner entienda que ya no es trial
        const { error } = await supabase.from('stores').update({
            subscription_status: 'active',
            subscription_ends_at: newDate.toISOString() 
        }).eq('id', store.id)

        if (error) {
            Swal.fire('Error', 'No se pudo actualizar la suscripción.', 'error')
        } else {
            // 🚀 INYECCIÓN: Disparamos la comisión si es su primer pago
            // Esto solo hará efecto si el usuario estaba como "pending" en saas_referrals
            await triggerCommission(store.user_id).catch(console.error)

            Swal.fire({ icon: 'success', title: `+${daysToAdd} Días Agregados`, toast: true, position: 'top-end', showConfirmButton: false, timer: 2000, customClass: { popup: 'bg-black text-white rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.1)]' } })
            fetchStores()
        }
    }

    const pauseStore = async (store: any) => {
        const confirm = await Swal.fire({
            title: `¿Pausar ${store.name}?`,
            text: "La tienda será bloqueada inmediatamente por falta de pago.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Pausar',
            confirmButtonColor: '#e3342f',
            cancelButtonText: 'Cancelar',
            customClass: { popup: 'rounded-[2rem] bg-white/90 backdrop-blur-xl border border-gray-100 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)]' }
        })

        if (!confirm.isConfirmed) return

       const pastDate = new Date('2000-01-01').toISOString()
        const { error } = await supabase.from('stores').update({
            subscription_status: 'expired', // <-- AHORA ES EXPIRED
            subscription_ends_at: pastDate, // <-- CORTAMOS LA FECHA DE SUSCRIPCIÓN
            trial_ends_at: pastDate
        }).eq('id', store.id)

        if (!error) {
            Swal.fire({ icon: 'success', title: 'Tienda Bloqueada', toast: true, position: 'top-end', showConfirmButton: false, timer: 1500, customClass: { popup: 'rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.05)]' } })
            fetchStores()
        }
    }

    const deleteStore = async (store: any) => {
        const confirm = await Swal.fire({
            title: `¿DESTRUIR ${store.name}?`,
            text: "Esta acción es irreversible. Se borrará toda su base de datos.",
            icon: 'error',
            showCancelButton: true,
            confirmButtonText: 'Destruir',
            confirmButtonColor: '#000',
            cancelButtonText: 'Cancelar',
            customClass: { popup: 'rounded-[2rem] bg-white/90 backdrop-blur-xl border border-gray-100 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)]' }
        })

        if (!confirm.isConfirmed) return

        const { error } = await supabase.from('stores').delete().eq('id', store.id)

        if (error) {
            Swal.fire({ title: 'Error', text: 'Debes borrar primero los productos de esta tienda.', icon: 'error', customClass: { popup: 'rounded-[2rem]' }})
        } else {
            Swal.fire({ icon: 'success', title: 'Destruida', toast: true, position: 'top-end', showConfirmButton: false, timer: 1500, customClass: { popup: 'rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.05)]' } })
            fetchStores()
        }
    }

    const impersonateStore = async (store: any) => {
        const confirm = await Swal.fire({
            title: `¿Infiltrarse en ${store.name}?`,
            text: "Se generará un ticket criptográfico de sesión para esta tienda.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Generar Acceso',
            confirmButtonColor: '#000',
            cancelButtonText: 'Cancelar',
            customClass: { popup: 'rounded-[2rem] bg-white/90 backdrop-blur-xl border border-gray-100 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)]' }
        })

        if (!confirm.isConfirmed) return

        Swal.fire({
            title: 'Forzando cerradura...',
            allowOutsideClick: false,
            customClass: { popup: 'rounded-[2rem] bg-white/90 backdrop-blur-xl border border-gray-100' },
            didOpen: () => Swal.showLoading()
        })

        try {
            // 1. OBTENEMOS EL LINK DESDE LA API
            const res = await fetch('/api/admin/impersonate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: store.user_id })
            })

            const data = await res.json()

            if (!res.ok) throw new Error(data.error)

            // 2. MOSTRAMOS EL ENLACE PARA INCÓGNITO Y LA OPCIÓN DE ENTRAR DIRECTO
            Swal.fire({
                title: 'Acceso Generado',
                icon: 'success',
                html: `
                    <div class="text-left mt-2">
                        <p class="text-sm text-gray-500 mb-5 font-medium leading-relaxed">
                            <b>Advertencia:</b> Si abres este enlace aquí, tu sesión actual de God Mode se cerrará.
                        </p>
                        <button id="direct-access-btn" class="w-full bg-black text-white px-5 py-4 rounded-2xl text-xs font-bold block text-center mb-4 hover:bg-gray-900 active:scale-95 transition-all shadow-[0_8px_20px_-8px_rgba(0,0,0,0.3)]">
                            Entrar Directamente
                        </button>
                        <p class="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 pl-1">Enlace para Incógnito (Recomendado):</p>
                        <input type="text" id="magic-link-input" value="${data.url}" readonly 
                            class="w-full p-4 border border-gray-100 rounded-2xl text-xs font-medium bg-gray-50/50 text-gray-600 focus:outline-none focus:ring-2 focus:ring-black/5 cursor-pointer transition-all" 
                        />
                    </div>
                `,
                showConfirmButton: false,
                showCancelButton: true,
                cancelButtonText: 'Cerrar',
                customClass: { popup: 'rounded-[2rem] bg-white/95 backdrop-blur-2xl border border-gray-100 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.1)]' },
                didOpen: () => {
                    const input = document.getElementById('magic-link-input') as HTMLInputElement;
                    const directBtn = document.getElementById('direct-access-btn') as HTMLButtonElement;

                    if (input) {
                        input.addEventListener('click', () => {
                            input.select();
                            navigator.clipboard.writeText(input.value).then(() => {
                                Swal.showValidationMessage('¡Enlace copiado al portapapeles!');
                            }).catch(() => {
                                Swal.showValidationMessage('Error al copiar el enlace.');
                            });
                        });
                    }

                    if (directBtn) {
                        directBtn.addEventListener('click', async () => {
                            directBtn.innerHTML = '<span class="flex items-center justify-center gap-2"><svg class="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Abriendo brecha...</span>';
                            directBtn.disabled = true;
                            // 3. CERRAR SESIÓN DE ADMIN ANTES DE REDIRIGIR PARA EVITAR COLISIÓN
                            await supabase.auth.signOut();
                            window.location.href = data.url;
                        });
                    }
                }
            })
        } catch (error: any) {
            Swal.fire({ title: 'Error de Acceso', text: error.message, icon: 'error', customClass: { popup: 'rounded-[2rem]' } })
        }
    }

    // --- KPIs FINANCIEROS (Conectados a la Fuente de la Verdad) ---
    const kpis = useMemo(() => {
        const now = new Date()
        
        // Filtramos usando EXACTAMENTE la misma regla blindada de la tabla
        const active = stores.filter(store => {
            const targetDateString = store.subscription_ends_at || store.trial_ends_at;
            const endsAt = targetDateString ? new Date(targetDateString) : new Date();
            
            // Es expirada si el tiempo ya pasó O si su estatus oficial es 'expired'
            const isExpired = endsAt < now || store.subscription_status === 'expired';
            
            return !isExpired; // Si no ha expirado, la contamos como activa para el MRR
        }).length;

        const expired = stores.length - active;

        return {
            total: stores.length,
            active,
            expired,
            // Cálculo dinámico de MRR basado en tu configuración ($18.99)
            mrr: (active * PREZISO_BILLING.priceUSD).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        }
    }, [stores])

    const filteredStores = stores.filter(s => s.name.toLowerCase().includes(search.toLowerCase()) || s.slug.toLowerCase().includes(search.toLowerCase()))

    // Pantalla en blanco de seguridad mientras verifica
    if (!isAuthorized) return <div className="min-h-screen bg-[#FDFDFD]" />

    return (
        <div className="min-h-screen relative overflow-hidden bg-[#FDFDFD] font-sans text-gray-900 pb-24 selection:bg-black selection:text-white">

            {/* EFECTOS LIQUID TITANIUM / BACKGROUND GLOWS DISCRETOS */}
            <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-gray-200/40 rounded-full blur-[120px] pointer-events-none -z-10 mix-blend-multiply" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-gray-100/60 rounded-full blur-[140px] pointer-events-none -z-10" />

            {/* HEADER ULTRA CLEAN */}
            <header className="sticky top-0 z-40 bg-white/60 backdrop-blur-2xl border-b border-white/80 px-6 py-5 flex justify-between items-center shadow-[0_4px_30px_-10px_rgba(0,0,0,0.02)]">
                <div className="flex items-center gap-4">
                    <div className="bg-gradient-to-b from-gray-50 to-gray-100 p-2.5 rounded-[1rem] border border-white shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_2px_10px_-2px_rgba(0,0,0,0.03)]">
                        <ShieldAlert size={20} className="text-gray-800" strokeWidth={1.5} />
                    </div>
                    <div>
                        <h1 className="text-xl md:text-2xl font-black tracking-tighter text-gray-900 leading-none">God Mode</h1>
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1">Nervio Central</p>
                    </div>
                </div>
                <Link href="/admin" className="text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-black hover:bg-gray-50 px-4 py-2.5 rounded-full transition-all duration-300">
                    Volver al Panel
                </Link>
            </header>

            <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-10 space-y-12">

                {/* KPI DASHBOARD (Liquid Cards) */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                    <div className="bg-white/80 backdrop-blur-xl p-6 rounded-[2rem] border border-white shadow-[0_20px_40px_-15px_rgba(0,0,0,0.02)] hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.04)] hover:-translate-y-1 transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]">
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-2.5 flex items-center gap-2"><Store size={14} strokeWidth={1.5} /> Total Tiendas</p>
                        <p className="text-4xl font-black tabular-nums tracking-tighter text-gray-900">{kpis.total}</p>
                    </div>
                    <div className="bg-white/80 backdrop-blur-xl p-6 rounded-[2rem] border border-white shadow-[0_20px_40px_-15px_rgba(0,0,0,0.02)] hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.04)] hover:-translate-y-1 transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]">
                        <p className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest mb-2.5 flex items-center gap-2"><Zap size={14} strokeWidth={1.5} /> Activas</p>
                        <p className="text-4xl font-black tabular-nums tracking-tighter text-gray-900">{kpis.active}</p>
                    </div>
                    <div className="bg-white/80 backdrop-blur-xl p-6 rounded-[2rem] border border-white shadow-[0_20px_40px_-15px_rgba(0,0,0,0.02)] hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.04)] hover:-translate-y-1 transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]">
                        <p className="text-[9px] font-bold text-red-400 uppercase tracking-widest mb-2.5 flex items-center gap-2"><Ban size={14} strokeWidth={1.5} /> Vencidas</p>
                        <p className="text-4xl font-black tabular-nums tracking-tighter text-gray-900">{kpis.expired}</p>
                    </div>
                    <div className="bg-white/80 backdrop-blur-xl p-6 rounded-[2rem] border border-white shadow-[0_20px_40px_-15px_rgba(0,0,0,0.02)] hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.04)] hover:-translate-y-1 transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]">
                        <p className="text-[9px] font-bold text-blue-500 uppercase tracking-widest mb-2.5 flex items-center gap-2"><TrendingUp size={14} strokeWidth={1.5} /> MRR</p>
                        <p className="text-4xl font-black tabular-nums tracking-tighter text-gray-900">${kpis.mrr}</p>
                    </div>
                </div>

                {/* CONTROLES DE BÚSQUEDA */}
                <div className="relative group max-w-2xl mx-auto">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-black transition-colors duration-300" size={18} strokeWidth={2} />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Buscar por tienda, ID o slug..."
                        className="w-full bg-white/70 backdrop-blur-xl border border-white shadow-[0_15px_35px_-10px_rgba(0,0,0,0.03)] focus:shadow-[0_20px_45px_-10px_rgba(0,0,0,0.06)] rounded-[2rem] pl-14 pr-6 py-5 text-sm font-semibold focus:border-white outline-none transition-all duration-500 placeholder:text-gray-400 placeholder:font-medium"
                    />
                </div>

                {/* LISTA DE TIENDAS - STRUCTURAL LIST */}
                <div className="bg-white/70 backdrop-blur-3xl rounded-[2rem] border border-white shadow-[0_20px_50px_-20px_rgba(0,0,0,0.03)] overflow-hidden">
                    {loading ? (
                        <div className="p-32 flex justify-center"><Loader2 className="animate-spin text-gray-200" size={32} /></div>
                    ) : (
                        <div className="overflow-x-auto w-full no-scrollbar">
                            <table className="w-full text-left text-sm whitespace-nowrap">
                                <thead className="bg-transparent border-b border-gray-100 text-[9px] uppercase tracking-[0.2em] text-gray-400 font-bold">
                                    <tr>
                                        <th className="px-8 py-6 font-bold">Entidad</th>
                                        <th className="px-8 py-6 font-bold">Diagnóstico</th>
                                        <th className="px-8 py-6 text-right font-bold">Terminal de Acción</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100/50">
                                    {filteredStores.map(store => {
                                        const targetDateString = store.subscription_ends_at || store.trial_ends_at;
                                        const endsAt = targetDateString ? new Date(targetDateString) : new Date();
                                        const now = new Date();
                                        const isExpired = endsAt < now || store.subscription_status === 'expired';
                                        
                                        // Días restantes o vencidos
                                        const diffDays = Math.ceil((endsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

                                        return (
                                            <tr key={store.id} className="hover:bg-white/60 transition-colors duration-300 group">
                                                <td className="px-8 py-6">
                                                    <div className="flex items-center gap-5">
                                                        <div className="w-12 h-12 rounded-[1.25rem] bg-gradient-to-br from-gray-50 to-gray-100 border border-white shadow-[inset_0_1px_0_rgba(255,255,255,1),0_2px_8px_-2px_rgba(0,0,0,0.05)] overflow-hidden flex items-center justify-center shrink-0">
                                                            {store.logo_url ? (
                                                                <Image
                                                                    src={getOptimizedUrl(store.logo_url)}
                                                                    alt={`Logo ${store.name}`}
                                                                    width={48}
                                                                    height={48}
                                                                    className="w-full h-full object-cover"
                                                                />
                                                            ) : (
                                                                <Store size={20} className="text-gray-300" strokeWidth={1.5} />
                                                            )}
                                                        </div>
                                                      
                                                        <div>
                                                            <p className="font-black text-gray-900 tracking-tight">{store.name}</p>
                                                            {/* 🚀 ETIQUETA REQ #4: INDICA SI VIENE DE UN AFILIADO */}
                                                            {store.referrerName && (
                                                                <span className="inline-flex items-center gap-1 bg-purple-50 text-purple-700 text-[9px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider mt-1">
                                                                    Referida por: {store.referrerName}
                                                                </span>
                                                            )}
                                                            <Link href={`/${store.slug}`} target="_blank" className="text-[10px] font-bold text-gray-400 hover:text-black flex items-center gap-1.5 mt-1 transition-colors">
                                                                preziso.shop/{store.slug} <ExternalLink size={10} />
                                                            </Link>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <div className="flex flex-col gap-2 items-start">
                                                        {isExpired ? (
                                                            <span className=" border border-red-100 text-red-600 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 "><Ban size={10} strokeWidth={2.5} /> Pausada</span>
                                                        ) : (
                                                            <span className=" border border-emerald-100 text-emerald-600 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 "><Zap size={10} strokeWidth={2.5} /> Activa ({diffDays}d)</span>
                                                        )}
                                                        <span className="text-[10px] font-bold text-gray-400 flex items-center gap-1.5 uppercase tracking-widest"><Clock size={10} /> {endsAt.toLocaleDateString()}</span>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6 text-right">
                                                    <div className="flex items-center justify-end gap-2.5">
                                                        <button
                                                            onClick={() => addCustomDays(store)}
                                                            className="bg-black text-white px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.96] hover:bg-gray-900 hover:shadow-[0_8px_20px_-6px_rgba(0,0,0,0.3)]"
                                                        >
                                                            <Edit3 size={14} /> Renovar
                                                        </button>
                                                        <button
                                                            onClick={() => pauseStore(store)}
                                                            className="bg-gradient-to-b from-white to-gray-50 border border-gray-100 text-gray-500 hover:text-red-500 hover:border-red-200 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.96] hover:shadow-[0_4px_15px_-4px_rgba(255,0,0,0.1)]"
                                                            title="Bloquear Tienda"
                                                        >
                                                            Bloquear
                                                        </button>
                                                        <button
                                                            onClick={() => impersonateStore(store)}
                                                            className="bg-gradient-to-b from-white to-gray-50 border border-gray-100 text-gray-500 hover:text-blue-600 hover:border-blue-200 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.96] hover:shadow-[0_4px_15px_-4px_rgba(0,0,255,0.05)]"
                                                            title="Iniciar sesión como este usuario"
                                                        >
                                                            Infiltrarse
                                                        </button>
                                                        <div className="w-px h-6 bg-gray-100 mx-1"></div>
                                                        <button
                                                            onClick={() => deleteStore(store)}
                                                            className="p-2.5 text-gray-300 hover:text-red-500 transition-all duration-300 rounded-xl hover:bg-red-50 active:scale-95"
                                                            title="Eliminar Base de Datos"
                                                        >
                                                            <Trash2 size={16} strokeWidth={2} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}