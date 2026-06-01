import { useCallback, useEffect, useState } from 'react'

let scanCounter = 0
let lastScanTime = 0

export function notifyScan() {
  scanCounter++
  lastScanTime = Date.now()
}

export function useDeviceCheck() {
  const [checking, setChecking] = useState<'idle' | 'checking' | 'testing'>('idle')
  const [result, setResult] = useState<boolean | null>(null)

  useEffect(() => {
    const poll = setInterval(() => {
      if (Date.now() - lastScanTime > 5000) scanCounter = 0
    }, 1000)
    return () => clearInterval(poll)
  }, [])

  const checkPrinter = useCallback(async (): Promise<boolean> => {
    try {
      const printers = await window.api.getPrinters()
      return printers.length > 0
    } catch { return false }
  }, [])

  const testPrinter = useCallback(async (): Promise<boolean> => {
    try {
      const printers = await window.api.getPrinters()
      if (printers.length === 0) return false
      await window.api.printReceipt({
        items: [{ product: { name: 'Test impression', price: 0 }, quantity: 1 }],
        totalAmount: 0,
        saleId: 'TEST',
        date: new Date().toLocaleString('fr-FR')
      })
      return true
    } catch { return false }
  }, [])

  const checkScanner = useCallback((): boolean => {
    return scanCounter > 0
  }, [])

  const testScanner = useCallback((): Promise<boolean> => {
    const prev = scanCounter
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        window.removeEventListener('keydown', handler)
        resolve(scanCounter > prev)
      }, 15000)
      const handler = () => {
        if (scanCounter > prev) {
          clearTimeout(timer)
          window.removeEventListener('keydown', handler)
          resolve(true)
        }
      }
      window.addEventListener('keydown', handler)
    })
  }, [])

  const ensurePrinter = useCallback(async (): Promise<boolean> => {
    setChecking('checking')
    const ok = await checkPrinter()
    setChecking('idle')
    return ok
  }, [checkPrinter])

  const ensureScanner = useCallback((): boolean => {
    return checkScanner()
  }, [checkScanner])

  return {
    checkPrinter, testPrinter, checkScanner, testScanner,
    ensurePrinter, ensureScanner,
    checking, result
  }
}
