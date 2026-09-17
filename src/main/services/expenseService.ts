import { PrismaClient } from '@prisma/client'

export function createExpenseService(prisma: PrismaClient) {
  return {
    async getAll(warehouseId?: string) {
      const where = warehouseId ? { OR: [{ warehouseId }, { warehouseId: null }] } : {}
      return prisma.expense.findMany({ where, orderBy: { date: 'desc' } })
    },

    async create(data: { title: string; amount: number; category: string; description?: string | null; date?: Date; warehouseId?: string }) {
      const { title, amount, category, description, date, warehouseId } = data as any
      const createData: any = { title, amount, category, description, date: date ? new Date(date) : undefined }
      if (warehouseId) {
        createData.warehouse = { connect: { id: warehouseId } }
      }
      return prisma.expense.create({ data: createData })
    },

    async delete(id: string) {
      await prisma.expense.delete({ where: { id } })
    }
  }
}
