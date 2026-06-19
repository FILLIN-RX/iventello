import { useEffect, useState } from 'react'
import { FileText, Search, User, ShoppingBag, CreditCard, Eye, CheckCircle, XCircle, RotateCcw, UserCheck } from 'lucide-react'
import { Input } from '../components/ui/input'
import { Button } from '../components/ui/button'
import { FactureDetailModal } from '../components/FactureDetailModal'
import type { SaleWithClient, SaleStatus } from '../../../shared/types'
import { formatCurrency } from '@/lib/utils'

const PAYMENT_LABELS: Record<string, string> = {
  ESPECES: 'Espèces', MOBILE_MONEY: 'Mobile Money', CARTE_BANCAIRE: 'Carte bancaire'
}
const PAYMENT_COLORS: Record<string, string> = {
  ESPECES: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400',
  MOBILE_MONEY: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400',
  CARTE_BANCAIRE: 'bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400',
}

const STATUS_LABELS: Record<SaleStatus, string> = {
  EN_ATTENTE: 'En attente', VALIDE: 'Validée', PAYE: 'Payée', ANNULE: 'Annulée'
}
const STATUS_COLORS: Record<SaleStatus, string> = {
  EN_ATTENTE: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400',
  VALIDE: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400',
  PAYE: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400',
  ANNULE: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400',
}

export default function Factures() {
  const [sales, setSales] = useState<SaleWithClient[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedSale, setSelectedSale] = useState<SaleWithClient | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  function load() {
    setLoading(true)
    window.api.getSales().then((s: any) => { setSales(s); setLoading(false) })
  }

  useEffect(() => { load() }, [])

  const filtered = sales.filter(s =>
    (s.client?.name ?? 'anonyme').toLowerCase().includes(search.toLowerCase()) ||
    s.warehouse.name.toLowerCase().includes(search.toLowerCase()) ||
    s.paymentMethod.toLowerCase().includes(search.toLowerCase()) ||
    s.id.toLowerCase().includes(search.toLowerCase()) ||
    s.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
    (s.status || '').toLowerCase().includes(search.toLowerCase()) ||
    (s.agent?.name ?? '').toLowerCase().includes(search.toLowerCase())
  )

  const totalCA = filtered.reduce((s, v) => s + v.finalTotal, 0)

  async function handleValidate(saleId: string) {
    setActionLoading(saleId)
    try {
      await window.api.validateSale(saleId)
      load()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erreur')
    } finally { setActionLoading(null) }
  }

  async function handlePay(saleId: string) {
    setActionLoading(saleId)
    try {
      await window.api.paySale(saleId)
      load()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erreur')
    } finally { setActionLoading(null) }
  }

  async function handleCancel(saleId: string) {
    if (!confirm('Annuler cette facture ? Le stock sera restitué.')) return
    setActionLoading(saleId)
    try {
      await window.api.cancelSale(saleId)
      load()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erreur')
    } finally { setActionLoading(null) }
  }

  function canValidate(s: SaleWithClient): boolean {
    return s.status === 'EN_ATTENTE'
  }
  function canPay(s: SaleWithClient): boolean {
    return s.status === 'VALIDE'
  }
  function canCancel(s: SaleWithClient): boolean {
    return s.status !== 'PAYE' && s.status !== 'ANNULE'
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" /> Factures & Ventes
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Historique de toutes les ventes</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">CA filtré</p>
          <p className="text-xl font-bold text-primary">
            {formatCurrency(totalCA)}
          </p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Rechercher par client, entrepôt, statut, agent, paiement…" value={search} onChange={e => setSearch(e.target.value)} className="pl-10 h-11 rounded-lg" />
      </div>

      {loading && <div className="flex justify-center py-12"><div className="h-7 w-7 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>}

      {!loading && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
          <ShoppingBag className="h-10 w-10 text-muted-foreground/40" />
          <p className="mt-3 font-semibold text-muted-foreground">
            {search ? 'Aucun résultat' : 'Aucune vente enregistrée'}
          </p>
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Date</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Facture</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Client</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Entrepôt</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Statut</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Agent</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Paiement</th>
                <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total</th>
                <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map(s => (
                <tr key={s.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-5 py-3.5 text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(s.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-5 py-3.5 text-xs font-mono text-muted-foreground">
                    {s.invoiceNumber}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5 text-muted-foreground" />
                      {s.client?.name ?? <span className="italic text-muted-foreground">Anonyme</span>}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-muted-foreground">{s.warehouse.name}</td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLORS[s.status as SaleStatus] ?? 'bg-muted text-muted-foreground'}`}>
                      {STATUS_LABELS[s.status as SaleStatus] ?? s.status}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-xs text-muted-foreground">
                    {s.agent ? (
                      <span className="flex items-center gap-1">
                        <UserCheck className="h-3 w-3" /> {s.agent.name}
                      </span>
                    ) : <span className="italic">—</span>}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${PAYMENT_COLORS[s.paymentMethod] ?? 'bg-muted text-muted-foreground'}`}>
                      <CreditCard className="h-3 w-3" /> {PAYMENT_LABELS[s.paymentMethod] ?? s.paymentMethod}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right font-semibold text-primary whitespace-nowrap">
                    {formatCurrency(s.finalTotal)}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-center gap-1">
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setSelectedSale(s)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      {canValidate(s) && (
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-blue-600" disabled={actionLoading === s.id} onClick={() => handleValidate(s.id)} title="Valider">
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                      )}
                      {canPay(s) && (
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-emerald-600" disabled={actionLoading === s.id} onClick={() => handlePay(s.id)} title="Marquer comme payée">
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                      )}
                      {canCancel(s) && (
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-600" disabled={actionLoading === s.id} onClick={() => handleCancel(s.id)} title="Annuler">
                          <XCircle className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <FactureDetailModal
        open={selectedSale !== null}
        onClose={() => setSelectedSale(null)}
        sale={selectedSale}
      />
    </div>
  )
}