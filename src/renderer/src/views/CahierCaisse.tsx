import { useState, useEffect, useRef } from 'react'
import {
  Plus, ArrowUpRight, ArrowDownRight, TrendingUp, TrendingDown,
  Package, Search, X, Barcode, Wallet, Trash2, FileDown,
  ShoppingCart, ShoppingBag, Landmark, Smartphone, CreditCard, Receipt,
  Percent
} from 'lucide-react'
import { useEntrepotStore } from '../stores/entrepotStore'
import { useCashRegisterStore } from '../stores/cashRegisterStore'
import { useNotifications } from '../stores/notificationStore'
import { useProducts } from '../hooks/useProducts'
import { useBarcodeScanner } from '../hooks/useBarcodeScanner'
import { useDeviceCheck } from '../hooks/useDeviceCheck'
import { DeviceCheckModal } from '../components/DeviceCheckModal'
import { QuantitySelector } from '../components/QuantitySelector'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Badge } from '../components/ui/badge'
import { cn, formatCurrency } from '@/lib/utils'
import type { ProductWithRelations } from '../../../shared/types'

type FlowType = 'ENTREE' | 'SORTIE'
type PanelView = 'closed' | 'form'

const PAYMENT_OPTIONS = [
  { value: 'ESPECES', label: 'Espèces', icon: Wallet },
  { value: 'CARTE_BANCAIRE', label: 'Carte bancaire', icon: CreditCard },
  { value: 'MOBILE_MONEY', label: 'Mobile Money', icon: Smartphone },
  { value: 'VIREMENT', label: 'Virement', icon: Landmark },
]

function CahierCaisse() {
  const { selectedId, selectedName } = useEntrepotStore()
  const { summary, transactions, isLoading, fetchDailyData, addTransaction, deleteTransaction } = useCashRegisterStore()
  const { products } = useProducts()
  const [panel, setPanel] = useState<PanelView>('closed')
  const [flowType, setFlowType] = useState<FlowType>('ENTREE')
  const [paymentMethod, setPaymentMethod] = useState('ESPECES')
  const [description, setDescription] = useState('')
  const [productSearch, setProductSearch] = useState('')
  const [selectedProduct, setSelectedProduct] = useState<ProductWithRelations | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [saving, setSaving] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)
  const [showDeviceModal, setShowDeviceModal] = useState(false)
  const { checkScanner, testScanner } = useDeviceCheck()

  useEffect(() => {
    if (!checkScanner()) setShowDeviceModal(true)
  }, [])

  const wid = selectedId ?? ''

  useEffect(() => {
    if (wid) fetchDailyData(wid)
  }, [wid])

  useBarcodeScanner((barcode) => {
    if (panel !== 'form') return
    const found = products.find((p) => p.barcode === barcode)
    if (found) setSelectedProduct(found)
  })

  const filteredProducts = productSearch.length > 0
    ? products.filter((p) =>
        p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
        p.barcode.includes(productSearch))
    : []

  const stockForProduct = selectedProduct
    ? selectedProduct.stocks?.find((s) => s.warehouse.id === selectedId)?.quantity ?? 0
    : 0

  const lineTotal = selectedProduct ? quantity * (flowType === 'ENTREE' ? selectedProduct.sellingPrice : selectedProduct.basePrice) : 0

  function openForm(type: FlowType) {
    setFlowType(type)
    setSelectedProduct(null)
    setProductSearch('')
    setQuantity(1)
    setDescription('')
    setPaymentMethod('ESPECES')
    setPanel('form')
    setTimeout(() => searchRef.current?.focus(), 100)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!wid || !selectedProduct) return
    const unitPrice = flowType === 'ENTREE' ? selectedProduct.sellingPrice : selectedProduct.basePrice
    try {
      setSaving(true)
      const t = await window.api.createCashTransaction({
        type: flowType,
        warehouseId: wid,
        totalAmount: lineTotal,
        paymentMethod,
        description: description || undefined,
        lines: [{ productId: selectedProduct.id, quantity, unitPrice, subTotal: lineTotal }]
      })
      useNotifications.getState().addNotification({
        type: flowType === 'ENTREE' ? 'vente' : 'info',
        title: flowType === 'ENTREE' ? 'Vente enregistrée' : 'Achat enregistré',
        description: `${selectedProduct.name} x${quantity} — ${formatCurrency(lineTotal)}`,
        meta: { montant: lineTotal, produit: selectedProduct.name, quantite: quantity }
      })
      await fetchDailyData(wid)
      setPanel('closed')
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  async function handleExportPDF() {
    if (!transactions.length) return
    const today = new Date().toISOString().slice(0, 10)
    const data = {
      warehouseName: selectedName ?? '',
      warehouseLogo: null,
      operatorName: 'Administrateur',
      dateRange: { start: today, end: today },
      soldeOuverture: 0,
      totalEntrees: summary?.totalEntrees ?? 0,
      totalSorties: summary?.totalSorties ?? 0,
      soldeCloture: summary?.soldeDuJour ?? 0,
      transactions
    }
    try {
      const path = await window.api.exportCashReport(data)
      useNotifications.getState().addNotification({
        type: 'info',
        title: 'PDF exporté',
        description: `Rapport de caisse sauvegardé sur le bureau`,
        meta: {}
      })
    } catch (err) {
      console.error(err)
    }
  }

  const tzOffset = new Date().getTimezoneOffset() * 60000
  const yesterdayStart = new Date(Date.now() - 86400000 - tzOffset).toISOString().slice(0, 10)
  const yesterdayEnd = new Date(Date.now() - 86400000 - tzOffset).toISOString().slice(0, 10)

  return (
    <div className="space-y-6">
      {/* Bento Grid — Résumé */}
      <div className="grid grid-cols-5 gap-4">
        {/* Solde du jour — largeur 3/5 */}
        <div className="relative col-span-3 overflow-hidden rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 p-5 text-white shadow-lg">
          <div className="absolute right-0 top-0 h-32 w-32 translate-x-8 -translate-y-8 rounded-full bg-white/10" />
          <div className="absolute bottom-0 left-0 h-24 w-24 -translate-x-6 translate-y-6 rounded-full bg-white/5" />
          <p className="relative text-xs font-medium uppercase tracking-wider text-emerald-100">Solde caisse du jour</p>
          <p className="relative mt-1 text-3xl font-black tabular-nums">
            {formatCurrency(summary?.soldeDuJour ?? 0)}
          </p>
          <div className="relative mt-3 flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1 text-emerald-200">
              <TrendingUp className="h-3.5 w-3.5" /> Entrées: {formatCurrency(summary?.totalEntrees ?? 0)}
            </span>
            <span className="flex items-center gap-1 text-red-200">
              <TrendingDown className="h-3.5 w-3.5" /> Sorties: {formatCurrency(summary?.totalSorties ?? 0)}
            </span>
          </div>
          <div className="relative mt-3 flex h-2 gap-0.5 overflow-hidden rounded-full bg-white/20">
            {(function () {
              const m = Math.max(summary?.totalEntrees ?? 1, summary?.totalSorties ?? 1, 1)
              const e = ((summary?.totalEntrees ?? 0) / m) * 100
              const s = ((summary?.totalSorties ?? 0) / m) * 100
              return <>
                <div className="h-full rounded-full bg-white transition-all" style={{ width: `${e}%` }} />
                <div className="h-full rounded-full bg-white/60 transition-all" style={{ width: `${s}%` }} />
              </>
            })()}
          </div>
        </div>

        {/* Valeur du stock — largeur 2/5 */}
        <div className="col-span-2 rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Package className="h-5 w-5 text-primary" />
            </div>
          </div>
          <p className="mt-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Valeur du stock</p>
          <p className="mt-1 text-2xl font-black tabular-nums">
            {formatCurrency(summary?.valeurTotaleStock ?? 0)}
          </p>
          <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            <span>{summary?.totalProducts ?? 0} articles</span>
            {(summary?.alertCount ?? 0) > 0 && (
              <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                {summary?.alertCount} alerte{(summary?.alertCount ?? 0) > 1 ? 's' : ''}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button onClick={() => openForm('ENTREE')} className="bg-emerald-600 hover:bg-emerald-700">
            <Plus className="mr-1.5 h-4 w-4" /> Encaissement
          </Button>
          <Button onClick={() => openForm('SORTIE')} variant="destructive">
            <Plus className="mr-1.5 h-4 w-4" /> Décaissement
          </Button>
        </div>
        <Button variant="outline" onClick={handleExportPDF} disabled={!transactions.length}>
          <FileDown className="mr-1.5 h-4 w-4" /> Export PDF
        </Button>
      </div>

      {/* Tableau des flux */}
      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Journal des flux</h3>
        {transactions.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {isLoading ? 'Chargement...' : 'Aucune transaction aujourd\'hui'}
          </p>
        )}
        {transactions.length > 0 && (
          <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/40 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3 text-left">Heure</th>
                  <th className="px-4 py-3 text-left">Type</th>
                  <th className="px-4 py-3 text-left">Libellé</th>
                  <th className="px-4 py-3 text-right">Qté</th>
                  <th className="px-4 py-3 text-right">Montant</th>
                  <th className="px-4 py-3 text-left">Paiement</th>
                  <th className="px-4 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                  {transactions.map((t) => {
                  const isEntree = t.type === 'ENTREE'
                  const isRemise = t.description?.startsWith('Remise')
                  const firstLine = t.lines?.[0]
                  return (
                    <tr key={t.id} className="group transition-colors hover:bg-muted/30">
                      <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">
                        {new Date(t.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
                          isRemise
                            ? 'bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400'
                            : isEntree
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                              : 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400'
                        )}>
                          {isRemise ? <Percent className="h-3 w-3" /> : isEntree ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                          {isRemise ? 'Remise' : isEntree ? 'Entrée' : 'Sortie'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium">
                          {firstLine?.product?.name ?? t.description ?? 'Transaction'}
                        </p>
                        {t.description && firstLine?.product && (
                          <p className="text-xs text-muted-foreground">{t.description}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-sm">
                        {firstLine ? (
                          <span className="font-medium">{firstLine.quantity}</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className={cn(
                        'px-4 py-3 text-right text-base font-bold tabular-nums whitespace-nowrap',
                        isEntree ? 'text-emerald-600' : 'text-red-600'
                      )}>
                        {isEntree ? '+' : '-'}{formatCurrency(t.totalAmount)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="text-[10px]">
                          {PAYMENT_OPTIONS.find(p => p.value === t.paymentMethod)?.label ?? t.paymentMethod}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => { if (confirm('Supprimer cette transaction ?')) deleteTransaction(t.id, wid) }}
                          className="rounded-lg p-1.5 text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-accent hover:text-destructive transition-all"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Bottom Sheet / Panel */}
      {panel === 'form' && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm" onClick={() => setPanel('closed')}>
          <div
            className="w-full max-w-lg animate-slide-up rounded-t-2xl border bg-card p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            style={{ maxHeight: '85vh', overflowY: 'auto' }}
          >
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-base font-semibold">
                {flowType === 'ENTREE' ? 'Nouvel encaissement' : 'Nouveau décaissement'}
              </h3>
              <button onClick={() => setPanel('closed')} className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Sélecteur de type */}
              <div className="flex rounded-xl border bg-muted/30 p-1">
                <button
                  type="button"
                  onClick={() => setFlowType('ENTREE')}
                  className={cn(
                    'flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-all',
                    flowType === 'ENTREE' ? 'bg-emerald-500 text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <ShoppingCart className="mr-1.5 inline h-4 w-4" /> Encaissement
                </button>
                <button
                  type="button"
                  onClick={() => setFlowType('SORTIE')}
                  className={cn(
                    'flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-all',
                    flowType === 'SORTIE' ? 'bg-red-500 text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <ShoppingBag className="mr-1.5 inline h-4 w-4" /> Décaissement
                </button>
              </div>

              {/* Recherche produit */}
              <div className="space-y-2">
                <Label>Produit</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    ref={searchRef}
                    placeholder="Rechercher ou scanner un produit..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="pl-9"
                  />
                  <Barcode className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                </div>
                {productSearch && filteredProducts.length > 0 && (
                  <div className="max-h-40 overflow-y-auto rounded-lg border bg-background shadow-sm">
                    {filteredProducts.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => { setSelectedProduct(p); setProductSearch('') }}
                        className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-accent"
                      >
                        <span>{p.name}</span>
                        <span className="text-xs text-muted-foreground">{p.barcode}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Produit sélectionné */}
              {selectedProduct && (
                <div className="rounded-xl border bg-muted/20 p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold">{selectedProduct.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {flowType === 'ENTREE'
                          ? `Prix vente: ${formatCurrency(selectedProduct.sellingPrice)}`
                          : `Prix achat: ${formatCurrency(selectedProduct.basePrice)}`
                        }
                      </p>
                    </div>
                    <button type="button" onClick={() => setSelectedProduct(null)} className="rounded p-1 text-muted-foreground hover:bg-accent">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-3">
                    <QuantitySelector
                      currentStock={stockForProduct}
                      unitPrice={flowType === 'ENTREE' ? selectedProduct.sellingPrice : selectedProduct.basePrice}
                      type={flowType}
                      onChange={(qty) => setQuantity(qty)}
                    />
                  </div>
                </div>
              )}

              {/* Mode de paiement */}
              <div className="space-y-2">
                <Label>Mode de paiement</Label>
                <div className="grid grid-cols-2 gap-2">
                  {PAYMENT_OPTIONS.map((opt) => {
                    const Icon = opt.icon
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setPaymentMethod(opt.value)}
                        className={cn(
                          'flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm transition-all',
                          paymentMethod === opt.value
                            ? 'border-primary bg-primary/10 text-primary font-medium'
                            : 'border-input text-muted-foreground hover:bg-accent'
                        )}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        <span>{opt.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label>Description (optionnelle)</Label>
                <Input
                  placeholder={flowType === 'ENTREE' ? 'Ex: Vente au détail' : 'Ex: Achat fournisseur'}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setPanel('closed')}>
                  Annuler
                </Button>
                <Button
                  type="submit"
                  className={cn('flex-1', flowType === 'ENTREE' ? 'bg-emerald-600 hover:bg-emerald-700' : '')}
                  variant={flowType === 'SORTIE' ? 'destructive' : 'default'}
                  disabled={!selectedProduct || saving}
                >
                  {saving ? 'Enregistrement...' : flowType === 'ENTREE' ? 'Encaisser' : 'Décaisser'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Styles pour l'animation slide-up */}
      <style>{`
        @keyframes slide-up {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-slide-up { animation: slide-up 0.25s ease-out; }
      `}</style>

      <DeviceCheckModal
        open={showDeviceModal}
        onClose={() => setShowDeviceModal(false)}
        device="scanner"
        onTest={testScanner}
      />
    </div>
  )
}

export default CahierCaisse
