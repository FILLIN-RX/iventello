import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { AlertTriangle, Search, TrendingDown, Package, BookOpen, RotateCw, FileDown, ClipboardList, CheckCircle2, Loader2 } from 'lucide-react'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { Input } from '../components/ui/input'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { feedback } from '../stores/feedbackStore'
import { useEntrepotStore } from '../stores/entrepotStore'
import type { StockAlert, BookStockAlert } from '../../../shared/types'

const PAGE_SIZE = 20

interface UnifiedAlert {
  id: string
  name: string
  type: 'product' | 'book'
  barcode?: string
  warehouse: string
  warehouseId?: string
  quantity: number
  alertLimit: number
  sellingPrice?: number
  subtitle?: string
  className?: string
}

export default function StockFaible() {
  const selectedId = useEntrepotStore((s) => s.selectedId)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'product' | 'book'>('all')
  const [exporting, setExporting] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<string | null>(null)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  const { data: alerts = [], isLoading: loading, isFetching, refetch } = useQuery<UnifiedAlert[]>({
    queryKey: ['stock-alerts-unified', selectedId],
    staleTime: 2 * 60_000,
    placeholderData: keepPreviousData,
    queryFn: async () => {
      try {
        const [productAlerts, bookAlerts] = await Promise.all([
          (window.api.getStockAlerts().catch(() => []) as Promise<StockAlert[]>),
          (window.api.getBookStockAlerts().catch(() => []) as Promise<BookStockAlert[]>)
        ])

        const unified: UnifiedAlert[] = [
          ...(Array.isArray(productAlerts) ? productAlerts : [])
            .filter(a => a && a.product)
            .map(a => ({
              id: a.product?.id ?? Math.random().toString(),
              name: a.product?.name ?? 'Produit sans nom',
              type: 'product' as const,
              barcode: a.product?.barcode ?? undefined,
              warehouse: a.warehouse?.name ?? a.stock?.warehouse?.name ?? 'Boutique par défaut',
              warehouseId: a.warehouse?.id ?? a.stock?.warehouse?.id,
              quantity: a.stock?.quantity ?? 0,
              alertLimit: a.stock?.alertLimit ?? 0,
              sellingPrice: a.product?.sellingPrice ?? 0,
              subtitle: (a.product as any)?.supplier?.name ?? undefined
            })),
          ...(Array.isArray(bookAlerts) ? bookAlerts : [])
            .filter(a => a && a.book)
            .map(a => ({
              id: a.book?.id ?? Math.random().toString(),
              name: a.book?.title ?? 'Livre sans titre',
              type: 'book' as const,
              barcode: a.book?.isbn ?? undefined,
              warehouse: a.warehouse?.name ?? 'Boutique par défaut',
              warehouseId: a.warehouse?.id,
              quantity: a.stock?.quantity ?? 0,
              alertLimit: a.stock?.alertLimit ?? 0,
              sellingPrice: (a.book as any)?.sellingPrice ?? (a.book as any)?.price ?? 0,
              subtitle: a.book?.author ?? undefined,
              className: (a.stock as any)?.classLevel?.name || (a.book as any)?.classLevel?.name || (a.stock as any)?.classLevel?.code || (a.book as any)?.classLevel?.code || undefined
            }))
        ]

        return unified
      } catch (err) {
        console.error('Erreur chargement alertes stock:', err)
        return []
      }
    }
  })

  const filtered = useMemo(() => {
    return alerts.filter(a => {
      if (selectedId && a.warehouseId && a.warehouseId !== selectedId) return false
      const q = search.toLowerCase()
      const matchesSearch =
        (a.name && a.name.toLowerCase().includes(q)) ||
        (a.warehouse && a.warehouse.toLowerCase().includes(q)) ||
        (a.barcode && a.barcode.toLowerCase().includes(q)) ||
        (a.subtitle && a.subtitle.toLowerCase().includes(q)) ||
        (a.className && a.className.toLowerCase().includes(q))
      const matchesType = filterType === 'all' || a.type === filterType
      return matchesSearch && matchesType
    })
  }, [alerts, search, filterType, selectedId])

  // Reset la pagination quand search ou filtre changent
  useEffect(() => {
    setVisibleCount(PAGE_SIZE)
  }, [search, filterType])

  const visibleAlerts = filtered.slice(0, visibleCount)
  const hasMore = visibleCount < filtered.length

  // IntersectionObserver pour déclencher le chargement suivant
  const loadMore = useCallback(() => {
    setVisibleCount(prev => Math.min(prev + PAGE_SIZE, filtered.length))
  }, [filtered.length])

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return

    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore) {
          loadMore()
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasMore, loadMore])

  const productCount = alerts.filter(a => a.type === 'product').length
  const bookCount = alerts.filter(a => a.type === 'book').length

  async function handleAnalyze() {
    try {
      setAnalyzing(true)
      const result = await window.api.analyzeStock()
      if (result && result.orders) {
        setAnalysisResult(`Bon de commande généré avec succès dans : ${result.pdfPath || 'votre Bureau'} (${result.orders.length} produit(s))`)
      } else {
        setAnalysisResult('Analyse terminée. Aucun fournisseur ou article critique à commander.')
      }
    } catch (err) {
      console.error(err)
      setAnalysisResult("Erreur lors de la génération du bon de commande.")
    } finally {
      setAnalyzing(false)
    }
  }

  async function handleExport() {
    try {
      setExporting(true)
      const totalValue = alerts.reduce(
        (s, a) => s + (a.sellingPrice ?? 0) * a.quantity,
        0
      )
      const path = await window.api.exportStockReport({
        products: alerts.map(a => ({
          name: a.name ?? '',
          barcode: a.barcode ?? '',
          sellingPrice: a.sellingPrice ?? 0,
          quantity: a.quantity ?? 0,
          alertLimit: a.alertLimit ?? 0,
          warehouse: a.warehouse
        })),
        alerts: alerts.map(a => ({
          name: a.name,
          barcode: a.barcode ?? '',
          quantity: a.quantity,
          alertLimit: a.alertLimit,
          warehouse: a.warehouse
        })),
        totalProducts: alerts.length,
        totalValue,
        alertCount: alerts.length,
        date: new Date().toLocaleString('fr-FR')
      })
      feedback.toast.success('Rapport PDF exporté', `Fichier enregistré sur votre bureau : ${path}`)
    } catch (err: any) {
      console.error(err)
      feedback.toast.error(err?.message || 'Erreur lors de l\'exportation du rapport PDF', 'Erreur')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-amber-500" /> Stock Faible
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Articles dont la quantité est inférieure ou égale au seuil critique</p>
        </div>
        <div className="flex items-center flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleAnalyze}
            disabled={analyzing}
            className="gap-1.5"
          >
            <ClipboardList className={`h-4 w-4 ${analyzing ? 'animate-pulse text-primary' : ''}`} />
            {analyzing ? 'Analyse...' : 'Commander auto (PDF)'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={exporting || alerts.length === 0}
            className="gap-1.5"
          >
            <FileDown className="h-4 w-4" />
            {exporting ? 'Export...' : 'Exporter PDF'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="gap-1.5"
          >
            <RotateCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
          <div className="rounded-lg bg-amber-500 px-4 py-1.5 text-sm font-bold text-white shadow-sm">
            {alerts.length} alerte{alerts.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* Analysis Result Banner */}
      {analysisResult && (
        <div className="flex items-center justify-between rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-3.5 text-sm text-emerald-800 dark:text-emerald-300 animate-fade-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
            <span>{analysisResult}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setAnalysisResult(null)} className="h-7 text-xs">
            Fermer
          </Button>
        </div>
      )}

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher par nom, code-barres, auteur, classe ou boutique..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10 h-11 rounded-lg"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={filterType === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterType('all')}
            className="h-11"
          >
            Tous ({alerts.length})
          </Button>
          <Button
            variant={filterType === 'product' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterType('product')}
            className="h-11"
          >
            Produits ({productCount})
          </Button>
          <Button
            variant={filterType === 'book' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterType('book')}
            className="h-11"
          >
            Livres ({bookCount})
          </Button>
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex justify-center py-12">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      )}

      {/* Empty state */}
      {!loading && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
          <Package className="h-10 w-10 text-emerald-500/60" />
          <p className="mt-3 font-semibold text-muted-foreground">
            {search || filterType !== 'all' ? 'Aucun article trouvé pour ces critères' : '✓ Tous les stocks sont au-dessus de leur seuil d\'alerte !'}
          </p>
        </div>
      )}

      {/* List */}
      {!loading && filtered.length > 0 && (
        <>
          <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
            <div className="divide-y">
              {visibleAlerts.map((a, i) => {
                const alertLimit = Math.max(a.alertLimit, 1)
                const pct = Math.max(0, Math.min(100, (a.quantity / alertLimit) * 100))
                const isRupture = a.quantity <= 0
                const barColor = isRupture ? 'bg-rose-600' : pct <= 35 ? 'bg-rose-500' : 'bg-amber-500'

                return (
                  <div key={`${a.id}-${i}`} className="flex items-center gap-4 px-5 py-4 hover:bg-muted/40 transition-colors">
                    <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${
                      a.type === 'book'
                        ? 'bg-blue-100 dark:bg-blue-950/40'
                        : isRupture
                          ? 'bg-rose-100 dark:bg-rose-950/40'
                          : 'bg-amber-100 dark:bg-amber-950/40'
                    }`}>
                      {a.type === 'book' ? (
                        <BookOpen className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      ) : isRupture ? (
                        <AlertTriangle className="h-5 w-5 text-rose-600 dark:text-rose-400" />
                      ) : (
                        <TrendingDown className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-semibold text-sm truncate">{a.name}</p>
                        <span className={`ml-2 flex-shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                          isRupture
                            ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400'
                        }`}>
                          {a.quantity} / {a.alertLimit}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground flex-wrap">
                        <span>{a.warehouse}</span>
                        {a.barcode && <span>• Code : {a.barcode}</span>}
                        {a.type === 'book' && <Badge variant="outline" className="text-[10px] py-0">Livre</Badge>}
                        {a.className && (
                          <Badge variant="secondary" className="text-[10px] py-0 bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200">
                            Classe : {a.className}
                          </Badge>
                        )}
                        {a.subtitle && <span>• {a.subtitle}</span>}
                      </div>
                      <div className="mt-2 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-300 ${barColor}`} style={{ width: `${Math.max(pct, isRupture ? 0 : 5)}%` }} />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Sentinel + indicateur de chargement infinite scroll */}
          <div ref={sentinelRef} className="flex items-center justify-center py-4">
            {hasMore ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Chargement… ({visibleCount} / {filtered.length})</span>
              </div>
            ) : filtered.length > PAGE_SIZE ? (
              <p className="text-xs text-muted-foreground">
                ✓ Tous les {filtered.length} articles affichés
              </p>
            ) : null}
          </div>
        </>
      )}
    </div>
  )
}

