'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Store, FileText, Wallet, ArrowRight, X, Sparkles } from 'lucide-react'
import Link from 'next/link'

const features = [
    {
        id: 'pos',
        icon: Store,
        title: "Punto de Venta Dinámico",
        description: "Cobra en persona o redes sociales al instante. Multi-moneda y conectado a tu inventario real sin fricciones.",
        tag: "Operaciones"
    },
    {
        id: 'quotes',
        icon: FileText,
        title: "Cotizaciones Vivas",
        description: "Genera presupuestos con enlaces públicos. Si el cliente decide pagar mañana, el sistema calculará la tasa automáticamente.",
        tag: "Ventas"
    },
    {
        id: 'cash',
        icon: Wallet,
        title: "Conciliación de Caja",
        description: "Cierres de caja perfectos. Separa tu efectivo, Zelle y Pago Móvil. Descarga reportes contables sin depender de Excel.",
        tag: "Finanzas"
    }
]

export default function FeatureLaunchModal() {
    const [isOpen, setIsOpen] = useState(false)
    const [activeFeature, setActiveFeature] = useState(0)

    useEffect(() => {
        // Validación para que solo salga una vez
        const hasSeenUpdate = localStorage.getItem('preziso_v2_launch_seen')
        if (!hasSeenUpdate) {
            const timer = setTimeout(() => setIsOpen(true), 1200)
            return () => clearTimeout(timer)
        }
    }, [])

    // 🚀 MAGIA DINÁMICA: Auto-reproducción del showcase
    useEffect(() => {
        if (!isOpen) return
        const interval = setInterval(() => {
            setActiveFeature((prev) => (prev + 1) % features.length)
        }, 5000) // Cambia cada 5 segundos si el usuario no interactúa
        return () => clearInterval(interval)
    }, [isOpen])

    const handleClose = () => {
        setIsOpen(false)
        localStorage.setItem('preziso_v2_launch_seen', 'true')
    }

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 md:p-6">
                    {/* Fondo oscuro ultra-difuminado */}
                    <motion.div 
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }} 
                        exit={{ opacity: 0 }} 
                        onClick={handleClose}
                        className="absolute inset-0 bg-[#00000066] backdrop-blur-sm"
                    />
                    
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95, y: 20 }} 
                        animate={{ opacity: 1, scale: 1, y: 0 }} 
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                        // 🚀 SOMBRA ULTRA-DIFUMINADA, CERO BORDES, MUCHO BLANCO
                        className="relative bg-white w-full max-w-4xl rounded-[32px] overflow-hidden shadow-[0_40px_100px_-20px_rgba(0,0,0,0.15)] flex flex-col"
                    >
                        {/* HEADER LIMPIO */}
                        <div className="flex justify-between items-start pt-10 px-10 pb-6">
                            <div>
                                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-violet-50 text-[10px] font-black uppercase tracking-widest text-violet-600 rounded-full mb-4">
                                    <Sparkles size={12} /> Omnicanalidad Activada
                                </div>
                                <h2 className="text-3xl md:text-4xl font-black tracking-tight text-black leading-none">
                                    El control total <br className="hidden md:block"/>de tu dinero.
                                </h2>
                            </div>
                            <button 
                                onClick={handleClose} 
                                className="p-2.5 bg-[#FAFAFA] text-gray-400 hover:text-black hover:bg-gray-100 rounded-full transition-all active:scale-95"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* ÁREA INTERACTIVA DINÁMICA */}
                        <div className="flex flex-col md:flex-row px-10 pb-10 gap-10">
                            
                            {/* IZQUIERDA: Acordeón Suave */}
                            <div className="w-full md:w-1/2 flex flex-col justify-center gap-2">
                                {features.map((f, idx) => {
                                    const isActive = activeFeature === idx;
                                    return (
                                        <button
                                            key={f.id}
                                            onClick={() => setActiveFeature(idx)}
                                            className="text-left p-5 rounded-2xl transition-all duration-500 relative group outline-none"
                                        >
                                            {/* Fondo activo dinámico */}
                                            {isActive && (
                                                <motion.div 
                                                    layoutId="active-modal-feature" 
                                                    className="absolute inset-0 bg-[#FAFAFA] rounded-2xl -z-10" 
                                                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                                                />
                                            )}
                                            <h3 className={`text-sm font-black transition-colors duration-300 ${isActive ? 'text-black' : 'text-gray-400 group-hover:text-gray-600'}`}>
                                                {f.title}
                                            </h3>
                                            <AnimatePresence initial={false}>
                                                {isActive && (
                                                    <motion.div
                                                        initial={{ opacity: 0, height: 0 }}
                                                        animate={{ opacity: 1, height: 'auto' }}
                                                        exit={{ opacity: 0, height: 0 }}
                                                        transition={{ duration: 0.3, ease: "easeInOut" }}
                                                        className="overflow-hidden"
                                                    >
                                                        <p className="text-[13px] text-gray-500 font-medium leading-relaxed mt-2 pr-4">
                                                            {f.description}
                                                        </p>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </button>
                                    )
                                })}
                            </div>

                            {/* DERECHA: Visualizador Abstracto (Toque BlueViolet) */}
                            <div className="w-full md:w-1/2 bg-[#FAFAFA] rounded-[24px] p-8 flex items-center justify-center relative overflow-hidden min-h-[250px]">
                                {/* 🚀 GLOW ULTRA-DIFUMINADO BLUEVIOLET */}
                                <div className="absolute inset-0 flex items-center justify-center opacity-[0.12] pointer-events-none">
                                    <motion.div
                                        key={`glow-${activeFeature}`}
                                        initial={{ scale: 0.8, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        exit={{ scale: 1.2, opacity: 0 }}
                                        transition={{ duration: 1.5, ease: "easeOut" }}
                                        className="w-48 h-48 bg-violet-600 rounded-full blur-[50px]"
                                    />
                                </div>

                                <AnimatePresence mode="wait">
                                    <motion.div
                                        key={activeFeature}
                                        initial={{ y: 20, opacity: 0, filter: "blur(4px)" }}
                                        animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
                                        exit={{ y: -20, opacity: 0, filter: "blur(4px)" }}
                                        transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                                        className="relative z-10 flex flex-col items-center"
                                    >
                                        {/* Icono Flotante */}
                                        <div className="w-20 h-20 bg-white/80 backdrop-blur-xl rounded-2xl shadow-[0_20px_40px_-10px_rgba(138,43,226,0.15)] flex items-center justify-center text-violet-600 mb-6">
                                            {(() => {
                                                const Icon = features[activeFeature].icon
                                                return <Icon size={32} strokeWidth={1.5} />
                                            })()}
                                        </div>
                                        
                                        {/* Líneas UI Animadas (Esqueleto de Interfaz) */}
                                        <div className="w-32 h-2.5 bg-gray-200/60 rounded-full mb-3 overflow-hidden relative">
                                            <motion.div
                                                initial={{ x: '-100%' }}
                                                animate={{ x: 0 }}
                                                transition={{ duration: 1, delay: 0.2, ease: "easeOut" }}
                                                className="absolute inset-0 bg-violet-500/30 rounded-full"
                                            />
                                        </div>
                                        <div className="w-20 h-2.5 bg-gray-200/60 rounded-full" />
                                    </motion.div>
                                </AnimatePresence>
                            </div>

                        </div>

                        {/* FOOTER CALL TO ACTION */}
                        <div className="px-10 pb-10 flex flex-col sm:flex-row items-center gap-4">
                            <Link 
                                href="/admin/pos" 
                                onClick={handleClose} 
                                className="w-full sm:w-auto bg-black text-white px-8 py-4 rounded-full text-xs font-black uppercase tracking-widest hover:bg-violet-600 active:scale-[0.98] transition-all duration-300 flex items-center justify-center gap-2 shadow-[0_10px_30px_rgba(0,0,0,0.1)] hover:shadow-[0_10px_30px_rgba(138,43,226,0.3)]"
                            >
                                Iniciar Omnicanalidad <ArrowRight size={16} />
                            </Link>
                            <button 
                                onClick={handleClose} 
                                className="w-full sm:w-auto bg-transparent text-gray-500 px-8 py-4 rounded-full text-xs font-bold uppercase tracking-widest hover:text-black hover:bg-gray-50 transition-all active:scale-[0.98]"
                            >
                                Descartar
                            </button>
                        </div>

                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    )
}