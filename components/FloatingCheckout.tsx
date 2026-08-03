'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { ShoppingCart, X, Trash2, ArrowUpRight, ArrowLeft, Check, ChevronRight, Minus, Plus, Percent, MessageCircle, BadgeDollarSign, FileText, Sparkle, AlertCircle, TriangleAlert, ChevronLeft } from 'lucide-react'
import { useCart } from '@/app/store/useCart'
import { AnimatePresence, motion, Variants, useAnimation } from 'framer-motion'
import ProductCard from './ProductCard'
import CheckoutProcess from './CheckoutProcess'
import confetti from 'canvas-confetti'
import Image from 'next/image'
import { getOptimizedUrl } from '@/utils/cdn'
import { calculateCartEngine } from '@/utils/cartLogic'
import NumberTicker from './NumberTicker'

interface CheckoutProps {
    rates: { usd: number, eur: number }
    currency: 'usd' | 'eur'
    phone: string
    storeName: string
    storeId: string
    storeConfig: any
    products: any[]
    promotions?: any[]
    affiliateCode?: string | null
       favoriteIds?: Set<string>
    campaignContext?: string | null // 👈 AÑADE ESTO
}

export default function FloatingCheckout({ rates, currency, phone, storeName, storeId, storeConfig, products, promotions = [], affiliateCode = null, favoriteIds = new Set(), campaignContext = null }: CheckoutProps) {
   const items = useCart(state => state.items)
const removeItem = useCart(state => state.removeItem)
const updateQuantity = useCart(state => state.updateQuantity)
const addOrderToHistory = useCart(state => state.addOrderToHistory)
    const [isMounted, setIsMounted] = useState(false)
    const [isOpen, setIsOpen] = useState(false)
    const [step, setStep] = useState(1)
    const [direction, setDirection] = useState(1)
    const [isTransitioning, setIsTransitioning] = useState(false) // 🚀 CANDADO SÍNCRONO
    const [cartBump, setCartBump] = useState(false)





    // 🚀 ENRUTADOR ESPACIAL BLINDADO
    const changeStep = (newStep: number) => {
        setIsTransitioning(true); // 1. Matamos el scroll ANTES de animar
        setStep((prev) => {
            setDirection(newStep > prev ? 1 : -1);
            return newStep;
        });
    };
// Reemplaza estas variantes:
    const walletVariants: Variants = {
        initial: (direction: number) => ({
            y: direction > 0 ? "100%" : "-8%",
            zIndex: direction > 0 ? 50 : 10,
            opacity: direction > 0 ? 1 : 0.8 // Opacidad en lugar de brightness()
        }),
        animate: {
            y: "0%",
            zIndex: 30,
            opacity: 1,
            transition: { type: "tween", ease: [0.32, 0.72, 0, 1], duration: 0.4 } // Reducido a 0.4s para más reactividad
        },
        exit: (direction: number) => ({
            y: direction < 0 ? "100%" : "-8%",
            zIndex: direction < 0 ? 50 : 10,
            opacity: direction < 0 ? 1 : 0,
            transition: { type: "tween", ease: [0.32, 0.72, 0, 1], duration: 0.4 }
        })
    };

    // 🚀 ANTI-GHOST SCROLLBAR: Congela el scroll durante el vuelo 3D
    const scrollVariants: Variants = {
        initial: { overflowY: "hidden" },
        animate: {
            // Magia: Lo reactiva SOLO cuando termina la animación
            transitionEnd: { overflowY: "auto" }
        },
        exit: {
            // Magia: Lo apaga en el milisegundo 0 del despegue
            overflowY: "hidden",
            transition: { duration: 0 }
        }
    };

    // 🚀 CONTROLADOR IMPERATIVO DEL IMPACTO (Física Squash & Stretch)
    const cartControls = useAnimation()

    useEffect(() => {
        const handleImpact = () => {
            // Saltamos la cola de renderizado. 
            // y: [0, 5, -3, 0] -> Se hunde por el peso, rebota, se asienta.
            // scale: [1, 0.85, 1.15, 1] -> Se aplasta, se estira, recupera su forma.

            if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(10)
            cartControls.start({
                y: [0, 5, -3, 0],
                scale: [1, 0.85, 1.15, 1],
                transition: {
                    duration: 0.4,
                    ease: "easeInOut",
                    times: [0, 0.2, 0.6, 1] // Sincronización milimétrica de los fotogramas
                }
            });
        };
        document.addEventListener('cartImpact', handleImpact);
        return () => document.removeEventListener('cartImpact', handleImpact);
    }, [cartControls]);

    const [whatsappUrl, setWhatsappUrl] = useState('')
    const [generatedOrderNumber, setGeneratedOrderNumber] = useState<number | null>(null)
    const [generatedOrderId, setGeneratedOrderId] = useState<string | null>(null) // 🚀 NUEVO ESTADO
    const [isWhatsAppInterception, setIsWhatsAppInterception] = useState(false) // 🚀 NUEVO: Peaje Psicológico
    const [hasClickedWhatsApp, setHasClickedWhatsApp] = useState(false) // 🚀 NUEVO: Memoria de acción

    // 🚀 EFECTO 1: Escucha del Botón del Header
    useEffect(() => {
        setIsMounted(true)
        const handleToggleCart = () => { setIsOpen(true); };
        document.addEventListener('toggleCartDrawer', handleToggleCart);
        return () => document.removeEventListener('toggleCartDrawer', handleToggleCart);
    }, [])

    // 🚀 EFECTO 2: Enrutador Automático (Si abre el carrito vacío pero hay orden, va al Paso 3)
    useEffect(() => {
        if (isOpen && items.length === 0 && generatedOrderNumber) {
            changeStep(3); // 🚀 Actualizado
        } else if (isOpen && items.length > 0 && step !== 2) {
            changeStep(1); // Si abre el carrito con items, aseguramos que esté en el Paso 1
        }
    }, [isOpen, items.length, generatedOrderNumber]);

    const [hasFiredConfetti, setHasFiredConfetti] = useState(false);

    // 🚀 EFECTO 3: Limpiador Inteligente Anti-Zombies
    useEffect(() => {
        if (items.length > 0 && generatedOrderNumber) {
            setGeneratedOrderNumber(null);
            setGeneratedOrderId(null);
            setHasClickedWhatsApp(false);
            setHasFiredConfetti(false);
            if (step === 3) changeStep(1); // 🚀 Si añade un producto, lo regresamos a la bolsa
        }
    }, [items.length]);

    // 🚀 EFECTO DE DOPAMINA (CONFETI INTELIGENTE BLINDADO)
    useEffect(() => {
        // 🚀 CRÍTICO: Añadimos isOpen para que jamás dispare si el cajón está cerrado
        if (step === 3 && !isWhatsAppInterception && !hasFiredConfetti && isOpen) {

            const triggerConfetti = () => {
                setHasFiredConfetti(true);
                if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate([30, 50, 30, 50, 50]);

                const duration = 2000;
                const end = Date.now() + duration;

                const frame = () => {
                    import('canvas-confetti').then((confetti) => {
                        confetti.default({ particleCount: 4, angle: 60, spread: 55, origin: { x: 0, y: 0.7 }, colors: ['#111111', '#059669', '#25D366'], zIndex: 999999 });
                        confetti.default({ particleCount: 4, angle: 120, spread: 55, origin: { x: 1, y: 0.7 }, colors: ['#111111', '#059669', '#25D366'], zIndex: 999999 });
                    });
                    if (Date.now() < end) requestAnimationFrame(frame);
                };
                frame();
            };

            // 🧠 RETRASO TÁCTICO: Le damos 500ms al Sistema Operativo para saltar a WhatsApp.
            const timeoutId = setTimeout(() => {
                if (document.visibilityState === 'visible') {
                    // Si después de medio segundo sigue aquí (le dio a Omitir), disparamos.
                    triggerConfetti();
                } else {
                    // Si se fue a WhatsApp, dejamos la trampa armada para cuando regrese.
                    const handleVisibility = () => {
                        if (document.visibilityState === 'visible') {
                            triggerConfetti();
                            document.removeEventListener('visibilitychange', handleVisibility);
                        }
                    };
                    document.addEventListener('visibilitychange', handleVisibility);
                }
            }, 500);

            // Limpiamos el timeout si el usuario cierra el modal rápido
            return () => clearTimeout(timeoutId);
        }
    }, [step, isWhatsAppInterception, hasFiredConfetti, isOpen]);

    const handleOpenModal = () => { changeStep(1); setIsOpen(true); } // 🚀 Actualizado

    // 🚀 CIERRE SEGURO: Evitamos el Estado Zombie
    const handleCloseModal = () => {
        setIsOpen(false);
        setTimeout(() => {
            setIsWhatsAppInterception(false);
            if (step === 3) changeStep(1); // 🚀 Forzamos volver a la bolsa al cerrar
        }, 300);
    }

    const isEurMode = currency === 'eur'
    const activeRate = isEurMode ? rates.eur : rates.usd
    const currencySymbol = '$'

    const wholesale = storeConfig?.wholesale_config || { active: false, min_items: 6, discount_percentage: 15 }

    // --- 🚀 MOTOR DE RECOMENDACIONES (CROSS-SELLING) ---
    const recommendedProducts = useMemo(() => {
        if (items.length === 0 || !products || products.length === 0) return []
        const cartCategories = Array.from(new Set(items.map(item => item.category?.toLowerCase() || '')))
        const cartProductIds = new Set(items.map(item => item.productId))
        const recommendations = products.filter(p => {
            if (cartProductIds.has(p.id)) return false
            if ((p.stock || 0) <= 0 && (!p.product_variants || p.product_variants.every((v: any) => (v.stock || 0) <= 0))) return false
            return cartCategories.includes(p.category?.toLowerCase() || '')
        })
        return recommendations.slice(0, 10)
    }, [items, products])


    // --- 🚀 MÁQUINA DE SCROLL Y ESTADO REACTIVO PARA SUGERENCIAS ---
    const recommendScrollRef = useRef<HTMLDivElement>(null)
    const [scrollStatus, setScrollStatus] = useState({ left: false, right: false })

    const checkScrollStatus = () => {
        if (!recommendScrollRef.current) return;
        const { scrollLeft, scrollWidth, clientWidth } = recommendScrollRef.current;

        // Tolerancia de subpíxel para pantallas de alta densidad (Retina)
        const canScrollLeft = scrollLeft > 2;
        const canScrollRight = scrollLeft + clientWidth < scrollWidth - 2;

        setScrollStatus({ left: canScrollLeft, right: canScrollRight });
    };

    const scrollRecommend = (dir: 'left' | 'right') => {
        if (recommendScrollRef.current) {
            const container = recommendScrollRef.current;
            // Desplaza exactamente el ancho visible para una navegación fluida
            const scrollAmount = container.clientWidth * 0.75;
            container.scrollBy({
                left: dir === 'left' ? -scrollAmount : scrollAmount,
                behavior: 'smooth'
            });
        }
    };

    useEffect(() => {
        // Delay micro-optimizado para esperar que el DOM pinte los productos antes de calcular el scroll
        const timer = setTimeout(() => {
            checkScrollStatus();
        }, 200);

        window.addEventListener('resize', checkScrollStatus);
        return () => {
            clearTimeout(timer);
            window.removeEventListener('resize', checkScrollStatus);
        };
    }, [recommendedProducts]);

    const recommendedMaskStyle = useMemo(() => {
        const fadeWidth = '32px';
        const leftMask = scrollStatus.left ? `transparent 0%, #000 ${fadeWidth}` : `#000 0%`;
        const rightMask = scrollStatus.right ? `#000 calc(100% - ${fadeWidth}), transparent 100%` : `#000 100%`;
        return { WebkitMaskImage: `linear-gradient(to right, ${leftMask}, ${rightMask})`, maskImage: `linear-gradient(to right, ${leftMask}, ${rightMask})` };
    }, [scrollStatus]);


    // --- 🚀 MOTOR MATEMÁTICO PRINCIPAL ---
    const totalItemsCount = useMemo(() => items.reduce((acc, item) => acc + item.quantity, 0), [items])

    const fiscalProfile = storeConfig?.fiscal_profile || 'informal';
    const isStrictTax = fiscalProfile === 'ordinary' || fiscalProfile === 'special';

    // Tu código refactorizado actual:
    const cartEngine = useMemo(() => {
        // Añadimos 'wholesale' al final
        return calculateCartEngine(items, promotions, isStrictTax, wholesale);
    }, [items, promotions, isStrictTax, wholesale]); // No olvides poner wholesale en las dependencias

    const { wholesaleDiscountList, wholesaleDiscountCash } = cartEngine;

    // 👇 AÑADE ESTA LÍNEA AQUÍ 👇
    // Restauramos el booleano estrictamente para que la UI sepa cuándo pintar la barra verde
    // 1. Calculamos el volumen REAL elegible para la barra global (Aislamiento Estricto)
    const globalEligibleCount = items.reduce((acc, item) => {
        return !item.productWholesaleActive ? acc + item.quantity : acc;
    }, 0);

    // 2. El booleano ahora lee el conteo aislado, no el conteo sucio total
    const isWholesaleActive = wholesale.active && globalEligibleCount >= wholesale.min_items;


    // 🚀 FIX: Definición de Affiliate devuelta a la vida
    const affiliate = storeConfig?.affiliate_config || { active: false, buyer_discount_pct: 0 };
    const isAffiliateActive = affiliate.active && affiliateCode;
    const affiliateDiscountList = isAffiliateActive ? (cartEngine.finalBsModeUSD * (affiliate.buyer_discount_pct / 100)) : 0;
    const affiliateDiscountCash = isAffiliateActive ? (cartEngine.finalCashModeUSD * (affiliate.buyer_discount_pct / 100)) : 0;

    // --- 🚀 LÓGICA DE IMPUESTOS PÚBLICOS (SENIAT) ---

    const taxPct = storeConfig?.default_tax_percentage || 16;

    // CÁLCULO DE IVA PROPORCIONAL
    // Determinamos cuánto descuento total se aplicó para bajar la base imponible
    const totalDiscountsList = wholesaleDiscountList + affiliateDiscountList;
    const discountMultiplier = cartEngine.totalListNominal > 0
        ? (1 - (totalDiscountsList / cartEngine.totalListNominal))
        : 1;

    // El IVA se calcula solo sobre los productos gravables, ajustados por los descuentos
    // Cambia 'mustApplyTax' por 'isStrictTax'
    const step1TaxAmountUSD = isStrictTax
        ? (cartEngine.taxableSubtotalList * discountMultiplier) * (taxPct / 100)
        : 0;

    // --- TOTALES FINALES DEL PASO 1 ---
    const step1GrandTotalUSD = Math.max(0, (cartEngine.finalBsModeUSD - totalDiscountsList) + step1TaxAmountUSD);
    const step1GrandTotalBs = step1GrandTotalUSD * activeRate;
    const step1CashUSD = Math.max(0, (cartEngine.finalCashModeUSD - wholesaleDiscountCash - affiliateDiscountCash) + step1TaxAmountUSD);
    const step1FxSavings = Math.max(0, step1GrandTotalUSD - step1CashUSD);

    const stepVariants = { hidden: { opacity: 0, x: 20 }, enter: { opacity: 1, x: 0 }, exit: { opacity: 0, x: -20 } }
    const modalVariants: Variants = {
        hidden: { opacity: 0, y: typeof window !== 'undefined' && window.innerWidth < 768 ? "100%" : 0, x: typeof window !== 'undefined' && window.innerWidth >= 768 ? "100%" : 0 },
        visible: { opacity: 1, y: 0, x: 0, transition: { type: "spring", damping: 25, stiffness: 200 } },
        exit: { opacity: 0, y: typeof window !== 'undefined' && window.innerWidth < 768 ? "100%" : 0, x: typeof window !== 'undefined' && window.innerWidth >= 768 ? "100%" : 0, transition: { damping: 25, stiffness: 200 } }
    }


    return (
        <>
         

{/* 🚀 GATILLO MOBILE DINÁMICO (Optimizado para Interfaces de Alta Gama) */}
<AnimatePresence mode="wait">
    {!isOpen && (items.length > 0 || (generatedOrderNumber && !hasClickedWhatsApp)) && (
        <motion.div
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 26, stiffness: 220 }}
            // 🌟 layout permite que el contenedor se adapte fluidamente si cambia de tamaño entre estados
            layout
            className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-[var(--store-surface)]/85 backdrop-blur-2xl border-t border-[var(--store-border)]/30 flex items-center justify-between px-5 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]"
        >
            {items.length > 0 ? (
                // ==========================================
                // ESTADO A: CARRITO ACTIVO
                // ==========================================
                <>
                    {/* 🌟 GRUPO INTERACTIVO: Ahora cuenta con feedback háptico visual (whileTap) */}
                    <motion.div 
                        whileTap={{ scale: 0.97 }}
                        transition={{ type: "spring", stiffness: 400, damping: 15 }}
                        className="flex items-center gap-3.5 cursor-pointer group select-none" 
                        onClick={() => setIsOpen(true)}
                    >
                        <div className="relative" data-cart-target="true">
                            {/* ÍCONO: Mantiene la física de impacto del sistema */}
                            <motion.div
                                animate={cartControls}
                                className="bg-[var(--store-primary)] p-2.5 rounded-full shadow-md transition-colors group-hover:bg-[var(--store-border)] origin-bottom"
                            >
                                <ShoppingCart size={22} className="text-[var(--store-primary-text)]" strokeWidth={1.5} />
                            </motion.div>

                            {/* BADGE: Efecto Pop Explosivo */}
                            <motion.span
                                key={totalItemsCount}
                                initial={{ scale: 0, y: 8, opacity: 0 }}
                                animate={{ scale: 1, y: 0, opacity: 1 }}
                                transition={{
                                    type: "spring",
                                    stiffness: 600,
                                    damping: 14,
                                    mass: 0.8
                                }}
                                className="absolute -top-1.5 -right-1.5 bg-[var(--store-primary)] text-[var(--store-primary-text)] text-[10px] font-black min-w-[20px] h-[20px] px-1 flex items-center justify-center rounded-full border-2 border-[var(--store-surface)] shadow-sm"
                            >
                                {totalItemsCount}
                            </motion.span>
                        </div>

                        {/* BLOQUE DE PRECIO: Tipografía y lectura ultra-limpia */}
                        <div className="flex flex-col items-start structural-subcontainer">
                            <span className="text-xl font-black text-[var(--store-text-main)] tracking-tighter leading-none">
                                {currencySymbol}{step1GrandTotalUSD.toFixed(2)}
                            </span>
                            <span className="text-[11px] font-mono font-bold text-[var(--store-surface-text)] mt-1 leading-none">
                                Bs {step1GrandTotalBs.toLocaleString('es-VE', { maximumFractionDigits: 2 })}
                            </span>
                        </div>
                    </motion.div>

                    {/* BOTÓN PRINCIPAL DE ACCIÓN */}
                    <button 
                        onClick={() => setIsOpen(true)} 
                        className="bg-[var(--store-primary)] text-[var(--store-primary-text)] px-7 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest active:scale-95 transition-all shadow-lg shadow-[var(--store-primary)]/20 cursor-pointer"
                    >
                        Pagar
                    </button>
                </>
            ) : (
                // ==========================================
                // ESTADO B: PEDIDO PENDIENTE POR WHATSAPP
                // ==========================================
                <motion.div 
                    whileTap={{ scale: 0.99 }}
                    className="flex items-center gap-3 w-full cursor-pointer group select-none" 
                    onClick={() => setIsOpen(true)}
                >
                    {/* 🌟 GLOW DE RESPIRACIÓN PREMIUM: Reemplaza al pulse genérico */}
                    <motion.div 
                        animate={{ 
                            scale: [1, 1.04, 1],
                            boxShadow: [
                                "0 0 10px var(--store-primary)/20", 
                                "0 0 20px var(--store-primary)/50", 
                                "0 0 10px var(--store-primary)/20"
                            ]
                        }}
                        transition={{ 
                            repeat: Infinity, 
                            duration: 2.2, 
                            ease: "easeInOut" 
                        }}
                        className="p-2.5 rounded-full bg-[var(--store-primary)] text-[var(--store-primary-text)]"
                    >
                        <MessageCircle size={22} strokeWidth={1.75} />
                    </motion.div>

                    {/* INFORMACIÓN DEL PEDIDO */}
                    <div className="flex flex-col flex-1 min-w-0">
                        <span className="text-sm font-black text-[var(--store-text-main)] tracking-tight truncate">
                            Pedido #{generatedOrderNumber}
                        </span>
                        <span className="text-[10px] font-bold truncate mt-0.5 text-[var(--store-primary)] uppercase tracking-wider">
                            Pendiente por WhatsApp
                        </span>
                    </div>

                    {/* 🌟 ACCESIBILIDAD CORREGIDA: Cambiado de <button> a un <span> semántico */}
                    <span className="bg-[var(--store-surface)] text-[var(--store-text-main)] border border-[var(--store-border)] px-5 py-2.5 rounded-xl font-bold text-xs shadow-sm transition-colors group-hover:bg-[var(--store-border)]/50 pointer-events-none select-none">
                        Abrir
                    </span>
                </motion.div>
            )}
        </motion.div>
    )}
</AnimatePresence>

            {/*  NUEVO: DESKTOP FLOATING NUDGE (Notificación Minimalista) */}
            <AnimatePresence>
                {!isOpen && items.length === 0 && generatedOrderNumber && !hasClickedWhatsApp && (
                    <motion.div
                        initial={{ opacity: 0, y: 50, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 50, scale: 0.9 }}
                        className="hidden md:flex fixed bottom-8 right-8 z-50 bg-[var(--store-surface)] p-4 rounded-2xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] border border-[var(--store-border)] items-center gap-4 max-w-sm cursor-pointer group hover:border-[var(--store-primary)]/30 transition-colors"
                        onClick={() => setIsOpen(true)}
                    >
                        <div className="p-3 bg-[var(--store-primary)] rounded-full animate-pulse shadow-[0_0_15px_var(--store-primary)]">
                            <MessageCircle size={24} className="text-[var(--store-primary-text)]" />
                        </div>
                        <div className="flex flex-col min-w-0">
                            <span className="text-sm font-black text-[var(--store-text-main)] tracking-tight">
                                Pedido #{generatedOrderNumber}
                            </span>
                            <span className="text-[11px] font-bold text-[var(--store-primary)] mt-0.5 flex items-center gap-1">
                                <TriangleAlert className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                Falta enviar WhatsApp
                            </span>
                        </div>
                        <div className="ml-2 bg-[var(--store-bg)] p-2 rounded-xl border border-[var(--store-border)] text-[var(--store-surface-text)] group-hover:text-[var(--store-text-main)] group-hover:border-[var(--store-primary)]/30 transition-colors">
                            <ArrowUpRight size={16} className="text-[var(--store-surface-text)]  group-hover:text-[var(--store-text-main)]" />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
            {/* CAJÓN PRINCIPAL */}
            <AnimatePresence>
                {isOpen && (
                    <div className="fixed inset-0 z-60 flex items-end md:items-stretch justify-end">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={isWhatsAppInterception ? undefined : handleCloseModal} />

                        <motion.div variants={modalVariants} initial="hidden" animate="visible" exit="exit" className="relative bg-[var(--store-bg)] w-full md:w-[450px] md:h-full h-[98vh] rounded-t-[32px] md:rounded-none flex flex-col overflow-hidden">

                            {/* HEADER (Común para Paso 1 y 2) */}
                            {step !== 3 && (
                                <div className="bg-[var(--store-surface)] px-6 pt-6 pb-4 flex justify-between items-center shrink-0 relative z-20 border-b border-[var(--store-border)]/30">
                                    <AnimatePresence mode="wait">
                                        {step === 1 ? (
                                            <motion.div key="header-1" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}>
                                                <h2 className="text-2xl font-black text-[var(--store-text-main)] tracking-tight leading-none">Tu Bolsa</h2>
                                                <p className="text-xs text-[var(--store-surface-text)] font-medium mt-1">Revisa tus items antes de pagar</p>
                                            </motion.div>
                                        ) : (
                                            <motion.div key="header-2" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="flex items-center gap-3">
                                                <button onClick={() => changeStep(1)} className="p-1.5 -ml-1.5 bg-[var(--store-bg)] hover:bg-[var(--store-bg)] rounded-full text-[var(--store-surface-text)] transition-colors"><ArrowLeft size={18} /></button>
                                                <div>
                                                    <h2 className="text-2xl font-black text-[var(--store-text-main)] tracking-tight leading-none">Checkout</h2>
                                                    <p className="text-xs text-[var(--store-surface-text)] font-medium mt-1">Completa tu envío y pago</p>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                    <button onClick={handleCloseModal} className="p-2 bg-[var(--store-bg)] hover:bg-[var(--store-bg)] rounded-full transition-colors text-[var(--store-surface-text)] active:scale-95"><X size={20} /></button>
                                </div>
                            )}

                            {/* PROGRESS BAR MAYORISTA (Solo Paso 1) */}
                            {step === 1 && wholesale.active && (
                                <div className="bg-[var(--store-surface)] px-6 py-3 shrink-0 border-b border-[var(--store-border)]">
                                    <div className="flex justify-between items-end mb-2">
                                        <span className="text-[10px] font-bold text-[var(--store-surface-text)] uppercase tracking-widest flex items-center gap-1"><Percent size={12} /> {isWholesaleActive ? 'Descuento Global Activado' : 'Ahorra al Mayor (Global)'}</span>
                                        <span className="text-xs font-black text-[var(--store-text-main)]">{globalEligibleCount} / {wholesale.min_items}</span>
                                    </div>
                                    <div className="w-full bg-[var(--store-border)] rounded-full h-2 overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${Math.min(100, (globalEligibleCount / wholesale.min_items) * 100)}%` }}
                                            className={`h-full rounded-full transition-colors duration-500 ${isWholesaleActive ? 'bg-emerald-500' : 'bg-[var(--store-primary)]'}`}
                                        />
                                    </div>
                                    <p className={`text-[10px] font-bold mt-2 transition-colors ${isWholesaleActive ? 'text-[var(--store-incentive)]' : 'text-[var(--store-surface-text)]'}`}>
                                        {isWholesaleActive ? `¡Felicidades! Tienes ${wholesale.discount_percentage}% de descuento en el resto de la tienda.` : `Agrega ${wholesale.min_items - globalEligibleCount} piezas en total para ganar ${wholesale.discount_percentage}% de descuento global.`}
                                    </p>
                                </div>
                            )}

                            {/* CONTENEDOR MULTI-PASO (SOLID STACKING) */}
                            <div className="flex-1 relative overflow-hidden bg-transparent">
                                <AnimatePresence initial={false} custom={direction}>

                                    {/* --- PASO 1: LA BOLSA --- */}
                                    {step === 1 && (
                                        <motion.div
                                            key="step-1" custom={direction} variants={walletVariants} initial="initial" animate="animate" exit="exit"
                                            // 🚀 INYECCIÓN 1: overflow-hidden en el padre para cortar sangrados
                                            className="absolute inset-0 flex flex-col h-full bg-[var(--store-surface)] w-full z-10 origin-top will-change-transform shadow-2xl overflow-hidden"
                                        >
                                            {/* 🚀 INYECCIÓN 2: transform-gpu aísla el scroll en su propia capa de video */}
                                            {/* 🚀 DELEGAMOS EL SCROLL A FRAMER MOTION */}
                                            <motion.div
                                                variants={scrollVariants}
                                                className="flex-1 overflow-x-hidden scroll-smooth no-scrollbar pb-[140px]"
                                                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                                            >
                                                <div className="space-y-0 flex-1 overflow-x-hidden">
                                                    {/* 🚀 EL MOTOR DE COLAPSO ORGÁNICO (Cero popLayout) */}
                                                    <AnimatePresence initial={false}>
                                                        {cartEngine.processedItems.map((item) => (
                                                            <motion.div
                                                                key={item.id}
                                                                layout="position" // 🚀 Solo reubica sin recalcular escalas internas
                                                                initial={{ opacity: 0, height: 0, scale: 0.9 }}
                                                                animate={{ opacity: 1, height: 'auto', scale: 1 }}
                                                                // 🚀 Colapsa la altura a 0 y corta el contenido. El resto sube suavemente.
                                                                exit={{
                                                                    opacity: 0,
                                                                    height: 0,
                                                                    scale: 0.9,
                                                                    x: -20,
                                                                    paddingTop: 0,
                                                                    paddingBottom: 0,
                                                                    borderWidth: 0,
                                                                    overflow: 'hidden'
                                                                }}
                                                                transition={{ type: "tween", ease: "easeInOut", duration: 0.3 }}
                                                                className="flex gap-4 p-4 bg-[var(--store-surface)] border-b border-[var(--store-border)]/20 last:border-0 origin-top"
                                                            >
                                                                <div className="w-20 h-20 bg-[var(--store-surface)] rounded-xl overflow-hidden shrink-0 relative border border-[var(--store-border)]">
                                                                    <Image
                                                                        src={getOptimizedUrl(item.image)}
                                                                        alt={item.name}
                                                                        fill
                                                                        sizes="80px"
                                                                        className="object-cover "
                                                                    />
                                                                </div>

                                                                {/* ... (Todo el resto de tu código interno de la tarjeta, botones, precios, se mantiene idéntico de aquí en adelante) ... */}
                                                                <div className="flex-1 flex flex-col justify-between py-0.5">
                                                                    <div>
                                                                        {item.badge && (
                                                                            <span className={`inline-flex items-center gap-1 w-fit text-[9px] font-black px-2 py-0.5 rounded-[4px] tracking-widest uppercase mb-1.5 transition-colors ${item.badge.type === 'pending'
                                                                                ? 'bg-[var(--store-bg)] text-[var(--store-surface-text)] border border-[var(--store-border)] border-dashed shadow-sm'
                                                                                : 'bg-[#1b1b1b] text-white shadow-sm border border-transparent'
                                                                                }`}>
                                                                                {item.badge.text}
                                                                            </span>
                                                                        )}
                                                                        <div className="flex justify-between items-start">
                                                                            <h3 className="font-bold text-sm text-[var(--store-text-main)] line-clamp-2 leading-snug pr-2">{item.name}</h3>
                                                                            <button onClick={() => removeItem(item.id)} className="text-[var(--store-surface-text)] hover:text-red-500 hover:bg-red-50 transition-colors p-1.5 rounded-md active:scale-90"><Trash2 size={14} /></button>
                                                                        </div>
                                                                        <p className="text-[11px] text-[var(--store-surface-text)] font-medium mt-1">{item.variantInfo || 'Estándar'}</p>

                                                                        {item.requiresShipping === false && (
                                                                            <span className="inline-flex items-center gap-1 mt-1.5 text-[9px] font-bold text-[var(--store-primary)] bg-[var(--store-bg)] border border-[var(--store-border)] px-1.5 py-0.5 rounded-md uppercase tracking-wider w-fit max-w-full">
                                                                                <Sparkle size={10} className="shrink-0" />
                                                                                <span className="truncate">
                                                                                    {storeConfig?.shipping_config?.service_badge || "Se consume en tienda"}
                                                                                </span>
                                                                            </span>
                                                                        )}
                                                                    </div>

                                                                    <div className="flex items-end justify-between mt-2">
                                                                        <div className="flex flex-col min-w-0">
                                                                            {item.finalListPrice < item.listPrice ? (
                                                                                <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                                                                                    <span className="text-[10px] font-bold text-[var(--store-surface-text)] line-through decoration-[var(--store-border)]">
                                                                                        {currencySymbol}{(item.listPrice * item.quantity).toFixed(2)}
                                                                                    </span>
                                                                                    <span className="font-black text-base text-red-600 leading-none">
                                                                                        {currencySymbol}{(item.finalListPrice * item.quantity).toFixed(2)}
                                                                                    </span>
                                                                                </div>
                                                                            ) : (
                                                                                <span className="font-black text-base text-[var(--store-text-main)] leading-none">
                                                                                    {currencySymbol}{(item.listPrice * item.quantity).toFixed(2)}
                                                                                </span>
                                                                            )}
                                                                            <span className="text-[10px] font-mono font-bold text-[var(--store-surface-text)] mt-1">
                                                                                Bs {(item.finalListPrice * item.quantity * activeRate).toLocaleString('es-VE', { maximumFractionDigits: 2 })}
                                                                            </span>
                                                                        </div>

                                                                        <div className="flex items-center p-1 gap-3 rounded-full border border-[var(--store-border)]/60 bg-[var(--store-bg)]">
                                                                            <button onClick={() => updateQuantity(item.id, item.quantity - 1)} disabled={item.quantity <= 1} className="w-6 h-6 flex rounded-full items-center justify-center text-[var(--store-text-main)] hover:bg-[var(--store-surface)] hover:border hover:border-[var(--store-border)] disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-90">
                                                                                <Minus size={14} strokeWidth={3} />
                                                                            </button>
                                                                            <span className="text-xs font-bold w-3 text-center text-[var(--store-text-main)]">{item.quantity}</span>
                                                                            <button onClick={() => updateQuantity(item.id, item.quantity + 1)} disabled={item.quantity >= (item.maxStock ?? 9999)} className="w-6 h-6 flex rounded-full items-center justify-center text-[var(--store-text-main)] hover:bg-[var(--store-surface)] hover:border hover:border-[var(--store-border)] disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-90">
                                                                                <Plus size={14} strokeWidth={3} />
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </motion.div>
                                                        ))}
                                                    </AnimatePresence>
                                                </div>
                                                {/* CROSS-SELLING (Geometría Elástica y Aislamiento de Hover por Grupo Nominado) */}
                                                {recommendedProducts.length > 0 && (
                                                    <div className="mt-8 border-t p-5 md:px-6 border-[var(--store-border)]/30 pt-8 pb-4 bg-[var(--store-surface)]">
                                                        <div className="flex items-center justify-between mb-4">
                                                            <h3 className="text-sm font-black text-[var(--store-text-main)] uppercase tracking-widest">Mas para ti</h3>
                                                            <span className="text-[10px] font-bold text-[var(--store-text-main)] uppercase">Sugerencias</span>
                                                        </div>

                                                        {/* 🛡️ SE TRADUCE 'group' A 'group/carousel' PARA AISLAR EL CONTEXTO VISUAL */}
                                                        <div className="w-full relative group/carousel flex items-center overflow-hidden">

                                                            {/* Flecha Izquierda: Responde estrictamente a md:group-hover/carousel:opacity-100 */}
                                                            <div className={`absolute left-2 z-30 hidden md:flex items-center transition-all duration-300 md:opacity-0 md:group-hover/carousel:opacity-100 ${scrollStatus.left ? 'pointer-events-auto scale-100' : 'md:!opacity-0 pointer-events-none scale-95'
                                                                }`}>
                                                                <button
                                                                    onClick={() => scrollRecommend('left')}
                                                                    className="p-2 rounded-full bg-[var(--store-surface)] text-[var(--store-text-main)] shadow-[0_4px_20px_rgba(0,0,0,0.08)] active:scale-95 transition-all duration-150 border border-[var(--store-border)]/10"
                                                                    aria-label="Desplazar izquierda"
                                                                >
                                                                    <ChevronLeft size={14} strokeWidth={2.5} />
                                                                </button>
                                                            </div>

                                                            {/* Tira Horizontal de Scroll */}
                                                            <div
                                                                ref={recommendScrollRef}
                                                                onScroll={checkScrollStatus}
                                                                className="flex flex-row flex-nowrap overflow-x-auto overflow-y-hidden pt-3 gap-3 pb-4 snap-x no-scrollbar items-stretch w-full"
                                                                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', ...recommendedMaskStyle }}
                                                            >
                                                                {recommendedProducts.map((product, index) => {
                                                                    const cashPrice = Number(product.usd_cash_price || 0)
                                                                    const markup = Number(product.usd_penalty || 0)
                                                                    const pricing = { cashPrice, priceInBs: (cashPrice + markup) * activeRate, discountPercent: 0, hasDiscount: markup > 0, listPrice: cashPrice + markup, isPromo: false, compareAt: Number(product.compare_at_usd || 0) }

                                                                    const isCompletelyOutOfStock = product.product_variants && product.product_variants.length > 0
                                                                        ? product.product_variants.reduce((acc: number, variant: any) => acc + (variant.stock || 0), 0) <= 0
                                                                        : (product.stock || 0) <= 0;

                                                                    return (
                                                                        <div key={product.id} className="w-[calc(45%-6px)] md:w-[calc(40%-12px)] shrink-0 snap-start flex flex-col [&>div]:h-full">
                                                                            <ProductCard
                                                                                product={product}
                                                                                pricing={pricing}
                                                                                onOpen={(p) => { setIsOpen(false); document.dispatchEvent(new CustomEvent('openProductModal', { detail: p })); }}
                                                                                isOutOfStock={isCompletelyOutOfStock}
                                                                                index={index}
                                                                            
                                                                            isFavorite={favoriteIds.has(String(product.id))}

                                                                            />
                                                                        </div>
                                                                    )
                                                                })}
                                                            </div>

                                                            {/* Flecha Derecha: Responde estrictamente a md:group-hover/carousel:opacity-100 */}
                                                            <div className={`absolute right-2 z-30 hidden md:flex items-center transition-all duration-300 md:opacity-0 md:group-hover/carousel:opacity-100 ${scrollStatus.right || !scrollStatus.left ? 'pointer-events-auto scale-100' : 'md:!opacity-0 pointer-events-none scale-95'
                                                                }`}>
                                                                <button
                                                                    onClick={() => scrollRecommend('right')}
                                                                    className="p-2 rounded-full bg-[var(--store-surface)] text-[var(--store-text-main)] shadow-[0_4px_20px_rgba(0,0,0,0.08)] active:scale-95 transition-all duration-150 border border-[var(--store-border)]/10"
                                                                    aria-label="Desplazar derecha"
                                                                >
                                                                    <ChevronRight size={14} strokeWidth={2.5} />
                                                                </button>
                                                            </div>

                                                        </div>
                                                    </div>
                                                )}


                                                {/* 🚀 NUDGE DE AHORRO: Actualizado con IVA Proporcional */}
                                                {step1FxSavings > 0 && (
                                                    <div className="px-4 pb-10 bg-[var(--store-bg)] pt-6">
                                                        <div className="bg-[#1b1b1b] p-4 rounded-xl flex items-center gap-3 border">
                                                            <BadgeDollarSign size={30} strokeWidth={1.5} className='text-white' />
                                                            <div className="flex flex-col">
                                                                <span className="text-xs font-bold text-white tracking-wide">Paga en Efectivo o Zelle</span>
                                                                <span className="text-[11px] font-medium text-white mt-0.5">
                                                                    Y tu total bajará a <b className="text-white ml-0.5 text-sm">{currencySymbol}{step1CashUSD.toFixed(2)}</b>
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </motion.div>

                                            {/* 2. FOOTER ABSOLUTO: Lo anclamos al fondo absoluto del motion.div para que el contenedor superior pase literalmente por debajo */}
                                            <div className="absolute bottom-0 left-0 right-0 w-full bg-[var(--store-surface)]/85 backdrop-blur-2xl px-5 py-5 z-20 border-t border-[var(--store-border)]/30 shadow-[0_-4px_20px_rgba(0,0,0,0.02)]">
                                                <div className="flex justify-between items-end mb-4">
                                                    <p className="text-xs font-bold text-[var(--store-surface-text)] uppercase tracking-widest">Total Final</p>
                                                    <div className="flex flex-col items-start">
                                                        <span className="text-xl font-black text-[var(--store-text-main)] tracking-tighter leading-none flex items-center">
                                                            {currencySymbol}<NumberTicker value={step1GrandTotalUSD} />
                                                        </span>
                                                        <span className="text-[11px] font-mono font-bold text-[var(--store-surface-text)] mt-1 leading-none flex items-center gap-1">
                                                            Bs <NumberTicker value={step1GrandTotalBs} />
                                                        </span>
                                                    </div>
                                                </div>
                                                <button onClick={() => changeStep(2)} className="w-full bg-[var(--store-primary)] text-[var(--store-primary-text)] border-[var(--store-primary)] px-8 py-3.5 rounded-full font-bold text-sm hover:opacity-90 transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-[var(--store-primary)]/20 border border-[var(--store-border)]">
                                                    Ir al Checkout <ChevronRight size={16} />
                                                </button>
                                            </div>
                                        </motion.div>
                                    )}

                                    {/* --- PASO 2: CAJA REGISTRADORA (HIJO) --- */}
                                    {step === 2 && (
                                        <motion.div
                                            key="step-2" custom={direction} variants={walletVariants} initial="initial" animate="animate" exit="exit"
                                            // 🚀 El padre solo anima y corta (overflow-hidden)
                                            className="absolute inset-0 flex flex-col h-full bg-[var(--store-surface)] w-full z-20 origin-top will-change-transform shadow-[0_-20px_40px_rgba(0,0,0,0.3)] overflow-hidden"
                                        >
                                            {/* 🚀 DELEGAMOS EL SCROLL A FRAMER MOTION */}
                                            <motion.div
                                                variants={scrollVariants}
                                                className="w-full h-full no-scrollbar"
                                                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                                            >
                                                <CheckoutProcess
                                                    storeId={storeId}
                                                    storeConfig={storeConfig}
                                                    currency={currency}
                                                    rates={rates}
                                                    phone={phone}
                                                    cartEngine={cartEngine}
                                                    wholesaleDiscountList={wholesaleDiscountList}
                                                    wholesaleDiscountCash={wholesaleDiscountCash}
                                                    affiliateCode={affiliateCode}
                                                    affiliateDiscountList={affiliateDiscountList}
                                                    affiliateDiscountCash={affiliateDiscountCash}
                                                    // 2. Intercepta la URL en el onSuccess de CheckoutProcess
onSuccess={(orderNumber: number, waUrl: string, orderId: string) => {
    let finalWaUrl = waUrl;
    if (campaignContext) {
        try {
            const urlObj = new URL(waUrl);
            let text = urlObj.searchParams.get('text') || '';
            const campaignName = campaignContext.charAt(0).toUpperCase() + campaignContext.slice(1).replace(/-/g, ' ');
            text += `\n\n📊 *Origen:* Campaña VIP (${campaignName})`;
            urlObj.searchParams.set('text', text);
            finalWaUrl = urlObj.toString();
        } catch (e) { console.error(e); }
    }

                                                        setGeneratedOrderNumber(orderNumber);
                                                        setWhatsappUrl(finalWaUrl); // 👈 Guardamos la URL mutada
                                                        setGeneratedOrderId(orderId);
                                                        addOrderToHistory({ id: orderId, number: orderNumber });
                                                        setIsWhatsAppInterception(true);
                                                        changeStep(3);
                                                    }}
                                                    onBack={() => changeStep(1)}
                                                />
                                            </motion.div>
                                        </motion.div>
                                    )}
                                    {/* --- PASO 3: ÉXITO --- */}
                                    {step === 3 && (
                                        <motion.div
                                            key="step-3"
                                            custom={direction} variants={walletVariants} initial="initial" animate="animate" exit="exit"
                                            className="absolute inset-0 flex flex-col items-center justify-center p-6 md:p-10 text-center bg-[var(--store-bg)] z-30 origin-top will-change-transform shadow-[0_-20px_40px_rgba(0,0,0,0.3)]"
                                        >

                                            {/* 🚀 MODAL DE INTERCEPCIÓN (PEAJE PSICOLÓGICO) */}
                                            <AnimatePresence>
                                                {isWhatsAppInterception && (
                                                    <motion.div
                                                        initial={{ opacity: 0 }}
                                                        animate={{ opacity: 1 }}
                                                        exit={{ opacity: 0 }}
                                                        className="absolute inset-0 z-[100] flex items-center justify-center p-5 bg-[var(--store-bg)]/60 backdrop-blur-xl"
                                                    >
                                                        <motion.div
                                                            initial={{ scale: 0.95, opacity: 0, y: 15 }}
                                                            animate={{ scale: 1, opacity: 1, y: 0 }}
                                                            exit={{ scale: 0.95, opacity: 0, y: -15 }}
                                                            transition={{ type: "spring", damping: 30, stiffness: 300 }}
                                                            className="bg-[var(--store-surface)] w-full max-w-sm p-8 md:p-10 rounded-[32px] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.07)] border border-[var(--store-border)]/40 flex flex-col items-center text-center"
                                                        >
                                                            <div className="w-20 h-20 bg-amber-500/10 rounded-full flex items-center justify-center mb-6">
                                                                <AlertCircle size={36} className="text-amber-500" strokeWidth={2.5} />
                                                            </div>
                                                            <h3 className="text-2xl font-black text-[var(--store-text-main)] tracking-tight leading-none mb-4">
                                                                ¡Falta un paso!
                                                            </h3>
                                                            <p className="text-sm font-medium text-[var(--store-surface-text)] leading-relaxed mb-8">
                                                                Tu pedido <strong className="text-[var(--store-text-main)] font-black">#{generatedOrderNumber}</strong> está reservado, pero necesitamos que nos envíes el resumen para procesarlo inmediatamente.
                                                            </p>

                                                            <a
                                                                href={whatsappUrl}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                // 🚀 Magia: Al hacer clic, abre WhatsApp y a la vez oculta el modal
                                                                onClick={() => {
                                                                    setIsWhatsAppInterception(false);
                                                                    setHasClickedWhatsApp(true); // 🚀 Registramos que el usuario ya accionó
                                                                }} // 🚀 Registramos que el usuario ya accionó
                                                                className="w-full bg-[#25D366] text-white px-6 py-4 rounded-2xl font-black text-sm hover:bg-[#20bd5a] transition-all flex items-center justify-center gap-2 active:scale-95 shadow-[0_10px_40px_-10px_rgba(37,211,102,0.3)]"
                                                            >
                                                                <MessageCircle size={20} /> Enviar WhatsApp Ahora
                                                            </a>

                                                            <button
                                                                onClick={() => setIsWhatsAppInterception(false)}
                                                                className="mt-6 text-[11px] font-bold text-[var(--store-surface-text)] hover:text-[var(--store-text-main)] transition-colors underline decoration-[var(--store-border)] underline-offset-4"
                                                            >
                                                                Ya lo envié / Omitir
                                                            </button>
                                                        </motion.div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>

                                            {/* 🚀 EL CHECKMARK GLORIOSO ANIMADO */}
                                            <motion.div
                                                initial={{ scale: 0 }}
                                                animate={{ scale: 1 }}
                                                transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.2 }}
                                                className="w-20 h-20 bg-[var(--store-incentive)]/10 rounded-full flex items-center justify-center shrink-0 mb-6 relative overflow-hidden"
                                            >
                                                {/* Efecto de expansión trasera */}
                                                <motion.div initial={{ scale: 0, opacity: 1 }} animate={{ scale: 2, opacity: 0 }} transition={{ duration: 1, delay: 0.4 }} className="absolute inset-0 bg-[var(--store-incentive)] rounded-full" />

                                                {/* SVG que se dibuja a sí mismo */}
                                                <svg className="w-10 h-10 text-[var(--store-incentive)] relative z-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                                    <motion.path
                                                        d="M20 6L9 17l-5-5"
                                                        initial={{ pathLength: 0 }}
                                                        animate={{ pathLength: 1 }}
                                                        transition={{ duration: 0.5, ease: "easeOut", delay: 0.5 }}
                                                    />
                                                </svg>
                                            </motion.div>

                                            <h2 className="text-2xl font-black text-[var(--store-text-main)] mb-2">¡Pedido #{generatedOrderNumber}!</h2>

                                            {/* 🚀 NUDGE EDUCATIVO: Explicamos la protección del Documento Vivo */}
                                            <div className="max-w-sm mx-auto mb-8  p-4">
                                                <p className="text-[var(--store-text-main)] text-sm font-bold mb-1">
                                                    Tu solicitud ha sido registrada.
                                                </p>
                                                <p className="text-[var(--store-surface-text)] text-xs leading-relaxed">
                                                    Estamos verificando tu pago. Una vez nuestro equipo lo confirme, tu comprobante digital se actualizará automáticamente a su estado definitivo.
                                                </p>
                                            </div>

                                            <div className="w-full flex flex-col gap-3 max-w-sm mx-auto">
                                                <a
                                                    href={whatsappUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    onClick={() => setHasClickedWhatsApp(true)} // Por si hacen clic directo desde aquí
                                                    className={`w-full px-6 py-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 active:scale-95 shadow-[0_4px_10px_rgba(0,0,0,0.03)] border border-[var(--store-border)] ${hasClickedWhatsApp
                                                        ? "bg-[var(--store-surface)] text-[var(--store-text-main)] hover:border-[var(--store-text-main)] opacity-80" // 🚀 ESTADO SECUNDARIO: Discreto y pacífico
                                                        : "bg-[var(--store-primary)] text-[var(--store-primary-text)] hover:opacity-90" // 🚀 ESTADO PRIMARIO: Llamativo (si evadió el modal)
                                                        }`}
                                                >
                                                    {hasClickedWhatsApp ? <Check size={18} className="text-emerald-500" strokeWidth={3} /> : <MessageCircle size={18} />}
                                                    {hasClickedWhatsApp ? "Mensaje Enviado (Reenviar)" : "Enviar a WhatsApp"}
                                                </a>

                                                <button onClick={handleCloseModal} className="w-full bg-[var(--store-surface)] text-[var(--store-text-main)] px-6 py-4 rounded-xl font-bold text-sm hover:bg-[var(--store-border)] transition-all active:scale-95 border border-[var(--store-border)]">
                                                    Volver a la Tienda
                                                </button>
                                            </div>

                                            {/* 🚀 VIRAL LOOP DE AFILIADOS (DISEÑO HORIZONTAL ULTRA-COMPACTO) */}
                                            {storeConfig?.affiliate_config?.active && (
                                                <div className="mt-6 mb-2 p-3 sm:p-4  rounded-xl w-full border border-[var(--store-primary)] flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 ">
                                                    <div className="flex-1 text-left w-full">
                                                        <span className="text-[10px] font-black text-[var(--store-text-main)] uppercase tracking-widest block mb-0.5">Conviértete en Embajador.</span>
                                                        <p className="text-xs font-medium text-[var(--store-surface-text)] leading-tight">
                                                            Recomiéndanos y gana un <strong className="font-black">{storeConfig.affiliate_config.global_commission_pct}% en efectivo</strong> por cada venta nueva que generes.
                                                        </p>
                                                    </div>

                                                    <a href="/promotor" target="_blank" className="shrink-0 w-full sm:w-auto bg-[var(--store-primary)] text-[var(--store-primary-text)] px-4 py-2.5 rounded-lg text-xs font-black uppercase tracking-widest hover:bg-[var(--store-primary)]/80 active:scale-95 transition-all text-center flex items-center justify-center gap-1.5 shadow-subtle">
                                                        Generar enlace <ArrowUpRight size={14} strokeWidth={3} />
                                                    </a>
                                                </div>
                                            )}
                                            {/* 🚀 VIRAL LOOP 2: EL NUDGE DE ÉXITO (Tech Editorial) */}
                                            <div className="mt-8 pt-6 border-t border-[var(--store-border)] w-full flex justify-center">
                                                <a
                                                    href="https://preziso.shop?utm_source=tienda_cliente&utm_medium=success_screen&utm_campaign=viral_loop"
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="group inline-flex flex-col items-center gap-1.5"
                                                >
                                                    <span className="text-[10px] font-bold text-[var(--store-surface-text)] uppercase tracking-widest group-hover:text-[var(--store-surface-text)] transition-colors">
                                                        Experiencia de compra impulsada por
                                                    </span>
                                                    <div className="flex items-center gap-1">
                                                        <span className="font-black text-sm tracking-tight text-[var(--store-surface-text)] group-hover:text-[var(--store-text-main)] transition-colors">PREZISO</span>
                                                        <ArrowUpRight size={15} strokeWidth={2} className="text-[#00cd61] animate-pulse" />
                                                    </div>
                                                </a>
                                            </div>
                                        </motion.div>
                                    )}

                                </AnimatePresence>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    )
}
