import { useQuery } from '@tanstack/react-query'
import { QUERY_KEYS } from '../lib/queryClient'
import type { StockAlert } from '../../../shared/types'

export function useStockAlerts() {
  const { data: alerts = [], isLoading: loading, error, refetch } = useQuery<StockAlert[]>({
    queryKey: QUERY_KEYS.stockAlerts,
    queryFn: async () => {
      const res = await window.api.getStockAlerts()
      return (res || []) as StockAlert[]
    }
  })

  return {
    alerts,
    loading,
    error: error instanceof Error ? error.message : null,
    refetch
  }
}
