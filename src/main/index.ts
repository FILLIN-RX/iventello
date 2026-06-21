import { app, BrowserWindow, ipcMain, dialog, protocol, net, shell } from 'electron'
import { join, extname, resolve } from 'node:path'
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
import { createCanalPlusSaleService } from './services/canalPlusSaleService'
import { createAppSettingsService } from './services/appSettingsService'
import { createDiscountService } from './services/discountService'
import { createMonthlyReportService } from './services/monthlyReportService'
import { exportRapportExcel, exportMobileMoneyExcel, exportCanalPlusExcel } from './services/excelExportService'
import { initAutoUpdater } from './services/autoUpdaterService'
import { createGlobalStatsService } from './services/globalStatsService'
import { createServiceSaleService } from './services/serviceSaleService'
import { createAuthService } from './services/authService'
import { sessionService } from './services/sessionService'

let prisma: PrismaClient | null = null
let mainWindow: BrowserWindow | null = null
let splashWindow: BrowserWindow | null = null

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
      "quantity" INTEGER NOT NULL DEFAULT 0, "quantityMagasin" INTEGER NOT NULL DEFAULT 0,
      "alertLimit" INTEGER NOT NULL DEFAULT 5, "shelfLocation" TEXT,
      FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE,
      FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE CASCADE,
      UNIQUE ("productId", "warehouseId")
    )`)
  // Migration : ajouter quantityMagasin si colonne manquante
  try {
    const stockCols = await prisma.$queryRawUnsafe<{ name: string }[]>(`PRAGMA table_info("Stock")`)
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
      "category" TEXT NOT NULL DEFAULT 'GENERAL',
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

  // Migration : ajouter les champs agent à User
  try {
    const userCols = await prisma.$queryRawUnsafe<{ name: string }[]>(`PRAGMA table_info("User")`)
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
  } catch { /* ignorer */ }

  // Migration : ajouter quantityReservee à Stock
  try {
    const sCols = await prisma.$queryRawUnsafe<{ name: string }[]>(`PRAGMA table_info("Stock")`)
    if (!sCols.some((c: any) => c.name === 'quantityReservee')) {
      await prisma.$executeRawUnsafe(`ALTER TABLE "Stock" ADD COLUMN "quantityReservee" INTEGER NOT NULL DEFAULT 0`)
    }
  } catch { /* ignorer */ }

  // Migration : ajouter status, agentId, commissionAmount, validatedAt, paidAt à Sale
  try {
    const saleCols = await prisma.$queryRawUnsafe<{ name: string }[]>(`PRAGMA table_info("Sale")`)
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
  } catch { /* ignorer */ }

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
    if (!whCols.some((c: any) => c.name === 'invoiceCompanyName')) {
      await prisma.$executeRawUnsafe(`ALTER TABLE "Warehouse" ADD COLUMN "invoiceCompanyName" TEXT`)
    }
    if (!whCols.some((c: any) => c.name === 'invoiceCompanyNui')) {
      await prisma.$executeRawUnsafe(`ALTER TABLE "Warehouse" ADD COLUMN "invoiceCompanyNui" TEXT`)
    }
    if (!whCols.some((c: any) => c.name === 'invoiceCompanyBp')) {
      await prisma.$executeRawUnsafe(`ALTER TABLE "Warehouse" ADD COLUMN "invoiceCompanyBp" TEXT`)
    }
    if (!whCols.some((c: any) => c.name === 'invoiceCompanyAddress')) {
      await prisma.$executeRawUnsafe(`ALTER TABLE "Warehouse" ADD COLUMN "invoiceCompanyAddress" TEXT`)
    }
    if (!whCols.some((c: any) => c.name === 'invoiceCompanyPhones')) {
      await prisma.$executeRawUnsafe(`ALTER TABLE "Warehouse" ADD COLUMN "invoiceCompanyPhones" TEXT`)
    }
    if (!whCols.some((c: any) => c.name === 'invoiceCompanyEmail')) {
      await prisma.$executeRawUnsafe(`ALTER TABLE "Warehouse" ADD COLUMN "invoiceCompanyEmail" TEXT`)
    }
    if (!whCols.some((c: any) => c.name === 'invoiceCompanyLogo')) {
      await prisma.$executeRawUnsafe(`ALTER TABLE "Warehouse" ADD COLUMN "invoiceCompanyLogo" TEXT`)
    }
    if (!whCols.some((c: any) => c.name === 'invoiceCompanyDescription')) {
      await prisma.$executeRawUnsafe(`ALTER TABLE "Warehouse" ADD COLUMN "invoiceCompanyDescription" TEXT`)
    }
    if (!whCols.some((c: any) => c.name === 'invoiceFooter')) {
      await prisma.$executeRawUnsafe(`ALTER TABLE "Warehouse" ADD COLUMN "invoiceFooter" TEXT`)
    }
  } catch { /* ignorer */ }

  // Migration : CashTransaction — ajout colonne category
  try {
    const ctCols = await prisma.$queryRawUnsafe<{ name: string }[]>(`PRAGMA table_info("CashTransaction")`)
    if (!ctCols.some((c: any) => c.name === 'category')) {
      await prisma.$executeRawUnsafe(`ALTER TABLE "CashTransaction" ADD COLUMN "category" TEXT NOT NULL DEFAULT 'GENERAL'`)
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
  const discountService = createDiscountService(prisma)
  const monthlyReportService = createMonthlyReportService(prisma)
  const mobileMoneyService = createMobileMoneyService(prisma)
  const canalPlusService = createCanalPlusService(prisma)
  const canalPlusSaleService = createCanalPlusSaleService(prisma)
  const globalStatsService = createGlobalStatsService(prisma)
  const serviceSaleService = createServiceSaleService(prisma)
  const authService = createAuthService(prisma)


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

  ipcMain.handle('db:get-global-stats', () => globalStatsService.getStats())

  ipcMain.handle('db:get-products', () => productService.getAll())
  ipcMain.handle('db:get-product-by-barcode', (_e, b: string) => productService.getByBarcode(b))
  ipcMain.handle('db:create-product', (_e, d) => {
    return productService.create(d)
  })
  ipcMain.handle('db:update-product', (_e, id: string, d) => productService.update(id, d))
  ipcMain.handle('db:delete-product', (_e, id: string) => productService.delete(id))


  ipcMain.handle('db:create-sale', async (_e, data) => {
    const { items, status, agentId, montantAvance, ...saleData } = data
    const saleStatus: string = status || 'EN_ATTENTE'

    return prisma!.$transaction(async (tx) => {
      // Générer le numéro de facture atomiquement
      const now = new Date()
      const yymm = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
      const pattern = `FACT-${yymm}-`
      const last = await tx.sale.findFirst({
        where: { invoiceNumber: { startsWith: pattern } },
        orderBy: { invoiceNumber: 'desc' },
        select: { invoiceNumber: true }
      })
      const lastNum = last ? parseInt(last.invoiceNumber.split('-').pop() ?? '0', 10) : 0
      const invoiceNumber = `${pattern}${String(lastNum + 1).padStart(4, '0')}`

      // Valider le stock pour chaque article
      for (const item of items as { productId: string; quantity: number; unitPrice: number }[]) {
        const stock = await tx.stock.findFirst({
          where: { productId: item.productId, warehouseId: saleData.warehouseId },
          include: { product: true }
        })
        if (!stock || stock.quantity < item.quantity) {
          const productName = stock?.product?.name ?? item.productId
          throw new Error(`Stock insuffisant pour ${productName} : ${stock?.quantity ?? 0} disponible(s), ${item.quantity} demandé(s)`)
        }
      }

      // Si c'est une vente directe (VALIDE/PAYE), comportement original
      const isDirectSale = saleStatus === 'VALIDE' || saleStatus === 'PAYE'

      // Créer la vente
      const saleDataToCreate: any = { ...saleData, invoiceNumber, status: saleStatus }
      if (agentId) saleDataToCreate.agentId = agentId
      if (montantAvance != null) saleDataToCreate.montantAvance = montantAvance
      if (saleStatus === 'PAYE') saleDataToCreate.paidAt = new Date()
      if (saleStatus === 'VALIDE') {
        saleDataToCreate.validatedAt = new Date()
        // Calculer la commission agent si agent assigné
        if (agentId) {
          const agent = await tx.user.findUnique({ where: { id: agentId } })
          if (agent && agent.commissionRate > 0) {
            saleDataToCreate.commissionAmount = Math.round(saleData.finalTotal * (agent.commissionRate / 100) * 100) / 100
          }
        }
      }

      const sale = await tx.sale.create({
        data: {
          ...saleDataToCreate,
          items: { create: items },
          ...(saleStatus === 'PAYE' ? { paidAt: new Date() } : {})
        },
        include: { items: { include: { product: true } }, client: true, warehouse: true, agent: true }
      })

      // Créer l'entrée cahier de caisse
      // Pour une avance, la transaction enregistre le montant réellement versé
      const montantCaisse = (saleStatus === 'EN_ATTENTE' && montantAvance != null) ? montantAvance : saleData.finalTotal
      await tx.cashTransaction.create({
        data: {
          type: 'ENTREE',
          totalAmount: montantCaisse,
          paymentMethod: saleData.paymentMethod || 'ESPECES',
          description: `Vente — ${saleData.clientId ? 'client rattaché' : 'client anonyme'}${saleStatus !== 'EN_ATTENTE' ? '' : ' (avance)'}${montantAvance != null && montantAvance !== saleData.finalTotal ? ` — ${montantAvance} FCFA versés sur ${saleData.finalTotal} FCFA` : ''}`,
          category: 'GENERAL',
          warehouseId: saleData.warehouseId,
          lines: {
            create: (items as { productId: string; quantity: number; unitPrice: number }[]).map(
              (item) => ({
                productId: item.productId,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                subTotal: item.quantity * item.unitPrice
              })
            )
          }
        }
      })

      if (isDirectSale) {
        // Vente directe : stock déduit normalement
        for (const item of items as { productId: string; quantity: number; unitPrice: number }[]) {
          await tx.stock.updateMany({
            where: { productId: item.productId, warehouseId: saleData.warehouseId },
            data: { quantity: { decrement: item.quantity } }
          })
        }
      } else {
        // Avance : stock → réservé (espace virtuel)
        for (const item of items as { productId: string; quantity: number; unitPrice: number }[]) {
          await tx.stock.updateMany({
            where: { productId: item.productId, warehouseId: saleData.warehouseId },
            data: {
              quantity: { decrement: item.quantity },
              quantityReservee: { increment: item.quantity }
            }
          })
        }
      }

      // Enregistrer la remise si applicable
      if (saleData.discount > 0) {
        await tx.discount.create({
          data: {
            saleId: sale.id,
            warehouseId: saleData.warehouseId,
            amount: saleData.discount,
            reason: null
          }
        })
        await tx.cashTransaction.create({
          data: {
            type: 'SORTIE',
            totalAmount: saleData.discount,
            paymentMethod: saleData.paymentMethod || 'ESPECES',
            description: `Remise sur vente — N° ${invoiceNumber}`,
            category: 'GENERAL',
            warehouseId: saleData.warehouseId,
            lines: { create: [] }
          }
        })
      }

      return sale
    })
  })

  ipcMain.handle('db:get-sales', async (_e, clientId?: string) => {
    const where = clientId ? { clientId } : {}
    return prisma!.sale.findMany({
      where,
      include: { items: { include: { product: true } }, client: true, warehouse: true, agent: true },
      orderBy: { createdAt: 'desc' }
    })
  })

  // Valider une facture (EN_ATTENTE → VALIDE)
  ipcMain.handle('db:validate-sale', async (_e, saleId: string) => {
    return prisma!.$transaction(async (tx) => {
      const sale = await tx.sale.findUnique({
        where: { id: saleId },
        include: { items: true }
      })
      if (!sale) throw new Error('Facture introuvable')
      if (sale.status !== 'EN_ATTENTE') throw new Error(`Impossible de valider : le statut actuel est "${sale.status}"`)
      if (sale.status === 'PAYE') throw new Error('Impossible de valider : la facture est déjà payée')

      // Libérer le stock réservé
      for (const item of sale.items) {
        await tx.stock.updateMany({
          where: { productId: item.productId, warehouseId: sale.warehouseId },
          data: { quantityReservee: { decrement: item.quantity } }
        })
      }
      // Calculer commission agent si présent

      let commissionAmount: number | null = null
      if (sale.agentId) {
        const agent = await tx.user.findUnique({ where: { id: sale.agentId } })
        if (agent && agent.commissionRate > 0) {
          commissionAmount = Math.round(sale.finalTotal * (agent.commissionRate / 100) * 100) / 100
        }
      }

      return tx.sale.update({
        where: { id: saleId },
        data: { status: 'VALIDE', validatedAt: new Date(), commissionAmount },
        include: { items: { include: { product: true } }, client: true, warehouse: true, agent: true }
      })
    })
  })

  // Payer une facture (VALIDE → PAYE)
  ipcMain.handle('db:pay-sale', async (_e, saleId: string) => {
    return prisma!.$transaction(async (tx) => {
      const sale = await tx.sale.findUnique({ where: { id: saleId } })
      if (!sale) throw new Error('Facture introuvable')
      if (sale.status !== 'VALIDE') throw new Error(`Impossible de payer : le statut actuel est "${sale.status}"`)

      return tx.sale.update({
        where: { id: saleId },
        data: { status: 'PAYE', paidAt: new Date() },
        include: { items: { include: { product: true } }, client: true, warehouse: true, agent: true }
      })
    })
  })

  // Annuler une facture (EN_ATTENTE → ANNULE)
  ipcMain.handle('db:cancel-sale', async (_e, saleId: string) => {
    return prisma!.$transaction(async (tx) => {
      const sale = await tx.sale.findUnique({
        where: { id: saleId },
        include: { items: true }
      })
      if (!sale) throw new Error('Facture introuvable')
      if (sale.status === 'PAYE') throw new Error('Impossible d\'annuler : la facture est déjà payée')
      if (sale.status === 'ANNULE') throw new Error('La facture est déjà annulée')

      // Restituer le stock
      if (sale.status === 'EN_ATTENTE') {
        // Restituer depuis le stock réservé
        for (const item of sale.items) {
          await tx.stock.updateMany({
            where: { productId: item.productId, warehouseId: sale.warehouseId },
            data: {
              quantity: { increment: item.quantity },
              quantityReservee: { decrement: item.quantity }
            }
          })
        }
      } else if (sale.status === 'VALIDE') {
        // Restituer depuis le stock normal (déjà déduit)
        for (const item of sale.items) {
          await tx.stock.updateMany({
            where: { productId: item.productId, warehouseId: sale.warehouseId },
            data: { quantity: { increment: item.quantity } }
          })
        }
      }

      return tx.sale.update({
        where: { id: saleId },
        data: { status: 'ANNULE' },
        include: { items: { include: { product: true } }, client: true, warehouse: true, agent: true }
      })
    })
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

  ipcMain.handle('file:save-invoice-logo', async (_e, sourcePath: string, warehouseId: string) => {
    const logosDir = join(app.getPath('userData'), 'logos')
    if (!existsSync(logosDir)) mkdirSync(logosDir, { recursive: true })
    const ext = extname(sourcePath)
    const dest = join(logosDir, `invoice_${warehouseId}${ext}`)
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
  ipcMain.handle('db:search-clients', (_e, query: string) => clientService.search(query))
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
      items: { productId: string; quantity: number; unitPrice: number; productName: string; sendToMagasin?: boolean }[]
    }
    const totalAmount = items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0)
    const transaction = await cashRegisterService.create({
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
    // Pour les articles envoyés au magasin : corriger le stock boutique → magasin
    const sendToMagasinItems = items.filter(i => i.sendToMagasin)
    if (sendToMagasinItems.length > 0) {
      await prisma!.$transaction(async (tx) => {
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
    await prisma!.$transaction(async (tx) => {
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
    await prisma!.$transaction(async (tx) => {
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
    await prisma!.$transaction(async (tx) => {
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
  ipcMain.handle('export:mobile-money-excel', async (_e, params) => exportMobileMoneyExcel(params))
  ipcMain.handle('export:canal-plus-excel', async (_e, params) => exportCanalPlusExcel(params))

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

  // Ouvrir un fichier dans le navigateur par défaut
  ipcMain.handle('shell:open-file', async (_e, filePath: string) => {
    const allowedDirs = [
      app.getPath('desktop'),
      app.getPath('documents'),
      app.getPath('downloads'),
      app.getPath('userData')
    ]
    const resolved = resolve(filePath)
    const isAllowed = allowedDirs.some(dir => resolved.startsWith(resolve(dir)))
    if (!isAllowed) throw new Error('Accès refusé : chemin non autorisé')
    await shell.openPath(filePath)
  })
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

  const splashHtml = `
    <html>
      <body style="margin: 0; display: flex; align-items: center; justify-content: center; height: 100vh; background: transparent; font-family: sans-serif;">
        <div style="text-align: center; background: white; padding: 40px; border-radius: 24px; shadow: 0 10px 25px rgba(0,0,0,0.1); display: flex; flex-direction: column; align-items: center;">
          <img src="local-file://${join(app.getAppPath(), 'out/renderer/iventello.png')}" style="width: 120px; height: 120px; margin-bottom: 20px;" />
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
  mainWindow = new BrowserWindow({
    width: 1280, height: 800,
    show: false,
    backgroundColor: '#ffffff',
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

// Désactiver IBUS pour éviter les warnings et la perte de saisie
app.commandLine.appendSwitch('disable-features', 'UseOzonePlatform')
app.commandLine.appendSwitch('disable-features', 'ImeService')

// Éviter les logs IBUS dans la console
const env = process.env as Record<string, string | undefined>
env.GTK_IM_MODULE = env.GTK_IM_MODULE || 'xim'
env.GTK_MODULES = ''

app.whenReady().then(async () => {
  protocol.handle('local-file', (request) => {
    const filePath = decodeURIComponent(request.url.slice('local-file://'.length))
    const allowedDirs = [
      app.getPath('userData'),
      app.getPath('documents'),
      app.getPath('desktop'),
      join(app.getAppPath(), 'out'),
      join(app.getAppPath(), 'resources')
    ]
    const resolved = resolve(filePath)
    const isAllowed = allowedDirs.some(dir => resolved.startsWith(resolve(dir)))
    if (!isAllowed) {
      return new Response('Accès refusé', { status: 403 })
    }
    return net.fetch('file://' + filePath)
  })

  createSplashWindow()

  await initDatabase()
  registerIpcHandlers()
  createWindow()
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() })
})

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })

app.on('will-quit', async () => { if (prisma) await prisma.$disconnect() })
