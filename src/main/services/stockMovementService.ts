import { PrismaClient } from '@prisma/client'

export interface RecordMovementParams {
  productId?: string | null
  bookId?: string | null
  warehouseId: string
  type: 'VENTE' | 'ACHAT' | 'MAGASIN_ENTREE' | 'MAGASIN_SORTIE' | 'ANNULATION_VENTE' | 'AJUSTEMENT' | 'RETOUR'
  quantity: number // Positif pour une entrée, négatif pour une sortie
  quantityBefore: number
  quantityAfter: number
  unitCost?: number | null
  referenceDoc?: string | null
  notes?: string | null
}

export function createStockMovementService(prisma: PrismaClient) {
  return {
    async recordMovement(data: RecordMovementParams, tx?: any) {
      const client = tx || prisma
      return client.stockMovement.create({
        data: {
          productId: data.productId ?? null,
          bookId: data.bookId ?? null,
          warehouseId: data.warehouseId,
          type: data.type,
          quantity: data.quantity,
          quantityBefore: data.quantityBefore,
          quantityAfter: data.quantityAfter,
          unitCost: data.unitCost ?? null,
          referenceDoc: data.referenceDoc ?? null,
          notes: data.notes ?? null
        }
      })
    },

    async getMovements(params: {
      warehouseId?: string
      productId?: string
      bookId?: string
      type?: string
      startDate?: string
      endDate?: string
      page?: number
      pageSize?: number
    }) {
      const where: any = {}
      if (params.warehouseId) where.warehouseId = params.warehouseId
      if (params.productId) where.productId = params.productId
      if (params.bookId) where.bookId = params.bookId
      if (params.type) where.type = params.type

      if (params.startDate || params.endDate) {
        where.createdAt = {}
        if (params.startDate) where.createdAt.gte = new Date(params.startDate)
        if (params.endDate) {
          const e = new Date(params.endDate)
          e.setHours(23, 59, 59, 999)
          where.createdAt.lte = e
        }
      }

      const include = {
        product: { select: { name: true, barcode: true, basePrice: true } },
        book: { select: { title: true, isbn: true, price: true, purchasePrice: true } },
        warehouse: { select: { name: true } }
      }

      if (params.page && params.pageSize) {
        const [items, total] = await Promise.all([
          prisma.stockMovement.findMany({
            where,
            include,
            orderBy: { createdAt: 'desc' },
            skip: (params.page - 1) * params.pageSize,
            take: params.pageSize
          }),
          prisma.stockMovement.count({ where })
        ])
        return {
          movements: items,
          total,
          page: params.page,
          pageSize: params.pageSize,
          totalPages: Math.ceil(total / params.pageSize)
        }
      }

      return prisma.stockMovement.findMany({
        where,
        include,
        orderBy: { createdAt: 'desc' },
        take: 500
      })
    }
  }
}
