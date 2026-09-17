import { useState, useEffect } from 'react'
import {
  Printer,
  Wifi,
  Usb,
  Bluetooth,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Sliders,
  Scissors,
  Coins,
  Search,
  Check,
  Radio
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from './ui/dialog'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Switch } from './ui/switch'
import { Badge } from './ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { usePrinterStore } from '../stores/printerStore'
import type { NearbyPrinter } from '../../../shared/types'

interface PrinterConfigModalProps {
  open: boolean
  onClose: () => void
}

export function PrinterConfigModal({ open, onClose }: PrinterConfigModalProps) {
  const { config, setConfig } = usePrinterStore()
  const [testing, setTesting] = useState(false)
  const [testStatus, setTestStatus] = useState<{ success: boolean; message: string } | null>(null)

  // Scanning state
  const [scanning, setScanning] = useState(false)
  const [discovered, setDiscovered] = useState<NearbyPrinter[]>([])
  const [scanDone, setScanDone] = useState(false)

  // Selected printer state
  const [type, setType] = useState<'USB' | 'NETWORK'>(config.type || 'USB')
  const [printerName, setPrinterName] = useState(config.printerName || '')
  const [ip, setIp] = useState(config.ip || '')
  const [paperWidth, setPaperWidth] = useState<'58mm' | '80mm'>(config.paperWidth || '58mm')
  const [autoCut, setAutoCut] = useState(config.autoCut ?? true)
  const [openCashDrawer, setOpenCashDrawer] = useState(config.openCashDrawer ?? false)

  useEffect(() => {
    if (open) {
      setType(config.type || 'USB')
      setPrinterName(config.printerName || '')
      setIp(config.ip || '')
      setPaperWidth(config.paperWidth || '58mm')
      setAutoCut(config.autoCut ?? true)
      setOpenCashDrawer(config.openCashDrawer ?? false)
      setTestStatus(null)
      // Lancer automatiquement un premier scan à l'ouverture
      handleScan()
    }
  }, [open, config])

  async function handleScan() {
    setScanning(true)
    setScanDone(true)
    try {
      const list = await window.api.scanNearbyPrinters()
      setDiscovered(list)
      // Auto-sélection de la première imprimante USB détectée si aucune n'est configurée
      if (list.length > 0 && !printerName) {
        const firstUsb = list.find((p) => p.type === 'USB') || list[0]
        if (firstUsb) {
          handleSelectPrinter(firstUsb)
        }
      }
    } catch (err) {
      console.error('Erreur scan imprimantes:', err)
    } finally {
      setScanning(false)
    }
  }

  function handleSelectPrinter(p: NearbyPrinter) {
    if (p.type === 'NETWORK') {
      setType('NETWORK')
      setIp(p.ip || '')
      setPrinterName('')
    } else {
      setType('USB')
      setPrinterName(p.printerName || p.name)
      setIp('')
    }
  }

  async function handleTest() {
    setTesting(true)
    setTestStatus(null)
    const draftConfig = {
      type,
      printerName,
      ip: ip.trim(),
      port: 9100, // Port standard transparent
      paperWidth,
      autoCut,
      openCashDrawer
    }

    try {
      await window.api.printTestReceipt(draftConfig)
      setTestStatus({
        success: true,
        message:
          type === 'NETWORK'
            ? `Ticket de test envoyé avec succès à l'imprimante Wi-Fi (${ip}) !`
            : `Ticket de test envoyé à l'imprimante (${printerName || 'Par défaut'}) !`
      })
    } catch (err: any) {
      setTestStatus({
        success: false,
        message: err?.message || "Échec de l'impression de test. Vérifiez la connexion de l'imprimante."
      })
    } finally {
      setTesting(false)
    }
  }

  function handleSave() {
    setConfig({
      type,
      printerName,
      ip: ip.trim(),
      port: 9100,
      paperWidth,
      autoCut,
      openCashDrawer
    })
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Printer className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold">Imprimante Ticket de Caisse</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Détection automatique et configuration sans-fil (Wi-Fi & Bluetooth) ou USB.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Section Scan Automatique Wi-Fi & Bluetooth */}
          <div className="p-3 bg-muted/40 rounded-lg border space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="text-xs font-semibold flex items-center gap-1.5">
                  <Radio className="h-4 w-4 text-emerald-500 animate-pulse" />
                  Imprimantes à proximité
                </div>
                <div className="text-[11px] text-muted-foreground">
                  Détection des imprimantes Wi-Fi, Bluetooth et USB
                </div>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleScan}
                disabled={scanning}
                className="h-8 text-xs gap-1.5 border-primary/30 text-primary hover:bg-primary/5"
              >
                {scanning ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Recherche en cours...
                  </>
                ) : (
                  <>
                    <Search className="h-3.5 w-3.5" />
                    Actualiser le scan
                  </>
                )}
              </Button>
            </div>

            {/* Liste des imprimantes détectées */}
            {discovered.length > 0 ? (
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {discovered.map((p) => {
                  const isSelected =
                    (p.type === 'NETWORK' && type === 'NETWORK' && ip === p.ip) ||
                    (p.type !== 'NETWORK' && type === 'USB' && printerName === (p.printerName || p.name))

                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleSelectPrinter(p)}
                      className={`w-full flex items-center justify-between p-2.5 rounded-md border text-xs text-left transition-all ${
                        isSelected
                          ? 'bg-emerald-50 border-emerald-500 text-emerald-900 dark:bg-emerald-950/40 dark:border-emerald-500 dark:text-emerald-300 ring-1 ring-emerald-500'
                          : 'bg-background hover:bg-muted/70'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`p-1.5 rounded-md ${
                          p.type === 'NETWORK'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                            : p.type === 'BLUETOOTH'
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400'
                            : 'bg-muted text-foreground'
                        }`}>
                          {p.type === 'NETWORK' && <Wifi className="h-3.5 w-3.5" />}
                          {p.type === 'BLUETOOTH' && <Bluetooth className="h-3.5 w-3.5" />}
                          {p.type === 'USB' && <Usb className="h-3.5 w-3.5" />}
                        </div>

                        <div>
                          <div className="font-semibold">{p.name}</div>
                          <div className="text-[10px] text-muted-foreground">
                            {p.type === 'NETWORK' && `Sans-fil Wi-Fi / Réseau`}
                            {p.type === 'BLUETOOTH' && `Sans-fil Bluetooth`}
                            {p.type === 'USB' && `Câble USB / Système`}
                          </div>
                        </div>
                      </div>

                      {isSelected ? (
                        <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white gap-1 text-[11px] py-0.5">
                          <Check className="h-3 w-3" /> Active
                        </Badge>
                      ) : (
                        <span className="text-[11px] text-muted-foreground hover:text-primary">Choisir</span>
                      )}
                    </button>
                  )
                })}
              </div>
            ) : scanDone && !scanning ? (
              <div className="p-3 bg-background rounded border text-xs text-muted-foreground text-center">
                Aucune imprimante sans-fil détectée automatiquement. Assurez-vous que l'imprimante est allumée et connectée au même Wi-Fi ou appairée en Bluetooth.
              </div>
            ) : null}
          </div>

          {/* Saisie manuelle de l'adresse Wi-Fi (si besoin) */}
          <div className="space-y-1.5 p-3 bg-muted/20 rounded-lg border">
            <Label className="text-xs font-medium">Saisie manuelle adresse Wi-Fi (si non détectée automatiquement)</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Ex: 192.168.1.150"
                value={ip}
                onChange={(e) => {
                  setIp(e.target.value)
                  if (e.target.value.trim()) setType('NETWORK')
                }}
                className="text-xs font-mono h-9"
              />
              {ip && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setType('NETWORK')
                  }}
                  className="h-9 text-xs shrink-0"
                >
                  Appliquer Wi-Fi
                </Button>
              )}
            </div>
          </div>

          {/* Options de format de papier et découpe */}
          <div className="space-y-3 pt-1">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Sliders className="h-3.5 w-3.5" /> Options du ticket
            </Label>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Format du rouleau</Label>
                <Select value={paperWidth} onValueChange={(v: '58mm' | '80mm') => setPaperWidth(v)}>
                  <SelectTrigger className="text-xs h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="58mm">58 mm (Standard)</SelectItem>
                    <SelectItem value="80mm">80 mm (Large)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="auto-cut" className="text-xs cursor-pointer flex items-center gap-1.5">
                    <Scissors className="h-3.5 w-3.5 text-muted-foreground" />
                    Coupe papier
                  </Label>
                  <Switch id="auto-cut" checked={autoCut} onCheckedChange={setAutoCut} />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="drawer" className="text-xs cursor-pointer flex items-center gap-1.5">
                    <Coins className="h-3.5 w-3.5 text-muted-foreground" />
                    Tiroir-caisse
                  </Label>
                  <Switch id="drawer" checked={openCashDrawer} onCheckedChange={setOpenCashDrawer} />
                </div>
              </div>
            </div>
          </div>

          {/* Statut du test d'impression */}
          {testStatus && (
            <div
              className={`flex items-start gap-2.5 p-3 rounded-lg text-xs border ${
                testStatus.success
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                  : 'bg-destructive/10 border-destructive/20 text-destructive'
              }`}
            >
              {testStatus.success ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              )}
              <div className="flex-1">{testStatus.message}</div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={handleTest}
            disabled={testing}
            className="border-primary/30 text-primary hover:bg-primary/5"
          >
            {testing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Impression test...
              </>
            ) : (
              <>
                <Printer className="mr-2 h-4 w-4" />
                Imprimer un test
              </>
            )}
          </Button>

          <Button type="button" onClick={handleSave}>
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
