'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Palette, ArrowRight, X, LayoutTemplate } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function ThemeEngineAnnouncement() {
    const [isOpen, setIsOpen] = useState(false)
    const router = useRouter()

    useEffect(() => {
        // Verificamos si el usuario ya vio el anuncio
        const hasSeenAnnouncement = localStorage.getItem('preziso_theme_engine_announced')
        
        if (!hasSeenAnnouncement) {
            // Un micro-retraso de 800ms para que la app cargue primero y el modal se sienta como un evento
            const timer = setTimeout(() => {
                setIsOpen(true)
            }, 800)
            return () => clearTimeout(timer)
        }
    }, [])

    const handleClose = () => {
        setIsOpen(false)
        // Guardamos en memoria para no volver a molestarlo
        localStorage.setItem('preziso_theme_engine_announced', 'true')
    }

    const handleNavigate = () => {
        handleClose()
        // Le damos 300ms para que la animación de salida termine antes de redirigir
        setTimeout(() => {
            router.push('/admin/customization')
        }, 300)
    }

    return (
        <AnimatePresence>
            {isOpen && (
                // 🚀 Z-Index altísimo y padding inferior (pb-28) para esquivar la Bottom Bar en Mobile
                <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 pb-28 md:pb-4">
                    
                    {/* BACKDROP BLUR */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.4 }}
                        className="absolute inset-0 bg-neutral-900/40 backdrop-blur-sm"
                        onClick={handleClose}
                    />

                    {/* MODAL CARD */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="relative w-full max-w-[400px] bg-white rounded-[2rem] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.3)] overflow-hidden flex flex-col"
                    >
                        {/* Botón de Cerrar Sutil */}
                        <button 
                            onClick={handleClose}
                            className="absolute top-4 right-4 z-20 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white/70 hover:text-white transition-colors backdrop-blur-md active:scale-90"
                        >
                            <X size={16} strokeWidth={2.5} />
                        </button>

                        {/* 🎨 HEADER VISUAL (Dark Engineering Look) */}
                        <div className="relative bg-neutral-950 pt-10 pb-8 px-6 flex flex-col items-center justify-center overflow-hidden">
                            {/* Patrón de fondo sutil */}
                            <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '16px 16px' }} />
                            
                            {/* Glow central */}
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-white/10 blur-2xl rounded-full pointer-events-none" />

                            <motion.div 
                                initial={{ scale: 0, rotate: -15 }}
                                animate={{ scale: 1, rotate: 0 }}
                                transition={{ type: "spring", damping: 20, stiffness: 300, delay: 0.2 }}
                                className="relative z-10 w-16 h-16 bg-white/10 border border-white/20 backdrop-blur-xl rounded-2xl flex items-center justify-center shadow-2xl mb-4"
                            >
                                <Sparkles className="text-white w-8 h-8" strokeWidth={1.5} />
                            </motion.div>

                            <span className="relative z-10 text-[10px] font-mono font-bold text-neutral-400 uppercase tracking-widest border border-neutral-700/50 bg-neutral-900/50 px-3 py-1 rounded-full">
                                Actualización v2.0
                            </span>
                        </div>

                        {/* 📝 CONTENIDO Y COPY */}
                        <div className="p-8 flex flex-col items-center text-center bg-white">
                            <h2 className="text-2xl font-black text-neutral-900 tracking-tight leading-none mb-3">
                                El Studio de Diseño <br/> ha llegado.
                            </h2>
                            <p className="text-sm text-neutral-500 font-medium leading-relaxed mb-8 px-2">
                                Transforma la apariencia de tu tienda en segundos. Nuevos arquetipos premium, control total de colores y una experiencia de clase mundial.
                            </p>

                            {/* CTAs */}
                            <div className="w-full flex flex-col gap-3">
                                <button 
                                    onClick={handleNavigate}
                                    className="w-full bg-neutral-950 text-white px-6 py-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-all shadow-[0_8px_20px_rgba(0,0,0,0.12)] hover:bg-black group"
                                >
                                    <Palette size={18} className="text-neutral-400 group-hover:text-white transition-colors" /> 
                                    <span>Explorar el Studio</span>
                                    <ArrowRight size={16} className="ml-1 group-hover:translate-x-1 transition-transform" />
                                </button>
                                
                                <button 
                                    onClick={handleClose}
                                    className="w-full py-3 text-xs font-bold text-neutral-400 hover:text-neutral-900 transition-colors active:scale-95"
                                >
                                    Quizás más tarde
                                </button>
                            </div>
                        </div>
                    </motion.div>

                </div>
            )}
        </AnimatePresence>
    )
}