'use client'

import { useEffect, useState, useMemo } from 'react'
import { useParams } from 'next/navigation'
import { getSupabase } from '@/lib/supabase-client'
import { compressImage } from '@/utils/imageOptimizer'
import { Loader2, FileText, CheckCircle2, Upload, Check, Copy, ArrowRight, ShieldCheck, MapPin, PackageX, Download, CreditCard, Store, Clock } from 'lucide-react'
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
    // 🚀 ESTADO UNIFICADO DE TASAS
    const [rates, setRates] = useState({ usd_rate: 0, eur_rate: 0 })
    
    const [stockIssues, setStockIssues] = useState<string[]>([])
    const isQuoteActive = order?.status === 'quote'
    // 🚀 NUEVA REGLA DE NEGOCIO: El pago solo es real si el admin lo marcó como pagado, enviado o completado
    const isPaymentVerified = ['paid', 'shipped', 'completed'].includes(order?.status)

    const [selectedMethod, setSelectedMethod] = useState<string>('')
    const [reference, setReference] = useState('')
    const [receiptFile, setReceiptFile] = useState<File | null>(null)
    
    // Estados de copiado independiente
    const [copiedData, setCopiedData] = useState(false)
    const [copiedUsd, setCopiedUsd] = useState(false)
    const [copiedBs, setCopiedBs] = useState(false)

    // 🚀 NUEVO: Conversor de Logo a Base64 para impresión nativa sin fallos de CORS
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
           
                // 🚀 INYECCIÓN: MEMORIA PERSISTENTE (Guardamos el ID localmente)
                if (orderData.status === 'quote') {
                    localStorage.setItem('preziso_pending_quote', JSON.stringify({ 
                        id: orderData.id, 
                        total: orderData.total_usd,
                        slug: storeData.slug
                    }))
                } else {
                    localStorage.removeItem('preziso_pending_quote')
                }

               // 🚀 FETCH COMPLETO DE TASAS
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
                Swal.fire({ icon: 'error', title: 'Acceso Denegado', text: 'El enlace de este presupuesto no es válido o ha expirado.', confirmButtonColor: '#000', showConfirmButton: false })
            } finally {
                setLoading(false)
            }
        }
        if (slug && orderId) fetchQuoteData()
    }, [slug, orderId, supabase])

    // 🚀 MOTOR DE SINCRONIZACIÓN TOTAL (Realtime Blindado)
    useEffect(() => {
        if (!store?.id) return;

        const storeChannel = supabase
            .channel(`store-changes-${store.id}`)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'stores', filter: `id=eq.${store.id}` }, (payload:any) => {
                    setStore((prevStore: any) => ({ ...prevStore, ...payload.new }));
            }).subscribe();

        const rateChannel = supabase
            .channel('rates-changes')
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'app_config' }, (payload:any) => {
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

        // 🚀 FILTRO DE INSTANCIA: Respetamos la decisión del POS
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
        if (!selectedMethod) return Swal.fire('Faltan Datos', 'Selecciona un método de pago.', 'warning')
        if (selectedMethod !== 'Zelle' && !receiptFile) return Swal.fire('Faltan Datos', 'Por favor adjunta tu comprobante de pago.', 'warning')
        
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
                    throw new Error('Alguien acaba de comprar el último artículo disponible en la tienda. El inventario es insuficiente.')
                }
                throw updateError
            }

            setOrder({ ...order, status: 'pending' })
            Swal.fire({
                icon: 'success', title: 'Pago Reportado', 
                text: 'Tu pago ha sido enviado a la tienda para su verificación. ¡Gracias por tu compra!',
                confirmButtonColor: '#000', customClass: { popup: 'rounded-xl shadow-2xl' }
            })

        } catch (error: any) {
            Swal.fire({ icon: 'error', title: 'No se pudo procesar', text: error.message || 'Intenta nuevamente.', confirmButtonColor: '#000', customClass: { popup: 'rounded-xl shadow-2xl' } })
        } finally {
            setSubmitting(false)
        }
    }

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA]"><Loader2 className="animate-spin text-zinc-300" size={40} /></div>
    if (!order) return null

    const paymentKeysMap: Record<string, string> = { 'Pago Móvil': 'pago_movil', 'Zelle': 'zelle', 'Binance': 'binance', 'Zinli': 'zinli' }

    const getPaymentConfig = (pm: string) => {
        const baseSelected = 'bg-zinc-900 text-white border-zinc-900 shadow-md'
        const baseIdle = 'bg-white text-zinc-500 border-zinc-200 hover:border-zinc-400 hover:text-zinc-900'

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
        {/* 🚀 CSS PARA IMPRESIÓN BLINDADO (Awwwards Grade) */}
        <style dangerouslySetInnerHTML={{
            __html: `
            @media print { 
                @page { margin: 10mm; size: A4 portrait; } 
                body, html, main { background-color: white !important; margin: 0 !important; padding: 0 !important; height: auto !important; min-height: 0 !important; } 
                .print-hidden { display: none !important; } 
                .avoid-break { page-break-inside: avoid; break-inside: avoid; } 
                .shadow-subtle, .shadow-sm, .shadow-lg { box-shadow: none !important; } 
                /* Forzamos a que el contenedor principal ocupe el 100% sin márgenes */
                #invoice-container { max-width: 100% !important; border: none !important; padding: 0 !important; margin: 0 !important; }
            }
            `
        }} />

        <div className="min-h-screen bg-[#FAFAFA] font-sans text-zinc-900 py-6 md:py-12 px-4 flex justify-center selection:bg-zinc-200">
            <div className="w-full max-w-[850px] flex flex-col gap-6">
                
                {/* 🚀 ACTION BAR (Solo en pantalla) */}
                <div className="flex justify-between items-center print-hidden mb-6">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-widest border transition-colors ${
                        order.status === 'quote' ? 'bg-zinc-100 text-zinc-600 border-zinc-200' : 
                        !isPaymentVerified ? 'bg-amber-50 text-amber-700 border-amber-200' : 
                        'bg-emerald-50 text-emerald-700 border-emerald-100'
                    }`}>
                        {order.status === 'quote' ? <><FileText size={12} /> Pendiente</> : 
                         !isPaymentVerified ? <><Clock size={12} /> En Verificación</> : 
                         <><CheckCircle2 size={12} /> Procesado</>}
                    </span>
                    <button onClick={() => window.print()} className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-zinc-200 hover:border-zinc-900 hover:bg-zinc-900 hover:text-white rounded-lg text-xs font-bold uppercase tracking-widest transition-all shadow-sm">
                        <Download size={14} /> Imprimir / PDF
                    </button>
                </div>

              {/* 🚀 DOCUMENTO A4 (Alta Densidad - Una Sola Hoja) */}
                <div id="invoice-container" className="bg-white rounded-xl md:rounded-2xl p-6 md:p-10 shadow-sm border border-zinc-200">
                    
                    {/* ENCABEZADO ESTRUCTURAL COMPACTO */}
                    {/* 🚀 FIX: Forzamos flex-row e items-end en modo impresión */}
                    <div className="flex flex-col md:flex-row print:flex-row justify-between items-start border-b border-zinc-200 pb-4 mb-4 gap-4">
                        <div className="flex flex-col items-start max-w-[50%] print:max-w-[50%]">
                            {store.logo_url ? (
                                <div className="h-10 mb-2">
                                    <img src={logoBase64 || getOptimizedUrl(store.logo_url)} alt={store.name} className="h-full w-auto object-contain" />
                                </div>
                            ) : (
                                <div className="h-10 w-10 rounded-lg bg-zinc-100 flex items-center justify-center mb-2 text-zinc-400">
                                    <Store size={20} />
                                </div>
                            )}
                          <h1 className="text-lg font-black tracking-tight leading-none text-zinc-900 mb-0.5">{store.name}</h1>
                            {store?.fiscal_profile !== 'informal' && (
                                <div className="text-[9px] text-zinc-500 leading-tight">
                                    {store.legal_name && <span className="font-bold text-zinc-700 mr-1">{store.legal_name}</span>}
                                    {store.legal_id && <span className="font-mono">| RIF: {store.legal_id}</span>}
                                    {store.fiscal_address && <p className="mt-0.5">{store.fiscal_address}</p>}
                                </div>
                            )}
                        </div>

                        {/* 🚀 FIX: Forzamos alineación a la derecha en impresión */}
                        <div className="flex flex-col md:items-end print:items-end text-left md:text-right print:text-right w-full md:w-auto print:w-auto">
                            <p className="text-xl font-black tracking-tighter text-zinc-900 uppercase leading-none">
                                {!isPaymentVerified ? 'Proforma' : 'Orden de Pedido'}
                            </p>
                            <p className="text-xs font-mono font-bold text-zinc-500 mt-1">Nº {order.order_number}</p>
                            <div className="mt-2 text-[9px] text-zinc-500 flex flex-col md:items-end gap-0.5">
                                <p className="uppercase tracking-widest font-bold">Emisión: <span className="font-mono font-normal ml-1">{new Date(order.created_at).toLocaleDateString('es-VE')}</span></p>
                                <p className="uppercase tracking-widest font-bold">Moneda: <span className="font-mono font-normal ml-1">{activeCurrency}</span></p>
                            </div>
                        </div>
                    </div>


                    {/* SECCIÓN CLIENTE */}
                    {/* 🚀 FIX: Mantenemos el diseño de 2 columnas en el PDF */}
                    <div className="flex flex-col md:flex-row print:flex-row justify-between gap-8 mb-10">
                        <div className="flex-1 print:w-1/2">
                            <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 mb-2">Facturado a:</p>
                            <p className="text-sm font-bold text-zinc-900 mb-1">{order.customer_name}</p>
                            <div className="text-xs text-zinc-500 font-mono space-y-0.5">
                                {order.customer_dni && <p>CI/RIF: {order.customer_dni}</p>}
                                {order.customer_phone && <p>Telf: {order.customer_phone}</p>}
                                {order.customer_address && <p className="font-sans max-w-[250px] leading-tight mt-1">{order.customer_address}</p>}
                            </div>
                       </div>
                        {order.shipping_method !== 'pickup' && (
                            <div className="flex-1 md:text-right print:text-right print:w-1/2">
                                <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 mb-2">Enviar a:</p>
                                <p className="text-xs font-medium text-zinc-700 leading-snug md:ml-auto max-w-[250px]">{order.delivery_info}</p>
                            </div>
                        )}
                    </div>

                    {/* ALERTA DE INVENTARIO (Solo pantalla) */}
                    {stockIssues.length > 0 && isQuoteActive && (
                        <div className="bg-red-50/50 border border-red-100 text-red-700 p-4 rounded-lg mb-8 flex gap-3 items-start print-hidden">
                            <PackageX size={16} className="shrink-0 mt-0.5" strokeWidth={2.5} />
                            <div>
                                <p className="text-xs font-bold uppercase tracking-widest mb-1">Stock Insuficiente</p>
                                <p className="text-xs font-medium">El artículo <b>{stockIssues.join(', ')}</b> se agotó. Contacta a la tienda.</p>
                            </div>
                        </div>
                    )}

               
                    {/* ALERTA DE INVENTARIO (Solo pantalla) */}
                    {stockIssues.length > 0 && isQuoteActive && (
                        <div className="bg-red-50/50 border border-red-100 text-red-700 p-4 rounded-lg mb-8 flex gap-3 items-start print-hidden">
                            <PackageX size={16} className="shrink-0 mt-0.5" strokeWidth={2.5} />
                            <div>
                                <p className="text-xs font-bold uppercase tracking-widest mb-1">Stock Insuficiente</p>
                                <p className="text-xs font-medium">El artículo <b>{stockIssues.join(', ')}</b> se agotó. Contacta a la tienda.</p>
                            </div>
                        </div>
                    )}

                  {/* 🚀 TABLA DE ARTÍCULOS (Multilínea Fluida sin Recortes) */}
                    <div className="mb-6 w-full">
                        <div className="grid grid-cols-12 gap-2 border-b border-zinc-300 pb-1.5 mb-1.5 text-[8px] font-bold uppercase tracking-widest text-zinc-500">
                            <div className="col-span-6">Descripción</div>
                            <div className="col-span-1 text-center">Cant</div>
                            <div className="col-span-2 text-right">Precio U.</div>
                            <div className="col-span-3 text-right">Total USD / Bs</div>
                        </div>
                        
                        <div className="flex flex-col">
                            {items.length === 0 ? (
                                <p className="text-[10px] text-zinc-400 py-2 italic">Cargando artículos...</p>
                            ) : (
                                items.map(item => (
                                    <div key={item.id} className="avoid-break grid grid-cols-12 gap-2 py-2 border-b border-zinc-100 items-start">
                                        {/* 🚀 FIX: Eliminamos 'truncate' y aplicamos 'leading-snug' + 'break-words' */}
                                        <div className="col-span-6 pr-2">
                                            <p className="text-[11px] font-bold text-zinc-900 leading-snug break-words whitespace-normal">
                                                {item.product_name}
                                            </p>
                                            {item.variant_info && (
                                                <p className="text-[9px] text-zinc-500 font-medium mt-0.5 leading-tight break-words whitespace-normal">
                                                    {item.variant_info}
                                                </p>
                                            )}
                                        </div>
                                        <div className="col-span-1 text-center pt-0.5">
                                            <span className="text-[11px] font-mono font-medium text-zinc-700">{item.quantity}</span>
                                        </div>
                                        <div className="col-span-2 text-right pt-0.5">
                                            <span className="text-[10px] font-mono font-medium text-zinc-500">${Number(item.price_at_purchase).toFixed(2)}</span>
                                        </div>
                                        <div className="col-span-3 text-right flex flex-col justify-start">
                                            <p className="text-[11px] font-black text-zinc-900 tabular-nums leading-snug">${(item.price_at_purchase * item.quantity).toFixed(2)}</p>
                                            <p className="text-[8px] font-mono text-zinc-400 mt-0.5 leading-tight">Bs {((item.price_at_purchase * item.quantity) * activeRate).toLocaleString('es-VE', { maximumFractionDigits: 2 })}</p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                 

                   {/* 🚀 RESUMEN FINANCIERO INTEGRAL (FASE 4 - Polish) */}
                    <div className="avoid-break flex flex-col md:flex-row print:flex-row justify-between items-end md:items-start print:items-start pt-2 gap-6">
                        {/* Notas Legales (Lado izquierdo, muy discreto) */}
                        <div className="w-full md:w-[45%] print:w-[45%]">
                            {!isPaymentVerified && (
                                <div className="p-3 rounded-lg bg-zinc-50 border border-black/5">
                                    <p className="text-[9px] text-zinc-400 leading-relaxed italic">
                                        Esta proforma muestra los precios en divisas. Los montos en moneda nacional son referenciales y se ajustarán a la tasa BCV oficial al momento de la conciliación del pago.
                                    </p>
                                </div>
                            )}
                       </div>

                        {/* Columna de Cálculos (Lado derecho) */}
                       <div className="w-full md:w-[280px] print:w-[280px]">
                            <div className="space-y-1 border-b border-zinc-200 pb-2 mb-2">
                                <div className="flex justify-between text-[10px] text-zinc-500 font-medium">
                                    <span>Subtotal Base</span>
                                    <span className="font-mono">${Number(order.subtotal_usd || order.total_usd).toFixed(2)}</span>
                                </div>

                                {/* 🎁 BLOQUE DE DESCUENTOS (Se activa al leer la BD) */}
                                {(Number(order.promo_discount_usd) > 0 || Number(order.wholesale_discount_usd) > 0 || Number(order.affiliate_discount_usd) > 0 || Number(order.fx_savings_usd) > 0) && (
                                    <div className="py-1 my-1 border-y border-zinc-100 space-y-0.5">
                                        {Number(order.promo_discount_usd) > 0 && (
                                            <div className="flex justify-between items-center text-[10px] text-red-500 font-bold">
                                                <span>Desc. Campaña</span>
                                                <span className="font-mono">-${Number(order.promo_discount_usd).toFixed(2)}</span>
                                            </div>
                                        )}
                                        {Number(order.wholesale_discount_usd) > 0 && (
                                            <div className="flex justify-between items-center text-[10px] text-red-500 font-bold">
                                                <span>Desc. Mayorista</span>
                                                <span className="font-mono">-${Number(order.wholesale_discount_usd).toFixed(2)}</span>
                                            </div>
                                        )}
                                        {Number(order.affiliate_discount_usd) > 0 && (
                                            <div className="flex justify-between items-center text-[10px] text-red-500 font-bold">
                                                <span>Código Promocional</span>
                                                <span className="font-mono">-${Number(order.affiliate_discount_usd).toFixed(2)}</span>
                                            </div>
                                        )}
                                        {Number(order.fx_savings_usd) > 0 && (
                                            <div className="flex justify-between items-center text-[10px] text-emerald-600 font-bold">
                                                <span>Ahorro Pago Divisa</span>
                                                <span className="font-mono">-${Number(order.fx_savings_usd).toFixed(2)}</span>
                                            </div>
                                        )}
                                    </div>
                                )}
                                
                                {order.is_tax_applied && (
                                    <div className="flex justify-between text-[10px] text-zinc-900 font-bold pt-1">
                                        <span>I.V.A. ({order.tax_percentage}%)</span>
                                        <span className="font-mono">+${Number(order.tax_amount_usd || 0).toFixed(2)}</span>
                                    </div>
                                )}
                                {Number(order.delivery_cost) > 0 && (
                                    <div className="flex justify-between text-[10px] text-zinc-500">
                                        <span>Delivery</span>
                                        <span className="font-mono">+${Number(order.delivery_cost).toFixed(2)}</span>
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-between items-end mb-2">
                                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-900 pb-1">Total USD</span>
                                <span className="text-2xl font-black tabular-nums tracking-tighter text-zinc-900 leading-none">
                                    ${Number(order.total_usd).toFixed(2)}
                                </span>
                            </div>

                            {/* DOBLE EXPRESIÓN BCV */}
                            <div className="p-3 bg-zinc-900 text-white rounded-xl flex justify-between items-center">
                                <div className="flex flex-col">
                                    <span className="text-[7px] font-bold uppercase tracking-widest text-zinc-400 mb-0.5">Equivalente BCV</span>
                                    <span className="text-[8px] text-zinc-500 font-mono">Tasa: {activeRate.toFixed(2)}</span>
                                </div>
                                <span className="text-sm font-black tabular-nums tracking-tight">
                                    Bs {totalBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                            </div>
                        </div> {/* <- Cierra la columna derecha de cálculos */}
                    </div> {/* <- Cierra el contenedor de Resumen Financiero integral */}

                </div> {/* <- Cierra el #invoice-container (El fondo blanco) */}
                    

                {/* 🚀 MODAL DE PAGO INLINE (Awwwards Grade - No Imprimible) */}
                {isQuoteActive && stockIssues.length === 0 && (
                    <div className="bg-white rounded-xl md:rounded-2xl p-8 shadow-sm border border-zinc-200 print-hidden">
                        <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-900 mb-6 flex items-center gap-2">
                            <CreditCard size={16} /> Procesar Pago
                        </h3>
                        
                        <div className="flex flex-wrap gap-2 mb-8">
                            {activePaymentMethods.map(pm => {
                                const config = getPaymentConfig(pm);
                                return (
                                    <button 
                                        key={pm} 
                                        onClick={() => setSelectedMethod(pm)}
                                        className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all border ${selectedMethod === pm ? config.btnSelected : config.btnIdle}`}
                                    >
                                        <config.icon size={14} className={selectedMethod === pm ? 'text-white' : 'text-zinc-400'} /> 
                                        {pm}
                                    </button>
                                )
                            })}
                        </div>

                        {selectedMethod && (
                            <div className="animate-in fade-in slide-in-from-top-2 space-y-6">
                                
                                {store.payment_config[paymentKeysMap[selectedMethod]]?.details && (
                                    <div className="bg-zinc-50 p-5 rounded-lg border border-zinc-100">
                                        <div className="flex justify-between items-center mb-3">
                                            <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-400">Instrucciones de Pago</span>
                                            <button 
                                                onClick={() => handleCopy(store.payment_config[paymentKeysMap[selectedMethod]]?.details || '', setCopiedData)} 
                                                className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 hover:text-zinc-900 transition-colors flex items-center gap-1"
                                            >
                                                {copiedData ? <Check size={10} className="text-emerald-500"/> : <Copy size={10}/>} 
                                                {copiedData ? 'Copiado' : 'Copiar Datos'}
                                            </button>
                                        </div>
                                        <p className="text-xs font-mono font-medium text-zinc-700 leading-relaxed whitespace-pre-wrap">
                                            {store.payment_config[paymentKeysMap[selectedMethod]]?.details}
                                        </p>
                                    </div>
                                )}

                                <div className="grid md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 mb-1.5 block">Nº Referencia (Opcional)</label>
                                        <input 
                                            type="text" 
                                            value={reference} 
                                            onChange={(e) => setReference(e.target.value)}
                                            className="w-full bg-white border border-zinc-200 focus:border-zinc-900 rounded-lg px-4 py-3 text-xs font-bold outline-none transition-all"
                                            placeholder="Ej: 123456"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 mb-1.5 block">Comprobante / Capture *</label>
                                        <div className="relative w-full">
                                            <input type="file" accept="image/*" onChange={(e) => e.target.files && setReceiptFile(e.target.files[0])} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                                            <div className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg border transition-all text-xs font-bold ${receiptFile ? 'bg-zinc-900 text-white border-zinc-900' : 'bg-white text-zinc-500 border-zinc-200 hover:border-zinc-400 hover:text-zinc-900'}`}>
                                                {receiptFile ? <><CheckCircle2 size={14} /> {receiptFile.name.substring(0, 15)}...</> : <><Upload size={14} /> Subir Imagen</>}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <button 
                                    onClick={handleProcessPayment}
                                    disabled={submitting}
                                    className="w-full bg-zinc-900 text-white py-4 rounded-lg font-bold uppercase tracking-widest text-xs hover:bg-black active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {submitting ? <Loader2 className="animate-spin" size={16} /> : <><ArrowRight size={16} /> Confirmar Pago</>}
                                </button>
                            </div>
                        )}
                    </div>
                )}
                
                <div className="mt-8 text-center opacity-30 hover:opacity-100 transition-opacity print-hidden">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-900 flex items-center justify-center gap-1.5">
                        Generado por <span className="font-black tracking-tight ml-0.5">PREZISO SaaS</span>
                    </p>
                </div>
            </div> {/* <- Cierra el contenedor máximo (max-w-4xl) */}
        </div> {/* <- Cierra el fondo gris de toda la página */}
        </> 
    )
}