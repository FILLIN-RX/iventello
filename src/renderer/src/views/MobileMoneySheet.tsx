import { useEffect, useRef, useState, useCallback } from 'react'
import { Save, Download, FileText, Smartphone, ChevronLeft, ChevronRight } from 'lucide-react'
import { useEntrepotStore } from '../stores/entrepotStore'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { cn } from '@/lib/utils'
import * as XLSX from 'xlsx'

const MONTH_NAMES = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']

const COLS = [
  { key: 'date', label: 'Date', editable: false, width: 'w-20' },
  { key: 'soldeOM', label: 'Solde Orange Money', editable: true, width: 'w-28' },
  { key: 'soldeMTN', label: 'Solde MTN MoMo', editable: true, width: 'w-28' },
  { key: 'soldeCamtel', label: 'Solde Camtel', editable: true, width: 'w-24' },
  { key: 'commissionOM', label: 'Commission OM', editable: true, width: 'w-28' },
  { key: 'commissionMTN', label: 'Commission MTN', editable: true, width: 'w-28' },
  { key: 'commissionCamtel', label: 'Commission Camtel', editable: true, width: 'w-28' },
  { key: 'deficit', label: 'Déficit', editable: true, width: 'w-20' },
  { key: 'totalSoldes', label: 'Total Soldes', editable: false, width: 'w-24' },
  { key: 'totalCommissions', label: 'Total Commissions', editable: false, width: 'w-28' },
  { key: 'soldeReelAjuste', label: 'Solde Réel Ajusté', editable: false, width: 'w-28' },
]

const INPUT_COLS = ['soldeOM', 'soldeMTN', 'soldeCamtel', 'commissionOM', 'commissionMTN', 'commissionCamtel', 'deficit']

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
  const soldeOM = row.soldeOM ?? 0
  const soldeMTN = row.soldeMTN ?? 0
  const soldeCamtel = row.soldeCamtel ?? 0
  const commissionOM = row.commissionOM ?? 0
  const commissionMTN = row.commissionMTN ?? 0
  const commissionCamtel = row.commissionCamtel ?? 0
  const deficit = row.deficit ?? 0
  return {
    ...row,
    totalSoldes: soldeOM + soldeMTN + soldeCamtel,
    totalCommissions: commissionOM + commissionMTN + commissionCamtel,
    soldeReelAjuste: (soldeOM + soldeMTN + soldeCamtel) - (commissionOM + commissionMTN + commissionCamtel)
  }
}

export function MobileMoneySheet() {
  const { selectedId, selectedName } = useEntrepotStore()
  const [tabIndex, setTabIndex] = useState(1)
  const [rows, setRows] = useState<Record<string, Record<number, Record<string, number>>>>({})
  const [dirty, setDirty] = useState(false)
  const [loading, setLoading] = useState(true)
  const tabs = generateTabs()
  const currentTab = tabs[tabIndex]

  const loadMonth = useCallback(async (year: number, month: number) => {
    if (!selectedId) return
    const key = monthKey(year, month)
    const cells = await window.api.getMobileMoneyCells(selectedId, key)
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
  }, [selectedId])

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
      await window.api.saveMobileMoneyCells(selectedId, key, cells)
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
      const ws = XLSX.utils.json_to_sheet(exportRows.map((r) => ({
        'Date': `Jour ${r.day}`,
        'Solde Orange Money': r.soldeOM,
        'Solde MTN MoMo': r.soldeMTN,
        'Solde Camtel': r.soldeCamtel,
        'Commission Orange Money': r.commissionOM,
        'Commission MTN MoMo': r.commissionMTN,
        'Commission Camtel': r.commissionCamtel,
        'Déficit': r.deficit,
        'Total Soldes': r.totalSoldes,
        'Total Commissions': r.totalCommissions,
        'Solde Réel Ajusté': r.soldeReelAjuste,
      })))
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, `${MONTH_NAMES[currentTab.month - 1]} ${currentTab.year}`)
      const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' })
      const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `MobileMoney_${key}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Export error', err)
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
    <h1>Mobile Money — ${MONTH_NAMES[currentTab.month - 1]} ${currentTab.year}</h1>
    <h2>${selectedName ?? ''}</h2>
    <table><thead><tr><th>Jour</th>${COLS.slice(1).map(c => `<th>${c.label}</th>`).join('')}</tr></thead><tbody>`
    for (let d = 1; d <= days; d++) {
      const row = monthData[d] ?? {}
      html += `<tr><td>${d}</td>${COLS.slice(1).map(c => `<td>${((row[c.key] as number) ?? 0).toLocaleString('fr-FR')}</td>`).join('')}</tr>`
    }
    html += `<tr class="total-row"><td>TOTAL</td>${COLS.slice(1).map(c => `<td>${total(c.key).toLocaleString('fr-FR')}</td>`).join('')}</tr>`
    html += `</tbody></table></body></html>`
    try {
      await window.api.exportTablePdf(html, `MobileMoney_${key}.pdf`)
    } catch (e) { console.error('PDF export error', e) }
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

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Smartphone className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Module Services Mobile Money</h2>
        </div>
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
      </div>

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
                    'text-emerald-700 dark:text-emerald-300',
                    'text-cyan-700 dark:text-cyan-300',
                    'text-amber-700 dark:text-amber-300',
                    'text-orange-700 dark:text-orange-300',
                    'text-rose-700 dark:text-rose-300',
                    'text-red-700 dark:text-red-300',
                    'text-violet-700 dark:text-violet-300',
                    'text-purple-700 dark:text-purple-300',
                    'text-pink-700 dark:text-pink-300',
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
                          <td key={col.key} className={`px-2 py-2 text-right font-semibold ${col.key === 'soldeReelAjuste' ? 'text-primary text-sm' : 'text-muted-foreground/70'}`}>
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
              {/* Ligne total */}
              <tr className="bg-gradient-to-r from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 font-semibold sticky bottom-0">
                <td className="px-2 py-3 text-muted-foreground whitespace-nowrap">TOTAL MENSUEL</td>
                {COLS.slice(1).map((col) => (
                  <td key={col.key} className={`px-2 py-3 text-right font-bold ${col.key === 'soldeReelAjuste' ? 'text-primary' : ''}`}>
                    {total(col.key).toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
