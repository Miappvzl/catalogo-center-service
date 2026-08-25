// components/ProductCard.tsx
'use client'

import { getOptimizedUrl } from '@/utils/cdn';
import { ImageIcon, ShoppingCart, Flame, Heart, AlertCircle, Receipt, CheckCircle2 } from 'lucide-react'
import Image from 'next/image'
import { useMemo, useState } from 'react'

interface ProductCardProps {
  product: any;
  pricing: { cashPrice: number; priceInBs: number; discountPercent: number; hasDiscount: boolean; };
  onOpen: (product: any) => void;
  isOutOfStock?: boolean;
  index?: number;
  isFavorite?: boolean;
  isCriticalStock?: boolean;
  showTaxIndicator?: boolean;
  taxPercentage?: number;
  cardStyle?: 'standard' | 'dense_hardware' | 'editorial';
}

export default function ProductCard({ 
  product, 
  pricing, 
  onOpen, 
  isOutOfStock = false, 
  isFavorite = false, 
  isCriticalStock = false, 
  showTaxIndicator = false, 
  taxPercentage = 16,
  cardStyle = 'standard'
}: ProductCardProps) {
  const [isImageLoaded, setIsImageLoaded] = useState(false);

  const penalty = Number(product.usd_penalty || 0);
  const cashPrice = Number(product.usd_cash_price || 0);
  const listPrice = cashPrice + penalty;
  const compareAt = Number(product.compare_at_usd || 0);
  const activeCompareAt = compareAt > listPrice ? compareAt : listPrice;
  const isPromo = activeCompareAt > listPrice; 
  const promoPercent = isPromo ? Math.round(((activeCompareAt - listPrice) / activeCompareAt) * 100) : 0;

  const isTaxable = !product.is_tax_exempt;
  const taxAmountUsd = isTaxable ? listPrice * (taxPercentage / 100) : 0;

  const uniqueColors = useMemo(() => {
    if (!product.product_variants || !Array.isArray(product.product_variants)) return [];
    const colorMap = new Map();
    product.product_variants.forEach((v: any) => {
      if (v.color_hex && v.color_hex !== 'transparent' && v.color_hex !== '#transparent') {
        if (!colorMap.has(v.color_hex)) colorMap.set(v.color_hex, v.color_hex);
      }
    });
    return Array.from(colorMap.values());
  }, [product.product_variants]);

  // =========================================================================
  // 🛠️ VARIANTE: TEMA 2 (DENSE HARDWARE CARD / ALTA DENSIDAD)
  // =========================================================================
  if (cardStyle === 'dense_hardware') {
    return (
      <div 
        className={`w-full h-full group cursor-pointer flex flex-col bg-[var(--store-surface)] border-[length:var(--border-width-ui)] border-[var(--store-border)] hover:border-[var(--store-primary)] transition-all duration-200 relative overflow-hidden rounded-[var(--radius-card)] shadow-[var(--shadow-ui)] ${isOutOfStock ? 'opacity-60 grayscale-[40%]' : ''}`}
        style={{ transform: 'translate3d(0, 0, 0)' }}
        onClick={() => { if (!isOutOfStock) onOpen(product) }}
      >
        {/* 1. ENCUADRE TÉCNICO 1:1 (Aspecto Cuadrado Sin Espacio Muerto) */}
        <div className="relative w-full aspect-square bg-[var(--store-bg)] flex items-center justify-center overflow-hidden border-b-[length:var(--border-width-ui)] border-[var(--store-border)]/40 p-2">
          {product.image_url ? (
            <Image
              src={getOptimizedUrl(product.image_url)}
              alt={product.name}
              fill
              sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 20vw"
              onLoad={() => setIsImageLoaded(true)}
              className={`object-contain p-4 transition-transform duration-300 group-hover:scale-105 ${isImageLoaded ? 'opacity-100' : 'opacity-0'}`}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[var(--store-surface-text)]">
              <ImageIcon size={28} strokeWidth={1.5} />
            </div>
          )}

        {/* 🚦 SEMÁFORO DE STOCK TÉCNICO (Estático & Nítido) */}
          <div className="absolute top-2 left-2 z-10 flex flex-col gap-1">
            {isOutOfStock ? (
              <span className="bg-[var(--store-badge-soldout-bg)] text-[var(--store-badge-soldout-text)] text-[8px] md:text-[9px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-[var(--radius-btn)] border border-[var(--store-badge-soldout-bg)]">
                Agotado
              </span>
            ) : isCriticalStock ? (
              <span className="bg-amber-50 text-amber-900 text-[8px] md:text-[9px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-[var(--radius-btn)] border border-amber-300 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                Últimas {product.stock}
              </span>
            ) : (
              <span className="bg-emerald-50 text-emerald-800 text-[8px] md:text-[9px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-[var(--radius-btn)] border border-emerald-200/80 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 shrink-0" />
                En Stock
              </span>
            )}
          </div>
{/* BADGE DE DESCUENTO PROMO */}
          {isPromo && !isOutOfStock && (
            <div className="absolute top-2 right-2 z-10 bg-[var(--store-badge-discount-bg)] text-[var(--store-badge-discount-text)] text-[9px] font-mono font-black px-1.5 py-0.5 rounded-[var(--radius-btn)]">
              -{promoPercent}%
            </div>
          )}

         {/* BOTÓN DE FAVORITO */}
          <button 
            onClick={(e) => {
              e.stopPropagation();
              document.dispatchEvent(new CustomEvent('toggleFavorite', { detail: product }));
            }}
            className={`absolute bottom-2 right-2 z-20 p-1.5 rounded-[var(--radius-btn)] border-[length:var(--border-width-ui)] transition-all ${
              isFavorite 
                ? 'text-[var(--store-action-favorite)] border-[var(--store-action-favorite)]' 
                : 'bg-[var(--store-surface)]/90 text-[var(--store-surface-text)] border-[var(--store-border)] hover:text-[var(--store-action-favorite)] hover:border-[var(--store-action-favorite)]'
            }`}
            style={isFavorite ? { backgroundColor: 'color-mix(in srgb, var(--store-action-favorite) 15%, transparent)', borderColor: 'color-mix(in srgb, var(--store-action-favorite) 30%, transparent)' } : {}}
            aria-label="Favorito"
          >
            <Heart size={14} strokeWidth={2.2} className={isFavorite ? "fill-current" : ""} />
          </button>
        </div>

        {/* 2. CAJA DE INFORMACIÓN TÉCNICA (Compacta & Directa) */}
        <div className="p-2.5 md:p-3 flex flex-col flex-1 justify-between gap-1.5">
          
          {/* Categoría / Rubro */}
          <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-[var(--store-surface-text)] truncate">
            {product.category || 'General'}
          </span>

          {/* Título de Producto */}
          <h3 className="text-xs md:text-[13px] font-bold text-[var(--store-text-main)] leading-snug line-clamp-2 min-h-[2.4em] group-hover:text-[var(--store-primary)] transition-colors">
            {product.name}
          </h3>

          {/* 3. MÓDULO FINANCIERO Y COMPRA */}
          <div className="pt-2 border-t border-[var(--store-border)]/40 flex items-end justify-between gap-1.5 mt-auto">
            <div className="flex flex-col min-w-0">
              {isPromo && (
                <span className="text-[9px] font-bold text-[var(--store-surface-text)] line-through">
                  ${activeCompareAt.toFixed(2)}
                </span>
              )}
              <span className="text-sm md:text-base font-black text-[var(--store-text-main)] leading-none tracking-tight">
                ${listPrice.toFixed(2)}
              </span>
              <span className="text-[10px] font-mono font-bold text-[var(--store-surface-text)] mt-1 leading-none tabular-nums">
                Bs {new Intl.NumberFormat('es-VE', { maximumFractionDigits: 2 }).format(pricing.priceInBs)}
              </span>
              
              {showTaxIndicator && isTaxable && (
                <span className="text-[8px] font-mono text-[var(--store-surface-text)] mt-1">
                  +${taxAmountUsd.toFixed(2)} IVA
                </span>
              )}
            </div>

            {/* Botón Técnico de Compra Angular */}
            <button
              disabled={isOutOfStock}
              className={`w-8 h-8 rounded-[var(--radius-btn)] border-[length:var(--border-width-ui)] border-[var(--store-border)] flex items-center justify-center shrink-0 transition-all ${
                isOutOfStock 
                  ? 'bg-neutral-100 text-neutral-400 cursor-not-allowed' 
                  : 'bg-[var(--store-surface)] text-[var(--store-text-main)] group-hover:bg-[var(--store-primary)] group-hover:text-[var(--store-primary-text)] group-hover:border-[var(--store-primary)] active:scale-95 shadow-xs'
              }`}
              aria-label="Ver detalles"
            >
              <ShoppingCart size={14} strokeWidth={2.2} />
            </button>
          </div>

          {/* Micro-badge de Ahorro en Divisas */}
          {penalty > 0 && !isOutOfStock && (
            <div className="mt-1 flex items-center gap-1 text-[9px] font-bold text-[var(--store-incentive)] font-mono">
              <Flame size={11} className="text-[var(--store-incentive)] shrink-0 fill-current" />
              <span className="truncate">Paga ${cashPrice.toFixed(2)} Divisa</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // =========================================================================
  // 💎 VARIANTE: TEMA 3 (EDITORIAL LUXURY CARD)
  // =========================================================================
  if (cardStyle === 'editorial') {
    return (
      <div 
        className={`w-full h-full group cursor-pointer flex flex-col relative transition-all duration-700 ease-out hover:-translate-y-2 opacity-0 animate-fade-in-up ${isOutOfStock ? 'opacity-50' : ''}`}
        style={{ transform: 'translate3d(0, 0, 0)' }}
        onClick={() => { if (!isOutOfStock) onOpen(product) }}
      >
        {/* 1. ENCUADRE EDITORIAL (Aspecto 3:4 - Estilo Revista) */}
        <div className="relative w-full aspect-[3/4] bg-[var(--store-surface)] overflow-hidden rounded-[var(--radius-card)] shadow-[var(--shadow-ui)] mb-4 md:mb-5 border-[length:var(--border-width-ui)] border-transparent group-hover:border-[var(--store-border)]/50 transition-colors">
          {product.image_url ? (
            <Image
              src={getOptimizedUrl(product.image_url)}
              alt={product.name}
              fill
              sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
              onLoad={() => setIsImageLoaded(true)}
              className={`object-cover transition-transform duration-1000 ease-[cubic-bezier(0.25,1,0.5,1)] group-hover:scale-105 ${isImageLoaded ? 'opacity-100' : 'opacity-0'}`}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[var(--store-surface-text)]">
              <ImageIcon size={24} strokeWidth={1} />
            </div>
          )}

    {/* Badges Minimalistas (Lookbook Tag con porcentaje real) */}
          <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5">
            {isOutOfStock ? (
              <span className="text-[8px] font-bold uppercase tracking-[0.2em] text-[var(--store-badge-soldout-text)] bg-[var(--store-badge-soldout-bg)]/80 backdrop-blur-md px-2.5 py-1 rounded-[var(--radius-btn)]">Agotado</span>
            ) : isPromo ? (
              <span className="text-[9px] font-price font-bold tracking-widest text-[var(--store-text-main)] bg-[var(--store-bg)]/95 backdrop-blur-md px-2.5 py-1 rounded-[var(--radius-btn)] border border-[var(--store-border)]/50 shadow-sm">
                -{promoPercent}%
              </span>
            ) : null}
          </div>
{/* Favorito Sutil */}
          <button 
            onClick={(e) => { e.stopPropagation(); document.dispatchEvent(new CustomEvent('toggleFavorite', { detail: product })); }}
            className={`absolute top-3 right-3 z-20 p-2 transition-opacity duration-500 ${isFavorite ? 'opacity-100 text-[var(--store-action-favorite)]' : 'opacity-0 group-hover:opacity-100 text-[var(--store-text-main)] hover:text-[var(--store-action-favorite)]'}`}
          >
            <Heart size={18} strokeWidth={1.5} className={isFavorite ? "fill-current" : ""} />
          </button>

          {/* Quick Add Hover (Solo Desktop) */}
          {!isOutOfStock && (
            <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hidden md:block z-20">
              <button className="w-full bg-[var(--store-bg)]/95 backdrop-blur-md text-[var(--store-text-main)] py-3.5 text-[9px] font-bold uppercase tracking-[0.2em] hover:bg-[var(--store-text-main)] hover:text-[var(--store-bg)] transition-colors rounded-[var(--radius-btn)] shadow-sm">
                Añadir a la bolsa
              </button>
            </div>
          )}
        </div>

        {/* 2. INFO EDITORIAL CENTRADA */}
        <div className="flex flex-col items-center text-center px-2 flex-1">
          <span className="text-[9px] font-bold uppercase tracking-[0.25em] text-[var(--store-surface-text)] mb-2">{product.category || 'Boutique'}</span>
          
          <h3 className="text-sm md:text-base font-black text-[var(--store-text-main)] leading-snug mb-2.5 font-heading line-clamp-2">
            {product.name}
          </h3>
          
          <div className="flex items-center justify-center gap-2.5 mt-auto">
            {isPromo && (
              <span className="text-xs text-[var(--store-surface-text)] line-through decoration-[0.5px]">
                ${activeCompareAt.toFixed(2)}
              </span>
            )}
            <span className={`text-sm md:text-base font-medium tracking-wide ${isPromo ? 'text-red-800' : 'text-[var(--store-text-main)]'}`}>
              ${listPrice.toFixed(2)}
            </span>
          </div>
          
          <span className="text-[10px] text-[var(--store-surface-text)] mt-1.5 font-medium">
            Bs {new Intl.NumberFormat('es-VE', { maximumFractionDigits: 2 }).format(pricing.priceInBs)}
          </span>
        </div>
      </div>
    );
  }

  // =========================================================================
  // 🌟 VARIANTE: TEMA 1 (STANDARD / UNIVERSAL PREZISO CARD)
  // =========================================================================
  return (
    <div 
      className={`w-full h-full group cursor-pointer flex flex-col relative transition-all duration-300 ease-out hover:-translate-y-1.5 opacity-0 animate-fade-in-up ${isOutOfStock ? 'opacity-60 grayscale-[50%]' : ''}`}
      style={{ transform: 'translate3d(0, 0, 0)' }}
      onClick={() => { if (!isOutOfStock) onOpen(product) }}
    >
      {/* Contenedor de Imagen */}
      <div className="relative w-full bg-[var(--store-surface)] overflow-hidden rounded-[var(--radius-card)] shadow-[var(--shadow-ui)] aspect-[4/5] flex items-center justify-center border-[length:var(--border-width-ui)] border-transparent group-hover:border-[var(--store-border)]/50 transition-all">
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
            <span className="bg-[var(--store-badge-soldout-bg)] text-[var(--store-badge-soldout-text)] text-[10px] font-black uppercase tracking-[0.2em] px-4 py-2 rounded-[var(--radius-btn)] shadow-[var(--shadow-ui)]">Agotado</span>
          </div>
        )}

        {isCriticalStock && !isOutOfStock && (
          <div className="absolute top-2.5 left-2.5 md:top-3 md:left-3 z-10 bg-red-600/90 backdrop-blur-md text-white px-2.5 py-1.5 rounded-[var(--radius-btn)] shadow-[var(--shadow-ui)] flex items-center gap-1.5 animate-in fade-in zoom-in duration-300">
            <AlertCircle size={12} strokeWidth={2.5} className="animate-pulse" />
            <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest leading-none mt-px">
              Últimas {product.stock}
            </span>
          </div>
        )}

      {isPromo && !isOutOfStock && (
          <div className="absolute top-2.5 right-2.5 md:top-3 md:right-3 z-10 bg-[var(--store-badge-discount-bg)] text-[var(--store-badge-discount-text)] text-[10px] md:text-xs font-black px-2.5 py-1 rounded-[var(--radius-btn)] tracking-widest shadow-[var(--shadow-ui)]">
            -{promoPercent}%
          </div>
        )}
        
        {/* Botón de Favorito */}
        <button 
          onClick={(e) => {
            e.stopPropagation();
            document.dispatchEvent(new CustomEvent('toggleFavorite', { detail: product }));
          }}
          className={`absolute bottom-2.5 left-2.5 md:bottom-3 md:left-3 z-20 p-2 backdrop-blur-md rounded-[var(--radius-btn)] border-[length:var(--border-width-ui)] transition-all shadow-[var(--shadow-ui)] active:scale-90 ${
            isFavorite 
              ? 'text-[var(--store-action-favorite)] border-transparent' 
              : 'bg-[var(--store-surface)]/80 text-[var(--store-surface-text)] border-[var(--store-border)]/30 hover:text-[var(--store-action-favorite)] hover:bg-[var(--store-surface)]'
          }`}
          style={isFavorite ? { backgroundColor: 'color-mix(in srgb, var(--store-action-favorite) 15%, transparent)' } : {}}
          aria-label="Añadir a favoritos"
        >
          <Heart size={16} strokeWidth={2.5} className={isFavorite ? "fill-current" : ""} />
        </button>

        {uniqueColors.length > 1 && (
          <div className="absolute bottom-2.5 right-2.5 md:bottom-3 md:right-3 z-20 flex flex-col items-center gap-1.5 bg-black/25 backdrop-blur-md p-1.5 rounded-full shadow-sm pointer-events-none">
            {uniqueColors.slice(0, 3).map((colorHex, idx) => (
              <div key={idx} className="w-3 h-3 md:w-3.5 md:h-3.5 rounded-full ring-1 ring-white/90 shadow-sm" style={{ backgroundColor: colorHex }} />
            ))}
            {uniqueColors.length > 3 && (
              <span className="text-[9px] font-bold text-white tabular-nums leading-none mt-0.5 mb-0.5 tracking-tighter">
                +{uniqueColors.length - 3}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Contenido Editorial */}
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

              {showTaxIndicator && isTaxable && (
                <div className="mt-2 flex items-center">
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[var(--radius-btn)] bg-[var(--store-surface-text)]/10 text-[var(--store-surface-text)] text-[8px] md:text-[9px] font-black uppercase tracking-widest">
                    <Receipt size={10} /> + ${taxAmountUsd.toFixed(2)} IVA
                  </span>
                </div>
              )}
            </div>

            <button
              disabled={isOutOfStock}
              className={`w-8 h-8 md:w-9 md:h-9 rounded-[var(--radius-btn)] border-[length:var(--border-width-ui)] shadow-[var(--shadow-ui)] text-[var(--store-text-main)] border-[var(--store-border)] flex items-center justify-center shrink-0 transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] ${isOutOfStock ? 'bg-[var(--store-border)] text-[var(--store-surface-text)] cursor-not-allowed' : 'text-[var(--store-surface-text)] group-hover:bg-[var(--store-primary)] group-hover:text-[var(--store-primary-text)] group-hover:border-[var(--store-primary)] active:scale-90'}`}
              aria-label="Ver producto"
            >
              <ShoppingCart size={14} strokeWidth={2.5} className="ml-[-1px]" />
            </button>
          </div>
        </div>

        {penalty > 0 && !isOutOfStock && (
          <div className="mt-3 inline-flex items-center gap-1.5 text-[10px] md:text-[10px] font-bold text-[var(--store-incentive)] py-1 rounded-[var(--radius-btn)] self-start transition-colors">
            <Flame size={12} className="text-[var(--store-incentive)] fill-[var(--store-incentive)] shrink-0" />
            <span>Paga ${cashPrice.toFixed(2)} en Divisas</span>
          </div>
        )}
      </div>
    </div>
  )
}