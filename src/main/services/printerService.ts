import { webContents } from 'electron'
import { PosPrinter } from 'electron-pos-printer'
import net from 'net'
import os from 'os'
import type { ReceiptData, PrinterConfig, NearbyPrinter } from '../../shared/types'

// Nettoyage des accents pour les imprimantes thermiques ESC/POS brutes
function sanitizeForThermal(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E\n\r]/g, ' ')
}

function padLine(left: string, right: string, width: number): string {
  const spaceCount = Math.max(1, width - left.length - right.length)
  return left + ' '.repeat(spaceCount) + right
}

function buildReceiptLines(data: ReceiptData, config?: PrinterConfig) {
  const is80mm = config?.paperWidth === '80mm'
  const widthChars = is80mm ? 48 : 32
  const separator = '─'.repeat(widthChars)

  const lines: { type: string; value: string; style?: Record<string, string> }[] = []

  lines.push({ type: 'text', value: 'Gestion Stock & Caisse', style: { fontWeight: '700', textAlign: 'center', fontSize: '18px' } })
  lines.push({ type: 'text', value: 'Ticket de caisse', style: { textAlign: 'center', fontSize: '14px' } })
  lines.push({ type: 'text', value: '', style: { fontSize: '8px' } })
  lines.push({ type: 'text', value: separator, style: { textAlign: 'center' } })
  lines.push({ type: 'text', value: `N° ${data.invoiceNumber}  |  ${data.date}`, style: { textAlign: 'center', fontSize: '11px' } })
  lines.push({ type: 'text', value: separator, style: { textAlign: 'center' } })
  lines.push({ type: 'text', value: is80mm ? 'Qté    Désignation                   Prix        Total' : 'Qté  Prix    Total', style: { fontWeight: '700', fontSize: '11px' } })

  for (const item of data.items) {
    const total = (item.product.price * item.quantity).toFixed(2)
    const price = item.product.price.toFixed(2)
    const maxNameLen = is80mm ? 30 : 18
    const name = item.product.name.length > maxNameLen ? item.product.name.substring(0, maxNameLen - 2) + '..' : item.product.name
    const qty = item.quantity.toString().padStart(3)
    const p = price.padStart(7)
    lines.push({ type: 'text', value: name, style: { fontSize: '11px' } })
    lines.push({ type: 'text', value: `${qty}  ${p}  ${total.padStart(6)}`, style: { fontSize: '11px' } })
  }

  lines.push({ type: 'text', value: separator, style: { textAlign: 'center' } })
  lines.push({ type: 'text', value: `TOTAL  ${data.totalAmount.toFixed(2)} FCFA`, style: { fontWeight: '700', textAlign: 'center', fontSize: '16px' } })

  if (data.status === 'EN_ATTENTE') {
    const avance = data.montantAvance ?? data.totalAmount
    lines.push({ type: 'text', value: '', style: { fontSize: '6px' } })
    lines.push({ type: 'text', value: 'AVANCE CLIENT', style: { fontWeight: '700', textAlign: 'center', fontSize: '12px' } })
    lines.push({ type: 'text', value: `Versé : ${avance.toFixed(2)} FCFA`, style: { textAlign: 'center', fontSize: '11px' } })
    if (data.remainingBalance != null && data.remainingBalance > 0) {
      lines.push({ type: 'text', value: `Reste : ${data.remainingBalance.toFixed(2)} FCFA`, style: { textAlign: 'center', fontSize: '11px' } })
    }
  }

  if (data.status === 'VALIDE' && data.remainingBalance != null && data.remainingBalance > 0) {
    lines.push({ type: 'text', value: '', style: { fontSize: '6px' } })
    lines.push({ type: 'text', value: `Solde restant : ${data.remainingBalance.toFixed(2)} FCFA`, style: { textAlign: 'center', fontSize: '11px' } })
  }

  lines.push({ type: 'text', value: '', style: { fontSize: '8px' } })
  lines.push({ type: 'text', value: 'Merci de votre visite !', style: { textAlign: 'center', fontSize: '12px' } })
  lines.push({ type: 'text', value: '\n\n', style: {} })

  return lines
}

// Générateur de Buffer ESC/POS natif (pour impression Réseau Wi-Fi / LAN TCP 9100)
function buildEscPosBuffer(data: ReceiptData, config?: PrinterConfig): Buffer {
  const is80mm = config?.paperWidth === '80mm'
  const width = is80mm ? 48 : 32
  const sep = '-'.repeat(width)

  const chunks: Buffer[] = []

  // Commandes ESC/POS de base
  const ESC_INIT = Buffer.from([0x1b, 0x40]) // ESC @ (Initialiser)
  const ESC_ALIGN_CENTER = Buffer.from([0x1b, 0x61, 0x01]) // Centré
  const ESC_ALIGN_LEFT = Buffer.from([0x1b, 0x61, 0x00]) // Gauche
  const ESC_BOLD_ON = Buffer.from([0x1b, 0x45, 0x01]) // Gras activé
  const ESC_BOLD_OFF = Buffer.from([0x1b, 0x45, 0x00]) // Gras désactivé
  const ESC_DOUBLE_SIZE = Buffer.from([0x1b, 0x21, 0x30]) // Double hauteur + largeur
  const ESC_NORMAL_SIZE = Buffer.from([0x1b, 0x21, 0x00]) // Taille normale
  const ESC_DRAWER_KICK = Buffer.from([0x1b, 0x70, 0x00, 0x19, 0xfa]) // Ouverture tiroir
  const ESC_CUT_PAPER = Buffer.from([0x1d, 0x56, 0x41, 0x00]) // Coupure papier

  chunks.push(ESC_INIT)

  // Ouvrir le tiroir caisse si configuré
  if (config?.openCashDrawer) {
    chunks.push(ESC_DRAWER_KICK)
  }

  // En-tête
  chunks.push(ESC_ALIGN_CENTER)
  chunks.push(ESC_BOLD_ON)
  chunks.push(Buffer.from(sanitizeForThermal('IVENTELLO - GESTION CAISSE\n')))
  chunks.push(ESC_BOLD_OFF)
  chunks.push(Buffer.from(sanitizeForThermal('TICKET DE CAISSE\n')))
  chunks.push(Buffer.from(sep + '\n'))
  chunks.push(Buffer.from(sanitizeForThermal(`N. ${data.invoiceNumber} | ${data.date}\n`)))
  chunks.push(Buffer.from(sep + '\n'))

  // En-tête du tableau d'articles
  chunks.push(ESC_ALIGN_LEFT)
  chunks.push(ESC_BOLD_ON)
  chunks.push(Buffer.from(padLine('Qte  Designation', 'Total', width) + '\n'))
  chunks.push(ESC_BOLD_OFF)
  chunks.push(Buffer.from(sep + '\n'))

  // Articles
  for (const item of data.items) {
    const totalStr = (item.product.price * item.quantity).toFixed(0) + ' F'
    const nameStr = sanitizeForThermal(item.product.name)
    const qtyStr = `${item.quantity}x `

    // Ligne 1 : Nom du produit
    chunks.push(Buffer.from(nameStr + '\n'))
    // Ligne 2 : Quantité x Prix unitaire + Total
    const subLine = `  ${qtyStr} ${item.product.price.toFixed(0)} F`
    chunks.push(Buffer.from(padLine(subLine, totalStr, width) + '\n'))
  }

  // Pied de ticket et Total
  chunks.push(Buffer.from(sep + '\n'))
  chunks.push(ESC_ALIGN_CENTER)
  chunks.push(ESC_BOLD_ON)
  chunks.push(ESC_DOUBLE_SIZE)
  chunks.push(Buffer.from(`TOTAL: ${data.totalAmount.toFixed(0)} FCFA\n`))
  chunks.push(ESC_NORMAL_SIZE)
  chunks.push(ESC_BOLD_OFF)

  if (data.status === 'EN_ATTENTE') {
    const avance = data.montantAvance ?? data.totalAmount
    chunks.push(Buffer.from(sanitizeForThermal(`Avance : ${avance.toFixed(0)} FCFA\n`)))
    if (data.remainingBalance != null && data.remainingBalance > 0) {
      chunks.push(Buffer.from(sanitizeForThermal(`Reste a payer : ${data.remainingBalance.toFixed(0)} FCFA\n`)))
    }
  }

  chunks.push(Buffer.from(sep + '\n'))
  chunks.push(Buffer.from(sanitizeForThermal('Merci de votre visite !\n\n\n\n')))

  // Découpe papier si activée
  if (config?.autoCut !== false) {
    chunks.push(ESC_CUT_PAPER)
  }

  return Buffer.concat(chunks)
}

// Générateur de ticket de test ESC/POS
function buildTestEscPosBuffer(config?: PrinterConfig): Buffer {
  const is80mm = config?.paperWidth === '80mm'
  const width = is80mm ? 48 : 32
  const sep = '='.repeat(width)

  const chunks: Buffer[] = []
  chunks.push(Buffer.from([0x1b, 0x40])) // Init
  if (config?.openCashDrawer) {
    chunks.push(Buffer.from([0x1b, 0x70, 0x00, 0x19, 0xfa])) // Drawer
  }

  chunks.push(Buffer.from([0x1b, 0x61, 0x01])) // Center
  chunks.push(Buffer.from([0x1b, 0x45, 0x01])) // Bold ON
  chunks.push(Buffer.from(sanitizeForThermal('IVENTELLO IMPRESSION\n')))
  chunks.push(Buffer.from([0x1b, 0x45, 0x00])) // Bold OFF
  chunks.push(Buffer.from(sanitizeForThermal('TEST DE CONNEXION REUSSI !\n')))
  chunks.push(Buffer.from(sep + '\n'))
  chunks.push(Buffer.from(sanitizeForThermal(`Mode : SANS-FIL (Wi-Fi/LAN TCP)\n`)))
  chunks.push(Buffer.from(sanitizeForThermal(`IP : ${config?.ip || 'N/A'}:${config?.port || 9100}\n`)))
  chunks.push(Buffer.from(sanitizeForThermal(`Format papier : ${config?.paperWidth || '58mm'}\n`)))
  chunks.push(Buffer.from(sanitizeForThermal(`Date : ${new Date().toLocaleString('fr-FR')}\n`)))
  chunks.push(Buffer.from(sep + '\n'))
  chunks.push(Buffer.from(sanitizeForThermal('Imprimante prete pour la caisse !\n\n\n\n')))

  if (config?.autoCut !== false) {
    chunks.push(Buffer.from([0x1d, 0x56, 0x41, 0x00])) // Cut
  }

  return Buffer.concat(chunks)
}

function sendEscPosToNetwork(ip: string, port: number, buffer: Buffer): Promise<void> {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket()
    socket.setTimeout(4000)

    socket.connect(port, ip, () => {
      socket.write(buffer, () => {
        socket.end()
        resolve()
      })
    })

    socket.on('error', (err) => {
      socket.destroy()
      reject(new Error(`Impossible de joindre l'imprimante réseau (${ip}:${port}) : ${err.message}`))
    })

    socket.on('timeout', () => {
      socket.destroy()
      reject(new Error(`Délai d'attente dépassé lors de la connexion à l'imprimante (${ip}:${port})`))
    })
  })
}

function getLocalSubnets(): string[] {
  const subnets: string[] = []
  const ifaces = os.networkInterfaces()
  for (const name of Object.keys(ifaces)) {
    const list = ifaces[name]
    if (!list) continue
    for (const info of list) {
      if (info.family === 'IPv4' && !info.internal) {
        const parts = info.address.split('.')
        if (parts.length === 4) {
          const subnetPrefix = `${parts[0]}.${parts[1]}.${parts[2]}.`
          if (!subnets.includes(subnetPrefix)) {
            subnets.push(subnetPrefix)
          }
        }
      }
    }
  }
  return subnets.length > 0 ? subnets : ['192.168.1.', '192.168.0.']
}

function probeHost(ip: string, port = 9100, timeoutMs = 450): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket()
    socket.setTimeout(timeoutMs)

    socket.connect(port, ip, () => {
      socket.destroy()
      resolve(true)
    })

    socket.on('error', () => {
      socket.destroy()
      resolve(false)
    })

    socket.on('timeout', () => {
      socket.destroy()
      resolve(false)
    })
  })
}

async function scanSubnetForPrinters(subnetPrefix: string, port = 9100): Promise<{ ip: string; port: number; name: string }[]> {
  const found: { ip: string; port: number; name: string }[] = []
  const batchSize = 35

  const hosts: string[] = []
  for (let i = 1; i <= 254; i++) {
    hosts.push(`${subnetPrefix}${i}`)
  }

  for (let i = 0; i < hosts.length; i += batchSize) {
    const batch = hosts.slice(i, i + batchSize)
    const results = await Promise.all(
      batch.map(async (ip) => {
        const ok = await probeHost(ip, port, 450)
        return ok ? ip : null
      })
    )
    for (const ip of results) {
      if (ip) {
        found.push({
          ip,
          port,
          name: `Imprimante réseau (${ip})`
        })
      }
    }
  }

  return found
}

export function createPrinterService() {
  return {
    async listPrinters(): Promise<string[]> {
      try {
        const wc = webContents.getAllWebContents()
        if (wc.length > 0) {
          const printers = await wc[0].getPrintersAsync()
          const names = printers.map((p) => p.name).filter(Boolean)
          if (names.length > 0) return names
        }
      } catch (err) {
        console.warn('getPrintersAsync a échoué:', err)
      }

      // Fallback Windows via PowerShell si Electron getPrintersAsync est vide
      if (process.platform === 'win32') {
        try {
          const { execSync } = require('child_process')
          const stdout = execSync(
            'powershell.exe -NoProfile -NonInteractive -Command "Get-CimInstance Win32_Printer | Select-Object -ExpandProperty Name"',
            { encoding: 'utf8', timeout: 3000, windowsHide: true }
          )
          const lines = stdout
            .split(/\r?\n/)
            .map((s: string) => s.trim())
            .filter(Boolean)
          if (lines.length > 0) return lines
        } catch {
          // ignore
        }
      }

      return []
    },

    async scanNetworkPrinters(): Promise<{ ip: string; port: number; name: string }[]> {
      try {
        const subnets = getLocalSubnets()
        const allFound: { ip: string; port: number; name: string }[] = []
        for (const subnet of subnets) {
          const res = await scanSubnetForPrinters(subnet, 9100)
          allFound.push(...res)
        }
        return allFound
      } catch (err) {
        console.error('Erreur scan réseau imprimante:', err)
        return []
      }
    },

    async scanNearbyPrinters(): Promise<NearbyPrinter[]> {
      const results: NearbyPrinter[] = []

      // 1. Scan des imprimantes USB & Système locales (Instantané)
      try {
        const localPrinters = await this.listPrinters()
        for (const name of localPrinters) {
          const lower = name.toLowerCase()
          const isBluetooth =
            lower.includes('bluetooth') ||
            lower.includes('bt') ||
            lower.includes('mpt') ||
            lower.includes('pos-58') ||
            lower.includes('pos-80') ||
            lower.includes('com')

          results.push({
            id: `sys-${name}`,
            name,
            type: isBluetooth ? 'BLUETOOTH' : 'USB',
            printerName: name
          })
        }
      } catch (err) {
        console.error('Erreur scan local:', err)
      }

      // 2. Scan réseau Wi-Fi / LAN en parallèle
      try {
        const subnets = getLocalSubnets()
        const netResults = await Promise.all(
          subnets.map((sub) => scanSubnetForPrinters(sub, 9100))
        )
        for (const networkPrinters of netResults) {
          for (const np of networkPrinters) {
            results.push({
              id: `net-${np.ip}`,
              name: `Imprimante Wi-Fi (${np.ip})`,
              type: 'NETWORK',
              ip: np.ip
            })
          }
        }
      } catch (err) {
        console.error('Erreur scan Wi-Fi:', err)
      }

      return results
    },

    async printReceipt(data: ReceiptData, config?: PrinterConfig): Promise<void> {
      // 1. Mode Sans-fil / Wi-Fi / Ethernet LAN (TCP Port 9100)
      if (config?.type === 'NETWORK') {
        const ip = config.ip?.trim()
        if (!ip) {
          throw new Error("Veuillez renseigner l'adresse IP de l'imprimante réseau dans les paramètres.")
        }
        const port = config.port || 9100
        const buffer = buildEscPosBuffer(data, config)
        await sendEscPosToNetwork(ip, port, buffer)
        return
      }

      // 2. Mode USB / Spooler Système Windows
      const lines = buildReceiptLines(data, config)
      const options: Record<string, unknown> = {
        preview: false,
        width: config?.paperWidth || '58mm',
        copies: 1,
        silent: true
      }
      if (config?.printerName) options.printerName = config.printerName

      try {
        await PosPrinter.print(lines as any, options)
      } catch (err: any) {
        if (err?.message?.includes('enumerate') || err?.message?.includes('printer')) {
          throw new Error('Aucune imprimante connectée')
        }
        throw err
      }
    },

    async printTestReceipt(config?: PrinterConfig): Promise<void> {
      if (config?.type === 'NETWORK') {
        const ip = config.ip?.trim()
        if (!ip) {
          throw new Error("Veuillez renseigner l'adresse IP de l'imprimante réseau.")
        }
        const port = config.port || 9100
        const buffer = buildTestEscPosBuffer(config)
        await sendEscPosToNetwork(ip, port, buffer)
        return
      }

      // Test USB
      const testLines = [
        { type: 'text', value: 'IVENTELLO TEST', style: { fontWeight: '700', textAlign: 'center', fontSize: '16px' } },
        { type: 'text', value: 'Test de connexion USB réussi !', style: { textAlign: 'center', fontSize: '12px' } },
        { type: 'text', value: `Date : ${new Date().toLocaleString('fr-FR')}`, style: { textAlign: 'center', fontSize: '10px' } },
        { type: 'text', value: '\n\n', style: {} }
      ]

      const options: Record<string, unknown> = {
        preview: false,
        width: config?.paperWidth || '58mm',
        copies: 1,
        silent: true
      }
      if (config?.printerName) options.printerName = config.printerName

      await PosPrinter.print(testLines as any, options)
    }
  }
}
