'use client'

import { ShoppingCart, Plus, Minus } from 'lucide-react'
import { useCart } from '@/app/store/useCart'
import Swal from 'sweetalert2'

export default function AddToCartBtn({ product }: { product: any }) {
  // Obtenemos items, addItem y removeItem del store
  const { items, addItem, removeItem } = useCart()

  // Buscamos si este producto ya está en el carrito para saber su cantidad
  const existingItem = items.find((item) => item.id === product.id)
  const quantity = existingItem ? existingItem.quantity : 0

  const handleAdd = () => {
    addItem(product)
    
    // Solo mostramos la alerta si es el PRIMER producto agregado (cantidad era 0)
    // Para no spammear alertas cuando le das al "+"
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

  // Si ya hay cantidad, mostramos el CONTADOR
  if (quantity > 0) {
    return (
        <div className="flex items-center justify-between w-full bg-black text-white rounded-xl font-bold shadow-md animate-in fade-in zoom-in duration-200">
            <button 
                onClick={(e) => { e.stopPropagation(); handleRemove() }}
                className="p-3 px-5 hover:bg-gray-800 rounded-l-xl transition-colors active:scale-90"
            >
                <Minus size={16} />
            </button>
            
            <span className="text-sm min-w-[20px] text-center">{quantity}</span>
            
            <button 
                onClick={(e) => { e.stopPropagation(); handleAdd() }}
                className="p-3 px-5 hover:bg-gray-800 rounded-r-xl transition-colors active:scale-90"
            >
                <Plus size={16} />
            </button>
        </div>
    )
  }

  // Si no hay cantidad, mostramos el botón NORMAL de Agregar
  return (
    <button 
      onClick={(e) => { e.stopPropagation(); handleAdd() }}
      className="w-full bg-black text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-gray-800 transition-all active:scale-95 shadow-sm hover:shadow-lg"
    >
      <ShoppingCart size={18} />
      Agregar
    </button>
  )
}