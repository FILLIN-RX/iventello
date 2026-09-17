import { useQuery } from '@tanstack/react-query'
import { QUERY_KEYS } from '../lib/queryClient'
import type { Warehouse } from '../../../shared/types'

export function useWarehouses() {
  const { data: warehouses = [], isLoading: loading, error, refetch } = useQuery<Warehouse[]>({
    queryKey: QUERY_KEYS.warehouses,
    queryFn: async () => {
      const res = await window.api.getWarehouses()
      return (res || []) as Warehouse[]
    }
  })

  return {
    warehouses,
    loading,
    error: error instanceof Error ? error.message : null,
    refetch
  }
}
