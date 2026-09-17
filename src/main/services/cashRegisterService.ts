import { PrismaClient } from '@prisma/client'

export function createCashRegisterService(prisma: PrismaClient) {
  return {
    async getSummary(warehouseId?: string) {
      const startOfDay = new Date()
      startOfDay.setHours(0, 0, 0, 0)

      const warehouseFilter = (warehouseId && warehouseId !== 'ALL' && warehouseId !== '') ? { warehouseId } : {}

      // Transactions de caisse journalières (Ventes directes, Avances, Non livrés et Dépenses de fonctionnement)
      const transactions = await prisma.cashTransaction.findMany({
        where: {
          ...warehouseFilter,
          createdAt: { gte: startOfDay },
          category: { notIn: ['CANAL_PLUS', 'ACHAT_STOCK', 'ACHATS', 'LIBRAIRIE'] }
        },
        select: { type: true, totalAmount: true, category: true, description: true }
      })

      let totalEntrees = 0
      let totalSorties = 0
      let totalNonLivreDaily = 0
      let totalAvancesDaily = 0

      for (const t of transactions) {
        if (t.type === 'ENTREE') {
          totalEntrees += t.totalAmount
          const desc = t.description || ''
          const isLivraison = t.category === 'LIVRAISON' || /livraison\s*effectu/i.test(desc)
          const isNonLivre = !isLivraison && (t.category === 'NON_LIVRE' || /non\s*livr|attente\s*de\s*livraison/i.test(desc))
          const isAvance = !isLivraison && !isNonLivre && (t.category === 'AVANCE' || (/avance/i.test(desc) && !/avance\s*initiale/i.test(desc)))

          if (isNonLivre) {
            totalNonLivreDaily += t.totalAmount
          } else if (isAvance) {
            totalAvancesDaily += t.totalAmount
          }
        } else {
          totalSorties += t.totalAmount
        }
      }

      // Solde des commandes actuellement NON LIVRÉES (actif en temps réel dans la base)
      const pendingDeliveriesSales = await prisma.sale.findMany({
        where: {
          ...warehouseFilter,
          deliveryStatus: { not: 'LIVRE' },
          status: { not: 'ANNULE' },
          OR: [
            { isPendingDelivery: true },
            { deliveryStatus: 'NON_LIVRE' },
            { deliveryStatus: 'DISPONIBLE' }
          ]
        },
        select: { finalTotal: true, montantAvance: true }
      })
      const totalNonLivreActive = pendingDeliveriesSales.reduce((sum, s) => sum + (s.montantAvance ?? s.finalTotal), 0)

      // Solde des Avances/Réservations de stock actives (temps réel)
      const activeAvanceSales = await prisma.sale.findMany({
        where: {
          ...warehouseFilter,
          isPendingDelivery: false,
          montantAvance: { gt: 0 },
          status: { in: ['EN_ATTENTE', 'VALIDE'] }
        },
        select: { finalTotal: true, montantAvance: true }
      })
      const totalAvancesActive = activeAvanceSales.reduce((sum, s) => sum + (s.montantAvance ?? 0), 0)

      const totalNonLivre = totalNonLivreActive
      const totalAvances = totalAvancesActive
      const totalVentesDirectes = Math.max(0, totalEntrees - totalNonLivreDaily - totalAvancesDaily)

      // Total des achats de stock du jour pour information séparée
      const achatTransactions = await prisma.cashTransaction.findMany({
        where: {
          ...warehouseFilter,
          createdAt: { gte: startOfDay },
          category: { in: ['ACHAT_STOCK', 'ACHATS', 'LIBRAIRIE'] }
        },
        select: { totalAmount: true }
      })
      const totalAchats = achatTransactions.reduce((acc, t) => acc + t.totalAmount, 0)

      const stocks = await prisma.stock.findMany({
        where: warehouseFilter,
        include: { product: true }
      })

      const valeurTotaleStock = stocks.reduce((acc, s) => acc + (s.quantity + s.quantityReservee) * s.product.basePrice, 0)
      const totalProducts = stocks.reduce((acc, s) => acc + s.quantity + s.quantityReservee, 0)
      const alertCount = stocks.filter((s) => (s.quantity + s.quantityReservee) <= s.alertLimit).length

      return {
        soldeDuJour: totalEntrees - totalSorties,
        valeurTotaleStock,
        totalEntrees,
        totalSorties,
        totalAchats,
        totalNonLivre,
        totalAvances,
        totalVentesDirectes,
        totalProducts,
        alertCount
      }
    },

    async getCanalPlusBalance(warehouseId?: string) {
      const warehouseFilter = (warehouseId && warehouseId !== 'ALL' && warehouseId !== '') ? { warehouseId } : {}
      const result = await prisma.cashTransaction.aggregate({
        where: { ...warehouseFilter, category: 'CANAL_PLUS' },
        _sum: { totalAmount: true }
      })
      return result._sum.totalAmount ?? 0
    },

    async getCanalPlusDailyBalance(warehouseId?: string) {
      const startOfDay = new Date()
      startOfDay.setHours(0, 0, 0, 0)
      const warehouseFilter = (warehouseId && warehouseId !== 'ALL' && warehouseId !== '') ? { warehouseId } : {}
      const result = await prisma.cashTransaction.aggregate({
        where: { ...warehouseFilter, category: 'CANAL_PLUS', createdAt: { gte: startOfDay } },
        _sum: { totalAmount: true }
      })
      return result._sum.totalAmount ?? 0
    },

    async getTransactions(warehouseId?: string, page?: number, pageSize?: number) {
      const warehouseFilter = (warehouseId && warehouseId !== 'ALL' && warehouseId !== '') ? { warehouseId } : {}
      if (page && pageSize) {
        const [transactions, total] = await Promise.all([
          prisma.cashTransaction.findMany({
            where: warehouseFilter,
            include: {
              lines: { include: { product: true } },
              warehouse: true
            },
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * pageSize,
            take: pageSize
          }),
          prisma.cashTransaction.count({ where: warehouseFilter })
        ])
        return { transactions, total, page, pageSize, totalPages: Math.ceil(total / pageSize) }
      }
      return prisma.cashTransaction.findMany({
        where: warehouseFilter,
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
      lines: { productId?: string; bookId?: string; quantity: number; unitPrice: number; subTotal: number }[]
    }) {
      return prisma.$transaction(async (tx) => {
        const transaction = await tx.cashTransaction.create({
          data: {
            type: data.type,
            totalAmount: data.totalAmount,
            paymentMethod: data.paymentMethod,
            description: data.description ?? null,
            category: data.category ?? 'GENERAL',
            warehouseId: data.warehouseId,
            lines: { create: data.lines as any }
          },
          include: {
            lines: { include: { product: true } },
            warehouse: true
          }
        })

        // Impact stock (sauf pour Canal+ qui n'affecte pas le stock physique)
        if (data.category !== 'CANAL_PLUS' && data.lines && data.lines.length > 0) {
          for (const line of data.lines) {
            if (line.productId) {
              const stock = await tx.stock.findFirst({
                where: { productId: line.productId, warehouseId: data.warehouseId }
              })
              const qtyChange = data.type === 'ENTREE' ? -line.quantity : line.quantity
              if (stock) {
                await tx.stock.update({
                  where: { id: stock.id },
                  data: { quantity: { increment: qtyChange } }
                })
              } else if (data.type === 'SORTIE') {
                await tx.stock.create({
                  data: {
                    productId: line.productId,
                    warehouseId: data.warehouseId,
                    quantity: line.quantity,
                    alertLimit: 5
                  }
                })
              }
            } else if (line.bookId) {
              const bStock = await tx.bookStock.findFirst({
                where: { bookId: line.bookId, warehouseId: data.warehouseId }
              })
              const qtyChange = data.type === 'ENTREE' ? -line.quantity : line.quantity
              if (bStock) {
                await tx.bookStock.update({
                  where: { id: bStock.id },
                  data: { quantity: { increment: qtyChange } }
                })
              }
            }
          }
        }

        return transaction
      })
    },

    async delete(id: string) {
      return prisma.$transaction(async (tx) => {
        const existing = await tx.cashTransaction.findUnique({
          where: { id },
          include: { lines: true }
        })
        if (!existing) return

        // Réversion des impacts de stock si la transaction avait des lignes et n'était pas Canal+
        if (existing.category !== 'CANAL_PLUS' && existing.lines && existing.lines.length > 0) {
          for (const line of existing.lines) {
            const revertQtyChange = existing.type === 'ENTREE' ? line.quantity : -line.quantity
            if (line.productId) {
              const stock = await tx.stock.findFirst({
                where: { productId: line.productId, warehouseId: existing.warehouseId }
              })
              if (stock) {
                await tx.stock.update({
                  where: { id: stock.id },
                  data: { quantity: { increment: revertQtyChange } }
                })
              }
            } else if (line.bookId) {
              const bStock = await tx.bookStock.findFirst({
                where: { bookId: line.bookId, warehouseId: existing.warehouseId }
              })
              if (bStock) {
                await tx.bookStock.update({
                  where: { id: bStock.id },
                  data: { quantity: { increment: revertQtyChange } }
                })
              }
            }
          }
        }

        await tx.cashTransaction.delete({ where: { id } })
      })
    }
  }
}
