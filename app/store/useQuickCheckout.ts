import { create } from 'zustand';

// Tipado para los ítems seleccionados desde el catálogo
export interface QuickCheckoutItem {
  productId: number;
  variantId?: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string;
  variantLabel?: string;
  maxStock?: number; // 🚀 Límite físico de inventario
}

// Objeto final retornado tras la creación del enlace en Supabase
export interface GeneratedQuickLink {
  id: string;
  fullUrl: string;
  totalUsd: number;
  title: string;
  expiresAt: string | null;
  allowSplitPayments: boolean;
  minSplitAmountUsd: number;
  mode: 'custom_amount' | 'catalog';
}

export type QuickCheckoutMode = 'custom_amount' | 'catalog';
export type QuickCheckoutStep = 'composer' | 'preview_card';

interface QuickCheckoutState {
  // Estado de Visualización (UI)
  isOpen: boolean;
  step: QuickCheckoutStep;
  mode: QuickCheckoutMode;
  isLoading: boolean;
  error: string | null;

  // Estado del Motor 1: Monto Libre (Dynamic Mode)
  amountInput: string; // Se guarda como string para fluidez con el teclado numérico móvil
  customTitle: string; // Nota del cobro: Ej: "Promo 3 franelas" o "Anticipo de vestido"

  // Estado del Motor 2: Catálogo Estricto (Inventory Mode)
  selectedItems: QuickCheckoutItem[];

  // Opciones Élite: Abonos y FOMO / Expiración
  allowSplitPayments: boolean;
  minSplitAmount: string;
  expiresInMinutes: number | null; // 15, 60, 1440 (24h) o null (sin expiración)

  // Enlace Creado (Para la Tarjeta Digital Compartible)
  generatedLink: GeneratedQuickLink | null;

  // Acciones de Control de UI
  openQuickCheckout: (initialMode?: QuickCheckoutMode) => void;
  closeQuickCheckout: () => void;
  setMode: (mode: QuickCheckoutMode) => void;
  setStep: (step: QuickCheckoutStep) => void;
  setIsLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Acciones: Monto Libre
  setAmountInput: (val: string) => void;
  setCustomTitle: (title: string) => void;

  // Acciones: Catálogo
  addItem: (item: Omit<QuickCheckoutItem, 'quantity'> & { quantity?: number }) => void;
  removeItem: (productId: number, variantId?: string) => void;
  updateQuantity: (productId: number, quantity: number, variantId?: string) => void;
  clearItems: () => void;

  // Acciones: Opciones Avanzadas
  setAllowSplitPayments: (allow: boolean) => void;
  setMinSplitAmount: (val: string) => void;
  setExpiresInMinutes: (minutes: number | null) => void;

  // Finalización
  setGeneratedLink: (link: GeneratedQuickLink | null) => void;
  getTotalUsd: () => number;
  reset: () => void;
}

export const useQuickCheckout = create<QuickCheckoutState>((set, get) => ({
  // Estado Inicial
  isOpen: false,
  step: 'composer',
  mode: 'custom_amount',
  isLoading: false,
  error: null,

  amountInput: '',
  customTitle: '',
  selectedItems: [],

  allowSplitPayments: false,
  minSplitAmount: '',
  expiresInMinutes: 1440, // 24 horas por defecto

  generatedLink: null,

  // Control de UI
  openQuickCheckout: (initialMode = 'custom_amount') =>
    set({
      isOpen: true,
      step: 'composer',
      mode: initialMode,
      error: null,
    }),

  closeQuickCheckout: () =>
    set({
      isOpen: false,
      step: 'composer',
      amountInput: '',
      customTitle: '',
      selectedItems: [],
      generatedLink: null,
      error: null,
    }),

  setMode: (mode) => set({ mode, error: null }),
  setStep: (step) => set({ step, error: null }),
  setIsLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),

  // Acciones Monto Libre
  setAmountInput: (val) => {
    // Sanitización: Permitir únicamente dígitos y un solo punto decimal
    const sanitized = val.replace(/[^0-9.]/g, '');
    const parts = sanitized.split('.');
    if (parts.length > 2) return;
    if (parts[1] && parts[1].length > 2) return; // Máximo 2 decimales
    set({ amountInput: sanitized });
  },

  setCustomTitle: (customTitle) => set({ customTitle }),

    addItem: (newItem) => {
    const { selectedItems } = get();
    const currentMax = newItem.maxStock ?? 9999;

    const existingIndex = selectedItems.findIndex(
      (item) => item.productId === newItem.productId && item.variantId === newItem.variantId
    );

    if (existingIndex > -1) {
      const updated = [...selectedItems];
      const currentItem = updated[existingIndex];
      const maxAllowed = currentItem.maxStock ?? currentMax;
      const requested = currentItem.quantity + (newItem.quantity || 1);

      // Bloqueo estricto contra el techo de stock
      updated[existingIndex].quantity = Math.min(requested, maxAllowed);
      set({ selectedItems: updated });
    } else {
      set({
        selectedItems: [
          ...selectedItems,
          {
            ...newItem,
            quantity: Math.min(newItem.quantity || 1, currentMax),
            maxStock: currentMax,
          },
        ],
      });
    }
  },

  removeItem: (productId, variantId) => {
    set((state) => ({
      selectedItems: state.selectedItems.filter(
        (item) => !(item.productId === productId && item.variantId === variantId)
      ),
    }));
  },

  updateQuantity: (productId, quantity, variantId) => {
    if (quantity <= 0) {
      get().removeItem(productId, variantId);
      return;
    }

    set((state) => ({
      selectedItems: state.selectedItems.map((item) => {
        if (item.productId === productId && item.variantId === variantId) {
          const limit = item.maxStock ?? 9999;
          return { ...item, quantity: Math.min(quantity, limit) };
        }
        return item;
      }),
    }));
  },
  clearItems: () => set({ selectedItems: [] }),

  // Opciones Avanzadas
  setAllowSplitPayments: (allowSplitPayments) => set({ allowSplitPayments }),
  
  setMinSplitAmount: (val) => {
    const sanitized = val.replace(/[^0-9.]/g, '');
    set({ minSplitAmount: sanitized });
  },

  setExpiresInMinutes: (expiresInMinutes) => set({ expiresInMinutes }),

  setGeneratedLink: (generatedLink) => set({ generatedLink }),

  // Cálculo Dinámico del Total
  getTotalUsd: () => {
    const { mode, amountInput, selectedItems } = get();
    if (mode === 'custom_amount') {
      const parsed = parseFloat(amountInput);
      return isNaN(parsed) ? 0 : Number(parsed.toFixed(2));
    }

    const catalogTotal = selectedItems.reduce(
      (acc, item) => acc + item.price * item.quantity,
      0
    );
    return Number(catalogTotal.toFixed(2));
  },

  reset: () =>
    set({
      isOpen: false,
      step: 'composer',
      mode: 'custom_amount',
      isLoading: false,
      error: null,
      amountInput: '',
      customTitle: '',
      selectedItems: [],
      allowSplitPayments: false,
      minSplitAmount: '',
      expiresInMinutes: 1440,
      generatedLink: null,
    }),
}));
