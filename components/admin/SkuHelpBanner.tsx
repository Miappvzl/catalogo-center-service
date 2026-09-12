'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { HelpCircle, X, Check, Barcode, Layers, ArrowDown } from 'lucide-react'

interface SkuHelpBannerProps {
    isOpen: boolean
    onClose: () => void
}

export default function SkuHelpBanner({ isOpen, onClose }: SkuHelpBannerProps) {
    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                    animate={{ opacity: 1, height: 'auto', marginBottom: 16 }}
                    exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden"
                >
                    <div className="bg-neutral-900 text-white rounded-2xl p-5 md:p-6 border border-neutral-800 shadow-sm relative">
                        {/* Botón Cerrar */}
                        <button 
                            onClick={onClose}
                            className="absolute top-4 right-4 p-1.5 text-neutral-400 hover:text-white rounded-full bg-neutral-800/80 hover:bg-neutral-800 transition-colors"
                        >
                            <X size={14} />
                        </button>

                        <div className="flex items-center gap-2 mb-3">
                            <div className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center text-white">
                                <HelpCircle size={14} />
                            </div>
                            <h3 className="font-bold text-xs uppercase tracking-wider text-neutral-200">
                                Guía Rápida de Gestión de SKUs
                            </h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                            <div className="space-y-1 bg-white/5 p-3.5 rounded-xl border border-white/10">
                                <p className="font-bold text-white flex items-center gap-1.5">
                                    <Barcode size={13} className="text-neutral-400" />
                                    <span>¿Qué es un SKU?</span>
                                </p>
                                <p className="text-neutral-300 text-[11px] leading-relaxed font-normal">
                                    Es el código alfanumérico único (ej: <span className="font-mono text-white font-bold tracking-widest bg-white/10 px-1 py-0.2 rounded">CAL-ZAP-A1B2</span>) que identifica a un producto o variante en tu inventario.
                                </p>
                            </div>

                            <div className="space-y-1 bg-white/5 p-3.5 rounded-xl border border-white/10">
                                <p className="font-bold text-white flex items-center gap-1.5">
                                    <ArrowDown size={13} className="text-neutral-400" />
                                    <span>Navegación Rápida</span>
                                </p>
                                <p className="text-neutral-300 text-[11px] leading-relaxed font-normal">
                                    Haz clic en cualquier casilla, escribe el código y pulsa <kbd className="font-mono bg-white/20 px-1 rounded text-white font-bold">Enter</kbd> para guardar y pasar automáticamente a la fila de abajo.
                                </p>
                            </div>

                            <div className="space-y-1 bg-white/5 p-3.5 rounded-xl border border-white/10">
                                <p className="font-bold text-white flex items-center gap-1.5">
                                    <Layers size={13} className="text-neutral-400" />
                                    <span>Impacto en WhatsApp</span>
                                </p>
                                <p className="text-neutral-300 text-[11px] leading-relaxed font-normal">
                                    Al completar una orden, el ticket de WhatsApp imprimirá el SKU exacto de cada artículo para que el preparador del paquete no tenga dudas.
                                </p>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}