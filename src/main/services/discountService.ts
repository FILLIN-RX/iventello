import { PrismaClient } from '@prisma/client'

export function createDiscountService(prisma: PrismaClient) {
  return {
    async getAll(warehouseId?: string) {
      const where = warehouseId ? { warehouseId } : {}
      return prisma.discount.findMany({
        where,
        include: {
          sale: { include: { items: { include: { product: true } }, client: true, warehouse: true } },
          warehouse: true
        },
        orderBy: { createdAt: 'desc' }
      })
    },

    async create(data: { saleId: string; warehouseId: string; amount: number; reason?: string | null }) {
      return prisma.discount.create({ data })
    }
  }
}
