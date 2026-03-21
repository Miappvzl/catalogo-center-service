'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import {
    ShoppingCart, X, Trash2, ArrowUpRight, MessageCircle, Loader2, Check,
    CreditCard, Copy, Store, Truck, ChevronRight, Minus, Plus, MapPin, User, ArrowLeft, Image as ImageIcon, Percent, Package, Upload
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
    promotions?: any[]
}

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

export default function FloatingCheckout({ rates, currency, phone, storeName, storeId, storeConfig, products, promotions = [] }: CheckoutProps) {
    const { items, removeItem, clearCart, updateQuantity } = useCart()
    const [isMounted, setIsMounted] = useState(false)
    const [isOpen, setIsOpen] = useState(false)
    const [step, setStep] = useState(1) 
    const [loading, setLoading] = useState(false)
    const [copied, setCopied] = useState(false)

    const fileInputRef = useRef<HTMLInputElement>(null)
    const [receiptFile, setReceiptFile] = useState<File | null>(null)
    const [selectedDeliveryZone, setSelectedDeliveryZone] = useState<string>('')
    const [whatsappUrl, setWhatsappUrl] = useState('')
    const [generatedOrderNumber, setGeneratedOrderNumber] = useState<number | null>(null)

    useEffect(() => {
        setIsMounted(true)
        const handleToggleCart = () => {
            setStep(1); 
            setIsOpen(true);
        };
        document.addEventListener('toggleCartDrawer', handleToggleCart);
        return () => document.removeEventListener('toggleCartDrawer', handleToggleCart);
    }, [])

    const handleOpenModal = () => {
        setStep(1);
        setIsOpen(true);
    }

    const handleCloseModal = () => {
        setIsOpen(false);
        setTimeout(() => {
            setStep(1);
            setGeneratedOrderNumber(null);
        }, 300);
    }

    const isEurMode = currency === 'eur'
    const activeRate = isEurMode ? rates.eur : rates.usd
    const currencySymbol = '$'

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

   useEffect(() => {
        if (clientData.deliveryType !== 'local_delivery') setSelectedDeliveryZone('')
    }, [clientData.deliveryType])

    // --- 🚀 MOTOR DE RECOMENDACIONES (CROSS-SELLING) ---
    const recommendedProducts = useMemo(() => {
        if (items.length === 0 || !products || products.length === 0) return []
        
        const cartCategories = Array.from(new Set(items.map(item => item.category?.toLowerCase() || '')))
        const cartProductIds = new Set(items.map(item => item.productId))
        
        const recommendations = products.filter(p => {
            // No recomendar si ya está en el carrito
            if (cartProductIds.has(p.id)) return false
            // No recomendar si está agotado
            if ((p.stock || 0) <= 0 && (!p.product_variants || p.product_variants.every((v: any) => (v.stock || 0) <= 0))) return false
            // Recomendar de la misma categoría
            return cartCategories.includes(p.category?.toLowerCase() || '')
        })
        
        return recommendations.slice(0, 10)
    }, [items, products])

    // --- 🚀 MOTOR MATEMÁTICO: "CLEAN RECEIPT PIPELINE" ---
    const totalItemsCount = useMemo(() => items.reduce((acc, item) => acc + item.quantity, 0), [items])

    const cartEngine = useMemo(() => {
        let totalListNominal = 0; // Total Público (Base + Margen)
        let totalCashNominal = 0; // Total Divisa (Base pura)
        let listPromoDiscounts = 0; 
        let cashPromoDiscounts = 0;
        
        let bogoPool: Record<string, { listPrices: number[], cashPrices: number[], buy: number, pay: number }> = {};
        const promoCounts: Record<string, number> = {};

        // 1. Contabilizar volumen para BOGOs (Bloqueado a String para evitar NaN de UUID/BigInt)
        items.forEach(item => {
            promotions?.forEach(p => {
                if (p.promo_type === 'bogo' && (p.linked_products || []).some((id:any) => String(id) === String(item.productId))) {
                    promoCounts[p.id] = (promoCounts[p.id] || 0) + item.quantity;
                }
            })
        });

        // 2. Procesar Líneas Individuales
        const processedItems = items.map(item => {
            const itemBasePrice = Number(item.basePrice || 0);
            const itemPenalty = Number(item.penalty || 0);
            
            // Sinceridad Radical: Precio Lista es el precio real público
            const listPrice = itemBasePrice + itemPenalty;
            const cashPrice = itemBasePrice;

            totalListNominal += listPrice * item.quantity;
            totalCashNominal += cashPrice * item.quantity;

            let itemListDiscount = 0;
            let itemCashDiscount = 0;
            let badge = null;

            // 🏆 TORNEO MATEMÁTICO DE CAMPAÑAS
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
                        
                        badge = `✨ ${(bestPromo as any).title} (-${(bestPromo as any).discount_percentage}%)`;
                    } else if ((bestPromo as any).promo_type === 'bogo') {
                        badge = `✨ ${(bestPromo as any).title}`;
                        if (!bogoPool[(bestPromo as any).id]) bogoPool[(bestPromo as any).id] = { listPrices: [], cashPrices: [], buy: (bestPromo as any).bogo_buy, pay: (bestPromo as any).bogo_pay };
                        for(let i=0; i<item.quantity; i++) {
                            bogoPool[(bestPromo as any).id].listPrices.push(listPrice);
                            bogoPool[(bestPromo as any).id].cashPrices.push(cashPrice);
                        }
                    }
                }
            }

          return {
                ...item,
                listPrice,
                cashPrice,
                finalListPrice: listPrice - (itemListDiscount / item.quantity), 
                finalCashPrice: cashPrice - (itemCashDiscount / item.quantity), // 🚀 NUEVO: Exportamos el precio con descuento en divisas
                badge
            }
        });

        // 3. Resolver Piscinas BOGO
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

        return { 
            processedItems, 
            totalListNominal, 
            totalCashNominal,
            listPromoDiscounts, 
            finalBsModeUSD, 
            finalCashModeUSD,
            fxSavingsAmount: finalBsModeUSD - finalCashModeUSD // Ahorro exacto y transparente por evitar el margen
        };
    }, [items, promotions]);

    // --- LÓGICA DE TOTALES FINALES ---
    const isHardCurrencyPayment = clientData.paymentMethod && hardCurrencyMethods.includes(clientData.paymentMethod);
    const isWholesaleActive = wholesale.active && totalItemsCount >= wholesale.min_items;

    const wholesaleDiscountList = isWholesaleActive ? (cartEngine.totalListNominal * (wholesale.discount_percentage / 100)) : 0;
    const wholesaleDiscountCash = isWholesaleActive ? (cartEngine.totalCashNominal * (wholesale.discount_percentage / 100)) : 0;
    
    // Evitamos dobles restas en el receipt
    const finalBsTotalBeforeDelivery = cartEngine.finalBsModeUSD - wholesaleDiscountList;
    const finalCashTotalBeforeDelivery = cartEngine.finalCashModeUSD - wholesaleDiscountCash;
    const exactFxSavings = finalBsTotalBeforeDelivery - finalCashTotalBeforeDelivery;

    const currentWholesaleDiscount = isHardCurrencyPayment ? wholesaleDiscountCash : wholesaleDiscountList;
    const totalWithDiscountUSD = (isHardCurrencyPayment ? cartEngine.finalCashModeUSD : cartEngine.finalBsModeUSD) - currentWholesaleDiscount;
    
    const deliveryCost = useMemo(() => {
        if (clientData.deliveryType === 'local_delivery' && selectedDeliveryZone) {
            const zone = deliveryZones.find((z: any) => z.id === selectedDeliveryZone)
            return zone ? Number(zone.cost) : 0
        }
        return 0
    }, [clientData.deliveryType, selectedDeliveryZone, deliveryZones])

    const grandTotalUSD = Math.max(0, totalWithDiscountUSD + deliveryCost) 
    const grandTotalBs = grandTotalUSD * activeRate

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    const getPaymentConfig = (pm: string) => {
        switch (pm) {
            case 'Pago Móvil': return {
                icon: BrandLogos.PagoMovil,
                btnSelected: 'bg-[#155dfc] text-white',
                btnIdle: 'bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-[#155dfc]',
                cardBg: 'bg-[#155dfc] text-white',
                cardBox: 'bg-black/10 text-white',
                btnCopy: 'bg-black/20 hover:bg-black/30 text-white'
            }
            case 'Zelle': return {
                icon: BrandLogos.Zelle,
                btnSelected: 'bg-[#6c1cd3] text-white',
                btnIdle: 'bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-[#6c1cd3]',
                cardBg: 'bg-[#6c1cd3] text-white',
                cardBox: 'bg-black/20 text-white',
                btnCopy: 'bg-black/20 hover:bg-black/30 text-white'
            }
            case 'Binance': return {
                icon: BrandLogos.Binance,
                btnSelected: 'bg-[#181A20] text-[#FCD535]',
                btnIdle: 'bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-[#181A20]',
                cardBg: 'bg-[#181A20] text-[#FCD535]',
                cardBox: 'bg-white/10 text-white',
                btnCopy: 'bg-[#FCD535]/20 hover:bg-[#FCD535]/30 text-[#FCD535]'
            }
            case 'Zinli': return {
                icon: BrandLogos.Zinli,
                btnSelected: 'bg-[#5925A6] text-white',
                btnIdle: 'bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-[#5925A6]',
                cardBg: 'bg-[#5925A6] text-white',
                cardBox: 'bg-black/20 text-white',
                btnCopy: 'bg-black/20 hover:bg-black/30 text-white'
            }
            case 'Efectivo': return {
                icon: BrandLogos.Efectivo,
                btnSelected: 'bg-[#85bb65] text-white',
                btnIdle: 'bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-[#85bb65]',
                cardBg: 'bg-[#85bb65] text-white',
                cardBox: 'bg-black/10 text-white',
                btnCopy: 'bg-black/20 hover:bg-black/30 text-white'
            }
            default: return {
                icon: CreditCard,
                btnSelected: 'bg-black text-white',
                btnIdle: 'bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-black',
                cardBg: 'bg-gray-900 text-white',
                cardBox: 'bg-white/10 text-white',
                btnCopy: 'bg-white/20 hover:bg-white/30 text-white'
            }
        }
    }

    const getSelectedPaymentDetails = () => {
        if (!clientData.paymentMethod) return null
        const key = paymentKeysMap[clientData.paymentMethod]
        return payments[key]?.details || ''
    }

    const [supabase] = useState(() => getSupabase())

    const handleCheckout = async () => {
        if (!clientData.name || !clientData.phone) return Swal.fire({ title: 'Faltan Datos', text: 'Nombre y teléfono son obligatorios', icon: 'warning', confirmButtonColor: '#000' })
        if (!clientData.paymentMethod) return Swal.fire({ title: 'Método de Pago', text: 'Selecciona cómo deseas pagar', icon: 'warning', confirmButtonColor: '#000' })

        if (clientData.deliveryType === 'pickup' && !clientData.addressDetail) return Swal.fire({ title: 'Punto de Retiro', text: 'Selecciona dónde buscarás tu pedido.', icon: 'warning', confirmButtonColor: '#000' })
        if (clientData.deliveryType === 'courier') {
            if (!clientData.courier) return Swal.fire({ title: 'Envío', text: 'Selecciona una empresa de envío', icon: 'warning', confirmButtonColor: '#000' })
            if (!clientData.state || !clientData.city || !clientData.addressDetail) return Swal.fire({ title: 'Dirección Incompleta', text: 'Llena los campos de Estado, Ciudad y Dirección', icon: 'warning', confirmButtonColor: '#000' })
            if (!clientData.identityCard) return Swal.fire({ title: 'Identificación', text: 'La cédula es requerida para envíos', icon: 'warning', confirmButtonColor: '#000' })
        }
        if (clientData.deliveryType === 'local_delivery' && !selectedDeliveryZone) return Swal.fire({ title: 'Zona de Delivery', text: 'Selecciona la zona a la que enviaremos tu pedido', icon: 'warning', confirmButtonColor: '#000' })

        const requiresReceipt = clientData.paymentMethod !== 'Efectivo' && clientData.paymentMethod !== 'Zelle'
        if (receiptConfig.strict_mode && requiresReceipt && !receiptFile) {
            return Swal.fire({ title: 'Comprobante Requerido', text: 'Por favor, adjunta la captura de tu pago antes de continuar.', icon: 'warning', confirmButtonColor: '#000' })
        }

        setLoading(true)

        try {
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

            let deliveryInfoFull = 'Retiro Personal'
            if (clientData.deliveryType === 'courier') {
                deliveryInfoFull = `${clientData.courier} (Cobro en Destino) - ${clientData.addressDetail}, ${clientData.city}, ${clientData.state}. Ref: ${clientData.reference || 'N/A'} | CI: ${clientData.identityCard} | Tlf: ${clientData.phone}`
            } else if (clientData.deliveryType === 'local_delivery') {
                const zoneName = deliveryZones.find((z: any) => z.id === selectedDeliveryZone)?.name || 'Zona Desconocida'
                deliveryInfoFull = `Delivery a: ${zoneName} - ${clientData.addressDetail}, ${clientData.city}. Ref: ${clientData.reference || 'N/A'} | Tlf: ${clientData.phone}`
            } else if (clientData.deliveryType === 'pickup') {
                deliveryInfoFull = `Punto de Retiro: ${clientData.addressDetail}`
            }

            const { data: order, error: orderError } = await supabase
                .from('orders')
                .insert({
                    store_id: storeId,
                    customer_name: clientData.name,
                    customer_phone: clientData.phone,
                    // 🚀 SANEAMIENTO FINANCIERO: Cortamos la basura binaria
                    total_usd: Number(grandTotalUSD.toFixed(2)),
                    total_bs: Number(grandTotalBs.toFixed(2)),
                    exchange_rate: activeRate,
                    currency_type: currency,
                    status: 'pending',
                    payment_method: clientData.paymentMethod,
                    shipping_method: clientData.deliveryType,
                    delivery_info: deliveryInfoFull,
                    receipt_url: receiptPublicUrl,
                    // 🚀 SANEAMIENTO FINANCIERO
                    shipping_cost: Number(deliveryCost.toFixed(2)),
                    discount_amount: Number((wholesaleDiscountList + cartEngine.listPromoDiscounts).toFixed(2))
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

            // --- WHATSAPP FORMATTING (Clean Receipt) ---
            let message = `*PEDIDO #${order.order_number}*\n`
            message += `------------------------\n`
            message += `*Cliente:* ${clientData.name}\n`
            message += `*Teléfono:* ${clientData.phone}\n\n`

            message += `*CARRITO:*\n`
            cartEngine.processedItems.forEach(item => {
                const priceText = item.finalListPrice < item.listPrice
                    ? `~($${item.listPrice.toFixed(2)})~ *$${item.finalListPrice.toFixed(2)}*`
                    : `($${item.listPrice.toFixed(2)})`
                message += `▫️ ${item.quantity}x ${item.name} ${item.variantInfo ? `(${item.variantInfo})` : ''} ${priceText}\n`
            })

            message += `\n*RESUMEN FINANCIERO:*\n`
            message += `Subtotal Original: $${cartEngine.totalListNominal.toFixed(2)}\n`
            if (cartEngine.listPromoDiscounts > 0) message += `Descuento Promocional: -$${cartEngine.listPromoDiscounts.toFixed(2)}\n`
            if (wholesaleDiscountList > 0) message += `Descuento Mayorista: -$${wholesaleDiscountList.toFixed(2)}\n`
            if (isHardCurrencyPayment && exactFxSavings > 0) message += `Beneficio Divisa: -$${exactFxSavings.toFixed(2)}\n`
            if (deliveryCost > 0) message += `Delivery: +$${deliveryCost.toFixed(2)}\n`
            
            message += `------------------------\n`
            message += `*TOTAL A PAGAR:*\n`
            message += `*USD:* $${grandTotalUSD.toFixed(2)}\n`
            message += `*BS:* Bs ${grandTotalBs.toLocaleString('es-VE', { maximumFractionDigits: 2 })}\n`

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

            const waLink = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
            setWhatsappUrl(waLink)
            setGeneratedOrderNumber(order.order_number)

            clearCart()
            setStep(3)

            setTimeout(() => {
                window.open(waLink, '_blank')
            }, 600)

        } catch (error: any) {
            Swal.fire('Error', error.message, 'error')
        } finally {
            setLoading(false)
        }
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
                    <motion.div initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }} transition={{ type: "spring", stiffness: 300, damping: 30 }} className="fixed bottom-0 left-0 right-0 z-50 bg-white md:hidden flex items-center justify-between px-5 py-3">
                        <div className="flex items-center gap-3 cursor-pointer group" onClick={handleOpenModal}>
                            <div className="relative bg-gray-50 p-2.5 rounded-full group-hover:bg-gray-100 transition-colors">
                                <ShoppingCart size={20} className="text-gray-900 animate-wiggle" strokeWidth={2} />
                                <span className="absolute -top-1 -right-1 bg-black text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full">{totalItemsCount}</span>
                            </div>
                            <div className="flex flex-col items-start cursor-pointer">
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-0.5">Ver Carrito</span>
                                <span className="text-base font-black text-gray-900 tracking-tight">{currencySymbol}{(cartEngine.finalBsModeUSD - wholesaleDiscountList).toFixed(2)}</span>
                            </div>
                        </div>
                        <button onClick={handleOpenModal} className="bg-black text-white px-5 py-2.5 pr-3 rounded-full font-bold text-xs uppercase tracking-wide flex items-center gap-1 active:scale-95 hover:bg-gray-800 transition-all border border-black">
                            Pagar <ArrowUpRight size={18} />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {isOpen && (
                    <div className="fixed inset-0 z-60 flex items-end md:items-stretch justify-end">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleCloseModal} />

                        <motion.div variants={modalVariants} initial="hidden" animate="visible" exit="exit" className="relative bg-[#F8F9FA] w-full md:w-[450px] md:h-full h-[90vh] rounded-t-[32px] md:rounded-none flex flex-col overflow-hidden">

                            {/* HEADER */}
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

                            {/* PROGRESS BAR MAYORISTA */}
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

                            <div className="flex-1 overflow-x-hidden overflow-y-auto scroll-smooth relative no-scrollbar bg-[#F8F9FA]">
                                <AnimatePresence mode="wait">
                                    {step === 1 ? (
                                        <motion.div key="step-1" variants={stepVariants} initial="hidden" animate="enter" exit="exit" className="flex flex-col h-full">
                                           <div className="space-y-0 flex-1">
                                                {cartEngine.processedItems.map((item) => {
                                                    // 🚀 LÓGICA MUTANTE: Si eligió Zelle, la bolsa muta a precios en Divisa. Si no, usa Lista (Bs).
                                                    const activeOriginalPrice = isHardCurrencyPayment ? item.cashPrice : item.listPrice;
                                                    const activeFinalPrice = isHardCurrencyPayment ? item.finalCashPrice : item.finalListPrice;
                                                    const itemTotalBs = activeFinalPrice * item.quantity * activeRate;
                                                    
                                                    return (
                                                        <div key={item.id} className="flex gap-4 p-4 bg-white border-b border-gray-100/60">
                                                            <div className="w-20 h-20 bg-gray-50 rounded-xl overflow-hidden shrink-0 relative border border-gray-100">
                                                                <img src={item.image} className="w-full h-full object-cover mix-blend-multiply" alt={item.name} />
                                                            </div>
                                                            <div className="flex-1 flex flex-col justify-between py-0.5">
                                                                <div>
                                                                    {item.badge && <span className="inline-block text-[9px] font-black text-red-600 bg-red-50 px-2 py-0.5 rounded tracking-widest uppercase mb-1">{item.badge}</span>}
                                                                    <div className="flex justify-between items-start">
                                                                        <h3 className="font-bold text-sm text-gray-900 line-clamp-2 leading-snug pr-2">{item.name}</h3>
                                                                        <button onClick={() => removeItem(item.id)} className="text-gray-400 hover:text-red-500 transition-colors bg-gray-50 p-1.5 rounded-md hover:bg-red-50"><Trash2 size={14} /></button>
                                                                    </div>
                                                                    <p className="text-[11px] text-gray-500 font-medium mt-1">{item.variantInfo || 'Estándar'}</p>
                                                                </div>
                                                                
                                                                <div className="flex items-end justify-between mt-2">
                                                                    <div className="flex flex-col min-w-0">
                                                                        {/* 🚀 PRECIO INTELIGENTE POR LÍNEA */}
                                                                        {activeFinalPrice < activeOriginalPrice ? (
                                                                            <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                                                                                <span className="text-[10px] font-bold text-gray-400 line-through decoration-gray-300">
                                                                                    {currencySymbol}{(activeOriginalPrice * item.quantity).toFixed(2)}
                                                                                </span>
                                                                                <span className="font-black text-base text-red-600 leading-none">
                                                                                    {currencySymbol}{(activeFinalPrice * item.quantity).toFixed(2)}
                                                                                </span>
                                                                            </div>
                                                                        ) : (
                                                                            <span className="font-black text-base text-gray-900 leading-none">
                                                                                {currencySymbol}{(activeOriginalPrice * item.quantity).toFixed(2)}
                                                                            </span>
                                                                        )}
                                                                        <span className="text-[10px] font-mono font-bold text-gray-400 mt-1">
                                                                            Bs {itemTotalBs.toLocaleString('es-VE', { maximumFractionDigits: 2 })}
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
                                                    )
                                                })}
                                            </div>

                                            {/* 🚀 CROSS-SELLING: PRODUCTOS RECOMENDADOS */}
                                        {recommendedProducts.length > 0 && (
                                            <div className="mt-8 border-t p-5 border-gray-100 pt-8 pb-4">
                                                <div className="flex items-center justify-between mb-4">
                                                    <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">Mas para ti</h3>
                                                    <span className="text-[10px] font-bold text-gray-400 uppercase">Sugerencias</span>
                                                </div>
                                               {/* 🚀 SLIDER OPTIMIZADO: items-stretch y [&>div]:h-full sincronizan la altura de todas las tarjetas */}
                                                <div className="flex overflow-x-auto ml-2 gap-4 pb-4 snap-x no-scrollbar -mx-4 px-4 md:-mx-6 md:px-6 items-stretch">
                                                    {recommendedProducts.map(product => {
                                                        const cashPrice = Number(product.usd_cash_price || 0)
                                                        const markup = Number(product.usd_penalty || 0)
                                                        const pricing = { cashPrice, priceInBs: (cashPrice + markup) * activeRate, discountPercent: 0, hasDiscount: markup > 0, listPrice: cashPrice + markup, isPromo: false, compareAt: Number(product.compare_at_usd || 0) }
                                                        return (
                                                            <div key={product.id} className="w-[150px] md:w-[160px] shrink-0 snap-start flex flex-col [&>div]:h-full">
                                                                <ProductCard 
                                                                    product={product} 
                                                                    pricing={pricing} 
                                                                    onOpen={(p) => {
                                                                        setIsOpen(false);
                                                                        document.dispatchEvent(new CustomEvent('openProductModal', { detail: p }));
                                                                    }} 
                                                                />
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                            </div>
                                        )}

                                            {/* 🚀 EL NUDGE MUTANTE (Inteligente según la selección previa) */}
                                            {step === 1 && cartEngine.fxSavingsAmount > 0 && (
                                                <div className="px-4 pb-4 bg-white">
                                                    {!isHardCurrencyPayment ? (
                                                        <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="bg-emerald-50 p-4 rounded-xl flex items-center gap-3">
                                                            <span className="text-emerald-500 text-xl leading-none shrink-0">✨</span>
                                                            <div className="flex flex-col">
                                                                <span className="text-xs font-bold text-gray-900 tracking-wide">Paga en Efectivo o Zelle</span>
                                                                <span className="text-[11px] font-medium text-emerald-800 mt-0.5">
                                                                    Y tu total bajará a <b className="text-emerald-700 ml-0.5 text-sm">{currencySymbol}{(cartEngine.finalCashModeUSD - wholesaleDiscountCash).toFixed(2)}</b>
                                                                </span>
                                                            </div>
                                                        </motion.div>
                                                    ) : (
                                                        <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="bg-emerald-100 p-4 rounded-xl flex items-center justify-between border border-emerald-200/50 shadow-sm">
                                                            <div className="flex items-center gap-3">
                                                                <span className="text-emerald-600 text-xl leading-none shrink-0"><Check size={20} strokeWidth={3} /></span>
                                                                <div className="flex flex-col">
                                                                    <span className="text-xs font-bold text-emerald-900 tracking-wide">¡Ahorro por Divisa Activo!</span>
                                                                    <span className="text-[11px] font-medium text-emerald-700 mt-0.5">
                                                                        Estás ahorrando <b className="text-sm ml-0.5">{currencySymbol}{exactFxSavings.toFixed(2)}</b>
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </motion.div>
                                                    )}
                                                </div>
                                            )}
                                        </motion.div>
                                    ) : step === 2 ? (
                                        <motion.div key="step-2" variants={stepVariants} initial="hidden" animate="enter" exit="exit" className="p-4 md:p-6 space-y-6 pb-10">
                                            
                                            {/* DATOS PERSONALES */}
                                            <div className="bg-white p-5 rounded-2xl space-y-4 border border-gray-100">
                                                <div className="flex items-center gap-2 text-xs font-black text-gray-900 uppercase tracking-widest pb-3 border-b border-gray-50">
                                                    <User size={16} className="text-gray-400" /> Datos Personales
                                                </div>
                                                <div className="grid grid-cols-1 gap-3 pt-1">
                                                    <input value={clientData.name} onChange={e => setClientData({ ...clientData, name: e.target.value })} className="w-full bg-gray-50 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 outline-none focus:bg-gray-100 transition-colors" placeholder="Nombre completo *" />
                                                    <input value={clientData.phone} onChange={e => setClientData({ ...clientData, phone: e.target.value })} className="w-full bg-gray-50 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 outline-none focus:bg-gray-100 transition-colors" placeholder="Teléfono / WhatsApp *" />
                                                </div>
                                            </div>

                                            {/* LOGÍSTICA DE ENVÍO */}
                                            <div className="bg-white p-5 rounded-2xl space-y-5 border border-gray-100">
                                                <div className="flex items-center gap-2 text-xs font-black text-gray-900 uppercase tracking-widest pb-3 border-b border-gray-50">
                                                    <MapPin size={16} className="text-gray-400" /> Entrega
                                                </div>

                                                <div className="grid grid-cols-1 gap-3 pt-1">
                                                    {shipping.methods?.pickup && (
                                                        <div onClick={() => { setClientData({ ...clientData, deliveryType: 'pickup', addressDetail: '' }); setSelectedDeliveryZone('') }} className={`cursor-pointer p-4 rounded-xl transition-colors flex items-start gap-3 ${clientData.deliveryType === 'pickup' ? 'bg-black text-white' : 'bg-gray-50 hover:bg-gray-100 text-gray-900'}`}>
                                                            <Store size={20} className={clientData.deliveryType === 'pickup' ? 'text-white mt-0.5' : 'text-gray-500 mt-0.5'} />
                                                            <div>
                                                                <p className="font-bold text-sm leading-tight">Retiro Personal</p>
                                                                <p className={`text-xs mt-0.5 ${clientData.deliveryType === 'pickup' ? 'text-gray-300' : 'text-gray-500'}`}>Busca tu pedido gratis en tienda.</p>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {shipping.methods?.delivery && deliveryZones.length > 0 && (
                                                        <div onClick={() => setClientData({ ...clientData, deliveryType: 'local_delivery', addressDetail: '' })} className={`cursor-pointer p-4 rounded-xl transition-colors flex items-start gap-3 ${clientData.deliveryType === 'local_delivery' ? 'bg-black text-white' : 'bg-gray-50 hover:bg-gray-100 text-gray-900'}`}>
                                                            <Truck size={20} className={clientData.deliveryType === 'local_delivery' ? 'text-white mt-0.5' : 'text-gray-500 mt-0.5'} />
                                                            <div>
                                                                <p className="font-bold text-sm leading-tight">Delivery Local</p>
                                                                <p className={`text-xs mt-0.5 ${clientData.deliveryType === 'local_delivery' ? 'text-gray-300' : 'text-gray-500'}`}>Entregas a domicilio.</p>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {(shipping.methods?.mrw || shipping.methods?.zoom || shipping.methods?.tealca) && (
                                                        <div onClick={() => { setClientData({ ...clientData, deliveryType: 'courier', addressDetail: '' }); setSelectedDeliveryZone('') }} className={`cursor-pointer p-4 rounded-xl transition-colors flex items-start gap-3 ${clientData.deliveryType === 'courier' ? 'bg-black text-white' : 'bg-gray-50 hover:bg-gray-100 text-gray-900'}`}>
                                                            <Package size={20} className={clientData.deliveryType === 'courier' ? 'text-white mt-0.5' : 'text-gray-500 mt-0.5'} />
                                                            <div>
                                                                <p className="font-bold text-sm leading-tight">Envío Nacional</p>
                                                                <p className={`text-xs mt-0.5 ${clientData.deliveryType === 'courier' ? 'text-gray-300' : 'text-gray-500'}`}>Envíos por agencia.</p>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>

                                                {clientData.deliveryType === 'pickup' && (
                                                    <div className="space-y-3 animate-in fade-in slide-in-from-top-2 pt-2 border-t border-gray-50">
                                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mt-2">¿Dónde lo buscas? *</label>
                                                        <div className="grid gap-2">
                                                            {shipping.main_address && (
                                                                <label className={`flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-colors border ${clientData.addressDetail === shipping.main_address ? 'bg-gray-50 border-gray-200' : 'bg-white border-transparent hover:bg-gray-50'}`}>
                                                                    <input type="radio" name="pickupLocation" className="mt-1 accent-black w-4 h-4" checked={clientData.addressDetail === shipping.main_address} onChange={() => setClientData({ ...clientData, addressDetail: shipping.main_address })} />
                                                                    <div>
                                                                        <p className="font-bold text-sm text-gray-900">Tienda Física</p>
                                                                        <p className="text-xs text-gray-500 mt-0.5">{shipping.main_address}</p>
                                                                    </div>
                                                                </label>
                                                            )}
                                                            {shipping.pickup_locations?.map((loc: string, idx: number) => (
                                                                <label key={idx} className={`flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-colors border ${clientData.addressDetail === loc ? 'bg-gray-50 border-gray-200' : 'bg-white border-transparent hover:bg-gray-50'}`}>
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

                                                {clientData.deliveryType === 'local_delivery' && (
                                                    <div className="space-y-4 animate-in fade-in slide-in-from-top-2 pt-2 border-t border-gray-50">
                                                        <div className="mt-2">
                                                            <label className="text-[10px] font-bold text-gray-400 uppercase mb-2 block tracking-wider">Selecciona tu zona *</label>
                                                            <div className="grid grid-cols-1 gap-2">
                                                                {deliveryZones.map((z: any) => (
                                                                    <button key={z.id} onClick={() => setSelectedDeliveryZone(z.id)} className={`flex justify-between items-center px-4 py-3 rounded-xl transition-colors border ${selectedDeliveryZone === z.id ? 'bg-black text-white border-black' : 'bg-gray-50 text-gray-600 border-transparent hover:bg-gray-100'}`}>
                                                                        <span className="font-bold text-sm">{z.name}</span>
                                                                        <span className="font-black text-sm">+{currencySymbol}{Number(z.cost).toFixed(2)}</span>
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                        {selectedDeliveryZone && (
                                                            <div className="grid grid-cols-1 gap-3 animate-in fade-in pt-2">
                                                                <input value={clientData.addressDetail} onChange={e => setClientData({ ...clientData, addressDetail: e.target.value })} className="w-full bg-gray-50 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 outline-none focus:bg-gray-100 transition-colors" placeholder="Dirección exacta *" />
                                                                <input value={clientData.reference} onChange={e => setClientData({ ...clientData, reference: e.target.value })} className="w-full bg-gray-50 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 outline-none focus:bg-gray-100 transition-colors" placeholder="Punto de referencia (Opcional)" />
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {clientData.deliveryType === 'courier' && (
                                                    <div className="space-y-4 animate-in fade-in slide-in-from-top-2 pt-2 border-t border-gray-50">
                                                        <div className="mt-2">
                                                            <label className="text-[10px] font-bold text-gray-400 uppercase mb-2 block tracking-wider">Agencia de Envío *</label>
                                                            <div className="grid grid-cols-3 gap-2">
                                                                {activeCouriers.map(c => (
                                                                    <button key={c} onClick={() => setClientData({ ...clientData, courier: c })} className={`py-3 rounded-xl text-xs font-bold transition-colors border ${clientData.courier === c ? 'bg-black text-white border-black' : 'bg-gray-50 text-gray-600 border-transparent hover:bg-gray-100'}`}>{c}</button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                        {clientData.courier && (
                                                            <div className="space-y-3 animate-in fade-in pt-2">
                                                                <input value={clientData.identityCard} onChange={e => setClientData({ ...clientData, identityCard: e.target.value })} className="w-full bg-gray-50 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 outline-none focus:bg-gray-100 transition-colors" placeholder="Cédula de Identidad *" />
                                                                <div className="grid grid-cols-2 gap-3">
                                                                    <input value={clientData.state} onChange={e => setClientData({ ...clientData, state: e.target.value })} className="w-full bg-gray-50 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 outline-none focus:bg-gray-100 transition-colors" placeholder="Estado *" />
                                                                    <input value={clientData.city} onChange={e => setClientData({ ...clientData, city: e.target.value })} className="w-full bg-gray-50 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 outline-none focus:bg-gray-100 transition-colors" placeholder="Ciudad *" />
                                                                </div>
                                                                <input value={clientData.addressDetail} onChange={e => setClientData({ ...clientData, addressDetail: e.target.value })} className="w-full bg-gray-50 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 outline-none focus:bg-gray-100 transition-colors" placeholder="Dirección de la Agencia *" />
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            {/* PAGO Y COMPROBANTE */}
                                            <div className="bg-white p-5 rounded-2xl space-y-4 border border-gray-100">
                                                <div className="flex items-center gap-2 text-xs font-black text-gray-900 uppercase tracking-widest pb-3 border-b border-gray-50">
                                                    <CreditCard size={16} className="text-gray-400" /> Método de Pago
                                                </div>

                                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                                                    {activePaymentMethods.length > 0 ? activePaymentMethods.map(pm => {
                                                        const config = getPaymentConfig(pm);
                                                        return (
                                                            <button
                                                                key={pm}
                                                                onClick={() => setClientData({ ...clientData, paymentMethod: pm })}
                                                                className={`flex items-center justify-center gap-2 px-2 py-3 rounded-xl text-[11px] font-bold transition-all duration-200 active:scale-95 border ${clientData.paymentMethod === pm ? config.btnSelected + " border-transparent" : config.btnIdle + " border-transparent"}`}
                                                            >
                                                                <config.icon size={16} className={clientData.paymentMethod === pm ? "scale-110 transition-transform" : ""} /> {pm}
                                                            </button>
                                                        )
                                                    }) : <p className="text-xs text-red-500 font-bold col-span-3">No hay métodos activos.</p>}
                                                </div>

                                                {/* Datos de la cuenta */}
                                                {clientData.paymentMethod && getSelectedPaymentDetails() && (() => {
                                                    const activeConfig = getPaymentConfig(clientData.paymentMethod);
                                                    return (
                                                        <div className={`relative mt-2 overflow-hidden rounded-2xl p-5 animate-in fade-in slide-in-from-top-2 transition-all ${activeConfig.cardBg}`}>
                                                            <div className="absolute -right-6 -bottom-6 opacity-10 -rotate-12 pointer-events-none">
                                                                <activeConfig.icon size={140} />
                                                            </div>
                                                            <div className="relative z-10">
                                                                <div className="flex justify-between items-start mb-4">
                                                                    <p className="text-[10px] font-black uppercase tracking-widest mb-1 opacity-80">Datos de {clientData.paymentMethod}</p>
                                                                    <button onClick={() => handleCopy(getSelectedPaymentDetails() || '')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase transition-colors ${activeConfig.btnCopy}`}>
                                                                        {copied ? <Check size={12} /> : <Copy size={12} />} {copied ? 'Copiado' : 'Copiar'}
                                                                    </button>
                                                                </div>
                                                                <div className={`rounded-xl p-4 backdrop-blur-sm ${activeConfig.cardBox}`}>
                                                                    <p className="font-mono text-xs font-bold leading-relaxed whitespace-pre-wrap">{getSelectedPaymentDetails()}</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })()}

                                                {/* UPLOADER */}
                                                {clientData.paymentMethod && clientData.paymentMethod !== 'Efectivo' && clientData.paymentMethod !== 'Zelle' && (
                                                    <div className="pt-4 animate-in fade-in slide-in-from-top-2 border-t border-gray-50">
                                                        <div className="flex justify-between items-end mb-3 mt-2">
                                                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                                                                Sube tu comprobante {receiptConfig.strict_mode && <span className="text-red-500">*</span>}
                                                            </label>
                                                        </div>

                                                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => {
                                                            if (e.target.files && e.target.files[0]) setReceiptFile(e.target.files[0])
                                                        }} />

                                                        {!receiptFile ? (
                                                            <div onClick={() => fileInputRef.current?.click()} className="w-full h-24 rounded-xl bg-gray-50 hover:bg-gray-100 flex flex-col items-center justify-center cursor-pointer transition-colors">
                                                                <Upload className="text-gray-400 mb-2" size={20} />
                                                                <span className="text-xs font-bold text-gray-600">Haz clic para adjuntar foto</span>
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                                                                <div className="flex items-center gap-3 overflow-hidden">
                                                                    <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shrink-0 border border-gray-200/60"><ImageIcon size={18} className="text-gray-500" /></div>
                                                                    <div className="min-w-0">
                                                                        <p className="text-xs font-bold text-gray-900 truncate">{receiptFile.name}</p>
                                                                        <p className="text-[10px] font-medium text-emerald-600 uppercase">Adjunto listo</p>
                                                                    </div>
                                                                </div>
                                                                <button onClick={() => setReceiptFile(null)} className="p-2 text-gray-400 hover:text-red-500 transition-colors shrink-0 active:scale-95"><Trash2 size={18} /></button>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </motion.div>
                                    ) : (
                                        /* 🚀 PASO 3: ÉXITO */
                                        <motion.div key="step-3" variants={stepVariants} initial="hidden" animate="enter" exit="exit" className="p-6 md:p-10 flex flex-col items-center justify-center h-full text-center space-y-6">
                                            <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center shrink-0">
                                                <Check size={40} className="text-emerald-500" strokeWidth={3} />
                                            </div>
                                            <div>
                                                <h2 className="text-2xl font-black text-gray-900 mb-2">¡Pedido #{generatedOrderNumber}!</h2>
                                                <p className="text-gray-500 text-sm leading-relaxed max-w-xs mx-auto">
                                                    Tu orden ha sido guardada. Si WhatsApp no se abrió automáticamente, presiona el botón abajo para enviarnos tu comprobante.
                                                </p>
                                            </div>
                                            <div className="w-full flex flex-col gap-3 pt-4">
                                                <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="w-full bg-[#25D366] text-white px-6 py-4 rounded-xl font-bold text-sm hover:bg-[#1ebd5a] transition-all flex items-center justify-center gap-2 active:scale-95 border border-[#1ebd5a]">
                                                    <MessageCircle size={18} /> Enviar a WhatsApp
                                                </a>
                                                <button onClick={handleCloseModal} className="w-full bg-white text-gray-900 px-6 py-4 rounded-xl font-bold text-sm hover:bg-gray-50 transition-all active:scale-95 border border-gray-200">
                                                    Volver a la Tienda
                                                </button>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            {/* FOOTER TOTALES (Paso 1 y 2) */}
                            {step !== 3 && (
                                <div className="bg-white px-5 py-5 shrink-0 z-20 border-t border-gray-100">
                                    <div className="flex flex-col gap-4">
                                        
                                        {/* 🚀 EL RECIBO TRANSPARENTE (Solo en Checkout) */}
                                        {step === 2 && (
                                            <div className="flex flex-col gap-2 mb-2 pb-4 bg-white rounded-2xl border-b border-gray-50">
                                                <div className="flex justify-between text-xs text-gray-500 font-medium">
                                                    <span>Subtotal (Precio de Lista)</span>
                                                    <span className={cartEngine.listPromoDiscounts > 0 ? "line-through decoration-gray-300" : ""}>
                                                        {currencySymbol}{cartEngine.totalListNominal.toFixed(2)}
                                                    </span>
                                                </div>

                                                {cartEngine.listPromoDiscounts > 0 && (
                                                    <div className="flex justify-between text-xs text-red-600 font-black animate-in fade-in">
                                                        <span>Descuento de Campaña</span>
                                                        <span>-{currencySymbol}{cartEngine.listPromoDiscounts.toFixed(2)}</span>
                                                    </div>
                                                )}

                                                <div className="flex justify-between text-xs text-gray-900 font-black mt-1 border-t border-gray-50 pt-2">
                                                    <span>Subtotal</span>
                                                    <span>{currencySymbol} {(cartEngine.finalBsModeUSD).toFixed(2)}</span>
                                                </div>

                                                {isWholesaleActive && (
                                                    <div className="flex justify-between text-xs text-emerald-600 font-black">
                                                        <span>Descuento Mayorista ({wholesale.discount_percentage}%)</span>
                                                        <span>-{currencySymbol}{wholesaleDiscountList.toFixed(2)}</span>
                                                    </div>
                                                )}

                                                <AnimatePresence>
                                                    {isHardCurrencyPayment && exactFxSavings > 0 && (
                                                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="flex justify-between text-xs text-emerald-600 font-black pt-1">
                                                            <span>Descuento Pago en Divisa</span>
                                                            <span>-{currencySymbol}{exactFxSavings.toFixed(2)}</span>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>

                                                {deliveryCost > 0 && (
                                                    <div className="flex justify-between text-xs text-gray-900 font-bold mt-1">
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
                                                <button onClick={() => setStep(2)} className="flex-1 bg-black text-white px-8 py-3.5 rounded-full font-bold text-sm hover:bg-gray-800 transition-all active:scale-95 flex items-center justify-center gap-2 border border-black">
                                                    Ir al Checkout <ChevronRight size={16} />
                                                </button>
                                            ) : (
                                                <button onClick={handleCheckout} disabled={loading} className="flex-1 bg-black text-white px-6 py-3.5 rounded-full font-bold text-sm hover:bg-gray-800 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed border border-black">
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