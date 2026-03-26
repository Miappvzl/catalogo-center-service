'use client'

import { ImageIcon, ShoppingCart, Banknote } from 'lucide-react'

interface ProductCardProps {
  product: any;
  pricing: { cashPrice: number; priceInBs: number; discountPercent: number; hasDiscount: boolean; };
  onOpen: (product: any) => void;
  isOutOfStock?: boolean;
}

export default function ProductCard({ product, pricing, onOpen, isOutOfStock = false }: ProductCardProps) {
  const penalty = Number(product.usd_penalty || 0);
  const cashPrice = Number(product.usd_cash_price || 0);
  
  // 🚀 LÓGICA DE PRECIO PÚBLICO SINCERO (Se mantiene de la iteración anterior)
  const listPrice = cashPrice + penalty;
  const compareAt = Number(product.compare_at_usd || 0);
  
  const activeCompareAt = compareAt > listPrice ? compareAt : listPrice;
  const isPromo = activeCompareAt > listPrice; 
  const promoPercent = isPromo ? Math.round(((activeCompareAt - listPrice) / activeCompareAt) * 100) : 0;

  return (
    <div 
      className={`w-full group cursor-pointer flex flex-col relative transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] hover:-translate-y-1.5 ${isOutOfStock ? 'opacity-60 grayscale-[50%]' : ''}`}
      onClick={() => { if (!isOutOfStock) onOpen(product) }}
    >
     {/* 🚀 IMAGE CONTAINER: EDGE-TO-EDGE */}
      <div className="relative w-full bg-white overflow-hidden rounded-[4px] aspect-[4/5] flex items-center justify-center">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300 bg-[#F8F9FA]">
            <ImageIcon size={32} strokeWidth={1.5} />
          </div>
        )}
        {/* OVERLAY AGOTADO */}
        {isOutOfStock && (
             <div className="absolute inset-0 bg-white/40 backdrop-blur-[2px] flex items-center justify-center z-10">
                 <span className="bg-black text-white text-[10px] font-black uppercase tracking-[0.2em] px-4 py-2 rounded-full">Agotado</span>
             </div>
        )}

        {/* ETIQUETA DE DESCUENTO ESTILO CLEAN */}
        {isPromo && !isOutOfStock && (
            <div className="absolute top-2.5 right-2.5 md:top-3 md:right-3 z-10 bg-red-600 text-white text-[10px] md:text-xs font-black px-2.5 py-1 rounded-lg tracking-widest shadow-sm">
                -{promoPercent}%
            </div>
        )}
      </div>

      {/* 🚀 CONTENT CONTAINER: AUTO-ALIGNMENT INYECTADO */}
      <div className="flex flex-col flex-1 pt-3 pb-1">
        
        <h3 className="text-xs md:text-sm font-bold text-gray-900 tracking-tight leading-snug group-hover:text-gray-500 transition-colors line-clamp-2 mb-2 min-h-[2.4em] md:min-h-[2.8em]">
          {product.name}
        </h3>

        {/* CONTENEDOR FLEXIBLE QUE EMPUJA EL PRECIO AL FONDO PARA ALINEACIÓN PERFECTA */}
        {/* ELIMINADO: mt-auto. INYECTADO: flex-1 flex flex-col justify-end */}
        <div className="flex-1 flex flex-col justify-end gap-2 mt-auto">
          
          <div className="flex items-end justify-between gap-2 border-t border-gray-100 pt-3">
            <div className="flex flex-col min-w-0">
              {/* PRECIO PÚBLICO REAL */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {isPromo && (
                  <span className="text-[10px] md:text-xs font-bold text-gray-400 line-through decoration-gray-300">
                    ${activeCompareAt.toFixed(2)}
                  </span>
                )}
                <span className={`text-sm md:text-base font-black leading-none tracking-tight ${isPromo ? 'text-red-600' : 'text-gray-900'}`}>
                  ${listPrice.toFixed(2)}
                </span>
              </div>
              <span className="text-[10px] font-mono font-bold text-gray-400 leading-none mt-1.5 tabular-nums">
                Bs {new Intl.NumberFormat('es-VE', { maximumFractionDigits: 2 }).format(pricing.priceInBs)}
              </span>
            </div>

            {/* 🚀 BOTÓN FIJO: SIEMPRE EN EL MISMO LUGAR */}
            <button
              disabled={isOutOfStock}
              className={`w-8 h-8 md:w-9 md:h-9 rounded-full border border-gray-200/60 flex items-center justify-center shrink-0 transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] ${isOutOfStock ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-gray-50 text-gray-900 group-hover:bg-black group-hover:text-white active:scale-90'}`}
              aria-label="Ver producto"
            >
              <ShoppingCart size={14} strokeWidth={2.5} className="ml-[-1px]" />
            </button>
          </div>
        </div>

        {/* NUDGE HONESTO Y LIMPIO */}
        {penalty > 0 && !isOutOfStock && (
          <div className="mt-3 inline-flex items-center gap-1.5 text-[9px] md:text-[10px] font-bold text-emerald-700 bg-emerald-50/80 px-2 py-1.5 rounded-md self-start transition-colors group-hover:bg-emerald-100/50">
            <Banknote size={12} className="text-emerald-600 shrink-0" />
            <span>Paga ${cashPrice.toFixed(2)} en DIvisas</span>
          </div>
        )}
      </div>
    </div>
  )
}