import { useCallback } from 'react'
import { useEntrepotStore } from '../stores/entrepotStore'

type NavTarget =
  | { type: 'main'; view: 'accueil' | 'entrepots' | 'settings' }
  | { type: 'workspace'; view: string }

let globalNav: ((target: NavTarget) => void) | null = null

export function setGlobalNav(fn: (target: NavTarget) => void) {
  globalNav = fn
}

export function useNavigate() {
  const select = useEntrepotStore((s) => s.select)
  const clear = useEntrepotStore((s) => s.clear)

  const navigate = useCallback(
    (page: string, entrepotId?: string, entrepotName?: string) => {
      if (entrepotId && entrepotName) {
        select(entrepotId, entrepotName)
        globalNav?.({ type: 'workspace', view: 'dashboard' })
      } else if (page === 'entrepots' || page === 'accueil' || page === 'settings') {
        clear()
        globalNav?.({ type: 'main', view: page })
      } else {
        globalNav?.({ type: 'workspace', view: page })
      }
    },
    [select, clear]
  )

  return navigate
}
