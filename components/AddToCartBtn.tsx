'use client'

import { ShoppingCart, Plus, Minus } from 'lucide-react'
import { useCart } from '@/app/store/useCart'
import Swal from 'sweetalert2'

export default function AddToCartBtn({ product, iconOnly = false }: { product: any, iconOnly?: boolean }) {
  const { addItem, items, updateQuantity, removeItem } = useCart()

  // Buscar si este producto ya existe en el carrito
  const existingItem = items.find((item) => item.productId === product.id || item.id === `${product.id}`)
  const quantity = existingItem ? existingItem.quantity : 0

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    addItem(product)
    
    // Feedback visual sutil solo la primera vez
    if (quantity === 0) {
        const Toast = Swal.mixin({
            toast: true, position: 'top', showConfirmButton: false, timer: 1000,
            customClass: { popup: 'bg-black text-white rounded-none' }
        })
        Toast.fire({ icon: 'success', title: 'AGREGADO' })
    }
  }

  const handleIncrease = (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    if(existingItem) updateQuantity(existingItem.id, 1)
  }

  const handleDecrease = (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (quantity > 1 && existingItem) {
        updateQuantity(existingItem.id, -1)
    } else if (existingItem) {
        removeItem(existingItem.id)
    }
  }

  // --- ESTADO 1: YA ESTÁ EN EL CARRITO (MOSTRAR CONTADOR) ---
  if (quantity > 0) {
    if (iconOnly) {
        return (
            <div className="bg-black text-white p-1 rounded-lg flex flex-col items-center justify-between h-[100px] w-[40px] shadow-lg animate-in fade-in zoom-in duration-200" onClick={(e) => e.stopPropagation()}>
                <button onClick={handleIncrease} className="p-1 hover:bg-gray-700 rounded-full transition-colors"><Plus size={14}/></button>
                <span className="font-mono text-xs font-bold">{quantity}</span>
                <button onClick={handleDecrease} className="p-1 hover:bg-gray-700 rounded-full transition-colors"><Minus size={14}/></button>
            </div>
        )
    }

    return (
        <div className="w-full bg-black text-white h-[46px] rounded-xl flex items-center justify-between px-4 shadow-lg animate-in fade-in zoom-in duration-200" onClick={(e) => e.stopPropagation()}>
            <button onClick={handleDecrease} className="p-1 hover:bg-gray-700 rounded-full transition-colors"><Minus size={18}/></button>
            <span className="font-mono font-bold text-sm">{quantity}</span>
            <button onClick={handleIncrease} className="p-1 hover:bg-gray-700 rounded-full transition-colors"><Plus size={18}/></button>
        </div>
    )
  }

  // --- ESTADO 2: NO ESTÁ EN EL CARRITO (BOTÓN NORMAL) ---
  if (iconOnly) {
    return (
      <button 
        onClick={handleAdd}
        className="bg-black text-white p-2.5 rounded-lg hover:bg-gray-800 transition-colors shadow-sm active:scale-95"
        title="Agregar al carrito"
      >
        <ShoppingCart size={16} strokeWidth={2.5} />
      </button>
    )
  }

  return (
    <button 
      onClick={handleAdd}
      className="w-full bg-black text-white py-3.5 rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-gray-800 transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"
    >
      <ShoppingCart size={18} />
      Agregar al Carrito
    </button>
  )
}