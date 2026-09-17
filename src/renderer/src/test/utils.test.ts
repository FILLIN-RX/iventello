import { describe, it, expect } from 'vitest'

describe('formatCurrency', () => {
  it('formate un nombre en XAF', async () => {
    const { formatCurrency } = await import('@/lib/utils')
    expect(formatCurrency(1000)).toBe('1\u202f000 FCFA')
    expect(formatCurrency(0)).toBe('0 FCFA')
    expect(formatCurrency(1500500)).toBe('1\u202f500\u202f500 FCFA')
  })
})

describe('cn utility', () => {
  it('fusionne des classes Tailwind', async () => {
    const { cn } = await import('@/lib/utils')
    expect(cn('px-4', 'py-2')).toBe('px-4 py-2')
    expect(cn('px-4', false && 'hidden')).toBe('px-4')
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500')
  })
})
