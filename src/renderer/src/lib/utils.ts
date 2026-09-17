import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency: 'XOF' | 'EUR' = 'XOF'): string {
  if (currency === 'EUR') {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount)
  }
  const formatted = new Intl.NumberFormat('fr-FR', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)
  return `${formatted} FCFA`
}

export function normalizeText(str: string | null | undefined): string {
  if (!str) return ''
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

const CATEGORY_PALETTE = [
  'bg-emerald-500', 'bg-blue-500', 'bg-purple-500', 'bg-amber-500',
  'bg-rose-500', 'bg-cyan-500', 'bg-indigo-500', 'bg-orange-500',
  'bg-teal-500', 'bg-pink-500',
]

export function getColor(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return CATEGORY_PALETTE[Math.abs(hash) % CATEGORY_PALETTE.length]
}


