'use client'

export default function AmbientBackground() {
  return (
    <div className="fixed inset-0 -z-50 overflow-hidden pointer-events-none transform-gpu">
      {/* 1. LIENZO BASE */}
      <div className="absolute inset-0 bg-white dark:bg-[#020202] transition-colors duration-300" />

      {/* 2. SPOTLIGHTS ESTÁTICOS DE COMPOSICIÓN ÚNICA (Zero Active GPU Frames) */}
      
      {/* Foco 1: Hero (Verde) */}
      <div
        className="absolute -top-[10%] -left-[10%] w-[60vh] h-[60vh] md:w-200 md:h-200 rounded-full opacity-40 dark:opacity-15"
        style={{
          background: 'radial-gradient(circle, rgba(16, 185, 129, 0.8) 0%, rgba(16, 185, 129, 0) 70%)',
          transform: 'translate3d(0,0,0)',
        }}
      />

      {/* Foco 2: Features (Azul) */}
      <div
        className="absolute top-[30%] -right-[10%] w-[50vh] h-[50vh] md:w-[700px] md:h-[700px] rounded-full opacity-40 dark:opacity-15"
        style={{
          background: 'radial-gradient(circle, rgba(59, 130, 246, 0.8) 0%, rgba(59, 130, 246, 0) 70%)',
          transform: 'translate3d(0,0,0)',
        }}
      />

      {/* Foco 3: Pricing (Violeta) */}
      <div
        className="absolute -bottom-[10%] left-[20%] w-[55vh] h-[55vh] md:w-[700px] md:h-[700px] rounded-full opacity-40 dark:opacity-15"
        style={{
          background: 'radial-gradient(circle, rgba(139, 92, 246, 0.8) 0%, rgba(139, 92, 246, 0) 70%)',
          transform: 'translate3d(0,0,0)',
        }}
      />

      {/* 3. TEXTURA ESTÁTICA (Sin mix-blend-overlay para evitar readbacks de framebuffer en scroll) */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.035] dark:opacity-[0.018]" />
    </div>
  )
}