'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Zap, X, ArrowRight } from 'lucide-react'

export default function MerchandisingIntroModal() {
  // El componente maneja su propio estado internamente
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Verificamos el localStorage solo en el cliente para evitar errores de hidratación
    const hasSeenIntro = localStorage.getItem('preziso_merchandising_intro')
    
    if (!hasSeenIntro) {
      // Retraso de 1.5s para no interrumpir la carga inicial de la página
      const timer = setTimeout(() => setIsVisible(true), 1500)
      return () => clearTimeout(timer)
    }
  }, [])

  const handleClose = () => {
    setIsVisible(false)
    // Guardamos la marca en el navegador para que no vuelva a aparecer
    localStorage.setItem('preziso_merchandising_intro', 'true')
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop ultra-limpio */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="absolute inset-0 bg-black/5 backdrop-blur-[10px]"
          />

          {/* Contenedor del Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 10 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="relative bg-white w-full max-w-[400px] rounded-[2rem] overflow-hidden shadow-[0_30px_60px_-15px_rgba(0,0,0,0.08)] flex flex-col"
          >
            {/* Header con acento Blueviolet */}
            <div className="p-8 pb-4 flex justify-between items-start">
              <div className="w-12 h-12 bg-[#f3edff] rounded-2xl flex items-center justify-center text-[#8a5cf5]">
                <Zap size={24} fill="currentColor" />
              </div>
              <button 
                onClick={handleClose}
                className="p-2 hover:bg-zinc-100 rounded-full transition-colors text-zinc-400 hover:text-black"
              >
                <X size={20} />
              </button>
            </div>

            {/* Contenido */}
            <div className="px-8 pb-2">
              <h3 className="text-xl font-black text-black tracking-tight mb-3">
                Control Maestro
              </h3>
              <p className="text-zinc-500 text-sm leading-relaxed font-medium">
                Hemos activado el nuevo sistema de <span className="text-black font-bold">Visual Merchandising</span>. 
                Ahora puedes dictar el orden exacto de tu tienda con Drag & Drop o mediante el Salto Cuántico de posición.
              </p>
            </div>

            {/* Lista de beneficios minimalista */}
            <div className="px-8 py-6 space-y-3">
                <div className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-widest text-zinc-400">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#8a5cf5]/40" />
                    Ordenamiento Global
                </div>
                <div className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-widest text-zinc-400">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#8a5cf5]/40" />
                    Prioridad de Escaparate
                </div>
            </div>

            {/* Footer / Acción */}
            <div className="p-4 bg-zinc-50/50 mt-auto">
              <button
                onClick={handleClose}
                className="w-full py-4 bg-black text-white rounded-2xl font-black text-xs uppercase tracking-[0.15em] flex items-center justify-center gap-2 hover:bg-zinc-900 active:scale-[0.98] transition-all"
              >
                Entendido <ArrowRight size={14} strokeWidth={3} />
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}