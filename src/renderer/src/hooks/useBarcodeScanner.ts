import { useEffect, useRef, useCallback } from 'react'
import { notifyScan } from './useDeviceCheck'

const SCANNER_TIMEOUT = 100

export function useBarcodeScanner(onScan: (barcode: string) => void) {
  const buffer = useRef('')
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        const barcode = buffer.current.trim()
        if (barcode.length > 0) {
          notifyScan()
          onScan(barcode)
        }
        buffer.current = ''
        if (timer.current) clearTimeout(timer.current)
        return
      }

      if (e.key.length === 1) {
        buffer.current += e.key
        if (timer.current) clearTimeout(timer.current)
        timer.current = setTimeout(() => {
          buffer.current = ''
        }, SCANNER_TIMEOUT)
      }
    },
    [onScan]
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      if (timer.current) clearTimeout(timer.current)
    }
  }, [handleKeyDown])
}
