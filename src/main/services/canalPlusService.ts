import { PrismaClient } from '@prisma/client'

export function createCanalPlusService(prisma: PrismaClient) {
  return {
    async getCells(warehouseId: string, month: string) {
      return prisma.canalPlusCell.findMany({ where: { warehouseId, month } })
    },

    async saveCells(warehouseId: string, month: string, cells: { day: number; col: string; value: number }[]) {
      await prisma.$transaction(
        cells.map((c) =>
          prisma.canalPlusCell.upsert({
            where: { warehouseId_month_day_col: { warehouseId, month, day: c.day, col: c.col } },
            create: { warehouseId, month, day: c.day, col: c.col, value: c.value },
            update: { value: c.value }
          })
        )
      )
    }
  }
}
