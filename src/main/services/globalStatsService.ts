import { PrismaClient } from '@prisma/client'

export function createGlobalStatsService(prisma: PrismaClient) {
  return {
    async getStats(userId?: string) {
      const whereClause = userId ? {
        userAccess: {
          some: {
            userId
          }
        }
      } : {}

      const warehouses = await prisma.warehouse.findMany({
        where: whereClause,
        include: { _count: { select: { stocks: true } } }
      })
      const totalWarehouses = warehouses.length
      const warehouseIds = warehouses.map(w => w.id)

      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

      const [posSales, bookSales, serviceSales, canalSales, stocks, stockAggregates] = await Promise.all([
        prisma.sale.findMany({
          where: {
            warehouseId: { in: warehouseIds },
            status: { not: 'ANNULE' },
            createdAt: { gte: startOfMonth }
          },
          select: { warehouseId: true, finalTotal: true }
        }),
        prisma.bookSale.findMany({
          where: {
            warehouseId: { in: warehouseIds },
            createdAt: { gte: startOfMonth }
          },
          select: { warehouseId: true, totalAmount: true, discount: true }
        }),
        prisma.serviceSale.findMany({
          where: {
            warehouseId: { in: warehouseIds },
            createdAt: { gte: startOfMonth }
          },
          select: { warehouseId: true, totalAmount: true }
        }),
        prisma.canalPlusSale.findMany({
          where: {
            warehouseId: { in: warehouseIds },
            createdAt: { gte: startOfMonth }
          },
          select: { warehouseId: true, amount: true }
        }),
        prisma.stock.findMany({
          where: {
            warehouseId: { in: warehouseIds },
            alertLimit: { gt: 0 }
          },
          select: { warehouseId: true, quantity: true, alertLimit: true }
        }),
        prisma.stock.groupBy({
          by: ['warehouseId'],
          where: { warehouseId: { in: warehouseIds } },
          _sum: { quantity: true },
        })
      ])

      const salesByWarehouse: Record<string, number> = {}
      let totalSales = 0

      for (const s of posSales) {
        const val = s.finalTotal || 0
        salesByWarehouse[s.warehouseId] = (salesByWarehouse[s.warehouseId] || 0) + val
        totalSales += val
      }
      for (const bs of bookSales) {
        const val = (bs.totalAmount || 0) - (bs.discount || 0)
        salesByWarehouse[bs.warehouseId] = (salesByWarehouse[bs.warehouseId] || 0) + val
        totalSales += val
      }
      for (const ss of serviceSales) {
        const val = ss.totalAmount || 0
        salesByWarehouse[ss.warehouseId] = (salesByWarehouse[ss.warehouseId] || 0) + val
        totalSales += val
      }
      for (const cs of canalSales) {
        const val = cs.amount || 0
        salesByWarehouse[cs.warehouseId] = (salesByWarehouse[cs.warehouseId] || 0) + val
        totalSales += val
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
