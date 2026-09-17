import { app } from 'electron'
import { join } from 'node:path'
import { writeFile, mkdir } from 'node:fs/promises'
import { PrismaClient } from '@prisma/client'
import { appLog } from '../logger'

interface PurchaseOrderItem {
  productId: string
  productName: string
  productBarcode: string
  currentStock: number
  alertLimit: number
  suggestedQuantity: number
  unitPrice: number
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
  const totalAmount = items.reduce((sum, item) => sum + item.suggestedQuantity * (item.unitPrice || 0), 0)
  const rows = items.map((item) => `
    <tr>
      <td>${escapeXml(item.productName)}</td>
      <td>${escapeXml(item.productBarcode)}</td>
      <td style="text-align:right">${item.currentStock}</td>
      <td style="text-align:right">${item.alertLimit}</td>
      <td style="text-align:right;font-weight:700">${item.suggestedQuantity}</td>
      <td style="text-align:right">${(item.unitPrice || 0).toLocaleString('fr-FR')} FCFA</td>
      <td style="text-align:right;font-weight:600">${(item.suggestedQuantity * (item.unitPrice || 0)).toLocaleString('fr-FR')} FCFA</td>
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
    .total-row { background: #f8fafc; font-weight: bold; }
  </style></head><body>
    <h1>Bon de commande — Réapprovisionnement</h1>
    <div class="meta">Généré le ${escapeXml(date)} — ${items.length} produit(s) en rupture ou sous seuil critique</div>
    <div class="alert-badge">
      <strong>Action requise :</strong> Ces produits nécessitent un réapprovisionnement urgent.
    </div>
    <table>
      <thead><tr>
        <th>Produit</th><th>Code-barres</th><th>Stock actuel</th><th>Seuil</th><th>Qté suggérée</th><th>Prix unit.</th><th>Sous-total</th><th>Fournisseur</th><th>Email</th><th>Téléphone</th><th>Entrepôt</th>
      </tr></thead>
      <tbody>${rows}</tbody>
      <tfoot>
        <tr class="total-row">
          <td colspan="6" style="text-align:right;padding:8px">Total estimé :</td>
          <td style="text-align:right;padding:8px;color:#dc2626">${totalAmount.toLocaleString('fr-FR')} FCFA</td>
          <td colspan="4"></td>
        </tr>
      </tfoot>
    </table>
    <div class="footer">Gestion Stock &amp; Caisse — Bon de commande automatisé</div>
  </body></html>`
}

export function createStockAnalysisService(
  prisma: PrismaClient,
  purchaseOrderService?: { create: (data: any) => Promise<any> }
) {
  return {
    async analyzeAndGenerateOrders(): Promise<{ orders: PurchaseOrderItem[]; pdfPath: string; purchaseOrderId: string | null }> {
      try {
        const stocks = await prisma.stock.findMany({
          include: {
            product: { include: { supplier: true } },
            warehouse: true
          }
        })

        const toReorder = stocks.filter((s) => {
          if (!s.product) return false
          const totalStock = (s.quantity || 0) + (s.quantityMagasin || 0) + (s.quantityReservee || 0)
          return totalStock <= s.alertLimit
        })

        // RÈGLE STRICTE : AUCUNE GÉNÉRATION DE BON DE COMMANDE SI AUCUN PRODUIT EN RUPTURE
        if (toReorder.length === 0) {
          appLog('INFO', 'stockAnalysis', 'Aucun produit sous le seuil critique. Aucun bon de commande généré.')
          return { orders: [], pdfPath: '', purchaseOrderId: null }
        }

        const orders: PurchaseOrderItem[] = toReorder
          .map((s) => {
            const totalStock = (s.quantity || 0) + (s.quantityMagasin || 0) + (s.quantityReservee || 0)
            const suggested = Math.max(s.alertLimit * 3 - totalStock, s.alertLimit, 1)
            return {
              productId: s.product.id,
              productName: s.product.name,
              productBarcode: s.product.barcode || '',
              currentStock: s.quantity || 0,
              alertLimit: s.alertLimit || 0,
              suggestedQuantity: suggested,
              unitPrice: s.product.basePrice || 0,
              supplierName: s.product.supplier?.name ? s.product.supplier.name.trim() : 'Fournisseur Général',
              supplierEmail: s.product.supplier?.email || '—',
              supplierPhone: s.product.supplier?.phone || '—',
              warehouseName: s.warehouse?.name || 'Boutique Principale',
              warehouseId: s.warehouse?.id || s.warehouseId
            }
          })
          .filter((o) => o.suggestedQuantity > 0)

        if (orders.length === 0) {
          return { orders: [], pdfPath: '', purchaseOrderId: null }
        }

        // Créer les bons de commande réels par fournisseur via purchaseOrderService
        // qui génère les vrais PDF TABULAIRES de la boutique (pas de fichier texte brouillon)
        let primaryPurchaseOrderId: string | null = null
        let primaryPdfPath: string = ''

        if (purchaseOrderService) {
          const grouped = orders.reduce<Record<string, PurchaseOrderItem[]>>((acc, o) => {
            const sup = o.supplierName || 'Fournisseur Général'
            if (!acc[sup]) acc[sup] = []
            acc[sup].push(o)
            return acc
          }, {})

          for (const [supplierName, items] of Object.entries(grouped)) {
            if (!items || items.length === 0) continue

            try {
              const orderTotal = items.reduce((sum, item) => sum + (item.suggestedQuantity * (item.unitPrice || 0)), 0)
              const created = await purchaseOrderService.create({
                supplierName,
                warehouseId: items[0]?.warehouseId,
                status: 'EN_ATTENTE',
                totalAmount: orderTotal,
                items: items.map((i) => ({
                  productId: i.productId,
                  productName: i.productName,
                  productBarcode: i.productBarcode,
                  quantity: i.suggestedQuantity,
                  unitPrice: i.unitPrice || 0,
                  currentStock: i.currentStock,
                  alertLimit: i.alertLimit,
                  warehouseName: i.warehouseName,
                  warehouseId: i.warehouseId
                }))
              })

              if (created) {
                if (!primaryPurchaseOrderId) primaryPurchaseOrderId = created.id
                if (created.pdfPath && !primaryPdfPath) primaryPdfPath = created.pdfPath
              }
            } catch (createErr) {
              appLog('ERROR', 'stockAnalysis', `Error saving purchase order for ${supplierName}: ${createErr}`)
            }
          }
        }

        return { orders, pdfPath: primaryPdfPath, purchaseOrderId: primaryPurchaseOrderId }
      } catch (globalErr) {
        appLog('ERROR', 'stockAnalysis', `analyzeAndGenerateOrders fatal error: ${globalErr}`)
        throw globalErr
      }
    }
  }
}
