'use client'

import { useState, useEffect } from 'react'
import { Clock, Zap, ArrowRight, X, Wallet, ShieldCheck, MessageCircle, Copy, Check } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'

interface SubscriptionBannerProps {
  store: {
    subscription_status: string
    trial_ends_at: string
  }
}

export default function SubscriptionBanner({ store }: SubscriptionBannerProps) {
  const [daysLeft, setDaysLeft] = useState<number | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [copiedData, setCopiedData] = useState<string | null>(null)

  useEffect(() => {
    if (!store?.trial_ends_at) return
    const endsAt = new Date(store.trial_ends_at)
    const today = new Date()
    const diffTime = endsAt.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    setDaysLeft(diffDays)
  }, [store])

  // Si ya pagó, no mostramos el banner intrusivo
  if (store?.subscription_status === 'active' || daysLeft === null) return null

  // Psicología del color
  const isCritical = daysLeft <= 3
  const bannerBg = isCritical ? 'bg-red-50 border-b border-red-100' : 'bg-gray-100 border-b border-gray-200'
  const textColor = isCritical ? 'text-red-900' : 'text-gray-800'
  const iconColor = isCritical ? 'text-red-600' : 'text-gray-500'
  const buttonClass = isCritical 
    ? 'bg-red-600 text-white hover:bg-red-700' 
    : 'bg-black text-white hover:bg-gray-800'

  const message = isCritical 
    ? `Tu tienda se pausará en ${daysLeft} día${daysLeft === 1 ? '' : 's'}.`
    : `Fase de prueba: Quedan ${daysLeft} días libres.`

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedData(id)
    setTimeout(() => setCopiedData(null), 2000)
  }

  const handleReportPayment = () => {
    const msg = `Hola, quiero activar la suscripción de mi tienda en Preziso.\n\nAdjunto comprobante de pago:`
    window.open(`https://wa.me/584145811936?text=${encodeURIComponent(msg)}`, '_blank')
  }

  return (
    <>
      {/* BANNER SUPERIOR */}
      <div className={`${bannerBg} px-4 py-2.5 md:py-2 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs md:text-sm font-medium transition-colors`}>
        <div className={`flex items-center gap-2 ${textColor}`}>
          <Clock size={16} className={`${iconColor} animate-pulse`} />
          <p>{message}</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md font-bold transition-all active:scale-95 ${buttonClass}`}
        >
          <Zap size={14} /> Asegurar mi suscripción <ArrowRight size={14} />
        </button>
      </div>

      {/* MODAL DE PAGO (GLASSMORPHISM) */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowModal(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            
            {/* Contenedor Modal */}
            <motion.div 
              initial={{ opacity: 0, y: 20, scale: 0.95 }} 
              animate={{ opacity: 1, y: 0, scale: 1 }} 
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Header Rojo/Negro */}
              <div className="bg-black text-white p-6 relative overflow-hidden flex-shrink-0">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl -mr-10 -mt-10"></div>
                <button onClick={() => setShowModal(false)} className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors">
                  <X size={18} />
                </button>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-white/20 rounded-lg backdrop-blur-md"><ShieldCheck size={24} /></div>
                  <h2 className="text-xl font-black">Activar Suscripción</h2>
                </div>
                <p className="text-gray-300 text-sm">Reactiva tu tienda y sigue vendiendo sin límites por solo <b className="text-white text-lg">$20/mes</b>.</p>
              </div>

              {/* Body Scrolleable */}
              <div className="p-6 overflow-y-auto no-scrollbar space-y-5 bg-gray-50 flex-1">
                
                {/* Opcion 1: Pago Móvil */}
                <div className="bg-white p-4 rounded-2xl border border-gray-200">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2"><Wallet size={14}/> Pago Móvil (Venezuela)</p>
                  <div className="space-y-2 text-sm font-mono text-gray-600">
                    <div className="flex justify-between items-center bg-gray-50 p-2 rounded-lg">
                      <span>Banco: <b>Venezuela (0102)</b></span>
                    </div>
                    <div className="flex justify-between items-center bg-gray-50 p-2 rounded-lg">
                      <span>Tlf: <b>0414-5809864</b></span>
                      <button onClick={() => copyToClipboard('04145809864', 'tlf')} className="p-1.5 hover:bg-gray-200 rounded text-gray-500">
                        {copiedData === 'tlf' ? <Check size={14} className="text-green-600"/> : <Copy size={14}/>}
                      </button>
                    </div>
                    <div className="flex justify-between items-center bg-gray-50 p-2 rounded-lg">
                      <span>CI: <b>V-34075886</b></span>
                      <button onClick={() => copyToClipboard('34075886', 'ci')} className="p-1.5 hover:bg-gray-200 rounded text-gray-500">
                        {copiedData === 'ci' ? <Check size={14} className="text-green-600"/> : <Copy size={14}/>}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Opcion 2: Métodos Internacionales */}
                <div className="bg-white p-4 rounded-2xl border border-gray-200">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Billeteras Internacionales</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 flex flex-col items-center justify-center text-center gap-1 group relative">
                      <span className="font-black text-gray-900 text-sm">Binance Pay</span>
                      <span className="text-[10px] text-gray-500">ID: 123456789</span> {/* CAMBIA ESTO POR TU ID */}
                      <button onClick={() => copyToClipboard('123456789', 'binance')} className="absolute top-1 right-1 p-1 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400">
                        {copiedData === 'binance' ? <Check size={12} className="text-green-600"/> : <Copy size={12}/>}
                      </button>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 flex flex-col items-center justify-center text-center gap-1 group relative">
                      <span className="font-black text-gray-900 text-sm">Zinli / Wally</span>
                      <span className="text-[10px] text-gray-500 truncate w-full px-2">tu@correo.com</span> {/* CAMBIA ESTO */}
                      <button onClick={() => copyToClipboard('tu@correo.com', 'zinli')} className="absolute top-1 right-1 p-1 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400">
                        {copiedData === 'zinli' ? <Check size={12} className="text-green-600"/> : <Copy size={12}/>}
                      </button>
                    </div>
                  </div>
                </div>

              </div>

              {/* Footer con Botón */}
              <div className="p-6 bg-white border-t border-gray-100 flex-shrink-0">
                <button 
                  onClick={handleReportPayment}
                  className="w-full bg-green-600 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-green-700 transition-colors active:scale-95 shadow-lg shadow-green-200"
                >
                  <MessageCircle size={20} /> Ya pagué, enviar comprobante
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}