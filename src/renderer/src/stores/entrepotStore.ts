import { create } from 'zustand'

interface EntrepotState {
  selectedId: string | null
  selectedName: string | null
  select: (id: string, name: string) => void
  clear: () => void
}

export const useEntrepotStore = create<EntrepotState>((set) => ({
  selectedId: null,
  selectedName: null,
  select: (id, name) => set({ selectedId: id, selectedName: name }),
  clear: () => set({ selectedId: null, selectedName: null })
}))
