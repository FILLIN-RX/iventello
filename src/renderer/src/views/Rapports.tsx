import { useEffect, useState } from 'react'
import { BarChart3, ChevronLeft, ChevronRight, Download, FileText, TrendingUp, ShoppingCart, Tag, Wallet } from 'lucide-react'
import { useEntrepotStore } from '../stores/entrepotStore'
import { Button } from '../components/ui/button'
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/utils'
import * as XLSX from 'xlsx'

const MONTH_NAMES = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']

const CAT_COLORS = [
  'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300',
  'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
  'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
  'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300',
  'bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300',
  'bg-cyan-100 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300',
  'bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300',
  'bg-pink-100 text-pink-700 dark:bg-pink-950/40 dark:text-pink-300',
  'bg-teal-100 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300',
  'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300',
  'bg-lime-100 text-lime-700 dark:bg-lime-950/40 dark:text-lime-300',
  'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300',
]

type ReportTab = 'ventes' | 'depenses' | 'achats' | 'discounts' | 'stock'

const TABS: { id: ReportTab; label: string; icon: any }[] = [
  { id: 'ventes', label: 'Ventes', icon: TrendingUp },
  { id: 'depenses', label: 'Dépenses', icon: Wallet },
  { id: 'achats', label: 'Achats', icon: ShoppingCart },
  { id: 'discounts', label: 'Remises', icon: Tag },
  { id: 'stock', label: 'Stock', icon: BarChart3 },
]

export default function Rapports() {
  const selectedId = useEntrepotStore((s) => s.selectedId)
  const selectedName = useEntrepotStore((s) => s.selectedName)
  const [tab, setTab] = useState<ReportTab>('ventes')
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const days = new Date(year, month, 0).getDate()

  useEffect(() => {
    if (!selectedId) return
    setLoading(true)
    window.api.getMonthlyReport(selectedId, year, month).then((d) => {
      setData(d)
      setLoading(false)
    })
  }, [selectedId, year, month])

  function prevMonth() {
    if (month === 1) { setYear(year - 1); setMonth(12) }
    else setMonth(month - 1)
  }
  function nextMonth() {
    if (month === 12) { setYear(year + 1); setMonth(1) }
    else setMonth(month + 1)
  }

  function total(col: string): number {
    if (!data) return 0
    let sum = 0
    for (let d = 1; d <= days; d++) {
      if (col === 'depenses') sum += data.expensesByDay[d] ?? 0
      else if (col === 'achats') sum += data.purchasesByDay[d] ?? 0
      else if (col === 'discounts') sum += data.discountsByDay[d] ?? 0
      else if (col === '__total') sum += totalSalesDay(d)
      else {
        const catTotal = data.salesByDay[d]?.[col] ?? 0
        if (typeof catTotal === 'number') sum += catTotal
      }
    }
    return sum
  }

  function totalSalesDay(d: number): number {
    if (!data?.salesByDay[d]) return 0
    return Object.values(data.salesByDay[d] as Record<string, number>).reduce((a: number, b: number) => a + b, 0)
  }

  async function handleExport() {
    if (!data) return
    const rows: any[] = []
    if (tab === 'ventes') {
      for (let d = 1; d <= days; d++) {
        const row: any = { 'Jour': d }
        for (const cat of data.categories) row[cat] = data.salesByDay[d]?.[cat] ?? 0
        row['Total'] = totalSalesDay(d)
        rows.push(row)
      }
      const totalRow: any = { 'Jour': 'TOTAL' }
      for (const cat of data.categories) totalRow[cat] = total(cat)
      totalRow['Total'] = total('__total')
      rows.push(totalRow)
    } else {
      for (let d = 1; d <= days; d++) {
        const val = tab === 'depenses' ? (data.expensesByDay[d] ?? 0)
          : tab === 'achats' ? (data.purchasesByDay[d] ?? 0)
          : (data.discountsByDay[d] ?? 0)
        rows.push({ 'Jour': d, 'Montant': val })
      }
      rows.push({ 'Jour': 'TOTAL', 'Montant': total(tab) })
    }
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, `${TABS.find((t) => t.id === tab)?.label} ${MONTH_NAMES[month - 1]} ${year}`)
    const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' })
    const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Rapport_${tab}_${MONTH_NAMES[month - 1]}_${year}.xlsx`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleExportPdf() {
    if (!data) return
    const catColors = ['#2563eb','#059669','#0891b2','#d97706','#dc2626','#7c3aed','#db2777','#4f46e5','#ea580c','#84cc16']
    let html = `<html><head><meta charset="utf-8"><style>
      body{font-family:sans-serif;padding:20px;color:#1e293b}
      h1{text-align:center;font-size:18px;margin-bottom:4px}
      table{width:100%;border-collapse:collapse;font-size:11px;margin-top:12px}
      th,td{border:1px solid #cbd5e1;padding:4px 6px;text-align:right}
      th{background:#f1f5f9;font-weight:700;text-align:center}
      td:first-child{text-align:center;font-weight:600;background:#f8fafc}
      .total-row td{background:#e2e8f0;font-weight:700}
      .cat-header{text-align:center;font-weight:600}
    </style></head><body>
    <h1>Rapport ${TABS.find((t) => t.id === tab)?.label} — ${MONTH_NAMES[month - 1]} ${year}</h1>
    <h2 style="text-align:center;font-size:13px;font-weight:400;color:#64748b">${selectedName ?? ''}</h2>`
    if (tab === 'ventes') {
      html += `<table><thead><tr><th>Jour</th>${data.categories.map((c, i) => `<th class="cat-header" style="color:${catColors[i % catColors.length]}">${c}</th>`).join('')}<th>Total</th></tr></thead><tbody>`
      for (let d = 1; d <= days; d++) {
        html += `<tr><td>${d}</td>${data.categories.map(c => `<td>${(data.salesByDay[d]?.[c] ?? 0).toLocaleString('fr-FR')}</td>`).join('')}<td>${totalSalesDay(d).toLocaleString('fr-FR')}</td></tr>`
      }
      html += `<tr class="total-row"><td>TOTAL</td>${data.categories.map(c => `<td>${total(c).toLocaleString('fr-FR')}</td>`).join('')}<td>${total('__total').toLocaleString('fr-FR')}</td></tr>`
    } else {
      html += `<table><thead><tr><th>Jour</th><th>Montant</th></tr></thead><tbody>`
      for (let d = 1; d <= days; d++) {
        const val = tab === 'depenses' ? (data.expensesByDay[d] ?? 0) : tab === 'achats' ? (data.purchasesByDay[d] ?? 0) : (data.discountsByDay[d] ?? 0)
        html += `<tr><td>${d}</td><td>${val.toLocaleString('fr-FR')}</td></tr>`
      }
      html += `<tr class="total-row"><td>TOTAL</td><td>${total(tab).toLocaleString('fr-FR')}</td></tr>`
    }
    html += `</tbody></table></body></html>`
    try {
      await window.api.exportTablePdf(html, `Rapport_${tab}_${MONTH_NAMES[month - 1]}_${year}.pdf`)
    } catch (e) { console.error('PDF export error', e) }
  }

  if (!selectedId) {
    return <div className="flex items-center justify-center py-20 text-muted-foreground">Sélectionnez un entrepôt</div>
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-primary" /> Rapports
        </h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExportPdf} disabled={!data}>
            <FileText className="h-4 w-4 mr-1.5" /> PDF
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport} disabled={!data}>
            <Download className="h-4 w-4 mr-1.5" /> Excel
          </Button>
        </div>
      </div>

      {/* Onglets */}
      <div className="flex gap-1 rounded-lg bg-muted p-1 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'flex items-center gap-1.5 rounded-md px-3.5 py-2 text-sm font-medium whitespace-nowrap transition-colors',
              tab === t.id ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <t.icon className="h-4 w-4" /> {t.label}
          </button>
        ))}
      </div>

      {/* Navigation mois */}
      <div className="flex items-center justify-center gap-4">
        <Button variant="ghost" size="sm" onClick={prevMonth}><ChevronLeft className="h-4 w-4" /></Button>
        <span className="font-semibold text-base min-w-[180px] text-center">{MONTH_NAMES[month - 1]} {year}</span>
        <Button variant="ghost" size="sm" onClick={nextMonth}><ChevronRight className="h-4 w-4" /></Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="h-7 w-7 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>
      ) : !data ? (
        <p className="text-center text-muted-foreground py-16">Aucune donnée</p>
      ) : tab === 'ventes' ? (
        /* Tableau VENTES : jours × catégories */
        <div className="overflow-auto rounded-xl border shadow-sm">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 sticky top-0 z-10">
                <th className="px-3 py-3 text-left font-semibold text-muted-foreground border-b min-w-[80px]">Jour</th>
                {data.categories.map((cat: string, ci: number) => (
                  <th key={cat} className={`px-3 py-3 text-right font-semibold border-b whitespace-nowrap ${CAT_COLORS[ci % CAT_COLORS.length]}`}>{cat}</th>
                ))}
                <th className="px-3 py-3 text-right font-bold text-primary border-b bg-white dark:bg-slate-800">Total</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: days }, (_, i) => i + 1).map((d) => (
                <tr key={d} className={`${d % 2 === 0 ? 'bg-muted/10' : 'bg-background'} hover:bg-muted/30 transition-colors border-b border-muted/20`}>
                  <td className="px-3 py-2 text-muted-foreground font-medium">Jour {d}</td>
                  {data.categories.map((cat: string, ci: number) => {
                    const val = data.salesByDay[d]?.[cat] ?? 0
                    return (
                      <td key={cat} className={`px-3 py-2 text-right ${val > 0 ? 'font-medium ' + CAT_COLORS[ci % CAT_COLORS.length].replace('bg-', 'bg-opacity-20 bg-') : 'text-muted-foreground/40'}`}>
                        {val > 0 ? val.toLocaleString('fr-FR') : '-'}
                      </td>
                    )
                  })}
                  <td className="px-3 py-2 text-right font-bold text-primary">{totalSalesDay(d) > 0 ? totalSalesDay(d).toLocaleString('fr-FR') : '-'}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gradient-to-r from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 font-semibold sticky bottom-0">
                <td className="px-3 py-3 text-muted-foreground">TOTAL MENSUEL</td>
                {data.categories.map((cat: string, ci: number) => (
                  <td key={cat} className={`px-3 py-3 text-right font-bold ${CAT_COLORS[ci % CAT_COLORS.length]}`}>{total(cat).toLocaleString('fr-FR')}</td>
                ))}
                <td className="px-3 py-3 text-right font-black text-primary text-sm bg-white dark:bg-slate-800">{total('__total').toLocaleString('fr-FR')}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      ) : (
        /* Tableau simple pour dépenses/achats/discounts */
        <div className="overflow-auto rounded-xl border shadow-sm">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 sticky top-0 z-10">
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground border-b">Jour</th>
                <th className="px-4 py-3 text-right font-semibold text-muted-foreground border-b">Montant (FCFA)</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: days }, (_, i) => i + 1).map((d) => {
                const val = tab === 'depenses' ? (data.expensesByDay[d] ?? 0)
                  : tab === 'achats' ? (data.purchasesByDay[d] ?? 0)
                  : (data.discountsByDay[d] ?? 0)
                return (
                  <tr key={d} className={`${d % 2 === 0 ? 'bg-muted/10' : 'bg-background'} hover:bg-muted/30 transition-colors border-b border-muted/20`}>
                    <td className="px-4 py-2 text-muted-foreground font-medium">Jour {d}</td>
                    <td className={`px-4 py-2 text-right ${val > 0 ? 'font-semibold ' + (
                      tab === 'depenses' ? 'text-rose-600 dark:text-rose-400' :
                      tab === 'achats' ? 'text-orange-600 dark:text-orange-400' :
                      'text-amber-600 dark:text-amber-400'
                    ) : ''}`}>
                      {val > 0 ? formatCurrency(val) : '-'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="bg-gradient-to-r from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 font-semibold sticky bottom-0">
                <td className="px-4 py-3 text-muted-foreground">TOTAL MENSUEL</td>
                <td className={`px-4 py-3 text-right font-bold ${
                  tab === 'depenses' ? 'text-rose-600 dark:text-rose-400' :
                  tab === 'achats' ? 'text-orange-600 dark:text-orange-400' :
                  'text-amber-600 dark:text-amber-400'
                }`}>{formatCurrency(total(tab))}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}
