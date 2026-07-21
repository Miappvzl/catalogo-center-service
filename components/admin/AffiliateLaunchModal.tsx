'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Gift, ArrowRight, X, Sparkles } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function AffiliateLaunchModal() {
  const [isOpen, setIsOpen] = useState(false)
  const router = useRouter()

  useEffect(() => {
    // Verificamos si el usuario ya vio el anuncio
    const hasSeenModal = localStorage.getItem('preziso_affiliate_modal_seen')
    if (!hasSeenModal) {
      // Delay táctico de 800ms para una animación suave tras cargar el panel
      const timer = setTimeout(() => setIsOpen(true), 800)
      return () => clearTimeout(timer)
    }
  }, [])

  const handleClose = () => {
    localStorage.setItem('preziso_affiliate_modal_seen', 'true')
    setIsOpen(false)
  }

  const handleGoToAffiliates = () => {
    localStorage.setItem('preziso_affiliate_modal_seen', 'true')
    setIsOpen(false)
    router.push('/admin/affiliates')
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          {/* Fondo Difuminado (Backdrop) */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-md transition-opacity"
          />

          {/* Contenedor del Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ type: 'spring', stiffness: 350, damping: 25 }}
            className="relative bg-white rounded-[2.5rem] p-6 sm:p-10 max-w-[460px] w-full shadow-[0_25px_70px_-15px_rgba(0,0,0,0.2)] z-10 overflow-hidden text-gray-900 font-sans border border-gray-100"
          >
            {/* Cierre */}
            <button
              onClick={handleClose}
              className="absolute top-6 right-6 p-2 rounded-full bg-gray-50 hover:bg-gray-100 text-gray-400 hover:text-black transition-all active:scale-95 z-20"
            >
              <X size={18} />
            </button>

            {/* Cabecera e Ícono */}
            <div className="flex flex-col items-center text-center">
              <div className="relative mb-6">
                <div className="w-16 h-16 bg-black text-white rounded-3xl flex items-center justify-center shadow-[0_10px_30px_rgba(0,0,0,0.15)] relative z-10">
                  <Gift size={30} strokeWidth={1.8} />
                </div>
                {/* Badge Volador */}
                <div className="absolute -top-2 -right-3 bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full shadow-lg flex items-center gap-1 z-20 animate-bounce">
                  <Sparkles size={10} /> $5.00 USD
                </div>
              </div>

              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 bg-gray-50 px-3 py-1.5 rounded-full mb-3">
                Programa de Afiliados
              </span>
              
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-gray-900 leading-tight mb-2">
                Refiere un comercio y <br />
                <span className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-500 bg-clip-text text-transparent">
                  gana $5.00 en efectivo
                </span>
              </h2>

              <p className="text-xs sm:text-sm text-gray-500 font-medium leading-relaxed max-w-xs mb-8">
                Te pagamos directamente a tu Pago Móvil por cada amigo que traigas a Preziso.
              </p>
            </div>

            {/* Explicación en 3 pasos ultrasimples */}
            <div className="space-y-3 bg-gray-50/80 p-4 sm:p-5 rounded-3xl mb-8 border border-gray-100/60">
              <div className="flex items-center gap-3.5">
                <div className="w-8 h-8 rounded-xl bg-white text-black font-black text-xs flex items-center justify-center shrink-0 shadow-sm border border-gray-100">
                  1
                </div>
                <div className="text-left">
                  <p className="text-xs font-bold text-gray-900">Copia tu enlace personal</p>
                  <p className="text-[11px] text-gray-400 font-medium">Te lo entregamos listo en tu panel.</p>
                </div>
              </div>

              <div className="flex items-center gap-3.5">
                <div className="w-8 h-8 rounded-xl bg-white text-black font-black text-xs flex items-center justify-center shrink-0 shadow-sm border border-gray-100">
                  2
                </div>
                <div className="text-left">
                  <p className="text-xs font-bold text-gray-900">Envíalo a un amigo o cliente</p>
                  <p className="text-[11px] text-gray-400 font-medium">Por WhatsApp, Instagram o tus redes.</p>
                </div>
              </div>

              <div className="flex items-center gap-3.5">
                <div className="w-8 h-8 rounded-xl bg-black text-white font-black text-xs flex items-center justify-center shrink-0 shadow-sm">
                  3
                </div>
                <div className="text-left">
                  <p className="text-xs font-bold text-gray-900">¡Cobras $5.00 dólares!</p>
                  <p className="text-[11px] text-gray-500 font-medium">En cuanto tu amigo realice su primer pago.</p>
                </div>
              </div>
            </div>

            {/* Botones */}
            <div className="space-y-3">
              <button
                onClick={handleGoToAffiliates}
                className="w-full h-14 bg-black text-white text-xs font-black uppercase tracking-widest rounded-2xl flex items-center justify-center gap-2 hover:bg-gray-900 active:scale-[0.98] transition-all shadow-[0_10px_30px_rgba(0,0,0,0.12)] group"
              >
                Activar mi enlace ahora
                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                onClick={handleClose}
                className="w-full py-2 text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-gray-900 transition-colors"
              >
                Entendido, ver más tarde
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}