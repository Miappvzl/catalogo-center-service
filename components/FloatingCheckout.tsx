'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import {
    ShoppingCart, X, Trash2, ArrowUpRight, MessageCircle, Loader2, Check,
    CreditCard, Copy, AlertCircle, Store, Truck, ChevronRight, Minus, Plus, MapPin, User, ArrowLeft, Smartphone, DollarSign, Bitcoin, Wallet, Banknote, Upload, Image as ImageIcon, Percent, Package
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

// --- BRAND LOGOS (VECTORES PUROS DE ALTA FIDELIDAD) ---
const BrandLogos = {
    Zelle: ({ className, size }: any) => (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className} style={{ width: size, height: size }}>
            <path d="M17.4 6.2h-3.8l-4 8.2V6.2H5.8v11.6h3.8l4-8.2v8.2h3.8V6.2z" />
            <rect x="11.5" y="3" width="1" height="18" />
        </svg>
    ),
    Binance: ({ className, size }: any) => (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className} style={{ width: size, height: size }}>
            <path d="M12 2.5L7.2 7.3l2.8 2.8L12 8.1l2 2 2.8-2.8L12 2.5zm0 11.4l-2-2-2.8 2.8 4.8 4.8 4.8-4.8-2.8-2.8-2 2zM4.3 9.7L1.5 12.5l2.8 2.8 2.8-2.8-2.8-2.8zm15.4 0l-2.8 2.8 2.8 2.8 2.8-2.8-2.8-2.8zM12 10.9l-1.6 1.6 1.6 1.6 1.6-1.6L12 10.9z" />
        </svg>
    ),
    PagoMovil: ({ className, size }: any) => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={{ width: size, height: size }}>
            <rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect>
            <path d="M12 18h.01"></path>
            <path d="M9 10l3 3 3-3"></path>
            <path d="M12 6v7"></path>
        </svg>
    ),
    Efectivo: ({ className, size }: any) => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={{ width: size, height: size }}>
            <rect x="2" y="6" width="20" height="12" rx="2"></rect>
            <circle cx="12" cy="12" r="2"></circle>
            <path d="M6 12h.01M18 12h.01"></path>
        </svg>
    ),
    Zinli: ({ className, size }: any) => (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className} style={{ width: size, height: size }}>
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm3.5 8.5L11 16h-2l4.5-5.5H9v-2h6.5v2z" />
        </svg>
    )
}

export default function FloatingCheckout({ rates, currency, phone, storeName, storeId, storeConfig, products }: CheckoutProps) {
    const { items, removeItem, clearCart, updateQuantity } = useCart()
    const [isMounted, setIsMounted] = useState(false)
    const [isOpen, setIsOpen] = useState(false)
    const [step, setStep] = useState(1) // 1: Bolsa, 2: Formulario, 3: Éxito (Anti-Lag)
    const [loading, setLoading] = useState(false)
    const [copied, setCopied] = useState(false)

    // --- NUEVOS ESTADOS LOGÍSTICOS, FINANCIEROS Y ANTI-LAG ---
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [receiptFile, setReceiptFile] = useState<File | null>(null)
    const [selectedDeliveryZone, setSelectedDeliveryZone] = useState<string>('')
    const [whatsappUrl, setWhatsappUrl] = useState('')
    const [generatedOrderNumber, setGeneratedOrderNumber] = useState<number | null>(null)

   useEffect(() => {
        setIsMounted(true)
        const handleToggleCart = () => {
            setStep(1); // 🚀 BLINDAJE: Siempre que se llame desde afuera, forzamos el paso 1
            setIsOpen(true);
        };
        document.addEventListener('toggleCartDrawer', handleToggleCart);
        return () => document.removeEventListener('toggleCartDrawer', handleToggleCart);
    }, [])

    // --- CONTROLADORES DE ESTADO (ANTI-GHOST STATE) ---
    const handleOpenModal = () => {
        setStep(1); // 🚀 Forzamos la bolsa
        setIsOpen(true);
    }

    const handleCloseModal = () => {
        setIsOpen(false);
        // 🚀 Esperamos 300ms a que termine la animación de salida antes de resetear
        setTimeout(() => {
            setStep(1);
            setGeneratedOrderNumber(null); // Limpiamos el nro de orden anterior
        }, 300);
    }

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

    // --- FUNCIONES DE UI ---
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
                icon: BrandLogos.PagoMovil, 
                btnSelected: 'bg-[#155dfc] text-white border-[#155dfc] shadow-subtle', 
                btnIdle: 'bg-white text-gray-500 border-gray-200 hover:border-[#155dfc] hover:text-[#155dfc]', 
                cardBg: 'bg-[#155dfc] text-white border-[#155dfc]', 
                cardBox: 'bg-black/10 border-white/20 text-white', 
                btnCopy: 'bg-black/20 hover:bg-black/30 text-white border-none' 
            }
            case 'Zelle': return { 
                icon: BrandLogos.Zelle, 
                btnSelected: 'bg-[#6c1cd3] text-white border-[#6c1cd3] shadow-subtle', 
                btnIdle: 'bg-white text-gray-500 border-gray-200 hover:border-[#6c1cd3] hover:text-[#6c1cd3]', 
                cardBg: 'bg-[#6c1cd3] text-white border-[#6c1cd3]', 
                cardBox: 'bg-black/20 border-white/20 text-white', 
                btnCopy: 'bg-black/20 hover:bg-black/30 text-white border-none' 
            }
            case 'Binance': return { 
                icon: BrandLogos.Binance, 
                btnSelected: 'bg-[#181A20] text-[#FCD535] border-[#181A20] shadow-subtle', 
                btnIdle: 'bg-white text-gray-500 border-gray-200 hover:border-[#181A20] hover:text-[#181A20]', 
                cardBg: 'bg-[#181A20] text-[#FCD535] border-[#181A20]', 
                cardBox: 'bg-white/10 border-white/10 text-white', 
                btnCopy: 'bg-[#FCD535]/20 hover:bg-[#FCD535]/30 text-[#FCD535] border-none' 
            }
            case 'Zinli': return { 
                icon: BrandLogos.Zinli, 
                btnSelected: 'bg-[#5925A6] text-white border-[#5925A6] shadow-subtle', 
                btnIdle: 'bg-white text-gray-500 border-gray-200 hover:border-[#5925A6] hover:text-[#5925A6]', 
                cardBg: 'bg-[#5925A6] text-white border-[#5925A6]', 
                cardBox: 'bg-black/20 border-white/20 text-white', 
                btnCopy: 'bg-black/20 hover:bg-black/30 text-white border-none' 
            }
            case 'Efectivo': return { 
                icon: BrandLogos.Efectivo, 
                btnSelected: 'bg-[#85bb65] text-white border-[#85bb65] shadow-subtle', 
                btnIdle: 'bg-white text-gray-500 border-gray-200 hover:border-[#85bb65] hover:text-[#85bb65]', 
                cardBg: 'bg-[#85bb65] text-white border-[#85bb65]', 
                cardBox: 'bg-black/10 border-white/20 text-white', 
                btnCopy: 'bg-black/20 hover:bg-black/30 text-white border-none' 
            }
            default: return { 
                icon: CreditCard, 
                btnSelected: 'bg-black text-white border-black shadow-subtle', 
                btnIdle: 'bg-white text-gray-500 border-gray-200 hover:border-black hover:text-black', 
                cardBg: 'bg-gray-900 text-white border-gray-900', 
                cardBox: 'bg-white/10 border-white/10 text-white', 
                btnCopy: 'bg-white/20 hover:bg-white/30 text-white border-none' 
            }
        }
    }

    const getSelectedPaymentDetails = () => {
        if (!clientData.paymentMethod) return null
        const key = paymentKeysMap[clientData.paymentMethod]
        return payments[key]?.details || ''
    }

    const [supabase] = useState(() => getSupabase())

    // --- MOTOR DE CHECKOUT BLINDADO (Anti-Ghost Orders & Clean Receipt) ---
    const handleCheckout = async () => {
        if (!clientData.name || !clientData.phone) return Swal.fire({ title: 'Faltan Datos', text: 'Nombre y teléfono son obligatorios', icon: 'warning', confirmButtonColor: '#000' })
        if (!clientData.paymentMethod) return Swal.fire({ title: 'Método de Pago', text: 'Selecciona cómo deseas pagar', icon: 'warning', confirmButtonColor: '#000' })

        // Validaciones Logísticas
        if (clientData.deliveryType === 'pickup' && !clientData.addressDetail) {
            return Swal.fire({ title: 'Punto de Retiro', text: 'Selecciona dónde buscarás tu pedido.', icon: 'warning', confirmButtonColor: '#000' })
        }
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
                const compressedReceipt = await compressImage(receiptFile, 800, 0.7)
                const fileExt = receiptFile.name.split('.').pop() || 'jpg'
                const fileName = `order-${Date.now()}.${fileExt}`
                
                const { error: uploadError } = await supabase.storage.from('receipts').upload(fileName, compressedReceipt)
                if (uploadError) throw uploadError
                
                const { data: { publicUrl } } = supabase.storage.from('receipts').getPublicUrl(fileName)
                receiptPublicUrl = publicUrl
            }

            // 2. Construir Información de Entrega (Para la Base de Datos)
            let deliveryInfoFull = 'Retiro Personal'
            if (clientData.deliveryType === 'courier') {
                deliveryInfoFull = `${clientData.courier} (Cobro en Destino) - ${clientData.addressDetail}, ${clientData.city}, ${clientData.state}. Ref: ${clientData.reference || 'N/A'} | CI: ${clientData.identityCard} | Tlf: ${clientData.phone}`
            } else if (clientData.deliveryType === 'local_delivery') {
                const zoneName = deliveryZones.find((z: any) => z.id === selectedDeliveryZone)?.name || 'Zona Desconocida'
                deliveryInfoFull = `Delivery a: ${zoneName} - ${clientData.addressDetail}, ${clientData.city}. Ref: ${clientData.reference || 'N/A'} | Tlf: ${clientData.phone}`
            } else if (clientData.deliveryType === 'pickup') {
                deliveryInfoFull = `Punto de Retiro: ${clientData.addressDetail}`
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

            // 5. CONSTRUIR MENSAJE CLEAN RECEIPT (ARQUITECTURA NUEVA)
            let message = `*PEDIDO #${order.order_number}*\n`
            message += `------------------------\n`
            message += `*Cliente:* ${clientData.name}\n`
            message += `*Teléfono:* ${clientData.phone}\n\n`

            message += `*CARRITO:*\n`
            items.forEach(item => { 
                const hasPromo = isHardCurrencyPayment && (item.penalty || 0) > 0
                message += `▫️ ${item.quantity}x ${item.name} ${item.variantInfo ? `(${item.variantInfo})` : ''} ${hasPromo ? '[⭐ Promo Divisa]' : ''}\n` 
            })

            message += `\n------------------------\n`
            message += `*TOTAL USD:* $${grandTotalUSD.toFixed(2)}\n`
            message += `*TOTAL BS:* Bs ${grandTotalBs.toLocaleString('es-VE', { maximumFractionDigits: 2 })}\n`
            if (displayTotalSavings > 0) {
                message += `_Ahorro aplicado: $${displayTotalSavings.toFixed(2)}_\n`
            }

            message += `\n*LOGÍSTICA:*\n`
            message += `Envío: ${clientData.deliveryType === 'pickup' ? 'Retiro Personal' : clientData.deliveryType === 'courier' ? 'Agencia Nacional' : 'Delivery Local'}\n`
            if (clientData.deliveryType === 'pickup') {
                message += `Punto: ${clientData.addressDetail}\n`
            } else if (clientData.deliveryType === 'local_delivery') {
                message += `Zona: ${deliveryZones.find((z: any) => z.id === selectedDeliveryZone)?.name}\n`
                message += `Dir: ${clientData.addressDetail}\n`
                if (clientData.reference) message += `Ref: ${clientData.reference}\n`
            } else if (clientData.deliveryType === 'courier') {
                message += `Agencia: ${clientData.courier}\n`
                message += `Dir: ${clientData.addressDetail}, ${clientData.city}, ${clientData.state}\n`
                message += `CI: ${clientData.identityCard}\n`
            }

            message += `\n*PAGO:*\n`
            message += `Método: ${clientData.paymentMethod}\n`
            if (receiptPublicUrl) message += `Comprobante: ${receiptPublicUrl}\n`
            if (clientData.notes) message += `Notas: ${clientData.notes}\n`

            // 6. PATRÓN ANTI-GHOST ORDERS (Paso 3)
            const waLink = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
            setWhatsappUrl(waLink)
            setGeneratedOrderNumber(order.order_number)
            
            // Vaciamos carrito e iniciamos Sala de Espera
            clearCart()
            setStep(3) 

            // Intentamos abrir WhatsApp automáticamente
            setTimeout(() => {
                window.open(waLink, '_blank')
            }, 600)

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
                       <div className="flex items-center gap-3 cursor-pointer" onClick={handleOpenModal}>
                            <div className="relative bg-gray-50 p-2.5 rounded-full border border-gray-200">
                                <ShoppingCart size={20} className="text-gray-900 animate-wiggle" strokeWidth={2} />
                                <span className="absolute -top-1 -right-1 bg-black text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full">{totalItemsCount}</span>
                            </div>
                            <div className="flex flex-col items-start cursor-pointer">
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-0.5">Ver Carrito</span>
                                <span className="text-base font-black text-gray-900 tracking-tight">{currencySymbol}{grandTotalUSD.toFixed(2)}</span>
                            </div>
                        </div>
                       <button onClick={handleOpenModal} className="bg-black text-white px-5 py-2.5 pr-3 rounded-full font-bold text-xs uppercase tracking-wide flex items-center gap-1 active:scale-95 transition-transform shadow-subtle border border-black">
                            Pagar <ArrowUpRight size={18} />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {isOpen && (
                    <div className="fixed inset-0 z-[60] flex items-end md:items-stretch justify-end">
                       <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleCloseModal} />

                        <motion.div variants={modalVariants} initial="hidden" animate="visible" exit="exit" className="relative bg-[#F6F6F6] w-full md:w-[450px] md:h-full h-[90vh] rounded-t-[32px] md:rounded-none md:border-l border-t md:border-t-0 border-gray-200 flex flex-col overflow-hidden shadow-2xl">

                            {/* HEADER */}
                            {step !== 3 && (
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
                                    <button onClick={handleCloseModal} className="p-2 bg-gray-50 border border-gray-200 hover:bg-gray-100 rounded-full transition-colors text-gray-500"><X size={20} /></button>
                                </div>
                            )}

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

                            <div className="flex-1 overflow-y-auto scroll-smooth relative">
                                <AnimatePresence mode="wait">
                                    {step === 1 ? (
                                        <motion.div key="step-1" variants={stepVariants} initial="hidden" animate="enter" exit="exit" className=" md:p-0 ">
                                            <div className="space-y-0">
                                                {items.map((item) => {
                                                    const itemTotalNominal = item.basePrice * item.quantity;
                                                    const itemTotalBs = (item.basePrice + (item.penalty || 0)) * item.quantity * activeRate;

                                                    return (
                                                        <div key={item.id} className="flex gap-4 p-3 bg-white  border border-gray-100 ">
                                                            <div className="w-20 h-20 bg-gray-50 rounded-[var(--radius-btn)] overflow-hidden shrink-0 border border-gray-100 relative">
                                                                <img src={item.image} className="w-full h-full object-cover mix-blend-multiply" alt={item.name} />
                                                            </div>
                                                            <div className="flex-1 flex flex-col justify-between py-0.5">
                                                                <div>
                                                                    <div className="flex justify-between items-start">
                                                                        <h3 className="font-bold text-sm text-gray-900 line-clamp-2 leading-snug pr-2">{item.name}</h3>
                                                                        <button onClick={() => removeItem(item.id)} className="text-gray-400 hover:text-red-500 transition-colors bg-gray-50 p-1.5 rounded-md"><Trash2 size={14} /></button>
                                                                    </div>
                                                                    <p className="text-[11px] text-gray-500 font-medium mt-1">{item.variantInfo || 'Estándar'}</p>
                                                                </div>
                                                                <div className="flex items-end justify-between mt-2">
                                                                    <div className="flex flex-col">
                                                                        <span className="font-black text-base text-gray-900 leading-none">{currencySymbol}{itemTotalNominal.toFixed(2)}</span>
                                                                        <span className="text-[10px] font-mono font-bold text-gray-400 mt-1">
                                                                            Bs {itemTotalBs.toLocaleString('es-VE', { maximumFractionDigits: 2 })}
                                                                        </span>
                                                                    </div>
                                                                    
                                                                    {/* Control de Cantidad (Con límite maxStock) */}
                                                                    <div className="flex items-center p-1 gap-3 border-[1.8px] border-[#1a1a1ad2] rounded-full bg-gray-50/50">
                                                                        <button 
                                                                            onClick={() => updateQuantity(item.id, item.quantity - 1)} 
                                                                            disabled={item.quantity <= 1}
                                                                            className="w-6 h-6 flex rounded-full items-center justify-center text-[#1a1a1ad2] hover:bg-white hover:shadow-sm disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                                                        >
                                                                            <Minus size={14} strokeWidth={3}/>
                                                                        </button>
                                                                        
                                                                        <span className="text-xs font-bold w-3 text-center text-[#1a1a1ad2]">{item.quantity}</span>
                                                                        
                                                                        <button 
                                                                            onClick={() => updateQuantity(item.id, item.quantity + 1)} 
                                                                            disabled={item.quantity >= (item.maxStock ?? 9999)}
                                                                            className="w-6 h-6 flex rounded-full items-center justify-center text-[#1a1a1ad2] hover:bg-white hover:shadow-sm disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                                                        >
                                                                            <Plus size={14} strokeWidth={3}/>
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>

                                            {recommendedProducts.length > 0 && (
                                                <div className="mt-8 border-t border-gray-200 pt-8 px-2 pb-4">
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
                                    ) : step === 2 ? (
                                        <motion.div key="step-2" variants={stepVariants} initial="hidden" animate="enter" exit="exit" className="p-4 md:p-6 space-y-6 pb-10">

                                            {/* DATOS PERSONALES */}
                                            <div className="bg-white p-5 rounded-2xl  space-y-4">
                                                <div className="flex items-center gap-2 text-xs font-black text-gray-900 uppercase tracking-widest border-b border-gray-100 pb-3">
                                                    <User size={16} className="text-gray-400" /> Datos Personales
                                                </div>
                                                <div className="grid grid-cols-1 gap-3">
                                                    <input value={clientData.name} onChange={e => setClientData({ ...clientData, name: e.target.value })} className="w-full bg-gray-50 border border-gray-200 rounded-[var(--radius-btn)] px-4 py-3 text-sm font-bold text-gray-900 outline-none focus:border-black focus:shadow-subtle transition-all" placeholder="Nombre completo *" />
                                                    <input value={clientData.phone} onChange={e => setClientData({ ...clientData, phone: e.target.value })} className="w-full bg-gray-50 border border-gray-200 rounded-[var(--radius-btn)] px-4 py-3 text-sm font-bold text-gray-900 outline-none focus:border-black focus:shadow-subtle transition-all" placeholder="Teléfono / WhatsApp *" />
                                                </div>
                                            </div>

                                            {/* LOGÍSTICA DE ENVÍO RE-IMAGINADA */}
                                            <div className="bg-white p-5 rounded-2xl space-y-5 ">
                                                <div className="flex items-center gap-2 text-xs font-black text-gray-900 uppercase tracking-widest border-b border-gray-100 pb-3">
                                                    <MapPin size={16} className="text-gray-400" /> Entrega
                                                </div>

                                                <div className="grid grid-cols-1 gap-3">
                                                    {/* Tarjeta: RETIRO */}
                                                    {shipping.methods?.pickup && (
                                                        <div 
                                                            onClick={() => { setClientData({ ...clientData, deliveryType: 'pickup', addressDetail: '' }); setSelectedDeliveryZone('') }} 
                                                            className={`cursor-pointer p-4 rounded-xl border transition-all flex items-start gap-3 ${clientData.deliveryType === 'pickup' ? 'bg-black border-black text-white shadow-subtle' : 'bg-gray-50 border-transparent hover:border-gray-300 text-gray-900'}`}
                                                        >
                                                            <Store size={20} className={clientData.deliveryType === 'pickup' ? 'text-white mt-0.5' : 'text-gray-500 mt-0.5'}/>
                                                            <div>
                                                                <p className="font-bold text-sm leading-tight">Retiro Personal</p>
                                                                <p className={`text-xs mt-0.5 ${clientData.deliveryType === 'pickup' ? 'text-gray-300' : 'text-gray-500'}`}>Busca tu pedido gratis en tienda o puntos acordados.</p>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Tarjeta: DELIVERY */}
                                                    {shipping.methods?.delivery && deliveryZones.length > 0 && (
                                                        <div 
                                                            onClick={() => setClientData({ ...clientData, deliveryType: 'local_delivery', addressDetail: '' })} 
                                                            className={`cursor-pointer p-4 rounded-xl border transition-all flex items-start gap-3 ${clientData.deliveryType === 'local_delivery' ? 'bg-black border-black text-white shadow-subtle' : 'bg-[#f6f6f6] border-transparent hover:border-gray-300 text-gray-900'}`}
                                                        >
                                                            <Truck size={20} className={clientData.deliveryType === 'local_delivery' ? 'text-white mt-0.5' : 'text-gray-500 mt-0.5'}/>
                                                            <div>
                                                                <p className="font-bold text-sm leading-tight">Delivery Local</p>
                                                                <p className={`text-xs mt-0.5 ${clientData.deliveryType === 'local_delivery' ? 'text-gray-300' : 'text-gray-500'}`}>Entregas a domicilio solo en zonas de cobertura.</p>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Tarjeta: ENCOMIENDA NACIONAL */}
                                                    {(shipping.methods?.mrw || shipping.methods?.zoom || shipping.methods?.tealca) && (
                                                        <div 
                                                            onClick={() => { setClientData({ ...clientData, deliveryType: 'courier', addressDetail: '' }); setSelectedDeliveryZone('') }} 
                                                            className={`cursor-pointer p-4 rounded-xl border transition-all flex items-start gap-3 ${clientData.deliveryType === 'courier' ? 'bg-black border-black text-white shadow-subtle' : 'bg-[#f6f6f6] border-transparent hover:border-gray-300 text-gray-900'}`}
                                                        >
                                                            <Package size={20} className={clientData.deliveryType === 'courier' ? 'text-white mt-0.5' : 'text-gray-500 mt-0.5'}/>
                                                            <div>
                                                                <p className="font-bold text-sm leading-tight">Envío Nacional</p>
                                                                <p className={`text-xs mt-0.5 ${clientData.deliveryType === 'courier' ? 'text-gray-300' : 'text-gray-500'}`}>Envíos por agencia a todo el país. Cobro en destino.</p>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Lógica Interna: RETIRO */}
                                                {clientData.deliveryType === 'pickup' && (
                                                    <div className="space-y-3 animate-in fade-in slide-in-from-top-2 pt-2 border-t border-gray-100">
                                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">¿Dónde lo buscas? *</label>
                                                        <div className="grid gap-2">
                                                            {shipping.main_address && (
                                                                <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${clientData.addressDetail === shipping.main_address ? 'bg-gray-50 border-black ring-1 ring-black shadow-sm' : 'bg-white border-gray-200 hover:bg-gray-50'}`}>
                                                                    <input type="radio" name="pickupLocation" className="mt-1 accent-black w-4 h-4" checked={clientData.addressDetail === shipping.main_address} onChange={() => setClientData({ ...clientData, addressDetail: shipping.main_address })} />
                                                                    <div>
                                                                        <p className="font-bold text-sm text-gray-900">Tienda Física</p>
                                                                        <p className="text-xs text-gray-500 mt-0.5">{shipping.main_address}</p>
                                                                    </div>
                                                                </label>
                                                            )}
                                                            {shipping.pickup_locations?.map((loc: string, idx: number) => (
                                                                <label key={idx} className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${clientData.addressDetail === loc ? 'bg-[#f6f6f6] border-black ring-1 ring-black shadow-sm' : 'bg-white border-gray-200 hover:bg-gray-50'}`}>
                                                                    <input type="radio" name="pickupLocation" className="mt-1 accent-black w-4 h-4" checked={clientData.addressDetail === loc} onChange={() => setClientData({ ...clientData, addressDetail: loc })} />
                                                                    <div>
                                                                        <p className="font-bold text-sm text-gray-900">Punto de Entrega</p>
                                                                        <p className="text-xs text-gray-500 mt-0.5">{loc}</p>
                                                                    </div>
                                                                </label>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Lógica Interna: DELIVERY */}
                                                {clientData.deliveryType === 'local_delivery' && (
                                                    <div className="space-y-4 animate-in fade-in slide-in-from-top-2 pt-2 border-t border-gray-100">
                                                        <div className="bg-orange-50 border border-orange-200 text-orange-800 p-3 rounded-lg text-xs font-bold flex items-start gap-2">
                                                            <AlertCircle size={16} className="shrink-0 mt-0.5 text-orange-600" /> 
                                                            <span>Si tu zona no está en la lista, por favor selecciona "Envío Nacional".</span>
                                                        </div>
                                                        <div>
                                                            <label className="text-[10px] font-bold text-gray-400 uppercase mb-2 block tracking-wider">Selecciona tu zona *</label>
                                                            <div className="grid grid-cols-1 gap-2">
                                                                {deliveryZones.map((z: any) => (
                                                                    <button key={z.id} onClick={() => setSelectedDeliveryZone(z.id)} className={`flex justify-between items-center px-4 py-3 rounded-xl border transition-all ${selectedDeliveryZone === z.id ? 'bg-black border-black text-white shadow-subtle' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                                                                        <span className="font-bold text-sm">{z.name}</span>
                                                                        <span className="font-black text-sm">+{currencySymbol}{Number(z.cost).toFixed(2)}</span>
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                        {selectedDeliveryZone && (
                                                            <div className="grid grid-cols-1 gap-3 animate-in fade-in pt-2">
                                                                <input value={clientData.addressDetail} onChange={e => setClientData({ ...clientData, addressDetail: e.target.value })} className="w-full bg-gray-50 border border-gray-200 rounded-[var(--radius-btn)] px-4 py-3 text-sm font-bold text-gray-900 outline-none focus:border-black focus:shadow-subtle transition-all" placeholder="Dirección exacta *" />
                                                                <input value={clientData.reference} onChange={e => setClientData({ ...clientData, reference: e.target.value })} className="w-full bg-gray-50 border border-gray-200 rounded-[var(--radius-btn)] px-4 py-3 text-sm font-bold text-gray-900 outline-none focus:border-black focus:shadow-subtle transition-all" placeholder="Punto de referencia (Opcional)" />
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Lógica Interna: ENCOMIENDA */}
                                                {clientData.deliveryType === 'courier' && (
                                                    <div className="space-y-4 animate-in fade-in slide-in-from-top-2 pt-2 border-t border-gray-100">
                                                        <div className="bg-blue-50 border border-blue-200 text-blue-800 p-3 rounded-lg text-xs font-bold flex items-start gap-2">
                                                            <AlertCircle size={16} className="shrink-0 mt-0.5 text-blue-600" /> 
                                                            <span>El costo del envío lo pagas al retirar en la agencia (Cobro en Destino).</span>
                                                        </div>
                                                        <div>
                                                            <label className="text-[10px] font-bold text-gray-400 uppercase mb-2 block tracking-wider">Agencia de Envío *</label>
                                                            <div className="grid grid-cols-3 gap-2">
                                                                {activeCouriers.map(c => (
                                                                    <button key={c} onClick={() => setClientData({ ...clientData, courier: c })} className={`py-3 rounded-xl text-xs font-bold border transition-all ${clientData.courier === c ? 'bg-black text-white border-black shadow-subtle' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}>{c}</button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                        {clientData.courier && (
                                                            <div className="space-y-3 animate-in fade-in pt-2">
                                                                <input value={clientData.identityCard} onChange={e => setClientData({ ...clientData, identityCard: e.target.value })} className="w-full bg-gray-50 border border-gray-200 rounded-[var(--radius-btn)] px-4 py-3 text-sm font-bold text-gray-900 outline-none focus:border-black focus:shadow-subtle transition-all" placeholder="Cédula de Identidad *" />
                                                                <div className="grid grid-cols-2 gap-3">
                                                                    <input value={clientData.state} onChange={e => setClientData({ ...clientData, state: e.target.value })} className="w-full bg-gray-50 border border-gray-200 rounded-[var(--radius-btn)] px-4 py-3 text-sm font-bold text-gray-900 outline-none focus:border-black focus:shadow-subtle transition-all" placeholder="Estado *" />
                                                                    <input value={clientData.city} onChange={e => setClientData({ ...clientData, city: e.target.value })} className="w-full bg-gray-50 border border-gray-200 rounded-[var(--radius-btn)] px-4 py-3 text-sm font-bold text-gray-900 outline-none focus:border-black focus:shadow-subtle transition-all" placeholder="Ciudad *" />
                                                                </div>
                                                                <input value={clientData.addressDetail} onChange={e => setClientData({ ...clientData, addressDetail: e.target.value })} className="w-full bg-gray-50 border border-gray-200 rounded-[var(--radius-btn)] px-4 py-3 text-sm font-bold text-gray-900 outline-none focus:border-black focus:shadow-subtle transition-all" placeholder="Dirección de la Agencia *" />
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            {/* PAGO Y COMPROBANTE */}
                                            <div className="bg-white p-5 rounded-2xl  space-y-4">
                                                <div className="flex items-center gap-2 text-xs font-black text-gray-900 uppercase tracking-widest border-b border-gray-100 pb-3">
                                                    <CreditCard size={16} className="text-gray-400" /> Método de Pago
                                                </div>

                                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                                    {activePaymentMethods.length > 0 ? activePaymentMethods.map(pm => {
                                                        const config = getPaymentConfig(pm);
                                                        return (
                                                            <button 
                                                                key={pm} 
                                                                onClick={() => setClientData({ ...clientData, paymentMethod: pm })} 
                                                                className={`flex items-center justify-center gap-2 px-2 py-3 rounded-[var(--radius-btn)] text-[11px] font-bold border transition-all duration-200 active:scale-95 ${clientData.paymentMethod === pm ? config.btnSelected : config.btnIdle}`}
                                                            >
                                                                <config.icon size={16} className={clientData.paymentMethod === pm ? "scale-110 transition-transform" : ""} /> {pm}
                                                            </button>
                                                        )
                                                    }) : <p className="text-xs text-red-500 font-bold col-span-3">No hay métodos activos.</p>}
                                                </div>

                                                {getAlert()}

                                                {/* Datos de la cuenta seleccionada (El Watermark Corporativo) */}
                                                {clientData.paymentMethod && getSelectedPaymentDetails() && (() => {
                                                    const activeConfig = getPaymentConfig(clientData.paymentMethod);
                                                    return (
                                                        <div className={`relative mt-2 overflow-hidden rounded-2xl p-5 border animate-in fade-in slide-in-from-top-2 transition-all shadow-sm ${activeConfig.cardBg}`}>
                                                            {/* El Watermark Gigante */}
                                                            <div className="absolute -right-6 -bottom-6 opacity-10 -rotate-12 pointer-events-none">
                                                                <activeConfig.icon size={140} />
                                                            </div>
                                                            <div className="relative z-10">
                                                                <div className="flex justify-between items-start mb-4">
                                                                    <p className="text-[10px] font-black uppercase tracking-widest mb-1 opacity-80">Datos de {clientData.paymentMethod}</p>
                                                                    <button onClick={() => handleCopy(getSelectedPaymentDetails() || '')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-badge)] text-[10px] font-bold uppercase transition-colors border ${activeConfig.btnCopy}`}>
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
                                    ) : (
                                        /* 🚀 PASO 3: SALA DE ESPERA (ANTI-GHOST ORDERS) */
                                        <motion.div key="step-3" variants={stepVariants} initial="hidden" animate="enter" exit="exit" className="p-6 md:p-10 flex flex-col items-center justify-center h-full text-center space-y-6">
                                            <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center border-[3px] border-emerald-100 shrink-0">
                                                <Check size={40} className="text-emerald-500" strokeWidth={3}/>
                                            </div>
                                            <div>
                                                <h2 className="text-2xl font-black text-gray-900 mb-2">¡Pedido #{generatedOrderNumber} Registrado!</h2>
                                                <p className="text-gray-500 text-sm leading-relaxed max-w-xs mx-auto">
                                                    Tu orden ha sido guardada en nuestro sistema. Si WhatsApp no se abrió automáticamente, presiona el botón abajo para enviarnos tu comprobante.
                                                </p>
                                            </div>
                                            <div className="w-full flex flex-col gap-3 pt-4">
                                                <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="w-full bg-[#25D366] text-white px-6 py-4 rounded-[var(--radius-btn)] font-bold text-sm hover:bg-[#1ebd5a] transition-all shadow-subtle flex items-center justify-center gap-2 border border-[#1ebd5a]">
                                                    <MessageCircle size={18} /> Enviar a WhatsApp
                                                </a>
                                                <button onClick={handleCloseModal} className="w-full bg-white text-gray-600 px-6 py-4 rounded-[var(--radius-btn)] font-bold text-sm hover:bg-gray-50 hover:text-black transition-all border border-gray-200">
                                                    Cerrar y Volver a la Tienda
                                                </button>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            {/* FOOTER TOTALES (Solo visible en pasos 1 y 2) */}
                            {step !== 3 && (
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
                                                        <span>Delivery Local</span>
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
                                                <button onClick={() => setStep(2)} className="flex-1 bg-black text-white px-8 py-3.5 rounded-full shadow-subtle font-bold text-sm hover:bg-gray-800 transition-all active:scale-95 flex items-center justify-center gap-2 border border-black">
                                                    Ir al Checkout <ChevronRight size={16} />
                                                </button>
                                            ) : (
                                                <button onClick={handleCheckout} disabled={loading} className="flex-1 bg-black text-white px-6 py-3.5 rounded-full shadow-subtle font-bold text-sm hover:bg-gray-800 transition-all active:scale-95 flex items-center justify-center gap-2 border border-black disabled:opacity-70 disabled:cursor-not-allowed">
                                                    {loading ? <Loader2 className="animate-spin" size={18} /> : <><MessageCircle size={18} /> Enviar Pedido</>}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    )
}