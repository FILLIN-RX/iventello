import { useQuery } from '@tanstack/react-query'
import { QUERY_KEYS } from '../lib/queryClient'
import { useEntrepotStore } from '../stores/entrepotStore'
import type { Supplier } from '../../../shared/types'

export function useSuppliers(warehouseId?: string) {
  const selectedWarehouseId = useEntrepotStore((s) => s.selectedId)
  const targetWhId = warehouseId !== undefined ? warehouseId : (selectedWarehouseId || undefined)

  const { data: suppliers = [], isLoading: loading, refetch } = useQuery<Supplier[]>({
    queryKey: [...QUERY_KEYS.suppliers, targetWhId],
    queryFn: async () => {
      const res = await window.api.getSuppliers(targetWhId)
      return (res || []) as Supplier[]
    }
  })

  return { suppliers, loading, refetch }
}
