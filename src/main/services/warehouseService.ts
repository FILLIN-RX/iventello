import { PrismaClient } from '@prisma/client'

export function createWarehouseService(prisma: PrismaClient) {
  return {
    async getAll() {
      return prisma.warehouse.findMany({ orderBy: { name: 'asc' } })
    },

    async getById(id: string) {
      return prisma.warehouse.findUnique({ where: { id } })
    },

    async create(data: { name: string; location?: string; logoUrl?: string; mobileMoneyEnabled?: boolean }) {
      return prisma.warehouse.create({ data })
    },

    async update(id: string, data: Partial<{ name: string; location: string; logoUrl: string; mobileMoneyEnabled: boolean }>) {
      return prisma.warehouse.update({ where: { id }, data })
    },

    async delete(id: string) {
      await prisma.stock.deleteMany({ where: { warehouseId: id } })
      await prisma.sale.deleteMany({ where: { warehouseId: id } })
      await prisma.warehouse.delete({ where: { id } })
    }
  }
}
