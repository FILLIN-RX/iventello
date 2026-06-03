import { useEffect, useState, useCallback } from 'react'
import { BarChart3, ChevronLeft, ChevronRight, Download, FileText, TrendingUp, ShoppingCart, Tag, Wallet, Receipt, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { useEntrepotStore } from '../stores/entrepotStore'
import { Button } from '../components/ui/button'
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/utils'
import type { Expense } from '../../../shared/types'

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

type ReportTab = 'ventes' | 'depenses' | 'achats' | 'discounts' | 'income-statement'
type Period = 'month' | 'semester1' | 'semester2' | 'year'

const TABS: { id: ReportTab; label: string; icon: any }[] = [
  { id: 'ventes', label: 'Ventes', icon: TrendingUp },
  { id: 'depenses', label: 'Dépenses', icon: Wallet },
  { id: 'achats', label: 'Achats', icon: ShoppingCart },
  { id: 'discounts', label: 'Remises', icon: Tag },
  { id: 'income-statement', label: 'Income Statement', icon: Receipt },
]

const PERIODS: { id: Period; label: string }[] = [
  { id: 'month', label: 'Mois' },
  { id: 'semester1', label: 'Semestre 1' },
  { id: 'semester2', label: 'Semestre 2' },
  { id: 'year', label: 'Année' },
]

function monthKey(year: number, month: number) {
  return `${year}-${String(month).padStart(2, '0')}`
}

function getMonths(period: Period, year: number): number[] {
  if (period === 'month') return [new Date().getMonth() + 1]
  if (period === 'semester1') return [1, 2, 3, 4, 5, 6]
  if (period === 'semester2') return [7, 8, 9, 10, 11, 12]
  return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
}

export default function Rapports() {
  const selectedId = useEntrepotStore((s) => s.selectedId)
  const selectedName = useEntrepotStore((s) => s.selectedName)
  const [tab, setTab] = useState<ReportTab>('ventes')
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [period, setPeriod] = useState<Period>('month')
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [monthReports, setMonthReports] = useState<Record<string, any>>({})

  const [canalCells, setCanalCells] = useState<any[]>([])
  const [mobileCells, setMobileCells] = useState<any[]>([])
  const [allExpenses, setAllExpenses] = useState<Expense[]>([])

  const days = new Date(year, month, 0).getDate()
  const mk = monthKey(year, month)
  const isMonth = period === 'month'

  const activeMonths = isMonth ? [month] : getMonths(period, year)

  const fetchAll = useCallback(async () => {
    if (!selectedId) return
    setLoading(true)

    const months = isMonth ? [month] : getMonths(period, year)
    const keys = months.map(m => monthKey(year, m))

    const results = await Promise.all([
      ...(isMonth
        ? [window.api.getMonthlyReport(selectedId, year, month)]
        : months.map(m => window.api.getMonthlyReport(selectedId, year, m).catch(() => null))),
      ...(isMonth
        ? [window.api.getCanalPlusCells(selectedId, mk)]
        : keys.map(k => window.api.getCanalPlusCells(selectedId, k).catch(() => []))),
      ...(isMonth
        ? [window.api.getMobileMoneyCells(selectedId, mk)]
        : keys.map(k => window.api.getMobileMoneyCells(selectedId, k).catch(() => []))),
      window.api.getExpenses(),
    ])

    const reportCount = months.length
    const canalCount = months.length
    const mobileCount = months.length

    const reports = results.slice(0, reportCount) as any[]
    const canals = results.slice(reportCount, reportCount + canalCount) as any[][]
    const mobiles = results.slice(reportCount + canalCount, reportCount + canalCount + mobileCount) as any[][]
    const expenses = results[results.length - 1] as Expense[]

    setAllExpenses(expenses as Expense[])

    if (isMonth) {
      setData(reports[0])
      setCanalCells(canals[0] ?? [])
      setMobileCells(mobiles[0] ?? [])
    } else {
      // Aggréger les rapports mensuels
      const aggCategories: string[] = []
      const aggSalesByDay: Record<string, Record<string, number>> = {}
      let aggExpensesByDay: Record<string, number> = {}
      let aggPurchasesByDay: Record<string, number> = {}
      let aggDiscountsByDay: Record<string, number> = {}
      let aggCanal: any[] = []
      let aggMobile: any[] = []

      reports.forEach((r, i) => {
        if (!r) return
        if (i === 0) aggCategories.push(...(r.categories ?? []))
        // Fusionner les ventes par catégorie
        // Pour semestre/année : additionner toutes les cellules
        // Les salesByDay ont des clés 1-31, on les cumule
        for (let d = 1; d <= 31; d++) {
          const dayKey = `${months[i]}-${d}`
          if (r.salesByDay?.[d]) {
            aggSalesByDay[dayKey] = { ...r.salesByDay[d] }
          }
          aggExpensesByDay[dayKey] = (aggExpensesByDay[dayKey] ?? 0) + (r.expensesByDay?.[d] ?? 0)
          aggPurchasesByDay[dayKey] = (aggPurchasesByDay[dayKey] ?? 0) + (r.purchasesByDay?.[d] ?? 0)
          aggDiscountsByDay[dayKey] = (aggDiscountsByDay[dayKey] ?? 0) + (r.discountsByDay?.[d] ?? 0)
        }
      })

      canals.forEach(cells => {
        if (cells) aggCanal = aggCanal.concat(cells)
      })
      mobiles.forEach(cells => {
        if (cells) aggMobile = aggMobile.concat(cells)
      })

      setData({
        categories: aggCategories,
        salesByDay: aggSalesByDay,
        expensesByDay: aggExpensesByDay,
        purchasesByDay: aggPurchasesByDay,
        discountsByDay: aggDiscountsByDay,
      })
      setCanalCells(aggCanal)
      setMobileCells(aggMobile)
    }
    setLoading(false)
  }, [selectedId, year, month, period, isMonth, mk])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  function prevYear() { setYear(y => y - 1) }
  function nextYear() { setYear(y => y + 1) }
  function prevMonth() {
    if (month === 1) { setYear(y => y - 1); setMonth(12) }
    else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (month === 12) { setYear(y => y + 1); setMonth(1) }
    else setMonth(m => m + 1)
  }

  function total(col: string): number {
    if (!data) return 0
    let sum = 0
    const entries = Object.entries(data.salesByDay ?? {}) as [string, Record<string, number>][]
    if (isMonth) {
      for (let d = 1; d <= days; d++) {
        const dayData = data.salesByDay[d]
        if (col === '__total') {
          if (dayData) sum += Object.values(dayData).reduce((a: number, b: number) => a + b, 0)
        } else {
          sum += (dayData?.[col] ?? 0)
        }
      }
    } else {
      for (const [, dayData] of entries) {
        if (col === '__total') {
          sum += Object.values(dayData).reduce((a: number, b: number) => a + b, 0)
        } else {
          sum += (dayData?.[col] ?? 0)
        }
      }
    }
    return sum
  }

  function totalExpensesPeriod(): number {
    if (!data?.expensesByDay) return 0
    return Object.values(data.expensesByDay as Record<string, number>).reduce((a, b) => a + (b ?? 0), 0)
  }

  function totalPurchasesPeriod(): number {
    if (!data?.purchasesByDay) return 0
    return Object.values(data.purchasesByDay as Record<string, number>).reduce((a, b) => a + (b ?? 0), 0)
  }

  function totalDiscountsPeriod(): number {
    if (!data?.discountsByDay) return 0
    return Object.values(data.discountsByDay as Record<string, number>).reduce((a, b) => a + (b ?? 0), 0)
  }

  function totalSalesDay(d: string | number): number {
    if (!data?.salesByDay) return 0
    const dayData = data.salesByDay[d]
    if (!dayData) return 0
    return Object.values(dayData as Record<string, number>).reduce((a: number, b: number) => a + b, 0)
  }

  function sumCells(col: string): number {
    return canalCells
      .filter((c: any) => c.col === col)
      .reduce((s: number, c: any) => s + c.value, 0)
  }

  function sumMobile(col: string): number {
    return mobileCells
      .filter((c: any) => c.col === col)
      .reduce((s: number, c: any) => s + c.value, 0)
  }

  const totalSales = total('__total')
  const benefice30 = totalSales * 0.3
  const mobileCommissions = sumMobile('commissionOM') + sumMobile('commissionMTN') + sumMobile('commissionCamtel')
  const canalCommissions = sumCells('commission')
  const installDepannage = sumCells('installationDepannage')
  const totalTransactions = mobileCommissions + canalCommissions + installDepannage
  const sousTotal = benefice30 + totalTransactions

  // Dépenses filtrées par période
  const expensesFiltered = allExpenses.filter(e => {
    const d = new Date(e.date)
    if (d.getFullYear() !== year) return false
    if (isMonth) return d.getMonth() + 1 === month
    if (period === 'semester1') return d.getMonth() + 1 <= 6
    if (period === 'semester2') return d.getMonth() + 1 >= 7
    return true
  })
  const expensesByCategory: Record<string, number> = {}
  for (const e of expensesFiltered) {
    expensesByCategory[e.category] = (expensesByCategory[e.category] ?? 0) + e.amount
  }
  const totalExpenses = Object.values(expensesByCategory).reduce((a, b) => a + b, 0)
  const resultatNet = sousTotal - totalExpenses

  function periodLabel(): string {
    if (isMonth) return `${MONTH_NAMES[month - 1]} ${year}`
    if (period === 'semester1') return `Semestre 1 — ${year}`
    if (period === 'semester2') return `Semestre 2 — ${year}`
    return `Année ${year}`
  }

  function totalPeriod(tabId: ReportTab): number {
    if (tabId === 'depenses') return totalExpensesPeriod()
    if (tabId === 'achats') return totalPurchasesPeriod()
    if (tabId === 'discounts') return totalDiscountsPeriod()
    return 0
  }

  function rowLabel(d: string | number): string {
    if (isMonth) return `Jour ${d}`
    const m = Number(String(d).split('-')[0])
    return MONTH_NAMES[(m - 1) % 12]
  }

  // Sorted entries for period tables
  const sortedDayKeys: (string | number)[] = isMonth
    ? Array.from({ length: days }, (_, i) => i + 1)
    : activeMonths.map(m => `${m}-1`)

  async function handleExport() {
    if (!data) return
    try {
      await window.api.exportRapportExcel({
        tab,
        year,
        month,
        monthName: MONTH_NAMES[month - 1],
        warehouseName: selectedName ?? '',
        categories: data.categories,
        salesByDay: isMonth ? data.salesByDay : {},
        expensesByDay: isMonth ? data.expensesByDay : {},
        purchasesByDay: isMonth ? data.purchasesByDay : {},
        discountsByDay: isMonth ? data.discountsByDay : {},
      })
    } catch (err) {
      console.error('Export Excel error', err)
    }
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
    <h1>Rapport ${TABS.find((t) => t.id === tab)?.label} — ${periodLabel()}</h1>
    <h2 style="text-align:center;font-size:13px;font-weight:400;color:#64748b">${selectedName ?? ''}</h2>`
    if (tab === 'ventes') {
      html += `<table><thead><tr><th>${isMonth ? 'Jour' : 'Période'}</th>${data.categories.map((c, i) => `<th class="cat-header" style="color:${catColors[i % catColors.length]}">${c}</th>`).join('')}<th>Total</th></tr></thead><tbody>`
      for (const d of sortedDayKeys) {
        html += `<tr><td>${rowLabel(d)}</td>${data.categories.map(c => `<td>${(data.salesByDay[d]?.[c] ?? 0).toLocaleString('fr-FR')}</td>`).join('')}<td>${totalSalesDay(d).toLocaleString('fr-FR')}</td></tr>`
      }
      html += `<tr class="total-row"><td>TOTAL</td>${data.categories.map(c => `<td>${total(c).toLocaleString('fr-FR')}</td>`).join('')}<td>${total('__total').toLocaleString('fr-FR')}</td></tr>`
    } else {
      html += `<table><thead><tr><th>${isMonth ? 'Jour' : 'Période'}</th><th>Montant</th></tr></thead><tbody>`
      const periodData = tab === 'depenses' ? data.expensesByDay : tab === 'achats' ? data.purchasesByDay : data.discountsByDay
      for (const d of sortedDayKeys) {
        const val = (periodData?.[d] ?? 0)
        html += `<tr><td>${rowLabel(d)}</td><td>${val.toLocaleString('fr-FR')}</td></tr>`
      }
      html += `<tr class="total-row"><td>TOTAL</td><td>${totalPeriod(tab).toLocaleString('fr-FR')}</td></tr>`
    }
    html += `</tbody></table></body></html>`
    try {
      await window.api.exportTablePdf(html, `Rapport_${tab}_${periodLabel().replace(/\s/g, '_')}.pdf`)
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
          <Button variant="outline" size="sm" onClick={handleExportPdf} disabled={!data || tab === 'income-statement'}>
            <FileText className="h-4 w-4 mr-1.5" /> PDF
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport} disabled={!data || tab === 'income-statement'}>
            <Download className="h-4 w-4 mr-1.5" /> Excel
          </Button>
        </div>
      </div>

      {/* Sélecteur de période */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex gap-1 rounded-lg bg-muted p-1">
          {PERIODS.map(p => (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id)}
              className={cn(
                'rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap',
                period === p.id ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          {isMonth ? (
            <>
              <Button variant="ghost" size="sm" onClick={prevMonth}><ChevronLeft className="h-4 w-4" /></Button>
              <span className="font-semibold text-base min-w-[180px] text-center">{periodLabel()}</span>
              <Button variant="ghost" size="sm" onClick={nextMonth}><ChevronRight className="h-4 w-4" /></Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={prevYear}><ChevronLeft className="h-4 w-4" /></Button>
              <span className="font-semibold text-base min-w-[180px] text-center">{periodLabel()}</span>
              <Button variant="ghost" size="sm" onClick={nextYear}><ChevronRight className="h-4 w-4" /></Button>
            </>
          )}
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

      {loading ? (
        <div className="flex justify-center py-16"><div className="h-7 w-7 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>
      ) : !data ? (
        <p className="text-center text-muted-foreground py-16">Aucune donnée</p>
      ) : tab === 'ventes' ? (
        <div className="overflow-auto rounded-xl border shadow-sm">
          <table className="w-full min-w-max text-xs border-collapse">
            <thead>
              <tr className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 sticky top-0 z-10">
                <th className="px-3 py-3 text-left font-semibold text-muted-foreground border-b min-w-[80px]">{isMonth ? 'Jour' : 'Période'}</th>
                {data.categories.map((cat: string, ci: number) => (
                  <th key={cat} className={`px-3 py-3 text-right font-semibold border-b whitespace-nowrap ${CAT_COLORS[ci % CAT_COLORS.length]}`}>{cat}</th>
                ))}
                <th className="px-3 py-3 text-right font-bold text-primary border-b bg-white dark:bg-slate-800 whitespace-nowrap">Total</th>
              </tr>
            </thead>
            <tbody>
              {sortedDayKeys.map((d: string | number) => (
                <tr key={d} className={`hover:bg-muted/30 transition-colors border-b border-muted/20`}>
                  <td className="px-3 py-2 text-muted-foreground font-medium whitespace-nowrap">{rowLabel(d)}</td>
                  {data.categories.map((cat: string, ci: number) => {
                    const val = data.salesByDay[d]?.[cat] ?? 0
                    return (
                      <td key={cat} className={`px-3 py-2 text-right whitespace-nowrap ${val > 0 ? 'font-medium ' + CAT_COLORS[ci % CAT_COLORS.length].replace('bg-', 'bg-opacity-20 bg-') : 'text-muted-foreground/40'}`}>
                        {val > 0 ? val.toLocaleString('fr-FR') : '-'}
                      </td>
                    )
                  })}
                  <td className="px-3 py-2 text-right font-bold text-primary whitespace-nowrap">{totalSalesDay(d) > 0 ? totalSalesDay(d).toLocaleString('fr-FR') : '-'}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gradient-to-r from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 font-semibold sticky bottom-0">
                <td className="px-3 py-3 text-muted-foreground whitespace-nowrap">TOTAL {isMonth ? 'MENSUEL' : period === 'year' ? 'ANNUEL' : 'SEMESTRIEL'}</td>
                {data.categories.map((cat: string, ci: number) => (
                  <td key={cat} className={`px-3 py-3 text-right font-bold whitespace-nowrap ${CAT_COLORS[ci % CAT_COLORS.length]}`}>{total(cat).toLocaleString('fr-FR')}</td>
                ))}
                <td className="px-3 py-3 text-right font-black text-primary text-sm bg-white dark:bg-slate-800 whitespace-nowrap">{totalSales.toLocaleString('fr-FR')}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      ) : tab === 'income-statement' ? (
        <div className="max-w-2xl mx-auto space-y-3">
          {/* REVENUS */}
          <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
            <div className="bg-blue-50 dark:bg-blue-950/20 px-5 py-3 border-b">
              <h3 className="text-sm font-bold text-blue-700 dark:text-blue-300 flex items-center gap-2">
                <TrendingUp className="h-4 w-4" /> REVENUS
              </h3>
            </div>
            <div className="divide-y px-5 py-2 text-sm">
              {data.categories.map((cat: string) => {
                const val = total(cat)
                if (val <= 0) return null
                return (
                  <div key={cat} className="flex justify-between py-2">
                    <span className="text-muted-foreground">{cat}</span>
                    <span className="font-medium tabular-nums">{val.toLocaleString('fr-FR')} FCFA</span>
                  </div>
                )
              })}
              <div className="flex justify-between py-2 font-bold text-base border-t">
                <span>Total Ventes</span>
                <span className="text-blue-600">{totalSales.toLocaleString('fr-FR')} FCFA</span>
              </div>
              <div className="flex justify-between py-2 text-emerald-600 font-semibold bg-emerald-50/50 dark:bg-emerald-950/10 -mx-5 px-5">
                <span>Bénéfice (30%)</span>
                <span className="font-bold">{benefice30.toLocaleString('fr-FR')} FCFA</span>
              </div>
            </div>
          </div>

          {/* MONEY TRANSACTIONS */}
          <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
            <div className="bg-emerald-50 dark:bg-emerald-950/20 px-5 py-3 border-b">
              <h3 className="text-sm font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                <ArrowUpRight className="h-4 w-4" /> MONEY TRANSACTIONS
              </h3>
            </div>
            <div className="divide-y px-5 py-2 text-sm">
              <div className="flex justify-between py-2">
                <span className="text-muted-foreground">Commission Orange Money</span>
                <span className="font-medium tabular-nums">{sumMobile('commissionOM').toLocaleString('fr-FR')} FCFA</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-muted-foreground">Commission MTN MoMo</span>
                <span className="font-medium tabular-nums">{sumMobile('commissionMTN').toLocaleString('fr-FR')} FCFA</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-muted-foreground">Commission Camtel</span>
                <span className="font-medium tabular-nums">{sumMobile('commissionCamtel').toLocaleString('fr-FR')} FCFA</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-muted-foreground">Commission Canal+</span>
                <span className="font-medium tabular-nums">{canalCommissions.toLocaleString('fr-FR')} FCFA</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-muted-foreground">Installation / Dépannage</span>
                <span className="font-medium tabular-nums">{installDepannage.toLocaleString('fr-FR')} FCFA</span>
              </div>
              <div className="flex justify-between py-2 font-bold text-base border-t">
                <span>Total Transactions</span>
                <span className="text-emerald-600">{totalTransactions.toLocaleString('fr-FR')} FCFA</span>
              </div>
            </div>
          </div>

          {/* SOUS-TOTAL */}
          <div className="rounded-xl border-2 border-primary/20 bg-primary/5 shadow-sm px-5 py-4">
            <div className="flex justify-between text-lg font-bold">
              <span>SOUS-TOTAL (Bénéfice + Transactions)</span>
              <span className="text-primary">{sousTotal.toLocaleString('fr-FR')} FCFA</span>
            </div>
          </div>

          {/* DÉPENSES */}
          <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
            <div className="bg-rose-50 dark:bg-rose-950/20 px-5 py-3 border-b">
              <h3 className="text-sm font-bold text-rose-700 dark:text-rose-300 flex items-center gap-2">
                <ArrowDownRight className="h-4 w-4" /> DÉPENSES
              </h3>
            </div>
            <div className="divide-y px-5 py-2 text-sm">
              {Object.entries(expensesByCategory).length === 0 ? (
                <div className="py-3 text-center text-muted-foreground">Aucune dépense</div>
              ) : (
                Object.entries(expensesByCategory).map(([cat, val]) => (
                  <div key={cat} className="flex justify-between py-2">
                    <span className="text-muted-foreground capitalize">{cat}</span>
                    <span className="font-medium tabular-nums text-rose-600">-{val.toLocaleString('fr-FR')} FCFA</span>
                  </div>
                ))
              )}
              <div className="flex justify-between py-2 font-bold text-base border-t">
                <span>Total Dépenses</span>
                <span className="text-rose-600">-{totalExpenses.toLocaleString('fr-FR')} FCFA</span>
              </div>
            </div>
          </div>

          {/* RÉSULTAT NET */}
          <div className={cn(
            'rounded-xl border-2 shadow-sm px-5 py-5',
            resultatNet >= 0
              ? 'border-emerald-300 bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-700'
              : 'border-rose-300 bg-rose-50 dark:bg-rose-950/20 dark:border-rose-700'
          )}>
            <div className="flex justify-between items-center">
              <span className="text-base font-bold uppercase tracking-wider">Résultat Net</span>
              <span className={cn(
                'text-2xl font-black tabular-nums',
                resultatNet >= 0 ? 'text-emerald-600' : 'text-rose-600'
              )}>
                {resultatNet >= 0 ? '+' : ''}{resultatNet.toLocaleString('fr-FR')} FCFA
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="overflow-auto rounded-xl border shadow-sm">
          <table className="w-full min-w-max text-xs border-collapse">
            <thead>
              <tr className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 sticky top-0 z-10">
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground border-b whitespace-nowrap">{isMonth ? 'Jour' : 'Période'}</th>
                <th className="px-4 py-3 text-right font-semibold text-muted-foreground border-b whitespace-nowrap">Montant (FCFA)</th>
              </tr>
            </thead>
            <tbody>
              {sortedDayKeys.map((d: string | number) => {
                const val = tab === 'depenses' ? (data.expensesByDay?.[d] ?? 0)
                  : tab === 'achats' ? (data.purchasesByDay?.[d] ?? 0)
                  : (data.discountsByDay?.[d] ?? 0)
                return (
                  <tr key={d} className={`hover:bg-muted/30 transition-colors border-b border-muted/20`}>
                    <td className="px-4 py-2 text-muted-foreground font-medium whitespace-nowrap">{rowLabel(d)}</td>
                    <td className={`px-4 py-2 text-right whitespace-nowrap ${val > 0 ? 'font-semibold ' + (
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
                <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">TOTAL {isMonth ? 'MENSUEL' : period === 'year' ? 'ANNUEL' : 'SEMESTRIEL'}</td>
                <td className={`px-4 py-3 text-right font-bold whitespace-nowrap ${
                  tab === 'depenses' ? 'text-rose-600 dark:text-rose-400' :
                  tab === 'achats' ? 'text-orange-600 dark:text-orange-400' :
                  'text-amber-600 dark:text-amber-400'
                }`}>{formatCurrency(totalPeriod(tab))}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}
