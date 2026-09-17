import { PrismaClient } from '@prisma/client'

export function createSupplierService(prisma: PrismaClient) {
  return {
    async getAll(warehouseId?: string) {
      const where = warehouseId ? { OR: [{ warehouseId }, { warehouseId: null }] } : {}
      return prisma.supplier.findMany({ where, orderBy: { name: 'asc' } })
    },

    async create(data: { name: string; email?: string; phone?: string; address?: string; warehouseId?: string }) {
      const { warehouseId, ...rest } = data
      const createData: any = { ...rest }
      if (warehouseId) {
        createData.warehouse = { connect: { id: warehouseId } }
      }
      return prisma.supplier.create({ data: createData })
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
