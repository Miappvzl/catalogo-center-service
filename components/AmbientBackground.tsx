'use client'

import { motion } from 'framer-motion'

export default function AmbientBackground() {
  // CONFIGURACIÓN DE ANIMACIÓN ULTRA-EFICIENTE (Solo opacidad)
  const pulseAnimation = {
    animate: {
      opacity: [0.35, 0.45, 0.35]
    },
    transition: {
      duration: 8,
      repeat: Infinity,
      ease: "easeInOut" as const
    }
  }

  return (
    <div className="fixed inset-0 -z-50 overflow-hidden pointer-events-none transform-gpu">
      {/* 1. LIENZO BASE */}
      <div className="absolute inset-0 bg-white dark:bg-[#020202] transition-colors duration-300"></div>

      {/* 2. SPOTLIGHTS ESTÁTICOS CON ANIMACIÓN DE OPACIDAD (GPU friendly) */}
      
      {/* Foco 1: Hero (Verde) */}
      <motion.div 
        {...pulseAnimation}
        transition={{ ...pulseAnimation.transition, duration: 10 }}
        className="absolute -top-[10%] -left-[10%] w-[60vh] h-[60vh] md:w-200 md:h-200 rounded-full opacity-40 dark:opacity-15"
        style={{
          background: 'radial-gradient(circle, rgba(16, 185, 129, 0.8) 0%, rgba(16, 185, 129, 0) 70%)',
          transform: 'translate3d(0,0,0)', // Fuerza renderizado por hardware
        }}
      />

      {/* Foco 2: Features (Azul) */}
      <motion.div 
        {...pulseAnimation}
        transition={{ ...pulseAnimation.transition, duration: 12, delay: 1 }}
        className="absolute top-[30%] -right-[10%] w-[50vh] h-[50vh] md:w-[700px] md:h-[700px] rounded-full opacity-40 dark:opacity-15"
        style={{
          background: 'radial-gradient(circle, rgba(59, 130, 246, 0.8) 0%, rgba(59, 130, 246, 0) 70%)',
          transform: 'translate3d(0,0,0)',
        }}
      />

      {/* Foco 3: Pricing (Violeta) */}
      <motion.div 
        {...pulseAnimation}
        transition={{ ...pulseAnimation.transition, duration: 14, delay: 2 }}
        className="absolute -bottom-[10%] left-[20%] w-[55vh] h-[55vh] md:w-[700px] md:h-[700px] rounded-full opacity-40 dark:opacity-15"
        style={{
          background: 'radial-gradient(circle, rgba(139, 92, 246, 0.8) 0%, rgba(139, 92, 246, 0) 70%)',
          transform: 'translate3d(0,0,0)',
        }}
      />

      {/* 3. TEXTURA ESTÁTICA OPTIMIZADA */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-5 dark:opacity-[0.02] brightness-100 contrast-120 mix-blend-overlay"></div>
    </div>
  )
}