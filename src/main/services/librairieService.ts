import { PrismaClient } from '@prisma/client'

const bookInclude = {
  classLevel: true,
  subject: true,
  activityBook: true,
  linkedActivityBooks: true,
  stocks: { include: { warehouse: true, classLevel: true } }
}

export function createLibrairieService(prisma: PrismaClient) {
  return {
    async getClassLevels(system?: string) {
      const where = system ? { system } : {}
      return prisma.classLevel.findMany({ where, orderBy: { order: 'asc' } })
    },

    async getSubjects(system?: string) {
      const where = system ? { system } : {}
      return prisma.subject.findMany({ where, orderBy: { name: 'asc' } })
    },

    async getBooks(classLevelId?: string) {
      const where = classLevelId ? { classLevelId } : {}
      return prisma.book.findMany({ where, include: bookInclude, orderBy: { title: 'asc' } })
    },

    async getBook(id: string) {
      return prisma.book.findUnique({ where: { id }, include: bookInclude })
    },

    async createBook(data: Record<string, unknown>) {
      const d = data as Record<string, any>
      const createData: Record<string, any> = {
        title: d.title,
        price: d.price,
        isbn: d.isbn || null,
        author: d.author || null,
        editor: d.editor || null,
        year: d.year || null,
        purchasePrice: d.purchasePrice ?? null,
        isOfficialProgram: d.isOfficialProgram !== undefined ? Boolean(d.isOfficialProgram) : true,
        isPacket: d.isPacket ?? false,
        itemsPerPacket: d.itemsPerPacket ?? 1,
        unitSellingPrice: d.unitSellingPrice ?? null,
        imageUrl: d.imageUrl ?? null,
        classLevel: { connect: { id: d.classLevelId } }
      }
      if (d.subjectId) createData.subject = { connect: { id: d.subjectId } }
      if (d.activityBookId) createData.activityBook = { connect: { id: d.activityBookId } }
      return prisma.book.create({ data: createData as any, include: bookInclude })
    },

    async updateBook(id: string, data: Record<string, unknown>) {
      const { classLevelId, subjectId, activityBookId, ...rest } = data as any
      const updateData: any = { ...rest }
      if (classLevelId) updateData.classLevel = { connect: { id: classLevelId } }
      if (subjectId) updateData.subject = { connect: { id: subjectId } }
      else if (subjectId === null) updateData.subject = { disconnect: true }
      if (activityBookId) updateData.activityBook = { connect: { id: activityBookId } }
      else if (activityBookId === null) updateData.activityBook = { disconnect: true }
      return prisma.book.update({ where: { id }, data: updateData, include: bookInclude })
    },

    async deleteBook(id: string) {
      await prisma.book.delete({ where: { id } })
    },

    async getBookStocks(warehouseId: string, classLevelId?: string) {
      const where: any = { warehouseId }
      if (classLevelId) where.classLevelId = classLevelId
      return prisma.bookStock.findMany({
        where,
        include: { warehouse: true, classLevel: true, book: true },
        orderBy: { book: { title: 'asc' } }
      })
    },

    async createBookStock(data: { bookId: string; warehouseId: string; classLevelId: string; quantity?: number; alertLimit?: number }) {
      return prisma.bookStock.create({
        data: {
          bookId: data.bookId,
          warehouseId: data.warehouseId,
          classLevelId: data.classLevelId,
          quantity: data.quantity ?? 0,
          alertLimit: data.alertLimit ?? 5
        },
        include: { warehouse: true, classLevel: true, book: true }
      })
    },

    async updateBookStock(id: string, data: Record<string, unknown>) {
      return prisma.bookStock.update({
        where: { id },
        data,
        include: { warehouse: true, classLevel: true, book: true }
      })
    },

    async getBookStockAlerts() {
      const stocks = await prisma.bookStock.findMany({
        where: { alertLimit: { gt: 0 } },
        include: { book: { include: { classLevel: true, subject: true } }, warehouse: true, classLevel: true }
      })
      return stocks
        .filter(s => s.quantity <= s.alertLimit)
        .map(s => ({ book: s.book, stock: s, warehouse: s.warehouse }))
    },

    async getRupturedBooks() {
      const stocks = await prisma.bookStock.findMany({
        include: { book: { include: { classLevel: true, subject: true } }, warehouse: true, classLevel: true }
      })
      return stocks
        .filter(s => s.quantity === 0)
        .map(s => ({ book: s.book, stock: s, warehouse: s.warehouse }))
    },

    async restockBook(bookId: string, warehouseId: string, quantity: number, purchasePrice?: number, editor?: string) {
      return prisma.$transaction(async (tx) => {
        const book = await tx.book.findUnique({ where: { id: bookId } })
        if (!book) throw new Error(`Livre ${bookId} introuvable`)

        const existing = await tx.bookStock.findFirst({ where: { bookId, warehouseId } })
        if (existing) {
          await tx.bookStock.update({
            where: { id: existing.id },
            data: { quantity: { increment: quantity } }
          })
        } else {
          await tx.bookStock.create({
            data: { bookId, warehouseId, classLevelId: book.classLevelId, quantity, alertLimit: 5 }
          })
        }

        if (purchasePrice && purchasePrice > 0) {
          await tx.cashTransaction.create({
            data: {
              type: 'SORTIE',
              totalAmount: purchasePrice * quantity,
              paymentMethod: 'ESPECES',
              description: `Achat réappro livre : ${book.title} ×${quantity}${editor ? ` (${editor})` : ''}`,
              category: 'LIBRAIRIE',
              warehouseId,
              lines: { create: [] }
            }
          })
        }

        return tx.bookStock.findFirst({
          where: { bookId, warehouseId },
          include: { warehouse: true, classLevel: true, book: true }
        })
      })
    },

    async updateBookAlertLimit(bookId: string, warehouseId: string, alertLimit: number) {
      const stock = await prisma.bookStock.findFirst({ where: { bookId, warehouseId } })
      if (!stock) throw new Error('Stock livre introuvable')
      return prisma.bookStock.update({
        where: { id: stock.id },
        data: { alertLimit },
        include: { warehouse: true, classLevel: true, book: true }
      })
    },

    async bulkRestockBooks(data: {
      warehouseId?: string
      supplierName?: string
      paymentMethod?: string
      items: {
        bookId: string
        quantity: number
        purchasePrice: number
        sellingPrice?: number
        editor?: string
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

          const book = await tx.book.findUnique({ where: { id: item.bookId } })
          if (!book) continue

          const stock = await tx.bookStock.findFirst({
            where: { bookId: item.bookId, warehouseId: targetWarehouseId }
          })

          const qtyBefore = stock?.quantity || 0

          if (stock) {
            await tx.bookStock.update({
              where: { id: stock.id },
              data: { quantity: { increment: item.quantity } }
            })
          } else {
            await tx.bookStock.create({
              data: {
                bookId: item.bookId,
                warehouseId: targetWarehouseId,
                classLevelId: book.classLevelId,
                quantity: item.quantity,
                alertLimit: 5
              }
            })
          }

          const bookUpdateData: any = {}
          if (item.purchasePrice && item.purchasePrice > 0) {
            bookUpdateData.purchasePrice = item.purchasePrice
          }
          if (item.sellingPrice && item.sellingPrice > 0) {
            bookUpdateData.price = item.sellingPrice
          }
          if (Object.keys(bookUpdateData).length > 0) {
            await tx.book.update({
              where: { id: item.bookId },
              data: bookUpdateData
            })
          }

          await tx.stockMovement.create({
            data: {
              bookId: item.bookId,
              warehouseId: targetWarehouseId,
              type: 'ACHAT',
              quantity: item.quantity,
              quantityBefore: qtyBefore,
              quantityAfter: qtyBefore + item.quantity,
              unitCost: item.purchasePrice || 0,
              referenceDoc: data.supplierName ? `Fournisseur: ${data.supplierName}` : (item.editor ? `Éditeur: ${item.editor}` : null),
              notes: `Réapprovisionnement livre scolaire : ${book.title}`
            }
          })

          processedLines.push({
            bookId: item.bookId,
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
              description: `Achat réappro livres (${processedLines.length} titres)${data.supplierName ? ` — ${data.supplierName}` : ''}`,
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
