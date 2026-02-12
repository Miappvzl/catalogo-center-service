'use client'

import { motion } from 'framer-motion'

export default function AmbientBackground() {
  // CONFIGURACIÓN DE ANIMACIÓN (MEMOIZED & TYPED)
  // El 'as const' soluciona el error de TypeScript con 'ease: "linear"'
  const floatAnimation = {
    animate: {
      transform: [
        "translate(0px, 0px) scale(1)",
        "translate(20px, -20px) scale(1.1)",
        "translate(-10px, 20px) scale(0.9)",
        "translate(0px, 0px) scale(1)"
      ]
    },
    transition: {
      duration: 15,
      repeat: Infinity,
      ease: "linear" as const // <--- ESTO ARREGLA EL ERROR TS2322
    }
  }

  return (
    <div className="fixed inset-0 -z-50 overflow-hidden pointer-events-none transform-gpu">
      {/* 1. LIENZO BASE */}
      <div className="absolute inset-0 bg-white dark:bg-[#020202] transition-colors duration-300"></div>

      {/* 2. SPOTLIGHTS OPTIMIZADOS 
          Usamos clases canónicas de Tailwind (w-200 = 800px) para silenciar los warnings.
      */}
      
      {/* Foco 1: Hero (Verde) */}
      <motion.div 
        {...floatAnimation}
        // Sobreescribimos solo la duración
        transition={{ ...floatAnimation.transition, duration: 20 }}
        className="absolute -top-[10%] -left-[10%] w-[60vh] h-[60vh] md:w-200 md:h-200 rounded-full will-change-transform opacity-40 dark:opacity-20"
        style={{
          background: 'radial-gradient(circle, rgba(16, 185, 129, 1) 0%, rgba(16, 185, 129, 0) 70%)',
        }}
      />

      {/* Foco 2: Features (Azul) */}
      <motion.div 
        {...floatAnimation}
        transition={{ ...floatAnimation.transition, duration: 25, delay: 2 }}
        className="absolute top-[30%] -right-[10%] w-[50vh] h-[50vh] md:w-[700px] md:h-[700px] rounded-full will-change-transform opacity-40 dark:opacity-20"
        style={{
          background: 'radial-gradient(circle, rgba(59, 130, 246, 1) 0%, rgba(59, 130, 246, 0) 70%)',
        }}
      />

      {/* Foco 3: Pricing (Violeta) */}
      <motion.div 
        {...floatAnimation}
        transition={{ ...floatAnimation.transition, duration: 30, delay: 5 }}
        className="absolute -bottom-[10%] left-[20%] w-[55vh] h-[55vh] md:w-[700px] md:h-[700px] rounded-full will-change-transform opacity-40 dark:opacity-20"
        style={{
          background: 'radial-gradient(circle, rgba(139, 92, 246, 1) 0%, rgba(139, 92, 246, 0) 70%)',
        }}
      />

      {/* 3. TEXTURA ESTÁTICA */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 dark:opacity-[0.03] brightness-100 contrast-150 mix-blend-overlay"></div>
    </div>
  )
}