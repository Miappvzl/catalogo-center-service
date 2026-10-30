import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'


export interface FoodSelectedModifier {
  optionId: string;
  name: string;
  priceAdjustment: number;
}

// 💎 CONTRATOS PARA COMBOS Y PAQUETES (FOODTECH)
export interface BundleConfig {
  collectionId: string;
  name: string;
  comboPriceUSD: number;
}

export interface BundleItemInput {
  product: any;
  variant?: any;
  quantity?: number;
  foodModifiers?: FoodSelectedModifier[];
  foodNotes?: string;
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
  isTaxExempt?: boolean
  sku?: string | null
  foodModifiers?: FoodSelectedModifier[] | null;
  foodNotes?: string | null;
  // 🚀 ATOMIC BUNDLE ENGINE (Vínculo de Combo)
  bundleInstanceId?: string | null; // Agrupador único de esta instancia en el carrito
  bundleId?: string | null;         // ID de la colección en la base de datos
  bundleName?: string | null;       // Nombre legible del combo
}

// 🚀 NUEVO TIPO: Contrato de Orden Histórica
export interface SavedOrder {
  id: string;
  number: number;
  date: string;
}

interface CartState {
  items: CartItem[]
  orderHistory: SavedOrder[]
  addItem: (product: any, variant?: any, quantity?: number, foodModifiers?: FoodSelectedModifier[], foodNotes?: string) => void
  addBundle: (bundle: BundleConfig, bundleItems: BundleItemInput[]) => void // 🚀 NUEVO: Adición atómica de combos
  removeItem: (itemId: string) => void
  removeBundle: (bundleInstanceId: string) => void // 🚀 NUEVO: Retiro atómico de combo
  updateQuantity: (itemId: string, quantity: number) => void
  clearCart: () => void
  addOrderToHistory: (order: Omit<SavedOrder, 'date'>) => void
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


          // 🚀 GENERACIÓN DE ID ÚNICO BLINDADO (Evita colisiones entre cajas con surtidos diferentes)
          const modifiersString = foodModifiers
            ? JSON.stringify(foodModifiers.map(m => `${m.optionId}-${m.name}`).sort())
            : 'base';
          const uniqueId = `${productId}-${variantId || 'base'}-${modifiersString}-${foodNotes || 'nonotes'}`;

          const existingItemIndex = state.items.findIndex((i) => i.id === uniqueId);

          if (existingItemIndex > -1) {
            const newItems = [...state.items];
            const currentItem = newItems[existingItemIndex];
            const requestedQuantity = currentItem.quantity + quantity;

            // 🚀 PERF FIX: Clonación profunda del objeto modificado. 
            // NUNCA mutar directamente "currentItem.quantity". Esto garantiza que React
            // detecte el cambio de referencia en memoria y actualice la UI sin fallas.
            newItems[existingItemIndex] = {
              ...currentItem,
              quantity: Math.min(requestedQuantity, currentMaxStock)
            };

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

      // 💎 ACCIÓN ATÓMICA: Inyecta el combo prorrateando el precio cerrado al centavo exacto
      addBundle: (bundle, bundleItems) => {
        if (!bundleItems || bundleItems.length === 0) return;

        set((state) => {
          // 1. Calculamos el valor nominal regular de los productos sumados
          const itemCalculations = bundleItems.map((entry) => {
            const base = Number(entry.variant?.override_usd_price ?? entry.product.usd_cash_price ?? 0);
            const extra = entry.foodModifiers ? entry.foodModifiers.reduce((acc, m) => acc + m.priceAdjustment, 0) : 0;
            const nominalUnit = base + extra;
            const qty = entry.quantity || 1;
            return {
              ...entry,
              nominalUnit,
              nominalTotal: nominalUnit * qty,
              qty
            };
          });

          const totalNominal = itemCalculations.reduce((sum, it) => sum + it.nominalTotal, 0);
          const bundlePrice = Number(bundle.comboPriceUSD);
          const hasDiscount = bundlePrice > 0 && totalNominal > 0;
          const factor = hasDiscount ? bundlePrice / totalNominal : 1;

          // 2. Identificador único irrepetible para esta instancia del combo en el carrito
          const bundleInstanceId = `bndl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

          // 3. Algoritmo Anti-Penny Rounding (Ajuste del Centavo Huérfano)
          let distributedSum = 0;
          const preprocessed = itemCalculations.map((entry) => {
            const rawUnit = hasDiscount ? Math.floor(entry.nominalUnit * factor * 100) / 100 : entry.nominalUnit;
            distributedSum += rawUnit * entry.qty;
            return { ...entry, finalUnit: rawUnit };
          });

          // Si hay centavos restantes por truncamiento, se los asignamos secuencialmente al plato de mayor valor
          let centsRemaining = hasDiscount ? Math.round((bundlePrice - distributedSum) * 100) : 0;
          preprocessed.sort((a, b) => b.finalUnit - a.finalUnit);

          const finalItemsToAdd: CartItem[] = preprocessed.map((entry) => {
            let unitPrice = entry.finalUnit;
            if (centsRemaining > 0) {
              unitPrice = Number((unitPrice + 0.01).toFixed(2));
              centsRemaining -= 1;
            }

            const variantId = entry.variant ? entry.variant.id : null;
            const currentMaxStock = entry.variant ? Number(entry.variant.stock) : Number(entry.product.stock || 9999);

            let displayVariantInfo = entry.variant ? `${entry.variant.color_name} / ${entry.variant.size}` : null;
            if (entry.foodModifiers && entry.foodModifiers.length > 0) {
              const modsText = entry.foodModifiers.map(m => m.name).join(', ');
              displayVariantInfo = displayVariantInfo ? `${displayVariantInfo} • ${modsText}` : modsText;
            }

            return {
              id: `${entry.product.id}-${variantId || 'base'}-${bundleInstanceId}-${Math.random().toString(36).substring(2, 5)}`,
              productId: String(entry.product.id),
              variantId: variantId,
              name: entry.product.name,
              price: unitPrice,
              basePrice: unitPrice,
              penalty: Number(entry.variant?.override_usd_penalty ?? entry.product.usd_penalty ?? 0),
              image: entry.variant?.variant_image || entry.product.image_url,
              quantity: Math.min(entry.qty, currentMaxStock),
              variantInfo: displayVariantInfo,
              category: entry.product.category,
              maxStock: currentMaxStock,
              compareAtPrice: entry.nominalUnit > unitPrice ? entry.nominalUnit : null,
              productWholesaleActive: false, // Inmune a mayorista dentro del combo
              productWholesaleMinQty: 6,
              productWholesaleDiscountPct: 0,
              requiresShipping: entry.product.requires_shipping ?? true,
              isTaxExempt: entry.product.is_tax_exempt ?? false,
              sku: entry.variant?.sku || entry.product.sku || null,
              foodModifiers: entry.foodModifiers || null,
              foodNotes: entry.foodNotes || null,
              bundleInstanceId: bundleInstanceId,
              bundleId: bundle.collectionId,
              bundleName: bundle.name
            };
          });

          return { items: [...state.items, ...finalItemsToAdd] };
        });
      },

      // 🛡️ ELIMINACIÓN DEFENSIVA: Si se borra un plato de un combo, se retira todo el combo para no corromper el precio
      removeItem: (itemId) => {
        set((state) => {
          const target = state.items.find((i) => i.id === itemId);
          if (target?.bundleInstanceId) {
            return { items: state.items.filter((i) => i.bundleInstanceId !== target.bundleInstanceId) };
          }
          return { items: state.items.filter((i) => i.id !== itemId) };
        });
      },

      removeBundle: (bundleInstanceId) => {
        set((state) => ({
          items: state.items.filter((i) => i.bundleInstanceId !== bundleInstanceId)
        }));
      },

      // 🔄 ESCALADO SINCRONIZADO: Modificar un componente del combo escala todos sus elementos proporcionalmente
      updateQuantity: (itemId, quantity) => {
        set((state) => {
          const target = state.items.find((item) => item.id === itemId);
          if (!target) return state;

          if (target.bundleInstanceId) {
            const currentItemQty = target.quantity;
            if (currentItemQty <= 0) return state;
            const delta = quantity / currentItemQty;

            return {
              items: state.items.map((item) => {
                if (item.bundleInstanceId === target.bundleInstanceId) {
                  const limit = item.maxStock ?? 9999;
                  const newQty = Math.min(Math.max(1, Math.round(item.quantity * delta)), limit);
                  return { ...item, quantity: newQty };
                }
                return item;
              })
            };
          }

          const limit = target.maxStock ?? 9999;
          const newQuantity = Math.min(Math.max(1, quantity), limit);
          return {
            items: state.items.map((item) => item.id === itemId ? { ...item, quantity: newQuantity } : item)
          };
        });
      },

      clearCart: () => set({ items: [] }),
    }),
    {
      name: 'shopping-cart-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
)