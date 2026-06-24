'use client'

import { useOptimistic, useActionState, startTransition } from 'react'
import { updateStoreCurrency, type ActionState } from '@/app/admin/actions'
import { RefreshCw, DollarSign, Euro, Wallet } from 'lucide-react'

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
    // 1. Eliminación del borde sólido: de 'border border-gray-200/60' a un contenedor limpio.
    <section className="bg-white p-6 rounded-[var(--radius-card)] flex flex-col justify-between h-full relative group">
        
        <div>
            {/* 2. Cabecera alineada a la regla de Polaridad Activa y Jerarquía Editorial */}
            <header className="flex items-center gap-4 mb-6">
                <div className="w-11 h-11 rounded-[var(--radius-btn)] bg-[#f6f6f6] text-gray-900 flex items-center justify-center shrink-0 transition-colors duration-300">
                    <Wallet size={18} strokeWidth={2.2} />
                </div>
                <div>
                    <h2 className="text-xs font-black text-gray-900 uppercase tracking-widest leading-none">
                        Tasa Activa
                    </h2>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1.5">
                        {optimisticCurrency === 'usd' ? 'BCV / Paralelo' : 'Banco Central (EUR)'}
                    </p>
                </div>
            </header>
            
            <div className="mb-6">
                <div className="flex items-baseline gap-1 mb-1">
                    {/* 3. Animación Pending Refinada: Transición de color fluida sin perder legibilidad */}
                    <span className={`text-4xl font-black tracking-tighter tabular-nums transition-colors duration-500 ease-in-out ${isPending ? 'text-gray-300' : 'text-gray-900'}`}>
                        <span className={`text-2xl mr-1 transition-colors duration-500 ${isPending ? 'text-gray-200' : 'text-gray-400'}`}>Bs</span>
                        {activeRate.toFixed(2)}
                    </span>
                </div>
                
                <div className="flex items-center gap-1.5 mt-2 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                    <RefreshCw className={`w-3 h-3 ${isPending ? "animate-spin text-gray-900" : "opacity-70"}`} />
                    <span className={`${isPending ? 'text-gray-900' : ''} transition-colors duration-300`}>
                        {isPending ? 'Sincronizando...' : (lastUpdated ? `Últ. actualización: ${lastUpdated}` : 'Actualización: N/A')}
                    </span>
                </div>
            </div>
        </div>

        {/* 4. SELECTOR SEGMENTADO (Clean Look: Cero bordes, profundidad por sombra sutil) */}
        <div className="relative flex bg-[#F6F6F6] p-1 rounded-xl shrink-0">
            
            {/* Raíl Deslizante: Elevación skeuomórfica sutil */}
            <div 
                className={`absolute top-1 bottom-1 w-[calc(50%-0.25rem)] bg-white rounded-lg shadow-[0_2px_12px_rgba(0,0,0,0.06)] transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                    optimisticCurrency === 'usd' ? 'translate-x-0' : 'translate-x-full'
                }`}
            />

            <button
                type="button"
                onClick={() => handleCurrencyChange('usd')}
                disabled={isPending}
                className={`relative z-10 flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all duration-300 cursor-pointer ${
                    optimisticCurrency === 'usd' ? "text-gray-900" : "text-gray-400 hover:text-gray-600"
                }`}
            >
                <DollarSign size={14} strokeWidth={2.5} /> USD
            </button>
            
            <button
                type="button"
                onClick={() => handleCurrencyChange('eur')}
                disabled={isPending}
                className={`relative z-10 flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all duration-300 cursor-pointer ${
                    optimisticCurrency === 'eur' ? "text-gray-900" : "text-gray-400 hover:text-gray-600"
                }`}
            >
                <Euro size={14} strokeWidth={2.5} /> EUR
            </button>
        </div>
    </section>
  )
}