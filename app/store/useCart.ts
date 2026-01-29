import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

// 1. DEFINICIÓN DE TIPOS (El Contrato)
// Aquí le decimos a TypeScript exactamente qué lleva un item del carrito
export interface CartItem {
  id: string
  productId: string
  variantId: string | null
  name: string
  price: number        // <--- Aquí definimos que SIEMPRE habrá un precio
  basePrice: number
  penalty: number
  image: string
  quantity: number
  variantInfo: string | null
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
          
          // Generamos ID único combinando producto y variante
          const uniqueId = `${productId}-${variantId || 'base'}`

          // Verificamos si ya existe
          const existingItemIndex = state.items.findIndex((i) => i.id === uniqueId)

          if (existingItemIndex > -1) {
            // SI EXISTE: Sumamos la cantidad nueva
            const newItems = [...state.items]
            newItems[existingItemIndex].quantity += quantity
            return { items: newItems }
          } else {
            // SI ES NUEVO: Creamos el objeto CartItem completo
            const newItem: CartItem = {
              id: uniqueId,
              productId: productId,
              variantId: variantId,
              name: product.name,
              // Lógica de Precio: Si la variante tuviera precio propio lo usaríamos, sino el del producto
              price: Number(product.usd_cash_price), 
              basePrice: Number(product.usd_cash_price),
              penalty: Number(product.usd_penalty || 0),
              // Lógica de Imagen: Prioridad Variante > Producto
              image: variant?.variant_image || product.image_url,
              quantity: quantity,
              variantInfo: variant ? `${variant.color_name} / ${variant.size}` : null
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
              // Evitamos cantidades negativas o cero
              const newQuantity = Math.max(1, quantity)
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