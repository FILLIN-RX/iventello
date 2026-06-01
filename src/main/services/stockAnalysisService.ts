import { app } from 'electron'
import { join } from 'node:path'
import { writeFile, mkdir } from 'node:fs/promises'
import { PrismaClient } from '@prisma/client'

interface PurchaseOrderItem {
  productId: string
  productName: string
  productBarcode: string
  currentStock: number
  alertLimit: number
  suggestedQuantity: number
  supplierName: string
  supplierEmail: string | null
  supplierPhone: string | null
  warehouseName: string
  warehouseId: string
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function buildPurchaseOrderHtml(items: PurchaseOrderItem[], date: string): string {
  const rows = items.map((item) => `
    <tr>
      <td>${escapeXml(item.productName)}</td>
      <td>${escapeXml(item.productBarcode)}</td>
      <td style="text-align:right">${item.currentStock}</td>
      <td style="text-align:right">${item.alertLimit}</td>
      <td style="text-align:right;font-weight:700">${item.suggestedQuantity}</td>
      <td>${escapeXml(item.supplierName)}</td>
      <td>${escapeXml(item.supplierEmail ?? '—')}</td>
      <td>${escapeXml(item.supplierPhone ?? '—')}</td>
      <td>${escapeXml(item.warehouseName)}</td>
    </tr>`).join('')

  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><style>
    @page { margin: 15mm; }
    body { font-family: 'Helvetica', 'Arial', sans-serif; font-size: 12px; color: #1f2937; }
    h1 { font-size: 20px; margin-bottom: 4px; }
    .meta { color: #6b7280; font-size: 11px; margin-bottom: 20px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    th { background: #f3f4f6; text-align: left; padding: 6px 8px; font-size: 10px; text-transform: uppercase; }
    td { padding: 5px 8px; border-bottom: 1px solid #e5e7eb; font-size: 10px; }
    .footer { margin-top: 30px; text-align: center; color: #9ca3af; font-size: 10px; border-top: 1px solid #e5e7eb; padding-top: 12px; }
    .alert-badge { background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 8px 12px; margin-bottom: 16px; font-size: 12px; }
  </style></head><body>
    <h1>Bon de commande — Réapprovisionnement</h1>
    <div class="meta">Généré le ${escapeXml(date)} — ${items.length} produit(s) en rupture ou sous seuil critique</div>
    <div class="alert-badge">
      <strong>Action requise :</strong> Ces produits nécessitent un réapprovisionnement urgent.
    </div>
    <table>
      <thead><tr>
        <th>Produit</th><th>Code-barres</th><th>Stock actuel</th><th>Seuil</th><th>Qté suggérée</th><th>Fournisseur</th><th>Email</th><th>Téléphone</th><th>Entrepôt</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="footer">Gestion Stock &amp; Caisse — Bon de commande automatisé</div>
  </body></html>`
}

export function createStockAnalysisService(prisma: PrismaClient) {
  return {
    async analyzeAndGenerateOrders(): Promise<{ orders: PurchaseOrderItem[]; pdfPath: string }> {
      const stocks = await prisma.stock.findMany({
        include: {
          product: { include: { supplier: true } },
          warehouse: true
        }
      })

      const toReorder = stocks.filter((s) => s.quantity <= s.alertLimit)

      const orders: PurchaseOrderItem[] = toReorder
        .filter((s) => s.product.supplier)
        .map((s) => ({
          productId: s.product.id,
          productName: s.product.name,
          productBarcode: s.product.barcode,
          currentStock: s.quantity,
          alertLimit: s.alertLimit,
          suggestedQuantity: Math.max(s.alertLimit * 3 - s.quantity, s.alertLimit),
          supplierName: s.product.supplier!.name,
          supplierEmail: s.product.supplier!.email,
          supplierPhone: s.product.supplier!.phone,
          warehouseName: s.warehouse.name,
          warehouseId: s.warehouse.id
        }))

      const dateStr = new Date().toISOString().slice(0, 10)
      const timeStr = new Date().toLocaleString('fr-FR')
      const desktopPath = app.getPath('desktop')
      const ordersDir = join(desktopPath, 'bons-de-commande')
      await mkdir(ordersDir, { recursive: true })
      const filename = `bon-commande-${dateStr}.pdf`
      const pdfPath = join(ordersDir, filename)

      if (orders.length === 0) {
        const emptyHtml = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><style>body{font-family:'Helvetica',sans-serif;text-align:center;padding:40px;color:#6b7280;}</style></head><body><h2>Aucun réapprovisionnement nécessaire</h2><p>Tous les stocks sont au-dessus de leur seuil critique.</p></body></html>`
        const { default: PDFDocument } = await import('pdfkit')
        const doc = new PDFDocument({ size: 'A4', info: { Title: 'Bon de commande' } })
        const buffers: Buffer[] = []
        doc.on('data', (chunk: Buffer) => buffers.push(chunk))
        return new Promise((resolve, reject) => {
          doc.on('end', async () => {
            await writeFile(pdfPath, Buffer.concat(buffers))
            resolve({ orders: [], pdfPath })
          })
          doc.on('error', reject)
          doc.fontSize(18).text('Aucun réapprovisionnement nécessaire', { align: 'center' })
          doc.moveDown(0.5)
          doc.fontSize(12).fillColor('#6b7280').text('Tous les stocks sont au-dessus de leur seuil critique.', { align: 'center' })
          doc.end()
        })
      }

      const html = buildPurchaseOrderHtml(orders, timeStr)
      const { default: PDFDocument } = await import('pdfkit')
      const doc = new PDFDocument({ size: 'A4', margins: { top: 20, bottom: 20, left: 15, right: 15 }, info: { Title: 'Bon de commande', Author: 'Gestion Stock & Caisse' } })
      const buffers: Buffer[] = []
      doc.on('data', (chunk: Buffer) => buffers.push(chunk))
      return new Promise((resolve, reject) => {
        doc.on('end', async () => {
          await writeFile(pdfPath, Buffer.concat(buffers))
          resolve({ orders, pdfPath })
        })
        doc.on('error', reject)
        doc.fontSize(20).text('Bon de commande', { align: 'center' })
        doc.moveDown(0.3)
        doc.fontSize(10).fillColor('#6b7280').text(`Généré le ${timeStr}  |  ${orders.length} produit(s) à réapprovisionner`, { align: 'center' })
        doc.moveDown(0.8).fillColor('#1f2937')
        for (const o of orders) {
          if (doc.y > 700) doc.addPage()
          doc.fontSize(12).fillColor('#ef4444').text(`${o.productName}`, { underline: true })
          doc.moveDown(0.1).fillColor('#1f2937').fontSize(10)
          doc.text(`Code: ${o.productBarcode}  |  Stock: ${o.currentStock}/${o.alertLimit}  |  Quantité suggérée: ${o.suggestedQuantity}`)
          doc.text(`Fournisseur: ${o.supplierName}  |  ${o.supplierEmail ?? ''}  |  ${o.supplierPhone ?? ''}`)
          doc.text(`Entrepôt: ${o.warehouseName}`)
          doc.moveDown(0.5)
        }
        doc.moveDown(1)
        doc.fontSize(9).fillColor('#9ca3af').text('Gestion Stock & Caisse — Bon de commande automatisé', { align: 'center' })
        doc.end()
      })
    }
  }
}
