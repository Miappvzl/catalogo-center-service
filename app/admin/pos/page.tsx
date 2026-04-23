'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getSupabase } from '@/lib/supabase-client'
import { Search, Plus, Minus, Trash2, Calculator, FileText, User, Phone, ShoppingBag, X, Loader2, DollarSign, Truck, Store, MapPin, Hash, Package, Banknote, ChevronDown, PenSquare, Receipt } from 'lucide-react'
import Swal from 'sweetalert2'
import Image from 'next/image'

// --- TIPOS ESTRICTOS (Sincronizados con Catálogo) ---
type Variant = { id: string, size: string, color_name: string, stock: number, override_usd_price: number | null, override_usd_penalty: number | null }
type Product = { id: number, name: string, image_url: string, usd_cash_price: number, usd_penalty: number, stock: number, is_tax_exempt?: boolean, product_variants: Variant[] }
type CartItem = { cartId: string, productId: number | null, variantId?: string, name: string, variantInfo?: string, basePrice: number, penalty: number, qty: number, maxStock: number, image: string, isTaxExempt: boolean }

export default function POSPage() {
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

    // ÍTEMS PERSONALIZADOS
    const [isCustomItemModalOpen, setIsCustomItemModalOpen] = useState(false)
    const [customItem, setCustomItem] = useState({ name: '', price: '' })

    // CARRITO
    const [cart, setCart] = useState<CartItem[]>([])
    // DATOS FISCALES DEL CLIENTE
    const [customerName, setCustomerName] = useState('')
    const [customerPhone, setCustomerPhone] = useState('')
    const [customerDNI, setCustomerDNI] = useState('')
    const [customerAddress, setCustomerAddress] = useState('')

    const [shippingMethod, setShippingMethod] = useState<'pickup' | 'local_delivery' | 'courier'>('pickup')
    const [shippingAddress, setShippingAddress] = useState('')

    // MODO DE OPERACIÓN E IMPUESTOS
    const [operationMode, setOperationMode] = useState<'paid' | 'quote'>('paid')
    const [documentType, setDocumentType] = useState<'invoice' | 'note'>('note')
    const [applyTax, setApplyTax] = useState(false)
    const [taxPercentage, setTaxPercentage] = useState(16)

    // PAGOS
    const [activePaymentMethods, setActivePaymentMethods] = useState<string[]>([])
    const [quoteAllowedMethods, setQuoteAllowedMethods] = useState<string[]>([])
    const [selectedPayment, setSelectedPayment] = useState<string>('Efectivo')
    const [customPayment, setCustomPayment] = useState('')
    const [paymentReference, setPaymentReference] = useState('')

    useEffect(() => {
        const initPOS = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const [storeRes, productsRes, ratesRes] = await Promise.all([
                supabase.from('stores').select('id, slug, name, payment_config, shipping_config, wholesale_config, currency_type, default_tax_active, default_tax_percentage, fiscal_profile, legal_name, legal_id, fiscal_address').eq('user_id', user.id).single(),
                supabase.from('products').select('id, name, image_url, usd_cash_price, usd_penalty, stock, is_tax_exempt, product_variants(id, size, color_name, stock, override_usd_price, override_usd_penalty)').eq('user_id', user.id).eq('status', 'active'),
                supabase.from('app_config').select('usd_rate, eur_rate').single()
            ])

            if (storeRes.data) {
                setStore(storeRes.data)
                if (storeRes.data.wholesale_config) setWholesale(storeRes.data.wholesale_config)

                const { data: promos } = await supabase.from('promotions').select('*').eq('store_id', storeRes.data.id).eq('is_active', true)
                if (promos) setPromotions(promos)

                const fiscalProfile = storeRes.data.fiscal_profile || 'informal';
                const mustApplyTax = fiscalProfile === 'ordinary' || fiscalProfile === 'special';

                setApplyTax(mustApplyTax);
                setDocumentType(mustApplyTax ? 'invoice' : 'note');
                setTaxPercentage(storeRes.data.default_tax_percentage ?? 16);

                const pConfig = storeRes.data.payment_config || {}
                const pm = []
                if (pConfig.cash?.active) pm.push('Efectivo')
                if (pConfig.pago_movil?.active) pm.push('Pago Móvil')
                if (pConfig.transferencia?.active) pm.push('Transferencia')
                if (pConfig.zelle?.active) pm.push('Zelle')
                if (pConfig.binance?.active) pm.push('Binance')
                if (pConfig.zinli?.active) pm.push('Zinli')
                if (pConfig.wally?.active) pm.push('WallyTech')

                setActivePaymentMethods(pm)
                setQuoteAllowedMethods(pm)
                if (pm.length > 0) setSelectedPayment(pm[0])
            }
            if (productsRes.data) setProducts(productsRes.data as Product[])
            if (ratesRes.data) setRates(ratesRes.data)

            setLoading(false)
        }
        initPOS()
    }, [supabase])

    const filteredProducts = useMemo(() => {
        return products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
    }, [products, searchQuery])

    // MOTOR MATEMÁTICO INDUSTRIAL
    const isEur = store?.currency_type === 'eur'
    const activeRate = isEur ? rates.eur_rate : rates.usd_rate

    const totalItemsCount = useMemo(() => cart.reduce((acc, item) => acc + item.qty, 0), [cart])

   const cartEngine = useMemo(() => {
        let totalListNominal = 0; let totalCashNominal = 0; let listPromoDiscounts = 0; let cashPromoDiscounts = 0;
        let taxableSubtotalList = 0; let taxableSubtotalCash = 0; // 🚀 BASES IMPONIBLES (Solo lo que paga IVA)

        let bogoPool: Record<string, { listPrices: number[], cashPrices: number[], buy: number, pay: number }> = {};
        const promoCounts: Record<string, number> = {};

        cart.forEach(item => {
            promotions?.forEach(p => {
                if (p.promo_type === 'bogo' && (p.linked_products || []).some((id: any) => String(id) === String(item.productId))) {
                    promoCounts[p.id] = (promoCounts[p.id] || 0) + item.qty;
                }
            })
        });

        const processedItems = cart.map(item => {
            const listPrice = item.basePrice + item.penalty;
            const cashPrice = item.basePrice;
            totalListNominal += listPrice * item.qty; totalCashNominal += cashPrice * item.qty;
            let itemListDiscount = 0; let itemCashDiscount = 0;

            const applicablePromos = promotions?.filter((p: any) => p.is_active && (p.linked_products || []).some((id: any) => String(id) === String(item.productId))) || [];
            let bestPromo = null;

            if (applicablePromos.length > 0) {
                let maxEffective = 0;
                applicablePromos.forEach(p => {
                    let eff = p.promo_type === 'percentage' ? Number(p.discount_percentage) : (p.promo_type === 'bogo' && (promoCounts[p.id] || 0) >= p.bogo_buy ? ((p.bogo_buy - p.bogo_pay) / p.bogo_buy) * 100 : 0);
                    if (eff > maxEffective) { maxEffective = eff; bestPromo = p; }
                });

                if (bestPromo && (bestPromo as any).promo_type === 'percentage') {
                    const pct = (bestPromo as any).discount_percentage / 100;
                    itemListDiscount = (listPrice * item.qty) * pct; itemCashDiscount = (cashPrice * item.qty) * pct;
                    listPromoDiscounts += itemListDiscount; cashPromoDiscounts += itemCashDiscount;
                }
            }

           const finalListPrice = listPrice - (itemListDiscount / item.qty);
            const finalCashPrice = cashPrice - (itemCashDiscount / item.qty);

            // 🚀 ESCUDO ARQUITECTÓNICO: Si la tienda NO cobra impuestos (applyTax es false), ignoramos el flag del producto
            const effectiveIsExempt = applyTax ? item.isTaxExempt : false;

            // Separador fiscal usando la variable protegida
            if (!effectiveIsExempt) {
                taxableSubtotalList += (finalListPrice * item.qty);
                taxableSubtotalCash += (finalCashPrice * item.qty);
            }

            return { ...item, listPrice, cashPrice, finalListPrice, finalCashPrice }
        });

        const finalBsModeUSD = totalListNominal - listPromoDiscounts;
        const finalCashModeUSD = totalCashNominal - cashPromoDiscounts;
        
        return { processedItems, totalListNominal, totalCashNominal, listPromoDiscounts, cashPromoDiscounts, finalBsModeUSD, finalCashModeUSD, taxableSubtotalList, taxableSubtotalCash };
    }, [cart, promotions]);

    // LÓGICA MAYORISTA Y DIVISAS
    const isWholesaleActive = wholesale.active && totalItemsCount >= wholesale.min_items;
    const wholesaleDiscountList = isWholesaleActive ? (cartEngine.totalListNominal * (wholesale.discount_percentage / 100)) : 0;
    const wholesaleDiscountCash = isWholesaleActive ? (cartEngine.totalCashNominal * (wholesale.discount_percentage / 100)) : 0;

    const isHardCurrency = ['Zelle', 'Binance', 'Zinli', 'WallyTech', 'Efectivo'].includes(selectedPayment);
    
    const subtotalListUSD = Math.max(0, cartEngine.finalBsModeUSD - wholesaleDiscountList);
    const subtotalCashUSD = Math.max(0, cartEngine.finalCashModeUSD - wholesaleDiscountCash);
    
    // 🚀 CÁLCULO ESTRICTO DE IVA (Calculado SOLO sobre la base imponible y restando su porción de descuento mayorista si aplica)
    const discountMultiplier = isWholesaleActive ? (1 - (wholesale.discount_percentage / 100)) : 1;
    const taxAmountUSD = applyTax ? (isHardCurrency ? cartEngine.taxableSubtotalCash : cartEngine.taxableSubtotalList) * discountMultiplier * (taxPercentage / 100) : 0;
    
    // TOTALES FINALES
    const totalUSD = (isHardCurrency ? subtotalCashUSD : subtotalListUSD) + taxAmountUSD;
    const totalBS = (subtotalListUSD + (applyTax ? (cartEngine.taxableSubtotalList * discountMultiplier) * (taxPercentage / 100) : 0)) * activeRate;
    
    const actualFxSavings = Math.max(0, subtotalListUSD - subtotalCashUSD);
   
    const handleAddCustomItem = (e: React.FormEvent) => {
        e.preventDefault() // 🚀 Escudo contra la recarga de página

        if (!customItem.name || !customItem.price) return
        
        const cartId = `custom-${Date.now()}` 
        setCart(prev => [...prev, {
            cartId, 
            productId: null, 
            name: customItem.name.trim(), 
            variantInfo: 'Personalizado',
            basePrice: Number(customItem.price), 
            penalty: 0, 
            qty: 1, 
            maxStock: 9999, 
            image: '',
            isTaxExempt: false // 🚀 FIX: Cumplimos con el contrato de TypeScript (Los items manuales pagan IVA por defecto)
        }])
        
        setCustomItem({ name: '', price: '' })
        setIsCustomItemModalOpen(false)
    }
    const handleAddToCart = (product: Product, variant?: Variant) => {
        const cartId = variant ? `${product.id}-${variant.id}` : `${product.id}` 
        const basePrice = variant?.override_usd_price ?? product.usd_cash_price
        const penalty = variant?.override_usd_penalty ?? product.usd_penalty ?? 0
        const variantInfo = variant ? `${variant.color_name || ''} ${variant.size || ''}`.trim() : undefined
        const maxStock = variant ? variant.stock : product.stock
        const isTaxExempt = product.is_tax_exempt || false // 🚀 Leemos si la ley lo exonera

        setCart(prev => {
            const existing = prev.find(item => item.cartId === cartId)
            if (existing) {
                if (existing.qty >= maxStock) {
                    Swal.fire({ title: 'Stock Máximo', text: 'No hay más unidades', icon: 'warning' })
                    return prev
                }
                return prev.map(item => item.cartId === cartId ? { ...item, qty: item.qty + 1 } : item)
            }
            return [...prev, { cartId, productId: product.id, variantId: String(variant?.id || ''), name: product.name, variantInfo, basePrice, penalty, qty: 1, maxStock, image: product.image_url, isTaxExempt: product.is_tax_exempt || false }]
        })
        setSelectedProductForVariant(null)
    }

    const updateQty = (cartId: string, delta: number) => {
        setCart(prev => prev.map(item => {
            if (item.cartId === cartId) {
                const newQty = item.qty + delta
                if (newQty > 0 && newQty <= item.maxStock) return { ...item, qty: newQty }
            }
            return item
        }))
    }

    const removeLine = (cartId: string) => setCart(prev => prev.filter(item => item.cartId !== cartId))

    // --- TRANSACT ENGINE ---
    const handleCheckout = async (type: 'paid' | 'quote') => {
        if (type === 'quote' && !customerName.trim()) {
            return Swal.fire({ icon: 'warning', title: 'Nombre Requerido', text: 'Ingresa el nombre del cliente para guardar el presupuesto.', confirmButtonColor: '#111', customClass: { popup: 'rounded-2xl' } })
        }

        if (type === 'paid' && documentType === 'invoice') {
            if (!customerName.trim() || !customerDNI.trim() || !customerAddress.trim()) {
                return Swal.fire({
                    icon: 'error',
                    title: 'Datos Fiscales Incompletos',
                    text: 'Para emitir una Factura Comercial válida para el SENIAT, el Nombre/Razón Social, CI/RIF y Dirección Fiscal son obligatorios.',
                    confirmButtonColor: '#111',
                    customClass: { popup: 'rounded-2xl' }
                })
            }
        }
        if (selectedPayment === 'Otro' && !customPayment.trim() && type === 'paid') {
            return Swal.fire({ icon: 'warning', title: 'Método Inválido', text: 'Especifica qué método de pago usó el cliente.', confirmButtonColor: '#111', customClass: { popup: 'rounded-2xl' } })
        }

        setIsSubmitting(true)
        try {
            const finalPaymentMethod = type === 'quote' ? quoteAllowedMethods.join(',') : (selectedPayment === 'Otro' ? customPayment.trim() : selectedPayment)
            let deliveryInfoFull = shippingMethod === 'pickup' ? 'Venta en Mostrador / Retiro Personal' : `Envío a: ${shippingAddress}`
            if (paymentReference && type === 'paid') deliveryInfoFull += ` | Ref: ${paymentReference}`

            const { data: order, error: orderError } = await supabase
                .from('orders')
                .insert({
                    store_id: store.id,
                    customer_name: customerName.trim() || 'Cliente Mostrador',
                    customer_phone: customerPhone.trim() || null,
                    customer_dni: customerDNI.trim() || null,
                    customer_address: customerAddress.trim() || null,
                    document_type: type === 'quote' ? 'quote' : documentType,
                    is_tax_applied: applyTax,
                    subtotal_usd: Number((isHardCurrency ? subtotalCashUSD : subtotalListUSD).toFixed(2)),
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
                    currency_type: isEur ? 'eur' : 'usd'
                })
                .select('id, order_number').single()

            if (orderError) throw orderError

            const orderItemsPayload = cartEngine.processedItems.map(item => ({
                order_id: order.id,
                product_id: item.productId,
                variant_id: item.variantId || null,
                product_name: item.name,
                variant_info: item.variantInfo || null,
                quantity: item.qty,
                price_at_purchase: isHardCurrency ? item.finalCashPrice : item.finalListPrice
            }))

            const { error: itemsError } = await supabase.from('order_items').insert(orderItemsPayload)
            if (itemsError) throw new Error('Error al guardar los artículos.')

            setCart([]); setCustomerName(''); setCustomerPhone(''); setPaymentReference(''); setCustomPayment(''); setCustomerDNI(''); setCustomerAddress('');
            setShippingAddress(''); setIsMobileCartOpen(false);

            if (type === 'quote') {
                const quoteUrl = `${window.location.protocol}//${store.slug}.${window.location.host.replace('www.', '')}/quote/${order.id}`
                Swal.fire({
                    icon: 'success', title: 'Presupuesto Creado',
                    html: `Comparte este enlace:<br><br><a href="${quoteUrl}" target="_blank" style="color: #666; font-weight: bold; word-break: break-all;">${quoteUrl}</a>`,
                    confirmButtonText: 'Copiar Enlace', confirmButtonColor: '#111', customClass: { popup: 'rounded-2xl' }
                }).then((result) => { if (result.isConfirmed) navigator.clipboard.writeText(quoteUrl) })
            } else {
                const documentUrl = `${window.location.protocol}//${store.slug}.${window.location.host.replace('www.', '')}/quote/${order.id}`

                Swal.fire({
                    icon: 'success',
                    title: 'Venta Procesada',
                    text: `Orden #${order.order_number} guardada con éxito.`,
                    showCancelButton: true,
                    confirmButtonText: 'Ver Recibo',
                    cancelButtonText: 'Nueva Venta',
                    confirmButtonColor: '#111',
                    cancelButtonColor: '#f3f4f6',
                    customClass: { popup: 'rounded-2xl', cancelButton: 'text-black font-bold', confirmButton: 'font-bold' }
                }).then((result) => {
                    if (result.isConfirmed) window.open(documentUrl, '_blank')
                })

                setProducts(prev => prev.map(p => {
                    let updated = { ...p }
                    cart.forEach(c => {
                        if (c.productId === p.id) {
                            if (c.variantId) updated.product_variants = updated.product_variants.map(v => v.id === c.variantId ? { ...v, stock: v.stock - c.qty } : v)
                            else updated.stock = updated.stock - c.qty
                        }
                    })
                    return updated
                }))
            }
        } catch (error: any) {
            console.error("ERROR FATAL AL INSERTAR:", error);
            Swal.fire({ icon: 'error', title: 'Error', text: error.message || JSON.stringify(error), confirmButtonColor: '#111', customClass: { popup: 'rounded-2xl' } })
        } finally {
            setIsSubmitting(false)
        }
    }

    if (loading) return <div className="h-[100dvh] flex items-center justify-center bg-[#FAFAFA]"><Loader2 className="animate-spin text-gray-300" size={32} /></div>

    return (
        <div className="h-[100dvh] bg-[#FAFAFA] md:bg-white flex flex-col md:flex-row overflow-hidden font-sans text-gray-900 selection:bg-[#3600ff]/20 selection:text-[#3600ff]">

            {/* PANEL IZQUIERDO: CATÁLOGO */}
            <div className="flex-1 flex flex-col min-w-0 w-full h-full relative z-10 bg-[#FAFAFA]">

                {/* Header Buscador Compacto */}
                <div className="px-4 py-4 md:px-6 md:py-6 bg-[#FAFAFA] z-10 shrink-0 border-b border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <h1 className="text-xl font-black tracking-tight hidden lg:block text-gray-900 w-48">Punto de Venta</h1>
                    <div className="flex items-center gap-2 w-full max-w-2xl">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                            <input
                                type="text"
                                placeholder="Buscar en el catálogo..."
                                value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-3 py-2.5 bg-white border border-gray-200 rounded-2xl text-xs font-medium text-gray-900 placeholder:text-gray-400 focus:bg-white focus:border-[#3600ff]/30 focus:ring-4 focus:ring-[#3600ff]/5 outline-none transition-all shadow-[0_2px_10px_-2px_rgba(0,0,0,0.02)]"
                            />
                        </div>
                        <button
                            onClick={() => setIsCustomItemModalOpen(true)}
                            className="shrink-0 bg-white border border-gray-200 text-gray-600 hover:text-gray-900 hover:border-gray-300 px-4 py-2.5 rounded-2xl font-bold text-xs flex items-center gap-2 transition-all shadow-sm active:scale-95"
                        >
                            <PenSquare size={16} /> <span className="hidden sm:inline">Personalizado</span>
                        </button>
                    </div>
                </div>

                {/* Grid de Productos Optimizado */}
                <div className="flex-1 overflow-y-auto px-4 md:px-6 pt-4 pb-32 md:pb-6 no-scrollbar">
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
                        {filteredProducts.map(product => {
                            const totalStock = product.product_variants?.length > 0 ? product.product_variants.reduce((acc, v) => acc + v.stock, 0) : product.stock;
                            const isOutOfStock = totalStock <= 0;

                            return (
                                <button
                                    key={product.id}
                                    onClick={() => {
                                        if (product.product_variants && product.product_variants.length > 0) setSelectedProductForVariant(product)
                                        else handleAddToCart(product)
                                    }}
                                    disabled={isOutOfStock}
                                    className={`relative flex flex-col text-left bg-white rounded-2xl p-2.5 transition-all duration-300 border border-gray-100 ease-out active:scale-95 ${isOutOfStock ? 'opacity-50 grayscale cursor-not-allowed' : 'shadow-[0_2px_15px_-4px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_25px_-6px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 hover:border-gray-200'}`}
                                >
                                    <div className="w-full aspect-square rounded-xl bg-gray-50/50 overflow-hidden mb-3 relative border border-gray-50">
                                        {product.image_url ? <Image src={product.image_url} alt={product.name} fill className="object-cover" sizes="(max-width: 768px) 50vw, 200px" /> : <ShoppingBag className="absolute inset-0 m-auto text-gray-200" size={24} />}
                                        {isOutOfStock && <div className="absolute inset-0 bg-white/70 flex items-center justify-center backdrop-blur-[2px]"><span className="bg-gray-900 text-white text-[9px] font-bold px-2.5 py-1 rounded-full uppercase tracking-widest">Agotado</span></div>}
                                    </div>
                                    <h3 className="font-bold text-gray-800 text-[11px] md:text-xs leading-tight line-clamp-2 w-full mb-2">{product.name}</h3>
                                    <div className="flex items-center justify-between mt-auto w-full pt-2 border-t border-gray-50">
                                        <p className="text-gray-900 font-black text-xs md:text-sm tabular-nums">${product.usd_cash_price.toFixed(2)}</p>
                                        <span className="text-[9px] font-bold text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded-md border border-gray-100">{totalStock} disp.</span>
                                    </div>
                                </button>
                            )
                        })}
                    </div>
                </div>
            </div>

            {/* BOTÓN FLOTANTE MOBILE */}
            <AnimatePresence>
                {!isMobileCartOpen && cart.length > 0 && (
                    <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }} className="md:hidden fixed bottom-6 left-4 right-4 z-40">
                        <button onClick={() => setIsMobileCartOpen(true)} className="w-full bg-gray-900 text-white px-5 py-3.5 rounded-2xl flex items-center justify-between shadow-[0_8px_30px_rgba(0,0,0,0.15)] active:scale-95 transition-transform duration-300 border border-gray-800">
                            <div className="flex items-center gap-3">
                                <div className="relative bg-white/10 p-1.5 rounded-xl">
                                    <ShoppingBag size={18} className="text-white" />
                                    <span className="absolute -top-1.5 -right-1.5 bg-[#3600ff] text-white text-[9px] font-black w-4 h-4 flex items-center justify-center rounded-full shadow-sm">{totalItemsCount}</span>
                                </div>
                                <span className="text-[11px] font-bold uppercase tracking-widest text-gray-200">Ver Ticket</span>
                            </div>
                            <span className="text-base font-black tabular-nums">${totalUSD.toFixed(2)}</span>
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* OVERLAY DARK MOBILE */}
            <AnimatePresence>
                {isMobileCartOpen && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="md:hidden fixed inset-0 bg-black/20 backdrop-blur-sm z-40" onClick={() => setIsMobileCartOpen(false)} />
                )}
            </AnimatePresence>

            {/* PANEL DERECHO: TICKET/CAJA (Arquitectura Dual Flex-Column estricta) */}
            <div className={`fixed inset-x-0 bottom-0 h-[99dvh] md:relative md:h-full z-50 md:z-20 w-full md:w-[380px] lg:w-[400px] bg-white border-l border-gray-100 flex flex-col shrink-0 rounded-t-[2rem] md:rounded-none shadow-[0_-10px_40px_rgba(0,0,0,0.05)] md:shadow-none transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${isMobileCartOpen ? 'translate-y-0' : 'translate-y-full md:translate-y-0'}`}>

                {/* Agarre Mobile */}
                <div className="flex md:hidden justify-center pt-3 pb-1 shrink-0 cursor-pointer" onClick={() => setIsMobileCartOpen(false)}>
                    <div className="w-10 h-1 bg-gray-200 rounded-full"></div>
                </div>

                {/* CONTENEDOR SCROLLABLE INTERNO */}
                <div className="flex-1 overflow-y-auto px-5 pt-3 md:pt-6 pb-6 no-scrollbar space-y-6">

                    <div className="flex justify-between items-center">
                        <h2 className="font-black text-xl text-gray-900 tracking-tight">Caja</h2>
                        <button className="md:hidden p-1.5 bg-gray-50 rounded-xl text-gray-400 hover:text-gray-900 transition-colors" onClick={() => setIsMobileCartOpen(false)}><ChevronDown size={18} strokeWidth={2.5} /></button>
                    </div>

                    {/* Interruptor de Intención */}
                    <div className="bg-gray-50/80 p-1 rounded-2xl flex gap-1 border border-gray-100">
                        <button onClick={() => setOperationMode('paid')} className={`flex-1 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-1.5 ${operationMode === 'paid' ? 'bg-white text-[#3600ff] shadow-sm border border-gray-200/60' : 'text-gray-500 hover:text-gray-700'}`}>
                            <Banknote size={14} strokeWidth={2.5} /> Venta
                        </button>
                        <button onClick={() => setOperationMode('quote')} className={`flex-1 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-1.5 ${operationMode === 'quote' ? 'bg-white text-[#3600ff] shadow-sm border border-gray-200/60' : 'text-gray-500 hover:text-gray-700'}`}>
                            <FileText size={14} strokeWidth={2.5} /> Proforma
                        </button>
                    </div>

                    {/* CLIENTE Y DATOS FISCALES */}
                    <div className="space-y-2">
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                                <input
                                    type="text"
                                    placeholder={operationMode === 'quote' || (operationMode === 'paid' && documentType === 'invoice') ? "Nombre / Razón *" : "Nombre (Opcional)"}
                                    value={customerName} onChange={(e) => setCustomerName(e.target.value)}
                                    className={`w-full pl-9 pr-3 py-2.5 bg-gray-50/80 rounded-xl text-xs font-bold text-gray-900 placeholder:font-medium placeholder:text-gray-400 outline-none focus:bg-white focus:border-[#3600ff]/30 focus:ring-4 focus:ring-[#3600ff]/5 transition-all border ${(operationMode === 'quote' || (operationMode === 'paid' && documentType === 'invoice')) && !customerName ? 'border-red-200' : 'border-gray-100'}`}
                                />
                            </div>
                            <div className="relative flex-1">
                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                                <input type="text" placeholder="WhatsApp" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} className="w-full pl-9 pr-3 py-2.5 bg-gray-50/80 rounded-xl text-xs font-bold text-gray-900 placeholder:font-medium placeholder:text-gray-400 outline-none focus:bg-white focus:border-[#3600ff]/30 focus:ring-4 focus:ring-[#3600ff]/5 transition-all border border-gray-100" />
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <div className="relative w-1/3">
                                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                                <input
                                    type="text"
                                    placeholder={operationMode === 'paid' && documentType === 'invoice' ? "RIF *" : "CI/RIF"}
                                    value={customerDNI} onChange={(e) => setCustomerDNI(e.target.value.toUpperCase())}
                                    className={`w-full pl-9 pr-2 py-2.5 bg-gray-50/80 rounded-xl text-xs font-mono font-bold text-gray-900 placeholder:font-sans placeholder:font-medium placeholder:text-gray-400 outline-none focus:bg-white focus:border-[#3600ff]/30 focus:ring-4 focus:ring-[#3600ff]/5 transition-all border ${(operationMode === 'paid' && documentType === 'invoice') && !customerDNI ? 'border-red-200' : 'border-gray-100'}`}
                                />
                            </div>
                            <div className="relative w-2/3">
                                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                                <input
                                    type="text"
                                    placeholder={operationMode === 'paid' && documentType === 'invoice' ? "Dirección Fiscal *" : "Dirección"}
                                    value={customerAddress} onChange={(e) => setCustomerAddress(e.target.value)}
                                    className={`w-full pl-9 pr-3 py-2.5 bg-gray-50/80 rounded-xl text-xs font-bold text-gray-900 placeholder:font-medium placeholder:text-gray-400 outline-none focus:bg-white focus:border-[#3600ff]/30 focus:ring-4 focus:ring-[#3600ff]/5 transition-all border ${(operationMode === 'paid' && documentType === 'invoice') && !customerAddress ? 'border-red-200' : 'border-gray-100'}`}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Ítems Cart */}
                    <div>
                        <h3 className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-3 flex items-center justify-between">
                            Ticket <span className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-md">{totalItemsCount}</span>
                        </h3>
                        {cart.length === 0 ? (
                            <div className="py-6 flex flex-col items-center justify-center text-center bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
                                <Receipt size={24} className="mb-2 text-gray-300" strokeWidth={1.5} />
                                <p className="font-bold text-[11px] text-gray-400 uppercase tracking-widest">Bolsa Vacía</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <AnimatePresence initial={false}>
                                    {cart.map(item => (
                                        <motion.div key={item.cartId} layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white p-2.5 rounded-2xl border border-gray-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)] flex gap-3 group relative">
                                            <div className="w-12 h-12 bg-gray-50/80 rounded-xl overflow-hidden shrink-0 border border-gray-50 relative">
                                                {item.image ? <Image src={item.image} alt={item.name} fill className="object-cover" sizes="48px" /> : <ShoppingBag className="absolute inset-0 m-auto text-gray-200" size={16} />}
                                            </div>
                                            <div className="flex-1 min-w-0 flex flex-col justify-center">
                                                <div className="flex justify-between items-start pr-4">
                                                    <h4 className="font-bold text-xs text-gray-800 truncate leading-tight">{item.name}</h4>
                                                </div>
                                                {item.variantInfo && <p className="text-[9px] text-gray-400 font-medium">{item.variantInfo}</p>}
                                                <div className="flex items-center justify-between mt-1.5">
                                                    <p className="text-gray-900 font-black text-sm tabular-nums leading-none">${(item.basePrice + item.penalty).toFixed(2)}</p>
                                                    <div className="flex items-center gap-2 bg-gray-50 border border-gray-100 rounded-lg p-0.5">
                                                        <button onClick={() => updateQty(item.cartId, -1)} className="w-6 h-6 flex items-center justify-center rounded-md text-gray-500 hover:bg-white hover:text-black hover:shadow-sm transition-all"><Minus size={12} strokeWidth={2.5} /></button>
                                                        <span className="text-[11px] font-black w-4 text-center tabular-nums">{item.qty}</span>
                                                        <button onClick={() => updateQty(item.cartId, 1)} disabled={item.qty >= item.maxStock} className="w-6 h-6 flex items-center justify-center rounded-md text-gray-500 hover:bg-white hover:text-black hover:shadow-sm transition-all disabled:opacity-30"><Plus size={12} strokeWidth={2.5} /></button>
                                                    </div>
                                                </div>
                                            </div>
                                            <button onClick={() => removeLine(item.cartId)} className="absolute top-2 right-2 p-1 text-gray-300 hover:text-red-500 transition-colors bg-white rounded-md"><X size={14} strokeWidth={2.5} /></button>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            </div>
                        )}
                    </div>

                    {/* Logística y Pagos */}
                    {cart.length > 0 && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-2">Logística</h3>
                                <div className="flex gap-1.5 bg-gray-50/80 p-1 border border-gray-100 rounded-2xl">
                                    <button onClick={() => setShippingMethod('pickup')} className={`flex-1 py-2 px-1 rounded-xl text-[9px] font-bold uppercase tracking-widest flex justify-center items-center gap-1.5 transition-all ${shippingMethod === 'pickup' ? 'bg-white text-[#3600ff] shadow-sm border border-gray-200/60' : 'text-gray-500 hover:text-gray-700'}`}><Store size={12} strokeWidth={2.5} /> Local</button>
                                    <button onClick={() => setShippingMethod('local_delivery')} className={`flex-1 py-2 px-1 rounded-xl text-[9px] font-bold uppercase tracking-widest flex justify-center items-center gap-1.5 transition-all ${shippingMethod === 'local_delivery' ? 'bg-white text-[#3600ff] shadow-sm border border-gray-200/60' : 'text-gray-500 hover:text-gray-700'}`}><Truck size={12} strokeWidth={2.5} /> Delivery</button>
                                    <button onClick={() => setShippingMethod('courier')} className={`flex-1 py-2 px-1 rounded-xl text-[9px] font-bold uppercase tracking-widest flex justify-center items-center gap-1.5 transition-all ${shippingMethod === 'courier' ? 'bg-white text-[#3600ff] shadow-sm border border-gray-200/60' : 'text-gray-500 hover:text-gray-700'}`}><Package size={12} strokeWidth={2.5} /> Envío</button>
                                </div>
                                {shippingMethod !== 'pickup' && (
                                    <div className="relative mt-2 animate-in fade-in slide-in-from-top-1">
                                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                                        <input type="text" placeholder="Dirección exacta" value={shippingAddress} onChange={(e) => setShippingAddress(e.target.value)} className="w-full pl-9 pr-3 py-2.5 bg-gray-50/80 rounded-xl text-xs font-bold text-gray-900 outline-none focus:bg-white focus:border-[#3600ff]/30 focus:ring-4 focus:ring-[#3600ff]/5 transition-all border border-gray-100" />
                                    </div>
                                )}
                            </div>

                            <div>
                                <h3 className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-2">Parámetros</h3>

                                <div className="bg-gray-50/80 p-3 rounded-2xl border border-gray-100 mb-4 flex items-start justify-between gap-3">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-bold text-gray-700">Imposición (I.V.A.)</span>
                                        <p className="text-[9px] text-gray-500 font-medium leading-tight mt-0.5">
                                            {store?.fiscal_profile === 'informal' ? 'Sin carga (0%).' : `Obligatorio (${taxPercentage}%).`}
                                        </p>
                                    </div>
                                    {store?.fiscal_profile === 'informal' ? (
                                        <span className="text-[9px] font-bold uppercase tracking-widest text-gray-500 bg-white border border-gray-200 px-2 py-1 rounded-lg shrink-0">No Formalizado</span>
                                    ) : (
                                        <span className="text-[9px] font-bold uppercase tracking-widest text-[#3600ff] bg-blue-50 border border-blue-100 px-2 py-1 rounded-lg shrink-0">Aplica Ley</span>
                                    )}
                                </div>

                                {operationMode === 'paid' ? (
                                    <div className="animate-in fade-in slide-in-from-top-1">
                                        <h3 className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-2">Ingreso</h3>
                                        <div className="flex flex-wrap gap-1.5">
                                            {[...activePaymentMethods, 'Otro'].map(pm => (
                                                <button key={pm} onClick={() => setSelectedPayment(pm)} className={`px-3 py-2 rounded-xl text-[10px] font-bold transition-all border ${selectedPayment === pm ? 'bg-gray-900 text-white border-gray-900 shadow-[0_2px_10px_rgba(0,0,0,0.1)]' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300 hover:text-gray-700'}`}>
                                                    {pm}
                                                </button>
                                            ))}
                                        </div>
                                        <div className="flex flex-col gap-2 mt-3">
                                            {selectedPayment === 'Otro' && (
                                                <input type="text" placeholder="Ej: PayPal" value={customPayment} onChange={(e) => setCustomPayment(e.target.value)} className="w-full px-3 py-2.5 bg-gray-50/80 border border-gray-100 rounded-xl text-xs font-bold text-gray-900 outline-none focus:bg-white focus:border-[#3600ff]/30 focus:ring-4 focus:ring-[#3600ff]/5 transition-all" />
                                            )}
                                            <div className="relative">
                                                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                                                <input type="text" placeholder="N° Referencia" value={paymentReference} onChange={(e) => setPaymentReference(e.target.value)} className="w-full pl-9 pr-3 py-2.5 bg-gray-50/80 border border-gray-100 rounded-xl text-xs font-bold text-gray-900 outline-none focus:bg-white focus:border-[#3600ff]/30 focus:ring-4 focus:ring-[#3600ff]/5 transition-all" />
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="animate-in fade-in slide-in-from-top-1">
                                        <h3 className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-1">Pasarelas en Proforma</h3>
                                        <p className="text-[9px] text-gray-500 font-medium mb-2 leading-tight">Apaga métodos no deseados para este cliente.</p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {activePaymentMethods.map(pm => {
                                                const isSelected = quoteAllowedMethods.includes(pm)
                                                return (
                                                    <button key={pm} onClick={() => {
                                                        if (isSelected) setQuoteAllowedMethods(prev => prev.filter(m => m !== pm))
                                                        else setQuoteAllowedMethods(prev => [...prev, pm])
                                                    }} className={`px-3 py-2 rounded-xl text-[10px] font-bold transition-all border ${isSelected ? 'bg-gray-900 text-white border-gray-900 shadow-sm' : 'bg-white text-gray-400 border-gray-100 opacity-50'}`}>
                                                        {pm}
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* 🚀 FOOTER FIJO (Siempre visible, no overlap) */}
                <div className="shrink-0 bg-white border-t border-gray-100 px-5 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))] z-30 h-[50dvh] md:h-[40dvh]">

                    <div className="bg-gray-50/50 rounded-2xl p-4 mb-4 border border-gray-100">
                        <div className="space-y-1.5 border-b border-gray-200/60 pb-3 mb-3">
                            <div className="flex justify-between text-[11px] font-bold text-gray-500">
                                <span>Subtotal Bruto</span>
                                <span className="font-mono tabular-nums">${(isHardCurrency ? cartEngine.totalCashNominal : cartEngine.totalListNominal).toFixed(2)}</span>
                            </div>

                            {(cartEngine.listPromoDiscounts > 0 || wholesaleDiscountList > 0 || (isHardCurrency && actualFxSavings > 0)) && (
                                <div className="space-y-1 pt-1 border-t border-black/5">
                                    {(isHardCurrency ? cartEngine.cashPromoDiscounts : cartEngine.listPromoDiscounts) > 0 && (
                                        <div className="flex justify-between items-center text-[10px] text-red-500 font-bold">
                                            <span>Dscto. Campaña</span>
                                            <span className="font-mono tabular-nums">-${(isHardCurrency ? cartEngine.cashPromoDiscounts : cartEngine.listPromoDiscounts).toFixed(2)}</span>
                                        </div>
                                    )}
                                    {(isHardCurrency ? wholesaleDiscountCash : wholesaleDiscountList) > 0 && (
                                        <div className="flex justify-between items-center text-[10px] text-red-500 font-bold">
                                            <span>Mayorista</span>
                                            <span className="font-mono tabular-nums">-${(isHardCurrency ? wholesaleDiscountCash : wholesaleDiscountList).toFixed(2)}</span>
                                        </div>
                                    )}
                                    {isHardCurrency && actualFxSavings > 0 && (
                                        <div className="flex justify-between items-center text-[10px] text-emerald-600 font-bold">
                                            <span>Ahorro Fx</span>
                                            <span className="font-mono tabular-nums">-${actualFxSavings.toFixed(2)}</span>
                                        </div>
                                    )}
                                </div>
                            )}

                            {applyTax && (
                                <div className="flex justify-between text-[11px] font-bold text-gray-900 pt-1">
                                    <span>I.V.A. ({taxPercentage}%)</span>
                                    <span className="font-mono tabular-nums">+${taxAmountUSD.toFixed(2)}</span>
                                </div>
                            )}
                        </div>

                        <div className="flex justify-between items-end mb-3">
                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-900 pb-1">Total Pagar</span>
                            <span className="text-3xl font-black tabular-nums tracking-tighter text-gray-900 leading-none">
                                ${totalUSD.toFixed(2)}
                            </span>
                        </div>

                        <div className="p-2.5 bg-gray-900 text-white rounded-xl flex justify-between items-center shadow-sm">
                            <div className="flex flex-col">
                                <span className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-0.5">Equiv. BCV</span>
                                <span className="text-[9px] text-gray-500 font-mono">Tasa: {activeRate.toFixed(2)}</span>
                            </div>
                            <span className="text-base font-black tabular-nums tracking-tight">
                                Bs {totalBS.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                        </div>
                    </div>

                    <button
                        onClick={() => handleCheckout(operationMode)}
                        disabled={isSubmitting || cart.length === 0}
                        className={`w-full py-4 px-2 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all duration-300 ease-out disabled:opacity-50 disabled:pointer-events-none active:scale-95 ${operationMode === 'quote' ? 'bg-white text-gray-900 border border-gray-200 hover:bg-gray-50 shadow-sm' : 'bg-gray-900 text-white shadow-[0_4px_15px_-4px_rgba(0,0,0,0.2)] hover:bg-black hover:-translate-y-0.5 active:translate-y-0'}`}
                    >
                        {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : (operationMode === 'quote' ? <FileText size={16} /> : <Banknote size={16} />)}
                        {operationMode === 'quote' ? 'Crear Proforma' : 'Cobrar'}
                    </button>
                </div>
            </div>

            {/* MODAL DE VARIANTES */}
            <AnimatePresence>
                {selectedProductForVariant && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setSelectedProductForVariant(null)} />
                        <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative bg-white w-full max-w-sm rounded-[2rem] overflow-hidden shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] flex flex-col max-h-[80vh] border border-gray-100">
                            <div className="p-5 pb-3 flex justify-between items-start shrink-0 border-b border-gray-50">
                                <div>
                                    <h3 className="font-black text-lg text-gray-900 leading-tight">Opciones</h3>
                                    <p className="text-[10px] font-bold text-gray-400 mt-1 truncate max-w-[200px] uppercase tracking-widest">{selectedProductForVariant.name}</p>
                                </div>
                                <button onClick={() => setSelectedProductForVariant(null)} className="p-2 bg-gray-50 rounded-xl text-gray-400 hover:text-black hover:bg-gray-100 transition-colors"><X size={16} strokeWidth={2.5} /></button>
                            </div>
                            <div className="overflow-y-auto p-4 flex flex-col gap-2 no-scrollbar">
                                {selectedProductForVariant.product_variants.map(v => {
                                    const isOutOfStock = v.stock <= 0
                                    return (
                                        <button key={v.id} disabled={isOutOfStock} onClick={() => handleAddToCart(selectedProductForVariant, v)}
                                            className={`flex items-center justify-between p-4 rounded-2xl text-left transition-all border ${isOutOfStock ? 'bg-gray-50 border-gray-100 opacity-50 cursor-not-allowed' : 'bg-white border-gray-100 hover:border-gray-300 hover:shadow-[0_4px_15px_-4px_rgba(0,0,0,0.05)] active:scale-95'}`}
                                        >
                                            <div>
                                                <span className="font-bold text-xs text-gray-900">{v.color_name || 'Estándar'} {v.size}</span>
                                                <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mt-1">Disp: {v.stock}</p>
                                            </div>
                                            <span className="font-black text-sm text-gray-900 tabular-nums">${(v.override_usd_price || selectedProductForVariant.usd_cash_price).toFixed(2)}</span>
                                        </button>
                                    )
                                })}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* MODAL ÍTEM PERSONALIZADO */}
            <AnimatePresence>
                {isCustomItemModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setIsCustomItemModalOpen(false)} />
                        <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative bg-white w-full max-w-sm rounded-[2rem] overflow-hidden shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] flex flex-col p-6 border border-gray-100">
                            <h3 className="font-black text-xl text-gray-900 mb-1">Ítem a Medida</h3>
                            <p className="text-[10px] font-medium text-gray-400 mb-6 uppercase tracking-widest">Añade un concepto manual.</p>

                            <form onSubmit={handleAddCustomItem} className="space-y-4">
                                <div>
                                    <label className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-2 block ml-1">Descripción</label>
                                    <input type="text" autoFocus required value={customItem.name} onChange={(e) => setCustomItem({ ...customItem, name: e.target.value })} placeholder="Ej: Logo..." className="w-full bg-gray-50 border border-gray-100 focus:bg-white focus:border-[#3600ff]/30 focus:ring-4 focus:ring-[#3600ff]/5 rounded-2xl px-4 py-3 text-xs font-bold text-gray-900 outline-none transition-all" />
                                </div>
                                <div>
                                    <label className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-2 block ml-1">Precio Unitario ($)</label>
                                    <div className="relative">
                                        <DollarSign size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input type="number" step="0.01" required value={customItem.price} onChange={(e) => setCustomItem({ ...customItem, price: e.target.value })} placeholder="0.00" className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-100 focus:bg-white focus:border-[#3600ff]/30 focus:ring-4 focus:ring-[#3600ff]/5 rounded-2xl text-base font-black text-gray-900 outline-none transition-all tabular-nums" />
                                    </div>
                                </div>
                                <button type="submit" className="w-full bg-gray-900 text-white font-black uppercase tracking-widest text-[10px] py-4 rounded-2xl shadow-sm hover:bg-black active:scale-[0.98] transition-all mt-2">
                                    Añadir al Ticket
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    )
}