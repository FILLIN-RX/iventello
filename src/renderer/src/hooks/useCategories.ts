import { useQuery } from '@tanstack/react-query'
import { QUERY_KEYS } from '../lib/queryClient'
import { useEntrepotStore } from '../stores/entrepotStore'
import type { Category } from '../../../shared/types'

export function useCategories(warehouseId?: string) {
  const selectedWarehouseId = useEntrepotStore((s) => s.selectedId)
  const targetWhId = warehouseId !== undefined ? warehouseId : (selectedWarehouseId || undefined)

  const { data: categories = [], isLoading: loading, error, refetch } = useQuery<Category[]>({
    queryKey: [...QUERY_KEYS.categories, targetWhId],
    queryFn: async () => {
      const res = await window.api.getCategories(targetWhId)
      return (res || []) as Category[]
    }
  })

  return {
    categories,
    loading,
    error: error instanceof Error ? error.message : null,
    refetch
  }
}
