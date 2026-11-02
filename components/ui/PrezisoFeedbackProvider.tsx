'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useFeedbackStore, FeedbackToastType, DialogVariant } from '@/app/store/useFeedBackStore'
import { CheckCircle2, AlertTriangle, AlertCircle, Info, Trash2, X, Clock, DollarSign } from 'lucide-react'

// Iconografía Semántica para Toasts
const ToastIcon = ({ type }: { type: FeedbackToastType }) => {
  switch (type) {
    case 'success':
      return <CheckCircle2 size={16} className="text-emerald-500 shrink-0" strokeWidth={2.5} />
    case 'error':
      return <AlertCircle size={16} className="text-rose-500 shrink-0" strokeWidth={2.5} />
    case 'warning':
      return <AlertTriangle size={16} className="text-amber-500 shrink-0" strokeWidth={2.5} />
    case 'info':
    default:
      return <Info size={16} className="text-sky-500 shrink-0" strokeWidth={2.5} />
  }
}

// Iconografía para Diálogos de Confirmación
const DialogIcon = ({ variant, customIcon }: { variant?: DialogVariant; customIcon?: string }) => {
  if (customIcon === 'trash') return <Trash2 size={20} className="text-rose-500" strokeWidth={2} />
  if (customIcon === 'clock') return <Clock size={20} className="text-amber-500" strokeWidth={2} />
  if (customIcon === 'dollar') return <DollarSign size={20} className="text-emerald-500" strokeWidth={2} />

  switch (variant) {
    case 'danger':
      return <AlertCircle size={20} className="text-rose-500" strokeWidth={2} />
    case 'warning':
      return <AlertTriangle size={20} className="text-amber-500" strokeWidth={2} />
    case 'info':
      return <Info size={20} className="text-sky-500" strokeWidth={2} />
    default:
      return <CheckCircle2 size={20} className="text-neutral-900 dark:text-white" strokeWidth={2} />
  }
}

export default function PrezisoFeedbackProvider() {
  const { toasts, removeToast, dialog, closeDialog } = useFeedbackStore()
  const [isDesktop, setIsDesktop] = useState(false)

  useEffect(() => {
    const checkViewport = () => setIsDesktop(window.innerWidth >= 768)
    checkViewport()
    window.addEventListener('resize', checkViewport, { passive: true })
    return () => window.removeEventListener('resize', checkViewport)
  }, [])

  // Cierre por tecla Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && dialog?.isOpen) {
        closeDialog(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [dialog, closeDialog])

  return (
    <>
      {/* ========================================================================= */}
      {/* 1. CONTENEDOR DE TOASTS DINÁMICOS (TOP-CENTER EN MÓVIL / TOP-RIGHT DESKTOP) */}
      {/* ========================================================================= */}
      <div 
        aria-live="polite"
        className="fixed top-4 inset-x-0 mx-auto max-w-[92vw] sm:max-w-sm sm:inset-x-auto sm:right-6 sm:left-auto z-99999 pointer-events-none flex flex-col gap-2.5"
      >
        <AnimatePresence mode="popLayout">
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -15, scale: 0.9, transition: { duration: 0.2 } }}
              transition={{ type: 'spring', damping: 26, stiffness: 350 }}
              className="pointer-events-auto w-full p-3.5 sm:p-4 rounded-[var(--radius-btn,16px)] border shadow-[0_12px_36px_rgba(0,0,0,0.12)] backdrop-blur-xl flex items-start justify-between gap-3 select-none"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--store-surface, #ffffff) 92%, transparent)',
                borderColor: 'color-mix(in srgb, var(--store-border, #e4e4e7) 65%, transparent)',
                color: 'var(--store-text-main, #000000)',
              }}
            >
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <div className="mt-0.5">
                  <ToastIcon type={t.type} />
                </div>
                <div className="space-y-0.5 min-w-0 flex-1 text-left">
                  <p className="text-xs font-bold leading-tight truncate">
                    {t.title}
                  </p>
                  {t.message && (
                    <p 
                      className="text-[11px] leading-snug line-clamp-2"
                      style={{ color: 'var(--store-surface-text, #71717a)' }}
                    >
                      {t.message}
                    </p>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => removeToast(t.id)}
                className="p-1 rounded-md opacity-50 hover:opacity-100 transition-opacity active:scale-90 shrink-0 cursor-pointer"
                aria-label="Cerrar notificación"
              >
                <X size={13} strokeWidth={2.5} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* ========================================================================= */}
      {/* 2. DIÁLOGO POLIMÓRFICO (BOTTOM SHEET EN MÓVIL / MODAL CENTRADO EN DESKTOP)  */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {dialog?.isOpen && (
          <div className="fixed inset-0 z-99999 flex items-end md:items-center justify-center p-0 md:p-4">
            {/* Backdrop Cinemático */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22 }}
              onClick={() => closeDialog(false)}
              className="absolute inset-0 bg-neutral-950/60 backdrop-blur-xs cursor-pointer"
            />

            {/* Panel de Diálogo */}
            <motion.div
              role="alertdialog"
              aria-modal="true"
              initial={isDesktop ? { opacity: 0, scale: 0.95, y: 15 } : { y: '100%' }}
              animate={isDesktop ? { opacity: 1, scale: 1, y: 0 } : { y: '0%' }}
              exit={isDesktop ? { opacity: 0, scale: 0.95, y: 15 } : { y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 350 }}
              className="relative w-full md:max-w-md overflow-hidden shadow-2xl z-10 border border-[var(--store-border,rgba(0,0,0,0.1))] p-6 sm:p-7 flex flex-col gap-5 text-left"
              style={{
                backgroundColor: 'var(--store-surface, #ffffff)',
                color: 'var(--store-text-main, #000000)',
                borderTopLeftRadius: 'var(--radius-card, 28px)',
                borderTopRightRadius: 'var(--radius-card, 28px)',
                borderBottomLeftRadius: isDesktop ? 'var(--radius-card, 28px)' : '0px',
                borderBottomRightRadius: isDesktop ? 'var(--radius-card, 28px)' : '0px',
              }}
            >
              {/* Tirador táctil en móvil (Drag Handle) */}
              <div className="md:hidden w-10 h-1 bg-neutral-300 dark:bg-neutral-700 rounded-full mx-auto -mt-2 mb-1 shrink-0" />

              {/* Cabecera con Micro-Etiqueta Editorial */}
              <div className="flex items-start gap-4">
                <div 
                  className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border"
                  style={{
                    backgroundColor: 'color-mix(in srgb, var(--store-bg, #fafafa) 60%, var(--store-surface, #ffffff))',
                    borderColor: 'color-mix(in srgb, var(--store-border, #e4e4e7) 50%, transparent)',
                  }}
                >
                  <DialogIcon variant={dialog.variant} customIcon={dialog.icon} />
                </div>

                <div className="space-y-1 min-w-0 flex-1">
                  <span 
                    className="text-[9px] font-mono font-bold uppercase tracking-widest block"
                    style={{ color: 'var(--store-surface-text, #71717a)' }}
                  >
                    {dialog.eyebrow || (dialog.variant === 'danger' ? '[ ATENCIÓN ]' : '[ NOTIFICACIÓN ]')}
                  </span>
                  <h3 className="text-base sm:text-lg font-black tracking-tight leading-tight">
                    {dialog.title}
                  </h3>
                </div>
              </div>

              {/* Cuerpo del Mensaje */}
              <p 
                className="text-xs sm:text-[13px] leading-relaxed font-normal"
                style={{ color: 'var(--store-surface-text, #71717a)' }}
              >
                {dialog.description}
              </p>

              {/* Acciones Asimétricas (Ley de Fitts) */}
              <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 pt-2">
                {dialog.cancelText && (
                  <button
                    type="button"
                    onClick={() => closeDialog(false)}
                    className="py-3 px-5 text-xs font-bold uppercase tracking-wider transition-colors active:scale-95 text-center cursor-pointer"
                    style={{
                      color: 'var(--store-surface-text, #71717a)',
                      borderRadius: 'var(--radius-btn, 12px)',
                    }}
                  >
                    {dialog.cancelText}
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => closeDialog(true)}
                  className="py-3.5 px-6 text-xs font-bold uppercase tracking-wider transition-all shadow-sm active:scale-[0.98] text-center flex items-center justify-center cursor-pointer"
                  style={{
                    backgroundColor: dialog.variant === 'danger' 
                      ? '#dc2626' 
                      : 'var(--store-primary, #000000)',
                    color: dialog.variant === 'danger' 
                      ? '#ffffff' 
                      : 'var(--store-primary-text, #ffffff)',
                    borderRadius: 'var(--radius-btn, 12px)',
                  }}
                >
                  {dialog.confirmText || 'Aceptar'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}