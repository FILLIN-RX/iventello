import { useState, useEffect } from 'react'
import {
  Package,
  Barcode,
  Store,
  Boxes,
  TrendingUp,
  Clock,
  ShoppingCart,
  ArrowRightLeft,
  Truck,
  DollarSign,
  AlertTriangle,
  FileText,
  Calendar,
  Layers,
  ChevronRight,
  ShieldCheck,
  User,
  X,
  Loader2,
  Tag,
  ArrowRight,
  ArrowLeft,
  Check,
  RotateCw
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from './ui/dialog'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { formatCurrency, getColor } from '@/lib/utils'
import { toFileUrl } from '../../../shared/imageUtils'
import { feedback } from '../stores/feedbackStore'
import { FactureDetailModal } from './FactureDetailModal'
import type { ProductWithRelations, ProductDetailsResult, Category, Warehouse, SaleWithClient } from '../../../shared/types'

interface ProductDetailModalProps {
  productId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onEditProduct?: (product: ProductWithRelations) => void
  onProductUpdated?: () => void
}

export function ProductDetailModal({
  productId,
  open,
  onOpenChange,
  onEditProduct,
  onProductUpdated
}: ProductDetailModalProps) {
  const [data, setData] = useState<ProductDetailsResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'stocks' | 'sales' | 'movements' | 'reservations'>('stocks')
  const [selectedSaleForModal, setSelectedSaleForModal] = useState<SaleWithClient | null>(null)
  const [unblockingSaleId, setUnblockingSaleId] = useState<string | null>(null)

  // Catégories disponibles
  const [categories, setCategories] = useState<Category[]>([])
  const [changingCategory, setChangingCategory] = useState(false)

  // Transferts Magasin ⇄ Boutique
  const [transferType, setTransferType] = useState<'to_magasin' | 'to_boutique' | null>(null)
  const [transferWarehouseId, setTransferWarehouseId] = useState<string>('')
  const [transferQuantity, setTransferQuantity] = useState<number>(1)
  const [executingTransfer, setExecutingTransfer] = useState(false)
  const [transferFeedback, setTransferFeedback] = useState<string | null>(null)

  // Chargement des catégories
  useEffect(() => {
    if (open) {
      window.api.getCategories().then(setCategories).catch(() => {})
    }
  }, [open])

  // Chargement des données détaillées
  function loadDetails() {
    if (!productId) return
    setLoading(true)
    window.api
      .getProductDetails(productId)
      .then((res) => {
        setData(res)
        if (res?.product.stocks && res.product.stocks.length > 0 && !transferWarehouseId) {
          setTransferWarehouseId(res.product.stocks[0].warehouse.id)
        }
      })
      .catch((err) => {
        console.error('Erreur chargement détails produit:', err)
      })
      .finally(() => {
        setLoading(false)
      })
  }

  useEffect(() => {
    if (!open || !productId) {
      setData(null)
      setTransferType(null)
      setTransferFeedback(null)
      return
    }
    loadDetails()
  }, [open, productId])

  if (!open) return null

  const product = data?.product
  const recentSales = data?.recentSales ?? []
  const stockMovements = data?.stockMovements ?? []
  const stats = data?.stats ?? {
    totalUnitsSold: 0,
    totalRevenue: 0,
    totalRestocked: 0,
    marginPerUnit: 0,
    totalProfitEstimated: 0
  }

  const imgUrl = product?.imageUrl ? toFileUrl(product.imageUrl) : null

  // Totaux de stock
  const totalBoutique = product?.stocks?.reduce((s, st) => s + (st.quantity ?? 0), 0) ?? 0
  const totalMagasin = product?.stocks?.reduce((s, st) => s + (st.quantityMagasin ?? 0), 0) ?? 0
  const totalReserve = product?.stocks?.reduce((s, st) => s + (st.quantityReservee ?? 0), 0) ?? 0

  // Réservations actives (ventes avec avance non encore soldées ou en attente)
  const activeReservations = recentSales.filter((item) => {
    const s = item.sale
    if (!s) return false
    const avance = (s as any).montantAvance as number | null
    const isAvance = avance != null && avance < s.finalTotal
    return s.status === 'EN_ATTENTE' || (s.status === 'VALIDE' && isAvance)
  })

  // Déblocage / Annulation d'une réservation pour restituer le stock
  async function handleUnblockReservation(saleId: string) {
    feedback.confirm({
      title: 'Débloquer et restituer le stock ?',
      message: 'Cette action va annuler la réservation/avance et réintégrer immédiatement les articles dans le stock disponible de la boutique.',
      itemName: `Facture #${saleId.slice(0, 8)}`,
      confirmLabel: 'Débloquer le stock',
      variant: 'destructive',
      onConfirm: async () => {
        setUnblockingSaleId(saleId)
        try {
          await window.api.cancelSale(saleId)
          feedback.toast.success('Réservation annulée', 'Le stock a été débloqué et réintégré avec succès.')
          loadDetails()
          if (onProductUpdated) onProductUpdated()
        } catch (err: any) {
          feedback.toast.error(err?.message || 'Erreur lors du déblocage')
        } finally {
          setUnblockingSaleId(null)
        }
      }
    })
  }

  // Changement de catégorie direct sur la fiche produit
  async function handleCategoryChange(newCatId: string) {
    if (!product) return
    setChangingCategory(true)
    try {
      const catVal = newCatId === '__none__' ? null : newCatId
      await window.api.updateProduct(product.id, { categoryId: catVal })
      setTransferFeedback('Catégorie mise à jour')
      feedback.toast.success('Catégorie mise à jour avec succès')
      setTimeout(() => setTransferFeedback(null), 2500)
      loadDetails()
      if (onProductUpdated) onProductUpdated()
    } catch (err: any) {
      feedback.toast.error(err?.message || 'Erreur lors de la modification de la catégorie', 'Erreur')
    } finally {
      setChangingCategory(false)
    }
  }

  // Exécution du transfert Magasin ⇄ Boutique
  async function handleExecuteMagasinTransfer() {
    if (!product || !transferWarehouseId || transferQuantity <= 0) return
    setExecutingTransfer(true)
    try {
      if (transferType === 'to_magasin') {
        await window.api.sendToMagasin({
          productId: product.id,
          warehouseId: transferWarehouseId,
          quantity: transferQuantity
        })
        const msg = `+${transferQuantity} unité(s) transférées vers le Magasin Arrière`
        setTransferFeedback(msg)
        feedback.toast.success('Transfert effectué', msg)
      } else if (transferType === 'to_boutique') {
        await window.api.transferMagasinToBoutique({
          productId: product.id,
          warehouseId: transferWarehouseId,
          quantity: transferQuantity
        })
        const msg = `+${transferQuantity} unité(s) transférées vers la Boutique`
        setTransferFeedback(msg)
        feedback.toast.success('Transfert effectué', msg)
      }
      setTimeout(() => setTransferFeedback(null), 3000)
      setTransferType(null)
      loadDetails()
      if (onProductUpdated) onProductUpdated()
    } catch (err: any) {
      feedback.toast.error(err?.message || 'Erreur lors du transfert', 'Erreur')
    } finally {
      setExecutingTransfer(false)
    }
  }

  // Active custom fields
  const customFields: { label: string; value: string }[] = []
  if (product) {
    for (let i = 1; i <= 10; i++) {
      const l = (product as any)[`field${i}_label`]
      const v = (product as any)[`field${i}_value`]
      if (l && v) customFields.push({ label: l, value: v })
    }
  }

  const selectedStockInfo = product?.stocks?.find((s) => s.warehouse.id === transferWarehouseId)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden rounded-2xl">
        {/* En-tête de la fiche produit */}
        <div className="bg-muted/30 border-b p-6 pb-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-xl border bg-card flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
                {imgUrl ? (
                  <img src={imgUrl} alt={product?.name} className="h-full w-full object-cover" />
                ) : (
                  <Package className="h-8 w-8 text-muted-foreground/40" />
                )}
              </div>

              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <DialogTitle className="text-xl font-bold tracking-tight text-foreground">
                    {product?.name || 'Fiche Produit'}
                  </DialogTitle>
                  <DialogDescription className="sr-only">
                    Fiche détaillée du produit {product?.name || ''}
                  </DialogDescription>

                  {/* Sélecteur de Catégorie Direct sur la fiche */}
                  <div className="flex items-center gap-1.5 bg-background border rounded-lg px-2 py-0.5 shadow-2xs">
                    <Tag className="h-3 w-3 text-muted-foreground" />
                    <select
                      value={product?.categoryId || '__none__'}
                      onChange={(e) => handleCategoryChange(e.target.value)}
                      disabled={changingCategory}
                      className="text-xs bg-transparent border-0 font-medium focus:outline-none cursor-pointer pr-1"
                      title="Changer la catégorie du produit"
                    >
                      <option value="__none__">Sans catégorie</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground font-mono flex-wrap">
                  <span className="flex items-center gap-1">
                    <Barcode className="h-3.5 w-3.5" />
                    {product?.barcode || 'Sans code-barres'}
                  </span>
                  {product?.supplier && (
                    <span className="flex items-center gap-1 font-sans">
                      <Truck className="h-3.5 w-3.5" />
                      {product.supplier.name}
                    </span>
                  )}
                  {transferFeedback && (
                    <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-sans font-semibold animate-fade-in bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md">
                      <Check className="h-3.5 w-3.5" /> {transferFeedback}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 h-9"
                onClick={() => {
                  setTransferType('to_magasin')
                  setTransferQuantity(1)
                }}
                title="Déplacer du stock Boutique vers le Magasin Arrière"
              >
                <ArrowRight className="h-3.5 w-3.5 text-indigo-500" />
                <span>→ Magasin</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 h-9"
                onClick={() => {
                  setTransferType('to_boutique')
                  setTransferQuantity(1)
                }}
                title="Déplacer du stock Magasin Arrière vers la Boutique"
              >
                <ArrowLeft className="h-3.5 w-3.5 text-emerald-500" />
                <span>← Boutique</span>
              </Button>
              {onEditProduct && product && (
                <Button
                  variant="secondary"
                  size="sm"
                  className="gap-1.5 h-9"
                  onClick={() => {
                    onOpenChange(false)
                    onEditProduct(product)
                  }}
                >
                  Modifier
                </Button>
              )}
            </div>
          </div>

          {/* Cartes KPI rapides */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
            <div className="rounded-xl border bg-card/70 p-3 shadow-2xs">
              <p className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                <Store className="h-3.5 w-3.5 text-emerald-500" /> Stock Boutique
              </p>
              <p className="text-lg font-bold text-foreground mt-0.5">
                {totalBoutique} <span className="text-xs font-normal text-muted-foreground">unités</span>
              </p>
            </div>

            <div className="rounded-xl border bg-card/70 p-3 shadow-2xs">
              <p className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                <Boxes className="h-3.5 w-3.5 text-indigo-500" /> Magasin Arrière (Réserve)
              </p>
              <p className="text-lg font-bold text-foreground mt-0.5">
                {totalMagasin} <span className="text-xs font-normal text-muted-foreground">unités</span>
              </p>
            </div>

            <div className="rounded-xl border bg-card/70 p-3 shadow-2xs">
              <p className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                <ShoppingCart className="h-3.5 w-3.5 text-primary" /> Ventes Totales
              </p>
              <p className="text-lg font-bold text-foreground mt-0.5">
                {stats.totalUnitsSold} <span className="text-xs font-normal text-muted-foreground">unités</span>
              </p>
            </div>

            <div className="rounded-xl border bg-card/70 p-3 shadow-2xs">
              <p className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                <DollarSign className="h-3.5 w-3.5 text-amber-500" /> Chiffre d'Affaires
              </p>
              <p className="text-lg font-bold text-primary mt-0.5">
                {formatCurrency(stats.totalRevenue)}
              </p>
            </div>
          </div>

          {/* Bandeau de Transfert Magasin ⇄ Boutique si activé */}
          {transferType && (
            <div className="mt-4 rounded-xl border border-primary/30 bg-primary/5 p-3.5 animate-fade-in space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-primary flex items-center gap-1.5">
                  <ArrowRightLeft className="h-4 w-4" />
                  {transferType === 'to_magasin'
                    ? 'Transfert : Boutique (Rayon) ➔ Magasin Arrière (Réserve)'
                    : 'Transfert : Magasin Arrière (Réserve) ➔ Boutique (Rayon)'}
                </p>
                <button
                  onClick={() => setTransferType(null)}
                  className="text-muted-foreground hover:text-foreground text-xs"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                {product?.stocks && product.stocks.length > 1 && (
                  <div className="space-y-1">
                    <Label className="text-[11px]">Entrepôt concerné</Label>
                    <select
                      value={transferWarehouseId}
                      onChange={(e) => setTransferWarehouseId(e.target.value)}
                      className="w-full text-xs h-9 rounded-lg border bg-background px-2.5"
                    >
                      {product.stocks.map((s) => (
                        <option key={s.warehouse.id} value={s.warehouse.id}>
                          {s.warehouse.name} (Boutique: {s.quantity} | Magasin: {s.quantityMagasin})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <Label className="text-[11px]">Quantité à transférer</Label>
                    <span className="text-muted-foreground">
                      Dispo :{' '}
                      <strong>
                        {transferType === 'to_magasin'
                          ? selectedStockInfo?.quantity ?? totalBoutique
                          : selectedStockInfo?.quantityMagasin ?? totalMagasin}
                      </strong>
                    </span>
                  </div>
                  <Input
                    type="number"
                    min={1}
                    max={
                      transferType === 'to_magasin'
                        ? selectedStockInfo?.quantity ?? totalBoutique
                        : selectedStockInfo?.quantityMagasin ?? totalMagasin
                    }
                    value={transferQuantity}
                    onChange={(e) => setTransferQuantity(Math.max(1, Number(e.target.value) || 1))}
                    className="h-9 text-xs"
                  />
                </div>

                <Button
                  onClick={handleExecuteMagasinTransfer}
                  disabled={executingTransfer || transferQuantity <= 0}
                  className="h-9 gap-1.5 text-xs font-semibold shadow-xs"
                >
                  {executingTransfer ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Transfert...
                    </>
                  ) : (
                    <>
                      <ArrowRightLeft className="h-3.5 w-3.5" />
                      Valider le transfert ({transferQuantity})
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Onglets de navigation interne */}
        <div className="flex items-center gap-1.5 border-b px-6 py-2.5 bg-muted/20">
          <button
            onClick={() => setActiveTab('stocks')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-150 ${
              activeTab === 'stocks'
                ? 'bg-primary/10 text-primary font-bold shadow-2xs'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
          >
            <Layers className={`h-4 w-4 transition-colors ${activeTab === 'stocks' ? 'text-primary' : 'text-muted-foreground'}`} />
            <span>Stocks & Caractéristiques</span>
          </button>
          <button
            onClick={() => setActiveTab('sales')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-150 ${
              activeTab === 'sales'
                ? 'bg-primary/10 text-primary font-bold shadow-2xs'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
          >
            <ShoppingCart className={`h-4 w-4 transition-colors ${activeTab === 'sales' ? 'text-primary' : 'text-muted-foreground'}`} />
            <span>Ventes Récentes</span>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium transition-colors ${
                activeTab === 'sales'
                  ? 'bg-primary/20 text-primary'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {recentSales.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('movements')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-150 ${
              activeTab === 'movements'
                ? 'bg-primary/10 text-primary font-bold shadow-2xs'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
          >
            <ArrowRightLeft className={`h-4 w-4 transition-colors ${activeTab === 'movements' ? 'text-primary' : 'text-muted-foreground'}`} />
            <span>Mouvements & Historique</span>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium transition-colors ${
                activeTab === 'movements'
                  ? 'bg-primary/20 text-primary'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {stockMovements.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('reservations')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-150 ${
              activeTab === 'reservations'
                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold shadow-2xs'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
          >
            <Clock className={`h-4 w-4 transition-colors ${activeTab === 'reservations' ? 'text-amber-500' : 'text-muted-foreground'}`} />
            <span>Réservations & Avances</span>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium transition-colors ${
                activeTab === 'reservations'
                  ? 'bg-amber-500 text-white font-bold'
                  : activeReservations.length > 0
                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 font-bold'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {activeReservations.reduce((sum, r) => sum + r.quantity, 0)}
            </span>
          </button>
        </div>

        {/* Contenu de l'onglet actif */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 max-h-[50vh]">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="h-7 w-7 animate-spin text-primary" />
              <p className="text-xs text-muted-foreground mt-2">Chargement de la fiche détaillée...</p>
            </div>
          ) : activeTab === 'stocks' ? (
            /* ─────────────────────────────────────────────────────────────────── */
            /* ONGLET 1 : STOCKS & CARACTÉRISTIQUES                                */
            /* ─────────────────────────────────────────────────────────────────── */
            <div className="space-y-6">
              {/* Tableau répartition par entrepôt avec actions de transfert directes */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Répartition des Stocks par Entrepôt & Magasin
                  </h3>
                </div>
                <div className="rounded-xl border overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-muted/40 border-b text-muted-foreground">
                        <th className="px-4 py-2.5 text-left font-semibold">Entrepôt</th>
                        <th className="px-4 py-2.5 text-center font-semibold text-emerald-600 dark:text-emerald-400">Stock Boutique</th>
                        <th className="px-4 py-2.5 text-center font-semibold text-indigo-600 dark:text-indigo-400">Magasin Réserve</th>
                        <th className="px-4 py-2.5 text-center font-semibold text-amber-600 dark:text-amber-400">Réservé</th>
                        <th className="px-4 py-2.5 text-center font-semibold">Seuil d'alerte</th>
                        <th className="px-4 py-2.5 text-right font-semibold">Transferts Magasin</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {product?.stocks && product.stocks.length > 0 ? (
                        product.stocks.map((s) => (
                          <tr key={s.id} className="hover:bg-muted/20">
                            <td className="px-4 py-2.5 font-semibold text-foreground">
                              {s.warehouse?.name || 'Entrepôt'}
                            </td>
                            <td className="px-4 py-2.5 text-center font-bold text-emerald-600 dark:text-emerald-400">
                              {s.quantity}
                            </td>
                            <td className="px-4 py-2.5 text-center font-bold text-indigo-600 dark:text-indigo-400">
                              {s.quantityMagasin}
                            </td>
                            <td className="px-4 py-2.5 text-center text-amber-600 dark:text-amber-400 font-medium">
                              {s.quantityReservee}
                            </td>
                            <td className="px-4 py-2.5 text-center text-muted-foreground">
                              {s.alertLimit}
                            </td>
                            <td className="px-4 py-2.5 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-6 px-2 text-[11px] gap-1 text-indigo-600 border-indigo-200 hover:bg-indigo-50 dark:border-indigo-900 dark:hover:bg-indigo-950/30"
                                  onClick={() => {
                                    setTransferWarehouseId(s.warehouse.id)
                                    setTransferType('to_magasin')
                                  }}
                                  disabled={s.quantity <= 0}
                                  title="Envoyer du stock boutique vers le magasin arrière"
                                >
                                  → Magasin
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-6 px-2 text-[11px] gap-1 text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:border-emerald-900 dark:hover:bg-emerald-950/30"
                                  onClick={() => {
                                    setTransferWarehouseId(s.warehouse.id)
                                    setTransferType('to_boutique')
                                  }}
                                  disabled={s.quantityMagasin <= 0}
                                  title="Transférer du magasin arrière vers la boutique"
                                >
                                  ← Boutique
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">
                            Aucun stock enregistré pour ce produit dans les entrepôts.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Tarification & Rentabilité */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                  Structure des Prix & Rentabilité
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="rounded-xl border p-3.5 bg-muted/20">
                    <p className="text-[11px] text-muted-foreground">Prix d'Achat (CMUP)</p>
                    <p className="text-base font-bold text-foreground mt-0.5">
                      {product?.basePrice ? formatCurrency(product.basePrice) : '0 FCFA'}
                    </p>
                  </div>
                  <div className="rounded-xl border p-3.5 bg-muted/20">
                    <p className="text-[11px] text-muted-foreground">Prix de Vente Unitaire</p>
                    <p className="text-base font-bold text-primary mt-0.5">
                      {product ? formatCurrency(product.sellingPrice) : '0 FCFA'}
                    </p>
                  </div>
                  <div className="rounded-xl border p-3.5 bg-muted/20">
                    <p className="text-[11px] text-muted-foreground">Marge Brute par Unité</p>
                    <p className="text-base font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                      {product ? formatCurrency(product.sellingPrice - product.basePrice) : '0 FCFA'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Champs personnalisés si présents */}
              {customFields.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                    Informations Complémentaires
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {customFields.map((cf, idx) => (
                      <div key={idx} className="rounded-lg border bg-card p-2.5 text-xs">
                        <p className="text-muted-foreground text-[10px]">{cf.label}</p>
                        <p className="font-semibold text-foreground mt-0.5">{cf.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : activeTab === 'sales' ? (
            /* ─────────────────────────────────────────────────────────────────── */
            /* ONGLET 2 : VENTES RÉCENTES                                          */
            /* ─────────────────────────────────────────────────────────────────── */
            <div>
              {recentSales.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <ShoppingCart className="h-10 w-10 text-muted-foreground/30 mb-2" />
                  <p className="text-sm font-semibold text-muted-foreground">Aucune vente enregistrée pour ce produit.</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Les ventes effectuées en caisse apparaîtront ici automatiquement.</p>
                </div>
              ) : (
                <div className="rounded-xl border overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-muted/40 border-b text-muted-foreground">
                        <th className="px-4 py-2.5 text-left font-semibold">Date</th>
                        <th className="px-4 py-2.5 text-left font-semibold">N° Facture</th>
                        <th className="px-4 py-2.5 text-left font-semibold">Client</th>
                        <th className="px-4 py-2.5 text-center font-semibold">Quantité</th>
                        <th className="px-4 py-2.5 text-right font-semibold">Prix Unitaire</th>
                        <th className="px-4 py-2.5 text-right font-semibold">Total</th>
                        <th className="px-4 py-2.5 text-center font-semibold">Statut</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {recentSales.map((item) => {
                        const sale = item.sale
                        return (
                          <tr
                            key={item.id}
                            className="hover:bg-muted/30 cursor-pointer transition-colors group"
                            onClick={() => sale && setSelectedSaleForModal(sale as any)}
                            title="Cliquer pour afficher la facture complète"
                          >
                            <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap group-hover:text-primary">
                              {sale?.createdAt
                                ? new Date(sale.createdAt).toLocaleDateString('fr-FR', {
                                    day: 'numeric',
                                    month: 'short',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })
                                : '—'}
                            </td>
                            <td className="px-4 py-2.5 font-mono font-medium text-foreground">
                              {sale?.invoiceNumber || '—'}
                            </td>
                            <td className="px-4 py-2.5 text-foreground">
                              {sale?.client?.name || 'Client anonyme'}
                            </td>
                            <td className="px-4 py-2.5 text-center font-bold text-foreground">
                              {item.quantity}
                            </td>
                            <td className="px-4 py-2.5 text-right text-muted-foreground">
                              {formatCurrency(item.unitPrice)}
                            </td>
                            <td className="px-4 py-2.5 text-right font-bold text-primary">
                              {formatCurrency(item.quantity * item.unitPrice)}
                            </td>
                            <td className="px-4 py-2.5 text-center">
                              <Badge
                                variant={
                                  sale?.status === 'PAYE'
                                    ? 'default'
                                    : sale?.status === 'VALIDE'
                                    ? 'secondary'
                                    : sale?.status === 'ANNULE'
                                    ? 'destructive'
                                    : 'outline'
                                }
                                className="text-[10px] py-0 px-1.5"
                              >
                                {sale?.status || 'VALIDE'}
                              </Badge>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : activeTab === 'movements' ? (
            /* ─────────────────────────────────────────────────────────────────── */
            /* ONGLET 3 : RÉAPPROVISIONNEMENTS & MOUVEMENTS DE STOCK               */
            /* ─────────────────────────────────────────────────────────────────── */
            <div>
              {stockMovements.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <ArrowRightLeft className="h-10 w-10 text-muted-foreground/30 mb-2" />
                  <p className="text-sm font-semibold text-muted-foreground">Aucun mouvement de stock tracé.</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Les réapprovisionnements, transferts et ventes sont automatiquement archivés dans le Stock Ledger.</p>
                </div>
              ) : (
                <div className="rounded-xl border overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-muted/40 border-b text-muted-foreground">
                        <th className="px-4 py-2.5 text-left font-semibold">Date</th>
                        <th className="px-4 py-2.5 text-left font-semibold">Type de Mouvement</th>
                        <th className="px-4 py-2.5 text-center font-semibold">Variation</th>
                        <th className="px-4 py-2.5 text-center font-semibold">Stock (Avant ➔ Après)</th>
                        <th className="px-4 py-2.5 text-left font-semibold">Référence / Notes</th>
                        <th className="px-4 py-2.5 text-right font-semibold">Entrepôt</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {stockMovements.map((m) => {
                        const isPositive = m.quantity > 0
                        return (
                          <tr key={m.id} className="hover:bg-muted/20">
                            <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">
                              {new Date(m.createdAt).toLocaleDateString('fr-FR', {
                                day: 'numeric',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </td>
                            <td className="px-4 py-2.5">
                              <Badge
                                variant={
                                  m.type === 'ACHAT'
                                    ? 'default'
                                    : m.type === 'VENTE'
                                    ? 'secondary'
                                    : m.type.startsWith('MAGASIN')
                                    ? 'outline'
                                    : 'destructive'
                                }
                                className="text-[10px] py-0 px-1.5 font-medium"
                              >
                                {m.type === 'ACHAT'
                                  ? 'Réapprovisionnement'
                                  : m.type === 'VENTE'
                                  ? 'Vente Caisse'
                                  : m.type === 'MAGASIN_ENTREE'
                                  ? 'Transfert ➔ Magasin'
                                  : m.type === 'MAGASIN_SORTIE'
                                  ? 'Transfert ➔ Boutique'
                                  : m.type === 'ANNULATION_VENTE'
                                  ? 'Annulation Vente'
                                  : m.type}
                              </Badge>
                            </td>
                            <td className={`px-4 py-2.5 text-center font-bold ${isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                              {isPositive ? `+${m.quantity}` : m.quantity}
                            </td>
                            <td className="px-4 py-2.5 text-center font-mono text-muted-foreground">
                              {m.quantityBefore} ➔ <strong className="text-foreground">{m.quantityAfter}</strong>
                            </td>
                            <td className="px-4 py-2.5 text-muted-foreground max-w-xs truncate" title={m.notes || m.referenceDoc || ''}>
                              {m.referenceDoc && <span className="font-mono text-foreground mr-1">{m.referenceDoc}</span>}
                              {m.notes && <span>{m.notes}</span>}
                            </td>
                            <td className="px-4 py-2.5 text-right text-muted-foreground">
                              {m.warehouse?.name || '—'}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            /* ─────────────────────────────────────────────────────────────────── */
            /* ONGLET 4 : RÉSERVATIONS EN COURS & AVANCES                          */
            /* ─────────────────────────────────────────────────────────────────── */
            <div className="space-y-4">
              {/* Bannière explicative */}
              <div className="rounded-xl border border-amber-200 bg-amber-50/60 dark:border-amber-800/40 dark:bg-amber-950/20 p-4">
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-amber-500/10 p-2 text-amber-600 dark:text-amber-400">
                    <Clock className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-xs font-bold text-amber-900 dark:text-amber-300">
                      Gestion des Réservations & Stocks Bloqués
                    </h4>
                    <p className="text-xs text-amber-700/80 dark:text-amber-400/80 mt-0.5">
                      {totalReserve > 0
                        ? `Actuellement, ${totalReserve} unité(s) de cet article sont réservées suite à des avances clients. Elles ne peuvent pas être vendues en caisse tant que le client n'a pas soldé ou que vous n'avez pas débloqué le stock.`
                        : "Aucune unité de ce produit n'est actuellement bloquée par une avance client."}
                    </p>
                  </div>
                </div>
              </div>

              {activeReservations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center border rounded-xl border-dashed">
                  <Clock className="h-10 w-10 text-muted-foreground/30 mb-2" />
                  <p className="text-sm font-semibold text-muted-foreground">Aucune réservation en cours.</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Toutes les {totalBoutique} unités en stock boutique sont 100% disponibles pour la vente immédiate en caisse.
                  </p>
                </div>
              ) : (
                <div className="rounded-xl border overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-muted/40 border-b text-muted-foreground">
                        <th className="px-4 py-2.5 text-left font-semibold">Date & Client</th>
                        <th className="px-4 py-2.5 text-left font-semibold">N° Facture</th>
                        <th className="px-4 py-2.5 text-center font-semibold">Qté Réservée</th>
                        <th className="px-4 py-2.5 text-right font-semibold">Avance Versée</th>
                        <th className="px-4 py-2.5 text-right font-semibold">Reste Dû</th>
                        <th className="px-4 py-2.5 text-center font-semibold">Statut</th>
                        <th className="px-4 py-2.5 text-right font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {activeReservations.map((item) => {
                        const s = item.sale as any
                        const avance = (s?.montantAvance as number) ?? 0
                        const reste = Math.max(0, (s?.finalTotal ?? 0) - avance)
                        const daysAgo = Math.floor((Date.now() - new Date(s.createdAt).getTime()) / (1000 * 60 * 60 * 24))
                        const isLate = daysAgo >= 7

                        return (
                          <tr key={item.id} className="hover:bg-muted/20">
                            <td className="px-4 py-2.5">
                              <p className="font-semibold text-foreground">
                                {s.client?.name ?? 'Client anonyme'}
                              </p>
                              <div className="flex items-center gap-1 text-muted-foreground text-[10px] mt-0.5">
                                <span>{new Date(s.createdAt).toLocaleDateString('fr-FR')}</span>
                                <span>•</span>
                                <span className={isLate ? 'text-destructive font-bold' : ''}>
                                  {daysAgo === 0 ? "Aujourd'hui" : `Il y a ${daysAgo} j`}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-2.5 font-mono text-muted-foreground">
                              {s.invoiceNumber}
                            </td>
                            <td className="px-4 py-2.5 text-center">
                              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-400 font-bold">
                                {item.quantity} unité{item.quantity > 1 ? 's' : ''}
                              </Badge>
                            </td>
                            <td className="px-4 py-2.5 text-right font-medium text-amber-600">
                              {formatCurrency(avance)}
                            </td>
                            <td className="px-4 py-2.5 text-right font-bold text-destructive">
                              {formatCurrency(reste)}
                            </td>
                            <td className="px-4 py-2.5 text-center">
                              <Badge
                                variant={s.status === 'EN_ATTENTE' ? 'outline' : 'secondary'}
                                className="text-[10px]"
                              >
                                {s.status === 'EN_ATTENTE' ? 'En attente' : 'Validée'}
                              </Badge>
                            </td>
                            <td className="px-4 py-2.5 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 text-xs px-2"
                                  onClick={() => setSelectedSaleForModal(s)}
                                >
                                  Voir facture
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  className="h-7 text-xs px-2"
                                  disabled={unblockingSaleId === s.id}
                                  onClick={() => handleUnblockReservation(s.id)}
                                >
                                  {unblockingSaleId === s.id ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    'Débloquer'
                                  )}
                                </Button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal de consultation / règlement de la facture liée */}
        <FactureDetailModal
          open={selectedSaleForModal !== null}
          onClose={() => setSelectedSaleForModal(null)}
          sale={selectedSaleForModal}
          onUpdate={() => {
            loadDetails()
            if (onProductUpdated) onProductUpdated()
          }}
        />
      </DialogContent>
    </Dialog>
  )
}
