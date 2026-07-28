'use client'

import { getOptimizedUrl } from '@/utils/cdn';
import { ImageIcon, ShoppingCart, Flame, Heart } from 'lucide-react'
import Image from 'next/image'
import { useMemo, useState } from 'react'

interface ProductCardProps {
  product: any;
  pricing: { cashPrice: number; priceInBs: number; discountPercent: number; hasDiscount: boolean; };
  onOpen: (product: any) => void;
  isOutOfStock?: boolean;
  index?: number;
  isFavorite?: boolean;
}

export default function ProductCard({ product, pricing, onOpen, isOutOfStock = false, isFavorite = false }: ProductCardProps) {
  const [isImageLoaded, setIsImageLoaded] = useState(false);

  const penalty = Number(product.usd_penalty || 0);
  const cashPrice = Number(product.usd_cash_price || 0);
  
  const listPrice = cashPrice + penalty;
  const compareAt = Number(product.compare_at_usd || 0);
  
  const activeCompareAt = compareAt > listPrice ? compareAt : listPrice;
  const isPromo = activeCompareAt > listPrice; 
  const promoPercent = isPromo ? Math.round(((activeCompareAt - listPrice) / activeCompareAt) * 100) : 0;

  const uniqueColors = useMemo(() => {
    if (!product.product_variants || !Array.isArray(product.product_variants)) return [];
    
    const colorMap = new Map();
    product.product_variants.forEach((v: any) => {
      if (v.color_hex && v.color_hex !== 'transparent' && v.color_hex !== '#transparent') {
        if (!colorMap.has(v.color_hex)) {
          colorMap.set(v.color_hex, v.color_hex);
        }
      }
    });
    return Array.from(colorMap.values());
  }, [product.product_variants]);

  return (
    <div 
      // 🚀 NATIVO: Usamos animaciones nativas por hardware sin registrar IntersectionObservers de Framer Motion
      className={`w-full group cursor-pointer flex flex-col relative transition-all duration-300 ease-out hover:-translate-y-1.5 opacity-0 animate-fade-in-up ${isOutOfStock ? 'opacity-60 grayscale-[50%]' : ''}`}
      style={{ transform: 'translate3d(0, 0, 0)' }}
      onClick={() => { if (!isOutOfStock) onOpen(product) }}
    >
      {/* IMAGE CONTAINER */}
      <div className="relative w-full bg-[var(--store-surface)] overflow-hidden rounded-[10px] aspect-[4/5] flex items-center justify-center border border-transparent group-hover:border-[var(--store-border)]/50 transition-colors">
        {product.image_url ? (
          <Image
            src={getOptimizedUrl(product.image_url)}
            alt={product.name}
            fill
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
            onLoad={() => setIsImageLoaded(true)}
            className={`object-cover transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] group-hover:scale-105 ${isImageLoaded ? 'blur-0 opacity-100' : 'blur-md opacity-0 scale-105'}`}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[var(--store-surface-text)] bg-[var(--store-bg)]">
            <ImageIcon size={32} strokeWidth={1.5} />
          </div>
        )}
        
        {isOutOfStock && (
             <div className="absolute inset-0 bg-[var(--store-surface)]/40 backdrop-blur-[2px] flex items-center justify-center z-10">
                 <span className="bg-black text-white text-[10px] font-black uppercase tracking-[0.2em] px-4 py-2 rounded-full shadow-lg">Agotado</span>
             </div>
        )}

        {isPromo && !isOutOfStock && (
            <div className="absolute top-2.5 right-2.5 md:top-3 md:right-3 z-10 bg-red-600 text-white text-[10px] md:text-xs font-black px-2.5 py-1 rounded-lg tracking-widest shadow-sm">
                -{promoPercent}%
            </div>
        )}
        
        <button 
          onClick={(e) => {
            e.stopPropagation();
            document.dispatchEvent(new CustomEvent('toggleFavorite', { detail: product }));
          }}
          className={`absolute top-2.5 left-2.5 md:top-3 md:left-3 z-20 p-2 backdrop-blur-md rounded-full transition-all shadow-sm active:scale-90 ${
            isFavorite 
              ? 'bg-red-50 text-red-500 hover:bg-red-100' 
              : 'bg-[var(--store-surface)]/80 text-[var(--store-surface-text)] hover:text-red-500 hover:bg-[var(--store-surface)]'
          }`}
          aria-label="Añadir a favoritos"
        >
          <Heart size={16} strokeWidth={2.5} className={isFavorite ? "fill-current" : ""} />
        </button>

        {uniqueColors.length > 1 && (
            <div className="absolute bottom-2.5 right-2.5 md:bottom-3 md:right-3 z-20 flex flex-col items-center gap-1.5 bg-black/25 backdrop-blur-md p-1.5 rounded-full shadow-sm pointer-events-none">
                {uniqueColors.slice(0, 3).map((colorHex, idx) => (
                    <div 
                        key={idx} 
                        className="w-3 h-3 md:w-3.5 md:h-3.5 rounded-full ring-1 ring-white/90 shadow-sm"
                        style={{ backgroundColor: colorHex }}
                    />
                ))}
                {uniqueColors.length > 3 && (
                    <span className="text-[9px] font-bold text-white tabular-nums leading-none mt-0.5 mb-0.5 tracking-tighter">
                        +{uniqueColors.length - 3}
                    </span>
                )}
            </div>
        )}
      </div>

      {/* CONTENT CONTAINER */}
      <div className="flex flex-col flex-1 pt-3 pb-1">
        <h3 className="text-xs md:text-sm font-bold text-[var(--store-text-main)] tracking-[0.05em] leading-snug group-hover:text-[var(--store-primary)] transition-colors line-clamp-2 mb-2 min-h-[2.4em] md:min-h-[2.8em]">
          {product.name}
        </h3>

        <div className="flex-1 flex flex-col justify-end gap-2 mt-auto">
          <div className="flex items-end justify-between gap-2 pt-3 border-t border-[var(--store-border)]/30">
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                {isPromo && (
                  <span className="text-[10px] md:text-xs font-bold text-[var(--store-surface-text)] line-through decoration-[var(--store-border)]">
                    ${activeCompareAt.toFixed(2)}
                  </span>
                )}
                <span className={`text-sm md:text-base font-black leading-none tracking-tight ${isPromo ? 'text-red-600' : 'text-[var(--store-text-main)]'}`}>
                  ${listPrice.toFixed(2)}
                </span>
              </div>
              <span className="text-[10px] font-mono font-bold text-[var(--store-surface-text)] leading-none mt-1.5 tabular-nums">
                Bs {new Intl.NumberFormat('es-VE', { maximumFractionDigits: 2 }).format(pricing.priceInBs)}
              </span>
            </div>

            <button
              disabled={isOutOfStock}
              className={`w-8 h-8 md:w-9 md:h-9 rounded-full border text-[var(--store-text-main)] border-[var(--store-border)] flex items-center justify-center shrink-0 transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] ${isOutOfStock ? 'bg-[var(--store-border)] text-[var(--store-surface-text)] cursor-not-allowed' : 'text-[var(--store-surface-text)] group-hover:bg-[var(--store-primary)] group-hover:text-[var(--store-primary-text)] group-hover:border-[var(--store-primary)] active:scale-90 shadow-sm'}`}
              aria-label="Ver producto"
            >
              <ShoppingCart size={14} strokeWidth={2.5} className="ml-[-1px]" />
            </button>
          </div>
        </div>

        {penalty > 0 && !isOutOfStock && (
          <div className="mt-3 inline-flex items-center gap-1.5 text-[10px] md:text-[10px] font-bold text-[var(--store-incentive)] py-1 rounded-full self-start transition-colors">
            <Flame size={12} className="text-[var(--store-incentive)] fill-[var(--store-incentive)] shrink-0" />
            <span>Paga ${cashPrice.toFixed(2)} en Divisas</span>
          </div>
        )}
      </div>
    </div>
  )
}