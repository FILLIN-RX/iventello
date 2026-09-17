import { PrismaClient } from '@prisma/client'

export function createClientService(prisma: PrismaClient) {
  return {
    async search(query: string, warehouseId?: string) {
      if (!query || query.length < 2) return []
      const where: any = {
        OR: [
          { name: { contains: query } },
          { email: { contains: query } },
          { phone: { contains: query } }
        ]
      }
      if (warehouseId) {
        where.AND = [{ OR: [{ warehouseId }, { warehouseId: null }] }]
      }
      const clients = await prisma.client.findMany({
        where,
        include: {
          sales: {
            where: { status: { not: 'ANNULE' }, ...(warehouseId ? { warehouseId } : {}) },
            select: { finalTotal: true, createdAt: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 20
      })
      return clients.map(c => ({
        client: c,
        totalSpent: c.sales.reduce((s, sale) => s + sale.finalTotal, 0),
        purchaseCount: c.sales.length,
        lastPurchase: c.sales.length > 0
          ? c.sales.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0].createdAt
          : null,
        rank: 'standard' as const
      }))
    },

    async getAllWithStats(warehouseId?: string) {
      const where: any = warehouseId ? { OR: [{ warehouseId }, { warehouseId: null }] } : {}
      const clients = await prisma.client.findMany({
        where,
        include: {
          sales: {
            where: { status: { not: 'ANNULE' }, ...(warehouseId ? { warehouseId } : {}) },
            include: { warehouse: true, items: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      })

      const stats = clients.map((c) => {
        const totalSpent = c.sales.reduce((s, sale) => s + sale.finalTotal, 0)
        const lastPurchase = c.sales.length > 0
          ? c.sales.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0].createdAt
          : null
        return { client: c, totalSpent, purchaseCount: c.sales.length, lastPurchase }
      })

      const sorted = stats.sort((a, b) => b.totalSpent - a.totalSpent)
      const premiumThreshold = sorted.length > 0 ? sorted[Math.min(2, sorted.length - 1)].totalSpent : 0
      const fideleThreshold = sorted.length > 0 ? sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.3))].totalSpent : 0

      return sorted.map((s) => ({
        ...s,
        rank: s.totalSpent >= premiumThreshold && s.purchaseCount >= 3 ? 'premium' as const
          : s.totalSpent >= fideleThreshold || s.purchaseCount >= 2 ? 'fidele' as const
          : 'standard' as const
      }))
    },

    async getByIdWithSales(id: string) {
      const client = await prisma.client.findUnique({
        where: { id },
        include: {
          sales: {
            include: { warehouse: true, items: { include: { product: true } } },
            orderBy: { createdAt: 'desc' }
          }
        }
      })
      if (!client) return null

      const validSales = client.sales.filter(s => s.status !== 'ANNULE')
      const totalSpent = validSales.reduce((s, sale) => s + sale.finalTotal, 0)
      const lastPurchase = validSales.length > 0 ? validSales[0].createdAt : null
      const rank = totalSpent > 0 ? (totalSpent > 50000 || validSales.length >= 5 ? 'premium' as const : validSales.length >= 2 ? 'fidele' as const : 'standard' as const) : 'standard' as const

      return { client, totalSpent, purchaseCount: validSales.length, rank, lastPurchase, sales: client.sales }
    },

    async create(data: { name: string; email?: string; phone?: string; address?: string; notes?: string; warehouseId?: string }) {
      const { warehouseId, ...rest } = data
      const createData: any = { ...rest }
      if (warehouseId) {
        createData.warehouse = { connect: { id: warehouseId } }
      }
      return prisma.client.create({ data: createData })
    },

    async update(id: string, data: Partial<{ name: string; email: string; phone: string; address: string; notes: string }>) {
      return prisma.client.update({ where: { id }, data })
    },

    async delete(id: string) {
      await prisma.sale.updateMany({ where: { clientId: id }, data: { clientId: null } })
      await prisma.client.delete({ where: { id } })
    }
  }
}
