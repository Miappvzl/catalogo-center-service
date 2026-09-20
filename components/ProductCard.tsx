// components/ProductCard.tsx
'use client'

import { getOptimizedUrl } from '@/utils/cdn';
import { ImageIcon, ShoppingCart, Flame, Heart, AlertCircle, Receipt, CheckCircle2, Plus, Zap, X } from 'lucide-react'
import Image from 'next/image'
import { useMemo, useState, memo, useCallback } from 'react'

// 🚀 SINGLETON DE ALTO RENDIMIENTO (Cero garbage collection en render loops)
const currencyFormatter = new Intl.NumberFormat('es-VE', { maximumFractionDigits: 2 });

interface ProductCardProps {
  product: any;
  pricing: {
    cashPrice: number;
    priceInBs: number;
    discountPercent: number;
    hasDiscount: boolean;
  };
  onOpen: (product: any) => void;
  isOutOfStock?: boolean;
  index?: number;
  isFavorite?: boolean;
  isCriticalStock?: boolean;
  showTaxIndicator?: boolean;
  taxPercentage?: number;
  cardStyle?: 'standard' | 'dense_hardware' | 'editorial' | 'brutalist' | 'food_menu' | 'modular_tech';
  isFeatured?: boolean; // 🚀 NUEVO: Detector de producto destacado
}

function ProductCardComponent({
  product,
  pricing,
  onOpen,
  isOutOfStock = false,
  isFavorite = false,
  isCriticalStock = false,
  showTaxIndicator = false,
  taxPercentage = 16,
  cardStyle = 'standard',
  index = 99,
  isFeatured = false // 🚀 Inyección del prop
}: ProductCardProps) {
  const [isImageLoaded, setIsImageLoaded] = useState(false);

  // Cálculos financieros protegidos
  const penalty = Number(product.usd_penalty || 0);
  const cashPrice = Number(product.usd_cash_price || 0);
  const listPrice = cashPrice + penalty;
  const compareAt = Number(product.compare_at_usd || 0);
  const activeCompareAt = compareAt > listPrice ? compareAt : listPrice;
  const isPromo = activeCompareAt > listPrice;
  const promoPercent = isPromo ? Math.round(((activeCompareAt - listPrice) / activeCompareAt) * 100) : 0;

  const isTaxable = !product.is_tax_exempt;
  const taxAmountUsd = isTaxable ? listPrice * (taxPercentage / 100) : 0;

  // 🚀 OPTIMIZACIÓN: Solo calcular matriz de colores si el estilo realmente la renderiza
  const uniqueColors = useMemo(() => {
    if (cardStyle !== 'standard' || !product.product_variants || !Array.isArray(product.product_variants)) return [];
    const colorSet = new Set<string>();
    product.product_variants.forEach((v: any) => {
      if (v.color_hex && v.color_hex !== 'transparent' && v.color_hex !== '#transparent') {
        colorSet.add(v.color_hex);
      }
    });
    return Array.from(colorSet);
  }, [cardStyle, product.product_variants]);

  // Manejadores estables en memoria
  const handleOpenCard = useCallback(() => {
    if (!isOutOfStock) onOpen(product);
  }, [isOutOfStock, onOpen, product]);

  const handleToggleFav = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    document.dispatchEvent(new CustomEvent('toggleFavorite', { detail: product }));
  }, [product]);

  // Decisión de prioridad para LCP de alta velocidad
  const isPriorityImage = index < 4;
  const formattedBs = currencyFormatter.format(pricing.priceInBs);

  // =========================================================================
  // 🛠️ VARIANTE: TEMA 2 (DENSE HARDWARE CARD / ALTA DENSIDAD)
  // =========================================================================
  if (cardStyle === 'dense_hardware') {
    return (
      <div
        className={`w-full h-full group cursor-pointer flex flex-col bg-[var(--store-surface)] border-[length:var(--border-width-ui)] border-[var(--store-border)] hover:border-[var(--store-primary)] transition-colors duration-150 relative overflow-hidden rounded-[var(--radius-card)] shadow-[var(--shadow-ui)] ${isOutOfStock ? 'opacity-60 grayscale-[40%]' : ''}`}
        onClick={handleOpenCard}
      >
        {/* 1. ENCUADRE TÉCNICO 1:1 */}
        <div className="relative aspect-square w-full bg-white overflow-hidden shrink-0 border-b border-[var(--store-border)]/40">
          {product.image_url ? (
            <Image
              src={getOptimizedUrl(product.image_url)}
              alt={product.name}
              fill
              priority={isPriorityImage}
              loading={isPriorityImage ? undefined : 'lazy'}
              sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 20vw"
              onLoad={() => setIsImageLoaded(true)}
              className={`object-contain p-4 transition-transform duration-200 group-hover:scale-105 will-change-transform ${isImageLoaded ? 'opacity-100' : 'opacity-0'}`}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[var(--store-surface-text)]">
              <ImageIcon size={24} strokeWidth={1.5} />
            </div>
          )}

          {/* SEMÁFORO DE STOCK TÉCNICO */}
          <div className="absolute top-2 left-2 z-10 flex flex-col gap-1 pointer-events-none">
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

          {/* BADGE DE DESCUENTO */}
          {isPromo && !isOutOfStock && (
            <div className="absolute top-2 right-2 z-10 bg-[var(--store-badge-discount-bg)] text-[var(--store-badge-discount-text)] text-[9px] md:text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-[var(--radius-btn)] border border-[var(--store-badge-discount-bg)]">
              -{promoPercent}%
            </div>
          )}

          {/* BOTÓN DE FAVORITO */}
          <button
            onClick={handleToggleFav}
            className={`absolute bottom-2 right-2 z-20 p-1.5 rounded-[var(--radius-btn)] border-[length:var(--border-width-ui)] transition-colors active:scale-95 ${
              isFavorite
                ? 'text-[var(--store-action-favorite)] border-[var(--store-action-favorite)]'
                : 'bg-[var(--store-surface)]/90 text-[var(--store-surface-text)] border-[var(--store-border)] hover:text-[var(--store-action-favorite)] hover:border-[var(--store-action-favorite)]'
            }`}
            style={isFavorite ? { backgroundColor: 'color-mix(in srgb, var(--store-action-favorite) 15%, transparent)', borderColor: 'color-mix(in srgb, var(--store-action-favorite) 30%, transparent)' } : undefined}
            aria-label="Favorito"
          >
            <Heart size={14} strokeWidth={2.2} className={isFavorite ? "fill-current" : ""} />
          </button>
        </div>

        {/* 2. CAJA DE INFORMACIÓN TÉCNICA */}
        <div className="p-2.5 md:p-3 flex flex-col flex-1 justify-between gap-1.5">
          <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-[var(--store-surface-text)] truncate">
            {product.category || 'General'}
          </span>

          <h3 className="text-xs md:text-[13px] font-bold text-[var(--store-text-main)] leading-snug line-clamp-2 min-h-[2.4em] group-hover:text-[var(--store-primary)] transition-colors">
            {product.name}
          </h3>

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
                Bs {formattedBs}
              </span>

              {showTaxIndicator && isTaxable && (
                <span className="text-[8px] font-mono text-[var(--store-surface-text)] mt-1">
                  +${taxAmountUsd.toFixed(2)} IVA
                </span>
              )}
            </div>

            <button
              disabled={isOutOfStock}
              className={`w-8 h-8 rounded-[var(--radius-btn)] border-[length:var(--border-width-ui)] border-[var(--store-border)] flex items-center justify-center shrink-0 transition-colors ${
                isOutOfStock
                  ? 'bg-neutral-100 text-neutral-400 cursor-not-allowed'
                  : 'bg-[var(--store-surface)] text-[var(--store-text-main)] group-hover:bg-[var(--store-primary)] group-hover:text-[var(--store-primary-text)] group-hover:border-[var(--store-primary)] active:scale-95 shadow-xs'
              }`}
              aria-label="Ver detalles"
            >
              <ShoppingCart size={14} strokeWidth={2.2} />
            </button>
          </div>

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
        className={`w-full h-full group cursor-pointer flex flex-col relative transition-transform duration-300 ease-out hover:-translate-y-1.5 ${isOutOfStock ? 'opacity-50' : ''}`}
        onClick={handleOpenCard}
      >
        <div className="relative aspect-[3/4] w-full bg-[var(--store-surface)] overflow-hidden rounded-[var(--radius-card)] mb-3">
          {product.image_url ? (
            <Image
              src={getOptimizedUrl(product.image_url)}
              alt={product.name}
              fill
              priority={isPriorityImage}
              loading={isPriorityImage ? undefined : 'lazy'}
              sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
              onLoad={() => setIsImageLoaded(true)}
              className={`object-cover transition-transform duration-500 ease-out group-hover:scale-105 ${isImageLoaded ? 'opacity-100' : 'opacity-0'}`}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[var(--store-surface-text)]">
              <ImageIcon size={32} strokeWidth={1} />
            </div>
          )}

          <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5 pointer-events-none">
            {isOutOfStock ? (
              <span className="text-[8px] font-bold uppercase tracking-[0.2em] text-[var(--store-badge-soldout-text)] bg-[var(--store-badge-soldout-bg)]/90 px-2.5 py-1 rounded-[var(--radius-btn)]">Agotado</span>
            ) : isPromo ? (
              <span className="text-[9px] font-bold tracking-widest text-[var(--store-text-main)] bg-[var(--store-bg)]/95 px-2.5 py-1 rounded-[var(--radius-btn)] border border-[var(--store-border)]/50 shadow-sm">
                -{promoPercent}%
              </span>
            ) : null}
          </div>

          <button
            onClick={handleToggleFav}
            className={`absolute top-3 right-3 z-20 p-2 transition-opacity duration-200 active:scale-90 ${
              isFavorite ? 'opacity-100 text-[var(--store-action-favorite)]' : 'opacity-0 group-hover:opacity-100 text-[var(--store-text-main)] hover:text-[var(--store-action-favorite)]'
            }`}
            aria-label="Favorito"
          >
            <Heart size={18} strokeWidth={1.5} className={isFavorite ? "fill-current" : ""} />
          </button>

          {!isOutOfStock && (
            <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-full group-hover:translate-y-0 transition-transform duration-200 hidden md:block z-20">
              <button className="w-full bg-[var(--store-bg)]/95 text-[var(--store-text-main)] py-3.5 text-[9px] font-bold uppercase tracking-[0.2em] hover:bg-[var(--store-text-main)] hover:text-[var(--store-bg)] transition-colors rounded-[var(--radius-btn)] shadow-sm">
                Añadir a la bolsa
              </button>
            </div>
          )}
        </div>

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
          <span className="text-[10px] text-[var(--store-surface-text)] mt-1.5 font-medium tabular-nums">
            Bs {formattedBs}
          </span>

          {/* 🚀 INYECCIÓN: Ahorro en Divisas (Estilo Editorial Sutil) */}
          {penalty > 0 && !isOutOfStock && (
            <div className="mt-1.5 flex items-center justify-center gap-1 text-[9px] font-bold text-[var(--store-incentive)] tracking-wider">
              <Flame size={10} className="fill-current shrink-0" /> Paga ${cashPrice.toFixed(2)} USD
            </div>
          )}
        </div>
      </div>
    );
  }

  // =========================================================================
  // 🏴‍☠️ VARIANTE: TEMA 4 (TECHNICAL LUXURY STREETWEAR CARD)
  // =========================================================================
  if (cardStyle === 'brutalist') {
    return (
      <div
        className={`w-full h-full group cursor-pointer flex flex-col transition-all duration-500 ease-out hover:-translate-y-1 ${isOutOfStock ? 'opacity-50' : ''}`}
        onClick={handleOpenCard}
      >
        {/* 1. IMAGEN DE PASARELA (4:5 Ratio, High-End Feel) */}
        <div className="relative aspect-[4/5] w-full bg-[var(--store-surface)] overflow-hidden rounded-[var(--radius-card)] border border-[var(--store-border)]/20 mb-3">
          {product.image_url ? (
            <Image
              src={getOptimizedUrl(product.image_url)}
              alt={product.name}
              fill
              priority={isPriorityImage}
              loading={isPriorityImage ? undefined : 'lazy'}
              sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
              onLoad={() => setIsImageLoaded(true)}
              className={`object-cover transition-transform duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] group-hover:scale-[1.03] ${isImageLoaded ? 'opacity-100' : 'opacity-0'}`}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-neutral-400 font-mono text-xs tracking-widest">
              [ NO_MEDIA ]
            </div>
          )}

          {/* Micro-Badges Técnicos */}
          <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5 pointer-events-none">
            {isOutOfStock ? (
              <span className="bg-black/80 backdrop-blur-md text-white text-[9px] font-mono uppercase tracking-[0.2em] px-2 py-1">
                [ SOLD OUT ]
              </span>
            ) : isCriticalStock ? (
              <span className="bg-[var(--store-text-main)] text-[var(--store-bg)] text-[9px] font-mono uppercase tracking-[0.2em] px-2 py-1">
                LAST {product.stock}
              </span>
            ) : null}
            {isPromo && !isOutOfStock && (
              <span className="bg-[var(--store-badge-discount-bg)] text-[var(--store-badge-discount-text)] text-[9px] font-mono uppercase px-2 py-1 tracking-[0.2em]">
                -{promoPercent}% OFF
              </span>
            )}
          </div>

        <button
            onClick={handleToggleFav}
            className={`absolute top-3 right-3 z-20 p-2 transition-colors duration-300 active:scale-90 ${
              isFavorite
                ? 'text-[var(--store-action-favorite)]'
                : 'text-[var(--store-surface-text)] hover:text-[var(--store-text-main)]'
            }`}
            aria-label="Favorito"
          >
            <Heart size={16} strokeWidth={1.5} className={isFavorite ? "fill-current" : ""} />
          </button>
          
          {/* Quick Add Integrado de Alta Costura */}
          {!isOutOfStock && (
            <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hidden md:block z-20">
              <button className="w-full bg-[var(--store-text-main)] text-[var(--store-bg)] py-3 text-[9px] font-mono font-bold uppercase tracking-[0.2em] hover:opacity-90 transition-opacity">
                [ + ADD TO BAG ]
              </button>
            </div>
          )}
        </div>

        {/* 2. FICHA TÉCNICA (Debajo de la imagen, sin cajas) */}
        <div className="flex flex-col flex-1 px-1">
          <div className="flex justify-between items-start gap-4 mb-2">
            <div className="flex flex-col min-w-0">
              <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-[var(--store-surface-text)] block mb-1 truncate">
                // {product.category || 'ARCHIVE'}
              </span>
              <h3 className="text-sm font-bold uppercase text-[var(--store-text-main)] font-sans tracking-[0.1em] line-clamp-2 leading-tight">
                {product.name}
              </h3>
            </div>
            <div className="flex flex-col items-end shrink-0">
              {isPromo && (
                <span className="text-[10px] font-mono text-[var(--store-surface-text)] line-through tracking-widest mb-0.5">
                  ${activeCompareAt.toFixed(2)}
                </span>
              )}
              <span className="text-base font-medium font-mono text-[var(--store-text-main)] leading-none tracking-widest">
                ${listPrice.toFixed(2)}
              </span>
            </div>
          </div>

        <div className="mt-auto pt-2 flex flex-col items-start gap-1">
  <span className="text-[11px] font-mono text-[var(--store-surface-text)] leading-none tabular-nums tracking-widest">
    Bs {formattedBs}
  </span>
  
  {/* 🚀 INCENTIVO EN DIVISA: Uno debajo del otro, alineación limpia */}
  {penalty > 0 && !isOutOfStock && (
    <span className="text-[10px] font-mono font-bold text-[var(--store-incentive)] uppercase tracking-[0.2em] leading-none">
      PAGA EN USD: ${cashPrice.toFixed(2)}
    </span>
  )}
</div>

        </div>
      </div>
    );
  }

// =========================================================================
  // 🍔 VARIANTE: TEMA 5 (BISTRO & FAST FOOD APP CARD)
  if (cardStyle === 'food_menu') {
    return (
      <div
        className={`w-full h-full group cursor-pointer flex flex-col bg-[var(--store-surface)] border border-[var(--store-border)]/60 hover:border-[var(--store-primary)]/50 rounded-2xl md:rounded-3xl transition-colors duration-150 relative overflow-hidden shadow-xs hover:shadow-md ${isOutOfStock ? 'opacity-50 grayscale-[40%]' : ''}`}
        onClick={handleOpenCard}
      >
        {/* Proporción 1:1 Cuadrada: +33% de altura para evitar cortes en platos y bebidas */}
        <div className="relative aspect-square w-full bg-neutral-100 overflow-hidden">
          {product.image_url ? (
            <Image
              src={getOptimizedUrl(product.image_url)}
              alt={product.name}
              fill
              priority={isPriorityImage}
              loading={isPriorityImage ? undefined : 'lazy'}
              sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 20vw"
              onLoad={() => setIsImageLoaded(true)}
              className={`object-cover transition-transform duration-300 group-hover:scale-105 ${isImageLoaded ? 'opacity-100' : 'opacity-0'}`}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[var(--store-surface-text)]">
              <ImageIcon size={28} strokeWidth={1.5} />
            </div>
          )}

          <div className="absolute top-2.5 left-2.5 z-10 flex flex-col gap-1 pointer-events-none">
            {isOutOfStock ? (
              <span className="bg-neutral-900/90 text-white text-[8px] md:text-[9px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full">
                Agotado
              </span>
            ) : isPromo ? (
              <span className="bg-[var(--store-badge-discount-bg)] text-[var(--store-badge-discount-text)] text-[9px] font-black px-2.5 py-0.5 rounded-full shadow-xs">
                -{promoPercent}%
              </span>
            ) : null}
          </div>

          <button
            onClick={handleToggleFav}
            className={`absolute top-2.5 right-2.5 z-20 p-2 rounded-full transition-transform shadow-xs active:scale-90 ${
              isFavorite
                ? 'text-[var(--store-action-favorite)] bg-white shadow-sm'
                : 'bg-white/80 text-[var(--store-surface-text)] hover:text-[var(--store-action-favorite)]'
            }`}
            aria-label="Favorito"
          >
            <Heart size={15} strokeWidth={2.2} className={isFavorite ? "fill-current" : ""} />
          </button>

          {!isOutOfStock && (
            <div className="absolute bottom-2.5 right-2.5 z-20">
              <div className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-[var(--store-primary)] text-[var(--store-primary-text)] flex items-center justify-center shadow-md active:scale-90 group-hover:scale-105 transition-transform duration-150">
                <Plus size={18} strokeWidth={3} />
              </div>
            </div>
          )}
        </div>

        <div className="p-3.5 flex flex-col flex-1 justify-between gap-1.5">
          <div>
            <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--store-primary)] block mb-0.5">
              {product.category || 'Especialidad'}
            </span>
            <h3 className="text-xs md:text-sm font-black text-[var(--store-text-main)] font-heading line-clamp-2 leading-snug">
              {product.name}
            </h3>
          </div>

         <div className="pt-2 border-t border-[var(--store-border)]/40 flex flex-col mt-auto gap-1">
            <div className="flex items-baseline justify-between">
              <div className="flex items-baseline gap-1.5">
                {isPromo && (
                  <span className="text-[10px] font-bold text-[var(--store-surface-text)] line-through">
                    ${activeCompareAt.toFixed(2)}
                  </span>
                )}
                <span className="text-sm md:text-base font-black font-price text-[var(--store-text-main)] leading-none">
                  ${listPrice.toFixed(2)}
                </span>
              </div>
              <span className="text-[10px] font-mono font-bold text-[var(--store-surface-text)] tabular-nums">
                Bs {formattedBs}
              </span>
            </div>
            
            {/* 🚀 INYECCIÓN: Ahorro en Divisas (Estilo App) */}
            {penalty > 0 && !isOutOfStock && (
              <div className="flex items-center gap-1 text-[9px] font-bold text-[var(--store-incentive)]">
                <Flame size={10} className="fill-current shrink-0" /> Paga ${cashPrice.toFixed(2)} USD
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
// =========================================================================
  // 💻 VARIANTE: TEMA 6 (MODULAR TECH / APP STYLE CARD)
  // =========================================================================
  if (cardStyle === 'modular_tech') {
    return (
      <div
        className={`w-full h-full group cursor-pointer flex flex-col bg-[var(--store-surface)] transition-all duration-300 relative overflow-hidden hover:border-[var(--store-primary)]/60 ${isOutOfStock ? 'opacity-50 grayscale-[20%]' : ''}`}
        style={{ 
          borderRadius: 'var(--radius-card)', 
          borderWidth: 'var(--border-width-ui)', 
          borderColor: 'var(--store-border)', 
          boxShadow: 'var(--shadow-ui)' 
        }}
        onClick={handleOpenCard}
      >
        {/* 1. IMAGEN FLOTANTE (Sin divisiones ni fondos separados) */}
        <div className="relative aspect-[4/5] w-full p-6 flex items-center justify-center">
          {product.image_url ? (
            <Image 
              src={getOptimizedUrl(product.image_url)} 
              alt={product.name} 
              fill 
              priority={isPriorityImage} 
              loading={isPriorityImage ? undefined : 'lazy'} 
              sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw" 
              onLoad={() => setIsImageLoaded(true)} 
              className={`object-contain p-4 md:p-6 transition-transform duration-500 ease-out group-hover:scale-105 ${isImageLoaded ? 'opacity-100' : 'opacity-0'}`} 
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[var(--store-surface-text)] opacity-30"><ImageIcon size={32} strokeWidth={1.5} /></div>
          )}

          {/* Badges de Estado */}
          <div className="absolute top-4 left-4 z-10 flex flex-col gap-1.5 pointer-events-none">
            {isOutOfStock ? (
              <span className="bg-[var(--store-text-main)] text-[var(--store-bg)] text-[9px] font-bold uppercase px-2.5 py-1 rounded-full shadow-sm">
                Agotado
              </span>
            ) : isPromo ? (
              <span className="bg-[var(--store-badge-discount-bg)] text-[var(--store-badge-discount-text)] text-[10px] font-bold px-2.5 py-1 rounded-full shadow-sm tracking-wide">
                -{promoPercent}%
              </span>
            ) : null}
            {isCriticalStock && !isOutOfStock && (
              <span className="bg-[var(--store-surface)] border border-[var(--store-border)] text-[var(--store-text-main)] text-[9px] font-bold uppercase px-2.5 py-1 rounded-full shadow-sm flex items-center gap-1">
                 Quedan {product.stock}
              </span>
            )}
          </div>

          {/* Botón de Favorito */}
          <button 
            onClick={handleToggleFav} 
            className={`absolute top-4 right-4 z-20 p-2 rounded-full transition-colors duration-200 active:scale-90 ${isFavorite ? 'bg-white text-[var(--store-action-favorite)] shadow-sm' : 'bg-transparent text-[var(--store-surface-text)] hover:text-[var(--store-action-favorite)]'}`} 
            aria-label="Favorito"
          >
            <Heart size={16} strokeWidth={2.5} className={isFavorite ? "fill-current" : ""} />
          </button>
        </div>

        {/* 2. DATOS DEL PRODUCTO (App Layout) */}
        <div className="px-5 pb-5 md:px-6 md:pb-6 flex flex-col flex-1 z-10">
          <span className="text-[10px] font-semibold text-[var(--store-surface-text)] uppercase tracking-wider mb-1 line-clamp-1">{product.category || 'Categoría'}</span>
          <h3 className="text-sm md:text-base font-bold text-[var(--store-text-main)] leading-snug line-clamp-2 group-hover:text-[var(--store-primary)] transition-colors">{product.name}</h3>

          <div className="mt-auto pt-3 flex flex-col min-w-0 pr-12 relative z-10">
            {isPromo && <span className="text-[10px] font-bold text-[var(--store-surface-text)] line-through mb-0.5">${activeCompareAt.toFixed(2)}</span>}
            <div className="flex items-baseline gap-1">
                <span className="text-xl md:text-2xl font-black text-[var(--store-text-main)] leading-none tracking-tight">${listPrice.toFixed(2)}</span>
            </div>
            <span className="text-[11px] font-medium text-[var(--store-surface-text)] mt-1 tabular-nums">Bs {formattedBs}</span>
            
            {penalty > 0 && !isOutOfStock && (
              <div className="mt-1.5 text-[9px] font-bold text-[var(--store-incentive)] flex items-center gap-1">
                <Flame size={10} className="fill-current shrink-0" /> Paga ${cashPrice.toFixed(2)} en Divisa
              </div>
            )}
          </div>
        </div>

        {/* BOTÓN CIRCULAR DE ACCIÓN ABSOLUTO */}
        <button 
          disabled={isOutOfStock} 
          className={`absolute bottom-3 right-3 md:bottom-4 md:right-4 z-20 w-10 h-10 md:w-11 md:h-11 rounded-full flex items-center justify-center shrink-0 shadow-md transition-transform active:scale-90 ${isOutOfStock ? 'bg-neutral-200 text-neutral-400 cursor-not-allowed shadow-none' : 'bg-[var(--store-primary)] text-[var(--store-bg)]  text-[var(--store-primary-text)]  hover:scale-105 shadow-[var(--store-primary)]/20' }`}
          aria-label="Añadir al Carrito"
        >
          {isOutOfStock ? <X size={16} strokeWidth={3}/> : <Plus size={20} strokeWidth={3}/>}
        </button>
      </div>
    );
  }

  // =========================================================================
  // 🌟 VARIANTE: TEMA 1 (STANDARD / UNIVERSAL PREZISO CARD)
  // =========================================================================
  return (

    <div
      className={`w-full h-full group cursor-pointer flex flex-col relative transition-transform duration-200 ease-out hover:-translate-y-1.5 ${isOutOfStock ? 'opacity-60 grayscale-[50%]' : ''}`}
      onClick={handleOpenCard}
    >
      {/* Proporción 4:5 de Alta Gama: +25% de presencia visual y cero recortes arriba/abajo */}
      <div className="relative aspect-[4/5] w-full bg-[var(--store-surface)] overflow-hidden rounded-[var(--radius-card)] border border-[var(--store-border)]/50">
        {product.image_url ? (
          <Image
            src={getOptimizedUrl(product.image_url)}
            alt={product.name}
            fill
            priority={isPriorityImage}
            loading={isPriorityImage ? undefined : 'lazy'}
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
            onLoad={() => setIsImageLoaded(true)}
            className={`object-cover transition-transform duration-300 ease-out group-hover:scale-105 will-change-transform ${isImageLoaded ? 'opacity-100' : 'opacity-0'}`}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[var(--store-surface-text)]">
            <ImageIcon size={32} strokeWidth={1} />
          </div>
        )}

        {isOutOfStock && (
          <div className="absolute inset-0 bg-[var(--store-surface)]/60 flex items-center justify-center z-10 pointer-events-none">
            <span className="bg-[var(--store-badge-soldout-bg)] text-[var(--store-badge-soldout-text)] text-[10px] font-black uppercase tracking-[0.2em] px-4 py-2 rounded-[var(--radius-btn)] shadow-[var(--shadow-ui)]">
              Agotado
            </span>
          </div>
        )}

        {isCriticalStock && !isOutOfStock && (
          <div className="absolute top-2.5 left-2.5 md:top-3 md:left-3 z-10 bg-red-600 text-white px-2.5 py-1 rounded-[var(--radius-btn)] shadow-[var(--shadow-ui)] flex items-center gap-1.5 pointer-events-none">
            <AlertCircle size={12} strokeWidth={2.5} />
            <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest leading-none mt-px">
              Últimas {product.stock}
            </span>
          </div>
        )}

        {isPromo && !isOutOfStock && (
          <div className="absolute top-2.5 right-2.5 md:top-3 md:right-3 z-10 bg-[var(--store-badge-discount-bg)] text-[var(--store-badge-discount-text)] text-[10px] md:text-xs font-black px-2.5 py-1 rounded-[var(--radius-btn)] tracking-widest shadow-[var(--shadow-ui)] pointer-events-none">
            -{promoPercent}%
          </div>
        )}

        <button
          onClick={handleToggleFav}
          className={`absolute bottom-2.5 left-2.5 md:bottom-3 md:left-3 z-20 p-2 rounded-[var(--radius-btn)] border-[length:var(--border-width-ui)] transition-colors shadow-[var(--shadow-ui)] active:scale-90 ${
            isFavorite
              ? 'text-[var(--store-action-favorite)] border-transparent'
              : 'bg-[var(--store-surface)]/90 text-[var(--store-surface-text)] border-[var(--store-border)]/30 hover:text-[var(--store-action-favorite)] hover:bg-[var(--store-surface)]'
          }`}
          style={isFavorite ? { backgroundColor: 'color-mix(in srgb, var(--store-action-favorite) 15%, transparent)' } : undefined}
          aria-label="Añadir a favoritos"
        >
          <Heart size={16} strokeWidth={2.5} className={isFavorite ? "fill-current" : ""} />
        </button>

        {uniqueColors.length > 1 && (
          <div className="absolute bottom-2.5 right-2.5 md:bottom-3 md:right-3 z-20 flex flex-col items-center gap-1.5 bg-black/60 p-1.5 rounded-full shadow-sm pointer-events-none">
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
                Bs {formattedBs}
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
              className={`w-8 h-8 md:w-9 md:h-9 rounded-[var(--radius-btn)] border-[length:var(--border-width-ui)] shadow-[var(--shadow-ui)] text-[var(--store-text-main)] border-[var(--store-border)] flex items-center justify-center shrink-0 transition-colors ${
                isOutOfStock
                  ? 'bg-[var(--store-border)] text-[var(--store-surface-text)] cursor-not-allowed'
                  : 'text-[var(--store-surface-text)] group-hover:bg-[var(--store-primary)] group-hover:text-[var(--store-primary-text)] group-hover:border-[var(--store-primary)] active:scale-90'
              }`}
              aria-label="Ver producto"
            >
              <ShoppingCart size={14} strokeWidth={2.5} className="ml-[-1px]" />
            </button>
          </div>
        </div>

        {penalty > 0 && !isOutOfStock && (
          <div className="mt-3 inline-flex items-center gap-1.5 text-[10px] font-bold text-[var(--store-incentive)] py-1 rounded-[var(--radius-btn)] self-start">
            <Flame size={12} className="text-[var(--store-incentive)] fill-[var(--store-incentive)] shrink-0" />
            <span>Paga ${cashPrice.toFixed(2)} en Divisas</span>
          </div>
        )}
      </div>
    </div>
  );
}

function areProductCardPropsEqual(prev: ProductCardProps, next: ProductCardProps) {
  // 1. Si la referencia del producto es idéntica (lo habitual en scrolls), son iguales
  const isProductIdentical = 
    prev.product === next.product || 
    (prev.product.id === next.product.id && 
     prev.product.updated_at === next.product.updated_at &&
     prev.product.stock === next.product.stock);

  // 2. Si el producto no cambió, validamos únicamente los estados externos de UI
  if (!isProductIdentical) return false;
return (
    prev.isFavorite === next.isFavorite &&
    prev.isOutOfStock === next.isOutOfStock &&
    prev.isCriticalStock === next.isCriticalStock &&
    prev.showTaxIndicator === next.showTaxIndicator &&
    prev.taxPercentage === next.taxPercentage &&
    prev.cardStyle === next.cardStyle &&
    prev.isFeatured === next.isFeatured && // 🚀 Optimizador actualizado
    // Validamos pricing porque los padres suelen pasarlo como objeto literal
    prev.pricing.priceInBs === next.pricing.priceInBs &&
    prev.pricing.cashPrice === next.pricing.cashPrice &&
    prev.pricing.discountPercent === next.pricing.discountPercent
  );
}

export default memo(ProductCardComponent, areProductCardPropsEqual);