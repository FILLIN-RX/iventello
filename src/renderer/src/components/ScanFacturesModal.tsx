import { useState, useEffect } from 'react'
import {
  Calendar,
  FileDown,
  Printer,
  Search,
  CheckCircle2,
  AlertCircle,
  FolderOpen,
  FolderArchive,
  RefreshCw,
  Loader2,
  FileText,
  DollarSign,
  Wallet
} from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Badge } from './ui/badge'
import { feedback } from '../stores/feedbackStore'
import { formatCurrency } from '@/lib/utils'
import type { SaleWithClient } from '../../../shared/types'

interface Props {
  open: boolean
  onClose: () => void
  workspaceId?: string
}

export function ScanFacturesModal({ open, onClose, workspaceId }: Props) {
  const [dateStr, setDateStr] = useState<string>(() => new Date().toISOString().slice(0, 10))
  const [loading, setLoading] = useState(false)
  const [exportingPdf, setExportingPdf] = useState(false)
  const [exportingZip, setExportingZip] = useState(false)
  const [scanResult, setScanResult] = useState<{
    date: string
    totalInvoices: number
    totalRevenue: number
    totalPaid: number
    totalPending: number
    totalCancelled: number
    paymentMethodsBreakdown: Record<string, { count: number; total: number }>
    sales: SaleWithClient[]
  } | null>(null)

  async function handleScan(targetDate: string) {
    try {
      setLoading(true)
      const res = await window.api.scanInvoicesByDate(targetDate, workspaceId)
      setScanResult(res)
    } catch (err: any) {
      console.error('Erreur scan factures', err)
      feedback.toast.error(err?.message || 'Erreur lors du scan des factures')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open) {
      handleScan(dateStr)
    }
  }, [open, dateStr, workspaceId])

  async function handleExportMasterPdf() {
    if (!dateStr) return
    try {
      setExportingPdf(true)
      const { filePath } = await window.api.exportScannedInvoicesPdf(dateStr, workspaceId)
      feedback.toast.success(
        'Registre PDF exporté avec succès',
        `Fichier sauvegardé dans "Bureau/factures-scannees/${filePath.split('\\').pop() || filePath.split('/').pop()}"`
      )
    } catch (err: any) {
      console.error('Erreur export PDF', err)
      feedback.toast.error(err?.message || 'Erreur lors de l\'exportation PDF')
    } finally {
      setExportingPdf(false)
    }
  }

  async function handleExportBatchPdfs() {
    if (!dateStr) return
    try {
      setExportingZip(true)
      const { folderPath, count } = await window.api.exportScannedInvoicesZip(dateStr, workspaceId)
      feedback.toast.success(
        `${count} facture(s) exportée(s) en lot`,
        `Dossier créé sur le bureau : ${folderPath}`
      )
    } catch (err: any) {
      console.error('Erreur export lot', err)
      feedback.toast.error(err?.message || 'Erreur lors de l\'exportation du lot')
    } finally {
      setExportingZip(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="sm:max-w-4xl lg:max-w-5xl max-h-[92vh] overflow-y-auto p-6 lg:p-8">
        <DialogHeader className="pb-3 border-b border-border">
          <DialogTitle className="flex items-center justify-between gap-3 text-xl font-bold text-foreground">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <FolderArchive className="h-6 w-6" />
              </div>
              <div>
                <h2>Scan & Archivage des Factures par Date</h2>
                <p className="text-xs text-muted-foreground font-normal">Recherchez, scannez et sauvegardez toutes vos factures pour n'importe quelle journée</p>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => handleScan(dateStr)}
              disabled={loading}
              className="gap-1.5 text-xs font-semibold shrink-0"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              Rafraîchir
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 my-2">
          {/* Sélection de la date scannée */}
          <div className="bg-card border border-border p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <Calendar className="h-5 w-5 text-primary shrink-0" />
              <div>
                <label className="text-xs font-bold text-foreground block">Date des Factures à Scanner :</label>
                <span className="text-[11px] text-muted-foreground">Sélectionnez le jour pour extraire et archiver toutes les ventes</span>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Input
                type="date"
                value={dateStr}
                onChange={(e) => setDateStr(e.target.value)}
                className="font-mono text-sm font-semibold w-full sm:w-48 bg-background border-primary/30 focus-visible:ring-primary"
              />
            </div>
          </div>

          {/* Statistiques Bento Grid du Scan */}
          {scanResult && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
                <div className="flex justify-between items-center text-muted-foreground text-xs font-bold">
                  <span>Factures Scannées</span>
                  <FileText className="h-4 w-4 text-primary" />
                </div>
                <p className="mt-2 text-2xl font-black text-foreground tabular-nums">{scanResult.totalInvoices}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Enregistrées le {dateStr}</p>
              </div>

              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 shadow-sm">
                <div className="flex justify-between items-center text-emerald-700 dark:text-emerald-400 text-xs font-bold">
                  <span>Chiffre d'Affaires</span>
                  <Wallet className="h-4 w-4" />
                </div>
                <p className="mt-2 text-2xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                  {formatCurrency(scanResult.totalRevenue)}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">CA total de la journée</p>
              </div>

              <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 shadow-sm">
                <div className="flex justify-between items-center text-blue-700 dark:text-blue-400 text-xs font-bold">
                  <span>Montant Encaissé (Payé)</span>
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <p className="mt-2 text-2xl font-black text-blue-600 dark:text-blue-400 tabular-nums">
                  {formatCurrency(scanResult.totalPaid)}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Ventes directes réglées</p>
              </div>

              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 shadow-sm">
                <div className="flex justify-between items-center text-amber-700 dark:text-amber-400 text-xs font-bold">
                  <span>Commandes / En Attente</span>
                  <AlertCircle className="h-4 w-4" />
                </div>
                <p className="mt-2 text-2xl font-black text-amber-600 dark:text-amber-400 tabular-nums">
                  {formatCurrency(scanResult.totalPending)}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Avances & non livrés</p>
              </div>
            </div>
          )}

          {/* Table des Factures Scannées */}
          <div className="rounded-xl border border-border overflow-hidden shadow-sm">
            <div className="bg-muted px-4 py-3 font-bold grid grid-cols-12 text-xs text-muted-foreground uppercase tracking-wider">
              <span className="col-span-3">N° Facture</span>
              <span className="col-span-2">Heure</span>
              <span className="col-span-3">Client</span>
              <span className="col-span-2">Paiement</span>
              <span className="col-span-2 text-right">Total Net</span>
            </div>

            <div className="divide-y divide-border max-h-64 overflow-y-auto">
              {loading ? (
                <div className="p-8 text-center text-muted-foreground text-xs flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  Scan des factures en cours pour le {dateStr}...
                </div>
              ) : scanResult && scanResult.sales.length > 0 ? (
                scanResult.sales.map((sale: any) => (
                  <div key={sale.id} className="px-4 py-3 grid grid-cols-12 items-center text-xs text-foreground hover:bg-muted/30 transition-colors">
                    <div className="col-span-3 font-mono font-bold flex items-center gap-1.5">
                      <span className="text-primary">{sale.invoiceNumber}</span>
                      {sale.status === 'ANNULE' && <Badge variant="destructive" className="text-[9px] px-1 py-0">Annulée</Badge>}
                    </div>
                    <span className="col-span-2 text-muted-foreground">
                      {new Date(sale.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className="col-span-3 font-medium truncate">
                      {sale.client?.name ?? 'Client anonyme'}
                    </span>
                    <span className="col-span-2 text-muted-foreground">
                      {sale.paymentMethod || 'ESPECES'}
                    </span>
                    <span className="col-span-2 text-right font-black tabular-nums text-foreground">
                      {formatCurrency(sale.finalTotal)}
                    </span>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-muted-foreground text-xs">
                  Aucune facture enregistrée pour la date du <strong className="text-foreground">{dateStr}</strong>.
                </div>
              )}
            </div>
          </div>

          {/* Actions d'Exportation & Sauvegarde en masse */}
          <div className="bg-muted/40 p-5 rounded-2xl border border-border space-y-3">
            <h4 className="text-xs font-bold text-foreground flex items-center gap-2 uppercase tracking-wide">
              <FolderOpen className="h-4 w-4 text-primary" />
              Options de Sauvegarde & Exporation pour le {dateStr}
            </h4>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                size="lg"
                onClick={handleExportMasterPdf}
                disabled={exportingPdf || !scanResult || scanResult.sales.length === 0}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2 text-xs h-12 shadow-sm"
              >
                {exportingPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
                Sauvegarder le Registre PDF Complet
              </Button>

              <Button
                size="lg"
                variant="outline"
                onClick={handleExportBatchPdfs}
                disabled={exportingZip || !scanResult || scanResult.sales.length === 0}
                className="flex-1 border-primary/40 text-primary hover:bg-primary/5 font-bold gap-2 text-xs h-12"
              >
                {exportingZip ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
                Exporter les Factures Individuelles en Lot
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
