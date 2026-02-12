'use client'

import { motion } from 'framer-motion'

export default function AmbientBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
      
      {/* --- ORBE 1: HERO (Arriba Izquierda) --- 
          Claro: Verde Menta Suave | Oscuro: Verde Neón Profundo 
      */}
      <motion.div 
        animate={{ 
          scale: [1, 1.1, 1],
          opacity: [0.3, 0.5, 0.3],
          x: [0, 20, 0],
          y: [0, -20, 0]
        }}
        transition={{ 
          duration: 10, 
          repeat: Infinity, 
          ease: "easeInOut" 
        }}
        className="absolute -top-[10%] -left-[10%] w-[500px] h-[500px] md:w-[800px] md:h-[800px] rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-[80px] md:blur-[120px] bg-green-200/50 dark:bg-green-900/20"
      />

      {/* --- ORBE 2: FEATURES (Medio Derecha) --- 
          Claro: Azul Cielo | Oscuro: Azul Eléctrico 
      */}
      <motion.div 
        animate={{ 
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.4, 0.3],
          x: [0, -30, 0]
        }}
        transition={{ 
          duration: 15, 
          repeat: Infinity, 
          ease: "easeInOut",
          delay: 2
        }}
        className="absolute top-[40%] -right-[20%] md:-right-[10%] w-[400px] h-[400px] md:w-[600px] md:h-[600px] rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-[80px] md:blur-[100px] bg-blue-100/60 dark:bg-blue-900/20"
      />

      {/* --- ORBE 3: PRICING (Abajo Izquierda) --- 
          Claro: Violeta Lavanda | Oscuro: Violeta Cyberpunk 
      */}
      <motion.div 
        animate={{ 
          scale: [1, 1.15, 1],
          opacity: [0.2, 0.4, 0.2],
          y: [0, 40, 0]
        }}
        transition={{ 
          duration: 12, 
          repeat: Infinity, 
          ease: "easeInOut",
          delay: 4
        }}
        className="absolute bottom-[10%] -left-[10%] w-[600px] h-[600px] rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-[100px] bg-purple-200/50 dark:bg-purple-900/20"
      />

      {/* --- Malla de Ruido (Opcional: da textura premium) --- */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 dark:opacity-10 brightness-100 dark:brightness-50 contrast-150 mix-blend-overlay"></div>
    </div>
  )
}