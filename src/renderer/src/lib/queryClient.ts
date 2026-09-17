import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes: data is instantly served from cache
      gcTime: 1000 * 60 * 30, // 30 minutes: keep inactive cache
      refetchOnWindowFocus: false, // Desktop app optimization
      refetchOnReconnect: true,
      retry: 1
    }
  }
})

export const QUERY_KEYS = {
  products: ['products'] as const,
  categories: ['categories'] as const,
  warehouses: ['warehouses'] as const,
  stockAlerts: ['stock-alerts'] as const,
  suppliers: ['suppliers'] as const,
  expenses: ['expenses'] as const,
  books: (classLevelId?: string) => ['books', classLevelId ?? 'all'] as const,
  classLevels: (system?: string) => ['classLevels', system ?? 'all'] as const,
  bookStocks: (warehouseId?: string) => ['bookStocks', warehouseId ?? 'all'] as const,
  bookSales: (warehouseId?: string) => ['bookSales', warehouseId ?? 'all'] as const,
  dashboardStats: (period?: string, warehouseId?: string) => ['dashboardStats', period ?? 'mois', warehouseId ?? 'all'] as const,
  stockMovements: (params?: any) => ['stockMovements', params ?? {}] as const
}
