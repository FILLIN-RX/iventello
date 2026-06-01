import { PrismaClient } from '@prisma/client'

export interface MonthlyReportData {
  categories: string[]
  salesByDay: Record<number, Record<string, number>>
  expensesByDay: Record<number, number>
  purchasesByDay: Record<number, number>
  discountsByDay: Record<number, number>
}

export function createMonthlyReportService(prisma: PrismaClient) {
  return {
    async getReportData(warehouseId: string, year: number, month: number): Promise<MonthlyReportData> {
      const startDate = new Date(year, month - 1, 1)
      const endDate = new Date(year, month, 1)

      // Ventes avec items → produits → catégories
      const sales = await prisma.sale.findMany({
        where: { warehouseId, createdAt: { gte: startDate, lt: endDate } },
        include: {
          items: {
            include: {
              product: { include: { category: true } }
            }
          }
        }
      })

      const categoriesSet = new Set<string>()
      const salesByDay: Record<number, Record<string, number>> = {}
      const discountsByDay: Record<number, number> = {}

      for (const sale of sales) {
        const day = new Date(sale.createdAt).getDate()
        if (!salesByDay[day]) salesByDay[day] = {}
        if (!discountsByDay[day]) discountsByDay[day] = 0

        if (sale.discount > 0) {
          discountsByDay[day] += sale.discount
        }

        for (const item of sale.items) {
          const catName = item.product.category?.name ?? 'Autre'
          categoriesSet.add(catName)
          const total = item.quantity * item.unitPrice
          salesByDay[day][catName] = (salesByDay[day][catName] ?? 0) + total
        }
      }

      // Dépenses
      const expenses = await prisma.expense.findMany({
        where: { date: { gte: startDate, lt: endDate } }
      })
      const expensesByDay: Record<number, number> = {}
      for (const exp of expenses) {
        const day = new Date(exp.date).getDate()
        expensesByDay[day] = (expensesByDay[day] ?? 0) + exp.amount
      }

      // Achats (CashTransaction type SORTIE avec description "Achat")
      const purchases = await prisma.cashTransaction.findMany({
        where: {
          warehouseId,
          type: 'SORTIE',
          createdAt: { gte: startDate, lt: endDate },
          description: { contains: 'Achat' }
        }
      })
      const purchasesByDay: Record<number, number> = {}
      for (const p of purchases) {
        const day = new Date(p.createdAt).getDate()
        purchasesByDay[day] = (purchasesByDay[day] ?? 0) + p.totalAmount
      }

      // Toutes les catégories (même sans vente)
      const allCategories = await prisma.category.findMany({ select: { name: true } })
      for (const c of allCategories) categoriesSet.add(c.name)
      categoriesSet.add('Autre')
      const categories = Array.from(categoriesSet).sort()

      return { categories, salesByDay, expensesByDay, purchasesByDay, discountsByDay }
    }
  }
}
