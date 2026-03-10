'use client'

import { useState, useMemo, useEffect } from 'react'
import {
    ShoppingCart, X, Trash2, ArrowRight, MessageCircle, Loader2, Check,
    CreditCard, Copy, AlertCircle, Store, Truck, ChevronRight, Minus, Plus, MapPin, User, ArrowLeft, Smartphone, DollarSign, Bitcoin, Wallet, Banknote
} from 'lucide-react'
import { useCart } from '@/app/store/useCart'
import { getSupabase } from '@/lib/supabase-client'
import Swal from 'sweetalert2'
import { AnimatePresence, motion, Variants } from 'framer-motion'
import ProductCard from './ProductCard'

interface CheckoutProps {
    rates: { usd: number, eur: number }
    currency: 'usd' | 'eur'
    phone: string
    storeName: string
    storeId: string
    storeConfig: any
    products: any[]
}

export default function FloatingCheckout({ rates, currency, phone, storeName, storeId, storeConfig, products }: CheckoutProps) {
    const { items, removeItem, clearCart, updateQuantity } = useCart()
    const [isMounted, setIsMounted] = useState(false)
    const [isOpen, setIsOpen] = useState(false)
    const [step, setStep] = useState(1)
    const [loading, setLoading] = useState(false)
    const [copied, setCopied] = useState(false)

    useEffect(() => {
        setIsMounted(true)

        // --- LISTENER GLOBAL PARA ABRIR EL CARRITO DESDE DESKTOP ---
        const handleToggleCart = () => setIsOpen(true);
        document.addEventListener('toggleCartDrawer', handleToggleCart);
        return () => document.removeEventListener('toggleCartDrawer', handleToggleCart);
    }, [])

    const isEurMode = currency === 'eur'
    const activeRate = isEurMode ? rates.eur : rates.usd
    const currencySymbol = '$'

    const payments = storeConfig?.payment_config || {}
    const shipping = storeConfig?.shipping_config || {}
    const paymentKeysMap: { [key: string]: string } = { 'Pago Móvil': 'pago_movil', 'Zelle': 'zelle', 'Binance': 'binance', 'Zinli': 'zinli', 'Efectivo': 'cash' }
    const hardCurrencyMethods = ['Zelle', 'Binance', 'Zinli', 'Efectivo']

    const activePaymentMethods = useMemo(() => {
        const active = []
        if (payments.pago_movil?.active) active.push('Pago Móvil')
        if (payments.zelle?.active) active.push('Zelle')
        if (payments.binance?.active) active.push('Binance')
        if (payments.zinli?.active) active.push('Zinli')
        if (payments.cash?.active) active.push('Efectivo')
        return active
    }, [payments])

    const activeCouriers = useMemo(() => {
        const active = []
        if (shipping.mrw?.active) active.push('MRW')
        if (shipping.zoom?.active) active.push('Zoom')
        if (shipping.tealca?.active) active.push('Tealca')
        return active
    }, [shipping])

    const [clientData, setClientData] = useState({
        name: '', paymentMethod: '', deliveryType: 'pickup', courier: '',
        identityCard: '', phone: '', notes: '', state: '', city: '', addressDetail: '', reference: ''
    })

    const recommendedProducts = useMemo(() => {
        if (items.length === 0 || !products || products.length === 0) return []
        const cartCategories = Array.from(new Set(items.map(item => item.category?.toLowerCase() || '')))
        const cartProductIds = new Set(items.map(item => item.productId))
        const recommendations = products.filter(p => {
            if (cartProductIds.has(p.id)) return false
            return cartCategories.includes(p.category?.toLowerCase() || '')
        })
        return recommendations.slice(0, 10)
    }, [items, products])

    const totalBaseNominal = useMemo(() => items.reduce((acc, item) => acc + (item.basePrice * item.quantity), 0), [items])
    const totalPenaltyNominal = useMemo(() => items.reduce((acc, item) => acc + ((item.penalty || 0) * item.quantity), 0), [items])
    const finalTotalBs = (totalBaseNominal + totalPenaltyNominal) * activeRate
    const isHardCurrencyPayment = clientData.paymentMethod && hardCurrencyMethods.includes(clientData.paymentMethod)
    const displayTotalSavings = totalPenaltyNominal

    const getPaymentConfig = (pm: string) => {
        switch (pm) {
            case 'Pago Móvil': return {
                icon: Smartphone,
                btnSelected: 'bg-[#00B4D8] text-white border-[#00B4D8]',
                btnIdle: 'bg-white text-gray-500 border-gray-200 hover:border-[#00B4D8] hover:text-[#00B4D8]',
                cardBg: 'bg-[#00B4D8] text-white border-[#00B4D8]',
                cardBox: 'bg-black/10 border-black/10 text-white',
                btnCopy: 'bg-black/20 hover:bg-black/30 text-white border-none'
            }
            case 'Zelle': return {
                icon: DollarSign,
                btnSelected: 'bg-[#741DF2] text-white border-[#741DF2]',
                btnIdle: 'bg-white text-gray-500 border-gray-200 hover:border-[#741DF2] hover:text-[#741DF2]',
                cardBg: 'bg-[#741DF2] text-white border-[#741DF2]',
                cardBox: 'bg-black/20 border-black/10 text-white',
                btnCopy: 'bg-black/20 hover:bg-black/30 text-white border-none'
            }
            case 'Binance': return {
                icon: Bitcoin,
                btnSelected: 'bg-[#FCD535] text-black border-[#FCD535]',
                btnIdle: 'bg-white text-gray-500 border-gray-200 hover:border-[#FCD535] hover:text-black',
                cardBg: 'bg-[#FCD535] text-black border-[#FCD535]',
                cardBox: 'bg-white/50 border-black/5 text-black',
                btnCopy: 'bg-white/60 hover:bg-white/80 text-black border-black/10'
            }
            case 'Zinli': return {
                icon: Wallet,
                btnSelected: 'bg-[#FF0054] text-white border-[#FF0054]',
                btnIdle: 'bg-white text-gray-500 border-gray-200 hover:border-[#FF0054] hover:text-[#FF0054]',
                cardBg: 'bg-[#FF0054] text-white border-[#FF0054]',
                cardBox: 'bg-black/20 border-black/10 text-white',
                btnCopy: 'bg-black/20 hover:bg-black/30 text-white border-none'
            }
            case 'Efectivo': return {
                icon: Banknote,
                btnSelected: 'bg-emerald-500 text-white border-emerald-500',
                btnIdle: 'bg-white text-gray-500 border-gray-200 hover:border-emerald-500 hover:text-emerald-500',
                cardBg: 'bg-emerald-500 text-white border-emerald-500',
                cardBox: 'bg-black/20 border-black/10 text-white',
                btnCopy: 'bg-black/20 hover:bg-black/30 text-white border-none'
            }
            default: return {
                icon: CreditCard,
                btnSelected: 'bg-black text-white border-black',
                btnIdle: 'bg-white text-gray-500 border-gray-200 hover:border-black hover:text-black',
                cardBg: 'bg-gray-100 text-black border-gray-200',
                cardBox: 'bg-white border-gray-200 text-black',
                btnCopy: 'bg-white hover:bg-gray-50 text-black border-gray-200'
            }
        }
    }

    const getAlert = () => {
        if (!clientData.paymentMethod) return null
        if (isHardCurrencyPayment) {
            if (totalPenaltyNominal > 0) return (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-start gap-3 animate-in fade-in">
                    <div className="bg-emerald-100 text-emerald-600 p-1.5 rounded-full shrink-0"><Check size={14} strokeWidth={3} /></div>
                    <div>
                        <p className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider mb-0.5">Descuento Aplicado</p>
                        <p className="text-xs text-emerald-700 font-medium leading-relaxed">
                            Ahorras <span className="font-black">{currencySymbol}{displayTotalSavings.toFixed(2)}</span> por pagar en divisa.
                        </p>
                    </div>
                </div>
            )
        } else {
            if (totalPenaltyNominal > 0) return (
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 flex items-start gap-3 animate-in fade-in">
                    <div className="bg-orange-100 text-orange-600 p-1.5 rounded-full shrink-0"><AlertCircle size={14} strokeWidth={3} /></div>
                    <div>
                        <p className="text-[10px] font-bold text-orange-800 uppercase tracking-wider mb-0.5">Sugerencia de Ahorro</p>
                        <p className="text-xs text-orange-700 font-medium leading-relaxed">
                            Paga en Efectivo o Zelle y ahorra <span className="font-black">{currencySymbol}{displayTotalSavings.toFixed(2)}</span>.
                        </p>
                    </div>
                </div>
            )
        }
        return null
    }

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    const getSelectedPaymentDetails = () => {
        if (!clientData.paymentMethod) return null
        const key = paymentKeysMap[clientData.paymentMethod]
        // @ts-ignore
        return payments[key]?.details || ''
    }

    const [supabase] = useState(() => getSupabase())

    const handleCheckout = async () => {
        if (!clientData.name || !clientData.phone) return Swal.fire({ title: 'Faltan Datos', text: 'Nombre y teléfono son obligatorios', icon: 'warning', confirmButtonColor: '#000' })
        if (!clientData.paymentMethod) return Swal.fire({ title: 'Método de Pago', text: 'Selecciona cómo deseas pagar', icon: 'warning', confirmButtonColor: '#000' })

        if (clientData.deliveryType === 'courier') {
            if (!clientData.courier) return Swal.fire({ title: 'Envío', text: 'Selecciona una empresa de envío', icon: 'warning', confirmButtonColor: '#000' })
            if (!clientData.state || !clientData.city || !clientData.addressDetail) return Swal.fire({ title: 'Dirección Incompleta', text: 'Por favor, llena los campos de Estado, Ciudad y Dirección', icon: 'warning', confirmButtonColor: '#000' })
            if (!clientData.identityCard) return Swal.fire({ title: 'Identificación', text: 'La cédula es requerida para envíos', icon: 'warning', confirmButtonColor: '#000' })
        }

        setLoading(true)

        try {
            let deliveryInfoFull = 'Retiro Personal'
            if (clientData.deliveryType === 'courier') {
                deliveryInfoFull = `${clientData.courier} - ${clientData.addressDetail}, ${clientData.city}, ${clientData.state}. Ref: ${clientData.reference || 'N/A'} | CI: ${clientData.identityCard} | Tlf: ${clientData.phone}`
            }

            const { data: order, error: orderError } = await supabase
                .from('orders')
                .insert({
                    store_id: storeId,
                    customer_name: clientData.name,
                    customer_phone: clientData.phone,
                    total_usd: isHardCurrencyPayment ? totalBaseNominal : (totalBaseNominal + totalPenaltyNominal),
                    total_bs: finalTotalBs,
                    exchange_rate: activeRate,
                    currency_type: currency,
                    status: 'pending',
                    payment_method: clientData.paymentMethod,
                    shipping_method: clientData.deliveryType === 'pickup' ? 'pickup' : clientData.courier,
                    delivery_info: deliveryInfoFull
                })
                .select()
                .single()

            if (orderError) throw orderError

            const orderItems = items.map(item => ({
                order_id: order.id,
                product_id: item.productId,
                product_name: item.name,
                variant_info: item.variantInfo || 'N/A',
                quantity: item.quantity,
                price_at_purchase: item.basePrice,
                variant_id: (item.variantId && item.variantId.length === 36) ? item.variantId : null
            }))

            await supabase.from('order_items').insert(orderItems)

            let message = `*NUEVO PEDIDO #${order.order_number}* 🛍️\n`
            message += `👤 *Cliente:* ${clientData.name}\n`
            message += `📱 *Teléfono:* ${clientData.phone}\n`
            message += `────────────────\n`
            items.forEach(item => { message += `▪️ ${item.quantity}x ${item.name} ${item.variantInfo ? `(${item.variantInfo})` : ''}\n` })

            if (isHardCurrencyPayment) {
                message += `────────────────\n*💰 TOTAL: ${currencySymbol}${totalBaseNominal.toFixed(2)}*\n`
            } else {
                message += `────────────────\n*💰 TOTAL BS: ${finalTotalBs.toLocaleString('es-VE', { maximumFractionDigits: 2 })}*\n`
                message += `_Ref: ${currencySymbol}${(totalBaseNominal + totalPenaltyNominal).toFixed(2)}_\n`
            }

            message += `\n📦 *ENTREGA:* ${clientData.deliveryType === 'pickup' ? 'Retiro Personal' : clientData.courier}\n`
            if (clientData.deliveryType === 'courier') {
                message += `📍 *Estado:* ${clientData.state}\n`
                message += `📍 *Ciudad:* ${clientData.city}\n`
                message += `📍 *Dirección:* ${clientData.addressDetail}\n`
                if (clientData.reference) message += `📍 *Referencia:* ${clientData.reference}\n`
                message += `🆔 *Cédula:* ${clientData.identityCard}\n`
            }

            message += `\n💳 *PAGO:* ${clientData.paymentMethod}\n`
            if (clientData.notes) message += `📝 *Nota:* ${clientData.notes}\n`

            clearCart()
            setIsOpen(false)
            window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank')

        } catch (error: any) {
            Swal.fire('Error', error.message, 'error')
        } finally {
            setLoading(false)
        }
    }

    const openRecommendedProduct = (product: any) => {
        setIsOpen(false);
        document.dispatchEvent(new CustomEvent('openProductModal', { detail: product }));
    }

    if (!isMounted) return null

    const stepVariants = {
        hidden: { opacity: 0, x: 20 },
        enter: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: -20 }
    }

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
            transition: { type: "spring", damping: 25, stiffness: 200 }
        },
        exit: {
            opacity: 0,
            y: typeof window !== 'undefined' && window.innerWidth < 768 ? "100%" : 0,
            x: typeof window !== 'undefined' && window.innerWidth >= 768 ? "100%" : 0,
            transition: { damping: 25, stiffness: 200 }
        }
    }

    return (
        <>
            {/* --- BARRA FIJA MÓVIL (Oculta en Desktop) --- */}
            <AnimatePresence>
                {!isOpen && items.length > 0 && (
                    <motion.div
                        initial={{ y: 100 }}
                        animate={{ y: 0 }}
                        exit={{ y: 100 }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 md:hidden flex items-center justify-between px-5 py-3 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]"
                    >
                        <div className="flex items-center gap-3" onClick={() => setIsOpen(true)}>
                            <div className="relative bg-gray-50 p-2.5 rounded-full border border-gray-200">
                                <ShoppingCart size={20} className="text-gray-900 animate-wiggle" strokeWidth={2} />
                                <span className="absolute -top-1 -right-1 bg-black text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full">
                                    {items.reduce((acc, i) => acc + i.quantity, 0)}
                                </span>
                            </div>
                            <div className="flex flex-col items-start cursor-pointer">
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-0.5">Ver Carrito</span>
                                <span className="text-base font-black text-gray-900 tracking-tight">{currencySymbol}{totalBaseNominal.toFixed(2)}</span>
                            </div>
                        </div>

                        <button
                            onClick={() => setIsOpen(true)}
                            className="bg-black text-white px-5 py-2.5 rounded-full font-bold text-xs uppercase tracking-wide flex items-center gap-2 active:scale-95 transition-transform"
                        >
                            Pagar <ArrowRight size={14} />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* --- MODAL (Bottom Sheet / Desktop Drawer) --- */}
            <AnimatePresence>
                {isOpen && (
                    <div className="fixed inset-0 z-50 flex items-end md:items-stretch justify-end">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                            onClick={() => setIsOpen(false)}
                        />

                        <motion.div
                            variants={modalVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            className="relative bg-[#F8F9FA] w-full md:w-[450px] md:h-full h-[90vh] rounded-t-[32px] md:rounded-none md:border-l border-t md:border-t-0 border-gray-200 flex flex-col overflow-hidden shadow-2xl"
                        >
                            <div className="bg-white px-6 pt-6 pb-4 flex justify-between items-center shrink-0 relative overflow-hidden">
                                <AnimatePresence mode="wait">
                                    {step === 1 ? (
                                        <motion.div key="header-1" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}>
                                            <h2 className="text-2xl font-black text-gray-900 tracking-tight leading-none">Tu Bolsa</h2>
                                            <p className="text-xs text-gray-500 font-medium mt-1">Revisa tus items antes de pagar</p>
                                        </motion.div>
                                    ) : (
                                        <motion.div key="header-2" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="flex items-center gap-3">
                                            <button onClick={() => setStep(1)} className="p-1.5 -ml-1.5 bg-gray-50 hover:bg-gray-100 rounded-full text-gray-600 transition-colors">
                                                <ArrowLeft size={18} />
                                            </button>
                                            <div>
                                                <h2 className="text-2xl font-black text-gray-900 tracking-tight leading-none">Checkout</h2>
                                                <p className="text-xs text-gray-500 font-medium mt-1">Completa tu envío y pago</p>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                                <button onClick={() => setIsOpen(false)} className="p-2 bg-gray-50 border border-gray-200 hover:bg-gray-100 rounded-full transition-colors text-gray-500 z-10"><X size={20} /></button>
                            </div>

                            <div className="flex-1 overflow-y-auto scroll-smooth pb-10">
                                <AnimatePresence mode="wait">
                                    {step === 1 ? (
                                        <motion.div
                                            key="step-1"
                                            variants={stepVariants}
                                            initial="hidden"
                                            animate="enter"
                                            exit="exit"
                                            transition={{ duration: 0.2 }}
                                            className="p-4 md:p-6"
                                        >
                                            <div className="space-y-4">
                                                {items.map((item) => {
                                                    const itemTotalNominal = item.basePrice * item.quantity
                                                    const itemTotalBs = (item.basePrice + (item.penalty || 0)) * item.quantity * activeRate

                                                    return (
                                                        <div key={item.id} className="flex gap-4  p-3 ">
                                                            <div className="w-20 h-20 bg-gray-50 rounded-[3px] overflow-hidden shrink-0 border border-gray-200/60 relative">
                                                                <img src={item.image} className="w-full h-full object-cover mix-blend-multiply" />
                                                            </div>

                                                            <div className="flex-1 flex flex-col justify-between py-0.5">
                                                                <div>
                                                                    <div className="flex justify-between items-start">
                                                                        <h3 className="font-bold text-sm text-gray-900 line-clamp-2 leading-snug pr-2">{item.name}</h3>
                                                                        <button onClick={() => removeItem(item.id)} className="text-gray-400 hover:text-red-500 -mr-1 transition-colors"><Trash2 size={16} /></button>
                                                                    </div>
                                                                    <p className="text-[11px] text-gray-500 font-medium mt-1">{item.variantInfo || 'Estándar'}</p>
                                                                </div>

                                                                <div className="flex items-end justify-between mt-2">
                                                                    <div className="flex flex-col">
                                                                        <span className="font-black text-base text-gray-900 leading-none">{currencySymbol}{itemTotalNominal.toFixed(2)}</span>
                                                                        <span className="text-[10px] font-mono font-bold text-gray-400 mt-1">Bs {itemTotalBs.toLocaleString('es-VE', { maximumFractionDigits: 2 })}</span>
                                                                    </div>
                                                                    <div className="flex items-center bg-gray-50 rounded-lg p-1 gap-3 border border-gray-200">
                                                                        <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="w-6 h-6 flex items-center justify-center bg-white rounded-md border border-gray-200 text-gray-600 hover:text-black disabled:opacity-50 transition-colors" disabled={item.quantity <= 1}><Minus size={12} /></button>
                                                                        <span className="text-xs font-bold w-3 text-center text-gray-900">{item.quantity}</span>
                                                                        <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="w-6 h-6 flex items-center justify-center bg-black border border-black text-white rounded-md hover:bg-gray-800 transition-colors"><Plus size={12} /></button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>

                                            {recommendedProducts.length > 0 && (
                                                <div className="mt-8 border-t border-gray-200 pt-8 pb-4">
                                                    <div className="flex items-center justify-between mb-4">
                                                        <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">Más como esto</h3>
                                                        <span className="text-[10px] font-bold text-gray-400 uppercase">Recomendado</span>
                                                    </div>

                                                    <div className="flex overflow-x-auto gap-3 pb-4 snap-x no-scrollbar -mx-4 px-4 md:-mx-6 md:px-6">
                                                        {recommendedProducts.map(product => {
                                                            const cashPrice = Number(product.usd_cash_price || 0)
                                                            const markup = Number(product.usd_penalty || 0)
                                                            const listPrice = cashPrice + markup
                                                            const pricing = {
                                                                cashPrice,
                                                                priceInBs: listPrice * activeRate,
                                                                discountPercent: listPrice > 0 ? Math.round((markup / listPrice) * 100) : 0,
                                                                hasDiscount: markup > 0
                                                            }

                                                            return (
                                                                <div key={product.id} className="w-[140px] shrink-0 snap-start">
                                                                    <ProductCard product={product} pricing={pricing} onOpen={openRecommendedProduct} />
                                                                </div>
                                                            )
                                                        })}
                                                    </div>
                                                </div>
                                            )}
                                        </motion.div>
                                    ) : (
                                        <motion.div
                                            key="step-2"
                                            variants={stepVariants}
                                            initial="hidden"
                                            animate="enter"
                                            exit="exit"
                                            transition={{ duration: 0.2 }}
                                            className="p-4 md:p-6 space-y-6"
                                        >
                                            <div className="bg-white p-5 rounded-2xl border border-gray-200 space-y-4">
                                                <div className="flex items-center gap-2 text-xs font-black text-gray-900 uppercase tracking-widest border-b border-gray-100 pb-3">
                                                    <User size={16} className="text-gray-400" /> Datos Personales
                                                </div>
                                                <div className="grid grid-cols-1 gap-3">
                                                    <input value={clientData.name} onChange={e => setClientData({ ...clientData, name: e.target.value })} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-sm font-bold text-gray-900 placeholder:text-gray-400 focus:border-black focus:bg-white transition-all outline-none" placeholder="Nombre completo *" />
                                                    <input value={clientData.phone} onChange={e => setClientData({ ...clientData, phone: e.target.value })} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-sm font-bold text-gray-900 placeholder:text-gray-400 focus:border-black focus:bg-white transition-all outline-none" placeholder="Teléfono / WhatsApp *" />
                                                </div>
                                            </div>

                                            <div className="bg-white p-5 rounded-2xl border border-gray-200 space-y-4">
                                                <div className="flex items-center gap-2 text-xs font-black text-gray-900 uppercase tracking-widest border-b border-gray-100 pb-3">
                                                    <MapPin size={16} className="text-gray-400" /> Entrega
                                                </div>

                                                <div className="flex bg-gray-50 p-1 rounded-xl border border-gray-200">
                                                    <button onClick={() => setClientData({ ...clientData, deliveryType: 'pickup' })} className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 border ${clientData.deliveryType === 'pickup' ? 'bg-white text-black border-gray-200' : 'text-gray-500 border-transparent'}`}><Store size={14} /> Retiro</button>
                                                    <button onClick={() => setClientData({ ...clientData, deliveryType: 'courier' })} className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 border ${clientData.deliveryType === 'courier' ? 'bg-white text-black border-gray-200' : 'text-gray-500 border-transparent'}`}><Truck size={14} /> Envío</button>
                                                </div>

                                                {clientData.deliveryType === 'courier' && (
                                                    <div className="space-y-4 animate-in fade-in slide-in-from-top-2 pt-2">
                                                        <div>
                                                            <label className="text-[10px] font-bold text-gray-400 uppercase mb-2 block tracking-wider">Empresa de Envío *</label>
                                                            <div className="grid grid-cols-3 gap-2">
                                                                {activeCouriers.map(c => (
                                                                    <button key={c} onClick={() => setClientData({ ...clientData, courier: c })} className={`py-3 rounded-xl text-xs font-bold border transition-all ${clientData.courier === c ? 'bg-black text-white border-black' : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-gray-300'}`}>{c}</button>
                                                                ))}
                                                            </div>
                                                        </div>

                                                        <div className="space-y-3">
                                                            <input value={clientData.identityCard} onChange={e => setClientData({ ...clientData, identityCard: e.target.value })} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-sm font-bold text-gray-900 placeholder:text-gray-400 focus:border-black focus:bg-white outline-none transition-colors" placeholder="Cédula de Identidad *" />
                                                            <div className="grid grid-cols-2 gap-3">
                                                                <input value={clientData.state} onChange={e => setClientData({ ...clientData, state: e.target.value })} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-sm font-bold text-gray-900 placeholder:text-gray-400 focus:border-black focus:bg-white outline-none transition-colors" placeholder="Estado *" />
                                                                <input value={clientData.city} onChange={e => setClientData({ ...clientData, city: e.target.value })} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-sm font-bold text-gray-900 placeholder:text-gray-400 focus:border-black focus:bg-white outline-none transition-colors" placeholder="Ciudad *" />
                                                            </div>
                                                            <input value={clientData.addressDetail} onChange={e => setClientData({ ...clientData, addressDetail: e.target.value })} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-sm font-bold text-gray-900 placeholder:text-gray-400 focus:border-black focus:bg-white outline-none transition-colors" placeholder="Dirección exacta (Calle, Casa) *" />
                                                            <input value={clientData.reference} onChange={e => setClientData({ ...clientData, reference: e.target.value })} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-sm font-bold text-gray-900 placeholder:text-gray-400 focus:border-black focus:bg-white outline-none transition-colors" placeholder="Punto de referencia (Opcional)" />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="bg-white p-5 rounded-2xl border border-gray-200 space-y-4">
                                                <div className="flex items-center gap-2 text-xs font-black text-gray-900 uppercase tracking-widest border-b border-gray-100 pb-3">
                                                    <CreditCard size={16} className="text-gray-400" /> Pago
                                                </div>

                                                {/* GRID DE BOTONES */}
                                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                                    {activePaymentMethods.length > 0 ? activePaymentMethods.map(pm => {
                                                        const config = getPaymentConfig(pm);
                                                        const Icon = config.icon;
                                                        const isSelected = clientData.paymentMethod === pm;

                                                        return (
                                                            <button
                                                                key={pm}
                                                                onClick={() => setClientData({ ...clientData, paymentMethod: pm })}
                                                                className={`flex items-center justify-center gap-2 px-3 py-3.5 rounded-xl text-xs font-bold border transition-all duration-200 active:scale-95 ${isSelected ? config.btnSelected : config.btnIdle}`}
                                                            >
                                                                <Icon size={16} strokeWidth={2.5} />
                                                                {pm}
                                                            </button>
                                                        )
                                                    }) : <p className="text-xs text-red-500 font-bold p-3 bg-red-50 rounded-xl border border-red-200">No hay métodos activos.</p>}
                                                </div>

                                                {getAlert()}

                                                {/* TARJETA WATERMARK */}
                                                {clientData.paymentMethod && getSelectedPaymentDetails() && (() => {
                                                    const activeConfig = getPaymentConfig(clientData.paymentMethod);
                                                    const ActiveIcon = activeConfig.icon;

                                                    return (
                                                        <div className={`relative mt-2 overflow-hidden rounded-2xl p-5 border animate-in fade-in transition-all ${activeConfig.cardBg}`}>

                                                            {/* ICONO GIGANTE MARCA DE AGUA */}
                                                            <ActiveIcon className="absolute -right-6 -bottom-6 w-36 h-36 opacity-10 -rotate-12 pointer-events-none" />

                                                            {/* CONTENIDO (Por encima de la marca de agua) */}
                                                            <div className="relative z-10">
                                                                <div className="flex justify-between items-start mb-4">
                                                                    <div>
                                                                        <p className="text-[10px] font-black uppercase tracking-widest mb-1 opacity-80">Datos de {clientData.paymentMethod}</p>
                                                                    </div>
                                                                    <button
                                                                        onClick={() => handleCopy(getSelectedPaymentDetails())}
                                                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase transition-colors border ${activeConfig.btnCopy}`}
                                                                    >
                                                                        {copied ? <Check size={12} /> : <Copy size={12} />}
                                                                        {copied ? 'Copiado' : 'Copiar'}
                                                                    </button>
                                                                </div>

                                                                {/* CAJA DE TEXTO (Glassmorphism sutil / translúcido) */}
                                                                <div className={`rounded-xl p-4 border backdrop-blur-sm ${activeConfig.cardBox}`}>
                                                                    <p className="font-mono text-xs font-bold leading-relaxed whitespace-pre-wrap">{getSelectedPaymentDetails()}</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            <div className="bg-white px-5 py-5 border-t border-gray-200 shrink-0 z-20">
                                <div className="flex flex-col gap-4">
                                    <div className="flex justify-between items-end">
                                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Total a Pagar</p>
                                        {isHardCurrencyPayment || step === 1 ? (
                                            <div className="flex flex-col items-end">
                                                <span className="text-2xl md:text-3xl font-black text-gray-900 leading-none">{currencySymbol}{totalBaseNominal.toFixed(2)}</span>
                                                <span className="text-[10px] font-mono font-bold text-gray-400 mt-1">Bs {finalTotalBs.toLocaleString('es-VE', { maximumFractionDigits: 2 })}</span>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-end">
                                                <span className="text-2xl md:text-3xl font-black text-gray-900 leading-none">Bs {finalTotalBs.toLocaleString('es-VE', { maximumFractionDigits: 2 })}</span>
                                                <span className="text-[10px] font-mono font-bold text-gray-400 mt-1">Ref: {currencySymbol}{(totalBaseNominal + totalPenaltyNominal).toFixed(2)}</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex gap-3 w-full">
                                        {step === 1 ? (
                                            <button onClick={() => setStep(2)} className="flex-1 bg-black text-white px-8 py-3.5 rounded-full font-bold text-sm hover:bg-gray-800 transition-all active:scale-95 flex items-center justify-center gap-2 border border-black">
                                                Ir al Checkout <ChevronRight size={16} />
                                            </button>
                                        ) : (
                                            <button onClick={handleCheckout} disabled={loading} className="flex-1 bg-black text-white px-6 py-3.5 rounded-full font-bold text-sm hover:bg-gray-800 transition-all active:scale-95 flex items-center justify-center gap-2 border border-black disabled:opacity-70 disabled:cursor-not-allowed">
                                                {loading ? <Loader2 className="animate-spin" size={18} /> : <><MessageCircle size={18} /> Enviar Pedido</>}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    )
}