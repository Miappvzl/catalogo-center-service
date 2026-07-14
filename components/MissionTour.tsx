'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { ChevronRight, X, Sparkles, Check } from 'lucide-react'
import { useEffect } from 'react'

interface MissionTourProps {
    isActive: boolean;
    currentStep: number;
    totalSteps: number;
    title: string;
    description: string;
    onNext: () => void;
    onCancel: () => void;
}

export default function MissionTour({ 
    isActive, 
    currentStep, 
    totalSteps, 
    title, 
    description, 
    onNext, 
    onCancel 
}: MissionTourProps) {
    
    useEffect(() => {
        if (isActive) {
            document.body.style.overflowX = 'hidden';
        } else {
            document.body.style.overflowX = 'auto';
        }
        return () => { document.body.style.overflowX = 'auto'; }
    }, [isActive]);

    if (!isActive) return null;

    const isLastStep = currentStep === totalSteps;

    return (
        <AnimatePresence>
            {/* 1. VELO OSCURO PREMIUM (Más sutil) */}
            <motion.div 
                key="velo-oscuro"
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }} 
                className="fixed inset-0 z-[50] bg-black/25 backdrop-blur-[1px]"
            />

            {/* 2. ISLA DINÁMICA DE APRENDIZAJE (Optimizado para Mobile) */}
            <motion.div 
                key="isla-dinamica"
                initial={{ opacity: 0, y: 30, x: '-50%', scale: 0.96 }} 
                animate={{ opacity: 1, y: 0, x: '-50%', scale: 1 }} 
                exit={{ opacity: 0, y: 30, x: '-50%', scale: 0.96 }}
                transition={{ type: "spring", damping: 28, stiffness: 350 }}
                className="fixed bottom-4 md:bottom-8 left-1/2 z-[70] w-[calc(100%-1.5rem)] max-w-[340px] md:max-w-[360px] bg-white rounded-[24px] p-5 md:p-6 shadow-[0_24px_50px_-12px_rgba(0,0,0,0.15)] border border-neutral-100/80"
            >
                {/* Botón Cerrar Minimalista (Blanco Hueso) */}
                <button 
                    onClick={onCancel} 
                    className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-900 transition-colors bg-[#FAFAFA] hover:bg-neutral-100 p-1.5 rounded-full border border-neutral-200/20"
                    title="Salir"
                >
                    <X size={14} strokeWidth={2.5} />
                </button>
                
                {/* Indicador de Progreso en Monocromo */}
                <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 bg-[#FAFAFA] text-neutral-800 rounded-lg flex items-center justify-center border border-neutral-200/50">
                        <Sparkles size={12} />
                    </div>
                    <div className="flex gap-1">
                        {Array.from({ length: totalSteps }).map((_, i) => (
                            <div 
                                key={i} 
                                className={`h-1 rounded-full transition-all duration-500 ${
                                    i + 1 === currentStep ? 'w-5 bg-neutral-900' : 
                                    i + 1 < currentStep ? 'w-2 bg-neutral-500' : 'w-2 bg-neutral-200'
                                }`}
                            />
                        ))}
                    </div>
                </div>
                
                {/* Textos con Contraste Editorial */}
                <h3 className="text-sm font-black text-gray-900 mb-1 tracking-tight">{title}</h3>
                <p className="text-[12px] text-gray-500 font-medium mb-5 leading-relaxed">
                    {description}
                </p>
                
                {/* Botón de Acción en Negro Puro */}
                <button 
                    onClick={onNext}
                    className="w-full py-3 bg-black text-white rounded-xl text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-1.5 hover:bg-neutral-800 transition-all active:scale-[0.98] shadow-md shadow-black/10"
                >
                    {isLastStep ? (
                        <>Completar <Check size={14} strokeWidth={2.5} /></>
                    ) : (
                        <>Siguiente <ChevronRight size={14} strokeWidth={2.5} /></>
                    )}
                </button>
            </motion.div>
        </AnimatePresence>
    )
}