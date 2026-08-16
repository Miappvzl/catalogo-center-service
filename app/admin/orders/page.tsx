'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { ArrowLeft, Search, CheckCircle2, Clock, Truck, XCircle, Package, MessageCircle, DollarSign, MapPin, Loader2, Copy, Check, ArrowUpRight, FileText, Gift } from 'lucide-react'
import Link from 'next/link'
import { getSupabase } from '@/lib/supabase-client'
import Swal from 'sweetalert2'
import { AnimatePresence, motion } from 'framer-motion'
import Image from 'next/image'
import { getOptimizedUrl } from '@/utils/cdn'
import IssueVirtualChangeModal from '@/components/admin/IssueVirtualChangeModal'
import WhatsAppIcon from '@/components/icons/WhatsAppIcon'

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
    subtotal_usd?: number;
    tax_amount_usd?: number;
    iva_retention_pct?: number;
    iva_retention_usd?: number;
    liquid_amount_usd?: number;
    customer_id?: string | null;
    vuelto_processed?: boolean;
}

// 🚀 CLEANLOOK: Badges con colores Muted y bordes ultra-finos
const StatusBadge = ({ status }: { status: string }) => {
    const styles: Record<string, string> = {
        quote: 'bg-purple-50 text-purple-700 border-purple-200/50',
        pending: 'bg-amber-50 text-amber-700 border-amber-200/50',
        paid: 'bg-emerald-50 text-emerald-700 border-emerald-200/50',
        shipped: 'bg-blue-50 text-blue-700 border-blue-200/50',
        completed: 'bg-neutral-100 text-neutral-600 border-neutral-200/60',
        cancelled: 'bg-rose-50 text-rose-700 border-rose-200/50'
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
        <span className={`flex items-center justify-center gap-1.5 px-2 py-0.5 rounded border text-[9px] font-bold uppercase tracking-wider shrink-0 ${styles[status] || styles.pending}`}>
            <Icon size={10} strokeWidth={3} />
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

    const [reconcileModal, setReconcileModal] = useState({ isOpen: false, orderId: '', method: 'Pago Móvil', reference: '', targetStatus: 'paid', retentionPct: 0 })
    const [creditModalOpen, setCreditModalOpen] = useState(false)

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
        Swal.fire({ 
            toast: true, position: 'top-end', icon: 'success', title: 'Enlace copiado', 
            showConfirmButton: false, timer: 1500, 
            customClass: { popup: 'rounded-xl text-xs font-semibold bg-neutral-900 text-white border border-neutral-800' } 
        })
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
                    const Toast = Swal.mixin({ 
                        toast: true, position: 'top-end', showConfirmButton: false, timer: 3000, 
                        customClass: { popup: 'bg-neutral-900 text-white rounded-xl text-xs font-semibold border border-neutral-800' } 
                    })
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

    const handleStatusClick = (orderId: string, status: string) => {
        const needsReconciliation =
            (selectedOrder?.status === 'quote' || selectedOrder?.status === 'pending') &&
            (status === 'paid' || status === 'shipped');

        if (needsReconciliation) {
            setReconcileModal({ isOpen: true, orderId, method: 'Pago Móvil', reference: '', targetStatus: status, retentionPct: 0 })
        } else {
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

            Swal.fire({ 
                toast: true, position: 'top-end', icon: 'success', title: 'Actualizado', 
                showConfirmButton: false, timer: 1500, 
                customClass: { popup: 'rounded-xl font-semibold text-xs bg-neutral-900 text-white border border-neutral-800' } 
            })
            fetchKPIs()
        } catch (error) {
            setOrders(previousOrders)
            Swal.fire({ title: 'Error', text: 'No se pudo actualizar.', icon: 'error', confirmButtonColor: '#171717', customClass: { popup: 'rounded-xl font-sans text-xs' } })
        } finally {
            setUpdatingId(null)
        }
    }

    const processReconciliation = async () => {
        setUpdatingId(reconcileModal.orderId)
        try {
            const { data: rates } = await supabase.from('app_config').select('usd_rate, eur_rate').single()
            const targetOrder = orders.find(o => o.id === reconcileModal.orderId)

            const activeRate = targetOrder?.currency_type === 'eur' ? rates?.eur_rate : rates?.usd_rate
            const totalBs = Number(targetOrder?.total_usd || 0) * (activeRate || 0)

            const taxAmount = Number(targetOrder?.tax_amount_usd || 0)
            const retentionAmountUsd = taxAmount * (reconcileModal.retentionPct / 100)
            const liquidAmountUsd = Number(targetOrder?.total_usd || 0) - retentionAmountUsd

            const payload: any = {
                status: reconcileModal.targetStatus,
                payment_method: reconcileModal.method,
                delivery_info: (targetOrder?.delivery_info || '') + (reconcileModal.reference ? ` | Ref: ${reconcileModal.reference}` : ''),
                iva_retention_pct: reconcileModal.retentionPct,
                iva_retention_usd: Number(retentionAmountUsd.toFixed(2)),
                liquid_amount_usd: Number(liquidAmountUsd.toFixed(2))
            }

            if (!targetOrder?.exchange_rate) {
                payload.exchange_rate = activeRate
                payload.total_bs = totalBs
            }

            setOrders(prev => prev.map(o => o.id === reconcileModal.orderId ? { ...o, ...payload } : o))
            if (selectedOrder?.id === reconcileModal.orderId) setSelectedOrder(prev => prev ? { ...prev, ...payload } : null)

            const { error } = await supabase.from('orders').update(payload).eq('id', reconcileModal.orderId)
            if (error) throw error

            Swal.fire({ 
                toast: true, position: 'top-end', icon: 'success', title: 'Pago Conciliado', 
                showConfirmButton: false, timer: 2000, 
                customClass: { popup: 'rounded-xl bg-neutral-900 text-white text-xs font-semibold border border-neutral-800' } 
            })
            fetchKPIs()
        } catch (e) {
            console.error(e)
            Swal.fire({ title: 'Error', text: 'No se pudo conciliar el pago.', icon: 'error', confirmButtonColor: '#171717', customClass: { popup: 'rounded-xl font-sans text-xs' } })
        } finally {
            setUpdatingId(null)
            setReconcileModal({ isOpen: false, orderId: '', method: 'Pago Móvil', reference: '', targetStatus: 'paid', retentionPct: 0 })
        }
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

    const vueltoMatch = useMemo(() => {
        if (!selectedOrder) return null;
        return selectedOrder.delivery_info?.match(/⚠️ VUELTO VIRTUAL: \$([0-9.]+) \(Entregó: \$([0-9.]+) \| Correo: ([^)]+)\)/) || null;
    }, [selectedOrder]);

    return (
        <div className="min-h-screen bg-[#F6F6F6] pb-20 font-sans text-neutral-900 flex flex-col antialiased selection:bg-neutral-900 selection:text-white">
            
            {/* 🚀 HEADER CLEANLOOK */}
            <div className="bg-[#F6F6F6]/95 backdrop-blur-md border-b border-neutral-200/50 sticky top-0 z-30 px-4 md:px-8 py-4 flex justify-between items-center transition-all">
                <div className="flex items-center gap-3">
                    <Link href="/admin" className="w-9 h-9 bg-white rounded-lg flex items-center justify-center border border-neutral-200/50 hover:border-neutral-300 transition-colors shrink-0 shadow-xs">
                        <ArrowLeft size={16} className="text-neutral-500 hover:text-neutral-900" />
                    </Link>
                    <div>
                        <h1 className="font-bold text-base tracking-tight leading-none text-neutral-900">Gestión de Pedidos</h1>
                        <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mt-1 font-mono">Control Operativo</p>
                    </div>
                </div>
                <button onClick={() => { fetchOrders(0, true); fetchKPIs(); }} className="w-9 h-9 bg-white rounded-lg flex items-center justify-center border border-neutral-200/50 hover:border-neutral-300 hover:text-neutral-900 transition-all active:rotate-180 duration-500 shrink-0 shadow-xs" title="Sincronizar Forzado">
                    <Clock size={15} className="text-neutral-500" />
                </button>
            </div>

            <div className="w-full max-w-[100vw] overflow-x-hidden flex-1">
                <div className="max-w-6xl mx-auto px-4 md:px-8 py-6 md:py-8 space-y-6 md:space-y-8">
                    
                    {/* 🚀 KPI CARDS (Bento Grid Style) */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 w-full">
                        <div className="bg-white p-5 rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.01)] min-w-0 flex flex-col justify-between">
                            <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-2 truncate">Pendientes</p>
                            <span className="text-2xl md:text-3xl font-bold text-amber-600 font-mono tabular-nums truncate">{kpiStats.pending}</span>
                        </div>
                        <div className="bg-white p-5 rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.01)] min-w-0 flex flex-col justify-between">
                            <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-2 truncate">Ventas Hoy</p>
                            <p className="text-2xl md:text-3xl font-bold text-neutral-900 leading-none font-mono tabular-nums truncate">${kpiStats.salesTodayUSD.toFixed(2)}</p>
                            <p className="text-[10px] font-mono font-semibold text-neutral-400 mt-1.5 truncate">Bs {kpiStats.salesTodayBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                        </div>
                        <div className="bg-white p-5 rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.01)] min-w-0 flex flex-col justify-between col-span-2 md:col-span-1">
                            <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-2 truncate">Total Histórico</p>
                            <div className="flex items-baseline gap-1.5">
                                <p className="text-2xl md:text-3xl font-bold text-neutral-900 font-mono tabular-nums truncate">{kpiStats.total}</p>
                                <span className="text-[10px] text-neutral-400 font-semibold uppercase tracking-wider">Pedidos</span>
                            </div>
                        </div>
                    </div>

                    {/* 🚀 FILTROS Y BÚSQUEDA */}
                    <div className="flex flex-col lg:flex-row gap-4 justify-between items-stretch lg:items-center w-full">
                        
                        {/* Pill Tabs */}
                        <div className="flex bg-neutral-100/50 p-1 rounded-lg border border-neutral-200/50 shrink-0 w-full overflow-x-auto no-scrollbar lg:w-auto max-w-full">
                            {['all', 'quote', 'pending', 'paid', 'shipped'].map(status => (
                                <button
                                    key={status}
                                    onClick={() => setFilterStatus(status)}
                                    className={`shrink-0 px-3.5 py-1.5 rounded-md text-[11px] font-semibold capitalize transition-all whitespace-nowrap ${filterStatus === status
                                        ? 'bg-white text-neutral-900 shadow-xs border border-neutral-200/50'
                                        : 'text-neutral-500 hover:text-neutral-900 border border-transparent hover:bg-neutral-50/50'
                                        }`}
                                >
                                    {status === 'all' ? 'Todos' : status === 'quote' ? 'Cotizaciones' : status === 'pending' ? 'Pendientes' : status === 'paid' ? 'Pagados' : 'Enviados'}
                                </button>
                            ))}
                        </div>

                        {/* Search Input */}
                        <div className="relative group w-full lg:w-80 shrink-0">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 transition-colors" size={15} />
                            <input
                                value={search} onChange={(e) => setSearch(e.target.value)}
                                placeholder="Buscar pedido o cliente..."
                                className="w-full bg-white border border-neutral-200/50 focus:border-neutral-400 rounded-xl pl-9 pr-4 py-2.5 text-xs font-medium text-neutral-900 placeholder:text-neutral-400 outline-none transition-all"
                            />
                        </div>
                    </div>
                    {loading && orders.length === 0 ? (
                        <div className="text-center py-20"><Loader2 className="animate-spin text-neutral-300 mx-auto" size={24} /></div>
                    ) : filteredOrders.length === 0 ? (
                        <div className="text-center py-20 bg-white rounded-xl border border-neutral-200/50 shadow-[0_1px_3px_rgba(0,0,0,0.01)]">
                            <div className="w-12 h-12 bg-neutral-50 border border-neutral-100 rounded-xl flex items-center justify-center mx-auto mb-3 text-neutral-300"><Package size={20} /></div>
                            <p className="text-neutral-400 font-semibold text-xs">No se encontraron pedidos.</p>
                        </div>
                    ) : (
                        <>
                            {/* 🚀 VISTA MÓVIL (Tarjetas Cleanlook) */}
                            <div className="md:hidden space-y-3 w-full">
                                {filteredOrders.map(order => (
                                    <div key={order.id} onClick={() => openDrawer(order)} className="bg-white rounded-xl border border-neutral-200/50 shadow-[0_1px_3px_rgba(0,0,0,0.01)] hover:border-neutral-300 p-4.5 active:bg-neutral-50 transition-all cursor-pointer w-full relative">
                                        
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="min-w-0 pr-2">
                                                <p className="text-xs font-bold text-neutral-900 truncate font-mono">#{order.order_number}</p>
                                                <p className="text-[10px] text-neutral-400 font-mono truncate mb-2">{new Date(order.created_at).toLocaleDateString()}</p>
                                                
                                                <div className="flex gap-1.5 flex-wrap">
                                                    {/* Etiquetas de Origen */}
                                                    {order.is_quote ? <span className="px-1.5 py-0.5 bg-purple-50 text-purple-700 border border-purple-100/40 text-[8px] font-semibold uppercase tracking-wider rounded font-mono">Cotización</span> :
                                                        order.source === 'pos' ? <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-100/40 text-[8px] font-semibold uppercase tracking-wider rounded font-mono">POS</span> :
                                                            <span className="px-1.5 py-0.5 bg-neutral-100 text-neutral-600 border border-neutral-200/40 text-[8px] font-semibold uppercase tracking-wider rounded font-mono">Web</span>}
                                                    
                                                    {order.payment_method && (
                                                        <span className="px-1.5 py-0.5 bg-neutral-50 text-neutral-500 border border-neutral-200/50 text-[8px] font-semibold uppercase tracking-wider rounded font-mono">
                                                            {order.payment_method}
                                                        </span>
                                                    )}
                                                    
                                                    {/* Etiqueta Contable de Vuelto Virtual */}
                                                    {order.delivery_info?.includes('⚠️ VUELTO VIRTUAL') && (
                                                        order.vuelto_processed ? (
                                                            <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100/40 text-[8px] font-semibold uppercase tracking-wider rounded font-mono">
                                                                Vuelto Otorgado
                                                            </span>
                                                        ) : (
                                                            <span className="px-1.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-100/40 text-[8px] font-semibold uppercase tracking-wider rounded font-mono">
                                                                Vuelto Pendiente
                                                            </span>
                                                        )
                                                    )}
                                                </div>
                                            </div>
                                            <StatusBadge status={order.status} />
                                        </div>

                                        <div className="flex items-center justify-between">
                                            <p className="font-semibold text-xs text-neutral-900 truncate pr-4">{order.customer_name}</p>
                                        </div>

                                        <div className="flex justify-between items-end mt-3 border-t border-neutral-100/60 pt-3">
                                            <div className="text-right shrink-0 ml-auto">
                                                <p className="font-bold text-base flex items-center justify-end gap-1.5 leading-none font-mono tabular-nums">
                                                    {Number(order.iva_retention_usd || 0) > 0 ? (
                                                        <span className="text-emerald-700">${Number(order.liquid_amount_usd).toFixed(2)}</span>
                                                    ) : (
                                                        <span className="text-neutral-900">${Number(order.total_usd).toFixed(2)}</span>
                                                    )}
                                                    <span className="text-[8px] text-neutral-400 px-1 py-0.5 font-sans font-semibold">{order.currency_type === 'eur' ? 'EUR' : 'USD'}</span>
                                                </p>
                                                {Number(order.iva_retention_usd || 0) > 0 && (
                                                    <p className="text-[9px] text-rose-600 font-semibold mt-1 text-right font-mono">Retenido: -${Number(order.iva_retention_usd).toFixed(2)}</p>
                                                )}
                                                <p className="text-[10px] text-neutral-400 font-mono mt-1 text-right">Bs {getBsAmount(order).toLocaleString('es-VE', { maximumFractionDigits: 2 })}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* 🚀 VISTA DESKTOP (Tabla Ejecutiva) */}
                            <div className="hidden md:block bg-white rounded-xl overflow-hidden w-full max-w-full border border-neutral-200/50 shadow-[0_1px_3px_rgba(0,0,0,0.01)]">
                                <div className="overflow-x-auto w-full">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-neutral-50/50 border-b border-neutral-200/50 text-[10px] uppercase tracking-wider text-neutral-500 font-semibold">
                                            <tr>
                                                <th className="px-6 py-3.5">Pedido</th>
                                                <th className="px-6 py-3.5">Fecha</th>
                                                <th className="px-6 py-3.5">Cliente</th>
                                                <th className="px-6 py-3.5">Estado</th>
                                                <th className="px-6 py-3.5 text-right">Total Facturado</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-neutral-100">
                                            {filteredOrders.map(order => (
                                                <tr key={order.id} onClick={() => openDrawer(order)} className="hover:bg-neutral-50/40 transition-colors cursor-pointer group">
                                                   <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className="font-bold text-xs font-mono text-neutral-900 group-hover:text-black transition-colors block mb-2">#{order.order_number}</span>
                                                        <div className="flex gap-1.5 flex-wrap max-w-40">
                                                            {order.is_quote ? <span className="px-1.5 py-0.5 bg-purple-50 text-purple-700 border border-purple-100/40 text-[8px] font-semibold uppercase tracking-wider rounded font-mono">Cotización</span> :
                                                                order.source === 'pos' ? <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-100/40 text-[8px] font-semibold uppercase tracking-wider rounded font-mono">POS</span> :
                                                                    <span className="px-1.5 py-0.5 bg-neutral-100 text-neutral-600 border border-neutral-200/40 text-[8px] font-semibold uppercase tracking-wider rounded font-mono">Web</span>}
                                                            
                                                            {order.payment_method && (
                                                                <span className="px-1.5 py-0.5 bg-neutral-50 text-neutral-500 border border-neutral-200/50 text-[8px] font-semibold uppercase tracking-wider rounded font-mono">
                                                                    {order.payment_method}
                                                                </span>
                                                            )}
                                                            
                                                            {/* Etiqueta Contable de Vuelto Virtual */}
                                                            {order.delivery_info?.includes('⚠️ VUELTO VIRTUAL') && (
                                                                order.vuelto_processed ? (
                                                                    <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100/40 text-[8px] font-semibold uppercase tracking-wider rounded font-mono">
                                                                        Vuelto Otorgado
                                                                    </span>
                                                                ) : (
                                                                    <span className="px-1.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-100/40 text-[8px] font-semibold uppercase tracking-wider rounded font-mono">
                                                                        Vuelto Pendiente
                                                                    </span>
                                                                )
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap font-mono text-neutral-500 text-[11px]">
                                                        {new Date(order.created_at).toLocaleDateString()}
                                                    </td>
                                                    <td className="px-6 py-4 min-w-50">
                                                        <div className="flex items-center justify-between">
                                                            <span className="font-semibold text-xs text-neutral-900 truncate block">{order.customer_name}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <StatusBadge status={order.status} />
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-right">
                                                        <p className="font-bold text-sm font-mono tabular-nums flex items-center justify-end gap-1.5">
                                                            {Number(order.iva_retention_usd || 0) > 0 ? (
                                                                <>
                                                                    <span className="text-neutral-300 line-through text-[10px]">${Number(order.total_usd).toFixed(2)}</span>
                                                                    <span className="text-emerald-700">${Number(order.liquid_amount_usd).toFixed(2)}</span>
                                                                </>
                                                            ) : (
                                                                <span className="text-neutral-900">${Number(order.total_usd).toFixed(2)}</span>
                                                            )}
                                                            <span className="text-[8px] text-neutral-400 px-1 py-0.5 rounded font-sans font-semibold">{order.currency_type === 'eur' ? 'EUR' : 'USD'}</span>
                                                        </p>
                                                        {Number(order.iva_retention_usd || 0) > 0 && (
                                                            <p className="text-[9px] text-rose-600 font-semibold mt-0.5 text-right font-mono">Retenido: -${Number(order.iva_retention_usd).toFixed(2)}</p>
                                                        )}
                                                        <p className="text-[10px] font-mono text-neutral-400 mt-1">Bs {getBsAmount(order).toLocaleString('es-VE', { maximumFractionDigits: 2 })}</p>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* 🚀 BOTÓN CARGAR MÁS */}
                            {hasMore && !search && filterStatus === 'all' && (
                                <div className="flex justify-center pt-6 pb-2">
                                    <button
                                        onClick={() => { const nextPage = page + 1; setPage(nextPage); fetchOrders(nextPage); }}
                                        disabled={loadingMore}
                                        className="bg-white shadow-xs border border-neutral-200/50 text-neutral-700 font-semibold text-[11px] uppercase tracking-wider px-6 py-2.5 rounded-lg hover:bg-neutral-50 hover:text-neutral-900 transition-all flex items-center gap-2 shrink-0 active:scale-95"
                                    >
                                        {loadingMore ? <Loader2 size={14} className="animate-spin" /> : <ArrowLeft size={14} className="-rotate-90" />}
                                        Cargar más pedidos
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
                    <div className="fixed inset-0 z-[100] flex justify-end">
                        {/* Backdrop Cleanlook */}
                        <motion.div 
                            initial={{ opacity: 0 }} 
                            animate={{ opacity: 1 }} 
                            exit={{ opacity: 0 }} 
                            className="absolute inset-0 bg-neutral-900/30 backdrop-blur-xs" 
                            onClick={() => setIsDrawerOpen(false)} 
                        />

                        <motion.div 
                            initial={{ x: '100%' }} 
                            animate={{ x: 0 }} 
                            exit={{ x: '100%' }} 
                            transition={{ type: 'spring', damping: 30, stiffness: 300 }} 
                            className="relative w-full md:w-[480px] bg-[#FAFAFC] h-full flex flex-col shadow-2xl border-l border-neutral-200/50"
                        >
                            {/* Header del Drawer */}
                            <div className="p-5 md:p-6 border-b border-neutral-200/50 flex justify-between items-center bg-white shrink-0">
                                <div className="min-w-0 pr-4 space-y-1">
                                    <div className="flex items-center gap-3">
                                        <h2 className="text-lg font-bold text-neutral-900 truncate font-mono tracking-tight">#{selectedOrder.order_number}</h2>
                                        <StatusBadge status={selectedOrder.status} />
                                    </div>
                                    <p className="text-[11px] font-mono text-neutral-400 font-medium">{new Date(selectedOrder.created_at).toLocaleString()}</p>
                                </div>
                                <button onClick={() => setIsDrawerOpen(false)} className="p-1.5 bg-neutral-50 rounded-full hover:bg-neutral-100 hover:text-neutral-900 text-neutral-400 transition-colors shrink-0 shadow-xs border border-neutral-200/50 active:scale-95">
                                    <XCircle size={18} strokeWidth={2} />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-5 md:p-6 space-y-6 no-scrollbar">
                                
                                {/* Tarjeta de Estado del Documento */}
                                <div className="p-4 bg-white border border-neutral-200/50 rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.01)] flex flex-col gap-4">
                                    <div className="flex items-center gap-3.5">
                                        <div className="w-10 h-10 bg-neutral-50 border border-neutral-100 rounded-lg flex items-center justify-center shrink-0">
                                            {selectedOrder.status === 'pending' ? <Clock size={18} className="text-amber-500" /> : <FileText size={18} className="text-neutral-700" />}
                                        </div>
                                        <div className="space-y-0.5">
                                            <p className="text-[10px] font-bold text-neutral-900 uppercase tracking-wider leading-none">
                                                {selectedOrder.status === 'quote' ? 'Presupuesto Activo' :
                                                    selectedOrder.status === 'pending' ? 'Doc. en Verificación' :
                                                        ((selectedOrder as any).document_type === 'invoice' ? 'Factura Comercial' : 'Nota de Entrega')}
                                            </p>
                                            <p className="text-[11px] text-neutral-500 font-medium leading-tight">
                                                {selectedOrder.status === 'quote' ? 'Comparta el enlace para concretar la venta.' :
                                                    selectedOrder.status === 'pending' ? 'Concilie el pago para liberar la orden.' :
                                                        'Documento definitivo emitido y procesado.'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 mt-1">
                                        <button onClick={(e) => handleCopyQuote(e, selectedOrder.id)} className="flex-1 py-2.5 bg-white border border-neutral-200/50 rounded-lg text-[10px] font-semibold uppercase tracking-wider hover:bg-neutral-50 transition-all flex items-center justify-center gap-1.5 text-neutral-700 active:scale-95 shadow-xs">
                                            {copiedQuote === selectedOrder.id ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />} Copiar Link
                                        </button>
                                        <a href={getQuoteLink(selectedOrder.id)} target="_blank" rel="noopener noreferrer" className="flex-1 py-2.5 bg-neutral-950 text-white rounded-lg text-[10px] font-semibold uppercase tracking-wider hover:bg-black transition-all flex items-center justify-center gap-1.5 shadow-xs active:scale-95">
                                            Ver PDF <ArrowUpRight size={14} />
                                        </a>
                                    </div>
                                </div>

                                {/* Desglose de Pagos */}
                                {selectedOrder.status !== 'quote' && (
                                    <div className="space-y-2.5">
                                        <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-1">Desglose de Pagos</p>
                                        {selectedOrder.split_payments && selectedOrder.split_payments.length > 0 ? (
                                            <div className="grid grid-cols-1 gap-2">
                                                {selectedOrder.split_payments.map((payment: any, index: number) => (
                                                    <div key={index} className="bg-white rounded-lg p-2.5 border border-neutral-200/50 shadow-[0_1px_2px_rgba(0,0,0,0.01)] flex items-center justify-between gap-3">
                                                        <div className="flex items-center gap-3 min-w-0">
                                                            <div className="w-9 h-9 bg-neutral-50 border border-neutral-100 rounded-md flex items-center justify-center shrink-0 overflow-hidden">
                                                                {payment.receipt_url ? (
                                                                    <Image src={getOptimizedUrl(payment.receipt_url)} alt={`Comprobante`} width={80} height={80} className="w-full h-full object-cover hover:scale-110 transition-transform duration-300" />
                                                                ) : <DollarSign size={14} className="text-neutral-400" strokeWidth={2.5} />}
                                                            </div>
                                                            <div className="flex flex-col min-w-0 space-y-0.5">
                                                                <p className="font-semibold text-xs text-neutral-900 truncate tracking-tight">{payment.method}</p>
                                                                <p className="text-[10px] font-mono text-neutral-500 uppercase">{payment.currency === 'usd' ? `$${Number(payment.amount_usd).toFixed(2)}` : `Bs ${Number(payment.amount_bs).toLocaleString('es-VE', { maximumFractionDigits: 2 })}`}</p>
                                                            </div>
                                                        </div>
                                                        {payment.receipt_url && payment.receipt_url.startsWith('http') ? (
                                                            <a href={payment.receipt_url} target="_blank" rel="noopener noreferrer" className="shrink-0 p-1.5 bg-white text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border border-emerald-100/50 rounded-md transition-colors group flex items-center gap-1 px-2.5 shadow-xs">
                                                                <ArrowUpRight size={12} /> <span className="text-[9px] font-bold uppercase tracking-wider hidden sm:block">Ver</span>
                                                            </a>
                                                        ) : payment.receipt_url === 'Vuelto Virtual (Sistema)' ? (
                                                            <span className="shrink-0 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100/40 rounded text-[8px] font-bold uppercase tracking-wider flex items-center gap-1">
                                                                <Check size={10} /> Validado
                                                            </span>
                                                        ) : <span className="text-[9px] font-semibold text-neutral-400 uppercase tracking-wider px-2 bg-neutral-50 rounded py-1 border border-neutral-200/50">Sin Capture</span>}
                                                    </div>
                                                ))}
                                            </div>
                                        ) : selectedOrder.receipt_url ? (
                                            <div className="bg-white rounded-lg p-2.5 border border-neutral-200/50 shadow-[0_1px_2px_rgba(0,0,0,0.01)] flex items-center justify-between gap-3">
                                                <div className="flex items-center gap-3 overflow-hidden">
                                                    <div className="w-10 h-10 bg-neutral-50 rounded-md overflow-hidden shrink-0 border border-neutral-100">
                                                        <Image src={getOptimizedUrl(selectedOrder.receipt_url)} alt="Comprobante" width={80} height={80} className="w-full h-full object-cover hover:scale-110 transition-transform duration-300" />
                                                    </div>
                                                    <div className="min-w-0 space-y-0.5">
                                                        <p className="text-xs font-semibold text-neutral-900 truncate">{selectedOrder.payment_method}</p>
                                                        <p className="text-[9px] font-medium text-neutral-400 uppercase tracking-wider">Pago Único</p>
                                                    </div>
                                                </div>
                                                <a href={selectedOrder.receipt_url} target="_blank" rel="noopener noreferrer" className="p-2 bg-white text-neutral-600 hover:text-neutral-900 border border-neutral-200/50 hover:bg-neutral-50 rounded-md mr-1 transition-colors shrink-0 shadow-xs"><ArrowUpRight size={14} strokeWidth={2.5} /></a>
                                            </div>
                                        ) : (
                                            <div className="bg-neutral-50/50 border border-neutral-200/50 border-dashed rounded-lg p-4 flex flex-col items-center justify-center text-neutral-400">
                                                <Clock size={16} className="mb-1.5 opacity-50" />
                                                <p className="text-[9px] font-semibold uppercase tracking-wider text-center">Sin comprobante en BD</p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Resumen Financiero y Cliente */}
                                <div className={`flex justify-between items-start pt-5 border-t border-neutral-200/50 ${selectedOrder.status === 'quote' && 'mt-5'}`}>
                                    <div className="min-w-0 pr-4 space-y-1">
                                        <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">Cliente</p>
                                        <p className="font-bold text-sm text-neutral-900 wrap-break-word">{selectedOrder.customer_name}</p>
                                        {selectedOrder.customer_phone && (
                                            <a href={`https://wa.me/${selectedOrder.customer_phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" 
                                              className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 mt-1.5 w-fit bg-emerald-50 border border-emerald-100/40 px-2 py-1 rounded truncate transition-colors"
                                            >
                                              <WhatsAppIcon size={12} className="shrink-0 fill-current" /> 
                                              <span className="truncate font-mono">{selectedOrder.customer_phone}</span>
                                            </a>
                                        )}
                                    </div>

                                    <div className="text-right shrink-0">
                                        <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-1">Total Facturado</p>
                                        <p className={`font-bold text-xl leading-none font-mono tabular-nums ${Number(selectedOrder?.iva_retention_usd || 0) > 0 ? 'text-neutral-400 line-through' : 'text-neutral-900'}`}>
                                            ${Number(selectedOrder?.total_usd || 0).toFixed(2)}
                                        </p>

                                        {Number(selectedOrder?.iva_retention_usd || 0) > 0 && (
                                            <div className="mt-2 text-right animate-in fade-in slide-in-from-top-2">
                                                <p className="text-[9px] font-semibold text-rose-500 uppercase tracking-wider mb-0.5">Retenido ({selectedOrder?.iva_retention_pct}%)</p>
                                                <p className="font-bold text-xs text-rose-600 leading-none font-mono">-${Number(selectedOrder?.iva_retention_usd || 0).toFixed(2)}</p>

                                                <p className="text-[9px] font-semibold text-emerald-600 uppercase tracking-wider mt-2 mb-0.5">Líquido a cobrar</p>
                                                <p className="font-bold text-xl text-emerald-700 leading-none font-mono tabular-nums">${Number(selectedOrder?.liquid_amount_usd || 0).toFixed(2)}</p>
                                            </div>
                                        )}

                                        <p className="text-[10px] font-mono font-medium text-neutral-400 mt-1.5 text-right">Bs {getBsAmount(selectedOrder || {}).toLocaleString('es-VE', { maximumFractionDigits: 2 })}</p>
                                    </div>
                                </div>

                                {/* Dirección y Vuelto Virtual */}
                                <div className="bg-white rounded-xl p-5 space-y-4 border border-neutral-200/50 shadow-[0_1px_3px_rgba(0,0,0,0.01)]">
                                    <div className="space-y-2">
                                        <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">Dirección de Entrega</p>
                                        <div className="flex items-start gap-2.5 bg-neutral-50/50 p-3 rounded-lg border border-neutral-200/50">
                                            <MapPin size={14} className="text-neutral-400 shrink-0 mt-0.5" />
                                            <p className="text-xs font-medium text-neutral-700 leading-snug flex-1 wrap-break-word">
                                                {selectedOrder.delivery_info?.split(' | ⚠️ ')[0] || 'Retiro en Tienda'}
                                            </p>
                                        </div>
                                    </div>
                                    
                                    {/* ALERTA INTELIGENTE DE VUELTO VIRTUAL */}
                                    {(() => {
                                        if (selectedOrder.vuelto_processed) {
                                            return (
                                                <div className="mt-3 p-3.5 bg-emerald-50 border border-emerald-100/40 rounded-lg flex items-start gap-2.5">
                                                    <div className="p-1.5 bg-emerald-100/50 text-emerald-600 rounded-md shrink-0">
                                                        <Check size={14} strokeWidth={2.5} />
                                                    </div>
                                                    <div className="space-y-0.5">
                                                        <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-wider">Estado Contable</p>
                                                        <p className="text-[11px] font-medium text-emerald-800 leading-tight">
                                                            El vuelto virtual para este pedido ya ha sido emitido de forma segura en la cuenta del cliente.
                                                        </p>
                                                    </div>
                                                </div>
                                            )
                                        }

                                        if (vueltoMatch) {
                                            const [_, expectedChange, tenderedAmount, userEmail] = vueltoMatch;
                                            
                                            return (
                                                <div className="mt-3 p-4 bg-white border border-amber-200/50 rounded-lg shadow-xs flex flex-col gap-3.5">
                                                    <div className="flex items-start gap-2.5">
                                                        <div className="p-1.5 bg-amber-50 text-amber-600 rounded-md shrink-0 border border-amber-100/50">
                                                            <Gift size={14} />
                                                        </div>
                                                        <div className="space-y-0.5">
                                                            <p className="text-[9px] font-bold text-amber-600 uppercase tracking-wider">Acción Requerida</p>
                                                            <p className="text-xs font-semibold text-neutral-900 leading-snug">
                                                                El cliente pagó con ${tenderedAmount} en efectivo. Requiere un vuelto de ${expectedChange}.
                                                            </p>
                                                            <p className="text-[10px] font-medium text-neutral-500 mt-1">
                                                                Cuenta vinculada: <strong className="text-neutral-800 font-mono">{userEmail}</strong>
                                                            </p>
                                                        </div>
                                                    </div>
                                                    
                                                    <button 
                                                        onClick={() => setCreditModalOpen(true)}
                                                        className="w-full bg-neutral-950 hover:bg-black text-white rounded-lg py-2.5 text-[11px] font-semibold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-xs active:scale-[0.98]"
                                                    >
                                                        <Gift size={13} /> Otorgar Vuelto de ${expectedChange}
                                                    </button>
                                                </div>
                                            );
                                        }
                                        return null;
                                    })()}
                                </div>

                                {/* Artículos */}
                                <div>
                                    <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-2.5">Artículos ({selectedOrder.order_items.length})</p>
                                    <div className="space-y-1.5 mb-2">
                                        {selectedOrder.order_items.map((item) => (
                                            <div key={item.id} className="flex justify-between items-center text-sm bg-white p-2.5 rounded-lg border border-neutral-200/50 shadow-[0_1px_2px_rgba(0,0,0,0.01)]">
                                                <div className="min-w-0 flex-1 pr-3 space-y-0.5">
                                                    <p className="font-semibold text-xs text-neutral-900 truncate">{item.product_name}</p>
                                                    {item.variant_info && item.variant_info !== 'N/A' && <p className="text-[10px] text-neutral-500 truncate font-mono">{item.variant_info}</p>}
                                                </div>
                                                <p className="font-mono font-bold text-xs text-neutral-700 bg-neutral-50 px-2 py-0.5 rounded border border-neutral-200/50 shrink-0">x{item.quantity}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Actualizador de Estado */}
                                <div className="pt-5 border-t border-neutral-200/50">
                                    <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-2.5">Actualizar Estado</p>
                                    <div className="flex flex-wrap gap-2 w-full">
                                        {['pending', 'paid', 'shipped', 'cancelled'].map(status => (
                                            <button
                                                key={status} 
                                                onClick={() => handleStatusClick(selectedOrder.id, status)} 
                                                disabled={updatingId === selectedOrder.id || (selectedOrder.status === status && status !== 'shipped')}
                                                className={`flex-1 min-w-[100px] px-3 py-2 rounded-lg text-[10px] font-semibold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                                                    selectedOrder.status === status 
                                                        ? 'bg-neutral-950 text-white shadow-xs opacity-100' 
                                                        : 'bg-white text-neutral-500 hover:text-neutral-900 border border-neutral-200/50 hover:bg-neutral-50 shadow-[0_1px_2px_rgba(0,0,0,0.01)]'
                                                }`}
                                            >
                                                {updatingId === selectedOrder.id && selectedOrder.status !== status ? <Loader2 size={12} className="animate-spin" /> : null}
                                                {status === 'pending' ? 'Pendiente' : status === 'paid' ? 'Pagado' : status === 'shipped' ? 'Enviado' : 'Cancelar'}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="h-6 shrink-0"></div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* --- MODAL DE CONCILIACIÓN --- */}
            <AnimatePresence>
                {reconcileModal.isOpen && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0 }} 
                            animate={{ opacity: 1 }} 
                            exit={{ opacity: 0 }} 
                            className="absolute inset-0 bg-neutral-900/30 backdrop-blur-xs" 
                            onClick={() => setReconcileModal({ ...reconcileModal, isOpen: false })} 
                        />
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.96, y: 15 }} 
                            animate={{ opacity: 1, scale: 1, y: 0 }} 
                            exit={{ opacity: 0, scale: 0.96, y: 15 }} 
                            className="relative bg-white w-full max-w-sm rounded-2xl overflow-hidden shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] flex flex-col p-6 md:p-8 border border-neutral-200/50"
                        >
                            <div className="space-y-1 mb-5">
                                <h3 className="font-bold text-lg text-neutral-900 tracking-tight">Conciliar Pago</h3>
                                <p className="text-[11px] font-medium text-neutral-400">Especifique la vía de ingreso para asentar la orden.</p>
                            </div>

                            <div className="space-y-5">
                                <div>
                                    <label className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 mb-2.5 block">Método de Ingreso</label>
                                    <div className="flex flex-wrap gap-1.5">
                                        {['Pago Móvil', 'Transferencia', 'Zelle', 'Efectivo', 'Binance', 'Zinli', 'WallyTech', 'Otro'].map(pm => (
                                            <button
                                                key={pm} 
                                                onClick={() => setReconcileModal({ ...reconcileModal, method: pm })}
                                                className={`px-3 py-1.5 rounded-md text-[11px] font-semibold transition-all border ${
                                                    reconcileModal.method === pm 
                                                        ? 'bg-neutral-950 text-white border-transparent shadow-xs' 
                                                        : 'bg-neutral-50/50 text-neutral-600 border-neutral-200/50 hover:bg-neutral-100 hover:text-neutral-900'
                                                }`}
                                            >
                                                {pm}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                
                                <div>
                                    <label className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 mb-2 block">Referencia (Opcional)</label>
                                    <input
                                        type="text" 
                                        value={reconcileModal.reference} 
                                        onChange={(e) => setReconcileModal({ ...reconcileModal, reference: e.target.value })}
                                        placeholder="Ej: 123456"
                                        className="w-full bg-neutral-50/50 border border-neutral-200/50 focus:bg-white focus:border-neutral-400 rounded-lg px-3.5 py-2.5 text-xs font-semibold text-neutral-900 outline-none transition-all placeholder:text-neutral-300 font-mono"
                                    />
                                </div>

                                {/* Retención de IVA */}
                                {(() => {
                                    const targetOrder = orders.find(o => o.id === reconcileModal.orderId);
                                    const hasTaxes = targetOrder && Number(targetOrder.tax_amount_usd || 0) > 0;

                                    if (!hasTaxes) return null;

                                    const taxAmount = Number(targetOrder.tax_amount_usd);
                                    const retentionUsd = taxAmount * (reconcileModal.retentionPct / 100);
                                    const liquidUsd = Number(targetOrder.total_usd) - retentionUsd;

                                    return (
                                        <div className="pt-4 border-t border-neutral-100 animate-in fade-in">
                                            <div className="flex items-center justify-between mb-2.5">
                                                <label className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">Retención IVA</label>
                                                <span className="text-[8px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-100/40 px-1.5 py-0.5 rounded">Solo B2B</span>
                                            </div>
                                            <div className="flex gap-1.5 mb-3.5">
                                                {[0, 75, 100].map(pct => (
                                                    <button
                                                        key={pct}
                                                        onClick={() => setReconcileModal({ ...reconcileModal, retentionPct: pct })}
                                                        className={`flex-1 py-1.5 rounded-md text-[11px] font-semibold transition-all border ${
                                                            reconcileModal.retentionPct === pct 
                                                                ? 'bg-neutral-950 text-white border-transparent shadow-xs' 
                                                                : 'bg-neutral-50/50 text-neutral-500 border-neutral-200/50 hover:bg-neutral-100'
                                                        }`}
                                                    >
                                                        {pct === 0 ? 'No Aplica' : `${pct}%`}
                                                    </button>
                                                ))}
                                            </div>

                                            <div className="bg-neutral-50/50 p-3.5 rounded-lg border border-neutral-200/50 space-y-1.5">
                                                <div className="flex justify-between text-[10px] font-semibold text-neutral-500">
                                                    <span>Total Facturado:</span>
                                                    <span className="font-mono">${Number(targetOrder.total_usd).toFixed(2)}</span>
                                                </div>
                                                {reconcileModal.retentionPct > 0 && (
                                                    <div className="flex justify-between text-[10px] font-semibold text-rose-500">
                                                        <span>Retenido (Crédito Fiscal):</span>
                                                        <span className="font-mono">-${retentionUsd.toFixed(2)}</span>
                                                    </div>
                                                )}
                                                <div className="flex justify-between text-xs font-bold text-neutral-900 pt-1.5 border-t border-neutral-200/50 mt-1.5">
                                                    <span>A depositar en Banco:</span>
                                                    <span className="font-mono">${liquidUsd.toFixed(2)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })()}

                                <div className="flex gap-2 mt-2 pt-4 border-t border-neutral-100">
                                    <button 
                                        onClick={() => setReconcileModal({ ...reconcileModal, isOpen: false })} 
                                        className="flex-1 bg-white border border-neutral-200/50 text-neutral-600 font-semibold text-[11px] py-2.5 rounded-lg hover:bg-neutral-50 transition-all"
                                    >
                                        Cancelar
                                    </button>
                                    <button 
                                        onClick={processReconciliation} 
                                        disabled={updatingId === reconcileModal.orderId} 
                                        className="flex-1 bg-neutral-950 text-white font-semibold text-[11px] py-2.5 rounded-lg shadow-xs hover:bg-black active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
                                    >
                                        {updatingId === reconcileModal.orderId ? <Loader2 size={14} className="animate-spin" /> : <DollarSign size={14} />} 
                                        Confirmar Pago
                                    </button>
                                </div>

                            </div>
                        </motion.div>

                    </div>
                )}
            </AnimatePresence>

            {/* MODAL DE CRÉDITO DE TIENDA */}
            {selectedOrder && storeId && (
                <IssueVirtualChangeModal
                    isOpen={creditModalOpen}
                    onClose={() => setCreditModalOpen(false)}
                    orderId={selectedOrder.id}
                    storeId={storeId}
                    existingCustomerId={selectedOrder.customer_id}
                    orderNumber={selectedOrder.order_number}
                    defaultAmount={vueltoMatch ? parseFloat(vueltoMatch[1]) : 0}
                    onSuccess={() => {
                        setOrders(prev => prev.map(o => o.id === selectedOrder.id ? { ...o, vuelto_processed: true } : o));
                        setSelectedOrder(prev => prev ? { ...prev, vuelto_processed: true } : null);
                        fetchKPIs();
                    }}
                />
            )}
        </div>
    )
}