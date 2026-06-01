import { app, BrowserWindow, ipcMain, dialog, protocol, net } from 'electron'
import { join, extname } from 'node:path'
import { copyFileSync, mkdirSync, existsSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { PrismaClient } from '@prisma/client'
import { createProductService } from './services/productService'
import { createWarehouseService } from './services/warehouseService'
import { createPrinterService } from './services/printerService'
import { createReportService } from './services/reportService'
import { createClientService } from './services/clientService'
import { createSupplierService } from './services/supplierService'
import { createStockAnalysisService } from './services/stockAnalysisService'
import { createCategoryService } from './services/categoryService'
import { createExpenseService } from './services/expenseService'
import { createCashRegisterService } from './services/cashRegisterService'
import { createMobileMoneyService } from './services/mobileMoneyService'
import { createCanalPlusService } from './services/canalPlusService'
import { createAppSettingsService } from './services/appSettingsService'
import { createMonthlyReportService } from './services/monthlyReportService'
import { exportRapportExcel, exportMobileMoneyExcel, exportCanalPlusExcel } from './services/excelExportService'
import { initAutoUpdater } from './services/autoUpdaterService'

let prisma: PrismaClient | null = null
let mainWindow: BrowserWindow | null = null

async function initDatabase(): Promise<void> {
  const userDataPath = app.getPath('userData')
  if (!existsSync(userDataPath)) {
    mkdirSync(userDataPath, { recursive: true })
  }
  const dbPath = join(userDataPath, 'database.db')
  
  // En production, on doit indiquer à Prisma où se trouve l'engine
  // car il ne peut pas être exécuté depuis l'archive ASAR.
  if (app.isPackaged) {
    const platform = process.platform
    let engineName = ''
    if (platform === 'win32') engineName = 'query_engine-windows.dll.node'
    else if (platform === 'darwin') engineName = 'query_engine-darwin.dylib.node'
    else engineName = 'query_engine-debian-openssl-3.0.x.so.node' // ou linux-musl selon l'env

    // Le chemin vers l'engine déballé par electron-builder (asarUnpack)
    const enginePath = join(
      process.resourcesPath,
      'app.asar.unpacked',
      'node_modules',
      '@prisma',
      'engines',
      engineName
    )
    process.env.PRISMA_QUERY_ENGINE_LIBRARY = enginePath
  }

  process.env.DATABASE_URL = `file:${dbPath}`

  prisma = new PrismaClient({
    log: ['warn', 'error'],
  })

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Warehouse" (
      "id" TEXT PRIMARY KEY, "name" TEXT NOT NULL, "location" TEXT, "logoUrl" TEXT, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`)
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Supplier" (
      "id" TEXT PRIMARY KEY, "name" TEXT NOT NULL, "email" TEXT, "phone" TEXT, "address" TEXT, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`)
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Client" (
      "id" TEXT PRIMARY KEY, "name" TEXT NOT NULL, "email" TEXT, "phone" TEXT, "address" TEXT, "notes" TEXT, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`)
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Category" (
      "id" TEXT PRIMARY KEY, "name" TEXT NOT NULL UNIQUE, "description" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`)
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Product" (
      "id" TEXT PRIMARY KEY, "barcode" TEXT NOT NULL UNIQUE, "name" TEXT NOT NULL,
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
      FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id"),
      FOREIGN KEY ("categoryId") REFERENCES "Category"("id")
    )`)
  // Migration conditionnelle : ajouter categoryId si la colonne n'existe pas encore
  try {
    const cols = await prisma.$queryRawUnsafe<{ name: string }[]>(`PRAGMA table_info("Product")`)
    if (!cols.some((c: any) => c.name === 'categoryId')) {
      await prisma.$executeRawUnsafe(`ALTER TABLE "Product" ADD COLUMN "categoryId" TEXT REFERENCES "Category"("id")`)
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
      "quantity" INTEGER NOT NULL DEFAULT 0, "alertLimit" INTEGER NOT NULL DEFAULT 5, "shelfLocation" TEXT,
      FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE,
      FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE CASCADE,
      UNIQUE ("productId", "warehouseId")
    )`)
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Sale" (
      "id" TEXT PRIMARY KEY, "warehouseId" TEXT NOT NULL, "clientId" TEXT,
      "subTotal" REAL NOT NULL, "vatTotal" REAL NOT NULL DEFAULT 0, "discount" REAL NOT NULL DEFAULT 0,
      "finalTotal" REAL NOT NULL, "paymentMethod" TEXT NOT NULL DEFAULT 'Cash',
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id"),
      FOREIGN KEY ("clientId") REFERENCES "Client"("id")
    )`)
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "SaleItem" (
      "id" TEXT PRIMARY KEY, "saleId" TEXT NOT NULL, "productId" TEXT NOT NULL,
      "quantity" INTEGER NOT NULL, "unitPrice" REAL NOT NULL,
      FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE CASCADE,
      FOREIGN KEY ("productId") REFERENCES "Product"("id")
    )`)
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Expense" (
      "id" TEXT PRIMARY KEY, "title" TEXT NOT NULL, "amount" REAL NOT NULL,
      "category" TEXT NOT NULL, "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "description" TEXT
    )`)

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "CashTransaction" (
      "id" TEXT PRIMARY KEY, "type" TEXT NOT NULL, "totalAmount" REAL NOT NULL,
      "paymentMethod" TEXT NOT NULL DEFAULT 'ESPECES', "description" TEXT,
      "warehouseId" TEXT NOT NULL, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id")
    )`)
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "CashTransactionLine" (
      "id" TEXT PRIMARY KEY, "transactionId" TEXT NOT NULL, "productId" TEXT NOT NULL,
      "quantity" INTEGER NOT NULL, "unitPrice" REAL NOT NULL, "subTotal" REAL NOT NULL,
      FOREIGN KEY ("transactionId") REFERENCES "CashTransaction"("id") ON DELETE CASCADE,
      FOREIGN KEY ("productId") REFERENCES "Product"("id")
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
    CREATE TABLE IF NOT EXISTS "AppSettings" (
      "id" TEXT PRIMARY KEY, "companyName" TEXT NOT NULL DEFAULT 'Mon Entreprise',
      "companyNui" TEXT, "companyBp" TEXT, "companyAddress" TEXT,
      "companyPhones" TEXT, "companyEmail" TEXT,
      "companyLogo" TEXT, "companyDescription" TEXT,
      "invoiceFooter" TEXT, "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`)

  // Migrations conditionnelles : Warehouse
  try {
    const whCols = await prisma.$queryRawUnsafe<{ name: string }[]>(`PRAGMA table_info("Warehouse")`)
    if (!whCols.some((c: any) => c.name === 'logoUrl')) {
      await prisma.$executeRawUnsafe(`ALTER TABLE "Warehouse" ADD COLUMN "logoUrl" TEXT`)
    }
    if (!whCols.some((c: any) => c.name === 'mobileMoneyEnabled')) {
      await prisma.$executeRawUnsafe(`ALTER TABLE "Warehouse" ADD COLUMN "mobileMoneyEnabled" INTEGER NOT NULL DEFAULT 0`)
    }
  } catch { /* ignorer */ }

  // Migration : AppSettings
  try {
    const appCols = await prisma.$queryRawUnsafe<{ name: string }[]>(`PRAGMA table_info("AppSettings")`)
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
}

function registerIpcHandlers(): void {
  if (!prisma) throw new Error('Base de données non initialisée')
  const productService = createProductService(prisma)
  const warehouseService = createWarehouseService(prisma)
  const printerService = createPrinterService()
  const reportService = createReportService()
  const clientService = createClientService(prisma)
  const supplierService = createSupplierService(prisma)
  const stockAnalysis = createStockAnalysisService(prisma)
  const categoryService = createCategoryService(prisma)
  const expenseService = createExpenseService(prisma)
  const cashRegisterService = createCashRegisterService(prisma)
  const appSettingsService = createAppSettingsService(prisma)
  const monthlyReportService = createMonthlyReportService(prisma)
  const mobileMoneyService = createMobileMoneyService(prisma)
  const canalPlusService = createCanalPlusService(prisma)

  ipcMain.handle('db:get-products', () => productService.getAll())
  ipcMain.handle('db:get-product-by-barcode', (_e, b: string) => productService.getByBarcode(b))
  ipcMain.handle('db:create-product', (_e, d) => {
    const data = { ...d }
    delete data.supplierId
    delete data.categoryId
    return productService.create(data)
  })
  ipcMain.handle('db:update-product', (_e, id: string, d) => productService.update(id, d))
  ipcMain.handle('db:delete-product', (_e, id: string) => productService.delete(id))

  ipcMain.handle('db:create-sale', async (_e, data) => {
    const { items, ...saleData } = data
    const sale = await prisma!.sale.create({
      data: { ...saleData, items: { create: items } },
      include: { items: true, client: true, warehouse: true }
    })
    // Créer automatiquement l'entrée dans le cahier de caisse
    const transaction = await cashRegisterService.create({
      type: 'ENTREE',
      warehouseId: saleData.warehouseId,
      totalAmount: saleData.finalTotal,
      paymentMethod: saleData.paymentMethod || 'ESPECES',
      description: `Vente — ${saleData.clientId ? 'client rattaché' : 'client anonyme'}`,
      lines: (items as { productId: string; quantity: number; unitPrice: number }[]).map(
        (item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          subTotal: item.quantity * item.unitPrice
        })
      )
    })
    ;(sale as any).cashTransactionId = transaction.id
    return sale
  })

  ipcMain.handle('db:get-sales', async (_e, clientId?: string) => {
    const where = clientId ? { clientId } : {}
    return prisma!.sale.findMany({ where, include: { items: { include: { product: true } }, client: true, warehouse: true }, orderBy: { createdAt: 'desc' } })
  })

  ipcMain.handle('db:get-warehouses', () => warehouseService.getAll())
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

  ipcMain.handle('file:save-product-image', async (_e, sourcePath: string, productId: string) => {
    const imagesDir = join(app.getPath('userData'), 'product-images')
    if (!existsSync(imagesDir)) mkdirSync(imagesDir, { recursive: true })
    const ext = extname(sourcePath)
    const dest = join(imagesDir, `${productId}${ext}`)
    copyFileSync(sourcePath, dest)
    return dest
  })

  ipcMain.handle('db:get-stock-alerts', () => productService.getStockAlerts())

  ipcMain.handle('printer:list', () => printerService.listPrinters())
  ipcMain.handle('print:receipt', (_e, data) => printerService.printReceipt(data))
  ipcMain.handle('print:export-report', (_e, data) => reportService.exportStockReport(data))

  ipcMain.handle('db:get-clients', () => clientService.getAllWithStats())
  ipcMain.handle('db:get-client', (_e, id: string) => clientService.getByIdWithSales(id))
  ipcMain.handle('db:create-client', (_e, d) => clientService.create(d))
  ipcMain.handle('db:update-client', (_e, id: string, d) => clientService.update(id, d))
  ipcMain.handle('db:delete-client', (_e, id: string) => clientService.delete(id))

  ipcMain.handle('db:get-suppliers', () => supplierService.getAll())
  ipcMain.handle('db:create-supplier', (_e, d) => supplierService.create(d))
  ipcMain.handle('db:update-supplier', (_e, id: string, d) => supplierService.update(id, d))
  ipcMain.handle('db:delete-supplier', (_e, id: string) => supplierService.delete(id))

  ipcMain.handle('stock:analyze', () => stockAnalysis.analyzeAndGenerateOrders())
  ipcMain.handle('db:restock-product', async (_e, data) => {
    const d = data as {
      productId: string
      warehouseId: string
      quantity: number
      unitPrice: number
      considerAsPurchase: boolean
      paymentMethod?: string
    }
    if (d.considerAsPurchase) {
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
    } else {
      const stock = await prisma.stock.findFirst({
        where: { productId: d.productId, warehouseId: d.warehouseId }
      })
      if (stock) {
        await prisma.stock.update({
          where: { id: stock.id },
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
    return productService.getById(d.productId)
  })
  ipcMain.handle('db:confirm-purchase', async (_e, data) => {
    const { warehouseId, supplierName, items } = data as {
      warehouseId: string
      supplierName: string
      items: { productId: string; quantity: number; unitPrice: number; productName: string }[]
    }
    const totalAmount = items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0)
    return cashRegisterService.create({
      type: 'SORTIE',
      warehouseId,
      totalAmount,
      paymentMethod: 'ESPECES',
      description: `Achat fournisseur — ${supplierName} (${items.length} produit${items.length > 1 ? 's' : ''})`,
      lines: items.map((i) => ({
        productId: i.productId,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        subTotal: i.quantity * i.unitPrice
      }))
    })
  })

  // Catégories
  ipcMain.handle('db:get-categories', () => categoryService.getAll())
  ipcMain.handle('db:create-category', (_e, d) => categoryService.create(d))
  ipcMain.handle('db:update-category', (_e, id: string, d) => categoryService.update(id, d))
  ipcMain.handle('db:delete-category', (_e, id: string) => categoryService.delete(id))

  // Dépenses
  ipcMain.handle('db:get-expenses', () => expenseService.getAll())
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

  // Export Excel stylisé (via exceljs)
  ipcMain.handle('export:rapport-excel', async (_e, params) => exportRapportExcel(params))
  ipcMain.handle('export:mobile-money-excel', async (_e, params) => exportMobileMoneyExcel(params))
  ipcMain.handle('export:canal-plus-excel', async (_e, params) => exportCanalPlusExcel(params))

  // Export PDF générique (tableau HTML → PDF)
  ipcMain.handle('export:table-pdf', async (_e, html: string, filename: string) => {
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
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280, height: 800,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true, nodeIntegration: false, sandbox: false
    }
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

app.whenReady().then(async () => {
  protocol.handle('local-file', (request) => {
    const filePath = decodeURIComponent(request.url.slice('local-file://'.length))
    return net.fetch('file://' + filePath)
  })
  await initDatabase()
  registerIpcHandlers()
  createWindow()
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() })
})

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })

app.on('will-quit', async () => { if (prisma) await prisma.$disconnect() })
