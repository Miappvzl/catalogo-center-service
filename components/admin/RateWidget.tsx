'use client'

import { useOptimistic, useActionState, startTransition, useState } from 'react'
import { updateStoreCurrency, type ActionState } from '@/app/admin/actions'
import { RefreshCw, DollarSign, Euro, Wallet, TrendingUp, TrendingDown, Minus, X, Activity, Zap } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'

interface RateWidgetProps {
  storeCurrency?: 'usd' | 'eur'
  usdRate?: number
  eurRate?: number
  prevUsdRate?: number
  prevEurRate?: number
  lastUpdated?: string | null
}

const initialState: ActionState = { success: false, message: '' }

export default function RateWidget({ 
  storeCurrency = 'usd',
  usdRate = 0,
  eurRate = 0,
  prevUsdRate = 0,
  prevEurRate = 0,
  lastUpdated = null
}: RateWidgetProps) {
  const [state, formAction, isPending] = useActionState(updateStoreCurrency, initialState)
  const [optimisticCurrency, setOptimisticCurrency] = useOptimistic(
    storeCurrency,
    (current, newCurrency: 'usd' | 'eur') => newCurrency
  )
  const [isModalOpen, setIsModalOpen] = useState(false)

  const activeRate = optimisticCurrency === 'usd' ? Number(usdRate) : Number(eurRate)
  const activePrevRate = optimisticCurrency === 'usd' ? Number(prevUsdRate) : Number(prevEurRate)
  
  const deltaBs = activeRate - activePrevRate
  const isUp = deltaBs > 0
  const isDown = deltaBs < 0
  const isStable = deltaBs === 0

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
      <section className="bg-white p-5 md:p-6 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.02)] border border-neutral-200/60 flex flex-col justify-between h-full relative group">
          <div>
              <header className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-[#F6F6F6] text-neutral-900 flex items-center justify-center shrink-0 border border-neutral-100">
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

                  <button 
                      type="button"
                      onClick={() => setIsModalOpen(true)}
                      className="flex flex-col items-end shrink-0 pb-1 cursor-pointer group/sparkline transition-all active:scale-95 outline-none"
                      title="Ver auditoría de fluctuación cambiaria"
                  >
                      <div className={`flex items-center gap-1 text-[10px] font-mono font-bold mb-1 group-hover/sparkline:translate-x-0.5 transition-transform ${isUp ? 'text-rose-600' : isDown ? 'text-emerald-600' : 'text-neutral-400'}`}>
                          {isUp ? <TrendingUp size={11} strokeWidth={2.5} /> : isDown ? <TrendingDown size={11} strokeWidth={2.5} /> : <Minus size={11} strokeWidth={2.5} />}
                          <span>{isStable ? 'Estable' : `${isUp ? '+' : ''}${deltaBs.toFixed(2)} Bs`}</span>
                      </div>
                      
                      <svg className="w-20 h-7 text-[#0C0D0E] overflow-visible" viewBox="0 0 80 28" fill="none">
                          <defs>
                              <linearGradient id="rateSparkObsidian" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor="#0C0D0E" stopOpacity="0.12" />
                                  <stop offset="100%" stopColor="#0C0D0E" stopOpacity="0" />
                              </linearGradient>
                          </defs>
                          <path d={isStable ? "M0,14 L80,14" : isUp ? "M0,24 Q20,20 38,15 T60,10 T80,3" : "M0,3 Q20,10 38,15 T60,20 T80,24"} fill="none" stroke="#0C0D0E" strokeWidth="2" strokeLinecap="round" />
                          <path d={isStable ? "M0,14 L80,14 L80,28 L0,28 Z" : isUp ? "M0,24 Q20,20 38,15 T60,10 T80,3 L80,28 L0,28 Z" : "M0,3 Q20,10 38,15 T60,20 T80,24 L80,28 L0,28 Z"} fill="url(#rateSparkObsidian)" />
                          <circle cx="80" cy={isStable ? "14" : isUp ? "3" : "24"} r="2.5" fill="#FFFFFF" stroke="#0C0D0E" strokeWidth="2" />
                      </svg>
                  </button>
              </div>
          </div>

          <div className="relative flex bg-[#F6F6F6] border border-neutral-100 p-1 rounded-lg shrink-0 mt-3 w-full">
              <div 
                  className={`absolute top-1 bottom-1 w-[calc(50%-0.25rem)] bg-white rounded-md shadow-xs border border-neutral-200/50 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
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

      {/* Modal de auditoría */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-neutral-950/30 backdrop-blur-xs" />
            <motion.div initial={{ opacity: 0, scale: 0.97, y: 6 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.98, y: 4 }} className="relative bg-white w-[calc(100vw-2rem)] max-w-[360px] rounded-xl overflow-hidden shadow-lg border border-neutral-200/50 flex flex-col max-h-[85vh] z-10">
              <div className="px-5 py-4 flex justify-between items-center border-b border-neutral-100 bg-neutral-50/50 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-white border border-neutral-200/50 flex items-center justify-center text-neutral-900 shadow-xs"><Activity size={14} /></div>
                  <div>
                    <h3 className="font-bold text-xs text-neutral-900 uppercase tracking-wider">Reporte de Fluctuación</h3>
                    <p className="text-[9px] font-mono text-neutral-500 uppercase tracking-wider">Impacto Cambiario</p>
                  </div>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-1.5 text-neutral-400 hover:text-neutral-900 rounded-md transition-colors"><X size={14} /></button>
              </div>
              <div className="p-5 space-y-4">
                <div className="bg-neutral-50 border border-neutral-200/50 rounded-lg p-3 flex justify-between items-center">
                    <div>
                        <p className="text-[9px] font-mono font-semibold text-neutral-400 uppercase tracking-wider">Anterior</p>
                        <p className="font-mono font-bold text-neutral-600 text-xs">Bs {activePrevRate.toFixed(2)}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-[9px] font-mono font-semibold text-neutral-900 uppercase tracking-wider">Hoy</p>
                        <p className="font-mono font-bold text-neutral-900 text-sm">Bs {activeRate.toFixed(2)}</p>
                    </div>
                </div>
                <p className="text-xs text-neutral-600 leading-relaxed font-normal">
                    {isStable ? "Tasa estable. No hay impacto financiero." : "Preziso ha recalculado automáticamente los precios en Bolívares según la variación BCV."}
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}