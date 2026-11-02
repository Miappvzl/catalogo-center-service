import { create } from 'zustand'

export type FeedbackToastType = 'success' | 'error' | 'info' | 'warning'

export interface FeedbackToast {
  id: string
  type: FeedbackToastType
  title: string
  message?: string
  duration?: number
}

export type DialogVariant = 'default' | 'danger' | 'warning' | 'info'

export interface DialogConfig {
  eyebrow?: string
  title: string
  description: string
  confirmText?: string
  cancelText?: string
  variant?: DialogVariant
  icon?: 'alert' | 'trash' | 'info' | 'clock' | 'dollar'
}

interface FeedbackState {
  toasts: FeedbackToast[]
  dialog: (DialogConfig & { isOpen: boolean; resolve?: (value: boolean) => void }) | null

  // Métodos de Toasts
  showToast: (toast: Omit<FeedbackToast, 'id'>) => string
  removeToast: (id: string) => void

  // Métodos de Diálogo / Modal / Bottom Sheet
  openDialog: (config: DialogConfig) => Promise<boolean>
  closeDialog: (result: boolean) => void
}

export const useFeedbackStore = create<FeedbackState>((set, get) => ({
  toasts: [],
  dialog: null,

  showToast: (toastData) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
    const newToast: FeedbackToast = {
      id,
      duration: toastData.duration || 3200,
      ...toastData,
    }

    set((state) => ({
      toasts: [...state.toasts.slice(-3), newToast], // Máximo 4 toasts apilados
    }))

    if (newToast.duration && newToast.duration > 0) {
      setTimeout(() => {
        get().removeToast(id)
      }, newToast.duration)
    }

    return id
  },

  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }))
  },

  openDialog: (config) => {
    return new Promise<boolean>((resolve) => {
      set({
        dialog: {
          ...config,
          isOpen: true,
          resolve,
        },
      })
    })
  },

  closeDialog: (result) => {
    const currentDialog = get().dialog
    if (currentDialog?.resolve) {
      currentDialog.resolve(result)
    }
    set({ dialog: null })
  },
}))

// 💎 FACHADA IMPERATIVA ULTRA-ERGONÓMICA (Sustituto directo de Swal)
export const feedback = {
  toast: {
    success: (title: string, message?: string) =>
      useFeedbackStore.getState().showToast({ type: 'success', title, message }),
    error: (title: string, message?: string) =>
      useFeedbackStore.getState().showToast({ type: 'error', title, message }),
    info: (title: string, message?: string) =>
      useFeedbackStore.getState().showToast({ type: 'info', title, message }),
    warning: (title: string, message?: string) =>
      useFeedbackStore.getState().showToast({ type: 'warning', title, message }),
  },
  confirm: (config: DialogConfig) => useFeedbackStore.getState().openDialog(config),
  alert: (title: string, description: string, variant: DialogVariant = 'default') =>
    useFeedbackStore.getState().openDialog({
      title,
      description,
      confirmText: 'Entendido',
      variant,
    }),
}