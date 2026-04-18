'use client'

import { useState, useMemo, useEffect } from 'react'
import { ShoppingCart, X, Trash2, ArrowUpRight, ArrowLeft, Check, ChevronRight, Minus, Plus, Percent, MessageCircle, BadgeDollarSign, HandCoins, TrendingDown, TicketPercent, FileText } from 'lucide-react'
import { useCart } from '@/app/store/useCart'
import { AnimatePresence, motion, Variants } from 'framer-motion'
import ProductCard from './ProductCard'
import CheckoutProcess from './CheckoutProcess'
import Image from 'next/image'
import { getOptimizedUrl } from '@/utils/cdn'
import { useSearchParams } from 'next/navigation'

interface CheckoutProps {
    rates: { usd: number, eur: number }
    currency: 'usd' | 'eur'
    phone: string
    storeName: string
    storeId: string
    storeConfig: any
    products: any[]
    promotions?: any[]
    affiliateCode?: string | null // 🚀 NUEVO
}

export default function FloatingCheckout({ rates, currency, phone, storeName, storeId, storeConfig, products, promotions = [], affiliateCode = null }: CheckoutProps) {
    const { items, removeItem, updateQuantity } = useCart()
    const [isMounted, setIsMounted] = useState(false)
    const [isOpen, setIsOpen] = useState(false)
    const [step, setStep] = useState(1)

    const [whatsappUrl, setWhatsappUrl] = useState('')
    const [generatedOrderNumber, setGeneratedOrderNumber] = useState<number | null>(null)
    const [generatedOrderId, setGeneratedOrderId] = useState<string | null>(null) // 🚀 NUEVO ESTADO

    useEffect(() => {
        setIsMounted(true)
        const handleToggleCart = () => { setStep(1); setIsOpen(true); };
        document.addEventListener('toggleCartDrawer', handleToggleCart);
        return () => document.removeEventListener('toggleCartDrawer', handleToggleCart);
    }, [])

    const handleOpenModal = () => { setStep(1); setIsOpen(true); }
    const handleCloseModal = () => {
        setIsOpen(false);
        setTimeout(() => { setStep(1); setGeneratedOrderNumber(null); setGeneratedOrderId(null); }, 300); // 🚀 Limpiamos
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

    // --- 🚀 MOTOR MATEMÁTICO PRINCIPAL ---
    const totalItemsCount = useMemo(() => items.reduce((acc, item) => acc + item.quantity, 0), [items])

    const cartEngine = useMemo(() => {
        let totalListNominal = 0;
        let totalCashNominal = 0;
        let listPromoDiscounts = 0;
        let cashPromoDiscounts = 0;
        let bogoPool: Record<string, { listPrices: number[], cashPrices: number[], buy: number, pay: number }> = {};
        const promoCounts: Record<string, number> = {};

        items.forEach(item => {
            promotions?.forEach(p => {
                if (p.promo_type === 'bogo' && (p.linked_products || []).some((id: any) => String(id) === String(item.productId))) {
                    promoCounts[p.id] = (promoCounts[p.id] || 0) + item.quantity;
                }
            })
        });

        const processedItems = items.map(item => {
            const itemBasePrice = Number(item.basePrice || 0);
            const itemPenalty = Number(item.penalty || 0);
            const listPrice = itemBasePrice + itemPenalty;
            const cashPrice = itemBasePrice;

            totalListNominal += listPrice * item.quantity;
            totalCashNominal += cashPrice * item.quantity;

            let itemListDiscount = 0;
            let itemCashDiscount = 0;
            let badge = null;

            const applicablePromos = promotions?.filter((p: any) => p.is_active && (p.linked_products || []).some((id: any) => String(id) === String(item.productId))) || [];
            let bestPromo = null;

            if (applicablePromos.length > 0) {
                let maxEffective = 0;
                applicablePromos.forEach(p => {
                    let eff = p.promo_type === 'percentage'
                        ? Number(p.discount_percentage)
                        : (p.promo_type === 'bogo' && (promoCounts[p.id] || 0) >= p.bogo_buy ? ((p.bogo_buy - p.bogo_pay) / p.bogo_buy) * 100 : 0);
                    if (eff > maxEffective) { maxEffective = eff; bestPromo = p; }
                });

                if (bestPromo) {
                    if ((bestPromo as any).promo_type === 'percentage') {
                        const pct = (bestPromo as any).discount_percentage / 100;
                        itemListDiscount = (listPrice * item.quantity) * pct;
                        itemCashDiscount = (cashPrice * item.quantity) * pct;
                        listPromoDiscounts += itemListDiscount;
                        cashPromoDiscounts += itemCashDiscount;

                        // Guardamos el JSX, no un string
                        badge = (
                            <span className="flex items-center gap-1">
                                <TicketPercent size={12} strokeWidth={2} className="text-white" />
                                {(bestPromo as any).title} (-{(bestPromo as any).discount_percentage}%)
                            </span>
                        );

                    } else if ((bestPromo as any).promo_type === 'bogo') {
                        badge = (
                            <span className="flex items-center gap-1">
                                <TicketPercent size={12} strokeWidth={2} className="text-white" />
                                {(bestPromo as any).title}
                            </span>
                        );
                        // ... resto de tu lógica de bogoPool
                    }
                }
            }

            return { ...item, listPrice, cashPrice, finalListPrice: listPrice - (itemListDiscount / item.quantity), finalCashPrice: cashPrice - (itemCashDiscount / item.quantity), badge }
        });

        Object.values(bogoPool).forEach(pool => {
            const sortedList = pool.listPrices.sort((a, b) => a - b);
            const sortedCash = pool.cashPrices.sort((a, b) => a - b);
            const freeCount = Math.floor(sortedList.length / pool.buy) * (pool.buy - pool.pay);
            for (let i = 0; i < freeCount; i++) {
                listPromoDiscounts += sortedList[i];
                cashPromoDiscounts += sortedCash[i];
            }
        });

        const finalBsModeUSD = totalListNominal - listPromoDiscounts;
        const finalCashModeUSD = totalCashNominal - cashPromoDiscounts;

        return { processedItems, totalListNominal, totalCashNominal, listPromoDiscounts, finalBsModeUSD, finalCashModeUSD, fxSavingsAmount: finalBsModeUSD - finalCashModeUSD };
    }, [items, promotions]);

    // Variables base para Paso 1 (Antes del Delivery y Liquid Split)
    const isWholesaleActive = wholesale.active && totalItemsCount >= wholesale.min_items;
    const wholesaleDiscountList = isWholesaleActive ? (cartEngine.totalListNominal * (wholesale.discount_percentage / 100)) : 0;
    const wholesaleDiscountCash = isWholesaleActive ? (cartEngine.totalCashNominal * (wholesale.discount_percentage / 100)) : 0;

    // 🚀 NUEVO: MOTOR MATEMÁTICO DE AFILIADOS
    const affiliate = storeConfig?.affiliate_config || { active: false, buyer_discount_pct: 0 };
    const isAffiliateActive = affiliate.active && affiliateCode;
    const affiliateDiscountList = isAffiliateActive ? (cartEngine.finalBsModeUSD * (affiliate.buyer_discount_pct / 100)) : 0;
    const affiliateDiscountCash = isAffiliateActive ? (cartEngine.finalCashModeUSD * (affiliate.buyer_discount_pct / 100)) : 0;

    // Actualizamos los totales restando el descuento del afiliado
    const step1GrandTotalUSD = Math.max(0, cartEngine.finalBsModeUSD - wholesaleDiscountList - affiliateDiscountList);
    const step1GrandTotalBs = step1GrandTotalUSD * activeRate;
    const step1CashUSD = Math.max(0, cartEngine.finalCashModeUSD - wholesaleDiscountCash - affiliateDiscountCash);
    const step1FxSavings = Math.max(0, step1GrandTotalUSD - step1CashUSD);

    if (!isMounted) return null

    const stepVariants = { hidden: { opacity: 0, x: 20 }, enter: { opacity: 1, x: 0 }, exit: { opacity: 0, x: -20 } }
    const modalVariants: Variants = {
        hidden: { opacity: 0, y: typeof window !== 'undefined' && window.innerWidth < 768 ? "100%" : 0, x: typeof window !== 'undefined' && window.innerWidth >= 768 ? "100%" : 0 },
        visible: { opacity: 1, y: 0, x: 0, transition: { type: "spring", damping: 25, stiffness: 200 } },
        exit: { opacity: 0, y: typeof window !== 'undefined' && window.innerWidth < 768 ? "100%" : 0, x: typeof window !== 'undefined' && window.innerWidth >= 768 ? "100%" : 0, transition: { damping: 25, stiffness: 200 } }
    }

    return (
        <>
            {/* 🚀 GATILLO MOBILE (El Dock Nativo de cristal) */}
            <AnimatePresence>
                {!isOpen && items.length > 0 && (
                    <motion.div
                        initial={{ y: "100%" }}
                        animate={{ y: 0 }}
                        exit={{ y: "100%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-[var(--store-surface)]/85 backdrop-blur-2xl border-t border-[var(--store-border)]/50 flex items-center justify-between px-5 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]"
                    >
                        {/* 1. IZQUIERDA: Icono interactivo + Precios */}
                        <div className="flex items-center gap-3.5 cursor-pointer group" onClick={handleOpenModal}>
                            <div className="relative">
                                <div className="bg-[var(--store-primary)]/80  p-2.5 rounded-full transition-colors group-hover:bg-[var(--store-border)]">
                                    <ShoppingCart size={22} className="text-[var(--store-primary-text)]" strokeWidth={1.5} />
                                </div>
                                {/* El círculo de notificación que solicitaste */}
                                <span className="absolute -top-1 -right-1 bg-[var(--store-primary)] text-[var(--store-primary-text)] text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-full border-2 border-[var(--store-surface)] shadow-sm">
                                    {totalItemsCount}
                                </span>
                            </div>

                            <div className="flex flex-col items-start">
                                {/* Total en $ y Bs como solicitaste */}
                                <span className="text-xl font-black text-[var(--store-text-main)] tracking-tighter leading-none">{currencySymbol}{step1GrandTotalUSD.toFixed(2)}</span>
                                <span className="text-[11px] font-mono font-bold text-[var(--store-surface-text)] mt-1 leading-none">Bs {step1GrandTotalBs.toLocaleString('es-VE', { maximumFractionDigits: 2 })}</span>
                            </div>
                        </div>

                        {/* 2. DERECHA: Botón de Pagar Estructural */}
                        <button
                            onClick={handleOpenModal}
                            className="bg-[var(--store-primary)] text-[var(--store-primary-text)] px-7 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest active:scale-95 transition-all shadow-lg shadow-[var(--store-primary)]/20"
                        >
                            Pagar
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* CAJÓN PRINCIPAL */}
            <AnimatePresence>
                {isOpen && (
                    <div className="fixed inset-0 z-60 flex items-end md:items-stretch justify-end">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleCloseModal} />

                        <motion.div variants={modalVariants} initial="hidden" animate="visible" exit="exit" className="relative bg-[var(--store-bg)] w-full md:w-[450px] md:h-full h-[98vh] rounded-t-[32px] md:rounded-none flex flex-col overflow-hidden">

                            {/* HEADER (Común para Paso 1 y 2) */}
                            {step !== 3 && (
                                <div className="bg-[var(--store-surface)] px-6 pt-6 pb-4 flex justify-between items-center shrink-0 relative z-20 border-b border-[var(--store-border)]">
                                    <AnimatePresence mode="wait">
                                        {step === 1 ? (
                                            <motion.div key="header-1" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}>
                                                <h2 className="text-2xl font-black text-[var(--store-text-main)] tracking-tight leading-none">Tu Bolsa</h2>
                                                <p className="text-xs text-[var(--store-surface-text)] font-medium mt-1">Revisa tus items antes de pagar</p>
                                            </motion.div>
                                        ) : (
                                            <motion.div key="header-2" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="flex items-center gap-3">
                                                <button onClick={() => setStep(1)} className="p-1.5 -ml-1.5 bg-[var(--store-bg)] hover:bg-[var(--store-bg)] rounded-full text-[var(--store-surface-text)] transition-colors"><ArrowLeft size={18} /></button>
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
                                        <span className="text-[10px] font-bold text-[var(--store-surface-text)] uppercase tracking-widest flex items-center gap-1"><Percent size={12} /> {isWholesaleActive ? 'Descuento Activado' : 'Ahorra al Mayor'}</span>
                                        <span className="text-xs font-black text-[var(--store-text-main)]">{totalItemsCount} / {wholesale.min_items}</span>
                                    </div>
                                    <div className="w-full bg-[var(--store-border)] rounded-full h-2 overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${Math.min(100, (totalItemsCount / wholesale.min_items) * 100)}%` }}
                                            className={`h-full rounded-full transition-colors duration-500 ${isWholesaleActive ? 'bg-emerald-500' : 'bg-[var(--store-primary)]'}`}
                                        />
                                    </div>
                                    <p className={`text-[10px] font-bold mt-2 transition-colors ${isWholesaleActive ? 'text-[var(--store-incentive)]' : 'text-[var(--store-surface-text)]'}`}>
                                        {isWholesaleActive ? `¡Felicidades! Tienes ${wholesale.discount_percentage}% de descuento.` : `Agrega ${wholesale.min_items - totalItemsCount} piezas más para un ${wholesale.discount_percentage}% de descuento.`}
                                    </p>
                                </div>
                            )}

                            {/* CONTENEDOR MULTI-PASO */}
                            <div className="flex-1 relative overflow-hidden bg-[var(--store-surface)]">
                                <AnimatePresence mode="wait">

                                    {/* --- PASO 1: LA BOLSA --- */}
                                    {step === 1 && (
                                        <motion.div key="step-1" variants={stepVariants} initial="hidden" animate="enter" exit="exit" className="absolute inset-0 flex flex-col h-full bg-[var(--store-surface)] w-full">

                                            {/* 1. EL CONTENEDOR DE SCROLL: Le agregamos pb-[140px] (o el alto aproximado de tu footer) para que los últimos items se puedan ver bien al bajar del todo */}
                                            <div className="flex-1 overflow-x-hidden overflow-y-auto scroll-smooth no-scrollbar pb-[140px]">
                                                <div className="space-y-0 flex-1">
                                                    {cartEngine.processedItems.map((item) => (
                                                        <div key={item.id} className="flex gap-4 p-4 bg-[var(--store-surface)]">
                                                            <div className="w-20 h-20 bg-[var(--store-surface)] rounded-xl overflow-hidden shrink-0 relative border border-[var(--store-border)]">
                                                                <Image
                                                                    src={getOptimizedUrl(item.image)}
                                                                    alt={item.name}
                                                                    fill
                                                                    sizes="80px"
                                                                    className="object-cover "
                                                                />
                                                            </div>
                                                            <div className="flex-1 flex flex-col justify-between py-0.5">
                                                                <div>
                                                                    {item.badge && <span className="inline-block text-[9px] font-black text-white bg-[#1b1b1b] px-2 py-0.5 rounded tracking-widest uppercase mb-1">{item.badge}</span>}
                                                                    <div className="flex justify-between items-start">
                                                                        <h3 className="font-bold text-sm text-[var(--store-text-main)] line-clamp-2 leading-snug pr-2">{item.name}</h3>
                                                                        <button onClick={() => removeItem(item.id)} className="text-[var(--store-surface-text)] hover:text-[var(--store-primary)] transition-colors  p-1.5 rounded-md hover:bg-[var(--store-primary)]/20"><Trash2 size={14} /></button>
                                                                    </div>
                                                                    <p className="text-[11px] text-[var(--store-surface-text)] font-medium mt-1">{item.variantInfo || 'Estándar'}</p>
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

                                                                    <div className="flex items-center p-1 gap-3 rounded-full border border-[var(--store-border)]/60">
                                                                        <button onClick={() => updateQuantity(item.id, item.quantity - 1)} disabled={item.quantity <= 1} className="w-6 h-6 flex rounded-full items-center justify-center text-[var(--store-text-main)] hover:bg-[var(--store-surface)] hover:border hover:border-[var(--store-border)] disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                                                                            <Minus size={14} strokeWidth={3} />
                                                                        </button>
                                                                        <span className="text-xs font-bold w-3 text-center text-[var(--store-text-main)]">{item.quantity}</span>
                                                                        <button onClick={() => updateQuantity(item.id, item.quantity + 1)} disabled={item.quantity >= (item.maxStock ?? 9999)} className="w-6 h-6 flex rounded-full items-center justify-center text-[var(--store-text-main)] hover:bg-[var(--store-surface)] hover:border hover:border-[var(--store-border)] disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                                                                            <Plus size={14} strokeWidth={3} />
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>

                                                {/* CROSS-SELLING */}
                                                {recommendedProducts.length > 0 && (
                                                    <div className="mt-8 border-t p-5 md:px-9 md:py-7 border-[var(--store-border)] pt-8 pb-4 bg-[var(--store-surface)]">
                                                        <div className="flex items-center justify-between mb-4">
                                                            <h3 className="text-sm font-black text-[var(--store-text-main)] uppercase tracking-widest">Mas para ti</h3>
                                                            <span className="text-[10px] font-bold text-[var(--store-text-main)] uppercase">Sugerencias</span>
                                                        </div>
                                                        {/* 🚀 ASESINO DE SCROLL VERTICAL: Agregamos flex-row, flex-nowrap, overflow-y-hidden y pt-3 */}
                                                        <div className="flex flex-row flex-nowrap overflow-x-auto overflow-y-hidden pt-3 ml-2 gap-4 pb-4 snap-x no-scrollbar -mx-4 px-4 md:-mx-6 md:px-6 items-stretch">
                                                            {recommendedProducts.map((product, index) => {
                                                                const cashPrice = Number(product.usd_cash_price || 0)
                                                                const markup = Number(product.usd_penalty || 0)
                                                                const pricing = { cashPrice, priceInBs: (cashPrice + markup) * activeRate, discountPercent: 0, hasDiscount: markup > 0, listPrice: cashPrice + markup, isPromo: false, compareAt: Number(product.compare_at_usd || 0) }

                                                                const isCompletelyOutOfStock = product.product_variants && product.product_variants.length > 0
                                                                    ? product.product_variants.reduce((acc: number, variant: any) => acc + (variant.stock || 0), 0) <= 0
                                                                    : (product.stock || 0) <= 0;

                                                                return (
                                                                    <div key={product.id} className="w-[150px] md:w-[160px] shrink-0 snap-start flex flex-col [&>div]:h-full">
                                                                        <ProductCard
                                                                            product={product}
                                                                            pricing={pricing}
                                                                            onOpen={(p) => { setIsOpen(false); document.dispatchEvent(new CustomEvent('openProductModal', { detail: p })); }}
                                                                            isOutOfStock={isCompletelyOutOfStock}
                                                                            index={index}
                                                                        />
                                                                    </div>
                                                                )
                                                            })}
                                                        </div>
                                                    </div>
                                                )}
                                                {/* 🚀 NUDGE DE AHORRO PREVIO */}
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
                                            </div>

                                            {/* 2. FOOTER ABSOLUTO: Lo anclamos al fondo absoluto del motion.div para que el contenedor superior pase literalmente por debajo */}
                                            <div className="absolute bottom-0 left-0 right-0 w-full bg-[var(--store-surface)]/85 backdrop-blur-2xl px-5 py-5 z-20 border-t border-[var(--store-border)] shadow-[0_-4px_20px_rgba(0,0,0,0.02)]">
                                                <div className="flex justify-between items-end mb-4">
                                                    <p className="text-xs font-bold text-[var(--store-surface-text)] uppercase tracking-widest">Total Final</p>
                                                    <div className="flex flex-col items-end">
                                                        <span className="text-2xl md:text-3xl font-black text-[var(--store-text-main)] leading-none">{currencySymbol}{step1GrandTotalUSD.toFixed(2)}</span>
                                                        <span className="text-[10px] font-mono font-bold text-[var(--store-surface-text)] mt-1">Bs {step1GrandTotalBs.toLocaleString('es-VE', { maximumFractionDigits: 2 })}</span>
                                                    </div>
                                                </div>
                                                <button onClick={() => setStep(2)} className="w-full bg-[var(--store-primary)] text-[var(--store-primary-text)] border-[var(--store-primary)] px-8 py-3.5 rounded-full font-bold text-sm hover:opacity-90 transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-[var(--store-primary)]/20 border border-[var(--store-border)]">
                                                    Ir al Checkout <ChevronRight size={16} />
                                                </button>
                                            </div>
                                        </motion.div>
                                    )}

                                    {/* --- PASO 2: CAJA REGISTRADORA (HIJO) --- */}
                                    {step === 2 && (
                                        <CheckoutProcess
                                            storeId={storeId}
                                            storeConfig={storeConfig}
                                            currency={currency}
                                            rates={rates}
                                            phone={phone}
                                            cartEngine={cartEngine}
                                            wholesaleDiscountList={wholesaleDiscountList}
                                            wholesaleDiscountCash={wholesaleDiscountCash}
                                            // 🚀 INYECCIONES AQUÍ:
                                            affiliateCode={affiliateCode}
                                            affiliateDiscountList={affiliateDiscountList}
                                            affiliateDiscountCash={affiliateDiscountCash}
                                            onSuccess={(orderNumber, waUrl, orderId) => { // 🚀 RECIBIMOS orderId
                                                setGeneratedOrderNumber(orderNumber);
                                                setWhatsappUrl(waUrl);
                                                setGeneratedOrderId(orderId); // 🚀 LO GUARDAMOS
                                                setStep(3);
                                            }}
                                            onBack={() => setStep(1)}
                                        />
                                    )}

                                   {/* --- PASO 3: ÉXITO --- */}
                                    {step === 3 && (
                                        <motion.div key="step-3" variants={stepVariants} initial="hidden" animate="enter" exit="exit" className="absolute inset-0 flex flex-col items-center justify-center p-6 md:p-10 text-center bg-[var(--store-bg)]">
                                            
                                            <div className="w-20 h-20 bg-[var(--store-incentive)]/10 rounded-full flex items-center justify-center shrink-0 mb-6">
                                                <Check size={40} className="text-[var(--store-incentive)]" strokeWidth={3} />
                                            </div>
                                            
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
                                                <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="w-full bg-[var(--store-primary)] text-[var(--store-primary-text)] px-6 py-4 rounded-xl font-bold text-sm hover:opacity-90 transition-all flex items-center justify-center gap-2 active:scale-95 shadow-sm border border-[var(--store-border)]">
                                                    <MessageCircle size={18} /> Enviar a WhatsApp
                                                </a>
                                                {/* 🚀 NUEVO BOTÓN: ACCESO DIRECTO AL PDF FISCAL */}
                                                {generatedOrderId && (
                                                    <a href={`/quote/${generatedOrderId}`} target="_blank" rel="noopener noreferrer" className="w-full bg-[var(--store-surface)] text-[var(--store-text-main)] px-6 py-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 active:scale-95 border border-[var(--store-border)] shadow-[0_4px_10px_rgba(0,0,0,0.03)] hover:border-[var(--store-text-main)]">
                                                        <FileText size={18} /> Ver Comprobante (PDF)
                                                    </a>
                                                )}
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
                                                        <ArrowUpRight size={15} strokeWidth={2} className="color-[#00cd61] animate-pulse" />
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