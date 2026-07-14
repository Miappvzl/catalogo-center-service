'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter, useSearchParams } from 'next/navigation'
import { Sparkles, ArrowRight } from 'lucide-react'
import confetti from 'canvas-confetti'

export default function WelcomeModal({ storeName }: { storeName: string }) {
    const [isOpen, setIsOpen] = useState(false)
    const searchParams = useSearchParams()
    const router = useRouter()

    useEffect(() => {
        if (searchParams.get('welcome') === 'true') {
            setIsOpen(true)
            // Disparamos un confeti sutil de bienvenida
            setTimeout(() => {
                confetti({ particleCount: 100, spread: 60, origin: { y: 0.5 }, colors: ['#000', '#666', '#e5e5e5'] })
            }, 400)
        }
    }, [searchParams])

    const handleClose = () => {
        setIsOpen(false)
        // Limpiamos la URL sin recargar la página para que no vuelva a salir si refresca
        router.replace('/admin', { scroll: false })
    }

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    {/* Velo difuminado */}
                    <motion.div 
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }} 
                        exit={{ opacity: 0 }} 
                        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
                    />

                    {/* Tarjeta Premium */}
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95, y: 20 }} 
                        animate={{ opacity: 1, scale: 1, y: 0 }} 
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="relative w-full max-w-md bg-white rounded-[24px] p-8 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.2)] border border-neutral-100 text-center overflow-hidden"
                    >
                        {/* Decoración de fondo */}
                        <div className="absolute -top-10 -right-10 text-neutral-50 rotate-12 pointer-events-none">
                            <Sparkles size={140} strokeWidth={1} />
                        </div>

                        <div className="relative z-10 flex flex-col items-center">
                            <div className="w-14 h-14 bg-neutral-900 text-white rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-neutral-900/20">
                                <Sparkles size={24} />
                            </div>
                            
                            <h2 className="text-2xl font-black text-gray-900 tracking-tight mb-3">
                                ¡Bienvenido a Preziso!
                            </h2>
                            
                            <p className="text-sm text-gray-500 font-medium leading-relaxed mb-8">
                                Es un placer tener al equipo de <strong className="text-gray-900">{storeName}</strong> a bordo. Hemos preparado una academia interactiva para que domines tu catálogo y configures tu tienda en menos de 5 minutos.
                            </p>

                            <button 
                                onClick={handleClose}
                                className="w-full h-12 bg-black text-white rounded-xl font-bold text-sm uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-neutral-800 active:scale-[0.98] transition-all shadow-md"
                            >
                                Iniciar Academia <ArrowRight size={16} />
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    )
}