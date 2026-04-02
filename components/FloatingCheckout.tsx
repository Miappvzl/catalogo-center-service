'use client'

import { useState, useMemo, useEffect } from 'react'
import { ShoppingCart, X, Trash2, ArrowUpRight, ArrowLeft, Check, ChevronRight, Minus, Plus, Percent, MessageCircle, BadgeDollarSign, HandCoins, TrendingDown, TicketPercent } from 'lucide-react'
import { useCart } from '@/app/store/useCart'
import { AnimatePresence, motion, Variants } from 'framer-motion'
import ProductCard from './ProductCard'
import CheckoutProcess from './CheckoutProcess'
import Image from 'next/image'
import { getOptimizedUrl } from '@/utils/cdn'

interface CheckoutProps {
    rates: { usd: number, eur: number }
    currency: 'usd' | 'eur'
    phone: string
    storeName: string
    storeId: string
    storeConfig: any
    products: any[]
    promotions?: any[]
}

export default function FloatingCheckout({ rates, currency, phone, storeName, storeId, storeConfig, products, promotions = [] }: CheckoutProps) {
    const { items, removeItem, updateQuantity } = useCart()
    const [isMounted, setIsMounted] = useState(false)
    const [isOpen, setIsOpen] = useState(false)
    const [step, setStep] = useState(1)

    const [whatsappUrl, setWhatsappUrl] = useState('')
    const [generatedOrderNumber, setGeneratedOrderNumber] = useState<number | null>(null)

    useEffect(() => {
        setIsMounted(true)
        const handleToggleCart = () => { setStep(1); setIsOpen(true); };
        document.addEventListener('toggleCartDrawer', handleToggleCart);
        return () => document.removeEventListener('toggleCartDrawer', handleToggleCart);
    }, [])

    const handleOpenModal = () => { setStep(1); setIsOpen(true); }
    const handleCloseModal = () => {
        setIsOpen(false);
        setTimeout(() => { setStep(1); setGeneratedOrderNumber(null); }, 300);
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
                                <TicketPercent size={12} strokeWidth={2} className="text-[#7fff00]" />
                                {(bestPromo as any).title} (-{(bestPromo as any).discount_percentage}%)
                            </span>
                        );

                    } else if ((bestPromo as any).promo_type === 'bogo') {
                        badge = (
                            <span className="flex items-center gap-1">
                                <TicketPercent size={12} strokeWidth={2} className="text-[#7fff00]" />
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

    const step1GrandTotalUSD = Math.max(0, cartEngine.finalBsModeUSD - wholesaleDiscountList);
    const step1GrandTotalBs = step1GrandTotalUSD * activeRate;
    const step1CashUSD = Math.max(0, cartEngine.finalCashModeUSD - wholesaleDiscountCash);
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
            {/* GATILLO MOBILE */}
            <AnimatePresence>
                {!isOpen && items.length > 0 && (
                    <motion.div initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }} transition={{ type: "spring", stiffness: 300, damping: 30 }} className="fixed bottom-0 left-0 right-0 z-50 rounded-[13px] m-[30px] mb-[5px] bg-white shadow-[0px_20px_30px_1px_#00000063] md:hidden flex items-center justify-between px-5 py-3 border-t border-gray-200">
                        <div className="flex items-center gap-3 cursor-pointer group" onClick={handleOpenModal}>
                            <div className="relative bg-gray-50 p-2.5 border border-gray-200 rounded-full group-hover:bg-gray-100 transition-colors">
                                <ShoppingCart size={20} className="text-gray-900 animate-wiggle" strokeWidth={2} />
                                <span className="absolute -top-1 -right-1 bg-black text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full">{totalItemsCount}</span>
                            </div>
                            <div className="flex flex-col items-start cursor-pointer">
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-0.5">Ver Carrito</span>
                                <span className="text-base font-black text-gray-900 tracking-tight">{currencySymbol}{step1GrandTotalUSD.toFixed(2)}</span>
                            </div>
                        </div>
                        <button onClick={handleOpenModal} className="bg-black text-white px-5 py-2.5 pr-3 rounded-full font-bold text-xs uppercase tracking-wide flex items-center gap-1 active:scale-95 hover:bg-gray-800 transition-all border border-black">
                            Pagar <ArrowUpRight size={18} />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* CAJÓN PRINCIPAL */}
            <AnimatePresence>
                {isOpen && (
                    <div className="fixed inset-0 z-60 flex items-end md:items-stretch justify-end">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleCloseModal} />

                        <motion.div variants={modalVariants} initial="hidden" animate="visible" exit="exit" className="relative bg-[#F8F9FA] w-full md:w-[450px] md:h-full h-[90vh] rounded-t-[32px] md:rounded-none flex flex-col overflow-hidden">

                            {/* HEADER (Común para Paso 1 y 2) */}
                            {step !== 3 && (
                                <div className="bg-white px-6 pt-6 pb-4 flex justify-between items-center shrink-0 relative z-20 border-b border-gray-100">
                                    <AnimatePresence mode="wait">
                                        {step === 1 ? (
                                            <motion.div key="header-1" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}>
                                                <h2 className="text-2xl font-black text-gray-900 tracking-tight leading-none">Tu Bolsa</h2>
                                                <p className="text-xs text-gray-500 font-medium mt-1">Revisa tus items antes de pagar</p>
                                            </motion.div>
                                        ) : (
                                            <motion.div key="header-2" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="flex items-center gap-3">
                                                <button onClick={() => setStep(1)} className="p-1.5 -ml-1.5 bg-gray-50 hover:bg-gray-100 rounded-full text-gray-600 transition-colors"><ArrowLeft size={18} /></button>
                                                <div>
                                                    <h2 className="text-2xl font-black text-gray-900 tracking-tight leading-none">Checkout</h2>
                                                    <p className="text-xs text-gray-500 font-medium mt-1">Completa tu envío y pago</p>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                    <button onClick={handleCloseModal} className="p-2 bg-gray-50 hover:bg-gray-100 rounded-full transition-colors text-gray-500 active:scale-95"><X size={20} /></button>
                                </div>
                            )}

                            {/* PROGRESS BAR MAYORISTA (Solo Paso 1) */}
                            {step === 1 && wholesale.active && (
                                <div className="bg-white px-6 py-3 shrink-0 border-b border-gray-100">
                                    <div className="flex justify-between items-end mb-2">
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1"><Percent size={12} /> {isWholesaleActive ? 'Descuento Activado' : 'Ahorra al Mayor'}</span>
                                        <span className="text-xs font-black text-gray-900">{totalItemsCount} / {wholesale.min_items}</span>
                                    </div>
                                    <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${Math.min(100, (totalItemsCount / wholesale.min_items) * 100)}%` }}
                                            className={`h-full rounded-full transition-colors duration-500 ${isWholesaleActive ? 'bg-emerald-500' : 'bg-black'}`}
                                        />
                                    </div>
                                    <p className={`text-[10px] font-bold mt-2 transition-colors ${isWholesaleActive ? 'text-emerald-600' : 'text-gray-500'}`}>
                                        {isWholesaleActive ? `¡Felicidades! Tienes ${wholesale.discount_percentage}% de descuento.` : `Agrega ${wholesale.min_items - totalItemsCount} piezas más para un ${wholesale.discount_percentage}% de descuento.`}
                                    </p>
                                </div>
                            )}

                            {/* CONTENEDOR MULTI-PASO */}
                            <div className="flex-1 relative overflow-hidden bg-[#F8F9FA]">
                                <AnimatePresence mode="wait">

                                    {/* --- PASO 1: LA BOLSA --- */}
                                    {step === 1 && (
                                        <motion.div key="step-1" variants={stepVariants} initial="hidden" animate="enter" exit="exit" className="absolute inset-0 flex flex-col h-full w-full">
                                            <div className="flex-1 overflow-x-hidden overflow-y-auto scroll-smooth no-scrollbar">
                                                <div className="space-y-0 flex-1">
                                                    {cartEngine.processedItems.map((item) => (
                                                        <div key={item.id} className="flex gap-4 p-4 bg-white border-b border-gray-100/60">
                                                            <div className="w-20 h-20 bg-gray-50 rounded-xl overflow-hidden shrink-0 relative border border-gray-100">
                                                                <Image
                                                                    src={getOptimizedUrl(item.image)}
                                                                    alt={item.name}
                                                                    fill
                                                                    sizes="80px"
                                                                    className="object-cover mix-blend-multiply"
                                                                />
                                                            </div>
                                                            <div className="flex-1 flex flex-col justify-between py-0.5">
                                                                <div>
                                                                    {item.badge && <span className="inline-block text-[9px] font-black text-[#7fff00] bg-[#073824] px-2 py-0.5 rounded tracking-widest uppercase mb-1">{item.badge}</span>}
                                                                    <div className="flex justify-between items-start">
                                                                        <h3 className="font-bold text-sm text-gray-900 line-clamp-2 leading-snug pr-2">{item.name}</h3>
                                                                        <button onClick={() => removeItem(item.id)} className="text-gray-400 hover:text-red-500 transition-colors bg-gray-50 p-1.5 rounded-md hover:bg-red-50"><Trash2 size={14} /></button>
                                                                    </div>
                                                                    <p className="text-[11px] text-gray-500 font-medium mt-1">{item.variantInfo || 'Estándar'}</p>
                                                                </div>

                                                                <div className="flex items-end justify-between mt-2">
                                                                    <div className="flex flex-col min-w-0">
                                                                        {item.finalListPrice < item.listPrice ? (
                                                                            <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                                                                                <span className="text-[10px] font-bold text-gray-400 line-through decoration-gray-300">
                                                                                    {currencySymbol}{(item.listPrice * item.quantity).toFixed(2)}
                                                                                </span>
                                                                                <span className="font-black text-base text-red-600 leading-none">
                                                                                    {currencySymbol}{(item.finalListPrice * item.quantity).toFixed(2)}
                                                                                </span>
                                                                            </div>
                                                                        ) : (
                                                                            <span className="font-black text-base text-gray-900 leading-none">
                                                                                {currencySymbol}{(item.listPrice * item.quantity).toFixed(2)}
                                                                            </span>
                                                                        )}
                                                                        <span className="text-[10px] font-mono font-bold text-gray-400 mt-1">
                                                                            Bs {(item.finalListPrice * item.quantity * activeRate).toLocaleString('es-VE', { maximumFractionDigits: 2 })}
                                                                        </span>
                                                                    </div>

                                                                    <div className="flex items-center p-1 gap-3 rounded-full bg-gray-50 border border-gray-200/60">
                                                                        <button onClick={() => updateQuantity(item.id, item.quantity - 1)} disabled={item.quantity <= 1} className="w-6 h-6 flex rounded-full items-center justify-center text-gray-900 hover:bg-white hover:border hover:border-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                                                                            <Minus size={14} strokeWidth={3} />
                                                                        </button>
                                                                        <span className="text-xs font-bold w-3 text-center text-gray-900">{item.quantity}</span>
                                                                        <button onClick={() => updateQuantity(item.id, item.quantity + 1)} disabled={item.quantity >= (item.maxStock ?? 9999)} className="w-6 h-6 flex rounded-full items-center justify-center text-gray-900 hover:bg-white hover:border hover:border-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
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
                                                    <div className="mt-8 border-t p-5 border-gray-100 pt-8 pb-4 bg-white">
                                                        <div className="flex items-center justify-between mb-4">
                                                            <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">Mas para ti</h3>
                                                            <span className="text-[10px] font-bold text-gray-400 uppercase">Sugerencias</span>
                                                        </div>
                                                        <div className="flex overflow-x-auto ml-2 gap-4 pb-4 snap-x no-scrollbar -mx-4 px-4 md:-mx-6 md:px-6 items-stretch">
                                                            {recommendedProducts.map(product => {
                                                                const cashPrice = Number(product.usd_cash_price || 0)
                                                                const markup = Number(product.usd_penalty || 0)
                                                                const pricing = { cashPrice, priceInBs: (cashPrice + markup) * activeRate, discountPercent: 0, hasDiscount: markup > 0, listPrice: cashPrice + markup, isPromo: false, compareAt: Number(product.compare_at_usd || 0) }
                                                                return (
                                                                    <div key={product.id} className="w-[150px] md:w-[160px] shrink-0 snap-start flex flex-col [&>div]:h-full">
                                                                        <ProductCard product={product} pricing={pricing} onOpen={(p) => { setIsOpen(false); document.dispatchEvent(new CustomEvent('openProductModal', { detail: p })); }} />
                                                                    </div>
                                                                )
                                                            })}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* 🚀 NUDGE DE AHORRO PREVIO */}
                                                {step1FxSavings > 0 && (
                                                    <div className="px-4 pb-10 bg-[#F8F9FA] pt-6">
                                                        <div className="bg-[#073824] p-4 rounded-xl flex items-center gap-3 border">
                                                            <BadgeDollarSign size={30} strokeWidth={1.5} className='text-[#7fff00]' />
                                                            <div className="flex flex-col">
                                                                <span className="text-xs font-bold text-white tracking-wide">Paga en Efectivo o Zelle</span>
                                                                <span className="text-[11px] font-medium text-white mt-0.5">
                                                                    Y tu total bajará a <b className="text-[#7fff00] ml-0.5 text-sm">{currencySymbol}{step1CashUSD.toFixed(2)}</b>
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* FOOTER PASO 1 */}
                                            <div className="bg-white px-5 py-5 shrink-0 z-20 border-t border-gray-100 shadow-[0_-4px_20px_rgba(0,0,0,0.02)]">
                                                <div className="flex justify-between items-end mb-4">
                                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Total Final</p>
                                                    <div className="flex flex-col items-end">
                                                        <span className="text-2xl md:text-3xl font-black text-gray-900 leading-none">{currencySymbol}{step1GrandTotalUSD.toFixed(2)}</span>
                                                        <span className="text-[10px] font-mono font-bold text-gray-400 mt-1">Bs {step1GrandTotalBs.toLocaleString('es-VE', { maximumFractionDigits: 2 })}</span>
                                                    </div>
                                                </div>
                                                <button onClick={() => setStep(2)} className="w-full bg-black text-white px-8 py-3.5 rounded-full font-bold text-sm hover:bg-gray-800 transition-all active:scale-95 flex items-center justify-center gap-2 border border-black">
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
                                            onSuccess={(orderNumber, waUrl) => {
                                                setGeneratedOrderNumber(orderNumber);
                                                setWhatsappUrl(waUrl);
                                                setStep(3);
                                            }}
                                            onBack={() => setStep(1)}
                                        />
                                    )}

                                    {/* --- PASO 3: ÉXITO --- */}
                                    {step === 3 && (
                                        <motion.div key="step-3" variants={stepVariants} initial="hidden" animate="enter" exit="exit" className="absolute inset-0 flex flex-col items-center justify-center p-6 md:p-10 text-center bg-white">
                                            <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center shrink-0 mb-6">
                                                <Check size={40} className="text-emerald-500" strokeWidth={3} />
                                            </div>
                                            <h2 className="text-2xl font-black text-gray-900 mb-2">¡Pedido #{generatedOrderNumber}!</h2>
                                            <p className="text-gray-500 text-sm leading-relaxed max-w-xs mx-auto mb-8">
                                                Tu orden ha sido guardada. Si WhatsApp no se abrió automáticamente, presiona el botón abajo para enviarnos tu comprobante.
                                            </p>
                                            <div className="w-full flex flex-col gap-3">
                                                <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="w-full bg-[#25D366] text-white px-6 py-4 rounded-xl font-bold text-sm hover:bg-[#1ebd5a] transition-all flex items-center justify-center gap-2 active:scale-95 border border-[#1ebd5a]">
                                                    <MessageCircle size={18} /> Enviar a WhatsApp
                                                </a>
                                                <button onClick={handleCloseModal} className="w-full bg-white text-gray-900 px-6 py-4 rounded-xl font-bold text-sm hover:bg-gray-50 transition-all active:scale-95 border border-gray-200">
                                                    Volver a la Tienda
                                                </button>
                                            </div>
                                            {/* 🚀 VIRAL LOOP 2: EL NUDGE DE ÉXITO (Tech Editorial) */}
                                            <div className="mt-8 pt-6 border-t border-gray-100 w-full flex justify-center">
                                                <a
                                                    href="https://preziso.shop?utm_source=tienda_cliente&utm_medium=success_screen&utm_campaign=viral_loop"
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="group inline-flex flex-col items-center gap-1.5"
                                                >
                                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest group-hover:text-gray-600 transition-colors">
                                                        Experiencia de compra impulsada por
                                                    </span>
                                                    <div className="flex items-center gap-1">
                                                        <span className="font-black text-sm tracking-tight text-gray-300 group-hover:text-gray-900 transition-colors">PREZISO</span>
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