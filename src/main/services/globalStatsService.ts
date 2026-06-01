import { PrismaClient } from '@prisma/client'

export function createGlobalStatsService(prisma: PrismaClient) {
  return {
    async getStats() {
      const warehouses = await prisma.warehouse.findMany({ include: { _count: { select: { stocks: true } } } })
      const totalWarehouses = warehouses.length

      // Ventes par entrepôt (mois en cours)
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const sales = await prisma.sale.findMany({
        where: { createdAt: { gte: startOfMonth } },
        select: { warehouseId: true, finalTotal: true }
      })
      const salesByWarehouse: Record<string, number> = {}
      let totalSales = 0
      for (const s of sales) {
        salesByWarehouse[s.warehouseId] = (salesByWarehouse[s.warehouseId] || 0) + s.finalTotal
        totalSales += s.finalTotal
      }

      // Nombre total de produits en stock
      let totalProducts = 0
      for (const w of warehouses) totalProducts += w._count.stocks

      // Alertes stock (quantité <= alertLimit)
      const stocks = await prisma.stock.findMany({ where: { alertLimit: { gt: 0 } }, select: { quantity: true, alertLimit: true } })
      const stockAlerts = stocks.filter(s => s.quantity <= s.alertLimit).length

      // Classement des entrepôts
      const warehouseStats = await Promise.all(
        warehouses.map(async (w) => {
          const totalSalesAmount = salesByWarehouse[w.id] || 0
          const totalItems = await prisma.stock.aggregate({
            where: { warehouseId: w.id },
            _sum: { quantity: true }
          })
          const alertStocks = await prisma.stock.findMany({
            where: { warehouseId: w.id, alertLimit: { gt: 0 } },
            select: { quantity: true, alertLimit: true }
          })
          const alerts = alertStocks.filter(s => s.quantity <= s.alertLimit).length
          return {
            id: w.id,
            name: w.name,
            sales: totalSalesAmount,
            products: w._count.stocks,
            totalItems: totalItems._sum.quantity || 0,
            alerts,
          }
        })
      )
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
