// Archivo: app/admin/commissions/page.tsx
'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { ArrowLeft, Search, CheckCircle2, Clock, Users, DollarSign, Wallet, Loader2, ArrowUpRight, Copy, Check, Smartphone, XCircle } from 'lucide-react'
import Link from 'next/link'
import { getSupabase } from '@/lib/supabase-client'
import Swal from 'sweetalert2'

// --- TIPOS ESTRICTOS ---
interface Commission {
    id: string
    store_id: string
    amount_usd: number
    status: 'pending' | 'approved' | 'paid_out' | 'cancelled' // 🚀 NUEVO ESTADO AGREGADO
    created_at: string
    affiliates: { name: string; phone: string; promo_code: string; payment_details: any }
    orders: { order_number: number; total_usd: number }
}



// 🚀 NUEVO TIPO: Para el directorio de promotores
interface Affiliate {
    id: string
    name: string
    phone: string
    promo_code: string
    created_at: string
    payment_details: any
    commissions: { amount_usd: number; status: string }[]
}

// 🚀 RENDERIZADO VISUAL DEL ESTADO
const StatusBadge = ({ status }: { status: string }) => {
    const styles: Record<string, string> = {
        pending: 'bg-yellow-50 text-yellow-700',
        approved: 'bg-blue-50 text-blue-700',
        paid_out: 'bg-emerald-50 text-emerald-700',
        cancelled: 'bg-red-50 text-red-700' // 🚀 NUEVO DISEÑO
    }
    const labels: Record<string, string> = {
        pending: 'En Tránsito',
        approved: 'Por Pagar',
        paid_out: 'Pagado',
        cancelled: 'Cancelado' // 🚀 NUEVA ETIQUETA
    }

    let Icon = Clock
    if (status === 'paid_out') Icon = CheckCircle2
    if (status === 'cancelled') Icon = XCircle

    return (
        <span className={`flex items-center justify-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide shrink-0 ${styles[status] || styles.pending}`}>
            <Icon size={12} strokeWidth={3} />
            {labels[status] || status}
        </span>
    )
}

export default function CommissionsPage() {
    const supabase = getSupabase()
    const [loading, setLoading] = useState(true)
    const [viewMode, setViewMode] = useState<'ledger' | 'directory'>('ledger') // 🚀 CONTROL DE PESTAÑAS

    // Estados de datos
    const [commissions, setCommissions] = useState<Commission[]>([])
    const [affiliates, setAffiliates] = useState<Affiliate[]>([])

    const [search, setSearch] = useState('')
    const [filterStatus, setFilterStatus] = useState('all')
    const [storeId, setStoreId] = useState<string | null>(null)
    const [updatingId, setUpdatingId] = useState<string | null>(null)
    const [copiedPhone, setCopiedPhone] = useState<string | null>(null)

    // 0. OBTENER TIENDA
    useEffect(() => {
        const initStore = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                const { data: store } = await supabase.from('stores').select('id').eq('user_id', user.id).single()
                if (store) setStoreId(store.id)
            }
        }
        initStore()
    }, [supabase])

    // 1. OBTENER DATOS (Comisiones + Directorio)
    const fetchData = useCallback(async () => {
        if (!storeId) return
        setLoading(true)
        try {
            // Ejecutamos ambas consultas en paralelo para mayor velocidad
            const [commRes, affRes] = await Promise.all([
                supabase
                    .from('commissions')
                    .select(`
                        id, amount_usd, status, created_at, store_id,
                        affiliates (name, phone, promo_code, payment_details),
                        orders (order_number, total_usd)
                    `)
                    .eq('store_id', storeId)
                    .order('created_at', { ascending: false }),

                supabase
                    .from('affiliates')
                    .select(`
                        id, name, phone, promo_code, created_at, payment_details,
                        commissions(amount_usd, status)
                    `)
                    .eq('store_id', storeId)
                    .order('created_at', { ascending: false })
            ])

            if (commRes.data) setCommissions(commRes.data as any || [])
            if (affRes.data) setAffiliates(affRes.data as any || [])

        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }, [supabase, storeId])

    useEffect(() => {
        if (storeId) fetchData()
    }, [fetchData, storeId])

    // 2. LIQUIDAR COMISIÓN (MARCAR COMO PAGADA)
    const markAsPaid = async (commission: Commission) => {
        const paymentInfo = commission.affiliates.payment_details?.instructions || 'El promotor no ha dejado instrucciones de pago.'

        const { isConfirmed } = await Swal.fire({
            title: 'Liquidar Comisión',
            html: `
                <div class="text-left text-sm mt-2">
                    <p class="mb-3 text-gray-500">Transfiere <b>$${commission.amount_usd.toFixed(2)}</b> al promotor y luego confirma aquí.</p>
                    <div class="bg-gray-50 p-3 rounded-lg border border-gray-200">
                        <p class="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Datos del Promotor:</p>
                        <p class="font-mono text-gray-800 whitespace-pre-wrap">${paymentInfo}</p>
                    </div>
                </div>
            `,
            icon: 'info',
            showCancelButton: true,
            confirmButtonText: 'Sí, ya transferí',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#000',
            customClass: { popup: 'rounded-2xl' }
        })

        if (!isConfirmed) return

        setUpdatingId(commission.id)
        try {
            const { error } = await supabase
                .from('commissions')
                .update({ status: 'paid_out' })
                .eq('id', commission.id)

            if (error) throw error

            setCommissions(prev => prev.map(c => c.id === commission.id ? { ...c, status: 'paid_out' } : c))
            Swal.fire({ icon: 'success', title: 'Comisión Pagada', toast: true, position: 'top-end', timer: 2000, showConfirmButton: false })
        } catch (error) {
            Swal.fire('Error', 'No se pudo actualizar el estado.', 'error')
        } finally {
            setUpdatingId(null)
        }
    }

    const copyToClipboard = (text: string, id: string) => {
        navigator.clipboard.writeText(text)
        setCopiedPhone(id)
        setTimeout(() => setCopiedPhone(null), 2000)
    }

    // 3. KPIS CALCULADOS EN TIEMPO REAL
    const kpis = useMemo(() => {
        let debt = 0; let paid = 0; let generated = 0;
        commissions.forEach(c => {
            if (c.status === 'pending' || c.status === 'approved') debt += Number(c.amount_usd)
            if (c.status === 'paid_out') paid += Number(c.amount_usd)
            generated += Number(c.orders?.total_usd || 0)
        })
        return {
            debt,
            paid,
            generated,
            totalAffiliates: affiliates.length
        }
    }, [commissions, affiliates])

    // 4. FILTROS
    const filteredCommissions = useMemo(() => {
        return commissions.filter(c => {
            const searchLower = search.toLowerCase()
            const matchesSearch =
                c.affiliates?.name?.toLowerCase().includes(searchLower) ||
                c.affiliates?.promo_code?.toLowerCase().includes(searchLower) ||
                c.orders?.order_number?.toString().includes(search)
            const matchesFilter = filterStatus === 'all' ||
                (filterStatus === 'debt' && c.status !== 'paid_out') ||
                (filterStatus === 'paid' && c.status === 'paid_out')
            return matchesSearch && matchesFilter
        })
    }, [commissions, search, filterStatus])

    const filteredAffiliates = useMemo(() => {
        return affiliates.filter(a => {
            const searchLower = search.toLowerCase()
            return a.name.toLowerCase().includes(searchLower) || a.promo_code.toLowerCase().includes(searchLower)
        })
    }, [affiliates, search])

    return (
        <div className="min-h-screen bg-[#F6F6F6] pb-20 font-sans text-gray-900 flex flex-col">

            {/* HEADER STICKY */}
            <div className="bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-30 px-4 md:px-8 py-4 flex justify-between items-center transition-all">
                <div className="flex items-center gap-4">
                    <Link href="/admin" className="p-2 bg-transparent hover:bg-gray-50 rounded-lg transition-all group shrink-0">
                        <ArrowLeft size={18} className="text-gray-500 group-hover:text-black" />
                    </Link>
                    <div>
                        <h1 className="font-black text-xl tracking-tight leading-none">Red de Promotores</h1>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Gestión B2B</p>
                    </div>
                </div>
                <button onClick={fetchData} className="p-2 hover:bg-gray-100 rounded-lg transition-colors active:rotate-180 duration-500 shrink-0">
                    <Clock size={18} className="text-gray-400" />
                </button>
            </div>

            <div className="w-full max-w-[1400px] mx-auto px-4 md:px-8 py-8 space-y-6 md:space-y-8">

                {/* KPI CARDS (Ahora son 4) */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full">
                    <div className="bg-white p-6 rounded-2xl border border-gray-100 flex flex-col justify-center min-w-0">
                        <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest mb-1 truncate flex items-center gap-1"><Wallet size={12} /> Deuda</p>
                        <p className="text-2xl font-black text-gray-900 leading-none truncate">${kpis.debt.toFixed(2)}</p>
                    </div>
                    <div className="bg-white p-6 rounded-2xl border border-gray-100 min-w-0 flex flex-col justify-center">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 truncate flex items-center gap-1"><CheckCircle2 size={12} /> Pagado</p>
                        <p className="text-2xl font-black text-gray-900 truncate">${kpis.paid.toFixed(2)}</p>
                    </div>
                    <div className="bg-white p-6 rounded-2xl border border-gray-100 min-w-0 flex flex-col justify-center">
                        <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-1 truncate flex items-center gap-1"><DollarSign size={12} /> Ventas</p>
                        <p className="text-2xl font-black text-emerald-900 truncate">${kpis.generated.toFixed(2)}</p>
                    </div>
                    <div className="bg-white p-6 rounded-2xl border border-gray-100 min-w-0 flex flex-col justify-center">
                        <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-1 truncate flex items-center gap-1"><Users size={12} /> Promotores</p>
                        <p className="text-2xl font-black text-blue-900 truncate">{kpis.totalAffiliates}</p>
                    </div>
                </div>

                {/* CONTROLES Y TABS */}
                <div className="flex flex-col lg:flex-row gap-4 justify-between items-stretch lg:items-center w-full">

                    {/* Selector de Pestañas */}
                    <div className="flex bg-white p-1 rounded-(--radius-btn)   shrink-0 w-full lg:w-auto border border-gray-100 ">
                        <button
                            onClick={() => setViewMode('ledger')}
                            className={`flex-1 lg:flex-none px-6 py-2.5 rounded-(--radius-btn)   text-xs font-bold transition-all ${viewMode === 'ledger' ? 'bg-black text-white shadow-md' : 'text-gray-500 hover:text-black'
                                }`}
                        >
                            Liquidaciones
                        </button>
                        <button
                            onClick={() => setViewMode('directory')}
                            className={`flex-1 lg:flex-none px-6 py-2. rounded-(--radius-btn)   text-xs font-bold transition-all ${viewMode === 'directory' ? 'bg-black text-white shadow-md' : 'text-gray-500 hover:text-black'
                                }`}
                        >
                            Directorio ({affiliates.length})
                        </button>
                    </div>

                    <div className="relative group w-full lg:w-80 shrink-0">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 transition-colors" size={16} />
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder={viewMode === 'ledger' ? "Buscar comisión u orden..." : "Buscar promotor o código..."}
                            className="w-full bg-white border border-gray-100 focus:border-black focus:shadow-subtle rounded-xl pl-9 pr-4 py-2.5 text-sm font-medium outline-none transition-all"
                        />
                    </div>
                </div>

                {/* ÁREA DE TABLAS (RESPONSIVE HYBRID PATTERN) */}
                {loading ? (
                    <div className="text-center py-20"><Loader2 className="animate-spin text-gray-300 mx-auto" size={32} /></div>
                ) : (
                    <div className="bg-white rounded-2xl overflow-hidden w-full border border-gray-100">
                        
                        {/* ========================================================= */}
                        {/* TABLA 1: LIQUIDACIONES (Deudas y Pagos) */}
                        {/* ========================================================= */}
                        {viewMode === 'ledger' && (
                            <>
                                {/* VISTA DESKTOP (Tabla Clásica) */}
                                <div className="hidden md:block overflow-x-auto w-full">
                                    <table className="w-full text-left text-sm whitespace-nowrap">
                                        <thead className="bg-gray-50 border-b border-gray-100 text-[10px] uppercase tracking-widest text-gray-500">
                                            <tr>
                                                <th className="px-6 py-4 font-bold">Promotor</th>
                                                <th className="px-6 py-4 font-bold">Orden Vínculada</th>
                                                <th className="px-6 py-4 font-bold">Comisión</th>
                                                <th className="px-6 py-4 font-bold">Estado</th>
                                                <th className="px-6 py-4 font-bold text-right">Acción</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {filteredCommissions.length === 0 ? (
                                                <tr><td colSpan={5} className="py-12 text-center text-gray-400 font-bold text-sm">No hay comisiones registradas.</td></tr>
                                            ) : (
                                                filteredCommissions.map(comm => (
                                                    <tr key={comm.id} className="hover:bg-gray-50 transition-colors group">
                                                        <td className="px-6 py-4">
                                                            <p className="font-bold text-gray-900 truncate block">{comm.affiliates.name}</p>
                                                            <span className="inline-block mt-1 text-[10px] font-mono font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md">
                                                                {comm.affiliates.promo_code}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <Link href="/admin/orders" className="font-black text-gray-600 hover:text-black transition-colors flex items-center gap-1 w-fit">
                                                                #{comm.orders?.order_number} <ArrowUpRight size={12} />
                                                            </Link>
                                                            <p className="text-[10px] text-gray-400 mt-1">Venta: ${comm.orders?.total_usd?.toFixed(2)}</p>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <p className="font-black text-lg text-gray-900">${Number(comm.amount_usd).toFixed(2)}</p>
                                                            <p className="text-[10px] font-mono text-gray-400 mt-0.5">{new Date(comm.created_at).toLocaleDateString()}</p>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <StatusBadge status={comm.status} />
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            {comm.status === 'pending' || comm.status === 'approved' ? (
                                                                <button 
                                                                    onClick={() => markAsPaid(comm)}
                                                                    disabled={updatingId === comm.id}
                                                                    className="bg-black text-white px-4 py-2 rounded-lg text-xs font-bold transition-all hover:bg-gray-800 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
                                                                >
                                                                    {updatingId === comm.id ? <Loader2 size={14} className="animate-spin" /> : <Wallet size={14} />} Pagar
                                                                </button>
                                                            ) : comm.status === 'paid_out' ? (
                                                                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest inline-flex items-center justify-end gap-1"><CheckCircle2 size={14}/> Liquidado</span>
                                                            ) : (
                                                                <span className="text-xs font-bold text-red-400 uppercase tracking-widest inline-flex items-center justify-end gap-1"><XCircle size={14}/> Anulado</span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                {/* VISTA MOBILE (Tarjetas Apiladas) */}
                                <div className="block md:hidden w-full divide-y divide-gray-50">
                                    {filteredCommissions.length === 0 ? (
                                        <div className="py-12 text-center text-gray-400 font-bold text-sm">No hay comisiones.</div>
                                    ) : (
                                        filteredCommissions.map(comm => (
                                            <div key={comm.id} className="p-5 flex flex-col gap-4 hover:bg-gray-50 transition-colors">
                                                {/* Fila 1: Promotor y Monto */}
                                                <div className="flex justify-between items-start gap-4">
                                                    <div className="min-w-0">
                                                        <p className="font-bold text-gray-900 truncate">{comm.affiliates.name}</p>
                                                        <span className="inline-block mt-1 text-[10px] font-mono font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md">
                                                            {comm.affiliates.promo_code}
                                                        </span>
                                                    </div>
                                                    <div className="text-right shrink-0">
                                                        <p className="font-black text-lg text-gray-900">${Number(comm.amount_usd).toFixed(2)}</p>
                                                        <p className="text-[10px] font-mono text-gray-400 mt-0.5">{new Date(comm.created_at).toLocaleDateString()}</p>
                                                    </div>
                                                </div>
                                                
                                                {/* Fila 2: Orden y Estado */}
                                                <div className="flex justify-between items-end">
                                                    <div>
                                                        <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-1">Orden #{comm.orders?.order_number}</p>
                                                        <StatusBadge status={comm.status} />
                                                    </div>
                                                    
                                                    {/* Botón de Acción Mobile */}
                                                    <div>
                                                        {comm.status === 'pending' || comm.status === 'approved' ? (
                                                            <button 
                                                                onClick={() => markAsPaid(comm)}
                                                                disabled={updatingId === comm.id}
                                                                className="bg-black text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all hover:bg-gray-800 active:scale-95 disabled:opacity-50 flex items-center gap-2 shadow-sm"
                                                            >
                                                                {updatingId === comm.id ? <Loader2 size={14} className="animate-spin" /> : <Wallet size={14} />} Pagar
                                                            </button>
                                                        ) : comm.status === 'paid_out' ? (
                                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1"><CheckCircle2 size={12}/> Liquidado</span>
                                                        ) : (
                                                            <span className="text-[10px] font-bold text-red-400 uppercase tracking-widest flex items-center gap-1"><XCircle size={12}/> Anulado</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </>
                        )}

                        {/* ========================================================= */}
                        {/* TABLA 2: DIRECTORIO (Afiliados Registrados) */}
                        {/* ========================================================= */}
                        {viewMode === 'directory' && (
                            <>
                                {/* VISTA DESKTOP (Tabla Clásica) */}
                                <div className="hidden md:block overflow-x-auto w-full">
                                    <table className="w-full text-left text-sm whitespace-nowrap">
                                        <thead className="bg-gray-50 border-b border-gray-100 text-[10px] uppercase tracking-widest text-gray-500">
                                            <tr>
                                                <th className="px-6 py-4 font-bold">Promotor</th>
                                                <th className="px-6 py-4 font-bold">Contacto</th>
                                                <th className="px-6 py-4 font-bold">Ventas Exitosas</th>
                                                <th className="px-6 py-4 font-bold">Registro</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {filteredAffiliates.length === 0 ? (
                                                <tr><td colSpan={4} className="py-12 text-center text-gray-400 font-bold text-sm">No hay promotores registrados.</td></tr>
                                            ) : (
                                                filteredAffiliates.map(aff => {
                                                    const successfulSales = aff.commissions?.filter(c => c.status !== 'pending').length || 0;
                                                    return (
                                                        <tr key={aff.id} className="hover:bg-gray-50 transition-colors group">
                                                            <td className="px-6 py-4">
                                                                <p className="font-bold text-gray-900 truncate block">{aff.name}</p>
                                                                <span className="inline-block mt-1 text-[10px] font-mono font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md">
                                                                    {aff.promo_code}
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                <button 
                                                                    onClick={() => copyToClipboard(aff.phone, aff.id)} 
                                                                    className="flex items-center gap-1.5 w-fit text-gray-600 hover:text-black transition-colors bg-gray-50 hover:bg-gray-100 px-2.5 py-1.5 rounded-md border border-gray-100"
                                                                >
                                                                    {copiedPhone === aff.id ? <Check size={14} className="text-green-500"/> : <Smartphone size={14} />}
                                                                    <span className="text-xs font-mono font-bold">{aff.phone}</span>
                                                                </button>
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                <span className="font-black text-lg text-gray-900">{successfulSales}</span> 
                                                                <span className="text-[10px] text-gray-400 uppercase font-bold ml-1">Órdenes</span>
                                                            </td>
                                                            <td className="px-6 py-4 text-xs font-mono font-medium text-gray-500">
                                                                {new Date(aff.created_at).toLocaleDateString()}
                                                            </td>
                                                        </tr>
                                                    )
                                                })
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                {/* VISTA MOBILE (Tarjetas Apiladas) */}
                                <div className="block md:hidden w-full divide-y divide-gray-50">
                                    {filteredAffiliates.length === 0 ? (
                                        <div className="py-12 text-center text-gray-400 font-bold text-sm">No hay promotores.</div>
                                    ) : (
                                        filteredAffiliates.map(aff => {
                                            const successfulSales = aff.commissions?.filter(c => c.status !== 'pending').length || 0;
                                            return (
                                                <div key={aff.id} className="p-5 flex flex-col gap-4 hover:bg-gray-50 transition-colors">
                                                    {/* Fila 1: Promotor y Ventas */}
                                                    <div className="flex justify-between items-start gap-4">
                                                        <div className="min-w-0">
                                                            <p className="font-bold text-gray-900 truncate">{aff.name}</p>
                                                            <span className="inline-block mt-1 text-[10px] font-mono font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md">
                                                                {aff.promo_code}
                                                            </span>
                                                        </div>
                                                        <div className="text-right shrink-0">
                                                            <span className="font-black text-xl text-gray-900 block leading-none">{successfulSales}</span> 
                                                            <span className="text-[10px] text-gray-400 uppercase font-bold mt-1 block">Ventas</span>
                                                        </div>
                                                    </div>
                                                    
                                                    {/* Fila 2: Contacto y Fecha */}
                                                    <div className="flex justify-between items-center">
                                                        <button 
                                                            onClick={() => copyToClipboard(aff.phone, aff.id)} 
                                                            className="flex items-center gap-1.5 text-gray-600 active:scale-95 transition-all bg-gray-50 px-3 py-2 rounded-lg border border-gray-100 shadow-sm"
                                                        >
                                                            {copiedPhone === aff.id ? <Check size={14} className="text-green-500"/> : <Smartphone size={14} />}
                                                            <span className="text-xs font-mono font-bold">{aff.phone}</span>
                                                        </button>
                                                        <p className="text-[10px] font-mono font-medium text-gray-400">
                                                            {new Date(aff.created_at).toLocaleDateString()}
                                                        </p>
                                                    </div>
                                                </div>
                                            )
                                        })
                                    )}
                                </div>
                            </>
                        )}
                    
       {/* Cierre del viewMode directory y ledger */}
                    </div>
                )}
            </div>

            {/* Ocultar barra de scroll en navegadores webkit */}
            <style jsx global>{`
                .no-scrollbar::-webkit-scrollbar { display: none; } 
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </div>
    )
}