import { dialog } from 'electron'
import Excel from 'exceljs'
import { writeFile } from 'fs/promises'

// ── Utilitaires de style ────────────────────────────────────────────────

const HEADER_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } } as const
const HEADER_FONT = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11, name: 'Calibri' } as const
const SUBHEADER_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } } as const
const SUBHEADER_FONT = { bold: true, color: { argb: 'FF1E293B' }, size: 10, name: 'Calibri' } as const
const TOTAL_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } } as const
const TOTAL_FONT = { bold: true, size: 11, name: 'Calibri' } as const
const DATA_FONT = { size: 10, name: 'Calibri' } as const
const TITLE_FONT = { bold: true, size: 14, name: 'Calibri', color: { argb: 'FF1E293B' } } as const
const SUBTITLE_FONT = { size: 11, name: 'Calibri', color: { argb: 'FF64748B' } } as const
const BORDER = {
  top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
  left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
  bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
  right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
} as const

const CAT_COLORS = [
  'FF2563EB', 'FF059669', 'FF0891B2', 'FFD97706',
  'FFDC2626', 'FF7C3AED', 'FFDB2777', 'FF4F46E5',
]

function applyHeader(ws: Excel.Worksheet, row: number, cols: string[]) {
  const r = ws.getRow(row)
  cols.forEach((c, i) => {
    const cell = r.getCell(i + 1)
    cell.value = c
    cell.fill = HEADER_FILL
    cell.font = HEADER_FONT
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
    cell.border = BORDER
  })
  r.height = 28
}

function applyDataRow(ws: Excel.Worksheet, row: number, values: (string | number)[], isTotal = false) {
  const r = ws.getRow(row)
  values.forEach((v, i) => {
    const cell = r.getCell(i + 1)
    cell.value = v
    if (isTotal) {
      cell.fill = TOTAL_FILL
      cell.font = TOTAL_FONT
    } else {
      cell.font = DATA_FONT
    }
    cell.alignment = { horizontal: i === 0 ? 'center' : 'right', vertical: 'middle' }
    cell.border = BORDER
  })
  if (isTotal) r.height = 24
}

function autoColWidth(ws: Excel.Worksheet, minW = 14, maxW = 30) {
  const cols = ws.columns
  if (!cols) return
  for (let i = 0; i < cols.length; i++) {
    const col = cols[i]
    if (!col) continue
    let maxLen = 0
    const vals = col.values
    if (vals) {
      for (let j = 0; j < vals.length; j++) {
        const v = vals[j]
        if (v) maxLen = Math.max(maxLen, String(v).length)
      }
    }
    col.width = Math.min(maxW, Math.max(minW, maxLen + 3))
  }
}

async function saveWorkbook(wb: Excel.Workbook, defaultName: string): Promise<string> {
  const result = await dialog.showSaveDialog({
    title: `Exporter ${defaultName}`,
    defaultPath: `${defaultName}.xlsx`,
    filters: [{ name: 'Classeur Excel', extensions: ['xlsx'] }],
  })
  if (result.canceled || !result.filePath) return ''
  const buf = await wb.xlsx.writeBuffer()
  await writeFile(result.filePath, buf as Buffer)
  return result.filePath
}

// ── Export Rapports ─────────────────────────────────────────────────────

export async function exportRapportExcel(params: {
  tab: string
  year: number
  month: number
  monthName: string
  warehouseName: string
  categories: string[]
  salesByDay: Record<number, Record<string, number>>
  expensesByDay: Record<number, number>
  purchasesByDay: Record<number, number>
  discountsByDay: Record<number, number>
}): Promise<string> {
  const { tab, year, month, monthName, warehouseName, categories, salesByDay, expensesByDay, purchasesByDay, discountsByDay } = params
  if (!categories || !Array.isArray(categories)) throw new Error('Catégories manquantes')
  const days = new Date(year, month, 0).getDate()
  const wb = new Excel.Workbook()
  const ws = wb.addWorksheet(`${monthName} ${year}`)

  // Titre
  ws.mergeCells(1, 1, 1, tab === 'ventes' ? categories.length + 2 : 2)
  const titleCell = ws.getCell('A1')
  titleCell.value = `Rapport ${tab === 'ventes' ? 'Ventes' : tab === 'depenses' ? 'Dépenses' : tab === 'achats' ? 'Achats' : 'Remises'} — ${monthName} ${year}`
  titleCell.font = TITLE_FONT
  ws.getRow(1).height = 30

  ws.mergeCells(2, 1, 2, tab === 'ventes' ? categories.length + 2 : 2)
  const subCell = ws.getCell('A2')
  subCell.value = warehouseName || 'Entrepôt'
  subCell.font = SUBTITLE_FONT
  ws.getRow(2).height = 20

  // En-têtes
  let headers: string[]
  if (tab === 'ventes') {
    headers = ['Jour', ...categories, 'Total']
    applyHeader(ws, 4, headers)
    // Colorer les en-têtes catégories
    categories.forEach((_, i) => {
      const cell = ws.getRow(4).getCell(i + 2)
      cell.fill = {
        type: 'pattern', pattern: 'solid',
        fgColor: { argb: CAT_COLORS[i % CAT_COLORS.length] }
      }
    })
  } else {
    headers = ['Jour', 'Montant']
    applyHeader(ws, 4, headers)
  }

  // Données
  let rowIdx = 5
  for (let d = 1; d <= days; d++) {
    if (tab === 'ventes') {
      const vals = [d, ...categories.map(c => salesByDay[d]?.[c] ?? 0)]
      const totalSales = categories.reduce((s, c) => s + (salesByDay[d]?.[c] ?? 0), 0)
      vals.push(totalSales)
      applyDataRow(ws, rowIdx, vals, false)
    } else {
      const val = tab === 'depenses' ? (expensesByDay[d] ?? 0)
        : tab === 'achats' ? (purchasesByDay[d] ?? 0)
        : (discountsByDay[d] ?? 0)
      applyDataRow(ws, rowIdx, [d, val], false)
    }
    // Lignes alternées
    if (d % 2 === 0) {
      ws.getRow(rowIdx).eachCell(cell => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } }
      })
    }
    rowIdx++
  }

  // Total
  if (tab === 'ventes') {
    const totals = categories.map(c => {
      let s = 0
      for (let d = 1; d <= days; d++) s += salesByDay[d]?.[c] ?? 0
      return s
    })
    const grandTotal = totals.reduce((a, b) => a + b, 0)
    applyDataRow(ws, rowIdx, ['TOTAL', ...totals, grandTotal], true)
  } else {
    let total = 0
    for (let d = 1; d <= days; d++) {
      total += tab === 'depenses' ? (expensesByDay[d] ?? 0)
        : tab === 'achats' ? (purchasesByDay[d] ?? 0)
        : (discountsByDay[d] ?? 0)
    }
    applyDataRow(ws, rowIdx, ['TOTAL', total], true)
  }

  autoColWidth(ws)
  return saveWorkbook(wb, `Rapport_${tab}_${monthName}_${year}`)
}

// ── Export Mobile Money ─────────────────────────────────────────────────

export async function exportMobileMoneyExcel(params: {
  month: string
  monthName: string
  warehouseName: string
  rows: {
    day: number
    soldeOM: number
    soldeMTN: number
    soldeCamtel: number
    commissionOM: number
    commissionMTN: number
    commissionCamtel: number
    deficit: number
    totalSoldes: number
    totalCommissions: number
    soldeReelAjuste: number
  }[]
}): Promise<string> {
  const { month, monthName, warehouseName, rows } = params
  if (!rows || !Array.isArray(rows)) throw new Error('Aucune donnée à exporter')

  const wb = new Excel.Workbook()
  const ws = wb.addWorksheet(monthName)

  // Titre
  ws.mergeCells(1, 1, 1, 11)
  ws.getCell('A1').value = `Mobile Money — ${monthName}`
  ws.getCell('A1').font = TITLE_FONT
  ws.getRow(1).height = 30

  ws.mergeCells(2, 1, 2, 11)
  ws.getCell('A2').value = warehouseName || 'Entrepôt'
  ws.getCell('A2').font = SUBTITLE_FONT

  const headers = [
    'Date', 'Solde Orange Money', 'Solde MTN MoMo', 'Solde Camtel',
    'Commission OM', 'Commission MTN', 'Commission Camtel',
    'Déficit', 'Total Soldes', 'Total Commissions', 'Solde Réel Ajusté'
  ]
  const headerRow = 4
  applyHeader(ws, headerRow, headers)
  // Colorer la ligne d'en-têtes
  const headerColors = ['FF2563EB', 'FF059669', 'FF0891B2', 'FFD97706', 'FFEA580C', 'FF7C3AED', 'FFDB2777', 'FFDC2626']
  headers.forEach((_, i) => {
    if (i === 0) return
    const cell = ws.getRow(headerRow).getCell(i + 1)
    cell.fill = {
      type: 'pattern', pattern: 'solid',
      fgColor: { argb: headerColors[(i - 1) % headerColors.length] }
    }
  })

  let rowIdx = 5
  for (const r of rows) {
    applyDataRow(ws, rowIdx, [
      `Jour ${r.day}`, r.soldeOM, r.soldeMTN, r.soldeCamtel,
      r.commissionOM, r.commissionMTN, r.commissionCamtel,
      r.deficit, r.totalSoldes, r.totalCommissions, r.soldeReelAjuste
    ])
    if (r.day % 2 === 0) {
      ws.getRow(rowIdx).eachCell(cell => {
        if (!cell.fill || (cell.fill as any).fgColor?.argb !== 'FFE2E8F0') {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } }
        }
      })
    }
    rowIdx++
  }

  // Total
  function sum(key: string) {
    return rows.reduce((s, r) => s + (r as any)[key], 0)
  }
  applyDataRow(ws, rowIdx, [
    'TOTAL MENSUEL', sum('soldeOM'), sum('soldeMTN'), sum('soldeCamtel'),
    sum('commissionOM'), sum('commissionMTN'), sum('commissionCamtel'),
    sum('deficit'), sum('totalSoldes'), sum('totalCommissions'), sum('soldeReelAjuste'),
  ], true)

  // Formules Excel pour les colonnes calculées
  for (let i = 0; i < rows.length; i++) {
    const r = headerRow + 1 + i
    ws.getCell(`I${r}`).value = { formula: `B${r}+C${r}+D${r}` }
    ws.getCell(`J${r}`).value = { formula: `E${r}+F${r}+G${r}` }
    ws.getCell(`K${r}`).value = { formula: `I${r}-H${r}` }
  }

  autoColWidth(ws, 16)
  return saveWorkbook(wb, `MobileMoney_${month}`)
}

// ── Export Canal+ ────────────────────────────────────────────────────────

export async function exportCanalPlusExcel(params: {
  month: string
  monthName: string
  warehouseName: string
  rows: {
    day: number
    reabonnementAccess: number
    reabonnementEvasion: number
    reabonnementAccessPlus: number
    reabonnementToutCanal: number
    reabonnementOthers: number
    totalReabonnement: number
    abonnement: number
    achatDecoder: number
    installationDepannage: number
    commission: number
  }[]
}): Promise<string> {
  const { month, monthName, warehouseName, rows } = params
  if (!rows || !Array.isArray(rows)) throw new Error('Aucune donnée à exporter')

  const wb = new Excel.Workbook()
  const ws = wb.addWorksheet(monthName)

  // Titre
  ws.mergeCells(1, 1, 1, 11)
  ws.getCell('A1').value = `Canal+ — ${monthName}`
  ws.getCell('A1').font = TITLE_FONT
  ws.getRow(1).height = 30

  ws.mergeCells(2, 1, 2, 11)
  ws.getCell('A2').value = warehouseName || 'Entrepôt'
  ws.getCell('A2').font = SUBTITLE_FONT

  const headers = [
    'Date', 'Réab. Access', 'Réab. Évasion', 'Réab. Access+',
    'Réab. Tout Canal', 'Réab. Autres', 'Total Réab.',
    'Abonnement', 'Achat Décodeur', 'Install./Dépannage', 'Commission'
  ]
  const headerRow = 4
  applyHeader(ws, headerRow, headers)

  const headerColors = [
    'FF2563EB', 'FF0284C7', 'FF4F46E5', 'FF7C3AED',
    'FFA855F7', 'FF8B5CF6', 'FF059669', 'FFEA580C', 'FFE11D48', 'FFF59E0B'
  ]
  headers.forEach((_, i) => {
    if (i === 0) return
    ws.getRow(headerRow).getCell(i + 1).fill = {
      type: 'pattern', pattern: 'solid',
      fgColor: { argb: headerColors[(i - 1) % headerColors.length] }
    }
  })

  let rowIdx = 5
  for (const r of rows) {
    applyDataRow(ws, rowIdx, [
      `Jour ${r.day}`, r.reabonnementAccess, r.reabonnementEvasion,
      r.reabonnementAccessPlus, r.reabonnementToutCanal, r.reabonnementOthers,
      r.totalReabonnement, r.abonnement, r.achatDecoder,
      r.installationDepannage, r.commission,
    ])
    if (r.day % 2 === 0) {
      ws.getRow(rowIdx).eachCell(cell => {
        if (!cell.fill || (cell.fill as any).fgColor?.argb !== 'FFE2E8F0') {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } }
        }
      })
    }
    rowIdx++
  }

  // Ligne total mensuel
  function sum(key: string) {
    return rows.reduce((s, r) => s + (r as any)[key], 0)
  }
  applyDataRow(ws, rowIdx, [
    'TOTAL MENSUEL', sum('reabonnementAccess'), sum('reabonnementEvasion'),
    sum('reabonnementAccessPlus'), sum('reabonnementToutCanal'), sum('reabonnementOthers'),
    sum('totalReabonnement'), sum('abonnement'), sum('achatDecoder'),
    sum('installationDepannage'), sum('commission'),
  ], true)

  // Ligne Total Réabonnements
  rowIdx++
  const rTotal = rows.reduce((s, r) => s + r.totalReabonnement, 0)
  const rAbonnement = rows.reduce((s, r) => s + r.abonnement, 0)
  const rAchatDecoder = rows.reduce((s, r) => s + r.achatDecoder, 0)
  const rInstallation = rows.reduce((s, r) => s + r.installationDepannage, 0)
  const rCommission = rows.reduce((s, r) => s + r.commission, 0)
  const reabPlusRecrut = rTotal + rAbonnement
  const generalTotal = rTotal + rAbonnement + rAchatDecoder + rInstallation + rCommission

  // Sous-totaux stylisés
  const summaryRows: { label: string; value: number; color: string }[] = [
    { label: 'TOTAL RÉABONNEMENTS', value: rTotal, color: 'FF2563EB' },
    { label: 'TOTAL RÉAB. + RECRUTEMENT', value: reabPlusRecrut, color: 'FF059669' },
    { label: 'TOTAL GÉNÉRAL', value: generalTotal, color: 'FFD97706' },
  ]
  for (const sr of summaryRows) {
    rowIdx++
    const r = ws.getRow(rowIdx)
    ws.mergeCells(rowIdx, 1, rowIdx, 6)
    const labelCell = r.getCell(1)
    labelCell.value = sr.label
    labelCell.font = { bold: true, size: 11, name: 'Calibri', color: { argb: sr.color } }
    labelCell.alignment = { horizontal: 'right', vertical: 'middle' }
    labelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `${sr.color}20` } }
    labelCell.border = BORDER
    ws.mergeCells(rowIdx, 7, rowIdx, 11)
    const valCell = r.getCell(7)
    valCell.value = sr.value
    valCell.font = { bold: true, size: 12, name: 'Calibri', color: { argb: sr.color } }
    valCell.alignment = { horizontal: 'center', vertical: 'middle' }
    valCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `${sr.color}20` } }
    valCell.border = BORDER
    r.height = 26
  }

  autoColWidth(ws, 16)
  return saveWorkbook(wb, `CanalPlus_${month}`)
}
