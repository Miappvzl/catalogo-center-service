'use client'

import React, { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { getSupabase } from '@/lib/supabase-client'
import {
    Search,
    Plus,
    Minus,
    FileText,
    User,
    Phone,
    ShoppingBag,
    X,
    Loader2,
    DollarSign,
    Truck,
    Store,
    MapPin,
    Hash,
    Package,
    Banknote,
    ChevronDown,
    PenSquare,
    Receipt,
    Check,
    ArrowLeft,
} from 'lucide-react'
import Image from 'next/image'
import { calculateCartEngine } from '@/utils/cartLogic'
import { NumberInput } from '@/components/NumberInput'
import { feedback } from '@/app/store/useFeedBackStore'
import PrezisoFeedbackProvider from '@/components/ui/PrezisoFeedbackProvider'
import PhoneInput from '@/components/ui/PhoneInput'
// --- TIPOS ESTRICTOS (Sincronizados con Catálogo) ---
type Variant = {
    id: string
    size: string
    color_name: string
    stock: number
    override_usd_price: number | null
    override_usd_penalty: number | null
}

type Product = {
    id: number
    name: string
    image_url: string
    usd_cash_price: number
    usd_penalty: number
    stock: number
    is_tax_exempt?: boolean
    wholesale_active?: boolean
    wholesale_min_qty?: number
    wholesale_discount_pct?: number
    product_variants: Variant[]
}

type CartItem = {
    cartId: string
    productId: number | null
    variantId?: string
    name: string
    variantInfo?: string
    basePrice: number
    penalty: number
    qty: number
    maxStock: number
    image: string
    isTaxExempt: boolean
    productWholesaleActive?: boolean
    productWholesaleMinQty?: number
    productWholesaleDiscountPct?: number
}

export default function POSPage() {



    const DNI_PREFIXES = ['V', 'J', 'E', 'G', 'P']

    const supabase = getSupabase()

    const [loading, setLoading] = useState(true)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [store, setStore] = useState<any>(null)
    const [rates, setRates] = useState({ usd_rate: 0, eur_rate: 0 })
    const [products, setProducts] = useState<Product[]>([])

    // CEREBRO DE MARKETING B2B
    const [promotions, setPromotions] = useState<any[]>([])
    const [wholesale, setWholesale] = useState({ active: false, min_items: 6, discount_percentage: 15 })

    // UI & RESPONSIVE
    const [searchQuery, setSearchQuery] = useState('')
    const [isMobileCartOpen, setIsMobileCartOpen] = useState(false)
    const [selectedProductForVariant, setSelectedProductForVariant] = useState<Product | null>(null)
    const [isCustomerPanelOpen, setIsCustomerPanelOpen] = useState(false)

    // ÍTEMS PERSONALIZADOS
    const [isCustomItemModalOpen, setIsCustomItemModalOpen] = useState(false)
    const [customItem, setCustomItem] = useState({ name: '', price: '' })

    // CARRITO
    const [cart, setCart] = useState<CartItem[]>([])

// DATOS FISCALES Y DE CONTACTO DEL CLIENTE
    const [customerName, setCustomerName] = useState('')
    const [customerPhone, setCustomerPhone] = useState('')
    const [dniPrefix, setDniPrefix] = useState('V')
    const [isDniPrefixOpen, setIsDniPrefixOpen] = useState(false)
    const [customerDNI, setCustomerDNI] = useState('')
    const [customerAddress, setCustomerAddress] = useState('')

    // Sanitizador de CI / RIF: solo números limpios sin duplicar la letra
    const handleDniChange = (rawValue: string) => {
        const cleaned = rawValue.replace(/^[VJEGvjepg][-]?/i, '').replace(/[^0-9]/g, '')
        setCustomerDNI(cleaned.slice(0, 10))
    }

 
    const [shippingMethod, setShippingMethod] = useState<'pickup' | 'local_delivery' | 'courier'>('pickup')
    const [shippingAddress, setShippingAddress] = useState('')

    // MODO DE OPERACIÓN E IMPUESTOS
    const [operationMode, setOperationMode] = useState<'paid' | 'quote'>('paid')
    const [documentType, setDocumentType] = useState<'invoice' | 'note'>('note')
    const [applyTax, setApplyTax] = useState(false)
    const [taxPercentage, setTaxPercentage] = useState(16)

    // PAGOS Y PREFERENCIAS DE PROFORMA
    const [activePaymentMethods, setActivePaymentMethods] = useState<string[]>([])
    const [quoteAllowedMethods, setQuoteAllowedMethods] = useState<string[]>([])
    const [savedQuoteDefaults, setSavedQuoteDefaults] = useState<string[] | null>(null)
    const [isSavingQuoteDefaults, setIsSavingQuoteDefaults] = useState(false)
    const [selectedPayment, setSelectedPayment] = useState<string>('')
    const [customPayment, setCustomPayment] = useState('')
    const [paymentReference, setPaymentReference] = useState('')

    useEffect(() => {
        const initPOS = async () => {
            const {
                data: { user },
            } = await supabase.auth.getUser()
            if (!user) return

            const [storeRes, productsRes, ratesRes] = await Promise.all([
                supabase
                    .from('stores')
                    .select(
                        'id, slug, name, payment_config, shipping_config, wholesale_config, currency_type, default_tax_active, default_tax_percentage, fiscal_profile, legal_name, legal_id, fiscal_address'
                    )
                    .eq('user_id', user.id)
                    .single(),
                supabase
                    .from('products')
                    .select(
                        'id, name, image_url, usd_cash_price, usd_penalty, stock, is_tax_exempt, wholesale_active, wholesale_min_qty, wholesale_discount_pct, product_variants(id, size, color_name, stock, override_usd_price, override_usd_penalty)'
                    )
                    .eq('user_id', user.id)
                    .eq('status', 'active'),
                supabase.from('app_config').select('usd_rate, eur_rate').single(),
            ])

            if (storeRes.data) {
                setStore(storeRes.data)
                if (storeRes.data.wholesale_config) setWholesale(storeRes.data.wholesale_config)

                const { data: promos } = await supabase
                    .from('promotions')
                    .select('*')
                    .eq('store_id', storeRes.data.id)
                    .eq('is_active', true)
                if (promos) setPromotions(promos)

                const fiscalProfile = storeRes.data.fiscal_profile || 'informal'
                const mustApplyTax = fiscalProfile === 'ordinary' || fiscalProfile === 'special'

                setApplyTax(mustApplyTax)
                setDocumentType(mustApplyTax ? 'invoice' : 'note')
                setTaxPercentage(storeRes.data.default_tax_percentage ?? 16)

                const pConfig = storeRes.data.payment_config || {}
                const pm: string[] = []
                if (pConfig.cash?.active) pm.push('Efectivo')
                if (pConfig.pago_movil?.active) pm.push('Pago Móvil')
                if (pConfig.transferencia?.active) pm.push('Transferencia')
                if (pConfig.zelle?.active) pm.push('Zelle')
                if (pConfig.binance?.active) pm.push('Binance')
                if (pConfig.zinli?.active) pm.push('Zinli')
                if (pConfig.wally?.active) pm.push('WallyTech')

                setActivePaymentMethods(pm)
            

                // Hidratar métodos por defecto de Proforma (Desde BD o LocalStorage)
                let storedDefaults: string[] | null = null
                if (Array.isArray(pConfig.quote_default_methods)) {
                    storedDefaults = pConfig.quote_default_methods.filter((m: string) =>
                        pm.includes(m)
                    )
                } else {
                    try {
                        const localRaw = localStorage.getItem(
                            `preziso_quote_defaults_${storeRes.data.id}`
                        )
                        if (localRaw) {
                            const parsed = JSON.parse(localRaw)
                            if (Array.isArray(parsed)) {
                                storedDefaults = parsed.filter((m: string) => pm.includes(m))
                            }
                        }
                    } catch { }
                }

                if (storedDefaults && storedDefaults.length > 0) {
                    setSavedQuoteDefaults(storedDefaults)
                    setQuoteAllowedMethods(storedDefaults)
                } else {
                    // Si aún no ha escogido métodos por defecto, inicia vacío para mostrar el recuadro guía
                    setSavedQuoteDefaults(null)
                    setQuoteAllowedMethods([])
                }
            }
            if (productsRes.data) setProducts(productsRes.data as Product[])
            if (ratesRes.data) setRates(ratesRes.data)

            setLoading(false)
        }
        initPOS()
    }, [supabase])

    // Guarda los métodos seleccionados actualmente como predeterminados para todas las proformas futuras
    const handleSaveQuoteDefaults = async () => {
        if (!store?.id || quoteAllowedMethods.length === 0) return
        setIsSavingQuoteDefaults(true)
        try {
            localStorage.setItem(
                `preziso_quote_defaults_${store.id}`,
                JSON.stringify(quoteAllowedMethods)
            )
            const updatedPaymentConfig = {
                ...(store.payment_config || {}),
                quote_default_methods: quoteAllowedMethods,
            }
            await supabase
                .from('stores')
                .update({ payment_config: updatedPaymentConfig })
                .eq('id', store.id)

            setStore((prev: any) => ({ ...prev, payment_config: updatedPaymentConfig }))
            setSavedQuoteDefaults([...quoteAllowedMethods])
            feedback.toast.success(
                'Preferencia guardada',
                'Estos métodos se activarán por defecto en tus próximas proformas.'
            )
        } catch {
            feedback.toast.error('No se pudo guardar', 'Intenta fijar tu preferencia nuevamente.')
        } finally {
            setIsSavingQuoteDefaults(false)
        }
    }

    // Verifica si la selección actual de la proforma difiere de la guardada por defecto
    const hasUnsavedQuoteDefaultChanges = useMemo(() => {
        if (quoteAllowedMethods.length === 0) return false
        if (!savedQuoteDefaults) return true
        if (savedQuoteDefaults.length !== quoteAllowedMethods.length) return true
        return !quoteAllowedMethods.every((m) => savedQuoteDefaults.includes(m))
    }, [quoteAllowedMethods, savedQuoteDefaults])

    // Productos filtrados y priorizados (Con stock primero para acelerar al cajero)
    const filteredProducts = useMemo(() => {
        const getStock = (p: Product) =>
            p.product_variants?.length > 0
                ? p.product_variants.reduce((acc, v) => acc + v.stock, 0)
                : p.stock

        return products
            .filter((p) => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
            .sort((a, b) => {
                const aAvailable = getStock(a) > 0
                const bAvailable = getStock(b) > 0
                if (aAvailable !== bAvailable) return aAvailable ? -1 : 1
                return 0
            })
    }, [products, searchQuery])

    // Mapa rápido de cantidades en el carrito por producto para feedback visual en el catálogo
    const productQtyInCartMap = useMemo(() => {
        const map: Record<number, number> = {}
        cart.forEach((item) => {
            if (item.productId !== null) {
                map[item.productId] = (map[item.productId] || 0) + (Number(item.qty) || 0)
            }
        })
        return map
    }, [cart])

    // MOTOR MATEMÁTICO INDUSTRIAL
    const isEur = store?.currency_type === 'eur'
    const currencySymbol = isEur ? '€' : '$'
    const activeRate = isEur ? rates.eur_rate : rates.usd_rate

    const totalItemsCount = useMemo(
        () => cart.reduce((acc, item) => acc + (Number(item.qty) || 0), 0),
        [cart]
    )

    const cartEngine = useMemo(() => {
        const normalizedCart = cart.map((item) => ({
            ...item,
            quantity: Number(item.qty) || 0,
        }))

        return calculateCartEngine(normalizedCart, promotions, applyTax, wholesale)
    }, [cart, promotions, applyTax, wholesale])

    const { wholesaleDiscountList, wholesaleDiscountCash } = cartEngine
    const isWholesaleActive = wholesale.active && totalItemsCount >= wholesale.min_items

    // En modo Proforma ('quote'), el cliente aún no ha pagado; siempre se cotiza sobre Precio Base (Lista)
    const isHardCurrency =
        operationMode === 'paid' &&
        ['Zelle', 'Binance', 'Zinli', 'WallyTech', 'Efectivo'].includes(selectedPayment)

    const subtotalListUSD = Math.max(0, cartEngine.finalBsModeUSD - wholesaleDiscountList)
    const subtotalCashUSD = Math.max(0, cartEngine.finalCashModeUSD - wholesaleDiscountCash)

    // CÁLCULO ESTRICTO DE IVA (Separado por modo Lista vs Divisas)
    const discountMultiplier = isWholesaleActive ? 1 - wholesale.discount_percentage / 100 : 1
    const taxListUSD = applyTax
        ? cartEngine.taxableSubtotalList * discountMultiplier * (taxPercentage / 100)
        : 0
    const taxCashUSD = applyTax
        ? cartEngine.taxableSubtotalCash * discountMultiplier * (taxPercentage / 100)
        : 0
    const taxAmountUSD = isHardCurrency ? taxCashUSD : taxListUSD

    // TOTALES FINALES
    const totalUSD = (isHardCurrency ? subtotalCashUSD : subtotalListUSD) + taxAmountUSD
    const totalCashWithTaxUSD = subtotalCashUSD + taxCashUSD
    const totalBS = (subtotalListUSD + taxListUSD) * activeRate

    const actualFxSavings = Math.max(0, subtotalListUSD - subtotalCashUSD)
    const hasQuoteHardCurrencyOption = quoteAllowedMethods.some((m) =>
        ['Zelle', 'Binance', 'Zinli', 'WallyTech', 'Efectivo'].includes(m)
    )

    // Determina si los datos del cliente son obligatorios según el modo fiscal/proforma
    const isCustomerRequired =
        operationMode === 'quote' || (operationMode === 'paid' && documentType === 'invoice')

    // Auto-abrir el panel de cliente si pasa a ser obligatorio
    useEffect(() => {
        if (isCustomerRequired) {
            setIsCustomerPanelOpen(true)
        }
    }, [isCustomerRequired])

    const handleAddCustomItem = (e: React.FormEvent) => {
        e.preventDefault()
        if (!customItem.name || !customItem.price) return

        const cartId = `custom-${Date.now()}`
        setCart((prev) => [
            ...prev,
            {
                cartId,
                productId: null,
                name: customItem.name.trim(),
                variantInfo: 'Concepto manual',
                basePrice: Number(customItem.price),
                penalty: 0,
                qty: 1,
                maxStock: 9999999,
                image: '',
                isTaxExempt: false,
                productWholesaleActive: false,
                productWholesaleMinQty: 0,
                productWholesaleDiscountPct: 0,
            },
        ])

        setCustomItem({ name: '', price: '' })
        setIsCustomItemModalOpen(false)
    }

    const handleAddToCart = (product: Product, variant?: Variant) => {
        const cartId = variant ? `${product.id}-${variant.id}` : `${product.id}`
        const basePrice = variant?.override_usd_price ?? product.usd_cash_price
        const penalty = variant?.override_usd_penalty ?? product.usd_penalty ?? 0
        const variantInfo = variant ? `${variant.color_name || ''} ${variant.size || ''}`.trim() : undefined
        const maxStock = variant ? variant.stock : product.stock
        const isTaxExempt = product.is_tax_exempt || false

        const existingItem = cart.find((item) => item.cartId === cartId)
        if (existingItem && existingItem.qty >= maxStock) {
            feedback.toast.warning(
                'Stock máximo alcanzado',
                'No hay más unidades disponibles en inventario.'
            )
            setSelectedProductForVariant(null)
            return
        }

        setCart((prev) => {
            const existing = prev.find((item) => item.cartId === cartId)
            if (existing) {
                return prev.map((item) =>
                    item.cartId === cartId ? { ...item, qty: item.qty + 1 } : item
                )
            }
            return [
                ...prev,
                {
                    cartId,
                    productId: product.id,
                    variantId: String(variant?.id || ''),
                    name: product.name,
                    variantInfo,
                    basePrice,
                    penalty,
                    qty: 1,
                    maxStock,
                    image: product.image_url,
                    isTaxExempt,
                    productWholesaleActive: product.wholesale_active || false,
                    productWholesaleMinQty: Number(product.wholesale_min_qty || 6),
                    productWholesaleDiscountPct: Number(product.wholesale_discount_pct || 0),
                },
            ]
        })
        setSelectedProductForVariant(null)
    }

    const updateQty = (cartId: string, delta: number) => {
        setCart((prev) =>
            prev.map((item) => {
                if (item.cartId === cartId) {
                    const newQty = item.qty + delta
                    if (newQty > 0 && newQty <= item.maxStock) return { ...item, qty: newQty }
                }
                return item
            })
        )
    }

    const removeLine = (cartId: string) =>
        setCart((prev) => prev.filter((item) => item.cartId !== cartId))

    // --- LÓGICA DE INPUT MANUAL ---
    const handleManualQty = (cartId: string, value: number) => {
        const targetItem = cart.find((item) => item.cartId === cartId)
        if (targetItem && value > targetItem.maxStock) {
            feedback.toast.info(
                'Límite de stock',
                `Solo hay ${targetItem.maxStock} unidades disponibles.`
            )
        }

        setCart((prev) =>
            prev.map((item) => {
                if (item.cartId === cartId) {
                    if (value === 0) return { ...item, qty: '' as any }
                    if (value > item.maxStock) return { ...item, qty: item.maxStock }
                    return { ...item, qty: value }
                }
                return item
            })
        )
    }

    const handleBlurQty = (cartId: string) => {
        setCart((prev) =>
            prev.map((item) => {
                if (item.cartId === cartId) {
                    if (!item.qty || (item.qty as any) < 1) return { ...item, qty: 1 }
                }
                return item
            })
        )
    }

    // --- TRANSACT ENGINE (100% Nativo con PrezisoFeedbackProvider) ---
    const handleCheckout = async (type: 'paid' | 'quote') => {
        const requiresFullLegalData =
            type === 'quote' || (type === 'paid' && documentType === 'invoice')

 if (requiresFullLegalData) {
            const missingFields: string[] = []
            if (!customerName.trim()) missingFields.push('Nombre o Razón Social')
            if (!customerDNI.trim()) missingFields.push('CI / RIF')
            if (!customerPhone.trim() || customerPhone.replace(/\D/g, '').length < 10)
                missingFields.push('Teléfono de contacto válido')
            if (!customerAddress.trim()) missingFields.push('Dirección Fiscal')
            if (shippingMethod !== 'pickup' && !shippingAddress.trim())
                missingFields.push('Dirección de entrega')

            if (missingFields.length > 0) {
                setIsCustomerPanelOpen(true)
                await feedback.confirm({
                    eyebrow: type === 'quote' ? '[ PROFORMA COMERCIAL ]' : '[ FACTURA FISCAL ]',
                    title:
                        type === 'quote'
                            ? 'Datos obligatorios para Proforma'
                            : 'Datos fiscales incompletos',
                    description: `Para emitir este documento legalmente, por favor completa: ${missingFields.join(', ')}.`,
                    confirmText: 'Completar datos',
                    variant: 'warning',
                    icon: 'alert',
                })
                return
            }
        }

        if (type === 'paid' && !selectedPayment) {
            feedback.toast.warning(
                'Selecciona el método de cobro',
                'Indica con qué método pagó el cliente para registrar la venta.'
            )
            return
        }

        if (selectedPayment === 'Otro' && !customPayment.trim() && type === 'paid') {
            feedback.toast.warning(
                'Método requerido',
                'Especifica qué método de pago utilizó el cliente.'
            )
            return
        }

        setIsSubmitting(true)
        try {
            const finalPaymentMethod =
                type === 'quote'
                    ? quoteAllowedMethods.join(',')
                    : selectedPayment === 'Otro'
                        ? customPayment.trim()
                        : selectedPayment
                        if (type === 'quote' && quoteAllowedMethods.length === 0) {
            feedback.toast.warning(
                'Habilita un método de pago',
                'Selecciona al menos una pasarela de pago para generar la proforma.'
            )
            return
        }
            let deliveryInfoFull =
                shippingMethod === 'pickup'
                    ? 'Venta en Mostrador / Retiro Personal'
                    : `Envío a: ${shippingAddress || customerAddress}`
            if (paymentReference && type === 'paid')
                deliveryInfoFull += ` | Ref: ${paymentReference}`

       const formattedFullPhone = customerPhone.trim() || null
            const formattedFullDNI = customerDNI.trim()
                ? `${dniPrefix}-${customerDNI.trim()}`
                : null
          

            const { data: order, error: orderError } = await supabase
                .from('orders')
                .insert({
                    store_id: store.id,
                    customer_name: customerName.trim() || 'Cliente Mostrador',
                    customer_phone: formattedFullPhone,
                    customer_dni: formattedFullDNI,
                    customer_address: customerAddress.trim() || null,
                    document_type: type === 'quote' ? 'quote' : documentType,
                    is_tax_applied: applyTax,
                    subtotal_usd: Number(
                        (isHardCurrency ? subtotalCashUSD : subtotalListUSD).toFixed(2)
                    ),
                    tax_amount_usd: Number(taxAmountUSD.toFixed(2)),
                    total_usd: Number(totalUSD.toFixed(2)),
                    total_bs: type === 'paid' ? Number(totalBS.toFixed(2)) : null,
                    iva_retention_pct: 0,
                    iva_retention_usd: 0,
                    liquid_amount_usd: Number(totalUSD.toFixed(2)),
                    promo_discount_usd: Number(cartEngine.listPromoDiscounts.toFixed(2)),
                    wholesale_discount_usd: Number(wholesaleDiscountList.toFixed(2)),
                    affiliate_discount_usd: 0,
                    fx_savings_usd: isHardCurrency ? Number(actualFxSavings.toFixed(2)) : 0,
                    exchange_rate: type === 'paid' ? activeRate : null,
                    status: type,
                    is_quote: type === 'quote',
                    source: 'pos',
                    payment_method: finalPaymentMethod,
                    shipping_method: shippingMethod,
                    delivery_info: deliveryInfoFull,
                    currency_type: isEur ? 'eur' : 'usd',
                })
                .select('id, order_number')
                .single()

            if (orderError) throw orderError

            const orderItemsPayload = cartEngine.processedItems.map((item) => ({
                order_id: order.id,
                product_id: item.productId,
                variant_id: item.variantId || null,
                product_name: item.name,
                variant_info: item.variantInfo || null,
                quantity: item.qty,
                price_at_purchase: isHardCurrency ? item.finalCashPrice : item.finalListPrice,
            }))

            const { error: itemsError } = await supabase
                .from('order_items')
                .insert(orderItemsPayload)
            if (itemsError) throw new Error('Error al guardar los artículos.')

            const purchasedSnapshot = [...cart]

            setCart([])
            setSelectedPayment('')
            setCustomerName('')
            setCustomerPhone('')
            setPaymentReference('')
            setCustomPayment('')
            setCustomerDNI('')
            setCustomerAddress('')
            setShippingAddress('')
            setIsMobileCartOpen(false)
            // 🚀 Liberamos el estado de carga inmediatamente tras guardar en BD
            setIsSubmitting(false)

            const documentUrl = `${window.location.protocol}//${store.slug}.${window.location.host.replace('www.', '')}/quote/${order.id}`
            if (type === 'quote') {
                const shouldCopy = await feedback.confirm({
                    eyebrow: '[ PROFORMA EMITIDA ]',
                    title: `Proforma #${order.order_number} generada`,
                    description: `El documento comercial ha sido creado con éxito. Copia el enlace para compartirlo con el cliente: ${documentUrl}`,
                    confirmText: 'Copiar enlace',
                    cancelText: 'Cerrar',
                    variant: 'default',
                    icon: 'info',
                })

                if (shouldCopy) {
                    await navigator.clipboard.writeText(documentUrl)
                    feedback.toast.success(
                        'Enlace copiado',
                        'El enlace de la proforma está listo en tu portapapeles.'
                    )
                }
            } else {
                setProducts((prev) =>
                    prev.map((p) => {
                        const updated = { ...p }
                        purchasedSnapshot.forEach((c) => {
                            if (c.productId === p.id) {
                                if (c.variantId)
                                    updated.product_variants = updated.product_variants.map((v) =>
                                        v.id === c.variantId
                                            ? { ...v, stock: v.stock - Number(c.qty) }
                                            : v
                                    )
                                else updated.stock = updated.stock - Number(c.qty)
                            }
                        })
                        return updated
                    })
                )

                const shouldOpenReceipt = await feedback.confirm({
                    eyebrow: '[ VENTA PROCESADA ]',
                    title: `Orden #${order.order_number} registrada`,
                    description:
                        'El cobro y el ajuste de inventario se guardaron correctamente. ¿Deseas abrir el recibo imprimible?',
                    confirmText: 'Ver recibo',
                    cancelText: 'Nueva venta',
                    variant: 'default',
                    icon: 'dollar',
                })

                if (shouldOpenReceipt) {
                    window.open(documentUrl, '_blank')
                }
            }
        } catch (error: any) {
            console.error('ERROR FATAL AL INSERTAR:', error)
            await feedback.confirm({
                eyebrow: '[ ERROR DE SISTEMA ]',
                title: 'No se pudo procesar la operación',
                description:
                    error.message ||
                    'Ocurrió un inconveniente al guardar el registro. Verifica tu conexión e intenta de nuevo.',
                confirmText: 'Entendido',
                variant: 'danger',
                icon: 'alert',
            })
        } finally {
            setIsSubmitting(false)
        }
    }

    if (loading) {
        return (
            <div className="h-[100dvh] flex items-center justify-center bg-[#FAFAFC]">
                <Loader2 className="animate-spin text-neutral-400" size={24} strokeWidth={1.8} />
            </div>
        )
    }

    return (
        <div className="h-[100dvh] bg-[#FAFAFC] flex flex-col md:flex-row overflow-hidden font-sans text-neutral-950 selection:bg-neutral-900 selection:text-white">
            {/* ===================================================================== */}
            {/* PANEL IZQUIERDO: CATÁLOGO DE ALTA VELOCIDAD                           */}
            {/* ===================================================================== */}
            <div className="flex-1 flex flex-col min-w-0 w-full h-full relative z-10 bg-[#FAFAFC]">
                {/* Header Técnico de Búsqueda */}
                {/* Header Técnico de Búsqueda + Salida Intuitiva en Mobile */}
                <header className="px-4 py-3.5 md:px-6 md:py-4 bg-white border-b border-neutral-200/80 shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center justify-between sm:justify-start gap-2.5">
                        <div className="flex items-center gap-2.5 min-w-0">
                            {/* Botón de retorno a Inicio en Mobile/Tablet (sustituye la barra inferior oculta) */}
                            <Link
                                href="/admin"
                                className="lg:hidden h-9 px-2.5 rounded-lg bg-[#FAFAFC] hover:bg-neutral-100 border border-neutral-200/90 text-neutral-800 flex items-center gap-1.5 text-xs font-medium transition-colors active:scale-95 shrink-0"
                                title="Volver al panel de inicio"
                            >
                                <ArrowLeft size={14} strokeWidth={2} />
                                <span>Inicio</span>
                            </Link>

                            <div className="min-w-0">
                                <h1 className="text-base md:text-lg font-semibold tracking-tight text-neutral-950 leading-none truncate">
                                    Punto de Venta
                                </h1>
                                <p className="text-[11px] text-neutral-500 mt-1 font-normal truncate">
                                    <span className="font-mono tabular-nums">
                                        {filteredProducts.length}
                                    </span>{' '}
                                    {filteredProducts.length === 1 ? 'producto' : 'productos'} ·
                                    BCV:{' '}
                                    <span className="font-mono tabular-nums font-medium text-neutral-700">
                                        Bs. {activeRate.toFixed(2)}
                                    </span>
                                </p>
                            </div>
                        </div>

                        {/* Botón rápido de concepto manual visible en móvil arriba a la derecha */}
                        <button
                            type="button"
                            onClick={() => setIsCustomItemModalOpen(true)}
                            className="sm:hidden h-9 px-3 rounded-lg bg-neutral-100 hover:bg-neutral-200/70 text-neutral-800 text-xs font-medium flex items-center gap-1.5 transition-colors active:scale-95 shrink-0"
                        >
                            <PenSquare size={14} strokeWidth={1.8} />
                            <span>Manual</span>
                        </button>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:max-w-md lg:max-w-lg">
                        <div className="relative flex-1 min-w-0">
                            <Search
                                className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none"
                                size={15}
                                strokeWidth={1.8}
                            />
                            <input
                                type="text"
                                placeholder="Buscar producto por nombre..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full h-10 pl-9 pr-8 bg-[#FAFAFC] border border-neutral-200/90 rounded-lg text-xs font-normal text-neutral-950 placeholder:text-neutral-400 focus:bg-white focus:border-neutral-900 outline-none transition-colors"
                            />
                            {searchQuery && (
                                <button
                                    type="button"
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 p-0.5"
                                >
                                    <X size={13} strokeWidth={2} />
                                </button>
                            )}
                        </div>

                        <button
                            type="button"
                            onClick={() => setIsCustomItemModalOpen(true)}
                            className="hidden sm:inline-flex shrink-0 h-10 px-3.5 bg-white border border-neutral-200/90 hover:border-neutral-400 text-neutral-800 rounded-lg font-medium text-xs items-center gap-2 transition-colors active:scale-[0.98] cursor-pointer"
                        >
                            <PenSquare size={14} strokeWidth={1.8} />
                            <span>Concepto manual</span>
                        </button>
                    </div>
                </header>

                {/* Cuadrícula de Productos con Altura Matemática Reservada (Cero Dientes de Sierra) */}
                <div className="flex-1 overflow-y-auto px-4 md:px-6 pt-4 pb-28 md:pb-6 no-scrollbar">
                    {filteredProducts.length === 0 ? (
                        <div className="h-64 flex flex-col items-center justify-center text-center">
                            <Package size={28} strokeWidth={1.5} className="text-neutral-300 mb-2" />
                            <p className="text-sm font-medium text-neutral-600">
                                No se encontraron productos
                            </p>
                            <p className="text-xs text-neutral-400 mt-0.5">
                                Intenta con otro término o agrega un concepto manual.
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5 md:gap-3.5">
                            {filteredProducts.map((product) => {
                                const totalStock =
                                    product.product_variants?.length > 0
                                        ? product.product_variants.reduce((acc, v) => acc + v.stock, 0)
                                        : product.stock
                                const isOutOfStock = totalStock <= 0
                                const hasVariants =
                                    product.product_variants && product.product_variants.length > 0
                                const qtyInCart = productQtyInCartMap[product.id] || 0
                                const displayPrice = isHardCurrency
                                    ? product.usd_cash_price
                                    : product.usd_cash_price + (product.usd_penalty || 0)

                                return (
                                    <button
                                        key={product.id}
                                        type="button"
                                        onClick={() => {
                                            if (hasVariants) setSelectedProductForVariant(product)
                                            else handleAddToCart(product)
                                        }}
                                        disabled={isOutOfStock}
                                        className={`group relative flex flex-col text-left bg-white rounded-xl p-2.5 transition-all duration-150 border select-none ${isOutOfStock
                                                ? 'opacity-45 grayscale cursor-not-allowed border-neutral-200/60'
                                                : qtyInCart > 0
                                                    ? 'border-neutral-900 ring-1 ring-neutral-900/10 active:scale-[0.98] cursor-pointer'
                                                    : 'border-neutral-200/80 hover:border-neutral-400 active:scale-[0.98] cursor-pointer'
                                            }`}
                                    >
                                        {/* Contenedor de Imagen 1:1 con Radio Anidado Óptico (rounded-xl - p-2.5 -> rounded-lg) */}
                                        <div className="w-full aspect-square rounded-lg bg-neutral-100/70 overflow-hidden mb-2.5 relative border border-neutral-100">
                                            {product.image_url ? (
                                                <Image
                                                    src={product.image_url}
                                                    alt={product.name}
                                                    fill
                                                    className="object-cover group-hover:scale-[1.03] transition-transform duration-300"
                                                    sizes="(max-width: 768px) 50vw, 200px"
                                                />
                                            ) : (
                                                <ShoppingBag
                                                    className="absolute inset-0 m-auto text-neutral-300"
                                                    size={20}
                                                    strokeWidth={1.5}
                                                />
                                            )}

                                            {/* Indicador de cantidad ya agregada al ticket */}
                                            {qtyInCart > 0 && !isOutOfStock && (
                                                <div className="absolute top-1.5 right-1.5 bg-neutral-950 text-white text-[10px] font-mono tabular-nums font-semibold px-2 py-0.5 rounded-md">
                                                    {qtyInCart} en ticket
                                                </div>
                                            )}

                                            {/* Indicador de Variantes */}
                                            {hasVariants && !isOutOfStock && (
                                                <div className="absolute bottom-1.5 left-1.5 bg-white/90 backdrop-blur-md text-neutral-800 border border-neutral-200/80 text-[9px] font-mono font-medium px-1.5 py-0.5 rounded">
                                                    {product.product_variants.length} opc.
                                                </div>
                                            )}

                                            {isOutOfStock && (
                                                <div className="absolute inset-0 bg-white/75 flex items-center justify-center backdrop-blur-[1px]">
                                                    <span className="bg-neutral-900 text-white text-[10px] font-mono font-medium px-2 py-0.5 rounded uppercase tracking-wider">
                                                        Agotado
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Título con altura reservada de 2 líneas para alineación perfecta */}
                                        <h3 className="font-medium text-neutral-900 text-xs leading-snug line-clamp-2 min-h-[2.25rem] w-full mb-2">
                                            {product.name}
                                        </h3>

                                        {/* Pie de Tarjeta con Precio y Stock Tabular */}
                                        <div className="flex items-center justify-between mt-auto w-full pt-2 border-t border-neutral-100">
                                            <span className="text-neutral-950 font-mono font-semibold text-xs md:text-sm tabular-nums">
                                                {currencySymbol}
                                                {displayPrice.toFixed(2)}
                                            </span>
                                            <span
                                                className={`text-[10px] font-mono tabular-nums px-1.5 py-0.5 rounded ${totalStock <= 3 && totalStock > 0
                                                        ? 'bg-amber-50 text-amber-800 border border-amber-200/60'
                                                        : 'text-neutral-500 bg-neutral-100/80'
                                                    }`}
                                            >
                                                {totalStock} disp.
                                            </span>
                                        </div>
                                    </button>
                                )
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* ===================================================================== */}
            {/* BARRA FLOTANTE MOBILE (ERGONOMÍA DEL PULGAR + SAFE AREA)              */}
            {/* ===================================================================== */}
            <AnimatePresence>
                {!isMobileCartOpen && cart.length > 0 && (
                    <motion.div
                        initial={{ y: 80, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 80, opacity: 0 }}
                        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                        className="md:hidden fixed bottom-4 left-4 right-4 z-40 pb-[env(safe-area-inset-bottom)]"
                    >
                        <button
                            type="button"
                            onClick={() => setIsMobileCartOpen(true)}
                            className="w-full h-14 bg-neutral-950 text-white px-4 rounded-xl flex items-center justify-between active:scale-[0.98] transition-transform border border-neutral-800"
                        >
                            <div className="flex items-center gap-3">
                                <div className="bg-white/15 px-2.5 py-1 rounded-lg font-mono text-xs font-semibold tabular-nums">
                                    {totalItemsCount} {totalItemsCount === 1 ? 'ítem' : 'ítems'}
                                </div>
                                <span className="text-xs font-medium text-neutral-200">
                                    Revisar ticket y cobrar
                                </span>
                            </div>
                            <div className="text-right">
                                <span className="block text-sm font-mono font-semibold tabular-nums leading-none">
                                    {currencySymbol}
                                    {totalUSD.toFixed(2)}
                                </span>
                                <span className="block text-[10px] font-mono tabular-nums text-neutral-400 mt-0.5">
                                    Bs.{' '}
                                    {totalBS.toLocaleString('es-VE', {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2,
                                    })}
                                </span>
                            </div>
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* OVERLAY MOBILE */}
            <AnimatePresence>
                {isMobileCartOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="md:hidden fixed inset-0 bg-black/40 backdrop-blur-xs z-40"
                        onClick={() => setIsMobileCartOpen(false)}
                    />
                )}
            </AnimatePresence>

            {/* ===================================================================== */}
            {/* PANEL DERECHO: TERMINAL DE CAJA Y FACTURACIÓN                         */}
            {/* ===================================================================== */}
            <aside
                className={`fixed inset-x-0 bottom-0 h-[92dvh] md:relative md:h-full z-50 md:z-20 w-full md:w-[390px] lg:w-[430px] bg-white border-l border-neutral-200/80 flex flex-col shrink-0 rounded-t-2xl md:rounded-none transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${isMobileCartOpen ? 'translate-y-0' : 'translate-y-full md:translate-y-0'
                    }`}
            >
                {/* Agarre Táctil Mobile */}
                <div
                    className="flex md:hidden justify-center pt-2.5 pb-1 shrink-0 cursor-pointer"
                    onClick={() => setIsMobileCartOpen(false)}
                >
                    <div className="w-9 h-1 bg-neutral-300 rounded-full" />
                </div>

                {/* CABECERA FIJA DE LA CAJA + SELECTOR DE OPERACIÓN */}
                <div className="px-5 pt-3 md:pt-4 pb-3 border-b border-neutral-200/80 shrink-0 space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <h2 className="font-semibold text-base text-neutral-950 tracking-tight">
                                Terminal de Caja
                            </h2>
                            <span className="text-[11px] font-mono tabular-nums px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-700 font-medium">
                                {totalItemsCount}
                            </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                            {cart.length > 0 && (
                                <button
                                    type="button"
                                    onClick={() => setCart([])}
                                    className="text-[11px] font-medium text-neutral-400 hover:text-red-600 px-2 py-1 rounded-md hover:bg-red-50 transition-colors cursor-pointer"
                                    title="Vaciar ticket"
                                >
                                    Vaciar
                                </button>
                            )}
                            <button
                                type="button"
                                className="md:hidden p-1.5 rounded-lg text-neutral-500 hover:text-neutral-950 hover:bg-neutral-100 transition-colors"
                                onClick={() => setIsMobileCartOpen(false)}
                            >
                                <ChevronDown size={18} strokeWidth={2} />
                            </button>
                        </div>
                    </div>

                    {/* Control Segmentado de Intención: Venta vs Proforma */}
                    <div className="bg-neutral-100 p-1 rounded-xl grid grid-cols-2 gap-1">
                        <button
                            type="button"
                            onClick={() => setOperationMode('paid')}
                            className={`h-8 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer ${operationMode === 'paid'
                                    ? 'bg-white text-neutral-950 font-semibold border border-neutral-200/80'
                                    : 'text-neutral-600 hover:text-neutral-950'
                                }`}
                        >
                            <Banknote size={14} strokeWidth={1.8} />
                            <span>Venta directa</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setOperationMode('quote')}
                            className={`h-8 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer ${operationMode === 'quote'
                                    ? 'bg-white text-neutral-950 font-semibold border border-neutral-200/80'
                                    : 'text-neutral-600 hover:text-neutral-950'
                                }`}
                        >
                            <FileText size={14} strokeWidth={1.8} />
                            <span>Proforma</span>
                        </button>
                    </div>
                </div>

                {/* CUERPO SCROLLABLE DE LA CAJA */}
                <div className="flex-1 overflow-y-auto px-5 py-4 no-scrollbar space-y-5">
                    {/* 1. LISTA DE ARTÍCULOS DEL TICKET (PROTAGONISTA INMEDIATO) */}
                    <div>
                        {cart.length === 0 ? (
                            <div className="py-10 px-4 flex flex-col items-center justify-center text-center bg-[#FAFAFC] rounded-xl border border-dashed border-neutral-200">
                                <Receipt
                                    size={22}
                                    className="mb-2 text-neutral-300"
                                    strokeWidth={1.5}
                                />
                                <p className="font-medium text-xs text-neutral-600">
                                    El ticket está vacío
                                </p>
                                <p className="text-[11px] text-neutral-400 mt-0.5">
                                    Selecciona productos del catálogo para comenzar.
                                </p>
                            </div>
                        ) : (
                            <div className="divide-y divide-neutral-100 border border-neutral-200/80 rounded-xl bg-white overflow-hidden">
                                <AnimatePresence initial={false}>
                                    {cart.map((item) => {
                                        const activeUnitPrice = isHardCurrency
                                            ? item.basePrice
                                            : item.basePrice + item.penalty
                                        const activeLineTotal =
                                            activeUnitPrice * (Number(item.qty) || 0)

                                        return (
                                            <motion.div
                                                key={item.cartId}
                                                layout
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                exit={{ opacity: 0 }}
                                                className="p-3 flex items-center gap-3 hover:bg-[#FAFAFC] transition-colors"
                                            >
                                                <div className="w-11 h-11 bg-neutral-100 rounded-lg overflow-hidden shrink-0 border border-neutral-200/60 relative">
                                                    {item.image ? (
                                                        <Image
                                                            src={item.image}
                                                            alt={item.name}
                                                            fill
                                                            className="object-cover"
                                                            sizes="44px"
                                                        />
                                                    ) : (
                                                        <ShoppingBag
                                                            className="absolute inset-0 m-auto text-neutral-300"
                                                            size={15}
                                                            strokeWidth={1.5}
                                                        />
                                                    )}
                                                </div>

                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-start justify-between gap-2">
                                                        <h4 className="font-medium text-xs text-neutral-950 truncate leading-snug">
                                                            {item.name}
                                                        </h4>
                                                        <button
                                                            type="button"
                                                            onClick={() => removeLine(item.cartId)}
                                                            className="text-neutral-300 hover:text-red-600 transition-colors p-0.5 shrink-0 cursor-pointer"
                                                            title="Quitar línea"
                                                        >
                                                            <X size={13} strokeWidth={2} />
                                                        </button>
                                                    </div>

                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        {item.variantInfo && (
                                                            <span className="text-[11px] text-neutral-500 truncate">
                                                                {item.variantInfo}
                                                            </span>
                                                        )}
                                                        <span className="text-[11px] font-mono tabular-nums text-neutral-400">
                                                            {currencySymbol}
                                                            {activeUnitPrice.toFixed(2)} c/u
                                                        </span>
                                                    </div>

                                                    <div className="flex items-center justify-between mt-2">
                                                        {/* Stepper de Cantidad de Precisión */}
                                                        <div className="inline-flex items-center bg-neutral-100/80 border border-neutral-200/80 rounded-lg p-0.5 focus-within:border-neutral-900 focus-within:bg-white transition-colors">
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    updateQty(item.cartId, -1)
                                                                }
                                                                className="w-6 h-6 shrink-0 flex items-center justify-center rounded-md text-neutral-600 hover:bg-white hover:text-neutral-950 transition-colors cursor-pointer"
                                                            >
                                                                <Minus size={11} strokeWidth={2} />
                                                            </button>
                                                            <NumberInput
                                                                value={item.qty}
                                                                onChangeValue={(val) =>
                                                                    handleManualQty(item.cartId, val)
                                                                }
                                                                onBlur={() =>
                                                                    handleBlurQty(item.cartId)
                                                                }
                                                                className="w-9 text-center text-xs font-mono font-semibold tabular-nums bg-transparent border-none outline-none focus:ring-0 p-0 m-0 text-neutral-950"
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    updateQty(item.cartId, 1)
                                                                }
                                                                disabled={item.qty >= item.maxStock}
                                                                className="w-6 h-6 shrink-0 flex items-center justify-center rounded-md text-neutral-600 hover:bg-white hover:text-neutral-950 transition-colors disabled:opacity-30 cursor-pointer"
                                                            >
                                                                <Plus size={11} strokeWidth={2} />
                                                            </button>
                                                        </div>

                                                        <span className="text-xs font-mono font-semibold tabular-nums text-neutral-950">
                                                            {currencySymbol}
                                                            {activeLineTotal.toFixed(2)}
                                                        </span>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )
                                    })}
                                </AnimatePresence>
                            </div>
                        )}
                    </div>

                 {/* 2. MÉTODO DE PAGO / PASARELAS EN PROFORMA */}
                    {cart.length > 0 && (
                        <div>
                           {operationMode === 'paid' ? (
                                /* RECUADRO SUTIL SIEMPRE ACTIVO EN VENTA DIRECTA */
                                <div className="p-3.5 rounded-xl bg-[#FAFAFC] border border-neutral-200/90 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-medium text-neutral-800">
                                            Método de cobro
                                        </span>
                                        {!selectedPayment ? (
                                            <span className="text-[10px] font-mono text-amber-700 bg-amber-50 border border-amber-200/70 px-1.5 py-0.5 rounded">
                                                Seleccionar
                                            </span>
                                        ) : (
                                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white border border-neutral-200/80 text-neutral-600">
                                                {isHardCurrency ? 'Tarifa Divisas' : 'Tarifa BCV'}
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex flex-wrap gap-1.5">
                                        {[...activePaymentMethods, 'Otro'].map((pm) => {
                                            const active = selectedPayment === pm
                                            return (
                                                <button
                                                    key={pm}
                                                    type="button"
                                                    onClick={() => setSelectedPayment(pm)}
                                                    className={`h-8 px-3 rounded-lg text-xs font-medium transition-colors border cursor-pointer active:scale-[0.98] ${
                                                        active
                                                            ? 'bg-neutral-950 text-white border-neutral-950'
                                                            : 'bg-white text-neutral-700 border-neutral-200/90 hover:border-neutral-400'
                                                    }`}
                                                >
                                                    {pm}
                                                </button>
                                            )
                                        })}
                                    </div>

                                    <div className="grid grid-cols-1 gap-2 pt-0.5">
                                        {selectedPayment === 'Otro' && (
                                            <input
                                                type="text"
                                                placeholder="Especificar método (ej. PayPal, Punto de Venta)"
                                                value={customPayment}
                                                onChange={(e) => setCustomPayment(e.target.value)}
                                                className="w-full h-9 px-3 bg-white border border-neutral-200 rounded-lg text-xs text-neutral-950 outline-none focus:border-neutral-900 transition-colors"
                                            />
                                        )}
                                        <div className="relative">
                                            <Hash
                                                className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
                                                size={13}
                                            />
                                            <input
                                                type="text"
                                                placeholder="N° de referencia o nota de cobro (opcional)"
                                                value={paymentReference}
                                                onChange={(e) =>
                                                    setPaymentReference(e.target.value)
                                                }
                                                className="w-full h-9 pl-8 pr-3 bg-white border border-neutral-200 rounded-lg text-xs font-mono text-neutral-950 placeholder:font-sans placeholder:text-neutral-400 outline-none focus:border-neutral-900 transition-colors"
                                            />
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                /* PROFORMA: RECUADRO DISCRETO ACTIVO ANTES DE FIJAR PREDETERMINADOS */
                                <div
                                    className={`transition-all duration-200 space-y-2.5 ${
                                        !savedQuoteDefaults || quoteAllowedMethods.length === 0
                                            ? 'p-3.5 rounded-xl bg-[#FAFAFC] border border-neutral-200/90'
                                            : 'py-1'
                                    }`}
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-medium text-neutral-800">
                                                    Pasarelas en proforma
                                                </span>
                                                {!savedQuoteDefaults && (
                                                    <span className="text-[10px] font-mono text-amber-700 bg-amber-50 border border-amber-200/70 px-1.5 py-0.5 rounded">
                                                        Habilitar
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-[11px] text-neutral-400 mt-0.5 leading-snug">
                                                {!savedQuoteDefaults
                                                    ? 'Activa los métodos que aceptas y fíjalos para no repetir este paso.'
                                                    : 'Métodos visibles para el cliente en este enlace.'}
                                            </p>
                                        </div>

                                        {/* Acción in-situ para fijar o actualizar los métodos predeterminados */}
                                        {hasUnsavedQuoteDefaultChanges ? (
                                            <button
                                                type="button"
                                                disabled={isSavingQuoteDefaults}
                                                onClick={handleSaveQuoteDefaults}
                                                className="shrink-0 h-7 px-2.5 rounded-lg bg-neutral-950 text-white hover:bg-neutral-800 text-[11px] font-medium flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                                            >
                                                {isSavingQuoteDefaults ? (
                                                    <Loader2 size={11} className="animate-spin" />
                                                ) : (
                                                    <Check size={11} strokeWidth={2.5} />
                                                )}
                                                <span>Fijar por defecto</span>
                                            </button>
                                        ) : (
                                            savedQuoteDefaults &&
                                            quoteAllowedMethods.length > 0 && (
                                                <span className="shrink-0 text-[10px] font-mono text-neutral-400 flex items-center gap-1 pt-0.5">
                                                    <Check size={11} className="text-emerald-600" />
                                                    <span>Por defecto</span>
                                                </span>
                                            )
                                        )}
                                    </div>

                                    <div className="flex flex-wrap gap-1.5">
                                        {activePaymentMethods.map((pm) => {
                                            const isSelected = quoteAllowedMethods.includes(pm)
                                            return (
                                                <button
                                                    key={pm}
                                                    type="button"
                                                    onClick={() => {
                                                        if (isSelected)
                                                            setQuoteAllowedMethods((prev) =>
                                                                prev.filter((m) => m !== pm)
                                                            )
                                                        else
                                                            setQuoteAllowedMethods((prev) => [
                                                                ...prev,
                                                                pm,
                                                            ])
                                                    }}
                                                    className={`h-8 px-3 rounded-lg text-xs font-medium transition-colors border flex items-center gap-1.5 cursor-pointer active:scale-[0.98] ${
                                                        isSelected
                                                            ? 'bg-neutral-950 text-white border-neutral-950'
                                                            : 'bg-white text-neutral-500 border-neutral-200/90 hover:border-neutral-400 hover:text-neutral-800'
                                                    }`}
                                                >
                                                    {isSelected && (
                                                        <Check size={12} strokeWidth={2.2} />
                                                    )}
                                                    <span>{pm}</span>
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* 3. CLIENTE, FACTURACIÓN Y ENTREGA (DIVULGACIÓN PROGRESIVA) */}
                    <div className="border border-neutral-200/80 rounded-xl bg-[#FAFAFC] overflow-hidden">
                        <button
                            type="button"
                            onClick={() => setIsCustomerPanelOpen((prev) => !prev)}
                            className="w-full px-3.5 py-2.5 flex items-center justify-between text-left hover:bg-neutral-100/60 transition-colors cursor-pointer"
                        >
                            <div className="flex items-center gap-2 min-w-0">
                                <User size={14} strokeWidth={1.8} className="text-neutral-500 shrink-0" />
                                <div className="truncate">
                                    <span className="text-xs font-medium text-neutral-900">
                                        {customerName.trim()
                                            ? customerName
                                            : 'Datos del cliente y entrega'}
                                    </span>
                                    {isCustomerRequired ? (
                                        <span className="ml-2 text-[10px] font-mono font-medium text-amber-700 bg-amber-50 border border-amber-200/70 px-1.5 py-0.5 rounded">
                                            Requerido
                                        </span>
                                    ) : (
                                        <span className="ml-1.5 text-[11px] text-neutral-400">
                                            (Opcional)
                                        </span>
                                    )}
                                </div>
                            </div>
                            <ChevronDown
                                size={15}
                                className={`text-neutral-400 transition-transform duration-200 ${isCustomerPanelOpen ? 'rotate-180' : ''
                                    }`}
                            />
                        </button>

                        <AnimatePresence initial={false}>
                            {isCustomerPanelOpen && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                                    className="overflow-hidden"
                                >
                                    <div className="p-3.5 pt-2.5 border-t border-neutral-200/60 space-y-3 bg-white">
                                        {/* Selector de Tipo de Documento cuando la tienda es formal */}
                                        {operationMode === 'paid' &&
                                            store?.fiscal_profile !== 'informal' && (
                                                <div className="flex items-center justify-between gap-2 pb-1">
                                                    <span className="text-[11px] text-neutral-500">
                                                        Documento a emitir
                                                    </span>
                                                    <div className="inline-flex bg-neutral-100 p-0.5 rounded-lg border border-neutral-200/70">
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                setDocumentType('invoice')
                                                            }
                                                            className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${documentType === 'invoice'
                                                                    ? 'bg-white text-neutral-950 shadow-2xs'
                                                                    : 'text-neutral-500'
                                                                }`}
                                                        >
                                                            Factura Fiscal
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setDocumentType('note')}
                                                            className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${documentType === 'note'
                                                                    ? 'bg-white text-neutral-950 shadow-2xs'
                                                                    : 'text-neutral-500'
                                                                }`}
                                                        >
                                                            Nota de entrega
                                                        </button>
                                                    </div>
                                                </div>
                                            )}

                                        {/* FILA 1: NOMBRE / RAZÓN SOCIAL */}
                                        <div>
                                            <label className="text-[11px] font-medium text-neutral-600 mb-1 block">
                                                Nombre o Razón Social{' '}
                                                {isCustomerRequired && (
                                                    <span className="text-amber-600">*</span>
                                                )}
                                            </label>
                                            <div className="relative">
                                                <User
                                                    className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
                                                    size={13}
                                                />
                                                <input
                                                    type="text"
                                                    placeholder="Ej. Inversiones Preziso C.A. o Juan Pérez"
                                                    value={customerName}
                                                    onChange={(e) =>
                                                        setCustomerName(e.target.value)
                                                    }
                                                    className={`w-full h-9 pl-8 pr-3 bg-[#FAFAFC] rounded-lg text-xs text-neutral-950 placeholder:text-neutral-400 outline-none focus:bg-white focus:border-neutral-900 transition-colors border ${isCustomerRequired && !customerName.trim()
                                                            ? 'border-amber-300'
                                                            : 'border-neutral-200'
                                                        }`}
                                                />
                                            </div>
                                        </div>

                                     {/* FILA 2: TELÉFONO / WHATSAPP (COMPONENTE UNIFICADO) */}
                                        <div>
                                            <label className="text-[11px] font-medium text-neutral-600 mb-1 block">
                                                Teléfono / WhatsApp{' '}
                                                {isCustomerRequired && (
                                                    <span className="text-amber-600">*</span>
                                                )}
                                            </label>
                                            <PhoneInput
                                                variant="boxed"
                                                required={false}
                                                value={customerPhone}
                                                onChange={(fullPhone) =>
                                                    setCustomerPhone(fullPhone)
                                                }
                                            />
                                        </div>
                                        {/* FILA 3: DOCUMENTO FISCAL (CI / RIF) CON SELECTOR PERSONALIZADO */}
                                        <div>
                                            <label className="text-[11px] font-medium text-neutral-600 mb-1 block">
                                                Documento de Identidad / RIF{' '}
                                                {isCustomerRequired && (
                                                    <span className="text-amber-600">*</span>
                                                )}
                                            </label>
                                            <div className="flex items-center gap-1.5 relative">
                                                <div className="relative shrink-0">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setIsDniPrefixOpen((prev) => !prev)
                                                        }}
                                                        className="h-9 px-2.5 bg-[#FAFAFC] hover:bg-neutral-100 border border-neutral-200 rounded-lg flex items-center gap-1 text-xs font-mono font-semibold text-neutral-900 transition-colors cursor-pointer"
                                                    >
                                                        <span>{dniPrefix}-</span>
                                                        <ChevronDown
                                                            size={12}
                                                            className={`text-neutral-400 transition-transform ${isDniPrefixOpen ? 'rotate-180' : ''
                                                                }`}
                                                        />
                                                    </button>

                                                    <AnimatePresence>
                                                        {isDniPrefixOpen && (
                                                            <motion.div
                                                                initial={{
                                                                    opacity: 0,
                                                                    y: 4,
                                                                    scale: 0.98,
                                                                }}
                                                                animate={{
                                                                    opacity: 1,
                                                                    y: 0,
                                                                    scale: 1,
                                                                }}
                                                                exit={{
                                                                    opacity: 0,
                                                                    y: 4,
                                                                    scale: 0.98,
                                                                }}
                                                                transition={{ duration: 0.15 }}
                                                                className="absolute left-0 mt-1 w-24 bg-white border border-neutral-200 rounded-xl p-1 shadow-[0_12px_30px_rgba(0,0,0,0.12)] z-50"
                                                            >
                                                                {DNI_PREFIXES.map((pref) => (
                                                                    <button
                                                                        key={pref}
                                                                        type="button"
                                                                        onClick={() => {
                                                                            setDniPrefix(pref)
                                                                            setIsDniPrefixOpen(
                                                                                false
                                                                            )
                                                                        }}
                                                                        className={`w-full px-2.5 py-1.5 rounded-lg text-left text-xs font-mono flex items-center justify-between transition-colors cursor-pointer ${dniPrefix === pref
                                                                                ? 'bg-neutral-950 text-white font-semibold'
                                                                                : 'text-neutral-800 hover:bg-neutral-100'
                                                                            }`}
                                                                    >
                                                                        <span>{pref}-</span>
                                                                        {dniPrefix === pref && (
                                                                            <Check size={11} />
                                                                        )}
                                                                    </button>
                                                                ))}
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>
                                                </div>

                                                <input
                                                    type="text"
                                                    inputMode="numeric"
                                                    placeholder="123456789"
                                                    value={customerDNI}
                                                    onChange={(e) =>
                                                        handleDniChange(e.target.value)
                                                    }
                                                    className={`flex-1 min-w-0 h-9 px-3 bg-[#FAFAFC] rounded-lg text-xs font-mono tabular-nums text-neutral-950 placeholder:font-sans placeholder:text-neutral-400 outline-none focus:bg-white focus:border-neutral-900 transition-colors border ${isCustomerRequired && !customerDNI.trim()
                                                            ? 'border-amber-300'
                                                            : 'border-neutral-200'
                                                        }`}
                                                />
                                            </div>
                                        </div>

                                        {/* FILA 4: DIRECCIÓN FISCAL */}
                                        <div>
                                            <label className="text-[11px] font-medium text-neutral-600 mb-1 block">
                                                Dirección Fiscal{' '}
                                                {isCustomerRequired && (
                                                    <span className="text-amber-600">*</span>
                                                )}
                                            </label>
                                            <div className="relative">
                                                <MapPin
                                                    className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
                                                    size={13}
                                                />
                                                <input
                                                    type="text"
                                                    placeholder="Av. / Calle, Edificio, Ciudad, Estado"
                                                    value={customerAddress}
                                                    onChange={(e) =>
                                                        setCustomerAddress(e.target.value)
                                                    }
                                                    className={`w-full h-9 pl-8 pr-3 bg-[#FAFAFC] rounded-lg text-xs text-neutral-950 placeholder:text-neutral-400 outline-none focus:bg-white focus:border-neutral-900 transition-colors border ${isCustomerRequired &&
                                                            !customerAddress.trim()
                                                            ? 'border-amber-300'
                                                            : 'border-neutral-200'
                                                        }`}
                                                />
                                            </div>
                                        </div>

                                        {/* Modalidad de Entrega */}
                                        <div className="pt-1">
                                            <span className="text-[11px] text-neutral-500 block mb-1.5">
                                                Modalidad de entrega
                                            </span>
                                            <div className="grid grid-cols-3 gap-1 bg-neutral-100 p-1 rounded-lg">
                                                <button
                                                    type="button"
                                                    onClick={() => setShippingMethod('pickup')}
                                                    className={`h-7 rounded-md text-[11px] font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${shippingMethod === 'pickup'
                                                            ? 'bg-white text-neutral-950 font-semibold shadow-2xs'
                                                            : 'text-neutral-600'
                                                        }`}
                                                >
                                                    <Store size={12} />
                                                    <span>Mostrador</span>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setShippingMethod('local_delivery')
                                                    }
                                                    className={`h-7 rounded-md text-[11px] font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${shippingMethod === 'local_delivery'
                                                            ? 'bg-white text-neutral-950 font-semibold shadow-2xs'
                                                            : 'text-neutral-600'
                                                        }`}
                                                >
                                                    <Truck size={12} />
                                                    <span>Delivery</span>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setShippingMethod('courier')}
                                                    className={`h-7 rounded-md text-[11px] font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${shippingMethod === 'courier'
                                                            ? 'bg-white text-neutral-950 font-semibold shadow-2xs'
                                                            : 'text-neutral-600'
                                                        }`}
                                                >
                                                    <Package size={12} />
                                                    <span>Encomienda</span>
                                                </button>
                                            </div>

                                            {shippingMethod !== 'pickup' && (
                                                <div className="relative mt-2">
                                                    <MapPin
                                                        className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
                                                        size={13}
                                                    />
                                                    <input
                                                        type="text"
                                                        placeholder={
                                                            isCustomerRequired
                                                                ? 'Dirección o agencia de destino *'
                                                                : 'Dirección o agencia de destino'
                                                        }
                                                        value={shippingAddress}
                                                        onChange={(e) =>
                                                            setShippingAddress(e.target.value)
                                                        }
                                                        className={`w-full h-9 pl-8 pr-3 bg-[#FAFAFC] rounded-lg text-xs text-neutral-950 outline-none focus:bg-white focus:border-neutral-900 transition-colors border ${isCustomerRequired &&
                                                                !shippingAddress.trim()
                                                                ? 'border-amber-300'
                                                                : 'border-neutral-200'
                                                            }`}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {/* ===================================================================== */}
                {/* FOOTER FINANCIERO FIJO (PRECISIÓN TABULAR + ACCIÓN PRIMARIA)          */}
                {/* ===================================================================== */}
                <div className="shrink-0 bg-white border-t border-neutral-200/80 px-5 pt-3.5 pb-[calc(1rem+env(safe-area-inset-bottom))] z-30">
                    <div className="space-y-1.5 mb-3">
                        <div className="flex justify-between text-xs text-neutral-500">
                            <span>Subtotal</span>
                            <span className="font-mono tabular-nums text-neutral-800">
                                {currencySymbol}
                                {(isHardCurrency
                                    ? cartEngine.totalCashNominal
                                    : cartEngine.totalListNominal
                                ).toFixed(2)}
                            </span>
                        </div>

                        {(cartEngine.listPromoDiscounts > 0 ||
                            wholesaleDiscountList > 0 ||
                            (isHardCurrency && actualFxSavings > 0)) && (
                                <div className="space-y-1">
                                    {(isHardCurrency
                                        ? cartEngine.cashPromoDiscounts
                                        : cartEngine.listPromoDiscounts) > 0 && (
                                            <div className="flex justify-between items-center text-xs text-emerald-700">
                                                <span>Descuento promocional</span>
                                                <span className="font-mono tabular-nums font-medium">
                                                    -{currencySymbol}
                                                    {(isHardCurrency
                                                        ? cartEngine.cashPromoDiscounts
                                                        : cartEngine.listPromoDiscounts
                                                    ).toFixed(2)}
                                                </span>
                                            </div>
                                        )}
                                    {(isHardCurrency
                                        ? wholesaleDiscountCash
                                        : wholesaleDiscountList) > 0 && (
                                            <div className="flex justify-between items-center text-xs text-emerald-700">
                                                <span>Descuento mayorista</span>
                                                <span className="font-mono tabular-nums font-medium">
                                                    -{currencySymbol}
                                                    {(isHardCurrency
                                                        ? wholesaleDiscountCash
                                                        : wholesaleDiscountList
                                                    ).toFixed(2)}
                                                </span>
                                            </div>
                                        )}
                                    {isHardCurrency && actualFxSavings > 0 && (
                                        <div className="flex justify-between items-center text-xs text-emerald-700">
                                            <span>Ahorro pago en divisas</span>
                                            <span className="font-mono tabular-nums font-medium">
                                                -{currencySymbol}
                                                {actualFxSavings.toFixed(2)}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            )}

                        {/* Aviso Discreto en Modo Proforma cuando existen productos con incentivo en divisas */}
                        {operationMode === 'quote' &&
                            actualFxSavings > 0 &&
                            hasQuoteHardCurrencyOption && (
                                <div className="mt-2 px-2.5 py-2 rounded-lg bg-emerald-50/70 border border-emerald-200/60 flex items-center justify-between gap-2">
                                    <span className="text-[11px] text-emerald-900 leading-tight">
                                        Incentivo en divisas disponible al pagar
                                    </span>
                                    <span className="text-[11px] font-mono tabular-nums font-semibold text-emerald-800 shrink-0">
                                        -{currencySymbol}
                                        {actualFxSavings.toFixed(2)} ({currencySymbol}
                                        {totalCashWithTaxUSD.toFixed(2)})
                                    </span>
                                </div>
                            )}

                        <div className="flex justify-between items-center text-xs text-neutral-500">
                            <span>
                                I.V.A.{' '}
                                {applyTax ? `(${taxPercentage}%)` : '(Exento / No aplica)'}
                            </span>
                            <span className="font-mono tabular-nums text-neutral-800">
                                {applyTax
                                    ? `+${currencySymbol}${taxAmountUSD.toFixed(2)}`
                                    : `${currencySymbol}0.00`}
                            </span>
                        </div>
                    </div>

                    {/* Bloque Dual de Totales ($ / Bs BCV) */}
                    <div className="p-3 rounded-xl bg-[#FAFAFC] border border-neutral-200/80 mb-3 flex items-center justify-between gap-2">
                        <div>
                            <span className="text-[11px] font-medium text-neutral-500 block">
                                Total a cobrar
                            </span>
                            <span className="text-2xl font-mono font-bold tabular-nums tracking-tight text-neutral-950 leading-tight">
                                {currencySymbol}
                                {totalUSD.toFixed(2)}
                            </span>
                        </div>

                        <div className="text-right">
                            <span className="text-[10px] font-mono text-neutral-400 block">
                                Equivalente BCV ({activeRate.toFixed(2)})
                            </span>
                            <span className="text-sm font-mono font-semibold tabular-nums text-neutral-800">
                                Bs.{' '}
                                {totalBS.toLocaleString('es-VE', {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                })}
                            </span>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={() => handleCheckout(operationMode)}
                        disabled={isSubmitting || cart.length === 0}
                        className={`w-full h-12 px-4 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 transition-all duration-150 disabled:opacity-40 disabled:pointer-events-none active:scale-[0.98] cursor-pointer ${operationMode === 'quote'
                                ? 'bg-white text-neutral-950 border border-neutral-300 hover:bg-neutral-50'
                                : 'bg-neutral-950 text-white hover:bg-neutral-800'
                            }`}
                    >
                        {isSubmitting ? (
                            <Loader2 size={16} className="animate-spin" />
                        ) : operationMode === 'quote' ? (
                            <FileText size={15} strokeWidth={1.8} />
                        ) : (
                            <Banknote size={15} strokeWidth={1.8} />
                        )}
                        <span>
                            {operationMode === 'quote'
                                ? 'Generar enlace de proforma'
                                : `Registrar cobro · ${currencySymbol}${totalUSD.toFixed(2)}`}
                        </span>
                    </button>
                </div>
            </aside>

            {/* ===================================================================== */}
            {/* MODAL DE SELECCIÓN DE VARIANTES                                       */}
            {/* ===================================================================== */}
            <AnimatePresence>
                {selectedProductForVariant && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.15 }}
                            className="absolute inset-0 bg-black/40 backdrop-blur-xs"
                            onClick={() => setSelectedProductForVariant(null)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.96, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.96, y: 10 }}
                            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                            className="relative bg-white w-full max-w-sm rounded-2xl overflow-hidden flex flex-col max-h-[80vh] border border-neutral-200"
                        >
                            <div className="p-4 flex justify-between items-start shrink-0 border-b border-neutral-100">
                                <div className="min-w-0 pr-2">
                                    <h3 className="font-semibold text-sm text-neutral-950">
                                        Seleccionar variante
                                    </h3>
                                    <p className="text-xs text-neutral-500 mt-0.5 truncate">
                                        {selectedProductForVariant.name}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setSelectedProductForVariant(null)}
                                    className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-950 hover:bg-neutral-100 transition-colors"
                                >
                                    <X size={15} strokeWidth={2} />
                                </button>
                            </div>
                            <div className="overflow-y-auto p-3 flex flex-col gap-1.5 no-scrollbar">
                                {selectedProductForVariant.product_variants.map((v) => {
                                    const isOutOfStock = v.stock <= 0
                                    const vPrice =
                                        v.override_usd_price ??
                                        selectedProductForVariant.usd_cash_price
                                    return (
                                        <button
                                            key={v.id}
                                            type="button"
                                            disabled={isOutOfStock}
                                            onClick={() =>
                                                handleAddToCart(selectedProductForVariant, v)
                                            }
                                            className={`flex items-center justify-between p-3 rounded-xl text-left transition-colors border ${isOutOfStock
                                                    ? 'bg-neutral-50 border-neutral-100 opacity-50 cursor-not-allowed'
                                                    : 'bg-white border-neutral-200/80 hover:border-neutral-900 active:scale-[0.99] cursor-pointer'
                                                }`}
                                        >
                                            <div>
                                                <span className="font-medium text-xs text-neutral-950 block">
                                                    {v.color_name || 'Estándar'} {v.size}
                                                </span>
                                                <span className="text-[11px] font-mono tabular-nums text-neutral-500 mt-0.5 block">
                                                    Disponible: {v.stock}
                                                </span>
                                            </div>
                                            <span className="font-mono font-semibold text-sm text-neutral-950 tabular-nums">
                                                {currencySymbol}
                                                {vPrice.toFixed(2)}
                                            </span>
                                        </button>
                                    )
                                })}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ===================================================================== */}
            {/* MODAL DE CONCEPTO MANUAL                                              */}
            {/* ===================================================================== */}
            <AnimatePresence>
                {isCustomItemModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.15 }}
                            className="absolute inset-0 bg-black/40 backdrop-blur-xs"
                            onClick={() => setIsCustomItemModalOpen(false)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.96, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.96, y: 10 }}
                            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                            className="relative bg-white w-full max-w-sm rounded-2xl overflow-hidden flex flex-col p-5 border border-neutral-200"
                        >
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h3 className="font-semibold text-base text-neutral-950">
                                        Agregar concepto manual
                                    </h3>
                                    <p className="text-xs text-neutral-500 mt-0.5">
                                        Cargo personalizado para este ticket.
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setIsCustomItemModalOpen(false)}
                                    className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-950 hover:bg-neutral-100 transition-colors"
                                >
                                    <X size={15} strokeWidth={2} />
                                </button>
                            </div>

                            <form onSubmit={handleAddCustomItem} className="space-y-3.5">
                                <div>
                                    <label className="text-xs font-medium text-neutral-700 mb-1.5 block">
                                        Descripción del concepto
                                    </label>
                                    <input
                                        type="text"
                                        autoFocus
                                        required
                                        value={customItem.name}
                                        onChange={(e) =>
                                            setCustomItem({ ...customItem, name: e.target.value })
                                        }
                                        placeholder="Ej. Servicio de instalación, Envío expreso..."
                                        className="w-full h-10 bg-[#FAFAFC] border border-neutral-200 focus:bg-white focus:border-neutral-900 rounded-lg px-3 text-xs text-neutral-950 outline-none transition-colors"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-neutral-700 mb-1.5 block">
                                        Precio unitario ({currencySymbol})
                                    </label>
                                    <div className="relative">
                                        <DollarSign
                                            size={14}
                                            className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
                                        />
                                        <input
                                            type="number"
                                            step="0.01"
                                            required
                                            value={customItem.price}
                                            onChange={(e) =>
                                                setCustomItem({
                                                    ...customItem,
                                                    price: e.target.value,
                                                })
                                            }
                                            placeholder="0.00"
                                            className="w-full h-10 pl-8 pr-3 bg-[#FAFAFC] border border-neutral-200 focus:bg-white focus:border-neutral-900 rounded-lg text-sm font-mono font-semibold text-neutral-950 outline-none transition-colors tabular-nums"
                                        />
                                    </div>
                                </div>
                                <button
                                    type="submit"
                                    className="w-full h-11 bg-neutral-950 text-white font-semibold text-xs rounded-xl hover:bg-neutral-800 active:scale-[0.98] transition-all mt-1 cursor-pointer"
                                >
                                    Añadir al ticket
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
            {/* PROVEEDOR NATIVO DE TOASTS Y DIÁLOGOS DE CONFIRMACIÓN */}
            <PrezisoFeedbackProvider />
        </div>
    )
}