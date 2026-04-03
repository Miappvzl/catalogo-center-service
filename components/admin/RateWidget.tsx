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
    <section className="bg-white p-6 rounded-[var(--radius-card)] card-interactive h-full flex flex-col justify-between relative overflow-hidden group">
        <div className="relative z-10">
            <header className="flex items-center gap-1 mb-6 pb-2 border-b border-gray-100">
                <div className="p-3 pl-[1.5px] text-black">
                    <Wallet size={24} strokeWidth={2.5} />
                </div>
                <div>
                    <h2 className="text-lg font-black text-gray-900 leading-tight">
                        Tasa Activa
                    </h2>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                        {optimisticCurrency === 'usd' ? 'BCV / Paralelo' : 'Banco Central (EUR)'}
                    </p>
                </div>
            </header>
            
            <div className="mb-8">
                <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-black text-gray-900 tracking-tighter">
                        Bs {activeRate.toFixed(2)}
                    </span>
                </div>
                <div className="flex items-center gap-2 mt-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                    <RefreshCw className={`w-3 h-3 ${isPending ? "animate-spin text-black" : ""}`} />
                    <span>
                        {isPending 
                            ? 'Actualizando...' 
                            : lastUpdated 
                                ? `Actualizado: ${new Date(lastUpdated).toLocaleTimeString('es-VE', {hour: '2-digit', minute:'2-digit'})}` 
                                : 'Esperando sincronización...'
                        }
                    </span>
                </div>
            </div>
        </div>

        {/* SELECTOR SEGMENTADO (Borderless & Shadow Subtle) */}
        <div className="relative z-10  flex bg-gray-100 p-1 rounded-(--radius-btn)   shrink-0 shadow-inner">
            <button
                type="button"
                onClick={() => handleCurrencyChange('usd')}
                disabled={isPending}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-[.6rem] text-xs font-bold transition-all cursor-pointer ${
                    optimisticCurrency === 'usd'
                        ? "bg-white text-black shadow-subtle border border-transparent"
                        : "text-gray-400 hover:text-black border border-transparent hover:bg-gray-100"
                }`}
            >
                <DollarSign size={14} strokeWidth={3} /> USD
            </button>
            <button
                type="button"
                onClick={() => handleCurrencyChange('eur')}
                disabled={isPending}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-[.6rem] text-xs font-bold transition-all cursor-pointer ${
                    optimisticCurrency === 'eur'
                        ? "bg-white text-black shadow-subtle border border-transparent"
                        : "text-gray-400 hover:text-black  border border-transparent hover:bg-gray-100"
                }`}
            >
                <Euro size={14} strokeWidth={3} /> EUR
            </button>
        </div>
    </section>
  )
}