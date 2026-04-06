'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Palette, ArrowRight, X, Sparkles } from 'lucide-react'
import Link from 'next/link'

export default function FeatureAnnouncement() {
    const [isOpen, setIsOpen] = useState(false)

    useEffect(() => {
        // Buscamos la llave secreta en el navegador del usuario
        const hasSeenModal = localStorage.getItem('preziso_design_feature_seen')
        
        if (!hasSeenModal) {
            // Retraso psicológico de 800ms para que el usuario aterrice en el dashboard primero
            const timer = setTimeout(() => setIsOpen(true), 800)
            return () => clearTimeout(timer)
        }
    }, [])

    const handleClose = () => {
        // Marcamos como visto para siempre
        localStorage.setItem('preziso_design_feature_seen', 'true')
        setIsOpen(false)
    }

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
                    {/* Fondo oscuro con Blur */}
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={handleClose}
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                    />

                    {/* El Modal Físico */}
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="relative bg-white w-full max-w-md rounded-[24px] p-1 overflow-hidden shadow-2xl"
                    >
                        {/* Botón de Cerrar */}
                        <button 
                            onClick={handleClose}
                            className="absolute top-4 right-4 z-10 p-2 bg-white/50 backdrop-blur hover:bg-gray-100 rounded-full text-gray-500 transition-colors"
                        >
                            <X size={18} strokeWidth={2.5} />
                        </button>

                        {/* Contenido Visual */}
                        <div className="bg-gray-50 rounded-[20px] p-8 flex flex-col items-center text-center border border-gray-100 relative overflow-hidden">
                            {/* Efecto de luz de fondo */}
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-32 bg-gradient-to-b from-purple-500/10 to-transparent pointer-events-none"></div>

                            <div className="w-16 h-16 bg-white rounded-2xl shadow-sm border border-gray-100 flex items-center justify-center mb-6 relative">
                                <Palette size={28} className="text-black" />
                                <Sparkles size={16} className="text-purple-500 absolute -top-2 -right-2 animate-pulse" />
                            </div>

                            <span className="text-[10px] font-black uppercase tracking-widest text-purple-600 mb-2">Nueva Actualización</span>
                            <h2 className="text-2xl font-black text-gray-900 tracking-tight leading-none mb-3">
                                Nuevo Motor de Diseño
                            </h2>
                            <p className="text-sm text-gray-500 leading-relaxed max-w-[280px]">
                                Ahora tienes control total sobre los colores, incentivos y superficies de tu tienda. Adapta Preziso 100% a la identidad de tu marca.
                            </p>

                            <div className="w-full mt-8 flex flex-col gap-2">
                                <Link 
                                    href="/admin/customization" 
                                    onClick={handleClose}
                                    className="w-full bg-black text-white py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-gray-800 transition-colors active:scale-95"
                                >
                                    Ir al Panel de Diseño <ArrowRight size={16} />
                                </Link>
                                <button 
                                    onClick={handleClose}
                                    className="w-full py-3 rounded-xl font-bold text-xs text-gray-400 hover:text-gray-900 transition-colors"
                                >
                                    Explorar luego
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    )
}