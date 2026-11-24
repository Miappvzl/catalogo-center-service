// components/ProductCard.tsx
'use client'

import { getOptimizedUrl } from '@/utils/cdn';
import { getVariantSwatchStyle } from '@/utils/ColorUtils';
import { ImageIcon, ShoppingCart, Flame, Heart, AlertCircle, Receipt, CheckCircle2, Plus, Zap, X, ShoppingBag } from 'lucide-react'
import Image from 'next/image'
import { useMemo, useState, memo, useCallback, useRef } from 'react'
import { formatUSD, formatVES } from '@/utils/currency'; // 🚀 FORMATO HISPANO UNIFICADO (COMA DECIMAL)

interface ProductCardProps {
  product: any;
  mediaConfig?: { ratio: string; fit: string; bg_color: string }; // 🚀 NUEVO: Image Engine
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
  cardStyle?: 'standard' | 'dense_hardware' | 'editorial' | 'brutalist' | 'food_menu' | 'modular_tech' | 'restaurant_horizontal';
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
  isFeatured = false,
  mediaConfig
}: ProductCardProps) {
  // 🚀 ZERO-RENDER IMAGE LOADER: Muta el nodo DOM directamente al cargar (0 re-renders en scroll)
  // y memoriza la URL en un ref para mantener la opacidad si la tarjeta se re-renderiza por Favoritos.
  const loadedUrlRef = useRef<string | null>(null);
  const isImageLoaded = loadedUrlRef.current === product.image_url;

  const handleImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    loadedUrlRef.current = product.image_url;
    e.currentTarget.classList.remove('opacity-0');
    e.currentTarget.classList.add('opacity-100');
  }, [product.image_url]);

  // 🚀 MOTOR GEOMÉTRICO (Fallback automático si no se pasa la prop)
  const aspectClass = mediaConfig?.ratio || (['dense_hardware', 'food_menu', 'modular_tech'].includes(cardStyle) ? 'aspect-square' : 'aspect-[4/5]');
  const isContain = mediaConfig?.fit === 'contain';
  const fitClass = isContain ? 'object-contain p-4 md:p-5' : 'object-cover'; // Breathing Room
  const imageBgStyle = isContain && mediaConfig?.bg_color ? { backgroundColor: mediaConfig.bg_color } : {};

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

  // 💎 MOTOR MAYORISTA B2B EN TARJETA (100% Datos Reales de BD)
  const hasWholesale = Boolean(
    product.wholesale_active &&
    Number(product.wholesale_min_qty) > 0 &&
    Number(product.wholesale_discount_pct) > 0 &&
    !isOutOfStock
  );
  const wholesaleMinQty = Number(product.wholesale_min_qty || 6);
  const wholesaleUnitUsd = hasWholesale
    ? (isPromo ? activeCompareAt : listPrice) * (1 - Number(product.wholesale_discount_pct) / 100)
    : 0;

  // 💎 EXTRACTOR DE TALLAS / MEDIDAS CON STOCK REAL (Elimina la ceguera de variantes en el catálogo)
  const availableSizesPreview = useMemo(() => {
    if (isOutOfStock || !Array.isArray(product.product_variants) || product.product_variants.length === 0) return [];
    const sizeSet = new Set<string>();
    product.product_variants.forEach((v: any) => {
      if ((Number(v.stock) || 0) > 0 && v.size) {
        const clean = String(v.size).trim();
        if (clean && !['única', 'unica', 'u', 'estándar', 'estandar', 'default'].includes(clean.toLowerCase())) {
          sizeSet.add(clean);
        }
      }
    });
    return Array.from(sizeSet);
  }, [isOutOfStock, product.product_variants]);

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



// =========================================================================
  // 🛠️ VARIANTE: TEMA 2 (INDUSTRIAL & HARDWARE / ALTA DENSIDAD)
  // =========================================================================
  if (cardStyle === 'dense_hardware') {
    return (
      <div
        className={`w-full h-full group cursor-pointer flex flex-col bg-[var(--store-surface)] border-[length:var(--border-width-ui)] border-[var(--store-border)] hover:border-[var(--store-text-main)] transition-all duration-200 relative overflow-hidden rounded-[var(--radius-card)] shadow-[var(--shadow-ui)] ${isOutOfStock ? 'opacity-60 grayscale-[40%]' : ''}`}
        onClick={handleOpenCard}
      >
        {/* 1. ENCUADRE TÉCNICO (Limpio y sin etiquetas invasivas) */}
        <div className={`relative ${aspectClass} w-full bg-[var(--store-bg)] overflow-hidden shrink-0 border-b border-[var(--store-border)]`} style={imageBgStyle}>
         {product.image_url ? (
            <Image
              src={getOptimizedUrl(product.image_url)}
              alt={product.name}
              fill
              priority={isPriorityImage}
              loading={isPriorityImage ? undefined : 'lazy'}
              sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 20vw"
              onLoad={handleImageLoad}
              className={`transition-[transform,opacity] duration-300 ease-out ${fitClass} ${isContain ? 'group-hover:scale-100' : 'md:group-hover:scale-105'} ${isImageLoaded ? 'opacity-100' : 'opacity-0'}`}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[var(--store-border)]">
              <ImageIcon size={32} strokeWidth={1} />
            </div>
          )}

          {/* INSIGNIA DE OFERTA (Única etiqueta técnica visible si aplica) */}
          {isPromo && !isOutOfStock && (
            <div className="absolute top-2 left-2 z-10 pointer-events-none">
              <span className="bg-[var(--store-badge-discount-bg)] text-[var(--store-badge-discount-text)] text-[8px] font-mono font-bold uppercase tracking-[0.2em] px-2 py-1 shadow-sm">
                -{promoPercent}% OFF
              </span>
            </div>
          )}

       {/* FAVORITO TÉCNICO (100% Variable CSS Dinámica) */}
          <button
            onClick={handleToggleFav}
            className={`absolute top-2 right-2 z-20 w-7 h-7 flex items-center justify-center transition-colors shadow-sm bg-[var(--store-surface)] border border-[var(--store-border)] active:scale-90 ${isFavorite
                ? 'text-[var(--store-action-favorite)]'
                : 'text-[var(--store-surface-text)] hover:text-[var(--store-text-main)]'
              }`}
            style={{ borderRadius: 'calc(var(--radius-btn) * 0.5)' }}
            aria-label="Favorito"
          >
            <Heart size={13} strokeWidth={2} className={isFavorite ? "fill-current" : ""} />
          </button>
        </div>

        {/* 2. FICHA DE ESPECIFICACIONES (100% Datos Reales: Categoría, SKU y Mayorista) */}
        <div className="flex flex-col flex-1 min-w-0">
          <div className="p-3 pb-2.5 flex-1 flex flex-col justify-start">
            {(product.category || product.sku) && (
              <div className="flex items-center justify-between gap-1.5 mb-1.5">
                {product.category ? (
                  <span className="text-[8px] font-mono font-bold uppercase tracking-[0.18em] text-[var(--store-surface-text)] truncate">
                    // {product.category}
                  </span>
                ) : <span />}
                {product.sku && (
                  <span className="text-[8px] font-mono font-bold uppercase tracking-wider text-[var(--store-text-main)] bg-[var(--store-bg)] px-1.5 py-0.5 border border-[var(--store-border)] shrink-0">
                    {product.sku}
                  </span>
                )}
              </div>
            )}

            <h3 className="text-[12px] font-semibold text-[var(--store-text-main)] leading-snug line-clamp-2 tracking-tight">
              {product.name}
            </h3>

            {hasWholesale ? (
              <div className="mt-1.5 inline-flex items-center gap-1 text-[8.5px] font-mono font-bold text-[var(--store-text-main)] bg-[var(--store-bg)] px-1.5 py-0.5 border border-[var(--store-border)] w-fit">
                <Zap size={9} className="fill-current shrink-0" />
                <span>MAYOR ({wholesaleMinQty}+): {formatUSD(wholesaleUnitUsd)}</span>
              </div>
            ) : availableSizesPreview.length > 0 ? (
              <span className="mt-1.5 text-[8.5px] font-mono text-[var(--store-surface-text)] truncate">
                {availableSizesPreview.slice(0, 4).join(' · ')}{availableSizesPreview.length > 4 ? ` +${availableSizesPreview.length - 4}` : ''}
              </span>
            ) : null}
          </div>

          {/* 🚀 CONSOLA FINANCIERA (Altura Fija H-66px & Línea Base Continua) */}
          <div className="grid grid-cols-[1fr_40px] border-t border-[var(--store-border)] bg-[var(--store-bg)]/40 mt-auto h-[66px] shrink-0">
            <div className="px-3 py-1 flex flex-col justify-center min-w-0 border-r border-[var(--store-border)]">
              <div className="flex items-baseline gap-1.5 flex-wrap leading-none">
                {isPromo && (
                  <span className="text-[9px] font-mono text-[var(--store-surface-text)] line-through decoration-[var(--store-border)]">
                    {formatUSD(activeCompareAt)}
                  </span>
                )}
                <span className={`text-[14px] font-black font-mono tracking-tight ${isPromo ? 'text-[var(--store-badge-discount-bg)]' : 'text-[var(--store-text-main)]'}`}>
                  {formatUSD(listPrice)}
                </span>
              </div>

              <span className="text-[9.5px] font-mono font-medium text-[var(--store-surface-text)] tabular-nums truncate leading-none mt-1.5">
                {formatVES(pricing.priceInBs)}
              </span>

              {penalty > 0 && !isOutOfStock && (
                <span className="text-[8.5px] font-mono font-bold text-[var(--store-incentive)] uppercase tracking-wider flex items-center gap-1.5 truncate mt-1.5 leading-none">
                  <span className="w-1 h-1 rounded-full bg-[var(--store-incentive)] shrink-0" />
                  Divisas: {formatUSD(cashPrice)}
                </span>
              )}
            </div>

            <button
              disabled={isOutOfStock}
              className={`w-full h-full flex items-center justify-center shrink-0 transition-colors ${
                isOutOfStock
                  ? 'bg-[var(--store-surface)] text-[var(--store-surface-text)]/50 cursor-not-allowed'
                  : 'bg-[var(--store-surface)] text-[var(--store-text-main)] hover:bg-[var(--store-primary)] hover:text-[var(--store-primary-text)]'
              }`}
              aria-label="Añadir/Ver"
            >
              <Plus size={16} strokeWidth={2.5} />
            </button>
          </div>
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
        className={`w-full h-full group cursor-pointer flex flex-col relative ${isOutOfStock ? 'opacity-50' : ''}`}
        onClick={handleOpenCard}
      >
        <div className={`relative ${aspectClass} w-full bg-[var(--store-surface)] overflow-hidden rounded-[var(--radius-card)] mb-4`} style={imageBgStyle}>
          {product.image_url ? (
            <Image
              src={getOptimizedUrl(product.image_url)}
              alt={product.name}
              fill
              priority={isPriorityImage}
              loading={isPriorityImage ? undefined : 'lazy'}
              sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
              onLoad={handleImageLoad}
              className={`transition-[transform,opacity] duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] ${fitClass} ${isContain ? 'group-hover:scale-100' : 'md:group-hover:scale-[1.03]'} ${isImageLoaded ? 'opacity-100' : 'opacity-0'}`}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[var(--store-surface-text)] opacity-40">
              <ImageIcon size={24} strokeWidth={1} />
            </div>
          )}

          <div className="absolute top-3 left-3 z-10 flex flex-col gap-2 pointer-events-none">
            {isOutOfStock ? (
              <span className="text-[8px] font-bold uppercase tracking-[0.25em] text-[var(--store-badge-soldout-text)] bg-[var(--store-badge-soldout-bg)]/90 md:backdrop-blur-md px-2.5 py-1 rounded-[var(--radius-btn)] shadow-sm">
                Agotado
              </span>
            ) : isPromo ? (
              <span className="text-[8.5px] font-bold tracking-[0.15em] text-[var(--store-text-main)] bg-[var(--store-bg)]/95 md:bg-[var(--store-bg)]/80 md:backdrop-blur-md px-2.5 py-1 rounded-[var(--radius-btn)] border border-[var(--store-border)]/40 shadow-[0_4px_12px_rgba(0,0,0,0.04)]">
                -{promoPercent}%
              </span>
            ) : null}
          </div>

          <button
            onClick={handleToggleFav}
            className={`absolute top-3 right-3 z-20 p-2 transition-all duration-300 active:scale-90 ${isFavorite ? 'opacity-100 text-[var(--store-action-favorite)] drop-shadow-sm' : 'opacity-0 group-hover:opacity-100 text-[var(--store-text-main)] hover:text-[var(--store-action-favorite)]'
              }`}
            aria-label="Favorito"
          >
            <Heart size={17} strokeWidth={isFavorite ? 1.5 : 1} className={isFavorite ? "fill-current" : ""} />
          </button>

          {!isOutOfStock && (
            <div className="absolute bottom-3 left-3 right-3 translate-y-[120%] opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hidden md:block z-20">
              <button className="w-full bg-[var(--store-bg)]/90 backdrop-blur-md text-[var(--store-text-main)] py-3 text-[8.5px] font-bold uppercase tracking-[0.25em] hover:bg-[var(--store-text-main)] hover:text-[var(--store-bg)] transition-colors rounded-[var(--radius-btn)] shadow-[0_4px_20px_rgba(0,0,0,0.06)] border border-[var(--store-border)]/40">
                Añadir a la bolsa
              </button>
            </div>
          )}
        </div>

        {/* Textos Editoriales (Cero textos inventados) */}
        <div className="flex flex-col items-center text-center px-1 flex-1">
          {product.category && (
            <span className="text-[8px] font-bold uppercase tracking-[0.25em] text-[var(--store-surface-text)]/70 mb-1.5 line-clamp-1">
              {product.category}
            </span>
          )}

          <h3 className="text-[13px] md:text-[14px] font-normal text-[var(--store-text-main)] leading-snug mb-2 font-heading line-clamp-2 tracking-wide">
            {product.name}
          </h3>

          {availableSizesPreview.length > 0 && (
            <span className="text-[8.5px] font-medium uppercase tracking-[0.18em] text-[var(--store-surface-text)]/80 mb-2 line-clamp-1">
              {availableSizesPreview.slice(0, 4).join(' · ')}{availableSizesPreview.length > 4 ? ` +${availableSizesPreview.length - 4}` : ''}
            </span>
          )}

          <div className="mt-auto flex flex-col items-center justify-end gap-0.5">
            <div className="flex items-center justify-center gap-2.5">
              {isPromo && (
                <span className="text-[11px] text-[var(--store-surface-text)]/60 line-through decoration-[0.5px]">
                  {formatUSD(activeCompareAt)}
                </span>
              )}
              <span className={`text-sm font-medium tracking-widest ${isPromo ? 'text-[var(--store-badge-discount-bg)]' : 'text-[var(--store-text-main)]'}`}>
                {formatUSD(listPrice)}
              </span>
            </div>
            <span className="text-[9px] text-[var(--store-surface-text)] font-medium tabular-nums tracking-widest uppercase mt-0.5 opacity-80">
              {formatVES(pricing.priceInBs)}
            </span>

            {penalty > 0 && !isOutOfStock && (
              <div className="mt-1.5 flex items-center justify-center text-[8px] font-bold uppercase tracking-[0.2em] text-[var(--store-incentive)] opacity-90">
                <span className="mr-1.5 w-1 h-1 rounded-full bg-[var(--store-incentive)]" /> 
                DIVISAS: {formatUSD(cashPrice)}
              </div>
            )}

            {hasWholesale && (
              <div className="mt-1 text-[8px] font-bold uppercase tracking-[0.18em] text-[var(--store-text-main)]/80">
                MAYOR ({wholesaleMinQty}+): {formatUSD(wholesaleUnitUsd)}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // 🏴‍☠️ VARIANTE: TEMA 4 (BRUTALIST / ARCHITECTURAL CARD)
  // =========================================================================
  if (cardStyle === 'brutalist') {
    return (
      <div
        className={`w-full h-full group cursor-pointer flex flex-col transition-all duration-500 ease-out hover:-translate-y-1 ${isOutOfStock ? 'opacity-50' : ''}`}
        onClick={handleOpenCard}
      >
        <div className={`relative ${aspectClass} w-full bg-[var(--store-surface)] overflow-hidden rounded-[var(--radius-card)] border border-[var(--store-border)]/20 mb-3`} style={imageBgStyle}>
          {product.image_url ? (
            <Image
              src={getOptimizedUrl(product.image_url)}
              alt={product.name}
              fill
              priority={isPriorityImage}
              loading={isPriorityImage ? undefined : 'lazy'}
              sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
              onLoad={handleImageLoad}
              className={`transition-[transform,opacity] duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] ${fitClass} ${isContain ? 'group-hover:scale-100' : 'md:group-hover:scale-[1.03]'} ${isImageLoaded ? 'opacity-100' : 'opacity-0'}`}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[var(--store-surface-text)] font-mono text-[10px] tracking-widest">
              [ SIN IMAGEN ]
            </div>
          )}

          <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5 pointer-events-none">
            {isOutOfStock ? (
              <span className="bg-[var(--store-badge-soldout-bg)] text-[var(--store-badge-soldout-text)] text-[9px] font-mono uppercase tracking-[0.2em] px-2 py-1">
                [ AGOTADO ]
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
            className={`absolute top-3 right-3 z-20 p-2 transition-colors duration-300 active:scale-90 ${isFavorite
              ? 'text-[var(--store-action-favorite)]'
              : 'text-[var(--store-surface-text)] hover:text-[var(--store-text-main)]'
              }`}
            aria-label="Favorito"
          >
            <Heart size={16} strokeWidth={1.5} className={isFavorite ? "fill-current" : ""} />
          </button>

          {!isOutOfStock && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleOpenCard();
              }}
              className="absolute bottom-2.5 right-2.5 z-20 w-8 h-8 md:w-9 md:h-9 rounded-[var(--radius-btn)] bg-[var(--store-primary)] text-[var(--store-primary-text)] border border-[var(--store-border)]/10 flex items-center justify-center shadow-sm active:scale-90 transition-transform duration-150 md:hidden"
              aria-label="Ver y añadir a la bolsa"
              title="Añadir a la bolsa"
            >
              <ShoppingBag size={14} strokeWidth={2} />
            </button>
          )}

          {!isOutOfStock && (
            <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hidden md:block z-20">
              <button className="w-full bg-[var(--store-primary)] text-[var(--store-primary-text)] py-3 text-[9px] font-mono font-bold uppercase tracking-[0.2em] hover:opacity-90 transition-opacity rounded-[var(--radius-btn)]">
                [ + AÑADIR A LA BOLSA ]
              </button>
            </div>
          )}
        </div>

        {/* 2. FICHA TÉCNICA (Jerarquía Vertical Escaneable y 100% Datos Reales) */}
        <div className="flex flex-col flex-1 pt-2.5 pb-1 px-1 justify-between">
          <div>
            {(product.category || product.sku) && (
              <div className="flex items-center justify-between gap-1.5 mb-1">
                {product.category ? (
                  <span className="text-[9px] font-mono text-[var(--store-surface-text)] uppercase tracking-wider truncate">
                    {product.category}
                  </span>
                ) : <span />}
                {product.sku && (
                  <span className="text-[8px] font-mono text-[var(--store-surface-text)] uppercase tracking-widest shrink-0">
                    {product.sku}
                  </span>
                )}
              </div>
            )}
            <h3 className="text-xs md:text-sm font-medium text-[var(--store-text-main)] leading-snug line-clamp-2 min-h-[2.5em] tracking-tight uppercase">
              {product.name}
            </h3>
            {availableSizesPreview.length > 0 && (
              <span className="text-[8.5px] font-mono text-[var(--store-surface-text)] uppercase tracking-wider block mt-1 truncate">
                [ {availableSizesPreview.slice(0, 4).join(' · ')}{availableSizesPreview.length > 4 ? ` +${availableSizesPreview.length - 4}` : ''} ]
              </span>
            )}
          </div>

          <div className="mt-2.5 pt-2 border-t border-[var(--store-border)]/40 flex flex-col gap-1">
            <div className="flex items-baseline gap-1.5 flex-wrap">
              {isPromo && (
                <span className="text-[10px] font-mono text-[var(--store-surface-text)] line-through">
                  {formatUSD(activeCompareAt)}
                </span>
              )}
              <span className={`text-sm md:text-base font-black leading-none tracking-tight font-mono ${isPromo ? 'text-[var(--store-badge-discount-bg)]' : 'text-[var(--store-text-main)]'}`}>
                {formatUSD(listPrice)}
              </span>
            </div>

            <span className="text-[10px] font-mono font-semibold text-[var(--store-surface-text)] leading-none tabular-nums">
              {formatVES(pricing.priceInBs)}
            </span>

            {penalty > 0 && !isOutOfStock && (
              <div className="mt-0.5 inline-flex items-center gap-1.5 text-[9px] font-mono font-medium text-[var(--store-incentive)] leading-none">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--store-incentive)] shrink-0" />
                <span>EN DIVISAS: {formatUSD(cashPrice)}</span>
              </div>
            )}

            {hasWholesale && (
              <div className="mt-0.5 inline-flex items-center gap-1 text-[8.5px] font-mono font-bold text-[var(--store-text-main)] leading-none">
                <Zap size={9} className="fill-current shrink-0" />
                <span>MAYOR ({wholesaleMinQty}+): {formatUSD(wholesaleUnitUsd)}</span>
              </div>
            )}

            {showTaxIndicator && isTaxable && (
              <span className="text-[8px] font-mono text-[var(--store-surface-text)]/70 mt-0.5 leading-none">
                +{formatUSD(taxAmountUsd)} IVA
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
        className={`w-full h-full group cursor-pointer flex flex-col bg-[var(--store-surface)] border border-[var(--store-border)]/60 hover:border-[var(--store-primary)]/50 rounded-2xl md:rounded-3xl transition-all duration-200 relative overflow-hidden shadow-xs hover:shadow-lg ${isOutOfStock ? 'opacity-50 grayscale-[40%]' : ''}`}
        onClick={handleOpenCard}
      >
        {/* Contenedor de Imagen */}
        <div className={`relative ${aspectClass} w-full bg-neutral-100 overflow-hidden`} style={imageBgStyle}>
         {product.image_url ? (
            <Image
              src={getOptimizedUrl(product.image_url)}
              alt={product.name}
              fill
              priority={isPriorityImage}
              loading={isPriorityImage ? undefined : 'lazy'}
              sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 20vw"
              onLoad={handleImageLoad}
              className={`transition-[transform,opacity] duration-300 ${fitClass} ${isContain ? 'group-hover:scale-100' : 'md:group-hover:scale-105'} ${isImageLoaded ? 'opacity-100' : 'opacity-0'}`}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[var(--store-surface-text)]">
              <ImageIcon size={28} strokeWidth={1.5} />
            </div>
          )}

          {/* Badges Superiores (Agotado / Descuento) */}
          <div className="absolute top-2.5 left-2.5 z-10 flex flex-col gap-1 pointer-events-none">
            {isOutOfStock ? (
              <span className="bg-neutral-900/90 text-white text-[8px] md:text-[9px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full shadow-xs">
                Agotado
              </span>
            ) : isPromo ? (
              <span className="bg-[var(--store-badge-discount-bg)] text-[var(--store-badge-discount-text)] text-[9px] font-black px-2.5 py-0.5 rounded-full shadow-xs">
                -{promoPercent}%
              </span>
            ) : null}
          </div>

          {/* Botón de Favorito */}
          <button
            onClick={handleToggleFav}
            className={`absolute top-2.5 right-2.5 z-20 p-2 rounded-full transition-colors shadow-xs active:scale-90 ${isFavorite ? 'text-[var(--store-action-favorite)] bg-white shadow-sm' : 'bg-white/95 md:bg-white/80 md:backdrop-blur-xs text-[var(--store-surface-text)] hover:text-[var(--store-action-favorite)]'}`}
            aria-label="Favorito"
          >
            <Heart size={15} strokeWidth={2.2} className={isFavorite ? "fill-current" : ""} />
          </button>

          {/* Botón de Acción Rápida (Añadir) */}
          {!isOutOfStock && (
            <div className="absolute bottom-2.5 right-2.5 z-20">
              <div className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-[var(--store-primary)] text-[var(--store-primary-text)] flex items-center justify-center shadow-md active:scale-90 group-hover:scale-105 transition-transform duration-150">
                <Plus size={18} strokeWidth={3} />
              </div>
            </div>
          )}
        </div>

        {/* Cuerpo de Contenido (Cero sesgo de nicho) */}
        <div className="p-3.5 flex flex-col flex-1 justify-between gap-2">
          <div className="space-y-0.5">
            {product.category && (
              <span className="text-[9px] font-semibold uppercase tracking-wider text-[var(--store-primary)] block truncate">
                {product.category}
              </span>
            )}
            <h3 className="text-xs md:text-sm font-semibold text-[var(--store-text-main)] font-heading line-clamp-2 leading-snug">
              {product.name}
            </h3>
          </div>

          <div className="pt-2.5 border-t border-[var(--store-border)]/40 flex flex-col mt-auto gap-1.5">
            {isPromo && (
              <div className="flex items-center gap-1 text-[10px] font-medium text-[var(--store-surface-text)]">
                <span className="line-through">{formatUSD(activeCompareAt)}</span>
              </div>
            )}

            <div className="flex flex-col gap-0.5">
              <span className={`text-sm md:text-base font-black font-price leading-none ${isPromo ? 'text-[var(--store-badge-discount-bg)]' : 'text-[var(--store-text-main)]'}`}>
                {formatUSD(listPrice)}
              </span>
              <span className="text-[10px] font-mono font-medium text-[var(--store-surface-text)]/80 tabular-nums">
                {formatVES(pricing.priceInBs)}
              </span>
            </div>

            {penalty > 0 && !isOutOfStock && (
              <div
                className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[9px] font-medium w-fit mt-0.5"
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--store-incentive) 12%, var(--store-bg))',
                  color: 'var(--store-incentive)'
                }}
              >
                <Flame size={10} className="fill-current shrink-0" />
                <span>Divisas: <strong>{formatUSD(cashPrice)}</strong></span>
              </div>
            )}

            {hasWholesale && (
              <div className="inline-flex items-center gap-1 text-[8.5px] font-bold text-[var(--store-text-main)] mt-0.5">
                <Zap size={9} className="fill-current shrink-0" />
                <span>Mayor ({wholesaleMinQty}+): {formatUSD(wholesaleUnitUsd)}</span>
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
        <div className={`relative ${aspectClass} w-full flex items-center justify-center`} style={imageBgStyle}>
          {product.image_url ? (
            <Image
              src={getOptimizedUrl(product.image_url)}
              alt={product.name}
              fill
              priority={isPriorityImage}
              loading={isPriorityImage ? undefined : 'lazy'}
              sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
              onLoad={handleImageLoad}
              className={`transition-[transform,opacity] duration-300 ease-out ${fitClass} ${isContain ? 'group-hover:scale-100' : 'md:group-hover:scale-105'} ${isImageLoaded ? 'opacity-100' : 'opacity-0'}`}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[var(--store-surface-text)] opacity-30"><ImageIcon size={32} strokeWidth={1.5} /></div>
          )}

          <div className="absolute top-4 left-4 z-10 flex flex-col gap-1.5 pointer-events-none">
            {isOutOfStock ? (
              <span className="bg-[var(--store-badge-soldout-bg)] text-[var(--store-badge-soldout-text)] text-[9px] font-bold uppercase px-2.5 py-1 rounded-full shadow-sm">
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

          <button
            onClick={handleToggleFav}
            className={`absolute top-4 right-4 z-20 p-2 rounded-full transition-colors duration-200 active:scale-90 ${isFavorite ? 'bg-[var(--store-surface)] text-[var(--store-action-favorite)] shadow-sm' : 'bg-transparent text-[var(--store-surface-text)] hover:text-[var(--store-action-favorite)]'}`}
            aria-label="Favorito"
          >
            <Heart size={16} strokeWidth={2.5} className={isFavorite ? "fill-current" : ""} />
          </button>
        </div>

        {/* 2. DATOS DEL PRODUCTO (100% Datos Reales) */}
        <div className="px-4 pb-4 md:px-5 md:pb-5 flex flex-col flex-1 z-10">
          {(product.category || product.sku) && (
            <div className="flex items-center justify-between gap-1.5 mb-1">
              {product.category ? (
                <span className="text-[10px] font-semibold text-[var(--store-surface-text)] uppercase tracking-wider truncate">
                  {product.category}
                </span>
              ) : <span />}
              {product.sku && (
                <span className="text-[9px] font-mono text-[var(--store-surface-text)] shrink-0">
                  {product.sku}
                </span>
              )}
            </div>
          )}

          <h3 className="text-sm md:text-base font-bold text-[var(--store-text-main)] leading-snug line-clamp-2 group-hover:text-[var(--store-primary)] transition-colors">
            {product.name}
          </h3>

          {availableSizesPreview.length > 0 && (
            <span className="mt-1 text-[9.5px] font-medium text-[var(--store-surface-text)] truncate">
              {availableSizesPreview.slice(0, 4).join(' · ')}{availableSizesPreview.length > 4 ? ` +${availableSizesPreview.length - 4}` : ''}
            </span>
          )}

          <div className="mt-auto pt-3 flex flex-col min-w-0 pr-11 relative z-10">
            {isPromo && <span className="text-[10px] font-bold text-[var(--store-surface-text)] line-through mb-0.5">{formatUSD(activeCompareAt)}</span>}
            <div className="flex items-baseline gap-1">
              <span className={`text-xl md:text-2xl font-black leading-none tracking-tight ${isPromo ? 'text-[var(--store-badge-discount-bg)]' : 'text-[var(--store-text-main)]'}`}>
                {formatUSD(listPrice)}
              </span>
            </div>
            <span className="text-[11px] font-medium text-[var(--store-surface-text)] mt-1 tabular-nums">{formatVES(pricing.priceInBs)}</span>

            {penalty > 0 && !isOutOfStock && (
              <div className="mt-1.5 text-[9.5px] font-bold text-[var(--store-incentive)] flex items-center gap-1">
                <Flame size={10} className="fill-current shrink-0" />
                <span>En divisas: {formatUSD(cashPrice)}</span>
              </div>
            )}

            {hasWholesale && (
              <div className="mt-1 text-[9px] font-bold text-[var(--store-text-main)] flex items-center gap-1">
                <Zap size={9} className="fill-current shrink-0" />
                <span>Mayor ({wholesaleMinQty}+): {formatUSD(wholesaleUnitUsd)}</span>
              </div>
            )}
          </div>
        </div>

        <button
          disabled={isOutOfStock}
          className={`absolute bottom-3 right-3 md:bottom-4 md:right-4 z-20 w-8 h-8 md:w-9 md:h-9 rounded-full flex items-center justify-center shrink-0 transition-transform active:scale-90 ${isOutOfStock ? 'bg-[var(--store-badge-soldout-bg)] text-[var(--store-badge-soldout-text)] cursor-not-allowed shadow-none' : 'bg-[var(--store-primary)] text-[var(--store-primary-text)] hover:scale-105 shadow-md shadow-[var(--store-primary)]/20'}`}
          aria-label="Añadir al Carrito"
        >
          {isOutOfStock ? <X size={14} strokeWidth={2.5} /> : <Plus size={18} strokeWidth={2.5} />}
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
      <div className={`relative ${aspectClass} w-full bg-[var(--store-surface)] overflow-hidden rounded-[var(--radius-card)]`} style={imageBgStyle}>
        {product.image_url ? (
          <Image
            src={getOptimizedUrl(product.image_url)}
            alt={product.name}
            fill
            priority={isPriorityImage}
            loading={isPriorityImage ? undefined : 'lazy'}
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
            onLoad={handleImageLoad}
            className={`transition-[transform,opacity] duration-300 ease-out ${fitClass} ${isContain ? 'group-hover:scale-100' : 'md:group-hover:scale-105'} ${isImageLoaded ? 'opacity-100' : 'opacity-0'}`}
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

        {isPromo && !isOutOfStock && (
          <div className="absolute top-2.5 right-2.5 md:top-3 md:right-3 z-10 bg-[var(--store-badge-discount-bg)] text-[var(--store-badge-discount-text)] text-[10px] md:text-xs font-black px-2.5 py-1 rounded-[var(--radius-btn)] tracking-widest shadow-[var(--shadow-ui)] pointer-events-none">
            -{promoPercent}%
          </div>
        )}

        <button
          onClick={handleToggleFav}
          className={`absolute bottom-2.5 left-2.5 md:bottom-3 md:left-3 z-20 p-2 rounded-[var(--radius-btn)] border-[length:var(--border-width-ui)] transition-colors shadow-[var(--shadow-ui)] active:scale-90 ${isFavorite
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
              <div
                key={idx}
                className="w-3 h-3 md:w-3.5 md:h-3.5 rounded-full ring-1 ring-white/90 shadow-sm"
                style={getVariantSwatchStyle(colorHex)}
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

      {/* 🚀 FICHA UNIVERSAL: ARQUITECTURA DE 3 RANURAS RÍGIDAS */}
      <div className="flex flex-col flex-1 pt-3 pb-1 justify-between min-w-0">
        <div className="min-h-[2.8em] max-h-[2.8em] flex items-start overflow-hidden">
          <h3 className="text-xs md:text-sm font-medium text-[var(--store-text-main)] tracking-[0.03em] leading-snug group-hover:text-[var(--store-primary)] transition-colors line-clamp-2">
            {product.name}
          </h3>
        </div>

        <div className="mt-auto pt-2.5 border-t border-[var(--store-border)]/30 flex flex-col justify-end">
          <div className="flex items-end justify-between gap-2 min-h-[44px]">
            <div className="flex flex-col justify-end min-w-0">
              <div className="min-h-[14px] flex items-center gap-1.5">
                {isPromo ? (
                  <span className="text-[10px] md:text-xs font-bold text-[var(--store-surface-text)] line-through decoration-[var(--store-border)] leading-none">
                    {formatUSD(activeCompareAt)}
                  </span>
                ) : availableSizesPreview.length > 0 ? (
                  <span className="text-[9px] font-mono font-medium text-[var(--store-surface-text)] truncate leading-none">
                    {availableSizesPreview.slice(0, 4).join(' · ')}{availableSizesPreview.length > 4 ? ` +${availableSizesPreview.length - 4}` : ''}
                  </span>
                ) : null}
              </div>

              <span className={`text-sm md:text-base font-black leading-none tracking-tight ${isPromo ? 'text-[var(--store-badge-discount-bg)]' : 'text-[var(--store-text-main)]'}`}>
                {formatUSD(listPrice)}
              </span>

              <span className="text-[10px] font-mono font-bold text-[var(--store-surface-text)] leading-none mt-1.5 tabular-nums">
                {formatVES(pricing.priceInBs)}
              </span>
            </div>
            <button
              disabled={isOutOfStock}
              className={`w-8 h-8 md:w-9 md:h-9 rounded-[var(--radius-btn)] border-[length:var(--border-width-ui)] flex items-center justify-center shrink-0 transition-colors ${isOutOfStock
                  ? 'bg-[var(--store-badge-soldout-bg)] text-[var(--store-badge-soldout-text)] border-transparent cursor-not-allowed shadow-none'
                  : 'bg-[var(--store-surface)] text-[var(--store-surface-text)] border-[var(--store-border)] shadow-[var(--shadow-ui)] group-hover:bg-[var(--store-primary)] group-hover:text-[var(--store-primary-text)] group-hover:border-[var(--store-primary)] active:scale-90'
                }`}
              aria-label="Ver producto"
            >
              <ShoppingCart size={14} strokeWidth={2.5} className="ml-[-1px]" />
            </button>
          </div>

          <div className="min-h-[20px] flex items-center justify-between gap-1.5 mt-1">
            {penalty > 0 && !isOutOfStock ? (
              <div className="inline-flex items-center gap-1 text-[9px] md:text-[10px] font-bold text-[var(--store-incentive)] leading-none truncate">
                <Flame size={11} className="text-[var(--store-incentive)] fill-[var(--store-incentive)] shrink-0" />
                <span className="truncate">En divisas: {formatUSD(cashPrice)}</span>
              </div>
            ) : hasWholesale ? (
              <div className="inline-flex items-center gap-1 text-[9px] font-bold text-[var(--store-text-main)] leading-none truncate">
                <Zap size={10} className="fill-current shrink-0" />
                <span className="truncate">Mayor ({wholesaleMinQty}+): {formatUSD(wholesaleUnitUsd)}</span>
              </div>
            ) : showTaxIndicator && isTaxable ? (
              <div className="inline-flex items-center gap-1 text-[8px] md:text-[9px] font-mono text-[var(--store-surface-text)] leading-none truncate">
                <Receipt size={10} /> +{formatUSD(taxAmountUsd)} IVA
              </div>
            ) : null}
          </div>
        </div>
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

  // 2. Si el producto no cambió, validamos únicamente los estados externos de UI y el Encuadre (mediaConfig)
  if (!isProductIdentical) return false;
  return (
    prev.isFavorite === next.isFavorite &&
    prev.isOutOfStock === next.isOutOfStock &&
    prev.isCriticalStock === next.isCriticalStock &&
    prev.showTaxIndicator === next.showTaxIndicator &&
    prev.taxPercentage === next.taxPercentage &&
    prev.cardStyle === next.cardStyle &&
    prev.isFeatured === next.isFeatured &&
    prev.mediaConfig?.ratio === next.mediaConfig?.ratio &&
    prev.mediaConfig?.fit === next.mediaConfig?.fit &&
    prev.mediaConfig?.bg_color === next.mediaConfig?.bg_color &&
    // Validamos pricing porque los padres suelen pasarlo como objeto literal
    prev.pricing.priceInBs === next.pricing.priceInBs &&
    prev.pricing.cashPrice === next.pricing.cashPrice &&
    prev.pricing.discountPercent === next.pricing.discountPercent
  );
}

export default memo(ProductCardComponent, areProductCardPropsEqual);