import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, Package, Truck, ArrowLeft, RotateCw, Store, Check, X } from 'lucide-react'
import { useProducts } from '../hooks/useProducts'
import { useBarcodeScanner } from '../hooks/useBarcodeScanner'
import { useDeviceCheck } from '../hooks/useDeviceCheck'
import { DeviceCheckModal } from '../components/DeviceCheckModal'
import { ReapprovisionnementModal } from '../components/ReapprovisionnementModal'
import { useEntrepotStore } from '../stores/entrepotStore'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Badge } from '../components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { ProduitForm } from './ProduitForm'
import type { ProductWithRelations } from '../../../shared/types'
import { formatCurrency } from '@/lib/utils'

type SubView = 'list' | 'create' | 'edit'

function Produits() {
  const { products, loading, error, refetch } = useProducts()
  const [search, setSearch] = useState('')
  const [subView, setSubView] = useState<SubView>('list')
  const [editing, setEditing] = useState<ProductWithRelations | null>(null)
  const [showDeviceModal, setShowDeviceModal] = useState(false)
  const [showRestockModal, setShowRestockModal] = useState(false)
  const [restockProduct, setRestockProduct] = useState<ProductWithRelations | null>(null)
  const selectedId = useEntrepotStore((s) => s.selectedId)
  const selectedName = useEntrepotStore((s) => s.selectedName)
  const { checkScanner, testScanner } = useDeviceCheck()

  useEffect(() => {
    if (!checkScanner()) setShowDeviceModal(true)
  }, [])

  useBarcodeScanner((barcode) => {
    if (subView !== 'list') return
    setSearch(barcode)
  })

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) || p.barcode.toLowerCase().includes(search.toLowerCase()))

  async function handleDelete(id: string) {
    if (!confirm('Supprimer ce produit ?')) return
    try { await window.api.deleteProduct(id); refetch() }
    catch (err) { console.error(err) }
  }

  function handleRestock(p: ProductWithRelations) {
    if (!selectedId) { alert('Veuillez d\'abord sélectionner un entrepôt dans le tableau de bord.'); return }
    setRestockProduct(p)
    setShowRestockModal(true)
  }

  const [magasinQty, setMagasinQty] = useState<Record<string, number>>({})
  const [sendingMagasin, setSendingMagasin] = useState<Record<string, boolean>>({})

  async function handleSendToMagasin(p: ProductWithRelations) {
    if (!selectedId) return
    const qty = magasinQty[p.id] ?? 1
    if (qty <= 0) return
    setSendingMagasin(prev => ({ ...prev, [p.id]: true }))
    try {
      await window.api.sendToMagasin({ productId: p.id, warehouseId: selectedId, quantity: qty })
      setMagasinQty(prev => ({ ...prev, [p.id]: 0 }))
      refetch()
    } catch (e) { console.error(e) }
    finally { setSendingMagasin(prev => ({ ...prev, [p.id]: false })) }
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Produits</h2>
        <Button onClick={handleCreate}><Plus className="mr-2 h-4 w-4" />Nouveau produit</Button>
      </div>

      <div className="relative max-w-sm">
        <Package className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Rechercher ou scanner un code-barres..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      {loading && <p className="text-muted-foreground">Chargement...</p>}
      {error && <p className="text-destructive">Erreur : {error}</p>}
      {!loading && !error && filtered.length === 0 && (
        <p className="text-muted-foreground">{search ? 'Aucun produit trouvé.' : 'Aucun produit.'}</p>
      )}

      {!loading && filtered.length > 0 && (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <Card key={p.id} className="group overflow-hidden transition-all duration-200 hover:shadow-lg hover:border-primary/20 flex flex-col justify-between">
              <div>
                {/* Zone d'image du produit premium */}
                <div className="relative h-44 w-full bg-muted/30 overflow-hidden border-b flex items-center justify-center">
                  {p.imageUrl ? (
                    <img 
                      src={p.imageUrl.startsWith('http') ? p.imageUrl : `local-file://${p.imageUrl}`} 
                      alt={p.name} 
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" 
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-1.5 text-muted-foreground/40">
                      <Package className="h-10 w-10 stroke-[1.2] group-hover:scale-110 duration-300 transition-transform" />
                      <span className="text-[9px] uppercase tracking-wider font-semibold">Aucune image</span>
                    </div>
                  )}
                  {/* Badge de stock flottant */}
                  <div className="absolute bottom-2.5 left-2.5 flex gap-1.5">
                    <Badge variant={p.stocks?.length ? (p.stocks[0].quantity <= p.stocks[0].alertLimit ? 'destructive' : 'default') : 'outline'} className="shadow-sm font-semibold">
                      Stock: {p.stocks?.[0]?.quantity ?? 0}
                    </Badge>
                    {(p.stocks?.[0]?.quantityMagasin ?? 0) > 0 && (
                      <Badge variant="outline" className="shadow-sm font-semibold bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-700">
                        <Store className="h-3 w-3 mr-0.5" />{p.stocks[0].quantityMagasin}
                      </Badge>
                    )}
                  </div>
                </div>

                <CardHeader className="pb-2 pt-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <CardTitle className="text-base font-bold truncate line-clamp-1" title={p.name}>{p.name}</CardTitle>
                      <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mt-0.5">Code : {p.barcode}</p>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pb-4 space-y-3">
                  <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                    <span className="text-lg font-black text-primary">{formatCurrency(p.sellingPrice)}</span>
                    <span className="text-xs text-muted-foreground">Achat: {formatCurrency(p.basePrice)}</span>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-1.5">
                    {p.category && (
                      <span className="inline-flex items-center rounded-full bg-secondary px-2.5 py-0.5 text-[10px] font-semibold text-secondary-foreground">
                        {p.category.name}
                      </span>
                    )}
                    {p.supplier && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                        <Truck className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate max-w-[120px]">{p.supplier.name}</span>
                      </span>
                    )}
                  </div>
                </CardContent>
              </div>
              
               <CardContent className="pt-0 pb-4 space-y-2">
                <Button size="sm" variant="secondary" className="w-full text-xs" onClick={() => handleRestock(p)}>
                  <RotateCw className="mr-1.5 h-3.5 w-3.5" />Réapprovisionner
                </Button>
                <div className="flex gap-2">
                  <div className="flex-1 flex items-center gap-1 rounded-lg border border-dashed border-amber-300 bg-amber-50/50 dark:border-amber-700 dark:bg-amber-950/10 px-2 py-1">
                    <Store className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                    <Input
                      type="number"
                      min={1}
                      value={magasinQty[p.id] ?? 1}
                      onChange={(e) => setMagasinQty(prev => ({ ...prev, [p.id]: Math.max(1, Number(e.target.value) || 1) }))}
                      className="h-6 w-12 text-xs text-center border-0 bg-transparent p-0"
                      placeholder="1"
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 px-1.5 text-xs text-amber-700 hover:text-amber-800 hover:bg-amber-100 dark:text-amber-400 dark:hover:bg-amber-950/30"
                      disabled={sendingMagasin[p.id]}
                      onClick={() => handleSendToMagasin(p)}
                    >
                      {sendingMagasin[p.id] ? '...' : '→ Magasin'}
                    </Button>
                  </div>
                </div>
                <div className="flex gap-2 border-t pt-2">
                  <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={() => handleEdit(p)}><Pencil className="mr-1 h-3 w-3" />Modifier</Button>
                  <Button size="sm" variant="destructive" className="flex-1 text-xs" onClick={() => handleDelete(p.id)}><Trash2 className="mr-1 h-3 w-3" />Supprimer</Button>
                </div>
              </CardContent>
            </Card>
          ))}
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
          onClose={() => { setShowRestockModal(false); setRestockProduct(null) }}
          product={restockProduct}
          warehouseId={selectedId}
          warehouseName={selectedName ?? undefined}
          onSuccess={refetch}
        />
      )}
    </div>
  )
}

export default Produits
