'use client'

import React, { useEffect, useState, useMemo } from 'react'
import { useParams } from 'next/navigation'
import { getSupabase } from '@/lib/supabase-client'
import { compressImage } from '@/utils/imageOptimizer'
import {
    Loader2,
    CheckCircle2,
    Upload,
    Check,
    Copy,
    ArrowRight,
    PackageX,
    Download,
    CreditCard,
    Store,
    ArrowUpRight,
    Sparkles,
    MapPin,
    User,
    PenSquare,
    FileText,
    ChevronDown,
} from 'lucide-react'
import Swal from 'sweetalert2'
import { getOptimizedUrl } from '@/utils/cdn'
import { Icon } from '@iconify/react'
import { formatUSD, formatVES, formatBankTransferAmount } from '@/utils/currency'
import PhoneInput from '@/components/ui/PhoneInput'

const BrandLogos = {
    Transferencia: ({ className, size }: any) => (
        <Icon icon="ph:bank-bold" className={className} width={size} height={size} />
    ),
    Zelle: ({ className, size }: any) => (
        <Icon icon="simple-icons:zelle" className={className} width={size} height={size} />
    ),
    Binance: ({ className, size }: any) => (
        <Icon icon="simple-icons:binance" className={className} width={size} height={size} />
    ),
    PagoMovil: ({ className, size }: any) => (
        <Icon
            icon="fluent:phone-checkmark-24-regular"
            className={className}
            width={size}
            height={size}
        />
    ),
    Efectivo: ({ className, size }: any) => (
        <Icon icon="bi:cash" className={className} width={size} height={size} />
    ),
    Zinli: ({ className, size }: any) => (
        <Icon icon="mdi:wallet-bifold" className={className} width={size} height={size} />
    ),
    WallyTech: ({ className, size }: any) => (
        <Icon icon="solar:wallet-bold" className={className} width={size} height={size} />
    ),
}

const HARD_CURRENCY_METHODS = ['Zelle', 'Binance', 'Zinli', 'WallyTech', 'Efectivo']

export default function QuotePublicPage() {
    const params = useParams()
    const slug = params.slug as string
    const orderId = params.id as string
    const supabase = getSupabase()

    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)

    const [store, setStore] = useState<any>(null)
    const [order, setOrder] = useState<any>(null)
    const [items, setItems] = useState<any[]>([])
    const [rates, setRates] = useState({ usd_rate: 0, eur_rate: 0 })

    const [stockIssues, setStockIssues] = useState<string[]>([])
    const isQuoteActive = order?.status === 'quote'
    const isPaymentVerified = ['paid', 'shipped', 'completed'].includes(order?.status)

  const [selectedMethod, setSelectedMethod] = useState<string>('')
    const [reference, setReference] = useState('')
    const [receiptFile, setReceiptFile] = useState<File | null>(null)

    // --- ESTADOS FISCALES OBLIGATORIOS PARA CONVERTIR PRESUPUESTO ---
    const DNI_PREFIXES = ['V', 'J', 'E', 'G', 'P']
    const [fiscalName, setFiscalName] = useState('')
    const [dniPrefix, setDniPrefix] = useState('V')
    const [fiscalDniNumber, setFiscalDniNumber] = useState('')
  const [fiscalPhone, setFiscalPhone] = useState('')
    const [fiscalAddress, setFiscalAddress] = useState('')
    const [isEditingFiscal, setIsEditingFiscal] = useState(false)
    const [isDniPrefixOpen, setIsDniPrefixOpen] = useState(false)

    const isFiscalDataComplete = useMemo(() => {
        return (
            fiscalName.trim().length >= 2 &&
            /^\d{5,10}$/.test(fiscalDniNumber.trim()) &&
            fiscalPhone.replace(/\D/g, '').length >= 10 &&
            fiscalAddress.trim().length >= 5
        )
    }, [fiscalName, fiscalDniNumber, fiscalPhone, fiscalAddress])

    const [copiedKey, setCopiedKey] = useState<string | null>(null)

    const handleCopyItem = (text: string, key: string) => {
        if (!text) return
        navigator.clipboard.writeText(text)
        setCopiedKey(key)
        setTimeout(() => setCopiedKey(null), 2000)
    }

    // Conversor de Logo a Base64 para impresión nativa sin fallos de CORS
    const [logoBase64, setLogoBase64] = useState<string | null>(null)
    useEffect(() => {
        if (store?.logo_url) {
            fetch(getOptimizedUrl(store.logo_url))
                .then((res) => res.blob())
                .then((blob) => {
                    const reader = new FileReader()
                    reader.onloadend = () => setLogoBase64(reader.result as string)
                    reader.readAsDataURL(blob)
                })
                .catch((e) => console.error('Error cargando logo en Base64', e))
        }
    }, [store?.logo_url])

    useEffect(() => {
        const fetchQuoteData = async () => {
            try {
                const { data: storeData } = await supabase
                    .from('stores')
                    .select('*')
                    .eq('slug', slug)
                    .single()
                if (!storeData) throw new Error('Tienda no encontrada')
                setStore(storeData)

                const { data: orderData } = await supabase
                    .from('orders')
                    .select('*')
                    .eq('id', orderId)
                    .eq('store_id', storeData.id)
                    .single()
                if (!orderData) throw new Error('Presupuesto no encontrado')
                setOrder(orderData)

                // Hidratar campos fiscales con lo que ya exista en la orden
                const initialName =
                    orderData.customer_name &&
                    orderData.customer_name !== 'Cliente Mostrador'
                        ? String(orderData.customer_name).trim()
                        : ''
                setFiscalName(initialName)

                let initialDniDigits = ''
                if (orderData.customer_dni) {
                    const rawDni = String(orderData.customer_dni).trim()
                    const prefixMatch = rawDni.match(/^([VJEGPvjegp])[-]?/)
                    if (prefixMatch) {
                        setDniPrefix(prefixMatch[1].toUpperCase())
                    }
                    initialDniDigits = rawDni
                        .replace(/^[VJEGPvjegp][-]?/i, '')
                        .replace(/[^0-9]/g, '')
                        .slice(0, 10)
                    setFiscalDniNumber(initialDniDigits)
                }

                const initialPhone = orderData.customer_phone
                    ? String(orderData.customer_phone).trim()
                    : ''
                setFiscalPhone(initialPhone)

                const initialAddress = orderData.customer_address
                    ? String(orderData.customer_address).trim()
                    : ''
                setFiscalAddress(initialAddress)

                const hasMissingFiscalField =
                    !initialName ||
                    !/^\d{5,10}$/.test(initialDniDigits) ||
                    initialPhone.replace(/\D/g, '').length < 10 ||
                    initialAddress.length < 5

                setIsEditingFiscal(hasMissingFiscalField)

                if (orderData.status === 'quote') {
                    localStorage.setItem(
                        'preziso_pending_quote',
                        JSON.stringify({
                            id: orderData.id,
                            total: orderData.total_usd,
                            slug: storeData.slug,
                        })
                    )
                } else {
                    localStorage.removeItem('preziso_pending_quote')
                }

                const { data: rateData } = await supabase
                    .from('app_config')
                    .select('usd_rate, eur_rate')
                    .single()
                if (rateData) setRates({ usd_rate: rateData.usd_rate, eur_rate: rateData.eur_rate })

                // Traemos precios base y penalty del catálogo para calcular el incentivo en divisas con exactitud en proformas activas
                const { data: itemsData } = await supabase
                    .from('order_items')
                    .select(
                        '*, product:products(stock, usd_cash_price, usd_penalty, is_tax_exempt), variant:product_variants(stock, override_usd_price, override_usd_penalty)'
                    )
                    .eq('order_id', orderId)

                if (itemsData) {
                    setItems(itemsData)
                    if (orderData.status === 'quote') {
                        const issues: string[] = []
                        itemsData.forEach((item: any) => {
                            if (!item.product_id) return
                            const currentStock = item.variant_id
                                ? item.variant?.stock
                                : item.product?.stock
                            if (typeof currentStock === 'number' && currentStock < item.quantity) {
                                issues.push(item.product_name)
                            }
                        })
                        setStockIssues(issues)
                    }
                }
            } catch (error) {
                console.error(error)
                Swal.fire({
                    icon: 'error',
                    title: 'Acceso Denegado',
                    text: 'El enlace de este documento no es válido o ha expirado.',
                    confirmButtonColor: '#171717',
                    customClass: { popup: 'rounded-xl font-sans text-xs' },
                })
            } finally {
                setLoading(false)
            }
        }
        if (slug && orderId) fetchQuoteData()
    }, [slug, orderId, supabase])

    // Sincronización Realtime
    useEffect(() => {
        if (!store?.id) return

        const storeChannel = supabase
            .channel(`store-changes-${store.id}`)
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'stores', filter: `id=eq.${store.id}` },
                (payload: any) => {
                    setStore((prevStore: any) => ({ ...prevStore, ...payload.new }))
                }
            )
            .subscribe()

        const rateChannel = supabase
            .channel('rates-changes')
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'app_config' },
                (payload: any) => {
                    setRates((prevRates: any) => ({ ...prevRates, ...payload.new }))
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(storeChannel)
            supabase.removeChannel(rateChannel)
        }
    }, [store?.id, supabase])

    const activeCurrency = useMemo(
        () => store?.currency_type || order?.currency_type || 'usd',
        [store, order]
    )

    // LÓGICA DE INMUTABILIDAD FINANCIERA: Si el pedido ya no es una cotización ("quote"), usamos la tasa histórica guardada.
    const activeRate = useMemo(() => {
        if (order && order.status !== 'quote' && order.exchange_rate) {
            return Number(order.exchange_rate)
        }
        return activeCurrency === 'eur' ? rates.eur_rate : rates.usd_rate
    }, [activeCurrency, rates, order])

    const activePaymentMethods = useMemo(() => {
        if (!store?.payment_config) return []
        const pConfig = store.payment_config
        const active: string[] = []

        if (pConfig.transferencia?.active) active.push('Transferencia')
        if (pConfig.pago_movil?.active) active.push('Pago Móvil')
        if (pConfig.zelle?.active) active.push('Zelle')
        if (pConfig.binance?.active) active.push('Binance')
        if (pConfig.zinli?.active) active.push('Zinli')
        if (pConfig.wally?.active) active.push('WallyTech')
        if (pConfig.cash?.active) active.push('Efectivo')

        if (order?.payment_method && order?.status === 'quote') {
            const allowed = order.payment_method.split(',')
            return active.filter((method) => allowed.includes(method))
        }

        return active
    }, [store?.payment_config, order?.payment_method, order?.status])

    // =========================================================================
    // MOTOR DE PRECISIÓN FINANCIERA Y DESCUENTO EN DIVISAS PARA PROFORMAS
    // =========================================================================
  // Detecta exactamente qué métodos en divisas están habilitados en esta proforma específica
    const availableHardCurrencyMethods = useMemo(
        () => activePaymentMethods.filter((m) => HARD_CURRENCY_METHODS.includes(m)),
        [activePaymentMethods]
    )

    const hasHardCurrencyAvailableInQuote = availableHardCurrencyMethods.length > 0

    // Formateador gramatical dinámico (Ej: "Binance" | "Zelle o Binance" | "Zelle, Binance o Efectivo")
    const formattedHardCurrencyList = useMemo(() => {
        if (availableHardCurrencyMethods.length === 0) return ''
        if (availableHardCurrencyMethods.length === 1) return availableHardCurrencyMethods[0]
        if (availableHardCurrencyMethods.length === 2) {
            return `${availableHardCurrencyMethods[0]} o ${availableHardCurrencyMethods[1]}`
        }
        const allExceptLast = availableHardCurrencyMethods.slice(0, -1).join(', ')
        const last = availableHardCurrencyMethods[availableHardCurrencyMethods.length - 1]
        return `${allExceptLast} o ${last}`
    }, [availableHardCurrencyMethods])

    const isSelectingHardCurrency =
        isQuoteActive && Boolean(selectedMethod) && HARD_CURRENCY_METHODS.includes(selectedMethod)

    // Calcula el ahorro potencial en divisas de una Proforma activa analizando cada ítem
    const quoteFinancials = useMemo(() => {
        if (!order) {
            return {
                potentialFxSavingsUSD: 0,
                cashSubtotalUSD: 0,
                cashTaxUSD: 0,
                cashTotalUSD: 0,
                grossNominalSubtotalUSD: 0,
                effectiveSubtotalUSD: 0,
                effectiveTaxUSD: 0,
                effectiveFxSavingsUSD: 0,
                effectiveTotalUSD: 0,
            }
        }

        const savedSubtotal = Number(order.subtotal_usd || order.total_usd || 0)
        const savedTax = Number(order.tax_amount_usd || 0)
        const savedPromo = Number(order.promo_discount_usd || 0)
        const savedWholesale = Number(order.wholesale_discount_usd || 0)
        const savedAffiliate = Number(order.affiliate_discount_usd || 0)
        const savedFxSavings = Number(order.fx_savings_usd || 0)
        const shippingCost = Number(order.shipping_cost || order.delivery_cost || 0)
        const tipAmount = Number(order.tip_amount_usd || 0)

        // Si la orden ya fue procesada o pagada, respetamos estrictamente los montos inmutables guardados
        if (!isQuoteActive) {
            const grossNominal =
                savedSubtotal + savedPromo + savedWholesale + savedAffiliate + savedFxSavings
            return {
                potentialFxSavingsUSD: savedFxSavings,
                cashSubtotalUSD: savedSubtotal,
                cashTaxUSD: savedTax,
                cashTotalUSD: Number(order.total_usd || 0),
                grossNominalSubtotalUSD: grossNominal,
                effectiveSubtotalUSD: savedSubtotal,
                effectiveTaxUSD: savedTax,
                effectiveFxSavingsUSD: savedFxSavings,
                effectiveTotalUSD: Number(order.total_usd || 0),
            }
        }

        // Si es una Proforma activa ('quote'), calculamos cuánto ahorraría el cliente pagando en divisas
        let rawListSum = 0
        let rawCashSum = 0

        items.forEach((item: any) => {
            const qty = Number(item.quantity) || 0
            const lineListUnit = Number(item.price_at_purchase) || 0
            rawListSum += lineListUnit * qty

            if (item.product) {
                const baseCash = item.variant_id
                    ? Number(
                          item.variant?.override_usd_price ?? item.product?.usd_cash_price ?? lineListUnit
                      )
                    : Number(item.product?.usd_cash_price ?? lineListUnit)
                const penalty = item.variant_id
                    ? Number(
                          item.variant?.override_usd_penalty ?? item.product?.usd_penalty ?? 0
                      )
                    : Number(item.product?.usd_penalty ?? 0)
                const catalogList = baseCash + penalty

                if (catalogList > 0 && penalty > 0) {
                    const ratio = baseCash / catalogList
                    rawCashSum += lineListUnit * ratio * qty
                } else {
                    rawCashSum += lineListUnit * qty
                }
            } else {
                rawCashSum += lineListUnit * qty
            }
        })

        // Si la proforma ya tenía descuento mayorista aplicado sobre la lista, conservamos la proporción
        const listToSubtotalFactor = rawListSum > 0 ? savedSubtotal / rawListSum : 1
        const computedCashSubtotal = Number((rawCashSum * listToSubtotalFactor).toFixed(2))
        const potentialFxSavings = Math.max(
            0,
            Number((savedSubtotal - computedCashSubtotal).toFixed(2))
        )

        const taxRatio = savedSubtotal > 0 ? computedCashSubtotal / savedSubtotal : 1
        const computedCashTax = order.is_tax_applied
            ? Number((savedTax * taxRatio).toFixed(2))
            : 0
        const computedCashTotal = Number(
            (computedCashSubtotal + computedCashTax + shippingCost + tipAmount).toFixed(2)
        )

        const grossNominal = savedSubtotal + savedPromo + savedWholesale + savedAffiliate

        return {
            potentialFxSavingsUSD: potentialFxSavings,
            cashSubtotalUSD: computedCashSubtotal,
            cashTaxUSD: computedCashTax,
            cashTotalUSD: computedCashTotal,
            grossNominalSubtotalUSD: grossNominal,
            effectiveSubtotalUSD: isSelectingHardCurrency ? computedCashSubtotal : savedSubtotal,
            effectiveTaxUSD: isSelectingHardCurrency ? computedCashTax : savedTax,
            effectiveFxSavingsUSD: isSelectingHardCurrency ? potentialFxSavings : 0,
            effectiveTotalUSD: isSelectingHardCurrency
                ? computedCashTotal
                : Number(order.total_usd || 0),
        }
    }, [order, items, isQuoteActive, isSelectingHardCurrency])

    // El equivalente oficial en Bolívares siempre se calcula sobre el monto base BCV (sin descuento de divisas)
    const totalBs = useMemo(() => {
        if (order && order.status !== 'quote' && order.total_bs) {
            return Number(order.total_bs)
        }
        return Number(order?.total_usd || 0) * activeRate
    }, [order, activeRate])

   const handleProcessPayment = async () => {
        if (!isFiscalDataComplete) {
            setIsEditingFiscal(true)
            const missingList: string[] = []
            if (fiscalName.trim().length < 2) missingList.push('Nombre o Razón Social')
            if (!/^\d{5,10}$/.test(fiscalDniNumber.trim())) missingList.push('Cédula / RIF válido')
            if (fiscalPhone.replace(/\D/g, '').length < 10) missingList.push('Teléfono de contacto')
            if (fiscalAddress.trim().length < 5) missingList.push('Dirección Fiscal')

            return Swal.fire({
                title: 'Datos fiscales incompletos',
                text: `Para procesar tu presupuesto y emitir el comprobante fiscal, completa: ${missingList.join(', ')}.`,
                icon: 'warning',
                confirmButtonColor: '#171717',
                customClass: { popup: 'rounded-xl font-sans text-xs' },
            })
        }

        if (!selectedMethod) {
            return Swal.fire({
                title: 'Método requerido',
                text: 'Selecciona el método de pago que utilizaste.',
                icon: 'warning',
                confirmButtonColor: '#171717',
                customClass: { popup: 'rounded-xl font-sans text-xs' },
            })
        }
        if (!['Zelle', 'Efectivo'].includes(selectedMethod) && !receiptFile) {
            return Swal.fire({
                title: 'Comprobante requerido',
                text: 'Por favor adjunta la captura o comprobante de la transferencia.',
                icon: 'warning',
                confirmButtonColor: '#171717',
                customClass: { popup: 'rounded-xl font-sans text-xs' },
            })
        }

        setSubmitting(true)
        try {
            let receiptPublicUrl = null
            if (receiptFile) {
                const compressed = await compressImage(receiptFile, 800, 0.7)
                const fileExt = receiptFile.name.split('.').pop() || 'jpg'
                const fileName = `quote-${order.id}-${Date.now()}.${fileExt}`

                const { error: uploadError } = await supabase.storage
                    .from('receipts')
                    .upload(fileName, compressed)
                if (uploadError) throw new Error('Error al subir el comprobante.')

                const {
                    data: { publicUrl },
                } = supabase.storage.from('receipts').getPublicUrl(fileName)
                receiptPublicUrl = publicUrl
            }

            const paidInHardCurrency = HARD_CURRENCY_METHODS.includes(selectedMethod)
            const finalSubtotalUSD = paidInHardCurrency
                ? quoteFinancials.cashSubtotalUSD
                : Number(order.subtotal_usd || order.total_usd)
            const finalTaxUSD = paidInHardCurrency
                ? quoteFinancials.cashTaxUSD
                : Number(order.tax_amount_usd || 0)
            const finalTotalUSD = paidInHardCurrency
                ? quoteFinancials.cashTotalUSD
                : Number(order.total_usd)
            const finalFxSavingsUSD = paidInHardCurrency
                ? quoteFinancials.potentialFxSavingsUSD
                : 0

            const formattedFullDni = `${dniPrefix}-${fiscalDniNumber.trim()}`
            const convertedTimestamp = new Date().toISOString()

            const { error: updateError } = await supabase
                .from('orders')
                .update({
                    status: 'pending',
                    customer_name: fiscalName.trim(),
                    customer_dni: formattedFullDni,
                    customer_phone: fiscalPhone.trim(),
                    customer_address: fiscalAddress.trim(),
                    converted_at: convertedTimestamp,
                    payment_method: selectedMethod,
                    subtotal_usd: finalSubtotalUSD,
                    tax_amount_usd: finalTaxUSD,
                    total_usd: finalTotalUSD,
                    liquid_amount_usd: finalTotalUSD,
                    fx_savings_usd: finalFxSavingsUSD,
                    total_bs: totalBs,
                    exchange_rate: activeRate,
                    receipt_url: receiptPublicUrl,
                    delivery_info:
                        (order.delivery_info || '') + (reference ? ` | Ref: ${reference}` : ''),
                })
                .eq('id', order.id)

            if (updateError) {
                if (
                    updateError.message.includes('check_stock') ||
                    updateError.message.includes('violates check constraint')
                ) {
                    throw new Error(
                        'Alguien acaba de adquirir el último artículo disponible. El inventario actual es insuficiente.'
                    )
                }
                throw updateError
            }

            localStorage.removeItem('preziso_pending_quote')
            setOrder({
                ...order,
                status: 'pending',
                customer_name: fiscalName.trim(),
                customer_dni: formattedFullDni,
                customer_phone: fiscalPhone.trim(),
                customer_address: fiscalAddress.trim(),
                converted_at: convertedTimestamp,
                payment_method: selectedMethod,
                subtotal_usd: finalSubtotalUSD,
                tax_amount_usd: finalTaxUSD,
                total_usd: finalTotalUSD,
                fx_savings_usd: finalFxSavingsUSD,
                total_bs: totalBs,
                exchange_rate: activeRate,
            })

            Swal.fire({
                icon: 'success',
                title: 'Pago reportado con éxito',
                text: 'Tu comprobante ha sido enviado a la tienda para su verificación.',
                confirmButtonColor: '#171717',
                customClass: { popup: 'rounded-xl font-sans text-xs' },
            })
        } catch (error: any) {
            Swal.fire({
                icon: 'error',
                title: 'No se pudo procesar',
                text: error.message || 'Intenta nuevamente.',
                confirmButtonColor: '#171717',
                customClass: { popup: 'rounded-xl font-sans text-xs' },
            })
        } finally {
            setSubmitting(false)
        }
    }

    if (loading)
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-[#FAFAFC] gap-3">
                <Loader2 className="animate-spin text-neutral-300" size={28} />
                <p className="text-xs font-semibold text-neutral-400 font-mono">
                    Cargando documento...
                </p>
            </div>
        )
    if (!order) return null

    // DICCIONARIO MAESTRO CANÓNICO
    const paymentKeysMap: Record<string, string> = {
        Transferencia: 'transferencia',
        'Pago Móvil': 'pago_movil',
        Zelle: 'zelle',
        Binance: 'binance',
        Zinli: 'zinli',
        WallyTech: 'wally',
        Efectivo: 'cash',
    }

    const getPaymentConfig = (pm: string) => {
        const baseSelected = 'bg-neutral-950 text-white border-neutral-950 shadow-xs'
        const baseIdle =
            'bg-white text-neutral-600 border-neutral-200/70 hover:border-neutral-400 hover:text-neutral-900'

        switch (pm) {
            case 'Transferencia':
                return { icon: BrandLogos.Transferencia, btnSelected: baseSelected, btnIdle: baseIdle }
            case 'Pago Móvil':
                return { icon: BrandLogos.PagoMovil, btnSelected: baseSelected, btnIdle: baseIdle }
            case 'Zelle':
                return { icon: BrandLogos.Zelle, btnSelected: baseSelected, btnIdle: baseIdle }
            case 'Binance':
                return { icon: BrandLogos.Binance, btnSelected: baseSelected, btnIdle: baseIdle }
            case 'Zinli':
                return { icon: BrandLogos.Zinli, btnSelected: baseSelected, btnIdle: baseIdle }
            case 'WallyTech':
                return { icon: BrandLogos.WallyTech, btnSelected: baseSelected, btnIdle: baseIdle }
            case 'Efectivo':
                return { icon: BrandLogos.Efectivo, btnSelected: baseSelected, btnIdle: baseIdle }
            default:
                return { icon: CreditCard, btnSelected: baseSelected, btnIdle: baseIdle }
        }
    }

    const shippingCostValue = Number(order.shipping_cost || order.delivery_cost || 0)

    return (
        <>
            {/* CSS PARA IMPRESIÓN LIMPIA */}
            <style
                dangerouslySetInnerHTML={{
                    __html: `
            @media print { 
                @page { margin: 12mm; size: A4 portrait; } 
                body, html, main { background-color: white !important; margin: 0 !important; padding: 0 !important; height: auto !important; min-height: 0 !important; } 
                .print-hidden { display: none !important; } 
                .avoid-break { page-break-inside: avoid; break-inside: avoid; } 
                #invoice-container { max-width: 100% !important; border: none !important; padding: 0 !important; margin: 0 !important; box-shadow: none !important; }
            }
            `,
                }}
            />

            <div className="min-h-screen bg-[#FAFAFC] font-sans text-neutral-900 py-6 md:py-12 px-3 flex justify-center selection:bg-neutral-950 selection:text-white antialiased">
                <div className="w-full max-w-[840px] flex flex-col gap-5">
               {/* ACTION BAR MINIMALISTA EDITORIAL (Solo en pantalla) */}
                    <div className="flex items-center justify-between gap-3 print-hidden px-0.5">
                        {/* 💎 ETIQUETA CON DESVANECIDO DE IZQUIERDA A DERECHA (Sin bordes, sin sombras, sin rounded-full) */}
                        <div
                            className={`inline-flex items-center gap-2 pl-2.5 pr-8 py-1.5 rounded-[.4rem] text-[10px] font-mono font-bold uppercase tracking-widest border-0 shadow-none select-none ${
                                order.status === 'quote'
                                    ? 'bg-gradient-to-r from-neutral-200/80 via-neutral-100/40 to-transparent text-neutral-800'
                                    : !isPaymentVerified
                                      ? 'bg-gradient-to-r from-amber-200/80 via-amber-100/40 to-transparent text-amber-900'
                                      : 'bg-gradient-to-r from-emerald-200/80 via-emerald-100/40 to-transparent text-emerald-900'
                            }`}
                        >
                            <span
                                className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                    order.status === 'quote'
                                        ? 'bg-neutral-500'
                                        : !isPaymentVerified
                                          ? 'bg-amber-600 animate-pulse'
                                          : 'bg-emerald-600'
                                }`}
                            />
                            <span>
                                {order.status === 'quote'
                                    ? 'Proforma Activa'
                                    : !isPaymentVerified
                                      ? 'Pago en Verificación'
                                      : 'Pedido Procesado'}
                            </span>
                        </div>

                        <button
                            type="button"
                            onClick={() => window.print()}
                            className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-white hover:bg-neutral-950 text-neutral-900 hover:text-white border border-neutral-900 rounded-full text-xs font-semibold tracking-tight transition-all duration-200 active:scale-95 cursor-pointer"
                            title="Descargar PDF o imprimir documento"
                        >
                            <Download size={13} strokeWidth={2} />
                            <span className="hidden sm:inline">Descargar PDF / Imprimir</span>
                            <span className="sm:hidden">Descargar PDF</span>
                        </button>
                    </div>

                    {/* DOCUMENTO A4 (Estructura Clean Look de Alta Precisión) */}
                    <div
                        id="invoice-container"
                        className="bg-white rounded-xl p-4 sm:p-6 md:p-10 border border-neutral-200/70"
                    >
                        {/* ENCABEZADO FISCAL */}
                        <div className="flex flex-col md:flex-row print:flex-row justify-between items-start border-b border-neutral-200/60 pb-5 mb-6 gap-4">
                            <div className="flex flex-col items-start max-w-full md:max-w-[55%] print:max-w-[55%] space-y-1">
                                {store.logo_url ? (
                                    <div className="h-9 mb-1.5">
                                        <img
                                            src={logoBase64 || getOptimizedUrl(store.logo_url)}
                                            alt={store.name}
                                            className="h-full w-auto object-contain"
                                        />
                                    </div>
                                ) : (
                                    <div className="h-9 w-9 rounded-lg bg-neutral-50 border border-neutral-200/60 flex items-center justify-center mb-1 text-neutral-400">
                                        <Store size={18} />
                                    </div>
                                )}
                                <h1 className="text-base md:text-lg font-bold tracking-tight text-neutral-900 leading-none">
                                    {store.name}
                                </h1>
                                {store?.fiscal_profile !== 'informal' && (
                                    <div className="text-[10px] text-neutral-500 font-medium leading-relaxed">
                                        {store.legal_name && (
                                            <span className="font-semibold text-neutral-700 mr-1">
                                                {store.legal_name}
                                            </span>
                                        )}
                                        {store.legal_id && (
                                            <span className="font-mono">| RIF: {store.legal_id}</span>
                                        )}
                                        {store.fiscal_address && (
                                            <p className="mt-0.5 text-neutral-400">
                                                {store.fiscal_address}
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="flex flex-col md:items-end print:items-end text-left md:text-right print:text-right w-full md:w-auto print:w-auto space-y-1">
                                <p className="text-base md:text-lg font-bold tracking-tight text-neutral-900 uppercase font-mono leading-none">
                                    {!isPaymentVerified ? 'Proforma Comercial' : 'Orden de Despacho'}
                                </p>
                                <p className="text-xs font-mono font-bold text-neutral-500 tabular-nums">
                                    Nº {order.order_number}
                                </p>
                                <div className="pt-1 text-[10px] text-neutral-400 font-mono flex flex-col md:items-end gap-0.5">
                                    <p>
                                        Fecha:{' '}
                                        <span className="text-neutral-700 font-medium tabular-nums">
                                            {new Date(order.created_at).toLocaleDateString('es-VE')}
                                        </span>
                                    </p>
                                    <p>
                                        Moneda:{' '}
                                        <span className="text-neutral-700 font-medium uppercase">
                                            {activeCurrency}
                                        </span>
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* SECCIÓN CLIENTE Y ENVÍO */}
                        <div className="flex flex-col md:flex-row print:flex-row justify-between gap-6 mb-8 text-xs">
                         <div className="flex-1 print:w-1/2 space-y-1">
                                <p className="text-[10px] font-mono font-bold uppercase tracking-[0.12em] text-neutral-400 mb-1.5">
                                    Cliente:
                                </p>
                                <p className="font-semibold text-neutral-900 text-sm leading-tight">
                                    {fiscalName.trim() || order.customer_name}
                                </p>
                                <div className="text-neutral-500 font-mono text-[11px] space-y-0.5 pt-0.5">
                                    {(fiscalDniNumber.trim() || order.customer_dni) && (
                                        <p>
                                            CI/RIF:{' '}
                                            {fiscalDniNumber.trim()
                                                ? `${dniPrefix}-${fiscalDniNumber.trim()}`
                                                : order.customer_dni}
                                        </p>
                                    )}
                                    {(fiscalPhone.trim() || order.customer_phone) && (
                                        <p>Télf: {fiscalPhone.trim() || order.customer_phone}</p>
                                    )}
                                    {(fiscalAddress.trim() || order.customer_address) && (
                                        <p className="font-sans text-neutral-600 max-w-[280px] leading-tight pt-1">
                                            {fiscalAddress.trim() || order.customer_address}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {(store.store_type === 'restaurant' ||
                                order.shipping_method !== 'pickup') && (
                                <div className="flex-1 md:text-right print:text-right print:w-1/2 space-y-1">
                                    <p className="text-[10px] font-mono font-bold uppercase tracking-[0.12em] text-neutral-400 mb-1.5">
                                        {store.store_type === 'restaurant'
                                            ? 'Modalidad de Servicio:'
                                            : 'Dirección de Despacho:'}
                                    </p>
                                    <div className="text-neutral-600 font-medium leading-relaxed md:ml-auto max-w-[280px] text-[11px] bg-neutral-50/70 p-2.5 rounded-lg border border-neutral-200/50 text-left md:text-right">
                                        {store.store_type === 'restaurant' ? (
                                            <>
                                                {order.fulfillment_type === 'dine_in' && (
                                                    <p>
                                                        <span className="font-bold text-neutral-900">
                                                            Comer en el Local
                                                        </span>
                                                        <br />
                                                        Mesa:{' '}
                                                        <strong className="font-mono">
                                                            {order.table_number || 'N/A'}
                                                        </strong>
                                                    </p>
                                                )}
                                                {order.fulfillment_type === 'pickup' && (
                                                    <p className="font-bold text-neutral-900">
                                                        Para Llevar (Retiro en Barra)
                                                    </p>
                                                )}
                                                {(order.fulfillment_type === 'local_delivery' ||
                                                    order.fulfillment_type === 'delivery') && (
                                                    <p>
                                                        {order.delivery_info?.split(' | ⚠️ ')[0] ||
                                                            'Delivery Local'}
                                                    </p>
                                                )}
                                            </>
                                        ) : (
                                            <p>
                                                {order.delivery_info?.split(' | ⚠️ ')[0] ||
                                                    order.delivery_info}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* ALERTA DE STOCK (Solo pantalla) */}
                        {stockIssues.length > 0 && isQuoteActive && (
                            <div className="bg-rose-50 border border-rose-200/60 text-rose-900 p-3.5 rounded-xl mb-6 flex gap-3 items-start print-hidden">
                                <PackageX size={16} className="shrink-0 mt-0.5 text-rose-600" />
                                <div>
                                    <p className="text-xs font-semibold">
                                        Disponibilidad actualizada
                                    </p>
                                    <p className="text-xs text-rose-700 mt-0.5">
                                        El artículo <strong>{stockIssues.join(', ')}</strong> ya no
                                        posee suficientes existencias. Por favor contacta a la tienda.
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* TABLA DE ARTÍCULOS */}
                        <div className="mb-6 w-full">
                            <div className="grid grid-cols-12 gap-2 border-b border-neutral-200/60 pb-2 mb-2 text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-400">
                                <div className="col-span-6">Descripción</div>
                                <div className="col-span-2 text-center">Cant.</div>
                                <div className="col-span-2 text-right">Unitario</div>
                                <div className="col-span-2 text-right">Total</div>
                            </div>

                            <div className="divide-y divide-neutral-100">
                                {items.length === 0 ? (
                                    <p className="text-xs text-neutral-400 py-4 text-center">
                                        Cargando detalles de los artículos...
                                    </p>
                                ) : (
                                    items.map((item) => (
                                        <div
                                            key={item.id}
                                            className="avoid-break grid grid-cols-12 gap-2 py-3 items-start text-xs"
                                        >
                                            <div className="col-span-6 pr-2">
                                                <p className="font-semibold text-neutral-900 leading-snug break-words">
                                                    {item.product_name}
                                                </p>

                                                {item.modifiers_selected &&
                                                Array.isArray(item.modifiers_selected) &&
                                                item.modifiers_selected.length > 0 ? (
                                                    <div className="mt-1 pl-1.5 border-l border-neutral-200 space-y-0.5">
                                                        {item.modifiers_selected.map(
                                                            (mod: any, mIdx: number) => (
                                                                <p
                                                                    key={mIdx}
                                                                    className="text-[10px] text-neutral-500 flex items-center justify-between"
                                                                >
                                                                    <span>+ {mod.name}</span>
                                                                    {Number(mod.priceAdjustment) >
                                                                        0 && (
                                                                        <span className="font-mono tabular-nums text-neutral-400">
                                                                            +
                                                                            {Number(
                                                                                mod.priceAdjustment
                                                                            ).toFixed(2)}
                                                                        </span>
                                                                    )}
                                                                </p>
                                                            )
                                                        )}
                                                    </div>
                                                ) : (
                                                    item.variant_info &&
                                                    item.variant_info !== 'N/A' && (
                                                        <p className="text-[11px] text-neutral-500 mt-0.5 leading-tight">
                                                            {item.variant_info}
                                                        </p>
                                                    )
                                                )}

                                                {item.customer_notes && (
                                                    <div className="mt-1.5 bg-amber-50/60 border border-amber-200/50 p-1.5 rounded text-[10px] text-amber-800">
                                                        <span className="font-semibold text-amber-900 mr-1">
                                                            Nota:
                                                        </span>
                                                        &quot;{item.customer_notes}&quot;
                                                    </div>
                                                )}
                                            </div>
                                            <div className="col-span-2 text-center pt-0.5">
                                                <span className="font-mono tabular-nums text-neutral-700 font-medium">
                                                    {item.quantity}
                                                </span>
                                            </div>
                                            <div className="col-span-2 text-right pt-0.5">
                                                <span className="font-mono tabular-nums text-neutral-500 text-[11px]">
                                                    {formatUSD(item.price_at_purchase)}
                                                </span>
                                            </div>
                                            <div className="col-span-2 text-right flex flex-col justify-start">
                                                <p className="font-semibold text-neutral-900 font-mono tabular-nums leading-snug">
                                                    {formatUSD(
                                                        item.price_at_purchase * item.quantity
                                                    )}
                                                </p>
                                                <p className="text-[10px] font-mono tabular-nums text-neutral-400 mt-0.5">
                                                    {formatVES(
                                                        item.price_at_purchase *
                                                            item.quantity *
                                                            activeRate
                                                    )}
                                                </p>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* RESUMEN FINANCIERO INTEGRAL */}
                        <div className="avoid-break flex flex-col md:flex-row print:flex-row justify-between items-stretch md:items-start print:items-start pt-4 border-t border-neutral-200/60 gap-6">
                            {/* Columna Izquierda: Nota Legal + Aviso Estético Discreto de Incentivo en Divisas */}
                            <div className="w-full md:w-[48%] print:w-[48%] space-y-3">
                              {isQuoteActive &&
                                    hasHardCurrencyAvailableInQuote &&
                                    quoteFinancials.potentialFxSavingsUSD > 0 && (
                                        <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200/70 print-hidden">
                                            <div className="flex items-center justify-between gap-2 mb-1">
                                                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-950">
                                                    <Sparkles
                                                        size={13}
                                                        strokeWidth={2}
                                                        className="text-emerald-700 shrink-0"
                                                    />
                                                    <span>Beneficio por pago en divisas</span>
                                                </span>
                                                <span className="text-[11px] font-mono font-bold tabular-nums text-emerald-800 bg-white/90 px-2 py-0.5 rounded border border-emerald-200/60">
                                                    Ahorras{' '}
                                                    {formatUSD(quoteFinancials.potentialFxSavingsUSD)}
                                                </span>
                                            </div>
                                            <p className="text-[11px] text-emerald-900/80 leading-relaxed">
                                                Esta proforma incluye artículos con descuento en
                                                divisas. Si seleccionas{' '}
                                                <strong className="font-semibold text-emerald-950">
                                                    {formattedHardCurrencyList}
                                                </strong>{' '}
                                                abajo al reportar tu pago, el total se ajustará
                                                automáticamente a{' '}
                                                <strong className="font-mono font-semibold text-emerald-950 tabular-nums">
                                                    {formatUSD(quoteFinancials.cashTotalUSD)}
                                                </strong>
                                                .
                                            </p>
                                        </div>
                                    )}

                                {!isPaymentVerified && (
                                    <div className="p-3.5 rounded-xl bg-neutral-50/80 border border-neutral-200/50">
                                        <p className="text-[10px] text-neutral-500 leading-relaxed">
                                            Valores expresados en divisa base. Los pagos en
                                            Bolívares (Bs) se calculan a la tasa oficial del Banco
                                            Central de Venezuela (BCV) vigente al momento de
                                            registrar el pago.
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Columna Derecha: Cálculos y Totales Cuadrados Verticalmente */}
                            <div className="w-full md:w-[300px] print:w-[300px] space-y-3">
                                <div className="space-y-1.5 border-b border-neutral-100 pb-3 text-xs">
                                    <div className="flex justify-between text-neutral-500">
                                        <span>Subtotal base</span>
                                        <span className="font-mono tabular-nums text-neutral-800">
                                            {formatUSD(quoteFinancials.grossNominalSubtotalUSD)}
                                        </span>
                                    </div>

                                    {Number(order.tip_amount_usd) > 0 && (
                                        <div className="flex justify-between text-emerald-700 pt-0.5">
                                            <span>Propina de servicio</span>
                                            <span className="font-mono tabular-nums">
                                                +{formatUSD(order.tip_amount_usd)}
                                            </span>
                                        </div>
                                    )}

                                    {/* DESCUENTOS AUDITABLES */}
                                    {(Number(order.promo_discount_usd) > 0 ||
                                        Number(order.wholesale_discount_usd) > 0 ||
                                        Number(order.affiliate_discount_usd) > 0 ||
                                        quoteFinancials.effectiveFxSavingsUSD > 0) && (
                                        <div className="py-1.5 my-1 border-y border-neutral-100 space-y-1 text-[11px]">
                                            {Number(order.promo_discount_usd) > 0 && (
                                                <div className="flex justify-between items-center text-emerald-700 font-medium">
                                                    <span>Descuento promocional</span>
                                                    <span className="font-mono tabular-nums">
                                                        -{formatUSD(order.promo_discount_usd)}
                                                    </span>
                                                </div>
                                            )}
                                            {Number(order.wholesale_discount_usd) > 0 && (
                                                <div className="flex justify-between items-center text-emerald-700 font-medium">
                                                    <span>Descuento mayorista</span>
                                                    <span className="font-mono tabular-nums">
                                                        -{formatUSD(order.wholesale_discount_usd)}
                                                    </span>
                                                </div>
                                            )}
                                            {Number(order.affiliate_discount_usd) > 0 && (
                                                <div className="flex justify-between items-center text-emerald-700 font-medium">
                                                    <span>Código promocional</span>
                                                    <span className="font-mono tabular-nums">
                                                        -{formatUSD(order.affiliate_discount_usd)}
                                                    </span>
                                                </div>
                                            )}
                                            {quoteFinancials.effectiveFxSavingsUSD > 0 && (
                                                <div className="flex justify-between items-center text-emerald-700 font-semibold">
                                                    <span>Ahorro pago en divisas</span>
                                                    <span className="font-mono tabular-nums">
                                                        -
                                                        {formatUSD(
                                                            quoteFinancials.effectiveFxSavingsUSD
                                                        )}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {order.is_tax_applied && (
                                        <div className="flex justify-between text-neutral-700 pt-1">
                                            <span>I.V.A. ({order.tax_percentage}%)</span>
                                            <span className="font-mono tabular-nums">
                                                +{formatUSD(quoteFinancials.effectiveTaxUSD)}
                                            </span>
                                        </div>
                                    )}

                                    {shippingCostValue > 0 && (
                                        <div className="flex justify-between text-neutral-500">
                                            <span>Servicio de envío</span>
                                            <span className="font-mono tabular-nums">
                                                +{formatUSD(shippingCostValue)}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                <div className="flex justify-between items-baseline pt-0.5">
                                    <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
                                        {isSelectingHardCurrency
                                            ? 'Total en Divisas'
                                            : 'Total a Pagar'}
                                    </span>
                                    <span className="text-2xl font-bold font-mono tabular-nums text-neutral-950 tracking-tight">
                                        {formatUSD(quoteFinancials.effectiveTotalUSD)}
                                    </span>
                                </div>

                                {/* TARJETA DE EQUIVALENTE OFICIAL BCV */}
                                <div className="p-3 bg-neutral-950 text-white rounded-xl flex justify-between items-center border border-neutral-800">
                                    <div className="flex flex-col">
                                        <span className="text-[9px] font-mono uppercase tracking-wider text-neutral-400">
                                            Pago en Bolívares (BCV)
                                        </span>
                                        <span className="text-[10px] text-neutral-500 font-mono tabular-nums">
                                            Tasa: {formatVES(activeRate, false)}
                                        </span>
                                    </div>
                                    <span className="text-sm font-bold font-mono tabular-nums tracking-tight">
                                        {formatVES(totalBs)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                  {/* MÓDULO DE REPORTE DE PAGO (Solo visible en proformas activas) */}
                    {isQuoteActive && stockIssues.length === 0 && (
                        <div className="bg-white rounded-xl p-5 md:p-8 border border-neutral-200/70 print-hidden space-y-6">
                            {/* PASO 1: COMPUERTA DE DATOS FISCALES DE FACTURACIÓN */}
                            <div className="rounded-xl border border-neutral-200/80 bg-[#FAFAFC] p-4 sm:p-5 space-y-4">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <FileText size={15} className="text-neutral-700" />
                                            <h4 className="text-xs sm:text-sm font-semibold text-neutral-950">
                                                1. Datos Fiscales de Facturación
                                            </h4>
                                            {isFiscalDataComplete ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200/70 text-[10px] font-mono font-semibold text-emerald-800">
                                                    <Check size={11} strokeWidth={2.5} />
                                                    Completos
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200/80 text-[10px] font-mono font-semibold text-amber-800">
                                                    Requerido para pagar
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-[11px] text-neutral-500 mt-0.5">
                                            Verifica o completa tus datos fiscales para emitir tu comprobante oficial.
                                        </p>
                                    </div>

                                    {isFiscalDataComplete && !isEditingFiscal && (
                                        <button
                                            type="button"
                                            onClick={() => setIsEditingFiscal(true)}
                                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white border border-neutral-200/90 hover:border-neutral-900 text-[11px] font-medium text-neutral-700 hover:text-neutral-950 transition-colors cursor-pointer shrink-0"
                                        >
                                            <PenSquare size={12} />
                                            <span>Editar</span>
                                        </button>
                                    )}
                                </div>

                                {!isEditingFiscal && isFiscalDataComplete ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 text-xs bg-white p-3.5 rounded-lg border border-neutral-200/60">
                                        <div>
                                            <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 block">
                                                Nombre / Razón Social
                                            </span>
                                            <span className="font-semibold text-neutral-900">
                                                {fiscalName}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 block">
                                                Cédula / RIF
                                            </span>
                                            <span className="font-mono font-semibold text-neutral-900">
                                                {dniPrefix}-{fiscalDniNumber}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 block">
                                                Teléfono WhatsApp
                                            </span>
                                            <span className="font-mono text-neutral-800">
                                                {fiscalPhone}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 block">
                                                Dirección Fiscal
                                            </span>
                                            <span className="text-neutral-800 line-clamp-1">
                                                {fiscalAddress}
                                            </span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                                        {/* Nombre o Razón Social */}
                                        <div>
                                            <label className="text-[11px] font-medium text-neutral-700 mb-1 block">
                                                Nombre Completo o Razón Social{' '}
                                                <span className="text-amber-600">*</span>
                                            </label>
                                            <div className="relative">
                                                <User
                                                    size={13}
                                                    className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
                                                />
                                                <input
                                                    type="text"
                                                    value={fiscalName}
                                                    onChange={(e) => setFiscalName(e.target.value)}
                                                    placeholder="Ej. Inversiones Preziso C.A."
                                                    className={`w-full h-10 pl-8 pr-3 bg-white rounded-lg text-xs text-neutral-950 placeholder:text-neutral-400 outline-none transition-colors border ${
                                                        fiscalName.trim().length < 2
                                                            ? 'border-amber-300 focus:border-neutral-900'
                                                            : 'border-neutral-200 focus:border-neutral-900'
                                                    }`}
                                                />
                                            </div>
                                        </div>

                                       {/* Cédula o RIF con Desplegable Integrado */}
                                        <div className="relative">
                                            <label className="text-[11px] font-medium text-neutral-700 mb-1 block">
                                                Cédula de Identidad o RIF{' '}
                                                <span className="text-amber-600">*</span>
                                            </label>
                                            <div
                                                className={`flex items-center h-10 px-3 bg-white rounded-lg transition-colors border ${
                                                    !/^\d{5,10}$/.test(fiscalDniNumber.trim())
                                                        ? 'border-amber-300 focus-within:border-neutral-900'
                                                        : 'border-neutral-200 focus-within:border-neutral-900'
                                                }`}
                                            >
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setIsDniPrefixOpen((prev) => !prev)
                                                    }
                                                    className="flex items-center gap-1 pr-2.5 text-xs font-mono font-bold text-neutral-900 cursor-pointer select-none shrink-0"
                                                >
                                                    <span>{dniPrefix}</span>
                                                    <ChevronDown
                                                        size={13}
                                                        className={`text-neutral-400 transition-transform ${
                                                            isDniPrefixOpen ? 'rotate-180' : ''
                                                        }`}
                                                    />
                                                </button>
                                                <div className="h-4 w-[1px] bg-neutral-200 mr-2.5 shrink-0" />
                                                <input
                                                    type="text"
                                                    inputMode="numeric"
                                                    value={fiscalDniNumber}
                                                    onChange={(e) => {
                                                        const clean = e.target.value
                                                            .replace(/^[VJEGPvjegp][-]?/i, '')
                                                            .replace(/[^0-9]/g, '')
                                                            .slice(0, 10)
                                                        setFiscalDniNumber(clean)
                                                    }}
                                                    placeholder="123456789"
                                                    className="flex-1 min-w-0 bg-transparent border-0 p-0 text-xs font-mono tabular-nums text-neutral-950 placeholder:font-sans placeholder:text-neutral-400 outline-none focus:ring-0"
                                                />
                                            </div>

                                            {isDniPrefixOpen && (
                                                <div className="absolute left-0 top-full mt-1 w-40 bg-white border border-neutral-200 rounded-xl p-1 shadow-[0_12px_30px_rgba(0,0,0,0.12)] z-50">
                                                    {DNI_PREFIXES.map((pref) => (
                                                        <button
                                                            key={pref}
                                                            type="button"
                                                            onClick={() => {
                                                                setDniPrefix(pref)
                                                                setIsDniPrefixOpen(false)
                                                            }}
                                                            className={`w-full px-2.5 py-1.5 rounded-lg text-left text-xs font-mono flex items-center justify-between transition-colors cursor-pointer ${
                                                                dniPrefix === pref
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
                                                </div>
                                            )}
                                        </div>

                                        {isFiscalDataComplete && (
                                            <div className="sm:col-span-2 flex justify-end pt-1">
                                                <button
                                                    type="button"
                                                    onClick={() => setIsEditingFiscal(false)}
                                                    className="px-3.5 py-1.5 rounded-lg bg-neutral-950 text-white text-[11px] font-semibold hover:bg-neutral-800 transition-colors cursor-pointer"
                                                >
                                                    Confirmar datos fiscales
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* PASO 2: SELECCIÓN DE MÉTODO DE PAGO */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                                <div>
                                    <h3 className="text-sm font-semibold text-neutral-950 flex items-center gap-2">
                                        <CreditCard size={16} className="text-neutral-500" />
                                        <span>2. Reportar pago de esta proforma</span>
                                    </h3>
                                    <p className="text-xs text-neutral-500 mt-0.5">
                                        Elige cómo deseas pagar para ver los datos bancarios y el
                                        monto exacto.
                                    </p>
                                </div>

                                {quoteFinancials.potentialFxSavingsUSD > 0 &&
                                    hasHardCurrencyAvailableInQuote && (
                                        <span
                                            className={`self-start sm:self-auto text-[11px] font-mono tabular-nums px-2.5 py-1 rounded-lg border transition-colors ${
                                                isSelectingHardCurrency
                                                    ? 'bg-emerald-950 text-emerald-300 border-emerald-800 font-semibold'
                                                    : 'bg-emerald-50 text-emerald-800 border-emerald-200/70'
                                            }`}
                                        >
                                            {isSelectingHardCurrency
                                                ? `Descuento en divisas activo (-${formatUSD(quoteFinancials.potentialFxSavingsUSD)})`
                                                : `Ahorra ${formatUSD(quoteFinancials.potentialFxSavingsUSD)} pagando en divisas`}
                                        </span>
                                    )}
                            </div>

                            {/* Selector de Métodos */}
                            <div className="flex flex-wrap gap-2">
                                {activePaymentMethods.map((pm) => {
                                    const config = getPaymentConfig(pm)
                                    const isHard = HARD_CURRENCY_METHODS.includes(pm)
                                    return (
                                        <button
                                            key={pm}
                                            type="button"
                                            onClick={() => setSelectedMethod(pm)}
                                            className={`flex items-center justify-center gap-2 h-10 px-3.5 rounded-lg text-xs font-medium transition-all border cursor-pointer active:scale-[0.98] ${
                                                selectedMethod === pm
                                                    ? config.btnSelected
                                                    : config.btnIdle
                                            }`}
                                        >
                                            <config.icon
                                                size={14}
                                                className={
                                                    selectedMethod === pm
                                                        ? 'text-white'
                                                        : 'text-neutral-400'
                                                }
                                            />
                                            <span>{pm}</span>
                                            {isHard &&
                                                quoteFinancials.potentialFxSavingsUSD > 0 && (
                                                    <span
                                                        className={`text-[10px] font-mono tabular-nums px-1.5 py-0.5 rounded ${
                                                            selectedMethod === pm
                                                                ? 'bg-emerald-500/20 text-emerald-300'
                                                                : 'bg-emerald-50 text-emerald-700'
                                                        }`}
                                                    >
                                                        {formatUSD(quoteFinancials.cashTotalUSD)}
                                                    </span>
                                                )}
                                        </button>
                                    )
                                })}
                            </div>

                            {selectedMethod && (
                                <div className="space-y-5 pt-2 animate-in fade-in duration-200">
                                    {/* PANEL INTELIGENTE DE DATOS BANCARIOS */}
                                    {store.payment_config[paymentKeysMap[selectedMethod]]
                                        ?.details &&
                                        (() => {
                                            const isHardCurrency =
                                                HARD_CURRENCY_METHODS.includes(selectedMethod)

                                            const amountToPayUSD = isHardCurrency
                                                ? quoteFinancials.cashTotalUSD
                                                : Number(order.total_usd)

                                            const formattedTotal = isHardCurrency
                                                ? formatUSD(amountToPayUSD)
                                                : formatVES(totalBs)

                                            const rawNumericAmount = isHardCurrency
                                                ? Number(amountToPayUSD).toFixed(2)
                                                : formatBankTransferAmount(totalBs)

                                            const rawText: string =
                                                store.payment_config[paymentKeysMap[selectedMethod]]
                                                    ?.details || ''
                                            const rawChunks: string[] = rawText.includes('\n')
                                                ? rawText.split('\n')
                                                : rawText.split(/[,;|]/)

                                            interface ParsedPaymentItem {
                                                label: string | null
                                                value: string
                                                textToCopy: string
                                            }

                                            const parsedItems: ParsedPaymentItem[] = rawChunks
                                                .map((c: string) => c.trim())
                                                .filter(Boolean)
                                                .map((item: string): ParsedPaymentItem => {
                                                    const hasColon = item.includes(':')
                                                    let label = hasColon
                                                        ? item.split(':')[0].trim()
                                                        : null
                                                    const value = hasColon
                                                        ? item.split(':').slice(1).join(':').trim()
                                                        : item

                                                    if (!label) {
                                                        const clean = value.replace(/[\s-]/g, '')

                                                        if (selectedMethod === 'Binance') {
                                                            if (/^\d{6,12}$/.test(clean))
                                                                label = 'Binance Pay ID (UID)'
                                                            else if (/@/.test(value))
                                                                label = 'Correo Binance Pay'
                                                            else label = 'ID / Correo Binance'
                                                        } else if (selectedMethod === 'Zelle') {
                                                            if (/@/.test(value))
                                                                label = 'Correo Zelle'
                                                            else if (/^\+?\d{10,15}$/.test(clean))
                                                                label = 'Teléfono Zelle'
                                                            else label = 'Titular Zelle'
                                                        } else {
                                                            if (
                                                                /^(0412|0414|0424|0416|0426|\+58)\d+/.test(
                                                                    clean
                                                                )
                                                            )
                                                                label = 'Teléfono / Pago Móvil'
                                                            else if (
                                                                /^(V|E|J|G|P)?-?\d{6,9}$/i.test(
                                                                    clean
                                                                ) &&
                                                                !clean.startsWith('04')
                                                            )
                                                                label = 'Cédula / RIF'
                                                            else if (/^\d{20}$/.test(clean))
                                                                label = 'Número de Cuenta'
                                                            else if (
                                                                /banco|venezuela|banesco|mercantil|provincial|bnc|bancaribe|banplus|plaza|100%|tesoro|exterior|bancamiga|0102|0134|0105|0108/i.test(
                                                                    value
                                                                )
                                                            )
                                                                label = 'Banco Destino'
                                                            else if (/@/.test(value))
                                                                label = 'Correo Electrónico'
                                                        }
                                                    }

                                                    const isNumericField =
                                                        label &&
                                                        (label.includes('Cuenta') ||
                                                            label.includes('Teléfono') ||
                                                            label.includes('Cédula'))
                                                    const cleanTextToCopy = isNumericField
                                                        ? value.replace(/[\s-]/g, '')
                                                        : value

                                                    return {
                                                        label,
                                                        value: value || item,
                                                        textToCopy:
                                                            cleanTextToCopy || value || item,
                                                    }
                                                })

                                            const copyAllText = [
                                                `Monto: ${formattedTotal}`,
                                                ...parsedItems.map((i: ParsedPaymentItem) =>
                                                    i.label ? `${i.label}: ${i.value}` : i.value
                                                ),
                                            ].join('\n')

                                            return (
                                                <div className="bg-[#FAFAFC] border border-neutral-200/80 rounded-xl p-3.5 sm:p-4 space-y-2.5">
                                                    <div className="flex justify-between items-center px-0.5 pb-1">
                                                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-500">
                                                            {selectedMethod === 'Efectivo'
                                                                ? 'Instrucciones de entrega y pago'
                                                                : `Datos para transferir (${selectedMethod})`}
                                                        </span>

                                                        {selectedMethod !== 'Efectivo' && (
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    handleCopyItem(
                                                                        copyAllText,
                                                                        'all'
                                                                    )
                                                                }
                                                                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-semibold transition-all active:scale-95 cursor-pointer ${
                                                                    copiedKey === 'all'
                                                                        ? 'bg-neutral-950 text-white border-neutral-950'
                                                                        : 'bg-white text-neutral-700 border-neutral-200/80 hover:border-neutral-900'
                                                                }`}
                                                            >
                                                                {copiedKey === 'all' ? (
                                                                    <Check
                                                                        size={11}
                                                                        strokeWidth={2.5}
                                                                        className="text-emerald-400"
                                                                    />
                                                                ) : (
                                                                    <Copy
                                                                        size={11}
                                                                        strokeWidth={2}
                                                                    />
                                                                )}
                                                                <span>
                                                                    {copiedKey === 'all'
                                                                        ? 'Datos copiados'
                                                                        : 'Copiar todo'}
                                                                </span>
                                                            </button>
                                                        )}
                                                    </div>

                                                    <div className="flex flex-col gap-1.5">
                                                        {/* FILA 1: MONTO EXACTO A TRANSFERIR */}
                                                        <div className="flex items-center justify-between p-3 rounded-lg bg-white border border-neutral-200/80 gap-2">
                                                            <div className="flex flex-col min-w-0">
                                                                <span className="text-[10px] font-medium text-neutral-400 leading-none mb-1">
                                                                    Monto exacto a pagar
                                                                    {isHardCurrency &&
                                                                    quoteFinancials.potentialFxSavingsUSD >
                                                                        0
                                                                        ? ' (Con descuento en divisas)'
                                                                        : ''}
                                                                </span>
                                                                <span className="text-sm font-bold text-neutral-950 font-mono tabular-nums select-all">
                                                                    {formattedTotal}
                                                                </span>
                                                            </div>

                                                            {selectedMethod !== 'Efectivo' && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        handleCopyItem(
                                                                            rawNumericAmount,
                                                                            'amount'
                                                                        )
                                                                    }
                                                                    className={`px-2.5 py-1.5 rounded-lg border text-[10px] font-semibold transition-all shrink-0 flex items-center gap-1.5 active:scale-95 cursor-pointer ${
                                                                        copiedKey === 'amount'
                                                                            ? 'bg-neutral-950 text-white border-neutral-950'
                                                                            : 'bg-[#FAFAFC] text-neutral-700 border-neutral-200 hover:border-neutral-900'
                                                                    }`}
                                                                >
                                                                    {copiedKey === 'amount' ? (
                                                                        <Check
                                                                            size={11}
                                                                            strokeWidth={2.5}
                                                                            className="text-emerald-400"
                                                                        />
                                                                    ) : (
                                                                        <Copy
                                                                            size={11}
                                                                            strokeWidth={2}
                                                                        />
                                                                    )}
                                                                    <span>
                                                                        {copiedKey === 'amount'
                                                                            ? 'Copiado'
                                                                            : 'Copiar monto'}
                                                                    </span>
                                                                </button>
                                                            )}
                                                        </div>

                                                        {/* FILAS DESGLOSADAS DE CADA DATO */}
                                                        {parsedItems.map(
                                                            (
                                                                item: ParsedPaymentItem,
                                                                idx: number
                                                            ) => {
                                                                const isItemCopied =
                                                                    copiedKey === `item-${idx}`

                                                                return (
                                                                    <div
                                                                        key={idx}
                                                                        className="flex items-center justify-between p-3 rounded-lg bg-white border border-neutral-200/80 gap-2"
                                                                    >
                                                                        <div className="flex flex-col min-w-0 pr-1">
                                                                            {item.label && (
                                                                                <span className="text-[10px] font-medium text-neutral-400 leading-none mb-1">
                                                                                    {item.label}
                                                                                </span>
                                                                            )}
                                                                            <span className="text-xs sm:text-sm font-semibold text-neutral-800 font-mono truncate select-all leading-tight">
                                                                                {item.value}
                                                                            </span>
                                                                        </div>

                                                                        {selectedMethod !==
                                                                            'Efectivo' && (
                                                                            <button
                                                                                type="button"
                                                                                onClick={() =>
                                                                                    handleCopyItem(
                                                                                        item.textToCopy,
                                                                                        `item-${idx}`
                                                                                    )
                                                                                }
                                                                                className={`px-2.5 py-1.5 rounded-lg border text-[10px] font-semibold transition-all shrink-0 flex items-center gap-1.5 active:scale-95 cursor-pointer ${
                                                                                    isItemCopied
                                                                                        ? 'bg-neutral-950 text-white border-neutral-950'
                                                                                        : 'bg-[#FAFAFC] text-neutral-700 border-neutral-200 hover:border-neutral-900'
                                                                                }`}
                                                                            >
                                                                                {isItemCopied ? (
                                                                                    <Check
                                                                                        size={11}
                                                                                        strokeWidth={
                                                                                            2.5
                                                                                        }
                                                                                        className="text-emerald-400"
                                                                                    />
                                                                                ) : (
                                                                                    <Copy
                                                                                        size={11}
                                                                                        strokeWidth={
                                                                                            2
                                                                                        }
                                                                                    />
                                                                                )}
                                                                                <span>
                                                                                    {isItemCopied
                                                                                        ? 'Copiado'
                                                                                        : 'Copiar'}
                                                                                </span>
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                )
                                                            }
                                                        )}
                                                    </div>
                                                </div>
                                            )
                                        })()}

                                    <div className="grid md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs font-medium text-neutral-600 mb-1.5 block">
                                                Nº de referencia o titular (Opcional)
                                            </label>
                                            <input
                                                type="text"
                                                value={reference}
                                                onChange={(e) => setReference(e.target.value)}
                                                className="w-full h-10 bg-[#FAFAFC] border border-neutral-200 focus:bg-white focus:border-neutral-900 rounded-lg px-3.5 text-xs font-mono outline-none transition-colors placeholder:font-sans placeholder:text-neutral-400"
                                                placeholder="Ej: 987456"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-medium text-neutral-600 mb-1.5 block">
                                                Comprobante de pago{' '}
                                                {['Zelle', 'Efectivo'].includes(selectedMethod)
                                                    ? '(Opcional)'
                                                    : '*'}
                                            </label>
                                            <div className="relative w-full">
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={(e) =>
                                                        e.target.files &&
                                                        setReceiptFile(e.target.files[0])
                                                    }
                                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                                />
                                                <div
                                                    className={`w-full h-10 flex items-center justify-center gap-2 px-3.5 rounded-lg border transition-colors text-xs font-medium ${
                                                        receiptFile
                                                            ? 'bg-neutral-950 text-white border-neutral-950'
                                                            : 'bg-[#FAFAFC] text-neutral-600 border-neutral-200 hover:border-neutral-400 hover:text-neutral-950'
                                                    }`}
                                                >
                                                    {receiptFile ? (
                                                        <>
                                                            <CheckCircle2
                                                                size={14}
                                                                className="text-emerald-400 shrink-0"
                                                            />
                                                            <span className="truncate max-w-[200px]">
                                                                {receiptFile.name}
                                                            </span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Upload size={14} />
                                                            <span>Adjuntar captura de pago</span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                 <button
                                        type="button"
                                        onClick={handleProcessPayment}
                                        disabled={submitting || !isFiscalDataComplete}
                                        className="w-full h-11 bg-neutral-950 text-white rounded-xl font-semibold text-xs hover:bg-neutral-800 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-45 cursor-pointer"
                                    >
                                        {submitting ? (
                                            <Loader2 className="animate-spin" size={15} />
                                        ) : !isFiscalDataComplete ? (
                                            <span>
                                                Completa tus datos fiscales arriba para confirmar el pago
                                            </span>
                                        ) : (
                                            <>
                                                <span>
                                                    Confirmar pago por{' '}
                                                    {isSelectingHardCurrency
                                                        ? formatUSD(
                                                              quoteFinancials.effectiveTotalUSD
                                                          )
                                                        : formatVES(totalBs)}
                                                </span>
                                                <ArrowRight size={14} />
                                            </>
                                        )}
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* PIE DE MARCA EDITORIAL */}
                    <div className="mt-6 mb-4 text-center print-hidden flex justify-center select-none">
                        <a
                            href="https://preziso.shop?utm_source=proforma&utm_medium=document_view&utm_campaign=viral_loop"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group inline-flex items-center gap-2 pb-1 border-b border-neutral-200 hover:border-neutral-950 transition-colors duration-200 text-neutral-400 hover:text-neutral-950 cursor-pointer"
                        >
                            <span className="font-mono text-[9px] uppercase tracking-widest">
                                Tecnología de facturación por
                            </span>
                            <span className="font-black text-xs text-neutral-900 tracking-tight">
                                PREZISO
                            </span>
                            <span className="font-mono text-[10px] text-neutral-400 group-hover:text-neutral-950 transition-colors">
                                preziso.shop
                            </span>
                            <ArrowUpRight
                                size={11}
                                strokeWidth={2.5}
                                className="text-neutral-400 group-hover:text-neutral-950 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform"
                            />
                        </a>
                    </div>
                </div>
            </div>
        </>
    )
}