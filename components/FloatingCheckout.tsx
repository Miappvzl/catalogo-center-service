'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import {
    ShoppingCart, X, Trash2, ArrowUpRight, MessageCircle, Loader2, Check,
    CreditCard, Copy, AlertCircle, Store, Truck, ChevronRight, Minus, Plus, MapPin, User, ArrowLeft, Smartphone, DollarSign, Bitcoin, Wallet, Banknote, Upload, Image as ImageIcon, Percent
} from 'lucide-react'
import { useCart } from '@/app/store/useCart'
import { compressImage } from '@/utils/imageOptimizer'
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

    // --- NUEVOS ESTADOS LOGÍSTICOS Y FINANCIEROS ---
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [receiptFile, setReceiptFile] = useState<File | null>(null)
    const [selectedDeliveryZone, setSelectedDeliveryZone] = useState<string>('')

    useEffect(() => {
        setIsMounted(true)
        const handleToggleCart = () => setIsOpen(true);
        document.addEventListener('toggleCartDrawer', handleToggleCart);
        return () => document.removeEventListener('toggleCartDrawer', handleToggleCart);
    }, [])

    const isEurMode = currency === 'eur'
    const activeRate = isEurMode ? rates.eur : rates.usd
    const currencySymbol = '$'

    // --- CONFIGURACIONES DEL ADMIN ---
    const payments = storeConfig?.payment_config || {}
    const shipping = storeConfig?.shipping_config || {}
    const wholesale = storeConfig?.wholesale_config || { active: false, min_items: 6, discount_percentage: 15 }
    const receiptConfig = storeConfig?.receipt_config || { strict_mode: false }

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
        if (shipping.methods?.mrw) active.push('MRW')
        if (shipping.methods?.zoom) active.push('Zoom')
        if (shipping.methods?.tealca) active.push('Tealca')
        return active
    }, [shipping])

    const deliveryZones = shipping.delivery_zones || []

    const [clientData, setClientData] = useState({
        name: '', paymentMethod: '', deliveryType: 'pickup', courier: '',
        identityCard: '', phone: '', notes: '', state: '', city: '', addressDetail: '', reference: ''
    })

    // Limpia datos logísticos si cambia el método de entrega
    useEffect(() => {
        if (clientData.deliveryType !== 'local_delivery') {
            setSelectedDeliveryZone('')
        }
    }, [clientData.deliveryType])

    // --- MOTOR MATEMÁTICO BLINDADO ---
    const totalItemsCount = useMemo(() => items.reduce((acc, item) => acc + item.quantity, 0), [items])
    const totalBaseNominal = useMemo(() => items.reduce((acc, item) => acc + (item.basePrice * item.quantity), 0), [items])
    const totalPenaltyNominal = useMemo(() => items.reduce((acc, item) => acc + ((item.penalty || 0) * item.quantity), 0), [items])

    // 1. Cálculo Mayorista
    const isWholesaleActive = wholesale.active && totalItemsCount >= wholesale.min_items
    const wholesaleDiscountAmount = isWholesaleActive ? (totalBaseNominal * (wholesale.discount_percentage / 100)) : 0

    // 2. Cálculo Delivery
    const deliveryCost = useMemo(() => {
        if (clientData.deliveryType === 'local_delivery' && selectedDeliveryZone) {
            const zone = deliveryZones.find((z: any) => z.id === selectedDeliveryZone)
            return zone ? Number(zone.cost) : 0
        }
        return 0
    }, [clientData.deliveryType, selectedDeliveryZone, deliveryZones])

    const isHardCurrencyPayment = clientData.paymentMethod && hardCurrencyMethods.includes(clientData.paymentMethod)

    // 3. Totales Finales
    const finalSubtotalUSD = isHardCurrencyPayment ? totalBaseNominal : (totalBaseNominal + totalPenaltyNominal)
    const totalWithDiscountUSD = finalSubtotalUSD - wholesaleDiscountAmount
    const grandTotalUSD = totalWithDiscountUSD + deliveryCost
    const grandTotalBs = grandTotalUSD * activeRate

    const displayTotalSavings = isHardCurrencyPayment ? totalPenaltyNominal + wholesaleDiscountAmount : wholesaleDiscountAmount

    // --- RECOMENDACIONES ---
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

    // --- FUNCIONES RESTAURADAS ---
    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
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
                            Ahorras <span className="font-black">{currencySymbol}{totalPenaltyNominal.toFixed(2)}</span> por pagar en divisa.
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
                            Paga en Efectivo o Zelle y ahorra <span className="font-black">{currencySymbol}{totalPenaltyNominal.toFixed(2)}</span>.
                        </p>
                    </div>
                </div>
            )
        }
        return null
    }

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

    const getSelectedPaymentDetails = () => {
        if (!clientData.paymentMethod) return null
        const key = paymentKeysMap[clientData.paymentMethod]
        return payments[key]?.details || ''
    }

    const [supabase] = useState(() => getSupabase())

    // --- MOTOR DE CHECKOUT BLINDADO ---
    const handleCheckout = async () => {
        if (!clientData.name || !clientData.phone) return Swal.fire({ title: 'Faltan Datos', text: 'Nombre y teléfono son obligatorios', icon: 'warning', confirmButtonColor: '#000' })
        if (!clientData.paymentMethod) return Swal.fire({ title: 'Método de Pago', text: 'Selecciona cómo deseas pagar', icon: 'warning', confirmButtonColor: '#000' })

        // Validaciones Logísticas
        if (clientData.deliveryType === 'courier') {
            if (!clientData.courier) return Swal.fire({ title: 'Envío', text: 'Selecciona una empresa de envío', icon: 'warning', confirmButtonColor: '#000' })
            if (!clientData.state || !clientData.city || !clientData.addressDetail) return Swal.fire({ title: 'Dirección Incompleta', text: 'Llena los campos de Estado, Ciudad y Dirección', icon: 'warning', confirmButtonColor: '#000' })
            if (!clientData.identityCard) return Swal.fire({ title: 'Identificación', text: 'La cédula es requerida para envíos', icon: 'warning', confirmButtonColor: '#000' })
        }
        if (clientData.deliveryType === 'local_delivery' && !selectedDeliveryZone) {
            return Swal.fire({ title: 'Zona de Delivery', text: 'Selecciona la zona a la que enviaremos tu pedido', icon: 'warning', confirmButtonColor: '#000' })
        }

        // Validación de Comprobante Estricto
        const requiresReceipt = clientData.paymentMethod !== 'Efectivo' && clientData.paymentMethod !== 'Zelle'
        if (receiptConfig.strict_mode && requiresReceipt && !receiptFile) {
            return Swal.fire({ title: 'Comprobante Requerido', text: 'Por favor, adjunta la captura de tu pago antes de continuar.', icon: 'warning', confirmButtonColor: '#000' })
        }

        setLoading(true)

        try {
           // 1. Subir Comprobante (Si existe)
            let receiptPublicUrl = null
            if (receiptFile) {
                // REDUCCIÓN DRÁSTICA DE TAMAÑO: 800px máximo, 70% de calidad.
                const compressedReceipt = await compressImage(receiptFile, 800, 0.7)
                
                const fileExt = receiptFile.name.split('.').pop() || 'jpg'
                const fileName = `order-${Date.now()}.${fileExt}`
                
                // Subimos el archivo ya comprimido
                const { error: uploadError } = await supabase.storage.from('receipts').upload(fileName, compressedReceipt)
                if (uploadError) throw uploadError
                
                const { data: { publicUrl } } = supabase.storage.from('receipts').getPublicUrl(fileName)
                receiptPublicUrl = publicUrl
            }
            // 2. Construir Información de Entrega
            let deliveryInfoFull = 'Retiro Personal'
            if (clientData.deliveryType === 'courier') {
                deliveryInfoFull = `${clientData.courier} (Cobro en Destino) - ${clientData.addressDetail}, ${clientData.city}, ${clientData.state}. Ref: ${clientData.reference || 'N/A'} | CI: ${clientData.identityCard} | Tlf: ${clientData.phone}`
            } else if (clientData.deliveryType === 'local_delivery') {
                const zoneName = deliveryZones.find((z: any) => z.id === selectedDeliveryZone)?.name || 'Zona Desconocida'
                deliveryInfoFull = `Delivery a: ${zoneName} - ${clientData.addressDetail}, ${clientData.city}. Ref: ${clientData.reference || 'N/A'} | Tlf: ${clientData.phone}`
            }

            // 3. Guardar Orden en BD
            const { data: order, error: orderError } = await supabase
                .from('orders')
                .insert({
                    store_id: storeId,
                    customer_name: clientData.name,
                    customer_phone: clientData.phone,
                    total_usd: grandTotalUSD,
                    total_bs: grandTotalBs,
                    exchange_rate: activeRate,
                    currency_type: currency,
                    status: 'pending',
                    payment_method: clientData.paymentMethod,
                    shipping_method: clientData.deliveryType,
                    delivery_info: deliveryInfoFull,
                    receipt_url: receiptPublicUrl,
                    shipping_cost: deliveryCost,
                    discount_amount: wholesaleDiscountAmount
                })
                .select()
                .single()

            if (orderError) throw orderError

            // 4. Guardar Items
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

            // 5. Construir Mensaje de WhatsApp Épico
            let message = `*NUEVO PEDIDO #${order.order_number}* 🛍️\n`
            message += `👤 *Cliente:* ${clientData.name}\n`
            message += `📱 *Teléfono:* ${clientData.phone}\n`
            message += `────────────────\n`
            items.forEach(item => { message += `▪️ ${item.quantity}x ${item.name} ${item.variantInfo ? `(${item.variantInfo})` : ''}\n` })

            message += `────────────────\n`
            if (wholesaleDiscountAmount > 0) message += `🎁 Descuento Mayorista: -${currencySymbol}${wholesaleDiscountAmount.toFixed(2)}\n`
            if (deliveryCost > 0) message += `🛵 Delivery: +${currencySymbol}${deliveryCost.toFixed(2)}\n`

            if (isHardCurrencyPayment) {
                message += `*💰 TOTAL FINAL: ${currencySymbol}${grandTotalUSD.toFixed(2)}*\n`
            } else {
                message += `*💰 TOTAL BS: ${grandTotalBs.toLocaleString('es-VE', { maximumFractionDigits: 2 })}*\n`
                message += `_Ref: ${currencySymbol}${grandTotalUSD.toFixed(2)}_\n`
            }

            message += `\n📦 *ENTREGA:* ${clientData.deliveryType === 'pickup' ? 'Retiro' : clientData.deliveryType === 'courier' ? clientData.courier : 'Delivery Local'}\n`
            if (clientData.deliveryType !== 'pickup') {
                if (clientData.deliveryType === 'local_delivery') message += `📍 *Zona:* ${deliveryZones.find((z: any) => z.id === selectedDeliveryZone)?.name}\n`
                message += `📍 *Dirección:* ${clientData.addressDetail}\n`
                if (clientData.reference) message += `📍 *Ref:* ${clientData.reference}\n`
            }

            message += `\n💳 *PAGO:* ${clientData.paymentMethod}\n`
            if (receiptPublicUrl) message += `📄 *Ver Comprobante:* ${receiptPublicUrl}\n`
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

    const stepVariants = { hidden: { opacity: 0, x: 20 }, enter: { opacity: 1, x: 0 }, exit: { opacity: 0, x: -20 } }
    const modalVariants: Variants = {
        hidden: { opacity: 0, y: typeof window !== 'undefined' && window.innerWidth < 768 ? "100%" : 0, x: typeof window !== 'undefined' && window.innerWidth >= 768 ? "100%" : 0 },
        visible: { opacity: 1, y: 0, x: 0, transition: { type: "spring", damping: 25, stiffness: 200 } },
        exit: { opacity: 0, y: typeof window !== 'undefined' && window.innerWidth < 768 ? "100%" : 0, x: typeof window !== 'undefined' && window.innerWidth >= 768 ? "100%" : 0, transition: { damping: 25, stiffness: 200 } }
    }

    return (
        <>
            <AnimatePresence>
                {!isOpen && items.length > 0 && (
                    <motion.div initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }} transition={{ type: "spring", stiffness: 300, damping: 30 }} className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 md:hidden flex items-center justify-between px-5 py-3 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
                        <div className="flex items-center gap-3" onClick={() => setIsOpen(true)}>
                            <div className="relative bg-gray-50 p-2.5 rounded-full border border-gray-200">
                                <ShoppingCart size={20} className="text-gray-900 animate-wiggle" strokeWidth={2} />
                                <span className="absolute -top-1 -right-1 bg-black text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full">{totalItemsCount}</span>
                            </div>
                            <div className="flex flex-col items-start cursor-pointer">
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-0.5">Ver Carrito</span>
                                <span className="text-base font-black text-gray-900 tracking-tight">{currencySymbol}{grandTotalUSD.toFixed(2)}</span>
                            </div>
                        </div>
                        <button onClick={() => setIsOpen(true)} className="bg-black text-white px-5 py-2.5 pr-3 rounded-full font-bold text-xs uppercase tracking-wide flex items-center gap-1 active:scale-95 transition-transform">
                            Pagar <ArrowUpRight size={18} />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {isOpen && (
                    <div className="fixed inset-0 z-[60] flex items-end md:items-stretch justify-end">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsOpen(false)} />

                        <motion.div variants={modalVariants} initial="hidden" animate="visible" exit="exit" className="relative bg-[#F8F9FA] w-full md:w-[450px] md:h-full h-[90vh] rounded-t-[32px] md:rounded-none md:border-l border-t md:border-t-0 border-gray-200 flex flex-col overflow-hidden shadow-2xl">

                            {/* HEADER */}
                            <div className="bg-white px-6 pt-6 pb-4 flex justify-between items-center shrink-0 border-b border-gray-100 relative z-20">
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
                                <button onClick={() => setIsOpen(false)} className="p-2 bg-gray-50 border border-gray-200 hover:bg-gray-100 rounded-full transition-colors text-gray-500"><X size={20} /></button>
                            </div>

                            {/* PROGRESS BAR MAYORISTA */}
                            {step === 1 && wholesale.active && (
                                <div className="bg-white px-6 py-3 border-b border-gray-100 shrink-0">
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

                            <div className="flex-1 overflow-y-auto scroll-smooth pb-10 relative">
                                <AnimatePresence mode="wait">
                                    {step === 1 ? (
                                        <motion.div key="step-1" variants={stepVariants} initial="hidden" animate="enter" exit="exit" className="p-4 md:p-6">
                                            <div className="space-y-4">
                                                {items.map((item) => {
                                                    // 1. Calculamos los totales individuales aquí adentro
                                                    const itemTotalNominal = item.basePrice * item.quantity;
                                                    const itemTotalBs = (item.basePrice + (item.penalty || 0)) * item.quantity * activeRate;

                                                    return (
                                                        <div key={item.id} className="flex gap-4 p-3">
                                                            <div className="w-20 h-20 bg-gray-50 rounded-[3px] overflow-hidden shrink-0 border border-gray-200/60 relative">
                                                                <img src={item.image} className="w-full h-full object-cover mix-blend-multiply" alt={item.name} />
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
                                                                        {/* AQUI ESTÁ EL PRECIO EN BOLÍVARES RESTAURADO */}
                                                                        <span className="text-[10px] font-mono font-bold text-gray-400 mt-1">
                                                                            Bs {itemTotalBs.toLocaleString('es-VE', { maximumFractionDigits: 2 })}
                                                                        </span>
                                                                    </div>
                                                                    <div className="flex items-center p-1 gap-3 border-[1.8px] border-[#1a1a1ad2] rounded-[3px]">
                                                                        <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="w-6 h-6 flex rounded-full items-center justify-center text-[#1a1a1ad2] hover:bg-[#f4f4f4] disabled:opacity-50"><Minus size={15} /></button>
                                                                        <span className="text-xs font-bold w-3 text-center text-[#1a1a1ad2]">{item.quantity}</span>
                                                                        <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="w-6 h-6 flex rounded-full items-center justify-center text-[#1a1a1ad2] hover:bg-[#f4f4f4]"><Plus size={15} /></button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
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
                                                            const pricing = { cashPrice, priceInBs: (cashPrice + markup) * activeRate, discountPercent: 0, hasDiscount: markup > 0 }
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
                                        <motion.div key="step-2" variants={stepVariants} initial="hidden" animate="enter" exit="exit" className="p-4 md:p-6 space-y-6">

                                            {/* DATOS PERSONALES */}
                                            <div className="bg-white p-5 rounded-2xl border border-gray-200 space-y-4">
                                                <div className="flex items-center gap-2 text-xs font-black text-gray-900 uppercase tracking-widest border-b border-gray-100 pb-3">
                                                    <User size={16} className="text-gray-400" /> Datos Personales
                                                </div>
                                                <div className="grid grid-cols-1 gap-3">
                                                    <input value={clientData.name} onChange={e => setClientData({ ...clientData, name: e.target.value })} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 outline-none focus:border-black" placeholder="Nombre completo *" />
                                                    <input value={clientData.phone} onChange={e => setClientData({ ...clientData, phone: e.target.value })} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 outline-none focus:border-black" placeholder="Teléfono / WhatsApp *" />
                                                </div>
                                            </div>

                                            {/* LOGÍSTICA DE ENVÍO */}
                                            <div className="bg-white p-5 rounded-2xl border border-gray-200 space-y-4">
                                                <div className="flex items-center gap-2 text-xs font-black text-gray-900 uppercase tracking-widest border-b border-gray-100 pb-3">
                                                    <MapPin size={16} className="text-gray-400" /> Entrega
                                                </div>

                                                <div className="flex flex-wrap gap-2">
                                                    {shipping.methods?.pickup && <button onClick={() => setClientData({ ...clientData, deliveryType: 'pickup' })} className={`flex-1 min-w-[100px] py-2.5 rounded-lg text-xs font-bold border transition-all flex items-center justify-center gap-2 ${clientData.deliveryType === 'pickup' ? 'bg-black text-white border-black' : 'bg-gray-50 text-gray-500 border-gray-200 hover:border-gray-300'}`}><Store size={14} /> Retiro</button>}
                                                    {shipping.methods?.delivery && deliveryZones.length > 0 && <button onClick={() => setClientData({ ...clientData, deliveryType: 'local_delivery' })} className={`flex-1 min-w-[100px] py-2.5 rounded-lg text-xs font-bold border transition-all flex items-center justify-center gap-2 ${clientData.deliveryType === 'local_delivery' ? 'bg-black text-white border-black' : 'bg-gray-50 text-gray-500 border-gray-200 hover:border-gray-300'}`}><Truck size={14} /> Delivery</button>}
                                                    {(shipping.methods?.mrw || shipping.methods?.zoom || shipping.methods?.tealca) && <button onClick={() => setClientData({ ...clientData, deliveryType: 'courier' })} className={`flex-1 min-w-[100px] py-2.5 rounded-lg text-xs font-bold border transition-all flex items-center justify-center gap-2 ${clientData.deliveryType === 'courier' ? 'bg-black text-white border-black' : 'bg-gray-50 text-gray-500 border-gray-200 hover:border-gray-300'}`}><Truck size={14} /> Encomienda</button>}
                                                </div>

                                                {/* Delivery Local (Zonas) */}
                                                {clientData.deliveryType === 'local_delivery' && (
                                                    <div className="space-y-4 animate-in fade-in slide-in-from-top-2 pt-2 border-t border-gray-100">
                                                        <div>
                                                            <label className="text-[10px] font-bold text-gray-400 uppercase mb-2 block tracking-wider">Selecciona tu zona de delivery *</label>
                                                            <div className="grid grid-cols-1 gap-2">
                                                                {deliveryZones.map((z: any) => (
                                                                    <button key={z.id} onClick={() => setSelectedDeliveryZone(z.id)} className={`flex justify-between items-center px-4 py-3 rounded-xl border transition-all ${selectedDeliveryZone === z.id ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                                                                        <span className="font-bold text-sm">{z.name}</span>
                                                                        <span className="font-black text-sm">+{currencySymbol}{Number(z.cost).toFixed(2)}</span>
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                        <div className="grid grid-cols-1 gap-3">
                                                            <input value={clientData.addressDetail} onChange={e => setClientData({ ...clientData, addressDetail: e.target.value })} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 outline-none focus:border-black" placeholder="Dirección exacta *" />
                                                            <input value={clientData.reference} onChange={e => setClientData({ ...clientData, reference: e.target.value })} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 outline-none focus:border-black" placeholder="Referencia (Opcional)" />
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Encomienda Nacional */}
                                                {clientData.deliveryType === 'courier' && (
                                                    <div className="space-y-4 animate-in fade-in slide-in-from-top-2 pt-2 border-t border-gray-100">
                                                        <div className="bg-blue-50 border border-blue-200 text-blue-800 p-3 rounded-lg text-xs font-bold flex items-start gap-2">
                                                            <AlertCircle size={16} className="shrink-0 mt-0.5" /> <span>El costo del envío lo pagas al retirar en la agencia (Cobro en Destino).</span>
                                                        </div>
                                                        <div>
                                                            <label className="text-[10px] font-bold text-gray-400 uppercase mb-2 block tracking-wider">Agencia *</label>
                                                            <div className="grid grid-cols-3 gap-2">
                                                                {activeCouriers.map(c => (
                                                                    <button key={c} onClick={() => setClientData({ ...clientData, courier: c })} className={`py-3 rounded-xl text-xs font-bold border transition-all ${clientData.courier === c ? 'bg-black text-white border-black' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}>{c}</button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                        <div className="space-y-3">
                                                            <input value={clientData.identityCard} onChange={e => setClientData({ ...clientData, identityCard: e.target.value })} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 outline-none focus:border-black" placeholder="Cédula de Identidad *" />
                                                            <div className="grid grid-cols-2 gap-3">
                                                                <input value={clientData.state} onChange={e => setClientData({ ...clientData, state: e.target.value })} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 outline-none focus:border-black" placeholder="Estado *" />
                                                                <input value={clientData.city} onChange={e => setClientData({ ...clientData, city: e.target.value })} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 outline-none focus:border-black" placeholder="Ciudad *" />
                                                            </div>
                                                            <input value={clientData.addressDetail} onChange={e => setClientData({ ...clientData, addressDetail: e.target.value })} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 outline-none focus:border-black" placeholder="Dirección de la Agencia *" />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* PAGO Y COMPROBANTE */}
                                            <div className="bg-white p-5 rounded-2xl border border-gray-200 space-y-4">
                                                <div className="flex items-center gap-2 text-xs font-black text-gray-900 uppercase tracking-widest border-b border-gray-100 pb-3">
                                                    <CreditCard size={16} className="text-gray-400" /> Método de Pago
                                                </div>

                                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                                    {activePaymentMethods.length > 0 ? activePaymentMethods.map(pm => {
                                                        const config = getPaymentConfig(pm);
                                                        return (
                                                            <button key={pm} onClick={() => setClientData({ ...clientData, paymentMethod: pm })} className={`flex items-center justify-center gap-2 px-2 py-3 rounded-xl text-xs font-bold border transition-all duration-200 active:scale-95 ${clientData.paymentMethod === pm ? config.btnSelected : config.btnIdle}`}>
                                                                <config.icon size={16} strokeWidth={2.5} /> {pm}
                                                            </button>
                                                        )
                                                    }) : <p className="text-xs text-red-500 font-bold col-span-3">No hay métodos activos.</p>}
                                                </div>

                                                {getAlert()}

                                                {/* Datos de la cuenta seleccionada */}
                                                {clientData.paymentMethod && getSelectedPaymentDetails() && (() => {
                                                    const activeConfig = getPaymentConfig(clientData.paymentMethod);
                                                    return (
                                                        <div className={`relative mt-2 overflow-hidden rounded-2xl p-5 border animate-in fade-in transition-all ${activeConfig.cardBg}`}>
                                                            <activeConfig.icon className="absolute -right-6 -bottom-6 w-36 h-36 opacity-10 -rotate-12 pointer-events-none" />
                                                            <div className="relative z-10">
                                                                <div className="flex justify-between items-start mb-4">
                                                                    <p className="text-[10px] font-black uppercase tracking-widest mb-1 opacity-80">Datos de {clientData.paymentMethod}</p>
                                                                    <button onClick={() => handleCopy(getSelectedPaymentDetails() || '')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase transition-colors border ${activeConfig.btnCopy}`}>
                                                                        {copied ? <Check size={12} /> : <Copy size={12} />} {copied ? 'Copiado' : 'Copiar'}
                                                                    </button>
                                                                </div>
                                                                <div className={`rounded-xl p-4 border backdrop-blur-sm ${activeConfig.cardBox}`}>
                                                                    <p className="font-mono text-xs font-bold leading-relaxed whitespace-pre-wrap">{getSelectedPaymentDetails()}</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })()}

                                                {/* UPLOADER DE COMPROBANTE */}
                                                {clientData.paymentMethod && clientData.paymentMethod !== 'Efectivo' && clientData.paymentMethod !== 'Zelle' && (
                                                    <div className="pt-4 border-t border-gray-100 animate-in fade-in slide-in-from-top-2">
                                                        <div className="flex justify-between items-end mb-3">
                                                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                                                                Sube tu comprobante {receiptConfig.strict_mode && <span className="text-red-500">*</span>}
                                                            </label>
                                                        </div>

                                                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => {
                                                            if (e.target.files && e.target.files[0]) setReceiptFile(e.target.files[0])
                                                        }} />

                                                        {!receiptFile ? (
                                                            <div onClick={() => fileInputRef.current?.click()} className="w-full h-24 rounded-xl border-2 border-dashed border-gray-200 hover:border-black bg-gray-50 hover:bg-gray-100 flex flex-col items-center justify-center cursor-pointer transition-colors">
                                                                <Upload className="text-gray-400 mb-2" size={20} />
                                                                <span className="text-xs font-bold text-gray-600">Haz clic para adjuntar foto</span>
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                                                                <div className="flex items-center gap-3 overflow-hidden">
                                                                    <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center border border-emerald-100 shrink-0"><ImageIcon size={18} className="text-emerald-500" /></div>
                                                                    <div className="min-w-0">
                                                                        <p className="text-xs font-bold text-emerald-900 truncate">{receiptFile.name}</p>
                                                                        <p className="text-[10px] font-medium text-emerald-700 uppercase">Adjunto listo</p>
                                                                    </div>
                                                                </div>
                                                                <button onClick={() => setReceiptFile(null)} className="p-2 text-emerald-600 hover:text-red-500 transition-colors shrink-0"><Trash2 size={18} /></button>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            {/* FOOTER TOTALES */}
                            <div className="bg-white px-5 py-5 border-t border-gray-200 shrink-0 z-20">
                                <div className="flex flex-col gap-4">

                                    {/* Desglose de Costos (Solo en Paso 2) */}
                                    {step === 2 && (
                                        <div className="flex flex-col gap-1 mb-2 border-b border-gray-100 pb-3">
                                            <div className="flex justify-between text-xs text-gray-500 font-medium">
                                                <span>Subtotal</span>
                                                <span>{currencySymbol}{finalSubtotalUSD.toFixed(2)}</span>
                                            </div>
                                            {isWholesaleActive && (
                                                <div className="flex justify-between text-xs text-emerald-600 font-bold">
                                                    <span>Descuento Mayorista ({wholesale.discount_percentage}%)</span>
                                                    <span>-{currencySymbol}{wholesaleDiscountAmount.toFixed(2)}</span>
                                                </div>
                                            )}
                                            {deliveryCost > 0 && (
                                                <div className="flex justify-between text-xs text-gray-700 font-bold">
                                                    <span>Delivery</span>
                                                    <span>+{currencySymbol}{deliveryCost.toFixed(2)}</span>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    <div className="flex justify-between items-end">
                                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Total Final</p>
                                        <div className="flex flex-col items-end">
                                            {isHardCurrencyPayment || step === 1 ? (
                                                <>
                                                    <span className="text-2xl md:text-3xl font-black text-gray-900 leading-none">{currencySymbol}{grandTotalUSD.toFixed(2)}</span>
                                                    <span className="text-[10px] font-mono font-bold text-gray-400 mt-1">Bs {grandTotalBs.toLocaleString('es-VE', { maximumFractionDigits: 2 })}</span>
                                                </>
                                            ) : (
                                                <>
                                                    <span className="text-2xl md:text-3xl font-black text-gray-900 leading-none">Bs {grandTotalBs.toLocaleString('es-VE', { maximumFractionDigits: 2 })}</span>
                                                    <span className="text-[10px] font-mono font-bold text-gray-400 mt-1">Ref: {currencySymbol}{grandTotalUSD.toFixed(2)}</span>
                                                </>
                                            )}
                                        </div>
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