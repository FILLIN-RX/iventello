import { PrismaClient } from '@prisma/client'

export function createCashRegisterService(prisma: PrismaClient) {
  return {
    async getSummary(warehouseId: string) {
      const startOfDay = new Date()
      startOfDay.setHours(0, 0, 0, 0)

      const transactions = await prisma.cashTransaction.findMany({
        where: {
          warehouseId,
          createdAt: { gte: startOfDay },
          category: { not: 'CANAL_PLUS' }
        },
        select: { type: true, totalAmount: true }
      })

      let totalEntrees = 0
      let totalSorties = 0
      for (const t of transactions) {
        if (t.type === 'ENTREE') totalEntrees += t.totalAmount
        else totalSorties += t.totalAmount
      }

      const stocks = await prisma.stock.findMany({
        where: { warehouseId },
        include: { product: true }
      })

      const valeurTotaleStock = stocks.reduce((acc, s) => acc + s.quantity * s.product.basePrice, 0)
      const totalProducts = stocks.reduce((acc, s) => acc + s.quantity, 0)
      const alertCount = stocks.filter((s) => s.quantity <= s.alertLimit).length

      return {
        soldeDuJour: totalEntrees - totalSorties,
        valeurTotaleStock,
        totalEntrees,
        totalSorties,
        totalProducts,
        alertCount
      }
    },

    async getCanalPlusBalance(warehouseId: string) {
      const result = await prisma.cashTransaction.aggregate({
        where: { warehouseId, category: 'CANAL_PLUS' },
        _sum: { totalAmount: true }
      })
      return result._sum.totalAmount ?? 0
    },

    async getCanalPlusDailyBalance(warehouseId: string) {
      const startOfDay = new Date()
      startOfDay.setHours(0, 0, 0, 0)
      const result = await prisma.cashTransaction.aggregate({
        where: { warehouseId, category: 'CANAL_PLUS', createdAt: { gte: startOfDay } },
        _sum: { totalAmount: true }
      })
      return result._sum.totalAmount ?? 0
    },

    async getTransactions(warehouseId: string) {
      return prisma.cashTransaction.findMany({
        where: { warehouseId },
        include: {
          lines: { include: { product: true } },
          warehouse: true
        },
        orderBy: { createdAt: 'desc' }
      })
    },

    async create(data: {
      type: 'ENTREE' | 'SORTIE'
      warehouseId: string
      totalAmount: number
      paymentMethod: string
      description?: string
      category?: string
      lines: { productId: string; quantity: number; unitPrice: number; subTotal: number }[]
    }) {
      const transaction = await prisma.cashTransaction.create({
        data: {
          type: data.type,
          totalAmount: data.totalAmount,
          paymentMethod: data.paymentMethod,
          description: data.description ?? null,
          category: data.category ?? 'GENERAL',
          warehouseId: data.warehouseId,
          lines: { create: data.lines }
        },
        include: {
          lines: { include: { product: true } },
          warehouse: true
        }
      })

      // Impact stock (sauf pour Canal+ qui n'affecte pas le stock physique)
      if (data.category !== 'CANAL_PLUS') {
        for (const line of data.lines) {
          const stock = await prisma.stock.findFirst({
            where: { productId: line.productId, warehouseId: data.warehouseId }
          })
          if (stock) {
            const qtyChange = data.type === 'ENTREE' ? -line.quantity : line.quantity
            await prisma.stock.update({
              where: { id: stock.id },
              data: { quantity: { increment: qtyChange } }
            })
          } else if (data.type === 'SORTIE') {
            await prisma.stock.create({
              data: {
                productId: line.productId,
                warehouseId: data.warehouseId,
                quantity: line.quantity,
                alertLimit: 5
              }
            })
          }
        }
      }

      return transaction
    },

    async delete(id: string) {
      await prisma.cashTransaction.delete({ where: { id } })
    }
  }
}
