'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getSupabase } from '@/lib/supabase-client'
import { Search, Plus, Minus, Trash2, Calculator, FileText, User, Phone, ShoppingBag, X, Loader2, DollarSign, Truck, Store, MapPin, Hash, Package, Banknote, ChevronDown, PenSquare, Receipt } from 'lucide-react'
import Swal from 'sweetalert2'
import Image from 'next/image'
import { NumberInput } from '@/components/NumberInput'

// --- TIPOS ESTRICTOS ---
type Variant = { id: string, size: string, color_name: string, stock: number, override_usd_price: number | null }
type Product = { id: number, name: string, image_url: string, usd_cash_price: number, stock: number, product_variants: Variant[] }
// 🚀 CIRUGÍA: productId ahora acepta 'null' para permitir ítems personalizados
type CartItem = { cartId: string, productId: number | null, variantId?: string, name: string, variantInfo?: string, price: number, qty: number, maxStock: number, image: string }
export default function POSPage() {
    const supabase = getSupabase()
    
    const [loading, setLoading] = useState(true)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [store, setStore] = useState<any>(null)
    const [rates, setRates] = useState({ usd_rate: 0, eur_rate: 0 })
    const [products, setProducts] = useState<Product[]>([])
    
    // UI & RESPONSIVE
    const [searchQuery, setSearchQuery] = useState('')
    const [isMobileCartOpen, setIsMobileCartOpen] = useState(false)
    const [selectedProductForVariant, setSelectedProductForVariant] = useState<Product | null>(null)

    // 🚀 NUEVO: ESTADOS PARA ÍTEMS PERSONALIZADOS
    const [isCustomItemModalOpen, setIsCustomItemModalOpen] = useState(false)
    const [customItem, setCustomItem] = useState({ name: '', price: '' })

    // CARRITO Y LOGÍSTICA
    const [cart, setCart] = useState<CartItem[]>([])
 // 🚀 NUEVO: DATOS FISCALES DEL CLIENTE
    const [customerName, setCustomerName] = useState('')
    const [customerPhone, setCustomerPhone] = useState('')
    const [customerDNI, setCustomerDNI] = useState('')
    const [customerAddress, setCustomerAddress] = useState('')
    
    const [shippingMethod, setShippingMethod] = useState<'pickup' | 'local_delivery' | 'courier'>('pickup')
    const [shippingAddress, setShippingAddress] = useState('')
    
    // 🚀 NUEVO: MODO DE OPERACIÓN E IMPUESTOS
    const [operationMode, setOperationMode] = useState<'paid' | 'quote'>('paid')
    // 🚀 NUEVO: MOTOR DE DOCUMENTOS E IVA
    const [documentType, setDocumentType] = useState<'invoice' | 'note'>('note')
    const [applyTax, setApplyTax] = useState(false)
    const [taxPercentage, setTaxPercentage] = useState(16) // 🚀 NUEVO: Memoria del porcentaje
    
    // PAGOS
    const [activePaymentMethods, setActivePaymentMethods] = useState<string[]>([])
    const [selectedPayment, setSelectedPayment] = useState<string>('Efectivo')
    const [customPayment, setCustomPayment] = useState('')
    const [paymentReference, setPaymentReference] = useState('')

    useEffect(() => {
        const initPOS = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

           const [storeRes, productsRes, ratesRes] = await Promise.all([
                supabase.from('stores').select('id, slug, name, payment_config, shipping_config, currency_type, default_tax_active, default_tax_percentage').eq('user_id', user.id).single(),
                supabase.from('products').select('id, name, image_url, usd_cash_price, stock, product_variants(id, size, color_name, stock, override_usd_price)').eq('user_id', user.id).eq('status', 'active'),
                supabase.from('app_config').select('usd_rate, eur_rate').single()
            ])

         if (storeRes.data) {
                setStore(storeRes.data)
                
            
                
                // 🚀 CARGAMOS CONFIGURACIÓN DE IMPUESTOS POR DEFECTO
                const defaultTax = storeRes.data.default_tax_active || false
                setApplyTax(defaultTax)
                setDocumentType(defaultTax ? 'invoice' : 'note')
                setTaxPercentage(storeRes.data.default_tax_percentage ?? 16) // 🚀 Carga el 16% o el que haya configurado

                // ... (continúa el código de payment_config)

                const pConfig = storeRes.data.payment_config || {}
                const pm = []
                if (pConfig.cash?.active) pm.push('Efectivo')
                if (pConfig.pago_movil?.active) pm.push('Pago Móvil')
                if (pConfig.zelle?.active) pm.push('Zelle')
                if (pConfig.binance?.active) pm.push('Binance')
                if (pConfig.zinli?.active) pm.push('Zinli')
                setActivePaymentMethods(pm)
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

// 🚀 MOTOR MATEMÁTICO CON IVA DINÁMICO
    const subtotalUSD = cart.reduce((acc, item) => acc + (item.price * item.qty), 0)
    const taxAmountUSD = applyTax ? subtotalUSD * (taxPercentage / 100) : 0 // 🚀 Ahora usa la variable
    const totalUSD = subtotalUSD + taxAmountUSD
    
    const isEur = store?.currency_type === 'eur'
    const activeRate = isEur ? rates.eur_rate : rates.usd_rate
    const totalBS = totalUSD * activeRate

    // 🚀 FUNCIÓN: AÑADIR ÍTEM AL VUELO
    const handleAddCustomItem = (e: React.FormEvent) => {
        e.preventDefault()
        if (!customItem.name.trim() || Number(customItem.price) <= 0) return
        
        const cartId = `custom-${Date.now()}`
        setCart(prev => [...prev, {
            cartId,
            productId: null, // No existe en la BD de catálogo
            name: customItem.name.trim(),
            variantInfo: 'Personalizado',
            price: Number(customItem.price),
            qty: 1,
            maxStock: 9999, // Stock infinito
            image: '' // Sin imagen
        }])
        
        setCustomItem({ name: '', price: '' })
        setIsCustomItemModalOpen(false)
        Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 1500, customClass: { popup: 'rounded-2xl' } }).fire({ icon: 'success', title: 'Ítem añadido' })
    }

    // --- ACCIONES DEL CARRITO ---
    const handleAddToCart = (product: Product, variant?: Variant) => {
        if (product.product_variants?.length > 0 && !variant) {
            setSelectedProductForVariant(product); return;
        }
        const maxStock = variant ? variant.stock : product.stock
        if (maxStock <= 0) return 

        const cartId = variant ? `${product.id}-${variant.id}` : `${product.id}`
        const price = variant?.override_usd_price || product.usd_cash_price
        const variantInfo = variant ? `${variant.color_name || ''} ${variant.size || ''}`.trim() : undefined

        setCart(prev => {
            const existing = prev.find(item => item.cartId === cartId)
            if (existing) {
                if (existing.qty >= maxStock) {
                    Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 1500, customClass: { popup: 'rounded-2xl' } }).fire({ icon: 'warning', title: 'Stock máximo' })
                    return prev
                }
                return prev.map(item => item.cartId === cartId ? { ...item, qty: item.qty + 1 } : item)
            }
            return [...prev, { cartId, productId: product.id, variantId: variant?.id, name: product.name, variantInfo, price, qty: 1, maxStock, image: product.image_url }]
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

        
        // 🚀 VALIDACIÓN ESTRICTA DE PRESUPUESTOS
        if (type === 'quote' && !customerName.trim()) {
            return Swal.fire({ icon: 'warning', title: 'Nombre Requerido', text: 'Ingresa el nombre del cliente para guardar el presupuesto.', confirmButtonColor: '#000', customClass: { popup: 'rounded-2xl' } })
        }
        
        // 🚀 ESCUDO LEGAL: VALIDACIÓN ESTRICTA DE FACTURAS
        if (type === 'paid' && documentType === 'invoice') {
            if (!customerName.trim() || !customerDNI.trim() || !customerAddress.trim()) {
                return Swal.fire({ 
                    icon: 'error', 
                    title: 'Datos Fiscales Incompletos', 
                    text: 'Para emitir una Factura Comercial válida para el SENIAT, el Nombre/Razón Social, CI/RIF y Dirección Fiscal son obligatorios.', 
                    confirmButtonColor: '#000', 
                    customClass: { popup: 'rounded-2xl' } 
                })
            }
        }
        if (selectedPayment === 'Otro' && !customPayment.trim() && type === 'paid') {
            return Swal.fire({ icon: 'warning', title: 'Método Inválido', text: 'Especifica qué método de pago usó el cliente.', confirmButtonColor: '#000', customClass: { popup: 'rounded-2xl' } })
        }

        setIsSubmitting(true)
        try {
            const finalPaymentMethod = type === 'quote' ? null : (selectedPayment === 'Otro' ? customPayment.trim() : selectedPayment)
            let deliveryInfoFull = shippingMethod === 'pickup' ? 'Venta en Mostrador / Retiro Personal' : `Envío a: ${shippingAddress}`
            if (paymentReference && type === 'paid') deliveryInfoFull += ` | Ref: ${paymentReference}`

           // 2. Insertar Orden (Con soporte de IVA y Datos Legales)
            const { data: order, error: orderError } = await supabase
                .from('orders')
                .insert({
                    store_id: store.id,
                    customer_name: customerName.trim() || 'Cliente Mostrador',
                    customer_phone: customerPhone.trim() || null,
                    customer_dni: customerDNI.trim() || null, // 🚀 NUEVO
                    customer_address: customerAddress.trim() || null, // 🚀 NUEVO
                    
                    document_type: type === 'quote' ? 'quote' : documentType, 
                    is_tax_applied: applyTax, 
                    subtotal_usd: subtotalUSD, 
                    tax_amount_usd: taxAmountUSD, 
                    tax_percentage: applyTax ? taxPercentage : 0, // 🚀 CONGELAMOS EL PORCENTAJE HISTÓRICO
                    total_usd: totalUSD,
                    total_bs: type === 'paid' ? totalBS : null,
                    
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

            const orderItems = cart.map(item => ({
                order_id: order.id, 
                product_id: item.productId, // 🚀 Será 'null' para ítems personalizados
                variant_id: item.variantId || null,
                product_name: item.name, 
                variant_info: item.variantInfo || null, 
                quantity: item.qty, 
                price_at_purchase: item.price
            }))
            const { error: itemsError } = await supabase.from('order_items').insert(orderItems)
            if (itemsError) throw itemsError

            setCart([]); setCustomerName(''); setCustomerPhone(''); setPaymentReference(''); setCustomPayment(''); setCustomerDNI(''); setCustomerAddress('');
             setShippingAddress(''); setIsMobileCartOpen(false);

            if (type === 'quote') {
                const quoteUrl = `${window.location.protocol}//${store.slug}.${window.location.host.replace('www.', '')}/quote/${order.id}`
                Swal.fire({
                    icon: 'success', title: 'Presupuesto Creado',
                    html: `Comparte este enlace con el cliente:<br><br><a href="${quoteUrl}" target="_blank" style="color: #666; font-weight: bold; word-break: break-all;">${quoteUrl}</a>`,
                    confirmButtonText: 'Copiar Enlace', confirmButtonColor: '#000', customClass: { popup: 'rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.1)]' }
                }).then((result) => { if (result.isConfirmed) navigator.clipboard.writeText(quoteUrl) })
           } else {
                // 🚀 CIERRE DE VENTA CON ACCESO DIRECTO AL PDF
                const documentUrl = `${window.location.protocol}//${store.slug}.${window.location.host.replace('www.', '')}/quote/${order.id}`
                
                Swal.fire({
                    icon: 'success', 
                    title: 'Venta Procesada',
                    text: `Orden #${order.order_number} guardada con éxito.`,
                    showCancelButton: true,
                    confirmButtonText: 'Ver Documento (PDF)',
                    cancelButtonText: 'Nueva Venta',
                    confirmButtonColor: '#000',
                    cancelButtonColor: '#f3f4f6',
                    customClass: { 
                        popup: 'rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.1)]', 
                        cancelButton: 'text-black font-bold',
                        confirmButton: 'font-bold'
                    }
                }).then((result) => { 
                    if (result.isConfirmed) window.open(documentUrl, '_blank') 
                })
                
                // Actualización de stock local
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
        } catch (error) {
            Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo procesar.', confirmButtonColor: '#000' })
        } finally {
            setIsSubmitting(false)
        }
    }

    if (loading) return <div className="h-screen flex items-center justify-center bg-[#FAFAFA]"><Loader2 className="animate-spin text-gray-300" size={32} /></div>

    return (
        <div className="h-screen bg-[#FAFAFA] flex overflow-hidden font-sans text-gray-900 relative">
            
            {/* PANEL IZQUIERDO: CATÁLOGO */}
            <div className="flex-1 flex flex-col min-w-0 w-full h-full relative z-10">
                
                {/* Header Buscador */}
                <div className="p-4 md:p-8 bg-[#FAFAFA] z-10 shrink-0">
                    <h1 className="text-2xl font-black tracking-tight mb-6 hidden md:block">Punto de Venta</h1>
                    <div className="flex items-center gap-3 max-w-3xl">
                        <div className="relative flex-1">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input 
                                type="text" 
                                placeholder="Buscar en el catálogo..." 
                                value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-11 pr-4 py-4 bg-white border border-transparent focus:border-gray-200 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-gray-50 outline-none transition-all shadow-[0_4px_20px_rgba(0,0,0,0.02)]"
                            />
                        </div>
                        <button 
                            onClick={() => setIsCustomItemModalOpen(true)}
                            className="shrink-0 bg-[#FAFAFA] border border-gray-200 text-gray-700 hover:text-black hover:bg-white hover:border-gray-300 px-5 py-4 rounded-2xl font-bold text-sm flex items-center gap-2 transition-all shadow-sm active:scale-95"
                        >
                            <PenSquare size={18} /> <span className="hidden sm:inline">Ítem a Medida</span>
                        </button>
                    </div>
                </div>

                {/* Grid de Productos */}
                <div className="flex-1 overflow-y-auto px-4 md:px-8 pb-32 no-scrollbar">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
                        {filteredProducts.map(product => {
                            const totalStock = product.product_variants?.length > 0 ? product.product_variants.reduce((acc, v) => acc + v.stock, 0) : product.stock;
                            const isOutOfStock = totalStock <= 0;

                            return (
                                <button key={product.id} onClick={() => handleAddToCart(product)} disabled={isOutOfStock}
                                    className={`relative flex flex-col text-left bg-white rounded-2xl p-3 transition-all duration-300 ease-out active:scale-95 ${isOutOfStock ? 'opacity-50 grayscale cursor-not-allowed' : 'shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_20px_40px_-10px_rgba(0,0,0,0.08)] hover:-translate-y-1'}`}
                                >
                                    <div className="w-full aspect-square rounded-xl bg-[#FAFAFA] overflow-hidden mb-4 relative">
                                        {product.image_url ? <Image src={product.image_url} alt={product.name} fill className="object-cover" sizes="200px" /> : <ShoppingBag className="absolute inset-0 m-auto text-gray-200" size={32} />}
                                        {isOutOfStock && <div className="absolute inset-0 bg-white/60 flex items-center justify-center backdrop-blur-sm"><span className="bg-black text-white text-[10px] font-bold px-3 py-1.5 rounded-full uppercase tracking-widest shadow-lg">Agotado</span></div>}
                                    </div>
                                    <h3 className="font-bold text-gray-900 text-xs md:text-sm leading-tight line-clamp-2 w-full mb-2">{product.name}</h3>
                                    <div className="flex items-center justify-between mt-auto w-full pt-2 border-t border-gray-50">
                                        <p className="text-black font-black text-sm">${product.usd_cash_price.toFixed(2)}</p>
                                        <span className="text-[10px] font-bold text-gray-400">{totalStock} disp.</span>
                                    </div>
                                </button>
                            )
                        })}
                    </div>
                </div>
            </div>

            {/* 🚀 BOTÓN FLOTANTE MOBILE (Para abrir el Drawer) */}
            <AnimatePresence>
                {!isMobileCartOpen && cart.length > 0 && (
                    <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }} className="md:hidden fixed bottom-18 left-4 right-4 z-40">
                        <button onClick={() => setIsMobileCartOpen(true)} className="w-full bg-black text-white px-6 py-4 rounded-[24px] flex items-center justify-between shadow-[0_20px_40px_-10px_rgba(0,0,0,0.2)] active:scale-95 transition-all duration-300">
                            <div className="flex items-center gap-4">
                                <div className="relative bg-white/10 p-2 rounded-full">
                                    <ShoppingBag size={20} className="text-white" />
                                    <span className="absolute -top-1 -right-1 bg-white text-black text-[10px] font-black w-4 h-4 flex items-center justify-center rounded-full">{cart.reduce((a,b)=>a+b.qty,0)}</span>
                                </div>
                                <span className="text-xs font-bold uppercase tracking-widest text-white/90">Ver Ticket</span>
                            </div>
                            <span className="text-lg font-black">${totalUSD.toFixed(2)}</span>
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* 🚀 PANEL DERECHO: EL TICKET (Drawer en Mobile, Fijo en Desktop) */}
            <div className={`fixed md:relative inset-x-0 bottom-0 md:inset-auto z-50 md:z-20 w-full md:w-[400px] lg:w-[450px] bg-white flex flex-col shrink-0 h-[92vh] md:h-full rounded-t-[32px] md:rounded-none shadow-[0_-20px_60px_rgba(0,0,0,0.08)] md:shadow-[-20px_0_60px_rgba(0,0,0,0.03)] transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${isMobileCartOpen ? 'translate-y-0' : 'translate-y-full md:translate-y-0'}`}>
                
                {/* Agarre del Drawer Mobile */}
                <div className="flex md:hidden justify-center pt-4 pb-2 shrink-0 cursor-pointer" onClick={() => setIsMobileCartOpen(false)}>
                    <div className="w-12 h-1.5 bg-gray-200 rounded-full"></div>
                </div>

                <div className="flex-1 overflow-y-auto px-6 pt-2 pb-[17rem] no-scrollbar space-y-8">
                    
                    {/* Header Interno */}
                    <div className="flex justify-between items-center pt-2 md:pt-8 pb-4">
                        <h2 className="font-black text-2xl text-gray-900 tracking-tight">Caja</h2>
                        <button className="md:hidden p-2 bg-gray-50 rounded-full text-gray-400 hover:text-black transition-colors" onClick={() => setIsMobileCartOpen(false)}><ChevronDown size={20}/></button>
                    </div>

                    {/* El Interruptor de Intención */}
                    <div className="bg-gray-50 p-1.5 rounded-2xl flex gap-1">
                        <button onClick={() => setOperationMode('paid')} className={`flex-1 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-2 ${operationMode === 'paid' ? 'bg-white text-black shadow-[0_8px_30px_rgba(0,0,0,0.06)]' : 'text-gray-400 hover:text-gray-600'}`}>
                            <Banknote size={16} strokeWidth={2.5}/> Venta
                        </button>
                        <button onClick={() => setOperationMode('quote')} className={`flex-1 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-2 ${operationMode === 'quote' ? 'bg-white text-black shadow-[0_8px_30px_rgba(0,0,0,0.06)]' : 'text-gray-400 hover:text-gray-600'}`}>
                            <FileText size={16} strokeWidth={2.5}/> Presupuesto
                        </button>
                    </div>

                    {/* 🚀 CLIENTE Y DATOS FISCALES (UI Reactiva) */}
                    <div className="space-y-3">
                        <div className="flex gap-3">
                            <div className="relative flex-1">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                <input 
                                    type="text" 
                                    placeholder={operationMode === 'quote' || (operationMode === 'paid' && documentType === 'invoice') ? "Nombre / Razón Social *" : "Nombre (Opcional)"} 
                                    value={customerName} onChange={(e) => setCustomerName(e.target.value)} 
                                    className={`w-full pl-11 pr-4 py-3 bg-gray-50 rounded-xl text-xs font-bold outline-none focus:bg-white focus:ring-2 focus:ring-gray-100 transition-all border ${(operationMode === 'quote' || (operationMode === 'paid' && documentType === 'invoice')) && !customerName ? 'border-red-200 focus:border-red-300' : 'border-transparent focus:border-gray-200'}`} 
                                />
                            </div>
                            <div className="relative flex-1">
                                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                <input type="text" placeholder="WhatsApp (Opcional)" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} className="w-full pl-11 pr-4 py-3 bg-gray-50 rounded-xl text-xs font-bold outline-none focus:bg-white focus:ring-2 transition-all border border-transparent focus:border-gray-200" />
                            </div>
                        </div>
                        
                        {/* Fila Fiscal Reactiva: Solo exige datos si es Factura */}
                        <div className="flex gap-3">
                            <div className="relative w-1/3">
                                <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                <input 
                                    type="text" 
                                    placeholder={operationMode === 'paid' && documentType === 'invoice' ? "CI/RIF *" : "CI/RIF (Opcional)"} 
                                    value={customerDNI} onChange={(e) => setCustomerDNI(e.target.value.toUpperCase())} 
                                    className={`w-full pl-11 pr-3 py-3 bg-gray-50 rounded-xl text-xs font-mono font-bold outline-none focus:bg-white focus:ring-2 transition-all border ${(operationMode === 'paid' && documentType === 'invoice') && !customerDNI ? 'border-red-200 focus:border-red-300' : 'border-transparent focus:border-gray-200'}`} 
                                />
                            </div>
                            <div className="relative w-2/3">
                                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                <input 
                                    type="text" 
                                    placeholder={operationMode === 'paid' && documentType === 'invoice' ? "Dirección Fiscal *" : "Dirección (Opcional)"} 
                                    value={customerAddress} onChange={(e) => setCustomerAddress(e.target.value)} 
                                    className={`w-full pl-11 pr-4 py-3 bg-gray-50 rounded-xl text-xs font-bold outline-none focus:bg-white focus:ring-2 transition-all border ${(operationMode === 'paid' && documentType === 'invoice') && !customerAddress ? 'border-red-200 focus:border-red-300' : 'border-transparent focus:border-gray-200'}`} 
                                />
                            </div>
                        </div>

                        

                        {/* 🚀 SELECTOR INTELIGENTE DE DOCUMENTOS E IMPUESTOS */}
                        <div className="mt-4 p-3 bg-gray-50 rounded-xl border border-gray-100/50">
                            
                            {operationMode === 'paid' && (
                                <div className="flex items-center gap-2 mb-3">
                                    <button onClick={() => { setDocumentType('invoice'); setApplyTax(true); }} className={`flex-1 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all ${documentType === 'invoice' ? 'bg-white shadow-[0_4px_15px_rgba(0,0,0,0.05)] text-black border border-gray-200' : 'text-gray-400 hover:text-gray-600 bg-transparent'}`}>
                                        <Receipt size={14} /> Factura
                                    </button>
                                    <button onClick={() => { setDocumentType('note'); setApplyTax(false); }} className={`flex-1 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all ${documentType === 'note' ? 'bg-white shadow-[0_4px_15px_rgba(0,0,0,0.05)] text-black border border-gray-200' : 'text-gray-400 hover:text-gray-600 bg-transparent'}`}>
                                        <FileText size={14} /> Nota / Recibo
                                    </button>
                                </div>
                            )}

                            {/* Fila del IVA (Visible en Presupuesto o si eligió Factura) */}
                            {(operationMode === 'quote' || documentType === 'invoice') && (
                                <div className={`flex flex-col gap-3 transition-all ${operationMode === 'paid' ? 'pt-3 border-t border-gray-200/50' : ''}`}>
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-gray-700">Calcular IVA</span>
                                        <button onClick={() => setApplyTax(!applyTax)} className={`relative w-10 h-6 rounded-full transition-colors ${applyTax ? 'bg-blue-600' : 'bg-gray-300'}`}>
                                            <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${applyTax ? 'translate-x-4' : 'translate-x-0'}`} />
                                        </button>
                                    </div>

                                    {/* 🚀 LOS ATAJOS DE PORCENTAJE (Aparecen si el IVA está ON) */}
                                    {applyTax && (
                                        <div className="flex gap-2 animate-in fade-in slide-in-from-top-2">
                                            {[8, 16, 31].map(pct => (
                                                <button key={pct} onClick={() => setTaxPercentage(pct)} className={`flex-1 py-2 rounded-lg text-[11px] font-black transition-all ${taxPercentage === pct ? 'bg-black text-white' : 'bg-white text-gray-500 border border-gray-200 hover:border-gray-300'}`}>
                                                    {pct}%
                                                </button>
                                            ))}
                                            <div className="relative flex-1">
                                                <NumberInput 
                                                    value={taxPercentage} 
                                                    onChangeValue={val => setTaxPercentage(Number(val))} 
                                                    className="w-full bg-white border border-gray-200 rounded-lg py-1.5 px-3 text-[11px] font-black text-gray-900 text-center focus:border-black outline-none h-full" 
                                                />
                                                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 font-black pointer-events-none">%</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Lista de Ítems */}
                    <div>
                        <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-4">Artículos en la Bolsa</h3>
                        {cart.length === 0 ? (
                            <div className="py-10 flex flex-col items-center justify-center text-center opacity-50 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
                                <ShoppingBag size={32} className="mb-3 text-gray-400" />
                                <p className="font-bold text-sm">Vacío</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <AnimatePresence initial={false}>
                                    {cart.map(item => (
                                        <motion.div key={item.cartId} layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white p-4 rounded-[20px] shadow-[0_8px_30px_rgba(0,0,0,0.03)] border border-gray-50 flex gap-4 group transition-all">
                                            <div className="w-16 h-16 bg-[#FAFAFA] rounded-xl overflow-hidden relative shrink-0">
                                                {item.image && <Image src={item.image} alt={item.name} fill className="object-cover" sizes="64px" />}
                                            </div>
                                            <div className="flex-1 min-w-0 flex flex-col justify-center">
                                                <h4 className="font-bold text-sm text-gray-900 truncate pr-6">{item.name}</h4>
                                                {item.variantInfo && <p className="text-[10px] text-gray-500 font-medium mt-0.5">{item.variantInfo}</p>}
                                                <div className="flex items-end justify-between mt-2">
                                                    <p className="text-black font-black text-base leading-none">${item.price.toFixed(2)}</p>
                                                    <div className="flex items-center gap-3 bg-gray-50 rounded-full px-2 py-1">
                                                        <button onClick={() => updateQty(item.cartId, -1)} className="text-gray-400 hover:text-black transition-colors"><Minus size={14} strokeWidth={3}/></button>
                                                        <span className="text-xs font-black w-4 text-center">{item.qty}</span>
                                                        <button onClick={() => updateQty(item.cartId, 1)} disabled={item.qty >= item.maxStock} className="text-gray-400 hover:text-black transition-colors disabled:opacity-30"><Plus size={14} strokeWidth={3}/></button>
                                                    </div>
                                                </div>
                                            </div>
                                            <button onClick={() => removeLine(item.cartId)} className="absolute top-4 right-4 text-gray-300 hover:text-gray-900 transition-colors"><X size={16} strokeWidth={2.5} /></button>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            </div>
                        )}
                    </div>

                    {/* Logística y Pagos */}
                    {cart.length > 0 && (
                        <div className="space-y-8 pb-10">
                            <div>
                                <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-4">Logística de Entrega</h3>
                                <div className="flex gap-2 bg-gray-50 p-1.5 px-3 rounded-2xl">
                                    <button onClick={() => setShippingMethod('pickup')} className={`flex-1 py-3 px-2 rounded-xl text-[10px] font-bold uppercase tracking-widest flex justify-center items-center gap-2 transition-all ${shippingMethod === 'pickup' ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}><Store size={14} /> Mostrador</button>
                                    <button onClick={() => setShippingMethod('local_delivery')} className={`flex-1 py-3 px-2 rounded-xl text-[10px] font-bold uppercase tracking-widest flex justify-center items-center gap-2 transition-all ${shippingMethod === 'local_delivery' ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}><Truck size={14} /> Delivery</button>
                                    <button onClick={() => setShippingMethod('courier')} className={`flex-1 py-3 px-2 rounded-xl text-[10px] font-bold uppercase tracking-widest flex justify-center items-center gap-2 transition-all ${shippingMethod === 'courier' ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}><Package size={14} /> Envío</button>
                                </div>
                                {shippingMethod !== 'pickup' && (
                                    <div className="relative mt-3 animate-in fade-in slide-in-from-top-2">
                                        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                        <input type="text" placeholder="Dirección exacta o Agencia" value={shippingAddress} onChange={(e) => setShippingAddress(e.target.value)} className="w-full pl-12 pr-4 py-3.5 bg-gray-50 rounded-2xl text-sm font-bold text-gray-900 outline-none focus:bg-white focus:ring-4 focus:ring-gray-100 transition-all border border-transparent focus:border-gray-200" />
                                    </div>
                                )}
                            </div>

                            {operationMode === 'paid' && (
                                <div className="animate-in fade-in slide-in-from-top-4 pt-2">
                                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-4">Método de Cobro</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {[...activePaymentMethods, 'Otro'].map(pm => (
                                            <button key={pm} onClick={() => setSelectedPayment(pm)} className={`px-5 py-3 rounded-full text-xs font-bold transition-all border ${selectedPayment === pm ? 'bg-black text-white border-black shadow-md' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'}`}>
                                                {pm}
                                            </button>
                                        ))}
                                    </div>
                                    
                                    <div className="flex flex-col gap-3 mt-4">
                                        {selectedPayment === 'Otro' && (
                                            <input type="text" placeholder="Especificar (Ej: PayPal)" value={customPayment} onChange={(e) => setCustomPayment(e.target.value)} className="w-full px-4 py-3.5 bg-gray-50 rounded-2xl text-sm font-bold text-gray-900 outline-none focus:bg-white focus:border-gray-200 border border-transparent transition-all" />
                                        )}
                                        <div className="relative">
                                            <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                            <input type="text" placeholder="N° de Referencia (Opcional)" value={paymentReference} onChange={(e) => setPaymentReference(e.target.value)} className="w-full pl-12 pr-4 py-3.5 bg-gray-50 rounded-2xl text-sm font-bold text-gray-900 outline-none focus:bg-white focus:border-gray-200 border border-transparent transition-all" />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

               {/* Footer Fijo Absoluto */}
                <div className="absolute bottom-0 left-0 w-full bg-white/90 backdrop-blur-2xl border-t border-gray-100 p-6 z-30 shadow-[0_-20px_60px_rgba(0,0,0,0.03)] pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
                    
                    {/* 🚀 DESGLOSE MATEMÁTICO */}
                    {applyTax && (
                        <div className="mb-3 pb-3 border-b border-gray-100/50 space-y-1 text-xs">
                            <div className="flex justify-between font-medium text-gray-500">
                                <span>Base Imponible</span><span>${subtotalUSD.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between font-bold text-gray-700">
                                <span>I.V.A. (16%)</span><span>${taxAmountUSD.toFixed(2)}</span>
                            </div>
                        </div>
                    )}

                    <div className="flex justify-between items-end mb-4">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">Total {applyTax ? 'con IVA' : ''}</span>
                        <div className="flex flex-col items-end">
                            <span className="text-4xl md:text-5xl font-black text-gray-900 tracking-tighter leading-none">${totalUSD.toFixed(2)}</span>
                            <span className="text-xs font-mono font-bold text-gray-400 mt-2 bg-gray-50 px-3 py-1 rounded-md">Bs {(totalBS).toLocaleString('es-VE', { minimumFractionDigits: 2 })}</span>
                        </div>
                    </div>
                    {/* ... (Tus botones de Crear Presupuesto o Cobrar Orden se mantienen igual aquí abajo) ... */}

                    {operationMode === 'quote' ? (
                        <button onClick={() => handleCheckout('quote')} disabled={isSubmitting || cart.length === 0}
                            className="w-full py-4 px-2 bg-gray-100 text-gray-900 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-gray-200 transition-colors disabled:opacity-50 active:scale-95"
                        >
                            {isSubmitting ? <Loader2 size={18} className="animate-spin text-gray-400" /> : <FileText size={18} />} Crear Presupuesto
                        </button>
                    ) : (
                        <button onClick={() => handleCheckout('paid')} disabled={isSubmitting || cart.length === 0}
                            className="w-full py-4 px-2 bg-black text-white rounded-[20px] font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-[0_10px_30px_rgba(0,0,0,0.15)] hover:shadow-[0_20px_40px_rgba(0,0,0,0.2)] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300 ease-out disabled:opacity-50 disabled:pointer-events-none"
                        >
                            {isSubmitting ? <Loader2 size={18} className="animate-spin text-white" /> : <Banknote size={18} />} Cobrar Orden
                        </button>
                    )}
                </div>
            </div>

            {/* MODAL DE VARIANTES CLEAN LOOK */}
            <AnimatePresence>
                {selectedProductForVariant && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setSelectedProductForVariant(null)} />
                        <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative bg-white w-full max-w-sm rounded-[32px] overflow-hidden shadow-[0_20px_80px_rgba(0,0,0,0.1)] flex flex-col max-h-[80vh]">
                            <div className="p-6 pb-4 flex justify-between items-start shrink-0">
                                <div>
                                    <h3 className="font-black text-xl text-gray-900 leading-tight">Opciones</h3>
                                    <p className="text-xs font-bold text-gray-400 mt-1 truncate max-w-[200px]">{selectedProductForVariant.name}</p>
                                </div>
                                <button onClick={() => setSelectedProductForVariant(null)} className="p-2 bg-gray-50 rounded-full text-gray-400 hover:text-black hover:bg-gray-100 transition-colors"><X size={18} strokeWidth={2.5}/></button>
                            </div>
                            <div className="overflow-y-auto p-4 pt-0 flex flex-col gap-2 no-scrollbar mb-4">
                                {selectedProductForVariant.product_variants.map(v => {
                                    const isOutOfStock = v.stock <= 0
                                    return (
                                        <button key={v.id} disabled={isOutOfStock} onClick={() => handleAddToCart(selectedProductForVariant, v)}
                                            className={`flex items-center justify-between p-5 rounded-2xl text-left transition-all ${isOutOfStock ? 'bg-gray-50 opacity-50 cursor-not-allowed border border-transparent' : 'bg-white border border-gray-100 hover:border-gray-300 hover:shadow-md active:scale-95'}`}
                                        >
                                            <div>
                                                <span className="font-bold text-sm text-gray-900">{v.color_name || 'Estándar'} {v.size}</span>
                                                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mt-1">Disp: {v.stock}</p>
                                            </div>
                                            <span className="font-black text-base text-gray-900">${(v.override_usd_price || selectedProductForVariant.usd_cash_price).toFixed(2)}</span>
                                        </button>
                                    )
                                })}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* 🚀 MODAL DE ÍTEM PERSONALIZADO */}
            <AnimatePresence>
                {isCustomItemModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsCustomItemModalOpen(false)} />
                        <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative bg-white w-full max-w-sm rounded-[32px] overflow-hidden shadow-2xl flex flex-col p-8">
                            <h3 className="font-black text-2xl text-gray-900 mb-1">Ítem a Medida</h3>
                            <p className="text-xs font-medium text-gray-500 mb-6">Añade un concepto que no esté en tu catálogo.</p>
                            
                            <form onSubmit={handleAddCustomItem} className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2 block">Descripción del Trabajo/Producto</label>
                                    <input type="text" autoFocus required value={customItem.name} onChange={(e) => setCustomItem({ ...customItem, name: e.target.value })} placeholder="Ej: Diseño de logo..." className="w-full bg-gray-50 border border-transparent focus:bg-white focus:border-gray-300 rounded-xl px-4 py-3.5 text-sm font-bold text-gray-900 outline-none transition-all" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2 block">Precio Unitario ($)</label>
                                    <div className="relative">
                                        <DollarSign size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input type="number" step="0.01" required value={customItem.price} onChange={(e) => setCustomItem({ ...customItem, price: e.target.value })} placeholder="0.00" className="w-full pl-10 pr-4 py-3.5 bg-gray-50 border border-transparent focus:bg-white focus:border-gray-300 rounded-xl text-lg font-black text-gray-900 outline-none transition-all" />
                                    </div>
                                </div>
                                <button type="submit" className="w-full bg-black text-white font-black uppercase tracking-widest text-xs py-4 rounded-[20px] shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all mt-4">
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