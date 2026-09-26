// components/restaurant/FoodDishCard.tsx
'use client'

import { useState, useMemo, useCallback, memo, useRef } from 'react'
import Image from 'next/image'
import { Plus, Heart, Clock, Flame, Check, SlidersHorizontal } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { getOptimizedUrl } from '@/utils/cdn'
import { useCart } from '@/app/store/useCart'

const currencyFormatter = new Intl.NumberFormat('es-VE', { maximumFractionDigits: 2 })

export interface FoodDishCardProps {
    product: any
    activeRate: number
    onOpenModal: (product: any) => void
    isOutOfStock?: boolean
    index?: number
    isFavorite?: boolean
    layoutVariant?: 'grid' | 'row'
}

function FoodDishCardComponent({
    product,
    activeRate,
    onOpenModal,
    isOutOfStock = false,
    index = 0,
    isFavorite = false,
    layoutVariant = 'grid'
}: FoodDishCardProps) {
    const { addItem } = useCart()
    const [isImageLoaded, setIsImageLoaded] = useState(false)
    const [justAdded, setJustAdded] = useState(false)
    const imageRef = useRef<HTMLDivElement>(null) // 🚀 Referencia geométrica de origen

    // Cálculos financieros
    const cashPrice = Number(product.usd_cash_price || 0)
    const penalty = Number(product.usd_penalty || 0)
    const listPrice = cashPrice + penalty
    const compareAt = Number(product.compare_at_usd || 0)
    const isPromo = compareAt > listPrice
    const promoPercent = isPromo ? Math.round(((compareAt - listPrice) / compareAt) * 100) : 0
    const formattedBs = currencyFormatter.format(listPrice * activeRate)

    // Detección de modificadores configurados
    const hasModifiers = useMemo(() => {
        return Boolean(
            product.product_modifier_groups && 
            product.product_modifier_groups.length > 0
        )
    }, [product.product_modifier_groups])

    // Prioridad de carga para las primeras imágenes (LCP Optimization)
    const isPriorityImage = index < 4

    // Manejador del corazón de favoritos
    const handleToggleFav = useCallback((e: React.MouseEvent) => {
        e.stopPropagation()
        document.dispatchEvent(new CustomEvent('toggleFavorite', { detail: product }))
    }, [product])

    // Manejador del botón de acción rápida
    const handleQuickAction = useCallback((e: React.MouseEvent) => {
        e.stopPropagation()
        if (isOutOfStock) return

        // Si el plato tiene personalizaciones, abrimos el modal de configuración
        if (hasModifiers) {
            onOpenModal(product)
            return
        }
  // Si es un plato directo sin extras, calculamos la parábola hacia el carrito
        if (imageRef.current) {
            const startRect = imageRef.current.getBoundingClientRect()
            const src = product.image_url ? getOptimizedUrl(product.image_url) : ''
            document.dispatchEvent(new CustomEvent('flyToCart', { detail: { startRect, src } }))
        }

        addItem(product, null, 1)

        if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate(30)
        }
        // Feedback visual en el botón
        setJustAdded(true)
        setTimeout(() => setJustAdded(false), 800)

        // Evento global para animaciones de carrito y contador
        document.dispatchEvent(new CustomEvent('cartImpact'))
    }, [isOutOfStock, hasModifiers, product, onOpenModal, addItem])

    // =========================================================================
    // VARIANTE HORIZONTAL (Estilo Lista Compacta / Formato UberEats)
    // =========================================================================
    if (layoutVariant === 'row') {
        return (
         <motion.div
                whileHover={{ y: -2 }}
                transition={{ duration: 0.2, ease: [0.25, 1, 0.5, 1] }}
                onClick={() => !isOutOfStock && onOpenModal(product)}
                className={`w-full p-4 sm:p-5 bg-[var(--store-surface)] border-[length:var(--border-width-ui)] border-[var(--store-border)] hover:border-[var(--store-primary)]/40 transition-all cursor-pointer flex items-center justify-between gap-4 group relative shadow-[var(--shadow-ui)] ${
                    isOutOfStock ? 'opacity-50 grayscale-[30%]' : ''
                }`}
                style={{ borderRadius: 'var(--radius-card)' }}
            >
                {/* Textos y Precios (Izquierda) */}
                <div className="flex-1 min-w-0 flex flex-col justify-between h-full py-0.5">
                    <div>
                        {product.shipping_badge_title && (
                            <span 
                                className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-0.5 rounded-full mb-2 font-mono"
                                style={{
                                    backgroundColor: 'color-mix(in srgb, var(--store-primary) 8%, var(--store-surface))',
                                    color: 'var(--store-text-main)'
                                }}
                            >
                                <Clock size={11} className="opacity-70" /> 
                                <span>{product.shipping_badge_title}</span>
                            </span>
                        )}
                        <h4 className="text-sm sm:text-base font-bold text-[var(--store-text-main)] tracking-tight leading-snug line-clamp-1 group-hover:text-[var(--store-primary)] transition-colors">
                            {product.name}
                        </h4>
                        <p className="text-xs text-[var(--store-surface-text)] font-normal line-clamp-2 mt-1 leading-relaxed">
                            {product.description || 'Preparado al momento con ingredientes selectos.'}
                        </p>
                    </div>

                    <div className="mt-3.5 pt-2 border-t border-[var(--store-border)]/30 flex flex-col gap-1">
                        <div className="flex items-baseline gap-2">
                            <span className="text-base sm:text-lg font-black text-[var(--store-text-main)] font-mono leading-none tracking-tight">
                                ${listPrice.toFixed(2)}
                            </span>
                            <span className="text-[11px] font-mono font-medium text-[var(--store-surface-text)] tabular-nums leading-none">
                                Bs. {formattedBs}
                            </span>
                            {isPromo && (
                                <span className="text-[10px] text-[var(--store-surface-text)] line-through font-mono opacity-60">
                                    ${compareAt.toFixed(2)}
                                </span>
                            )}
                        </div>

                        {penalty > 0 && !isOutOfStock && (
                            <div className="inline-flex items-center gap-1 text-[10px] font-bold text-[var(--store-incentive)] font-mono">
                                <Flame size={11} className="fill-current shrink-0" />
                                <span>Paga ${cashPrice.toFixed(2)} USD</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Fotografía y Botón Acción (Derecha) */}
                <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden shrink-0 border border-[var(--store-border)]/40"
                    style={{
                        backgroundColor: 'color-mix(in srgb, var(--store-surface) 80%, var(--store-bg))'
                    }}
                >
                    {product.image_url ? (
                        <Image
                            src={getOptimizedUrl(product.image_url)}
                            alt={product.name}
                            fill
                            priority={isPriorityImage}
                            sizes="120px"
                            onLoad={() => setIsImageLoaded(true)}
                            className={`object-cover transition-transform duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] group-hover:scale-105 ${
                                isImageLoaded ? 'opacity-100' : 'opacity-0'
                            }`}
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-[var(--store-surface-text)] text-xs font-mono font-bold opacity-40">
                            MENU
                        </div>
                    )}

                    {/* Botón Circular Flotante */}
                    {!isOutOfStock && (
                        <motion.button
                            whileTap={{ scale: 0.88 }}
                            type="button"
                            onClick={handleQuickAction}
                            aria-label={hasModifiers ? 'Personalizar plato' : 'Agregar al pedido'}
                            className={`absolute bottom-2 right-2 w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center shadow-md transition-all duration-200 ${
                                justAdded
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-[var(--store-primary)] text-[var(--store-primary-text)] hover:scale-105'
                            }`}
                        >
                            <AnimatePresence mode="wait">
                                {justAdded ? (
                                    <motion.div
                                        key="check"
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        exit={{ scale: 0 }}
                                    >
                                        <Check size={16} strokeWidth={3} />
                                    </motion.div>
                                ) : hasModifiers ? (
                                    <motion.div
                                        key="modifiers"
                                        initial={{ scale: 0.8 }}
                                        animate={{ scale: 1 }}
                                        exit={{ scale: 0.8 }}
                                    >
                                        <SlidersHorizontal size={15} strokeWidth={2.2} />
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key="plus"
                                        initial={{ scale: 0.8 }}
                                        animate={{ scale: 1 }}
                                        exit={{ scale: 0.8 }}
                                    >
                                        <Plus size={18} strokeWidth={2.5} />
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.button>
                    )}
                </div>
            </motion.div>
        )
    }

    // =========================================================================
    // VARIANTE GRID (Cuadrícula Especializada / Inspiración Chick-fil-A)
    // =========================================================================
    return (
      <motion.div
            whileHover={{ y: -3 }}
            transition={{ duration: 0.25, ease: [0.25, 1, 0.5, 1] }}
            onClick={() => !isOutOfStock && onOpenModal(product)}
            className={`w-full bg-[var(--store-surface)] border-[length:var(--border-width-ui)] border-[var(--store-border)] hover:border-[var(--store-primary)]/40 transition-all cursor-pointer flex flex-col justify-between overflow-hidden group relative shadow-[var(--shadow-ui)] ${
                isOutOfStock ? 'opacity-50 grayscale-[30%]' : ''
            }`}
            style={{ borderRadius: 'var(--radius-card)' }}
        >
               {/* Contenedor Visual (Fotografía Protagónica) */}
            <div 
                ref={imageRef}
                className="relative aspect-square w-full overflow-hidden"

                style={{
                    backgroundColor: 'color-mix(in srgb, var(--store-surface) 80%, var(--store-bg))'
                }}
            >
                {product.image_url ? (
                    <Image
                        src={getOptimizedUrl(product.image_url)}
                        alt={product.name}
                        fill
                        priority={isPriorityImage}
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                        onLoad={() => setIsImageLoaded(true)}
                        className={`object-cover transition-transform duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] group-hover:scale-105 will-change-transform ${
                            isImageLoaded ? 'opacity-100' : 'opacity-0'
                        }`}
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-[var(--store-surface-text)] text-xs font-mono font-bold opacity-40">
                        MENU
                    </div>
                )}

                {/* Badges Flotantes */}
                <div className="absolute top-2.5 left-2.5 z-10 flex flex-col gap-1 pointer-events-none">
                    {isOutOfStock ? (
                        <span className="bg-neutral-950/90 text-white text-[8px] sm:text-[9px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full shadow-xs">
                            Agotado
                        </span>
                    ) : isPromo ? (
                        <span className="bg-[var(--store-badge-discount-bg)] text-[var(--store-badge-discount-text)] text-[9px] font-black px-2.5 py-0.5 rounded-full shadow-xs font-mono">
                            -{promoPercent}%
                        </span>
                    ) : product.shipping_badge_title ? (
                        <span 
                            className="text-[8px] sm:text-[9px] font-bold px-2.5 py-0.5 rounded-full shadow-xs backdrop-blur-xs flex items-center gap-1 font-mono border"
                            style={{
                                backgroundColor: 'color-mix(in srgb, var(--store-surface) 90%, transparent)',
                                borderColor: 'color-mix(in srgb, var(--store-border) 60%, transparent)',
                                color: 'var(--store-text-main)'
                            }}
                        >
                            <Clock size={10} className="opacity-70" /> 
                            <span>{product.shipping_badge_title}</span>
                        </span>
                    ) : null}
                </div>

                {/* Botón Favorito Sutil */}
               {/* Botón Favorito Dinámico */}
                <button
                    type="button"
                    onClick={handleToggleFav}
                    aria-label="Guardar en favoritos"
                    style={{
                        color: isFavorite ? 'var(--store-action-favorite)' : 'var(--store-surface-text)',
                        backgroundColor: isFavorite 
                            ? 'color-mix(in srgb, var(--store-surface) 95%, transparent)' 
                            : 'color-mix(in srgb, var(--store-surface) 80%, transparent)'
                    }}
                    className="absolute top-2.5 right-2.5 z-10 p-2 rounded-full transition-transform active:scale-90 shadow-2xs backdrop-blur-xs border border-[var(--store-border)]/30"
                >
                    <Heart 
                        size={14} 
                        strokeWidth={2.2} 
                        className={isFavorite ? 'fill-current' : ''} 
                    />
                </button>
            </div>

            {/* Ficha Descriptiva y Acción de Compra */}
            <div className="p-3.5 sm:p-4 flex flex-col flex-1 justify-between gap-2.5">
                <div>
                    <h4 className="text-xs sm:text-sm font-bold text-[var(--store-text-main)] tracking-tight leading-snug line-clamp-2 group-hover:text-[var(--store-primary)] transition-colors">
                        {product.name}
                    </h4>
                    <p className="text-[11px] text-[var(--store-surface-text)] font-normal line-clamp-2 mt-1 leading-relaxed">
                        {product.description || 'Preparado al momento con ingredientes selectos.'}
                    </p>
                </div>

                {/* Fila Financiera + Botón Circular Dinámico */}
                <div className="pt-2.5 border-t border-[var(--store-border)]/30 flex items-end justify-between gap-2 mt-auto">
                    <div className="flex flex-col min-w-0">
                        <div className="flex items-baseline gap-1.5 flex-wrap">
                            {isPromo && (
                                <span className="text-[10px] text-[var(--store-surface-text)] line-through font-mono opacity-60">
                                    ${compareAt.toFixed(2)}
                                </span>
                            )}
                            <span className="text-base sm:text-lg font-black text-[var(--store-text-main)] font-mono leading-none tracking-tight">
                                ${listPrice.toFixed(2)}
                            </span>
                        </div>
                        <span className="text-[10px] font-mono text-[var(--store-surface-text)] mt-1 tabular-nums leading-none">
                            Bs. {formattedBs}
                        </span>

                        {penalty > 0 && !isOutOfStock && (
                            <div className="mt-1.5 flex items-center gap-1 text-[9px] font-bold text-[var(--store-incentive)] font-mono">
                                <Flame size={10} className="fill-current shrink-0" />
                                <span>Paga ${cashPrice.toFixed(2)} USD</span>
                            </div>
                        )}
                    </div>

                    {/* Botón Circular con Doble Estado */}
                    {!isOutOfStock && (
                       <motion.button
                            whileTap={{ scale: 0.88 }}
                            type="button"
                            onClick={handleQuickAction}
                            aria-label={hasModifiers ? 'Personalizar plato' : 'Agregar al pedido'}
                            className={`w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center shrink-0 shadow-[var(--shadow-ui)] transition-all duration-200 ${
                                justAdded
                                    ? 'bg-emerald-600 text-white scale-105'
                                    : 'bg-[var(--store-primary)] text-[var(--store-primary-text)] hover:scale-105'
                            }`}
                            style={{ borderRadius: 'var(--radius-btn)' }}
                        >
                            <AnimatePresence mode="wait">
                                {justAdded ? (
                                    <motion.div
                                        key="check"
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        exit={{ scale: 0 }}
                                    >
                                        <Check size={16} strokeWidth={3} />
                                    </motion.div>
                                ) : hasModifiers ? (
                                    <motion.div
                                        key="custom"
                                        initial={{ scale: 0.8 }}
                                        animate={{ scale: 1 }}
                                        exit={{ scale: 0.8 }}
                                    >
                                        <SlidersHorizontal size={14} strokeWidth={2.2} />
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key="plus"
                                        initial={{ scale: 0.8 }}
                                        animate={{ scale: 1 }}
                                        exit={{ scale: 0.8 }}
                                    >
                                        <Plus size={18} strokeWidth={2.5} />
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.button>
                    )}
                </div>
            </div>
        </motion.div>
    )
}

function areEqual(prevProps: FoodDishCardProps, nextProps: FoodDishCardProps) {
    return (
        prevProps.product.id === nextProps.product.id &&
        prevProps.product.updated_at === nextProps.product.updated_at &&
        prevProps.activeRate === nextProps.activeRate &&
        prevProps.isOutOfStock === nextProps.isOutOfStock &&
        prevProps.isFavorite === nextProps.isFavorite &&
        prevProps.layoutVariant === nextProps.layoutVariant
    )
}

export default memo(FoodDishCardComponent, areEqual)