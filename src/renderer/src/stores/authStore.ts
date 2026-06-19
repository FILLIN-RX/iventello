import { create } from 'zustand'
import { User, Role } from '../../../shared/types'

interface AuthStore {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  
  checkSession: () => Promise<void>
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  hasRole: (roles: Role[]) => boolean
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  
  checkSession: async () => {
    set({ isLoading: true })
    const user = await window.api.auth.session()
    set({ user, isAuthenticated: !!user, isLoading: false })
  },
  
  login: async (email, password) => {
    const user = await window.api.auth.login(email, password)
    set({ user, isAuthenticated: true })
  },
  
  logout: async () => {
    await window.api.auth.logout()
    set({ user: null, isAuthenticated: false })
  },
  
  hasRole: (roles: Role[]) => {
    const user = get().user
    return !!user && roles.includes(user.role)
  }
}))
