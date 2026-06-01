import { useState, useEffect } from 'react'
import {
  Package, TrendingUp, AlertTriangle, Users, ShoppingCart,
  ArrowRight, BarChart3, Zap, DollarSign, Activity,
  Wallet, ArrowUpRight, ArrowDownRight, ShoppingCart as CartIcon
} from 'lucide-react'
import { Button } from '../components/ui/button'
import { SimpleBarChart } from '../components/SimpleBarChart'
import type { SaleWithClient, StockAlert, ClientStats, Expense, CashTransactionWithLines } from '../../../shared/types'
import { formatCurrency } from '@/lib/utils'

interface DashboardStats {
  totalProduits: number
  totalVentes: number
  chiffreAffaires: number
  alertesStock: number
  totalClients: number
  ventesDuJour: number
  caDuJour: number
}

interface ActivityEntry {
  id: string
  type: 'vente' | 'produit' | 'client' | 'depense' | 'caisse_entree' | 'caisse_sortie'
  label: string
  sub: string
  time: string
  amount?: number
}

interface Props {
  onNavigate: (view: string) => void
}

const ACTIVITY_ICONS: Record<string, typeof Activity> = {
  vente: CartIcon,
  produit: Package,
  client: Users,
  depense: Wallet,
  caisse_entree: ArrowUpRight,
  caisse_sortie: ArrowDownRight,
}

function StatCard({ label, value, sub, colorClass, icon: Icon }: { label: string; value: string; sub?: string; colorClass: string; icon: any }) {
  return (
    <div className={`rounded-lg p-5 text-white shadow-lg ${colorClass} animate-fade-in`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium opacity-80">{label}</p>
          <p className="mt-1 text-3xl font-bold">{value}</p>
          {sub && <p className="mt-1 text-xs opacity-70">{sub}</p>}
        </div>
        <div className="rounded-lg bg-white/20 p-2.5">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  )
}

export default function Dashboard({ onNavigate }: Props) {
  const [stats, setStats] = useState<DashboardStats>({
    totalProduits: 0, totalVentes: 0, chiffreAffaires: 0,
    alertesStock: 0, totalClients: 0, ventesDuJour: 0, caDuJour: 0
  })
  const [recentSales, setRecentSales] = useState<SaleWithClient[]>([])
  const [alerts, setAlerts] = useState<StockAlert[]>([])
  const [recentActivity, setRecentActivity] = useState<ActivityEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [products, sales, stockAlerts, clients, expenses, cashTransactions] = await Promise.all([
          window.api.getProducts() as any,
          window.api.getSales() as any,
          window.api.getStockAlerts() as any,
          window.api.getClients() as any,
          window.api.getExpenses() as Promise<Expense[]>,
          window.api.getCashTransactions('') as Promise<CashTransactionWithLines[]>,
        ])
        const today = new Date().toDateString()
        const ventesToday = (sales as SaleWithClient[]).filter(s => new Date(s.createdAt).toDateString() === today)
        setStats({
          totalProduits: products.length,
          totalVentes: sales.length,
          chiffreAffaires: (sales as SaleWithClient[]).reduce((s: number, v: SaleWithClient) => s + v.finalTotal, 0),
          alertesStock: stockAlerts.length,
          totalClients: clients.length,
          ventesDuJour: ventesToday.length,
          caDuJour: ventesToday.reduce((s: number, v: SaleWithClient) => s + v.finalTotal, 0),
        })
        setRecentSales((sales as SaleWithClient[]).slice(0, 5))
        setAlerts((stockAlerts as StockAlert[]).slice(0, 4))

        // Activités récentes (5 dernières toutes actions confondues)
        const entries: ActivityEntry[] = []

        for (const s of sales as SaleWithClient[]) {
          entries.push({
            id: `s-${s.id}`, type: 'vente',
            label: `Vente — ${s.client?.name ?? 'Client anonyme'}`,
            sub: `${s.items.length} article${s.items.length !== 1 ? 's' : ''} · ${s.warehouse.name}`,
            time: s.createdAt, amount: s.finalTotal
          })
        }

        for (const p of products as any[]) {
          entries.push({
            id: `p-${p.id}`, type: 'produit',
            label: `Produit ajouté — ${p.name}`,
            sub: `Code : ${p.barcode}`, time: p.createdAt
          })
        }

        for (const e of expenses) {
          entries.push({
            id: `e-${e.id}`, type: 'depense',
            label: `Dépense — ${e.title}`,
            sub: e.category, time: e.date, amount: -e.amount
          })
        }

        for (const t of cashTransactions) {
          const fl = t.lines?.[0]
          entries.push({
            id: `ct-${t.id}`,
            type: t.type === 'ENTREE' ? 'caisse_entree' : 'caisse_sortie',
            label: t.type === 'ENTREE' ? `Encaissement — ${fl?.product?.name ?? t.description ?? 'Transaction'}` : `Décaissement — ${fl?.product?.name ?? t.description ?? 'Transaction'}`,
            sub: t.paymentMethod, time: t.createdAt,
            amount: t.type === 'ENTREE' ? t.totalAmount : -t.totalAmount
          })
        }

        entries.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
        setRecentActivity(entries.slice(0, 5))
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

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
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
  }

  const dayOfWeek = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })

  // Graphique 7 derniers jours
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    return d
  })
  const chartData = last7Days.map((d) => {
    const key = d.toDateString()
    const total = recentSales
      .filter((s) => new Date(s.createdAt).toDateString() === key)
      .reduce((sum, s) => sum + s.finalTotal, 0)
    return {
      label: d.toLocaleDateString('fr-FR', { weekday: 'short' }),
      value: total
    }
  })

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Chargement du tableau de bord…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* En-tête */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Tableau de bord</h1>
          <p className="mt-0.5 text-sm capitalize text-muted-foreground">{dayOfWeek}</p>
        </div>
        <Button onClick={() => onNavigate('caisse')} className="gap-2 shadow-md">
          <ShoppingCart className="h-4 w-4" /> Nouvelle vente
        </Button>
      </div>

      {/* Stats principales */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Produits" value={stats.totalProduits.toString()} sub="articles en catalogue" colorClass="stat-card-green" icon={Package} />
        <StatCard label="CA Total" value={formatCurrency(stats.chiffreAffaires)} sub={`${stats.totalVentes} ventes`} colorClass="stat-card-slate" icon={TrendingUp} />
        <StatCard label="Alertes stock" value={stats.alertesStock.toString()} sub="produits sous seuil" colorClass={stats.alertesStock > 0 ? 'stat-card-rose' : 'stat-card-green'} icon={AlertTriangle} />
        <StatCard label="Clients" value={stats.totalClients.toString()} sub="clients enregistrés" colorClass="stat-card-indigo" icon={Users} />
      </div>

      {/* Stats du jour */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-lg border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Ventes aujourd'hui</p>
            <Activity className="h-4 w-4 text-primary" />
          </div>
          <p className="mt-2 text-4xl font-bold text-foreground">{stats.ventesDuJour}</p>
          <p className="mt-1 text-sm text-muted-foreground">transactions effectuées</p>
        </div>
        <div className="rounded-lg border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">CA aujourd'hui</p>
            <DollarSign className="h-4 w-4 text-primary" />
          </div>
          <p className="mt-2 text-4xl font-bold text-foreground">
            {formatCurrency(stats.caDuJour)}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">chiffre d'affaires du jour</p>
        </div>
      </div>

      {/* Graphique ventes 7 jours */}
      <div className="rounded-lg border bg-card p-5 shadow-sm">
        <p className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <BarChart3 className="h-3.5 w-3.5 text-primary" /> Évolution des ventes (7 jours)
        </p>
        <SimpleBarChart data={chartData} height={160} />
      </div>

      {/* Actions rapides */}
      <div className="rounded-lg border bg-card p-5 shadow-sm">
        <p className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <Zap className="h-3.5 w-3.5 text-amber-500" /> Accès rapides
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'Nouveau produit', view: 'produits', color: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-400' },
            { label: 'Catégories', view: 'categories', color: 'bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/30 dark:text-blue-400' },
            { label: 'Rapport stock', view: 'rapports', color: 'bg-purple-50 text-purple-700 hover:bg-purple-100 dark:bg-purple-950/30 dark:text-purple-400' },
            { label: 'Stock faible', view: 'stock-faible', color: 'bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/30 dark:text-rose-400' },
          ].map(item => (
            <button key={item.view} onClick={() => onNavigate(item.view)}
              className={`flex items-center justify-between rounded-lg px-4 py-3 text-sm font-semibold transition-all ${item.color}`}>
              {item.label}
              <ArrowRight className="h-4 w-4 opacity-60" />
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Ventes récentes */}
        <div className="rounded-lg border bg-card shadow-sm">
          <div className="flex items-center justify-between border-b px-5 py-4">
            <p className="font-semibold flex items-center gap-2"><BarChart3 className="h-4 w-4 text-primary" /> Ventes récentes</p>
            <button onClick={() => onNavigate('factures')} className="text-xs text-primary hover:underline flex items-center gap-1">
              Voir tout <ArrowRight className="h-3 w-3" />
            </button>
          </div>
          <div className="divide-y">
            {recentSales.length === 0 && (
              <p className="px-5 py-6 text-center text-sm text-muted-foreground">Aucune vente enregistrée</p>
            )}
            {recentSales.map(s => (
              <div key={s.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm font-medium">{s.client?.name ?? 'Client anonyme'}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(s.createdAt).toLocaleDateString('fr-FR')} · {s.paymentMethod}
                  </p>
                </div>
                <span className="font-semibold text-primary text-sm">
                  {formatCurrency(s.finalTotal)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Activités récentes */}
        <div className="rounded-lg border bg-card shadow-sm">
          <div className="flex items-center justify-between border-b px-5 py-4">
            <p className="font-semibold flex items-center gap-2"><Activity className="h-4 w-4 text-primary" /> Activités récentes</p>
            <button onClick={() => onNavigate('journal')} className="text-xs text-primary hover:underline flex items-center gap-1">
              Voir tout <ArrowRight className="h-3 w-3" />
            </button>
          </div>
          <div className="divide-y">
            {recentActivity.length === 0 && (
              <p className="px-5 py-6 text-center text-sm text-muted-foreground">Aucune activité</p>
            )}
            {recentActivity.map(a => {
              const Icon = ACTIVITY_ICONS[a.type]
              return (
                <div key={a.id} className="flex items-center gap-3 px-5 py-3">
                  <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                    a.type === 'vente' || a.type === 'caisse_entree' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400' :
                    a.type === 'depense' || a.type === 'caisse_sortie' ? 'bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400' :
                    a.type === 'produit' ? 'bg-blue-100 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400' :
                    'bg-purple-100 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400'
                  }`}>
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{a.label}</p>
                    <p className="text-xs text-muted-foreground">{a.sub}</p>
                  </div>
                  <div className="text-right shrink-0">
                    {a.amount !== undefined && (
                      <p className={`text-sm font-bold ${a.amount >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {a.amount >= 0 ? '+' : ''}{formatCurrency(a.amount)}
                      </p>
                    )}
                    <p className="text-[10px] text-muted-foreground">{formatTime(a.time)}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Alertes stock */}
        <div className="rounded-lg border bg-card shadow-sm">
          <div className="flex items-center justify-between border-b px-5 py-4">
            <p className="font-semibold flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-rose-500" /> Alertes stock</p>
            <button onClick={() => onNavigate('stock-faible')} className="text-xs text-primary hover:underline flex items-center gap-1">
              Voir tout <ArrowRight className="h-3 w-3" />
            </button>
          </div>
          <div className="divide-y">
            {alerts.length === 0 && (
              <p className="px-5 py-6 text-center text-sm text-muted-foreground">✓ Tous les stocks sont en ordre</p>
            )}
            {alerts.map((a, i) => (
              <div key={i} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm font-medium">{a.product.name}</p>
                  <p className="text-xs text-muted-foreground">{a.warehouse.name}</p>
                </div>
                <div className="text-right">
                  <span className="inline-flex items-center rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-semibold text-rose-700 dark:bg-rose-950/40 dark:text-rose-400">
                    {a.stock.quantity} / {a.stock.alertLimit}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
