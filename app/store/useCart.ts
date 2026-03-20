import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

// 1. DEFINICIÓN DE TIPOS (El Contrato Blindado)
export interface CartItem {
  id: string
  productId: string
  variantId: string | null
  name: string
  price: number
  basePrice: number
  penalty: number
  image: string
  quantity: number
  variantInfo: string | null
  category?: string 
  maxStock?: number // <--- 🚀 NUEVO: Guardamos el límite de stock de la BD
  compareAtPrice?: number | null // 🚀 NUEVO: El precio tachado original (para calcular ahorros)
}

interface CartState {
  items: CartItem[]
  addItem: (product: any, variant?: any, quantity?: number) => void
  removeItem: (itemId: string) => void
  updateQuantity: (itemId: string, quantity: number) => void
  clearCart: () => void
}

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (product, variant = null, quantity = 1) => {
        set((state) => {
          const variantId = variant ? variant.id : null
          const productId = product.id
          
          // Capturamos el stock máximo de la variante o del producto general
          const currentMaxStock = variant ? Number(variant.stock) : Number(product.stock || 0)
          
          const uniqueId = `${productId}-${variantId || 'base'}`
          const existingItemIndex = state.items.findIndex((i) => i.id === uniqueId)

          if (existingItemIndex > -1) {
            // SI EXISTE: Sumamos validando el límite máximo
            const newItems = [...state.items]
            const currentItem = newItems[existingItemIndex]
            
            // Lógica blindada: No sumar más allá del stock disponible
            const requestedQuantity = currentItem.quantity + quantity
            currentItem.quantity = Math.min(requestedQuantity, currentMaxStock)
            
            return { items: newItems }
          } else {
            // SI ES NUEVO: Guardamos el maxStock en el objeto
            const newItem: CartItem = {
              id: uniqueId,
              productId: productId,
              variantId: variantId,
              name: product.name,
              
              // 🚀 LÓGICA DE OVERRIDE: Si la variante tiene precio propio, úsalo. Si no (??), usa el del producto.
              price: Number(variant?.override_usd_price ?? product.usd_cash_price), 
              basePrice: Number(variant?.override_usd_price ?? product.usd_cash_price),
              penalty: Number(variant?.override_usd_penalty ?? product.usd_penalty ?? 0),
              image: variant?.variant_image || product.image_url,
              quantity: Math.min(quantity, currentMaxStock), // Validar desde el inicio
              variantInfo: variant ? `${variant.color_name} / ${variant.size}` : null,
              category: product.category,
              maxStock: currentMaxStock, // <--- 🚀 Se guarda en LocalStorage
              // 🚀 NUEVO: Lógica de herencia para el precio tachado
              compareAtPrice: variant?.override_compare_at_usd !== undefined && variant?.override_compare_at_usd !== null 
                              ? Number(variant.override_compare_at_usd) 
                              : (product.compare_at_usd ? Number(product.compare_at_usd) : null)
            }

            return { items: [...state.items, newItem] }
          }
        })
      },

      removeItem: (itemId) => {
        set((state) => ({
          items: state.items.filter((i) => i.id !== itemId),
        }))
      },

      updateQuantity: (itemId, quantity) => {
        set((state) => ({
          items: state.items.map((item) => {
            if (item.id === itemId) {
              // 🚀 LÓGICA BLINDADA: clamp entre 1 y el maxStock (o infinito si es un carrito viejo)
              const limit = item.maxStock ?? 9999
              const newQuantity = Math.min(Math.max(1, quantity), limit)
              return { ...item, quantity: newQuantity }
            }
            return item
          }),
        }))
      },

      clearCart: () => set({ items: [] }),
    }),
    {
      name: 'shopping-cart-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
)