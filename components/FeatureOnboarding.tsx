// Archivo: components/FeatureOnboarding.tsx
'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { TrendingUp, Wallet, Settings2, ArrowRight, X } from 'lucide-react'

const steps = [
    {
        id: 1,
        icon: TrendingUp,
        title: "Nueva herramienta de crecimiento.",
        copy: "Acabamos de implementar un motor de Adquisición Viral. Ahora puedes convertir a tus clientes en promotores de tu marca, pagando comisiones solo cuando te traigan ventas reales. Cero riesgo."
    },
    {
        id: 2,
        icon: Wallet,
        title: "Tu directorio B2B.",
        copy: "En tu menú lateral verás una nueva pestaña llamada 'Comisiones'. Allí tendrás un directorio con tus promotores y un libro mayor para liquidar sus pagos con un solo clic."
    },
    {
        id: 3,
        icon: Settings2,
        title: "Tú tienes el control.",
        copy: "El sistema está apagado por defecto. Cuando estés listo, ve a 'Configuración > Reglas de Negocio', enciéndelo y define el porcentaje. Tus clientes verán la invitación al comprar."
    }
]

export default function FeatureOnboarding() {
    const [isOpen, setIsOpen] = useState(false)
    const [currentStep, setCurrentStep] = useState(0)
    const [isMounted, setIsMounted] = useState(false)

    useEffect(() => {
        setIsMounted(true)
        // Verificamos si ya vio el tutorial
        const hasSeenTutorial = localStorage.getItem('preziso_onboarding_v2')
        if (!hasSeenTutorial) {
            // Un pequeño delay para que la pantalla de admin cargue primero
            const timer = setTimeout(() => setIsOpen(true), 1000)
            return () => clearTimeout(timer)
        }
    }, [])

    const handleClose = () => {
        localStorage.setItem('preziso_onboarding_v2', 'true')
        setIsOpen(false)
    }

    const handleNext = () => {
        if (currentStep < steps.length - 1) {
            setCurrentStep(prev => prev + 1)
        } else {
            handleClose()
        }
    }

    // Evitamos errores de hidratación en Next.js
    if (!isMounted) return null

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
                    {/* Velo de fondo oscuro con blur */}
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={handleClose}
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                    />

                    {/* Tarjeta del Modal (Clean Look) */}
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        transition={{ type: "spring", duration: 0.5, bounce: 0 }}
                        className="relative w-full max-w-[400px] bg-white rounded-[2rem] p-8 md:p-10 shadow-xl overflow-hidden flex flex-col"
                    >
                        {/* Botón superior para cerrar/omitir rápidamente */}
                        <button 
                            onClick={handleClose}
                            className="absolute top-6 right-6 text-gray-400 hover:text-black transition-colors"
                        >
                            <X size={20} strokeWidth={1.5} />
                        </button>

                        {/* Contenedor animado para el contenido de los pasos */}
                        <div className="relative min-h-[220px]">
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={currentStep}
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.3, ease: "circOut" }}
                                    className="absolute inset-0 flex flex-col"
                                >
                                    {/* Ícono de sección */}
                                    <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center mb-6 border border-gray-100">
                                        {(() => {
                                            const Icon = steps[currentStep].icon
                                            return <Icon size={22} strokeWidth={1.5} className="text-black" />
                                        })()}
                                    </div>
                                    
                                    {/* Textos */}
                                    <h3 className="text-xl font-black text-black tracking-tight mb-3">
                                        {steps[currentStep].title}
                                    </h3>
                                    <p className="text-sm font-medium text-gray-500 leading-relaxed">
                                        {steps[currentStep].copy}
                                    </p>
                                </motion.div>
                            </AnimatePresence>
                        </div>

                        {/* Footer con controles (Paginación y Botones) */}
                        <div className="mt-8 pt-6 border-t border-gray-100 flex items-center justify-between">
                            
                            {/* Puntos indicadores (Dots) */}
                            <div className="flex gap-1.5">
                                {steps.map((_, index) => (
                                    <div 
                                        key={index} 
                                        className={`h-1.5 rounded-full transition-all duration-300 ${
                                            index === currentStep ? 'w-4 bg-black' : 'w-1.5 bg-gray-200'
                                        }`}
                                    />
                                ))}
                            </div>

                            {/* Botones de acción */}
                            <div className="flex items-center gap-3">
                                {currentStep === 0 && (
                                    <button 
                                        onClick={handleClose}
                                        className="text-xs font-bold text-gray-400 hover:text-black px-2 transition-colors"
                                    >
                                        Omitir
                                    </button>
                                )}
                                <button 
                                    onClick={handleNext}
                                    className="bg-black text-white px-5 py-2.5 rounded-xl text-xs font-bold tracking-widest uppercase hover:bg-gray-800 active:scale-95 transition-all flex items-center gap-2"
                                >
                                    {currentStep === steps.length - 1 ? '¡A Crecer!' : 'Siguiente'}
                                    {currentStep !== steps.length - 1 && <ArrowRight size={14} strokeWidth={2} />}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    )
}