import { useEffect, useState } from 'react'
import {
  History,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Package,
  Calendar,
  Layers
} from 'lucide-react'
import { useEntrepotStore } from '../stores/entrepotStore'
import type { StockMovement } from '../../../shared/types'
import { formatCurrency } from '@/lib/utils'

const TYPE_CONFIG: Record<string, { label: string; bg: string; text: string; icon: any }> = {
  VENTE: { label: 'Vente', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300', text: 'text-emerald-600', icon: ArrowDownRight },
  ACHAT: { label: 'Achat / Réappro', bg: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300', text: 'text-blue-600', icon: ArrowUpRight },
  MAGASIN_ENTREE: { label: 'Boutique → Magasin', bg: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300', text: 'text-purple-600', icon: Layers },
  MAGASIN_SORTIE: { label: 'Magasin → Boutique', bg: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300', text: 'text-indigo-600', icon: Layers },
  ANNULATION_VENTE: { label: 'Annulation Vente', bg: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300', text: 'text-amber-600', icon: RefreshCw },
  AJUSTEMENT: { label: 'Ajustement Inventaire', bg: 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900/40 dark:text-slate-300', text: 'text-slate-600', icon: Package },
  RETOUR: { label: 'Retour Client', bg: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300', text: 'text-rose-600', icon: RefreshCw }
}

export default function MouvementsStock() {
  const { selectedId: warehouseId } = useEntrepotStore()
  const [movements, setMovements] = useState<StockMovement[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedType, setSelectedType] = useState<string>('ALL')
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | '7d' | '30d'>('all')

  async function loadMovements() {
    setLoading(true)
    try {
      let startDate: string | undefined
      const now = new Date()
      if (dateFilter === 'today') {
        const d = new Date()
        d.setHours(0, 0, 0, 0)
        startDate = d.toISOString()
      } else if (dateFilter === '7d') {
        const d = new Date()
        d.setDate(now.getDate() - 7)
        startDate = d.toISOString()
      } else if (dateFilter === '30d') {
        const d = new Date()
        d.setDate(now.getDate() - 30)
        startDate = d.toISOString()
      }

      const res = await window.api.getStockMovements({
        warehouseId: warehouseId || undefined,
        type: selectedType !== 'ALL' ? selectedType : undefined,
        startDate
      })
      setMovements(res.movements || (res as any) || [])
    } catch (err) {
      console.error('Erreur chargement mouvements de stock:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadMovements()
  }, [warehouseId, selectedType, dateFilter])

  const filteredMovements = movements.filter((m) => {
    if (!search) return true
    const q = search.toLowerCase()
    const pName = m.product?.name?.toLowerCase() || ''
    const pBarcode = m.product?.barcode?.toLowerCase() || ''
    const bTitle = m.book?.title?.toLowerCase() || ''
    const ref = m.referenceDoc?.toLowerCase() || ''
    const notes = m.notes?.toLowerCase() || ''
    return pName.includes(q) || pBarcode.includes(q) || bTitle.includes(q) || ref.includes(q) || notes.includes(q)
  })

  const totalEntrees = filteredMovements
    .filter((m) => m.quantity > 0)
    .reduce((sum, m) => sum + m.quantity, 0)

  const totalSorties = filteredMovements
    .filter((m) => m.quantity < 0)
    .reduce((sum, m) => sum + Math.abs(m.quantity), 0)

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-slate-50 dark:bg-slate-950 p-6 overflow-y-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">Registre des Mouvements (Stock Ledger)</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Traçabilité immuable de chaque entrée, sortie, vente et ajustement de stock
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={loadMovements}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-all shadow-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Actualiser
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Mouvements</span>
            <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
            {filteredMovements.length}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Total Entrées</span>
            <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            +{totalEntrees} <span className="text-xs font-normal text-slate-500">unités</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-rose-600 dark:text-rose-400">Total Sorties</span>
            <div className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400">
              <ArrowDownRight className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-rose-600 dark:text-rose-400">
            -{totalSorties} <span className="text-xs font-normal text-slate-500">unités</span>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 mb-6 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher produit, référence, note..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Type filter */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="text-xs py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 focus:outline-none"
          >
            <option value="ALL">Tous les types de mouvement</option>
            <option value="VENTE">Ventes</option>
            <option value="ACHAT">Achats & Réappros</option>
            <option value="MAGASIN_ENTREE">Transferts Boutique → Magasin</option>
            <option value="MAGASIN_SORTIE">Transferts Magasin → Boutique</option>
            <option value="ANNULATION_VENTE">Annulations de Vente</option>
            <option value="AJUSTEMENT">Ajustements d'inventaire</option>
          </select>

          {/* Date range filter */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl">
            {(['all', 'today', '7d', '30d'] as const).map((d) => (
              <button
                key={d}
                onClick={() => setDateFilter(d)}
                className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-all ${
                  dateFilter === d
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {d === 'all' && 'Tous'}
                {d === 'today' && "Aujourd'hui"}
                {d === '7d' && '7 jours'}
                {d === '30d' && '30 jours'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Movements Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm flex-1">
        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin text-indigo-500 mb-2" />
            <p className="text-xs">Chargement du journal des mouvements...</p>
          </div>
        ) : filteredMovements.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Package className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
            <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Aucun mouvement enregistré</p>
            <p className="text-xs text-slate-400 mt-1">Les mouvements apparaîtront ici automatiquement à chaque vente ou réapprovisionnement.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800/80 text-[11px] font-semibold text-slate-400 uppercase tracking-wider bg-slate-50/50 dark:bg-slate-900/50">
                  <th className="py-3 px-4">Date & Heure</th>
                  <th className="py-3 px-4">Article</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4 text-center">Quantité</th>
                  <th className="py-3 px-4 text-center">Évolution Stock</th>
                  <th className="py-3 px-4 text-right">Coût Unitaire</th>
                  <th className="py-3 px-4">Document / Réf</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                {filteredMovements.map((m) => {
                  const cfg = TYPE_CONFIG[m.type] || {
                    label: m.type,
                    bg: 'bg-slate-100 text-slate-700',
                    text: 'text-slate-600',
                    icon: Package
                  }
                  const Icon = cfg.icon
                  const itemName = m.product?.name || m.book?.title || 'Article non spécifié'
                  const itemSub = m.product?.barcode || m.book?.isbn || ''

                  return (
                    <tr key={m.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4 whitespace-nowrap text-slate-500 dark:text-slate-400">
                        {new Date(m.createdAt).toLocaleString('fr-FR', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-900 dark:text-white">{itemName}</div>
                        {itemSub && <div className="text-[11px] text-slate-400">{itemSub}</div>}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium border ${cfg.bg}`}>
                          <Icon className="w-3 h-3" />
                          {cfg.label}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className={`font-bold text-sm ${m.quantity > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                          {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="text-slate-400 text-xs">
                          {m.quantityBefore} → <span className="font-semibold text-slate-700 dark:text-slate-200">{m.quantityAfter}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-medium text-slate-700 dark:text-slate-300">
                        {m.unitCost != null && m.unitCost > 0 ? formatCurrency(m.unitCost) : '—'}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-mono text-[11px] text-slate-700 dark:text-slate-300">
                          {m.referenceDoc || '—'}
                        </div>
                        {m.notes && <div className="text-[11px] text-slate-400 truncate max-w-[200px]">{m.notes}</div>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
