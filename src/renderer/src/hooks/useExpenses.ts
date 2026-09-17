import { useQuery } from '@tanstack/react-query'
import { QUERY_KEYS } from '../lib/queryClient'
import { useEntrepotStore } from '../stores/entrepotStore'
import type { Expense } from '../../../shared/types'

export function useExpenses(warehouseId?: string) {
  const selectedWarehouseId = useEntrepotStore((s) => s.selectedId)
  const targetWhId = warehouseId !== undefined ? warehouseId : (selectedWarehouseId || undefined)

  const { data: expenses = [], isLoading: loading, error, refetch } = useQuery<Expense[]>({
    queryKey: [...QUERY_KEYS.expenses, targetWhId],
    queryFn: async () => {
      const res = await window.api.getExpenses(targetWhId)
      return (res || []) as Expense[]
    }
  })

  return {
    expenses,
    loading,
    error: error instanceof Error ? error.message : null,
    refetch
  }
}
