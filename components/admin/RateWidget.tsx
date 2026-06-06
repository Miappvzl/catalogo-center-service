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
    <section className="bg-white p-6 rounded-[var(--radius-card)] flex flex-col justify-between h-full border border-gray-200/60">
        
        <div>
            <header className="flex items-center gap-3 mb-5">
                <div className="p-2.5 bg-[#F6F6F6] rounded-xl text-black">
                    <Wallet size={20} strokeWidth={2} />
                </div>
                <div>
                    <h2 className="text-base font-black text-gray-900 leading-tight">
                        Tasa Activa
                    </h2>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                        {optimisticCurrency === 'usd' ? 'BCV / Paralelo' : 'Banco Central (EUR)'}
                    </p>
                </div>
            </header>
            
            <div className="mb-6">
                <div className="flex items-baseline gap-1 mb-1">
                    {/* El efecto de parpadeo lento y sofisticado cuando isPending es true */}
                    <span className={`text-4xl font-black text-gray-900 tracking-tighter tabular-nums transition-all duration-700 ease-in-out ${isPending ? 'opacity-30 animate-[pulse_1.5s_ease-in-out_infinite]' : 'opacity-100'}`}>
                        <span className="text-2xl text-gray-400 mr-1">Bs</span>
                        {activeRate.toFixed(2)}
                    </span>
                </div>
                
                <div className="flex items-center gap-1.5 mt-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                    <RefreshCw className={`w-3 h-3 ${isPending ? "animate-spin text-black" : "opacity-70"}`} />
                    <span className={`${isPending ? 'text-black' : ''} transition-colors`}>
                        {isPending ? 'Sincronizando...' : (lastUpdated ? `Última actualización: ${lastUpdated}` : 'Última actualización: N/A')}
                    </span>
                </div>
            </div>
        </div>

        {/* SELECTOR SEGMENTADO (Estilo Sliding Pill) */}
        <div className="relative flex bg-[#F6F6F6] p-1 rounded-xl shrink-0">
            
            {/* El fondo dinámico que se desliza (La magia está en el cubic-bezier) */}
            <div 
                className={`absolute top-1 bottom-1 w-[calc(50%-0.25rem)] bg-white rounded-lg shadow-sm border border-gray-200/50 transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                    optimisticCurrency === 'usd' ? 'translate-x-0' : 'translate-x-full'
                }`}
            />

            {/* Botones transparentes por encima del pill deslizante */}
            <button
                type="button"
                onClick={() => handleCurrencyChange('usd')}
                disabled={isPending}
                className={`relative z-10 flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-colors duration-300 cursor-pointer ${
                    optimisticCurrency === 'usd' ? "text-black" : "text-gray-400 hover:text-black"
                }`}
            >
                <DollarSign size={14} strokeWidth={2.5} /> USD
            </button>
            
            <button
                type="button"
                onClick={() => handleCurrencyChange('eur')}
                disabled={isPending}
                className={`relative z-10 flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-colors duration-300 cursor-pointer ${
                    optimisticCurrency === 'eur' ? "text-black" : "text-gray-400 hover:text-black"
                }`}
            >
                <Euro size={14} strokeWidth={2.5} /> EUR
            </button>
        </div>
    </section>
  )
}