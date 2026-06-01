import { create } from 'zustand'

const COLUMNS = ['soldeOM', 'soldeMTN', 'soldeCamtel', 'commissionOM', 'commissionMTN', 'commissionCamtel', 'deficit'] as const

export type MmCol = typeof COLUMNS[number]

export interface DayRow {
  day: number
  soldeOM: number
  soldeMTN: number
  soldeCamtel: number
  commissionOM: number
  commissionMTN: number
  commissionCamtel: number
  deficit: number
}

export function getTotalSoldes(r: DayRow) { return r.soldeOM + r.soldeMTN + r.soldeCamtel }
export function getTotalCommissions(r: DayRow) { return r.commissionOM + r.commissionMTN + r.commissionCamtel }
export function getSoldeReelAjuste(r: DayRow) { return getTotalSoldes(r) - r.deficit }

function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate()
}

function monthKey(year: number, month: number) {
  return `${year}-${String(month).padStart(2, '0')}`
}

interface MmState {
  warehouseId: string
  currentYear: number
  currentMonth: number
  tabs: string[]
  data: Record<string, DayRow[]>
  loading: boolean
  dirty: boolean
  init: (wid: string) => Promise<void>
  setCell: (day: number, col: MmCol, value: number) => void
  setTab: (year: number, month: number) => void
  save: () => Promise<void>
  exportExcel: () => Promise<void>
}

export const useMobileMoneyStore = create<MmState>((set, get) => ({
  warehouseId: '',
  currentYear: new Date().getFullYear(),
  currentMonth: new Date().getMonth() + 1,
  tabs: [],
  data: {},
  loading: false,
  dirty: false,

  init: async (wid) => {
    set({ loading: true, warehouseId: wid })
    const now = new Date()
    const y = now.getFullYear()
    const m = now.getMonth() + 1

    // Générer les onglets : mois courant + 1 avant + 1 après
    const tabs: string[] = []
    for (let offset = -1; offset <= 1; offset++) {
      const d = new Date(y, m - 1 + offset, 1)
      tabs.push(monthKey(d.getFullYear(), d.getMonth() + 1))
    }

    // Charger les cellules du mois courant
    const key = monthKey(y, m)
    const cells = await window.api.getMobileMoneyCells(wid, key)
    const data: Record<string, DayRow[]> = {}

    for (const tab of tabs) {
      const [yr, mo] = tab.split('-').map(Number)
      const days = daysInMonth(yr, mo)
      const rows: DayRow[] = []
      for (let d = 1; d <= days; d++) {
        rows.push({ day: d, soldeOM: 0, soldeMTN: 0, soldeCamtel: 0, commissionOM: 0, commissionMTN: 0, commissionCamtel: 0, deficit: 0 })
      }
      data[tab] = rows
    }

    // Appliquer les valeurs chargées
    for (const c of cells) {
      const row = data[key]?.[c.day - 1]
      if (row) (row as any)[c.col] = c.value
    }

    set({ tabs, data, currentYear: y, currentMonth: m, loading: false })
  },

  setCell: (day, col, value) => {
    const { data, currentYear, currentMonth } = get()
    const key = monthKey(currentYear, currentMonth)
    const rows = data[key]
    if (!rows) return
    const row = rows[day - 1]
    if (!row) return
    (row as any)[col] = value
    set({ data: { ...data, [key]: [...rows] }, dirty: true })
  },

  setTab: (year, month) => {
    set({ currentYear: year, currentMonth: month })
    // Charger si pas encore en mémoire
    const key = monthKey(year, month)
    const { data, warehouseId } = get()
    if (!data[key]) {
      window.api.getMobileMoneyCells(warehouseId, key).then((cells) => {
        const days = daysInMonth(year, month)
        const rows: DayRow[] = []
        for (let d = 1; d <= days; d++) {
          rows.push({ day: d, soldeOM: 0, soldeMTN: 0, soldeCamtel: 0, commissionOM: 0, commissionMTN: 0, commissionCamtel: 0, deficit: 0 })
        }
        for (const c of cells) {
          const row = rows[c.day - 1]
          if (row) (row as any)[c.col] = c.value
        }
        set({ data: { ...get().data, [key]: rows } })
      })
    }
  },

  save: async () => {
    const { data, currentYear, currentMonth, warehouseId } = get()
    const key = monthKey(currentYear, currentMonth)
    const rows = data[key]
    if (!rows) return
    const cells: { day: number; col: string; value: number }[] = []
    for (const row of rows) {
      for (const col of COLUMNS) {
        cells.push({ day: row.day, col, value: (row as any)[col] })
      }
    }
    await window.api.saveMobileMoneyCells(warehouseId, key, cells)
    set({ dirty: false })
  },

  exportExcel: async () => {
    const { data, currentYear, currentMonth, warehouseId } = get()
    const key = monthKey(currentYear, currentMonth)
    const rows = data[key]
    if (!rows) return
    const exportData = rows.map((r) => ({
      day: r.day,
      soldeOM: r.soldeOM,
      soldeMTN: r.soldeMTN,
      soldeCamtel: r.soldeCamtel,
      commissionOM: r.commissionOM,
      commissionMTN: r.commissionMTN,
      commissionCamtel: r.commissionCamtel,
      deficit: r.deficit,
      totalSoldes: getTotalSoldes(r),
      totalCommissions: getTotalCommissions(r),
      soldeReelAjuste: getSoldeReelAjuste(r)
    }))
    await window.api.exportMobileMoneySheet(warehouseId, key, exportData)
  }
}))
