'use client'

import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
    Barcode, 
    Zap, 
    X, 
    Sparkles, 
    ArrowRight, 
    PackageCheck,
    Keyboard
} from 'lucide-react'

interface SkuFeatureModalProps {
    onQuickGenerate?: () => void
}

// Curva Bézier de alto rendimiento renderizada directamente por el Compositor de la GPU
const GPU_EASING = [0.16, 1, 0.3, 1] as const

export default function SkuFeatureModal({ onQuickGenerate }: SkuFeatureModalProps) {
    const [mounted, setMounted] = useState(false)
    const [isOpen, setIsOpen] = useState(false)

    useEffect(() => {
        setMounted(true)
        
        try {
            const hasSeen = localStorage.getItem('preziso_sku_feature_v1_seen')
            if (!hasSeen) {
                // Cedemos el hilo principal para que la tabla termine su primer paint a 60 FPS
                const timer = setTimeout(() => {
                    setIsOpen(true)
                }, 150)
                return () => clearTimeout(timer)
            }
        } catch {
            // Protección contra entornos con storage restringido
        }
    }, [])

    const handleDismiss = useCallback(() => {
        try {
            localStorage.setItem('preziso_sku_feature_v1_seen', 'true')
        } catch {}
        setIsOpen(false)
    }, [])

    const handleAction = useCallback(() => {
        handleDismiss()
        onQuickGenerate?.()
    }, [handleDismiss, onQuickGenerate])

    // Evita hidratación desalineada en SSR y ahorra memoria si no está montado
    if (!mounted) return null

    return createPortal(
        <AnimatePresence mode="wait">
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-hidden">
                    {/* Backdrop: Opacidad ligera con desenfoque de bajo costo para no ahogar la GPU */}
                    <motion.div 
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }} 
                        exit={{ opacity: 0 }} 
                        transition={{ duration: 0.18, ease: 'easeOut' }}
                        onClick={handleDismiss}
                        className="fixed inset-0 bg-neutral-950/40 backdrop-blur-[2px] transform-gpu will-change-[opacity]"
                    />

                    {/* Tarjeta del Modal con capa de aceleración independiente */}
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.97, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.97, y: 10 }}
                        transition={{ duration: 0.24, ease: GPU_EASING }}
                        className="relative bg-white w-full max-w-lg rounded-2xl md:rounded-3xl p-6 md:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.12)] border border-neutral-200/70 overflow-hidden z-10 transform-gpu will-change-[transform,opacity]"
                    >
                        {/* Botón de Cierre */}
                        <button 
                            onClick={handleDismiss}
                            className="absolute top-5 right-5 p-1.5 bg-neutral-100 hover:bg-neutral-200 rounded-full text-neutral-500 hover:text-neutral-900 transition-colors active:scale-95"
                        >
                            <X size={15} />
                        </button>

                        {/* Icono Badge Principal */}
                        <div className="w-12 h-12 rounded-2xl bg-neutral-950 text-white flex items-center justify-center mb-5 shadow-xs">
                            <Barcode size={22} strokeWidth={2.2} />
                        </div>

                        {/* Textos de Cabecera */}
                        <div className="space-y-1.5 mb-6">
                            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-neutral-100 border border-neutral-200/60 text-[9px] font-bold uppercase tracking-wider text-neutral-700">
                                <Sparkles size={10} className="text-amber-500 fill-amber-500" />
                                <span>Nueva Característica</span>
                            </div>
                            <h2 className="text-xl font-bold text-neutral-900 tracking-tight leading-tight">
                                Nueva Matriz de Códigos SKU
                            </h2>
                            <p className="text-xs text-neutral-500 leading-relaxed font-medium">
                                Los SKUs son la huella digital única de tus productos y variantes para organizar tu almacén y evitar confusiones al preparar pedidos.
                            </p>
                        </div>

                        {/* Puntos Clave de Valor */}
                        <div className="space-y-3 mb-7">
                            <div className="flex items-start gap-3 p-3 rounded-xl bg-neutral-50/70 border border-neutral-200/40">
                                <div className="p-2 bg-white rounded-lg border border-neutral-200/60 text-neutral-900 shrink-0 shadow-xs">
                                    <PackageCheck size={16} />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-xs font-bold text-neutral-900">Despacho Exacto en WhatsApp</p>
                                    <p className="text-[11px] text-neutral-500 font-medium leading-snug mt-0.5">
                                        Cada orden muestra el código exacto de la talla o color vendido para armar el paquete sin errores.
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3 p-3 rounded-xl bg-neutral-50/70 border border-neutral-200/40">
                                <div className="p-2 bg-white rounded-lg border border-neutral-200/60 text-neutral-900 shrink-0 shadow-xs">
                                    <Keyboard size={16} />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-xs font-bold text-neutral-900">Edición Rápida estilo Excel</p>
                                    <p className="text-[11px] text-neutral-500 font-medium leading-snug mt-0.5">
                                        Escribe y pulsa <kbd className="font-mono font-bold bg-neutral-200/80 px-1 py-0.2 rounded text-[10px]">Enter</kbd> para saltar a la fila inferior sin tocar el ratón.
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3 p-3 rounded-xl bg-neutral-50/70 border border-neutral-200/40">
                                <div className="p-2 bg-white rounded-lg border border-neutral-200/60 text-neutral-900 shrink-0 shadow-xs">
                                    <Zap size={16} className="text-amber-500 fill-amber-500" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-xs font-bold text-neutral-900">Generación Automática de 1 Clic</p>
                                    <p className="text-[11px] text-neutral-500 font-medium leading-snug mt-0.5">
                                        Si no tienes códigos fiscales predefinidos, nuestro algoritmo asignará códigos inteligentes al instante.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Botones de Acción */}
                        <div className="flex flex-col sm:flex-row gap-2.5">
                            <button
                                onClick={handleAction}
                                className="flex-1 bg-neutral-950 text-white hover:bg-black py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-xs active:scale-[0.98]"
                            >
                                <span>Autogenerar SKUs Ahora</span>
                                <ArrowRight size={14} />
                            </button>
                            <button
                                onClick={handleDismiss}
                                className="px-4 py-3 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl font-bold text-xs uppercase tracking-wider transition-all text-center active:scale-[0.98]"
                            >
                                Explorar Matriz
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>,
        document.body
    )
}