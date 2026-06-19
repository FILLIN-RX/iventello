import { User } from '@prisma/client'

let currentSession: User | null = null

export const sessionService = {
  getCurrentSession: () => currentSession,
  setCurrentSession: (user: User | null) => {
    currentSession = user
  },
  clearSession: () => {
    currentSession = null
  }
}
