'use client'

import { useOptimistic, useActionState, startTransition } from 'react'
import { updateStoreCurrency, type ActionState } from '@/app/admin/actions'
import { RefreshCw, DollarSign, Euro, Wallet } from 'lucide-react'
import { clsx } from 'clsx'

interface RateWidgetProps {
  storeCurrency?: 'usd' | 'eur' // Opcional para evitar crash si falta
  usdRate?: number              // Opcional
  eurRate?: number              // Opcional
  lastUpdated?: string | null   // Opcional
}

const initialState: ActionState = {
  success: false,
  message: '',
}

export default function RateWidget({ 
  storeCurrency = 'usd', // Valor por defecto
  usdRate = 0,           // Valor por defecto (Evita undefined)
  eurRate = 0,           // Valor por defecto (Evita undefined)
  lastUpdated = null     
}: RateWidgetProps) {
  
  // 1. Hook de Server Action (Manejo de estado del formulario)
  const [state, formAction, isPending] = useActionState(updateStoreCurrency, initialState)

  // 2. Optimistic UI (Feedback instantáneo)
  const [optimisticCurrency, setOptimisticCurrency] = useOptimistic(
    storeCurrency,
    (current, newCurrency: 'usd' | 'eur') => newCurrency
  )

  // 3. Lógica de Negocio Segura (Casteo a Número para evitar crash de .toFixed)
  const safeUsd = Number(usdRate) || 0
  const safeEur = Number(eurRate) || 0
  
  const activeRate = optimisticCurrency === 'usd' ? safeUsd : safeEur

  // Handler para el cambio de moneda
  const handleCurrencyChange = (currency: 'usd' | 'eur') => {
    startTransition(() => {
      setOptimisticCurrency(currency)
      
      const formData = new FormData()
      formData.append('currency', currency)
      formAction(formData)
    })
  }

  return (
    <section className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 h-full flex flex-col justify-between relative overflow-hidden group hover:border-blue-200 transition-colors">
        {/* Fondo decorativo sutil */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-gray-50 rounded-bl-full -mr-10 -mt-10 z-0 pointer-events-none group-hover:bg-blue-50 transition-colors" />

        <div className="relative z-10">
            <header className="flex items-center gap-3 mb-6">
                <div className="p-3 rounded-2xl bg-gray-900 text-white shadow-lg shadow-gray-900/20">
                    <Wallet size={24} strokeWidth={2} />
                </div>
                <div>
                    <h2 className="text-lg font-black text-gray-900 leading-tight">
                        Tasa Activa
                    </h2>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                        {optimisticCurrency === 'usd' ? 'BCV / Paralelo' : 'Banco Central (EUR)'}
                    </p>
                </div>
            </header>

            {/* Display de la Tasa */}
            <div className="mb-8">
                <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-black text-gray-900 tracking-tight">
                        Bs. {activeRate.toFixed(2)}
                    </span>
                </div>
                <div className="flex items-center gap-2 mt-2 text-xs font-medium text-gray-400">
                    <RefreshCw className={clsx("w-3 h-3", isPending && "animate-spin text-blue-600")} />
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

        {/* Selector de Moneda (Switch) */}
        <div className="relative z-10 bg-gray-50 p-1.5 rounded-2xl flex border border-gray-100">
            <button
                type="button" // Importante: type="button" para evitar submit accidental fuera del form
                onClick={() => handleCurrencyChange('usd')}
                disabled={isPending}
                className={clsx(
                    "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 cursor-pointer",
                    optimisticCurrency === 'usd'
                        ? "bg-white text-gray-900 shadow-sm ring-1 ring-black/5"
                        : "text-gray-400 hover:text-gray-600"
                )}
            >
                <DollarSign size={16} strokeWidth={3} />
                USD
            </button>
            <button
                type="button"
                onClick={() => handleCurrencyChange('eur')}
                disabled={isPending}
                className={clsx(
                    "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 cursor-pointer",
                    optimisticCurrency === 'eur'
                        ? "bg-white text-gray-900 shadow-sm ring-1 ring-black/5"
                        : "text-gray-400 hover:text-gray-600"
                )}
            >
                <Euro size={16} strokeWidth={3} />
                EUR
            </button>
        </div>
    </section>
  )
}