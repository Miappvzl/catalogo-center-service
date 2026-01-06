'use client'

import { useCart } from '@/app/store/useCart'
import { MessageCircle, ArrowRight } from 'lucide-react'
import { useState, useEffect } from 'react'

interface Props {
  rate: number
  currency: string // 'usd' o 'eur'
  phone: string // El teléfono del dueño de la tienda
  storeName: string
}

export default function FloatingCheckout({ rate, currency, phone, storeName }: Props) {
  const { items, totalItems, totalAmount } = useCart()
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  if (!mounted || items.length === 0) return null

  const symbol = currency === 'eur' ? '€' : '$'
  const totalUsd = totalAmount()
  const totalBs = totalUsd * rate

  const handleCheckout = () => {
    // 1. Construimos el mensaje
    let message = `Hola *${storeName}*, quiero realizar el siguiente pedido:\n\n`
    
    items.forEach(item => {
      message += `▪️ ${item.quantity}x ${item.name} (${symbol}${item.price})\n`
    })

    message += `\n💵 *Total Ref:* ${symbol}${totalUsd}`
    message += `\n🇻🇪 *Total Bs:* Bs ${new Intl.NumberFormat('es-VE').format(totalBs)}`
    message += `\n_(Tasa: ${rate})_`

    // 2. Codificamos para URL
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
    
    // 3. Abrimos WhatsApp
    window.open(url, '_blank')
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 max-w-xl mx-auto z-50 animate-in slide-in-from-bottom-5">
      <button 
        onClick={handleCheckout}
        className="w-full bg-green-600 text-white p-4 rounded-2xl shadow-xl flex items-center justify-between hover:bg-green-700 transition-all active:scale-95"
      >
        <div className="flex flex-col items-start">
          <span className="text-xs font-medium text-green-100">{totalItems()} Artículos</span>
          <span className="text-lg font-bold">Bs {new Intl.NumberFormat('es-VE', { maximumFractionDigits: 2 }).format(totalBs)}</span>
        </div>
        
        <div className="flex items-center gap-2 font-bold">
          Pedir por WhatsApp <MessageCircle size={20} fill="currentColor" />
        </div>
      </button>
    </div>
  )
}