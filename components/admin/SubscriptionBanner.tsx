'use client'

import { useState, useEffect } from 'react'
import { 
  Clock, Zap, ArrowRight, X, Wallet, ShieldCheck, 
  MessageCircle, Copy, Check, AlertTriangle, Lock, Globe, Loader2 
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
  // Estados del Banner
  const [daysLeft, setDaysLeft] = useState<number | null>(null)
  const [bannerType, setBannerType] = useState<'hidden' | 'trial' | 'trial_expired' | 'active_expiring' | 'active_expired'>('hidden')
  const [showModal, setShowModal] = useState(false)
  
  // Estados de Pago y Tasa
  const [rate, setRate] = useState<number>(0)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  
  const supabase = getSupabase()

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

  // 2. Efecto para buscar la tasa BCV cuando se abre el modal
  useEffect(() => {
    if (!showModal) return // Solo buscamos la tasa si el usuario abre el modal para ahorrar peticiones

    const fetchRate = async () => {
      const { data } = await supabase
        .from('app_config')
        .select('usd_rate')
        .eq('id', 1)
        .single()
        
      if (data?.usd_rate) {
        setRate(data.usd_rate)
      }
    }
    fetchRate()
  }, [showModal, supabase])

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
      message = `Tu suscripción a Preziso ha vencido. Renueva tu plan para evitar pausas en tu tienda.`
      break
  }

  const bannerBg = isCritical ? 'bg-red-50 border-b border-red-100' : 'bg-gray-100 border-b border-gray-200'
  const textColor = isCritical ? 'text-red-900' : 'text-gray-800'
  const iconColor = isCritical ? 'text-red-600' : 'text-gray-500'
  const buttonClass = isCritical 
    ? 'bg-red-600 text-white hover:bg-red-700' 
    : 'bg-black text-white hover:bg-gray-800'
  const buttonText = bannerType.includes('active') ? 'Renovar plan' : 'Asegurar suscripción'

  // --- LÓGICA DE PAGO Y UX ---
  const amountBs = (PREZISO_BILLING.priceUSD * rate).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleReportPayment = () => {
    const reportMessage = PREZISO_BILLING.generateReportMessage(store.name || 'Tienda', store.id || 'ID-Pendiente', amountBs)
    const url = `https://wa.me/${PREZISO_BILLING.whatsappContact}?text=${encodeURIComponent(reportMessage)}`
    
    // Mostramos el modal de éxito
    setShowSuccessModal(true)
    
    // Salto automático a WhatsApp
    setTimeout(() => {
      window.open(url, '_blank')
      // Opcional: Cerrar los modales después de redirigir
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
        <button 
          onClick={() => setShowModal(true)}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md font-bold transition-all active:scale-95 ${buttonClass}`}
        >
          <Zap size={14} /> {buttonText} <ArrowRight size={14} />
        </button>
      </div>

      {/* MODAL PRINCIPAL DE FACTURACIÓN (Ultra-Compacto / Zero Scroll) */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 md:p-4 font-sans selection:bg-black selection:text-white">
            {/* Backdrop Blur */}
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowModal(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            
            {/* Contenedor Clean (Compresión vertical máxima) */}
            <motion.div 
              initial={{ opacity: 0, y: 20, scale: 0.95 }} 
              animate={{ opacity: 1, y: 0, scale: 1 }} 
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              className="relative w-full max-w-[400px] bg-white rounded-2xl overflow-hidden flex flex-col shadow-2xl"
            >
              <button 
                onClick={() => setShowModal(false)} 
                className="absolute top-3 right-3 p-1.5 text-gray-400 hover:text-black hover:bg-gray-100 rounded-full transition-colors z-10"
              >
                <X size={16} />
              </button>

              {/* Header Minimalista (Más compacto) */}
              <div className="p-5 pb-4 text-center border-b border-gray-50 bg-gray-50/30">
                <div className="inline-flex p-2 rounded-xl bg-black text-white mb-2">
                  <Lock size={16} strokeWidth={2.5} />
                </div>
                <h1 className="text-xl font-black text-gray-900 tracking-tight leading-none">{PREZISO_BILLING.planName}</h1>
                <p className="text-gray-400 text-xs mt-1.5 font-medium px-2">
                  {bannerType.includes('active') ? 'Renueva tu plan para seguir operando.' : 'Activa tu membresía y vende sin límites.'}
                </p>
              </div>

              {/* Body con la Data (Reducción drástica de gaps y paddings) */}
              <div className="p-4 md:p-5 space-y-4 md:space-y-5">
                
                {/* Precio Dual y Tasa BCV */}
                <div className="text-center">
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-3xl font-black text-gray-900">${PREZISO_BILLING.priceUSD}</span>
                    <span className="text-gray-400 font-bold text-sm">/mes</span>
                  </div>
                  
                  <div className="mt-2 flex justify-center">
                    {rate > 0 ? (
                      <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 border border-emerald-100/50 rounded-full text-[10px] font-black uppercase tracking-widest text-emerald-700 transition-all">
                        <span>≈ Bs {amountBs} (BCV)</span>
                        <div className="w-px h-3 bg-emerald-200 mx-0.5"></div>
                        <button 
                          onClick={() => copyToClipboard(amountBs, 'monto')}
                          className="text-emerald-600 hover:text-emerald-900 transition-colors flex items-center gap-1 active:scale-90"
                          title="Copiar monto exacto"
                        >
                          {copiedId === 'monto' ? <Check size={12} strokeWidth={3} /> : <Copy size={12} strokeWidth={2.5} />}
                        </button>
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
                  {/* Pago Móvil */}
                  <div className="p-3 rounded-2xl bg-gray-50/50 border border-transparent">
                    <div className="flex items-center justify-between mb-2.5">
                      <div className="flex items-center gap-1.5 text-gray-900 font-bold text-xs">
                        <Wallet size={14} className="text-gray-400" />
                        Pago Móvil
                      </div>
                      <span className="text-[9px] font-black text-gray-400 uppercase">Venezuela</span>
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

                  {/* Otros Métodos */}
                  <div className="p-3 rounded-2xl bg-gray-50/50">
                    <div className="flex items-center gap-1.5 text-gray-900 font-bold text-xs mb-2.5">
                      <Globe size={14} className="text-gray-400" />
                      Global Wallets
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button 
                        onClick={() => copyToClipboard(PREZISO_BILLING.wallets.binanceId, 'binance')}
                        className="p-2 rounded-xl bg-white border border-gray-100 text-center transition-all hover:border-gray-200 active:scale-95"
                      >
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">Binance ID</p>
                        <p className="text-[11px] font-black text-gray-900 mt-0.5">{copiedId === 'binance' ? '¡Copiado!' : PREZISO_BILLING.wallets.binanceId}</p>
                      </button>
                      <button 
                        onClick={() => copyToClipboard(PREZISO_BILLING.wallets.zinliEmail, 'zinli')}
                        className="p-2 rounded-xl bg-white border border-gray-100 text-center transition-all hover:border-gray-200 active:scale-95"
                      >
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">Zinli / Email</p>
                        <p className="text-[11px] font-black text-gray-900 mt-0.5 truncate px-1">{copiedId === 'zinli' ? '¡Copiado!' : PREZISO_BILLING.wallets.zinliEmail}</p>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Botón Principal */}
                <button 
                  onClick={handleReportPayment}
                  className="w-full bg-black text-white py-3.5 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all hover:bg-gray-900 active:scale-[0.98]"
                >
                  <MessageCircle size={16} /> Reportar Pago
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL DE CONFIRMACIÓN DE ÉXITO (El Salto a WhatsApp) */}
      <AnimatePresence>
        {showSuccessModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 font-sans">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-white/80 backdrop-blur-md" />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-white border border-gray-100 p-8 rounded-3xl shadow-2xl max-w-sm text-center"
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
          <button onClick={onCopy} className="text-gray-300 hover:text-black transition-colors" aria-label={`Copiar ${label}`}>
            {isCopied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
          </button>
        )}
      </div>
    </div>
  )
}