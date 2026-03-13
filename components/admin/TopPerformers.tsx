'use client'

import { useState, useEffect } from 'react'
import { getSupabase } from '@/lib/supabase-client'
import { Crown, Star, Loader2, MessageCircle, TrendingUp } from 'lucide-react'

export default function TopPerformers({ storeId }: { storeId: string }) {
  const supabase = getSupabase()
  const [loading, setLoading] = useState(true)
  const [topProduct, setTopProduct] = useState<{ name: string, qty: number } | null>(null)
  const [topCustomer, setTopCustomer] = useState<{ name: string, spent: number, phone: string | null } | null>(null)

  useEffect(() => {
    const fetchTopPerformers = async () => {
      setLoading(true)
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      const dateString = thirtyDaysAgo.toISOString()

      // 1. Buscar Mejor Cliente
      const { data: orders } = await supabase
        .from('orders')
        .select('customer_name, customer_phone, total_usd')
        .eq('store_id', storeId)
        .gte('created_at', dateString)
        .neq('status', 'cancelled')

      if (orders && orders.length > 0) {
        const customerMap: Record<string, { spent: number, phone: string | null }> = {}
        orders.forEach((o: any) => {
          if (!customerMap[o.customer_name]) customerMap[o.customer_name] = { spent: 0, phone: o.customer_phone }
          customerMap[o.customer_name].spent += Number(o.total_usd || 0)
        })
        const bestCustomerName = Object.keys(customerMap).reduce((a, b) => customerMap[a].spent > customerMap[b].spent ? a : b)
        setTopCustomer({ name: bestCustomerName, spent: customerMap[bestCustomerName].spent, phone: customerMap[bestCustomerName].phone })
      }

      // 2. Buscar Producto Estrella
      const { data: items } = await supabase
        .from('order_items')
        .select('product_name, quantity, orders!inner(store_id, created_at, status)')
        .eq('orders.store_id', storeId)
        .gte('orders.created_at', dateString)
        .neq('orders.status', 'cancelled')

      if (items && items.length > 0) {
        const productMap: Record<string, number> = {}
        items.forEach((item: any) => {
          if (!productMap[item.product_name]) productMap[item.product_name] = 0
          productMap[item.product_name] += Number(item.quantity)
        })
        const bestProductName = Object.keys(productMap).reduce((a, b) => productMap[a] > productMap[b] ? a : b)
        setTopProduct({ name: bestProductName, qty: productMap[bestProductName] })
      }
      setLoading(false)
    }

    if (storeId) fetchTopPerformers()
  }, [storeId, supabase])

  if (loading) return (
    <div className="bg-white p-6 rounded-[var(--radius-card)] h-full flex items-center justify-center min-h-[160px] border border-transparent">
      <Loader2 className="animate-spin text-gray-300" size={32}/>
    </div>
  )

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 h-full">
      
      {/* TARJETA: PRODUCTO ESTRELLA */}
      <div className="bg-white p-6 rounded-[var(--radius-card)] card-interactive flex flex-col justify-between group">
        <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-yellow-50 text-yellow-600 rounded-[var(--radius-btn)] group-hover:bg-yellow-100 transition-colors">
                <Star size={20} strokeWidth={2.5} />
            </div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-gray-50 px-2 py-1 rounded-[var(--radius-badge)]">
                Últimos 30 días
            </span>
        </div>
        <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Producto Estrella</p>
            <p className="font-black text-lg text-gray-900 leading-tight truncate" title={topProduct?.name || 'N/A'}>
                {topProduct?.name || 'Sin datos suficientes'}
            </p>
            {topProduct && (
                <div className="flex items-center gap-1.5 mt-2">
                    <TrendingUp size={14} className="text-green-600"/>
                    <p className="text-xs font-bold text-gray-600">{topProduct.qty} unidades vendidas</p>
                </div>
            )}
        </div>
      </div>

      {/* TARJETA: MEJOR CLIENTE */}
      <div className="bg-white p-6 rounded-[var(--radius-card)] card-interactive flex flex-col justify-between group">
        <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-[var(--radius-btn)] group-hover:bg-blue-100 transition-colors">
                <Crown size={20} strokeWidth={2.5} />
            </div>
            {topCustomer?.phone && (
                <a href={`https://wa.me/${topCustomer.phone.replace(/\D/g, '')}`} target="_blank" className="flex items-center gap-1 text-[10px] font-bold text-green-700 bg-green-50 hover:bg-green-100 px-2.5 py-1.5 rounded-[var(--radius-badge)] transition-colors uppercase tracking-widest shadow-subtle hover:shadow-none">
                    <MessageCircle size={12}/> Fidelizar
                </a>
            )}
        </div>
        <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Mejor Cliente</p>
            <p className="font-black text-lg text-gray-900 leading-tight truncate" title={topCustomer?.name || 'N/A'}>
                {topCustomer?.name || 'Sin datos suficientes'}
            </p>
            {topCustomer && (
                <p className="text-xs font-mono font-bold text-gray-500 mt-2">
                    Total gastado: <span className="text-black">${topCustomer.spent.toFixed(2)}</span>
                </p>
            )}
        </div>
      </div>

    </div>
  )
}