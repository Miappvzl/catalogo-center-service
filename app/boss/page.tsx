'use client'

import { useState, useEffect, useMemo } from 'react'
import { ShieldAlert, Store, Zap, Ban, Search, Edit3, Loader2, ExternalLink, TrendingUp, Clock, Trash2 } from 'lucide-react'
import { getSupabase } from '@/lib/supabase-client'
import { PREZISO_BILLING } from '@/lib/config/billing'
import Swal from 'sweetalert2'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

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
        const { data } = await supabase
            .from('stores')
            .select('*')
            .order('created_at', { ascending: false })

        if (data) setStores(data)
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
            customClass: { popup: 'rounded-2xl shadow-none border border-gray-100' },
            inputValidator: (value) => {
                if (!value || Number(value) <= 0) return 'Ingresa un número válido mayor a 0'
            }
        })

        if (!isConfirmed || !days) return

        const daysToAdd = parseInt(days, 10)
        const now = new Date()
        const currentEndDate = new Date(store.trial_ends_at)

        // LÓGICA FINANCIERA INTELIGENTE:
        // Si la tienda ya expiró, le sumamos los días desde el momento en que pagó (HOY).
        // Si la tienda no ha expirado, le sumamos los días a su FECHA DE CORTE para no robarle tiempo.
        const baseDate = currentEndDate > now ? currentEndDate : now
        const newDate = new Date(baseDate)
        newDate.setDate(newDate.getDate() + daysToAdd)

        const { error } = await supabase.from('stores').update({
            subscription_status: 'active',
            trial_ends_at: newDate.toISOString()
        }).eq('id', store.id)

        if (error) {
            Swal.fire('Error', 'No se pudo actualizar la suscripción.', 'error')
        } else {
            Swal.fire({ icon: 'success', title: `+${daysToAdd} Días Agregados`, toast: true, position: 'top-end', showConfirmButton: false, timer: 2000, customClass: { popup: 'bg-black text-white rounded-2xl' } })
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
            customClass: { popup: 'rounded-2xl shadow-none border border-gray-100' }
        })

        if (!confirm.isConfirmed) return

        const pastDate = new Date('2000-01-01').toISOString()
        const { error } = await supabase.from('stores').update({
            subscription_status: 'trial',
            trial_ends_at: pastDate
        }).eq('id', store.id)

        if (!error) {
            Swal.fire({ icon: 'success', title: 'Tienda Bloqueada', toast: true, position: 'top-end', showConfirmButton: false, timer: 1500 })
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
            customClass: { popup: 'rounded-2xl shadow-none border border-gray-100' }
        })

        if (!confirm.isConfirmed) return

        const { error } = await supabase.from('stores').delete().eq('id', store.id)

        if (error) {
            Swal.fire('Error', 'Debes borrar primero los productos de esta tienda.', 'error')
        } else {
            Swal.fire({ icon: 'success', title: 'Destruida', toast: true, position: 'top-end', showConfirmButton: false, timer: 1500 })
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
            customClass: { popup: 'rounded-2xl shadow-none border border-gray-100' }
        })

        if (!confirm.isConfirmed) return

        Swal.fire({
            title: 'Forzando cerradura...',
            allowOutsideClick: false,
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
                        <p class="text-sm text-gray-600 mb-4">
                            <b>Advertencia:</b> Si abres este enlace aquí, tu sesión actual de God Mode se cerrará.
                        </p>
                        <button id="direct-access-btn" class="w-full bg-black text-white px-4 py-3 rounded-xl text-sm font-bold block text-center mb-3 hover:bg-gray-800 transition-colors">
                            Entrar Directamente
                        </button>
                        <p class="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Enlace para Incógnito (Recomendado):</p>
                        <input type="text" id="magic-link-input" value="${data.url}" readonly 
                            class="w-full p-2.5 border border-gray-200 rounded-xl text-xs bg-gray-50 text-gray-600 focus:outline-none cursor-pointer" 
                        />
                    </div>
                `,
                showConfirmButton: false,
                showCancelButton: true,
                cancelButtonText: 'Cerrar',
                customClass: { popup: 'rounded-2xl shadow-none border border-gray-100' },
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
            Swal.fire('Error de Acceso', error.message, 'error')
        }
    }

    // --- KPIs FINANCIEROS (Conectados a la Fuente de la Verdad) ---
    const kpis = useMemo(() => {
        const now = new Date()
        const active = stores.filter(s => s.subscription_status === 'active' || new Date(s.trial_ends_at) > now).length
        const expired = stores.length - active
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
    if (!isAuthorized) return <div className="min-h-screen bg-[#F8F9FA]" />

    return (
        <div className="min-h-screen bg-[#F8F9FA] font-sans text-gray-900 pb-20 selection:bg-black selection:text-white">

            {/* HEADER ULTRA CLEAN */}
            <header className="bg-white px-6 py-6 border-b border-gray-100 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="bg-gray-50 p-2.5 rounded-2xl border border-gray-100">
                        <ShieldAlert size={20} className="text-gray-900" />
                    </div>
                    <div>
                        <h1 className="text-xl md:text-2xl font-black tracking-tight text-gray-900">God Mode</h1>
                        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Control Central</p>
                    </div>
                </div>
                <Link href="/admin" className="text-xs font-bold text-gray-500 hover:text-black transition-colors">
                    Volver al Panel
                </Link>
            </header>

            <div className="max-w-6xl mx-auto px-4 md:px-6 py-8 space-y-8">

                {/* KPI DASHBOARD (Tarjetas Blancas, sin sombras, bordes ultra finos) */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-none">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5"><Store size={14} /> Total Tiendas</p>
                        <p className="text-3xl font-black text-gray-900">{kpis.total}</p>
                    </div>
                    <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-none">
                        <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mb-1.5 flex items-center gap-1.5"><Zap size={14} /> Activas</p>
                        <p className="text-3xl font-black text-gray-900">{kpis.active}</p>
                    </div>
                    <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-none">
                        <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5"><Ban size={14} /> Vencidas</p>
                        <p className="text-3xl font-black text-gray-900">{kpis.expired}</p>
                    </div>
                    <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-none">
                        <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-1.5 flex items-center gap-1.5"><TrendingUp size={14} /> MRR</p>
                        <p className="text-3xl font-black text-gray-900">${kpis.mrr}</p>
                    </div>
                </div>

                {/* BUSCADOR */}
                <div className="relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 transition-colors" size={18} />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Buscar tienda o slug..."
                        className="w-full bg-white border border-gray-100 rounded-2xl pl-12 pr-4 py-4 text-sm font-bold focus:border-gray-300 outline-none transition-all shadow-none placeholder:text-gray-300"
                    />
                </div>

                {/* LISTA DE TIENDAS */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-none overflow-hidden">
                    {loading ? (
                        <div className="p-20 flex justify-center"><Loader2 className="animate-spin text-gray-200" size={32} /></div>
                    ) : (
                        <div className="overflow-x-auto w-full">
                            <table className="w-full text-left text-sm whitespace-nowrap">
                                <thead className="bg-gray-50/50 border-b border-gray-100 text-[10px] uppercase tracking-widest text-gray-400 font-bold">
                                    <tr>
                                        <th className="px-6 py-4">Tienda</th>
                                        <th className="px-6 py-4">Estatus</th>
                                        <th className="px-6 py-4 text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {filteredStores.map(store => {
                                        const endsAt = new Date(store.trial_ends_at)
                                        const now = new Date()
                                        const isExpired = store.subscription_status === 'trial' && endsAt < now

                                        // Días restantes o vencidos
                                        const diffDays = Math.ceil((endsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

                                        return (
                                            <tr key={store.id} className="hover:bg-gray-50/50 transition-colors group">
                                                <td className="px-6 py-5">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 rounded-xl bg-[#F8F9FA] border border-gray-100 overflow-hidden flex items-center justify-center shrink-0">
                                                            {store.logo_url ? <img src={store.logo_url} className="w-full h-full object-cover" /> : <Store size={18} className="text-gray-300" />}
                                                        </div>
                                                        <div>
                                                            <p className="font-black text-gray-900">{store.name}</p>
                                                            <Link href={`/${store.slug}`} target="_blank" className="text-[11px] font-bold text-gray-400 hover:text-black flex items-center gap-1 mt-0.5 transition-colors">
                                                                preziso.shop/{store.slug} <ExternalLink size={10} />
                                                            </Link>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5">
                                                    <div className="flex flex-col gap-1.5 items-start">
                                                        {isExpired ? (
                                                            <span className="bg-red-50 text-red-600 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-widest flex items-center gap-1"><Ban size={10} /> Pausada</span>
                                                        ) : (
                                                            <span className="bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-widest flex items-center gap-1"><Zap size={10} /> Activa ({diffDays}d)</span>
                                                        )}
                                                        <span className="text-[11px] font-bold text-gray-400 flex items-center gap-1"><Clock size={12} /> {endsAt.toLocaleDateString()}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button
                                                            onClick={() => addCustomDays(store)}
                                                            className="bg-black text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-transform active:scale-95"
                                                        >
                                                            <Edit3 size={14} /> Renovar
                                                        </button>
                                                        <button
                                                            onClick={() => pauseStore(store)}
                                                            className="bg-white border border-gray-100 text-gray-500 hover:text-red-500 hover:bg-red-50 hover:border-red-100 px-3.5 py-2 rounded-xl text-xs font-bold transition-all active:scale-95"
                                                            title="Bloquear Tienda"
                                                        >
                                                            Bloquear
                                                        </button>
                                                        <button
                                                            onClick={() => impersonateStore(store)}
                                                            className="bg-white border border-gray-100 text-gray-500 hover:text-blue-600 hover:bg-blue-50 hover:border-blue-100 px-3.5 py-2 rounded-xl text-xs font-bold transition-all active:scale-95"
                                                            title="Iniciar sesión como este usuario"
                                                        >
                                                            Infiltrarse
                                                        </button>
                                                        <button
                                                            onClick={() => deleteStore(store)}
                                                            className="p-2 text-gray-300 hover:text-red-500 transition-colors ml-1 rounded-xl hover:bg-red-50"
                                                            title="Eliminar Base de Datos"
                                                        >
                                                            <Trash2 size={16} />
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