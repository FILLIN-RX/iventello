import type { PrismaClient } from '@prisma/client'

export interface DashboardPeriodData {
  ventes: number
  revenu: number
  depenses: number
  achats: number
  benefice: number
  transactions: number
  produitsVendus: number
  alerteCount: number
}

export interface DashboardChartPoint {
  label: string
  ventes: number
  revenu: number
  depenses: number
  date: string
}

export interface DashboardSummary {
  period: string
  current: DashboardPeriodData
  previous: DashboardPeriodData
  chart: DashboardChartPoint[]
  topProducts: { name: string; quantity: number; revenu: number }[]
  evolution: {
    ventes: number
    revenu: number
    depenses: number
    achats: number
    benefice: number
  }
}

function getPeriodRange(
  period: string,
  now: Date
): { start: Date; end: Date; previousStart: Date; previousEnd: Date; label: string } {
  const year = now.getFullYear()
  const month = now.getMonth()

  switch (period) {
    case 'semaine': {
      const dayOfWeek = now.getDay()
      const monday = new Date(now)
      monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7))
      monday.setHours(0, 0, 0, 0)
      const sunday = new Date(monday)
      sunday.setDate(monday.getDate() + 6)
      sunday.setHours(23, 59, 59, 999)
      const prevMonday = new Date(monday)
      prevMonday.setDate(monday.getDate() - 7)
      const prevSunday = new Date(prevMonday)
      prevSunday.setDate(prevMonday.getDate() + 6)
      return { start: monday, end: sunday, previousStart: prevMonday, previousEnd: prevSunday, label: 'semaine' }
    }
    case 'mois': {
      const start = new Date(year, month, 1)
      const end = new Date(year, month + 1, 0, 23, 59, 59, 999)
      const prevStart = new Date(year, month - 1, 1)
      const prevEnd = new Date(year, month, 0, 23, 59, 59, 999)
      return { start, end, previousStart: prevStart, previousEnd: prevEnd, label: 'mois' }
    }
    case 'trimestre': {
      const q = Math.floor(month / 3)
      const start = new Date(year, q * 3, 1)
      const end = new Date(year, q * 3 + 3, 0, 23, 59, 59, 999)
      const prevStart = new Date(year, q * 3 - 3, 1)
      const prevEnd = new Date(year, q * 3, 0, 23, 59, 59, 999)
      return { start, end, previousStart: prevStart, previousEnd: prevEnd, label: `T${q + 1}` }
    }
    case 'semestre': {
      const s = Math.floor(month / 6)
      const start = new Date(year, s * 6, 1)
      const end = new Date(year, s * 6 + 6, 0, 23, 59, 59, 999)
      const prevStart = new Date(year, s * 6 - 6, 1)
      const prevEnd = new Date(year, s * 6, 0, 23, 59, 59, 999)
      return { start, end, previousStart: prevStart, previousEnd: prevEnd, label: `S${s + 1}` }
    }
    case 'annee': {
      const start = new Date(year, 0, 1)
      const end = new Date(year, 11, 31, 23, 59, 59, 999)
      const prevStart = new Date(year - 1, 0, 1)
      const prevEnd = new Date(year - 1, 11, 31, 23, 59, 59, 999)
      return { start, end, previousStart: prevStart, previousEnd: prevEnd, label: `${year}` }
    }
    default: {
      const start = new Date(year, month, 1)
      const end = new Date(year, month + 1, 0, 23, 59, 59, 999)
      const prevStart = new Date(year, month - 1, 1)
      const prevEnd = new Date(year, month, 0, 23, 59, 59, 999)
      return { start, end, previousStart: prevStart, previousEnd: prevEnd, label: 'mois' }
    }
  }
}

function getSubPeriods(period: string, now: Date): { label: string; start: Date; end: Date }[] {
  const year = now.getFullYear()
  const month = now.getMonth()

  switch (period) {
    case 'semaine': {
      const dayOfWeek = now.getDay()
      const monday = new Date(now)
      monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7))
      monday.setHours(0, 0, 0, 0)
      return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(monday)
        d.setDate(monday.getDate() + i)
        const end = new Date(d)
        end.setHours(23, 59, 59, 999)
        return { label: d.toLocaleDateString('fr-FR', { weekday: 'short' }), start: d, end }
      })
    }
    case 'mois': {
      const daysInMonth = new Date(year, month + 1, 0).getDate()
      const weeks: { label: string; start: Date; end: Date }[] = []
      for (let d = 1; d <= daysInMonth; d += 7) {
        const start = new Date(year, month, d)
        const end = new Date(year, month, Math.min(d + 6, daysInMonth), 23, 59, 59, 999)
        weeks.push({ label: `S${Math.ceil(d / 7)}`, start, end })
      }
      return weeks
    }
    case 'trimestre': {
      const q = Math.floor(month / 3)
      return Array.from({ length: 3 }, (_, i) => {
        const m = q * 3 + i
        const start = new Date(year, m, 1)
        const end = new Date(year, m + 1, 0, 23, 59, 59, 999)
        return { label: new Date(year, m, 1).toLocaleDateString('fr-FR', { month: 'short' }), start, end }
      })
    }
    case 'semestre': {
      const s = Math.floor(month / 6)
      return Array.from({ length: 6 }, (_, i) => {
        const m = s * 6 + i
        const start = new Date(year, m, 1)
        const end = new Date(year, m + 1, 0, 23, 59, 59, 999)
        return { label: new Date(year, m, 1).toLocaleDateString('fr-FR', { month: 'short' }), start, end }
      })
    }
    case 'annee': {
      return Array.from({ length: 12 }, (_, i) => {
        const start = new Date(year, i, 1)
        const end = new Date(year, i + 1, 0, 23, 59, 59, 999)
        return { label: new Date(year, i, 1).toLocaleDateString('fr-FR', { month: 'short' }), start, end }
      })
    }
    default:
      return []
  }
}

/**
 * Calcule les KPIs d'une période.
 */
async function computePeriodData(
  prisma: PrismaClient,
  start: Date,
  end: Date,
  warehouseId?: string
): Promise<DashboardPeriodData> {
  const whFilter = warehouseId ? { warehouseId } : {}
  const dateFilter = { gte: start, lte: end }

  const [posSales, bookSales, serviceSales, canalSales, expenses, purchases, stocks] = await Promise.all([
    prisma.sale.findMany({
      where: {
        createdAt: dateFilter,
        status: { not: 'ANNULE' },
        ...whFilter
      },
      include: {
        items: {
          include: {
            product: { select: { basePrice: true } },
            book: { select: { purchasePrice: true, price: true } }
          }
        }
      }
    }),
    prisma.bookSale.findMany({
      where: {
        createdAt: dateFilter,
        ...whFilter
      },
      include: {
        items: {
          include: {
            book: { select: { purchasePrice: true, price: true } }
          }
        }
      }
    }),
    prisma.serviceSale.findMany({
      where: {
        createdAt: dateFilter,
        ...whFilter
      },
      select: { totalAmount: true }
    }),
    prisma.canalPlusSale.findMany({
      where: {
        createdAt: dateFilter,
        ...whFilter
      },
      select: { amount: true }
    }),
    prisma.expense.findMany({
      where: {
        date: dateFilter,
        ...whFilter
      },
      select: { amount: true }
    }),
    prisma.cashTransaction.findMany({
      where: {
        type: 'SORTIE',
        createdAt: dateFilter,
        ...whFilter
      },
      select: { totalAmount: true }
    }),
    prisma.stock.findMany({
      where: {
        alertLimit: { gt: 0 },
        ...whFilter
      },
      select: { quantity: true, alertLimit: true }
    })
  ])

  let totalRevenu = 0
  let coutMarchandises = 0
  let produitsVendus = 0
  const totalVentesCount = posSales.length + bookSales.length + serviceSales.length + canalSales.length

  for (const s of posSales) {
    totalRevenu += s.finalTotal || 0
    for (const item of s.items) {
      produitsVendus += item.quantity || 0
      const cost = item.product?.basePrice ?? item.book?.purchasePrice ?? (item.book?.price ? item.book.price * 0.7 : 0)
      coutMarchandises += (item.quantity || 0) * cost
    }
  }

  for (const bs of bookSales) {
    const net = (bs.totalAmount || 0) - (bs.discount || 0)
    totalRevenu += net
    for (const item of bs.items) {
      produitsVendus += item.quantity || 0
      const cost = item.book?.purchasePrice ?? (item.book?.price ? item.book.price * 0.7 : 0)
      coutMarchandises += (item.quantity || 0) * cost
    }
  }

  for (const ss of serviceSales) {
    totalRevenu += ss.totalAmount || 0
  }

  for (const cs of canalSales) {
    totalRevenu += cs.amount || 0
  }

  const depensesTotal = expenses.reduce((acc, e) => acc + (e.amount || 0), 0)
  const achatsTotal = purchases.reduce((acc, p) => acc + (p.totalAmount || 0), 0)

  const margeBrute = Math.max(0, totalRevenu - coutMarchandises)
  const benefice = margeBrute - depensesTotal

  const alerteCount = stocks.filter(s => s.quantity <= s.alertLimit).length

  return {
    ventes: totalVentesCount,
    revenu: totalRevenu,
    depenses: depensesTotal,
    achats: achatsTotal,
    benefice,
    transactions: totalVentesCount,
    produitsVendus,
    alerteCount,
  }
}

async function computeChartData(
  prisma: PrismaClient,
  subPeriods: { label: string; start: Date; end: Date }[],
  rangeStart: Date,
  rangeEnd: Date,
  warehouseId?: string
): Promise<DashboardChartPoint[]> {
  if (subPeriods.length === 0) return []

  const whFilter = warehouseId ? { warehouseId } : {}
  const dateFilter = { gte: rangeStart, lte: rangeEnd }

  const [posSales, bookSales, serviceSales, canalSales, expenses] = await Promise.all([
    prisma.sale.findMany({
      where: { createdAt: dateFilter, status: { not: 'ANNULE' }, ...whFilter },
      select: { createdAt: true, finalTotal: true }
    }),
    prisma.bookSale.findMany({
      where: { createdAt: dateFilter, ...whFilter },
      select: { createdAt: true, totalAmount: true, discount: true }
    }),
    prisma.serviceSale.findMany({
      where: { createdAt: dateFilter, ...whFilter },
      select: { createdAt: true, totalAmount: true }
    }),
    prisma.canalPlusSale.findMany({
      where: { createdAt: dateFilter, ...whFilter },
      select: { createdAt: true, amount: true }
    }),
    prisma.expense.findMany({
      where: { date: dateFilter, ...whFilter },
      select: { date: true, amount: true }
    })
  ])

  return subPeriods.map((sp) => {
    const spStart = sp.start.getTime()
    const spEnd = sp.end.getTime()

    let revenu = 0
    let ventes = 0

    for (const s of posSales) {
      const t = new Date(s.createdAt).getTime()
      if (t >= spStart && t <= spEnd) {
        revenu += s.finalTotal || 0
        ventes += 1
      }
    }

    for (const bs of bookSales) {
      const t = new Date(bs.createdAt).getTime()
      if (t >= spStart && t <= spEnd) {
        revenu += (bs.totalAmount || 0) - (bs.discount || 0)
        ventes += 1
      }
    }

    for (const ss of serviceSales) {
      const t = new Date(ss.createdAt).getTime()
      if (t >= spStart && t <= spEnd) {
        revenu += ss.totalAmount || 0
        ventes += 1
      }
    }

    for (const cs of canalSales) {
      const t = new Date(cs.createdAt).getTime()
      if (t >= spStart && t <= spEnd) {
        revenu += cs.amount || 0
        ventes += 1
      }
    }

    const depenses = expenses
      .filter((e) => { const t = new Date(e.date).getTime(); return t >= spStart && t <= spEnd })
      .reduce((acc, e) => acc + (e.amount || 0), 0)

    return {
      label: sp.label,
      date: sp.start.toISOString(),
      ventes,
      revenu,
      depenses,
    }
  })
}

export function createStatsService(prisma: PrismaClient) {
  return {
    async getDashboardData(period: string, warehouseId?: string): Promise<DashboardSummary> {
      const now = new Date()
      const range = getPeriodRange(period, now)
      const subPeriods = getSubPeriods(period, now)

      const [current, previous, chartData, posSaleItems, bookSaleItems] = await Promise.all([
        computePeriodData(prisma, range.start, range.end, warehouseId),
        computePeriodData(prisma, range.previousStart, range.previousEnd, warehouseId),
        computeChartData(prisma, subPeriods, range.start, range.end, warehouseId),
        prisma.saleItem.findMany({
          where: {
            sale: {
              createdAt: { gte: range.start, lte: range.end },
              status: { not: 'ANNULE' },
              ...(warehouseId ? { warehouseId } : {})
            }
          },
          include: {
            product: { select: { name: true } },
            book: { select: { title: true } }
          }
        }),
        prisma.bookSaleItem.findMany({
          where: {
            sale: {
              createdAt: { gte: range.start, lte: range.end },
              ...(warehouseId ? { warehouseId } : {})
            }
          },
          include: {
            book: { select: { title: true } }
          }
        })
      ])

      const itemMap = new Map<string, { name: string; quantity: number; revenu: number }>()

      for (const item of posSaleItems) {
        const name = item.product?.name || item.book?.title || 'Produit sans nom'
        const existing = itemMap.get(name) || { name, quantity: 0, revenu: 0 }
        existing.quantity += item.quantity || 0
        existing.revenu += (item.quantity || 0) * (item.unitPrice || 0)
        itemMap.set(name, existing)
      }

      for (const item of bookSaleItems) {
        const name = item.book?.title || 'Livre sans nom'
        const existing = itemMap.get(name) || { name, quantity: 0, revenu: 0 }
        existing.quantity += item.quantity || 0
        existing.revenu += (item.quantity || 0) * (item.unitPrice || 0)
        itemMap.set(name, existing)
      }

      const topProducts = Array.from(itemMap.values())
        .sort((a, b) => b.revenu - a.revenu)
        .slice(0, 10)

      const evolution = {
        ventes: previous.ventes > 0 ? ((current.ventes - previous.ventes) / previous.ventes) * 100 : current.ventes > 0 ? 100 : 0,
        revenu: previous.revenu > 0 ? ((current.revenu - previous.revenu) / previous.revenu) * 100 : current.revenu > 0 ? 100 : 0,
        depenses: previous.depenses > 0 ? ((current.depenses - previous.depenses) / previous.depenses) * 100 : current.depenses > 0 ? 100 : 0,
        achats: previous.achats > 0 ? ((current.achats - previous.achats) / previous.achats) * 100 : current.achats > 0 ? 100 : 0,
        benefice: previous.benefice > 0 ? ((current.benefice - previous.benefice) / previous.benefice) * 100 : current.benefice > 0 ? 100 : 0,
      }

      return {
        period: range.label,
        current,
        previous,
        chart: chartData,
        topProducts,
        evolution,
      }
    },
  }
}
