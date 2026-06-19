import { PrismaClient } from '@prisma/client'

export function createGlobalStatsService(prisma: PrismaClient) {
  return {
    async getStats() {
      const warehouses = await prisma.warehouse.findMany({ include: { _count: { select: { stocks: true } } } })
      const totalWarehouses = warehouses.length

      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

      const [sales, stocks, stockAggregates] = await Promise.all([
        prisma.sale.findMany({
          where: { createdAt: { gte: startOfMonth } },
          select: { warehouseId: true, finalTotal: true }
        }),
        prisma.stock.findMany({
          where: { alertLimit: { gt: 0 } },
          select: { warehouseId: true, quantity: true, alertLimit: true }
        }),
        prisma.stock.groupBy({
          by: ['warehouseId'],
          _sum: { quantity: true },
        })
      ])

      const salesByWarehouse: Record<string, number> = {}
      let totalSales = 0
      for (const s of sales) {
        salesByWarehouse[s.warehouseId] = (salesByWarehouse[s.warehouseId] || 0) + s.finalTotal
        totalSales += s.finalTotal
      }

      let totalProducts = 0
      for (const w of warehouses) totalProducts += w._count.stocks

      const stockAlerts = stocks.filter(s => s.quantity <= s.alertLimit).length

      const quantityByWarehouse: Record<string, number> = {}
      for (const agg of stockAggregates) {
        quantityByWarehouse[agg.warehouseId] = agg._sum.quantity || 0
      }

      const alertsByWarehouse: Record<string, number> = {}
      for (const s of stocks) {
        if (s.quantity <= s.alertLimit) {
          alertsByWarehouse[s.warehouseId] = (alertsByWarehouse[s.warehouseId] || 0) + 1
        }
      }

      const warehouseStats = warehouses.map((w) => ({
        id: w.id,
        name: w.name,
        sales: salesByWarehouse[w.id] || 0,
        products: w._count.stocks,
        totalItems: quantityByWarehouse[w.id] || 0,
        alerts: alertsByWarehouse[w.id] || 0,
      }))
      warehouseStats.sort((a, b) => b.sales - a.sales)
      const topWarehouse = warehouseStats.length > 0 ? warehouseStats[0] : null

      return {
        warehouses: totalWarehouses,
        products: totalProducts,
        sales: totalSales,
        stockAlerts,
        topWarehouse,
        warehouseStats,
      }
    }
  }
}
