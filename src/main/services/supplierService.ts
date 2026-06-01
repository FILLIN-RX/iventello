import { PrismaClient } from '@prisma/client'

export function createSupplierService(prisma: PrismaClient) {
  return {
    async getAll() {
      return prisma.supplier.findMany({ orderBy: { name: 'asc' } })
    },

    async create(data: { name: string; email?: string; phone?: string; address?: string }) {
      return prisma.supplier.create({ data })
    },

    async update(id: string, data: Partial<{ name: string; email: string; phone: string; address: string }>) {
      return prisma.supplier.update({ where: { id }, data })
    },

    async delete(id: string) {
      await prisma.product.updateMany({ where: { supplierId: id }, data: { supplierId: null } })
      await prisma.supplier.delete({ where: { id } })
    }
  }
}
