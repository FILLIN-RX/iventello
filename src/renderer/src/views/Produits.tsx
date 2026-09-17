import { useState, useEffect, useMemo, useRef } from 'react'
import {
  Plus,
  Pencil,
  Trash2,
  Package,
  Truck,
  ArrowLeft,
  RotateCw,
  Store,
  FileSpreadsheet,
  Download,
  LayoutGrid,
  List,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  AlertTriangle,
  Loader2,
  Eye
} from 'lucide-react'
import { toFileUrl } from '../../../shared/imageUtils'
import { useProducts } from '../hooks/useProducts'
import { useBarcodeScanner } from '../hooks/useBarcodeScanner'
import { useDeviceCheck } from '../hooks/useDeviceCheck'
import { DeviceCheckModal } from '../components/DeviceCheckModal'
import { ReapprovisionnementModal } from '../components/ReapprovisionnementModal'
import { ImportExcelModal } from '../components/ImportExcelModal'
import { ProductDetailModal } from '../components/ProductDetailModal'
import { useEntrepotStore } from '../stores/entrepotStore'
import { feedback } from '../stores/feedbackStore'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Badge } from '../components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '../components/ui/dialog'
import { ProduitForm } from './ProduitForm'
import type { ProductWithRelations } from '../../../shared/types'
import { formatCurrency } from '@/lib/utils'

type SubView = 'list' | 'create' | 'edit'
type ViewMode = 'grid' | 'table'

function Produits() {
  const containerRef = useRef<HTMLDivElement>(null)
  const { products, loading, error, refetch } = useProducts()
  const [search, setSearch] = useState('')
  const [subView, setSubView] = useState<SubView>('list')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [editing, setEditing] = useState<ProductWithRelations | null>(null)
  const [showDeviceModal, setShowDeviceModal] = useState(false)
  const [showRestockModal, setShowRestockModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false)
  const [deletingAll, setDeletingAll] = useState(false)
  const [restockProduct, setRestockProduct] = useState<ProductWithRelations | null>(null)
  const [selectedDetailProductId, setSelectedDetailProductId] = useState<string | null>(null)
  const selectedId = useEntrepotStore((s) => s.selectedId)
  const selectedName = useEntrepotStore((s) => s.selectedName)
  const { checkScanner, testScanner } = useDeviceCheck()

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(24)

  const [exportingExcel, setExportingExcel] = useState(false)

  async function handleExportExcel() {
    try {
      setExportingExcel(true)
      const filePath = await window.api.exportProductsExcel(selectedId || undefined)
      if (filePath) {
        feedback.toast.success(
          'Exportation Excel réussie',
          `Le catalogue (${products.length} articles) a été exporté vers le fichier Excel.`
        )
      }
    } catch (err: any) {
      console.error('Erreur export Excel produits:', err)
      feedback.toast.error(err?.message || 'Erreur lors de l\'exportation Excel des produits')
    } finally {
      setExportingExcel(false)
    }
  }

  function handleDeleteAll() {
    feedback.confirm({
      title: 'Vider tout le catalogue',
      message: 'Attention : Vous êtes sur le point de supprimer TOUS les produits du catalogue. Cette action est irréversible.',
      confirmLabel: 'Tout effacer',
      variant: 'destructive',
      onConfirm: async () => {
        try {
          await window.api.deleteAllProducts(selectedId || undefined)
          setShowDeleteAllModal(false)
          feedback.modal.success({
            title: 'Catalogue nettoyé',
            message: 'Tous les produits et stocks ont été supprimés avec succès.'
          })
          refetch()
        } catch (err: any) {
          console.error(err)
          feedback.modal.error({
            title: 'Erreur de nettoyage',
            message: err?.message || 'Erreur lors de la suppression'
          })
        }
      }
    })
  }

  useEffect(() => {
    if (!checkScanner()) setShowDeviceModal(true)
  }, [])

  // Remonter en haut de page à chaque changement de page
  useEffect(() => {
    const mainEl = containerRef.current?.closest('main')
    if (mainEl) {
      mainEl.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [currentPage])

  useBarcodeScanner((barcode) => {
    if (subView !== 'list') return
    setSearch(barcode)
    setCurrentPage(1)
  })

  // Filter products by search
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return products
    return products.filter(
      (p) =>
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.barcode && p.barcode.toLowerCase().includes(q)) ||
        (p.category?.name && p.category.name.toLowerCase().includes(q)) ||
        (p.supplier?.name && p.supplier.name.toLowerCase().includes(q))
    )
  }, [products, search])

  // Reset to page 1 when search or pageSize changes
  useEffect(() => {
    setCurrentPage(1)
  }, [search, pageSize])

  // Compute pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filtered.slice(start, start + pageSize)
  }, [filtered, currentPage, pageSize])

  function handleDelete(id: string, name?: string) {
    feedback.confirm({
      title: 'Supprimer le produit',
      message: 'Êtes-vous sûr de vouloir supprimer définitivement ce produit du catalogue ?',
      itemName: name || 'Produit',
      confirmLabel: 'Supprimer',
      variant: 'destructive',
      onConfirm: async () => {
        try {
          await window.api.deleteProduct(id)
          feedback.toast.success(`Le produit « ${name || 'sélectionné'} » a été supprimé.`, 'Suppression réussie')
          refetch()
        } catch (err: any) {
          console.error(err)
          feedback.toast.error(err?.message || 'Impossible de supprimer ce produit.', 'Erreur')
        }
      }
    })
  }

  function handleRestock(p: ProductWithRelations) {
    if (!selectedId) {
      feedback.toast.warning("Veuillez d'abord sélectionner une boutique.", 'Boutique requise')
      return
    }
    setRestockProduct(p)
    setShowRestockModal(true)
  }

  const [magasinQty, setMagasinQty] = useState<Record<string, number>>({})
  const [sendingMagasin, setSendingMagasin] = useState<Record<string, boolean>>({})

  async function handleSendToMagasin(p: ProductWithRelations) {
    if (!selectedId) return
    const qty = magasinQty[p.id] ?? 1
    if (qty <= 0) return
    setSendingMagasin((prev) => ({ ...prev, [p.id]: true }))
    try {
      await window.api.sendToMagasin({ productId: p.id, warehouseId: selectedId, quantity: qty })
      setMagasinQty((prev) => ({ ...prev, [p.id]: 0 }))
      feedback.toast.success(`${qty} unité(s) de « ${p.name} » transférée(s) en réserve magasin.`, 'Transfert effectué')
      refetch()
    } catch (e: any) {
      console.error(e)
      feedback.toast.error(e?.message || 'Erreur lors du transfert en magasin', 'Erreur')
    } finally {
      setSendingMagasin((prev) => ({ ...prev, [p.id]: false }))
    }
  }

  function handleCreate() {
    setEditing(null)
    setSubView('create')
  }

  function handleEdit(p: ProductWithRelations) {
    setEditing(p)
    setSubView('edit')
  }

  function handleBack() {
    setSubView('list')
    setEditing(null)
  }

  function handleSaved() {
    handleBack()
    refetch()
  }

  if (subView === 'create' || subView === 'edit') {
    return (
      <div className="w-full space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={handleBack}>
            <ArrowLeft className="mr-1 h-4 w-4" /> Retour
          </Button>
          <h2 className="text-xl font-semibold">
            {subView === 'create' ? 'Nouveau produit' : 'Modifier le produit'}
          </h2>
        </div>
        <div className="rounded-lg border bg-card p-6">
          <ProduitForm product={editing} onSave={handleSaved} onCancel={handleBack} />
        </div>
      </div>
    )
  }

  const startIndex = (currentPage - 1) * pageSize + 1
  const endIndex = Math.min(currentPage * pageSize, filtered.length)

  return (
    <div ref={containerRef} className="space-y-5 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Produits</h2>
          <p className="text-xs text-muted-foreground">
            {filtered.length} produit{filtered.length > 1 ? 's' : ''} au total
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setShowDeleteAllModal(true)}
            disabled={products.length === 0}
            className="border-red-500/30 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-500/30 dark:text-red-400 dark:hover:bg-red-950/30"
            title="Supprimer tous les produits du catalogue"
          >
            <Trash2 className="mr-2 h-4 w-4 text-red-500" />
            Nettoyer tout
          </Button>
          <Button
            variant="outline"
            onClick={handleExportExcel}
            disabled={exportingExcel || products.length === 0}
            className="border-indigo-500/30 hover:bg-indigo-50 hover:text-indigo-700 dark:hover:bg-indigo-950/30 dark:hover:text-indigo-400 font-semibold text-xs"
          >
            {exportingExcel ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin text-indigo-600" />
            ) : (
              <Download className="mr-2 h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            )}
            Exporter Excel
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowImportModal(true)}
            className="border-emerald-500/30 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/30 dark:hover:text-emerald-400 font-semibold text-xs"
          >
            <FileSpreadsheet className="mr-2 h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            Importer Excel
          </Button>
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Nouveau produit
          </Button>
        </div>
      </div>

      {/* Barre d'outils : Recherche + Mode Vue + Sélecteur Taille de page */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Package className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher nom, code-barres, catégorie..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex items-center gap-3 self-end sm:self-auto">
          {/* Sélecteur éléments par page */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span>Par page :</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="rounded-md border border-input bg-background px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
            >
              <option value={12}>12</option>
              <option value={24}>24</option>
              <option value={48}>48</option>
              <option value={96}>96</option>
            </select>
          </div>

          {/* Boutons Grille / Tableau */}
          <div className="flex items-center rounded-lg border bg-muted/40 p-0.5">
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="h-7 px-2.5 text-xs gap-1"
              title="Vue Grille (Cartes)"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Grille</span>
            </Button>
            <Button
              variant={viewMode === 'table' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('table')}
              className="h-7 px-2.5 text-xs gap-1"
              title="Vue Tableau compacte"
            >
              <List className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Tableau</span>
            </Button>
          </div>
        </div>
      </div>

      {loading && <p className="text-muted-foreground py-8 text-center">Chargement des produits...</p>}
      {error && <p className="text-destructive py-8 text-center">Erreur : {error}</p>}

      {!loading && !error && filtered.length === 0 && (
        <div className="text-center py-12 border rounded-lg bg-card text-muted-foreground">
          <Package className="h-10 w-10 mx-auto mb-2 opacity-30" />
          <p>{search ? 'Aucun produit ne correspond à votre recherche.' : 'Aucun produit enregistré.'}</p>
        </div>
      )}

      {/* VUE GRILLE (CARTES) */}
      {!loading && filtered.length > 0 && viewMode === 'grid' && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {paginatedProducts.map((p) => (
            <Card
              key={p.id}
              className="group overflow-hidden transition-all duration-200 hover:shadow-md hover:border-primary/20 flex flex-col justify-between"
            >
              <div>
                {/* Zone d'image du produit */}
                <div className="relative h-36 w-full bg-muted/30 overflow-hidden border-b flex items-center justify-center">
                  {p.imageUrl ? (
                    <img
                      src={p.imageUrl.startsWith('http') ? p.imageUrl : toFileUrl(p.imageUrl)}
                      alt={p.name}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-1 text-muted-foreground/40">
                      <Package className="h-8 w-8 stroke-[1.2]" />
                      <span className="text-[9px] uppercase tracking-wider font-semibold">Aucune image</span>
                    </div>
                  )}

                  {/* Badges de stock */}
                  {(() => {
                    const stockItem = selectedId
                      ? p.stocks?.find((s) => s.warehouse?.id === selectedId)
                      : p.stocks?.[0]
                    const qty = stockItem?.quantity ?? 0
                    const alert = stockItem?.alertLimit ?? 5
                    const magQty = stockItem?.quantityMagasin ?? 0
                    const resQty = stockItem?.quantityReservee ?? 0
                    return (
                      <div className="absolute bottom-2 left-2 flex flex-wrap gap-1">
                        <Badge
                          variant={
                            stockItem
                              ? qty <= alert
                                ? 'destructive'
                                : 'default'
                              : 'outline'
                          }
                          className="shadow-sm text-[10px] py-0 px-1.5 font-semibold"
                        >
                          Stock: {qty}
                        </Badge>
                        {magQty > 0 && (
                          <Badge
                            variant="outline"
                            className="shadow-sm text-[10px] py-0 px-1.5 font-semibold bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-700"
                          >
                            <Store className="h-2.5 w-2.5 mr-0.5" />
                            {magQty}
                          </Badge>
                        )}
                        {resQty > 0 && (
                          <Badge
                            variant="outline"
                            className="shadow-sm text-[10px] py-0 px-1.5 font-semibold bg-amber-100 text-amber-800 border-amber-400 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-600"
                          >
                            <Package className="h-2.5 w-2.5 mr-0.5" />
                            {resQty}
                          </Badge>
                        )}
                      </div>
                    )
                  })()}
                </div>

                <CardHeader className="pb-1 pt-3 px-3">
                  <div className="min-w-0">
                    <CardTitle className="text-sm font-bold truncate line-clamp-1" title={p.name}>
                      {p.name}
                    </CardTitle>
                    <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mt-0.5">
                      {p.barcode || 'Sans code'}
                    </p>
                  </div>
                </CardHeader>

                <CardContent className="pb-3 px-3 space-y-2">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    <span className="text-base font-bold text-primary">{formatCurrency(p.sellingPrice)}</span>
                    <span className="text-[11px] text-muted-foreground">
                      Achat: {formatCurrency(p.basePrice)}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-1">
                    {p.category && (
                      <span className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-[9px] font-semibold text-secondary-foreground">
                        {p.category.name}
                      </span>
                    )}
                    {p.supplier && (
                      <span className="inline-flex items-center gap-1 text-[9px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
                        <Truck className="h-2.5 w-2.5 flex-shrink-0" />
                        <span className="truncate max-w-[100px]">{p.supplier.name}</span>
                      </span>
                    )}
                  </div>
                </CardContent>
              </div>

              <CardContent className="pt-0 pb-3 px-3 space-y-1.5">
                <Button
                  size="sm"
                  variant="secondary"
                  className="w-full text-xs h-7"
                  onClick={() => handleRestock(p)}
                >
                  <RotateCw className="mr-1.5 h-3 w-3" />
                  Réapprovisionner
                </Button>
                <div className="flex gap-1.5">
                  <div className="flex-1 flex items-center gap-1 rounded-md border border-dashed border-amber-300 bg-amber-50/50 dark:border-amber-700 dark:bg-amber-950/10 px-1.5 py-0.5">
                    <Store className="h-3 w-3 text-amber-600 shrink-0" />
                    <Input
                      type="number"
                      min={1}
                      value={magasinQty[p.id] ?? 1}
                      onChange={(e) =>
                        setMagasinQty((prev) => ({
                          ...prev,
                          [p.id]: Math.max(1, Number(e.target.value) || 1)
                        }))
                      }
                      className="h-5 w-10 text-[11px] text-center border-0 bg-transparent p-0"
                      placeholder="1"
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-5 px-1 text-[11px] text-amber-700 hover:text-amber-800 hover:bg-amber-100 dark:text-amber-400 dark:hover:bg-amber-950/30"
                      disabled={sendingMagasin[p.id]}
                      onClick={() => handleSendToMagasin(p)}
                    >
                      {sendingMagasin[p.id] ? '...' : '→ Mag.'}
                    </Button>
                  </div>
                </div>
                <div className="flex gap-1.5 border-t pt-1.5">
                  <Button
                    size="sm"
                    variant="secondary"
                    className="flex-1 text-xs h-7 gap-1"
                    onClick={() => setSelectedDetailProductId(p.id)}
                    title="Voir la fiche détaillée (Ventes, Stocks, Mouvements)"
                  >
                    <Eye className="h-3 w-3 text-primary" />
                    Détails
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 text-xs h-7"
                    onClick={() => handleEdit(p)}
                  >
                    <Pencil className="mr-1 h-3 w-3" />
                    Modifier
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="h-7 px-2 text-xs"
                    onClick={() => handleDelete(p.id)}
                    title="Supprimer"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* VUE TABLEAU COMPACT */}
      {!loading && filtered.length > 0 && viewMode === 'table' && (
        <div className="rounded-lg border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b bg-muted/50 font-medium text-muted-foreground">
                  <th className="py-2.5 px-3 w-12 text-center">Img</th>
                  <th className="py-2.5 px-3">Produit</th>
                  <th className="py-2.5 px-3">Code-barres</th>
                  <th className="py-2.5 px-3">Catégorie</th>
                  <th className="py-2.5 px-3">Fournisseur</th>
                  <th className="py-2.5 px-3 text-right">Prix Achat</th>
                  <th className="py-2.5 px-3 text-right">Prix Vente</th>
                  <th className="py-2.5 px-3 text-center">Stock</th>
                  <th className="py-2.5 px-3 text-center">Magasin</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {paginatedProducts.map((p) => {
                  const stockItem = selectedId
                    ? p.stocks?.find((s) => s.warehouse?.id === selectedId)
                    : p.stocks?.[0]
                  const stockQty = stockItem?.quantity ?? 0
                  const alertLimit = stockItem?.alertLimit ?? 0
                  const isLow = stockItem ? stockQty <= alertLimit : true
                  const magQty = stockItem?.quantityMagasin ?? 0

                  return (
                    <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-2 px-3 text-center">
                        {p.imageUrl ? (
                          <img
                            src={p.imageUrl.startsWith('http') ? p.imageUrl : toFileUrl(p.imageUrl)}
                            alt=""
                            className="h-8 w-8 rounded object-cover mx-auto border"
                            loading="lazy"
                          />
                        ) : (
                          <div className="h-8 w-8 rounded bg-muted flex items-center justify-center mx-auto text-muted-foreground/50 border">
                            <Package className="h-4 w-4" />
                          </div>
                        )}
                      </td>
                      <td className="py-2 px-3">
                        <div className="font-semibold text-foreground">{p.name}</div>
                      </td>
                      <td className="py-2 px-3 font-mono text-[11px] text-muted-foreground">
                        {p.barcode || '—'}
                      </td>
                      <td className="py-2 px-3">
                        {p.category ? (
                          <span className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-secondary-foreground">
                            {p.category.name}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-muted-foreground">
                        {p.supplier?.name || '—'}
                      </td>
                      <td className="py-2 px-3 text-right text-muted-foreground">
                        {formatCurrency(p.basePrice)}
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-primary">
                        {formatCurrency(p.sellingPrice)}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <Badge
                          variant={stockItem ? (isLow ? 'destructive' : 'default') : 'outline'}
                          className="text-[10px] px-1.5 py-0 font-medium"
                        >
                          {stockQty}
                        </Badge>
                      </td>
                      <td className="py-2 px-3 text-center">
                        {magQty > 0 ? (
                          <Badge
                            variant="outline"
                            className="text-[10px] px-1.5 py-0 bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-700"
                          >
                            {magQty}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-xs"
                            onClick={() => setSelectedDetailProductId(p.id)}
                            title="Voir la fiche détaillée (Ventes, Stocks, Mouvements)"
                          >
                            <Eye className="h-3.5 w-3.5 text-primary" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-xs"
                            onClick={() => handleRestock(p)}
                            title="Réapprovisionner"
                          >
                            <RotateCw className="h-3.5 w-3.5 text-emerald-600" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-xs"
                            onClick={() => handleEdit(p)}
                            title="Modifier"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-xs text-destructive hover:bg-destructive/10"
                            onClick={() => handleDelete(p.id)}
                            title="Supprimer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* BARRE DE PAGINATION */}
      {!loading && filtered.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t text-xs text-muted-foreground">
          <div>
            Affichage de <span className="font-semibold text-foreground">{startIndex}</span> à{' '}
            <span className="font-semibold text-foreground">{endIndex}</span> sur{' '}
            <span className="font-semibold text-foreground">{filtered.length}</span> produit
            {filtered.length > 1 ? 's' : ''}
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              title="Première page"
            >
              <ChevronsLeft className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              title="Page précédente"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>

            <span className="px-2 font-medium text-foreground">
              Page {currentPage} / {totalPages}
            </span>

            <Button
              variant="outline"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              title="Page suivante"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              title="Dernière page"
            >
              <ChevronsRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      <DeviceCheckModal
        open={showDeviceModal}
        onClose={() => setShowDeviceModal(false)}
        device="scanner"
        onTest={testScanner}
      />

      {selectedId && (
        <ReapprovisionnementModal
          open={showRestockModal}
          onClose={() => {
            setShowRestockModal(false)
            setRestockProduct(null)
          }}
          product={restockProduct}
          warehouseId={selectedId}
          warehouseName={selectedName ?? undefined}
          onSuccess={refetch}
        />
      )}

      <ImportExcelModal
        open={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImportSuccess={() => {
          refetch()
        }}
      />

      <Dialog open={showDeleteAllModal} onOpenChange={setShowDeleteAllModal}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-semibold text-red-600 dark:text-red-400">
                  Supprimer tous les produits ?
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-1">
                  Cette action supprimera définitivement les {products.length} produit{products.length > 1 ? 's' : ''} enregistrés ainsi que l'ensemble de leurs stocks associés.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-md text-xs text-red-700 dark:text-red-300">
            ⚠️ <strong>Attention :</strong> Cette opération est irréversible. Toutes les fiches articles, niveaux de stocks et liaisons catalogue seront purgés.
          </div>

          <DialogFooter className="gap-2 sm:gap-0 mt-4">
            <Button
              variant="outline"
              onClick={() => setShowDeleteAllModal(false)}
              disabled={deletingAll}
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAll}
              disabled={deletingAll}
              className="bg-red-600 hover:bg-red-700 text-white gap-2"
            >
              {deletingAll ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Suppression en cours...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  Oui, tout supprimer ({products.length})
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Fiche Produit Détaillée (Ventes, Stocks, Mouvements) */}
      <ProductDetailModal
        productId={selectedDetailProductId}
        open={!!selectedDetailProductId}
        onOpenChange={(open) => !open && setSelectedDetailProductId(null)}
        onEditProduct={(p) => handleEdit(p)}
      />
    </div>
  )
}

export default Produits
