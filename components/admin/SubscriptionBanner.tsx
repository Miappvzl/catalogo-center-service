'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom' // 1. Import de createPortal
import { 
  Clock, Zap, ArrowRight, X, Wallet, ShieldCheck, 
  MessageCircle, Copy, Check, AlertTriangle, Lock, Globe, Loader2, Tag 
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { getSupabase } from '@/lib/supabase-client'
import { PREZISO_BILLING } from '@/lib/config/billing'

interface SubscriptionBannerProps {
  store: {
    id: string
    name: string
    subscription_status: string
    trial_ends_at?: string
    subscription_ends_at?: string 
  }
}

export default function SubscriptionBanner({ store }: SubscriptionBannerProps) {
  // Estado para verificar montaje en cliente (prevención de errores SSR en Next.js)
  const [mounted, setMounted] = useState(false)

  // Estados del Banner
  const [daysLeft, setDaysLeft] = useState<number | null>(null)
  const [bannerType, setBannerType] = useState<'hidden' | 'trial' | 'trial_expired' | 'active_expiring' | 'active_expired'>('hidden')
  const [showModal, setShowModal] = useState(false)
  
  // Estados de Pago, Tasa y Descuento
  const [rate, setRate] = useState<number>(0)
  const [discountPct, setDiscountPct] = useState<number>(0)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  
  const supabase = getSupabase()

  useEffect(() => {
    setMounted(true)
  }, [])

  // 1. Efecto para manejar la lógica de fechas del Banner
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

  // 2. Efecto para buscar la tasa BCV y el Descuento de Afiliado (Solo al abrir el modal)
  useEffect(() => {
    if (!showModal) return

    const fetchBillingData = async () => {
      // A. Buscar Tasa BCV
      const { data: configData } = await supabase
        .from('app_config')
        .select('usd_rate')
        .eq('id', 1)
        .single()
        
      if (configData?.usd_rate) {
        setRate(configData.usd_rate)
      }

      // B. Buscar Descuento de Referido (SOLO si es su primer pago)
      const hasPaidBefore = !!store.subscription_ends_at
      if (!hasPaidBefore) {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: ref } = await supabase
            .from('saas_referrals')
            .select(`saas_affiliates(discount_pct)`)
            .eq('referred_user_id', user.id)
            .single()

          if (ref?.saas_affiliates) {
            // @ts-ignore
            setDiscountPct(Number(ref.saas_affiliates.discount_pct || 0))
          }
        }
      }
    }
    fetchBillingData()
  }, [showModal, supabase, store.subscription_ends_at])

  if (bannerType === 'hidden' || daysLeft === null) return null

  // --- CONFIGURACIÓN DINÁMICA DEL BANNER SUPERIOR ---
  let isCritical = false
  let message = ''

  switch (bannerType) {
    case 'trial':
      isCritical = daysLeft <= 3
      message = isCritical 
        ? `Tu prueba gratuita termina en ${daysLeft} día${daysLeft === 1 ? '' : 's'}.` 
        : `Fase de prueba: Quedan ${daysLeft} días libres.`
      break
    case 'trial_expired':
      isCritical = true
      message = `Tu período de prueba ha expirado. Activa tu plan para continuar operando.`
      break
    case 'active_expiring':
      isCritical = daysLeft <= 2 
      message = `Te quedan ${daysLeft} día${daysLeft === 1 ? '' : 's'} de suscripción a Preziso.`
      break
    case 'active_expired':
      isCritical = true
      message = `(Modo, solo lectura). Puedes ver tu panel, pero no puedes editar, agregar productos ni vender. Renueva ahora para seguir disfrutando de Preziso`
      break
  }

  const bannerBg = isCritical ? 'bg-red-50 border-b border-red-100' : 'bg-gray-100 border-b border-gray-200'
  const textColor = isCritical ? 'text-red-900' : 'text-gray-800'
  const iconColor = isCritical ? 'text-red-600' : 'text-gray-500'
  const buttonClass = isCritical 
    ? 'bg-red-600 text-white hover:bg-red-700' 
    : 'bg-black text-white hover:bg-gray-800'
  const buttonText = bannerType.includes('active') ? 'Renovar plan' : 'Asegurar suscripción'

  // --- LÓGICA DE PAGO Y MATEMÁTICA EXACTA ---
  const basePriceUSD = PREZISO_BILLING.priceUSD
  const finalPriceUSD = discountPct > 0 
    ? Number((basePriceUSD * (1 - discountPct / 100)).toFixed(2)) 
    : basePriceUSD

  const amountBs = (finalPriceUSD * rate).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleCopyAllPagoMovil = () => {
  const allData = [
    `Banco: ${PREZISO_BILLING.pagoMovil.banco}`,
    `Teléfono: ${PREZISO_BILLING.pagoMovil.telefono}`,
    `Cédula/RIF: ${PREZISO_BILLING.pagoMovil.cedula}`,
    rate > 0 ? `Monto: Bs ${amountBs}` : ''
  ].filter(Boolean).join('\n')

  copyToClipboard(allData, 'pago_movil_all')
}

  const handleReportPayment = () => {
    const reportMessage = PREZISO_BILLING.generateReportMessage(store.name || 'Tienda', store.id || 'ID-Pendiente', amountBs, finalPriceUSD)
    const url = `https://wa.me/${PREZISO_BILLING.whatsappContact}?text=${encodeURIComponent(reportMessage)}`
    
    setShowSuccessModal(true)
    
    setTimeout(() => {
      window.open(url, '_blank')
      setShowSuccessModal(false)
      setShowModal(false)
    }, 2000)
  }

  return (
    <>
      {/* BANNER SUPERIOR */}
      <div className={`${bannerBg} px-4 py-2.5 md:py-2 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs md:text-sm font-medium transition-colors`}>
        <div className={`flex items-center gap-2 ${textColor}`}>
          {isCritical && daysLeft && daysLeft < 0 ? (
            <AlertTriangle size={16} className={`${iconColor} animate-bounce`} />
          ) : (
            <Clock size={16} className={`${iconColor} animate-pulse`} />
          )}
          <p>{message}</p>
        </div>
      
        <div 
          role="button"
          tabIndex={0}
          onClick={() => setShowModal(true)}
          className={`flex items-center cursor-pointer gap-1.5 px-4 py-1.5 rounded-md font-bold transition-all active:scale-95 ${buttonClass}`}
        >
          <Zap size={14} /> {buttonText} <ArrowRight size={14} />
        </div>
      </div>

      {/* PORTAL DE MODALES AL BODY */}
      {mounted && createPortal(
        <>
          {/* MODAL PRINCIPAL DE FACTURACIÓN */}
          <AnimatePresence>
            {showModal && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 md:p-4 font-sans selection:bg-black selection:text-white">
                <motion.div 
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }} 
                  exit={{ opacity: 0 }}
                  onClick={() => setShowModal(false)}
                  className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                />
                
                <motion.div 
                  initial={{ opacity: 0, y: 20, scale: 0.95 }} 
                  animate={{ opacity: 1, y: 0, scale: 1 }} 
                  exit={{ opacity: 0, y: 20, scale: 0.95 }}
                  className="relative w-full max-w-[400px] max-h-[90vh] overflow-y-auto bg-white rounded-2xl flex flex-col shadow-2xl z-10"
                >
                  <div 
                    onClick={() => setShowModal(false)} 
                    className="absolute top-3 right-3 p-1.5 text-gray-400 hover:text-black hover:bg-[var(--store-bg)] rounded-full transition-colors z-10 cursor-pointer"
                  >
                    <X size={16} />
                  </div>

                  <div className="p-5 pb-4 text-center border-b border-gray-50 bg-gray-50/30">
                    <div className="inline-flex p-2 rounded-xl bg-black text-white mb-2">
                      <Lock size={16} strokeWidth={2.5} />
                    </div>
                    <h1 className="text-xl font-black text-gray-900 tracking-tight leading-none">{PREZISO_BILLING.planName}</h1>
                    <p className="text-gray-400 text-xs mt-1.5 font-medium px-2">
                      {bannerType.includes('active') ? 'Renueva tu plan para seguir operando.' : 'Activa tu membresía y vende sin límites.'}
                    </p>
                  </div>

                  <div className="p-4 md:p-5 space-y-4 md:space-y-5">
                    {/* PRECIO DUAL, DESCUENTO Y TASA BCV */}
                    <div className="text-center">
                      {discountPct > 0 && (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-widest rounded-full mb-3 border border-emerald-100">
                          <Tag size={12} /> {discountPct}% Desc. Partner (1er Mes)
                        </div>
                      )}
                      
                      <div className="flex items-baseline justify-center gap-1">
                        <span className="text-3xl font-black text-gray-900">${finalPriceUSD}</span>
                        <span className="text-gray-400 font-bold text-sm">/mes</span>
                      </div>

                      {discountPct > 0 && (
                        <p className="text-[10px] text-gray-400 font-medium mt-1 line-through">
                          Precio regular: ${basePriceUSD}
                        </p>
                      )}
                      
                      <div className="mt-2 flex justify-center">
                        {rate > 0 ? (
                          <div className="inline-flex items-center gap-2 px-3 py-1 bg-gray-50 border border-gray-100 rounded-full text-[10px] font-black uppercase tracking-widest text-gray-600 transition-all">
                            <span>≈ Bs {amountBs} (BCV)</span>
                            <div className="w-px h-3 bg-gray-200 mx-0.5"></div>
                            <div 
                              role="button"
                              tabIndex={0}
                              onClick={() => copyToClipboard(amountBs, 'monto')}
                              className="text-gray-400 hover:text-black transition-colors flex items-center gap-1 active:scale-90"
                              title="Copiar monto exacto"
                            >
                              {copiedId === 'monto' ? <Check size={12} strokeWidth={3} className="text-emerald-500" /> : <Copy size={12} strokeWidth={2.5} />}
                            </div>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-2 px-3 py-1 bg-gray-50 border border-gray-100 rounded-full text-[10px] font-bold uppercase tracking-widest text-gray-400">
                            <Loader2 size={10} className="animate-spin" /> Calculando...
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Métodos de Pago */}
                    <div className="space-y-3">
                      <div className="p-3 rounded-2xl bg-gray-50/50 border border-transparent">
                        {/* Cabecera del bloque Pago Móvil con botón discreto */}
<div className="flex items-center justify-between mb-2.5">
  <div className="flex items-center gap-1.5 text-gray-900 font-bold text-xs">
    <Wallet size={14} className="text-gray-400" />
    Pago Móvil
  </div>

  <div className="flex items-center gap-2">
    <button
      type="button"
      onClick={handleCopyAllPagoMovil}
      className="flex items-center gap-1 text-[10px] font-bold text-gray-400 hover:text-black bg-white border border-gray-200/60 hover:border-gray-300 px-2 py-0.5 rounded-md transition-all active:scale-95 shadow-2xs"
      title="Copiar todos los datos de Pago Móvil"
    >
      {copiedId === 'pago_movil_all' ? (
        <>
          <Check size={11} strokeWidth={3} className="text-emerald-500" />
          <span className="text-emerald-600">¡Copiados!</span>
        </>
      ) : (
        <>
          <Copy size={11} strokeWidth={2} />
          <span>Copiar todo</span>
        </>
      )}
    </button>
    <span className="text-[9px] font-black text-gray-300 uppercase">VE</span>
  </div>
</div>
                        <div className="space-y-1.5">
                          <DataRow label="Banco" value={PREZISO_BILLING.pagoMovil.banco} />
                          <DataRow 
                            label="Teléfono" 
                            value={PREZISO_BILLING.pagoMovil.telefono} 
                            onCopy={() => copyToClipboard(PREZISO_BILLING.pagoMovil.telefono, 'tlf')}
                            isCopied={copiedId === 'tlf'}
                          />
                          <DataRow 
                            label="Cédula" 
                            value={PREZISO_BILLING.pagoMovil.cedula} 
                            onCopy={() => copyToClipboard(PREZISO_BILLING.pagoMovil.cedula, 'ci')}
                            isCopied={copiedId === 'ci'}
                          />
                        </div>
                      </div>

                      <div className="p-3 rounded-2xl bg-gray-50/50">
                        <div className="flex items-center gap-1.5 text-gray-900 font-bold text-xs mb-2.5">
                          <Globe size={14} className="text-gray-400" />
                          Global Wallets
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div 
                            role="button"
                            tabIndex={0}    
                            onClick={() => copyToClipboard(PREZISO_BILLING.wallets.binanceId, 'binance')}
                            className="p-2 rounded-xl bg-white border border-gray-100 text-center transition-all hover:border-gray-200 active:scale-95 cursor-pointer"
                          >
                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">Binance ID</p>
                            <p className="text-[11px] font-black text-gray-900 mt-0.5">{copiedId === 'binance' ? '¡Copiado!' : PREZISO_BILLING.wallets.binanceId}</p>
                          </div>
                          <div 
                            role="button"
                            tabIndex={0}
                            onClick={() => copyToClipboard(PREZISO_BILLING.wallets.zinliEmail, 'zinli')}
                            className="p-2 rounded-xl bg-white border border-gray-100 text-center transition-all hover:border-gray-200 active:scale-95 cursor-pointer"
                          >
                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">Zinli / Email</p>
                            <p className="text-[11px] font-black text-gray-900 mt-0.5 truncate px-1">{copiedId === 'zinli' ? '¡Copiado!' : PREZISO_BILLING.wallets.zinliEmail}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Botón Principal */}
                    <div 
                      role="button"
                      tabIndex={0}
                      onClick={handleReportPayment}
                      className="w-full bg-black text-white py-3.5 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all hover:bg-gray-900 active:scale-[0.98] cursor-pointer"
                    >
                      <MessageCircle size={16} /> Reportar Pago
                    </div>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* MODAL DE CONFIRMACIÓN DE ÉXITO */}
          <AnimatePresence>
            {showSuccessModal && (
              <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 font-sans">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-white/80 backdrop-blur-md" />
                <motion.div 
                  initial={{ scale: 0.9, opacity: 0 }} 
                  animate={{ scale: 1, opacity: 1 }} 
                  exit={{ scale: 0.9, opacity: 0 }}
                  className="relative bg-white border border-gray-100 p-8 rounded-3xl shadow-2xl max-w-sm text-center z-10"
                >
                  <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
                    <ShieldCheck size={40} strokeWidth={1.5} />
                  </div>
                  <h3 className="text-xl font-black text-gray-900 mb-2">Pago Enviado</h3>
                  <p className="text-sm text-gray-500 font-medium leading-relaxed">
                    Generando tu reporte. Serás redirigido a WhatsApp en breve para confirmar.
                  </p>
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

function DataRow({ label, value, onCopy, isCopied }: { label: string, value: string, onCopy?: () => void, isCopied?: boolean }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-gray-400 font-medium">{label}</span>
      <div className="flex items-center gap-2">
        <span className="font-bold text-gray-900 tracking-tight">{value}</span>
        {onCopy && (
          <div 
            role="button"
            tabIndex={0}
            onClick={onCopy}
            className="text-gray-300 hover:text-black transition-colors cursor-pointer"
            aria-label={`Copiar ${label}`}
          >
            {isCopied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
          </div>
        )}
      </div>
    </div>
  )
}