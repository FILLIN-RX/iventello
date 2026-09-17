import { describe, it, expect, beforeEach } from 'vitest'
import { useNotifications, typeToColor } from '@/stores/notificationStore'

describe('notificationStore', () => {
  beforeEach(() => {
    useNotifications.setState({
      notifications: [],
      unreadCount: 0
    })
  })

  it('typeToColor retourne la bonne classe CSS', () => {
    expect(typeToColor('vente')).toBe('bg-emerald-500')
    expect(typeToColor('stock_alerte')).toBe('bg-yellow-500')
    expect(typeToColor('stock_critique')).toBe('bg-destructive')
  })

  it('addNotification ajoute et calcule unreadCount', () => {
    const store = useNotifications.getState()
    store.addNotification({
      type: 'vente',
      title: 'Vente effectuée',
      description: '2000 FCFA'
    })
    const state = useNotifications.getState()
    expect(state.notifications).toHaveLength(1)
    expect(state.unreadCount).toBe(1)
    expect(state.notifications[0].title).toBe('Vente effectuée')
    expect(state.notifications[0].read).toBe(false)
  })

  it('markRead marque comme lu et décrémente', () => {
    const store = useNotifications.getState()
    store.addNotification({ type: 'info', title: 'Test', description: '' })
    store.addNotification({ type: 'info', title: 'Test 2', description: '' })
    const id = useNotifications.getState().notifications[0].id

    useNotifications.getState().markRead(id)
    const state = useNotifications.getState()
    expect(state.notifications[0].read).toBe(true)
    expect(state.unreadCount).toBe(1)
  })

  it('markAllRead marque tout comme lu', () => {
    const store = useNotifications.getState()
    store.addNotification({ type: 'info', title: 'A', description: '' })
    store.addNotification({ type: 'info', title: 'B', description: '' })
    useNotifications.getState().markAllRead()
    const state = useNotifications.getState()
    expect(state.notifications.every(n => n.read)).toBe(true)
    expect(state.unreadCount).toBe(0)
  })

  it('dismiss supprime une notification', () => {
    const store = useNotifications.getState()
    store.addNotification({ type: 'info', title: 'Test', description: '' })
    const id = useNotifications.getState().notifications[0].id
    useNotifications.getState().dismiss(id)
    expect(useNotifications.getState().notifications).toHaveLength(0)
  })

  it('clearAll vide tout', () => {
    const store = useNotifications.getState()
    store.addNotification({ type: 'info', title: 'A', description: '' })
    store.addNotification({ type: 'info', title: 'B', description: '' })
    useNotifications.getState().clearAll()
    const state = useNotifications.getState()
    expect(state.notifications).toHaveLength(0)
    expect(state.unreadCount).toBe(0)
  })
})
