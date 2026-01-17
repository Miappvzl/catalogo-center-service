'use client'

import { ShoppingCart, Plus, Minus } from 'lucide-react'
import { useCart } from '@/app/store/useCart'
import Swal from 'sweetalert2'

interface Props {
  product: any
  iconOnly?: boolean
}

export default function AddToCartBtn({ product, iconOnly = false }: Props) {
  const { items, addItem, removeItem } = useCart()

  const existingItem = items.find((item) => item.id === product.id)
  const quantity = existingItem ? existingItem.quantity : 0

  const handleAdd = () => {
    addItem(product)
    if (quantity === 0) {
      const Toast = Swal.mixin({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 1500,
        timerProgressBar: true,
      })
      Toast.fire({
        icon: 'success',
        title: 'Agregado al carrito'
      })
    }
  }

  const handleRemove = () => {
    removeItem(product.id)
  }

  // --- MODO 1: CONTADOR ACTIVO ---
  if (quantity > 0) {
    if (iconOnly) {
       return (
         <div className="flex items-center bg-black text-white rounded-full shadow-xl animate-in fade-in zoom-in duration-200 overflow-hidden">
            <button 
                onClick={(e) => { e.stopPropagation(); handleRemove() }}
                // Reducido de w-8 h-8 a w-6 h-6
                className="w-6 h-6 flex items-center justify-center hover:bg-gray-800 transition-colors active:bg-gray-700"
            >
                <Minus size={12} />
            </button>
            
            <span className="text-[10px] font-bold w-5 text-center">{quantity}</span>
            
            <button 
                onClick={(e) => { e.stopPropagation(); handleAdd() }}
                className="w-6 h-6 flex items-center justify-center hover:bg-gray-800 transition-colors active:bg-gray-700"
            >
                <Plus size={12} />
            </button>
         </div>
       )
    }

    return (
        <div className="flex items-center justify-between w-full bg-black text-white rounded-lg font-bold shadow-md animate-in fade-in zoom-in duration-200">
            <button 
                onClick={(e) => { e.stopPropagation(); handleRemove() }}
                // Reducido de p-3 px-5 a p-1.5 px-3
                className="p-3 px-5 hover:bg-gray-800 rounded-l-lg transition-colors active:scale-90"
            >
                <Minus size={16} />
            </button>
            
            <span className="text-xs min-w-[15px] text-center">{quantity}</span>
            
            <button 
                onClick={(e) => { e.stopPropagation(); handleAdd() }}
                className="p-3 px-5 hover:bg-gray-800 rounded-r-lg transition-colors active:scale-90"
            >
                <Plus size={16} />
            </button>
        </div>
    )
  }

  // --- MODO 2: BOTÓN DE AGREGAR ---
  if (iconOnly) {
     return (
        <button 
          onClick={(e) => { e.stopPropagation(); handleAdd() }}
          // Reducido de w-10 h-10 a w-8 h-8
          className="w-8 h-8 bg-black text-white rounded-full flex items-center justify-center shadow-xl hover:scale-110 hover:bg-gray-900 transition-all duration-300"
          title="Agregar al carrito"
        >
          <ShoppingCart size={14} />
        </button>
     )
  }

  return (
    <button 
      onClick={(e) => { e.stopPropagation(); handleAdd() }}
      // Reducido de py-3 a py-1.5
      className="w-full bg-black text-white py-1.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 hover:bg-gray-800 transition-all active:scale-95 shadow-sm"
    >
      <ShoppingCart size={14} />
      Agregar
    </button>
  )
}