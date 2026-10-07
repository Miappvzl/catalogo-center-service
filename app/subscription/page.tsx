// app/subscription/page.tsx
'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { 
  Lock, Copy, Check, ShieldCheck, Loader2, ArrowLeft, ArrowRight, 
  Tag, CheckCircle2, ChevronLeft, Sparkles
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { getSupabase } from '@/lib/supabase-client'
import { PREZISO_BILLING } from '@/lib/config/billing'
import Link from 'next/link'

// ============================================================================
// ISOTIPO OFICIAL VECTORIAL DE WHATSAPP (OBSIDIAN EDITION)
// ============================================================================
function WhatsAppOfficialIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`${className} fill-current`} aria-hidden="true">
      <path 
        fillRule="evenodd" 
        clipRule="evenodd" 
        d="M12.004 2c-5.523 0-10 4.477-10 10 0 1.767.459 3.484 1.332 5.002l-1.417 5.178 5.305-1.392c1.47.801 3.125 1.222 4.78 1.222 5.522 0 10-4.477 10-10s-4.478-10-10-10zm0 18.232c-1.503 0-2.973-.397-4.26-1.149l-.305-.177-3.16.829.843-3.082-.194-.309c-.832-1.326-1.272-2.868-1.272-4.444 0-4.544 3.696-8.24 8.24-8.24 4.545 0 8.24 3.696 8.24 8.24 0 4.544-3.695 8.24-8.24 8.24z" 
      />
      <path 
        d="M15.423 14.416c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86s.274.072.376-.043c.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564.289.13.332.202c.043.072.043.419-.101.824z" 
      />
    </svg>
  );
}

// Curva Bézier de 120 FPS para transiciones fluidas de hardware
const STEP_TRANSITION = {
  duration: 0.28,
  ease: [0.16, 1, 0.3, 1] as const
}

function SubscriptionContent() {
    const supabase = getSupabase()
    const searchParams = useSearchParams()

    // 🚀 CONTROLADOR DE FLUJO EN 2 PASOS (PROGRESSIVE DISCLOSURE)
    const [step, setStep] = useState<1 | 2>(1)
    const [loading, setLoading] = useState(true)
    const [rate, setRate] = useState<number>(0)
    const [store, setStore] = useState<any>(null)
    const [copiedId, setCopiedId] = useState<string | null>(null)
    const [showSuccessModal, setShowSuccessModal] = useState(false)
    const [activePaymentTab, setActivePaymentTab] = useState<'pago_movil' | 'wallets'>('pago_movil')

    // Estado Financiero Pre-computado
    const [billingData, setBillingData] = useState({
        basePrice: PREZISO_BILLING.priceUSD,
        finalPrice: PREZISO_BILLING.priceUSD,
        hasDiscount: false,
        discountReason: ''
    })

    useEffect(() => {
        const initializeBilling = async () => {
            // 1. Obtener Tasa Oficial BCV
            const { data: configData } = await supabase
                .from('app_config')
                .select('usd_rate')
                .eq('id', 1)
                .single()
            if (configData?.usd_rate) setRate(configData.usd_rate)

            // 2. Precedencia Estricta: ?slug= manda sobre sesión
            const slugParam = searchParams.get('slug')
            const { data: { user } } = await supabase.auth.getUser()

            let storeQuery = supabase
                .from('stores')
                .select('id, name, user_id, subscription_status, trial_ends_at, subscription_ends_at, subscription_custom_price, subscription_custom_reason')

            if (slugParam) {
                storeQuery = storeQuery.eq('slug', slugParam)
            } else if (user) {
                storeQuery = storeQuery.eq('user_id', user.id)
            } else {
                setLoading(false)
                return
            }

            const { data: storeData } = await storeQuery.single()

            if (storeData) {
                setStore(storeData)

                // 3. Jerarquía Lógica de Precios
                if (storeData.subscription_custom_price !== null && storeData.subscription_custom_price !== undefined) {
                    const customPriceNum = Number(storeData.subscription_custom_price)
                    setBillingData({
                        basePrice: PREZISO_BILLING.priceUSD,
                        finalPrice: customPriceNum,
                        hasDiscount: customPriceNum < PREZISO_BILLING.priceUSD,
                        discountReason: storeData.subscription_custom_reason || 'Tarifa Preferencial'
                    })
                } else {
                    let partnerDiscountApplied = false

                    if (storeData.user_id) {
                        const { data: ref } = await supabase
                            .from('saas_referrals')
                            .select(`saas_affiliates(discount_pct)`)
                            .eq('referred_user_id', storeData.user_id)
                            .maybeSingle()

                        if (ref?.saas_affiliates) {
                            // @ts-ignore
                            const pct = Number(ref.saas_affiliates.discount_pct || 0)
                            if (pct > 0) {
                                setBillingData({
                                    basePrice: PREZISO_BILLING.priceUSD,
                                    finalPrice: Number((PREZISO_BILLING.priceUSD * (1 - pct / 100)).toFixed(2)),
                                    hasDiscount: true,
                                    discountReason: `Partner (${pct}%)`
                                })
                                partnerDiscountApplied = true
                            }
                        }
                    }

                    if (!partnerDiscountApplied) {
                        setBillingData({
                            basePrice: PREZISO_BILLING.priceUSD,
                            finalPrice: PREZISO_BILLING.priceUSD,
                            hasDiscount: false,
                            discountReason: ''
                        })
                    }
                }
            }
            setLoading(false)
        }

        initializeBilling()
    }, [supabase, searchParams])

    const amountBs = (billingData.finalPrice * rate).toLocaleString('es-VE', { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
    })

    const copyToClipboard = (text: string, id: string) => {
        navigator.clipboard.writeText(text)
        setCopiedId(id)
        setTimeout(() => setCopiedId(null), 2000)
    }

    // 🚀 MASTER COPY: Concatena los datos de Pago Móvil e incluye el Monto en Bs
    const handleCopyMasterPagoMovil = () => {
        const fullData = [
            `Banco: ${PREZISO_BILLING.pagoMovil.banco}`,
            `Teléfono: ${PREZISO_BILLING.pagoMovil.telefono}`,
            `Cédula: ${PREZISO_BILLING.pagoMovil.cedula}`,
            rate > 0 ? `Monto: Bs ${amountBs}` : `Monto USD: $${billingData.finalPrice.toFixed(2)}`
        ].join('\n')

        copyToClipboard(fullData, 'master_pm')
    }

    const handleReportPayment = () => {
        const message = PREZISO_BILLING.generateReportMessage(
            store?.name || 'Tienda', 
            store?.id || 'ID-Pendiente', 
            amountBs, 
            billingData.finalPrice
        )
        const url = `https://wa.me/${PREZISO_BILLING.whatsappContact}?text=${encodeURIComponent(message)}`
        
        setShowSuccessModal(true)
        setTimeout(() => {
            window.open(url, '_blank')
        }, 1200)
    }

    // 🚀 ESTADO REAL Y DINÁMICO DE LA LICENCIA
    const getStoreStatusBadge = () => {
        if (!store) return null

        const status = store.subscription_status
        const hasPaid = !!store.subscription_ends_at
        const targetDate = hasPaid ? store.subscription_ends_at : store.trial_ends_at
        const isPastDue = targetDate ? new Date(targetDate) < new Date() : false

        if (status === 'expired' || isPastDue) {
            return {
                label: 'Licencia Vencida',
                className: 'bg-rose-50 text-rose-700 border-rose-200/60'
            }
        }
        if (status === 'trial') {
            return {
                label: 'Fase de Prueba',
                className: 'bg-amber-50 text-amber-800 border-amber-200/60'
            }
        }
        return {
            label: 'Licencia Activa',
            className: 'bg-neutral-100 text-neutral-800 border-neutral-200/60'
        }
    }

    const currentStatus = getStoreStatusBadge()

    if (loading) {
        return (
            <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-3">
                <Loader2 className="animate-spin text-neutral-400" size={24} />
                <p className="text-[10px] font-mono uppercase tracking-widest text-neutral-400 font-bold">
                    Cargando orden de facturación...
                </p>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#FAFAFC] flex flex-col justify-center items-center p-4 sm:p-6 md:p-10 font-sans selection:bg-neutral-950 selection:text-white relative overflow-hidden">
            
          {/* 🚀 AURA POSTERIOR CALIBRADA: DESPEGA LA TARJETA DEL FONDO GRIS */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[520px] h-[520px] bg-gradient-to-b from-neutral-300/40 via-neutral-200/20 to-transparent rounded-full blur-3xl opacity-80 -z-10 pointer-events-none transform-gpu" />

            <div className="w-full max-w-[480px] flex flex-col gap-4 relative z-10">
                
                {/* BARRA SUPERIOR DE CONFIANZA */}
                <div className="flex items-center justify-between px-1">
                    {step === 2 ? (
                        <button 
                            onClick={() => setStep(1)}
                            className="text-xs font-bold text-neutral-500 hover:text-neutral-950 transition-colors flex items-center gap-1 active:scale-95"
                        >
                            <ChevronLeft size={16} /> <span>Volver al resumen</span>
                        </button>
                    ) : (
                        <Link 
                            href="/admin" 
                            className="text-xs font-bold text-neutral-500 hover:text-neutral-950 transition-colors flex items-center gap-1.5"
                        >
                            <ArrowLeft size={14} /> <span>Volver al panel</span>
                        </Link>
                    )}

                    <div className="flex items-center gap-1.5 text-neutral-400">
                        <Lock size={12} strokeWidth={2.2} />
                        <span className="text-[9px] font-mono font-bold uppercase tracking-widest">
                            Checkout Seguro B2B
                        </span>
                    </div>
                </div>

                {/* CONTENEDOR PRINCIPAL */}
                <div className="relative bg-white border border-neutral-200/90 rounded-2xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.02)] overflow-hidden">
                    <AnimatePresence mode="wait">
                        
                        {/* ========================================================= */}
                        {/* PASO 1: RESUMEN DE VALOR & PRECIO CENTRADO (CON GLOW)    */}
                        {/* ========================================================= */}
                        {step === 1 && (
                            <motion.div
                                key="step-1"
                                initial={{ opacity: 0, x: -16, scale: 0.98 }}
                                animate={{ opacity: 1, x: 0, scale: 1 }}
                                exit={{ opacity: 0, x: 16, scale: 0.98 }}
                                transition={STEP_TRANSITION}
                                className="relative p-6 sm:p-8 flex flex-col items-center text-center transform-gpu will-change-[transform,opacity] overflow-hidden"
                            >
                                {/* 🚀 FOCO ZENITAL INTERIOR: EXCLUSIVO DEL PASO 1 */}
                                <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-[440px] h-[220px] bg-[radial-gradient(ellipse_at_top,_rgba(0,0,0,0.11),transparent_70%)] blur-2xl transform-gpu z-0" />
                                <div className="pointer-events-none absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-neutral-950/25 to-transparent z-10" />
                                {/* Estado Dinámico Real */}
                                <div className="flex items-center gap-2 mb-4">
                                    {currentStatus && (
                                        <span className={`text-[9px] font-mono font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full border ${currentStatus.className}`}>
                                            {currentStatus.label}
                                        </span>
                                    )}
                                    <span className="text-[9px] font-mono font-bold uppercase tracking-widest bg-neutral-100 text-neutral-600 border border-neutral-200/60 px-2 py-0.5 rounded-full">
                                        Mensual
                                    </span>
                                </div>

                                {/* Identidad */}
                                <h1 className="text-xl sm:text-2xl font-black text-neutral-950 tracking-tight leading-tight">
                                    {store?.name || 'Tu Tienda'}
                                </h1>
                                <p className="text-xs text-neutral-400 font-medium mt-1">
                                    Membresía Oficial • {PREZISO_BILLING.planName}
                                </p>

                                {/* Descuento & Precio Cinematográfico */}
                                <div className="my-7 flex flex-col items-center">
                                    {billingData.hasDiscount && (
                                        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-neutral-950 text-white rounded-md text-[9px] font-mono font-bold uppercase tracking-wider shadow-2xs mb-2">
                                            <Tag size={10} />
                                            <span>{billingData.discountReason}</span>
                                        </div>
                                    )}

                                    {billingData.hasDiscount && (
                                        <span className="text-xs font-mono font-semibold text-neutral-400 line-through mb-1">
                                            ${billingData.basePrice.toFixed(2)} USD
                                        </span>
                                    )}

                                    <div className="flex items-baseline justify-center gap-2 text-neutral-950">
                                        <span className="text-6xl font-black font-mono tracking-tighter tabular-nums leading-none">
                                            ${billingData.finalPrice.toFixed(2)}
                                        </span>
                                        <span className="text-xs font-mono font-bold text-neutral-400 uppercase tracking-widest">
                                            USD/mes
                                        </span>
                                    </div>

                                    {/* Cápsula de Conversión Oficial BCV */}
                                    <div className="mt-4 px-3.5 py-1.5 rounded-full bg-neutral-50 border border-neutral-200/80 flex items-center gap-2 text-[11px] font-mono shadow-2xs">
                                        <span className="font-bold text-neutral-900 tabular-nums">
                                            Bs {amountBs}
                                        </span>
                                        {rate > 0 && (
                                            <>
                                                <span className="text-neutral-300">•</span>
                                                <span className="text-neutral-400 text-[10px]">
                                                    Tasa: {rate.toFixed(2)} Bs/$
                                                </span>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* Pilares de Infraestructura (Storytelling) */}
                                <div className="w-full py-5 border-t border-neutral-100 flex flex-col items-center gap-2.5">
                                    <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-neutral-400 mb-1">
                                        Beneficios de Infraestructura
                                    </span>
                                    {[
                                        'Sincronización continua de Tasa Oficial BCV',
                                        'Catálogo de alta conversión sin comisiones',
                                        'Directorio de Clientes CRM y Punto de Venta',
                                        'Recepción ilimitada de pedidos a WhatsApp'
                                    ].map((feature, idx) => (
                                        <div key={idx} className="flex items-center gap-2 text-[11px] text-neutral-600 font-medium leading-tight">
                                            <CheckCircle2 size={13} className="text-neutral-950 shrink-0" />
                                            <span>{feature}</span>
                                        </div>
                                    ))}
                                </div>

                                {/* Botón Maestro de Avance */}
                                <button
                                    type="button"
                                    onClick={() => setStep(2)}
                                    className="w-full mt-3 bg-neutral-950 hover:bg-neutral-900 text-white py-4 px-6 rounded-xl font-bold text-xs uppercase tracking-[0.12em] transition-all flex items-center justify-center gap-2 active:scale-[0.98] shadow-xs"
                                >
                                    <span>Proceder al Pago</span>
                                    <ArrowRight size={15} />
                                </button>
                            </motion.div>
                        )}

                        {/* ========================================================= */}
                        {/* PASO 2: CANALES DE PAGO LIMPIOS & REPORTE WHATSAPP        */}
                        {/* ========================================================= */}
                        {step === 2 && (
                            <motion.div
                                key="step-2"
                                initial={{ opacity: 0, x: 16, scale: 0.98 }}
                                animate={{ opacity: 1, x: 0, scale: 1 }}
                                exit={{ opacity: 0, x: -16, scale: 0.98 }}
                                transition={STEP_TRANSITION}
                                className="p-6 sm:p-8 flex flex-col transform-gpu will-change-[transform,opacity]"
                            >
                                {/* Micro-Resumen de Monto a Pagar */}
                                <div className="flex items-center justify-between p-3.5 rounded-xl bg-neutral-50/70 border border-neutral-200/80 mb-5">
                                    <div className="flex flex-col">
                                        <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-neutral-400">
                                            Total Liquidación
                                        </span>
                                        <div className="flex items-baseline gap-2 mt-0.5">
                                            <span className="text-base font-black font-mono text-neutral-950 tabular-nums">
                                                ${billingData.finalPrice.toFixed(2)} USD
                                            </span>
                                            <span className="text-xs font-mono font-bold text-neutral-500 tabular-nums">
                                                (Bs {amountBs})
                                            </span>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => copyToClipboard(amountBs, 'resumen_bs')}
                                        className="text-neutral-400 hover:text-neutral-950 transition-colors p-1.5 rounded-md hover:bg-neutral-100"
                                        title="Copiar monto en Bs"
                                    >
                                        {copiedId === 'resumen_bs' ? <Check size={14} className="text-emerald-700" /> : <Copy size={14} />}
                                    </button>
                                </div>

                                {/* Selector de Canales */}
                                <div className="flex items-center justify-between border-b border-neutral-100 pb-3 mb-5">
                                    <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-neutral-400">
                                        Canal Receptor
                                    </span>
                                    <div className="flex gap-1 bg-neutral-100 p-0.5 rounded-lg border border-neutral-200/60">
                                        <button
                                            type="button"
                                            onClick={() => setActivePaymentTab('pago_movil')}
                                            className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all ${
                                                activePaymentTab === 'pago_movil' 
                                                    ? 'bg-white text-neutral-950 shadow-xs' 
                                                    : 'text-neutral-500 hover:text-neutral-900'
                                            }`}
                                        >
                                            Nacional (Bs)
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setActivePaymentTab('wallets')}
                                            className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all ${
                                                activePaymentTab === 'wallets' 
                                                    ? 'bg-white text-neutral-950 shadow-xs' 
                                                    : 'text-neutral-500 hover:text-neutral-900'
                                            }`}
                                        >
                                            Digital (USD)
                                        </button>
                                    </div>
                                </div>

                                {/* CANAL 1: PAGO MÓVIL CON BOTÓN MASTER COPY */}
                                {activePaymentTab === 'pago_movil' && (
                                    <div className="space-y-4 animate-in fade-in duration-200">
                                        <div className="p-4 rounded-xl border border-neutral-200/80 bg-neutral-50/40 space-y-3.5">
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-neutral-200/60">
                                                <div>
                                                    <h3 className="font-bold text-xs text-neutral-950">
                                                        Pago Móvil Interbancario
                                                    </h3>
                                                    <p className="text-[10px] text-neutral-400 font-medium">
                                                        Compatible con auto-llenado bancario
                                                    </p>
                                                </div>

                                                <button
                                                    type="button"
                                                    onClick={handleCopyMasterPagoMovil}
                                                    className="px-3 py-1.5 rounded-lg bg-neutral-950 hover:bg-neutral-800 text-white font-bold text-[10px] uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 active:scale-95 shadow-2xs shrink-0"
                                                >
                                                    {copiedId === 'master_pm' ? (
                                                        <>
                                                            <Check size={12} className="text-emerald-400" />
                                                            <span>Datos y Monto Copiados</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Copy size={12} />
                                                            <span>Copiar Datos con Monto</span>
                                                        </>
                                                    )}
                                                </button>
                                            </div>

                                            {/* Filas de Copiado Táctil */}
                                            <div className="space-y-2">
                                                <TactileDataRow 
                                                    label="Banco Receptor" 
                                                    value={PREZISO_BILLING.pagoMovil.banco} 
                                                    onCopy={() => copyToClipboard(PREZISO_BILLING.pagoMovil.banco, 'pm_banco')}
                                                    isCopied={copiedId === 'pm_banco'}
                                                />
                                                <TactileDataRow 
                                                    label="Teléfono Móvil" 
                                                    value={PREZISO_BILLING.pagoMovil.telefono} 
                                                    onCopy={() => copyToClipboard(PREZISO_BILLING.pagoMovil.telefono.replace(/\D/g, ''), 'pm_tlf')}
                                                    isCopied={copiedId === 'pm_tlf'}
                                                />
                                                <TactileDataRow 
                                                    label="Documento / RIF" 
                                                    value={PREZISO_BILLING.pagoMovil.cedula} 
                                                    onCopy={() => copyToClipboard(PREZISO_BILLING.pagoMovil.cedula, 'pm_ci')}
                                                    isCopied={copiedId === 'pm_ci'}
                                                />
                                                <TactileDataRow 
                                                    label="Monto Exacto" 
                                                    value={`Bs ${amountBs}`} 
                                                    onCopy={() => copyToClipboard(amountBs, 'pm_monto_row')}
                                                    isCopied={copiedId === 'pm_monto_row'}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* CANAL 2: BILLETERAS DIGITALES */}
                                {activePaymentTab === 'wallets' && (
                                    <div className="space-y-3 animate-in fade-in duration-200">
                                        <div className="p-4 rounded-xl border border-neutral-200/80 bg-neutral-50/40 space-y-3">
                                            <h3 className="font-bold text-xs text-neutral-950 pb-2 border-b border-neutral-200/60">
                                                Billeteras Globales USD
                                            </h3>
                                            <div className="space-y-2">
                                                <TactileDataRow 
                                                    label="Binance Pay ID" 
                                                    value={PREZISO_BILLING.wallets.binanceId} 
                                                    onCopy={() => copyToClipboard(PREZISO_BILLING.wallets.binanceId, 'w_binance')}
                                                    isCopied={copiedId === 'w_binance'}
                                                />
                                                <TactileDataRow 
                                                    label="Zinli / Email" 
                                                    value={PREZISO_BILLING.wallets.zinliEmail} 
                                                    onCopy={() => copyToClipboard(PREZISO_BILLING.wallets.zinliEmail, 'w_zinli')}
                                                    isCopied={copiedId === 'w_zinli'}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* ACCIÓN FINAL: REPORTAR A WHATSAPP */}
                                <div className="pt-6 mt-6 border-t border-neutral-100 space-y-2.5">
                                    <button
                                        type="button"
                                        onClick={handleReportPayment}
                                        className="w-full bg-neutral-950 hover:bg-neutral-900 text-white py-4 px-6 rounded-xl font-bold text-xs uppercase tracking-[0.12em] transition-all flex items-center justify-between active:scale-[0.98] shadow-xs"
                                    >
                                        <span className="flex items-center gap-2.5">
                                            <WhatsAppOfficialIcon className="w-4 h-4 fill-white" />
                                            <span>Reportar Pago de Licencia</span>
                                        </span>
                                        <ArrowRight size={15} />
                                    </button>

                                    <p className="text-[10px] text-center font-mono text-neutral-400">
                                        Activación inmediata tras verificar comprobante
                                    </p>
                                </div>
                            </motion.div>
                        )}

                    </AnimatePresence>
                </div>

            </div>

            {/* MODAL DE TRANSFERENCIA MINIMALISTA */}
            <AnimatePresence>
                {showSuccessModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0 }} 
                            animate={{ opacity: 1 }} 
                            exit={{ opacity: 0 }} 
                            className="absolute inset-0 bg-neutral-950/20 backdrop-blur-sm" 
                        />
                        <motion.div 
                            initial={{ scale: 0.96, opacity: 0, y: 10 }} 
                            animate={{ scale: 1, opacity: 1, y: 0 }} 
                            exit={{ scale: 0.96, opacity: 0, y: 10 }}
                            className="relative bg-white border border-neutral-200/80 p-8 rounded-2xl shadow-xl max-w-sm text-center z-10 space-y-4"
                        >
                            <div className="w-12 h-12 bg-neutral-100 text-neutral-950 rounded-full flex items-center justify-center mx-auto shadow-2xs">
                                <ShieldCheck size={24} strokeWidth={2} />
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-base font-bold text-neutral-950 tracking-tight">
                                    Transfiriendo a WhatsApp
                                </h3>
                                <p className="text-xs text-neutral-500 font-medium leading-relaxed">
                                    Se abrirá la conversación oficial de soporte con tu orden de pago y comprobante listos.
                                </p>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

        </div>
    )
}

// 🚀 FILA DE DATOS TÁCTIL (COUTURIST ROW)
function TactileDataRow({ 
    label, 
    value, 
    onCopy, 
    isCopied 
}: { 
    label: string, 
    value: string, 
    onCopy: () => void, 
    isCopied: boolean 
}) {
    return (
        <div className="flex items-center justify-between p-2.5 rounded-lg bg-white border border-neutral-200/60 hover:border-neutral-300 transition-colors">
            <span className="text-[11px] font-mono uppercase tracking-wider text-neutral-400 font-semibold">
                {label}
            </span>
            <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-xs text-neutral-950 tabular-nums">
                    {value}
                </span>
                <button
                    type="button"
                    onClick={onCopy}
                    className="p-1 rounded text-neutral-400 hover:text-neutral-950 transition-colors active:scale-90"
                    title={`Copiar ${label}`}
                >
                    {isCopied ? (
                        <Check size={13} className="text-emerald-700" />
                    ) : (
                        <Copy size={13} />
                    )}
                </button>
            </div>
        </div>
    )
}

export default function SubscriptionPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-white flex items-center justify-center">
                <Loader2 className="animate-spin text-neutral-400" size={24} />
            </div>
        }>
            <SubscriptionContent />
        </Suspense>
    )
}