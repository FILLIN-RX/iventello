import { app, dialog } from 'electron'
import { join } from 'node:path'
import { existsSync, mkdirSync, writeFileSync, unlinkSync, readdirSync, statSync } from 'node:fs'
import { readFile, copyFile, mkdir } from 'node:fs/promises'
import { PrismaClient } from '@prisma/client'
import AdmZip from 'adm-zip'
import { appLog } from '../logger'

export interface DataExportResult {
  outputPath: string
  sizeBytes: number
  filesCount: number
}

export interface DataImportResult {
  products: number
  sales: number
  clients: number
  suppliers: number
  warehouses: number
  categories: number
  expenses: number
  books: number
  imagesExtracted: number
  dbRestored: boolean
  warnings: string[]
}

const IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'svg'])
const IMAGE_DIRS = ['uploads', 'logos', 'images', 'product-images', 'book-images', 'warehouse-logos']

function formatDateTime(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

export function createDataTransferService(prisma: PrismaClient) {
  const userDataDir = app.getPath('userData')
  const dbPath = join(userDataDir, 'database.db')
  const tmpJsonPath = join(userDataDir, 'export_tmp.json')

  return {
    /**
     * Exporte toutes les données vers un fichier .iventello (ZIP)
     * Implémenté en Node.js avec AdmZip (pas besoin du module Rust natif)
     */
    async exportAll(): Promise<DataExportResult> {
      appLog('INFO', 'export', 'Début export complet...')

      // 1. Extraire toutes les données via Prisma
      appLog('INFO', 'export', 'Extraction des données DB...')

      const [
        products,
        categories,
        suppliers,
        warehouses,
        clients,
        sales,
        expenses,
        stocks,
        cashTransactions,
        users,
        appSettings,
        purchaseOrders,
        stockMovements,
      ] = await Promise.all([
        prisma.product.findMany({ include: { supplier: true, category: true, stocks: { include: { warehouse: true } } } }),
        prisma.category.findMany(),
        prisma.supplier.findMany(),
        prisma.warehouse.findMany(),
        prisma.client.findMany(),
        prisma.sale.findMany({ include: { items: true } }),
        prisma.expense.findMany(),
        prisma.stock.findMany(),
        prisma.cashTransaction.findMany({ include: { lines: true } }),
        prisma.user.findMany({ select: { id: true, email: true, nom: true, prenom: true, role: true, active: true, createdAt: true } }),
        prisma.appSettings.findFirst(),
        prisma.purchaseOrder.findMany({ include: { items: true } }),
        (prisma as any).stockMovement?.findMany?.({ take: 5000, orderBy: { createdAt: 'desc' } }).catch(() => []) ?? Promise.resolve([]),
      ])

      // Books / Librairie (optionnel — certaines installations n'ont pas ces tables)
      const [books, bookSales, bookStocks, classLevels, subjects] = await Promise.all([
        (prisma as any).book?.findMany?.({}).catch(() => []) ?? Promise.resolve([]),
        (prisma as any).bookSale?.findMany?.({ include: { items: true } }).catch(() => []) ?? Promise.resolve([]),
        (prisma as any).bookStock?.findMany?.().catch(() => []) ?? Promise.resolve([]),
        (prisma as any).classLevel?.findMany?.().catch(() => []) ?? Promise.resolve([]),
        (prisma as any).subject?.findMany?.().catch(() => []) ?? Promise.resolve([]),
      ])

      // 2. Écrire le fichier data.json temporaire
      const exportData = {
        _meta: {
          version: '1.0',
          exportedAt: new Date().toISOString(),
          app: 'iventello',
          totalProducts: products.length,
          totalSales: sales.length,
          totalClients: clients.length,
        },
        appSettings,
        warehouses,
        categories,
        suppliers,
        clients,
        products,
        stocks,
        sales,
        expenses,
        cashTransactions,
        users,
        books,
        bookSales,
        bookStocks,
        classLevels,
        subjects,
        purchaseOrders,
        stockMovements,
      }

      const jsonStr = JSON.stringify(exportData, null, 2)
      writeFileSync(tmpJsonPath, jsonStr, 'utf-8')
      appLog('INFO', 'export', `JSON exporté : ${Math.round(jsonStr.length / 1024)} Ko`)

      // 3. Chemin de sortie
      const outputPath = join(app.getPath('desktop'), `Iventello-Backup-${formatDateTime()}.iventello`)

      // 4. Créer l'archive ZIP avec AdmZip
      appLog('INFO', 'export', 'Création archive ZIP...')
      let filesCount = 0

      const zip = new AdmZip()

      // data.json
      zip.addLocalFile(tmpJsonPath, '', 'data.json')
      filesCount++

      // database.db
      if (existsSync(dbPath)) {
        zip.addLocalFile(dbPath, '', 'database.db')
        filesCount++
      }

      // Images
      for (const dirName of IMAGE_DIRS) {
        const imgDir = join(userDataDir, dirName)
        if (!existsSync(imgDir)) continue
        try {
          const walkDir = (dir: string, prefix: string) => {
            const entries = readdirSync(dir, { withFileTypes: true })
            for (const entry of entries) {
              const fullPath = join(dir, entry.name)
              if (entry.isDirectory()) {
                walkDir(fullPath, `${prefix}${entry.name}/`)
              } else if (entry.isFile()) {
                const ext = entry.name.split('.').pop()?.toLowerCase() ?? ''
                if (IMAGE_EXTENSIONS.has(ext)) {
                  zip.addLocalFile(fullPath, `assets/${prefix}`)
                  filesCount++
                }
              }
            }
          }
          walkDir(imgDir, `${dirName}/`)
        } catch { /* ignore les erreurs de lecture */ }
      }

      // manifest.json
      const manifest = JSON.stringify({
        version: '1.0',
        app: 'iventello',
        createdAt: new Date().toISOString(),
        filesCount: filesCount + 1,
      })
      zip.addFile('manifest.json', Buffer.from(manifest, 'utf-8'))
      filesCount++

      await zip.writeZipPromise(outputPath)

      // 5. Nettoyer JSON temporaire
      try { unlinkSync(tmpJsonPath) } catch { /* ignore */ }

      const sizeBytes = statSync(outputPath).size
      appLog('INFO', 'export', `Archive créée : ${outputPath} (${Math.round(sizeBytes / 1024)} Ko, ${filesCount} fichiers)`)

      return { outputPath, sizeBytes, filesCount }
    },

    /**
     * Importe un fichier .iventello
     * Extraction du ZIP, insertion Prisma avec upsert
     */
    async importFromFile(archivePath: string, restoreDbDirect: boolean): Promise<DataImportResult> {
      appLog('INFO', 'import', `Import depuis : ${archivePath}`)

      const zip = new AdmZip(archivePath)
      const entries = zip.getEntries()
      const warnings: string[] = []
      const counts = { products: 0, sales: 0, clients: 0, suppliers: 0, warehouses: 0, categories: 0, expenses: 0, books: 0 }
      let imagesExtracted = 0
      let dbRestored = false

      // Trouver data.json
      const dataEntry = entries.find((e: any) => e.entryName === 'data.json')
      if (!dataEntry) throw new Error('Archive invalide : data.json introuvable')

      const data = JSON.parse(dataEntry.getData().toString('utf-8'))

      // Extraire les images
      for (const entry of entries) {
        if (!entry.entryName.startsWith('assets/') || entry.isDirectory) continue
        const rel = entry.entryName.replace(/^assets\//, '')
        const destPath = join(userDataDir, rel)
        const destDir = join(destPath, '..')
        try {
          if (!existsSync(destDir)) mkdirSync(destDir, { recursive: true })
          zip.extractEntryTo(entry, destDir, false, true)
          imagesExtracted++
        } catch { /* ignore */ }
      }

      // Restaurer la DB si demandé
      if (restoreDbDirect) {
        const dbEntry = entries.find((e: any) => e.entryName === 'database.db')
        if (dbEntry) {
          const importDbPath = join(userDataDir, 'database_import.db')
          zip.extractEntryTo(dbEntry, userDataDir, false, true)
          dbRestored = true
          appLog('INFO', 'import', `DB extraite vers : ${importDbPath}`)
        }
      }

      // Insérer les données avec upsert
      appLog('INFO', 'import', 'Insertion données en base...')

      // Entrepôts
      for (const wh of data.warehouses ?? []) {
        try {
          await prisma.warehouse.upsert({
            where: { id: wh.id },
            update: {},
            create: { id: wh.id, name: wh.name, location: wh.location ?? null }
          })
          counts.warehouses++
        } catch (e) { warnings.push(`Entrepôt "${wh.name}" : ${e}`) }
      }

      // Catégories
      for (const cat of data.categories ?? []) {
        try {
          await prisma.category.upsert({
            where: { id: cat.id },
            update: {},
            create: { id: cat.id, name: cat.name, description: cat.description ?? null, warehouseId: cat.warehouseId ?? null }
          })
          counts.categories++
        } catch (e) { warnings.push(`Catégorie "${cat.name}" : ${e}`) }
      }

      // Fournisseurs
      for (const sup of data.suppliers ?? []) {
        try {
          await prisma.supplier.upsert({
            where: { id: sup.id },
            update: {},
            create: { id: sup.id, name: sup.name, email: sup.email ?? null, phone: sup.phone ?? null, address: sup.address ?? null, warehouseId: sup.warehouseId ?? null }
          })
          counts.suppliers++
        } catch (e) { warnings.push(`Fournisseur "${sup.name}" : ${e}`) }
      }

      // Clients
      for (const cl of data.clients ?? []) {
        try {
          await prisma.client.upsert({
            where: { id: cl.id },
            update: {},
            create: { id: cl.id, name: cl.name, email: cl.email ?? null, phone: cl.phone ?? null, address: cl.address ?? null, notes: cl.notes ?? null, warehouseId: cl.warehouseId ?? null }
          })
          counts.clients++
        } catch (e) { warnings.push(`Client "${cl.name}" : ${e}`) }
      }

      // Produits
      for (const p of data.products ?? []) {
        try {
          const existing = await prisma.product.findFirst({
            where: {
              OR: [
                { id: p.id },
                { barcode: p.barcode, warehouseId: p.warehouseId ?? null }
              ]
            }
          })
          if (!existing) {
            await prisma.product.create({
              data: {
                id: p.id,
                barcode: p.barcode,
                name: p.name,
                basePrice: p.basePrice ?? 0,
                sellingPrice: p.sellingPrice ?? 0,
                vatRate: p.vatRate ?? 0,
                imageUrl: p.imageUrl ?? null,
                isPacket: p.isPacket ?? false,
                itemsPerPacket: p.itemsPerPacket ?? 1,
                supplierId: p.supplierId ?? null,
                categoryId: p.categoryId ?? null,
                warehouseId: p.warehouseId ?? null,
              }
            })
            counts.products++
          }
        } catch (e) { warnings.push(`Produit "${p.name}" : ${e}`) }
      }

      // Dépenses
      for (const exp of data.expenses ?? []) {
        try {
          const existing = await prisma.expense.findUnique({ where: { id: exp.id } }).catch(() => null)
          if (!existing) {
            await prisma.expense.create({
              data: {
                id: exp.id,
                title: exp.title,
                amount: exp.amount,
                category: exp.category ?? 'GENERAL',
                date: exp.date ? new Date(exp.date) : new Date(),
                description: exp.description ?? null,
                warehouseId: exp.warehouseId ?? null
              }
            })
            counts.expenses++
          }
        } catch (e) { warnings.push(`Dépense "${exp.title}" : ${e}`) }
      }

      // Ventes
      for (const sale of data.sales ?? []) {
        try {
          const existing = await prisma.sale.findUnique({ where: { id: sale.id } }).catch(() => null)
          if (!existing) {
            const saleItems = (sale.items ?? []).map((i: any) => ({
              id: i.id,
              productId: i.productId ?? null,
              bookId: i.bookId ?? null,
              quantity: i.quantity,
              unitPrice: i.unitPrice,
            }))
            await prisma.sale.create({
              data: {
                id: sale.id,
                warehouseId: sale.warehouseId,
                clientId: sale.clientId ?? null,
                invoiceNumber: sale.invoiceNumber ?? '',
                subTotal: sale.subTotal ?? 0,
                vatTotal: sale.vatTotal ?? 0,
                discount: sale.discount ?? 0,
                finalTotal: sale.finalTotal ?? 0,
                paymentMethod: sale.paymentMethod ?? 'ESPECES',
                status: sale.status ?? 'EN_ATTENTE',
                createdAt: sale.createdAt ? new Date(sale.createdAt) : new Date(),
                items: { create: saleItems }
              }
            })
            counts.sales++
          }
        } catch (e) { warnings.push(`Vente "${sale.invoiceNumber}" : ${e}`) }
      }

      // Livres (optionnel)
      for (const book of data.books ?? []) {
        try {
          const bookModel = (prisma as any).book
          if (!bookModel) break
          const existing = await bookModel.findUnique({ where: { id: book.id } }).catch(() => null)
          if (!existing) {
            await bookModel.create({
              data: {
                id: book.id,
                title: book.title,
                author: book.author ?? null,
                isbn: book.isbn ?? null,
                price: book.price ?? 0,
                classLevelId: book.classLevelId ?? null,
                subjectId: book.subjectId ?? null,
                isOfficialProgram: book.isOfficialProgram ?? true,
              }
            })
            counts.books++
          }
        } catch { /* ignore — table peut ne pas exister */ }
      }

      appLog('INFO', 'import', `Import terminé : ${JSON.stringify(counts)}, images: ${imagesExtracted}`)

      return {
        ...counts,
        imagesExtracted,
        dbRestored,
        warnings: warnings.slice(0, 25),
      }
    },

    /**
     * Statistiques du dossier userData (taille estimée de l'export)
     */
    getExportStats(): { totalSizeBytes: number; fileCount: number } {
      let totalSizeBytes = 0
      let fileCount = 0

      const walkDir = (dir: string) => {
        if (!existsSync(dir)) return
        try {
          const entries = readdirSync(dir, { withFileTypes: true })
          for (const entry of entries) {
            const fullPath = join(dir, entry.name)
            if (entry.isDirectory()) {
              walkDir(fullPath)
            } else if (entry.isFile()) {
              try {
                totalSizeBytes += statSync(fullPath).size
                fileCount++
              } catch { /* ignore */ }
            }
          }
        } catch { /* ignore */ }
      }

      // DB
      if (existsSync(dbPath)) {
        totalSizeBytes += statSync(dbPath).size
        fileCount++
      }

      // Images
      for (const dirName of IMAGE_DIRS) {
        walkDir(join(userDataDir, dirName))
      }

      return { totalSizeBytes, fileCount }
    }
  }
}
