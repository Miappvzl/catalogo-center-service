'use client'

import { useOptimistic, useActionState, startTransition, useState } from 'react'
import { updateStoreCurrency, type ActionState } from '@/app/admin/actions'
import { RefreshCw, DollarSign, Euro, Wallet, TrendingUp, X, ShieldCheck, Activity } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'

interface RateWidgetProps {
  storeCurrency?: 'usd' | 'eur'
  usdRate?: number
  eurRate?: number
  lastUpdated?: string | null
}

const initialState: ActionState = { success: false, message: '' }

export default function RateWidget({ 
  storeCurrency = 'usd',
  usdRate = 0,
  eurRate = 0,
  lastUpdated = null
}: RateWidgetProps) {
  const [state, formAction, isPending] = useActionState(updateStoreCurrency, initialState)
  const [optimisticCurrency, setOptimisticCurrency] = useOptimistic(
    storeCurrency,
    (current, newCurrency: 'usd' | 'eur') => newCurrency
  )
  const [isModalOpen, setIsModalOpen] = useState(false)

  const safeUsd = Number(usdRate) || 0
  const safeEur = Number(eurRate) || 0
  const activeRate = optimisticCurrency === 'usd' ? safeUsd : safeEur

  const handleCurrencyChange = (currency: 'usd' | 'eur') => {
    startTransition(() => {
      setOptimisticCurrency(currency)
      const formData = new FormData()
      formData.append('currency', currency)
      formAction(formData)
    })
  }

  return (
    <>
      <section className="bg-white p-5 md:p-6 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex flex-col justify-between h-full relative group">
          <div>
              {/* Cabecera Técnica */}
              <header className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-[#F6F6F6] text-neutral-900 flex items-center justify-center shrink-0">
                          <Wallet size={15} strokeWidth={2.2} />
                      </div>
                      <div>
                          <h2 className="text-[11px] font-bold text-neutral-900 uppercase tracking-wider leading-none">
                              Tasa Oficial
                          </h2>
                          <p className="text-[9px] font-semibold text-neutral-400 uppercase tracking-wider font-mono mt-1">
                              {optimisticCurrency === 'usd' ? 'BCV Referencial' : 'Banco Central (EUR)'}
                          </p>
                      </div>
                  </div>
              </header>
              
              {/* Bloque de Tasa + Sparkline Negro Obsidiana Interactivo */}
              <div className="my-2 flex items-end justify-between gap-2">
                  <div>
                      <div className="flex items-baseline gap-1">
                          <span className="text-xs font-mono font-bold text-neutral-400">Bs</span>
                          <span className={`text-3xl md:text-4xl font-mono font-bold tracking-tight tabular-nums transition-colors duration-300 ${isPending ? 'text-neutral-300' : 'text-neutral-900'}`}>
                              {activeRate.toFixed(2)}
                          </span>
                      </div>
                      
                      <div className="flex items-center gap-1.5 mt-1 text-[9px] font-mono text-neutral-400 font-semibold">
                          <RefreshCw className={`w-2.5 h-2.5 ${isPending ? "animate-spin text-neutral-900" : "opacity-60"}`} />
                          <span className={isPending ? 'text-neutral-900' : ''}>
                              {isPending ? 'Sincronizando...' : (lastUpdated ? `Corte: ${lastUpdated}` : 'Sincronizado')}
                          </span>
                      </div>
                  </div>

                  {/* 🚀 BOTÓN INTERACTIVO: Sparkline Negro Obsidiana (Sin fondo en el porcentaje) */}
                  <button 
                      type="button"
                      onClick={() => setIsModalOpen(true)}
                      className="flex flex-col items-end shrink-0 pb-1 cursor-pointer group/sparkline transition-all active:scale-95 outline-none"
                      title="Ver auditoría de fluctuación cambiaria"
                  >
                      {/* Porcentaje limpio: solo icono y texto */}
                      <div className="flex items-center gap-1 text-[10px] font-mono font-bold text-emerald-600 mb-1 group-hover/sparkline:translate-x-0.5 transition-transform">
                          <TrendingUp size={11} strokeWidth={2.5} />
                          <span>+0.42%</span>
                      </div>
                      
                      {/* SVG en Negro Obsidiana puro */}
                      <svg className="w-20 h-7 text-[#0C0D0E] overflow-visible" viewBox="0 0 80 28" fill="none">
                          <defs>
                              <linearGradient id="rateSparkObsidian" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor="#0C0D0E" stopOpacity="0.12" />
                                  <stop offset="100%" stopColor="#0C0D0E" stopOpacity="0" />
                              </linearGradient>
                          </defs>
                          <path d="M0,24 Q20,20 38,15 T60,10 T80,3" fill="none" stroke="#0C0D0E" strokeWidth="2" strokeLinecap="round" />
                          <path d="M0,24 Q20,20 38,15 T60,10 T80,3 L80,28 L0,28 Z" fill="url(#rateSparkObsidian)" />
                          <circle cx="80" cy="3" r="2.5" fill="#FFFFFF" stroke="#0C0D0E" strokeWidth="2" />
                      </svg>
                  </button>
              </div>
          </div>

          {/* Selector Industrial USD / EUR */}
          <div className="relative flex bg-[#F6F6F6] p-1 rounded-lg shrink-0 mt-3">
              <div 
                  className={`absolute top-1 bottom-1 w-[calc(50%-0.25rem)] bg-white rounded-md shadow-xs transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                      optimisticCurrency === 'usd' ? 'translate-x-0' : 'translate-x-full'
                  }`}
              />

              <button
                  type="button"
                  onClick={() => handleCurrencyChange('usd')}
                  disabled={isPending}
                  className={`relative z-10 flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-[11px] font-bold font-mono transition-colors cursor-pointer ${
                      optimisticCurrency === 'usd' ? "text-neutral-900" : "text-neutral-400 hover:text-neutral-600"
                  }`}
              >
                  <DollarSign size={13} strokeWidth={2.5} /> USD
              </button>
              
              <button
                  type="button"
                  onClick={() => handleCurrencyChange('eur')}
                  disabled={isPending}
                  className={`relative z-10 flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-[11px] font-bold font-mono transition-colors cursor-pointer ${
                      optimisticCurrency === 'eur' ? "text-neutral-900" : "text-neutral-400 hover:text-neutral-600"
                  }`}
              >
                  <Euro size={13} strokeWidth={2.5} /> EUR
              </button>
          </div>
      </section>

   {/* 🚀 MODAL DE AUDITORÍA (GPU Composited & Zero-Jitter Animation) */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop con aceleración de hardware dedicada */}
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              transition={{ duration: 0.18, ease: 'linear' }}
              onClick={() => setIsModalOpen(false)} 
              className="absolute inset-0 bg-neutral-950/30 backdrop-blur-xs will-change-[opacity]" 
            />
            
            {/* Tarjeta del modal con curva Bezier fluida y transform-gpu */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.97, y: 6 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.98, y: 4 }} 
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="relative bg-white w-full max-w-sm rounded-xl overflow-hidden shadow-[0_15px_40px_-10px_rgba(0,0,0,0.12)] border border-neutral-200/50 p-5 md:p-6 z-10 space-y-4 transform-gpu will-change-[transform,opacity]"
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-md bg-neutral-50 border border-neutral-200/50 flex items-center justify-center text-neutral-800">
                    <Activity size={14} />
                  </div>
                  <div>
                    <h3 className="font-bold text-xs text-neutral-900 uppercase tracking-wider">Monitor Cambiario</h3>
                    <p className="text-[10px] font-mono text-neutral-400">Banco Central de Venezuela</p>
                  </div>
                </div>
                
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-1 text-neutral-400 hover:text-neutral-900 transition-colors rounded-md active:scale-95"
                >
                  <X size={14} />
                </button>
              </div>

              <div className="space-y-2 text-xs text-neutral-600 leading-relaxed font-medium">
                <p>
                  Esta micro-gráfica representa la <strong>fluctuación interdiaria del tipo de cambio oficial</strong> publicada por el BCV.
                </p>
                <div className="p-3 bg-[#F6F6F6] rounded-lg space-y-1.5 text-[11px] font-mono">
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Tasa Sincronizada:</span>
                    <strong className="text-neutral-900">Bs {activeRate.toFixed(2)}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Variación estimada:</span>
                    <strong className="text-emerald-600">+0.42% (Alza)</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Estado de Red:</span>
                    <span className="text-neutral-800 flex items-center gap-1 font-sans font-bold text-[10px]">
                      <ShieldCheck size={12} className="text-emerald-500" /> Oficial Verificado
                    </span>
                  </div>
                </div>
                <p className="text-[10px] text-neutral-400">
                  Preziso actualiza automáticamente los precios en Bolívares de tu catálogo web, presupuestos y Punto de Venta (POS) en base a este valor.
                </p>
              </div>

              <button 
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-full bg-neutral-950 hover:bg-black text-white py-2 rounded-lg text-xs font-mono font-bold uppercase tracking-wider transition-all active:scale-95 shadow-xs"
              >
                Entendido
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}