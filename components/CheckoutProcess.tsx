'use client'

import { useState, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { User, MapPin, Store, Truck, Package, CreditCard, Check, X, Trash2, Image as ImageIcon, Upload, Loader2, MessageCircle, Copy } from 'lucide-react'
import { getSupabase } from '@/lib/supabase-client'
import { compressImage } from '@/utils/imageOptimizer'
import { useCart } from '@/app/store/useCart'
import Swal from 'sweetalert2'
import { Icon } from '@iconify/react'

// --- TIPOS ESTRICTOS ---
export interface CheckoutProcessProps {
    storeId: string;
    storeConfig: any;
    currency: 'usd' | 'eur';
    rates: { usd: number, eur: number };
    phone: string;
    cartEngine: any;
    wholesaleDiscountList: number;
    wholesaleDiscountCash: number;
    onSuccess: (orderNumber: number, whatsappUrl: string) => void;
    onBack: () => void;
}

interface PaymentBlock {
    id: string;
    method: string;
    amount: number;
    currency: 'usd' | 'ves';
    isHardCurrency: boolean;
    receiptFile: File | null;
}

// --- LOGOS DE MÉTODOS DE PAGO ---
const BrandLogos = {
    Zelle: ({ className, size }: any) => (
        // Reemplaza "simple-icons:zelle" con el que tienes tú
        <Icon icon="simple-icons:zelle" className={className} width={size} height={size} />
    ),
    Binance: ({ className, size }: any) => (
        // Reemplaza "simple-icons:binance" con el que tienes tú
        <Icon icon="simple-icons:binance" className={className} width={size} height={size} />
    ),
    PagoMovil: ({ className, size }: any) => (
        // Reemplaza este string con el icono de Pago Móvil que elegiste
        <Icon icon="fluent:phone-checkmark-24-regular" className={className} width={size} height={size} />
    ),
    Efectivo: ({ className, size }: any) => (
        // Reemplaza este string con el de Efectivo
        <Icon icon="bi:cash" className={className} width={size} height={size} />
    ),
    Zinli: ({ className, size }: any) => (
        // Reemplaza este string con el de Zinli
        <Icon icon="mdi:wallet-bifold" className={className} width={size} height={size} />
    )
}

export default function CheckoutProcess({
    storeId, storeConfig, currency, rates, phone, cartEngine, wholesaleDiscountList, wholesaleDiscountCash, onSuccess, onBack
}: CheckoutProcessProps) {

    const { items, clearCart } = useCart()
    const [loading, setLoading] = useState(false)
    const [supabase] = useState(() => getSupabase())

    // 🚀 LÓGICA DE PORTAPAPELES (Para el Brand Portal)
    const [copied, setCopied] = useState(false)
    const handleCopy = (text: string) => {
        if (!text) return
        navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    const isEurMode = currency === 'eur'
    const activeRate = isEurMode ? rates.eur : rates.usd
    const currencySymbol = '$'

    // --- CONFIGURACIONES ---
    const payments = storeConfig?.payment_config || {}
    const shipping = storeConfig?.shipping_config || {}
    const receiptConfig = storeConfig?.receipt_config || { strict_mode: false }
    const wholesale = storeConfig?.wholesale_config || { active: false, min_items: 6, discount_percentage: 15 }
    const deliveryZones = shipping.delivery_zones || []

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

    // --- ESTADOS LOGÍSTICOS ---
    const [clientData, setClientData] = useState({
        name: '', deliveryType: 'pickup', courier: '',
        identityCard: '', phone: '', notes: '', state: '', city: '', addressDetail: '', reference: ''
    })
    const [selectedDeliveryZone, setSelectedDeliveryZone] = useState<string>('')

    const deliveryCost = useMemo(() => {
        if (clientData.deliveryType === 'local_delivery' && selectedDeliveryZone) {
            const zone = deliveryZones.find((z: any) => z.id === selectedDeliveryZone)
            return zone ? Number(zone.cost) : 0
        }
        return 0
    }, [clientData.deliveryType, selectedDeliveryZone, deliveryZones])

    // --- MOTOR LIQUID-SPLIT ---
    const totalListUSD = Math.max(0, (cartEngine.finalBsModeUSD - wholesaleDiscountList) + deliveryCost);
    const totalCashUSD = Math.max(0, (cartEngine.finalCashModeUSD - wholesaleDiscountCash) + deliveryCost);
    const fxMultiplier = totalCashUSD > 0 ? totalListUSD / totalCashUSD : 1;

    // 🚀 NUEVO: Lector del Feature Flag y Modalidad
    const allowSplitPayments = payments?.allow_split_payments === true;
    const [paymentMode, setPaymentMode] = useState<'single' | 'split'>('single');

    const [splitPayments, setSplitPayments] = useState<PaymentBlock[]>([]);
    const [activePaymentInput, setActivePaymentInput] = useState<string | null>(null);
    const [paymentAmount, setPaymentAmount] = useState<string>('');

    const { paidHardUSD, paidBs, paidListEquivalentUSD, actualFxSavings } = useMemo(() => {
        let hard = 0; let bs = 0;
        splitPayments.forEach(p => { if (p.isHardCurrency) hard += p.amount; else bs += p.amount; });
        const listEq = (hard * fxMultiplier) + (bs / activeRate);
        const realUsdPaid = hard + (bs / activeRate);
        return { paidHardUSD: hard, paidBs: bs, paidListEquivalentUSD: listEq, actualFxSavings: listEq - realUsdPaid }
    }, [splitPayments, fxMultiplier, activeRate]);

    const remainingListUSD = Math.max(0, totalListUSD - paidListEquivalentUSD);
    const remainingBs = remainingListUSD * activeRate;
    const remainingCashUSD = remainingListUSD / fxMultiplier;
    const isPaidInFull = remainingListUSD <= 0.01 && splitPayments.length > 0;
    const missingReceipts = splitPayments.some(p =>
        receiptConfig.strict_mode && p.method !== 'Efectivo' && !p.receiptFile
    );

    // Alias Dinámicos para el Footer
    const exactFxSavings = actualFxSavings;
    const grandTotalUSD = Math.max(0, totalListUSD - exactFxSavings);
    const grandTotalBs = grandTotalUSD * activeRate;
    const isHardCurrencyPayment = paidHardUSD > 0;

    // --- FUNCIONES DE PAGO ---
    const openPaymentInput = (method: string) => {
        const isHard = hardCurrencyMethods.includes(method);

        if (paymentMode === 'single') {
            // 🚀 MODO ÚNICO: Liquida el 100% automáticamente y sobreescribe cualquier selección anterior
            const amount = isHard ? totalCashUSD : (totalListUSD * activeRate);
            setSplitPayments([{
                id: `pay-${Date.now()}`,
                method,
                amount,
                currency: isHard ? 'usd' : 'ves',
                isHardCurrency: isHard,
                receiptFile: null
            }]);
            setActivePaymentInput(method);
        } else {
            // 🚀 MODO MIXTO: Abre el input para ingresar un monto parcial
            setPaymentAmount(isHard ? remainingCashUSD.toFixed(2) : remainingBs.toFixed(2));
            setActivePaymentInput(method);
        }
    }

    const confirmPaymentBlock = () => {
        const amount = parseFloat(paymentAmount);
        if (isNaN(amount) || amount <= 0) return;
        
        const isHard = hardCurrencyMethods.includes(activePaymentInput!);
        
        // 1. Calculamos el límite exacto según la moneda seleccionada
        const maxAllowed = isHard ? remainingCashUSD : remainingBs;

        // 2. Escudo Anti-Sobrepago (Permitimos 0.01 de tolerancia por redondeos de JavaScript)
        if (amount > maxAllowed + 0.01) {
            Swal.fire({
                title: 'Monto Excedido',
                text: `Solo debes ${isHard ? '$' : 'Bs'} ${maxAllowed.toFixed(2)}. No puedes ingresar un monto mayor.`,
                icon: 'warning',
                confirmButtonColor: '#000',
                customClass: { popup: 'rounded-xl' }
            });
            // Auto-completamos el input con el máximo permitido para ayudar al usuario (UX de élite)
            setPaymentAmount(maxAllowed.toFixed(2));
            return;
        }

        setSplitPayments([...splitPayments, { id: `pay-${Date.now()}`, method: activePaymentInput!, amount, currency: isHard ? 'usd' : 'ves', isHardCurrency: isHard, receiptFile: null }]);
        setActivePaymentInput(null);
        setPaymentAmount('');
    }

    const removePaymentBlock = (id: string) => setSplitPayments(splitPayments.filter(p => p.id !== id));

   const handleAttachReceipt = (id: string, file: File | null) => {
        if (file) {
            // 1. Validar Mime Type real
            if (!file.type.startsWith('image/')) {
                return Swal.fire({ title: 'Formato inválido', text: 'Por seguridad, solo se permiten imágenes (JPG, PNG, WEBP).', icon: 'error', confirmButtonColor: '#000' });
            }
            // 2. Limitar tamaño máximo a 5MB (Prevención de saturación de memoria)
            if (file.size > 5 * 1024 * 1024) {
                return Swal.fire({ title: 'Archivo muy pesado', text: 'El comprobante no debe superar los 5MB.', icon: 'error', confirmButtonColor: '#000' });
            }
        }
        setSplitPayments(splitPayments.map(p => p.id === id ? { ...p, receiptFile: file } : p));
    }
    // 🚀 ESTÉTICA BRUTALISTA / NEO-EDITORIAL PARA LOS MÉTODOS
    const getPaymentConfig = (pm: string) => {
        const baseSelected = 'bg-black text-white rounded-md transition-all'
        const baseIdle = 'bg-transparent text-gray-900 border border-gray-200 hover:border-gray-900 rounded-md transition-all'

        switch (pm) {
            case 'Pago Móvil': return { icon: BrandLogos.PagoMovil, btnSelected: baseSelected, btnIdle: baseIdle }
            case 'Zelle': return { icon: BrandLogos.Zelle, btnSelected: baseSelected, btnIdle: baseIdle }
            case 'Binance': return { icon: BrandLogos.Binance, btnSelected: baseSelected, btnIdle: baseIdle }
            case 'Zinli': return { icon: BrandLogos.Zinli, btnSelected: baseSelected, btnIdle: baseIdle }
            case 'Efectivo': return { icon: BrandLogos.Efectivo, btnSelected: baseSelected, btnIdle: baseIdle }
            default: return { icon: CreditCard, btnSelected: baseSelected, btnIdle: baseIdle }
        }
    }

    // --- PROCESAR ORDEN A BASE DE DATOS ---
    const handleCheckout = async () => {
        if (!clientData.name || !clientData.phone) return Swal.fire({ title: 'Faltan Datos', text: 'Nombre y teléfono son obligatorios', icon: 'warning', confirmButtonColor: '#000' })

        if (clientData.deliveryType === 'pickup' && !clientData.addressDetail) return Swal.fire({ title: 'Punto de Retiro', text: 'Selecciona dónde buscarás tu pedido.', icon: 'warning', confirmButtonColor: '#000' })
        if (clientData.deliveryType === 'courier') {
            if (!clientData.courier) return Swal.fire({ title: 'Envío', text: 'Selecciona una empresa de envío', icon: 'warning', confirmButtonColor: '#000' })
            if (!clientData.state || !clientData.city || !clientData.addressDetail) return Swal.fire({ title: 'Dirección Incompleta', text: 'Llena los campos', icon: 'warning', confirmButtonColor: '#000' })
            if (!clientData.identityCard) return Swal.fire({ title: 'Identificación', text: 'La cédula es requerida para envíos', icon: 'warning', confirmButtonColor: '#000' })
        }
        if (clientData.deliveryType === 'local_delivery' && !selectedDeliveryZone) return Swal.fire({ title: 'Zona de Delivery', text: 'Selecciona la zona a la que enviaremos tu pedido', icon: 'warning', confirmButtonColor: '#000' })

        if (!isPaidInFull) return Swal.fire({ title: 'Saldo Pendiente', text: 'Debes completar el 100% del pago para procesar la orden.', icon: 'warning', confirmButtonColor: '#000' })
        if (missingReceipts) return Swal.fire({ title: 'Comprobantes Faltantes', text: 'Debes adjuntar el comprobante en los métodos que lo requieren.', icon: 'warning', confirmButtonColor: '#000' })

        setLoading(true)

        try {
            // 1. Upload Paralelo con Prevención de Colisiones
            const uploadedPayments = await Promise.all(splitPayments.map(async (p) => {
                let receiptPublicUrl = null;
                if (p.receiptFile) {
                    let compressedReceipt;
                    try {
                     compressedReceipt = await compressImage(p.receiptFile, 800, 0.7);
                    } catch (compErr) {
                        console.error("Compresión fallida:", compErr);
                        throw new Error("El formato de la imagen no es válido o es muy pesada. Por favor, intenta con un capture diferente.");
                    }

                    const fileExt = p.receiptFile.name.split('.').pop() || 'jpg';
                    const uniqueUploadId = Date.now().toString().slice(-6); 
                    const fileName = `receipt-${p.id}-${uniqueUploadId}.${fileExt}`;
                    
                    const { error: uploadError } = await supabase.storage.from('receipts').upload(fileName, compressedReceipt, { upsert: true });
                    
                    if (uploadError) {
                        console.error("Storage Error Técnico:", uploadError);
                        throw new Error("Tuvimos un problema de conexión al subir tu comprobante. Por favor, verifica tu internet e intenta de nuevo.");
                    }
                    
                    const { data: { publicUrl } } = supabase.storage.from('receipts').getPublicUrl(fileName);
                    receiptPublicUrl = publicUrl;
                }
                return {
                    method: p.method,
                    amount_usd: p.currency === 'usd' ? p.amount : Number((p.amount / activeRate).toFixed(2)),
                    amount_bs: p.currency === 'ves' ? p.amount : Number((p.amount * activeRate).toFixed(2)),
                    currency: p.currency,
                    receipt_url: receiptPublicUrl
                }
            }));

            let deliveryInfoFull = 'Retiro Personal';
            if (clientData.deliveryType === 'courier') deliveryInfoFull = `${clientData.courier} (Cobro en Destino) - ${clientData.addressDetail}, ${clientData.city}, ${clientData.state}. Ref: ${clientData.reference || 'N/A'} | CI: ${clientData.identityCard} | Tlf: ${clientData.phone}`;
            else if (clientData.deliveryType === 'local_delivery') deliveryInfoFull = `Delivery a: ${deliveryZones.find((z: any) => z.id === selectedDeliveryZone)?.name || 'Zona'} - ${clientData.addressDetail}, ${clientData.city}. Ref: ${clientData.reference || 'N/A'} | Tlf: ${clientData.phone}`;
            else if (clientData.deliveryType === 'pickup') deliveryInfoFull = `Punto de Retiro: ${clientData.addressDetail}`;

            // 2. Insertar Orden
            const { data: order, error: orderError } = await supabase
                .from('orders')
                .insert({
                    store_id: storeId,
                    customer_name: clientData.name,
                    customer_phone: clientData.phone,
                    total_usd: Number(grandTotalUSD.toFixed(2)),
                    total_bs: Number(grandTotalBs.toFixed(2)),
                    exchange_rate: activeRate,
                    currency_type: currency,
                    status: 'pending',
                    payment_method: 'Mixto',
                    split_payments: uploadedPayments,
                    shipping_method: clientData.deliveryType,
                    delivery_info: deliveryInfoFull,
                    shipping_cost: Number(deliveryCost.toFixed(2)),
                    discount_amount: Number((wholesaleDiscountList + cartEngine.listPromoDiscounts).toFixed(2))
                }).select().single();

            if (orderError) {
                console.error("Order DB Error Técnico:", orderError);
                throw new Error("Hubo una interrupción de red al registrar tu pedido. Tus datos están seguros, por favor presiona 'Enviar Pedido' nuevamente.");
            }

         
            
            // 3. Insertar Items
            const orderItemsPayload = items.map(item => ({ 
                order_id: order.id, 
                product_id: item.productId, 
                product_name: item.name, 
                variant_info: item.variantInfo || 'N/A', 
                quantity: item.quantity, 
                price_at_purchase: item.basePrice, 
                variant_id: (item.variantId && item.variantId.length === 36) ? item.variantId : null 
            }));
            
            const { error: itemsError } = await supabase.from('order_items').insert(orderItemsPayload);
            
            if (itemsError) {
                console.error("Order Items DB Error Técnico:", itemsError);
                
                // 🚀 ESTRATEGIA FAIL-FORWARD: Salvamos la venta y bloqueamos reintentos
                
                // 1. Armamos el mensaje de WhatsApp de rescate (explicando la situación a la tienda)
                let fallbackMessage = `*ALERTA DE PEDIDO INCOMPLETO (Fallo de Red)* ⚠️\n------------------------\n`;
                fallbackMessage += `*Intento de Pedido:* #${order.order_number}\n`;
                fallbackMessage += `*Cliente:* ${clientData.name}\n`;
                fallbackMessage += `*Teléfono:* ${clientData.phone}\n\n`;
                fallbackMessage += `Hola, la página tuvo un corte de red al intentar guardar los productos de mi carrito, pero mi registro de pago se envió por un total de *$${grandTotalUSD.toFixed(2)}*. Por favor verifica en tu panel el pedido #${order.order_number} y confirmemos los productos por aquí.`;
                
                const fallbackWaLink = `https://wa.me/${phone}?text=${encodeURIComponent(fallbackMessage)}`;
                
                // 2. Vaciamos el carrito para matar la data local
                clearCart();
                
                // 3. Forzamos el paso a la pantalla de Éxito (Paso 3) con el link de emergencia
                onSuccess(order.order_number, fallbackWaLink);
                
                // 4. Le explicamos al cliente qué pasó con una alerta suave
                Swal.fire({
                    title: 'Interrupción de red',
                    text: 'Registramos tu pago, pero tu carrito tuvo un problema al sincronizarse. Te enviaremos a WhatsApp para que la tienda te confirme manualmente.',
                    icon: 'info',
                    iconColor: '#000',
                    confirmButtonText: 'Entendido',
                    confirmButtonColor: '#000',
                    customClass: { popup: 'rounded-xl border border-gray-100', title: 'font-black text-xl text-gray-900' }
                });
                
                setLoading(false);
                return; // <-- CRÍTICO: Detenemos la función aquí. No entra al catch. No genera órdenes basura.
            }
       
            // 🚀 INYECCIÓN: EL GATILLO SILENCIOSO (AWAIT OBLIGATORIO)
            await fetch('/api/web-push/notify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    storeId: storeId,
                    orderNumber: order.order_number,
                    totalUsd: grandTotalUSD.toFixed(2),
                    customerName: clientData.name
                })
            }).catch(err => console.error("Error silencioso en notificación Push:", err));

          

            // 4. Formatear Mensaje WhatsApp
            let message = `*PEDIDO #${order.order_number}*\n------------------------\n*Cliente:* ${clientData.name}\n*Teléfono:* ${clientData.phone}\n\n*CARRITO:*\n`
            cartEngine.processedItems.forEach((item: any) => {
                const priceText = item.finalListPrice < item.listPrice ? `~($${item.listPrice.toFixed(2)})~ *$${item.finalListPrice.toFixed(2)}*` : `($${item.listPrice.toFixed(2)})`
                message += `🔸 ${item.quantity}x ${item.name} ${item.variantInfo ? `(${item.variantInfo})` : ''} ${priceText}\n`
            })

            message += `\n*RESUMEN FINANCIERO:*\n`
            message += `Subtotal Base: $${cartEngine.totalListNominal.toFixed(2)}\n`
            if (cartEngine.listPromoDiscounts > 0) message += `Desc. Campaña: -$${cartEngine.listPromoDiscounts.toFixed(2)}\n`
            if (wholesaleDiscountList > 0) message += `Desc. Mayorista: -$${wholesaleDiscountList.toFixed(2)}\n`
            if (actualFxSavings > 0) message += `Beneficio Divisa: -$${actualFxSavings.toFixed(2)}\n`
            if (deliveryCost > 0) message += `Delivery: +$${deliveryCost.toFixed(2)}\n`
            message += `------------------------\n*TOTAL FINAL APLICADO: $${grandTotalUSD.toFixed(2)}*\n`

            message += `\n*PAGOS (FRACCIONADO):*\n`
            uploadedPayments.forEach((p: any) => {
                message += `✔️ ${p.method}: ${p.currency === 'usd' ? '$' + p.amount_usd.toFixed(2) : 'Bs ' + p.amount_bs.toLocaleString('es-VE', { maximumFractionDigits: 2 })}\n`
                if (p.receipt_url) message += `   🔗 Comprobante: ${p.receipt_url}\n`
            })

            message += `\n*LOGÍSTICA:*\nEnvío: ${deliveryInfoFull}\n`
            if (clientData.notes) message += `Notas: ${clientData.notes}\n`

            const waLink = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`

            clearCart();
            onSuccess(order.order_number, waLink);

        } catch (error: any) {
            // Extracción del mensaje amigable para el cliente
            let friendlyMessage = "Ocurrió un error inesperado al procesar tu pedido por una falla de conexión. Por favor intenta de nuevo.";
            
            if (typeof error === 'string') {
                friendlyMessage = error;
            } else if (error instanceof Error) {
                friendlyMessage = error.message;
            } else if (error?.message && !error.message.includes('fetch') && !error.message.includes('JSON')) {
                // Filtramos errores de fetch genéricos que asustan
                friendlyMessage = error.message;
            }

            // Alerta enfocada en la tranquilidad del cliente (Brutalist UX)
            Swal.fire({
                title: 'Falla de Conexión',
                text: friendlyMessage,
                icon: 'info', // Usamos 'info' o 'warning' en lugar de 'error' para reducir la ansiedad
                iconColor: '#000',
                confirmButtonText: 'Entendido',
                confirmButtonColor: '#000',
                customClass: {
                    title: 'font-black text-xl text-gray-900',
                    popup: 'rounded-xl border border-gray-100',
                }
            });
        } finally {
            setLoading(false);
        }
    
    }

    const stepVariants = { hidden: { opacity: 0, x: 20 }, enter: { opacity: 1, x: 0 }, exit: { opacity: 0, x: -20 } }

    return (
        <motion.div key="step-2" variants={stepVariants} initial="hidden" animate="enter" exit="exit" className="flex flex-col h-full w-full overflow-hidden bg-white">

            <div className="flex-1 overflow-x-hidden overflow-y-auto scroll-smooth relative no-scrollbar px-6 md:px-10 py-8 space-y-12 pb-16">

               <input
                            maxLength={50} // Límite estricto de base de datos
                            value={clientData.name}
                            // Eliminamos los caracteres < y > para evitar inyecciones XSS
                            onChange={e => setClientData({ ...clientData, name: e.target.value.replace(/[<>]/g, '') })}
                            className="w-full bg-transparent border-0 border-b border-gray-200 py-3 text-base font-bold text-gray-900 outline-none focus:ring-0 focus:shadow-none focus:border-black transition-colors rounded-none placeholder:text-gray-300"
                            placeholder="Nombre completo *"
                        />
                        <input
                            maxLength={20} // Un teléfono no necesita más
                            value={clientData.phone}
                            // Permite SOLO números y el símbolo +
                            onChange={e => setClientData({ ...clientData, phone: e.target.value.replace(/[^\d+]/g, '') })}
                            className="w-full bg-transparent border-0 border-b border-gray-200 py-3 text-base font-bold text-gray-900 outline-none focus:ring-0 focus:shadow-none focus:border-black transition-colors rounded-none placeholder:text-gray-300"
                            placeholder="Teléfono / WhatsApp *"
                        />
                {/* 🚀 LOGÍSTICA DE ENVÍO (Estructural) */}
                <div className="space-y-6">
                    <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-3">Entrega</h2>
                    <div className="grid grid-cols-1 gap-3">
                        {shipping.methods?.pickup && (
                            <div onClick={() => { setClientData({ ...clientData, deliveryType: 'pickup', addressDetail: '' }); setSelectedDeliveryZone('') }}
                                className={`cursor-pointer p-5 rounded-md transition-all flex items-start gap-4 border ${clientData.deliveryType === 'pickup' ? 'border-black ring-1 ring-black bg-gray-50/50' : 'border-gray-200 hover:border-gray-300'}`}>
                                <Store size={20} className={clientData.deliveryType === 'pickup' ? 'text-black' : 'text-gray-400'} />
                                <div>
                                    <p className="font-bold text-sm text-gray-900">Retiro Personal</p>
                                    <p className="text-xs mt-0.5 text-gray-500">Busca tu pedido gratis en tienda.</p>
                                </div>
                            </div>
                        )}
                        {shipping.methods?.delivery && deliveryZones.length > 0 && (
                            <div onClick={() => setClientData({ ...clientData, deliveryType: 'local_delivery', addressDetail: '' })}
                                className={`cursor-pointer p-5 rounded-md transition-all flex items-start gap-4 border ${clientData.deliveryType === 'local_delivery' ? 'border-black ring-1 ring-black bg-gray-50/50' : 'border-gray-200 hover:border-gray-300'}`}>
                                <Truck size={20} className={clientData.deliveryType === 'local_delivery' ? 'text-black' : 'text-gray-400'} />
                                <div>
                                    <p className="font-bold text-sm text-gray-900">Delivery Local</p>
                                    <p className="text-xs mt-0.5 text-gray-500">Entregas a domicilio.</p>
                                </div>
                            </div>
                        )}
                        {(shipping.methods?.mrw || shipping.methods?.zoom || shipping.methods?.tealca) && (
                            <div onClick={() => { setClientData({ ...clientData, deliveryType: 'courier', addressDetail: '' }); setSelectedDeliveryZone('') }}
                                className={`cursor-pointer p-5 rounded-md transition-all flex items-start gap-4 border ${clientData.deliveryType === 'courier' ? 'border-black ring-1 ring-black bg-gray-50/50' : 'border-gray-200 hover:border-gray-300'}`}>
                                <Package size={20} className={clientData.deliveryType === 'courier' ? 'text-black' : 'text-gray-400'} />
                                <div>
                                    <p className="font-bold text-sm text-gray-900">Envío Nacional</p>
                                    <p className="text-xs mt-0.5 text-gray-500">Envíos por agencia.</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Sub-opciones de Logística (Naked Inputs) */}
                    {clientData.deliveryType === 'pickup' && (
                        <div className="space-y-3 animate-in fade-in slide-in-from-top-2 pt-4">
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-4">¿Dónde lo buscas? *</label>
                            <div className="grid gap-3">
                                {shipping.main_address && (
                                    <label className={`flex items-start gap-3 p-4 rounded-md cursor-pointer transition-all border ${clientData.addressDetail === shipping.main_address ? 'border-black ring-1 ring-black bg-gray-50/50' : 'border-gray-200 hover:border-gray-300'}`}>
                                        <input type="radio" name="pickupLocation" className="mt-0.5 accent-black w-4 h-4 border-0 border-b border-gray-200 py-3 text-base font-bold text-gray-900 outline-none focus:ring-0 focus:shadow-none focus:border-black transition-colors rounded-none placeholder:text-gray-300" checked={clientData.addressDetail === shipping.main_address} onChange={() => setClientData({ ...clientData, addressDetail: shipping.main_address })} />
                                        <div>
                                            <p className="font-bold text-sm text-gray-900 leading-none">Tienda Física</p>
                                            <p className="text-xs text-gray-500 mt-1.5">{shipping.main_address}</p>
                                        </div>
                                    </label>
                                )}
                                {shipping.pickup_locations?.map((loc: string, idx: number) => (
                                    <label key={idx} className={`flex items-start gap-3 p-4 rounded-md cursor-pointer transition-all border ${clientData.addressDetail === loc ? 'border-black ring-1 ring-black bg-gray-50/50' : 'border-gray-200 hover:border-gray-300'}`}>
                                        <input type="radio" name="pickupLocation" className="mt-0.5 accent-black w-4 h-4 border-0 border-b border-gray-200 py-3 text-base font-bold text-gray-900 outline-none focus:ring-0 focus:shadow-none focus:border-black transition-colors rounded-none placeholder:text-gray-300" checked={clientData.addressDetail === loc} onChange={() => setClientData({ ...clientData, addressDetail: loc })} />
                                        <div>
                                            <p className="font-bold text-sm text-gray-900 leading-none">Punto de Entrega</p>
                                            <p className="text-xs text-gray-500 mt-1.5">{loc}</p>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}

                    {clientData.deliveryType === 'local_delivery' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-top-2 pt-4">
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-4">Selecciona tu zona *</label>
                                <div className="grid grid-cols-1 gap-3">
                                    {deliveryZones.map((z: any) => (
                                        <button key={z.id} onClick={() => setSelectedDeliveryZone(z.id)} className={`flex justify-between items-center px-5 py-4 rounded-md transition-all border ${selectedDeliveryZone === z.id ? 'border-black ring-1 ring-black bg-gray-50/50 text-gray-900' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                                            <span className="font-bold text-sm">{z.name}</span>
                                            <span className="font-black text-sm">+{currencySymbol}{Number(z.cost).toFixed(2)}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                            {selectedDeliveryZone && (
                                <div className="grid grid-cols-1 gap-6 animate-in fade-in pt-2">
                                    <input value={clientData.addressDetail} onChange={e => setClientData({ ...clientData, addressDetail: e.target.value })} className="w-full bg-transparent   border-0 border-b border-gray-200 py-3 text-base font-bold text-gray-900 outline-none focus:ring-0 focus:shadow-none focus:border-black transition-colors rounded-none placeholder:text-gray-300" placeholder="Dirección exacta *" />
                                    <input value={clientData.reference} onChange={e => setClientData({ ...clientData, reference: e.target.value })} className="w-full bg-transparent   border-0 border-b border-gray-200 py-3 text-base font-bold text-gray-900 outline-none focus:ring-0 focus:shadow-none focus:border-black transition-colors rounded-none placeholder:text-gray-300" placeholder="Punto de referencia (Opcional)" />
                                </div>
                            )}
                        </div>
                    )}

                    {clientData.deliveryType === 'courier' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-top-2 pt-4">
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-4">Agencia de Envío *</label>
                                <div className="grid grid-cols-3 gap-3">
                                    {activeCouriers.map(c => (
                                        <button key={c} onClick={() => setClientData({ ...clientData, courier: c })} className={`py-4 rounded-md text-xs font-bold transition-all border ${clientData.courier === c ? 'border-black ring-1 ring-black bg-gray-50/50 text-gray-900' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>{c}</button>
                                    ))}
                                </div>
                            </div>
                            {clientData.courier && (
                                <div className="space-y-6 animate-in fade-in pt-2">
                                   <input 
                                        maxLength={15}
                                        value={clientData.identityCard} 
                                        // Permite solo letras y números (ej: V12345678)
                                        onChange={e => setClientData({ ...clientData, identityCard: e.target.value.replace(/[^a-zA-Z0-9-]/g, '') })} 
                                        className="w-full bg-transparent border-0 border-b border-gray-200 py-3 text-base font-bold text-gray-900 outline-none focus:ring-0 focus:shadow-none focus:border-black transition-colors rounded-none placeholder:text-gray-300" placeholder="Cédula de Identidad *" 
                                    />
                                    <div className="grid grid-cols-2 gap-6">
                                        <input maxLength={40} value={clientData.state} onChange={e => setClientData({ ...clientData, state: e.target.value.replace(/[<>]/g, '') })} className="w-full bg-transparent border-0 border-b border-gray-200 py-3 text-base font-bold text-gray-900 outline-none focus:ring-0 focus:shadow-none focus:border-black transition-colors rounded-none placeholder:text-gray-300" placeholder="Estado *" />
                                        <input maxLength={40} value={clientData.city} onChange={e => setClientData({ ...clientData, city: e.target.value.replace(/[<>]/g, '') })} className="w-full bg-transparent border-0 border-b border-gray-200 py-3 text-base font-bold text-gray-900 outline-none focus:ring-0 focus:shadow-none focus:border-black transition-colors rounded-none placeholder:text-gray-300" placeholder="Ciudad *" />
                                    </div>
                                    <input maxLength={150} value={clientData.addressDetail} onChange={e => setClientData({ ...clientData, addressDetail: e.target.value.replace(/[<>]/g, '') })} className="w-full bg-transparent border-0 border-b border-gray-200 py-3 text-base font-bold text-gray-900 outline-none focus:ring-0 focus:shadow-none focus:border-black transition-colors rounded-none placeholder:text-gray-300" placeholder="Dirección exacta *" />
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* 🚀 PAGOS (Modo Único / Mixto) - BRUTALIST UI */}
                <div className="space-y-6">
                    <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-widest pb-3">Pagos</h2>

                    {/* 🚀 BIFURCADOR (Tabs Tipográficas Limpias) */}
                    {allowSplitPayments && (
                        <div className="flex gap-6 border-b border-gray-100 w-full mb-8">
                            <button
                                onClick={() => { setPaymentMode('single'); setSplitPayments([]); setActivePaymentInput(null); }}
                                className={`pb-3 text-xs font-black uppercase tracking-widest transition-all ${paymentMode === 'single' ? 'border-b-2 border-black text-gray-900' : 'text-gray-400 hover:text-gray-900 border-b-2 border-transparent'}`}
                            >
                                Pago Único
                            </button>
                            <button
                                onClick={() => { setPaymentMode('split'); setSplitPayments([]); setActivePaymentInput(null); }}
                                className={`pb-3 text-xs font-black uppercase tracking-widest transition-all ${paymentMode === 'split' ? 'border-b-2 border-black text-gray-900' : 'text-gray-400 hover:text-gray-900 border-b-2 border-transparent'}`}
                            >
                                Pago Mixto
                            </button>
                        </div>
                    )}

                    {/* 1. EL LEDGER TIPOGRÁFICO MONOLÍTICO */}
                    {remainingListUSD > 0.01 ? (
                        <div className="py-4 flex flex-col items-center justify-center text-center">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Total Pendiente</span>
                            <div className="flex items-baseline justify-center gap-1.5">
                                <span className="text-xl md:text-2xl font-bold text-gray-300">Bs</span>
                                <span className="font-black text-5xl md:text-6xl text-gray-900 leading-none tracking-tighter">
                                    {remainingBs.toLocaleString('es-VE', { maximumFractionDigits: 2 })}
                                </span>
                            </div>
                            <span className="text-sm font-medium text-gray-500 mt-4">Ref: ${remainingListUSD.toFixed(2)}</span>

                            {/* Nudge sin caja */}
                            {remainingListUSD > 0.01 && fxMultiplier > 1 && (
                                <span className="text-xs font-bold text-emerald-600 mt-4 tracking-wide">
                                    {isHardCurrencyPayment ? 'Resta en Divisa' : 'Si pagas en divisa'}: <span className="font-black">${remainingCashUSD.toFixed(2)}</span>
                                </span>
                            )}
                        </div>
                    ) : (
                        <div className="py-8 flex flex-col items-center justify-center text-center text-gray-900">
                            <Check size={40} strokeWidth={2} className="mb-4 text-emerald-500" />
                            <p className="font-black text-2xl tracking-tight">Monto Cubierto</p>
                            <p className="text-sm font-medium text-gray-500 mt-2">
                                {paymentMode === 'single' ? 'Adjunta el comprobante para finalizar.' : 'El total ha sido cubierto. Envía el pedido.'}
                            </p>
                        </div>
                    )}

                    {/* 2. LISTA DE PAGOS AÑADIDOS (Solo Mixto - Líneas Finas) */}
                    <AnimatePresence>
                        {paymentMode === 'split' && splitPayments.length > 0 && (
                            <div className="divide-y divide-gray-100 border-t border-b border-gray-100 py-2 mt-4">
                                {splitPayments.map(block => {
                                    // Validación correcta: Si Strict Mode está activo, y NO es Efectivo, se pide captura.
                                    const requiresReceipt = receiptConfig.strict_mode && block.method !== 'Efectivo';

                                    return (
                                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} key={block.id} className="py-5 overflow-hidden">
                                            <div className="flex justify-between items-center">
                                                <div className="flex items-center gap-3 text-gray-900">
                                                    <span className="font-bold text-sm">{block.method}</span>
                                                </div>
                                                <div className="flex items-center gap-6">
                                                    <span className="font-black text-lg text-gray-900 tracking-tight">{block.currency === 'usd' ? `$${block.amount.toFixed(2)}` : `Bs ${block.amount.toLocaleString('es-VE', { maximumFractionDigits: 2 })}`}</span>
                                                    <button onClick={() => removePaymentBlock(block.id)} className="text-gray-300 hover:text-red-500 transition-colors"><Trash2 size={18} /></button>
                                                </div>
                                            </div>

                                            {/* MICRO-UPLOADER NAKED CORREGIDO */}
                                            {requiresReceipt && (
                                                <div className="mt-4 pt-2">
                                                    {!block.receiptFile ? (
                                                        <div className="relative">
                                                            <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" accept="image/*" onChange={(e) => e.target.files && handleAttachReceipt(block.id, e.target.files[0])} />
                                                            <div className="w-full py-4 border-b border-dashed border-gray-300 flex items-center justify-center gap-2 font-bold text-[11px] text-gray-400 hover:text-gray-900 hover:border-gray-900 transition-all cursor-pointer">
                                                                <Upload size={14} /> Subir Capture de {block.method} *
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="flex justify-between items-center bg-gray-50 px-4 py-3 rounded-md border border-gray-100">
                                                            <div className="flex items-center gap-3 min-w-0 text-gray-900">
                                                                <Check size={16} className="shrink-0 text-emerald-600" />
                                                                <span className="text-xs font-bold truncate">{block.receiptFile.name}</span>
                                                            </div>
                                                            <button onClick={() => handleAttachReceipt(block.id, null)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-white rounded-full transition-colors shrink-0"><X size={14} strokeWidth={3} /></button>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </motion.div>
                                    )
                                })}
                            </div>
                        )}
                    </AnimatePresence>

                    {/* 3. SELECTOR DE MÉTODOS (Clean Grid) */}
                    {(paymentMode === 'single' || remainingListUSD > 0.01) && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-4">
                            {activePaymentMethods.map(pm => {
                                const config = getPaymentConfig(pm);
                                return (
                                    <button key={pm} onClick={() => openPaymentInput(pm)} className={`flex items-center justify-center gap-2 px-4 py-4 text-xs font-bold rounded-md transition-all duration-200 active:scale-[0.98] ${activePaymentInput === pm ? config.btnSelected : config.btnIdle}`}>
                                        <config.icon size={20} className={activePaymentInput === pm ? 'text-white' : 'text-gray-900'} /> {pm}
                                    </button>
                                )
                            })}
                        </div>
                    )}

                    {/* 4. EL PORTAL DE PAGO INLINE (Acordeón Bifurcado UI Limpia) */}
                    <AnimatePresence>
                        {activePaymentInput && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                {(() => {
                                    const requiresReceipt = receiptConfig.strict_mode && activePaymentInput !== 'Efectivo' && activePaymentInput !== 'Zelle';
                                    const singlePaymentBlock = paymentMode === 'single' ? splitPayments.find(p => p.method === activePaymentInput) : null;

                                    return (
                                        <div className="mt-6 pt-6 border-t border-gray-100 flex flex-col gap-6">

                                            {paymentMode === 'split' ? (
                                                // 🚀 PORTAL MODO MIXTO (Naked Input Gigante)
                                                <>
                                                    <div className="flex justify-between items-end gap-6">
                                                        <div className="relative flex-1 group">
                                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">Monto con {activePaymentInput}</label>
                                                            <div className="flex items-baseline border-b-2 border-gray-200 group-focus-within:border-gray-900 transition-colors pb-2">
                                                                <span className="font-black text-3xl text-gray-300 mr-2">
                                                                    {hardCurrencyMethods.includes(activePaymentInput) ? '$' : 'Bs'}
                                                                </span>
                                                               <input
                                                                    type="text" 
                                                                    inputMode="decimal"
                                                                    autoFocus
                                                                    // 🚀 1. EL ESPEJO VISUAL (Vista Venezolana)
                                                                    // Toma el valor "4678.67", le pone puntos a los miles y cambia el punto por coma.
                                                                    value={paymentAmount ? paymentAmount.split('.').map((p, i) => i === 0 ? p.replace(/\B(?=(\d{3})+(?!\d))/g, ".") : p).join(',') : ''} 
                                                                    onChange={e => {
                                                                        let val = e.target.value;
                                                                        
                                                                        // 🚀 2. LA INGENIERÍA INVERSA (Formato Máquina)
                                                                        // A. Quitamos los puntos visuales que el usuario acaba de ver/escribir
                                                                        val = val.replace(/\./g, ''); 
                                                                        // B. Transformamos la coma venezolana en un punto decimal gringo para JavaScript
                                                                        val = val.replace(/,/g, '.'); 
                                                                        
                                                                        // 3. Limpiamos basura (Letras, símbolos, etc.)
                                                                        val = val.replace(/[^0-9.]/g, '');
                                                                        
                                                                        // 4. Bloqueamos colisiones de múltiples puntos decimales (Ej: 15.50.3)
                                                                        const parts = val.split('.');
                                                                        if (parts.length > 2) val = parts[0] + '.' + parts.slice(1).join('');
                                                                        
                                                                        // 5. Bloqueamos a un máximo de 2 decimales reales
                                                                        if (parts[1] && parts[1].length > 2) val = parts[0] + '.' + parts[1].substring(0, 2);
                                                                        
                                                                        // 6. Límite de longitud máxima para evitar ataques DoS
                                                                        if (val.length > 12) return;
                                                                        
                                                                        // Guardamos el número en formato puro (Ej: "4678.67")
                                                                        setPaymentAmount(val);
                                                                    }}
                                                                    className="w-full bg-transparent font-black text-3xl md:text-4xl accent-black h-4 border-0 py-6 text-gray-900 outline-none focus:ring-0 focus:shadow-none focus:border-black transition-colors rounded-none placeholder:text-gray-300"
                                                                    placeholder="0,00"
                                                                />
                                                            </div>
                                                        </div>
                                                        <button onClick={confirmPaymentBlock} className="px-6 py-4 rounded-md font-black text-xs uppercase tracking-widest transition-all bg-gray-900 text-white hover:bg-black flex items-center justify-center shrink-0">
                                                            Añadir
                                                        </button>
                                                    </div>
                                                </>
                                            ) : (
                                                // 🚀 PORTAL MODO ÚNICO (Tipografía Directa y Uploader Inteligente)
                                                (() => {
                                                    const canUploadReceipt = activePaymentInput !== 'Efectivo';
                                                    const isMandatory = receiptConfig.strict_mode && canUploadReceipt;

                                                    return (
                                                        <>
                                                            <div className="flex justify-between items-start">
                                                                <div>
                                                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Total a cancelar</p>
                                                                    <p className="font-black text-3xl md:text-4xl text-gray-900 leading-none tracking-tighter">
                                                                        {hardCurrencyMethods.includes(activePaymentInput) ? `$${totalCashUSD.toFixed(2)}` : `Bs ${(totalListUSD * activeRate).toLocaleString('es-VE', { maximumFractionDigits: 2 })}`}
                                                                    </p>
                                                                </div>
                                                            </div>

                                                            {canUploadReceipt && singlePaymentBlock && (
                                                                <div className="pt-2">
                                                                    {!singlePaymentBlock.receiptFile ? (
                                                                        <div className="relative">
                                                                            <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" accept="image/*" onChange={(e) => e.target.files && handleAttachReceipt(singlePaymentBlock.id, e.target.files[0])} />
                                                                            <div className="w-full py-4 border-b border-dashed border-gray-300 flex items-center gap-3 font-bold text-xs text-gray-400 hover:text-gray-900 transition-colors cursor-pointer">
                                                                                <Upload size={16} /> Subir Capture de {activePaymentInput} {isMandatory ? '*' : <span className="font-medium text-gray-300">(Opcional)</span>}
                                                                            </div>
                                                                        </div>
                                                                    ) : (
                                                                        <div className="flex justify-between items-center bg-gray-50 px-4 py-3 rounded-md border border-gray-100">
                                                                            <div className="flex items-center gap-3 min-w-0 text-gray-900">
                                                                                <Check size={16} className="shrink-0 text-emerald-600" />
                                                                                <span className="text-xs font-bold truncate">{singlePaymentBlock.receiptFile.name}</span>
                                                                            </div>
                                                                            <button onClick={() => handleAttachReceipt(singlePaymentBlock.id, null)} className="p-1 text-gray-400 hover:text-red-500 hover:bg-white transition-colors shrink-0"><X size={16} /></button>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </>
                                                    );
                                                })()
                                            )}

                                            {/* RECIBO DE DATOS BANCARIOS (Bloque Técnico) */}
                                            {payments[paymentKeysMap[activePaymentInput]]?.details && (
                                                <div className="bg-[#FAFAFA] rounded-md p-5 border border-gray-100 mt-2">
                                                    <div className="flex justify-between items-center mb-3">
                                                        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Datos para Transferir</span>
                                                        <button onClick={() => handleCopy(payments[paymentKeysMap[activePaymentInput]]?.details || '')} className="text-gray-400 hover:text-gray-900 transition-colors flex items-center gap-1.5 text-[10px] font-bold uppercase">
                                                            {copied ? <Check size={12} /> : <Copy size={12} />} {copied ? 'Copiado' : 'Copiar'}
                                                        </button>
                                                    </div>
                                                    <p className="text-sm font-mono font-medium text-gray-700 leading-relaxed whitespace-pre-wrap">
                                                        {payments[paymentKeysMap[activePaymentInput]]?.details}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })()}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>



                {/* 🚀 NUEVO: EL RESUMEN FINANCIERO SE MUEVE AL SCROLL */}
                {/* Ahora hace scroll natural con el contenido, liberando el 40% de la pantalla */}
                <div className="space-y-4 pt-8 border-t border-gray-100 mt-4 pb-8">
                    <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-widest pb-2">Resumen de la Orden</h2>

                    <div className="flex flex-col gap-3">
                        <div className="flex justify-between items-center text-sm font-medium text-gray-500">
                            <span>Subtotal (Precio de Lista)</span>
                            <span className={cartEngine.listPromoDiscounts > 0 ? "line-through decoration-gray-300" : ""}>
                                {currencySymbol}{cartEngine.totalListNominal.toFixed(2)}
                            </span>
                        </div>

                        {cartEngine.listPromoDiscounts > 0 && (
                            <div className="flex justify-between items-center text-sm font-black text-red-600 animate-in fade-in">
                                <span>Descuento de Campaña</span>
                                <span>-{currencySymbol}{cartEngine.listPromoDiscounts.toFixed(2)}</span>
                            </div>
                        )}

                        <div className="flex justify-between items-center text-sm font-black text-gray-900 pt-2 border-t border-gray-50">
                            <span>Subtotal Neto</span>
                            <span>{currencySymbol}{(cartEngine.finalBsModeUSD).toFixed(2)}</span>
                        </div>

                        {wholesaleDiscountList > 0 && (
                            <div className="flex justify-between items-center text-sm font-black text-emerald-600">
                                <span>Descuento Mayorista</span>
                                <span>-{currencySymbol}{wholesaleDiscountList.toFixed(2)}</span>
                            </div>
                        )}

                        <AnimatePresence>
                            {isHardCurrencyPayment && actualFxSavings > 0 && (
                                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="flex justify-between items-center text-sm font-black text-emerald-600">
                                    <span>Beneficio Pago en Divisa</span>
                                    <span>-{currencySymbol}{actualFxSavings.toFixed(2)}</span>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {deliveryCost > 0 && (
                            <div className="flex justify-between items-center text-sm font-bold text-gray-900 mt-1">
                                <span>Delivery / Envío</span>
                                <span>+{currencySymbol}{deliveryCost.toFixed(2)}</span>
                            </div>
                        )}
                    </div>
                </div>

            </div> {/* CIERRE DEL CONTENEDOR FLEX-1 (Área de scroll) */}

            {/* 🚀 NUEVO: ACTION BAR ULTRA-COMPACTA (Footer Fijo) */}
            {/* Solo una línea de alto. Usa pb-[env(safe-area-inset-bottom)] para adaptarse al notch de los iPhone */}
            <div className="bg-white/95 backdrop-blur-xl px-5 md:px-8 py-4 shrink-0 z-50 border-t border-gray-100 pb-[calc(1rem+env(safe-area-inset-bottom))]">
                <div className="flex items-center gap-5">

                    {/* Total a la izquierda */}
                    <div className="flex flex-col shrink-0">
                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1.5">Total Final</span>
                        <div className="flex items-end gap-2">
                            <span className="text-2xl md:text-3xl font-black text-gray-900 leading-none tracking-tighter">{currencySymbol}{grandTotalUSD.toFixed(2)}</span>
                        </div>
                        <span className="text-[10px] font-mono font-bold text-gray-400 mt-1.5">Bs {grandTotalBs.toLocaleString('es-VE', { maximumFractionDigits: 2 })}</span>
                    </div>

                    {/* Botón a la derecha */}
                    <button
                        onClick={handleCheckout}
                        disabled={loading || !isPaidInFull || missingReceipts}
                        className={`flex-1 h-[52px] rounded-full font-black text-xs md:text-sm uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${missingReceipts && isPaidInFull
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-black text-white hover:bg-gray-900 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-black/10'
                            }`}
                    >
                        {loading ? (
                            <Loader2 className="animate-spin" size={18} />
                        ) : missingReceipts && isPaidInFull ? (
                            <><Upload size={16} className="mb-0.5" /> Adjunta Recibos</>
                        ) : (
                            <><MessageCircle size={16} className="mb-0.5" /> Enviar Pedido</>
                        )}
                    </button>

                </div>
            </div>
        </motion.div>
    )
}