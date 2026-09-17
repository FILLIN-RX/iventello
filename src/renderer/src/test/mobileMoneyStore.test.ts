import { describe, it, expect } from 'vitest'
import { getTotalSoldes, getTotalCommissions, getSoldeReelAjuste, monthKey, type DayRow } from '@/stores/mobileMoneyStore'

describe('mobileMoneyStore - pure functions', () => {
  const row: DayRow = {
    day: 1,
    soldeOM: 1000,
    soldeMTN: 2000,
    soldeCamtel: 500,
    commissionOM: 50,
    commissionMTN: 30,
    commissionCamtel: 10,
    deficit: 100
  }

  it('getTotalSoldes additionne les trois soldes', () => {
    expect(getTotalSoldes(row)).toBe(3500)
  })

  it('getTotalCommissions additionne les trois commissions', () => {
    expect(getTotalCommissions(row)).toBe(90)
  })

  it('getSoldeReelAjuste soustrait le deficit', () => {
    expect(getSoldeReelAjuste(row)).toBe(3400)
  })

  it('monthKey formate YYYY-MM', () => {
    expect(monthKey(2025, 1)).toBe('2025-01')
    expect(monthKey(2024, 12)).toBe('2024-12')
  })
})
