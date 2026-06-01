import { useState, useEffect, useCallback } from 'react'
import type { Supplier } from '../../../shared/types'

export function useSuppliers() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const fetch = useCallback(async () => {
    try { setLoading(true); setSuppliers(await window.api.getSuppliers() as Supplier[]) }
    catch { /* ignore */ } finally { setLoading(false) }
  }, [])
  useEffect(() => { fetch() }, [fetch])
  return { suppliers, loading, refetch: fetch }
}
