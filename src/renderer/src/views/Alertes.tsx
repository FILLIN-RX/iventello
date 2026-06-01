import { useState } from 'react'
import { AlertTriangle, RefreshCw, FileDown, ClipboardList } from 'lucide-react'
import { useStockAlerts } from '../hooks/useStockAlerts'
import { useProducts } from '../hooks/useProducts'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import type { StockAlert } from '../../../shared/types'

function Alertes() {
  const { alerts, loading, error, refetch } = useStockAlerts()
  const { products } = useProducts()
  const [exporting, setExporting] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<string | null>(null)

  const groups = new Map<string, StockAlert[]>()
  const noWarehouse: StockAlert[] = []
  for (const a of alerts) {
    const key = a.warehouse?.name ?? 'Sans entrepôt'
    if (key === 'Sans entrepôt') noWarehouse.push(a)
    else { const g = groups.get(key) ?? []; g.push(a); groups.set(key, g) }
  }
  const groupEntries: [string, StockAlert[]][] = [...groups.entries()]
  if (noWarehouse.length > 0) groupEntries.push(['Sans entrepôt', noWarehouse])

  async function handleExport() {
    try {
      setExporting(true)
      const totalValue = products.reduce((s, p) => s + p.sellingPrice * (p.stocks?.reduce((a, st) => a + st.quantity, 0) ?? 0), 0)
      const path = await window.api.exportStockReport({
        products: products.flatMap(p => (p.stocks ?? []).map(st => ({ name: p.name, barcode: p.barcode, sellingPrice: p.sellingPrice, quantity: st.quantity, alertLimit: st.alertLimit, warehouse: st.warehouse.name }))),
        alerts: alerts.map(a => ({ name: a.product.name, barcode: a.product.barcode, quantity: a.stock.quantity, alertLimit: a.stock.alertLimit, warehouse: a.warehouse.name })),
        totalProducts: products.length, totalValue, alertCount: alerts.length, date: new Date().toLocaleString('fr-FR')
      })
      alert(`Rapport exporté : ${path}`)
    } catch (err) { console.error(err); alert("Erreur d'export.") }
    finally { setExporting(false) }
  }

  async function handleAnalyze() {
    try {
      setAnalyzing(true)
      const result = await window.api.analyzeStock()
      setAnalysisResult(`Bon de commande généré : ${result.pdfPath} (${result.orders.length} produit(s))`)
    } catch (err) { console.error(err); alert("Erreur d'analyse.") }
    finally { setAnalyzing(false) }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Alertes de stock</h2>
          <p className="text-sm text-muted-foreground">Produits dont le stock ≤ seuil critique</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleAnalyze} disabled={analyzing}>
            <ClipboardList className={`mr-2 h-4 w-4 ${analyzing ? 'animate-pulse' : ''}`} />
            {analyzing ? 'Analyse...' : 'Analyser & commander'}
          </Button>
          <Button variant="outline" onClick={refetch} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
          <Button onClick={handleExport} disabled={exporting || products.length === 0}>
            <FileDown className="mr-2 h-4 w-4" />{exporting ? 'Export...' : 'Exporter PDF'}
          </Button>
        </div>
      </div>

      {analysisResult && (
        <div className="rounded-md bg-green-50 border border-green-200 p-3 text-sm text-green-800">{analysisResult}
          <Button variant="ghost" size="sm" className="ml-2" onClick={() => setAnalysisResult(null)}>OK</Button>
        </div>
      )}

      {loading && <p className="text-muted-foreground">Analyse des stocks...</p>}
      {error && <p className="text-destructive">Erreur : {error}</p>}

      {!loading && alerts.length === 0 && (
        <Card><CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <AlertTriangle className="mx-auto mb-2 h-8 w-8 text-green-500" />
            <p className="font-medium">Aucune alerte</p>
            <p className="text-sm text-muted-foreground">Tous les stocks sont au-dessus de leur seuil critique.</p>
          </div>
        </CardContent></Card>
      )}

      {!loading && groupEntries.map(([name, items]) => (
        <div key={name}>
          <h3 className="mb-3 text-sm font-medium text-muted-foreground uppercase tracking-wide">{name}</h3>
          <div className="space-y-2">
            {items.map((alert) => (
              <Card key={`${alert.product.id}-${alert.stock.id}`}>
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
                    <div>
                      <p className="font-medium">{alert.product.name}</p>
                      <p className="text-xs text-muted-foreground">Code : {alert.product.barcode}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-sm"><span className="font-medium">{alert.stock.quantity}</span><span className="text-muted-foreground"> / {alert.stock.alertLimit}</span></p>
                      <p className="text-xs text-muted-foreground">Stock / Seuil</p>
                    </div>
                    <Badge variant={alert.stock.quantity <= 0 ? 'destructive' : 'outline'}>
                      {alert.stock.quantity <= 0 ? 'Rupture' : 'Critique'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export default Alertes
