import { useState } from 'react'
import { ShoppingBag, RefreshCw, FileDown, Package, Mail, Phone, Warehouse, CheckCircle2, Store } from 'lucide-react'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { cn } from '@/lib/utils'
import { useEntrepotStore } from '../stores/entrepotStore'
import type { PurchaseOrderItem } from '../../../shared/types'

export default function Achats() {
  const { selectedId: workspaceId } = useEntrepotStore()
  const [loading, setLoading] = useState(false)
  const [orders, setOrders] = useState<PurchaseOrderItem[]>([])
  const [pdfPath, setPdfPath] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirming, setConfirming] = useState<string | null>(null)
  const [toMagasin, setToMagasin] = useState<Record<string, boolean>>({})
  const [unitPrices, setUnitPrices] = useState<Record<string, string>>({})

  async function handleAnalyze() {
    try {
      setLoading(true)
      setError(null)
      setDone(false)
      const result = await window.api.analyzeStock()
      setOrders(result.orders)
      setPdfPath(result.pdfPath)
      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur d\'analyse')
    } finally { setLoading(false) }
  }

  function toggleMagasin(productId: string) {
    setToMagasin(prev => ({ ...prev, [productId]: !prev[productId] }))
  }

  async function handleConfirmPurchase(supplierName: string, items: PurchaseOrderItem[]) {
    if (!workspaceId || !supplierName || items.length === 0) return
    try {
      setConfirming(supplierName)
      await window.api.confirmPurchase({
        warehouseId: workspaceId,
        supplierName,
        items: items.map((i) => ({
          productId: i.productId,
          productName: i.productName,
          quantity: i.suggestedQuantity,
          unitPrice: parseFloat(unitPrices[i.productId]) || 0,
          sendToMagasin: !!toMagasin[i.productId]
        }))
      })
    } catch (err) {
      console.error('Erreur confirmation achat', err)
    } finally { setConfirming(null) }
  }

  // Group by supplier
  const bySupplier: Record<string, PurchaseOrderItem[]> = {}
  for (const o of orders) {
    if (!bySupplier[o.supplierName]) bySupplier[o.supplierName] = []
    bySupplier[o.supplierName].push(o)
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShoppingBag className="h-6 w-6 text-primary" /> Achats & Réapprovisionnement
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Analyse des stocks critiques et génération de bons de commande</p>
        </div>
        <Button onClick={handleAnalyze} disabled={loading} className="gap-2 shadow-md">
          {loading ? <><RefreshCw className="h-4 w-4 animate-spin" /> Analyse…</> : <><RefreshCw className="h-4 w-4" /> Analyser le stock</>}
        </Button>
      </div>

      {error && <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive">{error}</div>}

      {!done && !loading && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-20 text-center">
          <RefreshCw className="h-12 w-12 text-primary/30" />
          <p className="mt-4 text-lg font-semibold text-muted-foreground">Analyser le stock</p>
          <p className="mt-1 text-sm text-muted-foreground max-w-sm">
            Cliquez sur "Analyser le stock" pour identifier les produits sous seuil critique et générer automatiquement un bon de commande PDF.
          </p>
          <Button onClick={handleAnalyze} className="mt-6" variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" /> Lancer l'analyse
          </Button>
        </div>
      )}

      {done && orders.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
          <Package className="h-12 w-12 text-emerald-500/60" />
          <p className="mt-3 text-lg font-semibold text-emerald-600">✓ Aucun réapprovisionnement nécessaire</p>
          <p className="mt-1 text-sm text-muted-foreground">Tous les stocks sont au-dessus de leur seuil critique.</p>
        </div>
      )}

      {done && orders.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border bg-amber-50 px-5 py-4 dark:bg-amber-950/20">
            <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
              ⚠️ {orders.length} produit{orders.length !== 1 ? 's' : ''} nécessitent un réapprovisionnement urgent
            </p>
            {pdfPath && (
              <Button variant="outline" size="sm" className="gap-2 text-amber-700 border-amber-300 hover:bg-amber-100 dark:text-amber-400 dark:border-amber-800">
                <FileDown className="h-4 w-4" /> PDF généré sur le bureau
              </Button>
            )}
          </div>

          {Object.entries(bySupplier).map(([supplier, items]) => (
            <div key={supplier} className="rounded-lg border bg-card shadow-sm overflow-hidden">
              <div className="bg-muted/40 px-5 py-3 border-b">
                <div className="flex items-center justify-between">
                  <p className="font-semibold flex items-center gap-2">
                    <Package className="h-4 w-4 text-primary" /> {supplier}
                  </p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 text-emerald-600 border-emerald-300 hover:bg-emerald-50 dark:text-emerald-400 dark:border-emerald-800"
                      onClick={() => handleConfirmPurchase(supplier, items)}
                      disabled={confirming === supplier}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {confirming === supplier ? 'Confirmation...' : 'Confirmer la réception'}
                    </Button>
                    {items.some(i => toMagasin[i.productId]) && (
                      <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                        {items.filter(i => toMagasin[i.productId]).length} au magasin
                      </span>
                    )}
                </div>
                <div className="mt-0.5 flex flex-wrap gap-4 text-xs text-muted-foreground">
                  {items[0].supplierEmail && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{items[0].supplierEmail}</span>}
                  {items[0].supplierPhone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{items[0].supplierPhone}</span>}
                </div>
              </div>
              <div className="divide-y">
                {items.map((o, i) => {
                  const isMagasin = !!toMagasin[o.productId]
                  return (
                    <div key={i} className="flex items-center gap-4 px-5 py-4">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{o.productName}</p>
                        <p className="text-xs text-muted-foreground">Code : {o.productBarcode}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Warehouse className="h-3 w-3" /> {o.warehouseName}
                        </p>
                      </div>
                      <button
                        onClick={() => toggleMagasin(o.productId)}
                        className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                          isMagasin
                            ? 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-400'
                            : 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400'
                        }`}
                      >
                        <Store className="h-3.5 w-3.5" />
                        {isMagasin ? '→ Magasin' : 'Boutique'}
                      </button>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs text-muted-foreground">Stock actuel / Seuil</p>
                        <p className="font-semibold text-rose-600 text-sm">{o.currentStock} / {o.alertLimit}</p>
                        <div className="mt-2">
                          <label className="text-xs text-muted-foreground">Prix unitaire</label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={unitPrices[o.productId] ?? ''}
                            onChange={(e) => setUnitPrices(prev => ({ ...prev, [o.productId]: e.target.value }))}
                            placeholder="0"
                            className="mt-0.5 w-full rounded border px-2 py-1 text-right text-xs"
                          />
                        </div>
                        <div className={cn(
                          'mt-1 inline-block rounded-full px-2.5 py-0.5 text-xs font-bold text-white',
                          isMagasin ? 'bg-amber-600' : 'bg-primary'
                        )}>
                          {isMagasin ? '→ Magasin : ' : 'Commander : '}{o.suggestedQuantity}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
