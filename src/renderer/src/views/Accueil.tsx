import { useEffect, useState } from 'react'
import {
  Warehouse as WarehouseIcon, ArrowRight, TrendingUp, Package, AlertTriangle,
  BarChart3, Building2, Award, Zap, ChevronRight
} from 'lucide-react'
import { useNavigate } from '../hooks/useNavigate'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'
import type { Warehouse, GlobalStats } from '../../../shared/types'

const MONTHS = ['Jan','Fév','Mar','Avr','Mai','Juin','Juil','Aoû','Sep','Oct','Nov','Déc']

function formatCFA(n: number) {
  return n.toLocaleString('fr-FR') + ' FCFA'
}

function SimpleBar({ value, max, color, label }: { value: number; max: number; color: string; label: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground w-20 truncate text-right">{label}</span>
      <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  )
}

export default function Accueil() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [stats, setStats] = useState<GlobalStats | null>(null)
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!loading && warehouses.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">Bienvenue sur iventello</h1>
        <p className="text-sm text-muted-foreground">Créez votre premier entrepôt pour commencer.</p>
        <Card className="border-dashed">
          <div className="flex flex-col items-center gap-4 py-16">
            <WarehouseIcon className="h-16 w-16 text-muted-foreground/40" />
            <Button size="lg" onClick={() => navigate('entrepots')}>
              <Building2 className="mr-2 h-4 w-4" /> Créer un entrepôt
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  const maxSales = stats?.warehouseStats?.length
    ? Math.max(...stats.warehouseStats.map(w => w.sales), 1)
    : 1

  return (
    <div className="space-y-6 animate-fade-in">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tableau de bord global</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Vue d'ensemble de tous vos entrepôts</p>
        </div>
        <Button onClick={() => navigate('entrepots')}>
          <Building2 className="mr-2 h-4 w-4" /> Gérer les entrepôts
        </Button>
      </div>

      {/* Cartes stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 border-l-4 border-l-blue-500">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Entrepôts</p>
            <Building2 className="h-4 w-4 text-blue-500" />
          </div>
          <p className="text-2xl font-bold mt-1">{stats?.warehouses ?? 0}</p>
        </Card>
        <Card className="p-4 border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Produits</p>
            <Package className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold mt-1">{stats?.products ?? 0}</p>
        </Card>
        <Card className="p-4 border-l-4 border-l-violet-500">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Ventes (mois)</p>
            <TrendingUp className="h-4 w-4 text-violet-500" />
          </div>
          <p className="text-2xl font-bold mt-1">{formatCFA(stats?.sales ?? 0)}</p>
        </Card>
        <Card className="p-4 border-l-4 border-l-amber-500">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Alertes stock</p>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </div>
          <p className={`text-2xl font-bold mt-1 ${(stats?.stockAlerts ?? 0) > 0 ? 'text-amber-600' : ''}`}>
            {stats?.stockAlerts ?? 0}
          </p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Classement entrepôts */}
        <Card className="lg:col-span-2 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold flex items-center gap-2">
              <Award className="h-4 w-4 text-primary" /> Classement des entrepôts
            </h2>
            <span className="text-xs text-muted-foreground">Basé sur les ventes du mois</span>
          </div>
          <div className="space-y-3">
            {stats?.warehouseStats?.map((w, i) => (
              <div key={w.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => navigate('workspace', w.id, w.name)}>
                <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${i === 0 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' : i === 1 ? 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300' : i === 2 ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300' : 'bg-muted text-muted-foreground'}`}>
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{w.name}</p>
                  <div className="flex gap-3 text-xs text-muted-foreground mt-0.5">
                    <span>{w.products} produits</span>
                    {w.alerts > 0 && <span className="text-amber-600">{w.alerts} alertes</span>}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">{formatCFA(w.sales)}</p>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground ml-auto mt-0.5" />
                </div>
              </div>
            ))}
            {(!stats?.warehouseStats || stats.warehouseStats.length === 0) && (
              <p className="text-sm text-muted-foreground text-center py-6">Aucune donnée de vente ce mois-ci</p>
            )}
          </div>
        </Card>

        {/* Top performer + Graphique barres */}
        <div className="space-y-4">
          {stats?.topWarehouse && (
            <Card className="p-5 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="h-4 w-4 text-primary" />
                <span className="text-xs font-semibold text-primary uppercase tracking-wider">Meilleur entrepôt</span>
              </div>
              <p className="text-lg font-bold">{stats.topWarehouse.name}</p>
              <p className="text-sm text-muted-foreground mt-1">{formatCFA(stats.topWarehouse.sales)} de ventes ce mois</p>
              <div className="mt-3 flex gap-3 text-xs text-muted-foreground">
                <span>{stats.topWarehouse.products} produits</span>
                <span>{stats.topWarehouse.totalItems} articles en stock</span>
              </div>
            </Card>
          )}

          <Card className="p-5">
            <h3 className="text-sm font-semibold mb-3">Ventes par entrepôt</h3>
            <div className="space-y-2.5">
              {stats?.warehouseStats?.map(w => (
                <SimpleBar key={w.id} value={w.sales} max={maxSales} label={w.name} color={
                  w.id === stats.topWarehouse?.id ? '#2563eb' : '#94a3b8'
                } />
              ))}
              {(!stats?.warehouseStats || stats.warehouseStats.length === 0) && (
                <p className="text-xs text-muted-foreground text-center py-4">Aucune vente</p>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Liste des entrepôts */}
      <div>
        <h2 className="font-semibold mb-3">Accéder à un entrepôt</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {warehouses.map((w) => (
            <Card
              key={w.id}
              className="cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5 group p-4"
              onClick={() => navigate('workspace', w.id, w.name)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                    <WarehouseIcon className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{w.name}</p>
                    {w.location && <p className="text-xs text-muted-foreground">{w.location}</p>}
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
