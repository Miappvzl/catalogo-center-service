'use client'

import { useCart } from '@/app/store/useCart'
import { Plus, Minus, ShoppingCart } from 'lucide-react'
import { useState, useEffect } from 'react'

export default function AddToCartBtn({ product }: { product: any }) {
  const { items, addItem, removeItem } = useCart()
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  // Skeleton de carga más pequeño
  if (!mounted) return <div className="h-9 bg-gray-100 rounded-lg animate-pulse w-full md:w-32" />

  const cartItem = items.find((item) => item.id === product.id)
  const quantity = cartItem?.quantity || 0

  // ESTADO 1: Botón "Agregar" (Sin productos)
  if (quantity === 0) {
    return (
      <button
        onClick={() => addItem(product)}
        // CAMBIOS AQUÍ:
        // 1. py-3 -> py-2 (Menos alto)
        // 2. text-sm (Texto más pequeño)
        // 3. md:w-auto (En desktop no ocupa todo el ancho)
        className="w-full md:w-auto bg-black text-white text-sm font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-2 hover:bg-gray-800 transition-all active:scale-95"
      >
        <ShoppingCart size={16} /> {/* Icono más pequeño */}
        Agregar
      </button>
    )
  }

  // ESTADO 2: Contador (+ / -)
  return (
    // CAMBIOS AQUÍ:
    // 1. p-1 -> p-0.5 (Borde más fino)
    // 2. md:w-32 (Ancho fijo en desktop para uniformidad)
    <div className="flex items-center justify-between bg-black text-white rounded-lg p-0.5 w-full md:w-32 font-bold">
      <button 
        onClick={() => removeItem(product.id)}
        // p-2 -> p-1.5 (Botón lateral más pequeño)
        className="p-1.5 hover:bg-gray-700 rounded-md transition flex-1 flex justify-center"
      >
        <Minus size={14} /> {/* Icono nano */}
      </button>
      
      {/* text-lg -> text-base */}
      <span className="text-base px-2 flex-1 text-center">{quantity}</span>
      
      <button 
        onClick={() => addItem(product)}
        className="p-1.5 hover:bg-gray-700 rounded-md transition flex-1 flex justify-center"
      >
        <Plus size={14} />
      </button>
    </div>
  )
}