import { PrismaClient } from '@prisma/client'

const saleInclude = {
  items: { include: { book: true } },
  warehouse: true,
  classLevel: true
}

export function createLibrairieSaleService(prisma: PrismaClient) {
  return {
    async create(data: {
      warehouseId: string
      studentName?: string
      className?: string
      classLevelId?: string
      totalAmount: number
      discount?: number
      paymentMethod: string
      notes?: string
      items: { bookId: string; quantity: number; unitPrice: number }[]
    }) {
      return prisma.$transaction(async (tx) => {
        for (const item of data.items) {
          const stock = await tx.bookStock.findFirst({
            where: { bookId: item.bookId, warehouseId: data.warehouseId }
          })
          if (!stock || stock.quantity < item.quantity) {
            const book = await tx.book.findUnique({ where: { id: item.bookId } })
            throw new Error(`Stock insuffisant pour "${book?.title ?? item.bookId}" : ${stock?.quantity ?? 0} disponible(s), ${item.quantity} demandé(s)`)
          }
        }

        const sale = await tx.bookSale.create({
          data: {
            warehouseId: data.warehouseId,
            studentName: data.studentName ?? null,
            className: data.className ?? null,
            classLevelId: data.classLevelId ?? null,
            totalAmount: data.totalAmount,
            discount: data.discount ?? 0,
            paymentMethod: data.paymentMethod,
            notes: data.notes ?? null,
            items: {
              create: data.items.map(i => ({
                bookId: i.bookId,
                quantity: i.quantity,
                unitPrice: i.unitPrice
              }))
            }
          },
          include: saleInclude
        })

        for (const item of data.items) {
          await tx.bookStock.updateMany({
            where: { bookId: item.bookId, warehouseId: data.warehouseId },
            data: { quantity: { decrement: item.quantity } }
          })
        }

        await tx.cashTransaction.create({
          data: {
            type: 'ENTREE',
            totalAmount: data.totalAmount - (data.discount ?? 0),
            paymentMethod: data.paymentMethod,
            description: `Vente librairie — ${data.studentName ? `élève ${data.studentName}` : ''}${data.className ? ` (${data.className})` : ''}${data.notes ? ` — ${data.notes}` : ''}`,
            category: 'LIBRAIRIE',
            warehouseId: data.warehouseId,
            lines: { create: [] }
          }
        })

        return sale
      })
    },

    async getAll(warehouseId: string) {
      return prisma.bookSale.findMany({
        where: { warehouseId },
        include: saleInclude,
        orderBy: { createdAt: 'desc' }
      })
    },

    async getStudentTotals(warehouseId: string, classLevelId: string) {
      const sales = await prisma.bookSale.findMany({
        where: { warehouseId, classLevelId },
        include: { items: { include: { book: true } } },
        orderBy: { createdAt: 'desc' }
      })

      const grouped = new Map<string, { studentName: string; className: string; total: number; items: any[] }>()
      for (const sale of sales) {
        const key = sale.studentName ?? `sans-nom-${sale.id}`
        const existing = grouped.get(key)
        if (existing) {
          existing.total += sale.totalAmount
          existing.items.push(...sale.items)
        } else {
          grouped.set(key, {
            studentName: sale.studentName ?? 'Sans nom',
            className: sale.className ?? '',
            total: sale.totalAmount,
            items: [...sale.items]
          })
        }
      }

      return Array.from(grouped.values()).sort((a, b) => a.studentName.localeCompare(b.studentName))
    },

    async searchStudents(query: string, warehouseId: string) {
      if (!query || query.length < 1) return []
      return prisma.bookSale.findMany({
        where: {
          warehouseId,
          studentName: { contains: query }
        },
        include: { items: { include: { book: true } }, classLevel: true, warehouse: true },
        orderBy: { createdAt: 'desc' }
      })
    },

    async getStudentSummary(studentName: string, classLevelId: string, warehouseId: string) {
      const requiredBooks = await prisma.book.findMany({
        where: { classLevelId },
        orderBy: { title: 'asc' }
      })

      const sales = await prisma.bookSale.findMany({
        where: { studentName, classLevelId, warehouseId },
        include: { items: { include: { book: true } } },
        orderBy: { createdAt: 'desc' }
      })

      const purchasedBookIds = new Set<string>()
      let totalDepense = 0
      for (const sale of sales) {
        for (const item of sale.items) {
          purchasedBookIds.add(item.bookId)
          totalDepense += item.unitPrice * item.quantity
        }
      }

      const coutTotal = requiredBooks.reduce((sum, b) => sum + b.price, 0)

      return {
        studentName,
        classLevelId,
        requiredBooks,
        purchasedBookIds: Array.from(purchasedBookIds),
        livresManquants: requiredBooks.filter(b => !purchasedBookIds.has(b.id)),
        livresAchetes: requiredBooks.filter(b => purchasedBookIds.has(b.id)),
        coutTotal,
        totalDepense,
        reliquat: Math.max(0, coutTotal - totalDepense),
        sales
      }
    }
  }
}
