import { useEffect, useState } from 'react'
import { Warehouse, Package, ArrowRight, ShoppingCart, RefreshCw, Truck } from 'lucide-react'
import { useEntrepotStore } from '../stores/entrepotStore'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { formatCurrency } from '@/lib/utils'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog'

interface MagasinStockItem {
  id: string
  productId: string
  warehouseId: string
  quantityMagasin: number
  quantity: number
  alertLimit: number
  product: {
    id: string
    name: string
    barcode: string
    sellingPrice: number
    imageUrl: string | null
    supplier?: { name: string } | null
  }
  warehouse: { name: string }
}

export default function Magasin() {
  const { selectedId, selectedName } = useEntrepotStore()
  const [stocks, setStocks] = useState<MagasinStockItem[]>([])
  const [loading, setLoading] = useState(true)
  const [transferQty, setTransferQty] = useState<Record<string, number>>({})
  const [busy, setBusy] = useState<Record<string, boolean>>({})
  const [success, setSuccess] = useState<string | null>(null)

  async function load() {
    if (!selectedId) return
    setLoading(true)
    try {
      const data = await window.api.getMagasinStock(selectedId)
      setStocks(data)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [selectedId])

  async function handleTransfer(item: MagasinStockItem) {
    const qty = transferQty[item.id] ?? item.quantityMagasin
    if (qty <= 0 || qty > item.quantityMagasin) return
    setBusy(prev => ({ ...prev, [item.id]: true }))
    try {
      await window.api.transferMagasinToBoutique({
        productId: item.productId,
        warehouseId: item.warehouseId,
        quantity: qty
      })
      setTransferQty(prev => ({ ...prev, [item.id]: 0 }))
      setSuccess(`${item.product.name} : ${qty} transféré${qty > 1 ? 's' : ''} à la boutique`)
      setTimeout(() => setSuccess(null), 3000)
      load()
    } catch (e) { console.error(e) }
    finally { setBusy(prev => ({ ...prev, [item.id]: false })) }
  }

  if (!selectedId) {
    return <div className="flex items-center justify-center py-20 text-muted-foreground">Sélectionnez un entrepôt</div>
  }

  const totalItems = stocks.reduce((s, i) => s + i.quantityMagasin, 0)
  const totalValue = stocks.reduce((s, i) => s + i.quantityMagasin * i.product.sellingPrice, 0)

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Warehouse className="h-6 w-6 text-primary" /> Magasin
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Stock de réserve de <strong>{selectedName}</strong>
          </p>
        </div>
        <div className="flex gap-4">
          <div className="rounded-lg border bg-card px-4 py-2 text-center">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Articles en réserve</p>
            <p className="text-xl font-bold text-primary">{totalItems}</p>
          </div>
          <div className="rounded-lg border bg-card px-4 py-2 text-center">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Valeur stock</p>
            <p className="text-xl font-bold text-emerald-600">{formatCurrency(totalValue)}</p>
          </div>
        </div>
      </div>

      {success && (
        <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700 dark:bg-emerald-950/20 dark:border-emerald-800 dark:text-emerald-400">
          <Truck className="h-4 w-4 inline mr-1.5" />{success}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16"><div className="h-7 w-7 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>
      ) : stocks.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-20 text-center">
          <Package className="h-12 w-12 text-muted-foreground/30" />
          <p className="mt-4 text-lg font-semibold text-muted-foreground">Magasin vide</p>
          <p className="mt-1 text-sm text-muted-foreground max-w-sm">
            Aucun produit en réserve. Effectuez un achat vers le magasin ou transférez des produits depuis la boutique.
          </p>
        </div>
      ) : (
        <div className="overflow-auto rounded-xl border shadow-sm">
          <table className="w-full min-w-max text-sm border-collapse">
            <thead>
              <tr className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 sticky top-0 z-10">
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground border-b whitespace-nowrap">Produit</th>
                <th className="px-4 py-3 text-right font-semibold text-muted-foreground border-b whitespace-nowrap">Code</th>
                <th className="px-4 py-3 text-right font-semibold text-muted-foreground border-b whitespace-nowrap">En réserve</th>
                <th className="px-4 py-3 text-right font-semibold text-muted-foreground border-b whitespace-nowrap">En boutique</th>
                <th className="px-4 py-3 text-right font-semibold text-muted-foreground border-b whitespace-nowrap">Prix vente</th>
                <th className="px-4 py-3 text-center font-semibold text-muted-foreground border-b whitespace-nowrap">Quantité à transférer</th>
                <th className="px-4 py-3 text-center border-b whitespace-nowrap" />
              </tr>
            </thead>
            <tbody>
              {stocks.map((item) => {
                const maxQty = item.quantityMagasin
                const qty = transferQty[item.id] ?? maxQty
                return (
                  <tr key={item.id} className="hover:bg-muted/30 transition-colors border-b border-muted/20">
                    <td className="px-4 py-3 font-medium whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        <span>{item.product.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground font-mono text-xs whitespace-nowrap">{item.product.barcode}</td>
                    <td className="px-4 py-3 text-right font-bold text-amber-600 tabular-nums whitespace-nowrap">{item.quantityMagasin}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground tabular-nums whitespace-nowrap">{item.quantity}</td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums whitespace-nowrap">{formatCurrency(item.product.sellingPrice)}</td>
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        <Input
                          type="number"
                          min={1}
                          max={maxQty}
                          value={qty}
                          onChange={(e) => setTransferQty(prev => ({ ...prev, [item.id]: Math.min(Number(e.target.value) || 0, maxQty) }))}
                          className="h-8 w-20 text-center text-xs"
                        />
                        <span className="text-xs text-muted-foreground">/ {maxQty}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1 text-emerald-600 border-emerald-300 hover:bg-emerald-50 dark:text-emerald-400 dark:border-emerald-800"
                        disabled={busy[item.id] || qty <= 0 || qty > maxQty}
                        onClick={() => handleTransfer(item)}
                      >
                        <ShoppingCart className="h-3.5 w-3.5" />
                        {busy[item.id] ? '...' : 'Transférer'}
                      </Button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}