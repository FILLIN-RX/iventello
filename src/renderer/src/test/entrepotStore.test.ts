import { describe, it, expect, beforeEach } from 'vitest'
import { useEntrepotStore } from '@/stores/entrepotStore'

describe('entrepotStore', () => {
  beforeEach(() => {
    useEntrepotStore.setState({
      selectedId: null,
      selectedName: null,
      workspaceView: 'dashboard',
      bookFormBookId: null,
      bookFormClassLevelId: null,
      studentSummary: null
    })
  })

  it('select définit l\'entrepôt actif', () => {
    useEntrepotStore.getState().select('wh-1', 'Entrepôt A')
    const state = useEntrepotStore.getState()
    expect(state.selectedId).toBe('wh-1')
    expect(state.selectedName).toBe('Entrepôt A')
  })

  it('setWorkspaceView change la vue', () => {
    useEntrepotStore.getState().setWorkspaceView('produits')
    expect(useEntrepotStore.getState().workspaceView).toBe('produits')
  })

  it('clear réinitialise tout', () => {
    useEntrepotStore.getState().select('wh-1', 'Test')
    useEntrepotStore.getState().setWorkspaceView('caisse')
    useEntrepotStore.getState().clear()
    const state = useEntrepotStore.getState()
    expect(state.selectedId).toBeNull()
    expect(state.selectedName).toBeNull()
    expect(state.workspaceView).toBe('dashboard')
  })

  it('setBookFormContext stocke le contexte', () => {
    useEntrepotStore.getState().setBookFormContext('book-1', 'level-1')
    const state = useEntrepotStore.getState()
    expect(state.bookFormBookId).toBe('book-1')
    expect(state.bookFormClassLevelId).toBe('level-1')
  })

  it('setStudentSummary stocke les données', () => {
    const data = { studentName: 'Jean', total: 5000 }
    useEntrepotStore.getState().setStudentSummary(data)
    expect(useEntrepotStore.getState().studentSummary).toEqual(data)
  })
})
