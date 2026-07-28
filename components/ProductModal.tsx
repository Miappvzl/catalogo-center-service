'use client'

import { useState, useEffect, useMemo } from 'react'
import { X, ShoppingBag, Truck, AlertCircle, Loader2, Check, ChevronLeft, ChevronRight, Minus, Plus, Tag, Banknote, Sparkles, Flame, Zap, MessageCircle, Heart, Eye } from 'lucide-react'
import { getSupabase } from '@/lib/supabase-client'
import { useCart } from '@/app/store/useCart'
import Swal from 'sweetalert2'
import { toast } from 'sonner' // 🚀 El reemplazo premium de Swal
import Image from 'next/image'
import { AnimatePresence, motion, useAnimation, Variants } from 'framer-motion'
import { getOptimizedUrl } from '@/utils/cdn'

interface ProductModalProps {
    isOpen: boolean
    onClose: () => void
    product: any
    currency: 'usd' | 'eur'
    rates: { usd: number, eur: number }
    promotions?: any[]
    activePromoContext?: any
    storeConfig?: any
    isFavorite?: boolean // 🚀 ASEGÚRATE DE QUE ESTA LÍNEA ESTÉ AQUÍ
}

export default function ProductModal({ isOpen, onClose, product, currency, rates, promotions = [], activePromoContext, storeConfig, isFavorite = false }: ProductModalProps) {
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

    const [isAdding, setIsAdding] = useState(false) // 🚀 Controla el micro-delay de feedback
    const [isHiding, setIsHiding] = useState(false); // 🚀 NUEVO: Controla la invisibilidad inmediata
    const [isDescriptionOpen, setIsDescriptionOpen] = useState(false)
    const [isShippingOpen, setIsShippingOpen] = useState(false)

    // 🚀 MOTOR DE ANALÍTICAS: Captura de vistas y tiempo de permanencia en Modal
    useEffect(() => {
        if (!isOpen || !product || !storeConfig?.id) return;

        const startTime = Date.now();
        const storeId = storeConfig.id;
        const productId = product.id;
        const currentUrl = typeof window !== 'undefined' ? `${window.location.pathname}${window.location.search}` : '';

        const sendEvent = (dwellTime: number) => {
            const payload = {
                store_id: storeId,
                event_type: 'product_view',
                product_id: productId,
                url: currentUrl,
                referrer: typeof document !== 'undefined' ? document.referrer : '',
                dwell_time: dwellTime,
            };

            fetch('/api/analytics/track', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                keepalive: true, // Garantiza el envío si cierran la pestaña abruptamente
            }).catch(() => {});
        };

        // 1. Registrar vista de producto inicial (dwell_time = 0)
        sendEvent(0);

        // 2. Escuchar si cierran la pestaña del navegador estando el modal abierto
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden') {
                const dwellTimeSeconds = Math.floor((Date.now() - startTime) / 1000);
                if (dwellTimeSeconds > 2) {
                    sendEvent(dwellTimeSeconds);
                }
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);

        // 3. Capturar el cierre del modal (Cuando 'isOpen' pasa a ser false o cambian de producto)
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            const dwellTimeSeconds = Math.floor((Date.now() - startTime) / 1000);
            if (dwellTimeSeconds > 2) {
                sendEvent(dwellTimeSeconds);
            }
        };
    }, [isOpen, product?.id, storeConfig?.id]);


    const isEur = currency === 'eur'
    const activeRate = isEur ? rates.eur : rates.usd

    // Resetea el estado al abrir
    useEffect(() => { if (isOpen) setIsHiding(false); }, [isOpen]);

    // 🚀 CONTROLADOR DEL SCROLL DE FONDO: Bloquea el desplazamiento del body al abrir el modal
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        
        // Cleanup para restaurar el scroll si el componente se desmonta inesperadamente
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    // 🚀 CONTROLADOR IMPERATIVO DEL IMPACTO (GPU Directo)
    const cartControls = useAnimation();

    useEffect(() => {
        const handleImpact = () => {
            // Disparamos la animación saltando la cola de renderizado
            cartControls.start({
                scale: [1, 1.3, 1],
                rotate: [0, -12, 10, 0],
                transition: { duration: 0.35, type: "tween", ease: "easeOut" }
            });
        };
        document.addEventListener('cartImpact', handleImpact);
        return () => document.removeEventListener('cartImpact', handleImpact);
    }, [cartControls]);
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
            
            // 🚀 OPTIMIZACIÓN: Extraemos las variantes directamente de la memoria (Cero latencia)
            const vars = product.product_variants || []

            const defaultGallery = [product.image_url, ...(product.gallery || [])].filter(Boolean)
            setCurrentGallery(defaultGallery)
            setGalleryIndex(0)
            setQuantity(1)
            
            if (vars && vars.length > 0) {
                setVariants(vars)
                setSelectedColor(null)
                setSelectedSize(null)
                setCurrentGallery(defaultGallery)
            } else {
                setVariants([])
                setSelectedColor(null)
                setSelectedSize(null)
            }
            setLoading(false)
        } else {
            setFullProduct(null)
            setVariants([])
            setSelectedColor(null)
            setSelectedSize(null)
            setCurrentGallery([])
            setGalleryIndex(0)
            setQuantity(1)
        }
    }, [isOpen, product]) // 🚀 Eliminamos 'supabase' de las dependencias

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

    const handleAddToCart = async () => {
        // Validaciones...
        if (variants.length > 0) {
            if (!selectedColor) { setErrorShake('color'); return; }
            if (!selectedSize) { setErrorShake('size'); return; }
            const specificVariant = variants.find(v => v.color_name === selectedColor && v.size === selectedSize);
            if (specificVariant && specificVariant.stock <= 0) return;
        } else {
            if (product.stock <= 0) return;
        }

        // 1. Extraemos Coordenadas (Sin tocar estado para evitar congelamientos)
        const imgElement = document.getElementById('modal-main-image');
        const startRect = imgElement ? imgElement.getBoundingClientRect() : null;

        // 🚀 2. T=0ms: DESPEGUE DE LA GOTA Y CIERRE FANTASMA
        setIsHiding(true); // Hace el modal invisible instantáneamente

        if (startRect) {
            document.dispatchEvent(new CustomEvent('flyToCart', {
                detail: { src: getOptimizedUrl(currentGallery[galleryIndex]), startRect }
            }));
        } else {
            document.dispatchEvent(new CustomEvent('cartImpact'));
        }

        // 🚀 3. T=550ms: EL IMPACTO, EL CÁLCULO Y LA DESTRUCCIÓN
        setTimeout(() => {
            // Actualizamos la matemática de Zustand en el silencio (cuando choca)
            if (variants.length > 0) {
                const specificVariant = variants.find(v => v.color_name === selectedColor && v.size === selectedSize);
                addItem(product, specificVariant, quantity);
            } else {
                addItem(product, null, quantity);
            }

            // Disparamos el HUD Central
            document.dispatchEvent(new CustomEvent('showCartHUD', { detail: { quantity } }));

            // AHORA SÍ, destruimos el modal de la memoria
            onClose();
            setIsHiding(false);
        }, 550);
    }

    const handleInquiryWhatsApp = () => {
        // 1. EL ENLACE EXACTO (Deep Link)
        // Como el modal no cambia la URL del navegador, la construimos manualmente.
        // Agregamos ?p=id_del_producto para tener una referencia exacta.
        const baseUrl = typeof window !== 'undefined' ? window.location.origin : `https://${storeConfig?.slug}.preziso.shop`;
        const productUrl = `${baseUrl}?p=${product?.id || ''}`;

        // 2. LAS VARIANTES
        const variantText = [selectedColor, selectedSize].filter(Boolean).join(' - ');

        // 3. EMOJIS BLINDADOS (Unicode Escapes ES6)
        // El navegador los compilará directamente, evadiendo cualquier error de codificación de VS Code.
        const wave = '\u{1F44B}';      // 👋
        const cart = '\u{1F6D2}';      // 🛒
        const sparkles = '\u{2728}';   // ✨
        const linkIcon = '\u{1F517}';  // 🔗

        // 4. CONSTRUCCIÓN DEL MENSAJE
        const message =
            `¡Hola! ${wave} Tengo una consulta sobre un artículo de tu tienda:

${cart} *${product?.name || 'Producto'}*
${variantText ? `${sparkles} *Opción:* ${variantText}\n` : ''}${linkIcon} *Enlace:* ${productUrl}

Mi duda es la siguiente: `;

        // 5. DISPARO A WHATSAPP
        const waLink = `https://wa.me/${storeConfig?.phone}?text=${encodeURIComponent(message)}`;
        window.open(waLink, '_blank');
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
                        className={`absolute inset-0 bg-black/60 backdrop-blur-sm will-change-[opacity] transition-opacity duration-200 ${isHiding ? 'opacity-0' : 'opacity-100'}`}
                    />

                    {/* 🚀 FASE 2: Contenedor con Aceleración GPU (Caja rígida, sin scroll) */}
                    <motion.div
                        variants={modalVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        className={`relative bg-[var(--store-bg)] w-full md:w-[600px] lg:w-[800px] h-[98vh] md:h-full rounded-t-[32px] md:rounded-none flex flex-col md:flex-row overflow-hidden shadow-2xl md:border-l border-[var(--store-border)] will-change-transform transition-opacity duration-200 ${isHiding ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
                    >
                        {/* ... (El resto del contenido queda igual: el botón de cerrar, la galería, etc) ... */}
                        <button onClick={onClose} className="absolute top-4 right-4 z-50 bg-[var(--store-surface)]/90 p-2 rounded-full hover:bg-[var(--store-bg)] transition-colors backdrop-blur border border-[var(--store-border)] text-[var(--store-text-main)] active:scale-95">
                            <X size={20} strokeWidth={2} />
                        </button>

                        {/* 🚀 BOTÓN DE FAVORITO (MODAL) */}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                document.dispatchEvent(new CustomEvent('toggleFavorite', { detail: product }));
                            }}
                            className={`absolute top-4 left-4 z-50 p-2 rounded-full transition-colors backdrop-blur border active:scale-95 ${isFavorite
                                    ? 'bg-red-50/90 border-red-200 text-red-500 hover:bg-red-100'
                                    : 'bg-[var(--store-surface)]/90 border-[var(--store-border)] text-[var(--store-surface-text)] hover:bg-[var(--store-bg)] hover:text-red-500'
                                }`}
                        >
                            <Heart size={20} strokeWidth={2} className={isFavorite ? "fill-current" : ""} />
                        </button>

                        {/* 🚀 NUEVO: Envoltorio de scroll unificado exclusivo para mobile */}
                        <div className="w-full h-full overflow-y-auto md:overflow-hidden flex flex-col md:flex-row pb-[140px] md:pb-0 no-scrollbar">


                       {/* 🚀 Contenedor de Imagen (Auto-alto y aspecto cuadrado en mobile) */}
                        <div className="w-full h-auto aspect-square md:aspect-auto md:h-full md:w-1/2 bg-[var(--store-bg)] relative flex items-center justify-center border-b md:border-b-0 md:border-r border-[var(--store-border)]/30 shrink-0 group overflow-hidden">
                            {currentGallery.length > 0 ? (
                                <Image
                                    id="modal-main-image" // 🚀 INYECCIÓN: Coordenada de Salida
                                    src={getOptimizedUrl(currentGallery[galleryIndex])}
                                    alt="Producto"
                                    fill
                                    sizes="(max-width: 768px) 100vw, 50vw"
                                    className="object-contain p-6 md:p-10 transition-transform duration-700 ease-out group-hover:scale-105"
                                />
                            ) : (
                                <span className="text-4xl font-black text-[var(--store-border)]">P.</span>
                            )}

                            {currentGallery.length > 1 && (
                                <>
                                    <button onClick={(e) => { e.stopPropagation(); prevImage() }} className="absolute left-4 top-1/2 -translate-y-1/2 bg-[var(--store-surface)]/90 p-2 rounded-full border border-[var(--store-border)] active:scale-95 transition-all opacity-100 md:opacity-0 md:group-hover:opacity-100 z-10 text-[var(--store-text-main)] hover:brightness-75 hover:text-white hover:border-[var(--store-primary)]"><ChevronLeft size={20} strokeWidth={2} /></button>
                                    <button onClick={(e) => { e.stopPropagation(); nextImage() }} className="absolute right-4 top-1/2 -translate-y-1/2 bg-[var(--store-surface)]/90 p-2 rounded-full border border-[var(--store-border)] active:scale-95 transition-all opacity-100 md:opacity-0 md:group-hover:opacity-100 z-10 text-[var(--store-text-main)] hover:brightness-75 hover:text-white hover:border-[var(--store-primary)]"><ChevronRight size={20} strokeWidth={2} /></button>
                                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                                        {currentGallery.map((_, idx) => (<div key={idx} className={`h-1.5 rounded-full transition-all duration-300 ${idx === galleryIndex ? 'bg-[var(--store-primary)] w-4' : 'bg-[var(--store-border)] w-1.5'}`} />))}
                                    </div>
                                </>
                            )}
                        </div>

                        {/* 🚀 EL CONTENEDOR PADRE DE LA DERECHA: Le agregamos "relative" para anclar el footer */}
                        {/* 🚀 Contenedor de Detalle (Flexible en mobile) */}
                        <div className="w-full h-auto md:h-full md:w-1/2 flex flex-col relative bg-[var(--store-surface)]">

                         {/* 1. EL ÁREA DE DETALLES: Sin scroll en mobile, scrollable en escritorio */}
                            <div className="flex-1 overflow-visible md:overflow-y-auto p-6 md:p-8 space-y-8 no-scrollbar pb-6 md:pb-[140px]">
                                <div>
                                    <span className="text-[10px] font-bold text-[var(--store-surface-text)] uppercase tracking-widest leading-none mb-2 block">{product?.category || 'General'}</span>
                                    <h2 className="text-xl md:text-3xl font-black text-[var(--store-text-main)] leading-tight tracking-tight">{product?.name}</h2>

                                    {/* 🚀 ETIQUETA DE CAMPAÑA (Animación Fluida) */}
                                    <AnimatePresence>
                                        {pricing.promoBadgeText && (
                                            <motion.div
                                                initial={{ opacity: 0, y: -10 }}
                                                animate={{ opacity: 1, y: 0, transition: { type: "tween", ease: [0.32, 0.72, 0, 1], duration: 0.4 } }}
                                                exit={{ opacity: 0, y: -10, transition: { duration: 0.2 } }}
                                                className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-[var(--store-primary)]/10 text-[var(--store-text-main)]/85  rounded-lg text-xs font-black tracking-wide transition-all  origin-bottom"
                                            >
                                                <Tag size={14} className=" text-[var(--store-main-text)]/85 shrink-0" /> {pricing.promoBadgeText}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    <div className="flex flex-wrap gap-1.5 mt-3">
                                        {/* 🚀 NUDGE DE AHORRO HONESTO */}
                                        {(pricing.hasDiscount && pricing.exactSavings > 0 && !isCompletelyOutOfStock) && (
                                            <span className="text-[var(--store-incentive)] bg-[var(--store-incentive)]/10 px-2.5 py-1.5 rounded-md text-[11px] font-bold tracking-wide flex items-center gap-1.5">
                                                <Flame size={14} className="text-[var(--store-incentive)]" />
                                                Ahorra ${pricing.exactSavings.toFixed(2)} pagando en USD
                                            </span>
                                        )}
                                        {isCompletelyOutOfStock && (
                                            <span className="bg-[var(--store-border)] text-[var(--store-surface-text)] border border-[var(--store-border)] text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-sm flex items-center">
                                                Agotado Temporalmente
                                            </span>
                                        )}
                                    </div>

                                    {/* 🚀 PRECIOS RE-ALINEADOS A SINCERIDAD RADICAL */}
                                    <div className="flex items-end gap-3 md:gap-4 mt-6">
                                        <div className="flex flex-col">
                                            {pricing.isPromo && (
                                                <span className="text-sm md:text-base font-bold text-[var(--store-surface-text)] line-through decoration-[var(--store-border)] mb-0.5">
                                                    ${pricing.compareAt.toFixed(2)}
                                                </span>
                                            )}
                                            <span className={`text-4xl md:text-[40px] font-black tracking-tighter leading-none transition-colors ${pricing.isPromo ? 'text-red-600' : 'text-[var(--store-text-main)]'}`}>
                                                ${pricing.listPrice.toFixed(2)}
                                            </span>
                                        </div>
                                        <span className="text-sm md:text-base font-bold text-[var(--store-surface-text)] mb-1">
                                            Bs {pricing.priceInBs.toLocaleString('es-VE', { maximumFractionDigits: 2 })}
                                        </span>
                                    </div>

                                    {/* 🚀 B2B PRICING MATRIX (Clean Look) */}
                                    {(product?.wholesale_active && product?.wholesale_min_qty > 0 && product?.wholesale_discount_pct > 0) && (
                                        <div className="mt-6 border border-[var(--store-border)] rounded-xl overflow-hidden bg-[var(--store-bg)]">
                                            {/* Fila: Detalle */}
                                            <div className="flex justify-between items-center px-4 py-3 border-b border-[var(--store-border)]/50 bg-[var(--store-surface)]/50">
                                                <span className="text-[11px] font-bold text-[var(--store-surface-text)] uppercase tracking-widest">
                                                    Al Detalle (1 a {product.wholesale_min_qty - 1} und)
                                                </span>
                                                <span className="text-sm font-black text-[var(--store-surface-text)]">
                                                    ${(pricing.isPromo ? pricing.compareAt : pricing.listPrice).toFixed(2)} c/u
                                                </span>
                                            </div>
                                            {/* Fila: Mayorista */}
                                            <div className="flex justify-between items-center px-4 py-3 bg-[#1b1b1b] text-white">
                                                <span className="text-[11px] font-bold uppercase tracking-widest flex items-center gap-1.5 text-white/90">
                                                    <Zap size={13} className="fill-white" />
                                                    Al Mayor ({product.wholesale_min_qty}+ und)
                                                </span>
                                                <span className="text-base font-black text-white">
                                                    ${((pricing.isPromo ? pricing.compareAt : pricing.listPrice) * (1 - product.wholesale_discount_pct / 100)).toFixed(2)} c/u
                                                </span>
                                            </div>
                                        </div>
                                    )}

                                    
                                </div>

                                {loading ? (
                                    <div className="flex items-center justify-center py-10">
                                        <Loader2 className="animate-spin text-[var(--store-surface-text)]" size={32} />
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
                                                        <span className="text-[10px] font-bold text-[var(--store-surface-text)] uppercase tracking-widest">
                                                            1. {availableColors.find(c => c.name === selectedColor)?.hex === 'transparent' || availableColors.find(c => c.name === selectedColor)?.hex === '#transparent' ? 'Modelo / Opción' : 'Color'}
                                                        </span>
                                                        <span className="text-xs font-bold text-[var(--store-text-main)]">{selectedColor}</span>
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
                                                                    ? `w-10 h-10 rounded-full border ${selectedColor === c.name ? 'border-1 ring-[var(--store-primary)] border-[var(--store-primary)] ring-offset-2 scale-120 ' : 'border-3 active:scale:120 hover:scale-105 border-[var(--store-border)]'}`
                                                                    : `px-4 py-2.5 rounded-lg text-xs font-bold border ${selectedColor === c.name ? 'bg-[var(--store-surface)] text-[var(--store-surface-text)] border-[var(--store-border)]' : 'bg-[var(--store-surface)] text-[var(--store-surface-text)] border-[var(--store-border)] hover:border-[var(--store-primary)]'}`
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
                                                            <span className="text-[10px] font-bold text-[var(--store-surface-text)] uppercase tracking-widest block">2. Talla</span>
                                                            {selectedSize && currentMaxStock > 0 && (
                                                                <span className="text-[10px] font-bold text-[var(--store-incentive)] bg-[var(--store-incentive)]/10 px-2 py-0.5 rounded-md border border-[var(--store-incentive)]/20">
                                                                    Quedan {currentMaxStock} und.
                                                                </span>
                                                            )}
                                                        </div>

                                                        {!selectedColor ? (
                                                            <div className="flex items-center gap-2 text-xs font-bold text-[var(--store-surface-text)] bg-[var(--store-bg)] p-3 rounded-xl border border-[var(--store-border)]">
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
                                                                                ? 'bg-[var(--store-primary)] text-[var(--store-primary-text)] border-[var(--store-primary)]'
                                                                                : isOutOfStock
                                                                                    ? 'bg-[var(--store-bg)] text-[var(--store-surface-text)] border-[var(--store-border)] cursor-not-allowed opacity-60'
                                                                                    : 'bg-[var(--store-surface)] text-[var(--store-text-main)] border-[var(--store-border)] hover:border-[var(--store-primary)]'
                                                                                }`}
                                                                        >
                                                                            {v.size}
                                                                            {isOutOfStock && (
                                                                                <svg className="absolute inset-0 w-full h-full text-[var(--store-surface-text)]" preserveAspectRatio="none" viewBox="0 0 100 100">
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

                                        {/* 🚀 ACORDEÓN DE DESCRIPCIÓN */}
                                    {product?.description && (
                                        <div className="border-t border-[var(--store-border)]/40 mt-6 pt-4">
                                            <button
                                                type="button"
                                                onClick={() => setIsDescriptionOpen(!isDescriptionOpen)}
                                                className="w-full flex items-center justify-between py-2 text-[var(--store-text-main)] hover:text-[var(--store-primary)] transition-colors text-left"
                                            >
                                                <div className="flex items-center gap-2.5">
                                                    <Eye size={16} className="text-[var(--store-surface-text)] transition-colors" />
                                                    <span className="text-[11px] font-black uppercase tracking-wider">Descripción</span>
                                                </div>
                                                <motion.div
                                                    animate={{ rotate: isDescriptionOpen ? 45 : 0 }}
                                                    transition={{ duration: 0.25, ease: "easeInOut" }}
                                                    className="text-[var(--store-surface-text)] shrink-0"
                                                >
                                                    <Plus size={16} />
                                                </motion.div>
                                            </button>

                                            <motion.div
                                                initial={false}
                                                animate={{ height: isDescriptionOpen ? "auto" : 0, opacity: isDescriptionOpen ? 1 : 0 }}
                                                transition={{ duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
                                                className="overflow-hidden"
                                            >
                                                <p className="text-xs md:text-sm text-[var(--store-surface-text)] leading-relaxed whitespace-pre-line pb-4 pt-2">
                                                    {product.description}
                                                </p>
                                            </motion.div>
                                        </div>
                                    )}

                                        {/* 🚀 ACORDEÓN LOGÍSTICO DE ENVÍO */}
                                        {(!isCompletelyOutOfStock && storeConfig?.shipping_config?.show_badge !== false) && (
                                            <div className="border-t border-[var(--store-border)]/40 pt-4">
                                                <button
                                                    type="button"
                                                    onClick={() => setIsShippingOpen(!isShippingOpen)}
                                                    className="w-full flex items-center justify-between py-2 text-[var(--store-text-main)] hover:text-[var(--store-primary)] transition-colors text-left"
                                                >
                                                    <div className="flex items-center gap-2.5">
                                                        <Truck size={16} className="text-[var(--store-surface-text)] transition-colors" />
                                                        <span className="text-[11px] font-black uppercase tracking-wider">Envío</span>
                                                    </div>
                                                    <motion.div
                                                        animate={{ rotate: isShippingOpen ? 45 : 0 }}
                                                        transition={{ duration: 0.25, ease: "easeInOut" }}
                                                        className="text-[var(--store-surface-text)] shrink-0"
                                                    >
                                                        <Plus size={16} />
                                                    </motion.div>
                                                </button>

                                                <motion.div
                                                    initial={false}
                                                    animate={{ height: isShippingOpen ? "auto" : 0, opacity: isShippingOpen ? 1 : 0 }}
                                                    transition={{ duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
                                                    className="overflow-hidden"
                                                >
                                                    <div className="flex items-center gap-3 p-4 bg-[var(--store-bg)] rounded-xl border border-[var(--store-border)]/50 mt-2 mb-4">
                                                        <div className="bg-[var(--store-surface)] p-2 rounded-lg border border-[var(--store-border)] shrink-0">
                                                            <Truck size={14} className="text-[var(--store-text-main)]" />
                                                        </div>
                                                        <div className="flex flex-col min-w-0">
                                                            <span className="text-[11px] font-bold text-[var(--store-text-main)] uppercase tracking-wide truncate">
                                                                {product?.shipping_badge_title || storeConfig?.shipping_config?.global_badge_title || 'Bajo Pedido'}
                                                            </span>
                                                            <span className="text-[11px] font-medium text-[var(--store-surface-text)] truncate">
                                                                {product?.shipping_badge_desc || storeConfig?.shipping_config?.global_badge_desc || 'Tiempo de entrega: de 2 a 7 días hábiles'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                            </div>
                            
                            


                           {/* 2. EL FOOTER: Extraído del flujo de scroll. Fijo abajo en mobile, absoluto a la derecha en escritorio */}
                            <div className="absolute bottom-0 left-0 right-0 md:left-auto md:w-1/2 w-full p-4 md:p-6 bg-[var(--store-surface)]/85 backdrop-blur-2xl border-t border-[var(--store-border)] z-20 flex flex-col gap-3 shadow-[0_-4px_20px_rgba(0,0,0,0.02)]">

                                <div className="flex gap-3 md:gap-4">
                                    {/* Controles de +/- */}
                                    <div className="flex items-center rounded-full p-1 border-1 border-[var(--store-border)] shrink-0 bg-[var(--store-bg)]/50">
                                        <button onClick={decreaseQty} disabled={isCompletelyOutOfStock || quantity <= 1} className="w-10 h-10 flex items-center justify-center text-[var(--store-text-main)] hover:border-[var(--store-primary)] transition-all disabled:opacity-50">
                                            <Minus size={16} strokeWidth={2.5} />
                                        </button>
                                        <span className="font-bold text-sm w-8 text-center text-[var(--store-text-main)]">{quantity}</span>
                                        <button onClick={increaseQty} disabled={isCompletelyOutOfStock || quantity >= currentMaxStock || (variants.length > 0 && !selectedSize)} className="w-10 h-10 flex items-center justify-center text-[var(--store-text-main)] hover:border-[var(--store-primary)] transition-all disabled:opacity-50">
                                            <Plus size={16} strokeWidth={2.5} />
                                        </button>
                                    </div>

                                    {/* Botón Principal de Agregar (Físicas iOS) */}
                                    <motion.button
                                        // 🚀 EFECTO SQUISH: Se comprime al hacer tap solo si es clickeable
                                        whileTap={!isCompletelyOutOfStock && (variants.length === 0 || (selectedColor && selectedSize)) ? { scale: 0.95 } : {}}
                                        onClick={handleAddToCart}
                                        disabled={isCompletelyOutOfStock || isAdding}
                                        className={`flex-1 rounded-full font-bold uppercase tracking-widest text-xs transition-colors flex items-center justify-center h-12 relative overflow-hidden ${isCompletelyOutOfStock
                                            ? 'bg-gray-300 border-gray-300 opacity-50 cursor-not-allowed text-gray-500'
                                            : (variants.length > 0 && (!selectedColor || !selectedSize))
                                                ? 'bg-[var(--store-bg)] text-[var(--store-text-main)] border border-[var(--store-border)]'
                                                : 'bg-[var(--store-primary)] text-[var(--store-primary-text)] shadow-lg shadow-[var(--store-primary)]/20'
                                            }`}
                                    >
                                        <AnimatePresence mode="wait">
                                            {isAdding ? (
                                                <motion.div
                                                    key="loading"
                                                    initial={{ opacity: 0, y: 15 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, y: -15 }}
                                                    transition={{ duration: 0.2 }}
                                                    className="absolute inset-0 flex items-center justify-center"
                                                >
                                                    <Loader2 size={18} className="animate-spin" />
                                                </motion.div>
                                            ) : (
                                                <motion.div
                                                    key="content"
                                                    initial={{ opacity: 0, y: 15 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, y: -15 }}
                                                    transition={{ duration: 0.2 }}
                                                    className="flex items-center gap-2"
                                                >
                                                    <ShoppingBag size={18} className="pointer-events-none mb-0.5 shrink-0" />
                                                    <span className="block whitespace-nowrap">{buttonText}</span>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </motion.button>
                                </div>

                                {/* Botón Secundario */}
                                <button
                                    onClick={handleInquiryWhatsApp}
                                    className="w-full py-2 text-[11px] font-bold uppercase tracking-widest text-[var(--store-surface-text)] hover:text-[var(--store-text-main)] transition-colors flex items-center justify-center gap-1.5"
                                >
                                    <MessageCircle size={14} /> Tengo una duda sobre este artículo
                                </button>

                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    )
}