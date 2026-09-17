import { useEffect, useState } from 'react'
import {
  Warehouse as WarehouseIcon, ArrowRight, TrendingUp, Package, AlertTriangle,
  BarChart3, Building2, Award, ChevronRight, Activity,
  ArrowUpRight, ArrowDownRight, Store
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts'
import { useNavigate } from '../hooks/useNavigate'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'
import { cn, formatCurrency } from '@/lib/utils'
import { toFileUrl } from '../../../shared/imageUtils'
import type { Warehouse, GlobalStats, DashboardSummary } from '../../../shared/types'

const PERIODS = [
  { id: 'semaine', label: 'Sem.' },
  { id: 'mois', label: 'Mois' },
  { id: 'trimestre', label: 'Trim.' },
  { id: 'semestre', label: 'Semestre' },
  { id: 'annee', label: 'Année' },
]

const CHART_PRIMARY = 'hsl(240 67% 57%)'
const CHART_MUTED = 'hsl(220 10% 72%)'
const PIE_COLORS = [
  'hsl(240 67% 57%)',
  'hsl(220 10% 72%)',
  'hsl(220 10% 56%)',
  'hsl(220 10% 40%)',
]

function EvolutionBadge({ value }: { value: number }) {
  const isGood = value >= 0
  return (
    <span className={cn(
      'inline-flex items-center gap-0.5 text-[10px] font-medium',
      isGood ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'
    )}>
      {isGood ? <ArrowUpRight className="h-3 w-3" strokeWidth={1.5} /> : <ArrowDownRight className="h-3 w-3" strokeWidth={1.5} />}
      {Math.abs(Math.round(value))}%
    </span>
  )
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded border bg-popover px-3 py-2 shadow-md text-xs">
      <p className="font-medium mb-1 text-foreground">{label}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground">{p.name}</span>
          <span className="font-semibold text-foreground tabular-nums">{formatCurrency(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

export default function Accueil() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [stats, setStats] = useState<GlobalStats | null>(null)
  const [dashboardData, setDashboardData] = useState<DashboardSummary | null>(null)
  const [period, setPeriod] = useState('mois')
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    Promise.all([
      window.api.getWarehouses(),
      window.api.getGlobalStats().catch(() => null)
    ]).then(([w, s]) => {
      setWarehouses(w)
      setStats(s)
    }).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    window.api.getDashboardStats(period).then(setDashboardData).catch(() => {})
  }, [period])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!loading && warehouses.length === 0) {
    return (
      <div className="space-y-5">
        <div>
          <h1 className="text-base font-semibold text-foreground">Bienvenue sur Iventello</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Créez votre première boutique pour commencer.</p>
        </div>
        <div className="rounded-md border border-dashed border-border">
          <div className="flex flex-col items-center gap-4 py-16">
            <Store className="h-10 w-10 text-muted-foreground/30" strokeWidth={1.5} />
            <Button size="sm" onClick={() => navigate('entrepots')}>
              <Store className="mr-2 h-3.5 w-3.5" strokeWidth={1.5} /> Créer une boutique
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const maxSales = stats?.warehouseStats?.length
    ? Math.max(...stats.warehouseStats.map(w => w.sales), 1)
    : 1
  const c = dashboardData?.current

  return (
    <div className="space-y-5 animate-fade-in">
      {/* En-tête + sélecteur période */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold text-foreground">Vue globale</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Toutes vos boutiques</p>
        </div>
        <div className="flex items-center border border-border rounded-md overflow-hidden">
          {PERIODS.map(p => (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id)}
              className={cn(
                'px-3 py-1.5 text-xs font-medium transition-colors border-r border-border last:border-r-0',
                period === p.id
                  ? 'bg-foreground text-background'
                  : 'bg-card text-muted-foreground hover:bg-accent hover:text-foreground'
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPIs globaux — uniformes, sans border-l colorée */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-md border border-border bg-card p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">Boutiques</p>
            <Store className="h-3.5 w-3.5 text-muted-foreground/50" strokeWidth={1.5} />
          </div>
          <p className="text-xl font-semibold text-foreground">{stats?.warehouses ?? 0}</p>
        </div>
        <div className="rounded-md border border-border bg-card p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">Produits</p>
            <Package className="h-3.5 w-3.5 text-muted-foreground/50" strokeWidth={1.5} />
          </div>
          <p className="text-xl font-semibold text-foreground">{stats?.products ?? 0}</p>
        </div>
        <div className="rounded-md border border-border bg-card p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
              CA {PERIODS.find(p => p.id === period)?.label}
            </p>
            <TrendingUp className="h-3.5 w-3.5 text-muted-foreground/50" strokeWidth={1.5} />
          </div>
          <p className="text-xl font-semibold text-foreground tabular-nums">{formatCurrency(c?.revenu ?? 0)}</p>
          {dashboardData && <EvolutionBadge value={dashboardData.evolution.revenu} />}
        </div>
        <div className="rounded-md border border-border bg-card p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">Alertes stock</p>
            <AlertTriangle className="h-3.5 w-3.5 text-muted-foreground/50" strokeWidth={1.5} />
          </div>
          <p className={`text-xl font-semibold tabular-nums ${(stats?.stockAlerts ?? 0) > 0 ? 'text-destructive' : 'text-foreground'}`}>
            {stats?.stockAlerts ?? 0}
          </p>
        </div>
      </div>

      {/* Graphiques */}
      {dashboardData && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="rounded-md border border-border bg-card p-4 lg:col-span-2">
            <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2">
              <BarChart3 className="h-3.5 w-3.5" strokeWidth={1.5} /> Évolution
            </p>
            <ResponsiveContainer width="100%" height={190}>
              <BarChart data={dashboardData.chart} barGap={3}>
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'hsl(220 8% 48%)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: 'hsl(220 8% 48%)' }} axisLine={false} tickLine={false} tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(220 10% 94% / 0.5)' }} />
                <Bar dataKey="revenu" name="Revenu" fill={CHART_PRIMARY} radius={[3, 3, 0, 0]} maxBarSize={32} />
                <Bar dataKey="depenses" name="Dépenses" fill={CHART_MUTED} radius={[3, 3, 0, 0]} maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-md border border-border bg-card p-4">
            <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2">
              <Activity className="h-3.5 w-3.5" strokeWidth={1.5} /> Répartition
            </p>
            <ResponsiveContainer width="100%" height={190}>
              <PieChart>
                <Pie
                  data={[
                    { name: 'Revenu', value: Math.max(c?.revenu ?? 0, 0) },
                    { name: 'Dépenses', value: Math.max(c?.depenses ?? 0, 0) },
                    { name: 'Achats', value: Math.max(c?.achats ?? 0, 0) },
                    { name: 'Bénéfice', value: Math.max(c?.benefice ?? 0, 0) },
                  ]}
                  cx="50%" cy="50%" innerRadius={40} outerRadius={78}
                  paddingAngle={2} dataKey="value"
                >
                  {PIE_COLORS.map((color, i) => <Cell key={i} fill={color} stroke="none" />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap justify-center gap-3 mt-1 text-[10px]">
              {['Revenu', 'Dépenses', 'Achats', 'Bénéfice'].map((name, i) => (
                <span key={name} className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: PIE_COLORS[i] }} />
                  <span className="text-muted-foreground">{name}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Classement entrepôts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="rounded-md border border-border bg-card p-4 lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <Award className="h-3.5 w-3.5" strokeWidth={1.5} /> Classement
            </p>
            <span className="text-[10px] text-muted-foreground">Ventes ce mois</span>
          </div>
          <div className="divide-y divide-border">
            {stats?.warehouseStats?.map((w, i) => (
              <div
                key={w.id}
                className="flex items-center gap-3 py-2.5 hover:bg-accent/30 transition-colors cursor-pointer rounded-sm px-1"
                onClick={() => navigate('workspace', w.id, w.name)}
              >
                <span className="text-[10px] font-medium text-muted-foreground w-4 text-center shrink-0">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate text-foreground">{w.name}</p>
                  <div className="flex gap-3 text-[10px] text-muted-foreground mt-0.5">
                    <span>{w.products} produits</span>
                    {w.alerts > 0 && <span className="text-destructive">{w.alerts} alertes</span>}
                  </div>
                </div>
                <div className="text-right flex items-center gap-2">
                  <p className="text-xs font-semibold tabular-nums text-foreground">{formatCurrency(w.sales)}</p>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />
                </div>
              </div>
            ))}
            {(!stats?.warehouseStats || stats.warehouseStats.length === 0) && (
              <p className="text-xs text-muted-foreground text-center py-6">Aucune donnée de vente ce mois-ci</p>
            )}
          </div>
        </div>

        <div className="space-y-3">
          {/* Meilleur entrepôt — fond neutre, zéro gradient */}
          {stats?.topWarehouse && (
            <div className="rounded-md border border-border bg-card p-4">
              <div className="flex items-center gap-2 mb-2">
                <Award className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />
                <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">Meilleure boutique</span>
              </div>
              <p className="text-sm font-semibold text-foreground">{stats.topWarehouse.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5 tabular-nums">{formatCurrency(stats.topWarehouse.sales)} de ventes</p>
              <div className="mt-2 flex gap-3 text-[10px] text-muted-foreground">
                <span>{stats.topWarehouse.products} produits</span>
                <span>{stats.topWarehouse.totalItems} en stock</span>
              </div>
            </div>
          )}

          {/* Barres boutiques */}
          <div className="rounded-md border border-border bg-card p-4">
            <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground mb-3">Ventes par boutique</p>
            <div className="space-y-2.5">
              {stats?.warehouseStats?.map(w => {
                const pct = maxSales > 0 ? (w.sales / maxSales) * 100 : 0
                const isTop = w.id === stats.topWarehouse?.id
                return (
                  <div key={w.id} className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground w-16 truncate text-right shrink-0">{w.name}</span>
                    <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: isTop ? CHART_PRIMARY : 'hsl(220 10% 72%)'
                        }}
                      />
                    </div>
                    <span className="text-[10px] font-medium w-14 text-right tabular-nums text-foreground shrink-0">
                      {formatCurrency(w.sales)}
                    </span>
                  </div>
                )
              })}
              {(!stats?.warehouseStats || stats.warehouseStats.length === 0) && (
                <p className="text-xs text-muted-foreground text-center py-3">Aucune vente</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Accès boutiques */}
      <div>
        <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground mb-3">Accéder à une boutique</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
          {warehouses.map((w) => (
            <button
              key={w.id}
              className="flex items-center justify-between rounded-md border border-border bg-card p-3 hover:bg-accent transition-colors text-left group"
              onClick={() => navigate('workspace', w.id, w.name)}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex h-8 w-8 items-center justify-center border border-border rounded-lg overflow-hidden shrink-0 bg-background shadow-2xs">
                  {w.logoUrl ? (
                    <img src={toFileUrl(w.logoUrl)} alt={w.name} className="h-full w-full object-contain p-0.5" />
                  ) : (
                    <WarehouseIcon className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium truncate text-foreground">{w.name}</p>
                  {w.location && <p className="text-[10px] text-muted-foreground truncate">{w.location}</p>}
                </div>
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0 transition-transform group-hover:translate-x-0.5" strokeWidth={1.5} />
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
