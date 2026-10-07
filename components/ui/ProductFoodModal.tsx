// components/ui/ProductFoodModal.tsx
'use client'

import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence, type Variants } from 'framer-motion'
import { X, Plus, Minus, Check, ShoppingBag, AlertCircle, Heart, Clock, ChevronDown } from 'lucide-react'
import Image from 'next/image'
import { getOptimizedUrl } from '@/utils/cdn'
import { useCart, FoodSelectedModifier } from '@/app/store/useCart'

const currencyFormatter = new Intl.NumberFormat('es-VE', { maximumFractionDigits: 2 })

export interface ModifierOption {
    id: string
    name: string
    price_adjustment_usd: number
    is_available: boolean
    image_url?: string | null // 🚀 SOPORTE FOTOGRÁFICO DE OPCIONES
}

export interface ModifierGroup {
    id: string
    name: string
    is_required: boolean
    min_selections: number
    max_selections: number
    modifier_options: ModifierOption[]
    selection_type?: 'single' | 'multiple' | 'quantity' // 🚀 INYECCIÓN AQUÍ
}

export interface ProductFoodModalProps {
    isOpen: boolean
    onClose: () => void
    product: any
    activeRate?: number
}

const QUICK_KITCHEN_TAGS = ['Sin cebolla', 'Salsas aparte', 'Bien cocido', 'Sin salsas', 'Poco condimento']

// Animación de traslación pura y sólida: X en Desktop / Y en Móvil
const sheetVariants: Variants = {
    hidden: (isDesktop: boolean) => ({
        y: isDesktop ? '0%' : '100%',
        x: isDesktop ? '100%' : '0%',
        opacity: 1
    }),
    visible: {
        y: '0%',
        x: '0%',
        opacity: 1,
        transition: { duration: 0.28, ease: [0.32, 0.72, 0, 1] }
    },
    exit: (isDesktop: boolean) => ({
        y: isDesktop ? '0%' : '100%',
        x: isDesktop ? '100%' : '0%',
        opacity: 1,
        transition: { duration: 0.22, ease: [0.32, 0.72, 0, 1] }
    })
}

export default function ProductFoodModal({
    isOpen,
    onClose,
    product,
    activeRate = 0
}: ProductFoodModalProps) {
    // 🚀 PERF FIX: Selector atómico estricto. Protege el árbol del Modal de re-renders no deseados.
    const addItem = useCart(state => state.addItem)

const [selectedOptions, setSelectedOptions] = useState<Record<string, ModifierOption[]>>({})
    const [notes, setNotes] = useState('')
    const [quantity, setQuantity] = useState(1)
    const [shakeError, setShakeError] = useState(false)
    const [isDesktop, setIsDesktop] = useState(false)
    const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false)
    const [canOverflow, setCanOverflow] = useState(false)
    const modalHeroRef = useRef<HTMLDivElement>(null)
    const descRef = useRef<HTMLParagraphElement>(null)

    // 🚀 HERO IMAGE SWAPPING REACTIVO: Si el comensal selecciona un relleno o extra con foto, cambia la foto principal
    const activeDisplayImage = useMemo(() => {
        const allSelected = Object.values(selectedOptions).flat()
        // Busca la última opción seleccionada que posea fotografía propia
        const optionWithImage = [...allSelected].reverse().find((opt) => opt.image_url)
        return optionWithImage?.image_url || product?.image_url || ''
    }, [selectedOptions, product?.image_url])

    // Interceptor nativo para gestos móviles (botón atrás)
    useEffect(() => {
        if (!isOpen) return
        const modalId = `food-modal-${Date.now()}`
        window.history.pushState({ modalId }, '')

        const handlePopState = () => {
            onClose()
        }

        window.addEventListener('popstate', handlePopState)

        return () => {
            window.removeEventListener('popstate', handlePopState)
            if (window.history.state?.modalId === modalId) {
                window.history.go(-1)
            }
        }
    }, [isOpen, onClose])

    // Bloqueo de scroll del fondo
    useEffect(() => {
        if (isOpen) {
            document.documentElement.style.overflow = 'hidden'
            document.body.style.overflow = 'hidden'
        } else {
            document.documentElement.style.overflow = ''
            document.body.style.overflow = ''
        }

        return () => {
            document.documentElement.style.overflow = ''
            document.body.style.overflow = ''
        }
    }, [isOpen])

    useEffect(() => {
        const handleResize = () => setIsDesktop(window.innerWidth >= 768)
        handleResize()
        window.addEventListener('resize', handleResize, { passive: true })
        return () => window.removeEventListener('resize', handleResize)
    }, [])

useEffect(() => {
        if (isOpen) {
            setSelectedOptions({})
            setNotes('')
            setQuantity(1)
            setShakeError(false)
            setIsDescriptionExpanded(false)

            // 🚀 Medición DOM milimétrica: Comprueba si el texto supera las 2 líneas físicamente
            const checkOverflow = () => {
                if (descRef.current) {
                    const isClamped = descRef.current.scrollHeight > descRef.current.clientHeight + 1
                    setCanOverflow(isClamped)
                }
            }

            const timer = setTimeout(checkOverflow, 60)
            window.addEventListener('resize', checkOverflow)

            return () => {
                clearTimeout(timer)
                window.removeEventListener('resize', checkOverflow)
            }
        } else {
            setCanOverflow(false)
        }
    }, [isOpen, product?.description])

    const handleToggleOption = useCallback((group: ModifierGroup, option: ModifierOption) => {
        if (!option.is_available) return

        setSelectedOptions((prev) => {
            const currentSelected = prev[group.id] || []
            const isAlreadySelected = currentSelected.some((o) => o.id === option.id)

            if (group.max_selections === 1) {
                return { ...prev, [group.id]: [option] }
            }

            if (isAlreadySelected) {
                return {
                    ...prev,
                    [group.id]: currentSelected.filter((o) => o.id !== option.id)
                }
            }

            if (currentSelected.length < group.max_selections) {
                return { ...prev, [group.id]: [...currentSelected, option] }
            }

            if (typeof navigator !== 'undefined' && navigator.vibrate) {
                navigator.vibrate(40)
            }
            return prev
        })
    }, [])

    // 🚀 ELITE: Incrementador Cuantitativo con Tope Matemático
    const handleIncrementOption = useCallback((group: ModifierGroup, option: ModifierOption) => {
        if (!option.is_available) return
        setSelectedOptions((prev) => {
            const currentSelected = prev[group.id] || []
            if (currentSelected.length < group.max_selections) {
                if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(15) // Taptic leve
                return { ...prev, [group.id]: [...currentSelected, option] }
            }
            if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate([20, 40, 20]) // Error shake
            return prev
        })
    }, [])

    // 🚀 ELITE: Decrementador Cuantitativo
    const handleDecrementOption = useCallback((group: ModifierGroup, option: ModifierOption) => {
        setSelectedOptions((prev) => {
            const currentSelected = prev[group.id] || []
            // Busca y elimina solo UNA instancia (la última agregada)
            const indexToRemove = currentSelected.findLastIndex(o => o.id === option.id)
            if (indexToRemove > -1) {
                if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(10)
                const newSelected = [...currentSelected]
                newSelected.splice(indexToRemove, 1)
                return { ...prev, [group.id]: newSelected }
            }
            return prev
        })
    }, [])

    const handleAddQuickTag = (tag: string) => {
        setNotes((prev) => {
            if (prev.includes(tag)) return prev
            return prev ? `${prev}, ${tag}` : tag
        })
    }

    const { isValid, totalExtraCost, missingGroups } = useMemo(() => {
        if (!product || !product.modifier_groups) {
            return { isValid: true, totalExtraCost: 0, missingGroups: [] }
        }

        let valid = true
        let extraCost = 0
        const missing: string[] = []

        product.modifier_groups.forEach((group: ModifierGroup) => {
            const selectedCount = selectedOptions[group.id]?.length || 0

            if (group.is_required && selectedCount < group.min_selections) {
                valid = false
                missing.push(group.name)
            }

            if (selectedOptions[group.id]) {
                selectedOptions[group.id].forEach((opt) => {
                    extraCost += Number(opt.price_adjustment_usd || 0)
                })
            }
        })

        return { isValid: valid, totalExtraCost: extraCost, missingGroups: missing }
    }, [selectedOptions, product])

    const basePrice = Number(product?.usd_cash_price || 0) + Number(product?.usd_penalty || 0)
    const unitPriceUSD = basePrice + totalExtraCost
    const totalPriceUSD = unitPriceUSD * quantity
    const totalPriceBs = activeRate > 0 ? totalPriceUSD * activeRate : 0

    const handleAddToCart = () => {
        if (!isValid) {
            setShakeError(true)
            setTimeout(() => setShakeError(false), 500)
            if (typeof navigator !== 'undefined' && navigator.vibrate) {
                navigator.vibrate([40, 80, 40])
            }
            return
        }

        if (!product) return

        // 🚀 La animación de volar al carrito usa la foto del relleno/extra seleccionado
        if (modalHeroRef.current) {
            const startRect = modalHeroRef.current.getBoundingClientRect()
            const src = activeDisplayImage ? getOptimizedUrl(activeDisplayImage) : ''
            document.dispatchEvent(new CustomEvent('flyToCart', { detail: { startRect, src } }))
        }

        // 🚀 ELITE: Agrupador para WhatsApp y Cierres (Convierte [Opt, Opt] en "2x Opt")
        const flatModifiers: FoodSelectedModifier[] = Object.values(selectedOptions)
            .flat()
            .reduce((acc: any[], opt) => {
                const existing = acc.find(m => m.optionId === opt.id)
                if (existing) {
                    existing.qty += 1
                    existing.priceAdjustment += Number(opt.price_adjustment_usd || 0)
                    existing.name = `${existing.qty}x ${existing.baseName}` // Ej: "3x Arequipe"
                } else {
                    acc.push({
                        optionId: opt.id,
                        qty: 1,
                        baseName: opt.name, // Guardamos el original para futuras sumas
                        name: opt.name,     // En cantidad 1, se llama normal "Arequipe"
                        priceAdjustment: Number(opt.price_adjustment_usd || 0)
                    })
                }
                return acc
            }, [])
            .map(m => ({
                optionId: m.optionId,
                name: m.name,
                priceAdjustment: m.priceAdjustment
            }))

        // 🚀 PERF FIX: requestAnimationFrame asegura que la mutación masiva de agregar al carrito
        // no congele el cierre visual del modal.
        requestAnimationFrame(() => {
            addItem(product, null, quantity, flatModifiers, notes.trim() !== '' ? notes : undefined)

            if (typeof navigator !== 'undefined' && navigator.vibrate) {
                navigator.vibrate(30)
            }

            onClose()
        })
    }
    if (!product) return null

    return (
        <AnimatePresence mode="wait">
            {isOpen && (
                <motion.div
                    key="food-modal-portal-root"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
                    className="fixed inset-0 z-100 flex items-end md:items-stretch justify-end bg-neutral-950/50 backdrop-blur-xs transform-gpu"
                >
                    {/* Backdrop Click */}
                    <div
                        onClick={onClose}
                        className="absolute inset-0 z-0"
                        aria-hidden="true"
                    />

                    {/* CAJÓN LATERAL DERECHO */}
                    <motion.div
                        key="food-modal-sheet-panel"
                        custom={isDesktop}
                        variants={sheetVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        style={{
                            borderTopLeftRadius: 'var(--radius-card, 32px)',
                            borderBottomLeftRadius: isDesktop ? 'var(--radius-card, 32px)' : '0px',
                            borderTopRightRadius: isDesktop ? '0px' : 'var(--radius-card, 32px)',
                            borderBottomRightRadius: '0px',
                        }}
                        className={`relative bg-[var(--store-surface)] overflow-hidden shadow-2xl z-10 border-l border-[var(--store-border)]/40 will-change-transform ${isDesktop
                            ? 'w-full md:w-[780px] lg:w-[840px] xl:w-[880px] h-full grid grid-cols-12'
                            : 'w-full h-[100dvh] max-h-[100dvh] flex flex-col'
                            }`}
                    >
                        {/* ========================================================= */}
                        {/* MITAD IZQUIERDA (DESKTOP): HERO CON CROSS-FADE DINÁMICO   */}
                        {/* ========================================================= */}
                        {isDesktop && (
                            <div
                                ref={modalHeroRef}
                                className="col-span-5 h-full relative overflow-hidden bg-[var(--store-bg)] border-r border-[var(--store-border)]/40 flex flex-col justify-between p-6 select-none"
                            >
                                <div className="relative z-10 flex items-center justify-between">
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            document.dispatchEvent(new CustomEvent('toggleFavorite', { detail: product }))
                                        }}
                                        className="w-10 h-10 rounded-full bg-[var(--store-surface)]/90 hover:bg-[var(--store-surface)] text-[var(--store-text-main)] flex items-center justify-center shadow-[var(--shadow-ui)] border border-[var(--store-border)]/40 backdrop-blur-md transition-transform active:scale-90"
                                        aria-label="Añadir a favoritos"
                                    >
                                        <Heart size={18} strokeWidth={2.2} />
                                    </button>

                                    {product.shipping_badge_title && (
                                        <span className="inline-flex items-center gap-1.5 text-[10px] font-mono font-bold bg-[var(--store-surface)] text-[var(--store-text-main)] px-3 py-1 rounded-full border border-[var(--store-border)]/40 shadow-xs">
                                            <Clock size={12} /> {product.shipping_badge_title}
                                        </span>
                                    )}
                                </div>

                                {/* Contenedor con Transición Cross-Fade */}
                                <div className="relative w-full flex-1 flex items-center justify-center my-auto min-h-0 p-4 overflow-hidden">
                                    <AnimatePresence mode="wait">
                                        {activeDisplayImage ? (
                                            <motion.div
                                                key={activeDisplayImage}
                                                initial={{ opacity: 0, scale: 0.96 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                exit={{ opacity: 0, scale: 0.96 }}
                                                transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
                                                className="relative w-full h-full flex items-center justify-center"
                                            >
                                                <Image
                                                    src={getOptimizedUrl(activeDisplayImage)}
                                                    alt={product.name}
                                                    fill
                                                    priority
                                                    sizes="450px"
                                                    className="object-contain p-2 drop-shadow-xl"
                                                />
                                            </motion.div>
                                        ) : (
                                            <div className="text-[var(--store-surface-text)] font-mono text-xs opacity-50">
                                                FOTOGRAFIA NO DISPONIBLE
                                            </div>
                                        )}
                                    </AnimatePresence>
                                </div>

                                <div className="relative z-10 pt-3 border-t border-[var(--store-border)]/40 flex items-center justify-between">
                                    <span className="text-xs font-bold uppercase tracking-wider text-[var(--store-surface-text)] font-mono">
                                        {product.category || 'Especialidad'}
                                    </span>
                                    <span className="text-xs font-mono font-bold bg-[var(--store-surface)] text-[var(--store-text-main)] px-3 py-1 rounded-full border border-[var(--store-border)]/50 shadow-2xs">
                                        Base: ${basePrice.toFixed(2)}
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* ========================================================= */}
                        {/* MITAD DERECHA: EXTRAS VISUALES Y FOOTER                    */}
                        {/* ========================================================= */}
                        <div className={`${isDesktop ? 'col-span-7' : 'w-full'} h-full flex flex-col min-h-0 relative bg-[var(--store-surface)]`}>

                            {/* Cabecera */}
                            <div className="p-5 sm:p-6 pb-4 border-b border-[var(--store-border)]/40 flex items-start justify-between gap-4 shrink-0">
                                <div className="min-w-0 flex-1 space-y-1 text-left">
                                    {product.category && (
                                        <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[var(--store-surface-text)] block">
                                            {product.category}
                                        </span>
                                    )}
                                    <h2 className="text-xl sm:text-2xl font-black text-[var(--store-text-main)] tracking-tight leading-tight">
                                        {product.name}
                                    </h2>
                                {product.description && (
                                        <div className="pt-0.5">
                                            <p
                                                ref={descRef}
                                                className={`text-xs text-[var(--store-surface-text)] leading-relaxed font-normal transition-all ${isDescriptionExpanded ? '' : 'line-clamp-2'}`}
                                            >
                                                {product.description}
                                            </p>
                                            {canOverflow && (
                                                <button
                                                    type="button"
                                                    onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                                                    className="inline-flex items-center gap-1 text-[10px] font-bold text-[var(--store-text-main)]/80 hover:text-[var(--store-text-main)] transition-colors mt-0.5 active:scale-95 cursor-pointer py-0.5"
                                                    aria-label={isDescriptionExpanded ? "Ver menos" : "Ver descripción completa"}
                                                >
                                                    <span>{isDescriptionExpanded ? "Ver menos" : "Ver más"}</span>
                                                    <ChevronDown
                                                        size={12}
                                                        className={`transition-transform duration-200 ${isDescriptionExpanded ? 'rotate-180' : ''}`}
                                                    />
                                                </button>
                                            )}
                                        </div>
                                    )}
                                    <div className="flex items-baseline gap-2 pt-1">
                                        <span className="text-lg sm:text-xl font-mono font-black text-[var(--store-text-main)]">
                                            ${basePrice.toFixed(2)}
                                        </span>
                                        {activeRate > 0 && (
                                            <span className="text-xs font-mono text-[var(--store-surface-text)] tabular-nums">
                                                Bs. {currencyFormatter.format(basePrice * activeRate)}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={onClose}
                                    aria-label="Cerrar ventana"
                                    className="w-8 h-8 rounded-full bg-[var(--store-bg)] hover:bg-neutral-200 text-[var(--store-text-main)] flex items-center justify-center transition-transform active:scale-90 shrink-0"
                                >
                                    <X size={16} strokeWidth={2.5} />
                                </button>
                            </div>

                            {/* Cuerpo Scrolleable */}
                            <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar p-5 sm:p-6 space-y-6 text-left">

                                {/* En móvil: Hero con Cross-Fade Dinámico */}
                                {!isDesktop && (
                                    <div
                                        ref={modalHeroRef}
                                        className="w-full aspect-[16/10] relative bg-[var(--store-bg)] overflow-hidden rounded-2xl shrink-0"
                                    >
                                        <AnimatePresence mode="wait">
                                            {activeDisplayImage ? (
                                                <motion.div
                                                    key={activeDisplayImage}
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    exit={{ opacity: 0 }}
                                                    transition={{ duration: 0.22, ease: "easeInOut" }}
                                                    className="absolute inset-0"
                                                >
                                                    <Image
                                                        src={getOptimizedUrl(activeDisplayImage)}
                                                        alt={product.name}
                                                        fill
                                                        sizes="(max-width: 640px) 100vw, 550px"
                                                        className="object-cover"
                                                        priority
                                                    />
                                                </motion.div>
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-[var(--store-surface-text)] text-xs font-mono font-bold">
                                                    MENU
                                                </div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                )}

                                {/* Grupos de Modificadores */}
                                {product.modifier_groups?.map((group: ModifierGroup, gIdx: number) => {
                                    const selectedCount = selectedOptions[group.id]?.length || 0
                                    const isSatisfied = !group.is_required || selectedCount >= group.min_selections

                                    // 🚀 Detección Inteligente del Modo de Selección
                                    const isSingleChoice = group.selection_type === 'single' || (!group.selection_type && group.max_selections === 1)
                                    const isQuantity = group.selection_type === 'quantity'

                                    return (
                                        <div key={group.id} className="space-y-3">
                                            <div className="flex items-center justify-between border-b border-[var(--store-border)]/40 pb-2 gap-2">
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="w-5 h-5 rounded-full bg-[var(--store-text-main)] text-[var(--store-bg)] flex items-center justify-center text-[10px] font-mono font-bold shrink-0">
                                                            {gIdx + 1}
                                                        </span>
                                                        <h3 className="font-bold text-sm sm:text-base text-[var(--store-text-main)] tracking-tight truncate">
                                                            {group.name}
                                                        </h3>
                                                    </div>
                                                    {/* Leyenda Dinámica de Cupos */}
                                                    <span className="text-[10px] text-[var(--store-surface-text)] font-medium mt-1 block pl-7">
                                                        {isQuantity
                                                            ? `Selecciona ${group.min_selections === group.max_selections ? `exactamente ${group.max_selections}` : `hasta ${group.max_selections}`} (Llevas ${selectedCount})`
                                                            : isSingleChoice
                                                                ? 'Selecciona 1 opción'
                                                                : `Selecciona hasta ${group.max_selections} opciones`
                                                        }
                                                    </span>
                                                </div>

                                                <span
                                                    className="text-[9px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full shrink-0 font-mono transition-colors"
                                                    style={{
                                                        backgroundColor: group.is_required
                                                            ? (isSatisfied ? 'color-mix(in srgb, #10b981 12%, var(--store-surface))' : 'color-mix(in srgb, #f43f5e 12%, var(--store-surface))')
                                                            : (selectedCount > 0 ? 'color-mix(in srgb, var(--store-primary) 10%, var(--store-surface))' : 'color-mix(in srgb, var(--store-border) 40%, var(--store-surface))'),
                                                        color: group.is_required
                                                            ? (isSatisfied ? '#059669' : '#e11d48')
                                                            : (selectedCount > 0 ? 'var(--store-primary)' : 'var(--store-surface-text)')
                                                    }}
                                                >
                                                    {group.is_required ? (isSatisfied ? 'Listo' : 'Requerido') : (selectedCount > 0 ? `${selectedCount} añadido${selectedCount > 1 ? 's' : ''}` : 'Opcional')}
                                                </span>
                                            </div>

                                            <div className="space-y-2">
                                                {group.modifier_options.map((option) => {
                                                    const currentSelectedArray = selectedOptions[group.id] || []
                                                    const optCount = currentSelectedArray.filter(o => o.id === option.id).length

                                                    const isSelected = isQuantity ? optCount > 0 : Boolean(currentSelectedArray.some(o => o.id === option.id))
                                                    const canIncrement = selectedCount < group.max_selections
                                                    // Deshabilitado si no está seleccionado y no hay más cupos
                                                    const isDisabled = (!isQuantity && !isSelected && !canIncrement) || (isQuantity && !canIncrement && optCount === 0)
                                                    const priceExtra = Number(option.price_adjustment_usd || 0)

                                                    // Controlador Mágico según Modo
                                                    const handleClickRow = () => {
                                                        if (!option.is_available) return;
                                                        if (isQuantity) {
                                                            if (canIncrement) handleIncrementOption(group, option);
                                                            else if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate([20, 40, 20]);
                                                        } else {
                                                            if (!isDisabled) handleToggleOption(group, option);
                                                        }
                                                    }

                                                    return (
                                                        <div
                                                            key={option.id}
                                                            onClick={handleClickRow}
                                                            className={`flex items-center justify-between p-3 sm:p-3.5 rounded-2xl border transition-all select-none ${!option.is_available
                                                                    ? 'opacity-40 cursor-not-allowed border-[var(--store-border)]/30 bg-[var(--store-bg)]/40'
                                                                    : isDisabled && !isSelected
                                                                        ? 'opacity-60 cursor-not-allowed border-[var(--store-border)]/30 bg-[var(--store-bg)]/20'
                                                                        : 'cursor-pointer hover:border-[var(--store-primary)]/50 active:scale-[0.99]'
                                                                }`}
                                                            style={{
                                                                backgroundColor: isSelected ? 'color-mix(in srgb, var(--store-primary) 6%, var(--store-surface))' : 'var(--store-surface)',
                                                                borderColor: isSelected ? 'var(--store-primary)' : 'color-mix(in srgb, var(--store-border) 60%, transparent)'
                                                            }}
                                                        >
                                                            <div className="flex items-center gap-3 min-w-0 pr-3">
                                                                {/* Ocultamos Checkbox/Radio si es modo Cantidad */}
                                                                {!isQuantity && (
                                                                    <div
                                                                        className={`w-5 h-5 flex items-center justify-center shrink-0 transition-colors ${isSingleChoice ? 'rounded-full' : 'rounded-md'}`}
                                                                        style={{
                                                                            borderWidth: '2px',
                                                                            borderColor: isSelected ? 'var(--store-primary)' : 'var(--store-border)',
                                                                            backgroundColor: isSelected ? 'var(--store-primary)' : 'transparent'
                                                                        }}
                                                                    >
                                                                        {isSelected && (isSingleChoice ? <span className="w-2 h-2 rounded-full bg-[var(--store-primary-text)]" /> : <Check size={12} strokeWidth={3} className="text-[var(--store-primary-text)]" />)}
                                                                    </div>
                                                                )}

                                                                {option.image_url && (
                                                                    <div className="relative w-11 h-11 rounded-xl overflow-hidden bg-[var(--store-bg)] border border-[var(--store-border)]/50 shrink-0 shadow-2xs">
                                                                        <Image src={getOptimizedUrl(option.image_url)} alt={option.name} fill sizes="44px" className="object-cover" />
                                                                    </div>
                                                                )}

                                                                <span className={`text-xs sm:text-sm font-semibold leading-snug truncate ${isSelected ? 'text-[var(--store-text-main)] font-bold' : 'text-[var(--store-text-main)]/90'}`}>
                                                                    {option.name}
                                                                </span>
                                                            </div>

                                                            {/* 🚀 BOTONES CUANTITATIVOS VS PRECIO TEXTUAL */}
                                                            {isQuantity ? (
                                                                <div className="shrink-0 flex items-center gap-2.5 pl-2" onClick={e => e.stopPropagation()}>
                                                                    {priceExtra > 0 && optCount === 0 && (
                                                                        <span className="text-xs font-bold font-mono text-[var(--store-text-main)]/70">
                                                                            +${priceExtra.toFixed(2)} c/u
                                                                        </span>
                                                                    )}

                                                                    {optCount > 0 ? (
                                                                        <div className="flex items-center bg-[var(--store-bg)] border border-[var(--store-border)]/60 rounded-xl p-0.5 shadow-sm">
                                                                            <button
                                                                                type="button"
                                                                                onClick={(e) => { e.stopPropagation(); handleDecrementOption(group, option); }}
                                                                                className="w-8 h-8 flex items-center justify-center text-[var(--store-text-main)] hover:bg-[var(--store-surface)] rounded-lg transition-all active:scale-90"
                                                                            >
                                                                                <Minus size={14} strokeWidth={2.5} />
                                                                            </button>
                                                                            <span className="w-7 text-center text-xs font-black text-[var(--store-text-main)] tabular-nums">
                                                                                {optCount}
                                                                            </span>
                                                                            <button
                                                                                type="button"
                                                                                onClick={(e) => { e.stopPropagation(); if (canIncrement) handleIncrementOption(group, option); }}
                                                                                disabled={!canIncrement}
                                                                                className="w-8 h-8 flex items-center justify-center text-[var(--store-text-main)] hover:bg-[var(--store-surface)] rounded-lg transition-all active:scale-90 disabled:opacity-30 disabled:hover:bg-transparent"
                                                                            >
                                                                                <Plus size={14} strokeWidth={2.5} />
                                                                            </button>
                                                                        </div>
                                                                    ) : (
                                                                        <button
                                                                            type="button"
                                                                            onClick={(e) => { e.stopPropagation(); if (canIncrement) handleIncrementOption(group, option); }}
                                                                            disabled={!canIncrement}
                                                                            className="w-9 h-9 flex items-center justify-center bg-[var(--store-bg)] border border-[var(--store-border)]/60 hover:border-[var(--store-primary)] hover:text-[var(--store-primary)] rounded-xl text-[var(--store-text-main)] transition-all active:scale-90 disabled:opacity-30 shadow-2xs"
                                                                        >
                                                                            <Plus size={16} strokeWidth={2.5} />
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                priceExtra > 0 && (
                                                                    <div className="shrink-0 text-right pl-2">
                                                                        <span className="text-xs sm:text-sm font-bold font-mono text-[var(--store-text-main)] bg-[var(--store-bg)] px-2.5 py-1 rounded-lg border border-[var(--store-border)]/40 shadow-2xs">
                                                                            +${priceExtra.toFixed(2)}
                                                                        </span>
                                                                    </div>
                                                                )
                                                            )}
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    )
                                })}

                                {/* Instrucciones de Cocina */}
                                <div className="space-y-3 pt-2">
                                    <label className="font-bold text-xs sm:text-sm text-[var(--store-text-main)] block">
                                        Instrucciones para la Cocina (Opcional)
                                    </label>

                                    <div className="flex flex-wrap gap-1.5">
                                        {QUICK_KITCHEN_TAGS.map((tag) => (
                                            <button
                                                key={tag}
                                                type="button"
                                                onClick={() => handleAddQuickTag(tag)}
                                                className="text-[10px] font-bold px-2.5 py-1 rounded-full border border-[var(--store-border)] bg-[var(--store-bg)] text-[var(--store-surface-text)] hover:text-[var(--store-text-main)] hover:border-[var(--store-text-main)]/40 transition-colors active:scale-95"
                                            >
                                                + {tag}
                                            </button>
                                        ))}
                                    </div>

                                    <textarea
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        placeholder="Ej: Sin cebolla, salsas aparte, carne bien cocida..."
                                        rows={3}
                                        className="w-full bg-[var(--store-bg)] border border-[var(--store-border)] focus:border-[var(--store-text-main)] rounded-2xl p-3.5 text-xs font-medium text-[var(--store-text-main)] placeholder:text-[var(--store-surface-text)]/60 outline-none transition-colors resize-none leading-relaxed"
                                    />
                                </div>

                            </div>

                            {/* FOOTER ESTÁTICO FIJO */}
                            <div className="shrink-0 bg-[var(--store-surface)] border-t border-[var(--store-border)]/50 px-5 py-3.5 pb-[calc(1rem+env(safe-area-inset-bottom))] z-30 shadow-[0_-4px_20px_rgba(0,0,0,0.03)]">

                                <AnimatePresence>
                                    {!isValid && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0, y: 6 }}
                                            animate={{ opacity: 1, height: 'auto', y: 0 }}
                                            exit={{ opacity: 0, height: 0 }}
                                            className="text-[10px] font-bold text-rose-600 bg-rose-50 border border-rose-200/60 rounded-xl px-3 py-1.5 flex items-center justify-center gap-1.5 mb-2.5 font-mono"
                                        >
                                            <AlertCircle size={13} className="shrink-0" />
                                            <span className="truncate">Falta responder: {missingGroups.join(', ')}</span>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                <div className="flex items-center gap-3">
                                    {/* 1. Contador de Cantidad */}
                                    <div
                                        className="flex items-center bg-[var(--store-surface)] border-[length:var(--border-width-ui)] border-[var(--store-border)] shadow-[var(--shadow-ui)] p-1 shrink-0 transition-all"
                                        style={{ borderRadius: 'var(--radius-btn, 9999px)' }}
                                    >
                                        <button
                                            type="button"
                                            onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                            className="w-9 h-9 flex items-center justify-center rounded-full text-[var(--store-text-main)] hover:bg-[var(--store-bg)] transition-all active:scale-90"
                                            aria-label="Restar una unidad"
                                        >
                                            <Minus size={15} strokeWidth={2.5} />
                                        </button>
                                        <span className="w-8 text-center font-bold text-xs sm:text-sm font-mono text-[var(--store-text-main)] tabular-nums">
                                            {quantity}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => setQuantity(quantity + 1)}
                                            className="w-9 h-9 flex items-center justify-center rounded-full text-[var(--store-text-main)] hover:bg-[var(--store-bg)] transition-all active:scale-90"
                                            aria-label="Sumar una unidad"
                                        >
                                            <Plus size={15} strokeWidth={2.5} />
                                        </button>
                                    </div>

                                    {/* 2. Botón de Compra */}
                                    <motion.button
                                        type="button"
                                        animate={shakeError ? { x: [-6, 6, -4, 4, 0] } : {}}
                                        transition={{ duration: 0.3 }}
                                        onClick={handleAddToCart}
                                        style={{ borderRadius: 'var(--radius-btn, 9999px)' }}
                                        className={`flex-1 h-12 px-4 sm:px-6 transition-all flex items-center justify-between border-[length:var(--border-width-ui)] shadow-[var(--shadow-ui)] select-none ${isValid
                                            ? 'bg-[var(--store-primary)] text-[var(--store-primary-text)] border-[var(--store-primary)] hover:opacity-95 active:scale-[0.98] cursor-pointer'
                                            : 'bg-neutral-100 text-neutral-400 border-neutral-200/80 cursor-not-allowed'
                                            }`}
                                    >
                                        <div className="flex items-center gap-2 min-w-0 pr-2">
                                            <ShoppingBag size={16} strokeWidth={2.5} className="shrink-0" />
                                            <span className="font-bold text-xs sm:text-sm tracking-tight truncate">
                                                {isValid ? 'Agregar al Pedido' : 'Elige Opciones'}
                                            </span>
                                        </div>

                                        <div className="flex flex-col items-end shrink-0 leading-tight">
                                            <span className="font-black text-xs sm:text-sm font-mono tracking-tight">
                                                ${totalPriceUSD.toFixed(2)}
                                            </span>
                                            {totalPriceBs > 0 && (
                                                <span className="text-[9px] font-mono opacity-80 tabular-nums">
                                                    Bs. {currencyFormatter.format(totalPriceBs)}
                                                </span>
                                            )}
                                        </div>
                                    </motion.button>
                                </div>
                            </div>

                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}