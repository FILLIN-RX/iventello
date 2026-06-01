import { webContents } from 'electron'
import { PosPrinter } from 'electron-pos-printer'

interface ReceiptData {
  items: { product: { name: string; price: number }; quantity: number }[]
  totalAmount: number
  saleId: string
  date: string
}

function buildReceiptLines(data: ReceiptData) {
  const lines: { type: string; value: string; style?: Record<string, string> }[] = []

  lines.push({ type: 'text', value: 'Gestion Stock & Caisse', style: { fontWeight: '700', textAlign: 'center', fontSize: '18px' } })
  lines.push({ type: 'text', value: 'Ticket de caisse', style: { textAlign: 'center', fontSize: '14px' } })
  lines.push({ type: 'text', value: '', style: { fontSize: '8px' } })
  lines.push({ type: 'text', value: '─'.repeat(32), style: { textAlign: 'center' } })
  lines.push({ type: 'text', value: '', style: { fontSize: '8px' } })
  lines.push({ type: 'text', value: `N° ${data.saleId.slice(0, 8)}  |  ${data.date}`, style: { textAlign: 'center', fontSize: '11px' } })
  lines.push({ type: 'text', value: '', style: { fontSize: '8px' } })
  lines.push({ type: 'text', value: '─'.repeat(32), style: { textAlign: 'center' } })
  lines.push({ type: 'text', value: 'Qté  Prix    Total', style: { fontWeight: '700', fontSize: '11px' } })

  for (const item of data.items) {
    const total = (item.product.price * item.quantity).toFixed(2)
    const price = item.product.price.toFixed(2)
    const name = item.product.name.length > 20 ? item.product.name.substring(0, 18) + '..' : item.product.name
    const qty = item.quantity.toString().padStart(3)
    const p = price.padStart(7)
    lines.push({ type: 'text', value: name, style: { fontSize: '11px' } })
    lines.push({ type: 'text', value: `${qty}  ${p}  ${total.padStart(6)}`, style: { fontSize: '11px' } })
  }

  lines.push({ type: 'text', value: '─'.repeat(32), style: { textAlign: 'center' } })
  lines.push({ type: 'text', value: `TOTAL  ${data.totalAmount.toFixed(2)} FCFA`, style: { fontWeight: '700', textAlign: 'center', fontSize: '16px' } })
  lines.push({ type: 'text', value: '', style: { fontSize: '8px' } })
  lines.push({ type: 'text', value: 'Merci de votre visite !', style: { textAlign: 'center', fontSize: '12px' } })
  lines.push({ type: 'text', value: '\n\n', style: {} })

  return lines
}

export function createPrinterService() {
  return {
    async listPrinters(): Promise<string[]> {
      try {
        const wc = webContents.getAllWebContents()
        if (wc.length > 0) {
          const printers = await wc[0].getPrintersAsync()
          return printers.map((p) => p.name)
        }
        return []
      } catch { return [] }
    },

    async printReceipt(data: ReceiptData, printerName?: string): Promise<void> {
      const lines = buildReceiptLines(data)
      const options: Record<string, unknown> = { preview: false, width: '58mm', copies: 1, silent: true }
      if (printerName) options.printerName = printerName
      try {
        await PosPrinter.print(lines, options)
      } catch (err: any) {
        if (err?.message?.includes('enumerate') || err?.message?.includes('printer')) {
          throw new Error('Aucune imprimante connectée')
        }
        throw err
      }
    }
  }
}
