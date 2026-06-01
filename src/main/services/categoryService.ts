import { PrismaClient } from '@prisma/client'

export function createCategoryService(prisma: PrismaClient) {
  return {
    async getAll() {
      return prisma.category.findMany({
        include: {
          _count: {
            select: { products: true }
          }
        },
        orderBy: { name: 'asc' }
      })
    },

    async create(data: { name: string; description?: string | null }) {
      return prisma.category.create({ data })
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
    }
  }
}
