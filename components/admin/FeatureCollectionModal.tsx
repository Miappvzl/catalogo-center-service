'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Layers, UtensilsCrossed, ArrowRight, Sparkles, Check } from 'lucide-react'

interface FeatureCollectionModalProps {
  store: any
}

export default function FeatureCollectionModal({ store }: FeatureCollectionModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const router = useRouter()
  const isRestaurant = store?.store_type === 'restaurant'

  useEffect(() => {
    try {
      const seen = localStorage.getItem('preziso_feature_collection_seen_v1')
      if (!seen) {
        // Pequeño retardo de 800ms para no abrumar al entrar al dashboard
        const timer = setTimeout(() => setIsOpen(true), 800)
        return () => clearTimeout(timer)
      }
    } catch {}
  }, [])

  const handleDismiss = () => {
    try {
      localStorage.setItem('preziso_feature_collection_seen_v1', 'true')
    } catch {}
    setIsOpen(false)
  }

  const handleNavigate = () => {
    handleDismiss()
    router.push('/admin/collections')
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          {/* Backdrop con desenfoque de alta gama */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleDismiss}
            className="absolute inset-0 bg-neutral-950/45 backdrop-blur-sm cursor-pointer"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: 'spring', damping: 28, stiffness: 350 }}
            className="relative bg-white w-full max-w-sm rounded-[24px] overflow-hidden shadow-[0_20px_60px_-15px_rgba(0,0,0,0.15)] border border-neutral-200/80 p-6 z-10 text-left"
          >
            {/* Botón de Cierre */}
            <button
              onClick={handleDismiss}
              className="absolute top-4 right-4 p-1.5 text-neutral-400 hover:text-neutral-900 rounded-full hover:bg-neutral-100 transition-colors"
            >
              <X size={16} />
            </button>

            {/* Ícono de Estado */}
            <div className="w-12 h-12 rounded-2xl bg-neutral-950 text-white flex items-center justify-center mb-5 shadow-sm">
              {isRestaurant ? <UtensilsCrossed size={22} strokeWidth={2} /> : <Layers size={22} strokeWidth={2} />}
            </div>

            {/* Micro Tag */}
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-neutral-100 border border-neutral-200/60 text-[9px] font-mono font-bold text-neutral-600 uppercase mb-2">
              <Sparkles size={11} className="text-amber-500" />
              <span>Novedad en tu Tienda</span>
            </div>

            {/* Textos Dinámicos por Nicho */}
            <h3 className="text-lg font-bold text-neutral-950 tracking-tight leading-snug mb-2">
              {isRestaurant 
                ? 'Llegaron los Combos y Especiales' 
                : 'Nuevo: Colecciones de Productos'}
            </h3>

            <p className="text-xs text-neutral-500 leading-relaxed font-normal mb-6">
              {isRestaurant
                ? 'Agrupa platos, contornos y bebidas en un solo paquete con precio especial. Incrementa tu ticket promedio permitiendo que tus clientes elijan un combo completo en un toque.'
                : 'Crea agrupaciones temáticas (Venta al Mayor, Temporada, Sets de Regalo). Exhibe productos seleccionados juntos para que tus clientes compren más artículos por pedido.'}
            </p>

            {/* Ventajas Rápidas */}
            <div className="space-y-2 mb-6 border-y border-neutral-100 py-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-neutral-800">
                <Check size={14} className="text-emerald-600 shrink-0" strokeWidth={3} />
                <span>{isRestaurant ? 'Precio sugerido en USD y tasa BCV' : 'Enlace directo para WhatsApp e Instagram'}</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold text-neutral-800">
                <Check size={14} className="text-emerald-600 shrink-0" strokeWidth={3} />
                <span>Exhibición destacada en el inicio de tu tienda</span>
              </div>
            </div>

            {/* Botones de Acción */}
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={handleNavigate}
                className="w-full bg-neutral-950 hover:bg-black text-white py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 active:scale-98 shadow-sm"
              >
                <span>{isRestaurant ? 'Armar mi primer combo' : 'Crear primera colección'}</span>
                <ArrowRight size={14} />
              </button>
              <button
                type="button"
                onClick={handleDismiss}
                className="w-full py-2 text-[11px] font-bold text-neutral-400 hover:text-neutral-700 transition-colors text-center"
              >
                Ver más tarde
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}