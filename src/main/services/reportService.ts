import { app } from 'electron'
import { join } from 'node:path'
import { writeFile } from 'node:fs/promises'

interface ReportData {
  products: { name: string; barcode: string; sellingPrice: number; quantity: number; alertLimit: number; warehouse: string | null }[]
  alerts: { name: string; barcode: string; quantity: number; alertLimit: number; warehouse: string | null }[]
  totalProducts: number
  totalValue: number
  alertCount: number
  date: string
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function buildSvgChart(stocks: { quantity: number; alertLimit: number; name: string }[], maxItems = 30): string {
  const data = stocks.slice(0, maxItems).sort((a, b) => a.quantity - b.quantity)
  const maxVal = Math.max(...data.map((p) => p.quantity), 1)
  const barH = 18, gap = 4, chartW = 520, labelW = 180, barMaxW = chartW - labelW - 60
  const h = data.length * (barH + gap) + 20
  let bars = '', labels = ''
  data.forEach((p, i) => {
    const y = 10 + i * (barH + gap)
    const bw = Math.max(4, (p.quantity / maxVal) * barMaxW)
    const color = p.quantity <= p.alertLimit ? '#ef4444' : '#22c55e'
    bars += `<rect x="${labelW}" y="${y}" width="${bw}" height="${barH}" fill="${color}" rx="3" />`
    bars += `<text x="${labelW + bw + 4}" y="${y + barH - 4}" font-size="11" fill="#374151">${p.quantity}</text>`
    const name = escapeXml(p.name.length > 22 ? p.name.substring(0, 20) + '..' : p.name)
    labels += `<text x="4" y="${y + barH - 4}" font-size="11" fill="#374151">${name}</text>`
  })
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${chartW}" height="${h}">${labels}${bars}</svg>`
}

function buildHtml(data: ReportData): string {
  const productRows = data.products.map((p) =>
    `<tr><td>${escapeXml(p.name)}</td><td>${escapeXml(p.barcode)}</td><td style="text-align:right">${p.sellingPrice.toFixed(2)} €</td><td style="text-align:right;${p.quantity <= p.alertLimit ? 'color:#ef4444;font-weight:700' : ''}">${p.quantity}</td><td style="text-align:right">${p.alertLimit}</td><td>${p.warehouse ? escapeXml(p.warehouse) : '—'}</td></tr>`
  ).join('')

  const alertRows = data.alerts.map((a) =>
    `<tr><td>${escapeXml(a.name)}</td><td>${escapeXml(a.barcode)}</td><td style="text-align:right;color:#ef4444;font-weight:700">${a.quantity}</td><td style="text-align:right">${a.alertLimit}</td><td>${a.warehouse ? escapeXml(a.warehouse) : '—'}</td></tr>`
  ).join('')

  const chartSvg = data.products.length > 0
    ? buildSvgChart(data.products.map(p => ({ quantity: p.quantity, alertLimit: p.alertLimit, name: p.name })))
    : '<p style="color:#6b7280">Aucun produit à afficher.</p>'

  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><style>
    @page { margin: 20mm 15mm; }
    body { font-family: 'Helvetica', 'Arial', sans-serif; font-size: 12px; color: #1f2937; }
    h1 { font-size: 22px; margin-bottom: 4px; }
    h2 { font-size: 16px; margin-top: 24px; margin-bottom: 8px; border-bottom: 2px solid #e5e7eb; padding-bottom: 4px; }
    .meta { color: #6b7280; font-size: 11px; margin-bottom: 20px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    th { background: #f3f4f6; text-align: left; padding: 6px 8px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
    td { padding: 5px 8px; border-bottom: 1px solid #e5e7eb; font-size: 11px; }
    .summary { display: flex; gap: 16px; margin-bottom: 20px; }
    .summary-item { flex: 1; background: #f9fafb; border-radius: 8px; padding: 12px; text-align: center; }
    .summary-value { font-size: 24px; font-weight: 700; }
    .summary-label { font-size: 11px; color: #6b7280; }
    .alert-box { background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 12px; margin-bottom: 16px; }
    .footer { margin-top: 30px; text-align: center; color: #9ca3af; font-size: 10px; border-top: 1px solid #e5e7eb; padding-top: 12px; }
  </style></head><body>
    <h1>Rapport de stocks</h1>
    <div class="meta">Généré le ${escapeXml(data.date)}</div>
    <div class="summary">
      <div class="summary-item"><div class="summary-value">${data.totalProducts}</div><div class="summary-label">Produits</div></div>
      <div class="summary-item"><div class="summary-value">${data.totalValue.toFixed(2)} €</div><div class="summary-label">Valeur totale</div></div>
      <div class="summary-item"><div class="summary-value" style="color:${data.alertCount > 0 ? '#ef4444' : '#22c55e'}">${data.alertCount}</div><div class="summary-label">Alertes</div></div>
    </div>
    ${data.alerts.length > 0 ? `<h2>Alertes de stock critique</h2><div class="alert-box"><strong>${data.alertCount} produit(s)</strong> dont le stock est inférieur ou égal au seuil critique.</div><table><thead><tr><th>Produit</th><th>Code-barres</th><th style="text-align:right">Stock</th><th style="text-align:right">Seuil</th><th>Entrepôt</th></tr></thead><tbody>${alertRows}</tbody></table>` : ''}
    <h2>Produits</h2><table><thead><tr><th>Produit</th><th>Code-barres</th><th style="text-align:right">Prix</th><th style="text-align:right">Stock</th><th style="text-align:right">Seuil</th><th>Entrepôt</th></tr></thead><tbody>${productRows}</tbody></table>
    <h2>Répartition des stocks</h2>${chartSvg}
    <div class="footer">Gestion Stock &amp; Caisse — Rapport automatisé</div>
  </body></html>`
}

export function createReportService() {
  return {
    async exportStockReport(data: ReportData): Promise<string> {
      const desktopPath = app.getPath('desktop')
      const dateStr = new Date().toISOString().slice(0, 10)
      const filename = `rapport-stocks-${dateStr}.pdf`
      const filepath = join(desktopPath, filename)
      const html = buildHtml(data)
      const { default: PDFDocument } = await import('pdfkit')
      const doc = new PDFDocument({ size: 'A4', margins: { top: 20, bottom: 20, left: 15, right: 15 }, info: { Title: 'Rapport de stocks', Author: 'Gestion Stock & Caisse' } })
      const buffers: Buffer[] = []
      doc.on('data', (chunk: Buffer) => buffers.push(chunk))
      return new Promise<string>((resolve, reject) => {
        doc.on('end', async () => {
          try {
            const pdfBuffer = Buffer.concat(buffers)
            await writeFile(filepath, pdfBuffer)
            resolve(filepath)
          } catch (err) { reject(err) }
        })
        doc.on('error', reject)
        doc.fontSize(20).text('Rapport de stocks', { align: 'center' })
        doc.moveDown(0.3)
        doc.fontSize(10).fillColor('#6b7280').text(`Généré le ${data.date}`, { align: 'center' })
        doc.moveDown(0.8)
        doc.fillColor('#1f2937').fontSize(14).text('Résumé')
        doc.moveDown(0.3)
        doc.fontSize(11)
        doc.text(`Produits : ${data.totalProducts}`)
        doc.text(`Valeur totale : ${data.totalValue.toFixed(2)} €`)
        doc.text(`Alertes : ${data.alertCount}`)
        if (data.alerts.length > 0) {
          doc.moveDown(0.8)
          doc.fillColor('#ef4444').fontSize(14).text('Alertes de stock critique')
          doc.moveDown(0.3).fillColor('#1f2937').fontSize(10)
          for (const a of data.alerts) {
            if (doc.y > 700) doc.addPage()
            doc.text(`${a.name} — Stock: ${a.quantity}/${a.alertLimit} — ${a.warehouse ?? 'Sans entrepôt'}`)
            doc.moveDown(0.2)
          }
        }
        doc.moveDown(1)
        doc.fillColor('#1f2937').fontSize(14).text('Tous les produits')
        doc.moveDown(0.3).fontSize(10)
        for (const p of data.products) {
          if (doc.y > 720) doc.addPage()
          doc.text(`${p.name} | ${p.barcode} | ${p.sellingPrice.toFixed(2)} € | Stock: ${p.quantity}/${p.alertLimit} | ${p.warehouse ?? '—'}`)
          doc.moveDown(0.2)
        }
        doc.moveDown(1)
        doc.fontSize(9).fillColor('#9ca3af').text('Gestion Stock & Caisse — Rapport automatisé', { align: 'center' })
        doc.end()
      })
    },

    async exportCashReport(data: {
      warehouseName: string
      warehouseLogo: string | null
      operatorName: string
      dateRange: { start: string; end: string }
      soldeOuverture: number
      totalEntrees: number
      totalSorties: number
      soldeCloture: number
      transactions: any[]
    }): Promise<string> {
      const desktopPath = app.getPath('desktop')
      const dateStr = new Date().toISOString().slice(0, 10)
      const filename = `rapport-caisse-${dateStr}.pdf`
      const filepath = join(desktopPath, filename)

      const { default: PDFDocument } = await import('pdfkit')
      const doc = new PDFDocument({
        size: 'A4', margins: { top: 20, bottom: 20, left: 20, right: 20 },
        info: { Title: 'Rapport de caisse', Author: 'Gestion Stock & Caisse' }
      })
      const buffers: Buffer[] = []
      doc.on('data', (chunk: Buffer) => buffers.push(chunk))

      return new Promise<string>((resolve, reject) => {
        doc.on('end', async () => {
          const pdfBuffer = Buffer.concat(buffers)
          await writeFile(filepath, pdfBuffer)
          resolve(filepath)
        })
        doc.on('error', reject)

        // En-tête
        doc.fontSize(18).fillColor('#1e3a5f').text('RAPPORT DE CAISSE', { align: 'center' })
        doc.moveDown(0.3)
        doc.fontSize(10).fillColor('#6b7280').text(`${data.warehouseName} — ${data.dateRange.start} au ${data.dateRange.end}`, { align: 'center' })
        doc.moveDown(0.2)
        if (data.operatorName) doc.fontSize(9).fillColor('#9ca3af').text(`Opérateur : ${data.operatorName}`, { align: 'center' })
        doc.moveDown(1)

        // Bloc résumé
        const blockW = (doc.page.width - 40 - 20) / 3
        const blockY = doc.y
        const blocks = [
          { label: 'Solde d\'ouverture', value: `${data.soldeOuverture.toFixed(2)} DZD`, color: '#6b7280' },
          { label: 'Total entrées (+)', value: `${data.totalEntrees.toFixed(2)} DZD`, color: '#10b981' },
          { label: 'Total sorties (-)', value: `${data.totalSorties.toFixed(2)} DZD`, color: '#ef4444' }
        ]
        blocks.forEach((b, i) => {
          const x = 20 + i * (blockW + 10)
          doc.roundedRect(x, blockY, blockW, 50, 6).fillAndStroke('#f8fafc', '#e2e8f0')
          doc.fillColor('#64748b').fontSize(9).text(b.label, x + 8, blockY + 6, { width: blockW - 16, align: 'center' })
          doc.fillColor(b.color).fontSize(14).font('Helvetica-Bold').text(b.value, x + 8, blockY + 22, { width: blockW - 16, align: 'center' })
          doc.font('Helvetica')
        })

        doc.y = blockY + 65
        doc.moveDown(0.5)
        doc.roundedRect(20, doc.y, doc.page.width - 40, 40, 6).fill('#1e3a5f')
        doc.fillColor('#ffffff').fontSize(14).font('Helvetica-Bold')
        doc.text(`Solde final de caisse : ${data.soldeCloture.toFixed(2)} DZD`, 30, doc.y - 30, { align: 'center' })
        doc.font('Helvetica')
        doc.moveDown(2)

        // Tableau des transactions
        doc.fillColor('#1e3a5f').fontSize(12).text('Détail des transactions', { underline: true })
        doc.moveDown(0.5)

        const tableTop = doc.y
        const colX = [20, 80, 170, 230, 290, 350, 430]
        const colW = [55, 85, 55, 55, 55, 75, 70]
        const headers = ['Heure', 'Type', 'Libellé', 'Qté', 'Prix Unit.', 'Total', 'Paiement']

        // En-têtes tableau
        doc.fillColor('#f1f5f9')
        doc.rect(20, tableTop, doc.page.width - 40, 16).fill()
        doc.fillColor('#475569').fontSize(8).font('Helvetica-Bold')
        headers.forEach((h, i) => doc.text(h, colX[i] + 4, tableTop + 3, { width: colW[i], align: 'center' }))
        doc.font('Helvetica')

        let rowY = tableTop + 18
        for (const t of data.transactions) {
          if (rowY > 700) { doc.addPage(); rowY = 40 }
          const time = new Date(t.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
          const typeLabel = t.type === 'ENTREE' ? 'Entrée' : 'Sortie'
          const label = t.description || t.lines?.[0]?.product?.name || '—'
          const qty = t.lines?.reduce((s: number, l: any) => s + l.quantity, 0) || 0
          const unitPrice = t.lines?.[0]?.unitPrice || 0
          const payment = t.paymentMethod === 'ESPECES' ? 'Espèces' : t.paymentMethod === 'CARTE_BANCAIRE' ? 'Carte' : t.paymentMethod === 'MOBILE_MONEY' ? 'M.Money' : 'Vir.'

          doc.fillColor(rowY % 36 === 18 ? '#f8fafc' : '#ffffff')
          doc.rect(20, rowY - 2, doc.page.width - 40, 16).fill()
          doc.fillColor('#1f2937').fontSize(8)
          const vals = [time, typeLabel, (label as string).substring(0, 20), String(qty), `${unitPrice.toFixed(0)} DZD`, `${t.totalAmount.toFixed(0)} DZD`, payment]
          vals.forEach((v, i) => doc.text(v, colX[i] + 4, rowY, { width: colW[i], align: 'center' }))
          rowY += 18
        }

        // Signature
        rowY += 20
        if (rowY > 750) doc.addPage()
        doc.moveDown(2)
        doc.fontSize(9).fillColor('#9ca3af')
        doc.text('Signature de l\'opérateur : _________________________', 20, doc.y)
        doc.moveDown(0.5)
        doc.text('Signature du gérant : _________________________', 20, doc.y)
        doc.moveDown(1)
        doc.fontSize(8).fillColor('#94a3b8').text('Gestion Stock & Caisse — Rapport généré automatiquement', { align: 'center' })

        doc.end()
      })
    }
  }
}
