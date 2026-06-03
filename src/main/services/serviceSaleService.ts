import { PrismaClient } from '@prisma/client'

export function createServiceSaleService(prisma: PrismaClient) {
  return {
    async getAll(warehouseId: string, search?: string) {
      const where: any = { warehouseId }
      if (search) {
        where.OR = [
          { clientName: { contains: search } },
          { invoiceNumber: { contains: search } },
        ]
      }
      return prisma.serviceSale.findMany({
        where,
        include: { warehouse: true },
        orderBy: { createdAt: 'desc' }
      })
    },

    async create(data: {
      warehouseId: string
      serviceType: string
      description?: string
      quantity: number
      unitPrice: number
      totalAmount: number
      clientName?: string
    }) {
      const now = new Date()
      const yymm = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
      const prefix = `SVC-${yymm}-`
      const last = await prisma.serviceSale.findFirst({
        where: { invoiceNumber: { startsWith: prefix } },
        orderBy: { invoiceNumber: 'desc' },
        select: { invoiceNumber: true }
      })
      const lastNum = last ? parseInt(last.invoiceNumber.split('-').pop() ?? '0', 10) : 0
      const invoiceNumber = `${prefix}${String(lastNum + 1).padStart(4, '0')}`

      const sale = await prisma.serviceSale.create({
        data: { ...data, invoiceNumber }
      })

      return { ...sale, invoiceNumber }
    }
  }
}
