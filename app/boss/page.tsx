'use client'

import { useState, useEffect, useMemo } from 'react'
import { ShieldAlert, Store, Zap, Ban, Search, DollarSign, Loader2, ExternalLink, TrendingUp, Clock, Trash2 } from 'lucide-react'
import { getSupabase } from '@/lib/supabase-client'
import Swal from 'sweetalert2'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

// 🔒 CONFIGURACIÓN DE SEGURIDAD EXTREMA
// Solo este correo podrá ver esta pantalla y hacer cambios.
const ADMIN_EMAIL = 'quanzosinc@gmail.com' 

export default function SuperAdminPage() {
    const supabase = getSupabase()
    const router = useRouter()
    
    const [loading, setLoading] = useState(true)
    const [stores, setStores] = useState<any[]>([])
    const [search, setSearch] = useState('')
    const [isAuthorized, setIsAuthorized] = useState(false)

    // 1. PRIMERO declaramos la función
    const fetchStores = async () => {
        setLoading(true)
        const { data, error } = await supabase
            .from('stores')
            .select('*')
            .order('created_at', { ascending: false })
            
        if (data) setStores(data)
        setLoading(false)
    }

    // 2. LUEGO ejecutamos el useEffect (ahora sí sabe qué es fetchStores)
    useEffect(() => {
        const verifyAndFetch = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            
            if (!user) {
                router.push('/login')
                return
            }

            // MODO DEBUG: Vamos a mostrar qué correo está leyendo el sistema
            if (user.email !== ADMIN_EMAIL) {
                Swal.fire({
                    title: 'Acceso Denegado',
                    html: `El sistema esperaba:<br/><b>${ADMIN_EMAIL}</b><br/><br/>Pero tú entraste con:<br/><b>${user.email}</b>`,
                    icon: 'error',
                    confirmButtonColor: '#000'
                }).then(() => {
                    router.push('/admin') // Lo mandamos de vuelta a su panel si no es el jefe
                })
                return
            }
            
            setIsAuthorized(true)
            await fetchStores()
        }
        verifyAndFetch()
    }, [router, supabase])

   
    // --- ACCIONES DE GOD MODE ---

    const add30Days = async (store: any) => {
        const confirm = await Swal.fire({
            title: `¿Activar ${store.name}?`,
            text: "Se le sumarán 30 días a su suscripción y volverá a estar online.",
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Sí, activar',
            confirmButtonColor: '#000',
            cancelButtonText: 'Cancelar'
        })

        if (!confirm.isConfirmed) return

        const newDate = new Date()
        newDate.setDate(newDate.getDate() + 30) // Sumamos 30 días desde HOY

        const { error } = await supabase.from('stores').update({
            subscription_status: 'active',
            trial_ends_at: newDate.toISOString()
        }).eq('id', store.id)

        if (error) {
            Swal.fire('Error', 'No se pudo actualizar.', 'error')
        } else {
            Swal.fire({ icon: 'success', title: 'Tienda Activada', toast: true, position: 'top-end', showConfirmButton: false, timer: 1500, customClass: { popup: 'bg-black text-white rounded-xl' } })
            fetchStores()
        }
    }

    const pauseStore = async (store: any) => {
        const confirm = await Swal.fire({
            title: `¿Pausar ${store.name}?`,
            text: "Su tienda mostrará el OVNI de mantenimiento inmediatamente.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, pausar',
            confirmButtonColor: '#e3342f',
            cancelButtonText: 'Cancelar'
        })

        if (!confirm.isConfirmed) return

        // Forzamos una fecha en el pasado para que el OVNI se active inmediatamente
        const pastDate = new Date('2000-01-01').toISOString()

        const { error } = await supabase.from('stores').update({
            subscription_status: 'trial',
            trial_ends_at: pastDate
        }).eq('id', store.id)

        if (error) {
            Swal.fire('Error', 'No se pudo pausar.', 'error')
        } else {
            Swal.fire({ icon: 'success', title: 'Tienda Pausada', toast: true, position: 'top-end', showConfirmButton: false, timer: 1500, customClass: { popup: 'bg-black text-white rounded-xl' } })
            fetchStores()
        }
    }

    const deleteStore = async (store: any) => {
        const confirm = await Swal.fire({
            title: `¿ELIMINAR ${store.name}?`,
            text: "Esta acción destruirá la tienda. Solo úsalo para pruebas o spam.",
            icon: 'error',
            showCancelButton: true,
            confirmButtonText: 'ELIMINAR',
            confirmButtonColor: '#000',
            cancelButtonText: 'Cancelar'
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

    // --- KPIs FINANCIEROS (Matemática B2B) ---
    const kpis = useMemo(() => {
        const now = new Date()
        const active = stores.filter(s => s.subscription_status === 'active' || new Date(s.trial_ends_at) > now).length
        const expired = stores.length - active
        return {
            total: stores.length,
            active,
            expired,
            mrr: active * 10 // Multiplicamos tiendas activas por tu precio mensual (Ej: $10)
        }
    }, [stores])

    const filteredStores = stores.filter(s => s.name.toLowerCase().includes(search.toLowerCase()) || s.slug.toLowerCase().includes(search.toLowerCase()))

    if (!isAuthorized) return null

    return (
        <div className="min-h-screen bg-gray-50 font-sans text-gray-900 pb-20">
            {/* HEADER */}
            <header className="bg-black text-white px-6 py-8 border-b border-gray-800 flex justify-between items-center">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md"><ShieldAlert size={24} className="text-white"/></div>
                        <h1 className="text-2xl md:text-3xl font-black tracking-tight">God Mode</h1>
                    </div>
                    <p className="text-xs text-gray-400 font-medium ml-1">Centro de Mando Administrativo Preziso</p>
                </div>
                <Link href="/admin" className="text-xs font-bold bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg transition-colors border border-white/10">
                    Volver a mi Panel
                </Link>
            </header>

            <div className="max-w-6xl mx-auto px-4 md:px-6 py-8 space-y-8">
                
                {/* KPI DASHBOARD */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white p-5 rounded-2xl border border-gray-200">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1.5"><Store size={14}/> Tiendas Registradas</p>
                        <p className="text-3xl font-black text-gray-900">{kpis.total}</p>
                    </div>
                    <div className="bg-white p-5 rounded-2xl border border-gray-200">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1.5 text-emerald-600"><Zap size={14}/> Activas / Trial</p>
                        <p className="text-3xl font-black text-gray-900">{kpis.active}</p>
                    </div>
                    <div className="bg-white p-5 rounded-2xl border border-gray-200">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1.5 text-red-500"><Ban size={14}/> Vencidas (OVNI)</p>
                        <p className="text-3xl font-black text-gray-900">{kpis.expired}</p>
                    </div>
                    <div className="bg-black p-5 rounded-2xl border border-gray-900">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1.5"><TrendingUp size={14}/> MRR Proyectado</p>
                        <p className="text-3xl font-black text-white">${kpis.mrr}</p>
                    </div>
                </div>

                {/* BUSCADOR */}
                <div className="relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-black transition-colors" size={18} />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Buscar por nombre de tienda o slug..."
                        className="w-full bg-white border border-gray-200 rounded-xl pl-12 pr-4 py-4 text-sm font-bold focus:ring-1 focus:ring-black outline-none transition-all"
                    />
                </div>

                {/* LISTA DE TIENDAS */}
                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                    {loading ? (
                        <div className="p-20 flex justify-center"><Loader2 className="animate-spin text-gray-300" size={32}/></div>
                    ) : (
                        <div className="overflow-x-auto w-full">
                            <table className="w-full text-left text-sm whitespace-nowrap">
                                <thead className="bg-gray-50 border-b border-gray-200 text-[10px] uppercase tracking-widest text-gray-500 font-black">
                                    <tr>
                                        <th className="px-6 py-4">Tienda</th>
                                        <th className="px-6 py-4">Status / Expira</th>
                                        <th className="px-6 py-4 text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filteredStores.map(store => {
                                        const endsAt = new Date(store.trial_ends_at)
                                        const isExpired = store.subscription_status === 'trial' && endsAt < new Date()

                                        return (
                                            <tr key={store.id} className="hover:bg-gray-50 transition-colors group">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-lg bg-gray-100 border border-gray-200 overflow-hidden flex items-center justify-center shrink-0">
                                                            {store.logo_url ? <img src={store.logo_url} className="w-full h-full object-cover"/> : <Store size={18} className="text-gray-400"/>}
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-gray-900">{store.name}</p>
                                                            <Link href={`/${store.slug}`} target="_blank" className="text-[10px] font-mono text-blue-600 hover:underline flex items-center gap-1 mt-0.5">
                                                                preziso.com/{store.slug} <ExternalLink size={10}/>
                                                            </Link>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col gap-1.5 items-start">
                                                        {isExpired ? (
                                                            <span className="bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest flex items-center gap-1"><Ban size={10}/> Pausada</span>
                                                        ) : (
                                                            <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest flex items-center gap-1"><Zap size={10}/> Activa</span>
                                                        )}
                                                        <span className="text-[10px] font-mono text-gray-500 flex items-center gap-1"><Clock size={10}/> {endsAt.toLocaleDateString()}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button 
                                                            onClick={() => add30Days(store)}
                                                            className="bg-black text-white px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider hover:bg-gray-800 transition-colors flex items-center gap-1"
                                                        >
                                                            <DollarSign size={14}/> +30 Días
                                                        </button>
                                                        <button 
                                                            onClick={() => pauseStore(store)}
                                                            className="bg-white border border-gray-200 text-gray-600 hover:text-red-600 hover:border-red-200 hover:bg-red-50 px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-colors flex items-center gap-1"
                                                            title="Forzar pausa de mantenimiento"
                                                        >
                                                            <Ban size={14}/> Pausar
                                                        </button>
                                                        <button 
                                                            onClick={() => deleteStore(store)}
                                                            className="p-1.5 text-gray-300 hover:text-red-500 transition-colors ml-2"
                                                            title="Eliminar tienda (Solo pruebas)"
                                                        >
                                                            <Trash2 size={16}/>
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