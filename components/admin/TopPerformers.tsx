'use client'

import { useState, useEffect } from 'react'
import { getSupabase } from '@/lib/supabase-client'
import { Crown, Star, Loader2, MessageCircle, TrendingUp } from 'lucide-react'
import Image from 'next/image'
import { getOptimizedUrl } from '@/utils/cdn'

export default function TopPerformers({ storeId }: { storeId: string }) {
  const supabase = getSupabase()
  const [loading, setLoading] = useState(true)
  // 🚀 Añadimos imageUrl al estado del producto
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
      // 🚀 Añadimos product_id a la selección
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
        
        // 🚀 Buscamos la imagen en la tabla products usando el ID o el Nombre
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
    <div className="bg-white p-6 rounded-[var(--radius-card)] h-full flex items-center justify-center min-h-[160px] shadow-none">
      <Loader2 className="animate-spin text-gray-300" size={28}/>
    </div>
  )

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6 h-full">
      
      {/* 🚀 TARJETA: PRODUCTO ESTRELLA */}
      {/* Aumentamos a md:min-h-[240px] para darle espacio a la imagen gigante */}
      <div className="bg-white p-6 rounded-[var(--radius-card)] flex flex-col justify-between group transition-all duration-500 ease-out active:scale-[0.98] active:bg-[#fafafa] hover:shadow-[0_4px_20px_-10px_rgba(0,0,0,0.04)] min-h-[160px] md:min-h-[240px] cursor-default relative overflow-hidden">
        
        {/* 🚀 MINIATURA DESKTOP (Centro Absoluto, Gigante y Sin Sombra) */}
        {topProduct?.imageUrl && (
            <div className="hidden md:block absolute w-36 h-36 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-xl overflow-hidden group-hover:scale-110 transition-transform duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] z-10 pointer-events-none">
                <Image 
                    src={getOptimizedUrl(topProduct.imageUrl)} 
                    alt={topProduct.name} 
                    fill 
                    className="object-cover"
                    sizes="144px"
                />
            </div>
        )}

        <div className="flex justify-between items-start mb-6 relative z-20">
            <div className="w-11 h-11 rounded-[var(--radius-btn)] bg-[#f6f6f6] text-gray-900 group-hover:bg-black group-hover:text-white transition-all duration-500 ease-out flex items-center justify-center shrink-0">
                <Star size={18} strokeWidth={2.2} className="group-hover:scale-110 transition-transform duration-500 ease-out" />
            </div>
            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest bg-[#f6f6f6] px-2.5 py-1 rounded-[var(--radius-badge)]">
                Últimos 30 días
            </span>
        </div>
        
        <div className="relative z-20 mt-auto flex items-center gap-3 md:block">
            
            {/* 🚀 MINIATURA MOBILE (Al lado del texto, se mantiene igual) */}
            {topProduct?.imageUrl && (
                <div className="md:hidden shrink-0 relative rounded-lg overflow-hidden border border-gray-100 bg-gray-50 w-12 h-12 z-10">
                    <Image 
                        src={getOptimizedUrl(topProduct.imageUrl)} 
                        alt={topProduct.name} 
                        fill 
                        className="object-cover"
                        sizes="48px"
                    />
                </div>
            )}

            {/* 🚀 Textos */}
            <div className="min-w-0 relative z-20">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 group-hover:text-gray-900 transition-colors duration-500 ease-out">
                    Producto Estrella
                </p>
                <p className="font-black text-xl text-gray-900 leading-tight truncate tracking-tighter group-hover:translate-x-0.5 transition-transform duration-500 ease-out" title={topProduct?.name || 'N/A'}>
                    {topProduct?.name || 'Datos Insuficientes'}
                </p>
                {topProduct && (
                    <div className="flex items-center gap-1.5 mt-2.5">
                        <TrendingUp size={14} strokeWidth={2.5} className="text-gray-400 group-hover:text-gray-900 transition-colors duration-500 ease-out"/>
                        <p className="text-[11px] font-mono font-bold text-gray-500 uppercase tracking-widest group-hover:text-gray-900 transition-colors duration-500 ease-out">
                            <span className="text-gray-900 tabular-nums">{topProduct.qty}</span> uds vendidas
                        </p>
                    </div>
                )}
            </div>
        </div>
      </div>

      {/* 🚀 TARJETA: MEJOR CLIENTE (También ajustamos su altura para que queden simétricas) */}
      <div className="bg-white p-6 rounded-[var(--radius-card)] flex flex-col justify-between group transition-all duration-500 ease-out active:scale-[0.98] active:bg-[#fafafa] hover:shadow-[0_4px_20px_-10px_rgba(0,0,0,0.04)] min-h-[160px] md:min-h-[240px] cursor-default relative overflow-hidden">
        <div className="flex justify-between items-start mb-6 relative z-10">
            <div className="w-11 h-11 rounded-[var(--radius-btn)] bg-[#f6f6f6] text-gray-900 group-hover:bg-black group-hover:text-white transition-all duration-500 ease-out flex items-center justify-center shrink-0">
                <Crown size={18} strokeWidth={2.2} className="group-hover:scale-110 transition-transform duration-500 ease-out" />
            </div>
            
            {topCustomer?.phone && (
                <a 
                    href={`https://wa.me/${topCustomer.phone.replace(/\D/g, '')}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="group/btn flex items-center gap-1.5 bg-[#f6f6f6] hover:bg-black text-gray-500 hover:text-white px-3 py-1.5 rounded-full transition-all duration-300 ease-out active:scale-[0.95]"
                >
                    <span className="w-1.5 h-1.5 rounded-full bg-[#00cd61] shadow-[0_0_4px_rgba(0,205,97,0.4)]"></span>
                    <span className="text-[9px] font-bold uppercase tracking-widest mt-[1px]">Fidelizar</span>
                    <MessageCircle size={12} strokeWidth={2.5} className="group-hover/btn:-translate-y-0.5 group-hover/btn:translate-x-0.5 transition-transform duration-300 ease-out"/>
                </a>
            )}
        </div>
        
        <div className="relative z-10 mt-auto">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 group-hover:text-gray-900 transition-colors duration-500 ease-out">
                Mejor Cliente
            </p>
            <p className="font-black text-xl text-gray-900 leading-tight truncate tracking-tighter group-hover:translate-x-0.5 transition-transform duration-500 ease-out" title={topCustomer?.name || 'N/A'}>
                {topCustomer?.name || 'Datos Insuficientes'}
            </p>
            {topCustomer && (
                <div className="flex items-center gap-1.5 mt-2.5">
                    <p className="text-[11px] font-mono font-bold text-gray-500 uppercase tracking-widest group-hover:text-gray-900 transition-colors duration-500 ease-out">
                        Volumen: <span className="text-gray-900 tabular-nums">${topCustomer.spent.toFixed(2)}</span>
                    </p>
                </div>
            )}
        </div>
      </div>

    </div>
  )
}