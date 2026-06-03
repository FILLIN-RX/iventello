import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

type WorkspaceView =
  | 'dashboard' | 'produits' | 'categories'
  | 'stock-faible' | 'rupture' | 'caisse'
  | 'cahier-caisse' | 'factures' | 'achats' | 'depenses'
  | 'remises'
  | 'clients' | 'rapports' | 'journal'
  | 'fournisseurs'
  | 'canal-plus'
  | 'mobile-money'
  | 'magasin'

interface EntrepotState {
  selectedId: string | null
  selectedName: string | null
  workspaceView: WorkspaceView
  select: (id: string, name: string) => void
  setWorkspaceView: (view: WorkspaceView) => void
  clear: () => void
}

export const useEntrepotStore = create<EntrepotState>()(
  persist(
    (set) => ({
      selectedId: null,
      selectedName: null,
      workspaceView: 'dashboard' as WorkspaceView,
      select: (id, name) => set({ selectedId: id, selectedName: name }),
      setWorkspaceView: (view) => set({ workspaceView: view }),
      clear: () => set({ selectedId: null, selectedName: null, workspaceView: 'dashboard' })
    }),
    {
      name: 'entrepot-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
)
