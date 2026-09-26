'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { X, Loader2, Store, Utensils, Check, AlertCircle } from 'lucide-react'

interface Props {
    isOpen: boolean
    onClose: () => void
    onConfirm: () => void
    currentType: 'retail' | 'restaurant'
    loading: boolean
}

export default function SwitchStoreTypeModal({
    isOpen,
    onClose,
    onConfirm,
    currentType,
    loading
}: Props) {
    if (!isOpen) return null

    const isCurrentlyRestaurant = currentType === 'restaurant'
    const targetTypeLabel = isCurrentlyRestaurant ? 'Comercio General (Retail)' : 'Restaurante (FoodTech)'

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-hidden">
                {/* Fondo oscuro */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={loading ? undefined : onClose}
                    className="absolute inset-0 bg-neutral-950/60 backdrop-blur-xs cursor-pointer"
                />

                {/* Contenedor del Modal */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.96, y: 15 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96, y: 15 }}
                    transition={{ type: "spring", damping: 30, stiffness: 350 }}
                    className="relative w-full max-w-xl bg-white rounded-2xl border border-neutral-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] z-10 font-sans"
                >
                    {/* Header */}
                    <div className="px-6 py-5 border-b border-neutral-100 flex items-start justify-between gap-4 bg-white shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-neutral-100 border border-neutral-200 flex items-center justify-center shrink-0 text-neutral-900">
                                {isCurrentlyRestaurant ? <Store size={18} /> : <Utensils size={18} />}
                            </div>
                            <div>
                                <h3 className="text-base font-black text-neutral-900 tracking-tight leading-none">
                                    {isCurrentlyRestaurant 
                                        ? 'Transición a Comercio General' 
                                        : 'Transición a Modo Restaurante'}
                                </h3>
                                <p className="text-xs text-neutral-500 font-medium mt-1">
                                    Reconfiguración de la arquitectura de venta de tu catálogo.
                                </p>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={onClose}
                            disabled={loading}
                            className="p-1.5 text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors shrink-0 disabled:opacity-40"
                        >
                            <X size={16} strokeWidth={2.2} />
                        </button>
                    </div>

                    {/* Contenido con Scroll */}
                    <div className="p-6 overflow-y-auto no-scrollbar space-y-5">
                        
                        {/* 1. Transformaciones del Catálogo */}
                        <div className="space-y-2">
                            <h4 className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 font-mono">
                                Qué cambiará en tu tienda
                            </h4>

                            <div className="p-4 rounded-xl border border-neutral-200/80 bg-neutral-50/50 space-y-2.5">
                                {isCurrentlyRestaurant ? (
                                    <>
                                        <div className="flex items-start gap-2.5">
                                            <Check size={14} className="text-neutral-900 shrink-0 mt-0.5" strokeWidth={2.5} />
                                            <p className="text-xs text-neutral-700 leading-relaxed">
                                                Tu tienda adoptará el diseño de catálogo tradicional por colecciones y productos con tallas y colores.
                                            </p>
                                        </div>
                                        <div className="flex items-start gap-2.5">
                                            <Check size={14} className="text-neutral-900 shrink-0 mt-0.5" strokeWidth={2.5} />
                                            <p className="text-xs text-neutral-700 leading-relaxed">
                                                Se reactivará la logística de envíos por agencias nacionales (MRW, Zoom, Tealca).
                                            </p>
                                        </div>
                                        <div className="flex items-start gap-2.5">
                                            <Check size={14} className="text-neutral-900 shrink-0 mt-0.5" strokeWidth={2.5} />
                                            <p className="text-xs text-neutral-700 leading-relaxed">
                                                Se aplicará la plantilla Universal de comercio preservando tu logotipo y banners.
                                            </p>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="flex items-start gap-2.5">
                                            <Check size={14} className="text-neutral-900 shrink-0 mt-0.5" strokeWidth={2.5} />
                                            <p className="text-xs text-neutral-700 leading-relaxed">
                                                Tu catálogo adoptará navegación gastronómica continua y carril de categorías con scroll-spy.
                                            </p>
                                        </div>
                                        <div className="flex items-start gap-2.5">
                                            <Check size={14} className="text-neutral-900 shrink-0 mt-0.5" strokeWidth={2.5} />
                                            <p className="text-xs text-neutral-700 leading-relaxed">
                                                El editor de productos activará la creación de modificadores (términos, extras y notas de cocina) en lugar de tallas.
                                            </p>
                                        </div>
                                        <div className="flex items-start gap-2.5">
                                            <Check size={14} className="text-neutral-900 shrink-0 mt-0.5" strokeWidth={2.5} />
                                            <p className="text-xs text-neutral-700 leading-relaxed">
                                                El checkout habilitará consumo en mesa (Dine-in), pickup y delivery local con propinas.
                                            </p>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* 2. Resguardo de Datos */}
                        <div className="space-y-2">
                            <h4 className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 font-mono">
                                Integridad de tus datos
                            </h4>
                            <p className="text-xs text-neutral-600 leading-relaxed">
                                Tus productos creados, historial de órdenes, balances contables y base de clientes <strong>permanecerán intactos</strong>. Esta operación únicamente adapta la interfaz de compra y la operativa de pedidos.
                            </p>
                        </div>

                        {/* 3. Advertencia Estricta */}
                        <div className="p-3.5 rounded-xl border border-neutral-300 bg-neutral-100 flex items-start gap-2.5">
                            <AlertCircle size={15} className="text-neutral-900 shrink-0 mt-0.5" />
                            <p className="text-[11px] text-neutral-800 leading-relaxed">
                                <strong>Importante:</strong> Solo confirma este cambio si tu comercio opera bajo el modelo de {targetTypeLabel}.
                            </p>
                        </div>
                    </div>

                    {/* Footer de Acciones */}
                    <div className="px-6 py-4 border-t border-neutral-100 bg-neutral-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={loading}
                            className="w-full sm:w-auto px-4 py-2.5 text-xs font-bold text-neutral-500 hover:text-neutral-900 transition-colors uppercase tracking-wider text-center"
                        >
                            Cancelar
                        </button>

                        <button
                            type="button"
                            onClick={onConfirm}
                            disabled={loading}
                            className="w-full sm:w-auto px-5 py-2.5 bg-neutral-950 hover:bg-black text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-sm active:scale-95 disabled:opacity-50"
                        >
                            {loading ? (
                                <>
                                    <Loader2 size={14} className="animate-spin" />
                                    <span>Aplicando transición...</span>
                                </>
                            ) : (
                                <span>Activar {targetTypeLabel}</span>
                            )}
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    )
}