import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface CartItem {
  id: number
  name: string
  basePrice: number    // Precio Base (Cash/Zelle)
  penalty: number      // El sobreprecio (para Pago Móvil)
  image?: string
  quantity: number
}

interface CartStore {
  items: CartItem[]
  addItem: (product: any) => void
  removeItem: (id: number) => void
  clearCart: () => void
  totalItems: () => number
  // Nota: Quitamos totalAmount de aquí porque ahora el cálculo es dinámico en el componente
}

export const useCart = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (product) => {
        const currentItems = get().items
        const existingItem = currentItems.find((item) => item.id === product.id)

        if (existingItem) {
          set({
            items: currentItems.map((item) =>
              item.id === product.id
                ? { ...item, quantity: item.quantity + 1 }
                : item
            ),
          })
        } else {
          set({
            items: [
              ...currentItems,
              {
                id: product.id,
                name: product.name,
                basePrice: product.usd_cash_price, // Guardamos la base pura
                penalty: product.usd_penalty || 0, // Guardamos el penalty aparte
                image: product.image_url,
                quantity: 1,
              },
            ],
          })
        }
      },

      removeItem: (id) => {
        const currentItems = get().items
        const existingItem = currentItems.find((item) => item.id === id)

        if (existingItem && existingItem.quantity > 1) {
          set({
            items: currentItems.map((item) =>
              item.id === id ? { ...item, quantity: item.quantity - 1 } : item
            ),
          })
        } else {
          set({
            items: currentItems.filter((item) => item.id !== id),
          })
        }
      },

      clearCart: () => set({ items: [] }),

      totalItems: () => get().items.reduce((acc, item) => acc + item.quantity, 0),
    }),
    {
      name: 'shopping-cart',
    }
  )
)