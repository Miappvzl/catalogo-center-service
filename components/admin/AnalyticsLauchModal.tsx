'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Sparkles, LineChart, CheckCircle2, ArrowRight } from 'lucide-react'
import Link from 'next/link'

export default function AnalyticsLaunchModal() {
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    // Protección contra doble render: Solo disparar si no ha sido descartada
    const isDismissed = localStorage.getItem('preziso_analytics_launch_dismissed')
    if (!isDismissed) {
      // Pequeño delay de entrada para dejar que la consola de inicio cargue primero
      const timer = setTimeout(() => setIsOpen(true), 1200)
      return () => clearTimeout(timer)
    }
  }, [])

  const handleDismiss = () => {
    localStorage.setItem('preziso_analytics_launch_dismissed', 'true')
    setIsOpen(false)
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 md:p-6">
          {/* Fondo Orgánico Difuminado */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { duration: 0.4, ease: "easeOut" } }}
            exit={{ opacity: 0, transition: { duration: 0.3, ease: "easeIn" } }}
            onClick={handleDismiss}
            className="absolute inset-0 bg-[#09090b]/40 backdrop-blur-xs"
          />

          {/* Tarjeta del Modal (Físicas Premium) */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0, transition: { type: "spring", stiffness: 450, damping: 30 } }}
            exit={{ opacity: 0, scale: 0.95, y: 15, transition: { duration: 0.25 } }}
            className="relative bg-white w-full max-w-lg rounded-2xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.15)] border border-neutral-100 p-6 md:p-8 overflow-hidden z-10 flex flex-col gap-6"
          >
            {/* Botón de Cerrar */}
            <button 
              onClick={handleDismiss} 
              className="absolute top-4 right-4 bg-neutral-50 hover:bg-neutral-100 p-1.5 rounded-full text-neutral-500 active:scale-95 transition-all border border-neutral-200/20"
            >
              <X size={16} />
            </button>

            {/* Cabecera del Lanzamiento */}
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-neutral-950 text-white rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-neutral-900/15">
                <LineChart size={22} strokeWidth={2.2} className="animate-pulse" />
              </div>
              <div>
                <span className="inline-flex items-center gap-1 bg-neutral-100 text-neutral-600 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded">
                  <Sparkles size={10} className="text-neutral-500" /> Nueva Función
                </span>
                <h2 className="text-lg font-black text-neutral-900 tracking-tight mt-1">
                  Módulo de Inteligencia de Tienda
                </h2>
              </div>
            </div>

            <p className="text-xs md:text-sm text-neutral-500 leading-relaxed">
              Hemos implementado un robusto motor de telemetría en tiempo real. Ahora podrás analizar con total precisión el comportamiento e interés de tus clientes dentro de tu catálogo.
            </p>

            {/* Beneficios Clave Explicados de un Vistazo */}
            <div className="space-y-3.5 bg-neutral-50/50 p-4 rounded-xl border border-neutral-100/50">
              <div className="flex items-start gap-3">
                <CheckCircle2 size={16} className="text-neutral-900 mt-0.5 shrink-0" />
                <div>
                  <h4 className="text-xs font-bold text-neutral-900">Embudo de Conversión Real</h4>
                  <p className="text-[11px] text-neutral-500 mt-0.5">Analiza con precisión cuántas visitas se traducen en vistas del catálogo y pedidos.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle2 size={16} className="text-neutral-900 mt-0.5 shrink-0" />
                <div>
                  <h4 className="text-xs font-bold text-neutral-900">Retención Visual (Dwell Time)</h4>
                  <p className="text-[11px] text-neutral-500 mt-0.5">Conoce exactamente cuántos segundos pasa cada cliente analizando tus productos.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle2 size={16} className="text-neutral-900 mt-0.5 shrink-0" />
                <div>
                  <h4 className="text-xs font-bold text-neutral-900">Ubicaciones y Horarios Pico</h4>
                  <p className="text-[11px] text-neutral-500 mt-0.5">Identifica los estados de Venezuela de donde te visitan y tu horario con más tráfico.</p>
                </div>
              </div>
            </div>

            {/* Acciones del Footer */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Link
                href="/admin/analytics"
                onClick={handleDismiss}
                className="flex-1 bg-neutral-950 hover:bg-black text-white text-xs font-bold uppercase tracking-wider h-11 rounded-lg flex items-center justify-center gap-1.5 transition-all shadow-md shadow-neutral-900/10 active:scale-[0.98]"
              >
                <span>Explorar Consola</span>
                <ArrowRight size={14} />
              </Link>
              <button
                onClick={handleDismiss}
                className="flex-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-bold uppercase tracking-wider h-11 rounded-lg flex items-center justify-center transition-all active:scale-[0.98]"
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