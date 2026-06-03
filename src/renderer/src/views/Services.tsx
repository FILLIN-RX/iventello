import { useEffect, useState } from 'react'
import { Printer, Copy, Scan, Plus, X, Search, DownloadCloud, CheckCircle2 } from 'lucide-react'
import { useEntrepotStore } from '../stores/entrepotStore'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../components/ui/select'
import { Badge } from '../components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog'
import { cn } from '@/lib/utils'
import type { ServiceSaleWithWarehouse } from '../../../shared/types'

const SERVICE_TYPES = [
  { value: 'photocopie', label: 'Photocopie', icon: Copy },
  { value: 'impression', label: 'Impression', icon: Printer },
  { value: 'scan', label: 'Scan', icon: Scan },
]

const SERVICE_UNIT_PRICES: Record<string, number> = {
  photocopie: 50,
  impression: 100,
  scan: 200,
}

type TabId = 'vente' | 'historique'

export function Services() {
  const { selectedId, selectedName } = useEntrepotStore()
  const [activeTab, setActiveTab] = useState<TabId>('vente')

  const [serviceType, setServiceType] = useState('photocopie')
  const [quantity, setQuantity] = useState(1)
  const [unitPrice, setUnitPrice] = useState(50)
  const [clientName, setClientName] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [lastSale, setLastSale] = useState<{ invoiceNumber: string; serviceType: string; totalAmount: number; clientName?: string } | null>(null)

  const [sales, setSales] = useState<ServiceSaleWithWarehouse[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loadingSales, setLoadingSales] = useState(false)

  useEffect(() => {
    if (!selectedId) return
    const f = SERVICE_UNIT_PRICES[serviceType]
    if (f) setUnitPrice(f)
  }, [serviceType, selectedId])

  useEffect(() => {
    if (!selectedId || activeTab !== 'historique') return
    setLoadingSales(true)
    window.api.getServiceSales(selectedId, searchQuery || undefined)
      .then(setSales)
      .catch(() => {})
      .finally(() => setLoadingSales(false))
  }, [selectedId, activeTab, searchQuery])

  const totalAmount = quantity * unitPrice

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedId || quantity < 1) return
    setSaving(true)
    try {
      const sale = await window.api.createServiceSale({
        warehouseId: selectedId,
        serviceType,
        description: description.trim() || undefined,
        quantity,
        unitPrice,
        totalAmount,
        clientName: clientName.trim() || undefined,
      })
      setLastSale({
        invoiceNumber: sale.invoiceNumber,
        serviceType: SERVICE_TYPES.find(t => t.value === serviceType)?.label ?? serviceType,
        totalAmount,
        clientName: clientName.trim() || undefined,
      })
      setShowSuccess(true)
      setQuantity(1)
      setClientName('')
      setDescription('')
      setServiceType('photocopie')
    } catch (err) {
      console.error('Erreur création service', err)
    } finally {
      setSaving(false)
    }
  }

  if (!selectedId) {
    return <div className="flex items-center justify-center py-20 text-muted-foreground">Sélectionnez un entrepôt</div>
  }

  const TABS: { id: TabId; label: string }[] = [
    { id: 'vente', label: 'Nouvelle vente de service' },
    { id: 'historique', label: 'Historique' },
  ]

  const ServiceIcon = SERVICE_TYPES.find(t => t.value === serviceType)?.icon ?? Copy

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Printer className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">Services (Photocopie, Impression, Scan)</h2>
      </div>

      <div className="flex gap-1 rounded-xl bg-muted/40 p-1">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-all',
              activeTab === tab.id
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'vente' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <div className="rounded-xl border bg-card p-6 shadow-sm">
              <h3 className="mb-4 text-base font-semibold">Enregistrer une prestation</h3>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-2">
                  <Label>Type de service</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {SERVICE_TYPES.map(t => {
                      const Icon = t.icon
                      return (
                        <button
                          key={t.value}
                          type="button"
                          onClick={() => setServiceType(t.value)}
                          className={cn(
                            'flex flex-col items-center gap-1.5 rounded-lg border-2 p-3 text-sm font-medium transition-all',
                            serviceType === t.value
                              ? 'border-primary bg-primary/5 text-primary'
                              : 'border-transparent bg-muted/40 text-muted-foreground hover:bg-muted/60'
                          )}
                        >
                          <Icon className="h-5 w-5" />
                          {t.label}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description (optionnelle)</Label>
                  <Input
                    id="description"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Ex: 20 pages A4 N&B, recto-verso"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="quantity">Quantité</Label>
                    <Input
                      id="quantity"
                      type="number"
                      value={quantity}
                      onChange={e => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                      min={1}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="unitPrice">Prix unitaire (FCFA)</Label>
                    <Input
                      id="unitPrice"
                      type="number"
                      value={unitPrice}
                      onChange={e => setUnitPrice(parseFloat(e.target.value) || 0)}
                      min={0}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="clientName">Nom du client (optionnel)</Label>
                  <Input
                    id="clientName"
                    value={clientName}
                    onChange={e => setClientName(e.target.value)}
                    placeholder="Ex: Jean Dupont"
                  />
                </div>

                <div className="flex items-center justify-between rounded-lg border bg-primary/5 px-4 py-3">
                  <span className="text-sm font-medium">Total</span>
                  <span className="text-lg font-bold tabular-nums text-primary">
                    {totalAmount.toLocaleString('fr-FR')} FCFA
                  </span>
                </div>

                <Button type="submit" className="w-full" disabled={saving || quantity < 1}>
                  {saving ? 'Enregistrement...' : 'Enregistrer la vente'}
                </Button>
              </form>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-4">
            <div className="rounded-xl border bg-gradient-to-br from-purple-500 to-purple-700 p-5 text-white shadow-sm">
              <div className="flex items-center gap-3">
                <ServiceIcon className="h-6 w-6 text-purple-100" />
                <p className="text-sm font-medium text-purple-100 uppercase tracking-wider">
                  {SERVICE_TYPES.find(t => t.value === serviceType)?.label ?? 'Service'}
                </p>
              </div>
              <p className="mt-2 text-3xl font-black tabular-nums">
                {totalAmount.toLocaleString('fr-FR')} FCFA
              </p>
              <p className="mt-1 text-xs text-purple-200">
                {quantity} × {unitPrice.toLocaleString('fr-FR')} FCFA
              </p>
            </div>

            <div className="rounded-xl border bg-card p-4 shadow-sm">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Tarifs indicatifs</h4>
              <div className="space-y-1.5 text-sm">
                {SERVICE_TYPES.map(t => (
                  <div key={t.value} className="flex justify-between">
                    <span>{t.label}</span>
                    <span className="font-semibold tabular-nums text-primary">
                      {SERVICE_UNIT_PRICES[t.value].toLocaleString('fr-FR')} FCFA / unité
                    </span>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs text-muted-foreground border-t pt-2">
                Prix modifiables dans le formulaire.
              </p>
            </div>
          </div>
        </div>
      )}

      <Dialog open={showSuccess} onOpenChange={setShowSuccess}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-600">
              <CheckCircle2 className="h-5 w-5" /> Vente enregistrée
            </DialogTitle>
          </DialogHeader>
          {lastSale && (
            <div className="space-y-4">
              <div className="rounded-lg border bg-emerald-50 dark:bg-emerald-950/20 p-4 text-center">
                <p className="text-2xl font-bold text-emerald-600 tabular-nums">
                  {lastSale.totalAmount.toLocaleString('fr-FR')} FCFA
                </p>
                <p className="text-sm text-muted-foreground mt-1">{lastSale.serviceType}</p>
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">N° Facture</span>
                  <span className="font-medium">{lastSale.invoiceNumber}</span>
                </div>
                {lastSale.clientName && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Client</span>
                    <span className="font-medium">{lastSale.clientName}</span>
                  </div>
                )}
              </div>
              <Button variant="outline" className="w-full" onClick={() => setShowSuccess(false)}>
                Fermer
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {activeTab === 'historique' && (
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Rechercher par client ou numéro de facture..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
            {loadingSales ? (
              <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">Chargement...</div>
            ) : sales.length === 0 ? (
              <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
                {searchQuery ? 'Aucune vente trouvée' : 'Aucune vente enregistrée'}
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/40 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <th className="px-4 py-3 text-left">Date</th>
                    <th className="px-4 py-3 text-left">Service</th>
                    <th className="px-4 py-3 text-left">Description</th>
                    <th className="px-4 py-3 text-left">Client</th>
                    <th className="px-4 py-3 text-right">Qté</th>
                    <th className="px-4 py-3 text-right">P.U.</th>
                    <th className="px-4 py-3 text-right">Total</th>
                    <th className="px-4 py-3 text-center">N° Facture</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {sales.map(s => (
                    <tr key={s.id} className="group transition-colors hover:bg-muted/30">
                      <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">
                        {new Date(s.createdAt).toLocaleDateString('fr-FR', {
                          day: '2-digit', month: 'short', year: 'numeric'
                        })}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium">
                        <Badge variant="outline" className="font-medium">
                          {SERVICE_TYPES.find(t => t.value === s.serviceType)?.label ?? s.serviceType}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground max-w-[200px] truncate">
                        {s.description || '—'}
                      </td>
                      <td className="px-4 py-3 text-sm">{s.clientName || '—'}</td>
                      <td className="px-4 py-3 text-right text-sm tabular-nums">{s.quantity}</td>
                      <td className="px-4 py-3 text-right text-sm tabular-nums">
                        {s.unitPrice.toLocaleString('fr-FR')}
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-bold tabular-nums">
                        {s.totalAmount.toLocaleString('fr-FR')} FCFA
                      </td>
                      <td className="px-4 py-3 text-center text-xs font-mono text-muted-foreground">
                        {s.invoiceNumber}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
