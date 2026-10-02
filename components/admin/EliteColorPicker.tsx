'use client'

import { useState, useRef, useEffect, useId } from 'react'
import { createPortal } from 'react-dom'
import { HexColorPicker, HexAlphaColorPicker } from 'react-colorful'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Check, Copy } from 'lucide-react'
import { toast } from 'sonner'

// Paleta curated de presets comerciales de alta conversión
const DEFAULT_PRESETS = [
  '#000000', '#FFFFFF', '#0C0D0E', '#262626', 
  '#737373', '#E5E5E5', '#2563EB', '#10B981', 
  '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'
]

interface EliteColorPickerProps {
  label: string
  value: string
  onChange: (color: string) => void
  description?: string
  enableAlpha?: boolean
  presets?: string[]
}

// Icono Pipeta Vectorial
function PipetteIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="m14 7 3 3m-1-4a2.828 2.828 0 0 1 4 4L7.5 22.5 2 24l1.5-5.5L16 6Z" />
      <path d="m18 10 3-3" />
    </svg>
  )
}

export default function EliteColorPicker({
  label,
  value,
  onChange,
  description,
  enableAlpha = false,
  presets = DEFAULT_PRESETS
}: EliteColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [inputVal, setInputVal] = useState(value)
  const [coords, setCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 })
  const triggerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Normalizador de formato Hex
  const normalizedValue = enableAlpha 
    ? (value.length === 7 ? `${value}ff` : value)
    : value.slice(0, 7)

  useEffect(() => {
    setInputVal(normalizedValue)
  }, [normalizedValue])

  // Cálculo de coordenadas contextuales para Desktop (fuera del panel con scroll)
  const updatePosition = () => {
    if (triggerRef.current && typeof window !== 'undefined') {
      const rect = triggerRef.current.getBoundingClientRect()
      const isDesktop = window.innerWidth >= 1024

      if (isDesktop) {
        // En desktop se posiciona a la derecha del botón, sin salirse de la pantalla
        const left = rect.right + 14
        const top = Math.max(16, Math.min(rect.top - 60, window.innerHeight - 460))
        setCoords({ top, left })
      }
    }
  }

  const handleOpen = () => {
    updatePosition()
    setIsOpen(true)
  }

  // EyeDropper API (Chromium)
  const hasEyeDropper = typeof window !== 'undefined' && 'EyeDropper' in window

  const handleEyeDropper = async () => {
    if (!hasEyeDropper) return
    try {
      // @ts-ignore
      const eyeDropper = new window.EyeDropper()
      const result = await eyeDropper.open()
      if (result?.sRGBHex) {
        const finalColor = enableAlpha ? `${result.sRGBHex}ff` : result.sRGBHex
        onChange(finalColor)
        toast.success(`Color ${result.sRGBHex} capturado`)
      }
    } catch {
      // Cancelado por el usuario
    }
  }

  // Validación de texto directo en el input
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value
    setInputVal(raw)
    const isValid = enableAlpha 
      ? /^#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/.test(raw)
      : /^#([0-9A-Fa-f]{6})$/.test(raw)
    if (isValid) {
      onChange(raw)
    }
  }

  // Alpha / Opacidad en porcentaje para vista rápida
  const alphaPct = enableAlpha && normalizedValue.length === 9
    ? Math.round((parseInt(normalizedValue.slice(7, 9), 16) / 255) * 100)
    : 100

  return (
    <div className="flex items-center justify-between p-3.5 rounded-2xl border border-neutral-200/60 hover:border-neutral-300 transition-colors bg-white shadow-[0_2px_10px_rgba(0,0,0,0.02)] group/row">
      <div className="flex flex-col pr-4 min-w-0">
        <p className="font-bold text-xs text-neutral-900 truncate">{label}</p>
        {description ? (
          <p className="text-[10px] text-neutral-500 mt-0.5 leading-relaxed font-medium">{description}</p>
        ) : (
          <p className="text-[10px] font-mono text-neutral-400 mt-0.5 uppercase font-semibold">
            {normalizedValue} {enableAlpha && `· ${alphaPct}%`}
          </p>
        )}
      </div>

      {/* Disparador de Color */}
      <div ref={triggerRef} className="flex items-center gap-2 shrink-0">
        {hasEyeDropper && (
          <motion.button
            type="button"
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            onClick={handleEyeDropper}
            className="w-8 h-8 rounded-full bg-neutral-50 hover:bg-neutral-100 text-neutral-600 hover:text-neutral-900 flex items-center justify-center border border-neutral-200/70 transition-all shadow-2xs cursor-pointer"
            title="Capturar color de la pantalla"
          >
            <PipetteIcon />
          </motion.button>
        )}

        <motion.button
          type="button"
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          onClick={handleOpen}
          className="relative w-9 h-9 rounded-full overflow-hidden border-2 border-white ring-1 ring-neutral-200 shadow-sm cursor-pointer"
          style={{
            backgroundImage: enableAlpha 
              ? 'linear-gradient(45deg, #e5e5e5 25%, transparent 25%), linear-gradient(-45deg, #e5e5e5 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e5e5e5 75%), linear-gradient(-45deg, transparent 75%, #e5e5e5 75%)'
              : 'none',
            backgroundSize: '6px 6px',
            backgroundPosition: '0 0, 0 3px, 3px -3px, -3px 0px'
          }}
        >
          <div className="absolute inset-0" style={{ backgroundColor: value }} />
        </motion.button>
      </div>

      {/* PORTAL OVERLAY: Cero cortes por overflow, 100% responsive */}
      {mounted && createPortal(
        <AnimatePresence>
          {isOpen && (
            <div className="fixed inset-0 z-[120] pointer-events-auto">
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsOpen(false)}
                className="absolute inset-0 bg-neutral-950/20 backdrop-blur-xs lg:bg-transparent lg:backdrop-blur-none"
              />

              {/* CONTENEDOR HÍBRIDO (Bottom Sheet en Móvil / Popover Flotante en Desktop) */}
              <motion.div
                initial={typeof window !== 'undefined' && window.innerWidth < 1024 
                  ? { y: '100%' } 
                  : { opacity: 0, scale: 0.95, y: -4 }}
                animate={typeof window !== 'undefined' && window.innerWidth < 1024 
                  ? { y: 0 } 
                  : { opacity: 1, scale: 1, y: 0 }}
                exit={typeof window !== 'undefined' && window.innerWidth < 1024 
                  ? { y: '100%' } 
                  : { opacity: 0, scale: 0.95, y: -4 }}
                transition={{ type: "spring", stiffness: 450, damping: 32 }}
                style={typeof window !== 'undefined' && window.innerWidth >= 1024 ? { top: coords.top, left: coords.left } : {}}
                className={`fixed bg-white border border-neutral-200/80 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.18)] z-10 overflow-hidden flex flex-col
                  inset-x-0 bottom-0 rounded-t-[2rem] max-h-[85vh] p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]
                  lg:inset-auto lg:bottom-auto lg:rounded-2xl lg:w-72 lg:p-4.5
                `}
              >
                {/* Drag Handle en Móvil */}
                <div className="w-12 h-1 bg-neutral-200 rounded-full mx-auto mb-3 lg:hidden shrink-0" />

                {/* Header del Popover */}
                <div className="flex items-center justify-between pb-3 border-b border-neutral-100 mb-3 shrink-0">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full border border-neutral-200 shadow-2xs" style={{ backgroundColor: value }} />
                    <span className="text-xs font-bold text-neutral-900 tracking-tight">{label}</span>
                  </div>
                  <button 
                    onClick={() => setIsOpen(false)}
                    className="p-1 text-neutral-400 hover:text-neutral-900 rounded-md transition-colors cursor-pointer"
                  >
                    <X size={15} />
                  </button>
                </div>

                {/* CANVAS REACT-COLORFUL ESTILIZADO */}
                <div className="custom-colorful-wrapper flex flex-col items-center w-full">
                  {enableAlpha ? (
                    <HexAlphaColorPicker color={normalizedValue} onChange={onChange} className="!w-full" />
                  ) : (
                    <HexColorPicker color={normalizedValue} onChange={onChange} className="!w-full" />
                  )}
                </div>

                {/* CONTROLES NUMÉRICOS & INPUT DIRECTO */}
                <div className="mt-3.5 pt-3 border-t border-neutral-100 flex items-center gap-2">
                  <div className="flex-1 flex items-center bg-neutral-50 border border-neutral-200/70 rounded-xl px-2.5 py-1.5 focus-within:bg-white focus-within:border-neutral-900 transition-colors">
                    <span className="text-[10px] font-mono font-bold text-neutral-400 mr-1">HEX</span>
                    <input
                      type="text"
                      value={inputVal}
                      onChange={handleInputChange}
                      className="w-full bg-transparent text-xs font-mono font-bold text-neutral-900 outline-none uppercase"
                      maxLength={enableAlpha ? 9 : 7}
                    />
                  </div>

                  {hasEyeDropper && (
                    <button
                      type="button"
                      onClick={handleEyeDropper}
                      className="p-2 bg-neutral-50 hover:bg-neutral-100 border border-neutral-200/70 rounded-xl text-neutral-700 hover:text-neutral-950 transition-all active:scale-95 cursor-pointer"
                      title="Pipeta"
                    >
                      <PipetteIcon />
                    </button>
                  )}
                </div>

                {/* PALETA DE PRESETS RÁPIDOS */}
                {presets.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-neutral-100">
                    <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-neutral-400 block mb-1.5">
                      Paleta Sugerida
                    </span>
                    <div className="grid grid-cols-6 gap-1.5">
                      {presets.map((color) => {
                        const isSelected = normalizedValue.toLowerCase() === color.toLowerCase()
                        return (
                          <button
                            key={color}
                            type="button"
                            onClick={() => onChange(enableAlpha ? `${color}ff` : color)}
                            className={`w-7 h-7 rounded-lg border border-neutral-200/80 transition-transform active:scale-90 flex items-center justify-center cursor-pointer shadow-2xs relative ${isSelected ? 'ring-2 ring-neutral-900 scale-95' : 'hover:scale-105'}`}
                            style={{ backgroundColor: color }}
                          >
                            {isSelected && (
                              <Check size={11} className={color.toLowerCase() === '#ffffff' ? 'text-black' : 'text-white'} strokeWidth={3} />
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Estilos CSS Inyectados para react-colorful (Garantía Awwwards) */}
      <style jsx global>{`
        .custom-colorful-wrapper .react-colorful {
          width: 100% !important;
          height: 160px !important;
          border-radius: 14px !important;
          border: none !important;
          box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.06) !important;
        }
        .custom-colorful-wrapper .react-colorful__saturation {
          border-radius: 12px 12px 0 0 !important;
        }
        .custom-colorful-wrapper .react-colorful__hue,
        .custom-colorful-wrapper .react-colorful__alpha {
          height: 12px !important;
          border-radius: 8px !important;
          margin-top: 10px !important;
        }
        .custom-colorful-wrapper .react-colorful__pointer {
          width: 18px !important;
          height: 18px !important;
          border-width: 2.5px !important;
          border-color: #ffffff !important;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.35) !important;
        }
      `}</style>
    </div>
  )
}