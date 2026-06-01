import { create } from 'zustand'

export type NotificationType = 'vente' | 'produit_cree' | 'stock_alerte' | 'stock_critique' | 'info'

export interface Notification {
  id: string
  type: NotificationType
  title: string
  description: string
  read: boolean
  createdAt: Date
  warehouseId?: string
  warehouseName?: string
  meta?: Record<string, string | number>
}

interface NotificationState {
  notifications: Notification[]
  unreadCount: number
  addNotification: (n: Omit<Notification, 'id' | 'read' | 'createdAt'>) => void
  markRead: (id: string) => void
  markAllRead: () => void
  dismiss: (id: string) => void
  clearAll: () => void
  getByWarehouse: (warehouseId: string) => Notification[]
  getUnreadByWarehouse: (warehouseId: string) => number
  checkAlerts: () => Promise<void>
}

function genId() {
  return crypto.randomUUID?.() ?? Math.random().toString(36).slice(2, 11)
}

function typeToColor(type: NotificationType): string {
  switch (type) {
    case 'vente': return 'bg-emerald-500'
    case 'produit_cree': return 'bg-blue-500'
    case 'stock_alerte': return 'bg-yellow-500'
    case 'stock_critique': return 'bg-destructive'
    case 'info': return 'bg-primary'
  }
}

export { typeToColor }

export function useWarehouseNotifications(warehouseId: string | null) {
  const notifications = useNotifications((s) => s.notifications)
  if (!warehouseId) return []
  return notifications.filter((n) => n.warehouseId === warehouseId)
}

export function useWarehouseUnreadCount(warehouseId: string | null): number {
  const notifications = useNotifications((s) => s.notifications)
  if (!warehouseId) return 0
  return notifications.filter((n) => n.warehouseId === warehouseId && !n.read).length
}

export const useNotifications = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,

  addNotification: (n) => {
    set((s) => {
      const newN: Notification = { ...n, id: genId(), read: false, createdAt: new Date() }
      return {
        notifications: [newN, ...s.notifications].slice(0, 50),
        unreadCount: s.notifications.filter((x) => !x.read).length + 1
      }
    })
  },

  markRead: (id) => {
    set((s) => {
      const updated = s.notifications.map((n) => n.id === id ? { ...n, read: true } : n)
      return { notifications: updated, unreadCount: updated.filter((x) => !x.read).length }
    })
  },

  markAllRead: () => {
    set((s) => ({
      notifications: s.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0
    }))
  },

  dismiss: (id) => {
    set((s) => {
      const updated = s.notifications.filter((n) => n.id !== id)
      return { notifications: updated, unreadCount: updated.filter((x) => !x.read).length }
    })
  },

  clearAll: () => {
    set({ notifications: [], unreadCount: 0 })
  },

  getByWarehouse: (warehouseId) => {
    return get().notifications.filter((n) => n.warehouseId === warehouseId)
  },

  getUnreadByWarehouse: (warehouseId) => {
    return get().notifications.filter((n) => n.warehouseId === warehouseId && !n.read).length
  },

  checkAlerts: async () => {
    try {
      const alerts: { product: { name: string; id: string }; stock: { quantity: number; alertLimit: number; warehouse: { id: string; name: string } } }[] =
        await window.api.getStockAlerts()
      const { notifications } = get()
      const seen = new Set(notifications.map((n) => n.meta?.productId))

      for (const a of alerts) {
        if (seen.has(a.product.id)) continue
        seen.add(a.product.id)
        const isCritical = a.stock.quantity <= 0
        set((s) => {
          const n: Notification = {
            id: genId(),
            type: isCritical ? 'stock_critique' : 'stock_alerte',
            title: isCritical ? 'Rupture de stock' : 'Stock faible',
            description: isCritical
              ? `${a.product.name} est en rupture (0 en stock)`
              : `${a.product.name} — ${a.stock.quantity} en stock, seuil: ${a.stock.alertLimit}`,
            read: false,
            createdAt: new Date(),
            warehouseId: a.stock.warehouse.id,
            warehouseName: a.stock.warehouse.name,
            meta: { productId: a.product.id, stock: a.stock.quantity, limit: a.stock.alertLimit, warehouse: a.stock.warehouse.name }
          }
          return {
            notifications: [n, ...s.notifications].slice(0, 50),
            unreadCount: s.notifications.filter((x) => !x.read).length + 1
          }
        })
      }
    } catch {
      // ignore in dev
    }
  }
}))
