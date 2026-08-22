'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { getSupabase } from '@/lib/supabase-client'
import { compressImage } from '@/utils/imageOptimizer'
import { 
    Loader2, 
    FileText, 
    CheckCircle2, 
    Upload, 
    Check, 
    Copy, 
    ArrowRight, 
    ShieldCheck, 
    MapPin, 
    PackageX, 
    Download, 
    CreditCard, 
    Store, 
    Clock,
    ArrowUpRight
} from 'lucide-react'
import Swal from 'sweetalert2'
import Image from 'next/image'
import { getOptimizedUrl } from '@/utils/cdn'
import { Icon } from '@iconify/react'

const BrandLogos = {
    Transferencia: ({ className, size }: any) => <Icon icon="ph:bank-bold" className={className} width={size} height={size} />,
    Zelle: ({ className, size }: any) => <Icon icon="simple-icons:zelle" className={className} width={size} height={size} />,
    Binance: ({ className, size }: any) => <Icon icon="simple-icons:binance" className={className} width={size} height={size} />,
    PagoMovil: ({ className, size }: any) => <Icon icon="fluent:phone-checkmark-24-regular" className={className} width={size} height={size} />,
    Efectivo: ({ className, size }: any) => <Icon icon="bi:cash" className={className} width={size} height={size} />,
    Zinli: ({ className, size }: any) => <Icon icon="mdi:wallet-bifold" className={className} width={size} height={size} />,
    WallyTech: ({ className, size }: any) => <Icon icon="solar:wallet-bold" className={className} width={size} height={size} />
}

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
    
    const [copiedData, setCopiedData] = useState(false)

    // Conversor de Logo a Base64 para impresión nativa sin fallos de CORS
    const [logoBase64, setLogoBase64] = useState<string | null>(null)
    useEffect(() => {
        if (store?.logo_url) {
            fetch(getOptimizedUrl(store.logo_url))
                .then(res => res.blob())
                .then(blob => {
                    const reader = new FileReader();
                    reader.onloadend = () => setLogoBase64(reader.result as string);
                    reader.readAsDataURL(blob);
                })
                .catch(e => console.error("Error cargando logo en Base64", e));
        }
    }, [store?.logo_url])
    
    useEffect(() => {
        const fetchQuoteData = async () => {
            try {
                const { data: storeData } = await supabase.from('stores').select('*').eq('slug', slug).single()
                if (!storeData) throw new Error('Tienda no encontrada')
                setStore(storeData)

                const { data: orderData } = await supabase.from('orders').select('*').eq('id', orderId).eq('store_id', storeData.id).single()
                if (!orderData) throw new Error('Presupuesto no encontrado')
                setOrder(orderData)
           
                if (orderData.status === 'quote') {
                    localStorage.setItem('preziso_pending_quote', JSON.stringify({ 
                        id: orderData.id, 
                        total: orderData.total_usd,
                        slug: storeData.slug
                    }))
                } else {
                    localStorage.removeItem('preziso_pending_quote')
                }

                const { data: rateData } = await supabase.from('app_config').select('usd_rate, eur_rate').single()
                if (rateData) setRates({ usd_rate: rateData.usd_rate, eur_rate: rateData.eur_rate })

                const { data: itemsData } = await supabase
                    .from('order_items')
                    .select('*, product:products(stock), variant:product_variants(stock)')
                    .eq('order_id', orderId)
                
                if (itemsData) {
                    setItems(itemsData)
                    if (orderData.status === 'quote') {
                        const issues: string[] = []
                        itemsData.forEach((item: any) => {
                            const currentStock = item.variant_id ? item.variant?.stock : item.product?.stock;
                            if (currentStock < item.quantity) issues.push(item.product_name)
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
                    customClass: { popup: 'rounded-xl font-sans text-xs' } 
                })
            } finally {
                setLoading(false)
            }
        }
        if (slug && orderId) fetchQuoteData()
    }, [slug, orderId, supabase])

    // Sincronización Realtime
    useEffect(() => {
        if (!store?.id) return;

        const storeChannel = supabase
            .channel(`store-changes-${store.id}`)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'stores', filter: `id=eq.${store.id}` }, (payload: any) => {
                setStore((prevStore: any) => ({ ...prevStore, ...payload.new }));
            }).subscribe();

        const rateChannel = supabase
            .channel('rates-changes')
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'app_config' }, (payload: any) => {
                setRates((prevRates: any) => ({ ...prevRates, ...payload.new }));
            }).subscribe();

        return () => {
            supabase.removeChannel(storeChannel);
            supabase.removeChannel(rateChannel);
        };
    }, [store?.id, supabase]);

    const activeCurrency = useMemo(() => store?.currency_type || order?.currency_type || 'usd', [store, order]);
    const activeRate = useMemo(() => activeCurrency === 'eur' ? rates.eur_rate : rates.usd_rate, [activeCurrency, rates]);
    const totalBs = useMemo(() => Number(order?.total_usd || 0) * activeRate, [order, activeRate]);

    const activePaymentMethods = useMemo(() => {
        if (!store?.payment_config) return []
        const pConfig = store.payment_config
        const active = []
        
        if (pConfig.transferencia?.active) active.push('Transferencia')
        if (pConfig.pago_movil?.active) active.push('Pago Móvil')
        if (pConfig.zelle?.active) active.push('Zelle')
        if (pConfig.binance?.active) active.push('Binance')
        if (pConfig.zinli?.active) active.push('Zinli')
        if (pConfig.wally?.active) active.push('WallyTech')
        if (pConfig.cash?.active) active.push('Efectivo')

        if (order?.payment_method) {
            const allowed = order.payment_method.split(',')
            return active.filter(method => allowed.includes(method))
        }

        return active
    }, [store?.payment_config, order?.payment_method])

    const handleCopy = (text: string, setter: React.Dispatch<React.SetStateAction<boolean>>) => {
        navigator.clipboard.writeText(text)
        setter(true)
        setTimeout(() => setter(false), 2000)
    }

    const handleProcessPayment = async () => {
        if (!selectedMethod) return Swal.fire({ title: 'Faltan datos', text: 'Seleccione un método de pago.', icon: 'warning', confirmButtonColor: '#171717', customClass: { popup: 'rounded-xl font-sans text-xs' } })
        if (selectedMethod !== 'Zelle' && !receiptFile) return Swal.fire({ title: 'Faltan datos', text: 'Por favor adjunte el comprobante de pago.', icon: 'warning', confirmButtonColor: '#171717', customClass: { popup: 'rounded-xl font-sans text-xs' } })
        
        setSubmitting(true)
        try {
            let receiptPublicUrl = null;
            if (receiptFile) {
                const compressed = await compressImage(receiptFile, 800, 0.7)
                const fileExt = receiptFile.name.split('.').pop() || 'jpg'
                const fileName = `quote-${order.id}-${Date.now()}.${fileExt}`
                
                const { error: uploadError } = await supabase.storage.from('receipts').upload(fileName, compressed)
                if (uploadError) throw new Error('Error al subir el comprobante.')
                
                const { data: { publicUrl } } = supabase.storage.from('receipts').getPublicUrl(fileName)
                receiptPublicUrl = publicUrl
            }

            const { error: updateError } = await supabase.from('orders').update({
                status: 'pending',
                payment_method: selectedMethod,
                total_bs: totalBs,
                exchange_rate: activeRate,
                receipt_url: receiptPublicUrl,
                delivery_info: order.delivery_info + (reference ? ` | Ref: ${reference}` : '')
            }).eq('id', order.id)

            if (updateError) {
                if (updateError.message.includes('check_stock') || updateError.message.includes('violates check constraint')) {
                    throw new Error('Alguien acaba de adquirir el último artículo disponible. El inventario actual es insuficiente.')
                }
                throw updateError
            }

            setOrder({ ...order, status: 'pending' })
            Swal.fire({
                icon: 'success', 
                title: 'Pago Reportado con Éxito', 
                text: 'Su pago ha sido registrado para verificación en la tienda.',
                confirmButtonColor: '#171717', 
                customClass: { popup: 'rounded-xl font-sans text-xs' }
            })

        } catch (error: any) {
            Swal.fire({ icon: 'error', title: 'No se pudo procesar', text: error.message || 'Intente nuevamente.', confirmButtonColor: '#171717', customClass: { popup: 'rounded-xl font-sans text-xs' } })
        } finally {
            setSubmitting(false)
        }
    }

    if (loading) return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#FAFAFC] gap-3">
            <Loader2 className="animate-spin text-neutral-300" size={28} />
            <p className="text-xs font-semibold text-neutral-400 font-mono">Cargando proforma...</p>
        </div>
    )
    if (!order) return null

    const paymentKeysMap: Record<string, string> = { 'Pago Móvil': 'pago_movil', 'Zelle': 'zelle', 'Binance': 'binance', 'Zinli': 'zinli' }

    const getPaymentConfig = (pm: string) => {
        const baseSelected = 'bg-neutral-950 text-white border-neutral-950 shadow-xs'
        const baseIdle = 'bg-white text-neutral-600 border-neutral-200/60 hover:border-neutral-300 hover:text-neutral-900'

        switch (pm) {
            case 'Transferencia': return { icon: BrandLogos.Transferencia, btnSelected: baseSelected, btnIdle: baseIdle }
            case 'Pago Móvil': return { icon: BrandLogos.PagoMovil, btnSelected: baseSelected, btnIdle: baseIdle }
            case 'Zelle': return { icon: BrandLogos.Zelle, btnSelected: baseSelected, btnIdle: baseIdle }
            case 'Binance': return { icon: BrandLogos.Binance, btnSelected: baseSelected, btnIdle: baseIdle }
            case 'Zinli': return { icon: BrandLogos.Zinli, btnSelected: baseSelected, btnIdle: baseIdle }
            case 'WallyTech': return { icon: BrandLogos.WallyTech, btnSelected: baseSelected, btnIdle: baseIdle }
            case 'Efectivo': return { icon: BrandLogos.Efectivo, btnSelected: baseSelected, btnIdle: baseIdle }
            default: return { icon: CreditCard, btnSelected: baseSelected, btnIdle: baseIdle }
        }
    }

    return (
        <>
        {/* CSS PARA IMPRESIÓN LIMPIA */}
        <style dangerouslySetInnerHTML={{
            __html: `
            @media print { 
                @page { margin: 12mm; size: A4 portrait; } 
                body, html, main { background-color: white !important; margin: 0 !important; padding: 0 !important; height: auto !important; min-height: 0 !important; } 
                .print-hidden { display: none !important; } 
                .avoid-break { page-break-inside: avoid; break-inside: avoid; } 
                #invoice-container { max-width: 100% !important; border: none !important; padding: 0 !important; margin: 0 !important; box-shadow: none !important; }
            }
            `
        }} />

        <div className="min-h-screen bg-[#FAFAFC] font-sans text-neutral-900 py-6 md:py-12 px-4 flex justify-center selection:bg-neutral-950 selection:text-white antialiased">
            <div className="w-full max-w-[840px] flex flex-col gap-6">
                
                {/* ACTION BAR (Solo en pantalla) */}
                <div className="flex justify-between items-center print-hidden">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-[10px] font-semibold uppercase tracking-wider border ${
                        order.status === 'quote' ? 'bg-neutral-100 text-neutral-700 border-neutral-200/60' : 
                        !isPaymentVerified ? 'bg-amber-50 text-amber-700 border-amber-200/50' : 
                        'bg-emerald-50 text-emerald-700 border-emerald-200/50'
                    }`}>
                        {order.status === 'quote' ? <><FileText size={12} /> Proforma Activa</> : 
                         !isPaymentVerified ? <><Clock size={12} /> Pago en Verificación</> : 
                         <><CheckCircle2 size={12} /> Pedido Procesado</>}
                    </span>

                    <button 
                        onClick={() => window.print()} 
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white border border-neutral-200/60 hover:bg-neutral-50 rounded-lg text-xs font-semibold text-neutral-700 transition-all shadow-xs active:scale-95"
                    >
                        <Download size={13} /> 
                        <span>Descargar PDF / Imprimir</span>
                    </button>
                </div>

                {/* DOCUMENTO A4 (Estructura Cleanlook de Alta Densidad) */}
                <div id="invoice-container" className="bg-white rounded-2xl p-6 md:p-10 shadow-[0_1px_3px_rgba(0,0,0,0.015)] border border-neutral-200/50">
                    
                    {/* ENCABEZADO FISCAL */}
                    <div className="flex flex-col md:flex-row print:flex-row justify-between items-start border-b border-neutral-200/50 pb-5 mb-6 gap-4">
                        <div className="flex flex-col items-start max-w-[55%] print:max-w-[55%] space-y-1">
                            {store.logo_url ? (
                                <div className="h-9 mb-1.5">
                                    <img src={logoBase64 || getOptimizedUrl(store.logo_url)} alt={store.name} className="h-full w-auto object-contain" />
                                </div>
                            ) : (
                                <div className="h-9 w-9 rounded-lg bg-neutral-50 border border-neutral-200/50 flex items-center justify-center mb-1 text-neutral-400">
                                    <Store size={18} />
                                </div>
                            )}
                            <h1 className="text-base md:text-lg font-bold tracking-tight text-neutral-900 leading-none">{store.name}</h1>
                            {store?.fiscal_profile !== 'informal' && (
                                <div className="text-[10px] text-neutral-500 font-medium leading-relaxed">
                                    {store.legal_name && <span className="font-semibold text-neutral-700 mr-1">{store.legal_name}</span>}
                                    {store.legal_id && <span className="font-mono">| RIF: {store.legal_id}</span>}
                                    {store.fiscal_address && <p className="mt-0.5 text-neutral-400">{store.fiscal_address}</p>}
                                </div>
                            )}
                        </div>

                        <div className="flex flex-col md:items-end print:items-end text-left md:text-right print:text-right w-full md:w-auto print:w-auto space-y-1">
                            <p className="text-base md:text-lg font-bold tracking-tight text-neutral-900 uppercase font-mono leading-none">
                                {!isPaymentVerified ? 'Proforma Comercial' : 'Orden de Despacho'}
                            </p>
                            <p className="text-xs font-mono font-bold text-neutral-500">Nº {order.order_number}</p>
                            <div className="pt-1 text-[10px] text-neutral-400 font-mono flex flex-col md:items-end gap-0.5">
                                <p>Fecha: <span className="text-neutral-700 font-medium">{new Date(order.created_at).toLocaleDateString('es-VE')}</span></p>
                                <p>Moneda: <span className="text-neutral-700 font-medium uppercase">{activeCurrency}</span></p>
                            </div>
                        </div>
                    </div>

                    {/* SECCIÓN CLIENTE Y ENVÍO */}
                    <div className="flex flex-col md:flex-row print:flex-row justify-between gap-6 mb-8 text-xs">
                        <div className="flex-1 print:w-1/2 space-y-1">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 mb-1.5">Facturado a:</p>
                            <p className="font-bold text-neutral-900 text-sm leading-tight">{order.customer_name}</p>
                            <div className="text-neutral-500 font-mono text-[11px] space-y-0.5 pt-0.5">
                                {order.customer_dni && <p>CI/RIF: {order.customer_dni}</p>}
                                {order.customer_phone && <p>Télf: {order.customer_phone}</p>}
                                {order.customer_address && <p className="font-sans text-neutral-600 max-w-[280px] leading-tight pt-1">{order.customer_address}</p>}
                            </div>
                        </div>
                        {order.shipping_method !== 'pickup' && (
                            <div className="flex-1 md:text-right print:text-right print:w-1/2 space-y-1">
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 mb-1.5">Dirección de Despacho:</p>
                                <p className="text-neutral-600 font-medium leading-relaxed md:ml-auto max-w-[280px] text-[11px] bg-neutral-50/50 p-2.5 rounded-lg border border-neutral-200/40">
                                    {order.delivery_info}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* ALERTA DE STOCK (Solo pantalla) */}
                    {stockIssues.length > 0 && isQuoteActive && (
                        <div className="bg-rose-50 border border-rose-100/60 text-rose-800 p-3.5 rounded-xl mb-6 flex gap-3 items-start print-hidden">
                            <PackageX size={16} className="shrink-0 mt-0.5 text-rose-600" />
                            <div>
                                <p className="text-xs font-bold uppercase tracking-wider">Agotado Temporalmente</p>
                                <p className="text-xs font-medium text-rose-700/90 mt-0.5">El artículo <strong>{stockIssues.join(', ')}</strong> ya no posee existencias disponibles. Favor contactar a la tienda.</p>
                            </div>
                        </div>
                    )}

                    {/* TABLA DE ARTÍCULOS */}
                    <div className="mb-6 w-full">
                        <div className="grid grid-cols-12 gap-2 border-b border-neutral-200/50 pb-2 mb-2 text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
                            <div className="col-span-6">Descripción</div>
                            <div className="col-span-2 text-center">Cant.</div>
                            <div className="col-span-2 text-right">Precio Unit.</div>
                            <div className="col-span-2 text-right">Total</div>
                        </div>
                        
                        <div className="divide-y divide-neutral-100">
                            {items.length === 0 ? (
                                <p className="text-xs text-neutral-400 py-4 italic text-center">Cargando detalles de los productos...</p>
                            ) : (
                                items.map(item => (
                                    <div key={item.id} className="avoid-break grid grid-cols-12 gap-2 py-2.5 items-start text-xs">
                                        <div className="col-span-6 pr-2">
                                            <p className="font-bold text-neutral-900 leading-snug break-words">
                                                {item.product_name}
                                            </p>
                                            {item.variant_info && (
                                                <p className="text-[10px] text-neutral-500 font-mono mt-0.5 leading-tight">
                                                    {item.variant_info}
                                                </p>
                                            )}
                                        </div>
                                        <div className="col-span-2 text-center pt-0.5">
                                            <span className="font-mono text-neutral-700 font-medium">{item.quantity}</span>
                                        </div>
                                        <div className="col-span-2 text-right pt-0.5">
                                            <span className="font-mono text-neutral-500 text-[11px]">${Number(item.price_at_purchase).toFixed(2)}</span>
                                        </div>
                                        <div className="col-span-2 text-right flex flex-col justify-start">
                                            <p className="font-bold text-neutral-900 font-mono tabular-nums leading-snug">${(item.price_at_purchase * item.quantity).toFixed(2)}</p>
                                            <p className="text-[9px] font-mono text-neutral-400 mt-0.5">Bs {((item.price_at_purchase * item.quantity) * activeRate).toLocaleString('es-VE', { maximumFractionDigits: 2 })}</p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* RESUMEN FINANCIERO INTEGRAL */}
                    <div className="avoid-break flex flex-col md:flex-row print:flex-row justify-between items-end md:items-start print:items-start pt-4 border-t border-neutral-200/50 gap-6">
                        
                        {/* Nota Legal Discreta */}
                        <div className="w-full md:w-[45%] print:w-[45%]">
                            {!isPaymentVerified && (
                                <div className="p-3.5 rounded-lg bg-neutral-50 border border-neutral-200/40">
                                    <p className="text-[10px] text-neutral-400 leading-relaxed font-medium">
                                        Valores expresados en divisa base. Los montos en Bolívares (Bs) se consolidan automáticamente con la tasa oficial BCV al momento de registrar el pago.
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Columna de Cálculos y Totales */}
                        <div className="w-full md:w-[290px] print:w-[290px] space-y-3">
                            <div className="space-y-1.5 border-b border-neutral-100 pb-3 text-xs">
                                <div className="flex justify-between text-neutral-500 font-medium">
                                    <span>Subtotal Base</span>
                                    <span className="font-mono">${Number(order.subtotal_usd || order.total_usd).toFixed(2)}</span>
                                </div>

                                {/* DESCUENTOS AUDITABLES */}
                                {(Number(order.promo_discount_usd) > 0 || Number(order.wholesale_discount_usd) > 0 || Number(order.affiliate_discount_usd) > 0 || Number(order.fx_savings_usd) > 0) && (
                                    <div className="py-1.5 my-1 border-y border-neutral-100 space-y-1 font-mono text-[11px]">
                                        {Number(order.promo_discount_usd) > 0 && (
                                            <div className="flex justify-between items-center text-rose-600 font-semibold">
                                                <span>Desc. Campaña</span>
                                                <span>-${Number(order.promo_discount_usd).toFixed(2)}</span>
                                            </div>
                                        )}
                                        {Number(order.wholesale_discount_usd) > 0 && (
                                            <div className="flex justify-between items-center text-rose-600 font-semibold">
                                                <span>Desc. Mayorista</span>
                                                <span>-${Number(order.wholesale_discount_usd).toFixed(2)}</span>
                                            </div>
                                        )}
                                        {Number(order.affiliate_discount_usd) > 0 && (
                                            <div className="flex justify-between items-center text-rose-600 font-semibold">
                                                <span>Código Promocional</span>
                                                <span>-${Number(order.affiliate_discount_usd).toFixed(2)}</span>
                                            </div>
                                        )}
                                        {Number(order.fx_savings_usd) > 0 && (
                                            <div className="flex justify-between items-center text-emerald-600 font-semibold">
                                                <span>Incentivo Divisa</span>
                                                <span>-${Number(order.fx_savings_usd).toFixed(2)}</span>
                                            </div>
                                        )}
                                    </div>
                                )}
                                
                                {order.is_tax_applied && (
                                    <div className="flex justify-between text-neutral-900 font-bold pt-1">
                                        <span>I.V.A. ({order.tax_percentage}%)</span>
                                        <span className="font-mono">+${Number(order.tax_amount_usd || 0).toFixed(2)}</span>
                                    </div>
                                )}
                                {Number(order.delivery_cost) > 0 && (
                                    <div className="flex justify-between text-neutral-500">
                                        <span>Servicio de Envío</span>
                                        <span className="font-mono">+${Number(order.delivery_cost).toFixed(2)}</span>
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-between items-baseline pt-1">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Total a Liquidar</span>
                                <span className="text-2xl font-bold font-mono tabular-nums text-neutral-900 tracking-tight">
                                    ${Number(order.total_usd).toFixed(2)}
                                </span>
                            </div>

                            {/* TARJETA NEGRA DE DOBLE EXPRESIÓN BCV */}
                            <div className="p-3 bg-neutral-950 text-white rounded-xl flex justify-between items-center shadow-xs border border-neutral-800">
                                <div className="flex flex-col">
                                    <span className="text-[8px] font-bold uppercase tracking-wider text-neutral-400">Equivalente Oficial</span>
                                    <span className="text-[9px] text-neutral-500 font-mono">Tasa BCV: {activeRate.toFixed(2)}</span>
                                </div>
                                <span className="text-sm font-bold font-mono tabular-nums tracking-tight">
                                    Bs {totalBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                            </div>
                        </div>
                    </div>

                </div>

                {/* MODAL DE PAGO INLINE (Solo visible en proformas activas sin romper layout) */}
                {isQuoteActive && stockIssues.length === 0 && (
                    <div className="bg-white rounded-2xl p-6 md:p-8 shadow-[0_1px_3px_rgba(0,0,0,0.015)] border border-neutral-200/50 print-hidden space-y-6">
                        <div>
                            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-900 flex items-center gap-2">
                                <CreditCard size={15} className="text-neutral-500" />
                                <span>Reportar Comprobante de Pago</span>
                            </h3>
                            <p className="text-[11px] text-neutral-400 mt-0.5">Seleccione la pasarela utilizada para adjuntar su referencia bancaria.</p>
                        </div>
                        
                        {/* Selector de Métodos */}
                        <div className="flex flex-wrap gap-2">
                            {activePaymentMethods.map(pm => {
                                const config = getPaymentConfig(pm);
                                return (
                                    <button 
                                        key={pm} 
                                        onClick={() => setSelectedMethod(pm)}
                                        className={`flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg text-[10px] font-semibold uppercase tracking-wider transition-all border ${selectedMethod === pm ? config.btnSelected : config.btnIdle}`}
                                    >
                                        <config.icon size={13} className={selectedMethod === pm ? 'text-white' : 'text-neutral-400'} /> 
                                        <span>{pm}</span>
                                    </button>
                                )
                            })}
                        </div>

                        {selectedMethod && (
                            <div className="space-y-5 pt-2 animate-in fade-in duration-200">
                                
                                {store.payment_config[paymentKeysMap[selectedMethod]]?.details && (
                                    <div className="bg-neutral-50/50 p-4 rounded-xl border border-neutral-200/50 space-y-2">
                                        <div className="flex justify-between items-center">
                                            <span className="text-[9px] font-bold uppercase tracking-wider text-neutral-400">Datos de la Cuenta</span>
                                            <button 
                                                onClick={() => handleCopy(store.payment_config[paymentKeysMap[selectedMethod]]?.details || '', setCopiedData)} 
                                                className="text-[9px] font-bold uppercase tracking-wider text-neutral-500 hover:text-neutral-900 transition-colors flex items-center gap-1 bg-white px-2 py-0.5 rounded border border-neutral-200/50 shadow-xs"
                                            >
                                                {copiedData ? <Check size={10} className="text-emerald-600"/> : <Copy size={10}/>} 
                                                {copiedData ? 'Copiado' : 'Copiar'}
                                            </button>
                                        </div>
                                        <p className="text-xs font-mono font-medium text-neutral-700 leading-relaxed whitespace-pre-wrap">
                                            {store.payment_config[paymentKeysMap[selectedMethod]]?.details}
                                        </p>
                                    </div>
                                )}

                                <div className="grid md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 mb-1.5 block">Nº de Referencia (Opcional)</label>
                                        <input 
                                            type="text" 
                                            value={reference} 
                                            onChange={(e) => setReference(e.target.value)}
                                            className="w-full bg-neutral-50/50 border border-neutral-200/50 focus:bg-white focus:border-neutral-400 rounded-lg px-3.5 py-2.5 text-xs font-mono font-semibold outline-none transition-all placeholder:text-neutral-300"
                                            placeholder="Ej: 987456"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 mb-1.5 block">Comprobante de Pago *</label>
                                        <div className="relative w-full">
                                            <input 
                                                type="file" 
                                                accept="image/*" 
                                                onChange={(e) => e.target.files && setReceiptFile(e.target.files[0])} 
                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                                            />
                                            <div className={`w-full flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-lg border transition-all text-xs font-semibold ${receiptFile ? 'bg-neutral-900 text-white border-neutral-900' : 'bg-neutral-50/50 text-neutral-500 border-neutral-200/50 hover:bg-neutral-100 hover:text-neutral-900'}`}>
                                                {receiptFile ? <><CheckCircle2 size={13} className="text-emerald-400" /> <span className="truncate max-w-[180px]">{receiptFile.name}</span></> : <><Upload size={13} /> <span>Subir Capture</span></>}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <button 
                                    onClick={handleProcessPayment}
                                    disabled={submitting}
                                    className="w-full bg-neutral-950 text-white py-3 rounded-lg font-semibold uppercase tracking-wider text-xs hover:bg-black active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 shadow-xs"
                                >
                                    {submitting ? <Loader2 className="animate-spin" size={14} /> : <><ArrowRight size={14} /> <span>Confirmar y Enviar Pago</span></>}
                                </button>
                            </div>
                        )}
                    </div>
                )}
                
                {/* Pie de Marca Discreto */}
                <div className="mt-4 text-center opacity-40 hover:opacity-100 transition-opacity print-hidden">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-neutral-400 flex items-center justify-center gap-1">
                        Generado por <span className="font-bold text-neutral-800 tracking-tight">PREZISO SaaS</span>
                    </p>
                </div>

            </div>
        </div>
        </> 
    )
}