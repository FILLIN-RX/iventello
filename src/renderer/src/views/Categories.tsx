import { useState, useEffect, useMemo, useRef } from 'react'
import {
  Plus,
  Pencil,
  Trash2,
  Tag,
  Search,
  Package,
  LayoutGrid,
  List,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowLeft,
  Coins,
  Barcode,
  Boxes,
  Store,
  ExternalLink,
  Loader2,
  AlertTriangle,
  Eraser,
  Sparkles,
  ArrowRightLeft,
  CheckSquare,
  Square,
  Eye
} from 'lucide-react'
import { useCategories } from '../hooks/useCategories'
import { useProducts } from '../hooks/useProducts'
import { useEntrepotStore } from '../stores/entrepotStore'
import { feedback } from '../stores/feedbackStore'
import { ProductDetailModal } from '../components/ProductDetailModal'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Badge } from '../components/ui/badge'
import { Card, CardContent } from '../components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '../components/ui/dialog'
import { formatCurrency, getColor } from '@/lib/utils'
import { toFileUrl } from '../../../shared/imageUtils'
import type { Category, ProductWithRelations } from '../../../shared/types'

export default function Categories() {
  const containerRef = useRef<HTMLDivElement>(null)
  const { categories, loading, refetch } = useCategories()
  const { products, refetch: refetchProducts } = useProducts()
  const { selectedId: workspaceId, selectedName: workspaceName } = useEntrepotStore()

  // Navigation State
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)
  const [categoryProductSearch, setCategoryProductSearch] = useState('')
  const [productViewMode, setProductViewMode] = useState<'grid' | 'table'>('grid')

  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Category | null>(null)
  const [form, setForm] = useState({ name: '', description: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Nettoyage des catégories
  const [showCleanModal, setShowCleanModal] = useState(false)
  const [cleanMode, setCleanMode] = useState<'empty' | 'all'>('empty')
  const [cleaning, setCleaning] = useState(false)
  const [showClearProductsModal, setShowClearProductsModal] = useState(false)
  const [clearingProducts, setClearingProducts] = useState(false)

  // Transfert de produits vers une autre catégorie
  const [transferTargetCategory, setTransferTargetCategory] = useState<string>('')
  const [transferringProducts, setTransferringProducts] = useState(false)
  const [productToTransfer, setProductToTransfer] = useState<ProductWithRelations | null>(null)
  const [showTransferDialog, setShowTransferDialog] = useState(false)
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([])
  const [selectedDetailProductId, setSelectedDetailProductId] = useState<string | null>(null)


  // Pagination states for categories list
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(12)

  // Filtered categories
  const filteredCategories = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return categories
    return categories.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.description?.toLowerCase() ?? '').includes(q)
    )
  }, [categories, search])

  // Products belonging to the currently selected category
  const categoryProducts = useMemo(() => {
    if (!selectedCategory) return []
    return products.filter((p) => p.categoryId === selectedCategory.id)
  }, [products, selectedCategory])

  // Filtered products inside selected category
  const filteredCategoryProducts = useMemo(() => {
    const q = categoryProductSearch.trim().toLowerCase()
    if (!q) return categoryProducts
    return categoryProducts.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.barcode.toLowerCase().includes(q) ||
        (p.supplier?.name.toLowerCase() ?? '').includes(q)
    )
  }, [categoryProducts, categoryProductSearch])

  // KPI stats for selected category
  const categoryStats = useMemo(() => {
    if (!selectedCategory) return { count: 0, totalUnits: 0, totalValue: 0 }
    let totalUnits = 0
    let totalValue = 0

    categoryProducts.forEach((p) => {
      const stock = p.stocks?.find((s) => !workspaceId || s.warehouse.id === workspaceId)
      const qty = stock?.quantity ?? 0
      totalUnits += qty
      totalValue += qty * p.sellingPrice
    })

    return {
      count: categoryProducts.length,
      totalUnits,
      totalValue
    }
  }, [categoryProducts, selectedCategory, workspaceId])

  // Reset page when search or pageSize changes
  useEffect(() => {
    setCurrentPage(1)
  }, [search, pageSize])

  // Reset search when category selection changes
  useEffect(() => {
    setCategoryProductSearch('')
    if (containerRef.current) {
      containerRef.current.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [selectedCategory])

  // Scroll to top on page change
  useEffect(() => {
    const mainEl = containerRef.current?.closest('main')
    if (mainEl) {
      mainEl.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [currentPage])

  const totalPages = Math.max(1, Math.ceil(filteredCategories.length / pageSize))
  const paginatedCategories = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredCategories.slice(start, start + pageSize)
  }, [filteredCategories, currentPage, pageSize])

  const totalProducts = products.length
  const avgProductsPerCat = categories.length > 0 ? (totalProducts / categories.length).toFixed(1) : '0'

  // Catégories orphelines / vides (sans aucun produit associé)
  const emptyCategoriesCount = useMemo(() => {
    return categories.filter((c) => !products.some((p) => p.categoryId === c.id)).length
  }, [categories, products])

  async function handleCleanCategories() {
    setCleaning(true)
    try {
      if (cleanMode === 'empty') {
        const count = await window.api.deleteEmptyCategories()
        feedback.toast.success('Nettoyage terminé', `${count || 0} catégorie(s) vide(s) supprimée(s).`)
        refetch()
      } else {
        await window.api.deleteAllCategories()
        setSelectedCategory(null)
        feedback.toast.success('Réinitialisation terminée', 'Toutes les catégories ont été supprimées.')
        refetch()
        refetchProducts()
      }
      setShowCleanModal(false)
    } catch (err: any) {
      feedback.toast.error(err?.message || 'Erreur lors du nettoyage', 'Erreur')
    } finally {
      setCleaning(false)
    }
  }

  async function handleClearCurrentCategoryProducts() {
    if (!selectedCategory) return
    setClearingProducts(true)
    try {
      await window.api.clearCategoryProducts(selectedCategory.id)
      setSelectedProductIds([])
      refetchProducts()
      refetch()
      setShowClearProductsModal(false)
      feedback.toast.success('Produits dissociés avec succès')
    } catch (err: any) {
      feedback.toast.error(err?.message || 'Erreur lors de la dissociation des produits', 'Erreur')
    } finally {
      setClearingProducts(false)
    }
  }

  function openTransferProduct(p: ProductWithRelations, e?: React.MouseEvent) {
    if (e) e.stopPropagation()
    setProductToTransfer(p)
    setSelectedProductIds([p.id])
    setTransferTargetCategory('')
    setShowTransferDialog(true)
  }

  function openBulkTransfer() {
    if (selectedProductIds.length === 0) return
    setProductToTransfer(null)
    setTransferTargetCategory('')
    setShowTransferDialog(true)
  }

  function toggleSelectProduct(id: string) {
    setSelectedProductIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  function toggleSelectAllProducts() {
    if (selectedProductIds.length === filteredCategoryProducts.length && filteredCategoryProducts.length > 0) {
      setSelectedProductIds([])
    } else {
      setSelectedProductIds(filteredCategoryProducts.map((p) => p.id))
    }
  }

  async function handleTransferProducts() {
    if (selectedProductIds.length === 0) return
    setTransferringProducts(true)
    try {
      const newCatId = transferTargetCategory === '__none__' || !transferTargetCategory ? null : transferTargetCategory
      for (const pId of selectedProductIds) {
        await window.api.updateProduct(pId, { categoryId: newCatId })
      }
      const count = selectedProductIds.length
      setSelectedProductIds([])
      setProductToTransfer(null)
      setShowTransferDialog(false)
      refetchProducts()
      refetch()
      feedback.toast.success(`Transfert réussi`, `${count} produit(s) transféré(s).`)
    } catch (err: any) {
      feedback.toast.error(err?.message || 'Erreur lors du transfert', 'Erreur')
    } finally {
      setTransferringProducts(false)
    }
  }

  function openCreate() {
    setEditing(null)
    setForm({ name: '', description: '' })
    setError(null)
    setShowForm(true)
  }

  function openEdit(cat: Category, e?: React.MouseEvent) {
    if (e) e.stopPropagation()
    setEditing(cat)
    setForm({ name: cat.name, description: cat.description ?? '' })
    setError(null)
    setShowForm(true)
  }

  async function handleSave() {
    if (!form.name.trim()) {
      setError('Le nom est requis')
      return
    }
    try {
      setSaving(true)
      if (editing) {
        await window.api.updateCategory(editing.id, {
          name: form.name.trim(),
          description: form.description || null
        })
        if (selectedCategory?.id === editing.id) {
          setSelectedCategory({ ...selectedCategory, name: form.name.trim(), description: form.description || null })
        }
        feedback.toast.success(`Catégorie "${form.name.trim()}" modifiée`)
      } else {
        await window.api.createCategory({
          name: form.name.trim(),
          description: form.description || null
        })
        feedback.toast.success(`Catégorie "${form.name.trim()}" créée`)
      }
      setShowForm(false)
      refetch()
    } catch (err: any) {
      setError(err?.message || 'Erreur')
      feedback.toast.error(err?.message || 'Erreur lors de l\'enregistrement', 'Erreur')
    } finally {
      setSaving(false)
    }
  }

  function handleDelete(id: string, name: string, e?: React.MouseEvent) {
    if (e) e.stopPropagation()
    feedback.confirm({
      title: 'Supprimer la catégorie ?',
      message: 'Les produits associés ne seront pas supprimés mais n\'auront plus de catégorie assignée.',
      itemName: name,
      confirmLabel: 'Supprimer la catégorie',
      variant: 'destructive',
      onConfirm: async () => {
        try {
          await window.api.deleteCategory(id)
          if (selectedCategory?.id === id) {
            setSelectedCategory(null)
          }
          feedback.toast.success(`Catégorie "${name}" supprimée`)
          refetch()
        } catch (err: any) {
          feedback.toast.error(err?.message || 'Erreur lors de la suppression', 'Erreur')
        }
      }
    })
  }

  const startIndex = (currentPage - 1) * pageSize + 1
  const endIndex = Math.min(currentPage * pageSize, filteredCategories.length)

  return (
    <div ref={containerRef} className="space-y-6 animate-fade-in pb-20">
      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* VUE 1 : DÉTAIL DE LA CATÉGORIE SÉLECTIONNÉE (PRODUITS ASSOCIÉS)     */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {selectedCategory ? (
        <div className="space-y-6 animate-fade-in">
          {/* Navigation & En-tête de catégorie */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-5">
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                className="gap-2 rounded-xl h-10 px-3.5 hover:bg-muted"
                onClick={() => setSelectedCategory(null)}
              >
                <ArrowLeft className="h-4 w-4" /> Catégories
              </Button>

              <div className="flex items-center gap-3">
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white text-lg font-bold shadow-sm ${getColor(
                    selectedCategory.name
                  )}`}
                >
                  {selectedCategory.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-bold tracking-tight">{selectedCategory.name}</h1>
                    <Badge variant="secondary" className="text-xs font-semibold">
                      {categoryProducts.length} référence{categoryProducts.length > 1 ? 's' : ''}
                    </Badge>
                  </div>
                  {selectedCategory.description && (
                    <p className="text-xs text-muted-foreground mt-0.5 max-w-xl">
                      {selectedCategory.description}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 h-9 text-amber-600 border-amber-500/30 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                onClick={() => setShowClearProductsModal(true)}
                disabled={categoryProducts.length === 0}
                title="Désassocier tous les produits de cette catégorie"
              >
                <Eraser className="h-3.5 w-3.5 text-amber-600" /> Vider la catégorie
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 h-9"
                onClick={() => openEdit(selectedCategory)}
              >
                <Pencil className="h-3.5 w-3.5" /> Modifier
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 h-9 text-destructive hover:bg-destructive/10 hover:border-destructive/30"
                onClick={() => handleDelete(selectedCategory.id, selectedCategory.name)}
              >
                <Trash2 className="h-3.5 w-3.5" /> Supprimer
              </Button>
            </div>
          </div>

          {/* Cartes KPI pour la catégorie */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="stat-card-green rounded-xl p-4 text-white shadow-md">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium opacity-80">Produits au catalogue</p>
                  <p className="text-2xl font-bold mt-1">{categoryStats.count}</p>
                </div>
                <div className="rounded-lg bg-white/20 p-2">
                  <Package className="h-5 w-5" />
                </div>
              </div>
            </div>

            <div className="stat-card-indigo rounded-xl p-4 text-white shadow-md">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium opacity-80">
                    Stock en boutique {workspaceName ? `(${workspaceName})` : ''}
                  </p>
                  <p className="text-2xl font-bold mt-1">{categoryStats.totalUnits} unités</p>
                </div>
                <div className="rounded-lg bg-white/20 p-2">
                  <Boxes className="h-5 w-5" />
                </div>
              </div>
            </div>

            <div className="stat-card-slate rounded-xl p-4 text-white shadow-md">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium opacity-80">Valeur marchande estimée</p>
                  <p className="text-2xl font-bold mt-1">{formatCurrency(categoryStats.totalValue)}</p>
                </div>
                <div className="rounded-lg bg-white/20 p-2">
                  <Coins className="h-5 w-5" />
                </div>
              </div>
            </div>
          </div>

          {/* Barre d'outils des produits de la catégorie */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={`Rechercher un produit dans ${selectedCategory.name}...`}
                value={categoryProductSearch}
                onChange={(e) => setCategoryProductSearch(e.target.value)}
                className="pl-10 h-10 rounded-xl"
              />
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              {selectedProductIds.length > 0 && (
                <Button
                  onClick={openBulkTransfer}
                  size="sm"
                  className="gap-1.5 h-9 bg-primary shadow-sm"
                >
                  <ArrowRightLeft className="h-3.5 w-3.5" />
                  Transférer ({selectedProductIds.length})
                </Button>
              )}
              <div className="flex items-center rounded-lg border bg-muted/40 p-0.5">
                <button
                  onClick={() => setProductViewMode('grid')}
                  className={`flex h-8 w-8 items-center justify-center rounded-md text-xs transition-colors ${
                    productViewMode === 'grid' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'
                  }`}
                  title="Vue Grille"
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setProductViewMode('table')}
                  className={`flex h-8 w-8 items-center justify-center rounded-md text-xs transition-colors ${
                    productViewMode === 'table' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'
                  }`}
                  title="Vue Tableau"
                >
                  <List className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Bannière de sélection multiple si active */}
          {selectedProductIds.length > 0 && (
            <div className="flex items-center justify-between bg-primary/10 border border-primary/20 rounded-xl px-4 py-2.5 text-xs text-primary font-medium animate-fade-in">
              <div className="flex items-center gap-2">
                <CheckSquare className="h-4 w-4" />
                <span><strong>{selectedProductIds.length}</strong> produit{selectedProductIds.length > 1 ? 's' : ''} sélectionné{selectedProductIds.length > 1 ? 's' : ''}</span>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => setSelectedProductIds([])} className="h-7 text-xs px-2">
                  Désélectionner tout
                </Button>
                <Button size="sm" onClick={openBulkTransfer} className="h-7 text-xs gap-1.5 shadow-sm">
                  <ArrowRightLeft className="h-3.5 w-3.5" /> Changer de catégorie
                </Button>
              </div>
            </div>
          )}

          {/* Liste des produits de la catégorie */}
          {filteredCategoryProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed py-16 text-center bg-card/40">
              <Package className="h-12 w-12 text-muted-foreground/30 mb-2" />
              <p className="text-base font-semibold text-muted-foreground">
                {categoryProductSearch
                  ? 'Aucun produit ne correspond à cette recherche dans la catégorie.'
                  : `Aucun produit associé à la catégorie "${selectedCategory.name}".`}
              </p>
              <p className="text-xs text-muted-foreground mt-1 max-w-md">
                Vous pouvez assigner cette catégorie lors de la création ou modification d'un produit depuis la page Produits.
              </p>
            </div>
          ) : productViewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredCategoryProducts.map((p) => {
                const stock = p.stocks?.find((s) => !workspaceId || s.warehouse.id === workspaceId)
                const qty = stock?.quantity ?? 0
                const alertLimit = stock?.alertLimit ?? 5
                const isCritical = qty <= alertLimit
                const imgUrl = toFileUrl(p.imageUrl || '')
                const isSelected = selectedProductIds.includes(p.id)

                return (
                  <Card
                    key={p.id}
                    className={`overflow-hidden hover:shadow-md transition-all hover:border-primary/40 flex flex-col justify-between relative ${
                      isSelected ? 'ring-2 ring-primary border-primary bg-primary/5' : ''
                    }`}
                  >
                    {/* Checkbox & Quick Transfer */}
                    <div className="absolute top-2.5 left-2.5 z-10">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleSelectProduct(p.id)
                        }}
                        className={`h-6 w-6 rounded-md flex items-center justify-center transition-colors ${
                          isSelected ? 'bg-primary text-white shadow-sm' : 'bg-background/80 hover:bg-background border border-border/80 text-muted-foreground'
                        }`}
                        title={isSelected ? 'Désélectionner' : 'Sélectionner'}
                      >
                        {isSelected ? <CheckSquare className="h-3.5 w-3.5" /> : <Square className="h-3.5 w-3.5 opacity-60" />}
                      </button>
                    </div>

                    <div className="absolute top-2.5 right-2.5 z-10 flex items-center gap-1">
                      <Button
                        variant="secondary"
                        size="sm"
                        className="h-7 w-7 p-0 shadow-sm bg-background/90 hover:bg-background border"
                        onClick={() => setSelectedDetailProductId(p.id)}
                        title="Voir la fiche détaillée (Ventes, Stocks, Mouvements)"
                      >
                        <Eye className="h-3.5 w-3.5 text-primary" />
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        className="h-7 px-2 text-[11px] gap-1 shadow-sm bg-background/90 hover:bg-background border"
                        onClick={(e) => openTransferProduct(p, e)}
                        title="Transférer vers une autre catégorie"
                      >
                        <ArrowRightLeft className="h-3 w-3 text-primary" />
                        <span className="hidden xl:inline">Transférer</span>
                      </Button>
                    </div>

                    <CardContent className="p-4 pt-10 space-y-3 flex-1 flex flex-col justify-between">
                      <div>
                        {/* Image / Thumbnail */}
                        <div className="h-28 w-full rounded-lg bg-muted/30 border border-border/40 flex items-center justify-center overflow-hidden mb-3">
                          {imgUrl ? (
                            <img src={imgUrl} alt={p.name} className="h-full w-full object-cover" />
                          ) : (
                            <Package className="h-10 w-10 text-muted-foreground/30" />
                          )}
                        </div>

                        {/* Nom & Code-barres */}
                        <p className="font-semibold text-sm truncate" title={p.name}>
                          {p.name}
                        </p>
                        <p className="text-xs text-muted-foreground font-mono mt-0.5">
                          {p.barcode || 'Sans code-barres'}
                        </p>

                        {/* Fournisseur */}
                        {p.supplier && (
                          <p className="text-[11px] text-muted-foreground mt-1 truncate">
                            Fournisseur : {p.supplier.name}
                          </p>
                        )}
                      </div>

                      {/* Prix & Stock */}
                      <div className="pt-2 border-t flex items-center justify-between">
                        <div>
                          <p className="text-xs text-muted-foreground">Prix de vente</p>
                          <p className="text-sm font-bold text-primary">{formatCurrency(p.sellingPrice)}</p>
                        </div>
                        <Badge
                          variant={isCritical ? 'destructive' : 'default'}
                          className="text-xs font-semibold px-2 py-0.5"
                        >
                          Stock : {qty}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          ) : (
            /* Vue Tableau */
            <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/40 text-xs text-muted-foreground uppercase tracking-wider border-b">
                      <th className="px-4 py-3 text-center w-10">
                        <button
                          onClick={toggleSelectAllProducts}
                          className="p-1 text-muted-foreground hover:text-foreground"
                          title="Tout sélectionner / désélectionner"
                        >
                          {selectedProductIds.length > 0 && selectedProductIds.length === filteredCategoryProducts.length ? (
                            <CheckSquare className="h-4 w-4 text-primary" />
                          ) : (
                            <Square className="h-4 w-4 opacity-60" />
                          )}
                        </button>
                      </th>
                      <th className="px-4 py-3 text-left font-semibold">Produit</th>
                      <th className="px-4 py-3 text-left font-semibold">Code-barres</th>
                      <th className="px-4 py-3 text-left font-semibold">Fournisseur</th>
                      <th className="px-4 py-3 text-right font-semibold">Prix de vente</th>
                      <th className="px-4 py-3 text-right font-semibold">Prix de revient (CMUP)</th>
                      <th className="px-4 py-3 text-center font-semibold">Stock</th>
                      <th className="px-4 py-3 text-right font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredCategoryProducts.map((p, idx) => {
                      const stock = p.stocks?.find((s) => !workspaceId || s.warehouse.id === workspaceId)
                      const qty = stock?.quantity ?? 0
                      const alertLimit = stock?.alertLimit ?? 5
                      const isCritical = qty <= alertLimit
                      const isSelected = selectedProductIds.includes(p.id)

                      return (
                        <tr
                          key={p.id}
                          className={`transition-colors hover:bg-muted/30 ${
                            isSelected ? 'bg-primary/5' : idx % 2 === 0 ? '' : 'bg-muted/10'
                          }`}
                        >
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => toggleSelectProduct(p.id)}
                              className="p-1 text-muted-foreground hover:text-foreground"
                            >
                              {isSelected ? (
                                <CheckSquare className="h-4 w-4 text-primary" />
                              ) : (
                                <Square className="h-4 w-4 opacity-50" />
                              )}
                            </button>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              <Package className="h-4 w-4 text-muted-foreground/60 shrink-0" />
                              <span className="font-semibold text-foreground truncate max-w-[240px]">
                                {p.name}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                            {p.barcode || '—'}
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">
                            {p.supplier?.name || '—'}
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-primary">
                            {formatCurrency(p.sellingPrice)}
                          </td>
                          <td className="px-4 py-3 text-right text-xs text-muted-foreground">
                            {p.basePrice ? formatCurrency(p.basePrice) : '—'}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <Badge
                              variant={isCritical ? 'destructive' : 'default'}
                              className="text-xs font-semibold px-2 py-0.5"
                            >
                              {qty}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-xs"
                                onClick={() => setSelectedDetailProductId(p.id)}
                                title="Voir la fiche détaillée"
                              >
                                <Eye className="h-3.5 w-3.5 text-primary" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs gap-1 hover:border-primary/50"
                                onClick={(e) => openTransferProduct(p, e)}
                                title="Changer de catégorie"
                              >
                                <ArrowRightLeft className="h-3 w-3 text-primary" />
                                <span>Transférer</span>
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
        </div>
      ) : (
        /* ─────────────────────────────────────────────────────────────────── */
        /* VUE 2 : CATALOGUE GÉNÉRAL DE TOUTES LES CATÉGORIES                 */
        /* ─────────────────────────────────────────────────────────────────── */
        <div className="space-y-6">
          {/* En-tête */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold">Catégories</h1>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })} — Cliquez sur une catégorie pour voir ses produits
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setCleanMode(emptyCategoriesCount > 0 ? 'empty' : 'all')
                  setShowCleanModal(true)
                }}
                disabled={categories.length === 0}
                className="border-red-500/30 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-500/30 dark:text-red-400 dark:hover:bg-red-950/30"
                title="Nettoyer ou purger les catégories"
              >
                <Trash2 className="mr-2 h-4 w-4 text-red-500" />
                Nettoyer
              </Button>
              <Button onClick={openCreate} className="gap-2 shadow-md">
                <Plus className="h-4 w-4" /> Ajouter Catégorie
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="stat-card-green rounded-xl p-5 text-white shadow-lg">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm opacity-80">Total Catégories</p>
                  <p className="mt-1 text-3xl font-bold">{categories.length}</p>
                </div>
                <div className="rounded-lg bg-white/20 p-2.5">
                  <LayoutGrid className="h-5 w-5" />
                </div>
              </div>
            </div>
            <div className="stat-card-slate rounded-xl p-5 text-white shadow-lg">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm opacity-80">Total Produits</p>
                  <p className="mt-1 text-3xl font-bold">{totalProducts}</p>
                </div>
                <div className="rounded-lg bg-white/20 p-2.5">
                  <Package className="h-5 w-5" />
                </div>
              </div>
            </div>
            <div className="stat-card-indigo rounded-xl p-5 text-white shadow-lg">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm opacity-80">Moy. Produits/Cat.</p>
                  <p className="mt-1 text-3xl font-bold">{avgProductsPerCat}</p>
                </div>
                <div className="rounded-lg bg-white/20 p-2.5">
                  <Tag className="h-5 w-5" />
                </div>
              </div>
            </div>
          </div>

          {/* Recherche & Sélecteur par page */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Rechercher catégories par nom ou description..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 h-10 rounded-xl border-border/60 bg-card"
              />
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground self-end sm:self-auto">
              <span>Par page :</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="rounded-md border border-input bg-background px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
              >
                <option value={12}>12</option>
                <option value={24}>24</option>
                <option value={48}>48</option>
              </select>
            </div>
          </div>

          {/* Grille des catégories */}
          {loading && (
            <div className="flex justify-center py-12">
              <div className="h-7 w-7 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          )}
          {!loading && filteredCategories.length === 0 && (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
              <Tag className="h-10 w-10 text-muted-foreground/40" />
              <p className="mt-3 font-medium text-muted-foreground">
                {search ? 'Aucune catégorie trouvée' : 'Aucune catégorie créée'}
              </p>
              {!search && (
                <Button variant="outline" className="mt-4" onClick={openCreate}>
                  <Plus className="mr-2 h-4 w-4" /> Créer la première catégorie
                </Button>
              )}
            </div>
          )}
          {!loading && filteredCategories.length > 0 && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {paginatedCategories.map((cat) => {
                const productCount = products.filter((p) => p.categoryId === cat.id).length
                const initial = cat.name.charAt(0).toUpperCase()
                const color = getColor(cat.name)
                return (
                  <div
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat)}
                    className="group relative rounded-2xl border bg-card p-5 shadow-sm transition-all hover:shadow-lg hover:-translate-y-1 hover:border-primary/50 cursor-pointer"
                  >
                    {/* Actions */}
                    <div
                      className="absolute right-3 top-3 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100 z-10"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={(e) => openEdit(cat, e)}
                        className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                        title="Modifier"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={(e) => handleDelete(cat.id, cat.name, e)}
                        className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                        title="Supprimer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {/* Avatar & Infos */}
                    <div className="flex items-center gap-3.5">
                      <div
                        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-white text-lg font-bold shadow-sm group-hover:scale-105 transition-transform ${color}`}
                      >
                        {initial}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-base text-foreground truncate group-hover:text-primary transition-colors">
                          {cat.name}
                        </p>
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary mt-1">
                          <Package className="h-3 w-3" /> {productCount} Produit
                          {productCount !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>

                    {/* Description */}
                    {cat.description ? (
                      <p className="mt-3 text-xs text-muted-foreground line-clamp-2 min-h-[2rem]">
                        {cat.description}
                      </p>
                    ) : (
                      <p className="mt-3 text-xs text-muted-foreground/50 italic min-h-[2rem]">
                        Aucune description
                      </p>
                    )}

                    {/* Pied de carte avec incitation au clic */}
                    <div className="mt-4 flex items-center justify-between border-t pt-3 text-xs text-muted-foreground">
                      <span className="text-[11px] font-medium text-primary group-hover:underline flex items-center gap-1">
                        Voir les produits →
                      </span>
                      <span className="text-[11px] opacity-70">
                        {new Date(cat.createdAt).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'short'
                        })}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Barre de pagination */}
          {!loading && filteredCategories.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t text-xs text-muted-foreground">
              <div>
                Affichage de <span className="font-semibold text-foreground">{startIndex}</span> à{' '}
                <span className="font-semibold text-foreground">{endIndex}</span> sur{' '}
                <span className="font-semibold text-foreground">{filteredCategories.length}</span> catégorie
                {filteredCategories.length > 1 ? 's' : ''}
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
        </div>
      )}

      {/* Dialog création/édition de catégorie */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Modifier la catégorie' : 'Nouvelle catégorie'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {error && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label>Nom de la catégorie</Label>
              <Input
                placeholder="ex: Électronique"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label>
                Description <span className="text-muted-foreground">(optionnel)</span>
              </Label>
              <Input
                placeholder="Description de la catégorie..."
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            {form.name && (
              <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-lg text-white text-base font-bold ${getColor(
                    form.name
                  )}`}
                >
                  {form.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-medium text-sm">{form.name}</p>
                  <p className="text-xs text-muted-foreground">Aperçu de l'icône</p>
                </div>
              </div>
            )}
            <div className="flex justify-end gap-3 pt-1">
              <Button variant="outline" onClick={() => setShowForm(false)}>
                Annuler
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? 'Enregistrement...' : editing ? 'Modifier' : 'Créer'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Nettoyage / Purge des Catégories */}
      <Dialog open={showCleanModal} onOpenChange={setShowCleanModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-950/50">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle>Nettoyer les catégories</DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Choisissez le mode de nettoyage à exécuter
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-3 pt-2">
            {/* Option 1: Purge des catégories vides */}
            <div
              onClick={() => setCleanMode('empty')}
              className={`flex items-start gap-3 rounded-xl border p-3.5 cursor-pointer transition-all ${
                cleanMode === 'empty'
                  ? 'border-primary bg-primary/5 shadow-sm'
                  : 'border-border/60 hover:bg-muted/40'
              }`}
            >
              <input
                type="radio"
                name="cleanMode"
                checked={cleanMode === 'empty'}
                onChange={() => setCleanMode('empty')}
                className="mt-1 accent-primary cursor-pointer"
              />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-foreground">Catégories vides uniquement</p>
                  <Badge variant="secondary" className="text-[11px] font-bold">
                    {emptyCategoriesCount} vide{emptyCategoriesCount > 1 ? 's' : ''}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Supprime uniquement les catégories qui ne contiennent aucun produit. Vos produits et les catégories utilisées restent intacts.
                </p>
              </div>
            </div>

            {/* Option 2: Nettoyage total */}
            <div
              onClick={() => setCleanMode('all')}
              className={`flex items-start gap-3 rounded-xl border p-3.5 cursor-pointer transition-all ${
                cleanMode === 'all'
                  ? 'border-destructive bg-destructive/5 shadow-sm'
                  : 'border-border/60 hover:bg-muted/40'
              }`}
            >
              <input
                type="radio"
                name="cleanMode"
                checked={cleanMode === 'all'}
                onChange={() => setCleanMode('all')}
                className="mt-1 accent-destructive cursor-pointer"
              />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-destructive">Toutes les catégories</p>
                  <Badge variant="destructive" className="text-[11px] font-bold">
                    {categories.length} au total
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Supprime la totalité des catégories ({categories.length}). Les produits associés ne sont <strong className="text-foreground">pas supprimés</strong>, ils seront simplement remis sans catégorie.
                </p>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 mt-4">
            <Button
              variant="outline"
              onClick={() => setShowCleanModal(false)}
              disabled={cleaning}
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={handleCleanCategories}
              disabled={cleaning || (cleanMode === 'empty' && emptyCategoriesCount === 0)}
              className="bg-red-600 hover:bg-red-700 text-white gap-2"
            >
              {cleaning ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Nettoyage en cours...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  {cleanMode === 'empty'
                    ? `Purger ${emptyCategoriesCount} catégorie${emptyCategoriesCount > 1 ? 's' : ''} vide${emptyCategoriesCount > 1 ? 's' : ''}`
                    : `Supprimer les ${categories.length} catégories`}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Vider les produits de la catégorie active */}
      <Dialog open={showClearProductsModal} onOpenChange={setShowClearProductsModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3 text-amber-600 dark:text-amber-400">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-950/50">
                <Eraser className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle>Vider la catégorie "{selectedCategory?.name}"</DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Désassocier tous les produits associés
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-3 pt-2">
            <div className="rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 p-4 text-xs text-amber-800 dark:text-amber-200 space-y-2">
              <div className="flex items-center gap-2 font-semibold">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>Information importante</span>
              </div>
              <p>
                Vous êtes sur le point de retirer <strong>{categoryProducts.length} produit{categoryProducts.length > 1 ? 's' : ''}</strong> de cette catégorie.
              </p>
              <p className="text-muted-foreground dark:text-amber-300/80">
                Les produits resteront dans le catalogue et ne perdront pas leur stock ni leur historique de vente. Ils deviendront simplement « Sans catégorie ».
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 mt-4">
            <Button
              variant="outline"
              onClick={() => setShowClearProductsModal(false)}
              disabled={clearingProducts}
            >
              Annuler
            </Button>
            <Button
              variant="default"
              onClick={handleClearCurrentCategoryProducts}
              disabled={clearingProducts || categoryProducts.length === 0}
              className="bg-amber-600 hover:bg-amber-700 text-white gap-2"
            >
              {clearingProducts ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Dissociation en cours...
                </>
              ) : (
                <>
                  <Eraser className="h-4 w-4" />
                  Oui, vider la catégorie ({categoryProducts.length})
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Transfert de Produit(s) vers une autre catégorie */}
      <Dialog open={showTransferDialog} onOpenChange={setShowTransferDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3 text-primary">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <ArrowRightLeft className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle>Transférer vers une autre catégorie</DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  {productToTransfer
                    ? `Déplacer « ${productToTransfer.name} »`
                    : `Déplacer ${selectedProductIds.length} produit${selectedProductIds.length > 1 ? 's' : ''} sélectionné${selectedProductIds.length > 1 ? 's' : ''}`}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Catégorie de destination</Label>
              <select
                value={transferTargetCategory}
                onChange={(e) => setTransferTargetCategory(e.target.value)}
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
              >
                <option value="">-- Sélectionner une catégorie --</option>
                <option value="__none__">Sans catégorie (Retirer de toute catégorie)</option>
                {categories
                  .filter((c) => c.id !== selectedCategory?.id)
                  .map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
              </select>
            </div>

            {transferTargetCategory && transferTargetCategory !== '__none__' && (
              <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
                {(() => {
                  const targetCat = categories.find((c) => c.id === transferTargetCategory)
                  if (!targetCat) return null
                  return (
                    <>
                      <div
                        className={`flex h-9 w-9 items-center justify-center rounded-lg text-white text-sm font-bold ${getColor(
                          targetCat.name
                        )}`}
                      >
                        {targetCat.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{targetCat.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {targetCat.description || 'Catégorie de destination'}
                        </p>
                      </div>
                    </>
                  )
                })()}
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0 mt-4">
            <Button
              variant="outline"
              onClick={() => setShowTransferDialog(false)}
              disabled={transferringProducts}
            >
              Annuler
            </Button>
            <Button
              onClick={handleTransferProducts}
              disabled={transferringProducts || !transferTargetCategory}
              className="gap-2"
            >
              {transferringProducts ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Transfert en cours...
                </>
              ) : (
                <>
                  <ArrowRightLeft className="h-4 w-4" />
                  Confirmer le transfert
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Fiche Produit Détaillée */}
      <ProductDetailModal
        productId={selectedDetailProductId}
        open={!!selectedDetailProductId}
        onOpenChange={(open) => !open && setSelectedDetailProductId(null)}
      />
    </div>
  )
}
