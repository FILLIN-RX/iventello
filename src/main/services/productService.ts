import { PrismaClient } from '@prisma/client'

export function createProductService(prisma: PrismaClient) {
  const include = {
    supplier: true,
    category: true,
    stocks: { include: { warehouse: true } }
  }

  return {
    async getAll() {
      return prisma.product.findMany({ include, orderBy: { createdAt: 'desc' } })
    },

    async getByBarcode(barcode: string) {
      return prisma.product.findUnique({ where: { barcode }, include })
    },

    async getById(id: string) {
      return prisma.product.findUnique({ where: { id }, include })
    },

    async create(data: Record<string, unknown>) {
      const d = data as Record<string, any>
      let catId = d.categoryId
      if (!catId || catId === '__none__') {
        const defaultCategory = await prisma.category.upsert({
          where: { name: 'Autre' },
          update: {},
          create: { name: 'Autre', description: 'Catégorie par défaut' }
        })
        catId = defaultCategory.id
      }
      const createData: Record<string, any> = {
        barcode: d.barcode,
        name: d.name,
        basePrice: d.basePrice,
        sellingPrice: d.sellingPrice,
        vatRate: d.vatRate
      }
      if (d.imageUrl !== undefined) createData.imageUrl = d.imageUrl
      for (const key of Object.keys(d)) {
        if (key.startsWith('field') && key.endsWith('_value')) {
          createData[key] = d[key]
        }
      }
      if (catId) createData.category = { connect: { id: catId } }
      if (d.supplierId) createData.supplier = { connect: { id: d.supplierId } }
      return prisma.product.create({ data: createData, include })
    },

    async update(id: string, data: Record<string, unknown>) {
      const { supplierId, categoryId, ...rest } = data as any
      const updateData: any = { ...rest }
      if (categoryId) updateData.category = { connect: { id: categoryId } }
      if (supplierId) {
        updateData.supplier = { connect: { id: supplierId } }
      } else if (supplierId === null) {
        updateData.supplier = { disconnect: true }
      }
      return prisma.product.update({ where: { id }, data: updateData, include })
    },

    async delete(id: string) {
      await prisma.product.delete({ where: { id } })
    },

    async getStockAlerts() {
      const stocks = await prisma.stock.findMany({
        include: { product: { include: { supplier: true } }, warehouse: true }
      })
      const alerts: {
        product: any
        stock: any
        warehouse: any
      }[] = []
      for (const s of stocks) {
        if (s.quantity <= s.alertLimit) {
          alerts.push({ product: s.product, stock: s, warehouse: s.warehouse })
        }
      }
      return alerts
    }
  }
}
