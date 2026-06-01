import { create } from 'zustand'
import type { CashTransactionWithLines, CashRegisterSummary } from '../../../shared/types'

interface NewTransaction {
  type: 'ENTREE' | 'SORTIE'
  warehouseId: string
  totalAmount: number
  paymentMethod: string
  description?: string
  lines: { productId: string; quantity: number; unitPrice: number; subTotal: number }[]
}

interface CashRegisterState {
  transactions: CashTransactionWithLines[]
  summary: CashRegisterSummary | null
  isLoading: boolean
  fetchDailyData: (warehouseId: string) => Promise<void>
  addTransaction: (data: NewTransaction) => Promise<void>
  deleteTransaction: (id: string, warehouseId: string) => Promise<void>
}

export const useCashRegisterStore = create<CashRegisterState>((set, get) => ({
  transactions: [],
  summary: null,
  isLoading: false,

  fetchDailyData: async (warehouseId) => {
    set({ isLoading: true })
    try {
      const [summary, transactions] = await Promise.all([
        window.api.getRealTimeAccounting(warehouseId),
        window.api.getCashTransactions(warehouseId)
      ])
      set({ summary, transactions, isLoading: false })
    } catch (err) {
      console.error('Erreur chargement caisse', err)
      set({ isLoading: false })
    }
  },

  addTransaction: async (data) => {
    await window.api.createCashTransaction(data)
    await get().fetchDailyData(data.warehouseId)
  },

  deleteTransaction: async (id, warehouseId: string) => {
    await window.api.deleteCashTransaction(id)
    await get().fetchDailyData(warehouseId)
  }
}))
