import { useState, useEffect } from 'react'
import {
  FileText,
  Eye,
  Package,
  ShoppingBag,
  ExternalLink,
  RefreshCw,
  Trash2,
  ChevronDown,
  ChevronUp,
  Building2,
  CalendarDays,
  Hash,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowDownToLine,
  XCircle,
  Download,
  FileSpreadsheet,
  FolderOpen
} from 'lucide-react'
import { Button } from '../components/ui/button'
import { useEntrepotStore } from '../stores/entrepotStore'
import { useWarehouses } from '../hooks/useWarehouses'
import { feedback } from '../stores/feedbackStore'
import type { PurchaseOrder, PurchaseOrderStatus } from '../../../shared/types'

const STATUS_LABELS: Record<string, string> = {
  EN_ATTENTE: 'En attente',
  CONFIRME: 'Confirmé',
  RECU: 'Reçu & Réceptionné',
  ANNULE: 'Annulé'
}

const STATUS_COLORS: Record<string, string> = {
  EN_ATTENTE: 'text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-950/30 dark:border-amber-800',
  CONFIRME: 'text-blue-700 bg-blue-50 border-blue-200 dark:text-blue-400 dark:bg-blue-950/30 dark:border-blue-800',
  RECU: 'text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-950/30 dark:border-emerald-800',
  ANNULE: 'text-rose-700 bg-rose-50 border-rose-200 dark:text-rose-400 dark:bg-rose-950/30 dark:border-rose-800'
}

export default function BonsCommandes() {
  const { selectedId: workspaceId } = useEntrepotStore()
  const { warehouses } = useWarehouses()
  const [orders, setOrders] = useState<PurchaseOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)
  const [receivingId, setReceivingId] = useState<string | null>(null)
  const [previewPdf, setPreviewPdf] = useState<string | null>(null)
  const [previewFilename, setPreviewFilename] = useState<string>('bon-commande.pdf')
  const [selectedOrderForModal, setSelectedOrderForModal] = useState<PurchaseOrder | null>(null)
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set())
  const [analysisAlert, setAnalysisAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [ordersDir, setOrdersDir] = useState<string>('')

  async function loadOrders() {
    setLoading(true)
    try {
      const data = await window.api.getPurchaseOrders()
      const list = Array.isArray(data) ? data : []
      setOrders(list)
      setExpandedOrders(new Set(list.map((o: PurchaseOrder) => o.id)))
    } catch (err) {
      console.error('Erreur chargement commandes', err)
      setOrders([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadOrders()
    window.api.getOrdersDirectory().then(dir => setOrdersDir(dir)).catch(() => {})
  }, [])

  async function handleOpenOrdersDir() {
    try {
      const dir = ordersDir || await window.api.getOrdersDirectory()
      if (dir) {
        await window.api.openFile(dir)
      }
    } catch (err: any) {
      feedback.toast.error('Impossible d\'ouvrir le dossier des commandes')
    }
  }

  async function handleAnalyzeStock() {
    setAnalyzing(true)
    setAnalysisAlert(null)
    try {
      const res = await window.api.analyzeStock()
      if (res.orders.length === 0) {
        setAnalysisAlert({
          type: 'success',
          message: 'Tous les niveaux de stock sont optimaux. Aucun produit sous le seuil critique.'
        })
      } else {
        setAnalysisAlert({
          type: 'success',
          message: `${res.orders.length} produit(s) en rupture détecté(s). Bon(s) de commande généré(s) avec succès !`
        })
      }
      await loadOrders()
    } catch (err: any) {
      console.error('Erreur analyse stock', err)
      setAnalysisAlert({
        type: 'error',
        message: `Erreur lors de l'analyse : ${err?.message || 'Erreur inconnue'}`
      })
    } finally {
      setAnalyzing(false)
    }
  }

  const [exportingId, setExportingId] = useState<string | null>(null)
  const [exportingAll, setExportingAll] = useState(false)

  async function handlePreview(order: PurchaseOrder) {
    try {
      // Régénération systématique du PDF tabulaire officiel avec le nom de la boutique
      // garantit qu'on ne réutilise jamais un ancien fichier texte
      const currentPath = await window.api.exportPurchaseOrderPdf(order.id)
      if (!currentPath) {
        feedback.toast.error('Impossible de générer le fichier PDF tabulaire.')
        return
      }

      setOrders(prev => prev.map(o => o.id === order.id ? { ...o, pdfPath: currentPath } : o))

      const base64 = await window.api.previewPdf(currentPath)
      if (base64) {
        setPreviewFilename(currentPath.split(/[\\/]/).pop() || 'bon-commande.pdf')
        setPreviewPdf(base64)
        setSelectedOrderForModal({ ...order, pdfPath: currentPath })
      } else {
        window.api.openFile(currentPath)
      }
    } catch (err: any) {
      console.error('Erreur preview PDF', err)
      feedback.toast.error(err?.message || 'Erreur lors de la génération du PDF tabulaire')
    }
  }

  async function handleExportExcel(order: PurchaseOrder) {
    setExportingId(order.id)
    try {
      const filePath = await window.api.exportPurchaseOrderExcel(order.id)
      feedback.toast.success(
        'Fichier Excel généré avec succès !',
        `Enregistré sur votre Bureau dans "bons-de-commande".`
      )
      window.api.openFile(filePath).catch(() => {})
    } catch (err: any) {
      console.error('Erreur export Excel', err)
      feedback.toast.error(err?.message || 'Erreur lors de la création du fichier Excel')
    } finally {
      setExportingId(null)
    }
  }

  async function handleExportAllExcel() {
    if (orders.length === 0) return
    setExportingAll(true)
    try {
      const filePath = await window.api.exportAllPurchaseOrdersExcel()
      feedback.toast.success(
        'Synthèse Excel créée !',
        `Toutes les commandes ont été exportées sur votre Bureau.`
      )
      window.api.openFile(filePath).catch(() => {})
    } catch (err: any) {
      console.error('Erreur export global Excel', err)
      feedback.toast.error(err?.message || 'Erreur lors de l\'export global')
    } finally {
      setExportingAll(false)
    }
  }

  function handleOpen(pdfPath: string | null) {
    if (pdfPath) {
      window.api.openFile(pdfPath).catch((err: any) => {
        console.error('Erreur ouverture fichier', err)
      })
    }
  }

  async function handleStatusChange(id: string, newStatus: PurchaseOrderStatus) {
    try {
      await window.api.updatePurchaseOrderStatus(id, newStatus)
      setOrders(prev => prev.map(o => o.id === id ? { ...o, status: newStatus } : o))
    } catch (err) {
      console.error('Erreur mise à jour statut', err)
    }
  }

  function handleReceiveOrder(order: PurchaseOrder) {
    if (!order.items || order.items.length === 0) return
    const orderNum = order.id.slice(0, 8).toUpperCase()
    feedback.confirm({
      title: 'Confirmer la réception de la commande ?',
      message: `Cette action réceptionnera ${order.items.length} produit(s) pour "${order.supplierName}". Les stocks seront immédiatement crédités.`,
      itemName: `Bon #${orderNum}`,
      confirmLabel: 'Réceptionner le bon',
      variant: 'default',
      onConfirm: async () => {
        setReceivingId(order.id)
        try {
          const fallbackWarehouseId = order.warehouseId || workspaceId || (warehouses[0]?.id)
          for (const item of order.items) {
            const wid = item.warehouseId || fallbackWarehouseId
            if (item.productId && wid) {
              await window.api.restockProduct({
                productId: item.productId,
                warehouseId: wid,
                quantity: item.quantity,
                unitPrice: item.unitPrice || 0,
                considerAsPurchase: true
              })
            }
          }

          await window.api.updatePurchaseOrderStatus(order.id, 'RECU')
          setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: 'RECU' as PurchaseOrderStatus } : o))
          feedback.toast.success('Bon réceptionné avec succès', `Les stocks de ${order.items.length} article(s) ont été mis à jour.`)
        } catch (err: any) {
          console.error('Erreur réception bon de commande', err)
          feedback.toast.error(err?.message || 'Erreur lors de la réception', 'Erreur')
        } finally {
          setReceivingId(null)
        }
      }
    })
  }

  function handleDelete(id: string, orderNumber?: string) {
    const label = orderNumber || id.slice(0, 8).toUpperCase()
    feedback.confirm({
      title: 'Supprimer ce bon de commande ?',
      message: 'Cette action supprimera définitivement le bon de commande de votre historique.',
      itemName: `Bon #${label}`,
      confirmLabel: 'Supprimer',
      variant: 'destructive',
      onConfirm: async () => {
        try {
          await window.api.deletePurchaseOrder(id)
          setOrders(prev => prev.filter(o => o.id !== id))
          feedback.toast.success(`Bon #${label} supprimé`)
        } catch (err: any) {
          console.error('Erreur suppression', err)
          feedback.toast.error(err?.message || 'Erreur lors de la suppression')
        }
      }
    })
  }

  function toggleExpand(id: string) {
    setExpandedOrders(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShoppingBag className="h-6 w-6 text-primary" /> Bons de commande
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Gestion du cycle d'achat et approvisionnement automatisé — {orders.length} bon(s) généré(s)
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            onClick={handleAnalyzeStock}
            disabled={analyzing || loading}
            className="gap-2 bg-gradient-to-r from-primary to-primary/90 shadow hover:shadow-md transition-all"
          >
            <Sparkles className={`h-4 w-4 ${analyzing ? 'animate-spin' : ''}`} />
            {analyzing ? 'Analyse en cours...' : 'Analyser le stock & Générer'}
          </Button>

          {orders.length > 0 && (
            <Button
              onClick={handleExportAllExcel}
              disabled={exportingAll || loading}
              variant="outline"
              className="gap-2 border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
              title="Exporter tous les bons de commande dans un fichier Excel consolidé"
            >
              <FileSpreadsheet className={`h-4 w-4 text-emerald-600 ${exportingAll ? 'animate-spin' : ''}`} />
              {exportingAll ? 'Exportation...' : 'Exporter Tout (Excel)'}
            </Button>
          )}

          <Button onClick={loadOrders} disabled={loading} variant="outline" className="gap-2">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Actualiser
          </Button>
        </div>
      </div>

      {/* Emplacement des exports (Bureau / bons-de-commande) */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-4 py-3 rounded-xl border bg-card/80 shadow-xs text-xs text-muted-foreground">
        <div className="flex items-center gap-2.5">
          <FolderOpen className="h-4 w-4 text-primary shrink-0" />
          <span>
            <strong className="text-foreground font-semibold">Emplacement d'exportation :</strong> Les bons de commande (PDF & Excel) sont enregistrés sur votre <strong className="text-foreground">Bureau</strong> dans le dossier <code className="px-1.5 py-0.5 rounded bg-muted font-mono text-[11px] text-primary">bons-de-commande</code>.
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs gap-1.5 shrink-0 hover:bg-muted"
          onClick={handleOpenOrdersDir}
        >
          <ExternalLink className="h-3.5 w-3.5 text-primary" /> Ouvrir le dossier des bons
        </Button>
      </div>

      {/* Alerte d'analyse */}
      {analysisAlert && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between gap-3 text-sm animate-fade-in ${
            analysisAlert.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800'
              : 'bg-rose-50 text-rose-900 border-rose-200 dark:bg-rose-950/30 dark:text-rose-300 dark:border-rose-800'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {analysisAlert.type === 'success' ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : (
              <XCircle className="h-5 w-5 text-rose-600 dark:text-rose-400 shrink-0" />
            )}
            <span>{analysisAlert.message}</span>
          </div>
          <button
            onClick={() => setAnalysisAlert(null)}
            className="text-xs font-semibold underline opacity-70 hover:opacity-100"
          >
            Fermer
          </button>
        </div>
      )}

      {/* Modal PDF & Détail de commande */}
      {previewPdf && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in"
          onClick={() => { setPreviewPdf(null); setSelectedOrderForModal(null) }}
        >
          <div
            className="relative w-full max-w-5xl h-[88vh] bg-card rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-border"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-3.5 border-b bg-muted/40">
              <div className="flex items-center gap-2 font-semibold text-sm">
                <FileText className="h-4 w-4 text-primary" />
                <span>Bon de commande : {previewFilename}</span>
              </div>
              <div className="flex items-center gap-2">
                {selectedOrderForModal?.pdfPath && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 h-8 text-xs"
                    onClick={() => handleOpen(selectedOrderForModal.pdfPath)}
                  >
                    <ExternalLink className="h-3.5 w-3.5 text-primary" /> Ouvrir avec lecteur PDF
                  </Button>
                )}
                <a
                  href={previewPdf}
                  download={previewFilename}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border bg-background hover:bg-muted transition-colors"
                >
                  <Download className="h-3.5 w-3.5" /> Télécharger
                </a>
                <button
                  onClick={() => { setPreviewPdf(null); setSelectedOrderForModal(null) }}
                  className="h-8 w-8 rounded-lg flex items-center justify-center bg-muted hover:bg-destructive hover:text-destructive-foreground transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="flex-1 bg-muted/20 p-2 overflow-hidden flex flex-col">
              <object
                data={previewPdf}
                type="application/pdf"
                className="w-full h-full rounded-xl border border-border/50 bg-white"
              >
                <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                  <p className="text-muted-foreground mb-4">L'aperçu intégré n'a pas pu être chargé directement.</p>
                  {selectedOrderForModal?.pdfPath && (
                    <Button onClick={() => handleOpen(selectedOrderForModal.pdfPath)} className="gap-2">
                      <ExternalLink className="h-4 w-4" /> Ouvrir dans l'application PDF
                    </Button>
                  )}
                </div>
              </object>
            </div>
          </div>
        </div>
      )}

      {/* Contenu */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground gap-3">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm">Chargement des bons de commande...</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed py-20 text-center bg-card/50">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-4">
            <ShoppingBag className="h-8 w-8" />
          </div>
          <p className="text-lg font-bold">Aucun bon de commande pour le moment</p>
          <p className="mt-1 text-sm text-muted-foreground max-w-md">
            Cliquez sur <strong>"Analyser le stock & Générer"</strong> pour scanner automatiquement les ruptures et seuils critiques par fournisseur.
          </p>
          <Button
            onClick={handleAnalyzeStock}
            disabled={analyzing}
            className="mt-5 gap-2"
          >
            <Sparkles className="h-4 w-4" /> Lancer l'analyse du stock
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const isExpanded = expandedOrders.has(order.id)
            const itemCount = order.items?.length ?? 0
            const totalQty = order.items?.reduce((s, i) => s + i.quantity, 0) ?? 0
            const isReceiving = receivingId === order.id

            return (
              <div key={order.id} className="rounded-2xl border bg-card shadow-sm hover:shadow-md transition-all overflow-hidden">
                {/* ── En-tête du bon ─────────────────────────────── */}
                <div
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-6 py-4 cursor-pointer hover:bg-muted/20 transition-colors"
                  onClick={() => toggleExpand(order.id)}
                >
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="font-bold text-base text-foreground tracking-tight">
                        {order.supplierName}
                      </span>
                      <span className={`inline-flex items-center rounded-full border px-3 py-0.5 text-xs font-semibold ${STATUS_COLORS[order.status] || STATUS_COLORS.EN_ATTENTE}`}>
                        {STATUS_LABELS[order.status] || order.status}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1 font-medium">
                        <Hash className="h-3.5 w-3.5 text-primary" />{itemCount} article{itemCount > 1 ? 's' : ''} · {totalQty} unité{totalQty > 1 ? 's' : ''}
                      </span>
                      {order.totalAmount > 0 && (
                        <span className="font-bold text-foreground bg-primary/10 text-primary px-2 py-0.5 rounded">
                          {order.totalAmount.toLocaleString('fr-FR')} FCFA
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <CalendarDays className="h-3.5 w-3.5 text-muted-foreground/70" />
                        {new Date(order.createdAt).toLocaleString('fr-FR')}
                      </span>
                      {order.warehouse && (
                        <span className="flex items-center gap-1">
                          <Building2 className="h-3.5 w-3.5 text-muted-foreground/70" />{order.warehouse.name}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions Rapides & Workflow ERP */}
                  <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0" onClick={(e) => e.stopPropagation()}>
                    {/* Workflow status */}
                    {order.status === 'EN_ATTENTE' && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5 h-8 text-blue-600 border-blue-200 hover:bg-blue-50 dark:text-blue-400 dark:border-blue-800 dark:hover:bg-blue-950/40 text-xs"
                        onClick={() => handleStatusChange(order.id, 'CONFIRME')}
                      >
                        <Clock className="h-3.5 w-3.5" /> Confirmer
                      </Button>
                    )}

                    {order.status !== 'RECU' && (
                      <Button
                        size="sm"
                        className="gap-1.5 h-8 bg-emerald-600 hover:bg-emerald-700 text-white text-xs shadow-sm"
                        disabled={isReceiving}
                        onClick={() => handleReceiveOrder(order)}
                        title="Réceptionner le bon et incrémenter le stock"
                      >
                        <ArrowDownToLine className={`h-3.5 w-3.5 ${isReceiving ? 'animate-bounce' : ''}`} />
                        {isReceiving ? 'Réception...' : 'Réceptionner Stock'}
                      </Button>
                    )}

                    {/* Export Excel (.xlsx) */}
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 h-8 text-xs border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
                      disabled={exportingId === order.id}
                      onClick={() => handleExportExcel(order)}
                      title="Générer et télécharger ce bon de commande au format Excel (.xlsx)"
                    >
                      <FileSpreadsheet className={`h-3.5 w-3.5 text-emerald-600 ${exportingId === order.id ? 'animate-spin' : ''}`} />
                      {exportingId === order.id ? 'Génération...' : 'Excel'}
                    </Button>

                    {/* PDF Tabulaire */}
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 h-8 text-xs"
                      onClick={() => handlePreview(order)}
                      title="Prévisualiser le bon de commande en PDF tabulaire professionnel"
                    >
                      <Eye className="h-3.5 w-3.5 text-primary" /> PDF
                    </Button>

                    {order.pdfPath && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5 h-8 text-xs"
                        onClick={() => handlePreview(order)}
                        title="Ouvrir le bon de commande en format tabulaire"
                      >
                        <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" /> Ouvrir
                      </Button>
                    )}

                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1 h-8 w-8 p-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => handleDelete(order.id, order.id.slice(0, 8))}
                      title="Supprimer ce bon"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>

                    <div className="ml-1 text-muted-foreground">
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </div>
                  </div>
                </div>

                {/* ── Tableau des articles ────────────────────────── */}
                {isExpanded && itemCount > 0 && (
                  <div className="border-t bg-muted/5">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-muted/40 text-xs text-muted-foreground uppercase tracking-wider border-b">
                            <th className="px-5 py-3 text-left font-semibold">#</th>
                            <th className="px-5 py-3 text-left font-semibold">Référence article</th>
                            <th className="px-5 py-3 text-left font-semibold">Code-barres</th>
                            <th className="px-5 py-3 text-center font-semibold">Stock actuel</th>
                            <th className="px-5 py-3 text-center font-semibold">Seuil critique</th>
                            <th className="px-5 py-3 text-center font-semibold">Qté commandée</th>
                            <th className="px-5 py-3 text-right font-semibold">Prix unitaire</th>
                            <th className="px-5 py-3 text-right font-semibold">Sous-total</th>
                            <th className="px-5 py-3 text-left font-semibold">Boutique</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {order.items!.map((item, idx) => {
                            const subTotal = item.quantity * (item.unitPrice || 0)
                            const isCritical = (item.currentStock ?? 0) <= (item.alertLimit ?? 0)
                            return (
                              <tr
                                key={item.id}
                                className={`transition-colors hover:bg-muted/30 ${idx % 2 === 0 ? '' : 'bg-muted/10'}`}
                              >
                                <td className="px-5 py-3 text-xs text-muted-foreground font-mono">{idx + 1}</td>
                                <td className="px-5 py-3">
                                  <div className="flex items-center gap-2">
                                    <Package className="h-4 w-4 text-muted-foreground/60 shrink-0" />
                                    <span className="font-semibold text-foreground truncate max-w-[220px]">
                                      {item.productName}
                                    </span>
                                  </div>
                                </td>
                                <td className="px-5 py-3 font-mono text-xs text-muted-foreground">
                                  {item.productBarcode || '—'}
                                </td>
                                <td className="px-5 py-3 text-center">
                                  <span className={`font-bold text-sm ${isCritical ? 'text-rose-600 dark:text-rose-400' : 'text-foreground'}`}>
                                    {item.currentStock ?? 0}
                                  </span>
                                </td>
                                <td className="px-5 py-3 text-center text-sm text-muted-foreground">
                                  {item.alertLimit ?? 0}
                                </td>
                                <td className="px-5 py-3 text-center">
                                  <span className="inline-flex items-center justify-center rounded-lg bg-primary/15 text-primary font-bold px-3 py-1 text-sm">
                                    +{item.quantity}
                                  </span>
                                </td>
                                <td className="px-5 py-3 text-right text-sm">
                                  {item.unitPrice > 0 ? (
                                    <span>
                                      {item.unitPrice.toLocaleString('fr-FR')}{' '}
                                      <span className="text-[11px] text-muted-foreground">FCFA</span>
                                    </span>
                                  ) : (
                                    <span className="text-muted-foreground">—</span>
                                  )}
                                </td>
                                <td className="px-5 py-3 text-right font-bold text-sm">
                                  {subTotal > 0 ? (
                                    <span>
                                      {subTotal.toLocaleString('fr-FR')}{' '}
                                      <span className="text-[11px] text-muted-foreground font-normal">FCFA</span>
                                    </span>
                                  ) : (
                                    <span className="text-muted-foreground font-normal">—</span>
                                  )}
                                </td>
                                <td className="px-5 py-3 text-xs text-muted-foreground font-medium">
                                  {item.warehouseName || order.warehouse?.name || '—'}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>

                        {/* Totaux */}
                        {order.totalAmount > 0 && (
                          <tfoot>
                            <tr className="bg-muted/40 border-t-2 border-border font-semibold">
                              <td colSpan={7} className="px-5 py-3 text-sm text-right text-muted-foreground">
                                Total commande ({totalQty} unité{totalQty > 1 ? 's' : ''})
                              </td>
                              <td className="px-5 py-3 text-right font-bold text-base text-primary">
                                {order.totalAmount.toLocaleString('fr-FR')} <span className="text-xs font-semibold">FCFA</span>
                              </td>
                              <td className="px-5 py-3" />
                            </tr>
                          </tfoot>
                        )}
                      </table>
                    </div>
                  </div>
                )}

                {isExpanded && itemCount === 0 && (
                  <div className="border-t px-5 py-8 text-center text-sm text-muted-foreground">
                    <FileText className="h-6 w-6 mx-auto mb-2 opacity-30" />
                    Aucun article détaillé dans ce bon de commande
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
