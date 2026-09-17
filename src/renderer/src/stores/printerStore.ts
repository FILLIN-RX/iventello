import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { PrinterConfig } from '../../../shared/types'

interface PrinterState {
  config: PrinterConfig
  setConfig: (config: Partial<PrinterConfig>) => void
  resetConfig: () => void
}

const defaultConfig: PrinterConfig = {
  type: 'USB',
  printerName: '',
  ip: '192.168.1.200',
  port: 9100,
  paperWidth: '58mm',
  autoCut: true,
  openCashDrawer: false
}

export const usePrinterStore = create<PrinterState>()(
  persist(
    (set) => ({
      config: defaultConfig,
      setConfig: (newConfig) =>
        set((state) => ({
          config: { ...state.config, ...newConfig }
        })),
      resetConfig: () => set({ config: defaultConfig })
    }),
    {
      name: 'iventello-printer-config',
      storage: createJSONStorage(() => localStorage)
    }
  )
)
