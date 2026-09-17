import { PrismaClient } from '@prisma/client'

export function createCategoryService(prisma: PrismaClient) {
  return {
    async getAll(warehouseId?: string) {
      const where = warehouseId ? { OR: [{ warehouseId }, { warehouseId: null }] } : {}
      return prisma.category.findMany({
        where,
        include: {
          _count: {
            select: { products: true }
          }
        },
        orderBy: { name: 'asc' }
      })
    },

    async create(data: { name: string; description?: string | null; warehouseId?: string }) {
      const { name, description, warehouseId } = data
      return prisma.category.create({
        data: {
          name,
          description,
          ...(warehouseId ? { warehouse: { connect: { id: warehouseId } } } : {})
        }
      })
    },

    async update(id: string, data: Partial<{ name: string; description: string | null }>) {
      return prisma.category.update({ where: { id }, data })
    },

    async delete(id: string) {
      await prisma.product.updateMany({
        where: { categoryId: id },
        data: { categoryId: null }
      })
      await prisma.category.delete({ where: { id } })
    },

    async deleteAll() {
      await prisma.product.updateMany({
        where: { categoryId: { not: null } },
        data: { categoryId: null }
      })
      return prisma.category.deleteMany({})
    },

    async deleteEmpty() {
      const emptyCategories = await prisma.category.findMany({
        where: { products: { none: {} } },
        select: { id: true }
      })
      const ids = emptyCategories.map((c) => c.id)
      if (ids.length > 0) {
        return prisma.category.deleteMany({
          where: { id: { in: ids } }
        })
      }
      return { count: 0 }
    },

    async clearProducts(categoryId: string) {
      return prisma.product.updateMany({
        where: { categoryId },
        data: { categoryId: null }
      })
    }
  }
}

