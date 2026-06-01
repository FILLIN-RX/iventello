import { Printer, User, Building2, CreditCard, Hash } from 'lucide-react'
import { Button } from './ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from './ui/dialog'
import type { SaleWithClient } from '../../../shared/types'
import { formatCurrency } from '@/lib/utils'

interface Props {
  open: boolean
  onClose: () => void
  sale: SaleWithClient | null
}

const PAYMENT_LABELS: Record<string, string> = {
  Cash: 'Espèces', 'Mobile Money': 'Mobile Money', Carte: 'Carte bancaire',
  ESPECES: 'Espèces', OM: 'Orange Money', MTN: 'MTN Mobile Money',
}

export function FactureDetailModal({ open, onClose, sale }: Props) {
  if (!sale) return null

  const wh = sale.warehouse
  const logoUrl = wh.invoiceCompanyLogo
  const items = (sale as any).items as ({ product: { id: string; name: string; barcode: string } } & { quantity: number; unitPrice: number })[]
  const vatTotal = sale.vatTotal ?? 0
  const discount = sale.discount ?? 0
  const subTotal = sale.subTotal ?? sale.finalTotal

  async function handlePrint() {
    try {
      const printers = await window.api.getPrinters()
      if (printers.length === 0) {
        alert('Aucune imprimante détectée. Connectez une imprimante et réessayez.')
        return
      }
      await window.api.printReceipt({
        items: items.map((i) => ({
          product: { name: i.product.name, price: i.unitPrice },
          quantity: i.quantity
        })),
        totalAmount: sale.finalTotal,
        saleId: sale.id,
        date: new Date(sale.createdAt).toLocaleDateString('fr-FR')
      })
    } catch (err) {
      alert('Impossible d\'imprimer : ' + (err instanceof Error ? err.message : 'Erreur inconnue'))
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5 text-primary" />
            Facture détaillée
          </DialogTitle>
        </DialogHeader>

        {/* En-tête société */}
        <div className="flex items-start gap-4 pb-4 border-b">
          {logoUrl && (
            <img
              src={logoUrl.startsWith('http') ? logoUrl : `local-file://${logoUrl}`}
              alt="Logo"
              className="h-12 w-12 rounded object-cover"
            />
          )}
          <div>
            <p className="font-bold text-sm">{wh.invoiceCompanyName || wh.name || 'Mon Entreprise'}</p>
            {wh.invoiceCompanyDescription && <p className="text-xs text-muted-foreground italic">{wh.invoiceCompanyDescription}</p>}
            <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground mt-0.5">
              {wh.invoiceCompanyNui && <span>NUI: {wh.invoiceCompanyNui}</span>}
              {wh.invoiceCompanyBp && <span>BP: {wh.invoiceCompanyBp}</span>}
            </div>
            {wh.invoiceCompanyAddress && <p className="text-xs text-muted-foreground">{wh.invoiceCompanyAddress}</p>}
            <div className="flex flex-col gap-0.5 text-xs text-muted-foreground mt-0.5">
              {wh.invoiceCompanyPhones?.split('\n').filter(Boolean).map((tel, i) => <span key={i}>{tel}</span>)}
              {wh.invoiceCompanyEmail && <span>{wh.invoiceCompanyEmail}</span>}
            </div>
          </div>
        </div>

        {/* Entête facture */}
        <div className="flex items-center justify-between text-sm">
          <div>
            <p className="font-bold text-lg">FACTURE</p>
            <p className="text-xs text-muted-foreground font-mono">N° {sale.id.slice(0, 8).toUpperCase()}</p>
          </div>
          <p className="text-xs text-muted-foreground">
            {new Date(sale.createdAt).toLocaleDateString('fr-FR', {
              day: '2-digit', month: 'long', year: 'numeric'
            })}
          </p>
        </div>

        {/* Infos client & entrepôt */}
        <div className="grid grid-cols-2 gap-3 rounded-lg bg-muted/40 p-3 text-xs">
          <div className="flex items-center gap-1.5">
            <User className="h-3.5 w-3.5 text-muted-foreground" />
            <span>{sale.client?.name ?? 'Client anonyme'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
            <span>{wh.name}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
            <span>{PAYMENT_LABELS[sale.paymentMethod] ?? sale.paymentMethod}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Hash className="h-3.5 w-3.5 text-muted-foreground" />
            <span>{items.length} article{items.length > 1 ? 's' : ''}</span>
          </div>
        </div>

        {/* Articles */}
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-xs text-muted-foreground">
              <th className="pb-2 text-left font-semibold">Article</th>
              <th className="pb-2 text-center font-semibold">Qté</th>
              <th className="pb-2 text-right font-semibold">Prix</th>
              <th className="pb-2 text-right font-semibold">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {items.map((item, i) => (
              <tr key={i}>
                <td className="py-2 text-sm">{item.product.name}</td>
                <td className="py-2 text-center">{item.quantity}</td>
                <td className="py-2 text-right">{formatCurrency(item.unitPrice)}</td>
                <td className="py-2 text-right font-medium">{formatCurrency(item.quantity * item.unitPrice)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totaux */}
        <div className="space-y-1 border-t pt-3 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>Sous-total</span>
            <span>{formatCurrency(subTotal)}</span>
          </div>
          {vatTotal > 0 && (
            <div className="flex justify-between text-muted-foreground">
              <span>TVA</span>
              <span>{formatCurrency(vatTotal)}</span>
            </div>
          )}
          {discount > 0 && (
            <div className="flex justify-between text-muted-foreground">
              <span>Remise</span>
              <span>-{formatCurrency(discount)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-base pt-1 border-t">
            <span>Total</span>
            <span className="text-primary">{formatCurrency(sale.finalTotal)}</span>
          </div>
        </div>

        {/* Pied de page */}
        {wh.invoiceFooter && (
          <p className="text-xs text-muted-foreground text-center border-t pt-3">
            {wh.invoiceFooter}
          </p>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-1" /> Imprimer le ticket
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
