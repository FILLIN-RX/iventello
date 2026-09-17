import { useQuery } from '@tanstack/react-query'
import { QUERY_KEYS } from '../lib/queryClient'
import { useEntrepotStore } from '../stores/entrepotStore'
import type { ProductWithRelations } from '../../../shared/types'

export function useProducts(warehouseId?: string) {
  const selectedWarehouseId = useEntrepotStore((s) => s.selectedId)
  const targetWhId = warehouseId !== undefined ? warehouseId : (selectedWarehouseId || undefined)

  const { data: products = [], isLoading: loading, error, refetch } = useQuery<ProductWithRelations[]>({
    queryKey: [...QUERY_KEYS.products, targetWhId],
    queryFn: async () => {
      const res = await window.api.getProducts(targetWhId)
      return (res || []) as ProductWithRelations[]
    }
  })

  return {
    products,
    loading,
    error: error instanceof Error ? error.message : null,
    refetch
  }
}
