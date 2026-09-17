import { create } from 'zustand'
import { User, Role } from '../../../shared/types'

// Timeout de session : 1 journée (24h) — configurable
const SESSION_TIMEOUT_MS = 24 * 60 * 60 * 1000

interface AuthStore {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  lastActivity: number

  checkSession: () => Promise<void>
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  hasRole: (roles: Role[]) => boolean
  updateActivity: () => void
  startActivityWatcher: () => () => void
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  lastActivity: Date.now(),

  checkSession: async () => {
    set({ isLoading: true })
    const user = await window.api.auth.session()
    set({ user, isAuthenticated: !!user, isLoading: false, lastActivity: Date.now() })
  },

  login: async (email, password) => {
    const user = await window.api.auth.login(email, password)
    set({ user, isAuthenticated: true, lastActivity: Date.now() })
  },

  logout: async () => {
    await window.api.auth.logout()
    set({ user: null, isAuthenticated: false })
  },

  updateActivity: () => {
    set({ lastActivity: Date.now() })
  },

  hasRole: (roles: Role[]) => {
    const user = get().user
    return !!user && roles.includes(user.role)
  },

  /**
   * Lance la surveillance d'inactivité.
   * Retourne une fonction cleanup pour arrêter l'écoute.
   */
  startActivityWatcher: () => {
    const { updateActivity, logout, isAuthenticated } = get()

    // Réinitialise le timer à chaque interaction utilisateur
    const onActivity = () => {
      if (get().isAuthenticated) {
        updateActivity()
      }
    }

    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click']
    events.forEach(ev => window.addEventListener(ev, onActivity, { passive: true }))

    // Vérifie toutes les 60 secondes si la session a expiré
    const intervalId = setInterval(() => {
      const state = get()
      if (!state.isAuthenticated) return

      const elapsed = Date.now() - state.lastActivity
      if (elapsed >= SESSION_TIMEOUT_MS) {
        console.warn('[Auth] Session expirée après inactivité — déconnexion automatique')
        state.logout()
      }
    }, 60_000)

    // Cleanup
    return () => {
      events.forEach(ev => window.removeEventListener(ev, onActivity))
      clearInterval(intervalId)
    }
  }
}))
