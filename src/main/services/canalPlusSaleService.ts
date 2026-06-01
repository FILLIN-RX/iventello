import { PrismaClient } from '@prisma/client'
import { BrowserWindow } from 'electron'
import { join } from 'node:path'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'

export function createCanalPlusSaleService(prisma: PrismaClient) {
  return {
    async getAll(warehouseId: string, search?: string) {
      const where: any = { warehouseId }
      if (search) {
        where.OR = [
          { clientName: { contains: search } },
          { subscriptionNumber: { contains: search } },
          { phone: { contains: search } },
        ]
      }
      return prisma.canalPlusSale.findMany({
        where,
        include: { warehouse: true },
        orderBy: { createdAt: 'desc' }
      })
    },

    async create(data: {
      warehouseId: string
      clientName: string
      subscriptionNumber: string
      phone: string
      formule: string
      amount: number
    }) {
      const sale = await prisma.canalPlusSale.create({ data })

      const warehouse = await prisma.warehouse.findUnique({
        where: { id: data.warehouseId }
      })

      const invoiceDir = join(homedir(), 'Desktop', 'factures-canal-plus')
      if (!existsSync(invoiceDir)) mkdirSync(invoiceDir, { recursive: true })
      const filename = `FACT-CANAL-${sale.id.slice(0, 8).toUpperCase()}.pdf`
      const invoicePath = join(invoiceDir, filename)

      const html = generateInvoiceHtml(sale, warehouse)
      const pdfWindow = new BrowserWindow({
        show: false,
        webPreferences: { sandbox: true }
      })
      await pdfWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`)
      const pdfBuf = await pdfWindow.webContents.printToPDF({ printBackground: true })
      pdfWindow.close()
      writeFileSync(invoicePath, pdfBuf)

      await prisma.canalPlusSale.update({
        where: { id: sale.id },
        data: { invoicePath }
      })

      return { ...sale, invoicePath }
    }
  }
}

function generateInvoiceHtml(sale: {
  id: string
  clientName: string
  subscriptionNumber: string
  phone: string
  formule: string
  amount: number
  createdAt: Date
}, warehouse: {
  invoiceCompanyName: string | null
  invoiceCompanyNui: string | null
  invoiceCompanyBp: string | null
  invoiceCompanyAddress: string | null
  invoiceCompanyPhones: string | null
  invoiceCompanyEmail: string | null
  invoiceCompanyLogo: string | null
  invoiceCompanyDescription: string | null
  invoiceFooter: string | null
  name: string
} | null) {
  const now = new Date(sale.createdAt)
  const dateStr = now.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
  const num = sale.id.slice(0, 8).toUpperCase()

  const whName = warehouse?.invoiceCompanyName || warehouse?.name || ''
  const whDesc = warehouse?.invoiceCompanyDescription || ''
  const whNui = warehouse?.invoiceCompanyNui || ''
  const whBp = warehouse?.invoiceCompanyBp || ''
  const whAddr = warehouse?.invoiceCompanyAddress || ''
  const whPhones = warehouse?.invoiceCompanyPhones || ''
  const whEmail = warehouse?.invoiceCompanyEmail || ''
  const whLogo = warehouse?.invoiceCompanyLogo || ''
  const whFooter = warehouse?.invoiceFooter || ''

  const logoHtml = whLogo
    ? `<img src="local-file://${whLogo}" style="max-height:70px;margin-bottom:8px" />`
    : ''

  const phonesList = whPhones
    ? whPhones.split('\n').filter(Boolean).map(p => `<p>${p.trim()}</p>`).join('')
    : ''

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
  @page { margin: 15mm 15mm; }
  body { font-family: 'Helvetica', 'Arial', sans-serif; color: #1e293b; font-size: 12px; margin: 0; padding: 0; }
  .company-header { text-align: center; border-bottom: 2px solid #1e3a5f; padding-bottom: 12px; margin-bottom: 20px; }
  .company-header .company-name { font-size: 20px; font-weight: 800; color: #1e3a5f; margin: 4px 0; }
  .company-header .company-desc { font-size: 11px; color: #64748b; margin: 2px 0; }
  .company-header .company-info { font-size: 10px; color: #64748b; margin: 2px 0; }
  .invoice-title-box { text-align: center; margin-bottom: 18px; }
  .invoice-title-box h1 { font-size: 24px; font-weight: 800; color: #0f172a; margin: 0 0 2px 0; }
  .invoice-title-box p { font-size: 11px; color: #64748b; margin: 2px 0; }
  .info-grid { display: flex; justify-content: space-between; margin-bottom: 20px; }
  .info-box { border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 14px; width: 48%; }
  .info-box h3 { font-size: 10px; text-transform: uppercase; color: #64748b; margin: 0 0 4px 0; letter-spacing: 1px; }
  .info-box p { margin: 2px 0; font-size: 12px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
  th { background: #1e3a5f; color: white; padding: 8px 12px; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; }
  td { padding: 8px 12px; border-bottom: 1px solid #e2e8f0; font-size: 12px; }
  .total-row td { font-weight: 700; font-size: 14px; border-top: 2px solid #1e3a5f; border-bottom: none; }
  .footer { text-align: center; font-size: 10px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 12px; margin-top: 20px; }
</style></head>
<body>
  <div class="company-header">
    ${logoHtml}
    <div class="company-name">${whName}</div>
    ${whDesc ? `<div class="company-desc">${whDesc}</div>` : ''}
    ${whNui ? `<div class="company-info">NUI: ${whNui}</div>` : ''}
    ${whBp ? `<div class="company-info">BP: ${whBp}</div>` : ''}
    ${whAddr ? `<div class="company-info">${whAddr}</div>` : ''}
    ${phonesList ? `<div class="company-info">${phonesList}</div>` : ''}
    ${whEmail ? `<div class="company-info">${whEmail}</div>` : ''}
  </div>

  <div class="invoice-title-box">
    <h1>FACTURE CANAL+</h1>
    <p>N° FACT-CANAL-${num} | ${dateStr}</p>
  </div>

  <div class="info-grid">
    <div class="info-box">
      <h3>Client</h3>
      <p><strong>${sale.clientName}</strong></p>
      <p>Tél: ${sale.phone}</p>
      <p>Abonnement: ${sale.subscriptionNumber}</p>
    </div>
    <div class="info-box">
      <h3>Abonnement</h3>
      <p>Formule: <strong>${sale.formule}</strong></p>
      <p>Date: ${dateStr}</p>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Désignation</th>
        <th style="text-align:right">Montant</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Abonnement Canal+ — Formule <strong>${sale.formule}</strong></td>
        <td style="text-align:right">${sale.amount.toLocaleString('fr-FR')} FCFA</td>
      </tr>
      <tr class="total-row">
        <td><strong>TOTAL À PAYER</strong></td>
        <td style="text-align:right"><strong>${sale.amount.toLocaleString('fr-FR')} FCFA</strong></td>
      </tr>
    </tbody>
  </table>

  <div class="footer">
    ${whFooter ? `<p>${whFooter}</p>` : ''}
    <p>Merci de votre confiance !</p>
  </div>
</body>
</html>`
}
