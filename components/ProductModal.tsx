'use client'

'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { X, ShoppingBag, Truck, AlertCircle, Loader2, Check, ChevronLeft, ChevronRight, Minus, Plus, Tag, Banknote, Sparkles, Flame, Zap, MessageCircle, Heart, Eye, Receipt, ArrowUpRight, ArrowDownRight, ChevronDown } from 'lucide-react'
import { getSupabase } from '@/lib/supabase-client'
import { useCart } from '@/app/store/useCart'
import Swal from 'sweetalert2'
import { toast } from 'sonner' // 🚀 El reemplazo premium de Swal
import Image from 'next/image'
import { AnimatePresence, motion, useAnimation, Variants, useMotionValue, animate } from 'framer-motion'
import { getOptimizedUrl } from '@/utils/cdn'
import { normalizeThemeConfig } from '@/utils/themeAdapter' 

// 🚀 VISOR INMERSIVO DE ALTA GAMA (Multi-Touch Pinch en Mobile, Click-Zoom en Desktop & Doble Tap)
interface LightboxViewerProps {
    isOpen: boolean;
    onClose: () => void;
    images: string[];
    currentIndex: number;
    setIndex: (idx: number | ((prev: number) => number)) => void;
    cardStyle?: string;
}

const LightboxViewer = ({
    isOpen,
    onClose,
    images,
    currentIndex,
    setIndex,
    cardStyle = 'standard'
}: LightboxViewerProps) => {
    const [isZoomed, setIsZoomed] = useState(false);
    
    // 🚀 Coordenadas y Escala de Hardware GPU
    const x = useMotionValue(0);
    const y = useMotionValue(0);
    const scale = useMotionValue(1);
    
    const imgContainerRef = useRef<HTMLDivElement>(null);
    const touchState = useRef({
        startDistance: 0,
        startScale: 1,
        lastTouch: { x: 0, y: 0 },
        isPinching: false,
        isPanning: false,
        lastTap: 0,
    });

    // Reseteo total al cambiar de imagen o al abrir/cerrar
    useEffect(() => {
        setIsZoomed(false);
        x.set(0);
        y.set(0);
        scale.set(1);
    }, [currentIndex, isOpen, x, y, scale]);

    const resetToCenter = () => {
        animate(scale, 1, { type: "spring", stiffness: 320, damping: 30 });
        animate(x, 0, { type: "spring", stiffness: 320, damping: 30 });
        animate(y, 0, { type: "spring", stiffness: 320, damping: 30 });
        setIsZoomed(false);
    };

    const handleClose = () => {
        resetToCenter();
        onClose();
    };

    // Navegación por Teclado (Desktop)
    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (isZoomed) resetToCenter();
                else handleClose();
            }
            if (!isZoomed) {
                if (e.key === 'ArrowLeft') setIndex((prev: number) => (prev - 1 + images.length) % images.length);
                if (e.key === 'ArrowRight') setIndex((prev: number) => (prev + 1) % images.length);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, images.length, isZoomed, onClose, setIndex]);

    // 📱 MOTOR MULTI-TOUCH MOBILE (Pinch-to-Zoom, Pan libre & Doble Tap)
    const handleTouchStart = (e: React.TouchEvent) => {
        const now = Date.now();

        if (e.touches.length === 1) {
            // 🚀 DOBLE TAP NATIVO (Zoom Rápido / Reset)
            if (now - touchState.current.lastTap < 300) {
                if (scale.get() > 1.1) {
                    resetToCenter();
                } else {
                    const rect = imgContainerRef.current?.getBoundingClientRect();
                    if (rect) {
                        const touch = e.touches[0];
                        const clickX = Math.max(0, Math.min(1, (touch.clientX - rect.left) / (rect.width || 1)));
                        const clickY = Math.max(0, Math.min(1, (touch.clientY - rect.top) / (rect.height || 1)));
                        const targetX = -(clickX - 0.5) * (rect.width * 1.5);
                        const targetY = -(clickY - 0.5) * (rect.height * 1.5);
                        
                        animate(scale, 2.5, { type: "spring", stiffness: 300, damping: 30 });
                        animate(x, targetX, { type: "spring", stiffness: 300, damping: 30 });
                        animate(y, targetY, { type: "spring", stiffness: 300, damping: 30 });
                        setIsZoomed(true);
                    }
                }
                touchState.current.lastTap = 0;
                return;
            }
            touchState.current.lastTap = now;

            // Arrastre con un dedo cuando hay zoom activo
            touchState.current.lastTouch = { x: e.touches[0].clientX, y: e.touches[0].clientY };
            touchState.current.isPanning = scale.get() > 1.05;
            touchState.current.isPinching = false;

        } else if (e.touches.length === 2) {
            // 🚀 PINCH TO ZOOM CON DOS DEDOS
            const t1 = e.touches[0];
            const t2 = e.touches[1];
            const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
            touchState.current.startDistance = dist;
            touchState.current.startScale = scale.get();
            touchState.current.isPinching = true;
            touchState.current.isPanning = false;
        }
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (e.touches.length === 2 && touchState.current.isPinching) {
            // Ampliación continua por distancia de dedos
            const t1 = e.touches[0];
            const t2 = e.touches[1];
            const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
            if (touchState.current.startDistance > 0) {
                const factor = dist / touchState.current.startDistance;
                const newScale = Math.max(0.85, Math.min(4.5, touchState.current.startScale * factor));
                scale.set(newScale);
                setIsZoomed(newScale > 1.05);
            }
        } else if (e.touches.length === 1 && touchState.current.isPanning) {
            // Desplazamiento fluido 1:1 con el dedo
            const dx = e.touches[0].clientX - touchState.current.lastTouch.x;
            const dy = e.touches[0].clientY - touchState.current.lastTouch.y;
            x.set(x.get() + dx);
            y.set(y.get() + dy);
            touchState.current.lastTouch = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        if (e.touches.length === 0) {
            touchState.current.isPinching = false;
            touchState.current.isPanning = false;

            const curScale = scale.get();
            if (curScale <= 1.05) {
                // 🚀 Regreso elástico si se despinchó a tamaño normal
                resetToCenter();
            } else if (curScale > 4.0) {
                animate(scale, 3.5, { type: "spring", stiffness: 300, damping: 30 });
            } else {
                // Contención de límites para no perder la foto de vista
                const curX = x.get();
                const curY = y.get();
                const bound = 1200;
                if (Math.abs(curX) > bound || Math.abs(curY) > bound) {
                    const clampedX = Math.max(-bound, Math.min(bound, curX));
                    const clampedY = Math.max(-bound, Math.min(bound, curY));
                    animate(x, clampedX, { type: "spring", stiffness: 300, damping: 30 });
                    animate(y, clampedY, { type: "spring", stiffness: 300, damping: 30 });
                }
            }
        }
    };

    if (!isOpen || images.length === 0) return null;

    const isBrutalist = cardStyle === 'brutalist';

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    key="lightbox-fullscreen-backdrop"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25, ease: "easeOut" }}
                    className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/95 backdrop-blur-2xl select-none"
                >
                    {/* Barra Superior de Control */}
                    <div className="absolute top-0 inset-x-0 p-4 md:p-6 flex items-center justify-between z-50 pointer-events-auto">
                        <div className="flex items-center gap-2">
                            <span className="px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-white text-[11px] font-mono font-bold tracking-wider">
                                {currentIndex + 1} / {images.length}
                            </span>
                            <span className="hidden sm:inline-block px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-white/80 text-[10px] font-mono uppercase tracking-wider animate-in fade-in">
                                {isZoomed ? "Arrastra para mover • Clic para alejar" : "Clic para ampliar • Doble tap en móvil"}
                            </span>
                        </div>

                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleClose();
                            }}
                            className={`p-2.5 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 backdrop-blur-md transition-all active:scale-95 ${
                                isBrutalist ? 'rounded-none border border-white/30' : 'rounded-full'
                            }`}
                            aria-label="Cerrar vista completa"
                        >
                            <X size={20} strokeWidth={2} />
                        </button>
                    </div>

                    {/* Escenario de Interacción */}
                    <div
                        className="relative w-full h-full flex items-center justify-center p-2 sm:p-6 md:p-12 overflow-hidden cursor-default"
                        style={{ touchAction: 'none' }} // 🚀 Previene scroll nativo en móvil durante el pinzado
                        onClick={() => {
                            if (isZoomed) resetToCenter();
                            else handleClose();
                        }}
                    >
                        <motion.div
                            ref={imgContainerRef}
                            key={`zoom-canvas-${currentIndex}`}
                            style={{ x, y, scale }}
                            onTouchStart={handleTouchStart}
                            onTouchMove={handleTouchMove}
                            onTouchEnd={handleTouchEnd}
                            onClick={(e) => {
                                e.stopPropagation();
                                // 🖥️ En Desktop: clic con ratón amplía / aleja
                                if (typeof window !== 'undefined' && window.matchMedia('(pointer: fine)').matches) {
                                    if (!isZoomed) {
                                        const rect = imgContainerRef.current?.getBoundingClientRect();
                                        if (rect) {
                                            const clickX = Math.max(0, Math.min(1, (e.clientX - rect.left) / (rect.width || 1)));
                                            const clickY = Math.max(0, Math.min(1, (e.clientY - rect.top) / (rect.height || 1)));
                                            const targetX = -(clickX - 0.5) * (rect.width * 1.5);
                                            const targetY = -(clickY - 0.5) * (rect.height * 1.5);

                                            animate(scale, 2.5, { type: "spring", stiffness: 300, damping: 30 });
                                            animate(x, targetX, { type: "spring", stiffness: 300, damping: 30 });
                                            animate(y, targetY, { type: "spring", stiffness: 300, damping: 30 });
                                            setIsZoomed(true);
                                        }
                                    } else {
                                        resetToCenter();
                                    }
                                }
                            }}
                            className={`relative w-full max-w-4xl h-[75vh] md:h-[80vh] flex items-center justify-center ${
                                isZoomed ? 'cursor-grab active:cursor-grabbing' : 'cursor-zoom-in'
                            }`}
                        >
                            <Image
                                src={getOptimizedUrl(images[currentIndex])}
                                alt="Vista ampliada"
                                fill
                                sizes="100vw"
                                priority
                                className="object-contain pointer-events-none drop-shadow-2xl select-none"
                            />
                        </motion.div>
                    </div>

                    {/* Flechas y Puntos (Se ocultan durante el zoom) */}
                    {images.length > 1 && !isZoomed && (
                        <>
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIndex((prev: number) => (prev - 1 + images.length) % images.length);
                                }}
                                className={`absolute left-3 md:left-8 top-1/2 -translate-y-1/2 p-3 md:p-4 bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition-all z-50 active:scale-90 ${
                                    isBrutalist ? 'rounded-none border border-white/20' : 'rounded-full'
                                }`}
                                aria-label="Anterior"
                            >
                                <ChevronLeft size={24} strokeWidth={2} />
                            </button>
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIndex((prev: number) => (prev + 1) % images.length);
                                }}
                                className={`absolute right-3 md:right-8 top-1/2 -translate-y-1/2 p-3 md:p-4 bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition-all z-50 active:scale-90 ${
                                    isBrutalist ? 'rounded-none border border-white/20' : 'rounded-full'
                                }`}
                                aria-label="Siguiente"
                            >
                                <ChevronRight size={24} strokeWidth={2} />
                            </button>

                            {/* Puntos Inferiores */}
                            <div className="absolute bottom-6 md:bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-50 pointer-events-auto bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
                                {images.map((_, idx) => (
                                    <button
                                        key={`lb-dot-btn-${idx}`}
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setIndex(idx);
                                        }}
                                        className={`h-1.5 transition-all duration-300 rounded-full ${
                                            idx === currentIndex ? 'bg-white w-6' : 'bg-white/30 w-1.5 hover:bg-white/60'
                                        }`}
                                    />
                                ))}
                            </div>
                        </>
                    )}
                </motion.div>
            )}
        </AnimatePresence>
    );
};
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

    // 🚀 INYECCIÓN DEL CEREBRO DE TOKENS
    const activeTheme = useMemo(() => normalizeThemeConfig(storeConfig?.theme_config), [storeConfig?.theme_config])

    const [fullProduct, setFullProduct] = useState<any>(null)
    const [variants, setVariants] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    const [selectedColor, setSelectedColor] = useState<string | null>(null)
    const [selectedSize, setSelectedSize] = useState<string | null>(null)
    const [quantity, setQuantity] = useState(1)
    const [errorShake, setErrorShake] = useState<'color' | 'size' | null>(null)

 const [currentGallery, setCurrentGallery] = useState<string[]>([])
    const [galleryIndex, setGalleryIndex] = useState(0)

  // 🚀 ESTADOS DEL ZOOM DUAL (Side-Zoom & Lightbox)
    const [zoomData, setZoomData] = useState({ show: false, x: 0, y: 0 })
    const [isLightboxOpen, setIsLightboxOpen] = useState(false)
    const [lightboxIndex, setLightboxIndex] = useState(0)

    const handleZoomMove = (e: React.MouseEvent<HTMLDivElement>) => {
        const { left, top, width, height } = e.currentTarget.getBoundingClientRect()
        const x = Math.max(0, Math.min(100, ((e.clientX - left) / width) * 100))
        const y = Math.max(0, Math.min(100, ((e.clientY - top) / height) * 100))
        
        // 🚀 MÁRGENES INVISIBLES: Desactiva la lupa en el 12% superior e inferior
        // Esto evita que el hover se active en el espacio vacío del contenedor
        if (y < 12 || y > 88) {
            setZoomData(prev => prev.show ? { ...prev, show: false } : prev);
            return;
        }

        setZoomData({ show: true, x, y })
    }

    const handleZoomEnter = (e: React.MouseEvent<HTMLDivElement>) => {
        const { top, height } = e.currentTarget.getBoundingClientRect();
        const y = ((e.clientY - top) / height) * 100;
        if (y >= 12 && y <= 88) setZoomData(prev => ({ ...prev, show: true }));
    }
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
            }).catch(() => { });
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

    // 🚀 NUEVO: Evaluación arquitectónica temprana del tipo de variante
    const isModelOption = availableColors.length > 0 &&
        (availableColors[0].hex === 'transparent' || availableColors[0].hex === '#transparent');

    // 🚀 NUEVO: Variable reactiva para el texto del botón (Corregido para Modelos/Opciones)
    const buttonText = isCompletelyOutOfStock ? 'Agotado'
        : (variants.length > 0 && !selectedColor) ? (isModelOption ? 'Escoge modelo/opción' : 'Elige un Color')
            : (variants.length > 0 && !selectedSize) ? 'Elige una Talla'
                : 'Agregar';

   // =========================================================================
    // 💎 VARIANTE: TEMA 3 (MINIMAL LUXURY MODAL)
    // =========================================================================
    if (activeTheme.layout?.card_style === 'editorial') {
        return (
            <>
                <AnimatePresence>
                    {isOpen && (
                        <div key="modal-luxury-portal" className="fixed inset-0 z-60 flex items-end md:items-stretch justify-end">
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { duration: 0.4 } }} exit={{ opacity: 0 }} className={`absolute inset-0 bg-black/40 backdrop-blur-md transition-opacity duration-200 ${isHiding ? 'opacity-0' : 'opacity-100'}`} onClick={onClose} />

                            <motion.div variants={modalVariants} initial="hidden" animate="visible" exit="exit" className={`relative bg-[var(--store-bg)] w-full md:w-[600px] lg:w-[800px] h-[98vh] md:h-full rounded-t-[var(--radius-card)] md:rounded-none flex flex-col md:flex-row overflow-hidden shadow-2xl md:border-l border-[var(--store-border)]/30 will-change-transform transition-opacity duration-200 ${isHiding ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                                
                                <button onClick={onClose} className="absolute top-4 right-4 z-50 p-2 rounded-full hover:bg-black/5 transition-colors text-[var(--store-text-main)] active:scale-95">
                                    <X size={24} strokeWidth={1} />
                                </button>

                                <button onClick={(e) => { e.stopPropagation(); document.dispatchEvent(new CustomEvent('toggleFavorite', { detail: product })); }} className={`absolute top-4 left-4 z-50 p-2 rounded-full transition-colors active:scale-95 ${isFavorite ? 'text-[var(--store-action-favorite)]' : 'text-[var(--store-text-main)] hover:text-[var(--store-action-favorite)]'}`}>
                                    <Heart size={22} strokeWidth={1.5} className={isFavorite ? "fill-current" : ""} />
                                </button>

                                {/* SCROLL CONTAINER */}
                                <div className="w-full h-full overflow-y-auto md:overflow-hidden flex flex-col md:flex-row pb-[100px] md:pb-0 no-scrollbar">
                                    
                                    {/* 1. IMAGEN NAKED (Side-Zoom & Lightbox) */}
                                    <div 
                                        className="w-full h-auto aspect-[4/5] md:aspect-auto md:h-full md:w-1/2 bg-transparent relative flex items-center justify-center shrink-0 group overflow-hidden cursor-zoom-in"
                                        onMouseMove={handleZoomMove}
                                        onMouseEnter={handleZoomEnter}
                                        onMouseLeave={() => setZoomData(prev => ({ ...prev, show: false }))}
                                        onClick={() => { setIsLightboxOpen(true); setLightboxIndex(galleryIndex); }}
                                    >
                                        {currentGallery.length > 0 ? (
                                            <>
                                                <Image id="modal-main-image" src={getOptimizedUrl(currentGallery[galleryIndex])} alt={product?.name || "Producto"} fill sizes="(max-width: 768px) 100vw, 50vw" className={`object-contain p-8 md:p-12 transition-transform duration-700 ease-out ${!zoomData.show ? 'group-hover:scale-105' : ''}`} />
                                                {zoomData.show && (
                                                    <div className="hidden md:block absolute pointer-events-none bg-black/5 border border-white/40 backdrop-blur-[2px] shadow-[0_10px_30px_rgba(0,0,0,0.15)] z-20 rounded-full" style={{ width: '40%', height: '40%', left: `calc(${zoomData.x}% - 20%)`, top: `calc(${zoomData.y}% - 20%)` }} />
                                                )}
                                            </>
                                        ) : (
                                            <span className="text-4xl font-heading text-[var(--store-border)]">Preziso</span>
                                        )}

                                        {currentGallery.length > 1 && (
                                            <>
                                                <button onClick={(e) => { e.stopPropagation(); prevImage(); }} className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full active:scale-95 transition-all opacity-100 md:opacity-0 md:group-hover:opacity-100 z-30 text-[var(--store-text-main)] bg-white/50 backdrop-blur-sm hover:bg-white"><ChevronLeft size={20} strokeWidth={1} /></button>
                                                <button onClick={(e) => { e.stopPropagation(); nextImage(); }} className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full active:scale-95 transition-all opacity-100 md:opacity-0 md:group-hover:opacity-100 z-30 text-[var(--store-text-main)] bg-white/50 backdrop-blur-sm hover:bg-white"><ChevronRight size={20} strokeWidth={1} /></button>
                                                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-30">
                                                    {currentGallery.map((_, idx) => (<div key={`luxury-dot-${idx}`} className={`h-1 rounded-full transition-all duration-500 ${idx === galleryIndex ? 'bg-[var(--store-text-main)] w-6' : 'bg-[var(--store-text-main)]/30 w-1'}`} />))}
                                                </div>
                                            </>
                                        )}
                                    </div>

                                    {/* 2. DETALLES EDITORIALES */}
                                    <div className="w-full h-auto md:h-full md:w-1/2 flex flex-col relative bg-[var(--store-bg)]">
                                        <div className="flex-1 overflow-visible md:overflow-y-auto p-6 md:p-10 space-y-8 no-scrollbar pb-6 md:pb-[120px]">
                                            <div className="text-center md:text-left">
                                                <span className="text-[9px] font-bold text-[var(--store-surface-text)] uppercase tracking-[0.25em] leading-none mb-3 block">{product?.category || 'Boutique'}</span>
                                                <h2 className="text-2xl md:text-4xl font-heading text-[var(--store-text-main)] leading-tight mb-4">{product?.name}</h2>
                                                
                                                {pricing.promoBadgeText && (
                                                    <div className="mb-4 inline-flex items-center gap-1.5 px-3 py-1 bg-[var(--store-text-main)] text-[var(--store-bg)] text-[9px] uppercase tracking-[0.15em] font-bold">
                                                        <Sparkles size={12} /> {pricing.promoBadgeText}
                                                    </div>
                                                )}

                                                <div className="flex items-baseline justify-center md:justify-start gap-3 mt-2">
                                                    {pricing.isPromo && <span className="text-sm md:text-base text-[var(--store-surface-text)] line-through decoration-[0.5px]">${pricing.compareAt.toFixed(2)}</span>}
                                                    <span className={`text-2xl md:text-3xl font-medium tracking-wide ${pricing.isPromo ? 'text-red-800' : 'text-[var(--store-text-main)]'}`}>${pricing.listPrice.toFixed(2)}</span>
                                                    <span className="text-xs text-[var(--store-surface-text)] font-medium">Bs {new Intl.NumberFormat('es-VE', { maximumFractionDigits: 2 }).format(pricing.priceInBs)}</span>
                                                </div>

                                                {(pricing.hasDiscount && pricing.exactSavings > 0 && !isCompletelyOutOfStock) && (
                                                    <div className="mt-3 text-[10px] font-bold tracking-widest uppercase text-[var(--store-text-main)]/70 flex items-center justify-center md:justify-start gap-1.5">
                                                        <Flame size={12} /> Ahorra ${pricing.exactSavings.toFixed(2)} en USD
                                                    </div>
                                                )}
                                                {storeConfig?.show_tax_in_catalog && storeConfig?.fiscal_profile !== 'informal' && !product?.is_tax_exempt && (
                                                    <div className="mt-2 text-[9px] font-bold uppercase tracking-widest text-[var(--store-surface-text)] flex items-center justify-center md:justify-start gap-1">
                                                        <Receipt size={10} /> + ${(pricing.listPrice * ((storeConfig?.default_tax_percentage || 16) / 100)).toFixed(2)} IVA
                                                    </div>
                                                )}
                                                {isCompletelyOutOfStock && (
                                                    <div className="mt-4 text-[10px] font-bold uppercase tracking-[0.2em] text-red-800">Agotado Temporalmente</div>
                                                )}

                                                <button onClick={handleInquiryWhatsApp} className="mt-6 mx-auto md:mx-0 w-fit text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--store-surface-text)] hover:text-[var(--store-text-main)] transition-colors flex items-center gap-2 border-b border-transparent hover:border-[var(--store-text-main)] pb-0.5">
                                                    <MessageCircle size={14} strokeWidth={1.5} /> Asesoría Personalizada
                                                </button>
                                            </div>

                                            {/* B2B Matrix */}
                                            {(product?.wholesale_active && product?.wholesale_min_qty > 0 && product?.wholesale_discount_pct > 0) && (
                                                <div className="border-y border-[var(--store-border)]/30 py-4">
                                                    <div className="flex justify-between items-center mb-2">
                                                        <span className="text-[9px] uppercase tracking-[0.2em] text-[var(--store-surface-text)]">Al Detalle (1-{product.wholesale_min_qty - 1})</span>
                                                        <span className="text-xs font-medium text-[var(--store-text-main)]">${(pricing.isPromo ? pricing.compareAt : pricing.listPrice).toFixed(2)}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-[9px] uppercase tracking-[0.2em] text-[var(--store-text-main)] font-bold flex items-center gap-1"><Zap size={10} /> Al Mayor ({product.wholesale_min_qty}+)</span>
                                                        <span className="text-sm font-bold text-[var(--store-text-main)]">${((pricing.isPromo ? pricing.compareAt : pricing.listPrice) * (1 - product.wholesale_discount_pct / 100)).toFixed(2)}</span>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Variantes */}
                                            {!loading && variants.length > 0 && !isCompletelyOutOfStock && (
                                                <div className="space-y-6">
                                                    <div>
                                                        <span className="text-[9px] uppercase tracking-[0.2em] text-[var(--store-surface-text)] flex items-center gap-2 mb-3">
                                                            {isModelOption ? 'Modelo' : 'Color'} <span className="text-[var(--store-text-main)] font-bold ml-1">{selectedColor}</span>
                                                            {!selectedColor && (
                                                                <motion.span animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1.5 }} className="text-[var(--store-text-main)] normal-case tracking-normal text-[9px] italic">
                                                                    👉 Toca para elegir
                                                                </motion.span>
                                                            )}
                                                        </span>
                                                        <div className="flex flex-wrap gap-4">
                                                            {availableColors.map((c: any, idx: number) => (
                                                                <button
                                                                    key={c.name || `luxury-col-${idx}`}
                                                                    onClick={() => {
                                                                        if (c.isAvailable) {
                                                                            setSelectedColor(c.name);
                                                                            const sizesForColor = variants.filter(v => v.color_name === c.name);
                                                                            if (sizesForColor.length === 1) setSelectedSize(sizesForColor[0].size);
                                                                            else setSelectedSize(null);
                                                                            setErrorShake(null);
                                                                        }
                                                                    }}
                                                                    disabled={!c.isAvailable}
                                                                    className={`relative flex items-center justify-center transition-all ${c.hex && c.hex !== 'transparent' && c.hex !== '#transparent' ? `w-7 h-7 rounded-full ring-1 ring-offset-2 ${selectedColor === c.name ? 'ring-[var(--store-text-main)]' : 'ring-transparent hover:ring-[var(--store-border)]'}` : `text-xs font-medium pb-1 border-b ${selectedColor === c.name ? 'border-[var(--store-text-main)] text-[var(--store-text-main)]' : 'border-transparent text-[var(--store-surface-text)] hover:text-[var(--store-text-main)]'}`} ${!c.isAvailable ? 'opacity-30 cursor-not-allowed' : ''}`}
                                                                    style={c.hex && c.hex !== 'transparent' && c.hex !== '#transparent' ? { backgroundColor: c.hex } : {}}
                                                                >
                                                                    {(!c.hex || c.hex === 'transparent' || c.hex === '#transparent') && c.name}
                                                                    {!c.isAvailable && <div className="absolute inset-0 w-full h-[1px] bg-red-500 top-1/2 -rotate-45" />}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    {availableSizes.length > 1 && (
                                                        <motion.div animate={errorShake === 'size' ? { x: [-5, 5, -5, 5, 0] } : {}}>
                                                            <div className="flex justify-between items-end mb-3">
                                                                <span className="text-[9px] uppercase tracking-[0.2em] text-[var(--store-surface-text)]">Talla</span>
                                                                {selectedSize && currentMaxStock > 0 && <span className="text-[9px] text-[var(--store-surface-text)]">Quedan {currentMaxStock}</span>}
                                                            </div>
                                                            {!selectedColor ? (
                                                                <div className="text-[10px] text-[var(--store-surface-text)] italic">Selecciona un color primero</div>
                                                            ) : (
                                                                <div className="flex flex-wrap gap-4">
                                                                    {availableSizes.map((v, idx) => (
                                                                        <button
                                                                            key={v.id || v.size || `luxury-size-${idx}`}
                                                                            onClick={() => { if (v.stock > 0) { setSelectedSize(v.size); setErrorShake(null); } }}
                                                                            disabled={v.stock <= 0}
                                                                            className={`text-xs md:text-sm font-medium pb-1 border-b transition-all ${selectedSize === v.size ? 'border-[var(--store-text-main)] text-[var(--store-text-main)]' : v.stock <= 0 ? 'border-transparent text-[var(--store-surface-text)] opacity-40 cursor-not-allowed line-through' : 'border-transparent text-[var(--store-surface-text)] hover:text-[var(--store-text-main)]'}`}
                                                                        >
                                                                            {v.size}
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </motion.div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Acordeones / Desplegados */}
                                            <div className="mt-8">
                                                {product?.description && (
                                                    <div className="border-t border-[var(--store-border)]/30 py-4">
                                                        {activeTheme.shapes.info_layout === 'expanded' ? (
                                                            <div>
                                                                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--store-text-main)] block mb-3">Descripción</span>
                                                                <p className="text-xs text-[var(--store-surface-text)] leading-relaxed whitespace-pre-line">{product.description}</p>
                                                            </div>
                                                        ) : (
                                                            <>
                                                                <button onClick={() => setIsDescriptionOpen(!isDescriptionOpen)} className="w-full flex items-center justify-between text-[var(--store-text-main)] hover:opacity-70 transition-opacity">
                                                                    <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Descripción</span>
                                                                    <motion.div animate={{ rotate: isDescriptionOpen ? -135 : 0 }}><ArrowDownRight size={14} strokeWidth={1.5} /></motion.div>
                                                                </button>
                                                                <motion.div initial={false} animate={{ height: isDescriptionOpen ? "auto" : 0, opacity: isDescriptionOpen ? 1 : 0 }} className="overflow-hidden">
                                                                    <p className="text-xs text-[var(--store-surface-text)] leading-relaxed whitespace-pre-line pt-4">{product.description}</p>
                                                                </motion.div>
                                                            </>
                                                        )}
                                                    </div>
                                                )}
                                                {(!isCompletelyOutOfStock && storeConfig?.shipping_config?.show_badge !== false) && (
                                                    <div className="border-y border-[var(--store-border)]/30 py-4">
                                                        {activeTheme.shapes.info_layout === 'expanded' ? (
                                                            <div>
                                                                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--store-text-main)] block mb-3">Envío & Entregas</span>
                                                                <div className="flex flex-col gap-1">
                                                                    <span className="text-xs font-bold text-[var(--store-text-main)]">{product?.shipping_badge_title || storeConfig?.shipping_config?.global_badge_title || 'Bajo Pedido'}</span>
                                                                    <span className="text-xs text-[var(--store-surface-text)]">{product?.shipping_badge_desc || storeConfig?.shipping_config?.global_badge_desc || 'Tiempo de entrega: de 2 a 7 días hábiles'}</span>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <>
                                                                <button onClick={() => setIsShippingOpen(!isShippingOpen)} className="w-full flex items-center justify-between text-[var(--store-text-main)] hover:opacity-70 transition-opacity">
                                                                    <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Envío & Entregas</span>
                                                                    <motion.div animate={{ rotate: isShippingOpen ? -135 : 0 }}><ArrowDownRight size={14} strokeWidth={1.5} /></motion.div>
                                                                </button>
                                                                <motion.div initial={false} animate={{ height: isShippingOpen ? "auto" : 0, opacity: isShippingOpen ? 1 : 0 }} className="overflow-hidden">
                                                                    <div className="pt-4 flex flex-col gap-1">
                                                                        <span className="text-xs font-bold text-[var(--store-text-main)]">{product?.shipping_badge_title || storeConfig?.shipping_config?.global_badge_title || 'Bajo Pedido'}</span>
                                                                        <span className="text-xs text-[var(--store-surface-text)]">{product?.shipping_badge_desc || storeConfig?.shipping_config?.global_badge_desc || 'Tiempo de entrega: de 2 a 7 días hábiles'}</span>
                                                                    </div>
                                                                </motion.div>
                                                            </>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                {/* 3. PROYECCIÓN DESKTOP & FOOTER */}
                                <AnimatePresence>
                                    {zoomData.show && currentGallery.length > 0 && (
                                        <motion.div 
                                            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.2 }}
                                            className="hidden md:block absolute inset-y-0 right-0 w-1/2 z-[100] bg-[var(--store-bg)] pointer-events-none overflow-hidden border-l border-[var(--store-border)]/30"
                                        >
                                            <div className="w-full h-full" style={{ backgroundImage: `url(${getOptimizedUrl(currentGallery[galleryIndex])})`, backgroundPosition: `${zoomData.x}% ${zoomData.y}%`, backgroundSize: '250%', backgroundRepeat: 'no-repeat' }} />
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                <div className="absolute bottom-0 left-0 right-0 md:left-auto md:right-0 md:w-1/2 w-full p-4 md:p-6 bg-[var(--store-bg)]/90 backdrop-blur-xl border-t border-[var(--store-border)]/20 z-50">
                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center justify-between px-3 py-3.5 border-[length:var(--border-width-ui)] border-[var(--store-border)] rounded-[var(--radius-btn)] w-28 shrink-0 bg-[var(--store-surface)]">
                                            <button onClick={decreaseQty} disabled={isCompletelyOutOfStock || quantity <= 1} className="text-[var(--store-text-main)] disabled:opacity-30 active:scale-90"><Minus size={14} strokeWidth={1.5} /></button>
                                            <span className="text-xs font-medium text-[var(--store-text-main)]">{quantity}</span>
                                            <button onClick={increaseQty} disabled={isCompletelyOutOfStock || quantity >= currentMaxStock || (variants.length > 0 && !selectedSize)} className="text-[var(--store-text-main)] disabled:opacity-30 active:scale-90"><Plus size={14} strokeWidth={1.5} /></button>
                                        </div>

                                        <motion.button
                                            whileTap={!isCompletelyOutOfStock && (variants.length === 0 || (selectedColor && selectedSize)) ? { scale: 0.98 } : {}}
                                            onClick={handleAddToCart}
                                            disabled={isCompletelyOutOfStock || isAdding}
                                            className={`flex-1 h-[46px] rounded-[var(--radius-btn)] border-[length:var(--border-width-ui)] border-[var(--store-text-main)] font-bold uppercase tracking-[0.2em] text-[10px] transition-all flex items-center justify-center relative overflow-hidden ${isCompletelyOutOfStock ? 'bg-neutral-200 text-neutral-400 border-neutral-200 cursor-not-allowed' : (variants.length > 0 && (!selectedColor || !selectedSize)) ? 'bg-transparent text-[var(--store-text-main)]' : 'bg-[var(--store-text-main)] text-[var(--store-bg)] hover:bg-transparent hover:text-[var(--store-text-main)]'}`}
                                        >
                                            <AnimatePresence mode="wait">
                                                {isAdding ? <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><Loader2 size={16} className="animate-spin" /></motion.div> : <motion.span key="content" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2"><ShoppingBag size={16} strokeWidth={1.5} className="mb-0.5" /> {buttonText === 'Agregar' ? 'Añadir a la bolsa' : buttonText}</motion.span>}
                                            </AnimatePresence>
                                        </motion.button>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

                {/* LIGHTBOX AISLADO */}
                <LightboxViewer
                    isOpen={isLightboxOpen}
                    onClose={() => setIsLightboxOpen(false)}
                    images={currentGallery}
                    currentIndex={lightboxIndex}
                    setIndex={setLightboxIndex}
                    cardStyle={activeTheme.layout?.card_style}
                />
            </>
        );
    }

   // =========================================================================
    // 🏴‍☠️ VARIANTE: TEMA 4 (STREETWEAR BRUTALIST MODAL)
    // =========================================================================
  if (activeTheme.layout?.card_style === 'brutalist') {
        return (
            <>
            <AnimatePresence>
                {isOpen && (
                    <div key="modal-brutalist-root" className="fixed inset-0 z-[60] flex items-end md:items-stretch justify-end">
                        <motion.div 
                            initial={{ opacity: 0 }} 
                            animate={{ opacity: 1, transition: { duration: 0.3 } }} 
                            exit={{ opacity: 0 }} 
                            className={`absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity duration-200 ${isHiding ? 'opacity-0' : 'opacity-100'}`} 
                            onClick={onClose} 
                        />

                        <motion.div 
                            variants={modalVariants} 
                            initial="hidden" 
                            animate="visible" 
                            exit="exit" 
                            className={`relative bg-[var(--store-bg)] w-full md:w-[620px] lg:w-[820px] h-[98vh] md:h-full border-t-2 md:border-t-0 md:border-l-2 border-[var(--store-border)] flex flex-col md:flex-row overflow-hidden shadow-[8px_8px_0px_0px_#000] will-change-transform transition-opacity duration-200 ${isHiding ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
                        >
                            {/* Botón de Cerrar Cuadrado */}
                            <button 
                                onClick={onClose} 
                                className="absolute top-4 right-4 z-50 p-2 bg-[var(--store-surface)] border-2 border-[var(--store-border)] text-[var(--store-text-main)] hover:bg-[var(--store-text-main)] hover:text-[var(--store-bg)] transition-colors shadow-[2px_2px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
                            >
                                <X size={18} strokeWidth={2.5} />
                            </button>

                            {/* Botón de Favorito Cuadrado */}
                            <button 
                                onClick={(e) => { e.stopPropagation(); document.dispatchEvent(new CustomEvent('toggleFavorite', { detail: product })); }} 
                                className={`absolute top-4 left-4 z-50 p-2 border-2 transition-all shadow-[2px_2px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none ${isFavorite ? 'text-[var(--store-action-favorite)] border-[var(--store-action-favorite)] bg-black' : 'bg-[var(--store-surface)] text-[var(--store-surface-text)] border-[var(--store-border)] hover:text-[var(--store-action-favorite)]'}`}
                                style={isFavorite ? { backgroundColor: 'color-mix(in srgb, var(--store-action-favorite) 20%, #000)' } : {}}
                            >
                                <Heart size={18} strokeWidth={2.5} className={isFavorite ? "fill-current" : ""} />
                            </button>

                            <div className="w-full h-full overflow-y-auto md:overflow-hidden flex flex-col md:flex-row pb-[110px] md:pb-0 no-scrollbar">
                          {/* 1. IMAGEN BRUTALISTA CON MARCO (Side-Zoom & Lightbox) */}
                                <div 
                                    className="w-full h-auto aspect-square md:aspect-auto md:h-full md:w-1/2 bg-[var(--store-bg)] relative flex items-center justify-center shrink-0 border-b-2 md:border-b-0 md:border-r-2 border-[var(--store-border)] overflow-hidden group cursor-zoom-in"
                                    onMouseMove={handleZoomMove}
                                    onMouseEnter={handleZoomEnter}
                                    onMouseLeave={() => setZoomData(prev => ({ ...prev, show: false }))}
                                    onClick={() => { setIsLightboxOpen(true); setLightboxIndex(galleryIndex); }}
                                >
                                    {currentGallery.length > 0 ? (
                                        <>
                                            <Image id="modal-main-image" src={getOptimizedUrl(currentGallery[galleryIndex])} alt={product?.name || 'Streetwear'} fill sizes="(max-width: 768px) 100vw, 50vw" className={`object-cover p-4 md:p-8 transition-transform duration-500 ${!zoomData.show ? 'group-hover:scale-105' : ''}`} />
                                            {zoomData.show && (
                                                <div className="hidden md:block absolute pointer-events-none bg-black/10 border-2 border-black backdrop-blur-[2px] shadow-[4px_4px_0px_rgba(0,0,0,0.5)] z-20" style={{ width: '40%', height: '40%', left: `calc(${zoomData.x}% - 20%)`, top: `calc(${zoomData.y}% - 20%)` }} />
                                            )}
                                        </>
                                    ) : (
                                        <span className="text-4xl font-mono font-black text-[var(--store-border)]">NO_IMAGE</span>
                                    )}

                                    {currentGallery.length > 1 && (
                                        <>
                                            <button onClick={(e) => { e.stopPropagation(); prevImage(); }} className="absolute left-3 top-1/2 -translate-y-1/2 p-2 bg-[var(--store-surface)] border-2 border-[var(--store-border)] text-[var(--store-text-main)] shadow-[2px_2px_0px_#000] active:scale-90 z-30"><ChevronLeft size={18} strokeWidth={2.5} /></button>
                                            <button onClick={(e) => { e.stopPropagation(); nextImage(); }} className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-[var(--store-surface)] border-2 border-[var(--store-border)] text-[var(--store-text-main)] shadow-[2px_2px_0px_#000] active:scale-90 z-30"><ChevronRight size={18} strokeWidth={2.5} /></button>
                                        </>
                                    )}
                                </div>

                                {/* 2. DETALLES RAW */}
                                <div className="w-full h-auto md:h-full md:w-1/2 flex flex-col bg-[var(--store-surface)]">
                                    <div className="flex-1 overflow-visible md:overflow-y-auto p-6 md:p-8 space-y-6 no-scrollbar pb-6 md:pb-[130px]">
                                        <div>
                                            <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-[var(--store-surface-text)] block mb-1">
                                                // {product?.category || 'STREETWEAR DROP'}
                                            </span>
                                            <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-[var(--store-text-main)] font-heading leading-tight">
                                                {product?.name}
                                            </h2>

                                            {pricing.promoBadgeText && (
                                                <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 bg-[var(--store-badge-discount-bg)] text-[var(--store-badge-discount-text)] text-[10px] font-mono font-black uppercase tracking-widest border border-black shadow-[2px_2px_0px_#000]">
                                                    <Tag size={12} /> {pricing.promoBadgeText}
                                                </div>
                                            )}

                                            <div className="flex items-baseline gap-3 mt-4">
                                                {pricing.isPromo && (
                                                    <span className="text-sm font-mono font-bold text-[var(--store-surface-text)] line-through">
                                                        ${pricing.compareAt.toFixed(2)}
                                                    </span>
                                                )}
                                                <span className="text-3xl font-black font-price text-[var(--store-text-main)] leading-none">
                                                    ${pricing.listPrice.toFixed(2)}
                                                </span>
                                                <span className="text-xs font-mono font-bold text-[var(--store-surface-text)]">
                                                    Bs {new Intl.NumberFormat('es-VE', { maximumFractionDigits: 2 }).format(pricing.priceInBs)}
                                                </span>
                                            </div>

                                            {isCompletelyOutOfStock && (
                                                <div className="mt-3 text-[10px] font-mono font-black uppercase tracking-widest text-red-500 bg-red-500/10 px-2.5 py-1 border border-red-500 w-fit">
                                                    SOLD OUT // TEMPORALMENTE AGOTADO
                                                </div>
                                            )}
                                        </div>

                                        {/* Selector de Variantes Cuadradas */}
                                        {!loading && variants.length > 0 && !isCompletelyOutOfStock && (
                                            <div className="space-y-5 pt-4 border-t-2 border-[var(--store-border)]">
                                                {/* Colores */}
                                                <div>
                                                    <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[var(--store-surface-text)] flex items-center gap-2 mb-2">
                                                        COLOR: <strong className="text-[var(--store-text-main)] font-black">{selectedColor || 'SELECCIONA'}</strong>
                                                        {!selectedColor && (
                                                            <motion.span animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.5 }} className="text-[var(--store-primary)] normal-case tracking-normal text-[10px]">
                                                                👉 Toca para elegir
                                                            </motion.span>
                                                        )}
                                                    </span>
                                                    <div className="flex flex-wrap gap-2">
                                                       {availableColors.map((c: any) => (
                                                            <button
                                                                key={c.name}
                                                                onClick={() => {
                                                                    if (c.isAvailable) {
                                                                        setSelectedColor(c.name);
                                                                        const sizes = variants.filter(v => v.color_name === c.name);
                                                                        if (sizes.length === 1) setSelectedSize(sizes[0].size);
                                                                        else setSelectedSize(null);
                                                                    }
                                                                }}
                                                                disabled={!c.isAvailable}
                                                                className={`relative flex items-center justify-center transition-all overflow-hidden ${
                                                                    c.hex && c.hex !== 'transparent' && c.hex !== '#transparent'
                                                                        ? `w-10 h-10 border-2 ${selectedColor === c.name ? 'border-black shadow-[3px_3px_0px_#000] scale-105 z-10' : 'border-[var(--store-border)] hover:border-black shadow-[1px_1px_0px_#000]'}`
                                                                        : `px-3 py-2 border-2 text-xs font-mono font-bold uppercase ${selectedColor === c.name ? 'border-black bg-black text-white shadow-[3px_3px_0px_#000]' : 'border-[var(--store-border)] bg-[var(--store-surface)] text-[var(--store-text-main)] hover:border-black'}`
                                                                } ${!c.isAvailable ? 'opacity-30 cursor-not-allowed grayscale' : ''}`}
                                                                style={c.hex && c.hex !== 'transparent' && c.hex !== '#transparent' ? { backgroundColor: c.hex } : {}}
                                                                title={c.name}
                                                            >
                                                                {c.hex && c.hex !== 'transparent' && c.hex !== '#transparent' ? (
                                                                    <>
                                                                        {selectedColor === c.name && <Check size={18} className="text-white mix-blend-difference" strokeWidth={4} />}
                                                                        {!c.isAvailable && <div className="absolute inset-0 w-full h-[2px] bg-red-500 top-1/2 -rotate-45" />}
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <span>{c.name}</span>
                                                                        {!c.isAvailable && <div className="absolute inset-0 w-full h-[2px] bg-red-500 top-1/2 -rotate-[20deg]" />}
                                                                    </>
                                                                )}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Tallas */}
                                                {availableSizes.length > 1 && (
                                                    <div>
                                                        <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[var(--store-surface-text)] block mb-2">
                                                            TALLA / SIZE
                                                        </span>
                                                        <div className="flex flex-wrap gap-2">
                                                            {availableSizes.map((v, idx) => (
                                                                <button
                                                                    key={v.id || v.size || `brutalist-size-${idx}`}
                                                                    onClick={() => { if (v.stock > 0) setSelectedSize(v.size); }}
                                                                    disabled={v.stock <= 0}
                                                                    className={`min-w-[3rem] px-3 py-2 border-2 text-xs font-mono font-black uppercase transition-all ${selectedSize === v.size ? 'border-black bg-[var(--store-primary)] text-[var(--store-primary-text)] shadow-[2px_2px_0px_#000]' : 'border-[var(--store-border)] bg-[var(--store-surface)] text-[var(--store-text-main)] hover:border-black'} ${v.stock <= 0 ? 'opacity-30 cursor-not-allowed line-through' : ''}`}
                                                                >
                                                                    {v.size}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                      {/* 🚀 ACORDEÓN / DESPLEGADO BRUTALISTA */}
                                        <div className="mt-8 space-y-4">
                                            {/* Descripción */}
                                            {product?.description && (
                                                <div className="border-t-2 border-[var(--store-border)] pt-4">
                                                    {activeTheme.shapes.info_layout === 'expanded' ? (
                                                        <div>
                                                            <span className="text-[10px] font-mono font-black uppercase tracking-widest text-[var(--store-text-main)] block mb-2">
                                                                // ESPECIFICACIONES
                                                            </span>
                                                            <p className="text-xs text-[var(--store-surface-text)] font-mono leading-relaxed whitespace-pre-line">{product.description}</p>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <button onClick={() => setIsDescriptionOpen(!isDescriptionOpen)} className="w-full flex items-center justify-between text-[var(--store-text-main)] hover:bg-[var(--store-text-main)] hover:text-[var(--store-bg)] transition-colors p-2 border-2 border-transparent hover:border-black">
                                                                <span className="text-[10px] font-mono font-black uppercase tracking-widest">// ESPECIFICACIONES</span>
                                                                <span className="text-[10px] font-mono font-black">{isDescriptionOpen ? '[ - ]' : '[ + ]'}</span>
                                                            </button>
                                                            <motion.div initial={false} animate={{ height: isDescriptionOpen ? "auto" : 0, opacity: isDescriptionOpen ? 1 : 0 }} className="overflow-hidden">
                                                                <p className="text-xs text-[var(--store-surface-text)] font-mono leading-relaxed whitespace-pre-line pt-4 px-2">{product.description}</p>
                                                            </motion.div>
                                                        </>
                                                    )}
                                                </div>
                                            )}

                                            {/* Envío */}
                                            {(!isCompletelyOutOfStock && storeConfig?.shipping_config?.show_badge !== false) && (
                                                <div className="border-t-2 border-[var(--store-border)] pt-4">
                                                    {activeTheme.shapes.info_layout === 'expanded' ? (
                                                        <div>
                                                            <span className="text-[10px] font-mono font-black uppercase tracking-widest text-[var(--store-text-main)] block mb-2">
                                                                // LOGÍSTICA & ENVÍO
                                                            </span>
                                                            <div className="flex flex-col gap-1 px-2 border-l-2 border-[var(--store-primary)] pl-3">
                                                                <span className="text-xs font-black text-[var(--store-text-main)] uppercase">{product?.shipping_badge_title || storeConfig?.shipping_config?.global_badge_title || 'BAJO PEDIDO'}</span>
                                                                <span className="text-[10px] font-mono font-bold text-[var(--store-surface-text)] uppercase">{product?.shipping_badge_desc || storeConfig?.shipping_config?.global_badge_desc || 'TIEMPO DE ENTREGA: 2 A 7 DÍAS'}</span>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <button onClick={() => setIsShippingOpen(!isShippingOpen)} className="w-full flex items-center justify-between text-[var(--store-text-main)] hover:bg-[var(--store-text-main)] hover:text-[var(--store-bg)] transition-colors p-2 border-2 border-transparent hover:border-black">
                                                                <span className="text-[10px] font-mono font-black uppercase tracking-widest">// LOGÍSTICA & ENVÍO</span>
                                                                <span className="text-[10px] font-mono font-black">{isShippingOpen ? '[ - ]' : '[ + ]'}</span>
                                                            </button>
                                                            <motion.div initial={false} animate={{ height: isShippingOpen ? "auto" : 0, opacity: isShippingOpen ? 1 : 0 }} className="overflow-hidden">
                                                                <div className="flex flex-col gap-1 pt-4 px-2 border-l-2 border-[var(--store-primary)] ml-2 mt-2">
                                                                    <span className="text-xs font-black text-[var(--store-text-main)] uppercase">{product?.shipping_badge_title || storeConfig?.shipping_config?.global_badge_title || 'BAJO PEDIDO'}</span>
                                                                    <span className="text-[10px] font-mono font-bold text-[var(--store-surface-text)] uppercase">{product?.shipping_badge_desc || storeConfig?.shipping_config?.global_badge_desc || 'TIEMPO DE ENTREGA: 2 A 7 DÍAS'}</span>
                                                                </div>
                                                            </motion.div>
                                                        </>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                  
                                    </div>
                                </div>
                            </div>

                          {/* 🚀 PANEL DE PROYECCIÓN (Side-Zoom Desktop) */}
                            <AnimatePresence>
                                {zoomData.show && currentGallery.length > 0 && (
                                    <motion.div 
                                        initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.2 }}
                                        className="hidden md:block absolute inset-y-0 right-0 w-1/2 z-[100] bg-[var(--store-bg)] pointer-events-none overflow-hidden border-l-2 border-[var(--store-border)]"
                                    >
                                        <div className="w-full h-full" style={{ backgroundImage: `url(${getOptimizedUrl(currentGallery[galleryIndex])})`, backgroundPosition: `${zoomData.x}% ${zoomData.y}%`, backgroundSize: '250%', backgroundRepeat: 'no-repeat' }} />
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* FOOTER BRUTALISTA DE COMPRA */}
                            <div className="absolute bottom-0 left-0 right-0 md:left-auto md:w-1/2 w-full p-4 md:p-6 bg-[var(--store-surface)] border-t-2 border-[var(--store-border)] z-50 flex items-center gap-3">
                                <div className="flex items-center border-2 border-black bg-[var(--store-bg)] shadow-[2px_2px_0px_#000]">
                                    <button onClick={decreaseQty} disabled={isCompletelyOutOfStock || quantity <= 1} className="p-3 text-[var(--store-text-main)] hover:bg-black/10 transition-colors disabled:opacity-30"><Minus size={14} strokeWidth={3} /></button>
                                    <span className="font-mono font-black text-sm w-8 text-center">{quantity}</span>
                                    <button onClick={increaseQty} disabled={isCompletelyOutOfStock || quantity >= currentMaxStock} className="p-3 text-[var(--store-text-main)] hover:bg-black/10 transition-colors disabled:opacity-30"><Plus size={14} strokeWidth={3} /></button>
                                </div>

                                <motion.button
                                    whileTap={!isCompletelyOutOfStock && (variants.length === 0 || (selectedColor && selectedSize)) ? { scale: 0.98 } : {}}
                                    onClick={handleAddToCart}
                                    disabled={isCompletelyOutOfStock || isAdding}
                                    className={`flex-1 h-12 border-2 border-black font-mono font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-[4px_4px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none ${isCompletelyOutOfStock ? 'bg-neutral-300 text-neutral-500 cursor-not-allowed border-neutral-400 shadow-none' : 'bg-[var(--store-primary)] text-[var(--store-primary-text)] hover:opacity-95'}`}
                                >
                                    {isAdding ? <Loader2 size={16} className="animate-spin" /> : <><ShoppingBag size={16} strokeWidth={2.5} /> {buttonText === 'Agregar' ? 'AÑADIR AL DROP' : buttonText}</>}
                                </motion.button>
                            </div>
                        </motion.div>
                    </div>
                )}
                
      </AnimatePresence>

            {/* 🚀 LIGHTBOX AISLADO (Cero colisión de Presence) */}
            <LightboxViewer
                isOpen={isLightboxOpen}
                onClose={() => setIsLightboxOpen(false)}
                images={currentGallery}
                currentIndex={lightboxIndex}
                setIndex={setLightboxIndex}
                cardStyle={activeTheme.layout?.card_style}
            />
        </>
        );
    }
    // =========================================================================
    // 🍔 VARIANTE: TEMA 5 (BISTRO & FAST FOOD APP MODAL)
  if (activeTheme.layout?.card_style === 'food_menu') {
        return (
            <>
            <AnimatePresence>
                {isOpen && (
                    <div key="modal-food-root" className="fixed inset-0 z-[60] flex items-end md:items-stretch justify-end">
                        <motion.div 
                            initial={{ opacity: 0 }} 
                            animate={{ opacity: 1 }} 
                            exit={{ opacity: 0 }} 
                            className={`absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-200 ${isHiding ? 'opacity-0' : 'opacity-100'}`} 
                            onClick={onClose} 
                        />

                        <motion.div 
                            variants={modalVariants} 
                            initial="hidden" 
                            animate="visible" 
                            exit="exit" 
                            className={`relative bg-[var(--store-bg)] w-full md:w-[580px] lg:w-[780px] h-[95vh] md:h-full rounded-t-[32px] md:rounded-l-3xl md:rounded-r-none flex flex-col md:flex-row overflow-hidden shadow-2xl will-change-transform transition-opacity duration-200 ${isHiding ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
                        >
                            <button 
                                onClick={onClose} 
                                className="absolute top-4 right-4 z-50 p-2.5 bg-white/90 rounded-full shadow-md text-neutral-800 hover:bg-white active:scale-90 transition-all"
                            >
                                <X size={18} strokeWidth={2.5} />
                            </button>

                            <div className="w-full h-full overflow-y-auto md:overflow-hidden flex flex-col md:flex-row pb-[110px] md:pb-0 no-scrollbar">
                                
                       {/* 1. IMAGEN DE APETITO (Side-Zoom & Lightbox) */}
                                <div 
                                    className="w-full h-auto aspect-[4/3] md:aspect-auto md:h-full md:w-1/2 bg-[var(--store-bg)] relative flex items-center justify-center shrink-0 overflow-hidden group cursor-zoom-in"
                                    onMouseMove={handleZoomMove}
                                    onMouseEnter={handleZoomEnter}
                                    onMouseLeave={() => setZoomData(prev => ({ ...prev, show: false }))}
                                    onClick={() => { setIsLightboxOpen(true); setLightboxIndex(galleryIndex); }}
                                >
                                    {currentGallery.length > 0 ? (
                                        <>
                                            <Image id="modal-main-image" src={getOptimizedUrl(currentGallery[galleryIndex])} alt={product?.name || 'Plato'} fill sizes="(max-width: 768px) 100vw, 50vw" className={`object-cover transition-transform duration-500 ${!zoomData.show ? 'group-hover:scale-105' : ''}`} />
                                            {zoomData.show && (
                                                <div className="hidden md:block absolute pointer-events-none bg-black/5 border border-white/30 rounded-full backdrop-blur-[2px] shadow-[0_10px_30px_rgba(0,0,0,0.2)] z-20" style={{ width: '40%', height: '40%', left: `calc(${zoomData.x}% - 20%)`, top: `calc(${zoomData.y}% - 20%)` }} />
                                            )}
                                        </>
                                    ) : (
                                        <span className="text-4xl font-bold text-[var(--store-border)]">🍔</span>
                                    )}
                                </div>

                                {/* 2. DETALLE GASTRONÓMICO */}
                                <div className="w-full h-auto md:h-full md:w-1/2 flex flex-col bg-[var(--store-surface)]">
                                    <div className="flex-1 overflow-visible md:overflow-y-auto p-6 md:p-8 space-y-6 no-scrollbar pb-6 md:pb-[130px]">
                                        <div>
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--store-primary)] block mb-1">
                                                {product?.category || 'Especialidad'}
                                            </span>
                                            <h2 className="text-2xl md:text-3xl font-black text-[var(--store-text-main)] font-heading leading-tight tracking-tight">
                                                {product?.name}
                                            </h2>

                                            <div className="flex items-baseline gap-3 mt-3">
                                                {pricing.isPromo && (
                                                    <span className="text-sm font-bold text-[var(--store-surface-text)] line-through">
                                                        ${pricing.compareAt.toFixed(2)}
                                                    </span>
                                                )}
                                                <span className="text-3xl font-black font-price text-[var(--store-text-main)] leading-none">
                                                    ${pricing.listPrice.toFixed(2)}
                                                </span>
                                                <span className="text-xs font-mono font-bold text-[var(--store-surface-text)]">
                                                    Bs {new Intl.NumberFormat('es-VE', { maximumFractionDigits: 2 }).format(pricing.priceInBs)}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Opciones / Variantes en Píldoras */}
                                        {!loading && variants.length > 0 && !isCompletelyOutOfStock && (
                                           <div className="space-y-4 pt-4 border-t border-[var(--store-border)]/40">
                                                <span className="text-[11px] font-black uppercase tracking-wider text-[var(--store-text-main)] flex items-center gap-2">
                                                    Elige tu opción:
                                                    {!selectedColor && (
                                                        <motion.span animate={{ opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 1.5 }} className="text-[var(--store-primary)] normal-case tracking-normal text-[10px]">
                                                            👉 Toca para elegir
                                                        </motion.span>
                                                    )}
                                                </span>
                                                <div className="flex flex-wrap gap-2">
                                                    {availableColors.map((c: any) => (
                                                        <button
                                                            key={c.name}
                                                            onClick={() => {
                                                                if (c.isAvailable) {
                                                                    setSelectedColor(c.name);
                                                                    const sizes = variants.filter(v => v.color_name === c.name);
                                                                    if (sizes.length === 1) setSelectedSize(sizes[0].size);
                                                                    else setSelectedSize(null);
                                                                }
                                                            }}
                                                            disabled={!c.isAvailable}
                                                            className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${selectedColor === c.name ? 'bg-[var(--store-primary)] text-[var(--store-primary-text)] shadow-sm scale-105' : 'bg-[var(--store-bg)] text-[var(--store-text-main)] border border-[var(--store-border)]/60 hover:border-[var(--store-primary)]'}`}
                                                        >
                                                            {c.name}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                     {/* 🚀 ACORDEÓN / DESPLEGADO GASTRONÓMICO */}
                                        <div className="mt-8 space-y-2">
                                            {product?.description && (
                                                <div className="bg-[var(--store-bg)] rounded-2xl p-1 border border-[var(--store-border)]/40">
                                                    {activeTheme.shapes.info_layout === 'expanded' ? (
                                                        <div className="p-4">
                                                            <span className="text-[11px] font-black uppercase tracking-wider text-[var(--store-text-main)] block mb-2">Ingredientes y Detalle</span>
                                                            <p className="text-xs md:text-sm text-[var(--store-surface-text)] leading-relaxed whitespace-pre-line">{product.description}</p>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <button onClick={() => setIsDescriptionOpen(!isDescriptionOpen)} className="w-full flex items-center justify-between p-4 text-[var(--store-text-main)] hover:bg-[var(--store-surface)] rounded-xl transition-colors">
                                                                <span className="text-[11px] font-black uppercase tracking-wider">Ingredientes y Detalle</span>
                                                                <motion.div animate={{ rotate: isDescriptionOpen ? 180 : 0 }} className="bg-[var(--store-surface)] p-1 rounded-full shadow-sm"><ChevronDown size={14} /></motion.div>
                                                            </button>
                                                            <motion.div initial={false} animate={{ height: isDescriptionOpen ? "auto" : 0, opacity: isDescriptionOpen ? 1 : 0 }} className="overflow-hidden">
                                                                <p className="text-xs md:text-sm text-[var(--store-surface-text)] leading-relaxed whitespace-pre-line px-4 pb-4">{product.description}</p>
                                                            </motion.div>
                                                        </>
                                                    )}
                                                </div>
                                            )}

                                            {(!isCompletelyOutOfStock && storeConfig?.shipping_config?.show_badge !== false) && (
                                                <div className="bg-[var(--store-bg)] rounded-2xl p-1 border border-[var(--store-border)]/40">
                                                    {activeTheme.shapes.info_layout === 'expanded' ? (
                                                        <div className="p-4 flex items-center gap-3">
                                                            <div className="bg-[var(--store-surface)] p-2.5 rounded-full shadow-sm shrink-0 text-[var(--store-primary)]"><Truck size={16} /></div>
                                                            <div className="flex flex-col">
                                                                <span className="text-xs font-black text-[var(--store-text-main)] uppercase tracking-wide">{product?.shipping_badge_title || storeConfig?.shipping_config?.global_badge_title || 'Delivery Disponible'}</span>
                                                                <span className="text-[11px] font-medium text-[var(--store-surface-text)]">{product?.shipping_badge_desc || storeConfig?.shipping_config?.global_badge_desc || 'Tiempo estimado: 30-45 min'}</span>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <button onClick={() => setIsShippingOpen(!isShippingOpen)} className="w-full flex items-center justify-between p-4 text-[var(--store-text-main)] hover:bg-[var(--store-surface)] rounded-xl transition-colors">
                                                                <div className="flex items-center gap-2">
                                                                    <Truck size={14} className="text-[var(--store-primary)]" />
                                                                    <span className="text-[11px] font-black uppercase tracking-wider">Delivery & Retiro</span>
                                                                </div>
                                                                <motion.div animate={{ rotate: isShippingOpen ? 180 : 0 }} className="bg-[var(--store-surface)] p-1 rounded-full shadow-sm"><ChevronDown size={14} /></motion.div>
                                                            </button>
                                                            <motion.div initial={false} animate={{ height: isShippingOpen ? "auto" : 0, opacity: isShippingOpen ? 1 : 0 }} className="overflow-hidden">
                                                                <div className="px-4 pb-4 pt-1 flex flex-col gap-1">
                                                                    <span className="text-xs font-black text-[var(--store-text-main)] uppercase tracking-wide">{product?.shipping_badge_title || storeConfig?.shipping_config?.global_badge_title || 'Delivery Disponible'}</span>
                                                                    <span className="text-[11px] font-medium text-[var(--store-surface-text)]">{product?.shipping_badge_desc || storeConfig?.shipping_config?.global_badge_desc || 'Tiempo estimado: 30-45 min'}</span>
                                                                </div>
                                                            </motion.div>
                                                        </>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                           {/* 🚀 PANEL DE PROYECCIÓN (Side-Zoom Desktop) */}
                            <AnimatePresence>
                                {zoomData.show && currentGallery.length > 0 && (
                                    <motion.div 
                                        initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.2 }}
                                        className="hidden md:block absolute inset-y-0 right-0 w-1/2 z-[100] bg-[var(--store-bg)] pointer-events-none overflow-hidden border-l border-[var(--store-border)]/40"
                                    >
                                        <div className="w-full h-full" style={{ backgroundImage: `url(${getOptimizedUrl(currentGallery[galleryIndex])})`, backgroundPosition: `${zoomData.x}% ${zoomData.y}%`, backgroundSize: '250%', backgroundRepeat: 'no-repeat' }} />
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* FOOTER GASTRONÓMICO CON STEPPER TÁCTIL */}
                            <div className="absolute bottom-0 left-0 right-0 md:left-auto md:w-1/2 w-full p-4 md:p-6 bg-[var(--store-surface)]/95 backdrop-blur-xl border-t border-[var(--store-border)]/40 z-50 flex items-center gap-3">
                                <div className="flex items-center bg-[var(--store-bg)] rounded-full p-1 border border-[var(--store-border)]/60">
                                    <button onClick={decreaseQty} disabled={isCompletelyOutOfStock || quantity <= 1} className="w-9 h-9 rounded-full flex items-center justify-center text-[var(--store-text-main)] hover:bg-[var(--store-surface)] disabled:opacity-30 active:scale-90 transition-all"><Minus size={15} strokeWidth={2.5} /></button>
                                    <span className="font-black text-sm w-7 text-center">{quantity}</span>
                                    <button onClick={increaseQty} disabled={isCompletelyOutOfStock || quantity >= currentMaxStock} className="w-9 h-9 rounded-full flex items-center justify-center text-[var(--store-text-main)] hover:bg-[var(--store-surface)] disabled:opacity-30 active:scale-90 transition-all"><Plus size={15} strokeWidth={2.5} /></button>
                                </div>

                                <motion.button
                                    whileTap={{ scale: 0.96 }}
                                    onClick={handleAddToCart}
                                    disabled={isCompletelyOutOfStock || isAdding}
                                    className={`flex-1 h-12 rounded-full font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 ${isCompletelyOutOfStock ? 'bg-neutral-300 text-neutral-500 cursor-not-allowed' : 'bg-[var(--store-primary)] text-[var(--store-primary-text)] hover:opacity-95'}`}
                                >
                                    {isAdding ? <Loader2 size={16} className="animate-spin" /> : <><Plus size={18} strokeWidth={3} /> {buttonText === 'Agregar' ? 'AGREGAR AL PEDIDO' : buttonText}</>}
                                </motion.button>
                            </div>
                     </motion.div>
                    </div>
                )}

            </AnimatePresence>

            {/* 🚀 LIGHTBOX AISLADO (Cero colisión de Presence) */}
            <LightboxViewer
                isOpen={isLightboxOpen}
                onClose={() => setIsLightboxOpen(false)}
                images={currentGallery}
                currentIndex={lightboxIndex}
                setIndex={setLightboxIndex}
                cardStyle={activeTheme.layout?.card_style}
            />
        </>
        );
    }

 // =========================================================================
    // 🌟 VARIANTE: TEMA 1 (STANDARD / UNIVERSAL PREZISO MODAL)
    // =========================================================================
    return (
        <>
            <AnimatePresence>
                {isOpen && (
                    <div key="modal-universal-portal" className="fixed inset-0 z-60 flex items-end md:items-stretch justify-end">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1, transition: { duration: 0.4, ease: "easeOut" } }}
                            exit={{ opacity: 0, transition: { duration: 0.3, ease: "easeIn" } }}
                            className={`absolute inset-0 bg-black/60 backdrop-blur-sm will-change-[opacity] transition-opacity duration-200 ${isHiding ? 'opacity-0' : 'opacity-100'}`}
                        />

                        <motion.div
                            variants={modalVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            className={`relative bg-[var(--store-bg)] w-full md:w-[600px] lg:w-[800px] h-[98vh] md:h-full rounded-t-[32px] md:rounded-none flex flex-col md:flex-row overflow-hidden shadow-2xl md:border-l border-[var(--store-border)] will-change-transform transition-opacity duration-200 ${isHiding ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
                        >
                            <button onClick={onClose} className="absolute top-4 right-4 z-50 bg-[var(--store-surface)]/90 p-2 rounded-full hover:bg-[var(--store-bg)] transition-colors backdrop-blur border border-[var(--store-border)] text-[var(--store-text-main)] active:scale-95">
                                <X size={20} strokeWidth={2} />
                            </button>

                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    document.dispatchEvent(new CustomEvent('toggleFavorite', { detail: product }));
                                }}
                                className={`absolute top-4 left-4 z-50 p-2 rounded-full transition-colors backdrop-blur border active:scale-95 ${isFavorite
                                    ? 'text-[var(--store-action-favorite)] border-transparent'
                                    : 'bg-[var(--store-surface)]/90 border-[var(--store-border)] text-[var(--store-surface-text)] hover:bg-[var(--store-bg)] hover:text-[var(--store-action-favorite)]'
                                    }`}
                                style={isFavorite ? { backgroundColor: 'color-mix(in srgb, var(--store-action-favorite) 15%, transparent)', borderColor: 'color-mix(in srgb, var(--store-action-favorite) 30%, transparent)' } : {}}
                            >
                                <Heart size={20} strokeWidth={2} className={isFavorite ? "fill-current" : ""} />
                            </button>

                            {/* SCROLL CONTAINER */}
                            <div className="w-full h-full overflow-y-auto md:overflow-hidden flex flex-col md:flex-row pb-[140px] md:pb-0 no-scrollbar">

                                {/* 1. IMAGEN (Side-Zoom & Lightbox) */}
                                <div 
                                    className="w-full h-auto aspect-square md:aspect-auto md:h-full md:w-1/2 bg-[var(--store-bg)] relative flex items-center justify-center border-b md:border-b-0 md:border-r border-[var(--store-border)]/30 shrink-0 group overflow-hidden cursor-zoom-in"
                                    onMouseMove={handleZoomMove}
                                    onMouseEnter={handleZoomEnter}
                                    onMouseLeave={() => setZoomData(prev => ({ ...prev, show: false }))}
                                    onClick={() => { setIsLightboxOpen(true); setLightboxIndex(galleryIndex); }}
                                >
                                    {currentGallery.length > 0 ? (
                                        <>
                                            <Image id="modal-main-image" src={getOptimizedUrl(currentGallery[galleryIndex])} alt={product?.name || "Producto"} fill sizes="(max-width: 768px) 100vw, 50vw" className={`object-contain p-6 md:p-10 transition-transform duration-700 ease-out ${!zoomData.show ? 'group-hover:scale-105' : ''}`} />
                                            {zoomData.show && (
                                                <div className="hidden md:block absolute pointer-events-none bg-black/5 border border-white/40 backdrop-blur-[2px] shadow-[0_10px_30px_rgba(0,0,0,0.15)] z-20 rounded-2xl" style={{ width: '40%', height: '40%', left: `calc(${zoomData.x}% - 20%)`, top: `calc(${zoomData.y}% - 20%)` }} />
                                            )}
                                        </>
                                    ) : (
                                        <span className="text-4xl font-black text-[var(--store-border)]">P.</span>
                                    )}

                                    {currentGallery.length > 1 && (
                                        <>
                                            <button onClick={(e) => { e.stopPropagation(); prevImage(); }} className="absolute left-4 top-1/2 -translate-y-1/2 bg-[var(--store-surface)]/90 p-2 rounded-full border border-[var(--store-border)] active:scale-95 transition-all opacity-100 md:opacity-0 md:group-hover:opacity-100 z-30 text-[var(--store-text-main)] hover:brightness-75 hover:text-white hover:border-[var(--store-primary)]"><ChevronLeft size={20} strokeWidth={2} /></button>
                                            <button onClick={(e) => { e.stopPropagation(); nextImage(); }} className="absolute right-4 top-1/2 -translate-y-1/2 bg-[var(--store-surface)]/90 p-2 rounded-full border border-[var(--store-border)] active:scale-95 transition-all opacity-100 md:opacity-0 md:group-hover:opacity-100 z-30 text-[var(--store-text-main)] hover:brightness-75 hover:text-white hover:border-[var(--store-primary)]"><ChevronRight size={20} strokeWidth={2} /></button>
                                            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-30">
                                                {currentGallery.map((_, idx) => (<div key={`universal-dot-${idx}`} className={`h-1.5 rounded-full transition-all duration-300 ${idx === galleryIndex ? 'bg-[var(--store-primary)] w-4' : 'bg-[var(--store-border)] w-1.5'}`} />))}
                                            </div>
                                        </>
                                    )}
                                </div>

                                {/* 2. DETALLES */}
                                <div className="w-full h-auto md:h-full md:w-1/2 flex flex-col relative bg-[var(--store-surface)]">
                                    <div className="flex-1 overflow-visible md:overflow-y-auto p-6 md:p-8 space-y-8 no-scrollbar pb-6 md:pb-[140px]">
                                        <div>
                                            <span className="text-[10px] font-bold text-[var(--store-surface-text)] uppercase tracking-widest leading-none mb-2 block">{product?.category || 'General'}</span>
                                            <h2 className="text-xl md:text-3xl font-black text-[var(--store-text-main)] leading-tight tracking-tight">{product?.name}</h2>

                                            <AnimatePresence>
                                                {pricing.promoBadgeText && (
                                                    <motion.div
                                                        initial={{ opacity: 0, y: -10 }}
                                                        animate={{ opacity: 1, y: 0, transition: { type: "tween", ease: [0.32, 0.72, 0, 1], duration: 0.4 } }}
                                                        exit={{ opacity: 0, y: -10, transition: { duration: 0.2 } }}
                                                        className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-[var(--store-primary)]/10 text-[var(--store-text-main)]/85 rounded-[var(--radius-btn)] border-[length:var(--border-width-ui)] border-[var(--store-primary)]/20 shadow-[var(--shadow-ui)] text-xs font-black tracking-wide transition-all origin-bottom"
                                                    >
                                                        <Tag size={14} className="text-[var(--store-main-text)]/85 shrink-0" /> {pricing.promoBadgeText}
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>

                                            <div className="flex flex-wrap gap-1.5 mt-3">
                                                {(pricing.hasDiscount && pricing.exactSavings > 0 && !isCompletelyOutOfStock) && (
                                                    <span className="text-[var(--store-incentive)] bg-[var(--store-incentive)]/10 px-2.5 py-1.5 rounded-[var(--radius-btn)] border-[length:var(--border-width-ui)] shadow-[var(--shadow-ui)] text-[11px] font-bold tracking-wide flex items-center gap-1.5">
                                                        <Flame size={14} className="text-[var(--store-incentive)]" />
                                                        Ahorra ${pricing.exactSavings.toFixed(2)} pagando en USD
                                                    </span>
                                                )}
                                                {isCompletelyOutOfStock && (
                                                    <span className="bg-[var(--store-badge-soldout-bg)] text-[var(--store-badge-soldout-text)] text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-[var(--radius-btn)] border-[length:var(--border-width-ui)] border-[var(--store-badge-soldout-bg)] shadow-[var(--shadow-ui)] flex items-center">
                                                        Agotado Temporalmente
                                                    </span>
                                                )}
                                            </div>

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

                                            {storeConfig?.show_tax_in_catalog && storeConfig?.fiscal_profile !== 'informal' && !product?.is_tax_exempt && (
                                                <div className="mt-3">
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[var(--radius-btn)] bg-[var(--store-surface-text)]/10 text-[var(--store-surface-text)] text-[10px] font-black uppercase tracking-widest">
                                                        <Receipt size={12} /> + ${(pricing.listPrice * ((storeConfig?.default_tax_percentage || 16) / 100)).toFixed(2)} IVA ({(storeConfig?.default_tax_percentage || 16)}%)
                                                    </span>
                                                </div>
                                            )}

                                            {(product?.wholesale_active && product?.wholesale_min_qty > 0 && product?.wholesale_discount_pct > 0) && (
                                                <div className="mt-6 border-[length:var(--border-width-ui)] border-[var(--store-border)] rounded-[var(--radius-card)] shadow-[var(--shadow-ui)] overflow-hidden bg-[var(--store-bg)]">
                                                    <div className="flex justify-between items-center px-4 py-3 border-b border-[var(--store-border)]/50 bg-[var(--store-surface)]/50">
                                                        <span className="text-[11px] font-bold text-[var(--store-surface-text)] uppercase tracking-widest">
                                                            Al Detalle (1 a {product.wholesale_min_qty - 1} und)
                                                        </span>
                                                        <span className="text-sm font-black text-[var(--store-surface-text)]">
                                                            ${(pricing.isPromo ? pricing.compareAt : pricing.listPrice).toFixed(2)} c/u
                                                        </span>
                                                    </div>
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

                                        {/* Variantes */}
                                        {loading ? (
                                            <div className="flex items-center justify-center py-10">
                                                <Loader2 className="animate-spin text-[var(--store-surface-text)]" size={32} />
                                            </div>
                                        ) : (
                                            <div className="space-y-6 pb-4">
                                                {variants.length > 0 && !isCompletelyOutOfStock && (
                                                    <>
                                                        <motion.div
                                                            animate={errorShake === 'color' ? { x: [-8, 8, -8, 8, 0], transition: { duration: 0.4 } } : {}}
                                                            className={`space-y-3 p-3 -mx-3 rounded-[var(--radius-card)] border-[length:var(--border-width-ui)] shadow-[var(--shadow-ui)] transition-colors duration-300 ${errorShake === 'color' ? 'border-red-500 bg-red-50/50' : 'border-transparent'}`}
                                                        >
                                                            <div className="flex justify-between items-center">
                                                                <span className="text-[10px] font-bold text-[var(--store-surface-text)] uppercase tracking-widest flex items-center gap-2">
                                                                    1. {isModelOption ? 'Modelo / Opción' : 'Color'}
                                                                    {!selectedColor && (
                                                                        <motion.span animate={{ opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 1.5 }} className="text-[var(--store-primary)] normal-case tracking-normal text-[9px]">
                                                                            👉 Toca para elegir
                                                                        </motion.span>
                                                                    )}
                                                                </span>
                                                                <span className="text-xs font-bold text-[var(--store-text-main)]">{selectedColor}</span>
                                                            </div>
                                                            <div className="flex flex-wrap gap-3">
                                                                {availableColors.map((c: any, idx: number) => (
                                                                    <button
                                                                        key={c.name || `universal-col-${idx}`}
                                                                        onClick={() => {
                                                                            if (c.isAvailable) {
                                                                                setSelectedColor(c.name);
                                                                                const sizesForColor = variants.filter(v => v.color_name === c.name);
                                                                                if (sizesForColor.length === 1) setSelectedSize(sizesForColor[0].size);
                                                                                else setSelectedSize(null);
                                                                                setErrorShake(null);
                                                                            }
                                                                        }}
                                                                        disabled={!c.isAvailable}
                                                                        className={`transition-all relative flex items-center justify-center overflow-hidden ${c.hex && c.hex !== 'transparent' && c.hex !== '#transparent'
                                                                            ? `w-10 h-10 rounded-full border ${selectedColor === c.name ? 'border ring-[var(--store-primary)] border-[var(--store-primary)] ring-offset-2 scale-110' : 'border-2 active:scale-110 hover:scale-105 border-[var(--store-border)]'}`
                                                                            : `px-4 py-2.5 rounded-[var(--radius-btn)] text-xs font-bold border-[length:var(--border-width-ui)] shadow-[var(--shadow-ui)] ${selectedColor === c.name ? 'bg-[var(--store-surface)] text-[var(--store-surface-text)] border-[var(--store-border)]' : 'bg-[var(--store-surface)] text-[var(--store-surface-text)] border-[var(--store-border)] hover:border-[var(--store-primary)]'}`
                                                                            } ${!c.isAvailable ? 'opacity-30 cursor-not-allowed grayscale' : ''}`}
                                                                        style={c.hex && c.hex !== 'transparent' && c.hex !== '#transparent' ? { backgroundColor: c.hex } : {}}
                                                                        title={!c.isAvailable ? 'Agotado' : c.name}
                                                                    >
                                                                        {c.hex && c.hex !== 'transparent' && c.hex !== '#transparent' ? (
                                                                            <>
                                                                                {selectedColor === c.name && <Check size={16} className="text-white/80 mix-blend-difference" strokeWidth={3} />}
                                                                                {!c.isAvailable && <div className="absolute inset-0 w-full h-px bg-red-500 top-1/2 -rotate-45" />}
                                                                            </>
                                                                        ) : (
                                                                            <>
                                                                                <span>{c.name}</span>
                                                                                {!c.isAvailable && <div className="absolute inset-0 w-full h-px bg-red-500 top-1/2 -rotate-20" />}
                                                                            </>
                                                                        )}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </motion.div>

                                                        {availableSizes.length > 1 && (
                                                            <motion.div
                                                                animate={errorShake === 'size' ? { x: [-8, 8, -8, 8, 0], transition: { duration: 0.4 } } : {}}
                                                                className={`space-y-3 p-3 -mx-3 rounded-[var(--radius-card)] border-[length:var(--border-width-ui)] shadow-[var(--shadow-ui)] transition-colors duration-300 ${errorShake === 'size' ? 'border-red-500 bg-red-50/50' : 'border-transparent'}`}
                                                            >
                                                                <div className="flex justify-between items-end">
                                                                    <span className="text-[10px] font-bold text-[var(--store-surface-text)] uppercase tracking-widest block">2. Talla</span>
                                                                    {selectedSize && currentMaxStock > 0 && (
                                                                        <span className="text-[10px] font-bold text-[var(--store-incentive)] bg-[var(--store-incentive)]/10 px-2 py-0.5 rounded-[var(--radius-btn)] border-[length:var(--border-width-ui)] shadow-[var(--shadow-ui)] border-[var(--store-incentive)]/20">
                                                                            Quedan {currentMaxStock} und.
                                                                        </span>
                                                                    )}
                                                                </div>

                                                                {!selectedColor ? (
                                                                    <div className="flex items-center gap-2 text-xs font-bold text-[var(--store-surface-text)] bg-[var(--store-bg)] p-3 rounded-[var(--radius-btn)] border-[length:var(--border-width-ui)] border-[var(--store-border)] shadow-[var(--shadow-ui)]">
                                                                        <AlertCircle size={16} /> Selecciona {isModelOption ? 'una opción' : 'un color'} primero
                                                                    </div>
                                                                ) : (
                                                                    <div className="flex flex-wrap gap-2">
                                                                        {availableSizes.map((v, idx) => {
                                                                            const isOutOfStock = v.stock <= 0;
                                                                            return (
                                                                                <button
                                                                                    key={v.id || v.size || `univ-size-${idx}`}
                                                                                    onClick={() => { if (!isOutOfStock) { setSelectedSize(v.size); setErrorShake(null); } }}
                                                                                    disabled={isOutOfStock}
                                                                                    className={`relative min-w-12 px-3 py-2.5 rounded-[var(--radius-btn)] text-xs font-bold border-[length:var(--border-width-ui)] shadow-[var(--shadow-ui)] transition-all overflow-hidden ${selectedSize === v.size
                                                                                        ? 'bg-[var(--store-primary)] text-[var(--store-primary-text)] border-[var(--store-primary)]'
                                                                                        : isOutOfStock
                                                                                            ? 'bg-[var(--store-bg)] text-[var(--store-surface-text)] border-[var(--store-border)] cursor-not-allowed opacity-60'
                                                                                            : 'bg-[var(--store-surface)] text-[var(--store-text-main)] border-[var(--store-border)] hover:border-[var(--store-primary)]'
                                                                                        }`}
                                                                                >
                                                                                    {v.size}
                                                                                </button>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                )}
                                                            </motion.div>
                                                        )}
                                                    </>
                                                )}

                                                {/* Acordeones / Desplegados */}
                                                {product?.description && (
                                                    <div className="border-t border-[var(--store-border)]/40 mt-6 pt-4">
                                                        {activeTheme.shapes.info_layout === 'expanded' ? (
                                                            <div>
                                                                <div className="flex items-center gap-2.5 mb-3">
                                                                    <Eye size={16} className="text-[var(--store-surface-text)]" />
                                                                    <span className="text-[11px] font-black uppercase tracking-wider text-[var(--store-text-main)]">Descripción</span>
                                                                </div>
                                                                <p className="text-xs md:text-sm text-[var(--store-surface-text)] leading-relaxed whitespace-pre-line pb-4">
                                                                    {product.description}
                                                                </p>
                                                            </div>
                                                        ) : (
                                                            <>
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
                                                                        animate={{ rotate: isDescriptionOpen ? (activeTheme.layout?.card_style === 'dense_hardware' ? 180 : 45) : 0 }}
                                                                        transition={{ duration: 0.25, ease: "easeInOut" }}
                                                                        className="text-[var(--store-surface-text)] shrink-0"
                                                                    >
                                                                        {activeTheme.layout?.card_style === 'dense_hardware' ? <ChevronDown size={16} /> : <Plus size={16} />}
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
                                                            </>
                                                        )}
                                                    </div>
                                                )}

                                                {(!isCompletelyOutOfStock && storeConfig?.shipping_config?.show_badge !== false) && (
                                                    <div className="border-t border-[var(--store-border)]/40 pt-4">
                                                        {activeTheme.shapes.info_layout === 'expanded' ? (
                                                            <div>
                                                                <div className="flex items-center gap-2.5 mb-3">
                                                                    <Truck size={16} className="text-[var(--store-surface-text)]" />
                                                                    <span className="text-[11px] font-black uppercase tracking-wider text-[var(--store-text-main)]">Envío</span>
                                                                </div>
                                                                <div className="flex items-center gap-3 p-4 bg-[var(--store-bg)] rounded-[var(--radius-card)] border-[length:var(--border-width-ui)] border-[var(--store-border)]/50 shadow-[var(--shadow-ui)] mb-4">
                                                                    <div className="bg-[var(--store-surface)] p-2 rounded-[var(--radius-btn)] border-[length:var(--border-width-ui)] border-[var(--store-border)] shadow-[var(--shadow-ui)] shrink-0">
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
                                                            </div>
                                                        ) : (
                                                            <>
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
                                                                        animate={{ rotate: isShippingOpen ? (activeTheme.layout?.card_style === 'dense_hardware' ? 180 : 45) : 0 }}
                                                                        transition={{ duration: 0.25, ease: "easeInOut" }}
                                                                        className="text-[var(--store-surface-text)] shrink-0"
                                                                    >
                                                                        {activeTheme.layout?.card_style === 'dense_hardware' ? <ChevronDown size={16} /> : <Plus size={16} />}
                                                                    </motion.div>
                                                                </button>

                                                                <motion.div
                                                                    initial={false}
                                                                    animate={{ height: isShippingOpen ? "auto" : 0, opacity: isShippingOpen ? 1 : 0 }}
                                                                    transition={{ duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
                                                                    className="overflow-hidden"
                                                                >
                                                                    <div className="flex items-center gap-3 p-4 bg-[var(--store-bg)] rounded-[var(--radius-card)] border-[length:var(--border-width-ui)] border-[var(--store-border)]/50 shadow-[var(--shadow-ui)] mt-2 mb-4">
                                                                        <div className="bg-[var(--store-surface)] p-2 rounded-[var(--radius-btn)] border-[length:var(--border-width-ui)] border-[var(--store-border)] shadow-[var(--shadow-ui)] shrink-0">
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
                                                            </>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* 3. PROYECCIÓN DESKTOP & FOOTER */}
                            <AnimatePresence>
                                {zoomData.show && currentGallery.length > 0 && (
                                    <motion.div 
                                        initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.2 }}
                                        className="hidden md:block absolute inset-y-0 right-0 w-1/2 z-[100] bg-[var(--store-bg)] pointer-events-none overflow-hidden border-l border-[var(--store-border)]/30"
                                    >
                                        <div className="w-full h-full" style={{ backgroundImage: `url(${getOptimizedUrl(currentGallery[galleryIndex])})`, backgroundPosition: `${zoomData.x}% ${zoomData.y}%`, backgroundSize: '250%', backgroundRepeat: 'no-repeat' }} />
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <div className="absolute bottom-0 left-0 right-0 md:left-auto md:w-1/2 w-full p-4 md:p-6 bg-[var(--store-surface)]/85 backdrop-blur-2xl border-t border-[var(--store-border)] z-20 flex flex-col gap-3 shadow-[0_-4px_20px_rgba(0,0,0,0.02)]">
                                <div className="flex gap-3 md:gap-4">
                                    <div className="flex items-center rounded-[var(--radius-btn)] p-1 border-[length:var(--border-width-ui)] border-[var(--store-border)] shadow-[var(--shadow-ui)] shrink-0 bg-[var(--store-bg)]/50">
                                        <button onClick={decreaseQty} disabled={isCompletelyOutOfStock || quantity <= 1} className="w-10 h-10 flex items-center justify-center text-[var(--store-text-main)] hover:border-[var(--store-primary)] transition-all disabled:opacity-50">
                                            <Minus size={16} strokeWidth={2.5} />
                                        </button>
                                        <span className="font-bold text-sm w-8 text-center text-[var(--store-text-main)]">{quantity}</span>
                                        <button onClick={increaseQty} disabled={isCompletelyOutOfStock || quantity >= currentMaxStock || (variants.length > 0 && !selectedSize)} className="w-10 h-10 flex items-center justify-center text-[var(--store-text-main)] hover:border-[var(--store-primary)] transition-all disabled:opacity-50">
                                            <Plus size={16} strokeWidth={2.5} />
                                        </button>
                                    </div>

                                    <motion.button
                                        whileTap={!isCompletelyOutOfStock && (variants.length === 0 || (selectedColor && selectedSize)) ? { scale: 0.95 } : {}}
                                        onClick={handleAddToCart}
                                        disabled={isCompletelyOutOfStock || isAdding}
                                        className={`flex-1 rounded-[var(--radius-btn)] border-[length:var(--border-width-ui)] shadow-[var(--shadow-ui)] font-bold uppercase tracking-widest text-xs transition-colors flex items-center justify-center h-12 relative overflow-hidden ${isCompletelyOutOfStock
                                            ? 'bg-[var(--store-bg)] text-[var(--store-text-main)] border border-[var(--store-border)]'
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

                                <button
                                    onClick={handleInquiryWhatsApp}
                                    className="w-full py-2 text-[11px] font-bold uppercase tracking-widest text-[var(--store-surface-text)] hover:text-[var(--store-text-main)] transition-colors flex items-center justify-center gap-1.5"
                                >
                                    <MessageCircle size={14} /> Tengo una duda sobre este artículo
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* LIGHTBOX AISLADO */}
            <LightboxViewer
                isOpen={isLightboxOpen}
                onClose={() => setIsLightboxOpen(false)}
                images={currentGallery}
                currentIndex={lightboxIndex}
                setIndex={setLightboxIndex}
                cardStyle={activeTheme.layout?.card_style}
            />
        </>
    );
}