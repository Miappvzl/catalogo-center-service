'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { ArrowLeft, Search, CheckCircle2, Clock, Truck, XCircle, Package, MessageCircle, DollarSign, MapPin, Loader2, Copy, Check, ArrowUpRight, FileText, Link as LinkIcon } from 'lucide-react'
import Link from 'next/link'
import { getSupabase } from '@/lib/supabase-client'
import Swal from 'sweetalert2'
import { AnimatePresence, motion } from 'framer-motion'
import Image from 'next/image'
import { getOptimizedUrl } from '@/utils/cdn'

// --- TIPOS ESTRICTOS ---
interface OrderItem {
    id: string
    product_name: string
    variant_info: string | null
    quantity: number
}

interface Order {
    id: string
    order_number: number
    created_at: string
    status: 'quote' | 'pending' | 'paid' | 'shipped' | 'completed' | 'cancelled' | string
    customer_name: string
    customer_phone: string | null
    total_usd: number
    total_bs: number | null
    exchange_rate: number | null
    payment_method: string
    shipping_method: string
    delivery_info: string | null
    tracking_number?: string | null
    receipt_url?: string | null
    split_payments?: any[] | null
    shipping_cost?: number
    discount_amount?: number
    order_items: OrderItem[]
    is_quote?: boolean;
    source?: string;
    currency_type?: string; 
}

const StatusBadge = ({ status }: { status: string }) => {
    const styles: Record<string, string> = {
        quote: 'bg-[#232325] text-white', 
        pending: 'bg-yellow-50 text-yellow-700',
        paid: 'bg-emerald-50 text-emerald-700',
        shipped: 'bg-blue-50 text-blue-700',
        completed: 'bg-gray-100 text-gray-600',
        cancelled: 'bg-red-50 text-red-700'
    }

    const labels: Record<string, string> = {
        quote: 'Cotización',
        pending: 'Pendiente',
        paid: 'Pagado',
        shipped: 'Enviado',
        completed: 'Entregado',
        cancelled: 'Cancelado'
    }

    const Icon = status === 'quote' ? FileText : status === 'pending' ? Clock : status === 'paid' ? DollarSign : status === 'shipped' ? Truck : status === 'cancelled' ? XCircle : CheckCircle2

    return (
        <span className={`flex items-center justify-center gap-1.5 px-2.5 py-1 rounded-(--radius-badge) text-[10px] font-bold uppercase tracking-wide shrink-0 ${styles[status] || styles.pending}`}>
            <Icon size={12} strokeWidth={3} />
            {labels[status] || status}
        </span>
    )
}

const getBsAmount = (order: Partial<Order>) => {
    if (order.total_bs && Number(order.total_bs) > 0) return Number(order.total_bs)
    return Number(order.total_usd || 0) * Number(order.exchange_rate || 0)
}

export default function OrdersPage() {
    const supabase = getSupabase()

    const [loading, setLoading] = useState(true)
    const [loadingMore, setLoadingMore] = useState(false)
    const [orders, setOrders] = useState<Order[]>([])
    const [page, setPage] = useState(0)
    const [hasMore, setHasMore] = useState(true)
    const ITEMS_PER_PAGE = 20

    const [search, setSearch] = useState('')
    const [filterStatus, setFilterStatus] = useState('all')
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
    const [isDrawerOpen, setIsDrawerOpen] = useState(false)
    const [updatingId, setUpdatingId] = useState<string | null>(null)

    const [trackingInput, setTrackingInput] = useState('')
    const [copiedAddress, setCopiedAddress] = useState(false)
    const [copiedQuote, setCopiedQuote] = useState<string | null>(null) 

    // 🚀 ESTADOS DE CONCILIACIÓN (Con memoria del estado destino)
    const [reconcileModal, setReconcileModal] = useState({ isOpen: false, orderId: '', method: 'Pago Móvil', reference: '', targetStatus: 'paid' })

    const [kpiStats, setKpiStats] = useState({ total: 0, pending: 0, salesTodayUSD: 0, salesTodayBs: 0 })

    const [storeId, setStoreId] = useState<string | null>(null)
    const [storeSlug, setStoreSlug] = useState<string | null>(null) 

    useEffect(() => {
        const initStore = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                const { data: store } = await supabase.from('stores').select('id, slug').eq('user_id', user.id).single()
                if (store) {
                    setStoreId(store.id)
                    setStoreSlug(store.slug)
                }
            }
        }
        initStore()
    }, [supabase])

    const getQuoteLink = (orderId: string) => {
        if (!storeSlug) return ''
        const host = window.location.host.replace('www.', '')
        return `${window.location.protocol}//${storeSlug}.${host}/quote/${orderId}`
    }

    const handleCopyQuote = (e: React.MouseEvent, orderId: string) => {
        e.stopPropagation() 
        const link = getQuoteLink(orderId)
        navigator.clipboard.writeText(link)
        setCopiedQuote(orderId)
        setTimeout(() => setCopiedQuote(null), 2000)
        Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Enlace copiado', showConfirmButton: false, timer: 1500, customClass: { popup: 'rounded-xl text-sm font-bold bg-black text-white' } })
    }

    const fetchKPIs = useCallback(async () => {
        if (!storeId) return

        const today = new Date().toISOString().split('T')[0]
        const { data: allOrders } = await supabase.from('orders').select('id, status').eq('store_id', storeId)
        const { data: todayOrders } = await supabase
            .from('orders').select('status, total_usd, total_bs, exchange_rate').eq('store_id', storeId)
            .gte('created_at', `${today}T00:00:00Z`).neq('status', 'cancelled').neq('status', 'quote') 

        if (allOrders && todayOrders) {
            setKpiStats({
                total: allOrders.length,
                pending: allOrders.filter((o: any) => o.status === 'pending').length,
                salesTodayUSD: todayOrders.reduce((acc: number, o: any) => acc + Number(o.total_usd || 0), 0),
                salesTodayBs: todayOrders.reduce((acc: number, o: any) => acc + getBsAmount(o), 0)
            })
        }
    }, [supabase, storeId])

    const fetchOrders = useCallback(async (pageNumber = 0, isRefresh = false) => {
        if (!storeId) return
        if (isRefresh) { setLoading(true); setPage(0); }
        else setLoadingMore(true)

        const from = pageNumber * ITEMS_PER_PAGE
        const to = from + ITEMS_PER_PAGE - 1

        try {
            const { data, error, count } = await supabase.from('orders')
                .select(`*, order_items (*)`, { count: 'exact' }).eq('store_id', storeId).order('created_at', { ascending: false }).range(from, to)

            if (error) throw error
            const formattedData = data as Order[] || []

            if (isRefresh) setOrders(formattedData)
            else setOrders(prev => [...prev, ...formattedData])
            setHasMore(count ? from + formattedData.length < count : false)
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
            setLoadingMore(false)
        }
    }, [supabase, storeId])

    useEffect(() => {
        if (storeId) { fetchOrders(0, true); fetchKPIs(); }
    }, [fetchOrders, fetchKPIs, storeId])

    useEffect(() => {
        if (!storeId) return
        const channel = supabase.channel(`realtime-orders-${storeId}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders', filter: `store_id=eq.${storeId}` }, async (payload: any) => {
                const { data: newOrder } = await supabase.from('orders').select('*, order_items(*)').eq('id', payload.new.id).single()
                if (newOrder) {
                    const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 3000, customClass: { popup: 'bg-black text-white rounded-xl' } })
                    Toast.fire({ icon: 'info', title: `¡Nuevo pedido de ${newOrder.customer_name}!` })
                    setOrders(prev => [newOrder as Order, ...prev])
                    fetchKPIs()
                }
            })
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `store_id=eq.${storeId}` }, (payload: any) => {
                setOrders(prev => prev.map(o => o.id === payload.new.id ? { ...o, ...payload.new } : o))
                if (selectedOrder?.id === payload.new.id) setSelectedOrder(prev => prev ? { ...prev, ...payload.new } : null)
                fetchKPIs()
            }).subscribe()

        return () => { supabase.removeChannel(channel) }
    }, [supabase, fetchKPIs, selectedOrder, storeId])

   // 🚀 1. EL INTERCEPTOR BLINDADO (Ataca Cotizaciones y Pendientes)
    const handleStatusClick = (orderId: string, status: string) => {
        // Regla de Negocio: Si la orden actual es 'quote' o 'pending', 
        // y se intenta mover a un estado de éxito ('paid' o 'shipped'), EXIGE conciliación.
        const needsReconciliation = 
            (selectedOrder?.status === 'quote' || selectedOrder?.status === 'pending') && 
            (status === 'paid' || status === 'shipped');

        if (needsReconciliation) {
            setReconcileModal({ isOpen: true, orderId, method: 'Pago Móvil', reference: '', targetStatus: status })
        } else {
            // Transiciones libres: pasar a cancelado, pasar a pendiente, o de pagado a enviado
            updateStatus(orderId, status)
        }
    }
    const updateStatus = async (orderId: string, newStatus: string) => {
        setUpdatingId(orderId)
        const previousOrders = [...orders]
        try {
            const payload: any = { status: newStatus }
            if (newStatus === 'shipped') payload.tracking_number = trackingInput.trim() || null

            setOrders(prev => prev.map(o => o.id === orderId ? { ...o, ...payload } : o))
            if (selectedOrder?.id === orderId) setSelectedOrder(prev => prev ? { ...prev, ...payload } : null)

            const { error } = await supabase.from('orders').update(payload).eq('id', orderId)
            if (error) throw error

            Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Actualizado', showConfirmButton: false, timer: 1500, customClass: { popup: 'rounded-xl font-bold text-xs bg-black text-white' } })
            fetchKPIs()
        } catch (error) {
            setOrders(previousOrders)
            Swal.fire('Error', 'No se pudo actualizar.', 'error')
        } finally {
            setUpdatingId(null)
        }
    }

    // 🚀 3. EL MOTOR DE CONCILIACIÓN
    const processReconciliation = async () => {
        setUpdatingId(reconcileModal.orderId)
        try {
            const { data: rates } = await supabase.from('app_config').select('usd_rate, eur_rate').single()
            const targetOrder = orders.find(o => o.id === reconcileModal.orderId)
            
            const activeRate = targetOrder?.currency_type === 'eur' ? rates?.eur_rate : rates?.usd_rate
            const totalBs = Number(targetOrder?.total_usd || 0) * (activeRate || 0)

            const payload: any = { 
                status: reconcileModal.targetStatus, // 🚀 AHORA RESPETA SI ES 'paid' o 'shipped'
                payment_method: reconcileModal.method,
                delivery_info: targetOrder?.delivery_info + (reconcileModal.reference ? ` | Ref: ${reconcileModal.reference}` : ''),
            }

            // Si no tenía tasa (era Presupuesto), la congelamos en este instante
            if (!targetOrder?.exchange_rate) {
                payload.exchange_rate = activeRate
                payload.total_bs = totalBs
            }
            
            setOrders(prev => prev.map(o => o.id === reconcileModal.orderId ? { ...o, ...payload } : o))
            if (selectedOrder?.id === reconcileModal.orderId) setSelectedOrder(prev => prev ? { ...prev, ...payload } : null)

            const { error } = await supabase.from('orders').update(payload).eq('id', reconcileModal.orderId)
            if (error) throw error

            Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Pago Conciliado', showConfirmButton: false, timer: 2000, customClass: { popup: 'rounded-xl bg-black text-white' } })
            fetchKPIs()
        } catch(e) {
            Swal.fire('Error', 'No se pudo conciliar el pago.', 'error')
        } finally {
            setUpdatingId(null)
            // 🚀 LIMPIAMOS MEMORIA COMPLETA
            setReconcileModal({ isOpen: false, orderId: '', method: 'Pago Móvil', reference: '', targetStatus: 'paid' })
        }
    }

    const handleCopyAddress = (text: string) => {
        if (!text) return
        navigator.clipboard.writeText(text)
        setCopiedAddress(true)
        setTimeout(() => setCopiedAddress(false), 2000)
    }

    const openDrawer = (order: Order) => {
        setSelectedOrder(order)
        setTrackingInput(order.tracking_number || '')
        setIsDrawerOpen(true)
    }

    const filteredOrders = useMemo(() => {
        return orders.filter(order => {
            const matchesSearch = order.customer_name?.toLowerCase().includes(search.toLowerCase()) || order.order_number?.toString().includes(search)
            const matchesFilter = filterStatus === 'all' || order.status === filterStatus
            return matchesSearch && matchesFilter
        })
    }, [orders, search, filterStatus])

    return (
        <div className="min-h-screen bg-[#F6F6F6] pb-20 font-sans text-gray-900 flex flex-col">

            {/* HEADER STICKY */}
            <div className="bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-30 px-4 md:px-8 py-4 flex justify-between items-center transition-all">
                <div className="flex items-center gap-4">
                    <Link href="/admin" className="p-2 bg-transparent hover:bg-gray-50 rounded-(--radius-btn) transition-all group shrink-0">
                        <ArrowLeft size={18} className="text-gray-500 group-hover:text-black" />
                    </Link>
                    <div>
                        <h1 className="font-black text-xl tracking-tight leading-none flex items-center gap-2">Pedidos</h1>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Gestión de Ventas</p>
                    </div>
                </div>
                <button onClick={() => { fetchOrders(0, true); fetchKPIs(); }} className="p-2 hover:bg-gray-100 rounded-(--radius-btn) transition-colors active:rotate-180 duration-500 shrink-0" title="Sincronizar Forzado">
                    <Clock size={18} className="text-gray-400" />
                </button>
            </div>

            <div className="w-full max-w-[100vw] overflow-x-hidden flex-1">
                <div className="max-w-350 mx-auto px-4 md:px-8 py-8 space-y-6 md:space-y-8">

                    {/* KPI CARDS */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 w-full">
                        <div className="bg-white p-6 rounded-(--radius-card) card-interactive min-w-0 border border-transparent hover:border-gray-200">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 truncate">Pendientes</p>
                            <span className="text-2xl font-black text-yellow-600 truncate">{kpiStats.pending}</span>
                        </div>
                        <div className="bg-white p-6 rounded-(--radius-card) card-interactive flex flex-col justify-center min-w-0 border border-transparent hover:border-gray-200">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 truncate">Ventas Hoy</p>
                            <p className="text-2xl font-black text-gray-900 leading-none truncate">${kpiStats.salesTodayUSD.toFixed(2)}</p>
                            <p className="text-xs font-mono font-bold text-gray-400 mt-1 truncate">Bs {kpiStats.salesTodayBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                        </div>
                        <div className="bg-white p-6 rounded-(--radius-card) card-interactive col-span-2 md:col-span-1 min-w-0 border border-transparent hover:border-gray-200">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 truncate">Total Histórico</p>
                            <p className="text-2xl font-black text-gray-900 truncate">{kpiStats.total} <span className="text-sm text-gray-400 font-medium">Pedidos</span></p>
                        </div>
                    </div>

                    {/* FILTERS & SEARCH */}
                    <div className="flex flex-col lg:flex-row gap-4 justify-between items-stretch lg:items-center w-full">
                        <div className="flex bg-[#ffffff] p-1 rounded-(--radius-btn) shrink-0 w-full overflow-x-auto no-scrollbar lg:w-auto max-w-full">
                            {['all', 'quote', 'pending', 'paid', 'shipped'].map(status => (
                                <button
                                    key={status}
                                    onClick={() => setFilterStatus(status)}
                                    className={`shrink-0 px-4 py-2 rounded-full text-xs font-bold capitalize transition-all whitespace-nowrap ${filterStatus === status
                                        ? 'bg-[#181818] text-[#f6f6f6] shadow-subtle border border-transparent'
                                        : 'text-gray-500 hover:text-gray-900 border border-transparent hover:bg-gray-100'
                                        }`}
                                >
                                    {status === 'all' ? 'Todos' : status === 'quote' ? 'Cotizaciones' : status === 'pending' ? 'Pendientes' : status === 'paid' ? 'Pagados' : 'Enviados'}
                                </button>
                            ))}
                        </div>

                        <div className="relative group w-full lg:w-80 shrink-0">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-black transition-colors" size={16} />
                            <input
                                value={search} onChange={(e) => setSearch(e.target.value)}
                                placeholder="Buscar pedido o cliente..."
                                className="w-full bg-white border border-transparent focus:border-black focus:shadow-subtle rounded-(--radius-btn) pl-9 pr-4 py-2.5 text-sm font-medium outline-none transition-all"
                            />
                        </div>
                    </div>

                    {/* LISTA Y TABLA */}
                    {loading && orders.length === 0 ? (
                        <div className="text-center py-20"><Loader2 className="animate-spin text-gray-300 mx-auto" size={32} /></div>
                    ) : filteredOrders.length === 0 ? (
                        <div className="text-center py-20 bg-white rounded-(--radius-card) card-interactive">
                            <div className="w-16 h-16 bg-gray-50 rounded-(--radius-btn) flex items-center justify-center mx-auto mb-4 text-gray-400"><Package size={24} /></div>
                            <p className="text-gray-400 font-bold text-sm">No se encontraron pedidos.</p>
                        </div>
                    ) : (
                        <>
                            {/* VISTA MÓVIL */}
                            <div className="md:hidden space-y-3 w-full">
                                {filteredOrders.map(order => (
                                    <div key={order.id} onClick={() => openDrawer(order)} className="bg-white rounded-(--radius-card) border border-transparent hover:border-gray-200 p-4 active:bg-gray-50 transition-colors cursor-pointer w-full relative">
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="min-w-0 pr-2">
                                                <p className="text-xs font-black text-gray-900 truncate">#{order.order_number}</p>
                                                <p className="text-[10px] text-gray-400 font-mono truncate mb-1.5">{new Date(order.created_at).toLocaleDateString()}</p>
                                                
                                                {/* 🚀 MICRO-BADGES (MÓVIL) */}
                                                <div className="flex gap-1.5 flex-wrap">
                                                    {order.is_quote ? <span className="px-2 py-0.5 bg-purple-50 text-purple-700 text-[8px] font-black uppercase tracking-wider rounded-sm border border-purple-100">Cotización</span> :
                                                        order.source === 'pos' ? <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[8px] font-black uppercase tracking-wider rounded-sm border border-blue-100">POS</span> :
                                                            <span className="px-2 py-0.5 bg-gray-50 text-gray-500 text-[8px] font-black uppercase tracking-wider rounded-sm border border-gray-200">Tienda Web</span>}

                                                    {order.payment_method && (
                                                        <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[8px] font-black uppercase tracking-wider rounded-sm border border-slate-200">
                                                            {order.payment_method}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <StatusBadge status={order.status} />
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <p className="font-bold text-sm text-gray-900 truncate pr-4">{order.customer_name}</p>
                                            {order.status === 'quote' && (
                                                <button onClick={(e) => handleCopyQuote(e, order.id)} className="p-2 bg-gray-50 text-gray-600 rounded-full hover:bg-gray-200 active:scale-95 transition-all">
                                                    {copiedQuote === order.id ? <Check size={14} className="text-green-500" /> : <LinkIcon size={14} />}
                                                </button>
                                            )}
                                        </div>
                                        <div className="flex justify-between items-end mt-3 border-t border-gray-50 pt-2">
                                            <div className="text-right shrink-0 ml-auto">
                                                <p className="font-black text-base text-gray-900 leading-none flex items-center justify-end gap-1.5">
                                                    ${Number(order.total_usd).toFixed(2)}
                                                    <span className="text-[8px] text-gray-500 px-1.5 py-0.5">{order.currency_type === 'eur' ? 'EUR' : 'USD'}</span>
                                                </p>
                                                <p className="text-[10px] text-gray-400 font-mono mt-1 text-right">Bs {getBsAmount(order).toLocaleString('es-VE', { maximumFractionDigits: 2 })}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* VISTA DESKTOP (Tabla) */}
                            <div className="hidden md:block bg-white rounded-(--radius-card) overflow-hidden w-full max-w-full border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
                                <div className="overflow-x-auto w-full">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-gray-50/50 border-b border-gray-100 text-[10px] uppercase tracking-widest text-gray-500">
                                            <tr>
                                                <th className="px-6 py-4 font-bold">Pedido</th>
                                                <th className="px-6 py-4 font-bold">Fecha</th>
                                                <th className="px-6 py-4 font-bold">Cliente</th>
                                                <th className="px-6 py-4 font-bold">Estado</th>
                                                <th className="px-6 py-4 font-bold text-right">Total</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {filteredOrders.map(order => (
                                                <tr key={order.id} onClick={() => openDrawer(order)} className="hover:bg-gray-50/50 transition-colors cursor-pointer group">
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className="font-black text-gray-900 group-hover:text-black transition-colors block mb-1.5">#{order.order_number}</span>

                                                        {/* 🚀 MICRO-BADGES (DESKTOP) */}
                                                        <div className="flex gap-1.5 flex-wrap max-w-40">
                                                            {order.is_quote ? <span className="px-1.5 py-0.5 bg-purple-50 text-purple-700 text-[8px] font-black uppercase tracking-wider rounded-sm border border-purple-100">Cotización</span> :
                                                                order.source === 'pos' ? <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 text-[8px] font-black uppercase tracking-wider rounded-sm border border-blue-100">POS</span> :
                                                                    <span className="px-1.5 py-0.5 bg-gray-50 text-gray-500 text-[8px] font-black uppercase tracking-wider rounded-sm border border-gray-200">Web</span>}

                                                            {order.payment_method && (
                                                                <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 text-[8px] font-black uppercase tracking-wider rounded-sm border border-slate-200">
                                                                    {order.payment_method}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap font-mono text-gray-500 text-xs">
                                                        {new Date(order.created_at).toLocaleDateString()}
                                                    </td>
                                                    <td className="px-6 py-4 min-w-50">
                                                        <div className="flex items-center justify-between">
                                                            <span className="font-bold text-gray-900 truncate block">{order.customer_name}</span>
                                                            {order.status === 'quote' && (
                                                                <button onClick={(e) => handleCopyQuote(e, order.id)} className="opacity-0 group-hover:opacity-100 p-1.5 bg-gray-100 text-gray-600 rounded-md hover:bg-gray-200 hover:text-black transition-all" title="Copiar Enlace">
                                                                    {copiedQuote === order.id ? <Check size={14} className="text-green-500" /> : <LinkIcon size={14} />}
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <StatusBadge status={order.status} />
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-right">
                                                        <p className="font-black text-gray-900 flex items-center justify-end gap-1.5">
                                                            ${Number(order.total_usd).toFixed(2)}
                                                            <span className="text-[8px] text-gray-500 px-1.5 py-0.5 rounded-sm">{order.currency_type === 'eur' ? 'EUR' : 'USD'}</span>
                                                        </p>
                                                        <p className="text-[10px] font-mono text-gray-400 mt-1">Bs {getBsAmount(order).toLocaleString('es-VE', { maximumFractionDigits: 2 })}</p>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* BOTÓN CARGAR MÁS */}
                            {hasMore && !search && filterStatus === 'all' && (
                                <div className="flex justify-center pt-6 pb-2">
                                    <button
                                        onClick={() => { const nextPage = page + 1; setPage(nextPage); fetchOrders(nextPage); }}
                                        disabled={loadingMore}
                                        className="bg-white shadow-sm border border-gray-200 text-gray-900 font-bold text-xs uppercase tracking-widest px-8 py-3 rounded-full hover:border-black transition-all flex items-center gap-2 shrink-0"
                                    >
                                        {loadingMore ? <Loader2 size={16} className="animate-spin" /> : <ArrowLeft size={16} className="-rotate-90" />}
                                        Cargar Más
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* --- CAJÓN LATERAL (SLIDE-OVER DRAWER) --- */}
            <AnimatePresence>
                {isDrawerOpen && selectedOrder && (
                    <div className="fixed inset-0 z-100 flex justify-end">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsDrawerOpen(false)} />

                        <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="relative w-full md:w-112.5 bg-white h-full flex flex-col shadow-2xl">
                            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white shrink-0">
                                <div className="min-w-0 pr-4">
                                    <div className="flex items-center gap-3">
                                        <h2 className="text-xl font-black text-gray-900 truncate">#{selectedOrder.order_number}</h2>
                                        <StatusBadge status={selectedOrder.status} />
                                    </div>
                                    <p className="text-xs font-mono text-gray-500 mt-1.5">{new Date(selectedOrder.created_at).toLocaleString()}</p>
                                </div>
                                <button onClick={() => setIsDrawerOpen(false)} className="p-2 bg-gray-50 rounded-(--radius-btn) hover:bg-gray-100 hover:text-black text-gray-400 transition-colors shrink-0"><XCircle size={20} strokeWidth={2} /></button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 pt-0 space-y-8 no-scrollbar">

                              {/* 🚀 BLOQUE OMNICANAL DE DOCUMENTOS LEGALES Y COTIZACIONES */}
                                <div className="mt-6 p-5 bg-[#FAFAFA] border border-gray-200/60 rounded-[24px] flex flex-col gap-4 shadow-sm">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-white border border-gray-200 rounded-2xl flex items-center justify-center shrink-0 shadow-sm">
                                            {selectedOrder.status === 'pending' ? <Clock size={20} className="text-amber-500" /> : <FileText size={20} className="text-gray-900" />}
                                        </div>
                                        <div>
                                            <p className="text-xs font-black text-gray-900 uppercase tracking-widest leading-none">
                                                {selectedOrder.status === 'quote' ? 'Presupuesto Activo' : 
                                                 selectedOrder.status === 'pending' ? 'Doc. en Verificación' :
                                                 ((selectedOrder as any).document_type === 'invoice' ? 'Factura Comercial' : 'Nota de Entrega')}
                                            </p>
                                            <p className="text-xs text-gray-500 font-medium mt-1.5 leading-tight">
                                                {selectedOrder.status === 'quote' ? 'Comparte el enlace para concretar la venta.' : 
                                                 selectedOrder.status === 'pending' ? 'Concilia el pago para liberar el documento legal.' :
                                                 'Documento definitivo emitido y procesado.'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 mt-2">
                                        <button onClick={(e) => handleCopyQuote(e, selectedOrder.id)} className="flex-1 py-3 bg-white border border-gray-200 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:border-gray-300 transition-all flex items-center justify-center gap-1.5 text-gray-700 active:scale-95 shadow-sm">
                                            {copiedQuote === selectedOrder.id ? <Check size={14} className="text-green-500" /> : <Copy size={14} />} Link
                                        </button>
                                        <a href={getQuoteLink(selectedOrder.id)} target="_blank" rel="noopener noreferrer" className="flex-1 py-3 bg-gray-900 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-black transition-all flex items-center justify-center gap-1.5 shadow-md active:scale-95 border border-transparent">
                                            Ver PDF <ArrowUpRight size={14} />
                                        </a>
                                    </div>
                                </div>
                                

                                {/* CENTRO DE CONCILIACIÓN VISUAL */}
                                {selectedOrder.status !== 'quote' && (
                                    <div className="space-y-3 mt-6">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Desglose de Pagos</p>
                                        {selectedOrder.split_payments && selectedOrder.split_payments.length > 0 ? (
                                            <div className="grid grid-cols-1 gap-2.5">
                                                {selectedOrder.split_payments.map((payment: any, index: number) => (
                                                    <div key={index} className="bg-gray-50 rounded-(--radius-card) p-3 border border-gray-100 flex items-center justify-between gap-3">
                                                        <div className="flex items-center gap-3 min-w-0">
                                                            <div className="w-10 h-10 bg-white border border-gray-100 rounded-lg flex items-center justify-center shrink-0 shadow-sm overflow-hidden">
                                                                {payment.receipt_url ? (
                                                                    <Image src={getOptimizedUrl(payment.receipt_url)} alt={`Comprobante de ${payment.method}`} width={80} height={80} className="w-full h-full object-cover hover:scale-110 transition-transform duration-300" />
                                                                ) : <DollarSign size={16} className="text-gray-400" strokeWidth={2.5} />}
                                                            </div>
                                                            <div className="flex flex-col min-w-0">
                                                                <p className="font-bold text-sm text-gray-900 truncate tracking-tight">{payment.method}</p>
                                                                <p className="text-[11px] font-mono text-gray-500 uppercase">{payment.currency === 'usd' ? `$${Number(payment.amount_usd).toFixed(2)}` : `Bs ${Number(payment.amount_bs).toLocaleString('es-VE', { maximumFractionDigits: 2 })}`}</p>
                                                            </div>
                                                        </div>
                                                        {payment.receipt_url ? (
                                                            <a href={payment.receipt_url} target="_blank" rel="noopener noreferrer" className="shrink-0 p-2 bg-white text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border border-emerald-100 rounded-full transition-colors group flex items-center gap-1.5 px-3">
                                                                <ArrowUpRight size={14} /> <span className="text-[10px] font-bold uppercase tracking-wider hidden sm:block">Ver</span>
                                                            </a>
                                                        ) : <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-2 bg-gray-100 rounded-md py-1 border border-gray-200">Sin Capture</span>}
                                                    </div>
                                                ))}
                                            </div>
                                        ) : selectedOrder.receipt_url ? (
                                            <div className="bg-gray-50 rounded-(--radius-card) p-2.5 border border-gray-100 flex items-center justify-between gap-3">
                                                <div className="flex items-center gap-3 overflow-hidden">
                                                    <div className="w-12 h-12 bg-white rounded-lg overflow-hidden shrink-0 shadow-sm border border-gray-100">
                                                        <Image src={getOptimizedUrl(selectedOrder.receipt_url)} alt="Comprobante Antiguo" width={80} height={80} className="w-full h-full object-cover hover:scale-110 transition-transform duration-300" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-bold text-gray-900 truncate">{selectedOrder.payment_method}</p>
                                                        <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">Pago Único (Legacy)</p>
                                                    </div>
                                                </div>
                                                <a href={selectedOrder.receipt_url} target="_blank" rel="noopener noreferrer" className="p-2.5 bg-white text-gray-700 hover:text-black border border-gray-200 hover:bg-gray-100 rounded-full mr-2 transition-colors shrink-0 shadow-sm"><ArrowUpRight size={16} strokeWidth={2.5} /></a>
                                            </div>
                                        ) : (
                                            <div className="bg-gray-50 border border-gray-100 border-dashed rounded-xl p-4 flex flex-col items-center justify-center text-gray-400">
                                                <Clock size={20} className="mb-1 opacity-50" />
                                                <p className="text-[10px] font-bold uppercase tracking-widest text-center">Esperando o No requiere comprobante</p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className={`flex justify-between items-start pt-6 border-t border-gray-100 ${selectedOrder.status === 'quote' && 'mt-6'}`}>
                                    <div className="min-w-0 pr-4">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Cliente</p>
                                        <p className="font-bold text-lg text-gray-900 wrap-break-word">{selectedOrder.customer_name}</p>
                                        {selectedOrder.customer_phone && (
                                            <a href={`https://wa.me/${selectedOrder.customer_phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs font-bold text-green-700 hover:text-green-800 mt-1 w-fit bg-green-50 px-2.5 py-1.5 rounded-(--radius-badge) truncate transition-colors">
                                                <MessageCircle size={14} className="shrink-0" /> <span className="truncate">{selectedOrder.customer_phone}</span>
                                            </a>
                                        )}
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Total</p>
                                        <p className="font-black text-2xl text-gray-900 leading-none">${Number(selectedOrder.total_usd).toFixed(2)}</p>
                                        <p className="text-[10px] font-mono font-bold text-gray-400 mt-1">Bs {getBsAmount(selectedOrder).toLocaleString('es-VE', { maximumFractionDigits: 2 })}</p>
                                    </div>
                                </div>

                                <div className="bg-gray-50 rounded-(--radius-card) p-5 space-y-4">
                                    <div>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Dirección de Entrega</p>
                                        <div className="flex items-start gap-3 bg-white p-3 rounded-(--radius-btn) shadow-sm">
                                            <MapPin size={16} className="text-gray-400 shrink-0 mt-0.5" />
                                            <p className="text-sm font-medium text-gray-700 leading-snug flex-1 wrap-break-word">{selectedOrder.delivery_info || 'Retiro en Tienda'}</p>
                                            <button onClick={() => handleCopyAddress(selectedOrder.delivery_info || '')} disabled={!selectedOrder.delivery_info} className="p-1.5 text-gray-400 hover:text-black hover:bg-gray-50 rounded-(--radius-badge) transition-colors disabled:opacity-30 shrink-0">
                                                {copiedAddress ? <Check size={16} className="text-green-600" /> : <Copy size={16} />}
                                            </button>
                                        </div>
                                    </div>

                                    {selectedOrder.shipping_method !== 'pickup' && (
                                        <div>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Número de Guía / Tracking</p>
                                            <input type="text" value={trackingInput} onChange={(e) => setTrackingInput(e.target.value)} placeholder="Ej: MRW-123456789" className="w-full bg-white border border-transparent focus:border-gray-300 rounded-xl px-3 py-2.5 text-sm font-bold outline-none transition-all shadow-sm" />
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Artículos ({selectedOrder.order_items.length})</p>
                                    <div className="space-y-2 mb-6">
                                        {selectedOrder.order_items.map((item) => (
                                            <div key={item.id} className="flex justify-between items-center text-sm bg-gray-50 p-3 rounded-(--radius-btn) border border-transparent">
                                                <div className="min-w-0 flex-1 pr-4">
                                                    <p className="font-bold text-gray-900 truncate">{item.product_name}</p>
                                                    {item.variant_info && item.variant_info !== 'N/A' && <p className="text-xs text-gray-500 truncate">{item.variant_info}</p>}
                                                </div>
                                                <p className="font-mono font-bold text-gray-900 bg-white px-2 py-1 rounded-(--radius-badge) shrink-0 shadow-sm border border-gray-100">x{item.quantity}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="pt-6 border-t border-gray-100">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Actualizar Estado</p>
                                    <div className="flex overflow-x-auto no-scrollbar gap-2 pb-1 w-full max-w-full">
                                        {['pending', 'paid', 'shipped', 'cancelled'].map(status => (
                                            <button
                                                key={status} onClick={() => handleStatusClick(selectedOrder.id, status)} disabled={updatingId === selectedOrder.id || (selectedOrder.status === status && status !== 'shipped')}
                                                className={`shrink-0 px-5 py-2.5 rounded-full text-[11px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${selectedOrder.status === status ? 'bg-black text-white shadow-md opacity-100' : 'bg-white text-gray-500 hover:text-gray-900 border border-gray-200 hover:border-gray-400'}`}
                                            >
                                                {updatingId === selectedOrder.id && selectedOrder.status !== status ? <Loader2 size={14} className="animate-spin" /> : null}
                                                {status === 'pending' ? 'Pendiente' : status === 'paid' ? 'Pagado' : status === 'shipped' ? 'Enviado' : 'Cancelar'}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="h-12 shrink-0"></div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* 🚀 MODAL DE CONCILIACIÓN DE PAGOS */}
            <AnimatePresence>
                {reconcileModal.isOpen && (
                    <div className="fixed inset-0 z-200 flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setReconcileModal({ ...reconcileModal, isOpen: false })} />
                        <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative bg-white w-full max-w-sm rounded-4xl overflow-hidden shadow-2xl flex flex-col p-8">
                            <h3 className="font-black text-2xl text-gray-900 mb-1">Conciliar Pago</h3>
                            <p className="text-xs font-medium text-gray-500 mb-6">Elige cómo pagó el cliente para cuadrar la caja.</p>

                            <div className="space-y-5">
                                <div>
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3 block">Método de Pago</label>
                                    <div className="flex flex-wrap gap-2">
                                        {['Pago Móvil', 'Zelle', 'Efectivo', 'Binance', 'Zinli', 'Otro'].map(pm => (
                                            <button
                                                key={pm} onClick={() => setReconcileModal({ ...reconcileModal, method: pm })}
                                                className={`px-4 py-2.5 rounded-full text-xs font-bold transition-all border ${reconcileModal.method === pm ? 'bg-black text-white border-black' : 'bg-gray-50 text-gray-600 border-transparent hover:border-gray-200'}`}
                                            >
                                                {pm}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2 block">Referencia (Opcional)</label>
                                    <input
                                        type="text" value={reconcileModal.reference} onChange={(e) => setReconcileModal({ ...reconcileModal, reference: e.target.value })}
                                        placeholder="Ej: 123456"
                                        className="w-full bg-gray-50 border border-transparent focus:bg-white focus:border-gray-300 rounded-xl px-4 py-3.5 text-sm font-bold text-gray-900 outline-none transition-all"
                                    />
                                </div>

                                <div className="flex gap-3 mt-4 pt-2">
                                    <button onClick={() => setReconcileModal({ ...reconcileModal, isOpen: false })} className="flex-1 bg-gray-100 text-gray-700 font-bold uppercase tracking-widest text-[10px] py-4 rounded-[20px] hover:bg-gray-200 transition-all">Cancelar</button>
                                    <button onClick={processReconciliation} disabled={updatingId === reconcileModal.orderId} className="flex-1 bg-black text-white font-black uppercase tracking-widest text-[10px] py-4 rounded-[20px] shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                                        {updatingId === reconcileModal.orderId ? <Loader2 size={16} className="animate-spin" /> : <DollarSign size={16} />} Marcar Pagado
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    )
}