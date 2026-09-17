import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

type WorkspaceView =
  | 'dashboard' | 'produits' | 'categories'
  | 'stock-faible' | 'rupture' | 'caisse'
  | 'cahier-caisse' | 'factures' | 'achats' | 'depenses'
  | 'remises' | 'non-livres'
  | 'clients' | 'rapports' | 'journal'
  | 'fournisseurs'
  | 'avances'
  | 'agents'
  | 'services'
  | 'canal-plus'
  | 'mobile-money'
  | 'magasin'
  | 'librairie'
  | 'book-form'
  | 'student-total'
  | 'bons-commandes'
  | 'mouvements-stock'

interface EntrepotState {
  selectedId: string | null
  selectedName: string | null
  workspaceView: WorkspaceView
  bookFormBookId: string | null
  bookFormClassLevelId: string | null
  studentSummary: any | null
  select: (id: string, name: string) => void
  setWorkspaceView: (view: WorkspaceView) => void
  setBookFormContext: (bookId?: string, classLevelId?: string) => void
  setStudentSummary: (data: any | null) => void
  clear: () => void
}

export const useEntrepotStore = create<EntrepotState>()(
  persist(
    (set) => ({
      selectedId: null,
      selectedName: null,
      workspaceView: 'dashboard' as WorkspaceView,
      bookFormBookId: null,
      bookFormClassLevelId: null,
      studentSummary: null,
      select: (id, name) => set({ selectedId: id, selectedName: name }),
      setWorkspaceView: (view) => set({ workspaceView: view }),
      setBookFormContext: (bookId, classLevelId) => set({ bookFormBookId: bookId ?? null, bookFormClassLevelId: classLevelId ?? null }),
      setStudentSummary: (data) => set({ studentSummary: data }),
      clear: () => set({ selectedId: null, selectedName: null, workspaceView: 'dashboard', bookFormBookId: null, bookFormClassLevelId: null, studentSummary: null })
    }),
    {
      name: 'entrepot-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
)
