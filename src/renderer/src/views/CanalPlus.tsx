import { useEffect, useState, useCallback } from 'react'
import { Save, Download, FileText, Satellite, ChevronLeft, ChevronRight, Search, DownloadCloud, Wallet, Plus, X, CheckCircle2 } from 'lucide-react'
import { useEntrepotStore } from '../stores/entrepotStore'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../components/ui/select'
import { Badge } from '../components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog'
import { cn } from '@/lib/utils'
import type { CanalPlusSaleWithWarehouse } from '../../../shared/types'

const MONTH_NAMES = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']

const COLS = [
  { key: 'date', label: 'Date', editable: false, width: 'w-20' },
  { key: 'reabonnementAccess', label: 'Réab. Access', editable: true, width: 'w-28', group: 'reabonnement' },
  { key: 'reabonnementEvasion', label: 'Réab. Évasion', editable: true, width: 'w-28', group: 'reabonnement' },
  { key: 'reabonnementAccessPlus', label: 'Réab. Access+', editable: true, width: 'w-28', group: 'reabonnement' },
  { key: 'reabonnementToutCanal', label: 'Réab. Tout Canal', editable: true, width: 'w-28', group: 'reabonnement' },
  { key: 'reabonnementOthers', label: 'Réab. Autres', editable: true, width: 'w-24', group: 'reabonnement' },
  { key: 'totalReabonnement', label: 'Total Réab.', editable: false, width: 'w-24' },
  { key: 'abonnement', label: 'Abonnement', editable: true, width: 'w-24' },
  { key: 'achatDecoder', label: 'Achat Décodeur', editable: true, width: 'w-24' },
  { key: 'installationDepannage', label: 'Install./Dépannage', editable: true, width: 'w-28' },
  { key: 'commission', label: 'Commission', editable: true, width: 'w-24' },
]

const INPUT_COLS = [
  'reabonnementAccess', 'reabonnementEvasion', 'reabonnementAccessPlus',
  'reabonnementToutCanal', 'reabonnementOthers',
  'abonnement', 'achatDecoder', 'installationDepannage', 'commission'
]

const FORMULES = [
  { value: 'Access', label: 'Access', defaultAmount: 5000 },
  { value: 'Évasion', label: 'Évasion', defaultAmount: 10500 },
  { value: 'Access+', label: 'Access+', defaultAmount: 15000 },
  { value: 'Tout Canal', label: 'Tout Canal', defaultAmount: 28000 },
  { value: 'Autres', label: 'Autres', defaultAmount: 0 },
]

type TabId = 'vente' | 'historique' | 'tableau'

function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate()
}

function monthKey(year: number, month: number) {
  return `${year}-${String(month).padStart(2, '0')}`
}

function generateTabs() {
  const now = new Date()
  const tabs = []
  for (let offset = -1; offset <= 1; offset++) {
    const d = new Date(now.getFullYear(), now.getMonth() + offset, 1)
    tabs.push({ year: d.getFullYear(), month: d.getMonth() + 1 })
  }
  return tabs
}

function computeRow(row: Record<string, number>): Record<string, number> {
  const access = row.reabonnementAccess ?? 0
  const evasion = row.reabonnementEvasion ?? 0
  const accessPlus = row.reabonnementAccessPlus ?? 0
  const toutCanal = row.reabonnementToutCanal ?? 0
  const others = row.reabonnementOthers ?? 0
  return {
    ...row,
    totalReabonnement: access + evasion + accessPlus + toutCanal + others,
  }
}

export function CanalPlus() {
  const { selectedId, selectedName } = useEntrepotStore()
  const [activeTab, setActiveTab] = useState<TabId>('vente')

  // États onglet Nouvelle Vente
  const [clientName, setClientName] = useState('')
  const [subscriptionNumber, setSubscriptionNumber] = useState('')
  const [phone, setPhone] = useState('')
  const [formule, setFormule] = useState('Access')
  const [formuleAmount, setFormuleAmount] = useState(5000)
  const [extraOptions, setExtraOptions] = useState<{ name: string; price: number }[]>([])
  const [optionName, setOptionName] = useState('')
  const [optionPrice, setOptionPrice] = useState('')
  const [saving, setSaving] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [lastSale, setLastSale] = useState<{ id: string; clientName: string; formule: string; amount: number; invoicePath: string } | null>(null)
  const [canalBalance, setCanalBalance] = useState(0)

  // États onglet Historique
  const [sales, setSales] = useState<CanalPlusSaleWithWarehouse[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loadingSales, setLoadingSales] = useState(false)

  // États onglet Tableau
  const [tabIndex, setTabIndex] = useState(1)
  const [rows, setRows] = useState<Record<string, Record<number, Record<string, number>>>>({})
  const [dirty, setDirty] = useState(false)
  const [loading, setLoading] = useState(true)
  const [gridRefreshKey, setGridRefreshKey] = useState(0)
  const tabs = generateTabs()
  const currentTab = tabs[tabIndex]

  // Charger balance Canal+
  useEffect(() => {
    if (!selectedId) return
    window.api.getCanalPlusBalance(selectedId).then(setCanalBalance).catch(() => {})
  }, [selectedId, showSuccess])

  // Charger historique des ventes
  useEffect(() => {
    if (!selectedId || activeTab !== 'historique') return
    setLoadingSales(true)
    window.api.getCanalPlusSales(selectedId, searchQuery || undefined)
      .then(setSales)
      .catch(() => {})
      .finally(() => setLoadingSales(false))
  }, [selectedId, activeTab, searchQuery])

  // Mettre à jour le montant de la formule quand la formule change
  useEffect(() => {
    const f = FORMULES.find(f => f.value === formule)
    if (f) setFormuleAmount(f.defaultAmount)
  }, [formule])

  const totalAmount = formuleAmount + extraOptions.reduce((s, o) => s + o.price, 0)

  const loadMonth = useCallback(async (year: number, month: number) => {
    if (!selectedId) return
    const key = monthKey(year, month)
    const cells = await window.api.getCanalPlusCells(selectedId, key)
    const days = daysInMonth(year, month)
    const monthData: Record<number, Record<string, number>> = {}
    for (let d = 1; d <= days; d++) {
      const row: Record<string, number> = {}
      for (const col of INPUT_COLS) row[col] = 0
      monthData[d] = computeRow(row)
    }
    for (const c of cells) {
      if (monthData[c.day]) monthData[c.day][c.col] = c.value
      monthData[c.day] = computeRow(monthData[c.day])
    }
    return monthData
  }, [selectedId])

  useEffect(() => {
    if (!selectedId) return
    setLoading(true)
    const loadAll = async () => {
      const data: Record<string, Record<number, Record<string, number>>> = {}
      for (const t of tabs) {
        const key = monthKey(t.year, t.month)
        data[key] = await loadMonth(t.year, t.month) ?? {}
      }
      setRows(data)
      setLoading(false)
    }
    loadAll()
  }, [selectedId, gridRefreshKey])

  function setCell(day: number, col: string, value: number) {
    const key = monthKey(currentTab.year, currentTab.month)
    setRows((prev) => {
      const monthData = { ...(prev[key] ?? {}) }
      monthData[day] = computeRow({ ...monthData[day], [col]: value })
      return { ...prev, [key]: monthData }
    })
    setDirty(true)
  }

  async function handleSave() {
    if (!selectedId) return
    for (const t of tabs) {
      const key = monthKey(t.year, t.month)
      const monthData = rows[key]
      if (!monthData) continue
      const cells: { day: number; col: string; value: number }[] = []
      for (const [dayStr, row] of Object.entries(monthData)) {
        const day = Number(dayStr)
        for (const col of INPUT_COLS) {
          cells.push({ day, col, value: row[col] ?? 0 })
        }
      }
      await window.api.saveCanalPlusCells(selectedId, key, cells)
    }
    setDirty(false)
  }

  async function handleExport() {
    if (!selectedId) return
    const key = monthKey(currentTab.year, currentTab.month)
    const monthData = rows[key]
    if (!monthData) return
    const exportRows = Object.entries(monthData).map(([dayStr, row]) => ({
      day: Number(dayStr),
      ...row
    }))

    try {
      await window.api.exportCanalPlusExcel({
        month: key,
        monthName: MONTH_NAMES[currentTab.month - 1],
        warehouseName: selectedName ?? '',
        rows: exportRows,
      })
    } catch (err) {
      console.error('Export Excel error', err)
    }
  }

  async function handleExportPdf() {
    if (!selectedId) return
    const key = monthKey(currentTab.year, currentTab.month)
    const monthData = rows[key]
    if (!monthData) return
    const days = daysInMonth(currentTab.year, currentTab.month)
    let html = `<html><head><meta charset="utf-8"><style>
      body{font-family:sans-serif;padding:20px;color:#1e293b}
      h1{text-align:center;font-size:18px;margin-bottom:4px}
      h2{text-align:center;font-size:13px;font-weight:400;color:#64748b;margin-top:0}
      table{width:100%;border-collapse:collapse;font-size:10px;margin-top:12px}
      th,td{border:1px solid #cbd5e1;padding:3px 5px;text-align:right}
      th{background:#f1f5f9;font-weight:700;text-align:center}
      td:first-child{text-align:center;font-weight:600;background:#f8fafc}
      .total-row td{background:#e2e8f0;font-weight:700}
    </style></head><body>
    <h1>Canal+ — ${MONTH_NAMES[currentTab.month - 1]} ${currentTab.year}</h1>
    <h2>${selectedName ?? ''}</h2>
    <table><thead><tr><th>Jour</th>${COLS.slice(1).map(c => `<th>${c.label}</th>`).join('')}</tr></thead><tbody>`
    for (let d = 1; d <= days; d++) {
      const row = monthData[d] ?? {}
      html += `<tr><td>${d}</td>${COLS.slice(1).map(c => `<td>${((row[c.key] as number) ?? 0).toLocaleString('fr-FR')}</td>`).join('')}</tr>`
    }
    html += `<tr class="total-row"><td>TOTAL</td>${COLS.slice(1).map(c => `<td>${total(c.key).toLocaleString('fr-FR')}</td>`).join('')}</tr>`
    html += `</tbody></table></body></html>`
    try {
      await window.api.exportTablePdf(html, `CanalPlus_${key}.pdf`)
    } catch (e) { console.error('PDF export error', e) }
  }

  async function handleCreateSale(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedId || !clientName.trim() || !subscriptionNumber.trim()) return
    setSaving(true)
    try {
      const descExtras = extraOptions.length > 0
        ? ' — Options: ' + extraOptions.map(o => `${o.name}(${o.price.toLocaleString('fr-FR')} FCFA)`).join(', ')
        : ''
      const sale = await window.api.createCanalPlusSale({
        warehouseId: selectedId,
        clientName: clientName.trim(),
        subscriptionNumber: subscriptionNumber.trim(),
        phone: phone.trim(),
        formule: formule + descExtras,
        amount: totalAmount,
      })
      setLastSale({
        id: sale.id,
        clientName: clientName.trim(),
        formule: formule,
        amount: totalAmount,
        invoicePath: sale.invoicePath,
      })
      setShowSuccess(true)
      setClientName('')
      setSubscriptionNumber('')
      setPhone('')
      setFormule('Access')
      setFormuleAmount(5000)
      setExtraOptions([])
      setGridRefreshKey(k => k + 1)
      const balance = await window.api.getCanalPlusBalance(selectedId)
      setCanalBalance(balance)
    } catch (err) {
      console.error('Erreur création vente Canal+', err)
    } finally {
      setSaving(false)
    }
  }

  if (!selectedId) {
    return <div className="flex items-center justify-center py-20 text-muted-foreground">Sélectionnez un entrepôt</div>
  }

  const key = monthKey(currentTab.year, currentTab.month)
  const monthData = rows[key] ?? {}
  const days = daysInMonth(currentTab.year, currentTab.month)

  function total(col: string): number {
    let sum = 0
    for (let d = 1; d <= days; d++) {
      sum += (monthData[d]?.[col] as number) ?? 0
    }
    return sum
  }

  const totalReabonnements = total('totalReabonnement')
  const totalAbonnements = total('abonnement')
  const totalReabPlusRecrut = totalReabonnements + totalAbonnements
  const totalGeneral = totalReabonnements + totalAbonnements +
    total('achatDecoder') + total('installationDepannage') + total('commission')

  const TABS: { id: TabId; label: string }[] = [
    { id: 'vente', label: 'Nouvelle Vente' },
    { id: 'historique', label: 'Historique Factures' },
    { id: 'tableau', label: 'Tableau Excel' },
  ]

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Satellite className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Canal+</h2>
        </div>
        {activeTab === 'tableau' && (
          <div className="flex items-center gap-2">
            <span className={cn('h-2 w-2 rounded-full', dirty ? 'bg-amber-500' : 'bg-emerald-500')} />
            <Button variant="outline" size="sm" onClick={handleSave} disabled={!dirty}>
              <Save className="mr-1.5 h-4 w-4" /> Sauvegarder
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportPdf}>
              <FileText className="mr-1.5 h-4 w-4" /> PDF
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="mr-1.5 h-4 w-4" /> Excel
            </Button>
          </div>
        )}
      </div>

      {/* Onglets */}
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

      {/* Onglet 1 : Nouvelle Vente */}
      {activeTab === 'vente' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <div className="rounded-xl border bg-card p-6 shadow-sm">
              <h3 className="mb-4 text-base font-semibold">Enregistrer un abonnement</h3>
              <form onSubmit={handleCreateSale} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="clientName">Nom du client *</Label>
                  <Input
                    id="clientName"
                    value={clientName}
                    onChange={e => setClientName(e.target.value)}
                    placeholder="Ex: Jean Dupont"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="subNumber">N° Abonnement *</Label>
                    <Input
                      id="subNumber"
                      value={subscriptionNumber}
                      onChange={e => setSubscriptionNumber(e.target.value)}
                      placeholder="Ex: CAN-2024-001"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">N° Téléphone</Label>
                    <Input
                      id="phone"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      placeholder="+237 6XX XXX XXX"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="formule">Formule</Label>
                  <Select value={formule} onValueChange={v => setFormule(v)}>
                    <SelectTrigger id="formule">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FORMULES.map(f => (
                        <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Options supplémentaires</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Nom de l'option"
                      value={optionName}
                      onChange={e => setOptionName(e.target.value)}
                      className="flex-1"
                    />
                    <Input
                      type="number"
                      placeholder="Prix"
                      value={optionPrice}
                      onChange={e => setOptionPrice(e.target.value)}
                      className="w-28"
                      min={0}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        if (!optionName.trim() || !parseFloat(optionPrice)) return
                        setExtraOptions(prev => [...prev, { name: optionName.trim(), price: parseFloat(optionPrice) }])
                        setOptionName('')
                        setOptionPrice('')
                      }}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  {extraOptions.length > 0 && (
                    <div className="space-y-1">
                      {extraOptions.map((opt, i) => (
                        <div key={i} className="flex items-center justify-between rounded-lg border bg-muted/20 px-3 py-1.5 text-sm">
                          <span>{opt.name}</span>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold tabular-nums">{opt.price.toLocaleString('fr-FR')} FCFA</span>
                            <button
                              type="button"
                              onClick={() => setExtraOptions(prev => prev.filter((_, j) => j !== i))}
                              className="text-muted-foreground hover:text-destructive"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="formuleAmount">Montant formule</Label>
                  <Input
                    id="formuleAmount"
                    type="number"
                    value={formuleAmount}
                    onChange={e => setFormuleAmount(parseFloat(e.target.value) || 0)}
                    min={0}
                  />
                </div>
                <div className="flex items-center justify-between rounded-lg border bg-primary/5 px-4 py-3">
                  <span className="text-sm font-medium">Total</span>
                  <span className="text-lg font-bold tabular-nums text-primary">
                    {totalAmount.toLocaleString('fr-FR')} FCFA
                  </span>
                </div>
                <Button type="submit" className="w-full" disabled={saving || !clientName.trim() || !subscriptionNumber.trim()}>
                  {saving ? 'Enregistrement...' : 'Enregistrer la vente'}
                </Button>
              </form>
            </div>
          </div>

          {/* Solde Canal+ et infos */}
          <div className="lg:col-span-2 space-y-4">
            <div className="rounded-xl border bg-gradient-to-br from-blue-500 to-blue-700 p-5 text-white shadow-sm">
              <div className="flex items-center gap-3">
                <Wallet className="h-6 w-6 text-blue-100" />
                <p className="text-sm font-medium text-blue-100 uppercase tracking-wider">Solde Canal+</p>
              </div>
              <p className="mt-2 text-3xl font-black tabular-nums">
                {canalBalance.toLocaleString('fr-FR')} FCFA
              </p>
              <p className="mt-1 text-xs text-blue-200">Total des encaissements Canal+</p>
            </div>
              <div className="rounded-xl border bg-card p-4 shadow-sm">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Grille tarifaire</h4>
              <div className="space-y-1.5 text-sm">
                {FORMULES.filter(f => f.value !== 'Autres').map(f => (
                  <div key={f.value} className="flex justify-between">
                    <span>{f.label}</span>
                    <span className="font-semibold tabular-nums text-primary">{f.defaultAmount.toLocaleString('fr-FR')} FCFA</span>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs text-muted-foreground border-t pt-2">
                Options supplémentaires saisies manuellement dans le formulaire.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Modal succès vente */}
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
                  {lastSale.amount.toLocaleString('fr-FR')} FCFA
                </p>
                <p className="text-sm text-muted-foreground mt-1">{lastSale.formule}</p>
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Client</span>
                  <span className="font-medium">{lastSale.clientName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">N° Facture</span>
                  <span className="font-medium">FACT-CANAL-{lastSale.id.slice(0, 8).toUpperCase()}</span>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setShowSuccess(false)}>
                  Fermer
                </Button>
                <Button className="flex-1" onClick={() => { window.api.openFile(lastSale.invoicePath); setShowSuccess(false) }}>
                  <DownloadCloud className="mr-1.5 h-4 w-4" /> Ouvrir la facture
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Onglet 2 : Historique des Factures */}
      {activeTab === 'historique' && (
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Rechercher par nom, numéro d'abonnement ou téléphone..."
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
                {searchQuery ? 'Aucune facture trouvée' : 'Aucune facture enregistrée'}
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/40 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <th className="px-4 py-3 text-left">Date</th>
                    <th className="px-4 py-3 text-left">Client</th>
                    <th className="px-4 py-3 text-left">N° Abonnement</th>
                    <th className="px-4 py-3 text-left">Formule</th>
                    <th className="px-4 py-3 text-right">Montant</th>
                    <th className="px-4 py-3 text-center">Statut</th>
                    <th className="px-4 py-3 text-center">Facture</th>
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
                      <td className="px-4 py-3 text-sm font-medium">{s.clientName}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{s.subscriptionNumber}</td>
                      <td className="px-4 py-3 text-sm">{s.formule}</td>
                      <td className="px-4 py-3 text-right text-sm font-bold tabular-nums">
                        {s.amount.toLocaleString('fr-FR')} FCFA
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-0">
                          Payé
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {s.invoicePath ? (
                          <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={() => window.api.openFile(s.invoicePath!)}>
                            <DownloadCloud className="h-3.5 w-3.5" /> PDF
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Onglet 3 : Tableau Excel */}
      {activeTab === 'tableau' && (
        <>
          {/* Navigation mois */}
          <div className="flex items-center justify-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => setTabIndex(Math.max(0, tabIndex - 1))} disabled={tabIndex === 0}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="font-semibold text-base min-w-[180px] text-center">
              {MONTH_NAMES[currentTab.month - 1]} {currentTab.year}
            </span>
            <Button variant="ghost" size="sm" onClick={() => setTabIndex(Math.min(tabs.length - 1, tabIndex + 1))} disabled={tabIndex === tabs.length - 1}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">Chargement...</div>
          ) : (
            <div className="overflow-auto rounded-xl border shadow-sm">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 sticky top-0 z-10">
                    <th className="w-20 px-2 py-3 text-left font-semibold text-muted-foreground whitespace-nowrap border-b">Date</th>
                    {COLS.slice(1).map((col, ci) => {
                      const colors = [
                        'text-blue-700 dark:text-blue-300',
                        'text-sky-700 dark:text-sky-300',
                        'text-indigo-700 dark:text-indigo-300',
                        'text-violet-700 dark:text-violet-300',
                        'text-purple-700 dark:text-purple-300',
                        'text-fuchsia-700 dark:text-fuchsia-300',
                        'text-emerald-700 dark:text-emerald-300',
                        'text-orange-700 dark:text-orange-300',
                        'text-rose-700 dark:text-rose-300',
                        'text-amber-700 dark:text-amber-300',
                      ]
                      return (
                        <th key={col.key} className={`${col.width} px-2 py-3 text-right font-semibold whitespace-nowrap border-b ${colors[ci % colors.length]}`}>
                          {col.label}
                        </th>
                      )
                    })}
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: days }, (_, i) => i + 1).map((d) => {
                    const row = monthData[d] ?? {}
                    return (
                      <tr key={d} className={`${d % 2 === 0 ? 'bg-muted/10' : 'bg-background'} hover:bg-muted/30 transition-colors border-b border-muted/20`}>
                        <td className="px-2 py-2 text-muted-foreground font-medium whitespace-nowrap">Jour {d}</td>
                        {COLS.slice(1).map((col) => {
                          const val = (row[col.key] as number) ?? 0
                          if (!col.editable) {
                            return (
                              <td key={col.key} className="px-2 py-2 text-right font-semibold text-primary">
                                {val.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                              </td>
                            )
                          }
                          return (
                            <td key={col.key} className="px-1 py-1">
                              <Input
                                type="number"
                                value={val}
                                onChange={(e) => setCell(d, col.key, parseFloat(e.target.value) || 0)}
                                className="h-7 text-right text-xs border-0 bg-transparent hover:bg-muted/40 focus:bg-background focus:border"
                              />
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}
                  {/* Ligne total mensuel */}
                  <tr className="bg-gradient-to-r from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 font-semibold sticky bottom-0">
                    <td className="px-2 py-3 text-muted-foreground whitespace-nowrap">TOTAL MENSUEL</td>
                    {COLS.slice(1).map((col) => (
                      <td key={col.key} className="px-2 py-3 text-right font-bold">
                        {total(col.key).toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </td>
                    ))}
                  </tr>
                  {/* Ligne total réabonnements */}
                  <tr className="bg-blue-50 dark:bg-blue-950/20 font-semibold">
                    <td className="px-2 py-2 text-blue-700 dark:text-blue-300 whitespace-nowrap">TOTAL RÉABONNEMENTS</td>
                    <td colSpan={5} />
                    <td className="px-2 py-2 text-right text-blue-700 dark:text-blue-300 font-bold">
                      {totalReabonnements.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </td>
                    <td colSpan={4} />
                  </tr>
                  {/* Ligne total réabonnements + recrutement */}
                  <tr className="bg-emerald-50 dark:bg-emerald-950/20 font-semibold">
                    <td className="px-2 py-2 text-emerald-700 dark:text-emerald-300 whitespace-nowrap">TOTAL RÉAB. + RECRUTEMENT</td>
                    <td colSpan={6} />
                    <td className="px-2 py-2 text-right text-emerald-700 dark:text-emerald-300 font-bold">
                      {totalReabPlusRecrut.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </td>
                    <td colSpan={3} />
                  </tr>
                  {/* Ligne total général */}
                  <tr className="bg-amber-50 dark:bg-amber-950/20 font-bold text-sm">
                    <td className="px-2 py-3 text-amber-800 dark:text-amber-300 whitespace-nowrap">TOTAL GÉNÉRAL</td>
                    <td colSpan={7} />
                    <td className="px-2 py-3 text-right text-amber-800 dark:text-amber-300">
                      {totalGeneral.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </td>
                    <td colSpan={2} />
                  </tr>
                </tbody>
              </table>

              {/* Cartes récapitulatives */}
              <div className="grid grid-cols-3 gap-4 p-4 border-t bg-muted/20">
                <div className="rounded-lg border bg-card p-4 shadow-sm">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Total Réabonnements</p>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {totalReabonnements.toLocaleString('fr-FR')} FCFA
                  </p>
                </div>
                <div className="rounded-lg border bg-card p-4 shadow-sm">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Réab. + Recrutement</p>
                  <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                    {totalReabPlusRecrut.toLocaleString('fr-FR')} FCFA
                  </p>
                </div>
                <div className="rounded-lg border bg-card p-4 shadow-sm">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Total Général</p>
                  <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                    {totalGeneral.toLocaleString('fr-FR')} FCFA
                  </p>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
