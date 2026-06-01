import { PrismaClient } from '@prisma/client'

export function createExpenseService(prisma: PrismaClient) {
  return {
    async getAll() {
      return prisma.expense.findMany({ orderBy: { date: 'desc' } })
    },

    async create(data: { title: string; amount: number; category: string; description?: string | null; date?: Date }) {
      const { title, amount, category, description, date } = data as any
      return prisma.expense.create({ data: { title, amount, category, description, date } })
    },

    async delete(id: string) {
      await prisma.expense.delete({ where: { id } })
    }
  }
}
