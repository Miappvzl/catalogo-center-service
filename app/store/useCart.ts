import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Definimos cómo se ve un producto en el carrito
export interface CartItem {
  id: number
  name: string
  price: number // Precio en Dólares (Base + Penalty)
  image?: string
  quantity: number
}

interface CartStore {
  items: CartItem[]
  addItem: (product: any) => void
  removeItem: (id: number) => void
  clearCart: () => void
  totalItems: () => number
  totalAmount: () => number
}

export const useCart = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (product) => {
        const currentItems = get().items
        const existingItem = currentItems.find((item) => item.id === product.id)

        // Calculamos el precio total (Cash + Penalty si existe)
        const finalPrice = product.usd_cash_price + (product.usd_penalty || 0)

        if (existingItem) {
          // Si ya existe, sumamos +1 a la cantidad
          set({
            items: currentItems.map((item) =>
              item.id === product.id
                ? { ...item, quantity: item.quantity + 1 }
                : item
            ),
          })
        } else {
          // Si es nuevo, lo agregamos
          set({
            items: [
              ...currentItems,
              {
                id: product.id,
                name: product.name,
                price: finalPrice,
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
          // Si hay más de 1, restamos cantidad
          set({
            items: currentItems.map((item) =>
              item.id === id ? { ...item, quantity: item.quantity - 1 } : item
            ),
          })
        } else {
          // Si queda 1, lo borramos del todo
          set({
            items: currentItems.filter((item) => item.id !== id),
          })
        }
      },

      clearCart: () => set({ items: [] }),

      totalItems: () => get().items.reduce((acc, item) => acc + item.quantity, 0),
      
      totalAmount: () => get().items.reduce((acc, item) => acc + (item.price * item.quantity), 0),
    }),
    {
      name: 'shopping-cart', // Nombre para guardar en LocalStorage
    }
  )
)