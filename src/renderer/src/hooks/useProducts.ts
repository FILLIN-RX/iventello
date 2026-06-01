import { useState, useEffect, useCallback } from 'react'
import type { ProductWithRelations } from '../../../shared/types'

export function useProducts() {
  const [products, setProducts] = useState<ProductWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const fetch = useCallback(async () => {
    try { setLoading(true); setError(null); setProducts(await window.api.getProducts() as ProductWithRelations[]) }
    catch (err) { setError(err instanceof Error ? err.message : 'Erreur de chargement') }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { fetch() }, [fetch])
  return { products, loading, error, refetch: fetch }
}
