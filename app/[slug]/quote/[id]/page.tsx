'use client'

import { useEffect, useState, useMemo } from 'react'
import { useParams } from 'next/navigation'
import { getSupabase } from '@/lib/supabase-client'
import { compressImage } from '@/utils/imageOptimizer'
import { Loader2, FileText, CheckCircle2, Upload, Check, Copy, ArrowRight, ShieldCheck, MapPin, PackageX, Download, CreditCard, Store } from 'lucide-react'
import Swal from 'sweetalert2'
import Image from 'next/image'
import { getOptimizedUrl } from '@/utils/cdn'
import { Icon } from '@iconify/react'

// --- LOGOS DE MÉTODOS DE PAGO (Heredado del Checkout) ---
const BrandLogos = {
    Zelle: ({ className, size }: any) => <Icon icon="simple-icons:zelle" className={className} width={size} height={size} />,
    Binance: ({ className, size }: any) => <Icon icon="simple-icons:binance" className={className} width={size} height={size} />,
    PagoMovil: ({ className, size }: any) => <Icon icon="fluent:phone-checkmark-24-regular" className={className} width={size} height={size} />,
    Efectivo: ({ className, size }: any) => <Icon icon="bi:cash" className={className} width={size} height={size} />,
    Zinli: ({ className, size }: any) => <Icon icon="mdi:wallet-bifold" className={className} width={size} height={size} />
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

    const [selectedMethod, setSelectedMethod] = useState<string>('')
    const [reference, setReference] = useState('')
    const [receiptFile, setReceiptFile] = useState<File | null>(null)
    
    // Estados de copiado independiente
    const [copiedData, setCopiedData] = useState(false)
    const [copiedUsd, setCopiedUsd] = useState(false)
    const [copiedBs, setCopiedBs] = useState(false)

    

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
                    // Si ya se pagó o canceló, borramos la memoria para que no moleste el banner
                    localStorage.removeItem('preziso_pending_quote')
                }

               // 🚀 FETCH COMPLETO DE TASAS
                const { data: rateData } = await supabase.from('app_config').select('usd_rate, eur_rate').single()
                if (rateData) setRates({ usd_rate: rateData.usd_rate, eur_rate: rateData.eur_rate })

                // Ahora que arreglamos el RLS, esto traerá los ítems correctamente
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

        console.log("📡 Conectando antenas Realtime...");

        // 1. Escuchar cambios en la Tienda (Switch de moneda USD/EUR)
        const storeChannel = supabase
            .channel(`store-changes-${store.id}`)
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'stores', filter: `id=eq.${store.id}` },
                (payload:any) => {
                    console.log("⚡ ¡Cambio de Tienda detectado!", payload.new);
                    // Usamos función de callback para fusionar sin perder datos previos
                    setStore((prevStore: any) => ({ ...prevStore, ...payload.new }));
                }
            )
            .subscribe();

        // 2. Escuchar cambios en App Config (Valor numérico de la tasa Bs)
        const rateChannel = supabase
            .channel('rates-changes')
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'app_config' },
                (payload:any) => {
                    console.log("⚡ ¡Cambio de Tasas detectado!", payload.new);
                    // Fusionamos para que si solo cambia USD, no se borre el EUR
                    setRates((prevRates: any) => ({ ...prevRates, ...payload.new }));
                }
            )
            .subscribe();

        return () => {
            console.log("🔌 Desconectando antenas...");
            supabase.removeChannel(storeChannel);
            supabase.removeChannel(rateChannel);
        };
    }, [store?.id, supabase]);

 // Verifica que tus cálculos se vean así:
    const activeCurrency = useMemo(() => store?.currency_type || order?.currency_type || 'usd', [store, order]);
    const activeRate = useMemo(() => activeCurrency === 'eur' ? rates.eur_rate : rates.usd_rate, [activeCurrency, rates]);
    const totalBs = useMemo(() => Number(order?.total_usd || 0) * activeRate, [order, activeRate]);

    const activePaymentMethods = useMemo(() => {
        if (!store?.payment_config) return []
        const pConfig = store.payment_config
        const pm = []
        if (pConfig.pago_movil?.active) pm.push('Pago Móvil')
        if (pConfig.zelle?.active) pm.push('Zelle')
        if (pConfig.binance?.active) pm.push('Binance')
        if (pConfig.zinli?.active) pm.push('Zinli')
        return pm
    }, [store?.payment_config])

    // --- FUNCIONES DE COPIADO INDIVIDUALES ---
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
                exchange_rate: activeRate, // 🚀 Tasa aplicada real (Dinámica)
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
                confirmButtonColor: '#000', customClass: { popup: 'rounded-3xl shadow-2xl' }
            })

        } catch (error: any) {
            Swal.fire({ icon: 'error', title: 'No se pudo procesar', text: error.message || 'Intenta nuevamente.', confirmButtonColor: '#000', customClass: { popup: 'rounded-3xl shadow-2xl' } })
        } finally {
            setSubmitting(false)
        }
    }

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA]"><Loader2 className="animate-spin text-gray-300" size={40} /></div>
    if (!order) return null

   const paymentKeysMap: Record<string, string> = { 'Pago Móvil': 'pago_movil', 'Zelle': 'zelle', 'Binance': 'binance', 'Zinli': 'zinli' }

    // 🚀 ESTÉTICA Y LOGOS (Adaptado para el Clean Look del Quote)
    const getPaymentConfig = (pm: string) => {
        const baseSelected = 'bg-black text-white border-black shadow-md'
        const baseIdle = 'bg-white text-gray-500 border-gray-200 hover:border-gray-400 hover:text-gray-900'

        switch (pm) {
            case 'Pago Móvil': return { icon: BrandLogos.PagoMovil, btnSelected: baseSelected, btnIdle: baseIdle }
            case 'Zelle': return { icon: BrandLogos.Zelle, btnSelected: baseSelected, btnIdle: baseIdle }
            case 'Binance': return { icon: BrandLogos.Binance, btnSelected: baseSelected, btnIdle: baseIdle }
            case 'Zinli': return { icon: BrandLogos.Zinli, btnSelected: baseSelected, btnIdle: baseIdle }
            case 'Efectivo': return { icon: BrandLogos.Efectivo, btnSelected: baseSelected, btnIdle: baseIdle }
            default: return { icon: CreditCard, btnSelected: baseSelected, btnIdle: baseIdle }
        }
    }




    return (
        <>
        {/* 🚀 CSS PARA IMPRESIÓN PDF NATIVA */}
        <style dangerouslySetInnerHTML={{__html: `
            @media print {
                body { background-color: white !important; }
                .print-hidden { display: none !important; }
                .print-break-inside-avoid { page-break-inside: avoid; }
                .shadow-subtle { box-shadow: none !important; }
            }
        `}} />

        <div className="min-h-screen bg-[#FAFAFA] font-sans text-gray-900 py-10 md:py-20 px-4 flex justify-center">
            <div className="w-full max-w-[800px]">
                
                {/* BRAND HEADER */}
                <div className="flex flex-col items-center mb-10 md:mb-16">
                    {store.logo_url ? (
                        <div className="w-16 h-16 rounded-full overflow-hidden mb-4 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] border border-gray-100 print-hidden">
                            <Image src={getOptimizedUrl(store.logo_url)} alt={store.name} width={64} height={64} className="object-cover" />
                        </div>
                    ) : (
                        <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center mb-4 shadow-sm border border-gray-100 text-gray-400 print-hidden">
                            <Store size={24} />
                        </div>
                    )}
                    <h1 className="text-xl font-black tracking-tight">{store.name}</h1>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mt-1">Documento Comercial</p>
                </div>

                {/* MAIN INVOICE PAPER (CLEAN LOOK) */}
                <div className="bg-white rounded-[32px] p-8 md:p-14 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.03)] border border-gray-50 mb-8 print-break-inside-avoid">
                    
                    {/* ESTADO Y ACCIONES */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12 pb-8 border-b border-gray-100">
                        <div>
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest mb-4 ${isQuoteActive ? 'bg-gray-100 text-gray-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                {isQuoteActive ? <><FileText size={12} /> Presupuesto Pendiente</> : <><CheckCircle2 size={12} /> Procesado y Reportado</>}
                            </span>
                            <h2 className="text-4xl md:text-5xl font-black tracking-tighter text-gray-900 leading-none">#{order.order_number}</h2>
                            <p className="text-xs font-mono font-medium text-gray-400 mt-2">{new Date(order.created_at).toLocaleDateString('es-VE', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                        </div>

                        <div className="md:text-right flex flex-col justify-end">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Cliente</p>
                            <p className="text-lg font-bold text-gray-900 leading-tight">{order.customer_name}</p>
                            {order.customer_phone && <p className="text-xs font-mono text-gray-500 mt-0.5">{order.customer_phone}</p>}
                            
                            {/* 🚀 BOTÓN DESCARGAR PDF NATIVO */}
                            <button onClick={() => window.print()} className="print-hidden mt-4 inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-500 hover:text-black transition-colors self-start md:self-end">
                                <Download size={14} /> Descargar PDF
                            </button>
                        </div>
                    </div>

                    {/* ALERTA DE INVENTARIO */}
                    {stockIssues.length > 0 && isQuoteActive && (
                        <div className="bg-red-50 text-red-700 p-5 rounded-2xl mb-10 flex gap-4 items-start print-hidden">
                            <PackageX size={20} className="shrink-0 mt-0.5" strokeWidth={2.5} />
                            <div>
                                <p className="text-sm font-black tracking-tight mb-1">Inventario Insuficiente</p>
                                <p className="text-xs font-medium leading-relaxed opacity-90">
                                    Lo sentimos, el artículo <b>{stockIssues.join(', ')}</b> se agotó. Comunícate con la tienda.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* 🚀 LISTA DE ARTÍCULOS (Ahora sí se verán gracias al paso 1) */}
                    <div className="mb-12">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-6">Detalle de la Orden</p>
                        
                        <div className="space-y-4">
                            {items.length === 0 ? (
                                <p className="text-sm text-gray-400 italic">Cargando artículos...</p>
                            ) : (
                                items.map(item => (
                                    <div key={item.id} className="flex justify-between items-center group py-2 border-b border-gray-50 last:border-0">
                                        <div className="flex gap-4 items-center min-w-0">
                                            <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center shrink-0 border border-gray-100">
                                                <span className="text-xs font-black text-gray-900">{item.quantity}</span>
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-bold text-gray-900 truncate">{item.product_name}</p>
                                                {item.variant_info && <p className="text-[10px] text-gray-400 font-medium truncate mt-0.5">{item.variant_info}</p>}
                                            </div>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <p className="text-sm font-black text-gray-900 tabular-nums">${item.price_at_purchase.toFixed(2)}</p>
                                          {/* A esto: */}
<p className="text-[10px] font-mono text-gray-400">Bs {(item.price_at_purchase * activeRate).toLocaleString('es-VE', { maximumFractionDigits: 2 })}</p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                   {/* ZONA LOGÍSTICA (Oculta automáticamente si es retiro en mostrador) */}
                    {order.shipping_method !== 'pickup' && (
                        <div className="bg-gray-50 p-5 rounded-2xl mb-12 flex items-start gap-4 border border-gray-100 print-hidden">
                            <MapPin size={18} className="text-gray-400 shrink-0 mt-0.5" />
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Logística / Envío a:</p>
                                <p className="text-sm font-medium text-gray-700 leading-snug">{order.delivery_info}</p>
                            </div>
                        </div>
                    )}

                    {/* TOTALES GIGANTES CON BOTONES DE COPIAR */}
                    <div className="border-t border-gray-100 pt-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-8">
                        {isQuoteActive ? (
                            <div className="flex items-center gap-2 text-gray-400 max-w-[250px]">
                                <ShieldCheck size={18} className="shrink-0"/>
                                <span className="text-[10px] font-bold uppercase tracking-widest leading-relaxed">
                                    Precio en USD blindado. El monto en Bs se calcula a la tasa del día de pago.
                                </span>
                            </div>
                        ) : <div></div>}

                        <div className="flex flex-col items-start md:items-end w-full md:w-auto">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Total a Pagar</span>
                            
                            {/* Fila USD */}
                            <div className="flex items-center gap-3 group/usd cursor-pointer" onClick={() => handleCopy(Number(order.total_usd).toFixed(2), setCopiedUsd)}>
                                <span className="text-5xl md:text-6xl font-black tracking-tighter leading-none text-gray-900">
                                    ${Number(order.total_usd).toFixed(2)}
                                </span>
                                <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 group-hover/usd:bg-gray-100 group-hover/usd:text-black transition-colors print-hidden">
                                    {copiedUsd ? <Check size={14} className="text-emerald-500"/> : <Copy size={14}/>}
                                </div>
                            </div>
                            
                            {/* Fila Bs con Micro-Badge Dinámico */}
                            <div className="flex items-center gap-2 mt-3 group/bs cursor-pointer" onClick={() => handleCopy(totalBs.toFixed(2), setCopiedBs)}>
                                <span className="text-sm md:text-base font-mono font-bold text-gray-500 bg-gray-50 px-3 py-1.5 rounded-md border border-gray-100 flex items-center gap-2">
                                    Bs {totalBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    {/* 🚀 ETIQUETA DE TRANSPARENCIA PARA EL CLIENTE */}
                                    <span className="text-[9px] bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-sm uppercase tracking-widest border border-gray-300">
                                        Tasa {activeCurrency}
                                    </span>
                                </span>
                                <div className="w-7 h-7 rounded-full bg-transparent flex items-center justify-center text-gray-400 group-hover/bs:bg-gray-100 group-hover/bs:text-black transition-colors print-hidden">
                                    {copiedBs ? <Check size={12} className="text-emerald-500"/> : <Copy size={12}/>}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* MODAL DE PAGO INLINE (Se oculta al imprimir) */}
                {isQuoteActive && stockIssues.length === 0 && (
                    <div className="bg-white rounded-[32px] p-8 md:p-12 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.03)] border border-gray-50 print-hidden">
                        <h3 className="text-lg font-black tracking-tight mb-8">Completar Pago</h3>
                        
                       {/* BOTONES CON ICONOS */}
                        <div className="flex flex-wrap gap-3 mb-8">
                            {activePaymentMethods.map(pm => {
                                const config = getPaymentConfig(pm);
                                return (
                                    <button 
                                        key={pm} 
                                        onClick={() => setSelectedMethod(pm)}
                                        className={`flex items-center justify-center gap-2 px-5 py-3 rounded-full text-xs font-bold uppercase tracking-widest transition-all border ${selectedMethod === pm ? config.btnSelected : config.btnIdle}`}
                                    >
                                        <config.icon size={18} className={selectedMethod === pm ? 'text-white' : 'text-gray-500'} /> 
                                        {pm}
                                    </button>
                                )
                            })}
                        </div>

                        {selectedMethod && (
                            <div className="animate-in fade-in slide-in-from-top-4 space-y-8">
                                
                                {/* 🚀 LECTURA DIRECTA EXACTA COMO EL CHECKOUT */}
                                {store.payment_config[paymentKeysMap[selectedMethod]]?.details && (
                                    <div className="bg-[#FAFAFA] p-6 rounded-2xl border border-gray-100">
                                        <div className="flex justify-between items-center mb-4">
                                            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Datos para Transferir</span>
                                            <button 
                                                onClick={() => handleCopy(store.payment_config[paymentKeysMap[selectedMethod]]?.details || '', setCopiedData)} 
                                                className="text-[10px] font-bold uppercase tracking-widest text-gray-500 hover:text-black transition-colors flex items-center gap-1.5"
                                            >
                                                {copiedData ? <Check size={12} className="text-emerald-500"/> : <Copy size={12}/>} 
                                                {copiedData ? 'Copiado' : 'Copiar'}
                                            </button>
                                        </div>
                                        <p className="text-sm font-mono font-medium text-gray-600 leading-relaxed whitespace-pre-wrap">
                                            {store.payment_config[paymentKeysMap[selectedMethod]]?.details}
                                        </p>
                                    </div>
                                )}

                                <div className="grid md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2 block ml-1">Referencia (Opcional)</label>
                                        <input 
                                            type="text" 
                                            value={reference} 
                                            onChange={(e) => setReference(e.target.value)}
                                            className="w-full bg-white border border-gray-200 focus:border-black rounded-2xl px-5 py-4 text-sm font-bold outline-none transition-all"
                                            placeholder="Ej: 123456"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2 block ml-1">Comprobante *</label>
                                        <div className="relative w-full">
                                            <input type="file" accept="image/*" onChange={(e) => e.target.files && setReceiptFile(e.target.files[0])} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                                            <div className={`w-full flex items-center justify-center gap-2 px-5 py-4 rounded-2xl border transition-all text-sm font-bold ${receiptFile ? 'bg-black text-white border-black' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400 hover:text-gray-900'}`}>
                                                {receiptFile ? <><CheckCircle2 size={16} /> {receiptFile.name.substring(0, 15)}...</> : <><Upload size={16} /> Subir Capture</>}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <button 
                                    onClick={handleProcessPayment}
                                    disabled={submitting}
                                    className="w-full bg-black text-white py-4 md:py-5 rounded-full font-black uppercase tracking-widest text-sm hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {submitting ? <Loader2 className="animate-spin" size={18} /> : <><ArrowRight size={18} /> Procesar mi Pago</>}
                                </button>
                            </div>
                        )}
                    </div>
                )}
                
                <div className="mt-12 text-center opacity-40 hover:opacity-100 transition-opacity print-hidden">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-900 flex items-center justify-center gap-1.5">
                        Tecnología Financiera por <span className="font-black text-[12px] tracking-tight ml-0.5">PREZISO</span>
                    </p>
                </div>
            </div>
        </div>
        </>
    )
}