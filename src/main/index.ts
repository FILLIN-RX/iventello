import { writeFileSync, appendFileSync } from 'node:fs'
import { join, basename } from 'node:path'
import { homedir } from 'node:os'
import { appLog, initLog } from './logger'

initLog()
function startupLog(msg: string): void { appLog('INFO', 'startup', msg) }

import Module from 'node:module'
import { dirname } from 'node:path'
import { existsSync } from 'node:fs'

const _origResolve = (Module as any)._resolveFilename
;(Module as any)._resolveFilename = function (request: string, parent: any, ...rest: any[]) {
  if (request === '.prisma/client/default') {
    try {
      return _origResolve.call(this, request, parent, ...rest)
    } catch {
      const candidates: string[] = []
      if (parent?.filename) {
        candidates.push(join(dirname(parent.filename), '.prisma', 'client', 'default.js'))
      }
      try {
        const appPath = require('electron').app.isPackaged
          ? join(require('electron').process.resourcesPath, 'app')
          : process.cwd()
        candidates.push(join(appPath, 'node_modules', '@prisma', 'client', '.prisma', 'client', 'default.js'))
        candidates.push(join(appPath, 'node_modules', '.prisma', 'client', 'default.js'))
      } catch { /* ignore */ }
      candidates.push(join(process.cwd(), 'node_modules', '@prisma', 'client', '.prisma', 'client', 'default.js'))
      candidates.push(join(process.cwd(), 'node_modules', '.prisma', 'client', 'default.js'))
      for (const candidate of candidates) {
        if (existsSync(candidate)) return candidate
      }
      throw new Error(`Cannot find module '.prisma/client/default'. Tried:\n${candidates.map(c => `  - ${c}`).join('\n')}`)
    }
  }
  return _origResolve.call(this, request, parent, ...rest)
}

import { app, BrowserWindow, ipcMain, dialog, protocol, net, shell, nativeImage } from 'electron'
import { extname, resolve } from 'node:path'
import { copyFileSync, mkdirSync, readFileSync } from 'node:fs'

let PrismaClient: any
try { PrismaClient = require('@prisma/client').PrismaClient } catch { PrismaClient = null }

function isUpdaterSilenceable(msg: string): boolean {
  return msg.includes('latest.yml') || msg.includes('404') || msg.includes('Cannot find')
}

process.on('uncaughtException', (error) => {
  const msg = `${error.message}\n${error.stack}`
  if (isUpdaterSilenceable(msg)) {
    appLog('WARN', 'main', `uncaughtException silencié (updater) : ${error.message}`)
    return
  }
  appLog('FATAL', 'main', `uncaughtException: ${msg}`)
  dialog.showErrorBox('Erreur fatale', msg)
  app.quit()
})

process.on('unhandledRejection', (reason) => {
  const msg = reason instanceof Error ? `${reason.message}\n${reason.stack}` : String(reason)
  if (isUpdaterSilenceable(msg)) {
    appLog('WARN', 'main', `unhandledRejection silencié (updater) : ${msg}`)
    return
  }
  appLog('FATAL', 'main', `unhandledRejection: ${msg}`)
  dialog.showErrorBox('Erreur fatale', `Erreur non gérée : ${msg}`)
  app.quit()
})
import { createProductService } from './services/productService'
import { createWarehouseService } from './services/warehouseService'
import { createPrinterService } from './services/printerService'
import { createReportService } from './services/reportService'
import { createClientService } from './services/clientService'
import { createSupplierService } from './services/supplierService'
import { createStockAnalysisService } from './services/stockAnalysisService'
import { createPurchaseOrderService } from './services/purchaseOrderService'
import { createStatsService } from './services/statsService'
import { createCategoryService } from './services/categoryService'
import { createExpenseService } from './services/expenseService'
import { createCashRegisterService } from './services/cashRegisterService'
import { createMobileMoneyService } from './services/mobileMoneyService'
import { createCanalPlusService } from './services/canalPlusService'
import { createCanalPlusSaleService } from './services/canalPlusSaleService'
import { createAppSettingsService } from './services/appSettingsService'
import { createDiscountService } from './services/discountService'
import { createMonthlyReportService } from './services/monthlyReportService'
import { exportRapportExcel, exportMobileMoneyExcel, exportCanalPlusExcel, exportProductsExcel } from './services/excelExportService'
import { createExcelImportService } from './services/excelImportService'
import { initAutoUpdater } from './services/autoUpdaterService'
import { createGlobalStatsService } from './services/globalStatsService'
import { createLibrairieService } from './services/librairieService'
import { createLibrairieSaleService } from './services/librairieSaleService'
import { createCurriculumSeedService } from './services/curriculumSeedService'
import { createServiceSaleService } from './services/serviceSaleService'
import { createAuthService } from './services/authService'
import { sessionService } from './services/sessionService'
import { createStockMovementService } from './services/stockMovementService'
import { createCashSessionService } from './services/cashSessionService'
import { backupService } from './services/backupService'
import { createDataTransferService } from './services/dataTransferService'
import { createSaleService } from './services/saleService'
import { createInvoiceScannerService } from './services/invoiceScannerService'
import { createScannedDocumentService } from './services/scannedDocumentService'

let prisma: any = null
let mainWindow: BrowserWindow | null = null
let splashWindow: BrowserWindow | null = null

async function initDatabase(): Promise<void> {
  startupLog('initDatabase() démarré')
  const userDataPath = app.getPath('userData')
  if (!existsSync(userDataPath)) {
    mkdirSync(userDataPath, { recursive: true })
  }
  const dbPath = join(userDataPath, 'database.db')
  startupLog(`DB path: ${dbPath}`)
  
  // En production, on doit indiquer à Prisma où se trouve l'engine
  // car il ne peut pas être exécuté depuis l'archive ASAR.
  if (app.isPackaged) {
    const platform = process.platform
    let engineName = ''
    if (platform === 'win32') engineName = 'query_engine-windows.dll.node'
    else if (platform === 'darwin') {
      engineName = process.arch === 'arm64'
        ? 'query_engine-darwin-arm64.dylib.node'
        : 'query_engine-darwin.dylib.node'
    } else {
      // Linux — essayer de détecter OpenSSL
      engineName = 'query_engine-linux-openssl-3.0.x.so.node'
    }

    // Chemin via extraResources (copié dans resources/prisma-engine/)
    const enginePath = join(process.resourcesPath, 'prisma-engine', engineName)
    process.env.PRISMA_QUERY_ENGINE_LIBRARY = enginePath
  }

  process.env.DATABASE_URL = `file:${dbPath}`

  prisma = new PrismaClient({
    log: ['warn', 'error'],
  })
  appLog('INFO', 'db', 'Prisma Client initialisé')

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Warehouse" (
      "id" TEXT PRIMARY KEY, "name" TEXT NOT NULL, "location" TEXT, "logoUrl" TEXT, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`)
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "User" (
      "id" TEXT PRIMARY KEY, 
      "email" TEXT NOT NULL UNIQUE, 
      "passwordHash" TEXT NOT NULL, 
      "nom" TEXT NOT NULL, 
      "prenom" TEXT NOT NULL, 
      "role" TEXT NOT NULL DEFAULT 'EMPLOYE', 
      "avatarUrl" TEXT, 
      "externalId" TEXT UNIQUE, 
      "cloudSyncedAt" DATETIME, 
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`)
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "UserWarehouse" (
      "id" TEXT PRIMARY KEY,
      "userId" TEXT NOT NULL,
      "warehouseId" TEXT NOT NULL,
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE,
      FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE CASCADE,
      UNIQUE ("userId", "warehouseId")
    )`)
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Supplier" (
      "id" TEXT PRIMARY KEY, "warehouseId" TEXT, "name" TEXT NOT NULL, "email" TEXT, "phone" TEXT, "address" TEXT, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE CASCADE
    )`)
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Client" (
      "id" TEXT PRIMARY KEY, "warehouseId" TEXT, "name" TEXT NOT NULL, "email" TEXT, "phone" TEXT, "address" TEXT, "notes" TEXT, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE CASCADE
    )`)
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Category" (
      "id" TEXT PRIMARY KEY, "warehouseId" TEXT, "name" TEXT NOT NULL, "description" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE CASCADE
    )`)
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Product" (
      "id" TEXT PRIMARY KEY, "warehouseId" TEXT, "barcode" TEXT NOT NULL, "name" TEXT NOT NULL,
      "basePrice" REAL NOT NULL DEFAULT 0, "sellingPrice" REAL NOT NULL DEFAULT 0, "vatRate" REAL NOT NULL DEFAULT 19.25,
      "imageUrl" TEXT,
      "field1_label" TEXT DEFAULT 'Marque', "field1_value" TEXT,
      "field2_label" TEXT DEFAULT 'Modèle', "field2_value" TEXT,
      "field3_label" TEXT DEFAULT 'Couleur', "field3_value" TEXT,
      "field4_label" TEXT DEFAULT 'Taille/Dimension', "field4_value" TEXT,
      "field5_label" TEXT DEFAULT 'Poids', "field5_value" TEXT,
      "field6_label" TEXT DEFAULT 'Date d''expiration', "field6_value" TEXT,
      "field7_label" TEXT DEFAULT 'Garantie (mois)', "field7_value" TEXT,
      "field8_label" TEXT DEFAULT 'Numéro de lot', "field8_value" TEXT,
      "field9_label" TEXT DEFAULT 'Conditionnement', "field9_value" TEXT,
      "field10_label" TEXT DEFAULT 'Note interne', "field10_value" TEXT,
      "supplierId" TEXT, "categoryId" TEXT, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE CASCADE,
      FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id"),
      FOREIGN KEY ("categoryId") REFERENCES "Category"("id")
    )`)
  // Migration conditionnelle : ajouter categoryId si la colonne n'existe pas encore
  try {
    const cols = await (prisma as any).$queryRawUnsafe(`PRAGMA table_info("Product")`) as { name: string }[]
    if (!cols.some((c: any) => c.name === 'categoryId')) {
      await prisma.$executeRawUnsafe(`ALTER TABLE "Product" ADD COLUMN "categoryId" TEXT REFERENCES "Category"("id")`)
    }
    if (!cols.some((c: any) => c.name === 'warehouseId')) {
      await prisma.$executeRawUnsafe(`ALTER TABLE "Product" ADD COLUMN "warehouseId" TEXT REFERENCES "Warehouse"("id")`)
    }
    // Renommer field1_value_ext → field9_value si l'ancien nom existe
    if (cols.some((c: any) => c.name === 'field1_value_ext') && !cols.some((c: any) => c.name === 'field9_value')) {
      await prisma.$executeRawUnsafe(`ALTER TABLE "Product" RENAME COLUMN "field1_value_ext" TO "field9_value"`)
    }
    if (cols.some((c: any) => c.name === 'field2_value_ext') && !cols.some((c: any) => c.name === 'field10_value')) {
      await prisma.$executeRawUnsafe(`ALTER TABLE "Product" RENAME COLUMN "field2_value_ext" TO "field10_value"`)
    }
  } catch { /* table peut ne pas exister encore — ignorer */ }

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Stock" (
      "id" TEXT PRIMARY KEY, "productId" TEXT NOT NULL, "warehouseId" TEXT NOT NULL,
      "quantity" INTEGER NOT NULL DEFAULT 0, "quantityMagasin" INTEGER NOT NULL DEFAULT 0,
      "alertLimit" INTEGER NOT NULL DEFAULT 5, "shelfLocation" TEXT,
      FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE,
      FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE CASCADE,
      UNIQUE ("productId", "warehouseId")
    )`)
  // Migration : ajouter quantityMagasin si colonne manquante
  try {
    const stockCols = await (prisma as any).$queryRawUnsafe(`PRAGMA table_info("Stock")`) as { name: string }[]
    if (!stockCols.some((c: any) => c.name === 'quantityMagasin')) {
      await prisma.$executeRawUnsafe(`ALTER TABLE "Stock" ADD COLUMN "quantityMagasin" INTEGER NOT NULL DEFAULT 0`)
    }
  } catch { /* ignorer */ }
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Sale" (
      "id" TEXT PRIMARY KEY, "warehouseId" TEXT NOT NULL, "clientId" TEXT,
      "invoiceNumber" TEXT NOT NULL DEFAULT '',
      "subTotal" REAL NOT NULL, "vatTotal" REAL NOT NULL DEFAULT 0, "discount" REAL NOT NULL DEFAULT 0,
      "finalTotal" REAL NOT NULL, "paymentMethod" TEXT NOT NULL DEFAULT 'Cash',
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id"),
      FOREIGN KEY ("clientId") REFERENCES "Client"("id")
    )`)
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "SaleItem" (
      "id" TEXT PRIMARY KEY, "saleId" TEXT NOT NULL, "productId" TEXT, "bookId" TEXT,
      "quantity" INTEGER NOT NULL, "unitPrice" REAL NOT NULL,
      FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE CASCADE,
      FOREIGN KEY ("productId") REFERENCES "Product"("id"),
      FOREIGN KEY ("bookId") REFERENCES "Book"("id")
    )`)
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Expense" (
      "id" TEXT PRIMARY KEY, "warehouseId" TEXT, "title" TEXT NOT NULL, "amount" REAL NOT NULL,
      "category" TEXT NOT NULL, "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "description" TEXT,
      FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE CASCADE
    )`)

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "CashTransaction" (
      "id" TEXT PRIMARY KEY, "type" TEXT NOT NULL, "totalAmount" REAL NOT NULL,
      "paymentMethod" TEXT NOT NULL DEFAULT 'ESPECES', "description" TEXT,
      "category" TEXT NOT NULL DEFAULT 'GENERAL',
      "warehouseId" TEXT NOT NULL, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id")
    )`)
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "CashTransactionLine" (
      "id" TEXT PRIMARY KEY, "transactionId" TEXT NOT NULL, "productId" TEXT, "bookId" TEXT,
      "quantity" INTEGER NOT NULL, "unitPrice" REAL NOT NULL, "subTotal" REAL NOT NULL,
      FOREIGN KEY ("transactionId") REFERENCES "CashTransaction"("id") ON DELETE CASCADE,
      FOREIGN KEY ("productId") REFERENCES "Product"("id"),
      FOREIGN KEY ("bookId") REFERENCES "Book"("id")
    )`)
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "MobileMoneyCell" (
      "id" TEXT PRIMARY KEY, "warehouseId" TEXT NOT NULL, "month" TEXT NOT NULL,
      "day" INTEGER NOT NULL, "col" TEXT NOT NULL, "value" REAL NOT NULL DEFAULT 0,
      FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE CASCADE,
      UNIQUE ("warehouseId", "month", "day", "col")
    )`)
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "CanalPlusCell" (
      "id" TEXT PRIMARY KEY, "warehouseId" TEXT NOT NULL, "month" TEXT NOT NULL,
      "day" INTEGER NOT NULL, "col" TEXT NOT NULL, "value" REAL NOT NULL DEFAULT 0,
      FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE CASCADE,
      UNIQUE ("warehouseId", "month", "day", "col")
    )`)
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Discount" (
      "id" TEXT PRIMARY KEY, "saleId" TEXT NOT NULL, "warehouseId" TEXT NOT NULL,
      "amount" REAL NOT NULL, "reason" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("saleId") REFERENCES "Sale"("id"),
      FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id")
    )`)

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "ServiceSale" (
      "id" TEXT PRIMARY KEY, "warehouseId" TEXT NOT NULL,
      "serviceType" TEXT NOT NULL, "description" TEXT,
      "quantity" INTEGER NOT NULL DEFAULT 1, "unitPrice" REAL NOT NULL,
      "totalAmount" REAL NOT NULL, "clientName" TEXT,
      "invoiceNumber" TEXT NOT NULL DEFAULT '',
      "invoicePath" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id")
    )`)

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "CanalPlusSale" (
      "id" TEXT PRIMARY KEY, "warehouseId" TEXT NOT NULL,
      "clientName" TEXT NOT NULL, "subscriptionNumber" TEXT NOT NULL,
      "phone" TEXT NOT NULL, "formule" TEXT NOT NULL,
      "amount" REAL NOT NULL, "invoiceNumber" TEXT NOT NULL DEFAULT '',
      "invoicePath" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id")
    )`)

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "MagasinTransaction" (
      "id" TEXT PRIMARY KEY, "productId" TEXT NOT NULL, "warehouseId" TEXT NOT NULL,
      "type" TEXT NOT NULL, "quantity" INTEGER NOT NULL DEFAULT 0,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE,
      FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE CASCADE
    )`)

  // ── Tables module Librairie ─────────────────────────────────────────────
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "ClassLevel" (
      "id" TEXT PRIMARY KEY, "code" TEXT NOT NULL UNIQUE, "name" TEXT NOT NULL,
      "system" TEXT NOT NULL, "order" INTEGER NOT NULL, "cycle" TEXT NOT NULL,
      "color" TEXT NOT NULL, "icon" TEXT NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`)
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Subject" (
      "id" TEXT PRIMARY KEY, "code" TEXT NOT NULL UNIQUE, "name" TEXT NOT NULL,
      "system" TEXT NOT NULL, "color" TEXT NOT NULL DEFAULT '#6366f1',
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`)
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Book" (
      "id" TEXT PRIMARY KEY, "isbn" TEXT, "title" TEXT NOT NULL,
      "author" TEXT, "editor" TEXT, "year" TEXT,
      "price" REAL NOT NULL DEFAULT 0, "purchasePrice" REAL,
      "isOfficialProgram" INTEGER NOT NULL DEFAULT 1,
      "isPacket" INTEGER NOT NULL DEFAULT 0, "itemsPerPacket" INTEGER NOT NULL DEFAULT 1,
      "unitSellingPrice" REAL,
      "classLevelId" TEXT NOT NULL, "subjectId" TEXT,
      "activityBookId" TEXT, "imageUrl" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("classLevelId") REFERENCES "ClassLevel"("id"),
      FOREIGN KEY ("subjectId") REFERENCES "Subject"("id"),
      FOREIGN KEY ("activityBookId") REFERENCES "Book"("id"),
      UNIQUE ("title", "classLevelId")
    )`)
  await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "Book_title_classLevelId_key" ON "Book"("title", "classLevelId")`)

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "BookStock" (
      "id" TEXT PRIMARY KEY, "bookId" TEXT NOT NULL, "warehouseId" TEXT NOT NULL,
      "classLevelId" TEXT NOT NULL, "quantity" INTEGER NOT NULL DEFAULT 0,
      "alertLimit" INTEGER NOT NULL DEFAULT 5,
      FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE CASCADE,
      FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE CASCADE,
      FOREIGN KEY ("classLevelId") REFERENCES "ClassLevel"("id"),
      UNIQUE ("bookId", "warehouseId")
    )`)
  await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "BookStock_bookId_warehouseId_key" ON "BookStock"("bookId", "warehouseId")`)
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "BookSale" (
      "id" TEXT PRIMARY KEY, "warehouseId" TEXT NOT NULL,
      "studentName" TEXT, "className" TEXT, "classLevelId" TEXT,
      "totalAmount" REAL NOT NULL, "discount" REAL NOT NULL DEFAULT 0,
      "paymentMethod" TEXT NOT NULL, "notes" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id"),
      FOREIGN KEY ("classLevelId") REFERENCES "ClassLevel"("id")
    )`)
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "BookSaleItem" (
      "id" TEXT PRIMARY KEY, "saleId" TEXT NOT NULL, "bookId" TEXT NOT NULL,
      "quantity" INTEGER NOT NULL, "unitPrice" REAL NOT NULL,
      FOREIGN KEY ("saleId") REFERENCES "BookSale"("id") ON DELETE CASCADE,
      FOREIGN KEY ("bookId") REFERENCES "Book"("id")
    )`)

  // Migration : ajouter les colonnes aux tables existantes
  try {
    const whCols = await (prisma as any).$queryRawUnsafe(`PRAGMA table_info("Warehouse")`) as { name: string }[]
    if (!whCols.some((c: any) => c.name === 'librairieEnabled')) {
      await prisma.$executeRawUnsafe(`ALTER TABLE "Warehouse" ADD COLUMN "librairieEnabled" INTEGER NOT NULL DEFAULT 0`)
    }
  } catch { /* ignorer */ }

  try {
    const bookCols = await (prisma as any).$queryRawUnsafe(`PRAGMA table_info("Book")`) as { name: string }[]
    if (!bookCols.some((c: any) => c.name === 'isOfficialProgram')) {
      await prisma.$executeRawUnsafe(`ALTER TABLE "Book" ADD COLUMN "isOfficialProgram" INTEGER NOT NULL DEFAULT 1`)
    }
  } catch { /* ignorer */ }

  try {
    const prodCols = await (prisma as any).$queryRawUnsafe(`PRAGMA table_info("Product")`) as { name: string }[]
    if (!prodCols.some((c: any) => c.name === 'isPacket')) {
      await prisma.$executeRawUnsafe(`ALTER TABLE "Product" ADD COLUMN "isPacket" INTEGER NOT NULL DEFAULT 0`)
    }
    if (!prodCols.some((c: any) => c.name === 'itemsPerPacket')) {
      await prisma.$executeRawUnsafe(`ALTER TABLE "Product" ADD COLUMN "itemsPerPacket" INTEGER NOT NULL DEFAULT 1`)
    }
    if (!prodCols.some((c: any) => c.name === 'unitSellingPrice')) {
      await prisma.$executeRawUnsafe(`ALTER TABLE "Product" ADD COLUMN "unitSellingPrice" REAL`)
    }
  } catch { /* ignorer */ }

  try {
    const expCols = await (prisma as any).$queryRawUnsafe(`PRAGMA table_info("Expense")`) as { name: string }[]
    if (!expCols.some((c: any) => c.name === 'warehouseId')) {
      await prisma.$executeRawUnsafe(`ALTER TABLE "Expense" ADD COLUMN "warehouseId" TEXT REFERENCES "Warehouse"("id")`)
    }
  } catch { /* ignorer */ }

  try {
    const catCols = await (prisma as any).$queryRawUnsafe(`PRAGMA table_info("Category")`) as { name: string }[]
    if (!catCols.some((c: any) => c.name === 'warehouseId')) {
      await prisma.$executeRawUnsafe(`ALTER TABLE "Category" ADD COLUMN "warehouseId" TEXT REFERENCES "Warehouse"("id")`)
    }
  } catch { /* ignorer */ }

  try {
    const clientCols = await (prisma as any).$queryRawUnsafe(`PRAGMA table_info("Client")`) as { name: string }[]
    if (!clientCols.some((c: any) => c.name === 'warehouseId')) {
      await prisma.$executeRawUnsafe(`ALTER TABLE "Client" ADD COLUMN "warehouseId" TEXT REFERENCES "Warehouse"("id")`)
    }
  } catch { /* ignorer */ }

  try {
    const supCols = await (prisma as any).$queryRawUnsafe(`PRAGMA table_info("Supplier")`) as { name: string }[]
    if (!supCols.some((c: any) => c.name === 'warehouseId')) {
      await prisma.$executeRawUnsafe(`ALTER TABLE "Supplier" ADD COLUMN "warehouseId" TEXT REFERENCES "Warehouse"("id")`)
    }
  } catch { /* ignorer */ }

  // Seed ClassLevel — INSERT OR IGNORE en transaction batch (évite 31 appels séquentiels)
  try {
    const allClassLevels = [
        { code: 'FRA_PS',    name: 'Petite Section',      system: 'FRANCOPHONE', order: 1,  cycle: 'MATERNELLE',   color: '#FF6B6B', icon: 'Baby' },
        { code: 'FRA_MS',    name: 'Moyenne Section',     system: 'FRANCOPHONE', order: 2,  cycle: 'MATERNELLE',   color: '#FFA94D', icon: 'Baby' },
        { code: 'FRA_GS',    name: 'Grande Section',      system: 'FRANCOPHONE', order: 3,  cycle: 'MATERNELLE',   color: '#FFD43B', icon: 'Baby' },
        { code: 'FRA_SIL',   name: 'SIL',                 system: 'FRANCOPHONE', order: 4,  cycle: 'PRIMAIRE',     color: '#A9E34B', icon: 'BookOpen' },
        { code: 'FRA_CP',    name: 'CP',                  system: 'FRANCOPHONE', order: 5,  cycle: 'PRIMAIRE',     color: '#69DB7C', icon: 'BookOpen' },
        { code: 'FRA_CE1',   name: 'CE1',                 system: 'FRANCOPHONE', order: 6,  cycle: 'PRIMAIRE',     color: '#38D9A9', icon: 'BookOpen' },
        { code: 'FRA_CE2',   name: 'CE2',                 system: 'FRANCOPHONE', order: 7,  cycle: 'PRIMAIRE',     color: '#20C997', icon: 'BookOpen' },
        { code: 'FRA_CM1',   name: 'CM1',                 system: 'FRANCOPHONE', order: 8,  cycle: 'PRIMAIRE',     color: '#4C6EF5', icon: 'BookOpen' },
        { code: 'FRA_CM2',   name: 'CM2',                 system: 'FRANCOPHONE', order: 9,  cycle: 'PRIMAIRE',     color: '#748FFC', icon: 'BookOpen' },
        { code: 'FRA_6E',    name: '6ème',                system: 'FRANCOPHONE', order: 10, cycle: 'SECONDAIRE_1', color: '#9775FA', icon: 'GraduationCap' },
        { code: 'FRA_5E',    name: '5ème',                system: 'FRANCOPHONE', order: 11, cycle: 'SECONDAIRE_1', color: '#B197FC', icon: 'GraduationCap' },
        { code: 'FRA_4E',    name: '4ème',                system: 'FRANCOPHONE', order: 12, cycle: 'SECONDAIRE_1', color: '#D0BFFF', icon: 'GraduationCap' },
        { code: 'FRA_3E',    name: '3ème',                system: 'FRANCOPHONE', order: 13, cycle: 'SECONDAIRE_1', color: '#E599F7', icon: 'GraduationCap' },
        { code: 'FRA_2NDE',  name: 'Seconde',             system: 'FRANCOPHONE', order: 14, cycle: 'SECONDAIRE_2', color: '#845EF7', icon: 'GraduationCap' },
        { code: 'FRA_1ERE',  name: 'Première',            system: 'FRANCOPHONE', order: 15, cycle: 'SECONDAIRE_2', color: '#7048E8', icon: 'GraduationCap' },
        { code: 'FRA_TLE',   name: 'Terminale',           system: 'FRANCOPHONE', order: 16, cycle: 'SECONDAIRE_2', color: '#5F3DC4', icon: 'GraduationCap' },
        { code: 'ANG_NUR1',  name: 'Nursery 1',           system: 'ANGLOPHONE',  order: 17, cycle: 'MATERNELLE',   color: '#FF8787', icon: 'Baby' },
        { code: 'ANG_NUR2',  name: 'Nursery 2',           system: 'ANGLOPHONE',  order: 18, cycle: 'MATERNELLE',   color: '#FFC078', icon: 'Baby' },
        { code: 'ANG_CL1',   name: 'Class 1',             system: 'ANGLOPHONE',  order: 19, cycle: 'PRIMAIRE',     color: '#8CE99A', icon: 'BookOpen' },
        { code: 'ANG_CL2',   name: 'Class 2',             system: 'ANGLOPHONE',  order: 20, cycle: 'PRIMAIRE',     color: '#63E6BE', icon: 'BookOpen' },
        { code: 'ANG_CL3',   name: 'Class 3',             system: 'ANGLOPHONE',  order: 21, cycle: 'PRIMAIRE',     color: '#38D9A9', icon: 'BookOpen' },
        { code: 'ANG_CL4',   name: 'Class 4',             system: 'ANGLOPHONE',  order: 22, cycle: 'PRIMAIRE',     color: '#20C997', icon: 'BookOpen' },
        { code: 'ANG_CL5',   name: 'Class 5',             system: 'ANGLOPHONE',  order: 23, cycle: 'PRIMAIRE',     color: '#12B886', icon: 'BookOpen' },
        { code: 'ANG_CL6',   name: 'Class 6',             system: 'ANGLOPHONE',  order: 24, cycle: 'PRIMAIRE',     color: '#0CA678', icon: 'BookOpen' },
        { code: 'ANG_FM1',   name: 'Form 1',              system: 'ANGLOPHONE',  order: 25, cycle: 'SECONDAIRE_1', color: '#5C7CFA', icon: 'GraduationCap' },
        { code: 'ANG_FM2',   name: 'Form 2',              system: 'ANGLOPHONE',  order: 26, cycle: 'SECONDAIRE_1', color: '#748FFC', icon: 'GraduationCap' },
        { code: 'ANG_FM3',   name: 'Form 3',              system: 'ANGLOPHONE',  order: 27, cycle: 'SECONDAIRE_1', color: '#91A7FF', icon: 'GraduationCap' },
        { code: 'ANG_FM4',   name: 'Form 4',              system: 'ANGLOPHONE',  order: 28, cycle: 'SECONDAIRE_1', color: '#A5D8FF', icon: 'GraduationCap' },
        { code: 'ANG_FM5',   name: 'Form 5',              system: 'ANGLOPHONE',  order: 29, cycle: 'SECONDAIRE_1', color: '#BAE6FD', icon: 'GraduationCap' },
        { code: 'ANG_L6',    name: 'Lower Sixth',         system: 'ANGLOPHONE',  order: 30, cycle: 'SECONDAIRE_2', color: '#F783AC', icon: 'GraduationCap' },
        { code: 'ANG_U6',    name: 'Upper Sixth',         system: 'ANGLOPHONE',  order: 31, cycle: 'SECONDAIRE_2', color: '#E64980', icon: 'GraduationCap' },
    ]
    // Une seule transaction SQLite au lieu de 31 appels séquentiels
    const now = new Date().toISOString()
    const placeholders = allClassLevels.map(() => '(?,?,?,?,?,?,?,?,?,?)').join(',')
    const values = allClassLevels.flatMap(cl => [
      require('node:crypto').randomUUID(), cl.code, cl.name, cl.system, cl.order, cl.cycle, cl.color, cl.icon, now, now
    ])
    await prisma.$executeRawUnsafe(
      `INSERT OR IGNORE INTO "ClassLevel" ("id","code","name","system","order","cycle","color","icon","createdAt","updatedAt") VALUES ${placeholders}`,
      ...values
    )
  } catch { /* ignorer */ }

  // Seed Subject — INSERT OR IGNORE en transaction batch (évite 26 appels séquentiels)
  try {
    const subjects = [
      { code: 'FRA_MATH',    name: 'Mathématiques',   system: 'FRANCOPHONE', color: '#4C6EF5' },
      { code: 'FRA_FR',      name: 'Français',         system: 'FRANCOPHONE', color: '#F06595' },
      { code: 'FRA_ANG',     name: 'Anglais',          system: 'FRANCOPHONE', color: '#E64980' },
      { code: 'FRA_SVT',     name: 'SVT',              system: 'FRANCOPHONE', color: '#2F9E44' },
      { code: 'FRA_PC',      name: 'Physique-Chimie',  system: 'FRANCOPHONE', color: '#1971C2' },
      { code: 'FRA_HG',      name: 'Histoire-Géo',     system: 'FRANCOPHONE', color: '#E8590C' },
      { code: 'FRA_ESP',     name: 'Espagnol',         system: 'FRANCOPHONE', color: '#F59F00' },
      { code: 'FRA_ALL',     name: 'Allemand',         system: 'FRANCOPHONE', color: '#FCC419' },
      { code: 'FRA_PHILO',   name: 'Philosophie',      system: 'FRANCOPHONE', color: '#7950F2' },
      { code: 'FRA_ECONOMIE',name: 'SES',              system: 'FRANCOPHONE', color: '#A61E4D' },
      { code: 'FRA_ICT',     name: 'ICT',              system: 'FRANCOPHONE', color: '#1098AD' },
      { code: 'FRA_APS',     name: 'APS',              system: 'FRANCOPHONE', color: '#1E7E34' },
      { code: 'ANG_MATH',    name: 'Mathematics',      system: 'ANGLOPHONE',  color: '#4C6EF5' },
      { code: 'ANG_ENG',     name: 'English',          system: 'ANGLOPHONE',  color: '#F06595' },
      { code: 'ANG_FR',      name: 'French',           system: 'ANGLOPHONE',  color: '#E64980' },
      { code: 'ANG_SCI',     name: 'Science',          system: 'ANGLOPHONE',  color: '#2F9E44' },
      { code: 'ANG_PHY',     name: 'Physics',          system: 'ANGLOPHONE',  color: '#1971C2' },
      { code: 'ANG_CHEM',    name: 'Chemistry',        system: 'ANGLOPHONE',  color: '#7B2D8B' },
      { code: 'ANG_BIO',     name: 'Biology',          system: 'ANGLOPHONE',  color: '#2B8A3E' },
      { code: 'ANG_HIST',    name: 'History',          system: 'ANGLOPHONE',  color: '#E8590C' },
      { code: 'ANG_GEO',     name: 'Geography',        system: 'ANGLOPHONE',  color: '#F59F00' },
      { code: 'ANG_LIT',     name: 'Literature',       system: 'ANGLOPHONE',  color: '#7950F2' },
      { code: 'ANG_ECO',     name: 'Economics',        system: 'ANGLOPHONE',  color: '#A61E4D' },
      { code: 'ANG_ICT',     name: 'ICT / Computer',   system: 'ANGLOPHONE',  color: '#1098AD' },
      { code: 'ANG_PE',      name: 'P.E.',             system: 'ANGLOPHONE',  color: '#1E7E34' },
      { code: 'ANG_CDT',     name: 'C.D.T.',           system: 'ANGLOPHONE',  color: '#AE3EC9' },
    ]
    const now = new Date().toISOString()
    const placeholders = subjects.map(() => '(?,?,?,?,?,?)').join(',')
    const values = subjects.flatMap(s => [
      require('node:crypto').randomUUID(), s.code, s.name, s.system, s.color, now
    ])
    await prisma.$executeRawUnsafe(
      `INSERT OR IGNORE INTO "Subject" ("id","code","name","system","color","createdAt") VALUES ${placeholders}`,
      ...values
    )
  } catch { /* ignorer */ }

  // Seed catégories livres anglophones/francophones — INSERT OR IGNORE idempotent
  try {
    const now = new Date().toISOString()
    await prisma.$executeRawUnsafe(
      `INSERT OR IGNORE INTO "Category" ("id","name","description","createdAt","updatedAt") VALUES (?,?,?,?,?),(?,?,?,?,?)`,
      require('node:crypto').randomUUID(), 'Anglophone Books', 'Livres du système anglophone', now, now,
      require('node:crypto').randomUUID(), 'Francophone Books', 'Livres du système francophone', now, now
    )
  } catch { /* ignorer */ }

  // Migration : ajouter les champs agent à User
  try {
    const userCols = await (prisma as any).$queryRawUnsafe(`PRAGMA table_info("User")`) as { name: string }[]
    if (!userCols.some((c: any) => c.name === 'phone')) {
      await prisma.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN "phone" TEXT`)
    }
    if (!userCols.some((c: any) => c.name === 'commissionRate')) {
      await prisma.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN "commissionRate" REAL NOT NULL DEFAULT 0`)
    }
    if (!userCols.some((c: any) => c.name === 'notes')) {
      await prisma.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN "notes" TEXT`)
    }
    if (!userCols.some((c: any) => c.name === 'active')) {
      await prisma.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN "active" INTEGER NOT NULL DEFAULT 1`)
    }
    if (!userCols.some((c: any) => c.name === 'securityQuestion')) {
      await prisma.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN "securityQuestion" TEXT`)
    }
    if (!userCols.some((c: any) => c.name === 'securityAnswer')) {
      await prisma.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN "securityAnswer" TEXT`)
    }
    if (!userCols.some((c: any) => c.name === 'recoveryCodeHash')) {
      await prisma.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN "recoveryCodeHash" TEXT`)
    }
  } catch { /* ignorer */ }

  // Migration : ajouter quantityReservee à Stock
  try {
    const sCols = await (prisma as any).$queryRawUnsafe(`PRAGMA table_info("Stock")`) as { name: string }[]
    if (!sCols.some((c: any) => c.name === 'quantityReservee')) {
      await prisma.$executeRawUnsafe(`ALTER TABLE "Stock" ADD COLUMN "quantityReservee" INTEGER NOT NULL DEFAULT 0`)
    }
  } catch { /* ignorer */ }

  // Migration : ajouter status, agentId, commissionAmount, validatedAt, paidAt à Sale
  try {
    const saleCols = await (prisma as any).$queryRawUnsafe(`PRAGMA table_info("Sale")`) as { name: string }[]
    if (!saleCols.some((c: any) => c.name === 'status')) {
      await prisma.$executeRawUnsafe(`ALTER TABLE "Sale" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'EN_ATTENTE'`)
    }
    if (!saleCols.some((c: any) => c.name === 'agentId')) {
      await prisma.$executeRawUnsafe(`ALTER TABLE "Sale" ADD COLUMN "agentId" TEXT REFERENCES "User"("id")`)
    }
    if (!saleCols.some((c: any) => c.name === 'commissionAmount')) {
      await prisma.$executeRawUnsafe(`ALTER TABLE "Sale" ADD COLUMN "commissionAmount" REAL`)
    }
    if (!saleCols.some((c: any) => c.name === 'validatedAt')) {
      await prisma.$executeRawUnsafe(`ALTER TABLE "Sale" ADD COLUMN "validatedAt" DATETIME`)
    }
    if (!saleCols.some((c: any) => c.name === 'paidAt')) {
      await prisma.$executeRawUnsafe(`ALTER TABLE "Sale" ADD COLUMN "paidAt" DATETIME`)
    }
    if (!saleCols.some((c: any) => c.name === 'montantAvance')) {
      await prisma.$executeRawUnsafe(`ALTER TABLE "Sale" ADD COLUMN "montantAvance" REAL`)
    }
    if (!saleCols.some((c: any) => c.name === 'isPendingDelivery')) {
      await prisma.$executeRawUnsafe(`ALTER TABLE "Sale" ADD COLUMN "isPendingDelivery" INTEGER NOT NULL DEFAULT 0`)
    }
    if (!saleCols.some((c: any) => c.name === 'deliveryStatus')) {
      await prisma.$executeRawUnsafe(`ALTER TABLE "Sale" ADD COLUMN "deliveryStatus" TEXT DEFAULT 'NON_LIVRE'`)
    }
    if (!saleCols.some((c: any) => c.name === 'notifiedAt')) {
      await prisma.$executeRawUnsafe(`ALTER TABLE "Sale" ADD COLUMN "notifiedAt" DATETIME`)
    }
  } catch { /* ignorer */ }

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "PurchaseOrder" (
      "id" TEXT PRIMARY KEY, "supplierName" TEXT NOT NULL,
      "warehouseId" TEXT, "status" TEXT NOT NULL DEFAULT 'EN_ATTENTE',
      "pdfPath" TEXT, "totalAmount" REAL NOT NULL DEFAULT 0,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id")
    )`)
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "PurchaseOrderItem" (
      "id" TEXT PRIMARY KEY, "purchaseOrderId" TEXT NOT NULL,
      "productId" TEXT NOT NULL, "productName" TEXT NOT NULL,
      "productBarcode" TEXT NOT NULL, "quantity" INTEGER NOT NULL,
      "unitPrice" REAL NOT NULL DEFAULT 0,
      "currentStock" INTEGER NOT NULL DEFAULT 0,
      "alertLimit" INTEGER NOT NULL DEFAULT 0,
      "warehouseName" TEXT NOT NULL, "warehouseId" TEXT NOT NULL,
      FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE CASCADE,
      FOREIGN KEY ("productId") REFERENCES "Product"("id")
    )`)

  // Migration conditionnelle : PurchaseOrder & PurchaseOrderItem colonnes
  try {
    const poCols = await (prisma as any).$queryRawUnsafe(`PRAGMA table_info("PurchaseOrder")`) as { name: string }[]
    if (poCols && poCols.length > 0) {
      if (!poCols.some((c: any) => c.name === 'totalAmount')) {
        await prisma.$executeRawUnsafe(`ALTER TABLE "PurchaseOrder" ADD COLUMN "totalAmount" REAL NOT NULL DEFAULT 0`)
      }
      if (!poCols.some((c: any) => c.name === 'pdfPath')) {
        await prisma.$executeRawUnsafe(`ALTER TABLE "PurchaseOrder" ADD COLUMN "pdfPath" TEXT`)
      }
      if (!poCols.some((c: any) => c.name === 'status')) {
        await prisma.$executeRawUnsafe(`ALTER TABLE "PurchaseOrder" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'EN_ATTENTE'`)
      }
      if (!poCols.some((c: any) => c.name === 'warehouseId')) {
        await prisma.$executeRawUnsafe(`ALTER TABLE "PurchaseOrder" ADD COLUMN "warehouseId" TEXT`)
      }
    }
  } catch { /* ignorer */ }

  try {
    const poiCols = await (prisma as any).$queryRawUnsafe(`PRAGMA table_info("PurchaseOrderItem")`) as { name: string }[]
    if (poiCols && poiCols.length > 0) {
      if (!poiCols.some((c: any) => c.name === 'unitPrice')) {
        await prisma.$executeRawUnsafe(`ALTER TABLE "PurchaseOrderItem" ADD COLUMN "unitPrice" REAL NOT NULL DEFAULT 0`)
      }
      if (!poiCols.some((c: any) => c.name === 'currentStock')) {
        await prisma.$executeRawUnsafe(`ALTER TABLE "PurchaseOrderItem" ADD COLUMN "currentStock" INTEGER NOT NULL DEFAULT 0`)
      }
      if (!poiCols.some((c: any) => c.name === 'alertLimit')) {
        await prisma.$executeRawUnsafe(`ALTER TABLE "PurchaseOrderItem" ADD COLUMN "alertLimit" INTEGER NOT NULL DEFAULT 0`)
      }
      if (!poiCols.some((c: any) => c.name === 'warehouseName')) {
        await prisma.$executeRawUnsafe(`ALTER TABLE "PurchaseOrderItem" ADD COLUMN "warehouseName" TEXT NOT NULL DEFAULT ''`)
      }
      if (!poiCols.some((c: any) => c.name === 'warehouseId')) {
        await prisma.$executeRawUnsafe(`ALTER TABLE "PurchaseOrderItem" ADD COLUMN "warehouseId" TEXT NOT NULL DEFAULT ''`)
      }
      if (!poiCols.some((c: any) => c.name === 'productBarcode')) {
        await prisma.$executeRawUnsafe(`ALTER TABLE "PurchaseOrderItem" ADD COLUMN "productBarcode" TEXT NOT NULL DEFAULT ''`)
      }
    }
  } catch { /* ignorer */ }

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "AppSettings" (
      "id" TEXT PRIMARY KEY, "companyName" TEXT NOT NULL DEFAULT 'Mon Entreprise',
      "companyNui" TEXT, "companyBp" TEXT, "companyAddress" TEXT,
      "companyPhones" TEXT, "companyEmail" TEXT,
      "companyLogo" TEXT, "companyDescription" TEXT,
      "invoiceFooter" TEXT, "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`)

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "StockMovement" (
      "id" TEXT PRIMARY KEY,
      "productId" TEXT,
      "bookId" TEXT,
      "warehouseId" TEXT NOT NULL,
      "type" TEXT NOT NULL,
      "quantity" INTEGER NOT NULL,
      "quantityBefore" INTEGER NOT NULL DEFAULT 0,
      "quantityAfter" INTEGER NOT NULL DEFAULT 0,
      "unitCost" REAL,
      "referenceDoc" TEXT,
      "notes" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE,
      FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE CASCADE,
      FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE CASCADE
    )`)
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "idx_stockmovement_wh" ON "StockMovement"("warehouseId")`)
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "idx_stockmovement_prod" ON "StockMovement"("productId")`)
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "idx_stockmovement_book" ON "StockMovement"("bookId")`)
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "idx_stockmovement_type" ON "StockMovement"("type")`)

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "CashSession" (
      "id" TEXT PRIMARY KEY,
      "warehouseId" TEXT NOT NULL,
      "userId" TEXT,
      "openedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "closedAt" DATETIME,
      "status" TEXT NOT NULL DEFAULT 'OUVERTE',
      "openingAmount" REAL NOT NULL DEFAULT 0,
      "closingAmountExpected" REAL,
      "closingAmountActual" REAL,
      "difference" REAL,
      "totalSales" REAL NOT NULL DEFAULT 0,
      "totalCashIn" REAL NOT NULL DEFAULT 0,
      "totalCashOut" REAL NOT NULL DEFAULT 0,
      "notes" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE CASCADE,
      FOREIGN KEY ("userId") REFERENCES "User"("id")
    )`)
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "idx_cashsession_wh" ON "CashSession"("warehouseId")`)
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "idx_cashsession_status" ON "CashSession"("status")`)

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "ScannedDocument" (
      "id" TEXT PRIMARY KEY,
      "title" TEXT NOT NULL,
      "date" TEXT NOT NULL,
      "filePath" TEXT NOT NULL,
      "fileType" TEXT NOT NULL DEFAULT 'image/png',
      "category" TEXT NOT NULL DEFAULT 'FACTURE',
      "notes" TEXT,
      "warehouseId" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE CASCADE
    )`)
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "idx_scanneddoc_wh" ON "ScannedDocument"("warehouseId")`)
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "idx_scanneddoc_date" ON "ScannedDocument"("date")`)

  // Migrations conditionnelles : Warehouse
  try {
    const whCols2 = await (prisma as any).$queryRawUnsafe(`PRAGMA table_info("Warehouse")`) as { name: string }[]
    if (!whCols2.some((c: any) => c.name === 'logoUrl')) {
      await prisma.$executeRawUnsafe(`ALTER TABLE "Warehouse" ADD COLUMN "logoUrl" TEXT`)
    }
    if (!whCols2.some((c: any) => c.name === 'mobileMoneyEnabled')) {
      await prisma.$executeRawUnsafe(`ALTER TABLE "Warehouse" ADD COLUMN "mobileMoneyEnabled" INTEGER NOT NULL DEFAULT 0`)
    }
    if (!whCols2.some((c: any) => c.name === 'invoiceCompanyName')) {
      await prisma.$executeRawUnsafe(`ALTER TABLE "Warehouse" ADD COLUMN "invoiceCompanyName" TEXT`)
    }
    if (!whCols2.some((c: any) => c.name === 'invoiceCompanyNui')) {
      await prisma.$executeRawUnsafe(`ALTER TABLE "Warehouse" ADD COLUMN "invoiceCompanyNui" TEXT`)
    }
    if (!whCols2.some((c: any) => c.name === 'invoiceCompanyBp')) {
      await prisma.$executeRawUnsafe(`ALTER TABLE "Warehouse" ADD COLUMN "invoiceCompanyBp" TEXT`)
    }
    if (!whCols2.some((c: any) => c.name === 'invoiceCompanyAddress')) {
      await prisma.$executeRawUnsafe(`ALTER TABLE "Warehouse" ADD COLUMN "invoiceCompanyAddress" TEXT`)
    }
    if (!whCols2.some((c: any) => c.name === 'invoiceCompanyPhones')) {
      await prisma.$executeRawUnsafe(`ALTER TABLE "Warehouse" ADD COLUMN "invoiceCompanyPhones" TEXT`)
    }
    if (!whCols2.some((c: any) => c.name === 'invoiceCompanyEmail')) {
      await prisma.$executeRawUnsafe(`ALTER TABLE "Warehouse" ADD COLUMN "invoiceCompanyEmail" TEXT`)
    }
    if (!whCols2.some((c: any) => c.name === 'invoiceCompanyLogo')) {
      await prisma.$executeRawUnsafe(`ALTER TABLE "Warehouse" ADD COLUMN "invoiceCompanyLogo" TEXT`)
    }
    if (!whCols2.some((c: any) => c.name === 'invoiceCompanyDescription')) {
      await prisma.$executeRawUnsafe(`ALTER TABLE "Warehouse" ADD COLUMN "invoiceCompanyDescription" TEXT`)
    }
    if (!whCols2.some((c: any) => c.name === 'invoiceFooter')) {
      await prisma.$executeRawUnsafe(`ALTER TABLE "Warehouse" ADD COLUMN "invoiceFooter" TEXT`)
    }
    if (!whCols2.some((c: any) => c.name === 'invoiceTemplate')) {
      await prisma.$executeRawUnsafe(`ALTER TABLE "Warehouse" ADD COLUMN "invoiceTemplate" TEXT DEFAULT 'MODERNE'`)
    }
    if (!whCols2.some((c: any) => c.name === 'invoiceColor')) {
      await prisma.$executeRawUnsafe(`ALTER TABLE "Warehouse" ADD COLUMN "invoiceColor" TEXT DEFAULT '#2563eb'`)
    }
    if (!whCols2.some((c: any) => c.name === 'invoiceTerms')) {
      await prisma.$executeRawUnsafe(`ALTER TABLE "Warehouse" ADD COLUMN "invoiceTerms" TEXT`)
    }
    if (!whCols2.some((c: any) => c.name === 'invoiceBankDetails')) {
      await prisma.$executeRawUnsafe(`ALTER TABLE "Warehouse" ADD COLUMN "invoiceBankDetails" TEXT`)
    }
  } catch { /* ignorer */ }

  // Migration : SaleItem — rendre productId nullable + ajout bookId
  try {
    const siCols = await (prisma as any).$queryRawUnsafe(`PRAGMA table_info("SaleItem")`) as any[]
    const hasBookId = siCols.some((c: any) => c.name === 'bookId')
    const productIdNotNull = siCols.some((c: any) => c.name === 'productId' && !!c.notnull)
    appLog('INFO', 'migration', `SaleItem: hasBookId=${hasBookId}, productIdNotNull=${productIdNotNull}`)
    if (!hasBookId || productIdNotNull) {
      appLog('INFO', 'migration', 'Recreating SaleItem table...')
      await prisma.$executeRawUnsafe(`PRAGMA foreign_keys = OFF`)
      await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "SaleItem_new"`)
      await prisma.$executeRawUnsafe(`CREATE TABLE "SaleItem_new" (
        "id" TEXT PRIMARY KEY, "saleId" TEXT NOT NULL, "productId" TEXT, "bookId" TEXT,
        "quantity" INTEGER NOT NULL, "unitPrice" REAL NOT NULL,
        FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE CASCADE,
        FOREIGN KEY ("productId") REFERENCES "Product"("id"),
        FOREIGN KEY ("bookId") REFERENCES "Book"("id")
      )`)
      await prisma.$executeRawUnsafe(`INSERT INTO "SaleItem_new" ("id","saleId","productId","quantity","unitPrice") SELECT "id","saleId","productId","quantity","unitPrice" FROM "SaleItem"`)
      await prisma.$executeRawUnsafe(`DROP TABLE "SaleItem"`)
      await prisma.$executeRawUnsafe(`ALTER TABLE "SaleItem_new" RENAME TO "SaleItem"`)
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "idx_saleitem_saleid" ON "SaleItem"("saleId")`)
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "idx_saleitem_productid" ON "SaleItem"("productId")`)
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "idx_saleitem_bookid" ON "SaleItem"("bookId")`)
      await prisma.$executeRawUnsafe(`PRAGMA foreign_keys = ON`)
      appLog('INFO', 'migration', 'SaleItem table recreated successfully')
    }
  } catch (e) { appLog('WARN', 'migration', `SaleItem table recreate failed: ${e}`) }

  // Migration : CashTransactionLine — rendre productId nullable + ajout bookId
  try {
    const ctlCols = await (prisma as any).$queryRawUnsafe(`PRAGMA table_info("CashTransactionLine")`) as any[]
    const hasBookId = ctlCols.some((c: any) => c.name === 'bookId')
    const productIdNotNull = ctlCols.some((c: any) => c.name === 'productId' && !!c.notnull)
    appLog('INFO', 'migration', `CashTransactionLine: hasBookId=${hasBookId}, productIdNotNull=${productIdNotNull}`)
    if (!hasBookId || productIdNotNull) {
      appLog('INFO', 'migration', 'Recreating CashTransactionLine table...')
      await prisma.$executeRawUnsafe(`PRAGMA foreign_keys = OFF`)
      await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "CashTransactionLine_new"`)
      await prisma.$executeRawUnsafe(`CREATE TABLE "CashTransactionLine_new" (
        "id" TEXT PRIMARY KEY, "transactionId" TEXT NOT NULL, "productId" TEXT, "bookId" TEXT,
        "quantity" INTEGER NOT NULL, "unitPrice" REAL NOT NULL, "subTotal" REAL NOT NULL,
        FOREIGN KEY ("transactionId") REFERENCES "CashTransaction"("id") ON DELETE CASCADE,
        FOREIGN KEY ("productId") REFERENCES "Product"("id"),
        FOREIGN KEY ("bookId") REFERENCES "Book"("id")
      )`)
      await prisma.$executeRawUnsafe(`INSERT INTO "CashTransactionLine_new" ("id","transactionId","productId","quantity","unitPrice","subTotal") SELECT "id","transactionId","productId","quantity","unitPrice","subTotal" FROM "CashTransactionLine"`)
      await prisma.$executeRawUnsafe(`DROP TABLE "CashTransactionLine"`)
      await prisma.$executeRawUnsafe(`ALTER TABLE "CashTransactionLine_new" RENAME TO "CashTransactionLine"`)
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "idx_ctline_transactionid" ON "CashTransactionLine"("transactionId")`)
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "idx_ctline_productid" ON "CashTransactionLine"("productId")`)
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "idx_ctline_bookid" ON "CashTransactionLine"("bookId")`)
      await prisma.$executeRawUnsafe(`PRAGMA foreign_keys = ON`)
      appLog('INFO', 'migration', 'CashTransactionLine table recreated successfully')
    }
  } catch (e) { appLog('WARN', 'migration', `CashTransactionLine table recreate failed: ${e}`) }

  // Migration : CashTransaction — ajout colonne category
  try {
    const ctCols = await (prisma as any).$queryRawUnsafe(`PRAGMA table_info("CashTransaction")`) as { name: string }[]
    if (!ctCols.some((c: any) => c.name === 'category')) {
      await prisma.$executeRawUnsafe(`ALTER TABLE "CashTransaction" ADD COLUMN "category" TEXT NOT NULL DEFAULT 'GENERAL'`)
    }
  } catch { /* ignorer */ }

  // Migration : AppSettings
  try {
    const appCols = await (prisma as any).$queryRawUnsafe(`PRAGMA table_info("AppSettings")`) as { name: string }[]
    if (!appCols.some((c: any) => c.name === 'companyNui')) {
      await prisma.$executeRawUnsafe(`ALTER TABLE "AppSettings" ADD COLUMN "companyNui" TEXT`)
    }
    if (!appCols.some((c: any) => c.name === 'companyBp')) {
      await prisma.$executeRawUnsafe(`ALTER TABLE "AppSettings" ADD COLUMN "companyBp" TEXT`)
    }
    if (!appCols.some((c: any) => c.name === 'companyPhones')) {
      await prisma.$executeRawUnsafe(`ALTER TABLE "AppSettings" ADD COLUMN "companyPhones" TEXT`)
    }
    if (!appCols.some((c: any) => c.name === 'companyDescription')) {
      await prisma.$executeRawUnsafe(`ALTER TABLE "AppSettings" ADD COLUMN "companyDescription" TEXT`)
    }
  } catch { /* ignorer */ }

  console.log(`Base de données prête : ${dbPath}`)
  appLog('INFO', 'db', `Base de données prête : ${dbPath}`)

  // Démarrer la sauvegarde automatique (au démarrage + toutes les 24h)
  backupService.startAutoBackup()
}

function registerIpcHandlers(): void {
  if (!prisma) throw new Error('Base de données non initialisée')
  appLog('INFO', 'ipc', 'Enregistrement des handlers IPC')
  const productService = createProductService(prisma)
  const warehouseService = createWarehouseService(prisma)
  const printerService = createPrinterService()
  const reportService = createReportService()
  const clientService = createClientService(prisma)
  const supplierService = createSupplierService(prisma)
  const purchaseOrderService = createPurchaseOrderService(prisma)
  const stockAnalysis = createStockAnalysisService(prisma, purchaseOrderService)
  const categoryService = createCategoryService(prisma)
  const expenseService = createExpenseService(prisma)
  const cashRegisterService = createCashRegisterService(prisma)
  const appSettingsService = createAppSettingsService(prisma)
  const discountService = createDiscountService(prisma)
  const monthlyReportService = createMonthlyReportService(prisma)
  const mobileMoneyService = createMobileMoneyService(prisma)
  const canalPlusService = createCanalPlusService(prisma)
  const canalPlusSaleService = createCanalPlusSaleService(prisma)
  const globalStatsService = createGlobalStatsService(prisma)
  const serviceSaleService = createServiceSaleService(prisma)
  const authService = createAuthService(prisma)
  const librairieService = createLibrairieService(prisma)
  const librairieSaleService = createLibrairieSaleService(prisma)
  const curriculumSeedService = createCurriculumSeedService(prisma)
  const statsService = createStatsService(prisma)
  const excelImportService = createExcelImportService(prisma)
  const stockMovementService = createStockMovementService(prisma)
  const cashSessionService = createCashSessionService(prisma)

  const dataTransferService = createDataTransferService(prisma)
  const saleService = createSaleService(prisma, stockMovementService)

  // Enforce official curriculum books for secondary vs excel imports in background
  curriculumSeedService.seedOfficialCurriculum().catch((err) => {
    console.warn('Auto-seed curriculum au démarrage:', err)
  })

  // ── Sauvegarde ──────────────────────────────────────────────────────────
  ipcMain.handle('backup:create', () => backupService.createBackup())
  ipcMain.handle('backup:list', () => backupService.listBackups())
  ipcMain.handle('backup:restore', async (_e, filePath: string) => {
    backupService.restoreBackup(filePath)
    // Redémarrer l'app pour recharger la DB restaurée
    app.relaunch()
    app.exit(0)
  })

  // ── Import / Export données ─────────────────────────────────────────────
  ipcMain.handle('data:export', () => dataTransferService.exportAll())
  ipcMain.handle('data:import', async (_e, archivePath: string, restoreDb: boolean) =>
    dataTransferService.importFromFile(archivePath, restoreDb)
  )
  ipcMain.handle('data:export-stats', () => dataTransferService.getExportStats())
  ipcMain.handle('data:select-archive', async () => {
    const result = await dialog.showOpenDialog({
      title: 'Sélectionner une archive Iventello',
      filters: [{ name: 'Archives Iventello', extensions: ['iventello', 'zip'] }],
      properties: ['openFile']
    })
    return result.canceled ? null : result.filePaths[0]
  })


  // Mouvements de Stock
  ipcMain.handle('stock:get-movements', (_e, params) => stockMovementService.getMovements(params || {}))

  // Sessions de Caisse (POS Clôture Z)
  ipcMain.handle('cash:get-current-session', (_e, wid: string) => cashSessionService.getCurrentSession(wid))
  ipcMain.handle('cash:open-session', (_e, data) => {
    const user = sessionService.getCurrentSession()
    return cashSessionService.openSession({ ...data, userId: user?.id })
  })
  ipcMain.handle('cash:close-session', (_e, data) => cashSessionService.closeSession(data))
  ipcMain.handle('cash:get-session-history', (_e, wid: string, page?: number, pageSize?: number) =>
    cashSessionService.getSessionHistory(wid, page, pageSize)
  )


  const invoiceScannerService = createInvoiceScannerService(prisma!)
  const scannedDocumentService = createScannedDocumentService(prisma!)

  // Scanner & Archive des Factures par Date
  ipcMain.handle('scanner:scan-invoices-by-date', (_e, dateStr: string, warehouseId?: string) =>
    invoiceScannerService.scanInvoicesByDate(dateStr, warehouseId)
  )
  ipcMain.handle('scanner:export-scanned-invoices-pdf', (_e, dateStr: string, warehouseId?: string) =>
    invoiceScannerService.exportScannedInvoicesPdf(dateStr, warehouseId)
  )
  ipcMain.handle('scanner:export-scanned-invoices-zip', (_e, dateStr: string, warehouseId?: string) =>
    invoiceScannerService.exportScannedInvoicesZip(dateStr, warehouseId)
  )

  // Numérisation & Scans de Documents Physiques
  ipcMain.handle('scan:get-documents', (_e, dateStr?: string, warehouseId?: string, search?: string) =>
    scannedDocumentService.getAll(dateStr, warehouseId, search)
  )
  ipcMain.handle('scan:create-document', (_e, data) => scannedDocumentService.create(data))
  ipcMain.handle('scan:delete-document', (_e, id: string) => scannedDocumentService.delete(id))
  ipcMain.handle('scan:select-file', () => scannedDocumentService.selectDocumentFile())


  ipcMain.handle('auth:has-users', () => authService.hasUsers())
  ipcMain.handle('auth:setup-owner', async (_e, data) => {
    const hasUsers = await authService.hasUsers()
    if (hasUsers) throw new Error('Un propriétaire existe déjà')
    return authService.createUser({ ...data, role: 'PROPRIETAIRE' })
  })
  ipcMain.handle('auth:login', async (_e, email, password) => {
    const user = await authService.verifyUser(email, password)
    if (!user) throw new Error('Email ou mot de passe incorrect')
    sessionService.setCurrentSession(user)
    return user
  })
  ipcMain.handle('auth:logout', () => sessionService.clearSession())
  ipcMain.handle('auth:session', () => sessionService.getCurrentSession())
  ipcMain.handle('auth:get-users', () => authService.getAllUsers())
  ipcMain.handle('auth:create-user', (_e, data) => authService.createUser(data))
  ipcMain.handle('auth:update-user', (_e, id, data) => authService.updateUser(id, data))
  ipcMain.handle('auth:delete-user', (_e, id) => authService.deleteUser(id))
  ipcMain.handle('auth:change-password', (_e, id, oldP, newP) => authService.changePassword(id, oldP, newP))
  ipcMain.handle('auth:assign-warehouses', (_e, userId, wIds) => authService.assignWarehouseAccess(userId, wIds))
  ipcMain.handle('auth:set-security-question', (_e, id, question, answer) => authService.setSecurityQuestion(id, question, answer))
  ipcMain.handle('auth:has-security-question', (_e, email) => authService.hasSecurityQuestion(email))
  ipcMain.handle('auth:verify-security-answer', (_e, email, answer) => authService.verifySecurityAnswer(email, answer))
  ipcMain.handle('auth:reset-password', (_e, email, newPassword) => authService.resetPassword(email, newPassword))
  ipcMain.handle('auth:admin-reset-password', (_e, id, newPassword) => authService.adminResetPassword(id, newPassword))
  ipcMain.handle('auth:generate-recovery-code', async (_e, userId) => {
    const code = await authService.generateRecoveryCode(userId)
    return { code, filePath: join(app.getPath('desktop'), 'Iventello-CodeRecuperation.txt') }
  })
  ipcMain.handle('auth:has-recovery-code', (_e, email) => authService.hasRecoveryCode(email))
  ipcMain.handle('auth:verify-recovery-code', (_e, email, code) => authService.verifyRecoveryCode(email, code))
  ipcMain.handle('auth:verify-owner-password', (_e, password: string) => authService.verifyOwnerPassword(password))

  // Agents (Users avec rôle AGENT)
  ipcMain.handle('db:get-agents', async () => {
    return prisma!.user.findMany({ where: { role: 'AGENT' }, orderBy: { nom: 'asc' } })
  })
  ipcMain.handle('db:create-agent', async (_e, data) => {
    const { email, password, nom, prenom, phone, commissionRate, notes } = data as any
    const passwordHash = await authService.hashPassword(password)
    return prisma!.user.create({
      data: {
        email, passwordHash, nom, prenom,
        role: 'AGENT',
        phone: phone || null,
        commissionRate: commissionRate || 0,
        notes: notes || null,
        active: true
      }
    })
  })
  ipcMain.handle('db:update-agent', async (_e, id: string, data) => {
    const updateData: any = { ...data }
    if (data.password) {
      updateData.passwordHash = await authService.hashPassword(data.password)
      delete updateData.password
    }
    return prisma!.user.update({ where: { id }, data: updateData })
  })
  ipcMain.handle('db:delete-agent', async (_e, id: string) => {
    const salesCount = await prisma!.sale.count({ where: { agentId: id, status: { not: 'ANNULE' } } })
    if (salesCount > 0) throw new Error('Impossible de supprimer : cet agent a des ventes actives')
    return prisma!.user.delete({ where: { id } })
  })

  ipcMain.handle('db:get-global-stats', async () => {
    const user = sessionService.getCurrentSession()
    if (!user) return null
    if (user.role === 'PROPRIETAIRE' || user.role === 'MANAGER') {
      return globalStatsService.getStats()
    }
    return globalStatsService.getStats(user.id)
  })

  ipcMain.handle('db:dashboard-stats', async (_e, period: string, warehouseId?: string) => {
    const user = sessionService.getCurrentSession()
    if (!user) return null
    return statsService.getDashboardData(period, warehouseId || undefined)
  })

  ipcMain.handle('db:get-products', (_e, warehouseId?: string) => productService.getAll(warehouseId))
  ipcMain.handle('db:get-product-by-barcode', (_e, b: string, warehouseId?: string) => productService.getByBarcode(b, warehouseId))
  ipcMain.handle('db:get-product-details', (_e, id: string) => productService.getProductDetails(id))
  ipcMain.handle('db:create-product', (_e, d) => {
    return productService.create(d)
  })
  ipcMain.handle('db:update-product', (_e, id: string, d) => productService.update(id, d))
  ipcMain.handle('db:delete-product', (_e, id: string) => productService.delete(id))
  ipcMain.handle('db:delete-all-products', (_e, warehouseId?: string) => productService.deleteAll(warehouseId))

  // ── Ventes & Commandes (Gérés par saleService) ─────────────────────────
  ipcMain.handle('db:create-sale', async (_e, data) => saleService.createSale(data))
  ipcMain.handle('db:get-sales', async (_e, clientId?: string, warehouseId?: string) => saleService.getSales(clientId, warehouseId))
  ipcMain.handle('db:get-pending-deliveries', async (_e, warehouseId?: string) => saleService.getPendingDeliveries(warehouseId))
  ipcMain.handle('db:deliver-sale', async (_e, saleId: string, paymentMethod?: string) => saleService.deliverSale(saleId, paymentMethod))
  ipcMain.handle('db:update-delivery-status', async (_e, saleId: string, deliveryStatus: string) => saleService.updateDeliveryStatus(saleId, deliveryStatus))
  ipcMain.handle('db:validate-sale', async (_e, saleId: string, complementAmount?: number) => saleService.validateSale(saleId, complementAmount))
  ipcMain.handle('db:pay-sale', async (_e, saleId: string) => saleService.paySale(saleId))
  ipcMain.handle('db:cancel-sale', async (_e, saleId: string) => saleService.cancelSale(saleId))
  ipcMain.handle('db:notify-sale-client', async (_e, saleId: string) => {
    return prisma!.sale.update({
      where: { id: saleId },
      data: { notifiedAt: new Date() },
      include: { items: { include: { product: true, book: true } }, client: true, warehouse: true, agent: true }
    })
  })

  ipcMain.handle('db:get-warehouses', async () => {
    const user = sessionService.getCurrentSession()
    if (!user) return []
    if (user.role === 'PROPRIETAIRE' || user.role === 'MANAGER') {
      return warehouseService.getAll()
    }
    return prisma!.warehouse.findMany({
      where: {
        userAccess: {
          some: {
            userId: user.id
          }
        }
      },
      orderBy: { name: 'asc' }
    })
  })
  ipcMain.handle('db:create-warehouse', (_e, d) => warehouseService.create(d))
  ipcMain.handle('db:update-warehouse', (_e, id: string, d) => warehouseService.update(id, d))
  ipcMain.handle('db:delete-warehouse', (_e, id: string) => warehouseService.delete(id))

  ipcMain.handle('dialog:select-logo', async () => {
    const result = await dialog.showOpenDialog(mainWindow!, {
      properties: ['openFile'],
      filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'] }]
    })
    return result.canceled ? null : result.filePaths[0]
  })

  ipcMain.handle('file:save-logo', async (_e, sourcePath: string, warehouseId: string) => {
    const logosDir = join(app.getPath('userData'), 'logos')
    if (!existsSync(logosDir)) mkdirSync(logosDir, { recursive: true })
    const ext = extname(sourcePath)
    const dest = join(logosDir, `${warehouseId}${ext}`)
    copyFileSync(sourcePath, dest)
    return dest
  })

  ipcMain.handle('file:save-invoice-logo', async (_e, sourcePath: string, warehouseId: string) => {
    const logosDir = join(app.getPath('userData'), 'logos')
    if (!existsSync(logosDir)) mkdirSync(logosDir, { recursive: true })
    const ext = extname(sourcePath)
    const dest = join(logosDir, `invoice_${warehouseId}${ext}`)
    copyFileSync(sourcePath, dest)
    return dest
  })

  ipcMain.handle('file:save-book-image', async (_e, sourcePath: string, bookId: string) => {
    const imgDir = join(app.getPath('userData'), 'product-images')
    if (!existsSync(imgDir)) mkdirSync(imgDir, { recursive: true })
    const ext = extname(sourcePath)
    const dest = join(imgDir, `book_${bookId}${ext}`)
    copyFileSync(sourcePath, dest)
    return dest
  })

  ipcMain.handle('file:save-product-image', async (_e, sourcePath: string, productId: string) => {
    const imagesDir = join(app.getPath('userData'), 'product-images')
    if (!existsSync(imagesDir)) mkdirSync(imagesDir, { recursive: true })
    const ext = extname(sourcePath)
    const dest = join(imagesDir, `${productId}${ext}`)
    copyFileSync(sourcePath, dest)
    return dest
  })

  ipcMain.handle('db:get-stock-alerts', () => productService.getStockAlerts())
  ipcMain.handle('db:get-book-stock-alerts', () => librairieService.getBookStockAlerts())
  ipcMain.handle('db:get-ruptured-books', () => librairieService.getRupturedBooks())

  ipcMain.handle('printer:list', () => printerService.listPrinters())
  ipcMain.handle('printer:scan-network', () => printerService.scanNetworkPrinters())
  ipcMain.handle('printer:scan-nearby', () => printerService.scanNearbyPrinters())
  ipcMain.handle('print:receipt', (_e, data, config) => printerService.printReceipt(data, config))
  ipcMain.handle('print:test', (_e, config) => printerService.printTestReceipt(config))
  ipcMain.handle('print:export-report', (_e, data) => reportService.exportStockReport(data))

  ipcMain.handle('db:get-clients', (_e, warehouseId?: string) => clientService.getAllWithStats(warehouseId))
  ipcMain.handle('db:search-clients', (_e, query: string, warehouseId?: string) => clientService.search(query, warehouseId))
  ipcMain.handle('db:get-client', (_e, id: string) => clientService.getByIdWithSales(id))
  ipcMain.handle('db:create-client', (_e, d) => clientService.create(d))
  ipcMain.handle('db:update-client', (_e, id: string, d) => clientService.update(id, d))
  ipcMain.handle('db:delete-client', (_e, id: string) => clientService.delete(id))

  ipcMain.handle('db:get-suppliers', (_e, warehouseId?: string) => supplierService.getAll(warehouseId))
  ipcMain.handle('db:create-supplier', (_e, d) => supplierService.create(d))
  ipcMain.handle('db:update-supplier', (_e, id: string, d) => supplierService.update(id, d))
  ipcMain.handle('db:delete-supplier', (_e, id: string) => supplierService.delete(id))

  ipcMain.handle('db:purge-database', async () => {
    const tableNames = [
      'SaleItem', 'BookSaleItem', 'CashTransactionLine',
      'Sale', 'BookSale', 'CanalPlusSale', 'ServiceSale',
      'CashTransaction', 'CashSession', 'StockMovement',
      'MagasinTransaction', 'PurchaseOrderItem', 'PurchaseOrder',
      'Stock', 'BookStock', 'Product', 'Book',
      'Category', 'Expense', 'Supplier', 'Client',
      'Discount', 'CanalPlusCell', 'MobileMoneyCell',
      'UserWarehouse', 'ActivityLog'
    ]

    await prisma.$executeRawUnsafe('PRAGMA foreign_keys = OFF;')
    for (const table of tableNames) {
      try {
        await prisma.$executeRawUnsafe(`DELETE FROM "${table}";`)
      } catch { /* ignore */ }
    }
    await prisma.$executeRawUnsafe('PRAGMA foreign_keys = ON;')
    return true
  })

  ipcMain.handle('stock:analyze', () => stockAnalysis.analyzeAndGenerateOrders())

  ipcMain.handle('db:get-purchase-orders', () => purchaseOrderService.getAll())
  ipcMain.handle('db:get-purchase-order', (_e, id: string) => purchaseOrderService.getById(id))
  ipcMain.handle('db:update-purchase-order-status', (_e, id: string, status: string) => purchaseOrderService.updateStatus(id, status))
  ipcMain.handle('db:delete-purchase-order', (_e, id: string) => purchaseOrderService.delete(id))
  ipcMain.handle('db:export-purchase-order-pdf', (_e, id: string) => purchaseOrderService.generateOrderPdf(id))
  ipcMain.handle('db:export-purchase-order-excel', (_e, id: string) => purchaseOrderService.generateOrderExcel(id))
  ipcMain.handle('db:export-all-purchase-orders-excel', () => purchaseOrderService.generateAllOrdersExcel())
  ipcMain.handle('db:restock-product', async (_e, data) => {
    const d = data as {
      productId: string
      warehouseId: string
      quantity: number
      unitPrice: number
      considerAsPurchase: boolean
      paymentMethod?: string
    }

    const product = await prisma.product.findUnique({ where: { id: d.productId } })
    if (!product) throw new Error(`Produit ${d.productId} introuvable`)
    const warehouse = await prisma.warehouse.findUnique({ where: { id: d.warehouseId } })
    if (!warehouse) throw new Error(`Entrepôt ${d.warehouseId} introuvable`)

    const currentStock = await prisma.stock.findFirst({
      where: { productId: d.productId, warehouseId: d.warehouseId }
    })
    const qtyBefore = currentStock?.quantity ?? 0
    const qtyAfter = qtyBefore + d.quantity

    // Recalcul automatique du CMUP (Coût Moyen Unitaire Pondéré)
    if (d.considerAsPurchase && d.unitPrice > 0) {
      const currentCMUP = product.basePrice || d.unitPrice
      const totalQty = Math.max(1, qtyBefore + d.quantity)
      const newCMUP = Math.round(((qtyBefore * currentCMUP) + (d.quantity * d.unitPrice)) / totalQty * 100) / 100
      await prisma.product.update({
        where: { id: d.productId },
        data: { basePrice: newCMUP }
      })
    }

    if (d.considerAsPurchase) {
      try {
        await cashRegisterService.create({
          type: 'SORTIE',
          warehouseId: d.warehouseId,
          totalAmount: d.unitPrice * d.quantity,
          paymentMethod: d.paymentMethod || 'ESPECES',
          description: `Achat réapprovisionnement (${d.quantity} unité${d.quantity > 1 ? 's' : ''})`,
          lines: [{
            productId: d.productId,
            quantity: d.quantity,
            unitPrice: d.unitPrice,
            subTotal: d.unitPrice * d.quantity
          }]
        })
      } catch (err) {
        appLog('warn', 'restock', `CashTransaction failed, falling back to stock update: ${err}`)
        if (currentStock) {
          await prisma.stock.update({
            where: { id: currentStock.id },
            data: { quantity: { increment: d.quantity } }
          })
        } else {
          await prisma.stock.create({
            data: { productId: d.productId, warehouseId: d.warehouseId, quantity: d.quantity, alertLimit: 5 }
          })
        }
      }
    } else {
      if (currentStock) {
        await prisma.stock.update({
          where: { id: currentStock.id },
          data: { quantity: { increment: d.quantity } }
        })
      } else {
        await prisma.stock.create({
          data: {
            productId: d.productId,
            warehouseId: d.warehouseId,
            quantity: d.quantity,
            alertLimit: 5
          }
        })
      }
    }

    // Enregistrer le mouvement de stock dans le Stock Ledger
    await stockMovementService.recordMovement({
      productId: d.productId,
      warehouseId: d.warehouseId,
      type: d.considerAsPurchase ? 'ACHAT' : 'AJUSTEMENT',
      quantity: d.quantity,
      quantityBefore: qtyBefore,
      quantityAfter: qtyAfter,
      unitCost: d.unitPrice > 0 ? d.unitPrice : product.basePrice,
      referenceDoc: `REAPPRO-${product.barcode || d.productId.slice(0, 8)}`,
      notes: `Réapprovisionnement ${d.quantity} unité(s)${d.unitPrice > 0 ? ` au coût de ${d.unitPrice} FCFA` : ''}`
    })

    return productService.getById(d.productId)
  })
  ipcMain.handle('db:confirm-purchase', async (_e, data) => {
    const { warehouseId, supplierName, items } = data as {
      warehouseId: string
      supplierName: string
      items: { productId: string; quantity: number; unitPrice: number; productName: string; sendToMagasin?: boolean }[]
    }

    const warehouse = await prisma.warehouse.findUnique({ where: { id: warehouseId } })
    if (!warehouse) throw new Error(`Entrepôt ${warehouseId} introuvable`)

    const validItems = []
    for (const item of items) {
      const p = await prisma.product.findUnique({ where: { id: item.productId } })
      if (p) validItems.push(item)
    }
    if (validItems.length === 0) throw new Error('Aucun produit valide à réapprovisionner')

    const totalAmount = validItems.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0)
    let transaction: any = null
    try {
      transaction = await cashRegisterService.create({
        type: 'SORTIE',
        warehouseId,
        totalAmount,
        paymentMethod: 'ESPECES',
        description: `Achat fournisseur — ${supplierName} (${validItems.length} produit${validItems.length > 1 ? 's' : ''})`,
        lines: validItems.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          subTotal: i.quantity * i.unitPrice
        }))
      })
    } catch (err) {
      appLog('warn', 'purchase', `CashTransaction failed for purchase, updating stock directly: ${err}`)
      for (const item of validItems) {
        const stock = await prisma.stock.findFirst({
          where: { productId: item.productId, warehouseId }
        })
        if (stock) {
          await prisma.stock.update({ where: { id: stock.id }, data: { quantity: { increment: item.quantity } } })
        } else {
          await prisma.stock.create({
            data: { productId: item.productId, warehouseId, quantity: item.quantity, alertLimit: 5 }
          })
        }
      }
    }
    // Pour les articles envoyés au magasin : corriger le stock boutique → magasin
    const sendToMagasinItems = validItems.filter(i => i.sendToMagasin)
    if (sendToMagasinItems.length > 0) {
      await prisma!.$transaction(async (tx: any) => {
        for (const item of sendToMagasinItems) {
          const stock = await tx.stock.findFirst({
            where: { productId: item.productId, warehouseId }
          })
          if (stock) {
            await tx.stock.update({
              where: { id: stock.id },
              data: {
                quantity: { decrement: item.quantity },
                quantityMagasin: { increment: item.quantity }
              }
            })
            await tx.magasinTransaction.create({
              data: {
                productId: item.productId, warehouseId,
                type: 'ENTREE', quantity: item.quantity
              }
            })
          }
        }
      })
    }
    // Mettre à jour le statut du bon de commande correspondant
    try {
      const pendingOrder = await prisma.purchaseOrder.findFirst({
        where: { supplierName, status: 'EN_ATTENTE' },
        orderBy: { createdAt: 'desc' }
      })
      if (pendingOrder) {
        await prisma.purchaseOrder.update({
          where: { id: pendingOrder.id },
          data: { status: 'CONFIRME', totalAmount }
        })
      }
    } catch (err) {
      appLog('warn', 'purchase', `Failed to update purchase order status: ${err}`)
    }
    return transaction
  })

  // Magasin (stock arrière)
  ipcMain.handle('magasin:get-stock', async (_e, warehouseId: string) => {
    const stocks = await prisma.stock.findMany({
      where: { warehouseId, quantityMagasin: { gt: 0 } },
      include: { product: { include: { supplier: true, category: true } }, warehouse: true },
      orderBy: { product: { name: 'asc' } }
    })
    return stocks
  })

  ipcMain.handle('magasin:transfer-to-boutique', async (_e, data: {
    productId: string; warehouseId: string; quantity: number
  }) => {
    await prisma!.$transaction(async (tx: any) => {
      const stock = await tx.stock.findFirst({
        where: { productId: data.productId, warehouseId: data.warehouseId }
      })
      if (!stock || stock.quantityMagasin < data.quantity) throw new Error('Stock magasin insuffisant')
      await tx.stock.update({
        where: { id: stock.id },
        data: {
          quantityMagasin: { decrement: data.quantity },
          quantity: { increment: data.quantity }
        }
      })
      await tx.magasinTransaction.create({
        data: {
          productId: data.productId,
          warehouseId: data.warehouseId,
          type: 'SORTIE',
          quantity: data.quantity
        }
      })
    })
    return productService.getById(data.productId)
  })

  ipcMain.handle('magasin:send-to-magasin', async (_e, data: {
    productId: string; warehouseId: string; quantity: number
  }) => {
    await prisma!.$transaction(async (tx: any) => {
      const stock = await tx.stock.findFirst({
        where: { productId: data.productId, warehouseId: data.warehouseId }
      })
      if (!stock) {
        await tx.stock.create({
          data: {
            productId: data.productId,
            warehouseId: data.warehouseId,
            quantity: 0,
            quantityMagasin: data.quantity,
            alertLimit: 5
          }
        })
      } else {
        if (stock.quantity < data.quantity) throw new Error('Stock boutique insuffisant')
        await tx.stock.update({
          where: { id: stock.id },
          data: {
            quantity: { decrement: data.quantity },
            quantityMagasin: { increment: data.quantity }
          }
        })
      }
      await tx.magasinTransaction.create({
        data: {
          productId: data.productId,
          warehouseId: data.warehouseId,
          type: 'ENTREE',
          quantity: data.quantity
        }
      })
    })
    return productService.getById(data.productId)
  })

  ipcMain.handle('magasin:receive-purchase', async (_e, data: {
    productId: string; warehouseId: string; quantity: number; unitPrice: number; paymentMethod?: string
  }) => {
    await prisma!.$transaction(async (tx: any) => {
      // Comptabilité : enregistre la sortie de caisse pour l'achat
      await tx.cashTransaction.create({
        data: {
          type: 'SORTIE',
          totalAmount: data.unitPrice * data.quantity,
          paymentMethod: data.paymentMethod || 'ESPECES',
          description: `Achat → Magasin (${data.quantity} unité${data.quantity > 1 ? 's' : ''})`,
          category: 'GENERAL',
          warehouseId: data.warehouseId,
          lines: {
            create: [{
              productId: data.productId,
              quantity: data.quantity,
              unitPrice: data.unitPrice,
              subTotal: data.unitPrice * data.quantity
            }]
          }
        }
      })
      // Mettre à jour le stock : directement dans magasin
      const stock = await tx.stock.findFirst({
        where: { productId: data.productId, warehouseId: data.warehouseId }
      })
      if (stock) {
        await tx.stock.update({
          where: { id: stock.id },
          data: { quantityMagasin: { increment: data.quantity } }
        })
      } else {
        await tx.stock.create({
          data: {
            productId: data.productId,
            warehouseId: data.warehouseId,
            quantity: 0,
            quantityMagasin: data.quantity,
            alertLimit: 5
          }
        })
      }
      await tx.magasinTransaction.create({
        data: {
          productId: data.productId,
          warehouseId: data.warehouseId,
          type: 'ENTREE',
          quantity: data.quantity
        }
      })
    })
    return productService.getById(data.productId)
  })

  // Catégories
  ipcMain.handle('db:get-categories', (_e, warehouseId?: string) => categoryService.getAll(warehouseId))
  ipcMain.handle('db:create-category', (_e, d) => categoryService.create(d))
  ipcMain.handle('db:update-category', (_e, id: string, d) => categoryService.update(id, d))
  ipcMain.handle('db:delete-category', (_e, id: string) => categoryService.delete(id))
  ipcMain.handle('db:delete-all-categories', () => categoryService.deleteAll())
  ipcMain.handle('db:delete-empty-categories', () => categoryService.deleteEmpty())
  ipcMain.handle('db:clear-category-products', (_e, id: string) => categoryService.clearProducts(id))

  // Dépenses
  ipcMain.handle('db:get-expenses', (_e, warehouseId?: string) => expenseService.getAll(warehouseId))
  ipcMain.handle('db:create-expense', async (_e, d) => {
    const raw = d as Record<string, any>
    const warehouseId = raw.warehouseId
    const paymentMethod = raw.paymentMethod
    const expenseData: Record<string, any> = {}
    for (const key of ['title', 'amount', 'category', 'description', 'date']) {
      if (key in raw) expenseData[key] = raw[key]
    }
    const expense = await expenseService.create(expenseData as any)
    if (warehouseId) {
      await cashRegisterService.create({
        type: 'SORTIE',
        warehouseId,
        totalAmount: expenseData.amount,
        paymentMethod: paymentMethod || 'ESPECES',
        description: `Dépense — ${expenseData.title} (${expenseData.category})`,
        lines: []
      })
    }
    return expense
  })
  ipcMain.handle('db:delete-expense', (_e, id: string) => expenseService.delete(id))

  // Cahier de caisse
  ipcMain.handle('db:get-real-time-accounting', (_e, wid: string) => cashRegisterService.getSummary(wid))
  ipcMain.handle('db:get-cash-transactions', (_e, wid: string) => cashRegisterService.getTransactions(wid))
  ipcMain.handle('db:create-cash-transaction', (_e, d) => cashRegisterService.create(d))
  ipcMain.handle('db:delete-cash-transaction', (_e, id: string) => cashRegisterService.delete(id))
  ipcMain.handle('print:export-cash-report', (_e, data) => reportService.exportCashReport(data))

  // Remises
  ipcMain.handle('db:get-discounts', (_e, warehouseId?: string) => discountService.getAll(warehouseId))

  // AppSettings
  ipcMain.handle('db:get-app-settings', () => appSettingsService.get())
  ipcMain.handle('db:update-app-settings', (_e, d) => appSettingsService.update(d))

  // Rapports mensuels
  ipcMain.handle('db:get-monthly-report', (_e, warehouseId: string, year: number, month: number) =>
    monthlyReportService.getReportData(warehouseId, year, month)
  )

  // Mobile Money
  ipcMain.handle('db:get-mobile-money-cells', (_e, wid: string, month: string) => mobileMoneyService.getCells(wid, month))
  ipcMain.handle('db:save-mobile-money-cells', (_e, wid: string, month: string, cells) => mobileMoneyService.saveCells(wid, month, cells))

  // Canal+
  ipcMain.handle('db:get-canal-plus-cells', (_e, wid: string, month: string) => canalPlusService.getCells(wid, month))
  ipcMain.handle('db:save-canal-plus-cells', (_e, wid: string, month: string, cells) => canalPlusService.saveCells(wid, month, cells))

  const FORMULE_TO_COL: Record<string, string> = {
    'Access': 'reabonnementAccess',
    'Évasion': 'reabonnementEvasion',
    'Access+': 'reabonnementAccessPlus',
    'Tout Canal': 'reabonnementToutCanal',
    'Autres': 'reabonnementOthers',
  }

  ipcMain.handle('db:create-canal-plus-sale', async (_e, data) => {
    const sale = await canalPlusSaleService.create(data)

    // Créer l'entrée dans le cahier de caisse (catégorie CANAL_PLUS)
    await cashRegisterService.create({
      type: 'ENTREE',
      warehouseId: data.warehouseId,
      totalAmount: data.amount,
      paymentMethod: 'ESPECES',
      description: `Canal+ — ${data.clientName} (${data.formule})`,
      category: 'CANAL_PLUS',
      lines: []
    })

    // Mapper le type et la formule vers la colonne correspondante du tableau
    const today = new Date()
    const month = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
    const day = today.getDate()
    const col = data.saleType === 'abonnement' ? 'abonnement' : (FORMULE_TO_COL[data.formule] ?? 'abonnement')
    const existing = await prisma.canalPlusCell.findUnique({
      where: { warehouseId_month_day_col: { warehouseId: data.warehouseId, month, day, col } }
    })
    const newValue = (existing?.value ?? 0) + data.amount
    await prisma.canalPlusCell.upsert({
      where: { warehouseId_month_day_col: { warehouseId: data.warehouseId, month, day, col } },
      create: { warehouseId: data.warehouseId, month, day, col, value: newValue },
      update: { value: newValue }
    })

    return sale
  })

  ipcMain.handle('db:get-canal-plus-sales', (_e, wid: string, search?: string) => canalPlusSaleService.getAll(wid, search))
  ipcMain.handle('db:get-canal-plus-balance', (_e, wid: string) => cashRegisterService.getCanalPlusBalance(wid))
  ipcMain.handle('db:get-canal-plus-daily-balance', (_e, wid: string) => cashRegisterService.getCanalPlusDailyBalance(wid))

  // Services (photocopie, impression, scan)
  ipcMain.handle('db:get-service-sales', async (_e, wid: string, search?: string) => {
    const sales = await serviceSaleService.getAll(wid, search)
    return sales
  })
  ipcMain.handle('db:create-service-sale', async (_e, data) => {
    const sale = await serviceSaleService.create(data)

    await cashRegisterService.create({
      type: 'ENTREE',
      warehouseId: data.warehouseId,
      totalAmount: data.totalAmount,
      paymentMethod: 'ESPECES',
      description: `Service ${data.serviceType} — ${data.description || data.serviceType}${data.clientName ? ` (${data.clientName})` : ''}`,
      category: 'SERVICES',
      lines: []
    })

    return sale
  })

  // Export Excel stylisé (via exceljs)
  ipcMain.handle('export:rapport-excel', async (_e, params) => exportRapportExcel(params))
  ipcMain.handle('export:products-excel', async (_e, warehouseId?: string) => {
    const products = await productService.getAll(warehouseId)
    return exportProductsExcel(products)
  })
  ipcMain.handle('export:mobile-money-excel', async (_e, params) => exportMobileMoneyExcel(params))
  ipcMain.handle('export:canal-plus-excel', async (_e, params) => exportCanalPlusExcel(params))

  // Importation Excel dynamique
  ipcMain.handle('import:select-file', async () => {
    const result = await dialog.showOpenDialog({
      title: 'Sélectionner un catalogue Excel',
      filters: [
        { name: 'Fichiers Excel (.xlsx, .xls)', extensions: ['xlsx', 'xls'] }
      ],
      properties: ['openFile']
    })
    if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
      return { canceled: true }
    }
    const filePath = result.filePaths[0]
    return { canceled: false, filePath, fileName: basename(filePath) }
  })

  ipcMain.handle('import:preview-excel', async (_e, filePath: string, sheetName?: string) => {
    return excelImportService.previewExcel(filePath, sheetName)
  })

  ipcMain.handle('import:execute-excel', async (e, params: any) => {
    return excelImportService.executeImport(params, (progress) => {
      try {
        if (!e.sender.isDestroyed()) {
          e.sender.send('import:progress', progress)
        }
      } catch {}
    })
  })

  // Export PDF générique (tableau HTML → PDF)
  ipcMain.handle('export:table-pdf', async (_e, html: string, filename: string) => {
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      throw new Error('Nom de fichier invalide')
    }
    const pdfWindow = new BrowserWindow({ show: false, webPreferences: { sandbox: true } })
    await pdfWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`)
    const pdfBuf = await pdfWindow.webContents.printToPDF({ printBackground: true, landscape: true })
    pdfWindow.close()
    const dir = join(homedir(), 'Desktop')
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
    const path = join(dir, filename)
    writeFileSync(path, pdfBuf)
    return path
  })

  // ── Librairie IPC handlers ─────────────────────────────────────────────
  ipcMain.handle('librairie:get-class-levels', async (_e, system?: string) => librairieService.getClassLevels(system))
  ipcMain.handle('librairie:get-subjects', async (_e, system?: string) => librairieService.getSubjects(system))
  ipcMain.handle('librairie:get-books', async (_e, classLevelId?: string) => librairieService.getBooks(classLevelId))
  ipcMain.handle('librairie:get-book', async (_e, id: string) => librairieService.getBook(id))
  ipcMain.handle('librairie:create-book', async (_e, data) => librairieService.createBook(data))
  ipcMain.handle('librairie:update-book', async (_e, id: string, data) => librairieService.updateBook(id, data))
  ipcMain.handle('librairie:delete-book', async (_e, id: string) => librairieService.deleteBook(id))
  ipcMain.handle('librairie:get-book-stocks', async (_e, warehouseId: string, classLevelId?: string) => librairieService.getBookStocks(warehouseId, classLevelId))
  ipcMain.handle('librairie:create-book-stock', async (_e, data) => librairieService.createBookStock(data))
  ipcMain.handle('librairie:update-book-stock', async (_e, id: string, data) => librairieService.updateBookStock(id, data))
  ipcMain.handle('librairie:create-book-sale', async (_e, data) => librairieSaleService.create(data))
  ipcMain.handle('librairie:get-book-sales', async (_e, warehouseId: string) => librairieSaleService.getAll(warehouseId))
  ipcMain.handle('librairie:get-student-totals', async (_e, warehouseId: string, classLevelId: string) => librairieSaleService.getStudentTotals(warehouseId, classLevelId))
  ipcMain.handle('librairie:restock-book', async (_e, data: { bookId: string; warehouseId: string; quantity: number; purchasePrice?: number; editor?: string }) =>
    librairieService.restockBook(data.bookId, data.warehouseId, data.quantity, data.purchasePrice, data.editor))
  ipcMain.handle('librairie:bulk-restock-books', async (_e, data: any) =>
    librairieService.bulkRestockBooks(data))
  ipcMain.handle('db:bulk-restock-products', async (_e, data: any) =>
    productService.bulkRestockProducts(data))
  ipcMain.handle('librairie:search-students', async (_e, query: string, warehouseId: string) =>
    librairieSaleService.searchStudents(query, warehouseId))
  ipcMain.handle('librairie:get-student-summary', async (_e, studentName: string, classLevelId: string, warehouseId: string) =>
    librairieSaleService.getStudentSummary(studentName, classLevelId, warehouseId))
  ipcMain.handle('librairie:update-book-alert-limit', async (_e, bookId: string, warehouseId: string, alertLimit: number) =>
    librairieService.updateBookAlertLimit(bookId, warehouseId, alertLimit))
  ipcMain.handle('librairie:seed-official-curriculum', async (_e, warehouseId?: string) =>
    curriculumSeedService.seedOfficialCurriculum(warehouseId))

  // Ouvrir un fichier ou dossier
  ipcMain.handle('shell:open-file', async (_e, filePath: string) => {
    if (!filePath) return
    const resolved = resolve(filePath).replace(/\\/g, '/').toLowerCase()
    const allowedDirs = [
      app.getPath('desktop'),
      app.getPath('documents'),
      app.getPath('downloads'),
      app.getPath('userData'),
      join(homedir(), 'Desktop')
    ]
    const isAllowed = allowedDirs.some(dir => resolved.startsWith(resolve(dir).replace(/\\/g, '/').toLowerCase()))
    if (!isAllowed) throw new Error('Accès refusé : chemin non autorisé')
    await shell.openPath(filePath)
  })

  // Ouvrir une URL externe (ex: WhatsApp, liens web)
  ipcMain.handle('shell:open-external', async (_e, url: string) => {
    if (url && (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('mailto:') || url.startsWith('whatsapp:'))) {
      await shell.openExternal(url)
    }
  })

  // Révéler un fichier dans l'explorateur de fichiers
  ipcMain.handle('shell:show-item-in-folder', async (_e, filePath: string) => {
    if (!filePath) return
    shell.showItemInFolder(filePath)
  })

  // Obtenir le chemin du dossier des bons de commande sur le Bureau
  ipcMain.handle('db:get-orders-dir', async () => {
    const desktopPath = app.getPath('desktop')
    const dir = join(desktopPath, 'bons-de-commande')
    const { mkdir } = await import('node:fs/promises')
    await mkdir(dir, { recursive: true })
    return dir
  })

  // Lire un fichier en base64 pour prévisualisation (PDF, images)
  ipcMain.handle('file:read-base64', async (_e, filePath: string) => {
    if (!filePath || !existsSync(filePath)) return null
    const resolved = resolve(filePath).replace(/\\/g, '/').toLowerCase()
    const allowedDirs = [
      app.getPath('desktop'),
      app.getPath('documents'),
      app.getPath('downloads'),
      app.getPath('userData'),
      join(homedir(), 'Desktop')
    ]
    const isAllowed = allowedDirs.some(dir => resolved.startsWith(resolve(dir).replace(/\\/g, '/').toLowerCase()))
    if (!isAllowed) throw new Error('Accès refusé : chemin non autorisé')
    const buffer = readFileSync(filePath)
    const base64 = buffer.toString('base64')
    return `data:application/pdf;base64,${base64}`
  })

  // Cron job automatique toutes les 5 minutes pour analyser le stock et générer des bons de commande si nécessaire
  setInterval(async () => {
    try {
      appLog('INFO', 'cron', 'Démarrage du scan automatique de stock (toutes les 5 minutes)...')
      const result = await stockAnalysis.analyzeAndGenerateOrders()
      if (result.orders && result.orders.length > 0) {
        appLog('INFO', 'cron', `Scan automatique terminé : ${result.orders.length} produit(s) en alerte. Bon de commande généré. Path: ${result.pdfPath}`)
      } else {
        appLog('INFO', 'cron', 'Scan automatique terminé : aucun produit en alerte de stock.')
      }
    } catch (err) {
      appLog('ERROR', 'cron', `Erreur lors du scan automatique de stock : ${err instanceof Error ? err.message : String(err)}`)
    }
  }, 5 * 60 * 1000)
}

function createSplashWindow(): void {
  splashWindow = new BrowserWindow({
    width: 400,
    height: 400,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    center: true,
    show: true,
    webPreferences: {
      sandbox: false
    }
  })

  let logoBase64 = ''
  try {
    const logoPath = join(app.getAppPath(), 'out/renderer/iventello.png')
    logoBase64 = readFileSync(logoPath).toString('base64')
  } catch { /* ignorer */ }

  const splashHtml = `
    <html>
      <body style="margin: 0; display: flex; align-items: center; justify-content: center; height: 100vh; background: transparent; font-family: sans-serif;">
        <div style="text-align: center; background: white; padding: 40px; border-radius: 24px; shadow: 0 10px 25px rgba(0,0,0,0.1); display: flex; flex-direction: column; align-items: center;">
          <img src="data:image/png;base64,${logoBase64}" style="width: 120px; height: 120px; margin-bottom: 20px;" />
          <div style="font-weight: bold; color: #333; font-size: 20px; margin-bottom: 10px;">iventello</div>
          <div style="color: #666; font-size: 14px;">Initialisation de votre gestionnaire...</div>
          <div style="margin-top: 20px; width: 200px; height: 4px; background: #eee; border-radius: 2px; overflow: hidden;">
            <div style="width: 40%; height: 100%; background: #3b82f6; border-radius: 2px; animation: loading 2s infinite ease-in-out;"></div>
          </div>
        </div>
        <style>
          @keyframes loading {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(200%); }
          }
        </style>
      </body>
    </html>
  `
  splashWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(splashHtml)}`)
}

function createWindow(): void {
  appLog('INFO', 'window', 'Création de la fenêtre principale')
  const iconCandidates = [
    join(__dirname, '../renderer/favicon.ico'),
    join(app.getAppPath(), 'out/renderer/favicon.ico'),
    join(process.resourcesPath, 'app', 'out', 'renderer', 'favicon.ico'),
    join(app.getAppPath(), 'build/icon.ico'),
    join(process.resourcesPath, 'build/icon.ico')
  ]
  let icon: Electron.NativeImage | undefined
  for (const p of iconCandidates) {
    if (existsSync(p)) { icon = nativeImage.createFromPath(p); break }
  }

  mainWindow = new BrowserWindow({
    width: 1280, height: 800,
    show: false,
    backgroundColor: '#ffffff',
    icon,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true, nodeIntegration: false, sandbox: false
    }
  })

  mainWindow.once('ready-to-show', () => {
    if (splashWindow) {
      splashWindow.close()
      splashWindow = null
    }
    mainWindow?.show()
    mainWindow?.focus()
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  initAutoUpdater(mainWindow)
}

protocol.registerSchemesAsPrivileged([
  { scheme: 'local-file', privileges: { bypassCSP: true, stream: true, supportFetchAPI: true, corsEnabled: true } }
])

// ── Stabilité GPU & rendu ────────────────────────────────────────────────
// Désactive l'accélération GPU pour éviter les crashs 0x80000003 (STATUS_BREAKPOINT)
// causés par l'initialisation Direct3D/Vulkan sur certaines configs Windows
app.disableHardwareAcceleration()

// Switches Chromium — regroupés en un seul appel chacun
app.commandLine.appendSwitch('disable-features', 'UseOzonePlatform,ImeService,HardwareMediaKeyHandling')
app.commandLine.appendSwitch('disable-gpu')
app.commandLine.appendSwitch('disable-gpu-compositing')
app.commandLine.appendSwitch('disable-software-rasterizer')
app.commandLine.appendSwitch('no-sandbox')

startupLog('Switches appliqués, app.whenReady() en attente...')

app.whenReady().then(async () => {
  startupLog('app.whenReady() déclenché')

  protocol.handle('local-file', (request) => {
    const prefix = 'local-file://'
    let raw = decodeURIComponent(request.url.slice(prefix.length))

    if (process.platform === 'win32') {
      // Nettoyer tous les slashes initiaux éventuels : "/C:/..." ou "///C:/..." -> "C:/..."
      raw = raw.replace(/^\/+/, '')
      // Si Chromium a retiré les deux-points du lecteur Windows : "c/Users/..." -> "c:/Users/..."
      if (/^[a-zA-Z]\//.test(raw)) {
        raw = raw[0] + ':/' + raw.slice(2)
      }
    } else {
      if (!raw.startsWith('/')) raw = '/' + raw
    }

    const resolved = resolve(raw)
    const ext = extname(resolved).toLowerCase()
    const mimeTypes: Record<string, string> = {
      '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
      '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml',
      '.ico': 'image/x-icon', '.bmp': 'image/bmp'
    }
    const isImage = Object.prototype.hasOwnProperty.call(mimeTypes, ext)

    const allowedDirs = [
      app.getPath('userData'),
      app.getPath('documents'),
      app.getPath('desktop'),
      app.getPath('downloads'),
      app.getPath('pictures'),
      app.getPath('home'),
      join(app.getPath('userData'), 'logos'),
      join(app.getPath('userData'), 'product-images'),
      process.cwd()
    ]

    const resolvedLower = resolved.toLowerCase()
    const isAllowed = isImage || allowedDirs.some(dir => resolvedLower.startsWith(resolve(dir).toLowerCase()))

    if (!isAllowed) {
      appLog('WARN', 'protocol', `Accès refusé au fichier local : ${resolved}`)
      return new Response('Accès refusé', { status: 403 })
    }

    try {
      if (!existsSync(resolved)) {
        appLog('WARN', 'protocol', `Fichier image introuvable : ${resolved}`)
        return new Response('Fichier introuvable', { status: 404 })
      }
      const data = readFileSync(resolved)
      return new Response(data, {
        headers: {
          'Content-Type': mimeTypes[ext] || 'application/octet-stream',
          'Cache-Control': 'no-cache'
        }
      })
    } catch (err: any) {
      appLog('ERROR', 'protocol', `Erreur lecture image ${resolved}: ${err.message}`)
      return new Response('Erreur de lecture', { status: 500 })
    }
  })

  startupLog('createSplashWindow()...')
  createSplashWindow()

  startupLog('initDatabase()...')
  await initDatabase()
  startupLog('initDatabase() terminé')

  registerIpcHandlers()
  startupLog('IPC handlers enregistrés')

  createWindow()
  startupLog('createWindow() terminé — app prête')

  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() })
}).catch((error) => {
  startupLog(`ERREUR CRITIQUE: ${error.message}\n${error.stack}`)
  try {
    dialog.showErrorBox('Erreur au démarrage', `${error.message}\n\n${error.stack}`)
  } catch (_) {}
  app.quit()
})

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })

app.on('will-quit', async () => { if (prisma) await prisma.$disconnect() })
