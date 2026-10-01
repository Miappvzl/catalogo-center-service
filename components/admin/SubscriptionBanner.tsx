'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { 
  Clock, ArrowRight, X, Lock, Copy, Check, ShieldCheck, 
  Loader2, Tag, CheckCircle2, ChevronLeft 
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { getSupabase } from '@/lib/supabase-client'
import { PREZISO_BILLING } from '@/lib/config/billing'

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

const STEP_TRANSITION = {
  duration: 0.28,
  ease: [0.16, 1, 0.3, 1] as const
}

interface SubscriptionBannerProps {
  store: {
    id: string
    name: string
    subscription_status: string
    trial_ends_at?: string
    subscription_ends_at?: string 
    subscription_custom_price?: number | null
    subscription_custom_reason?: string | null
  }
}

export default function SubscriptionBanner({ store }: SubscriptionBannerProps) {
  const [mounted, setMounted] = useState(false)
  const [daysLeft, setDaysLeft] = useState<number | null>(null)
  const [bannerType, setBannerType] = useState<'hidden' | 'trial' | 'trial_expired' | 'active_expiring' | 'active_expired'>('hidden')
  
  // 🚀 CONTROLADOR DE FLUJO EN 2 PASOS (PROGRESSIVE DISCLOSURE)
  const [showModal, setShowModal] = useState(false)
  const [step, setStep] = useState<1 | 2>(1)
  
  const [rate, setRate] = useState<number>(0)
  const [billingData, setBillingData] = useState({
      basePrice: PREZISO_BILLING.priceUSD,
      finalPrice: PREZISO_BILLING.priceUSD,
      hasDiscount: false,
      discountReason: ''
  })
  
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [activePaymentTab, setActivePaymentTab] = useState<'pago_movil' | 'wallets'>('pago_movil')
  
  const supabase = getSupabase()

  useEffect(() => {
    setMounted(true)
  }, [])

  // 1. Evaluación de Fechas y Estado del Banner
  useEffect(() => {
    if (!store) return

    const status = store.subscription_status
    const hasPaidBefore = !!store.subscription_ends_at 
    const targetDateString = hasPaidBefore ? store.subscription_ends_at : store.trial_ends_at
    
    if (!targetDateString) return

    const endsAt = new Date(targetDateString)
    const today = new Date()
    
    endsAt.setHours(0, 0, 0, 0)
    today.setHours(0, 0, 0, 0)
    
    const diffTime = endsAt.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    setDaysLeft(diffDays)

    if (hasPaidBefore) {
      if (diffDays < 0 || status === 'expired') setBannerType('active_expired')
      else if (diffDays <= 5) setBannerType('active_expiring')
      else setBannerType('hidden') 
    } else {
      if (diffDays < 0) setBannerType('trial_expired')
      else setBannerType('trial')
    }
  }, [store])

  // 2. Carga de Motor Lógico de Precios al Abrir el Modal
  useEffect(() => {
    if (!showModal) return
    setStep(1) // Reseteamos al paso 1 al abrir

    const fetchBillingData = async () => {
      const { data: configData } = await supabase.from('app_config').select('usd_rate').eq('id', 1).single()
      if (configData?.usd_rate) setRate(configData.usd_rate)

      // 🚀 Evaluar Precio Personalizado vs Referido
      if (store.subscription_custom_price !== null && store.subscription_custom_price !== undefined) {
          const customPriceNum = Number(store.subscription_custom_price)
          setBillingData({
              basePrice: PREZISO_BILLING.priceUSD,
              finalPrice: customPriceNum,
              hasDiscount: customPriceNum < PREZISO_BILLING.priceUSD,
              discountReason: store.subscription_custom_reason || 'Tarifa Preferencial'
          })
      } else {
          const hasPaidBefore = !!store.subscription_ends_at
          if (!hasPaidBefore) {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
              const { data: ref } = await supabase.from('saas_referrals').select(`saas_affiliates(discount_pct)`).eq('referred_user_id', user.id).maybeSingle()
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
                }
              }
            }
          }
      }
    }
    fetchBillingData()
  }, [showModal, supabase, store])

  if (bannerType === 'hidden' || daysLeft === null) return null

  // --- TEXTOS FORMALES SIN EMOJIS ---
  let isCritical = false
  let message = ''

  switch (bannerType) {
    case 'trial':
      isCritical = daysLeft <= 3
      message = isCritical 
        ? `Suscripción requerida en ${daysLeft} día${daysLeft === 1 ? '' : 's'}.` 
        : `Fase de prueba: ${daysLeft} días restantes.`
      break
    case 'trial_expired':
      isCritical = true
      message = `Período de prueba expirado. Active su plan comercial.`
      break
    case 'active_expiring':
      isCritical = daysLeft <= 2 
      message = `Su licencia vence en ${daysLeft} día${daysLeft === 1 ? '' : 's'}.`
      break
    case 'active_expired':
      isCritical = true
      message = `Licencia expirada. Acceso restringido a solo lectura.`
      break
  }

  const bannerBg = isCritical ? 'bg-neutral-950 text-white' : 'bg-neutral-100 border-b border-neutral-200 text-neutral-900'
  const buttonClass = isCritical 
    ? 'bg-white text-neutral-950 hover:bg-neutral-200' 
    : 'bg-neutral-950 text-white hover:bg-neutral-800'

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
    const reportMessage = PREZISO_BILLING.generateReportMessage(
      store.name || 'Tienda', 
      store.id || 'ID-Pendiente', 
      amountBs, 
      billingData.finalPrice
    )
    const url = `https://wa.me/${PREZISO_BILLING.whatsappContact}?text=${encodeURIComponent(reportMessage)}`
    
    setShowSuccessModal(true)
    setTimeout(() => {
      window.open(url, '_blank')
      setShowSuccessModal(false)
      setShowModal(false)
    }, 1200)
  }

  // 🚀 ESTADO REAL Y DINÁMICO DE LA TIENDA
  const getStatusBadge = () => {
    if (bannerType === 'active_expired' || bannerType === 'trial_expired') {
      return { label: 'Licencia Vencida', className: 'bg-rose-50 text-rose-700 border-rose-200/60' }
    }
    if (bannerType === 'trial') {
      return { label: 'Fase de Prueba', className: 'bg-amber-50 text-amber-800 border-amber-200/60' }
    }
    return { label: 'Licencia Activa', className: 'bg-neutral-100 text-neutral-800 border-neutral-200/60' }
  }

  const currentBadge = getStatusBadge()

  return (
    <>
     {/* BANNER SUPERIOR IN-APP (BLINDADO CON CONTENCIÓN ESTRICTA) */}
      <div className={`${bannerBg} w-full max-w-full overflow-hidden px-3.5 sm:px-4 py-2.5 sm:py-2 flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-4 text-xs font-medium transition-colors min-w-0`}>
        
        {/* MENSAJE: min-w-0 + max-w-full + break-words para que fluya en móvil sin estirar la pantalla */}
        <div className="flex items-center justify-center sm:justify-start gap-2 min-w-0 max-w-full text-center sm:text-left">
          <Clock size={14} className={`${isCritical ? 'text-neutral-400' : 'text-neutral-500'} shrink-0`} />
          <p className="font-semibold tracking-tight text-xs leading-snug break-words">
            {message}
          </p>
        </div>
      
        {/* BOTÓN DE ACCIÓN: shrink-0 y whitespace-nowrap para que nunca se deforme ni empuje fuera de pantalla */}
        <div 
          role="button"
          tabIndex={0}
          onClick={() => setShowModal(true)}
          className={`flex items-center justify-center cursor-pointer gap-1.5 px-3.5 py-1.5 rounded-md font-bold text-[10px] sm:text-[11px] uppercase tracking-wider transition-all active:scale-95 shrink-0 whitespace-nowrap ${buttonClass}`}
        >
          <span>{bannerType.includes('active') ? 'Renovar Licencia' : 'Activar Membresía'}</span>
          <ArrowRight size={12} className="shrink-0" />
        </div>
      </div>

      {/* PORTAL AL BODY (MODAL DE 2 PASOS CON GLOW ZENITAL) */}
      {mounted && createPortal(
        <>
          <AnimatePresence>
            {showModal && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 font-sans selection:bg-neutral-950 selection:text-white">
                <motion.div 
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }} 
                  exit={{ opacity: 0 }}
                  onClick={() => setShowModal(false)}
                  className="absolute inset-0 bg-neutral-950/40 backdrop-blur-sm"
                />
                
        <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.98 }} 
                  animate={{ opacity: 1, y: 0, scale: 1 }} 
                  exit={{ opacity: 0, y: 10, scale: 0.98 }}
                  className="relative w-full max-w-[440px] bg-white rounded-2xl flex flex-col shadow-[0_20px_50px_rgba(0,0,0,0.15)] z-10 border border-neutral-200/80 overflow-hidden"
                >
                  {/* Barra de Navegación del Modal */}
                  <div className="p-4 px-6 flex justify-between items-center border-b border-neutral-100 bg-neutral-50/50 relative z-10">
                    {step === 2 ? (
                      <button 
                        onClick={() => setStep(1)}
                        className="text-xs font-bold text-neutral-500 hover:text-neutral-950 transition-colors flex items-center gap-1 active:scale-95"
                      >
                        <ChevronLeft size={16} /> <span>Volver</span>
                      </button>
                    ) : (
                      <div className="flex items-center gap-1.5 text-neutral-400">
                        <Lock size={12} strokeWidth={2.2} />
                        <span className="text-[9px] font-mono font-bold uppercase tracking-widest">
                          Checkout B2B
                        </span>
                      </div>
                    )}

                    <div 
                      role="button"
                      onClick={() => setShowModal(false)} 
                      className="p-1 text-neutral-400 hover:text-neutral-900 rounded-md transition-colors cursor-pointer"
                    >
                      <X size={15} />
                    </div>
                  </div>

                  {/* CONTENIDO INTERACTIVO FLUIDO (120 FPS) */}
                  <div className="p-6 relative z-10">
                    <AnimatePresence mode="wait">
                      
                  {/* ========================================================= */}
                      {/* PASO 1: RESUMEN CENTRADO DE INFRAESTRUCTURA (CON GLOW)    */}
                      {/* ========================================================= */}
                      {step === 1 && (
                        <motion.div
                          key="banner-step-1"
                          initial={{ opacity: 0, x: -16, scale: 0.98 }}
                          animate={{ opacity: 1, x: 0, scale: 1 }}
                          exit={{ opacity: 0, x: 16, scale: 0.98 }}
                          transition={STEP_TRANSITION}
                          className="relative flex flex-col items-center text-center transform-gpu will-change-[transform,opacity] overflow-hidden -m-6 p-6"
                        >
                          {/* 🚀 FOCO ZENITAL INTERIOR CALIBRADO (SOLO EN PASO 1) */}
                          <div className="pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2 w-[420px] h-[200px] bg-[radial-gradient(ellipse_at_top,_rgba(0,0,0,0.11),transparent_70%)] blur-2xl transform-gpu z-0" />
                          <div className="pointer-events-none absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-neutral-950/25 to-transparent z-10" />
                          {/* Estado Dinámico */}
                          <div className="flex items-center gap-2 mb-3">
                            <span className={`text-[9px] font-mono font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full border ${currentBadge.className}`}>
                              {currentBadge.label}
                            </span>
                            <span className="text-[9px] font-mono font-bold uppercase tracking-widest bg-neutral-100 text-neutral-600 border border-neutral-200/60 px-2 py-0.5 rounded-full">
                              Mensual
                            </span>
                          </div>

                          <h2 className="text-xl font-black text-neutral-950 tracking-tight leading-tight">
                            {store?.name || 'Tu Tienda'}
                          </h2>
                          <p className="text-xs text-neutral-400 font-medium mt-0.5">
                            {PREZISO_BILLING.planName}
                          </p>

                          {/* Precio Centrado */}
                          <div className="my-6 flex flex-col items-center">
                            {billingData.hasDiscount && (
                              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-neutral-950 text-white rounded-md text-[9px] font-mono font-bold uppercase tracking-wider shadow-2xs mb-2">
                                <Tag size={10} />
                                <span>{billingData.discountReason}</span>
                              </div>
                            )}

                            {billingData.hasDiscount && (
                              <span className="text-xs font-mono font-semibold text-neutral-400 line-through mb-1">
                                ${billingData.basePrice.toFixed(2)} USD
                              </span>
                            )}

                            <div className="flex items-baseline justify-center gap-1.5 text-neutral-950">
                              <span className="text-5xl font-black font-mono tracking-tighter tabular-nums leading-none">
                                ${billingData.finalPrice.toFixed(2)}
                              </span>
                              <span className="text-xs font-mono font-bold text-neutral-400 uppercase tracking-widest">
                                USD/mes
                              </span>
                            </div>

                            {/* Conversión Oficial BCV */}
                            <div className="mt-3.5 px-3 py-1 rounded-full bg-neutral-50 border border-neutral-200/80 flex items-center gap-2 text-[10px] font-mono shadow-2xs">
                              <span className="font-bold text-neutral-900 tabular-nums">
                                Bs {amountBs}
                              </span>
                              {rate > 0 && (
                                <>
                                  <span className="text-neutral-300">•</span>
                                  <span className="text-neutral-400 text-[9px]">
                                    Tasa: {rate.toFixed(2)}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Storytelling de Infraestructura */}
                          <div className="w-full py-4 border-t border-neutral-100 flex flex-col items-center gap-2">
                            {[
                              'Sincronización continua de Tasa Oficial BCV',
                              'Catálogo sin comisiones por venta',
                              'CRM Omnicanal y Punto de Venta (POS)',
                              'Pedidos ilimitados a WhatsApp'
                            ].map((feature, idx) => (
                              <div key={idx} className="flex items-center gap-2 text-[11px] text-neutral-600 font-medium leading-tight">
                                <CheckCircle2 size={12} className="text-neutral-950 shrink-0" />
                                <span>{feature}</span>
                              </div>
                            ))}
                          </div>

                          <button
                            type="button"
                            onClick={() => setStep(2)}
                            className="w-full mt-3 bg-neutral-950 hover:bg-neutral-900 text-white py-3.5 px-6 rounded-xl font-bold text-xs uppercase tracking-[0.12em] transition-all flex items-center justify-center gap-2 active:scale-[0.98] shadow-xs"
                          >
                            <span>Proceder al Pago</span>
                            <ArrowRight size={14} />
                          </button>
                        </motion.div>
                      )}

                      {/* ========================================================= */}
                      {/* PASO 2: CANALES DE TRANSFERENCIA & REPORTE                */}
                      {/* ========================================================= */}
                      {step === 2 && (
                        <motion.div
                          key="banner-step-2"
                          initial={{ opacity: 0, x: 16, scale: 0.98 }}
                          animate={{ opacity: 1, x: 0, scale: 1 }}
                          exit={{ opacity: 0, x: -16, scale: 0.98 }}
                          transition={STEP_TRANSITION}
                          className="flex flex-col transform-gpu will-change-[transform,opacity]"
                        >
                          {/* Resumen Superior */}
                          <div className="flex items-center justify-between p-3 rounded-xl bg-neutral-50 border border-neutral-200/80 mb-4">
                            <div className="flex flex-col">
                              <span className="text-[8px] font-mono font-bold uppercase tracking-widest text-neutral-400">
                                Total a Pagar
                              </span>
                              <div className="flex items-baseline gap-1.5 mt-0.5">
                                <span className="text-sm font-black font-mono text-neutral-950 tabular-nums">
                                  ${billingData.finalPrice.toFixed(2)} USD
                                </span>
                                <span className="text-[11px] font-mono font-bold text-neutral-500 tabular-nums">
                                  (Bs {amountBs})
                                </span>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(amountBs, 'banner_bs')}
                              className="text-neutral-400 hover:text-neutral-950 transition-colors p-1"
                              title="Copiar monto en Bs"
                            >
                              {copiedId === 'banner_bs' ? <Check size={13} className="text-emerald-700" /> : <Copy size={13} />}
                            </button>
                          </div>

                          {/* Selector de Canales */}
                          <div className="flex items-center justify-between border-b border-neutral-100 pb-2.5 mb-4">
                            <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-neutral-400">
                              Canal Receptor
                            </span>
                            <div className="flex gap-1 bg-neutral-100 p-0.5 rounded-lg border border-neutral-200/60">
                              <button
                                type="button"
                                onClick={() => setActivePaymentTab('pago_movil')}
                                className={`px-2.5 py-1 rounded-md text-[9px] font-bold uppercase tracking-wider transition-all ${
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
                                className={`px-2.5 py-1 rounded-md text-[9px] font-bold uppercase tracking-wider transition-all ${
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
                            <div className="space-y-3 animate-in fade-in duration-150">
                              <div className="p-3.5 rounded-xl border border-neutral-200/80 bg-neutral-50/40 space-y-3">
                                <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-neutral-200/60">
                                  <h3 className="font-bold text-[11px] text-neutral-950">
                                    Pago Móvil (VE)
                                  </h3>

                                  {/* BOTÓN MASTER COPY: DATOS + MONTO EN 1 CLIC */}
                                  <button
                                    type="button"
                                    onClick={handleCopyMasterPagoMovil}
                                    className="px-2.5 py-1 rounded-md bg-neutral-950 hover:bg-neutral-800 text-white font-bold text-[9px] uppercase tracking-wider transition-all flex items-center gap-1 active:scale-95 shadow-2xs"
                                  >
                                    {copiedId === 'master_pm' ? (
                                      <>
                                        <Check size={11} className="text-emerald-400" />
                                        <span>Copiado</span>
                                      </>
                                    ) : (
                                      <>
                                        <Copy size={11} />
                                        <span>Copiar con Monto</span>
                                      </>
                                    )}
                                  </button>
                                </div>

                                <div className="space-y-1.5">
                                  <BannerDataRow 
                                    label="Banco" 
                                    value={PREZISO_BILLING.pagoMovil.banco} 
                                    onCopy={() => copyToClipboard(PREZISO_BILLING.pagoMovil.banco, 'b_pm_banco')}
                                    isCopied={copiedId === 'b_pm_banco'}
                                  />
                                  <BannerDataRow 
                                    label="Teléfono" 
                                    value={PREZISO_BILLING.pagoMovil.telefono} 
                                    onCopy={() => copyToClipboard(PREZISO_BILLING.pagoMovil.telefono.replace(/\D/g, ''), 'b_pm_tlf')}
                                    isCopied={copiedId === 'b_pm_tlf'}
                                  />
                                  <BannerDataRow 
                                    label="Cédula/RIF" 
                                    value={PREZISO_BILLING.pagoMovil.cedula} 
                                    onCopy={() => copyToClipboard(PREZISO_BILLING.pagoMovil.cedula, 'b_pm_ci')}
                                    isCopied={copiedId === 'b_pm_ci'}
                                  />
                                  <BannerDataRow 
                                    label="Monto Exacto" 
                                    value={`Bs ${amountBs}`} 
                                    onCopy={() => copyToClipboard(amountBs, 'b_pm_monto')}
                                    isCopied={copiedId === 'b_pm_monto'}
                                  />
                                </div>
                              </div>
                            </div>
                          )}

                          {/* CANAL 2: BILLETERAS DIGITALES */}
                          {activePaymentTab === 'wallets' && (
                            <div className="space-y-2.5 animate-in fade-in duration-150">
                              <div className="p-3.5 rounded-xl border border-neutral-200/80 bg-neutral-50/40 space-y-2.5">
                                <h3 className="font-bold text-[11px] text-neutral-950 pb-2 border-b border-neutral-200/60">
                                  Billeteras Globales USD
                                </h3>
                                <div className="space-y-1.5">
                                  <BannerDataRow 
                                    label="Binance Pay ID" 
                                    value={PREZISO_BILLING.wallets.binanceId} 
                                    onCopy={() => copyToClipboard(PREZISO_BILLING.wallets.binanceId, 'b_w_binance')}
                                    isCopied={copiedId === 'b_w_binance'}
                                  />
                                  <BannerDataRow 
                                    label="Zinli / Email" 
                                    value={PREZISO_BILLING.wallets.zinliEmail} 
                                    onCopy={() => copyToClipboard(PREZISO_BILLING.wallets.zinliEmail, 'b_w_zinli')}
                                    isCopied={copiedId === 'b_w_zinli'}
                                  />
                                </div>
                              </div>
                            </div>
                          )}

                          {/* ACCIÓN PRINCIPAL: WHATSAPP */}
                          <div className="pt-5 mt-5 border-t border-neutral-100 space-y-2">
                            <button
                              type="button"
                              onClick={handleReportPayment}
                              className="w-full bg-neutral-950 hover:bg-neutral-900 text-white py-3.5 px-4 rounded-xl font-bold text-xs uppercase tracking-[0.12em] transition-all flex items-center justify-between active:scale-[0.98] shadow-xs"
                            >
                              <span className="flex items-center gap-2">
                                <WhatsAppOfficialIcon className="w-3.5 h-3.5 fill-white" />
                                <span>Reportar Pago</span>
                              </span>
                              <ArrowRight size={14} />
                            </button>
                            <p className="text-[9px] text-center font-mono text-neutral-400">
                              Activación inmediata tras verificar comprobante
                            </p>
                          </div>
                        </motion.div>
                      )}

                    </AnimatePresence>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* MODAL DE TRANSFERENCIA MINIMALISTA */}
          <AnimatePresence>
            {showSuccessModal && (
              <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 font-sans">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-neutral-950/20 backdrop-blur-sm" />
                <motion.div 
                  initial={{ scale: 0.96, opacity: 0, y: 10 }} 
                  animate={{ scale: 1, opacity: 1, y: 0 }} 
                  exit={{ scale: 0.96, opacity: 0, y: 10 }}
                  className="relative bg-white border border-neutral-200/80 p-7 rounded-2xl shadow-xl max-w-sm text-center z-10 space-y-3"
                >
                  <div className="w-10 h-10 bg-neutral-100 text-neutral-950 rounded-full flex items-center justify-center mx-auto shadow-2xs">
                    <ShieldCheck size={20} strokeWidth={2} />
                  </div>
                  <h3 className="text-sm font-bold text-neutral-950 tracking-tight leading-none">Transfiriendo a WhatsApp</h3>
                  <p className="text-xs text-neutral-500 font-medium">Abriendo chat de soporte para verificar comprobante...</p>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </>,
        document.body
      )}
    </>
  )
}

function BannerDataRow({ 
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
    <div className="flex items-center justify-between p-2 rounded-lg bg-white border border-neutral-200/60 hover:border-neutral-300 transition-colors">
      <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 font-semibold">
        {label}
      </span>
      <div className="flex items-center gap-2">
        <span className="font-mono font-bold text-xs text-neutral-950 tabular-nums">
          {value}
        </span>
        <button
          type="button"
          onClick={onCopy}
          className="p-1 text-neutral-400 hover:text-neutral-950 transition-colors active:scale-90"
          title={`Copiar ${label}`}
        >
          {isCopied ? <Check size={12} className="text-emerald-700" /> : <Copy size={12} />}
        </button>
      </div>
    </div>
  )
}