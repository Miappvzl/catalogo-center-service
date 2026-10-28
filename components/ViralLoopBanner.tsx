'use client'

import { motion } from 'framer-motion'
import { ArrowUpRight } from 'lucide-react'

interface ViralLoopBannerProps {
  /** Opcional: si la tienda está en modo oscuro para alternar el logo blanco/negro */
  isStoreDark?: boolean
}

export default function ViralLoopBanner({ isStoreDark = true }: ViralLoopBannerProps) {
  return (
    <div className="mt-8 pt-6 border-t border-[var(--store-border)]/40 w-full flex justify-center relative z-20">
      <motion.a
        href="https://preziso.shop?utm_source=tienda_cliente&utm_medium=success_screen&utm_campaign=viral_loop"
        target="_blank"
        rel="noopener noreferrer"
        initial="rest"
        whileHover="hover"
        whileTap="tap"
        variants={{
          rest: { scale: 1 },
          hover: { scale: 1 },
          tap: { scale: 0.96 }
        }}
        className="group relative inline-grid grid-cols-[auto_auto_auto] items-stretch border border-[var(--store-border)] bg-[var(--store-surface)]/20 overflow-hidden max-w-[95vw] sm:max-w-none shadow-none"
      >
        {/* Celda 1: Hook Psicológico Post-Compra (Rodillo Automático) */}
        <div className="relative overflow-hidden flex items-center justify-center px-3 md:px-4 py-2 md:py-2.5 border-r border-[var(--store-border)] bg-[var(--store-surface)]/30">
          <motion.div
            animate={{ y: ["0%", "0%", "-50%", "-50%", "0%"] }}
            transition={{
              duration: 4.5,
              repeat: Infinity,
              ease: [0.76, 0, 0.24, 1],
              times: [0, 0.4, 0.5, 0.9, 1]
            }}
            className="absolute top-0 left-0 w-full flex flex-col justify-between pointer-events-none"
            style={{ height: "200%" }}
          >
            <span className="h-1/2 flex items-center justify-center text-[9px] md:text-[10px] font-bold uppercase tracking-[0.12em] md:tracking-[0.18em] text-[var(--store-text-main)] whitespace-nowrap px-2 md:px-3">
              <span className="sm:hidden">¿Te gustó esta fluidez?</span>
              <span className="hidden sm:block">¿Te gustó esta experiencia?</span>
            </span>
            
            <span className="h-1/2 flex items-center justify-center text-[9px] md:text-[10px] font-black uppercase tracking-[0.12em] md:tracking-[0.18em] text-[var(--store-text-main)] whitespace-nowrap px-2 md:px-3">
              <span className="sm:hidden">Crea tu tienda con</span>
              <span className="hidden sm:block">Crea la tienda de tu marca con</span>
            </span>
          </motion.div>
          
          {/* Spacer para prevenir Layout Shift */}
          <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-[0.12em] md:tracking-[0.18em] opacity-0 whitespace-nowrap pointer-events-none px-2 md:px-3">
            <span className="sm:hidden">¿Te gustó esta fluidez?</span>
            <span className="hidden sm:block">Crea la tienda de tu marca con</span>
          </span>
        </div>

        {/* Celda 2: Logo Adaptativo */}
        <div className="relative flex items-center justify-center px-3 md:px-5 py-2 md:py-2.5 border-r border-[var(--store-border)] bg-transparent overflow-hidden">
          <motion.div
            variants={{
              rest: { scaleY: 0, originY: 1 },
              hover: { scaleY: 1, originY: 1 },
              tap: { scaleY: 1, originY: 1 }
            }}
            transition={{ duration: 0.4, ease: [0.76, 0, 0.24, 1] }}
            className="absolute inset-0 bg-[var(--store-text-main)]/[0.05]"
          />
          <div className="relative z-10 h-[22px] md:h-[26px] w-auto flex items-center justify-center shrink-0 transition-transform duration-500 ease-out group-hover:scale-[1.03]">
            <img
              src={isStoreDark ? "/pezisologow.png" : "/pezisologo.png"}
              alt="Preziso"
              className="h-full w-auto object-contain transition-opacity duration-300"
              loading="lazy"
            />
          </div>
        </div>

        {/* Celda 3: Flecha con Acento Verde */}
        <div className="relative flex items-center justify-center w-11 md:w-14 h-full bg-transparent overflow-hidden text-[var(--store-surface-text)] group-hover:text-[var(--store-text-main)] group-active:text-[var(--store-text-main)] transition-colors duration-300">
          <motion.div
            variants={{
              rest: { x: 0, y: 0 },
              hover: { x: 20, y: -20 },
              tap: { x: 20, y: -20 }
            }}
            transition={{ duration: 0.4, ease: [0.76, 0, 0.24, 1] }}
            className="absolute"
          >
            <ArrowUpRight size={15} strokeWidth={2} />
          </motion.div>
          
          <motion.div
            variants={{
              rest: { x: -20, y: 20 },
              hover: { x: 0, y: 0 },
              tap: { x: 0, y: 0 }
            }}
            transition={{ duration: 0.4, ease: [0.76, 0, 0.24, 1], delay: 0.04 }}
            className="absolute"
          >
            <ArrowUpRight size={15} strokeWidth={2.5} />
          </motion.div>
        </div>
      </motion.a>
    </div>
  )
}