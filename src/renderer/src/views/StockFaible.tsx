import { useEffect, useState } from 'react'
import { AlertTriangle, Search, TrendingDown, Package } from 'lucide-react'
import { Input } from '../components/ui/input'
import { Button } from '../components/ui/button'
import type { StockAlert } from '../../../shared/types'

export default function StockFaible() {
  const [alerts, setAlerts] = useState<StockAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    window.api.getStockAlerts().then((a: any) => { setAlerts(a); setLoading(false) })
  }, [])

  const filtered = alerts.filter(a =>
    a.product.name.toLowerCase().includes(search.toLowerCase()) ||
    a.warehouse.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-amber-500" /> Stock Faible
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Produits sous le seuil d'alerte</p>
        </div>
        <div className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-bold text-white shadow-md">
          {alerts.length} alerte{alerts.length !== 1 ? 's' : ''}
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Rechercher par produit ou entrepôt..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 h-11 rounded-lg" />
      </div>

      {loading && <div className="flex justify-center py-12"><div className="h-7 w-7 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>}

      {!loading && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
          <Package className="h-10 w-10 text-emerald-500/60" />
          <p className="mt-3 font-semibold text-muted-foreground">
            {search ? 'Aucun résultat' : '✓ Tous les stocks sont en ordre !'}
          </p>
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
          <div className="divide-y">
            {filtered.map((a, i) => {
              const pct = Math.max(0, Math.min(100, (a.stock.quantity / Math.max(a.stock.alertLimit, 1)) * 100))
              const barColor = pct <= 25 ? 'bg-rose-500' : pct <= 60 ? 'bg-amber-500' : 'bg-emerald-500'
              return (
                <div key={i} className="flex items-center gap-4 px-5 py-4">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-950/40">
                    <TrendingDown className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-sm truncate">{a.product.name}</p>
                      <span className="ml-2 flex-shrink-0 rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-bold text-rose-700 dark:bg-rose-950/40 dark:text-rose-400">
                        {a.stock.quantity} / {a.stock.alertLimit}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{a.warehouse.name}</p>
                    <div className="mt-2 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
