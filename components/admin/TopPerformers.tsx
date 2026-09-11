'use client'

import { useState, useEffect } from 'react'
import { getSupabase } from '@/lib/supabase-client'
import { Crown, Star, Loader2, MessageCircle, TrendingUp } from 'lucide-react'
import Image from 'next/image'
import { getOptimizedUrl } from '@/utils/cdn'

export default function TopPerformers({ storeId }: { storeId: string }) {
  const supabase = getSupabase()
  const [loading, setLoading] = useState(true)
  const [topProduct, setTopProduct] = useState<{ name: string, qty: number, imageUrl?: string } | null>(null)
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
        .select('product_id, product_name, quantity, orders!inner(store_id, created_at, status)')
        .eq('orders.store_id', storeId)
        .gte('orders.created_at', dateString)
        .neq('orders.status', 'cancelled')

      if (items && items.length > 0) {
        const productMap: Record<string, { qty: number, id: string }> = {}
        items.forEach((item: any) => {
          if (!productMap[item.product_name]) productMap[item.product_name] = { qty: 0, id: item.product_id }
          productMap[item.product_name].qty += Number(item.quantity)
        })
        
        const bestProductName = Object.keys(productMap).reduce((a, b) => productMap[a].qty > productMap[b].qty ? a : b)
        const bestProductData = productMap[bestProductName]
        
        let imageUrl = undefined
        
        if (bestProductData.id) {
          const { data: pData } = await supabase
            .from('products')
            .select('image_url')
            .eq('id', bestProductData.id)
            .maybeSingle()
            
          if (pData?.image_url) imageUrl = pData.image_url
        }

        setTopProduct({ 
          name: bestProductName, 
          qty: bestProductData.qty,
          imageUrl
        })
      }
      setLoading(false)
    }

    if (storeId) fetchTopPerformers()
  }, [storeId, supabase])

  if (loading) return (
    <div className="bg-white p-5 rounded-xl h-full flex items-center justify-center min-h-[220px] shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
      <Loader2 className="animate-spin text-neutral-300" size={20}/>
    </div>
  )

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 h-full">
      
      {/* 🚀 TARJETA: PRODUCTO ESTRELLA (Imagen Centrada en Desktop) */}
      <div className="bg-white p-5 md:p-6 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex flex-col justify-between min-h-[260px] md:min-h-[300px] relative overflow-hidden group">
        
        {/* Cabecera */}
        <div className="flex justify-between items-start">
          <div className="w-8 h-8 rounded-lg bg-[#F6F6F6] text-neutral-900 flex items-center justify-center shrink-0">
            <Star size={15} strokeWidth={2.2} />
          </div>
          <span className="text-[9px] font-mono font-semibold text-neutral-400 uppercase tracking-wider bg-[#F6F6F6] px-2 py-0.5 rounded">
            Últimos 30 días
          </span>
        </div>
        
        {/* IMAGEN EN MEDIO DE LA TARJETA (Aprovecha el espacio central) */}
        <div className="my-auto py-2 flex items-center justify-center">
          {topProduct?.imageUrl ? (
            <div className="relative w-24 h-24 md:w-28 md:h-28 rounded-xl bg-[#F6F6F6] border border-neutral-100/80 overflow-hidden shadow-xs group-hover:scale-105 transition-transform duration-500 flex items-center justify-center">
              <Image 
                src={getOptimizedUrl(topProduct.imageUrl)} 
                alt={topProduct.name} 
                fill 
                className="object-cover mix-blend-multiply"
                sizes="112px"
              />
            </div>
          ) : (
            <div className="w-20 h-20 rounded-xl bg-[#F6F6F6] flex items-center justify-center text-neutral-300">
              <Star size={24} />
            </div>
          )}
        </div>

        {/* Pie de Datos */}
        <div className="pt-2 border-t border-neutral-100/60">
          <p className="text-[9px] font-mono font-semibold text-neutral-400 uppercase tracking-wider mb-0.5">
            Producto Estrella
          </p>
          <p className="font-bold text-sm text-neutral-900 truncate leading-snug" title={topProduct?.name || 'N/A'}>
            {topProduct?.name || 'Datos Insuficientes'}
          </p>
          {topProduct && (
            <div className="flex items-center gap-1.5 mt-1 text-[10px] font-mono text-neutral-500">
              <TrendingUp size={11} strokeWidth={2.2} className="text-emerald-600" />
              <span>
                <strong className="text-neutral-900 font-bold tabular-nums">{topProduct.qty}</strong> unidades vendidas
              </span>
            </div>
          )}
        </div>
      </div>

      {/* TARJETA: MEJOR CLIENTE (Simetría de Altura) */}
      <div className="bg-white p-5 md:p-6 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex flex-col justify-between min-h-[260px] md:min-h-[300px] relative overflow-hidden group">
        <div className="flex justify-between items-start">
          <div className="w-8 h-8 rounded-lg bg-[#F6F6F6] text-neutral-900 flex items-center justify-center shrink-0">
            <Crown size={15} strokeWidth={2.2} />
          </div>
          
          {topCustomer?.phone && (
            <a 
              href={`https://wa.me/${topCustomer.phone.replace(/\D/g, '')}`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 bg-[#F6F6F6] hover:bg-neutral-900 text-neutral-600 hover:text-white px-2.5 py-1 rounded-md text-[9px] font-mono font-bold uppercase tracking-wider transition-colors active:scale-95"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Fidelizar</span>
              <MessageCircle size={10} strokeWidth={2.5} />
            </a>
          )}
        </div>
        
        {/* Zona Central: Escudo Visual / Inicial de Cliente */}
        <div className="my-auto py-2 flex items-center justify-center">
          <div className="w-20 h-20 rounded-full bg-[#F6F6F6] border border-neutral-100 flex items-center justify-center text-neutral-400 group-hover:scale-105 transition-transform duration-500">
            <Crown size={28} strokeWidth={1.5} />
          </div>
        </div>

        {/* Pie de Datos */}
        <div className="pt-2 border-t border-neutral-100/60">
          <p className="text-[9px] font-mono font-semibold text-neutral-400 uppercase tracking-wider mb-0.5">
            Mejor Cliente
          </p>
          <p className="font-bold text-sm text-neutral-900 truncate leading-snug" title={topCustomer?.name || 'N/A'}>
            {topCustomer?.name || 'Datos Insuficientes'}
          </p>
          {topCustomer && (
            <div className="flex items-center gap-1.5 mt-1 text-[10px] font-mono text-neutral-500">
              <span>Volumen:</span>
              <strong className="text-neutral-900 font-bold tabular-nums">${topCustomer.spent.toFixed(2)} USD</strong>
            </div>
          )}
        </div>
      </div>

    </div>
  )
}