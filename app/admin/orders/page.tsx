'use client'

import { useState, useEffect, useMemo } from 'react'
import { ArrowLeft, Search, CheckCircle2, Clock, Truck, XCircle, Package, MessageCircle, ChevronDown, ChevronUp, DollarSign, MapPin, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { getSupabase } from '@/lib/supabase-client'
import Swal from 'sweetalert2'

// --- BADGE COMPONENT (Optimizado) ---
const StatusBadge = ({ status }: { status: string }) => {
  const styles: any = {
    pending: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    paid: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    shipped: 'bg-blue-50 text-blue-700 border-blue-200',
    completed: 'bg-gray-100 text-gray-600 border-gray-200',
    cancelled: 'bg-red-50 text-red-700 border-red-200'
  }
  
  const labels: any = {
    pending: 'Pendiente',
    paid: 'Pagado',
    shipped: 'Enviado',
    completed: 'Entregado',
    cancelled: 'Cancelado'
  }

  const Icon = status === 'pending' ? Clock : status === 'paid' ? DollarSign : status === 'shipped' ? Truck : status === 'cancelled' ? XCircle : CheckCircle2

  return (
    <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border ${styles[status] || styles.pending}`}>
      <Icon size={12} strokeWidth={3} />
      {labels[status] || status}
    </span>
  )
}

export default function OrdersPage() {
  const supabase = getSupabase()
  const [loading, setLoading] = useState(true)
  const [orders, setOrders] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all') 
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null)
  
  // ESTADO NUEVO: Controla qué botón específico se está actualizando para mostrar spinner
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const fetchOrders = async () => {
    // Solo mostramos loading global la primera vez
    if (orders.length === 0) setLoading(true)
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`*, order_items (*)`)
        .order('created_at', { ascending: false })

      if (error) throw error
      setOrders(data || [])
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOrders()
  }, [])

  const updateStatus = async (orderId: string, newStatus: string) => {
    setUpdatingId(orderId) // Activar spinner en la UI
    const previousOrders = [...orders] // Guardar estado anterior por si falla (Rollback)

    try {
        // 1. Actualización Optimista (Visual inmediata)
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o))

        // 2. Actualización Real en BD
        const { error } = await supabase
            .from('orders')
            .update({ status: newStatus })
            .eq('id', orderId)

        if (error) throw error

        const Toast = Swal.mixin({
            toast: true, position: 'top-end', showConfirmButton: false, timer: 1500,
            customClass: { popup: 'rounded-xl font-bold text-xs' }
        })
        Toast.fire({ icon: 'success', title: 'Estado Actualizado' })

    } catch (error: any) {
        // 3. Rollback si falla
        setOrders(previousOrders)
        console.error("Update error:", error)
        Swal.fire('Error', 'No se pudo actualizar el estado. Verifica tu conexión o permisos.', 'error')
    } finally {
        setUpdatingId(null)
    }
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

  // --- CÁLCULOS INTELIGENTES ---
  const getBsAmount = (order: any) => {
      if (order.total_bs && Number(order.total_bs) > 0) return Number(order.total_bs)
      return Number(order.total_usd || 0) * Number(order.exchange_rate || 0)
  }

  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0]
    const todayOrders = orders.filter(o => o.created_at.startsWith(today) && o.status !== 'cancelled')
    
    return {
        total: orders.length,
        pending: orders.filter(o => o.status === 'pending').length,
        salesTodayUSD: todayOrders.reduce((acc, o) => acc + Number(o.total_usd || 0), 0),
        salesTodayBs: todayOrders.reduce((acc, o) => acc + getBsAmount(o), 0)
    }
  }, [orders])

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-20 font-sans text-gray-900">
        
        {/* HEADER */}
        <div className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-30 px-4 md:px-8 py-4 flex justify-between items-center transition-all">
            <div className="flex items-center gap-4">
                <Link href="/admin" className="p-2 bg-white border border-gray-200 hover:border-black hover:bg-gray-50 rounded-full transition-all group">
                    <ArrowLeft size={18} className="text-gray-500 group-hover:text-black"/>
                </Link>
                <div>
                    <h1 className="font-black text-xl tracking-tight leading-none">Pedidos</h1>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Gestión de Ventas</p>
                </div>
            </div>
            
            <button onClick={fetchOrders} className="p-2 hover:bg-gray-100 rounded-full transition-colors" title="Refrescar">
                <Clock size={18} className="text-gray-400"/>
            </button>
        </div>

        {/* CONTENT */}
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-8 space-y-8">
            
            {/* KPI CARDS */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Pendientes</p>
                    <div className="flex items-center gap-2">
                        <span className="text-2xl font-black text-yellow-600">{stats.pending}</span>
                        {stats.pending > 0 && <span className="flex h-2 w-2 relative"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-500"></span></span>}
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-center">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Ventas Hoy</p>
                    <p className="text-2xl font-black text-gray-900 leading-none">${stats.salesTodayUSD.toFixed(2)}</p>
                    <p className="text-xs font-mono font-bold text-gray-400 mt-1">
                        Bs {stats.salesTodayBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm col-span-2 md:col-span-1">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Total Histórico</p>
                    <p className="text-2xl font-black text-gray-900">{stats.total} <span className="text-sm text-gray-400 font-medium">Pedidos</span></p>
                </div>
            </div>

            {/* FILTERS & SEARCH */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-end md:items-center">
                 <div className="flex bg-gray-200/50 p-1 rounded-xl overflow-x-auto no-scrollbar w-full md:w-auto">
                    {['all', 'pending', 'paid', 'shipped'].map(status => (
                        <button 
                            key={status}
                            onClick={() => setFilterStatus(status)}
                            className={`px-4 py-2 rounded-lg text-xs font-bold capitalize transition-all whitespace-nowrap ${filterStatus === status ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            {status === 'all' ? 'Todos' : status === 'pending' ? 'Pendientes' : status === 'paid' ? 'Pagados' : 'Enviados'}
                        </button>
                    ))}
                </div>

                <div className="relative group w-full md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-black transition-colors" size={16}/>
                    <input 
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Buscar pedido o cliente..." 
                        className="w-full bg-white border border-gray-200 rounded-xl pl-9 pr-4 py-2.5 text-sm font-medium focus:border-black focus:ring-1 focus:ring-black outline-none transition-all"
                    />
                </div>
            </div>

            {/* ORDERS LIST */}
            <div className="space-y-4">
                {loading && orders.length === 0 ? (
                     <div className="text-center py-20"><Loader2 className="animate-spin text-gray-300 mx-auto" size={32}/></div>
                ) : filteredOrders.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300"><Package size={24}/></div>
                        <p className="text-gray-400 font-bold text-sm">No se encontraron pedidos.</p>
                    </div>
                ) : (
                    filteredOrders.map(order => {
                        const bsAmount = getBsAmount(order)
                        const isUpdating = updatingId === order.id // Check if this card is processing

                        return (
                        <div key={order.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:border-gray-300 transition-all overflow-hidden group">
                            
                            {/* CARD HEADER */}
                            <div 
                                onClick={() => setExpandedOrderId(expandedOrderId === order.id ? null : order.id)}
                                className="p-5 flex flex-col md:flex-row md:items-center gap-4 cursor-pointer relative"
                            >   
                                {/* Col 1 */}
                                <div className="flex items-center justify-between md:justify-start gap-4 md:w-1/4">
                                    <div>
                                        <p className="text-xs font-black text-gray-900">#{order.order_number}</p>
                                        <p className="text-[10px] text-gray-400 font-mono">{new Date(order.created_at).toLocaleDateString()}</p>
                                    </div>
                                    <StatusBadge status={order.status} />
                                </div>

                                {/* Col 2 */}
                                <div className="flex-1">
                                    <p className="font-bold text-sm text-gray-900">{order.customer_name}</p>
                                    <div className="flex items-center gap-2 text-xs text-gray-500">
                                        <span className="bg-gray-100 px-1.5 py-0.5 rounded text-[10px] font-mono uppercase">{order.payment_method}</span>
                                        <span>&bull;</span>
                                        <span className="bg-gray-100 px-1.5 py-0.5 rounded text-[10px] font-mono uppercase">{order.shipping_method === 'pickup' ? 'Retiro' : 'Envío'}</span>
                                    </div>
                                </div>

                                {/* Col 3 */}
                                <div className="text-right">
                                    <p className="font-black text-lg text-gray-900">${order.total_usd}</p>
                                    <p className="text-[10px] font-mono font-bold text-gray-400">
                                        Bs {bsAmount.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </p>
                                </div>

                                <div className="absolute right-2 top-2 md:relative md:right-0 md:top-0 text-gray-300 group-hover:text-black transition-colors">
                                    {expandedOrderId === order.id ? <ChevronUp size={20}/> : <ChevronDown size={20}/>}
                                </div>
                            </div>

                            {/* CARD DETAILS */}
                            {expandedOrderId === order.id && (
                                <div className="border-t border-gray-100 bg-gray-50/50 p-5 animate-in slide-in-from-top-2">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        
                                        {/* Products */}
                                        <div className="space-y-3">
                                            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Productos ({order.order_items.length})</h4>
                                            {order.order_items.map((item: any) => (
                                                <div key={item.id} className="flex justify-between items-start text-sm bg-white p-3 rounded-xl border border-gray-100">
                                                    <div>
                                                        <p className="font-bold text-gray-900">{item.product_name}</p>
                                                        <p className="text-xs text-gray-500">{item.variant_info}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="font-mono font-bold text-gray-900">x{item.quantity}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Actions */}
                                        <div className="space-y-6">
                                            <div>
                                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Datos de Entrega</h4>
                                                <div className="bg-white p-3 rounded-xl border border-gray-100 space-y-2">
                                                    <div className="flex items-start gap-2">
                                                        <MapPin size={14} className="text-gray-400 mt-0.5 shrink-0"/>
                                                        <p className="text-xs font-medium text-gray-700">{order.delivery_info || 'Sin dirección'}</p>
                                                    </div>
                                                    {order.customer_phone && (
                                                        <div className="flex items-center gap-2">
                                                            <MessageCircle size={14} className="text-green-500 shrink-0"/>
                                                            <a 
                                                                href={`https://wa.me/${order.customer_phone.replace(/\D/g, '')}`} 
                                                                target="_blank" 
                                                                className="text-xs font-bold text-green-600 hover:underline"
                                                            >
                                                                Contactar al Cliente
                                                            </a>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div>
                                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Cambiar Estado</h4>
                                                <div className="flex flex-wrap gap-2">
                                                    {['pending', 'paid', 'shipped', 'cancelled'].map(status => (
                                                        <button
                                                            key={status}
                                                            onClick={() => updateStatus(order.id, status)}
                                                            disabled={order.status === status || isUpdating}
                                                            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wide border transition-all flex items-center gap-2 ${
                                                                order.status === status 
                                                                    ? 'bg-black text-white border-black opacity-50 cursor-not-allowed' 
                                                                    : 'bg-white text-gray-600 border-gray-200 hover:border-black hover:text-black'
                                                            }`}
                                                        >
                                                            {/* Spinner pequeño si esta tarjeta específica se está actualizando */}
                                                            {isUpdating && <Loader2 size={10} className="animate-spin"/>}
                                                            {status === 'pending' ? 'Pendiente' : status === 'paid' ? 'Pagado' : status === 'shipped' ? 'Enviado' : 'Cancelar'}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )})
                )}
            </div>

        </div>
        
        <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  )
}