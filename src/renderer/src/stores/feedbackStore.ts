import { create } from 'zustand'

export type FeedbackType = 'success' | 'error' | 'warning' | 'info'

export interface ToastItem {
  id: string
  type: FeedbackType
  title?: string
  message: string
  duration?: number
}

export interface FeedbackModalConfig {
  open: boolean
  type: FeedbackType
  title: string
  message: string
  details?: string
  primaryActionLabel?: string
  onPrimaryAction?: () => void
  secondaryActionLabel?: string
  onSecondaryAction?: () => void
}

export interface ConfirmDialogConfig {
  open: boolean
  title: string
  message: string
  itemName?: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'destructive' | 'warning' | 'default'
  loading?: boolean
  onConfirm: () => Promise<void> | void
  onCancel?: () => void
}

interface FeedbackState {
  toasts: ToastItem[]
  modalConfig: FeedbackModalConfig | null
  confirmConfig: ConfirmDialogConfig | null

  // Toast actions
  addToast: (toast: Omit<ToastItem, 'id'>) => void
  removeToast: (id: string) => void

  // Modal actions
  showModal: (config: Omit<FeedbackModalConfig, 'open'>) => void
  hideModal: () => void

  // Confirm dialog actions
  showConfirm: (config: Omit<ConfirmDialogConfig, 'open'>) => void
  hideConfirm: () => void
  setConfirmLoading: (loading: boolean) => void
}

export const useFeedbackStore = create<FeedbackState>((set) => ({
  toasts: [],
  modalConfig: null,
  confirmConfig: null,

  addToast: (toast) => {
    const id = Math.random().toString(36).substring(2, 9)
    const duration = toast.duration ?? (toast.type === 'error' ? 5000 : 3500)
    set((state) => ({
      toasts: [...state.toasts, { ...toast, id, duration }]
    }))

    if (duration > 0) {
      setTimeout(() => {
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id)
        }))
      }, duration)
    }
  },

  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id)
    })),

  showModal: (config) =>
    set({
      modalConfig: { ...config, open: true }
    }),

  hideModal: () =>
    set({
      modalConfig: null
    }),

  showConfirm: (config) =>
    set({
      confirmConfig: { ...config, open: true, loading: false }
    }),

  hideConfirm: () =>
    set({
      confirmConfig: null
    }),

  setConfirmLoading: (loading) =>
    set((state) => ({
      confirmConfig: state.confirmConfig ? { ...state.confirmConfig, loading } : null
    }))
}))

// Helper shortcut export
export const feedback = {
  toast: {
    success: (message: string, title?: string) =>
      useFeedbackStore.getState().addToast({ type: 'success', message, title }),
    error: (message: string, title?: string) =>
      useFeedbackStore.getState().addToast({ type: 'error', message, title }),
    warning: (message: string, title?: string) =>
      useFeedbackStore.getState().addToast({ type: 'warning', message, title }),
    info: (message: string, title?: string) =>
      useFeedbackStore.getState().addToast({ type: 'info', message, title })
  },
  modal: {
    success: (config: { title: string; message: string; details?: string; primaryLabel?: string; onPrimary?: () => void }) =>
      useFeedbackStore.getState().showModal({
        type: 'success',
        title: config.title,
        message: config.message,
        details: config.details,
        primaryActionLabel: config.primaryLabel,
        onPrimaryAction: config.onPrimary
      }),
    error: (config: { title: string; message: string; details?: string; primaryLabel?: string; onPrimary?: () => void }) =>
      useFeedbackStore.getState().showModal({
        type: 'error',
        title: config.title,
        message: config.message,
        details: config.details,
        primaryActionLabel: config.primaryLabel,
        onPrimaryAction: config.onPrimary
      })
  },
  confirm: (config: {
    title: string
    message: string
    itemName?: string
    confirmLabel?: string
    cancelLabel?: string
    variant?: 'destructive' | 'warning' | 'default'
    onConfirm: () => Promise<void> | void
  }) => {
    useFeedbackStore.getState().showConfirm(config)
  }
}
