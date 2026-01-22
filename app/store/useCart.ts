import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface CartItem {
  id: string // Ahora será un ID compuesto: "prodID-variantID"
  productId: number // ID original del producto
  variantId?: string // ID de la variante (si tiene)
  name: string
  basePrice: number
  penalty: number
  image?: string
  quantity: number
  variantInfo?: string // Texto para mostrar: "Rojo / 42"
}

interface CartStore {
  items: CartItem[]
  addItem: (product: any, variant?: any) => void
  removeItem: (id: string) => void
  updateQuantity: (id: string, delta: number) => void // Nueva función útil
  clearCart: () => void
  totalItems: () => number
}

export const useCart = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (product, variant) => {
        const currentItems = get().items
        
        // Generamos un ID único para esta combinación
        const uniqueId = variant 
            ? `${product.id}-${variant.id}` 
            : `${product.id}`

        const existingItem = currentItems.find((item) => item.id === uniqueId)

        // Definir precio (La variante puede tener un precio distinto en el futuro)
        // Por ahora usamos el del producto padre
        const finalBasePrice = product.usd_cash_price
        const finalPenalty = product.usd_penalty || 0

        // Definir Imagen (Si la variante tiene foto, usamos esa. Si no, la del padre)
        const finalImage = (variant && variant.variant_image) 
            ? variant.variant_image 
            : product.image_url

        // Texto descriptivo de la variante
        const variantText = variant 
            ? `${variant.color_name} / ${variant.size}` 
            : undefined

        if (existingItem) {
          set({
            items: currentItems.map((item) =>
              item.id === uniqueId
                ? { ...item, quantity: item.quantity + 1 }
                : item
            ),
          })
        } else {
          set({
            items: [
              ...currentItems,
              {
                id: uniqueId,
                productId: product.id,
                variantId: variant?.id,
                name: product.name,
                basePrice: finalBasePrice,
                penalty: finalPenalty,
                image: finalImage,
                quantity: 1,
                variantInfo: variantText
              },
            ],
          })
        }
      },

      removeItem: (id) => {
        set({ items: get().items.filter((item) => item.id !== id) })
      },

      updateQuantity: (id, delta) => {
         const currentItems = get().items
         set({
            items: currentItems.map(item => {
                if (item.id === id) {
                    const newQty = item.quantity + delta
                    return newQty > 0 ? { ...item, quantity: newQty } : item
                }
                return item
            })
         })
      },

      clearCart: () => set({ items: [] }),

      totalItems: () => get().items.reduce((acc, item) => acc + item.quantity, 0),
    }),
    {
      name: 'cart-storage-v2', // Cambiamos el nombre para resetear la cache vieja
    }
  )
)