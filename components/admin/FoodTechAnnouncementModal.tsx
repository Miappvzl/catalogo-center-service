'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ArrowRight, Utensils, Check, ShieldCheck } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Props {
    storeType: string
}

const STORAGE_KEY = 'preziso_foodtech_announcement_v1'

export default function FoodTechAnnouncementModal({ storeType }: Props) {
    const [isOpen, setIsOpen] = useState(false)
    const router = useRouter()

    useEffect(() => {
        // Solo aplica a comercios en modo retail
        if (storeType !== 'retail') return

        const hasSeen = localStorage.getItem(STORAGE_KEY)
        if (!hasSeen) {
            // Breve retraso para una entrada suave tras cargar el dashboard
            const timer = setTimeout(() => setIsOpen(true), 1200)
            return () => clearTimeout(timer)
        }
    }, [storeType])

    const handleDismiss = () => {
        localStorage.setItem(STORAGE_KEY, 'true')
        setIsOpen(false)
    }

    const handleGoToSettings = () => {
        handleDismiss()
        router.push('/admin/settings')
    }

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-hidden">
                    {/* Fondo con desenfoque */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={handleDismiss}
                        className="absolute inset-0 bg-neutral-950/60 backdrop-blur-xs cursor-pointer"
                    />

                    {/* Contenedor del Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.96, y: 15 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.96, y: 15 }}
                        transition={{ type: "spring", damping: 30, stiffness: 350 }}
                        className="relative w-full max-w-xl bg-white rounded-2xl border border-neutral-200/80 shadow-2xl overflow-hidden flex flex-col max-h-[88vh] z-10 font-sans"
                    >
                        {/* Cabecera Fija */}
                        <div className="px-6 py-5 border-b border-neutral-100 flex items-start justify-between gap-4 bg-white shrink-0">
                            <div>
                                <span className="inline-block px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-neutral-100 text-neutral-800 border border-neutral-200/60 mb-2">
                                    Nuevo Motor Operativo
                                </span>
                                <h2 className="text-lg font-black text-neutral-900 tracking-tight leading-tight">
                                    Preziso FoodTech para Restaurantes
                                </h2>
                                <p className="text-xs text-neutral-500 font-medium mt-0.5">
                                    Una arquitectura especializada para gastronomía, delivery y cocina.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={handleDismiss}
                                className="p-1.5 text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors shrink-0"
                                title="Cerrar"
                            >
                                <X size={16} strokeWidth={2.2} />
                            </button>
                        </div>

                        {/* Cuerpo con Scroll Interno */}
                        <div className="p-6 overflow-y-auto no-scrollbar space-y-5 text-neutral-900">
                            <p className="text-xs text-neutral-600 leading-relaxed">
                                Hemos implementado un segundo motor dentro de la plataforma. Mientras tu tienda actual opera en modo <strong>Retail</strong> (inventario unitario por SKU, tallas y envíos nacionales), el nuevo modo <strong>FoodTech</strong> está diseñado exclusivamente para negocios de comida y bebidas.
                            </p>

                            {/* Módulos de Ventajas */}
                            <div className="space-y-3">
                                <h3 className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 font-mono">
                                    Capacidades del Motor Gastronómico
                                </h3>

                                <div className="p-3.5 rounded-xl border border-neutral-200/70 bg-neutral-50/50 space-y-1">
                                    <h4 className="text-xs font-bold text-neutral-900 flex items-center gap-1.5">
                                        <Check size={14} className="text-neutral-900 shrink-0" strokeWidth={2.5} />
                                        <span>Menú Continuo Líquido</span>
                                    </h4>
                                    <p className="text-[11px] text-neutral-600 leading-relaxed pl-5">
                                        Navegación fluida por categorías con scroll-spy automático, diseñada para abrir el apetito sin paginación tradicional de e-commerce.
                                    </p>
                                </div>

                                <div className="p-3.5 rounded-xl border border-neutral-200/70 bg-neutral-50/50 space-y-1">
                                    <h4 className="text-xs font-bold text-neutral-900 flex items-center gap-1.5">
                                        <Check size={14} className="text-neutral-900 shrink-0" strokeWidth={2.5} />
                                        <span>Modificadores de Cocina y Porciones</span>
                                    </h4>
                                    <p className="text-[11px] text-neutral-600 leading-relaxed pl-5">
                                        Configuración de términos de cocción, tamaños de porción, extras con costo adicional, ingredientes a remover y notas especiales para cocina.
                                    </p>
                                </div>

                                <div className="p-3.5 rounded-xl border border-neutral-200/70 bg-neutral-50/50 space-y-1">
                                    <h4 className="text-xs font-bold text-neutral-900 flex items-center gap-1.5">
                                        <Check size={14} className="text-neutral-900 shrink-0" strokeWidth={2.5} />
                                        <span>Checkout Gastronómico Multimodal</span>
                                    </h4>
                                    <p className="text-[11px] text-neutral-600 leading-relaxed pl-5">
                                        Soporte para servicio en mesa (Dine-in), retiro en barra y delivery local, con selección de propinas y comanda térmica estructurada para WhatsApp.
                                    </p>
                                </div>
                            </div>

                            {/* Advertencia de Dominio */}
                            <div className="p-4 rounded-xl border border-neutral-200 bg-neutral-100/60 flex items-start gap-3">
                                <ShieldCheck size={16} className="text-neutral-900 shrink-0 mt-0.5" />
                                <div className="space-y-0.5">
                                    <p className="text-xs font-bold text-neutral-900">¿Debes cambiar tu comercio?</p>
                                    <p className="text-[11px] text-neutral-600 leading-relaxed">
                                        Si vendes ropa, calzado, tecnología, repuestos o productos que se despachan por agencias de encomienda, <strong>mantén tu tienda en Modo Retail</strong>. Solo activa el modo Restaurante si operas un negocio gastronómico.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Pie de Acciones */}
                        <div className="px-6 py-4 border-t border-neutral-100 bg-neutral-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
                            <button
                                type="button"
                                onClick={handleDismiss}
                                className="w-full sm:w-auto px-4 py-2.5 text-xs font-bold text-neutral-600 hover:text-neutral-900 transition-colors uppercase tracking-wider text-center"
                            >
                                Mantener Modo Retail
                            </button>

                            <button
                                type="button"
                                onClick={handleGoToSettings}
                                className="w-full sm:w-auto px-5 py-2.5 bg-neutral-950 hover:bg-black text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
                            >
                                <span>Ver en Configuración</span>
                                <ArrowRight size={13} strokeWidth={2.5} />
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    )
}