import { useState, useEffect, useCallback } from 'react'
import type { StockAlert } from '../../../shared/types'

export function useStockAlerts() {
  const [alerts, setAlerts] = useState<StockAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const fetch = useCallback(async () => {
    try { setLoading(true); setError(null); setAlerts(await window.api.getStockAlerts() as StockAlert[]) }
    catch (err) { setError(err instanceof Error ? err.message : 'Erreur') }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { fetch() }, [fetch])
  return { alerts, loading, error, refetch: fetch }
}
