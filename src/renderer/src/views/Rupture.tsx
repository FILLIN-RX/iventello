import { useEffect, useState } from 'react'
import { XCircle, Search, Package } from 'lucide-react'
import { Input } from '../components/ui/input'
import type { ProductWithRelations } from '../../../shared/types'

export default function Rupture() {
  const [ruptured, setRuptured] = useState<ProductWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    window.api.getProducts().then((prods: any) => {
      const out = (prods as ProductWithRelations[]).filter(p =>
        p.stocks.length === 0 || p.stocks.every(s => s.quantity === 0)
      )
      setRuptured(out)
      setLoading(false)
    })
  }, [])

  const filtered = ruptured.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.barcode.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <XCircle className="h-6 w-6 text-rose-500" /> Rupture de stock
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Produits épuisés (stock = 0)</p>
        </div>
        <div className="rounded-lg bg-rose-500 px-4 py-2 text-sm font-bold text-white shadow-md">
          {ruptured.length} produit{ruptured.length !== 1 ? 's' : ''}
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 h-11 rounded-lg" />
      </div>

      {loading && <div className="flex justify-center py-12"><div className="h-7 w-7 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>}

      {!loading && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
          <Package className="h-10 w-10 text-emerald-500/60" />
          <p className="mt-3 font-semibold text-muted-foreground">
            {search ? 'Aucun résultat' : '✓ Aucun produit en rupture de stock !'}
          </p>
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
          <div className="divide-y">
            {filtered.map(p => (
              <div key={p.id} className="flex items-center gap-4 px-5 py-4">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-rose-100 dark:bg-rose-950/40">
                  <XCircle className="h-5 w-5 text-rose-600 dark:text-rose-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{p.name}</p>
                  <p className="text-xs text-muted-foreground">Code : {p.barcode}</p>
                  {p.supplier && <p className="text-xs text-muted-foreground">Fournisseur : {p.supplier.name}</p>}
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
      )}
    </div>
  )
}
