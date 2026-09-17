import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { QUERY_KEYS } from '../lib/queryClient'
import {
  Package, TrendingUp, AlertTriangle, ShoppingCart,
  ArrowRight, BarChart3, Activity,
  Wallet, ArrowUpRight, ArrowDownRight
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell
} from 'recharts'
import { cn, formatCurrency } from '@/lib/utils'
import type {
  DashboardSummary
} from '../../../shared/types'
import { useEntrepotStore } from '../stores/entrepotStore'

const PERIODS = [
  { id: 'semaine', label: 'Sem.' },
  { id: 'mois', label: 'Mois' },
  { id: 'trimestre', label: 'Trim.' },
  { id: 'semestre', label: 'Sem.' },
  { id: 'annee', label: 'Année' },
]

// Palette réduite : accent primary + neutre muted
const CHART_PRIMARY = 'hsl(240 67% 57%)'
const CHART_MUTED = 'hsl(220 10% 72%)'
const PIE_COLORS = [
  'hsl(240 67% 57%)',
  'hsl(220 10% 72%)',
  'hsl(220 10% 56%)',
  'hsl(220 10% 40%)',
]

interface Props {
  onNavigate: (view: string) => void
}

function EvolutionBadge({ value, suffix = '' }: { value: number; suffix?: string }) {
  const isGood = value >= 0
  return (
    <span className={cn(
      'inline-flex items-center gap-0.5 text-[10px] font-medium',
      isGood ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'
    )}>
      {isGood ? <ArrowUpRight className="h-3 w-3" strokeWidth={1.5} /> : <ArrowDownRight className="h-3 w-3" strokeWidth={1.5} />}
      {Math.abs(Math.round(value))}{suffix}
    </span>
  )
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded border bg-popover px-3 py-2 shadow-md text-xs">
      <p className="font-medium text-foreground mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center justify-between gap-4">
          <span className="text-muted-foreground">{p.name}</span>
          <span className="font-semibold tabular-nums text-foreground">{formatCurrency(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

export default function Dashboard({ onNavigate }: Props) {
  const { selectedId: workspaceId } = useEntrepotStore()
  const [period, setPeriod] = useState('mois')

  const { data = null, isLoading: loading } = useQuery<DashboardSummary | null>({
    queryKey: QUERY_KEYS.dashboardStats(period, workspaceId || undefined),
    queryFn: () => window.api.getDashboardStats(period, workspaceId || undefined)
  })

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  const c = data?.current

  return (
    <div className="space-y-5 animate-fade-in">
      {/* En-tête + sélecteur de période */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold text-foreground">Tableau de bord</h1>
          <p className="text-xs text-muted-foreground mt-0.5 capitalize">
            {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
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

      {/* KPIs principaux */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: 'CA', value: formatCurrency(c?.revenu ?? 0), evo: data?.evolution.revenu ?? 0 },
          { label: 'Ventes', value: String(c?.ventes ?? 0), evo: data?.evolution.ventes ?? 0 },
          { label: 'Bénéfice', value: formatCurrency(c?.benefice ?? 0), evo: data?.evolution.benefice ?? 0 },
          { label: 'Dépenses', value: formatCurrency(c?.depenses ?? 0), evo: data?.evolution.depenses ?? 0 },
        ].map(item => (
          <div key={item.label} className="rounded-md border border-border bg-card p-4">
            <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">{item.label}</p>
            <p className="mt-1.5 text-xl font-semibold text-foreground tabular-nums">{item.value}</p>
            <div className="mt-1 flex items-center gap-1.5">
              <EvolutionBadge value={item.evo} suffix="%" />
              <span className="text-[10px] text-muted-foreground/60">vs précédent</span>
            </div>
          </div>
        ))}
      </div>

      {/* Graphiques */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Bar chart */}
        <div className="rounded-md border border-border bg-card p-4 lg:col-span-2">
          <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <BarChart3 className="h-3.5 w-3.5" strokeWidth={1.5} />
            Évolution
          </p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data?.chart ?? []} barGap={3}>
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'hsl(220 8% 48%)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: 'hsl(220 8% 48%)' }} axisLine={false} tickLine={false} tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(220 10% 94% / 0.5)' }} />
              <Bar dataKey="revenu" name="Revenu" fill={CHART_PRIMARY} radius={[3, 3, 0, 0]} maxBarSize={32} />
              <Bar dataKey="depenses" name="Dépenses" fill={CHART_MUTED} radius={[3, 3, 0, 0]} maxBarSize={32} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pie chart */}
        <div className="rounded-md border border-border bg-card p-4">
          <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <Activity className="h-3.5 w-3.5" strokeWidth={1.5} />
            Répartition
          </p>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={[
                  { name: 'Revenu', value: Math.max(c?.revenu ?? 0, 0) },
                  { name: 'Dépenses', value: Math.max(c?.depenses ?? 0, 0) },
                  { name: 'Achats', value: Math.max(c?.achats ?? 0, 0) },
                  { name: 'Bénéfice', value: Math.max(c?.benefice ?? 0, 0) },
                ]}
                cx="50%" cy="50%" innerRadius={48} outerRadius={82}
                paddingAngle={2} dataKey="value"
              >
                {PIE_COLORS.slice(0, 4).map((color, i) => (
                  <Cell key={i} fill={color} stroke="none" />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap justify-center gap-3 text-[10px]">
            {['Revenu', 'Dépenses', 'Achats', 'Bénéfice'].map((name, i) => (
              <span key={name} className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: PIE_COLORS[i] }} />
                <span className="text-muted-foreground">{name}</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Tendance CA + Top produits */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Line chart */}
        <div className="rounded-md border border-border bg-card p-4 lg:col-span-2">
          <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <TrendingUp className="h-3.5 w-3.5" strokeWidth={1.5} />
            Tendance CA
          </p>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={data?.chart ?? []}>
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'hsl(220 8% 48%)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: 'hsl(220 8% 48%)' }} axisLine={false} tickLine={false} tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone" dataKey="revenu" name="CA"
                stroke={CHART_PRIMARY} strokeWidth={1.5}
                dot={{ r: 2.5, fill: CHART_PRIMARY, strokeWidth: 0 }}
                activeDot={{ r: 4, strokeWidth: 0 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Top produits */}
        <div className="rounded-md border border-border bg-card p-4">
          <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <Package className="h-3.5 w-3.5" strokeWidth={1.5} />
            Top produits
          </p>
          <div className="space-y-3">
            {(!data?.topProducts || data.topProducts.length === 0) && (
              <p className="text-xs text-muted-foreground text-center py-6">Aucune vente sur cette période</p>
            )}
            {data?.topProducts.slice(0, 5).map((p, i) => (
              <div key={p.name} className="flex items-center gap-2.5">
                <span className="text-[10px] font-medium text-muted-foreground w-4 text-right shrink-0">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate text-foreground">{p.name}</p>
                  <p className="text-[10px] text-muted-foreground">{p.quantity} vendu{p.quantity > 1 ? 's' : ''}</p>
                </div>
                <span className="text-xs font-semibold tabular-nums text-foreground shrink-0">{formatCurrency(p.revenu)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Résumé + accès rapides */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Résumé stats */}
        <div className="rounded-md border border-border bg-card p-4">
          <p className="mb-3 text-[10px] font-medium uppercase tracking-widest text-muted-foreground">Résumé période</p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Produits vendus', value: String(c?.produitsVendus ?? 0), sub: 'articles', icon: Package },
              { label: 'Achats (stocks)', value: formatCurrency(c?.achats ?? 0), sub: 'réappro.', icon: ShoppingCart },
              { label: 'Alertes stock', value: String(c?.alerteCount ?? 0), sub: 'sous seuil', icon: AlertTriangle },
              { label: 'Transactions', value: String(c?.transactions ?? 0), sub: 'ventes', icon: Activity },
            ].map(item => (
              <div key={item.label} className="space-y-1">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <item.icon className="h-3 w-3" strokeWidth={1.5} />
                  <p className="text-[10px] font-medium">{item.label}</p>
                </div>
                <p className="text-base font-semibold text-foreground tabular-nums">{item.value}</p>
                <p className="text-[10px] text-muted-foreground">{item.sub}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Accès rapides */}
        <div className="rounded-md border border-border bg-card p-4">
          <p className="mb-3 text-[10px] font-medium uppercase tracking-widest text-muted-foreground">Accès rapides</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'Nouveau produit', view: 'produits' },
              { label: 'Rapport stock', view: 'rapports' },
              { label: 'Stock faible', view: 'stock-faible' },
              { label: 'Nouvelle vente', view: 'caisse' },
            ].map(item => (
              <button
                key={item.view}
                onClick={() => onNavigate(item.view)}
                className="flex items-center justify-between rounded-md border border-border px-3 py-2.5 text-xs font-medium text-foreground hover:bg-accent transition-colors"
              >
                {item.label}
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
