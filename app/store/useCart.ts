import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'



// 1. En app/store/useCart.ts, ANTES de "export interface CartItem", agrega este tipo:
export interface FoodSelectedModifier {
  optionId: string;
  name: string;
  priceAdjustment: number;
}

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
  isTaxExempt?: boolean // 🚀 AÑADIDO: Contrato fiscal del producto
  sku?: string | null // 🚀 AÑADIDO: SKU del producto o variante (Fulfillment)
  // 2. DENTRO de "export interface CartItem", agrega estas dos líneas al final:
  foodModifiers?: FoodSelectedModifier[] | null; // 🚀 AÑADIDO: Modificadores de comida
  foodNotes?: string | null; // 🚀 AÑADIDO: Notas a la cocina
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
// 3. En la firma de "interface CartState", actualiza addItem:
  addItem: (product: any, variant?: any, quantity?: number, foodModifiers?: FoodSelectedModifier[], foodNotes?: string) => void
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

     addItem: (product, variant = null, quantity = 1, foodModifiers = undefined, foodNotes = undefined) => {
        set((state) => {
          const variantId = variant ? variant.id : null;
          const productId = product.id;
          const currentMaxStock = variant ? Number(variant.stock) : Number(product.stock || 9999);
          
          // 🚀 GENERACIÓN DE ID ÚNICO: Si es comida, el ID del carrito debe incluir los modificadores
          // para que una "Hamburguesa (Sin Cebolla)" no se sume con una "Hamburguesa (Con Tocino)"
          const modifiersString = foodModifiers ? JSON.stringify(foodModifiers.map(m => m.optionId).sort()) : 'base';
          const uniqueId = `${productId}-${variantId || 'base'}-${modifiersString}-${foodNotes || 'nonotes'}`;
          
          const existingItemIndex = state.items.findIndex((i) => i.id === uniqueId);

          if (existingItemIndex > -1) {
            const newItems = [...state.items];
            const currentItem = newItems[existingItemIndex];
            const requestedQuantity = currentItem.quantity + quantity;
            currentItem.quantity = Math.min(requestedQuantity, currentMaxStock);
            return { items: newItems };
          } else {
            // 🚀 MATEMÁTICA DE COMIDA: Sumamos el precio base + los extras
            const basePrice = Number(variant?.override_usd_price ?? product.usd_cash_price);
            const extraCosts = foodModifiers ? foodModifiers.reduce((sum, mod) => sum + mod.priceAdjustment, 0) : 0;
            const finalPrice = basePrice + extraCosts;

            // 🚀 CONSTRUCTOR DEL STRING DE VARIANTES (Para que se vea bonito en el ticket de WhatsApp actual)
            let displayVariantInfo = variant ? `${variant.color_name} / ${variant.size}` : null;
            if (foodModifiers && foodModifiers.length > 0) {
                displayVariantInfo = foodModifiers.map(m => m.name).join(', ');
            }

            const newItem: CartItem = {
              id: uniqueId,
              productId: productId,
              variantId: variantId,
              name: product.name,
              price: finalPrice, 
              basePrice: finalPrice, // Lo pasamos como basePrice para que cartLogic.ts calcule las promos correctamente
              penalty: Number(variant?.override_usd_penalty ?? product.usd_penalty ?? 0),
              image: variant?.variant_image || product.image_url,
              quantity: Math.min(quantity, currentMaxStock), 
              variantInfo: displayVariantInfo,
              category: product.category,
              maxStock: currentMaxStock, 
              compareAtPrice: variant?.override_compare_at_usd !== undefined && variant?.override_compare_at_usd !== null 
                              ? Number(variant.override_compare_at_usd) 
                              : (product.compare_at_usd ? Number(product.compare_at_usd) : null),
              productWholesaleActive: product.wholesale_active || false,
              productWholesaleMinQty: Number(product.wholesale_min_qty || 6),
              productWholesaleDiscountPct: Number(product.wholesale_discount_pct || 0),
              requiresShipping: product.requires_shipping ?? true,
              isTaxExempt: product.is_tax_exempt ?? false,
              sku: variant?.sku || product.sku || null,
              foodModifiers: foodModifiers, // 🚀 Guardamos data cruda para la BD
              foodNotes: foodNotes          // 🚀 Guardamos notas
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