import { PrismaClient } from '@prisma/client'

export function createProductService(prisma: PrismaClient) {
  const include = {
    supplier: true,
    category: true,
    stocks: { include: { warehouse: true } }
  }

  return {
    async getAll(warehouseId?: string, page?: number, pageSize?: number, search?: string) {
      const where: any = {}
      if (search) {
        where.name = { contains: search }
      }
      if (warehouseId) {
        where.OR = [{ warehouseId }, { warehouseId: null }]
      }
      if (page && pageSize) {
        const [products, total] = await Promise.all([
          prisma.product.findMany({
            where,
            include,
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * pageSize,
            take: pageSize
          }),
          prisma.product.count({ where })
        ])
        return { products, total, page, pageSize, totalPages: Math.ceil(total / pageSize) }
      }
      return prisma.product.findMany({ where, include, orderBy: { createdAt: 'desc' } })
    },

    async getByBarcode(barcode: string, warehouseId?: string) {
      if (warehouseId) {
        const p = await prisma.product.findFirst({ where: { barcode, warehouseId }, include })
        if (p) return p
      }
      return prisma.product.findFirst({ where: { barcode }, include })
    },

    async getById(id: string) {
      return prisma.product.findUnique({ where: { id }, include })
    },

    async create(data: Record<string, unknown>) {
      const d = data as Record<string, any>
      let catId = d.categoryId
      if (!catId || catId === '__none__') {
        const defaultCategory = await prisma.category.upsert({
          where: { id: 'default_category_autre' },
          update: {},
          create: { id: 'default_category_autre', name: 'Autre', description: 'Catégorie par défaut' }
        }).catch(async () => {
          return prisma.category.findFirst({ where: { name: 'Autre' } })
        })
        catId = defaultCategory?.id
      }
      const createData: Record<string, any> = {
        barcode: d.barcode,
        name: d.name,
        basePrice: d.basePrice,
        sellingPrice: d.sellingPrice,
        vatRate: d.vatRate,
        isPacket: d.isPacket ?? false,
        itemsPerPacket: d.itemsPerPacket ?? 1,
        unitSellingPrice: d.unitSellingPrice ?? null
      }
      if (d.warehouseId) {
        createData.warehouse = { connect: { id: d.warehouseId } }
      }
      if (d.imageUrl !== undefined) createData.imageUrl = d.imageUrl
      for (const key of Object.keys(d)) {
        if (key.startsWith('field') && key.endsWith('_value')) {
          createData[key] = d[key]
        }
      }
      if (catId) createData.category = { connect: { id: catId } }
      if (d.supplierId) createData.supplier = { connect: { id: d.supplierId } }
      const newProduct = await prisma.product.create({ data: createData as any, include })

      // Initialiser le stock pour cette boutique si warehouseId est fourni
      if (d.warehouseId) {
        await prisma.stock.upsert({
          where: { productId_warehouseId: { productId: newProduct.id, warehouseId: d.warehouseId } },
          update: {},
          create: {
            productId: newProduct.id,
            warehouseId: d.warehouseId,
            quantity: Number(d.initialQuantity) || 0,
            alertLimit: Number(d.alertLimit) || 5
          }
        }).catch(() => {})
      }

      return newProduct
    },

    async update(id: string, data: Record<string, unknown>) {
      const { supplierId, categoryId, warehouseId, ...rest } = data as any
      const updateData: any = { ...rest }
      if (categoryId) updateData.category = { connect: { id: categoryId } }
      if (supplierId) {
        updateData.supplier = { connect: { id: supplierId } }
      } else if (supplierId === null) {
        updateData.supplier = { disconnect: true }
      }
      if (warehouseId) {
        updateData.warehouse = { connect: { id: warehouseId } }
      }
      return prisma.product.update({ where: { id }, data: updateData, include })
    },

    async delete(id: string) {
      await prisma.product.delete({ where: { id } })
    },

    async deleteAll(warehouseId?: string) {
      try {
        if (warehouseId) {
          const prods = await prisma.product.findMany({
            where: { OR: [{ warehouseId }, { stocks: { some: { warehouseId } } }] },
            select: { id: true }
          })
          const prodIds = prods.map(p => p.id)
          if (prodIds.length > 0) {
            await prisma.stockMovement.deleteMany({ where: { warehouseId } }).catch(() => {})
            await prisma.stock.deleteMany({ where: { warehouseId } }).catch(() => {})
            await prisma.purchaseOrderItem.deleteMany({ where: { warehouseId } }).catch(() => {})
            await prisma.magasinTransaction.deleteMany({ where: { warehouseId } }).catch(() => {})
            await prisma.product.deleteMany({ where: { id: { in: prodIds } } })
          }
          return { count: prodIds.length }
        }

        await prisma.stockMovement.deleteMany().catch(() => {})
        await prisma.stock.deleteMany().catch(() => {})
        await prisma.purchaseOrderItem.deleteMany().catch(() => {})
        await prisma.magasinTransaction.deleteMany().catch(() => {})
        await prisma.cashTransactionLine.deleteMany().catch(() => {})
        await prisma.saleItem.deleteMany().catch(() => {})
        const res = await prisma.product.deleteMany()
        return { count: res.count }
      } catch (err) {
        // En cas de verrou ou contrainte résiduelle SQLite, purge directe
        if (!warehouseId) {
          await prisma.$executeRawUnsafe(`DELETE FROM StockMovement;`).catch(() => {})
          await prisma.$executeRawUnsafe(`DELETE FROM Stock;`).catch(() => {})
          await prisma.$executeRawUnsafe(`DELETE FROM PurchaseOrderItem;`).catch(() => {})
          await prisma.$executeRawUnsafe(`DELETE FROM MagasinTransaction;`).catch(() => {})
          await prisma.$executeRawUnsafe(`DELETE FROM CashTransactionLine;`).catch(() => {})
          await prisma.$executeRawUnsafe(`DELETE FROM SaleItem;`).catch(() => {})
          const count = await prisma.$executeRawUnsafe(`DELETE FROM Product;`)
          return { count }
        }
        return { count: 0 }
      }
    },

    async getStockAlerts() {
      const stocks = await prisma.stock.findMany({
        where: { alertLimit: { gt: 0 } },
        include: { product: { include: { supplier: true } }, warehouse: true }
      })
      return stocks
        .filter(s => s.quantity <= s.alertLimit)
        .map(s => ({ product: s.product, stock: s, warehouse: s.warehouse }))
    },

    async getProductDetails(id: string) {
      const product = await prisma.product.findUnique({
        where: { id },
        include: {
          supplier: true,
          category: true,
          stocks: { include: { warehouse: true } }
        }
      })
      if (!product) return null

      const [recentSales, stockMovements] = await Promise.all([
        prisma.saleItem.findMany({
          where: { productId: id },
          include: {
            sale: {
              include: {
                client: true,
                warehouse: true,
                agent: true
              }
            }
          },
          orderBy: { sale: { createdAt: 'desc' } },
          take: 50
        }),
        prisma.stockMovement.findMany({
          where: { productId: id },
          include: { warehouse: true },
          orderBy: { createdAt: 'desc' },
          take: 50
        })
      ])

      let totalUnitsSold = 0
      let totalRevenue = 0
      for (const item of recentSales) {
        if (item.sale && item.sale.status !== 'ANNULE') {
          totalUnitsSold += item.quantity
          totalRevenue += item.quantity * item.unitPrice
        }
      }

      const totalRestocked = stockMovements
        .filter((m) => m.type === 'ACHAT' || m.type === 'MAGASIN_ENTREE')
        .reduce((sum, m) => sum + Math.abs(m.quantity), 0)

      return {
        product,
        recentSales,
        stockMovements,
        stats: {
          totalUnitsSold,
          totalRevenue,
          totalRestocked,
          marginPerUnit: product.sellingPrice - product.basePrice,
          totalProfitEstimated: totalUnitsSold * (product.sellingPrice - product.basePrice)
        }
      }
    },

    async bulkRestockProducts(data: {
      warehouseId?: string
      supplierId?: string
      supplierName?: string
      paymentMethod?: string
      items: {
        productId: string
        quantity: number
        purchasePrice: number
        sellingPrice?: number
        sendToMagasin?: boolean
      }[]
    }) {
      return prisma.$transaction(async (tx) => {
        let targetWarehouseId = data.warehouseId
        if (!targetWarehouseId) {
          const defaultWh = await tx.warehouse.findFirst()
          if (defaultWh) targetWarehouseId = defaultWh.id
          else throw new Error('Aucun entrepôt disponible pour enregistrer l\'achat')
        }

        let totalAmount = 0
        const processedLines: any[] = []

        for (const item of data.items) {
          if (!item.quantity || item.quantity <= 0) continue
          const lineCost = (item.purchasePrice || 0) * item.quantity
          totalAmount += lineCost

          const stock = await tx.stock.findFirst({
            where: { productId: item.productId, warehouseId: targetWarehouseId }
          })

          const qtyBefore = stock ? (item.sendToMagasin ? stock.quantityMagasin : stock.quantity) : 0

          if (stock) {
            if (item.sendToMagasin) {
              await tx.stock.update({
                where: { id: stock.id },
                data: { quantityMagasin: { increment: item.quantity } }
              })
            } else {
              await tx.stock.update({
                where: { id: stock.id },
                data: { quantity: { increment: item.quantity } }
              })
            }
          } else {
            await tx.stock.create({
              data: {
                productId: item.productId,
                warehouseId: targetWarehouseId,
                quantity: item.sendToMagasin ? 0 : item.quantity,
                quantityMagasin: item.sendToMagasin ? item.quantity : 0,
                alertLimit: 5
              }
            })
          }

          const productUpdateData: any = {}
          if (item.purchasePrice && item.purchasePrice > 0) {
            productUpdateData.basePrice = item.purchasePrice
          }
          if (item.sellingPrice && item.sellingPrice > 0) {
            productUpdateData.sellingPrice = item.sellingPrice
          }
          if (Object.keys(productUpdateData).length > 0) {
            await tx.product.update({
              where: { id: item.productId },
              data: productUpdateData
            })
          }

          await tx.stockMovement.create({
            data: {
              productId: item.productId,
              warehouseId: targetWarehouseId,
              type: item.sendToMagasin ? 'MAGASIN_ENTREE' : 'ACHAT',
              quantity: item.quantity,
              quantityBefore: qtyBefore,
              quantityAfter: qtyBefore + item.quantity,
              unitCost: item.purchasePrice || 0,
              referenceDoc: data.supplierName ? `Fournisseur: ${data.supplierName}` : null,
              notes: `Réapprovisionnement groupé${item.sendToMagasin ? ' (vers magasin réserve)' : ' (vers rayon)'}`
            }
          })

          if (item.sendToMagasin) {
            await tx.magasinTransaction.create({
              data: {
                productId: item.productId,
                warehouseId: targetWarehouseId,
                type: 'ENTREE',
                quantity: item.quantity
              }
            })
          }

          processedLines.push({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.purchasePrice || 0,
            subTotal: lineCost
          })
        }

        if (totalAmount > 0) {
          await tx.cashTransaction.create({
            data: {
              type: 'SORTIE',
              totalAmount,
              paymentMethod: data.paymentMethod || 'ESPECES',
              description: `Achat réappro produits (${processedLines.length} articles)${data.supplierName ? ` — ${data.supplierName}` : ''}`,
              category: 'ACHAT_STOCK',
              warehouseId: targetWarehouseId,
              lines: {
                create: processedLines
              }
            }
          })
        }

        return { count: processedLines.length, totalAmount }
      })
    }
  }
}

