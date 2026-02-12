'use client'

import { motion } from 'framer-motion'

export default function AmbientBackground() {
  return (
    <div className="fixed inset-0 -z-50 overflow-hidden pointer-events-none">
      {/* 1. LIENZO BASE (Blanco Puro / Negro Profundo) */}
      <div className="absolute inset-0 bg-white dark:bg-[#020202] transition-colors duration-300"></div>

      {/* 2. SPOTLIGHTS (Paleta: Emerald - Indigo - Violet) */}
      
      {/* Foco 1: Hero - EL DINERO (Verde Esmeralda / Teal) 
          Transmite: Crecimiento, Dólares, Éxito.
      */}
      <motion.div 
        animate={{ 
          scale: [1, 1.1, 1],
          x: [0, 30, 0],
          y: [0, -30, 0],
        }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -top-[50px] -left-[50px] w-[500px] h-[500px] md:w-[600px] md:h-[600px] opacity-70 dark:opacity-40"
        style={{
          // Light: Un verde azulado fresco. Dark: Un esmeralda intenso.
          background: 'radial-gradient(circle at center, rgba(16, 185, 129, 0.8) 0%, rgba(16, 185, 129, 0) 60%)', 
          filter: 'blur(60px)',
        }}
      />

      {/* Foco 2: Features - LA TECNOLOGÍA (Azul Índigo / Cian)
          Transmite: Seguridad, Software, Nube.
      */}
      <motion.div 
        animate={{ 
          scale: [1, 1.2, 1],
          x: [0, -40, 0],
        }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        className="absolute top-[35%] -right-[100px] w-[450px] h-[450px] md:w-[600px] md:h-[600px] opacity-60 dark:opacity-30"
        style={{
          // Light: Azul cielo corporativo. Dark: Azul eléctrico.
          background: 'radial-gradient(circle at center, rgba(59, 130, 246, 0.8) 0%, rgba(59, 130, 246, 0) 60%)',
          filter: 'blur(70px)',
        }}
      />

      {/* Foco 3: Pricing - LO PREMIUM (Violeta / Magenta)
          Transmite: Exclusividad, Modernidad, Magia.
      */}
      <motion.div 
        animate={{ 
          scale: [1, 1.15, 1],
          y: [0, 40, 0],
        }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        className="absolute -bottom-[50px] left-[10%] w-[550px] h-[550px] opacity-50 dark:opacity-25"
        style={{
          // Light: Lavanda suave. Dark: Violeta profundo.
          background: 'radial-gradient(circle at center, rgba(139, 92, 246, 0.8) 0%, rgba(139, 92, 246, 0) 60%)',
          filter: 'blur(80px)',
        }}
      />

      {/* 3. MALLA DE RUIDO (Noise) 
          Esto es clave para que no se vea "barato". Le da textura de papel moneda/film.
      */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 dark:opacity-20 brightness-100 contrast-150 mix-blend-overlay"></div>
    </div>
  )
}