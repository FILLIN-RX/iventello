import { PrismaClient } from '@prisma/client'
import { app } from 'electron'
import { join } from 'node:path'
import { mkdirSync, existsSync, writeFileSync } from 'node:fs'

const defaultInclude = {
  items: { include: { product: true, book: true } },
  client: true,
  warehouse: true,
  agent: true
}

export function createInvoiceScannerService(prisma: PrismaClient) {
  return {
    /**
     * Scanne et récupère toutes les factures/ventes enregistrées pour une date donnée.
     * @param dateStr Format 'YYYY-MM-DD'
     * @param warehouseId ID de l'entrepôt (optionnel ou 'ALL')
     */
    async scanInvoicesByDate(dateStr: string, warehouseId?: string) {
      if (!dateStr) {
        dateStr = new Date().toISOString().slice(0, 10)
      }

      const startOfDay = new Date(`${dateStr}T00:00:00.000Z`)
      const endOfDay = new Date(`${dateStr}T23:59:59.999Z`)

      const warehouseFilter = (warehouseId && warehouseId !== 'ALL' && warehouseId !== '') ? { warehouseId } : {}

      const sales = await prisma.sale.findMany({
        where: {
          ...warehouseFilter,
          createdAt: {
            gte: startOfDay,
            lte: endOfDay
          }
        },
        include: defaultInclude,
        orderBy: { createdAt: 'asc' }
      })

      let totalRevenue = 0
      let totalPaid = 0
      let totalPending = 0
      let totalCancelled = 0

      const paymentMethodsBreakdown: Record<string, { count: number; total: number }> = {}

      for (const s of sales) {
        if (s.status === 'ANNULE') {
          totalCancelled += s.finalTotal
          continue
        }

        totalRevenue += s.finalTotal
        if (s.status === 'PAYE') {
          totalPaid += s.finalTotal
        } else if (s.status === 'EN_ATTENTE') {
          totalPending += s.finalTotal
        }

        const method = s.paymentMethod || 'ESPECES'
        if (!paymentMethodsBreakdown[method]) {
          paymentMethodsBreakdown[method] = { count: 0, total: 0 }
        }
        paymentMethodsBreakdown[method].count += 1
        paymentMethodsBreakdown[method].total += s.finalTotal
      }

      return {
        date: dateStr,
        totalInvoices: sales.length,
        totalRevenue,
        totalPaid,
        totalPending,
        totalCancelled,
        paymentMethodsBreakdown,
        sales
      }
    },

    /**
     * Exporte un Registre PDF complet contenant toutes les factures de la date sélectionnée.
     */
    async exportScannedInvoicesPdf(dateStr: string, warehouseId?: string): Promise<{ filePath: string }> {
      const scanData = await this.scanInvoicesByDate(dateStr, warehouseId)
      const { default: PDFDocument } = await import('pdfkit')

      const desktopPath = app.getPath('desktop')
      const targetDir = join(desktopPath, 'factures-scannees')
      if (!existsSync(targetDir)) {
        mkdirSync(targetDir, { recursive: true })
      }

      const fileName = `registre-factures-${dateStr}.pdf`
      const filePath = join(targetDir, fileName)

      const doc = new PDFDocument({
        size: 'A4',
        margin: 30,
        info: {
          Title: `Registre des Factures — ${dateStr}`,
          Author: 'Iventello'
        }
      })

      const buffers: Buffer[] = []
      doc.on('data', (chunk: Buffer) => buffers.push(chunk))

      return new Promise<{ filePath: string }>((resolve, reject) => {
        doc.on('end', () => {
          try {
            const pdfBuffer = Buffer.concat(buffers)
            writeFileSync(filePath, pdfBuffer)
            resolve({ filePath })
          } catch (err) {
            reject(err)
          }
        })
        doc.on('error', reject)

        // ── EN-TÊTE DU REGISTRE ──
        doc.rect(20, 20, 555, 60).fill('#0f172a')
        doc.fillColor('#ffffff').fontSize(16).font('Helvetica-Bold')
          .text('REGISTRE OFFICIEL ET ARCHIVE DES FACTURES', 30, 32)
        doc.fillColor('#94a3b8').fontSize(10).font('Helvetica')
          .text(`Date scannée : ${dateStr}  |  Total Factures : ${scanData.totalInvoices}  |  CA Total : ${scanData.totalRevenue.toLocaleString('fr-FR')} FCFA`, 30, 54)

        let y = 95

        // ── EN-TÊTE TABLEAU RÉSUMÉ ──
        doc.rect(20, y, 555, 22).fill('#f1f5f9')
        doc.fillColor('#334155').fontSize(8.5).font('Helvetica-Bold')
          .text('N° FACTURE', 30, y + 6)
          .text('HEURE', 130, y + 6)
          .text('CLIENT', 180, y + 6)
          .text('RÈGLEMENT', 310, y + 6)
          .text('STATUT', 400, y + 6)
          .text('TOTAL NET', 490, y + 6, { align: 'right', width: 75 })

        y += 24

        if (scanData.sales.length === 0) {
          doc.fillColor('#64748b').fontSize(10).font('Helvetica-Oblique')
            .text('Aucune facture enregistrée pour cette date.', 30, y + 10)
        } else {
          scanData.sales.forEach((s: any, idx: number) => {
            if (y > 750) {
              doc.addPage()
              y = 30
            }

            const bg = idx % 2 === 0 ? '#ffffff' : '#f8fafc'
            doc.rect(20, y, 555, 20).fill(bg)

            const clientName = s.client?.name ?? 'Client anonyme'
            const timeStr = new Date(s.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
            const statusColor = s.status === 'PAYE' ? '#16a34a' : (s.status === 'ANNULE' ? '#dc2626' : '#d97706')

            doc.fillColor('#0f172a').fontSize(8.5).font('Helvetica-Bold')
              .text(s.invoiceNumber, 30, y + 5)
            doc.fillColor('#475569').fontSize(8).font('Helvetica')
              .text(timeStr, 130, y + 5)
              .text(clientName.length > 20 ? clientName.substring(0, 18) + '..' : clientName, 180, y + 5)
              .text(s.paymentMethod || 'ESPECES', 310, y + 5)

            doc.fillColor(statusColor).fontSize(8).font('Helvetica-Bold')
              .text(s.status, 400, y + 5)

            doc.fillColor('#0f172a').fontSize(8.5).font('Helvetica-Bold')
              .text(`${s.finalTotal.toLocaleString('fr-FR')} FCFA`, 490, y + 5, { align: 'right', width: 75 })

            y += 20
          })
        }

        // ── PIED DE PAGE ──
        doc.fontSize(8).font('Helvetica').fillColor('#94a3b8')
          .text(`Archive générée automatiquement le ${new Date().toLocaleString('fr-FR')} | Factures scannées dans "Bureau/factures-scannees/"`, 20, 800, { align: 'center', width: 555 })

        doc.end()
      })
    },

    /**
     * Exporte toutes les factures de la date sélectionnée sous forme de fichiers PDF individuels
     * dans un dossier dédié sur le bureau du client.
     */
    async exportScannedInvoicesZip(dateStr: string, warehouseId?: string): Promise<{ folderPath: string; count: number }> {
      const scanData = await this.scanInvoicesByDate(dateStr, warehouseId)
      const { default: PDFDocument } = await import('pdfkit')

      const desktopPath = app.getPath('desktop')
      const folderName = `factures-scannees-${dateStr}`
      const folderPath = join(desktopPath, folderName)

      if (!existsSync(folderPath)) {
        mkdirSync(folderPath, { recursive: true })
      }

      for (const sale of scanData.sales as any[]) {
        const safeClient = (sale.client?.name || 'client').replace(/[^a-zA-Z0-9_-]/g, '_')
        const invoiceFileName = `${sale.invoiceNumber}_${safeClient}.pdf`
        const invoiceFilePath = join(folderPath, invoiceFileName)

        const doc = new PDFDocument({ size: 'A4', margin: 30 })
        const buffers: Buffer[] = []
        doc.on('data', (chunk: Buffer) => buffers.push(chunk))

        await new Promise<void>((res, rej) => {
          doc.on('end', () => {
            try {
              writeFileSync(invoiceFilePath, Buffer.concat(buffers))
              res()
            } catch (err) { rej(err) }
          })
          doc.on('error', rej)

          // Dessin du Ticket / Facture individuel
          const whName = sale.warehouse?.invoiceCompanyName || sale.warehouse?.name || 'Boutique'
          doc.rect(20, 20, 555, 50).fill('#1e293b')
          doc.fillColor('#ffffff').fontSize(14).font('Helvetica-Bold')
            .text(whName.toUpperCase(), 30, 30)
          doc.fillColor('#94a3b8').fontSize(9).font('Helvetica')
            .text(`FACTURE N° ${sale.invoiceNumber} — Date: ${new Date(sale.createdAt).toLocaleDateString('fr-FR')}`, 30, 48)

          doc.fillColor('#0f172a').fontSize(10).font('Helvetica-Bold')
            .text(`Client : ${sale.client?.name ?? 'Client anonyme'}`, 30, 85)
            .text(`Mode de règlement : ${sale.paymentMethod || 'ESPECES'}`, 300, 85)

          let y = 115
          doc.rect(20, y, 555, 20).fill('#e2e8f0')
          doc.fillColor('#334155').fontSize(8.5).font('Helvetica-Bold')
            .text('ARTICLE', 30, y + 5)
            .text('QTÉ', 320, y + 5)
            .text('P.U', 380, y + 5)
            .text('TOTAL HT', 480, y + 5, { align: 'right', width: 85 })

          y += 22
          for (const item of sale.items) {
            const name = item.product?.name || item.book?.title || 'Article'
            doc.fillColor('#0f172a').fontSize(8.5).font('Helvetica')
              .text(name, 30, y)
              .text(String(item.quantity), 320, y)
              .text(`${item.unitPrice.toLocaleString('fr-FR')} FCFA`, 380, y)
              .text(`${(item.quantity * item.unitPrice).toLocaleString('fr-FR')} FCFA`, 480, y, { align: 'right', width: 85 })
            y += 18
          }

          doc.rect(20, y + 5, 555, 1).fill('#cbd5e1')
          y += 15

          doc.fontSize(12).font('Helvetica-Bold').fillColor('#0f172a')
            .text('TOTAL NET À PAYER :', 300, y)
            .text(`${sale.finalTotal.toLocaleString('fr-FR')} FCFA`, 450, y, { align: 'right', width: 115 })

          doc.end()
        })
      }

      return { folderPath, count: scanData.sales.length }
    }
  }
}
