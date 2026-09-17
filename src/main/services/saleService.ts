import { PrismaClient } from '@prisma/client'

export function createSaleService(prisma: PrismaClient, stockMovementService?: any) {
  const defaultInclude = {
    items: { include: { product: true, book: true } },
    client: true,
    warehouse: true,
    agent: true
  }

  return {
    async createSale(data: any) {
      const { items, saleStatus = 'VALIDE', agentId, pendingDelivery = false, montantAvance, ...saleData } = data

      if (!items || !Array.isArray(items) || items.length === 0) {
        throw new Error('La vente doit contenir au moins un article')
      }

      return prisma.$transaction(async (tx: any) => {
        // Générer le numéro de facture séquentiel (FAC-YYYY-MM-XXXX)
        const dateStr = new Date().toISOString().slice(0, 7) // YYYY-MM
        const pattern = `FAC-${dateStr}-`
        const last = await tx.sale.findFirst({
          where: { invoiceNumber: { startsWith: pattern } },
          orderBy: { createdAt: 'desc' },
          select: { invoiceNumber: true }
        })
        const lastNum = last ? parseInt(last.invoiceNumber.split('-').pop() ?? '0', 10) : 0
        const invoiceNumber = `${pattern}${String(lastNum + 1).padStart(4, '0')}`

        // Valider le stock UNIQUEMENT si ce n'est PAS une commande en attente d'arrivage (non livré)
        if (!pendingDelivery) {
          for (const item of items as { productId?: string; bookId?: string; quantity: number; unitPrice: number }[]) {
            if (item.productId) {
              const stock = await tx.stock.findFirst({
                where: { productId: item.productId, warehouseId: saleData.warehouseId },
                include: { product: true }
              })
              if (!stock || stock.quantity < item.quantity) {
                const productName = stock?.product?.name ?? item.productId
                throw new Error(`Stock insuffisant pour ${productName} : ${stock?.quantity ?? 0} disponible(s), ${item.quantity} demandé(s)`)
              }
            } else if (item.bookId) {
              const stock = await tx.bookStock.findFirst({
                where: { bookId: item.bookId, warehouseId: saleData.warehouseId },
                include: { book: true }
              })
              if (!stock || stock.quantity < item.quantity) {
                const bookName = stock?.book?.title ?? item.bookId
                throw new Error(`Stock insuffisant pour "${bookName}" : ${stock?.quantity ?? 0} disponible(s), ${item.quantity} demandé(s)`)
              }
            }
          }
        }

        const isDirectSale = !pendingDelivery && (saleStatus === 'VALIDE' || saleStatus === 'PAYE')

        // Créer la vente
        const saleDataToCreate: any = {
          ...saleData,
          invoiceNumber,
          status: saleStatus,
          isPendingDelivery: Boolean(pendingDelivery),
          deliveryStatus: pendingDelivery ? 'NON_LIVRE' : 'LIVRE'
        }
        if (agentId) saleDataToCreate.agentId = agentId
        if (montantAvance != null) saleDataToCreate.montantAvance = montantAvance
        if (saleStatus === 'PAYE') saleDataToCreate.paidAt = new Date()
        if (saleStatus === 'VALIDE') {
          saleDataToCreate.validatedAt = new Date()
          if (agentId) {
            const agent = await tx.user.findUnique({ where: { id: agentId } })
            if (agent && agent.commissionRate > 0) {
              saleDataToCreate.commissionAmount = Math.round(saleData.finalTotal * (agent.commissionRate / 100) * 100) / 100
            }
          }
        }

        const sale = await tx.sale.create({
          data: {
            ...saleDataToCreate,
            items: { create: items },
            ...(saleStatus === 'PAYE' ? { paidAt: new Date() } : {})
          },
          include: defaultInclude
        })

        // Créer l'entrée cahier de caisse
        const montantCaisse = (saleStatus === 'EN_ATTENTE' && montantAvance != null) ? montantAvance : saleData.finalTotal
        const isAdvanceSale = saleStatus === 'EN_ATTENTE' || (montantAvance != null && montantAvance < saleData.finalTotal)
        const txCategory = pendingDelivery ? 'NON_LIVRE' : (isAdvanceSale ? 'AVANCE' : 'VENTE')
        const descDetail = pendingDelivery
          ? `Non livré — Commande en attente de livraison — ${saleData.clientId ? 'client rattaché' : 'client'}${montantAvance != null && montantAvance !== saleData.finalTotal ? ` — avance ${montantAvance} FCFA sur ${saleData.finalTotal} FCFA` : ' (payée d\'avance)'}`
          : isAdvanceSale
          ? `Avance client — Réservation stock — ${saleData.clientId ? 'client rattaché' : 'client'}${montantAvance != null && montantAvance !== saleData.finalTotal ? ` — ${montantAvance} FCFA versés sur ${saleData.finalTotal} FCFA` : ''}`
          : `Vente directe — ${saleData.clientId ? 'client rattaché' : 'client anonyme'}`

        await tx.cashTransaction.create({
          data: {
            type: 'ENTREE',
            totalAmount: montantCaisse,
            paymentMethod: saleData.paymentMethod || 'ESPECES',
            description: descDetail,
            category: txCategory,
            warehouseId: saleData.warehouseId,
            lines: {
              create: (items as { productId?: string; bookId?: string; quantity: number; unitPrice: number }[]).map(
                (item) => ({
                  productId: item.productId ?? null,
                  bookId: item.bookId ?? null,
                  quantity: item.quantity,
                  unitPrice: item.unitPrice,
                  subTotal: item.quantity * item.unitPrice
                })
              )
            }
          }
        })

        // Gestion du déstockage ou réservation
        const decrementStock = async (item: { productId?: string; bookId?: string; quantity: number }) => {
          if (item.productId) {
            const s = await tx.stock.findFirst({
              where: { productId: item.productId, warehouseId: saleData.warehouseId },
              include: { product: true }
            })
            const before = s?.quantity ?? 0
            const after = before - item.quantity
            await tx.stock.updateMany({
              where: { productId: item.productId, warehouseId: saleData.warehouseId },
              data: { quantity: { decrement: item.quantity } }
            })
            if (stockMovementService) {
              await stockMovementService.recordMovement({
                productId: item.productId,
                warehouseId: saleData.warehouseId,
                type: 'VENTE',
                quantity: -item.quantity,
                quantityBefore: before,
                quantityAfter: after,
                unitCost: s?.product?.basePrice ?? null,
                referenceDoc: invoiceNumber,
                notes: `Vente directe — N° ${invoiceNumber}`
              }, tx)
            }
          } else if (item.bookId) {
            const bs = await tx.bookStock.findFirst({
              where: { bookId: item.bookId, warehouseId: saleData.warehouseId },
              include: { book: true }
            })
            const before = bs?.quantity ?? 0
            const after = before - item.quantity
            await tx.bookStock.updateMany({
              where: { bookId: item.bookId, warehouseId: saleData.warehouseId },
              data: { quantity: { decrement: item.quantity } }
            })
            if (stockMovementService) {
              await stockMovementService.recordMovement({
                bookId: item.bookId,
                warehouseId: saleData.warehouseId,
                type: 'VENTE',
                quantity: -item.quantity,
                quantityBefore: before,
                quantityAfter: after,
                unitCost: bs?.book?.purchasePrice ?? null,
                referenceDoc: invoiceNumber,
                notes: `Vente librairie — N° ${invoiceNumber}`
              }, tx)
            }
          }
        }

        const reserveStock = async (item: { productId?: string; bookId?: string; quantity: number }) => {
          if (item.productId) {
            const s = await tx.stock.findFirst({
              where: { productId: item.productId, warehouseId: saleData.warehouseId },
              include: { product: true }
            })
            const before = s?.quantity ?? 0
            const after = before - item.quantity
            await tx.stock.updateMany({
              where: { productId: item.productId, warehouseId: saleData.warehouseId },
              data: {
                quantity: { decrement: item.quantity },
                quantityReservee: { increment: item.quantity }
              }
            })
            if (stockMovementService) {
              await stockMovementService.recordMovement({
                productId: item.productId,
                warehouseId: saleData.warehouseId,
                type: 'VENTE',
                quantity: -item.quantity,
                quantityBefore: before,
                quantityAfter: after,
                unitCost: s?.product?.basePrice ?? null,
                referenceDoc: invoiceNumber,
                notes: `Réservation avance client — N° ${invoiceNumber}`
              }, tx)
            }
          } else if (item.bookId) {
            const bs = await tx.bookStock.findFirst({
              where: { bookId: item.bookId, warehouseId: saleData.warehouseId },
              include: { book: true }
            })
            const before = bs?.quantity ?? 0
            const after = before - item.quantity
            await tx.bookStock.updateMany({
              where: { bookId: item.bookId, warehouseId: saleData.warehouseId },
              data: { quantity: { decrement: item.quantity } }
            })
            if (stockMovementService) {
              await stockMovementService.recordMovement({
                bookId: item.bookId,
                warehouseId: saleData.warehouseId,
                type: 'VENTE',
                quantity: -item.quantity,
                quantityBefore: before,
                quantityAfter: after,
                unitCost: bs?.book?.purchasePrice ?? null,
                referenceDoc: invoiceNumber,
                notes: `Vente librairie — N° ${invoiceNumber}`
              }, tx)
            }
          }
        }

        if (!pendingDelivery) {
          if (isDirectSale) {
            for (const item of items as { productId?: string; bookId?: string; quantity: number }[]) {
              await decrementStock(item)
            }
          } else {
            for (const item of items as { productId?: string; bookId?: string; quantity: number }[]) {
              await reserveStock(item)
            }
          }
        }

        // Remise
        if (saleData.discount > 0) {
          await tx.discount.create({
            data: {
              saleId: sale.id,
              warehouseId: saleData.warehouseId,
              amount: saleData.discount,
              reason: null
            }
          })
        }

        return sale
      })
    },

    async getSales(clientId?: string, warehouseId?: string) {
      const where: any = {}
      if (clientId) where.clientId = clientId
      if (warehouseId && warehouseId !== 'ALL' && warehouseId !== 'all') where.warehouseId = warehouseId
      return prisma.sale.findMany({
        where,
        include: defaultInclude,
        orderBy: { createdAt: 'desc' }
      })
    },

    async getPendingDeliveries(warehouseId?: string) {
      const where: any = {
        status: { not: 'ANNULE' },
        deliveryStatus: { not: 'LIVRE' },
        OR: [
          { isPendingDelivery: true },
          { deliveryStatus: 'NON_LIVRE' },
          { deliveryStatus: 'DISPONIBLE' }
        ]
      }
      if (warehouseId && warehouseId !== 'ALL' && warehouseId !== 'all') {
        where.warehouseId = warehouseId
      }
      return prisma.sale.findMany({
        where,
        include: defaultInclude,
        orderBy: { createdAt: 'desc' }
      })
    },

    async deliverSale(saleId: string, paymentMethod?: string) {
      return prisma.$transaction(async (tx: any) => {
        const sale = await tx.sale.findUnique({
          where: { id: saleId },
          include: { items: { include: { product: true, book: true } }, client: true, warehouse: true }
        })
        if (!sale) throw new Error('Commande introuvable')
        if (sale.status === 'ANNULE') throw new Error('Cette commande est annulée')
        if ((sale as any).deliveryStatus === 'LIVRE') throw new Error('Cette commande a déjà été livrée')

        // Vérifier stock
        for (const item of sale.items) {
          if (item.productId) {
            const s = await tx.stock.findFirst({
              where: { productId: item.productId, warehouseId: sale.warehouseId },
              include: { product: true }
            })
            if (!s || s.quantity < item.quantity) {
              const pName = s?.product?.name ?? item.product?.name ?? 'Produit'
              throw new Error(`Stock insuffisant pour livrer ${pName} : ${s?.quantity ?? 0} disponible(s), ${item.quantity} requis`)
            }
          } else if (item.bookId) {
            const bs = await tx.bookStock.findFirst({
              where: { bookId: item.bookId, warehouseId: sale.warehouseId },
              include: { book: true }
            })
            if (!bs || bs.quantity < item.quantity) {
              const bName = bs?.book?.title ?? item.book?.title ?? 'Livre'
              throw new Error(`Stock insuffisant pour livrer ${bName} : ${bs?.quantity ?? 0} disponible(s), ${item.quantity} requis`)
            }
          }
        }

        // Déduire le stock
        for (const item of sale.items) {
          if (item.productId) {
            const s = await tx.stock.findFirst({
              where: { productId: item.productId, warehouseId: sale.warehouseId },
              include: { product: true }
            })
            const before = s?.quantity ?? 0
            const after = before - item.quantity
            await tx.stock.updateMany({
              where: { productId: item.productId, warehouseId: sale.warehouseId },
              data: { quantity: { decrement: item.quantity } }
            })
            if (stockMovementService) {
              await stockMovementService.recordMovement({
                productId: item.productId,
                warehouseId: sale.warehouseId,
                type: 'VENTE',
                quantity: -item.quantity,
                quantityBefore: before,
                quantityAfter: after,
                unitCost: s?.product?.basePrice ?? null,
                referenceDoc: sale.invoiceNumber,
                notes: `Livraison commande client — Facture N° ${sale.invoiceNumber}`
              }, tx)
            }
          } else if (item.bookId) {
            const bs = await tx.bookStock.findFirst({
              where: { bookId: item.bookId, warehouseId: sale.warehouseId },
              include: { book: true }
            })
            const before = bs?.quantity ?? 0
            const after = before - item.quantity
            await tx.bookStock.updateMany({
              where: { bookId: item.bookId, warehouseId: sale.warehouseId },
              data: { quantity: { decrement: item.quantity } }
            })
            if (stockMovementService) {
              await stockMovementService.recordMovement({
                bookId: item.bookId,
                warehouseId: sale.warehouseId,
                type: 'VENTE',
                quantity: -item.quantity,
                quantityBefore: before,
                quantityAfter: after,
                unitCost: bs?.book?.purchasePrice ?? null,
                referenceDoc: sale.invoiceNumber,
                notes: `Livraison commande livre client — Facture N° ${sale.invoiceNumber}`
              }, tx)
            }
          }
        }

        const avanceInitiale = sale.montantAvance ?? 0
        const resteAEncaisser = Math.max(0, sale.finalTotal - avanceInitiale)
        const pMethod = paymentMethod || sale.paymentMethod || 'ESPECES'

        const itemNames = sale.items
          .map((i: any) => `${i.product?.name || i.book?.title || 'Article'} (×${i.quantity})`)
          .join(', ')
        const clientName = sale.client?.name || 'Client'

        const descriptionCahier = `Livraison effectuée & Encaissé — Facture N° ${sale.invoiceNumber} (${clientName}) — Article(s): ${itemNames}${resteAEncaisser > 0 ? ` — Solde encaissé à la livraison: ${resteAEncaisser} FCFA (Avance initiale: ${avanceInitiale} FCFA)` : ' — (Déjà intégralement réglé)'}`

        await tx.cashTransaction.create({
          data: {
            type: 'ENTREE',
            totalAmount: resteAEncaisser,
            paymentMethod: pMethod,
            description: descriptionCahier,
            category: 'LIVRAISON',
            warehouseId: sale.warehouseId,
            lines: {
              create: sale.items.map((i: any) => ({
                productId: i.productId ?? null,
                bookId: i.bookId ?? null,
                quantity: i.quantity,
                unitPrice: i.unitPrice,
                subTotal: i.quantity * i.unitPrice
              }))
            }
          }
        })

        return tx.sale.update({
          where: { id: saleId },
          data: {
            isPendingDelivery: false,
            deliveryStatus: 'LIVRE',
            status: 'PAYE',
            paidAt: new Date(),
            validatedAt: sale.validatedAt || new Date()
          },
          include: defaultInclude
        })
      })
    },

    async updateDeliveryStatus(saleId: string, deliveryStatus: string) {
      return prisma.sale.update({
        where: { id: saleId },
        data: {
          deliveryStatus,
          ...(deliveryStatus === 'LIVRE' ? { isPendingDelivery: false, status: 'PAYE', paidAt: new Date() } : {})
        },
        include: defaultInclude
      })
    },

    async validateSale(saleId: string, complementAmount?: number) {
      return prisma.$transaction(async (tx: any) => {
        const sale = await tx.sale.findUnique({
          where: { id: saleId },
          include: { items: true }
        })
        if (!sale) throw new Error('Facture introuvable')
        if (sale.status !== 'EN_ATTENTE') throw new Error(`Impossible de valider : le statut actuel est "${sale.status}"`)
        if (sale.status === 'PAYE') throw new Error('Impossible de valider : la facture est déjà payée')

        for (const item of sale.items) {
          await tx.stock.updateMany({
            where: { productId: item.productId, warehouseId: sale.warehouseId },
            data: { quantityReservee: { decrement: item.quantity } }
          })
        }

        if (complementAmount != null && complementAmount > 0) {
          const avanceDejaVersee = sale.montantAvance ?? 0
          await tx.cashTransaction.create({
            data: {
              type: 'ENTREE',
              totalAmount: complementAmount,
              paymentMethod: sale.paymentMethod,
              description: `Complément vente — N° ${sale.invoiceNumber} (avance ${avanceDejaVersee} FCFA + complément ${complementAmount} FCFA${avanceDejaVersee + complementAmount < sale.finalTotal ? `, reste ${sale.finalTotal - (avanceDejaVersee + complementAmount)} FCFA` : ''})`,
              category: 'GENERAL',
              warehouseId: sale.warehouseId,
              lines: {
                create: sale.items.map((item: any) => ({
                  productId: item.productId,
                  quantity: item.quantity,
                  unitPrice: item.unitPrice,
                  subTotal: item.quantity * item.unitPrice
                }))
              }
            }
          })
        }

        let commissionAmount: number | null = null
        if (sale.agentId) {
          const agent = await tx.user.findUnique({ where: { id: sale.agentId } })
          if (agent && agent.commissionRate > 0) {
            commissionAmount = Math.round(sale.finalTotal * (agent.commissionRate / 100) * 100) / 100
          }
        }

        return tx.sale.update({
          where: { id: saleId },
          data: { status: 'VALIDE', validatedAt: new Date(), commissionAmount },
          include: defaultInclude
        })
      })
    },

    async paySale(saleId: string) {
      return prisma.$transaction(async (tx: any) => {
        const sale = await tx.sale.findUnique({
          where: { id: saleId },
          include: { items: true }
        })
        if (!sale) throw new Error('Facture introuvable')
        if (sale.status !== 'VALIDE') throw new Error(`Impossible de payer : le statut actuel est "${sale.status}"`)

        if (sale.montantAvance != null && sale.montantAvance < sale.finalTotal) {
          const reste = sale.finalTotal - sale.montantAvance
          await tx.cashTransaction.create({
            data: {
              type: 'ENTREE',
              totalAmount: reste,
              paymentMethod: sale.paymentMethod,
              description: `Solde vente — N° ${sale.invoiceNumber} (avance ${sale.montantAvance} FCFA + solde ${reste} FCFA)`,
              category: 'GENERAL',
              warehouseId: sale.warehouseId,
              lines: {
                create: sale.items.map((item: any) => ({
                  productId: item.productId,
                  quantity: item.quantity,
                  unitPrice: item.unitPrice,
                  subTotal: item.quantity * item.unitPrice
                }))
              }
            }
          })
        }

        return tx.sale.update({
          where: { id: saleId },
          data: { status: 'PAYE', paidAt: new Date() },
          include: defaultInclude
        })
      })
    },

    async cancelSale(saleId: string) {
      return prisma.$transaction(async (tx: any) => {
        const sale = await tx.sale.findUnique({
          where: { id: saleId },
          include: { items: true }
        })
        if (!sale) throw new Error('Facture introuvable')
        if (sale.status === 'PAYE') throw new Error('Impossible d\'annuler : la facture est déjà payée')
        if (sale.status === 'ANNULE') throw new Error('La facture est déjà annulée')

        if (sale.status === 'EN_ATTENTE') {
          if (!(sale as any).isPendingDelivery) {
            for (const item of sale.items) {
              if (item.productId) {
                const s = await tx.stock.findFirst({
                  where: { productId: item.productId, warehouseId: sale.warehouseId },
                  include: { product: true }
                })
                const before = s?.quantity ?? 0
                const after = before + item.quantity
                await tx.stock.updateMany({
                  where: { productId: item.productId, warehouseId: sale.warehouseId },
                  data: {
                    quantity: { increment: item.quantity },
                    quantityReservee: { decrement: item.quantity }
                  }
                })
                if (stockMovementService) {
                  await stockMovementService.recordMovement({
                    productId: item.productId,
                    warehouseId: sale.warehouseId,
                    type: 'ANNULATION_VENTE',
                    quantity: item.quantity,
                    quantityBefore: before,
                    quantityAfter: after,
                    referenceDoc: sale.invoiceNumber,
                    notes: `Annulation vente en attente — N° ${sale.invoiceNumber}`
                  }, tx)
                }
              }
            }
          }
        } else if (sale.status === 'VALIDE') {
          for (const item of sale.items) {
            if (item.productId) {
              const s = await tx.stock.findFirst({
                where: { productId: item.productId, warehouseId: sale.warehouseId },
                include: { product: true }
              })
              const before = s?.quantity ?? 0
              const after = before + item.quantity
              await tx.stock.updateMany({
                where: { productId: item.productId, warehouseId: sale.warehouseId },
                data: { quantity: { increment: item.quantity } }
              })
              if (stockMovementService) {
                await stockMovementService.recordMovement({
                  productId: item.productId,
                  warehouseId: sale.warehouseId,
                  type: 'ANNULATION_VENTE',
                  quantity: item.quantity,
                  quantityBefore: before,
                  quantityAfter: after,
                  referenceDoc: sale.invoiceNumber,
                  notes: `Annulation vente — N° ${sale.invoiceNumber}`
                }, tx)
              }
            }
          }
        }

        const montantCaisseAnnule =
          sale.status === 'EN_ATTENTE' && sale.montantAvance != null
            ? sale.montantAvance
            : sale.montantAvance != null ? sale.montantAvance : sale.finalTotal

        if (montantCaisseAnnule > 0) {
          await tx.cashTransaction.create({
            data: {
              type: 'SORTIE',
              totalAmount: montantCaisseAnnule,
              paymentMethod: sale.paymentMethod,
              description: `Annulation — N° ${sale.invoiceNumber} (${sale.status === 'EN_ATTENTE' ? 'avance' : 'vente'} ${montantCaisseAnnule} FCFA reversé${sale.montantAvance != null && sale.montantAvance < sale.finalTotal ? `, solde ${sale.finalTotal - sale.montantAvance} FCFA annulé` : ''})`,
              category: 'GENERAL',
              warehouseId: sale.warehouseId,
              lines: {
                create: sale.items.map((item: any) => ({
                  productId: item.productId,
                  quantity: item.quantity,
                  unitPrice: item.unitPrice,
                  subTotal: item.quantity * item.unitPrice
                }))
              }
            }
          })
        }

        return tx.sale.update({
          where: { id: saleId },
          data: { status: 'ANNULE', deliveryStatus: 'ANNULE' },
          include: defaultInclude
        })
      })
    }
  }
}
