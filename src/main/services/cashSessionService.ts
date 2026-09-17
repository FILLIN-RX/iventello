import { PrismaClient } from '@prisma/client'

export function createCashSessionService(prisma: PrismaClient) {
  return {
    async getCurrentSession(warehouseId: string) {
      return prisma.cashSession.findFirst({
        where: { warehouseId, status: 'OUVERTE' },
        include: { user: true, warehouse: true },
        orderBy: { openedAt: 'desc' }
      })
    },

    async openSession(params: { warehouseId: string; openingAmount: number; userId?: string; notes?: string }) {
      // Vérifier s'il y a déjà une session ouverte pour cet entrepôt
      const existing = await prisma.cashSession.findFirst({
        where: { warehouseId: params.warehouseId, status: 'OUVERTE' }
      })
      if (existing) {
        throw new Error('Une session de caisse est déjà ouverte pour cet entrepôt. Veuillez la clôturer d\'abord.')
      }

      return prisma.cashSession.create({
        data: {
          warehouseId: params.warehouseId,
          openingAmount: params.openingAmount,
          userId: params.userId ?? null,
          notes: params.notes ?? null,
          status: 'OUVERTE'
        },
        include: { user: true, warehouse: true }
      })
    },

    async closeSession(params: { sessionId: string; closingAmountActual: number; notes?: string }) {
      const session = await prisma.cashSession.findUnique({
        where: { id: params.sessionId },
        include: { warehouse: true }
      })
      if (!session) throw new Error('Session de caisse introuvable')
      if (session.status !== 'OUVERTE') throw new Error('Cette session est déjà clôturée')

      // Calculer tous les mouvements financiers survenus depuis l'ouverture de la session
      const [sales, cashTransactions] = await Promise.all([
        prisma.sale.findMany({
          where: {
            warehouseId: session.warehouseId,
            createdAt: { gte: session.openedAt },
            status: { not: 'ANNULE' }
          }
        }),
        prisma.cashTransaction.findMany({
          where: {
            warehouseId: session.warehouseId,
            createdAt: { gte: session.openedAt }
          }
        })
      ])

      const totalSales = sales.reduce((sum, s) => sum + s.finalTotal, 0)
      let totalCashIn = 0
      let totalCashOut = 0

      for (const t of cashTransactions) {
        if (t.paymentMethod === 'ESPECES') {
          if (t.type === 'ENTREE') totalCashIn += t.totalAmount
          else totalCashOut += t.totalAmount
        }
      }

      const closingAmountExpected = session.openingAmount + totalCashIn - totalCashOut
      const difference = params.closingAmountActual - closingAmountExpected

      return prisma.cashSession.update({
        where: { id: params.sessionId },
        data: {
          status: 'CLOTUREE',
          closedAt: new Date(),
          closingAmountExpected,
          closingAmountActual: params.closingAmountActual,
          difference,
          totalSales,
          totalCashIn,
          totalCashOut,
          notes: params.notes ? `${session.notes ? session.notes + ' — ' : ''}${params.notes}` : session.notes
        },
        include: { user: true, warehouse: true }
      })
    },

    async getSessionHistory(warehouseId: string, page?: number, pageSize?: number) {
      if (page && pageSize) {
        const [sessions, total] = await Promise.all([
          prisma.cashSession.findMany({
            where: { warehouseId },
            include: { user: true, warehouse: true },
            orderBy: { openedAt: 'desc' },
            skip: (page - 1) * pageSize,
            take: pageSize
          }),
          prisma.cashSession.count({ where: { warehouseId } })
        ])
        return { sessions, total, page, pageSize, totalPages: Math.ceil(total / pageSize) }
      }

      return prisma.cashSession.findMany({
        where: { warehouseId },
        include: { user: true, warehouse: true },
        orderBy: { openedAt: 'desc' },
        take: 100
      })
    }
  }
}
