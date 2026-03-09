'use client'

import { ImageIcon, ShoppingCart, Flame } from 'lucide-react'

interface ProductCardProps {
  product: any;
  pricing: {
    cashPrice: number;
    priceInBs: number;
    discountPercent: number;
    hasDiscount: boolean;
  };
  onOpen: (product: any) => void;
  isOutOfStock?: boolean; // NUEVO PROP
}

export default function ProductCard({ product, pricing, onOpen, isOutOfStock = false }: ProductCardProps) {
  const exactSavings = Number(product.usd_penalty || 0);

  return (
    <div 
      className={`break-inside-avoid md:break-inside-auto w-full group cursor-pointer flex flex-col gap-0 relative transition-all duration-300 md:hover:-translate-y-1 ${isOutOfStock ? 'opacity-60 grayscale-[50%]' : ''}`}
      onClick={() => { if (!isOutOfStock) onOpen(product) }}
    >
      <div className="relative w-full bg-gray-50 overflow-hidden border border-gray-200/60 rounded-[3px] md:aspect-[4/5]">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            loading="lazy"
            className="w-full h-auto md:h-full md:absolute md:inset-0 md:object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          />
        ) : (
          <div className="w-full aspect-[3/4] flex items-center justify-center text-gray-300">
            <ImageIcon size={24} strokeWidth={1.5} />
          </div>
        )}
        
        {/* OVERLAY AGOTADO GIGANTE (Opcional pero recomendado para UX) */}
        {isOutOfStock && (
             <div className="absolute inset-0 bg-white/20 backdrop-blur-[2px] flex items-center justify-center z-10">
                 <span className="bg-white/90 text-gray-900 text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1.5 border border-gray-200">Agotado</span>
             </div>
        )}
      </div>

      <div className="flex flex-col px-0.5 mt-3">
        
        {/* Badges Estilo Editorial */}
        {(pricing.hasDiscount || isOutOfStock) && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {pricing.hasDiscount && exactSavings > 0 && !isOutOfStock && (
              <span className="text-emerald-700 text-[11px] font-bold tracking-wide flex items-center gap-1">
                Ahorra ${exactSavings.toFixed(2)} pagando en USD 
                <Flame size={14} className="text-emerald-600 fill-emerald-600/20" />
              </span>
            )}
          </div>
        )}

        <h3 className="text-xs md:text-sm font-bold text-gray-900 tracking-tight leading-snug group-hover:text-gray-600 transition-colors line-clamp-2">
          {product.name}
        </h3>

        <div className="flex items-end justify-between gap-3 mt-1.5">
          <div className="flex flex-col min-w-0">
            <span className="text-sm md:text-base font-black text-gray-900 leading-none">
              ${pricing.cashPrice.toFixed(2)}
            </span>
            <span className="text-[10px] md:text-[11px] font-mono font-bold text-gray-400 leading-none mt-1.5">
              Bs {new Intl.NumberFormat('es-VE', { maximumFractionDigits: 2 }).format(pricing.priceInBs)}
            </span>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              if(!isOutOfStock) onOpen(product);
            }}
            disabled={isOutOfStock}
            className={`p-2 md:p-2.5 rounded-full border transition-colors flex items-center justify-center shrink-0 ${isOutOfStock ? 'bg-gray-100 text-gray-400 border-transparent cursor-not-allowed' : 'bg-white text-gray-900 border-gray-200 hover:border-black hover:bg-gray-50 active:scale-95'}`}
            aria-label="Ver producto"
          >
            <ShoppingCart className="w-4 h-4 md:w-[16px] md:h-[16px]" strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </div>
  )
}