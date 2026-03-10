'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { ArrowLeft, Search, CheckCircle2, Clock, Truck, XCircle, Package, MessageCircle, DollarSign, MapPin, Loader2, Copy, Check } from 'lucide-react'
import Link from 'next/link'
import { getSupabase } from '@/lib/supabase-client'
import Swal from 'sweetalert2'
import { AnimatePresence, motion } from 'framer-motion'

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
  status: 'pending' | 'paid' | 'shipped' | 'completed' | 'cancelled' | string
  customer_name: string
  customer_phone: string | null
  total_usd: number
  total_bs: number | null
  exchange_rate: number | null
  payment_method: string
  shipping_method: string
  delivery_info: string | null
  tracking_number?: string | null
  order_items: OrderItem[]
}

const StatusBadge = ({ status }: { status: string }) => {
  const styles: Record<string, string> = {
    pending: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    paid: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    shipped: 'bg-blue-50 text-blue-700 border-blue-200',
    completed: 'bg-gray-50 text-gray-600 border-gray-200',
    cancelled: 'bg-red-50 text-red-700 border-red-200'
  }
  
  const labels: Record<string, string> = {
    pending: 'Pendiente',
    paid: 'Pagado',
    shipped: 'Enviado',
    completed: 'Entregado',
    cancelled: 'Cancelado'
  }

  const Icon = status === 'pending' ? Clock : status === 'paid' ? DollarSign : status === 'shipped' ? Truck : status === 'cancelled' ? XCircle : CheckCircle2

  return (
    <span className={`flex items-center justify-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide border shrink-0 ${styles[status] || styles.pending}`}>
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
  
  // Paginación y Datos
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [orders, setOrders] = useState<Order[]>([])
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const ITEMS_PER_PAGE = 20

  // Interfaz y Drawer (Cajón Lateral)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all') 
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  
  // Funciones Logísticas
  const [trackingInput, setTrackingInput] = useState('')
  const [copiedAddress, setCopiedAddress] = useState(false)

  const [kpiStats, setKpiStats] = useState({ total: 0, pending: 0, salesTodayUSD: 0, salesTodayBs: 0 })

  // SEGURIDAD: ID de la tienda actual
  const [storeId, setStoreId] = useState<string | null>(null)

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

  // 1. KPIS BLINDADOS
  const fetchKPIs = useCallback(async () => {
      if (!storeId) return

      const today = new Date().toISOString().split('T')[0]
      const { data: allOrders } = await supabase.from('orders').select('id, status').eq('store_id', storeId)
      const { data: todayOrders } = await supabase
        .from('orders')
        .select('status, total_usd, total_bs, exchange_rate')
        .eq('store_id', storeId)
        .gte('created_at', `${today}T00:00:00Z`)
        .neq('status', 'cancelled')

      if (allOrders && todayOrders) {
          setKpiStats({
              total: allOrders.length,
              pending: allOrders.filter((o: any) => o.status === 'pending').length,
              salesTodayUSD: todayOrders.reduce((acc: number, o: any) => acc + Number(o.total_usd || 0), 0),
              salesTodayBs: todayOrders.reduce((acc: number, o: any) => acc + getBsAmount(o), 0)
          })
      }
  }, [supabase, storeId])

  // 2. ÓRDENES BLINDADAS
  const fetchOrders = useCallback(async (pageNumber = 0, isRefresh = false) => {
    if (!storeId) return

    if (isRefresh) { setLoading(true); setPage(0); }
    else setLoadingMore(true)

    const from = pageNumber * ITEMS_PER_PAGE
    const to = from + ITEMS_PER_PAGE - 1

    try {
      const { data, error, count } = await supabase
        .from('orders')
        .select(`*, order_items (*)`, { count: 'exact' })
        .eq('store_id', storeId)
        .order('created_at', { ascending: false })
        .range(from, to)

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
    if (storeId) {
        fetchOrders(0, true)
        fetchKPIs()
    }
  }, [fetchOrders, fetchKPIs, storeId])

  // 3. REALTIME ENGINE BLINDADO
  useEffect(() => {
      if (!storeId) return

      const playNotification = () => {
          try {
              const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3')
              audio.volume = 0.5
              audio.play().catch(() => {}) 
          } catch (e) {}
      }

      const channel = supabase
          .channel(`realtime-orders-${storeId}`)
          .on('postgres_changes', { 
              event: 'INSERT', 
              schema: 'public', 
              table: 'orders',
              filter: `store_id=eq.${storeId}` 
          }, async (payload: any) => {
              const { data: newOrder } = await supabase.from('orders').select('*, order_items(*)').eq('id', payload.new.id).single()
              if (newOrder) {
                  playNotification()
                  const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 3000, customClass: { popup: 'bg-black text-white rounded-xl' }})
                  Toast.fire({ icon: 'info', title: `¡Nuevo pedido de ${newOrder.customer_name}!` })
                  setOrders(prev => [newOrder as Order, ...prev])
                  fetchKPIs() 
              }
          })
          .on('postgres_changes', { 
              event: 'UPDATE', 
              schema: 'public', 
              table: 'orders',
              filter: `store_id=eq.${storeId}` 
          }, (payload: any) => {
              setOrders(prev => prev.map(o => o.id === payload.new.id ? { ...o, ...payload.new } : o))
              if (selectedOrder?.id === payload.new.id) {
                  setSelectedOrder(prev => prev ? { ...prev, ...payload.new } : null)
              }
              fetchKPIs()
          })
          .subscribe()

      return () => { supabase.removeChannel(channel) }
  }, [supabase, fetchKPIs, selectedOrder, storeId])

  // LÓGICA LOGÍSTICA
  const updateStatus = async (orderId: string, newStatus: string) => {
    setUpdatingId(orderId) 
    const previousOrders = [...orders] 

    try {
        const payload: any = { status: newStatus }
        if (newStatus === 'shipped') {
            payload.tracking_number = trackingInput.trim() || null
        }

        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, ...payload } : o))
        if (selectedOrder?.id === orderId) {
            setSelectedOrder(prev => prev ? { ...prev, ...payload } : null)
        }

        const { error } = await supabase.from('orders').update(payload).eq('id', orderId)
        if (error) throw error

        const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 1500, customClass: { popup: 'rounded-xl font-bold text-xs bg-black text-white' } })
        Toast.fire({ icon: 'success', title: 'Actualizado' })
        fetchKPIs() 

    } catch (error) {
        setOrders(previousOrders)
        Swal.fire('Error', 'No se pudo actualizar.', 'error')
    } finally {
        setUpdatingId(null)
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
        const matchesSearch = 
            order.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
            order.order_number?.toString().includes(search)
        const matchesFilter = filterStatus === 'all' || order.status === filterStatus
        return matchesSearch && matchesFilter
    })
  }, [orders, search, filterStatus])

  return (
    <div className="min-h-screen bg-gray-50 pb-20 font-sans text-gray-900 flex flex-col">
        
        {/* HEADER STICKY */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-30 px-4 md:px-8 py-4 flex justify-between items-center">
            <div className="flex items-center gap-4">
                <Link href="/admin" className="p-2 bg-gray-50 border border-gray-200 hover:border-black hover:bg-white rounded-full transition-all group shrink-0">
                    <ArrowLeft size={18} className="text-gray-500 group-hover:text-black"/>
                </Link>
                <div>
                    <h1 className="font-black text-xl tracking-tight leading-none flex items-center gap-2">
                        Pedidos
                        <span className="flex items-center gap-1 bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-[9px] uppercase tracking-widest font-black border border-green-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                            Live
                        </span>
                    </h1>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Gestión de Ventas</p>
                </div>
            </div>
            <button onClick={() => { fetchOrders(0, true); fetchKPIs(); }} className="p-2 hover:bg-gray-100 rounded-full transition-colors active:rotate-180 duration-500 shrink-0" title="Sincronizar Forzado">
                <Clock size={18} className="text-gray-400"/>
            </button>
        </div>

        {/* CONTENEDOR ANTI-DESBORDE DE VIEWPORT */}
        <div className="w-full max-w-[100vw] overflow-x-hidden flex-1">
            <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-8 space-y-6 md:space-y-8">
                
                {/* KPI CARDS FLAT */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 w-full">
                    <div className="bg-white p-6 rounded-xl border border-gray-200 min-w-0">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 truncate">Pendientes</p>
                        <div className="flex items-center gap-2">
                            <span className="text-2xl font-black text-yellow-600 truncate">{kpiStats.pending}</span>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-xl border border-gray-200 flex flex-col justify-center min-w-0">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 truncate">Ventas Hoy</p>
                        <p className="text-2xl font-black text-gray-900 leading-none truncate">${kpiStats.salesTodayUSD.toFixed(2)}</p>
                        <p className="text-xs font-mono font-bold text-gray-400 mt-1 truncate">
                            Bs {kpiStats.salesTodayBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                    </div>
                    <div className="bg-white p-6 rounded-xl border border-gray-200 col-span-2 md:col-span-1 min-w-0">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 truncate">Total Histórico</p>
                        <p className="text-2xl font-black text-gray-900 truncate">{kpiStats.total} <span className="text-sm text-gray-400 font-medium">Pedidos</span></p>
                    </div>
                </div>

               {/* FILTERS & SEARCH FLAT */}
                <div className="flex flex-col lg:flex-row gap-4 justify-between items-stretch lg:items-center w-full">
                     <div className="flex bg-gray-100 p-1 rounded-lg overflow-x-auto no-scrollbar w-full lg:w-auto border border-gray-200 max-w-full">
                        {['all', 'pending', 'paid', 'shipped'].map(status => (
                            <button 
                                key={status}
                                onClick={() => setFilterStatus(status)}
                                className={`shrink-0 px-4 py-2 rounded-md text-xs font-bold capitalize transition-all whitespace-nowrap ${
                                    filterStatus === status 
                                    ? 'bg-white text-black border border-gray-300 shadow-sm' 
                                    : 'text-gray-500 hover:text-gray-900 border border-transparent'
                                }`}
                            >
                                {status === 'all' ? 'Todos' : status === 'pending' ? 'Pendientes' : status === 'paid' ? 'Pagados' : 'Enviados'}
                            </button>
                        ))}
                    </div>

                    <div className="relative group w-full lg:w-80 shrink-0">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-black transition-colors" size={16}/>
                        <input 
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Buscar pedido o cliente..." 
                            className="w-full bg-white border border-gray-200 rounded-lg pl-9 pr-4 py-2.5 text-sm font-medium focus:border-black focus:ring-1 focus:ring-black outline-none transition-all"
                        />
                    </div>
                </div>

                {/* LISTA Y TABLA (RESPONSIVE) */}
                {loading && orders.length === 0 ? (
                    <div className="text-center py-20"><Loader2 className="animate-spin text-gray-300 mx-auto" size={32}/></div>
                ) : filteredOrders.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-300">
                        <div className="w-16 h-16 bg-gray-50 rounded-full border border-gray-200 flex items-center justify-center mx-auto mb-4 text-gray-400"><Package size={24}/></div>
                        <p className="text-gray-400 font-bold text-sm">No se encontraron pedidos.</p>
                    </div>
                ) : (
                    <>
                        {/* VISTA MÓVIL (Tarjetas Flat) */}
                        <div className="md:hidden space-y-3 w-full">
                            {filteredOrders.map(order => (
                                <div key={order.id} onClick={() => openDrawer(order)} className="bg-white rounded-xl border border-gray-200 p-4 active:bg-gray-50 transition-colors cursor-pointer w-full">
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="min-w-0 pr-2">
                                            <p className="text-xs font-black text-gray-900 truncate">#{order.order_number}</p>
                                            <p className="text-[10px] text-gray-400 font-mono truncate">{new Date(order.created_at).toLocaleDateString()}</p>
                                        </div>
                                        <StatusBadge status={order.status} />
                                    </div>
                                    <p className="font-bold text-sm text-gray-900 truncate">{order.customer_name}</p>
                                    <div className="flex justify-between items-end mt-3">
                                        <div className="flex items-center gap-2 text-xs text-gray-500 min-w-0 pr-2">
                                            <span className="bg-gray-100 px-1.5 py-0.5 rounded text-[10px] font-mono uppercase text-gray-600 border border-gray-200 truncate max-w-[120px]">{order.payment_method}</span>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <p className="font-black text-base text-gray-900 leading-none">${order.total_usd}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* VISTA DESKTOP (Tabla de Alta Densidad Flat) */}
                        <div className="hidden md:block bg-white border border-gray-200 rounded-xl overflow-hidden w-full max-w-full">
                            <div className="overflow-x-auto w-full">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-gray-50 border-b border-gray-200 text-[10px] uppercase tracking-widest text-gray-500">
                                        <tr>
                                            <th className="px-6 py-4 font-bold">Pedido</th>
                                            <th className="px-6 py-4 font-bold">Fecha</th>
                                            <th className="px-6 py-4 font-bold">Cliente</th>
                                            <th className="px-6 py-4 font-bold">Estado</th>
                                            <th className="px-6 py-4 font-bold">Pago / Envío</th>
                                            <th className="px-6 py-4 font-bold text-right">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {filteredOrders.map(order => (
                                            <tr 
                                                key={order.id} 
                                                onClick={() => openDrawer(order)}
                                                className="hover:bg-gray-50 transition-colors cursor-pointer group"
                                            >
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className="font-black text-gray-900 group-hover:underline">#{order.order_number}</span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap font-mono text-gray-500 text-xs">
                                                    {new Date(order.created_at).toLocaleDateString()}
                                                </td>
                                                <td className="px-6 py-4 min-w-[150px]">
                                                    <span className="font-bold text-gray-900 truncate block">{order.customer_name}</span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <StatusBadge status={order.status} />
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex gap-2">
                                                        <span className="bg-white border border-gray-200 px-2 py-0.5 rounded text-[10px] font-mono uppercase text-gray-600">{order.payment_method}</span>
                                                        <span className="bg-white border border-gray-200 px-2 py-0.5 rounded text-[10px] font-mono uppercase text-gray-600">{order.shipping_method === 'pickup' ? 'Retiro' : 'Envío'}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right">
                                                    <p className="font-black text-gray-900">${order.total_usd}</p>
                                                    <p className="text-[10px] font-mono text-gray-400">Bs {getBsAmount(order).toLocaleString('es-VE', { maximumFractionDigits: 2 })}</p>
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
                                    onClick={() => {
                                        const nextPage = page + 1
                                        setPage(nextPage)
                                        fetchOrders(nextPage)
                                    }} 
                                    disabled={loadingMore}
                                    className="bg-white border border-gray-200 text-gray-900 font-bold text-xs uppercase tracking-widest px-8 py-3 rounded-full hover:border-black hover:bg-gray-50 transition-all flex items-center gap-2 shrink-0"
                                >
                                    {loadingMore ? <Loader2 size={16} className="animate-spin"/> : <ArrowLeft size={16} className="-rotate-90"/>}
                                    Cargar Más Pedidos
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
        {/* Fin Contenedor Anti-Desborde */}

        {/* --- CAJÓN LATERAL (SLIDE-OVER DRAWER) --- */}
        <AnimatePresence>
            {isDrawerOpen && selectedOrder && (
                <div className="fixed inset-0 z-[100] flex justify-end">
                    <motion.div 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                        onClick={() => setIsDrawerOpen(false)}
                    />
                    
                    <motion.div 
                        initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="relative w-full md:w-[450px] bg-white h-full border-l border-gray-200 flex flex-col"
                    >
                        <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-gray-50 shrink-0">
                            <div className="min-w-0 pr-4">
                                <h2 className="text-xl font-black text-gray-900 truncate">Pedido #{selectedOrder.order_number}</h2>
                                <p className="text-xs font-mono text-gray-500 mt-1">{new Date(selectedOrder.created_at).toLocaleString()}</p>
                            </div>
                            <button onClick={() => setIsDrawerOpen(false)} className="p-2 bg-white border border-gray-200 rounded-full hover:bg-gray-100 hover:text-black text-gray-400 transition-colors shrink-0">
                                <XCircle size={20} strokeWidth={2}/>
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-8 no-scrollbar">
                            <div className="flex justify-between items-start">
                                <div className="min-w-0 pr-4">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Cliente</p>
                                    <p className="font-bold text-lg text-gray-900 break-words">{selectedOrder.customer_name}</p>
                                    {selectedOrder.customer_phone && (
                                        <a href={`https://wa.me/${selectedOrder.customer_phone.replace(/\D/g, '')}`} target="_blank" className="flex items-center gap-1.5 text-xs font-bold text-green-600 hover:text-green-700 mt-1 w-fit bg-green-50 px-2 py-1 rounded border border-green-200 truncate">
                                            <MessageCircle size={14} className="shrink-0"/> <span className="truncate">{selectedOrder.customer_phone}</span>
                                        </a>
                                    )}
                                </div>
                                <div className="text-right shrink-0">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Total</p>
                                    <p className="font-black text-2xl text-gray-900 leading-none">${selectedOrder.total_usd}</p>
                                    <p className="text-[10px] font-mono font-bold text-gray-400 mt-1">Bs {getBsAmount(selectedOrder).toLocaleString('es-VE', { maximumFractionDigits: 2 })}</p>
                                </div>
                            </div>

                            <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 space-y-4">
                                <div>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Dirección de Entrega</p>
                                    <div className="flex items-start gap-3 bg-white p-3 border border-gray-200 rounded-lg">
                                        <MapPin size={16} className="text-gray-400 shrink-0 mt-0.5"/>
                                        <p className="text-sm font-medium text-gray-700 leading-snug flex-1 break-words">{selectedOrder.delivery_info || 'Retiro en Tienda'}</p>
                                        <button 
                                            onClick={() => handleCopyAddress(selectedOrder.delivery_info || '')}
                                            disabled={!selectedOrder.delivery_info}
                                            className="p-1.5 text-gray-400 hover:text-black hover:bg-gray-50 rounded-md transition-colors disabled:opacity-30 shrink-0"
                                        >
                                            {copiedAddress ? <Check size={16} className="text-green-600"/> : <Copy size={16}/>}
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Número de Guía / Tracking</p>
                                    <input 
                                        type="text" 
                                        value={trackingInput}
                                        onChange={(e) => setTrackingInput(e.target.value)}
                                        placeholder="Ej: MRW-123456789" 
                                        className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2.5 text-sm font-bold focus:border-black focus:ring-1 focus:ring-black outline-none transition-all"
                                    />
                                </div>
                            </div>

                            <div>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Artículos ({selectedOrder.order_items.length})</p>
                                <div className="space-y-2 mb-6">
                                    {selectedOrder.order_items.map((item) => (
                                        <div key={item.id} className="flex justify-between items-center text-sm bg-white p-3 rounded-lg border border-gray-200">
                                            <div className="min-w-0 flex-1 pr-4">
                                                <p className="font-bold text-gray-900 truncate">{item.product_name}</p>
                                                {item.variant_info && <p className="text-xs text-gray-500 truncate">{item.variant_info}</p>}
                                            </div>
                                            <p className="font-mono font-bold text-gray-900 bg-gray-50 border border-gray-200 px-2 py-1 rounded-md shrink-0">x{item.quantity}</p>
                                        </div>
                                    ))}
                                </div>

                                <div className="pt-6 border-t border-gray-200">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Actualizar Estado</p>
                                    <div className="flex overflow-x-auto no-scrollbar gap-2 pb-1 w-full max-w-full">
                                        {['pending', 'paid', 'shipped', 'cancelled'].map(status => (
                                            <button
                                                key={status}
                                                onClick={() => updateStatus(selectedOrder.id, status)}
                                                disabled={updatingId === selectedOrder.id || (selectedOrder.status === status && status !== 'shipped')}
                                                className={`shrink-0 px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wide border transition-all flex items-center justify-center gap-2 ${
                                                    selectedOrder.status === status 
                                                        ? 'bg-black text-white border-black opacity-100' 
                                                        : 'bg-white text-gray-600 border-gray-200 hover:border-black hover:text-black'
                                                }`}
                                            >
                                                {updatingId === selectedOrder.id ? <Loader2 size={14} className="animate-spin"/> : null}
                                                {status === 'pending' ? 'Pendiente' : status === 'paid' ? 'Pagado' : status === 'shipped' ? 'Enviado' : 'Cancelar'}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            
                            <div className="h-12 shrink-0"></div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>

        <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  )
}