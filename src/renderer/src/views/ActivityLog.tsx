import { useEffect, useState } from 'react'
import { Activity, ShoppingCart, Package, Users, Wallet, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { useEntrepotStore } from '../stores/entrepotStore'
import type { SaleWithClient, Expense, CashTransactionWithLines } from '../../../shared/types'
import { formatCurrency } from '@/lib/utils'

interface LogEntry {
  type: 'vente' | 'produit' | 'client' | 'depense' | 'caisse_entree' | 'caisse_sortie'
  label: string
  sub: string
  time: string
  amount?: number
}

const TYPE_CONFIG = {
  vente: { icon: ShoppingCart, bg: 'bg-emerald-100 dark:bg-emerald-950/40', color: 'text-emerald-600 dark:text-emerald-400' },
  produit: { icon: Package, bg: 'bg-blue-100 dark:bg-blue-950/40', color: 'text-blue-600 dark:text-blue-400' },
  client: { icon: Users, bg: 'bg-purple-100 dark:bg-purple-950/40', color: 'text-purple-600 dark:text-purple-400' },
  depense: { icon: Wallet, bg: 'bg-rose-100 dark:bg-rose-950/40', color: 'text-rose-600 dark:text-rose-400' },
  caisse_entree: { icon: ArrowUpRight, bg: 'bg-emerald-100 dark:bg-emerald-950/40', color: 'text-emerald-600 dark:text-emerald-400' },
  caisse_sortie: { icon: ArrowDownRight, bg: 'bg-red-100 dark:bg-red-950/40', color: 'text-red-600 dark:text-red-400' },
}

export default function ActivityLog() {
  const { selectedId: workspaceId } = useEntrepotStore()
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [sales, products, clients, expenses, cashTransactions] = await Promise.all([
        window.api.getSales() as Promise<SaleWithClient[]>,
        window.api.getProducts() as Promise<any[]>,
        window.api.getClients() as Promise<any[]>,
        window.api.getExpenses() as Promise<Expense[]>,
        workspaceId ? window.api.getCashTransactions(workspaceId) as Promise<CashTransactionWithLines[]> : Promise.resolve([]),
      ])

      const entries: LogEntry[] = []

      for (const s of sales) {
        if (workspaceId && s.warehouseId !== workspaceId) continue
        entries.push({
          type: 'vente',
          label: `Vente — ${s.client?.name ?? 'Client anonyme'}`,
          sub: `${s.items.length} article${s.items.length !== 1 ? 's' : ''} · ${s.paymentMethod} · ${s.warehouse.name}`,
          time: s.createdAt,
          amount: s.finalTotal
        })
      }

      for (const p of products) {
        entries.push({
          type: 'produit',
          label: `Produit ajouté — ${p.name}`,
          sub: `Code : ${p.barcode}`,
          time: p.createdAt
        })
      }

      for (const c of clients) {
        entries.push({
          type: 'client',
          label: `Client enregistré — ${c.client.name}`,
          sub: `${c.client.email ?? 'Pas d\'email'} · ${c.purchaseCount} achat${c.purchaseCount !== 1 ? 's' : ''}`,
          time: c.client.createdAt
        })
      }

      for (const e of expenses) {
        entries.push({
          type: 'depense',
          label: `Dépense — ${e.title}`,
          sub: `Catégorie : ${e.category}`,
          time: e.date,
          amount: -e.amount
        })
      }

      for (const t of cashTransactions) {
        const firstLine = t.lines?.[0]
        entries.push({
          type: t.type === 'ENTREE' ? 'caisse_entree' : 'caisse_sortie',
          label: t.type === 'ENTREE' ? `Encaissement — ${firstLine?.product?.name ?? t.description ?? 'Sans produit'}` : `Décaissement — ${firstLine?.product?.name ?? t.description ?? 'Sans produit'}`,
          sub: `${t.paymentMethod} · ${t.warehouse.name}`,
          time: t.createdAt,
          amount: t.type === 'ENTREE' ? t.totalAmount : -t.totalAmount
        })
      }

      entries.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
      setLogs(entries)
      setLoading(false)
    }
    load()
  }, [workspaceId])

  function formatTime(iso: string) {
    const d = new Date(iso)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffMin = Math.floor(diffMs / 60000)
    const diffH = Math.floor(diffMin / 60)
    const diffD = Math.floor(diffH / 24)
    if (diffMin < 1) return "À l'instant"
    if (diffMin < 60) return `Il y a ${diffMin} min`
    if (diffH < 24) return `Il y a ${diffH} h`
    if (diffD < 7) return `Il y a ${diffD} j`
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="h-6 w-6 text-primary" /> Journal d'activité
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Historique chronologique de toutes les opérations</p>
        </div>
        <div className="rounded-lg bg-card border px-4 py-2 text-sm font-semibold text-muted-foreground shadow-sm">
          {logs.length} événements
        </div>
      </div>

      {loading && <div className="flex justify-center py-12"><div className="h-7 w-7 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>}

      {!loading && logs.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
          <Activity className="h-10 w-10 text-muted-foreground/40" />
          <p className="mt-3 font-semibold text-muted-foreground">Aucune activité enregistrée</p>
        </div>
      )}

      {!loading && logs.length > 0 && (
        <div className="relative">
          <div className="absolute left-[22px] top-0 bottom-0 w-px bg-border" />

          <div className="space-y-1">
            {logs.map((log, i) => {
              const cfg = TYPE_CONFIG[log.type]
              const Icon = cfg.icon
              return (
                <div key={i} className="relative flex gap-4 pb-4 animate-slide-in" style={{ animationDelay: `${i * 0.02}s` }}>
                  <div className={`relative z-10 flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg ${cfg.bg}`}>
                    <Icon className={`h-5 w-5 ${cfg.color}`} />
                  </div>
                  <div className="flex-1 min-w-0 rounded-lg border bg-card px-4 py-3 shadow-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-sm">{log.label}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{log.sub}</p>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        {log.amount !== undefined && (
                          <p className={`text-sm font-bold whitespace-nowrap ${log.amount >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            {log.amount >= 0 ? '+' : ''}{formatCurrency(log.amount)}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground whitespace-nowrap">{formatTime(log.time)}</p>
                      </div>
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
