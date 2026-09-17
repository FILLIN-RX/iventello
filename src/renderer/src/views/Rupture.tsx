import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { XCircle, Search, Package, BookOpen, RotateCw, Loader2 } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { Input } from '../components/ui/input'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { useEntrepotStore } from '../stores/entrepotStore'
import type { ProductWithRelations, BookStockAlert } from '../../../shared/types'

const PAGE_SIZE = 20

interface UnifiedRupture {
  id: string
  name: string
  type: 'product' | 'book'
  barcode?: string
  subtitle?: string
  warehouse: string
  className?: string
}

export default function Rupture() {
  const selectedId = useEntrepotStore((s) => s.selectedId)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'product' | 'book'>('all')
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  const { data: ruptured = [], isLoading: loading, isFetching, refetch } = useQuery<UnifiedRupture[]>({
    queryKey: ['rupture-unified', selectedId],
    queryFn: async () => {
      const [prods, bookAlerts] = await Promise.all([
        window.api.getProducts(selectedId || undefined) as Promise<ProductWithRelations[]>,
        window.api.getRupturedBooks().catch(() => []) as Promise<BookStockAlert[]>
      ])
      const products: UnifiedRupture[] = (prods || [])
        .filter(p => {
          if (selectedId) {
            const s = p.stocks.find(st => st.warehouse?.id === selectedId)
            return !s || s.quantity === 0
          }
          return p.stocks.length === 0 || p.stocks.every(s => s.quantity === 0)
        })
        .map(p => {
          const s = selectedId
            ? p.stocks.find(st => st.warehouse?.id === selectedId)
            : p.stocks[0]
          return {
            id: p.id,
            name: p.name,
            type: 'product' as const,
            barcode: p.barcode,
            subtitle: p.supplier?.name,
            warehouse: s?.warehouse?.name ?? '—'
          }
        })
      const books: UnifiedRupture[] = (bookAlerts || [])
        .filter(a => !selectedId || a.warehouse.id === selectedId)
        .map(a => ({
          id: a.book.id,
          name: a.book.title,
          type: 'book' as const,
          barcode: a.book.isbn ?? undefined,
          subtitle: a.book.author ?? undefined,
          warehouse: a.warehouse.name,
          className: (a.stock as any)?.classLevel?.name || (a.book as any)?.classLevel?.name || (a.stock as any)?.classLevel?.code || (a.book as any)?.classLevel?.code || undefined
        }))
      return [...products, ...books]
    }
  })

  const filtered = useMemo(() => {
    return ruptured.filter(p => {
      const matchesSearch =
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.barcode && p.barcode.toLowerCase().includes(search.toLowerCase())) ||
        (p.subtitle && p.subtitle.toLowerCase().includes(search.toLowerCase())) ||
        (p.className && p.className.toLowerCase().includes(search.toLowerCase())) ||
        p.warehouse.toLowerCase().includes(search.toLowerCase())
      const matchesType = filterType === 'all' || p.type === filterType
      return matchesSearch && matchesType
    })
  }, [ruptured, search, filterType])

  // Reset pagination quand search ou filtre changent
  useEffect(() => {
    setVisibleCount(PAGE_SIZE)
  }, [search, filterType])

  const visibleItems = filtered.slice(0, visibleCount)
  const hasMore = visibleCount < filtered.length

  const loadMore = useCallback(() => {
    setVisibleCount(prev => Math.min(prev + PAGE_SIZE, filtered.length))
  }, [filtered.length])

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore) loadMore()
      },
      { threshold: 0.1, rootMargin: '100px' }
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasMore, loadMore])

  const productCount = ruptured.filter(a => a.type === 'product').length
  const bookCount = ruptured.filter(a => a.type === 'book').length

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <XCircle className="h-6 w-6 text-rose-500" /> Rupture de stock
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Articles totalement épuisés (stock = 0)</p>
        </div>
        <div className="flex items-center gap-3">
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
          <div className="rounded-lg bg-rose-500 px-4 py-2 text-sm font-bold text-white shadow-md">
            {ruptured.length} article{ruptured.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

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
            Tous ({ruptured.length})
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

      {loading && (
        <div className="flex justify-center py-12">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
          <Package className="h-10 w-10 text-emerald-500/60" />
          <p className="mt-3 font-semibold text-muted-foreground">
            {search || filterType !== 'all' ? 'Aucun article trouvé pour ces critères' : '✓ Aucun article en rupture de stock !'}
          </p>
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <>
          <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
            <div className="divide-y">
              {visibleItems.map(item => (
                <div key={item.id} className="flex items-center gap-4 px-5 py-4 hover:bg-muted/40 transition-colors">
                  <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${item.type === 'book' ? 'bg-blue-100 dark:bg-blue-950/40' : 'bg-rose-100 dark:bg-rose-950/40'}`}>
                    {item.type === 'book'
                      ? <BookOpen className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      : <XCircle className="h-5 w-5 text-rose-600 dark:text-rose-400" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{item.name}</p>
                    {item.barcode && <p className="text-xs text-muted-foreground">Code : {item.barcode}</p>}
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <p className="text-xs text-muted-foreground">{item.warehouse}</p>
                      {item.type === 'book' && <Badge variant="outline" className="text-[10px]">Livre</Badge>}
                      {item.className && (
                        <Badge variant="secondary" className="text-[10px] py-0 bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200">
                          Classe : {item.className}
                        </Badge>
                      )}
                      {item.subtitle && <p className="text-xs text-muted-foreground">— {item.subtitle}</p>}
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-bold text-rose-700 dark:bg-rose-950/40 dark:text-rose-400">
                      ÉPUISÉ
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Sentinel infinite scroll */}
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
