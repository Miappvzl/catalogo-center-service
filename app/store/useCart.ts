import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

// --- TIPOS ---
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
  maxStock?: number 
  compareAtPrice?: number | null 
  productWholesaleActive?: boolean
  productWholesaleMinQty?: number
  productWholesaleDiscountPct?: number 
  requiresShipping?: boolean 
}

// 🚀 NUEVO TIPO: Contrato de Orden Histórica
export interface SavedOrder {
  id: string;
  number: number;
  date: string;
}

interface CartState {
  items: CartItem[]
  orderHistory: SavedOrder[] // 🚀 NUEVO ESTADO
  addItem: (product: any, variant?: any, quantity?: number) => void
  removeItem: (itemId: string) => void
  updateQuantity: (itemId: string, quantity: number) => void
  clearCart: () => void
  addOrderToHistory: (order: Omit<SavedOrder, 'date'>) => void // 🚀 NUEVA FUNCIÓN
}

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      orderHistory: [], // Inicializamos vacío

      // 🚀 MOTOR DE HISTORIAL (Guarda máximo las últimas 15 órdenes)
      addOrderToHistory: (order) => {
        set((state) => {
          // Evitamos duplicados por si el cliente recarga la página
          if (state.orderHistory.some(o => o.id === order.id)) return state;
          
          const newOrder: SavedOrder = { ...order, date: new Date().toISOString() };
          const newHistory = [newOrder, ...state.orderHistory].slice(0, 15);
          
          return { orderHistory: newHistory };
        })
      },

      addItem: (product, variant = null, quantity = 1) => {
        set((state) => {
          const variantId = variant ? variant.id : null
          const productId = product.id
          const currentMaxStock = variant ? Number(variant.stock) : Number(product.stock || 0)
          const uniqueId = `${productId}-${variantId || 'base'}`
          const existingItemIndex = state.items.findIndex((i) => i.id === uniqueId)

          if (existingItemIndex > -1) {
            const newItems = [...state.items]
            const currentItem = newItems[existingItemIndex]
            const requestedQuantity = currentItem.quantity + quantity
            currentItem.quantity = Math.min(requestedQuantity, currentMaxStock)
            return { items: newItems }
          } else {
            const newItem: CartItem = {
              id: uniqueId,
              productId: productId,
              variantId: variantId,
              name: product.name,
              price: Number(variant?.override_usd_price ?? product.usd_cash_price), 
              basePrice: Number(variant?.override_usd_price ?? product.usd_cash_price),
              penalty: Number(variant?.override_usd_penalty ?? product.usd_penalty ?? 0),
              image: variant?.variant_image || product.image_url,
              quantity: Math.min(quantity, currentMaxStock), 
              variantInfo: variant ? `${variant.color_name} / ${variant.size}` : null,
              category: product.category,
              maxStock: currentMaxStock, 
              compareAtPrice: variant?.override_compare_at_usd !== undefined && variant?.override_compare_at_usd !== null 
                              ? Number(variant.override_compare_at_usd) 
                              : (product.compare_at_usd ? Number(product.compare_at_usd) : null),
              productWholesaleActive: product.wholesale_active || false,
              productWholesaleMinQty: Number(product.wholesale_min_qty || 6),
              productWholesaleDiscountPct: Number(product.wholesale_discount_pct || 0),
              requiresShipping: product.requires_shipping ?? true 
            }
            return { items: [...state.items, newItem] }
          }
        })
      },

      removeItem: (itemId) => {
        set((state) => ({ items: state.items.filter((i) => i.id !== itemId) }))
      },

      updateQuantity: (itemId, quantity) => {
        set((state) => ({
          items: state.items.map((item) => {
            if (item.id === itemId) {
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