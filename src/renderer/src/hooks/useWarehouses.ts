import { useState, useEffect, useCallback } from 'react'
import type { Warehouse } from '../../../shared/types'

export function useWarehouses() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [loading, setLoading] = useState(true)
  const fetch = useCallback(async () => {
    try { setLoading(true); setWarehouses(await window.api.getWarehouses() as Warehouse[]) }
    catch { /* ignore */ } finally { setLoading(false) }
  }, [])
  useEffect(() => { fetch() }, [fetch])
  return { warehouses, loading, refetch: fetch }
}
