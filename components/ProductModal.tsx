'use client'

import { useState, useEffect, useMemo } from 'react'
import { X, ShoppingBag, Truck, AlertCircle, Loader2, Check, ChevronLeft, ChevronRight, Minus, Plus, Tag, Banknote, Sparkles } from 'lucide-react'
import { getSupabase } from '@/lib/supabase-client'
import { useCart } from '@/app/store/useCart'
import Swal from 'sweetalert2'
import { AnimatePresence, motion, Variants } from 'framer-motion'

interface ProductModalProps {
    isOpen: boolean
    onClose: () => void
    product: any
    currency: 'usd' | 'eur'
    rates: { usd: number, eur: number }
    promotions?: any[]
    activePromoContext?: any
}

export default function ProductModal({ isOpen, onClose, product, currency, rates, promotions = [], activePromoContext }: ProductModalProps) {
    const { addItem } = useCart()
    const [supabase] = useState(() => getSupabase())

    const [fullProduct, setFullProduct] = useState<any>(null)
    const [variants, setVariants] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    const [selectedColor, setSelectedColor] = useState<string | null>(null)
    const [selectedSize, setSelectedSize] = useState<string | null>(null)
    const [quantity, setQuantity] = useState(1)
    const [errorShake, setErrorShake] = useState<'color' | 'size' | null>(null)

    const [currentGallery, setCurrentGallery] = useState<string[]>([])
    const [galleryIndex, setGalleryIndex] = useState(0)

    const isEur = currency === 'eur'
    const activeRate = isEur ? rates.eur : rates.usd

    // 🚀 CEREBRO VISUAL (Context-Aware / Doble Capa)
    const bestPromo = useMemo(() => {
        if (!product || !promotions) return null;
        
        // Filtramos solo las campañas activas a las que pertenece este producto (Blindado contra Int8)
        const applicablePromos = promotions.filter((p: any) => 
            p.is_active && (p.linked_products || []).some((id: any) => String(id) === String(product.id))
        );

        if (applicablePromos.length === 0) return null;

        // 1. Prioridad de Contexto: Si entró por el Banner, mostramos esa campaña para no confundirlo
        if (activePromoContext && applicablePromos.some(p => p.id === activePromoContext.id)) {
            return activePromoContext;
        }

        // 2. Modo Exploración: Si navegó libremente, le mostramos la campaña que de el mayor % efectivo
        return applicablePromos.reduce((best, current) => {
            const getEffectiveDiscount = (p: any) => p.promo_type === 'percentage' ? Number(p.discount_percentage) : (p.promo_type === 'bogo' ? ((p.bogo_buy - p.bogo_pay) / p.bogo_buy) * 100 : 0);
            return getEffectiveDiscount(current) > getEffectiveDiscount(best) ? current : best;
        }, applicablePromos[0]);

    }, [product, promotions, activePromoContext]);

    // 🚀 MOTOR DE PRECIOS Y UI (Sinceridad Radical)
    const pricing = useMemo(() => {
        if (!product) return { listPrice: 0, cashPrice: 0, priceInBs: 0, hasDiscount: false, exactSavings: 0, compareAt: 0, isPromo: false, promoPercent: 0, promoBadgeText: null }

        let targetCashPrice = Number(product.usd_cash_price || 0)
        let targetPenalty = Number(product.usd_penalty || 0)
        let targetCompareAt = Number(product.compare_at_usd || 0)

        if (selectedColor && selectedSize && variants.length > 0) {
            const specificVariant = variants.find(v => v.color_name === selectedColor && v.size === selectedSize)
            if (specificVariant) {
                if (specificVariant.override_usd_price !== null && specificVariant.override_usd_price !== undefined) targetCashPrice = Number(specificVariant.override_usd_price)
                if (specificVariant.override_usd_penalty !== null && specificVariant.override_usd_penalty !== undefined) targetPenalty = Number(specificVariant.override_usd_penalty)
                if (specificVariant.override_compare_at_usd !== null && specificVariant.override_compare_at_usd !== undefined) {
                    targetCompareAt = Number(specificVariant.override_compare_at_usd)
                } else {
                    targetCompareAt = Number(product.compare_at_usd || 0)
                }
            }
        }

        // PRECIO DE LISTA PÚBLICO (Base + Margen de conversión)
        let listPrice = targetCashPrice + targetPenalty;
        if (targetCompareAt < listPrice && targetCompareAt > 0) targetCompareAt = listPrice; // El precio tachado nunca puede ser menor al público original

        // 🚀 TEXTO Y MATEMÁTICA DE LA CAMPAÑA
        let promoBadgeText = null;
        if (bestPromo) {
            if (bestPromo.promo_type === 'percentage' && bestPromo.discount_percentage > 0) {
                const discount = listPrice * (bestPromo.discount_percentage / 100);
                targetCompareAt = listPrice; // El precio de lista original es el nuevo precio tachado
                listPrice = listPrice - discount;
                targetCashPrice = targetCashPrice - (targetCashPrice * (bestPromo.discount_percentage / 100)); // El precio en divisa también baja proporcionalmente
                promoBadgeText = `Campaña ${bestPromo.title} (-${bestPromo.discount_percentage}%)`;
            } else if (bestPromo.promo_type === 'bogo' && bestPromo.bogo_buy > 0) {
                promoBadgeText = `Campaña ${bestPromo.title}: Lleva ${bestPromo.bogo_buy}, Paga ${bestPromo.bogo_pay}`;
            } else {
                promoBadgeText = `Campaña Activa: ${bestPromo.title}`;
            }
        }

        return {
            listPrice,
            cashPrice: targetCashPrice,
            priceInBs: listPrice * activeRate,
            hasDiscount: targetPenalty > 0,
            exactSavings: listPrice - targetCashPrice, // El ahorro real y transparente por pagar en divisas
            compareAt: targetCompareAt,
            isPromo: targetCompareAt > listPrice,
            promoPercent: targetCompareAt > listPrice ? Math.round(((targetCompareAt - listPrice) / targetCompareAt) * 100) : 0,
            promoBadgeText 
        }
    }, [product, activeRate, selectedColor, selectedSize, variants, bestPromo])

    useEffect(() => {
        if (isOpen && product) {
            setLoading(true)
            const fetchData = async () => {
                const { data: vars } = await supabase
                    .from('product_variants')
                    .select('*')
                    .eq('product_id', product.id)

                const defaultGallery = [product.image_url, ...(product.gallery || [])].filter(Boolean)
                setCurrentGallery(defaultGallery)
                setGalleryIndex(0)
                setQuantity(1)

                if (vars && vars.length > 0) {
                    setVariants(vars)

                    const availableVar = vars.find((v: any) => v.stock > 0) || vars[0]
                    setSelectedColor(availableVar.color_name)
                    
                    // 🚀 AUTO-SELECCIÓN INICIAL (Capa 1)
                    const sizesForFirstColor = vars.filter((v: any) => v.color_name === availableVar.color_name);
                    if (sizesForFirstColor.length === 1) {
                        setSelectedSize(sizesForFirstColor[0].size);
                    }

                    let images = []
                    if (availableVar.gallery && availableVar.gallery.length > 0) images = availableVar.gallery
                    else if (availableVar.variant_image) images = [availableVar.variant_image]
                    else images = defaultGallery

                    setCurrentGallery(images)
                } else {
                    setVariants([])
                    setSelectedColor(null)
                    setSelectedSize(null)
                }
                setLoading(false)
            }
            fetchData()
        } else {
            setFullProduct(null)
            setVariants([])
            setSelectedColor(null)
            setSelectedSize(null)
            setCurrentGallery([])
            setGalleryIndex(0)
            setQuantity(1)
        }
    }, [isOpen, product, supabase])

    useEffect(() => {
        if (!selectedColor || variants.length === 0) return
        
        // 🚀 AUTO-SELECCIÓN DINÁMICA (Capa 2: Cuando el usuario cambia de color)
        const variantsForColor = variants.filter(v => v.color_name === selectedColor);
        if (variantsForColor.length === 1 && selectedSize !== variantsForColor[0].size) {
            setSelectedSize(variantsForColor[0].size); // Auto-selecciona la talla si solo hay una
        } else if (variantsForColor.length > 1 && !variantsForColor.some(v => v.size === selectedSize)) {
            setSelectedSize(null); // Resetea la talla si la anterior no existe en el nuevo color
        }

        const variant = variantsForColor[0]
        if (variant) {
            let images = []
            if (variant.gallery && variant.gallery.length > 0) images = variant.gallery
            else if (variant.variant_image) images = [variant.variant_image]
            else images = [product.image_url, ...(product.gallery || [])].filter(Boolean)
            if (JSON.stringify(images) !== JSON.stringify(currentGallery)) {
                setCurrentGallery(images)
                setGalleryIndex(0)
            }
        }
    }, [selectedColor, variants, product, currentGallery, selectedSize]) // 🚀 Dependencia añadida

    // --- STOCK ENGINE ---
    const availableColors = useMemo(() => {
        const map = new Map()
        variants.forEach(v => {
            if (!map.has(v.color_name)) {
                const isColorAvailable = variants.some(varCheck => varCheck.color_name === v.color_name && varCheck.stock > 0)
                map.set(v.color_name, { name: v.color_name, hex: v.color_hex, isAvailable: isColorAvailable })
            }
        })
        return Array.from(map.values())
    }, [variants])

    const availableSizes = useMemo(() => {
        if (!selectedColor) return []
        return variants
            .filter(v => v.color_name === selectedColor)
            .sort((a, b) => a.size.localeCompare(b.size, undefined, { numeric: true }))
    }, [variants, selectedColor])

    const currentMaxStock = useMemo(() => {
        if (variants.length === 0) return product?.stock || 0; 
        if (!selectedColor || !selectedSize) return 0;
        const specificVariant = variants.find(v => v.color_name === selectedColor && v.size === selectedSize);
        return specificVariant ? specificVariant.stock : 0;
    }, [variants, selectedColor, selectedSize, product])

    useEffect(() => {
        if (quantity > currentMaxStock && currentMaxStock > 0) {
            setQuantity(currentMaxStock)
        } else if (currentMaxStock === 0) {
            setQuantity(1) 
        }
    }, [currentMaxStock, quantity])

    const increaseQty = () => {
        if (quantity < currentMaxStock) setQuantity(prev => prev + 1)
    }
    const decreaseQty = () => setQuantity(prev => (prev > 1 ? prev - 1 : 1))

    const handleAddToCart = () => {
        if (variants.length > 0) {
            if (!selectedColor) {
                setErrorShake('color')
                if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(50)
                setTimeout(() => setErrorShake(null), 800)
                return
            }
            if (!selectedSize) {
                setErrorShake('size')
                if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(50)
                setTimeout(() => setErrorShake(null), 800)
                return
            }

            const specificVariant = variants.find(v => v.color_name === selectedColor && v.size === selectedSize)
            if (specificVariant) {
                if (specificVariant.stock <= 0) return Swal.fire({ title: 'Agotado', text: 'Esta talla está agotada', icon: 'error', confirmButtonColor: '#000' })
                addItem(product, specificVariant, quantity)
            }
        } else {
            if (product.stock <= 0) return Swal.fire({ title: 'Agotado', text: 'Este producto está agotado', icon: 'error', confirmButtonColor: '#000' })
            addItem(product, null, quantity)
        }

        const Toast = Swal.mixin({ toast: true, position: 'top', showConfirmButton: false, timer: 1500, customClass: { popup: 'bg-black text-white rounded-xl text-xs font-bold' } })
        Toast.fire({ icon: 'success', title: `Bolsa Actualizada (+${quantity})` })
        onClose()
    }

    const nextImage = () => setGalleryIndex((prev) => (prev + 1) % currentGallery.length)
    const prevImage = () => setGalleryIndex((prev) => (prev - 1 + currentGallery.length) % currentGallery.length)

  // 🚀 OPTIMIZACIÓN: Curvas Bezier (Estilo iOS) en lugar de Resortes (Springs)
    const modalVariants: Variants = {
        hidden: {
            opacity: 0,
            y: typeof window !== 'undefined' && window.innerWidth < 768 ? "100%" : 0,
            x: typeof window !== 'undefined' && window.innerWidth >= 768 ? "100%" : 0
        },
        visible: {
            opacity: 1,
            y: 0,
            x: 0,
            transition: { type: "tween", ease: [0.32, 0.72, 0, 1], duration: 0.5 }
        },
        exit: {
            opacity: 0,
            y: typeof window !== 'undefined' && window.innerWidth < 768 ? "100%" : 0,
            x: typeof window !== 'undefined' && window.innerWidth >= 768 ? "100%" : 0,
            transition: { type: "tween", ease: [0.32, 0.72, 0, 1], duration: 0.4 }
        }
    }

const isCompletelyOutOfStock = variants.length > 0
        ? variants.every(v => (v.stock || 0) <= 0)
        : (product?.stock || 0) <= 0;

    // 🚀 NUEVO: Variable reactiva para el texto del botón
    const buttonText = isCompletelyOutOfStock ? 'Agotado' 
        : (variants.length > 0 && !selectedColor) ? 'Elige un Color'
        : (variants.length > 0 && !selectedSize) ? 'Elige una Talla'
        : 'Agregar';

    return (
       <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[60] flex items-end md:items-stretch justify-end">
                    {/* 🚀 FASE 1: Fondo Orgánico */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1, transition: { duration: 0.4, ease: "easeOut" } }}
                        exit={{ opacity: 0, transition: { duration: 0.3, ease: "easeIn" } }}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm will-change-[opacity]"
                        onClick={onClose}
                    />

                    {/* 🚀 FASE 2: Contenedor con Aceleración GPU */}
                    <motion.div
                        variants={modalVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        className="relative bg-white w-full md:w-[600px] lg:w-[800px] h-[92vh] md:h-full rounded-t-[32px] md:rounded-none flex flex-col md:flex-row overflow-hidden shadow-2xl md:border-l border-gray-200 will-change-transform"
                    >
                        {/* ... (El resto del contenido queda igual: el botón de cerrar, la galería, etc) ... */}
                        <button onClick={onClose} className="absolute top-4 right-4 z-50 bg-white/90 p-2 rounded-full hover:bg-gray-100 transition-colors backdrop-blur border border-gray-200 text-gray-900 active:scale-95">
                            <X size={20} strokeWidth={2} />
                        </button>

                        <div className="w-full h-[45%] md:h-full md:w-1/2 bg-[#F8F9FA] relative flex items-center justify-center border-b md:border-b-0 md:border-r border-gray-200 shrink-0 group overflow-hidden">
                            {currentGallery.length > 0 ? (
                                <img
                                    src={currentGallery[galleryIndex]}
                                    alt="Producto"
                                    className="w-full h-full object-contain mix-blend-multiply p-6 md:p-10 transition-transform duration-700 ease-out group-hover:scale-105"
                                />
                            ) : (
                                <span className="text-4xl font-black text-gray-200">P.</span>
                            )}

                            {currentGallery.length > 1 && (
                                <>
                                    <button onClick={(e) => { e.stopPropagation(); prevImage() }} className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 p-2 rounded-full border border-gray-200 active:scale-95 transition-all opacity-100 md:opacity-0 md:group-hover:opacity-100 z-10 text-gray-900 hover:bg-black hover:text-white hover:border-black"><ChevronLeft size={20} strokeWidth={2} /></button>
                                    <button onClick={(e) => { e.stopPropagation(); nextImage() }} className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 p-2 rounded-full border border-gray-200 active:scale-95 transition-all opacity-100 md:opacity-0 md:group-hover:opacity-100 z-10 text-gray-900 hover:bg-black hover:text-white hover:border-black"><ChevronRight size={20} strokeWidth={2} /></button>
                                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                                        {currentGallery.map((_, idx) => (<div key={idx} className={`h-1.5 rounded-full transition-all duration-300 ${idx === galleryIndex ? 'bg-black w-4' : 'bg-gray-300 w-1.5'}`} />))}
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="w-full h-[55%] md:h-full md:w-1/2 flex flex-col bg-white">
                            <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 no-scrollbar">
                                <div>
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-2 block">{product?.category || 'General'}</span>
                                    <h2 className="text-xl md:text-3xl font-black text-gray-900 leading-tight tracking-tight">{product?.name}</h2>
                                    
                                    {/* 🚀 ETIQUETA DE CAMPAÑA (Animación Fluida) */}
                                    <AnimatePresence>
                                        {pricing.promoBadgeText && (
                                            <motion.div 
                                                initial={{ opacity: 0, y: -10 }} 
                                                animate={{ opacity: 1, y: 0, transition: { type: "tween", ease: [0.32, 0.72, 0, 1], duration: 0.4 } }} 
                                                exit={{ opacity: 0, y: -10, transition: { duration: 0.2 } }} 
                                                className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-800 rounded-lg text-xs font-black tracking-wide transition-all uppercase origin-bottom"
                                            >
                                                <Tag size={14} className="text-red-600 shrink-0" /> {pricing.promoBadgeText}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    <div className="flex flex-wrap gap-1.5 mt-3">
                                        {/* 🚀 NUDGE DE AHORRO HONESTO */}
                                        {(pricing.hasDiscount && pricing.exactSavings > 0 && !isCompletelyOutOfStock) && (
                                            <span className="text-emerald-700 bg-emerald-50 px-2.5 py-1.5 rounded-md text-[11px] font-bold tracking-wide flex items-center gap-1.5">
                                                <Banknote size={14} className="text-emerald-600" />
                                                Ahorra ${pricing.exactSavings.toFixed(2)} pagando en USD
                                            </span>
                                        )}
                                        {isCompletelyOutOfStock && (
                                            <span className="bg-gray-100 text-gray-500 border border-gray-200 text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-sm flex items-center">
                                                Agotado Temporalmente
                                            </span>
                                        )}
                                    </div>

                                    {/* 🚀 PRECIOS RE-ALINEADOS A SINCERIDAD RADICAL */}
                                    <div className="flex items-end gap-3 md:gap-4 mt-6">
                                        <div className="flex flex-col">
                                            {pricing.isPromo && (
                                                <span className="text-sm md:text-base font-bold text-gray-400 line-through decoration-gray-300 mb-0.5">
                                                    ${pricing.compareAt.toFixed(2)}
                                                </span>
                                            )}
                                            <span className={`text-4xl md:text-[40px] font-black tracking-tighter leading-none transition-colors ${pricing.isPromo ? 'text-red-600' : 'text-gray-900'}`}>
                                                ${pricing.listPrice.toFixed(2)}
                                            </span>
                                        </div>
                                        <span className="text-sm md:text-base font-bold text-gray-400 mb-1">
                                            Bs {pricing.priceInBs.toLocaleString('es-VE', { maximumFractionDigits: 2 })}
                                        </span>
                                    </div>

                                    {product?.description && (
                                        <p className="text-sm text-gray-600 mt-6 leading-relaxed whitespace-pre-line border-t border-gray-100 pt-6">
                                            {product.description}
                                        </p>
                                    )}
                                </div>

                                {loading ? (
                                    <div className="flex items-center justify-center py-10">
                                        <Loader2 className="animate-spin text-gray-300" size={32} />
                                    </div>
                                ) : (
                                    <div className="space-y-6 pb-4">
                                        {variants.length > 0 && !isCompletelyOutOfStock && (
                                            <>
                                                {/* 🚀 CONTENEDOR ANIMADO DE COLOR */}
                                                <motion.div 
                                                    animate={errorShake === 'color' ? { x: [-8, 8, -8, 8, 0], transition: { duration: 0.4 } } : {}}
                                                    className={`space-y-3 p-3 -mx-3 rounded-2xl border transition-colors duration-300 ${errorShake === 'color' ? 'border-red-500 bg-red-50/50' : 'border-transparent'}`}
                                                >
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                                            1. {availableColors.find(c => c.name === selectedColor)?.hex === 'transparent' || availableColors.find(c => c.name === selectedColor)?.hex === '#transparent' ? 'Modelo / Opción' : 'Color'}
                                                        </span>
                                                        <span className="text-xs font-bold text-gray-900">{selectedColor}</span>
                                                    </div>
                                                    <div className="flex flex-wrap gap-3">
                                                        {availableColors.map((c: any) => (
                                                            <button
                                                                key={c.name}
                                                              onClick={() => { 
                                                            if (c.isAvailable) { 
                                                                setSelectedColor(c.name); 
                                                                // 🚀 AUTO-SELECCIÓN SINCRÓNICA: Agrupa el render y elimina el glitch
                                                                const sizesForColor = variants.filter(v => v.color_name === c.name);
                                                                if (sizesForColor.length === 1) {
                                                                    setSelectedSize(sizesForColor[0].size);
                                                                } else {
                                                                    setSelectedSize(null); 
                                                                }
                                                                setErrorShake(null); 
                                                            } 
                                                        }}
                                                                disabled={!c.isAvailable}
                                                                className={`transition-all relative flex items-center justify-center overflow-hidden ${c.hex && c.hex !== 'transparent' && c.hex !== '#transparent'
                                                                    ? `w-10 h-10 rounded-full border ${selectedColor === c.name ? 'ring-1 ring-black ring-offset-2 scale-110 border-transparent' : 'hover:scale-105 border-gray-200'}`
                                                                    : `px-4 py-2.5 rounded-lg text-xs font-bold border ${selectedColor === c.name ? 'bg-black text-white border-black' : 'bg-white text-gray-700 border-gray-200 hover:border-black'}`
                                                                    } ${!c.isAvailable ? 'opacity-30 cursor-not-allowed grayscale' : ''}`}
                                                                style={c.hex && c.hex !== 'transparent' && c.hex !== '#transparent' ? { backgroundColor: c.hex } : {}}
                                                                title={!c.isAvailable ? 'Agotado' : c.name}
                                                            >
                                                                {c.hex && c.hex !== 'transparent' && c.hex !== '#transparent' ? (
                                                                    <>
                                                                        {selectedColor === c.name && <Check size={16} className="text-white/80 mix-blend-difference" strokeWidth={3} />}
                                                                        {!c.isAvailable && <div className="absolute inset-0 w-full h-[1px] bg-red-500 top-1/2 -rotate-45" />}
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <span>{c.name}</span>
                                                                        {!c.isAvailable && <div className="absolute inset-0 w-full h-[1px] bg-red-500 top-1/2 -rotate-[20deg]" />}
                                                                    </>
                                                                )}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </motion.div>

                                                {/* 🚀 CONTENEDOR ANIMADO DE TALLA (AUTO-COLLAPSE) */}
                                                {availableSizes.length > 1 && (
                                                    <motion.div 
                                                        animate={errorShake === 'size' ? { x: [-8, 8, -8, 8, 0], transition: { duration: 0.4 } } : {}}
                                                        className={`space-y-3 p-3 -mx-3 rounded-2xl border transition-colors duration-300 ${errorShake === 'size' ? 'border-red-500 bg-red-50/50' : 'border-transparent'}`}
                                                    >
                                                    <div className="flex justify-between items-end">
                                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">2. Talla</span>
                                                        {selectedSize && currentMaxStock > 0 && (
                                                            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                                                                Quedan {currentMaxStock} und.
                                                            </span>
                                                        )}
                                                    </div>

                                                    {!selectedColor ? (
                                                        <div className="flex items-center gap-2 text-xs font-bold text-gray-500 bg-gray-50 p-3 rounded-xl border border-gray-200">
                                                            <AlertCircle size={16} /> Selecciona un color primero
                                                        </div>
                                                    ) : (
                                                        <div className="flex flex-wrap gap-2">
                                                            {availableSizes.map(v => {
                                                                const isOutOfStock = v.stock <= 0;
                                                                return (
                                                                    <button
                                                                        key={v.id}
                                                                        onClick={() => { if (!isOutOfStock) { setSelectedSize(v.size); setErrorShake(null); } }}
                                                                        disabled={isOutOfStock}
                                                                        className={`relative min-w-[3rem] px-3 py-2.5 rounded-lg text-xs font-bold border transition-all overflow-hidden ${selectedSize === v.size
                                                                            ? 'bg-black text-white border-black'
                                                                            : isOutOfStock
                                                                                ? 'bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed opacity-60'
                                                                                : 'bg-white text-gray-900 border-gray-200 hover:border-black'
                                                                            }`}
                                                                    >
                                                                        {v.size}
                                                                        {isOutOfStock && (
                                                                            <svg className="absolute inset-0 w-full h-full text-gray-300" preserveAspectRatio="none" viewBox="0 0 100 100">
                                                                                <line x1="0" y1="100" x2="100" y2="0" stroke="currentColor" strokeWidth="2" />
                                                                            </svg>
                                                                        )}
                                                                    </button>
                                                                )
                                                            })}
                                                        </div>
                                                    )}
                                                </motion.div>
                                                )}
                                            </>
                                        )}

                                        {!isCompletelyOutOfStock && (
                                            <div className="flex items-center gap-3 p-4 bg-[#F8F9FA] rounded-2xl border border-gray-200">
                                                <div className="bg-white p-2 rounded-xl border border-gray-200 shrink-0">
                                                    <Truck size={16} className="text-gray-900" />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-[11px] font-bold text-gray-900 uppercase tracking-wide">Bajo Pedido</span>
                                                    <span className="text-[11px] font-medium text-gray-500">Tiempo de entrega: de 2 a 7 días hábiles</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Footer Fijo (Controles de Compra) */}
                            <div className="p-4 md:p-6 bg-white border-t border-gray-200 shrink-0 z-10">
                                <div className="flex gap-3 md:gap-4">
                                    <div className="flex items-center rounded-full p-1 border-[1.8px] border-[#1a1a1ad2] shrink-0">
                                        <button onClick={decreaseQty} disabled={isCompletelyOutOfStock || quantity <= 1} className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center text-[#1a1a1ad2] hover:border-black hover:bg-gray-200 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                                            <Minus size={16} strokeWidth={2.5} />
                                        </button>
                                        <span className="font-bold text-sm md:text-base w-8 md:w-10 text-center tabular-nums text-[#1a1a1ad2]">{quantity}</span>
                                        <button onClick={increaseQty} disabled={isCompletelyOutOfStock || quantity >= currentMaxStock || (variants.length > 0 && !selectedSize)} className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center text-[#1a1a1ad2] hover:border-black hover:bg-gray-200 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                                            <Plus size={16} strokeWidth={2.5} />
                                        </button>
                                    </div>

                                    <button
                                        onClick={handleAddToCart}
                                        disabled={isCompletelyOutOfStock}
                                        className={`flex-1 text-white rounded-full font-bold uppercase tracking-widest text-xs md:text-sm transition-all flex items-center justify-center gap-2 border overflow-hidden ${
                                            isCompletelyOutOfStock 
                                                ? 'bg-gray-300 border-gray-300 opacity-50 cursor-not-allowed' 
                                                : (variants.length > 0 && (!selectedColor || !selectedSize))
                                                    ? 'bg-gray-900 border-gray-900 hover:bg-black active:scale-[0.98]' 
                                                    : 'bg-black border-black hover:bg-gray-800 active:scale-[0.98]' 
                                        }`}
                                    >
                                        <ShoppingBag size={18} className="pointer-events-none mb-0.5 shrink-0" />
                                        {/* 🚀 CONTENEDOR DE ANIMACIÓN ULTRAFLUIDA */}
                                        <AnimatePresence mode="popLayout" initial={false}>
                                            <motion.span
                                                key={buttonText}
                                                initial={{ opacity: 0, y: 15 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -15 }}
                                                transition={{ type: "tween", ease: [0.32, 0.72, 0, 1], duration: 0.3 }}
                                                className="block whitespace-nowrap"
                                            >
                                                {buttonText}
                                            </motion.span>
                                        </AnimatePresence>
                                    </button>
                                     
                                </div>
                            </div>

                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    )
}