import { useState, useEffect } from 'react'
import { Printer, User, Building2, CreditCard, Hash, UserCheck, RotateCcw, CheckCircle } from 'lucide-react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from './ui/dialog'
import type { SaleWithClient } from '../../../shared/types'
import { formatCurrency } from '@/lib/utils'
import { toFileUrl } from '../../../shared/imageUtils'
import { usePrinterStore } from '../stores/printerStore'
import { feedback } from '../stores/feedbackStore'

interface Props {
  open: boolean
  onClose: () => void
  sale: SaleWithClient | null
  onUpdate?: () => void
}

const PAYMENT_LABELS: Record<string, string> = {
  Cash: 'Espèces', 'Mobile Money': 'Mobile Money', Carte: 'Carte bancaire',
  ESPECES: 'Espèces', OM: 'Orange Money', MTN: 'MTN Mobile Money',
}

export function FactureDetailModal({ open, onClose, sale, onUpdate }: Props) {
  const [complementAmount, setComplementAmount] = useState(0)
  const [actionLoading, setActionLoading] = useState(false)
  const printerConfig = usePrinterStore((s) => s.config)

  useEffect(() => {
    if (open) setComplementAmount(0)
  }, [open, sale?.id])

  if (!sale) return null
  const currentSale = sale

  const wh = currentSale.warehouse
  const logoUrl = wh.invoiceCompanyLogo
  const items = (currentSale as any).items as ({ product: { id: string; name: string; barcode: string } } & { quantity: number; unitPrice: number })[]
  const vatTotal = currentSale.vatTotal ?? 0
  const discount = currentSale.discount ?? 0
  const subTotal = currentSale.subTotal ?? currentSale.finalTotal
  const montantAvance = (currentSale as any).montantAvance as number | null
  const isPendingDelivery = (currentSale as any).isPendingDelivery === true
  const isPaidOrDirect = currentSale.status === 'PAYE' || (!isPendingDelivery && (montantAvance == null || montantAvance >= currentSale.finalTotal))
  const avanceDejaVersee = isPaidOrDirect ? currentSale.finalTotal : (montantAvance ?? 0)
  const resteDu = isPaidOrDirect ? 0 : Math.max(0, currentSale.finalTotal - avanceDejaVersee)

  async function handlePrint() {
    try {
      if (printerConfig.type === 'USB') {
        const printers = await window.api.getPrinters()
        if (printers.length === 0) {
          feedback.toast.warning('Aucune imprimante USB détectée. Connectez une imprimante et réessayez.')
          return
        }
      }
      await window.api.printReceipt({
        items: items.map((i: any) => ({
          product: { name: i.product?.name || i.book?.title || 'Article', price: i.unitPrice },
          quantity: i.quantity
        })),
        totalAmount: currentSale.finalTotal,
        saleId: currentSale.id,
        invoiceNumber: currentSale.invoiceNumber,
        date: new Date(currentSale.createdAt).toLocaleDateString('fr-FR'),
        status: currentSale.status,
        montantAvance: avanceDejaVersee > 0 ? avanceDejaVersee : undefined,
        remainingBalance: resteDu > 0 ? resteDu : undefined
      }, printerConfig)
      feedback.toast.success('Impression envoyée avec succès')
    } catch (err: any) {
      feedback.toast.error(err?.message || 'Impossible d\'imprimer', 'Erreur impression')
    }
  }

  async function handleValidateWithComplement() {
    setActionLoading(true)
    try {
      await window.api.validateSale(currentSale.id, complementAmount > 0 ? complementAmount : undefined)
      feedback.toast.success('Facture validée avec succès')
      onUpdate?.()
      onClose()
    } catch (err: any) {
      feedback.toast.error(err?.message || 'Erreur lors de la validation')
    } finally { setActionLoading(false) }
  }

  async function handlePayRemaining() {
    setActionLoading(true)
    try {
      await window.api.paySale(currentSale.id)
      feedback.toast.success('Facture soldée', 'La facture est maintenant totalement payée.')
      onUpdate?.()
      onClose()
    } catch (err: any) {
      feedback.toast.error(err?.message || 'Erreur lors du paiement')
    } finally { setActionLoading(false) }
  }

  const invoiceTemplate = wh.invoiceTemplate || 'MODERNE'
  const primaryColor = wh.invoiceColor || '#2563eb'

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="sm:max-w-4xl lg:max-w-5xl max-h-[92vh] overflow-y-auto p-6 lg:p-8">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5 text-primary" />
            Facture détaillée {invoiceTemplate ? `(${invoiceTemplate.toLowerCase()})` : ''}
          </DialogTitle>
        </DialogHeader>

        {/* FACTURE STYLISÉE SELON LE TEMPLATE */}
        <div className="rounded-xl border bg-card p-4 text-xs space-y-4 shadow-sm">
          {/* TEMPLATE 1 : MODERNE */}
          {invoiceTemplate === 'MODERNE' && (
            <div className="space-y-3">
              <div
                className="rounded-lg p-3 text-white flex items-center justify-between shadow-sm"
                style={{ backgroundColor: primaryColor }}
              >
                <div className="flex items-center gap-3">
                  {logoUrl && (
                    <img
                      src={logoUrl.startsWith('http') ? logoUrl : toFileUrl(logoUrl)}
                      alt="Logo"
                      className="h-11 w-11 rounded-md object-contain bg-white/95 p-0.5 shadow-sm"
                    />
                  )}
                  <div>
                    <h2 className="text-sm font-bold tracking-tight">
                      {wh.invoiceCompanyName || wh.name || 'Mon Entreprise'}
                    </h2>
                    {wh.invoiceCompanyDescription && (
                      <p className="text-[10px] text-white/80 line-clamp-1">{wh.invoiceCompanyDescription}</p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-black tracking-widest uppercase bg-white/20 px-2 py-0.5 rounded">FACTURE</span>
                  <p className="text-[10px] text-white/80 font-mono mt-0.5">N° {currentSale.invoiceNumber}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-[11px] text-muted-foreground border-b pb-3">
                <div className="space-y-0.5">
                  <p className="font-semibold text-foreground text-xs">Émetteur</p>
                  {wh.invoiceCompanyAddress && <p>{wh.invoiceCompanyAddress}</p>}
                  {wh.invoiceCompanyNui && <p>NUI: {wh.invoiceCompanyNui}</p>}
                  {wh.invoiceCompanyBp && <p>BP: {wh.invoiceCompanyBp}</p>}
                  {wh.invoiceCompanyPhones && <p>Tél: {wh.invoiceCompanyPhones.split('\n')[0]}</p>}
                  {wh.invoiceCompanyEmail && <p>{wh.invoiceCompanyEmail}</p>}
                </div>
                <div className="space-y-0.5 bg-muted/40 p-2.5 rounded-lg border text-right">
                  <p className="font-semibold text-foreground text-xs">Client : {currentSale.client?.name ?? 'Client anonyme'}</p>
                  <p>Date : {new Date(currentSale.createdAt).toLocaleDateString('fr-FR')}</p>
                  <p className="font-medium" style={{ color: primaryColor }}>
                    Mode : {PAYMENT_LABELS[currentSale.paymentMethod] ?? currentSale.paymentMethod}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TEMPLATE 2 : CLASSIQUE */}
          {invoiceTemplate === 'CLASSIQUE' && (
            <div className="space-y-3">
              <div className="border-b-2 pb-3" style={{ borderColor: primaryColor }}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {logoUrl && (
                      <img
                        src={logoUrl.startsWith('http') ? logoUrl : toFileUrl(logoUrl)}
                        alt="Logo"
                        className="h-12 w-12 rounded object-contain border p-0.5 bg-white"
                      />
                    )}
                    <div>
                      <h2 className="text-base font-bold uppercase tracking-wide" style={{ color: primaryColor }}>
                        {wh.invoiceCompanyName || wh.name || 'Mon Entreprise'}
                      </h2>
                      {wh.invoiceCompanyDescription && (
                        <p className="text-[10px] text-muted-foreground italic">{wh.invoiceCompanyDescription}</p>
                      )}
                      <p className="text-[10px] text-muted-foreground">{wh.invoiceCompanyAddress}</p>
                      <div className="flex gap-2 text-[10px] text-muted-foreground">
                        {wh.invoiceCompanyNui && <span>NUI: {wh.invoiceCompanyNui}</span>}
                        {wh.invoiceCompanyBp && <span>BP: {wh.invoiceCompanyBp}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="border-2 p-2 rounded text-right" style={{ borderColor: primaryColor }}>
                    <p className="text-xs font-bold" style={{ color: primaryColor }}>FACTURE COMMERCIALE</p>
                    <p className="text-[10px] font-mono">N° {currentSale.invoiceNumber}</p>
                    <p className="text-[10px] text-muted-foreground">
                      Date : {new Date(currentSale.createdAt).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                </div>
              </div>

              <div className="border rounded p-2 bg-muted/30 text-[11px] flex justify-between items-center">
                <div>
                  <p className="font-bold text-foreground">Facturé à : {currentSale.client?.name ?? 'Client comptoir'}</p>
                  {currentSale.client?.phone && <p className="text-muted-foreground">Tél: {currentSale.client.phone}</p>}
                </div>
                <div className="text-right">
                  <span className="text-xs font-semibold" style={{ color: primaryColor }}>
                    {PAYMENT_LABELS[currentSale.paymentMethod] ?? currentSale.paymentMethod}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TEMPLATE 3 : MINIMALISTE */}
          {invoiceTemplate === 'MINIMALISTE' && (
            <div className="space-y-3">
              <div className="flex justify-between items-start pb-2 border-b">
                <div>
                  {logoUrl && (
                    <img
                      src={logoUrl.startsWith('http') ? logoUrl : toFileUrl(logoUrl)}
                      alt="Logo"
                      className="h-10 w-10 rounded object-contain mb-1"
                    />
                  )}
                  <h2 className="text-sm font-bold text-foreground tracking-tight">
                    {wh.invoiceCompanyName || wh.name || 'Mon Entreprise'}
                  </h2>
                  <p className="text-[10px] text-muted-foreground">{wh.invoiceCompanyAddress}</p>
                  {wh.invoiceCompanyEmail && <p className="text-[10px] text-muted-foreground">{wh.invoiceCompanyEmail}</p>}
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">FACTURE</p>
                  <p className="text-sm font-mono font-bold text-foreground">#{currentSale.invoiceNumber}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {new Date(currentSale.createdAt).toLocaleDateString('fr-FR')}
                  </p>
                </div>
              </div>

              <div className="text-[11px] pt-1 flex justify-between items-center">
                <div>
                  <span className="text-muted-foreground text-[10px] uppercase block">Client</span>
                  <p className="font-medium text-foreground">{currentSale.client?.name ?? 'Client anonyme'}</p>
                </div>
                <div className="text-right">
                  <span className="text-muted-foreground text-[10px] uppercase block">Règlement</span>
                  <p className="font-medium">{PAYMENT_LABELS[currentSale.paymentMethod] ?? currentSale.paymentMethod}</p>
                </div>
              </div>
            </div>
          )}

          {/* Agent info */}
          {(currentSale as any).agent && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <UserCheck className="h-3.5 w-3.5" />
              <span>Agent : {(currentSale as any).agent.name}</span>
            </div>
          )}

          {/* Tableau Articles */}
          <div className="overflow-hidden rounded-lg border">
            <table className="w-full text-left text-xs">
              <thead style={{ backgroundColor: invoiceTemplate === 'MODERNE' ? primaryColor : undefined, color: invoiceTemplate === 'MODERNE' ? '#ffffff' : undefined }} className={invoiceTemplate !== 'MODERNE' ? 'bg-muted/60 text-foreground font-semibold' : ''}>
                <tr>
                  <th className="py-1.5 px-2.5 font-semibold">Article</th>
                  <th className="py-1.5 px-2 text-center font-semibold">Qté</th>
                  <th className="py-1.5 px-2 text-right font-semibold">Prix Unit.</th>
                  <th className="py-1.5 px-2.5 text-right font-semibold">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {items.map((item: any, i) => (
                  <tr key={i} className="hover:bg-muted/20">
                    <td className="py-1.5 px-2.5 font-medium">{item.product?.name || item.book?.title || 'Article'}</td>
                    <td className="py-1.5 px-2 text-center">{item.quantity}</td>
                    <td className="py-1.5 px-2 text-right">{formatCurrency(item.unitPrice)}</td>
                    <td className="py-1.5 px-2.5 text-right font-medium">{formatCurrency(item.quantity * item.unitPrice)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Avances / Réservation */}
          {montantAvance != null && (
            <div className="rounded-md border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20 p-2.5 space-y-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-medium text-amber-700 dark:text-amber-400">Avance versée</span>
                <span className="font-bold text-amber-700 dark:text-amber-400">{formatCurrency(montantAvance)}</span>
              </div>
              {montantAvance < currentSale.finalTotal && (
                <div className="flex items-center justify-between mt-1">
                  <span className="text-muted-foreground">Reste à payer</span>
                  <span className="font-bold text-destructive">{formatCurrency(resteDu)}</span>
                </div>
              )}
            </div>
          )}

          {/* Totaux */}
          <div className="space-y-1.5 border-t border-border pt-3 text-xs">
            <div className="flex justify-between text-muted-foreground font-medium">
              <span>Sous-total</span>
              <span className="tabular-nums font-semibold text-foreground">{formatCurrency(subTotal)}</span>
            </div>
            {vatTotal > 0 && (
              <div className="flex justify-between text-muted-foreground font-medium">
                <span>TVA (19.25%)</span>
                <span className="tabular-nums font-semibold text-foreground">{formatCurrency(vatTotal)}</span>
              </div>
            )}
            {discount > 0 && (
              <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-medium">
                <span>Remise accordée</span>
                <span className="tabular-nums font-semibold">-{formatCurrency(discount)}</span>
              </div>
            )}
            <div className="flex justify-between items-center font-extrabold text-base p-3.5 rounded-xl mt-2 border bg-emerald-500/15 border-emerald-500/30 dark:bg-emerald-950/50 shadow-sm text-foreground">
              <span className="tracking-wide uppercase text-xs sm:text-sm font-black text-foreground">TOTAL NET</span>
              <span className="text-xl sm:text-2xl tabular-nums font-black text-emerald-600 dark:text-emerald-400">
                {formatCurrency(currentSale.finalTotal)}
              </span>
            </div>
          </div>

          {/* Coordonnées bancaires & Termes & Pied de page */}
          {(wh.invoiceBankDetails || wh.invoiceTerms || wh.invoiceFooter) && (
            <div className="pt-2 border-t space-y-2 text-[10px] text-muted-foreground">
              {wh.invoiceBankDetails && (
                <div className="p-2 rounded bg-muted/40 border">
                  <p className="font-semibold text-foreground text-[10px] mb-0.5 flex items-center gap-1">
                    <CreditCard className="h-3 w-3 text-primary" /> Coordonnées de règlement :
                  </p>
                  <p className="whitespace-pre-line font-mono text-[9px]">{wh.invoiceBankDetails}</p>
                </div>
              )}
              {wh.invoiceTerms && (
                <div className="space-y-0.5">
                  <p className="font-semibold text-foreground text-[10px]">Conditions générales :</p>
                  <p className="italic leading-snug">{wh.invoiceTerms}</p>
                </div>
              )}
              {wh.invoiceFooter && (
                <p className="text-center font-medium text-foreground pt-1 border-t border-dashed">
                  {wh.invoiceFooter}
                </p>
              )}
            </div>
          )}
        </div>
        {currentSale.status === 'EN_ATTENTE' && resteDu > 0 && (
          <div className="rounded-md border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20 p-3 space-y-2">
            <Label className="text-xs font-medium text-amber-700 dark:text-amber-400">
              Encaisser le solde à la validation
            </Label>
            <div className="flex items-center gap-2">
              <Input
                type="number" min="0" max={resteDu} step="1"
                value={complementAmount || 0}
                onChange={(e) => setComplementAmount(Math.min(parseFloat(e.target.value) || 0, resteDu))}
                className="border-amber-300 dark:border-amber-700 text-sm"
                placeholder="Montant encaissé"
              />
              <Button
                size="sm"
                className="bg-amber-600 hover:bg-amber-700 text-white shrink-0"
                disabled={actionLoading}
                onClick={handleValidateWithComplement}
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Valider{complementAmount > 0 ? ` & ${formatCurrency(complementAmount)}` : ''}
              </Button>
            </div>
            {complementAmount < resteDu && (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                Restera dû : {formatCurrency(resteDu - complementAmount)}
                {complementAmount > 0 && ' (à payer ultérieurement)'}
              </p>
            )}
          </div>
        )}
        {currentSale.status === 'EN_ATTENTE' && resteDu === 0 && (
          <div className="rounded-md border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20 p-3">
            <Button
              className="w-full bg-amber-600 hover:bg-amber-700 text-white"
              disabled={actionLoading}
              onClick={handleValidateWithComplement}
            >
              <CheckCircle className="h-4 w-4 mr-1" />
              Valider la facture (déjà payée en totalité)
            </Button>
          </div>
        )}
        {currentSale.status === 'VALIDE' && resteDu > 0 && (
          <div className="rounded-md border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/20 p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-blue-700 dark:text-blue-400">
                Solde restant : <strong>{formatCurrency(resteDu)}</strong>
              </span>
              <Button
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white"
                disabled={actionLoading}
                onClick={handlePayRemaining}
              >
                <RotateCcw className="h-4 w-4 mr-1" />
                Encaisser le solde
              </Button>
            </div>
          </div>
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
