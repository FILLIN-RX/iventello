import { PrismaClient } from '@prisma/client'
import { app, dialog } from 'electron'
import { join } from 'node:path'
import { writeFile } from 'node:fs/promises'

export function createMobileMoneyService(prisma: PrismaClient) {
  return {
    async getCells(warehouseId: string, month: string) {
      return prisma.mobileMoneyCell.findMany({ where: { warehouseId, month } })
    },

    async saveCells(warehouseId: string, month: string, cells: { day: number; col: string; value: number }[]) {
      await prisma.$transaction(
        cells.map((c) =>
          prisma.mobileMoneyCell.upsert({
            where: { warehouseId_month_day_col: { warehouseId, month, day: c.day, col: c.col } },
            create: { warehouseId, month, day: c.day, col: c.col, value: c.value },
            update: { value: c.value }
          })
        )
      )
    },

    async exportExcel(warehouseId: string, month: string, rows: {
      day: number; soldeOM: number; soldeMTN: number; soldeCamtel: number;
      commissionOM: number; commissionMTN: number; commissionCamtel: number;
      deficit: number; totalSoldes: number; totalCommissions: number; soldeReelAjuste: number
    }[]) {
      const result = await dialog.showSaveDialog({
        title: `Exporter la feuille Mobile Money - ${month}`,
        defaultPath: `mobile-money-${month}.xlsx`,
        filters: [{ name: 'Classeur Excel', extensions: ['xlsx'] }]
      })
      if (result.canceled || !result.filePath) return ''

      // Génération xlsx via le buffer Excel
      let XLSX: any
      try {
        XLSX = await import('xlsx')
      } catch {
        throw new Error('Package xlsx non installé. Exécutez: npm install xlsx')
      }
      const wb = XLSX.utils.book_new()

      const headers = [
        'Date', 'Solde Orange Money', 'Solde MTN MoMo', 'Solde Camtel',
        'Commission Orange Money', 'Commission MTN MoMo', 'Commission Camtel',
        'Déficit', 'Total Soldes', 'Total Commissions', 'Solde Réel Ajusté'
      ]

      const data = rows.map((r) => [
        `Jour ${r.day}`, r.soldeOM, r.soldeMTN, r.soldeCamtel,
        r.commissionOM, r.commissionMTN, r.commissionCamtel,
        r.deficit, r.totalSoldes, r.totalCommissions, r.soldeReelAjuste
      ])

      // Ligne total mensuel
      const totalRow = [
        'TOTAL MENSUEL',
        rows.reduce((s, r) => s + r.soldeOM, 0),
        rows.reduce((s, r) => s + r.soldeMTN, 0),
        rows.reduce((s, r) => s + r.soldeCamtel, 0),
        rows.reduce((s, r) => s + r.commissionOM, 0),
        rows.reduce((s, r) => s + r.commissionMTN, 0),
        rows.reduce((s, r) => s + r.commissionCamtel, 0),
        rows.reduce((s, r) => s + r.deficit, 0),
        rows.reduce((s, r) => s + r.totalSoldes, 0),
        rows.reduce((s, r) => s + r.totalCommissions, 0),
        rows.reduce((s, r) => s + r.soldeReelAjuste, 0)
      ]

      const ws = XLSX.utils.aoa_to_sheet([headers, ...data, totalRow])

      // Définir la largeur des colonnes
      ws['!cols'] = headers.map(() => ({ wch: 22 }))

      // Ajouter les formules (optionnel mais utile)
      for (let i = 0; i < rows.length; i++) {
        const rowNum = i + 2 // 1-indexed, +1 for header
        ws[`I${rowNum}`] = { f: `=B${rowNum}+C${rowNum}+D${rowNum}` }
        ws[`J${rowNum}`] = { f: `=E${rowNum}+F${rowNum}+G${rowNum}` }
        ws[`K${rowNum}`] = { f: `=I${rowNum}-H${rowNum}` }
      }

      XLSX.utils.book_append_sheet(wb, ws, month)
      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
      await writeFile(result.filePath, buffer)

      return result.filePath
    }
  }
}
