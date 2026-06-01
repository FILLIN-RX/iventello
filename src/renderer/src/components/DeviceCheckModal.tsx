import { useState } from 'react'
import { Barcode, Printer, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react'
import { Button } from './ui/button'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
  DialogFooter
} from './ui/dialog'

type DeviceType = 'scanner' | 'printer' | 'ticket'

interface DeviceCheckModalProps {
  open: boolean
  onClose: () => void
  device: DeviceType
  onTest: () => Promise<boolean>
}

const DEVICE_LABELS: Record<DeviceType, { title: string; description: string; icon: typeof Barcode }> = {
  scanner: {
    title: 'Scanner non détecté',
    description: 'Branchez votre scanner de code-barres, puis cliquez sur "Tester" pour vérifier la connexion. Scannez un code-barres dans les 15 secondes.',
    icon: Barcode
  },
  printer: {
    title: 'Imprimante non détectée',
    description: 'Aucune imprimante trouvée. Branchez l\'imprimante de ticket (ESC/POS 58mm) et cliquez sur "Tester" pour vérifier.',
    icon: Printer
  },
  ticket: {
    title: 'Imprimante ticket non détectée',
    description: 'Aucune imprimante thermique trouvée. Vérifiez la connexion de l\'imprimante ESC/POS 58mm.',
    icon: Printer
  }
}

export function DeviceCheckModal({ open, onClose, device, onTest }: DeviceCheckModalProps) {
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<boolean | null>(null)
  const info = DEVICE_LABELS[device]
  const Icon = info.icon

  async function handleTest() {
    setTesting(true)
    setTestResult(null)
    const ok = await onTest()
    setTestResult(ok)
    setTesting(false)
  }

  function handleClose() {
    setTestResult(null)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <DialogTitle>{info.title}</DialogTitle>
          </div>
          <DialogDescription className="pt-2">{info.description}</DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-center rounded-lg border border-dashed bg-muted/30 py-6">
          <Icon className="h-12 w-12 text-muted-foreground/50" />
        </div>

        {testResult !== null && (
          <div className={`flex items-center gap-2 rounded-lg p-3 text-sm ${testResult ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400' : 'bg-destructive/10 text-destructive'}`}>
            {testResult ? (
              <><CheckCircle2 className="h-4 w-4" /> {device === 'scanner' ? 'Scanner détecté' : 'Impression réussie'}</>
            ) : (
              <><AlertTriangle className="h-4 w-4" /> {device === 'scanner' ? 'Aucun scan détecté. Vérifiez la connexion.' : 'Aucune imprimante trouvée.'}</>
            )}
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleClose}>
            Fermer
          </Button>
          <Button onClick={handleTest} disabled={testing}>
            {testing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Test en cours...</> : 'Tester la connexion'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
