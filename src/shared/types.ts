export type Role = 'PROPRIETAIRE' | 'MANAGER' | 'CAISSIER' | 'EMPLOYE' | 'AGENT'

export type SaleStatus = 'EN_ATTENTE' | 'VALIDE' | 'PAYE' | 'ANNULE'

export interface User {
  id: string
  email: string
  nom: string
  prenom: string
  role: Role
  avatarUrl: string | null
  phone: string | null
  commissionRate: number
  notes: string | null
  active: boolean
  createdAt: string
  updatedAt: string
}

export interface Product {
  id: string
  warehouseId?: string | null
  barcode: string
  name: string
  basePrice: number
  sellingPrice: number
  vatRate: number
  imageUrl: string | null
  createdAt: string
  field1_label: string | null
  field1_value: string | null
  field2_label: string | null
  field2_value: string | null
  field3_label: string | null
  field3_value: string | null
  field4_label: string | null
  field4_value: string | null
  field5_label: string | null
  field5_value: string | null
  field6_label: string | null
  field6_value: string | null
  field7_label: string | null
  field7_value: string | null
  field8_label: string | null
  field8_value: string | null
  field9_label: string | null
  field9_value: string | null
  field10_label: string | null
  field10_value: string | null
  supplierId: string | null
  categoryId: string | null
  isPacket: boolean
  itemsPerPacket: number
  unitSellingPrice: number | null
}

export interface ProductWithRelations extends Product {
  supplier: Supplier | null
  stocks: StockInfo[]
  category: Category | null
}

export interface StockInfo {
  id: string
  quantity: number
  quantityMagasin: number
  quantityReservee: number
  alertLimit: number
  shelfLocation: string | null
  warehouse: Warehouse
}

export interface Category {
  id: string
  warehouseId?: string | null
  name: string
  description: string | null
  createdAt: string
  updatedAt: string
  _count?: { products: number }
}

export interface Expense {
  id: string
  warehouseId?: string | null
  title: string
  amount: number
  category: string
  date: string
  description: string | null
}

export interface Supplier {
  id: string
  warehouseId?: string | null
  name: string
  email: string | null
  phone: string | null
  address: string | null
  createdAt: string
}

export interface Client {
  id: string
  warehouseId?: string | null
  name: string
  email: string | null
  phone: string | null
  address: string | null
  notes: string | null
  createdAt: string
}

export interface ClientStats {
  client: Client
  totalSpent: number
  purchaseCount: number
  rank: 'premium' | 'fidele' | 'standard'
  lastPurchase: string | null
}

export interface Sale {
  id: string
  warehouseId: string
  clientId: string | null
  invoiceNumber: string
  subTotal: number
  vatTotal: number
  discount: number
  finalTotal: number
  montantAvance: number | null
  paymentMethod: string
  status: SaleStatus
  isPendingDelivery?: boolean
  deliveryStatus?: 'NON_LIVRE' | 'DISPONIBLE' | 'LIVRE' | null
  notifiedAt?: string | null
  agentId: string | null
  commissionAmount: number | null
  validatedAt: string | null
  paidAt: string | null
  createdAt: string
}

export interface SaleWithClient extends Sale {
  client: Client | null
  items: SaleItem[]
  warehouse: Warehouse
  agent: User | null
}

export interface SaleItem {
  id: string
  saleId: string
  productId?: string | null
  bookId?: string | null
  quantity: number
  unitPrice: number
  product?: Product | null
  book?: Book | null
}

export interface Warehouse {
  id: string
  name: string
  location: string | null
  logoUrl: string | null
  mobileMoneyEnabled: boolean
  librairieEnabled: boolean
  invoiceCompanyName: string | null
  invoiceCompanyNui: string | null
  invoiceCompanyBp: string | null
  invoiceCompanyAddress: string | null
  invoiceCompanyPhones: string | null
  invoiceCompanyEmail: string | null
  invoiceCompanyLogo: string | null
  invoiceCompanyDescription: string | null
  invoiceFooter: string | null
  invoiceTemplate?: 'MODERNE' | 'CLASSIQUE' | 'MINIMALISTE' | string | null
  invoiceColor?: string | null
  invoiceTerms?: string | null
  invoiceBankDetails?: string | null
}

export interface StockAlert {
  product: Product
  stock: StockInfo
  warehouse: Warehouse
}

export interface BookStockAlert {
  book: BookWithRelations
  stock: BookStockInfo
  warehouse: Warehouse
}

export interface ReceiptData {
  items: { product: { name: string; price: number }; quantity: number }[]
  totalAmount: number
  saleId: string
  invoiceNumber: string
  date: string
  status?: string
  montantAvance?: number
  remainingBalance?: number
}

export interface PrinterConfig {
  type: 'USB' | 'NETWORK'
  printerName?: string
  ip?: string
  port?: number
  paperWidth?: '58mm' | '80mm'
  autoCut?: boolean
  openCashDrawer?: boolean
}

export interface NearbyPrinter {
  id: string
  name: string
  type: 'NETWORK' | 'BLUETOOTH' | 'USB'
  ip?: string
  printerName?: string
}

export type PurchaseOrderStatus = 'EN_ATTENTE' | 'CONFIRME' | 'RECU' | 'ANNULE'

export interface PurchaseOrder {
  id: string
  supplierName: string
  warehouseId: string | null
  status: PurchaseOrderStatus
  pdfPath: string | null
  totalAmount: number
  createdAt: string
  updatedAt: string
  items: PurchaseOrderItemFull[]
  warehouse?: Warehouse | null
}

export interface PurchaseOrderItemFull {
  id: string
  purchaseOrderId: string
  productId: string
  productName: string
  productBarcode: string
  quantity: number
  unitPrice: number
  currentStock: number
  alertLimit: number
  warehouseName: string
  warehouseId: string
  product?: Product
}

export interface DashboardPeriodData {
  ventes: number
  revenu: number
  depenses: number
  achats: number
  benefice: number
  transactions: number
  produitsVendus: number
  alerteCount: number
}

export interface DashboardChartPoint {
  label: string
  ventes: number
  revenu: number
  depenses: number
  date: string
}

export interface DashboardSummary {
  period: string
  current: DashboardPeriodData
  previous: DashboardPeriodData
  chart: DashboardChartPoint[]
  topProducts: { name: string; quantity: number; revenu: number }[]
  evolution: {
    ventes: number
    revenu: number
    depenses: number
    achats: number
    benefice: number
  }
}

export interface PurchaseOrderItem {
  productId: string
  productName: string
  productBarcode: string
  currentStock: number
  alertLimit: number
  suggestedQuantity: number
  supplierName: string
  supplierEmail: string | null
  supplierPhone: string | null
  warehouseName: string
  warehouseId: string
}

export interface CashTransaction {
  id: string
  type: 'ENTREE' | 'SORTIE'
  totalAmount: number
  paymentMethod: string
  description: string | null
  category?: string | null
  warehouseId: string
  createdAt: string
  updatedAt: string
}

export interface CashTransactionLine {
  id: string
  transactionId: string
  productId?: string
  bookId?: string
  quantity: number
  unitPrice: number
  subTotal: number
}

export interface CashTransactionWithLines extends CashTransaction {
  lines: (CashTransactionLine & { product: Product })[]
  warehouse: Warehouse
}

export interface CashRegisterSummary {
  soldeDuJour: number
  valeurTotaleStock: number
  totalEntrees: number
  totalSorties: number
  totalAchats?: number
  totalNonLivre: number
  totalAvances: number
  totalVentesDirectes: number
  totalProducts: number
  alertCount: number
}

export interface ScannedDocumentItem {
  id: string
  title: string
  date: string
  filePath: string
  fileType: string
  category: string
  notes?: string | null
  warehouseId?: string | null
  createdAt: string
  updatedAt?: string
  warehouse?: Warehouse
}

export interface ElectronApi {
  // Auth
  auth: {
    hasUsers: () => Promise<boolean>
    setupOwner: (data: any) => Promise<User>
    login: (email: string, password: string) => Promise<User>
    logout: () => Promise<void>
    session: () => Promise<User | null>
    getUsers: () => Promise<User[]>
    createUser: (data: any) => Promise<User>
    updateUser: (id: string, data: any) => Promise<User>
    deleteUser: (id: string) => Promise<void>
    changePassword: (id: string, oldP: string, newP: string) => Promise<void>
    assignWarehouses: (userId: string, warehouseIds: string[]) => Promise<void>
    setSecurityQuestion: (id: string, question: string, answer: string) => Promise<User>
    hasSecurityQuestion: (email: string) => Promise<{ has: boolean; question: string | null }>
    verifySecurityAnswer: (email: string, answer: string) => Promise<boolean>
    resetPassword: (email: string, newPassword: string) => Promise<User>
    adminResetPassword: (id: string, newPassword: string) => Promise<User>
    generateRecoveryCode: (userId: string) => Promise<{ code: string; filePath: string }>
    hasRecoveryCode: (email: string) => Promise<boolean>
    verifyRecoveryCode: (email: string, code: string) => Promise<boolean>
    verifyOwnerPassword: (password: string) => Promise<boolean>
  }
  getProducts: (warehouseId?: string) => Promise<ProductWithRelations[]>
  getProductByBarcode: (barcode: string, warehouseId?: string) => Promise<ProductWithRelations | null>
  getProductDetails: (id: string) => Promise<ProductDetailsResult | null>
  createProduct: (data: Partial<Product> & { initialQuantity?: number; alertLimit?: number }) => Promise<Product>
  updateProduct: (id: string, data: Partial<Product>) => Promise<Product>
  deleteProduct: (id: string) => Promise<void>
  deleteAllProducts: (warehouseId?: string) => Promise<{ count: number }>
  createSale: (data: {
    warehouseId: string
    clientId?: string | null
    subTotal: number
    vatTotal?: number
    discount?: number
    finalTotal: number
    paymentMethod: string
    status?: SaleStatus
    isPendingDelivery?: boolean
    deliveryStatus?: string
    agentId?: string | null
    montantAvance?: number
    items: { productId?: string; bookId?: string; quantity: number; unitPrice: number }[]
  }) => Promise<SaleWithClient>
  getPendingDeliveries: (warehouseId?: string) => Promise<SaleWithClient[]>
  deliverSale: (id: string, paymentMethod?: string) => Promise<SaleWithClient>
  updateDeliveryStatus: (id: string, deliveryStatus: 'NON_LIVRE' | 'DISPONIBLE' | 'LIVRE') => Promise<SaleWithClient>
  notifySaleClient: (id: string) => Promise<SaleWithClient>
  getSales: (clientId?: string, warehouseId?: string) => Promise<SaleWithClient[]>
  getWarehouses: () => Promise<Warehouse[]>
  createWarehouse: (data: { name: string; location?: string; logoUrl?: string; mobileMoneyEnabled?: boolean; librairieEnabled?: boolean }) => Promise<Warehouse>
  updateWarehouse: (id: string, data: Partial<{
    name: string
    location: string
    logoUrl: string
    mobileMoneyEnabled: boolean
    librairieEnabled: boolean
    invoiceCompanyName: string | null
    invoiceCompanyNui: string | null
    invoiceCompanyBp: string | null
    invoiceCompanyAddress: string | null
    invoiceCompanyPhones: string | null
    invoiceCompanyEmail: string | null
    invoiceCompanyLogo: string | null
    invoiceCompanyDescription: string | null
    invoiceFooter: string | null
    invoiceTemplate?: string | null
    invoiceColor?: string | null
    invoiceTerms?: string | null
    invoiceBankDetails?: string | null
  }>) => Promise<Warehouse>
  selectLogo: () => Promise<string | null>
  saveLogo: (sourcePath: string, warehouseId: string) => Promise<string>
  saveInvoiceLogo: (sourcePath: string, warehouseId: string) => Promise<string>
  saveProductImage: (sourcePath: string, productId: string) => Promise<string>
  saveBookImage: (sourcePath: string, bookId: string) => Promise<string>
  deleteWarehouse: (id: string) => Promise<void>
  getStockAlerts: () => Promise<StockAlert[]>
  getBookStockAlerts: () => Promise<BookStockAlert[]>
  getRupturedBooks: () => Promise<BookStockAlert[]>
  getPrinters: () => Promise<string[]>
  scanNetworkPrinters: () => Promise<{ ip: string; port: number; name: string }[]>
  scanNearbyPrinters: () => Promise<NearbyPrinter[]>
  printReceipt: (data: ReceiptData, config?: PrinterConfig) => Promise<void>
  printTestReceipt: (config?: PrinterConfig) => Promise<void>
  exportStockReport: (data: { products: unknown[]; alerts: unknown[]; totalProducts: number; totalValue: number; alertCount: number; date: string }) => Promise<string>
  scanInvoicesByDate: (dateStr: string, warehouseId?: string) => Promise<{
    date: string
    totalInvoices: number
    totalRevenue: number
    totalPaid: number
    totalPending: number
    totalCancelled: number
    paymentMethodsBreakdown: Record<string, { count: number; total: number }>
    sales: SaleWithClient[]
  }>
  exportScannedInvoicesPdf: (dateStr: string, warehouseId?: string) => Promise<{ filePath: string }>
  exportScannedInvoicesZip: (dateStr: string, warehouseId?: string) => Promise<{ folderPath: string; count: number }>
  getScannedDocuments: (dateStr?: string, warehouseId?: string, search?: string) => Promise<ScannedDocumentItem[]>
  createScannedDocument: (data: { title: string; date?: string; filePath: string; category?: string; notes?: string; warehouseId?: string }) => Promise<ScannedDocumentItem>
  deleteScannedDocument: (id: string) => Promise<void>
  selectScanFile: () => Promise<string | null>
  getClients: (warehouseId?: string) => Promise<ClientStats[]>
  searchClients: (query: string, warehouseId?: string) => Promise<ClientStats[]>
  getClient: (id: string) => Promise<ClientStats & { sales: SaleWithClient[] }>
  createClient: (data: { name: string; email?: string; phone?: string; address?: string; notes?: string; warehouseId?: string }) => Promise<Client>
  updateClient: (id: string, data: Partial<{ name: string; email: string; phone: string; address: string; notes: string; warehouseId?: string }>) => Promise<Client>
  deleteClient: (id: string) => Promise<void>
  getSuppliers: (warehouseId?: string) => Promise<Supplier[]>
  createSupplier: (data: { name: string; email?: string; phone?: string; address?: string; warehouseId?: string }) => Promise<Supplier>
  updateSupplier: (id: string, data: Partial<{ name: string; email: string; phone: string; address: string; warehouseId?: string }>) => Promise<Supplier>
  deleteSupplier: (id: string) => Promise<void>
  analyzeStock: () => Promise<{ orders: PurchaseOrderItem[]; pdfPath: string; purchaseOrderId: string }>
  getPurchaseOrders: () => Promise<PurchaseOrder[]>
  getPurchaseOrder: (id: string) => Promise<PurchaseOrder | null>
  updatePurchaseOrderStatus: (id: string, status: string) => Promise<PurchaseOrder>
  deletePurchaseOrder: (id: string) => Promise<void>
  exportPurchaseOrderPdf: (id: string) => Promise<string | null>
  exportPurchaseOrderExcel: (id: string) => Promise<string>
  exportAllPurchaseOrdersExcel: () => Promise<string>
  openPdf: (filePath: string) => Promise<void>
  previewPdf: (filePath: string) => Promise<string>
  confirmPurchase: (data: {
    warehouseId: string
    supplierName: string
    items: { productId: string; quantity: number; unitPrice: number; productName: string }[]
  }) => Promise<CashTransactionWithLines>
  restockProduct: (data: {
    productId: string
    warehouseId: string
    quantity: number
    unitPrice: number
    considerAsPurchase: boolean
    paymentMethod?: string
  }) => Promise<ProductWithRelations>
  // Catégories
  getCategories: (warehouseId?: string) => Promise<Category[]>
  createCategory: (data: { name: string; description?: string | null; warehouseId?: string }) => Promise<Category>
  updateCategory: (id: string, data: Partial<{ name: string; description: string | null }>) => Promise<Category>
  deleteCategory: (id: string) => Promise<void>
  deleteAllCategories: () => Promise<{ count: number }>
  deleteEmptyCategories: () => Promise<{ count: number }>
  clearCategoryProducts: (id: string) => Promise<{ count: number }>
  // Dépenses
  getExpenses: (warehouseId?: string) => Promise<Expense[]>
  createExpense: (data: { title: string; amount: number; category: string; description?: string | null; date?: string; warehouseId?: string; paymentMethod?: string }) => Promise<Expense>
  deleteExpense: (id: string) => Promise<void>
  // Cahier de caisse
  getRealTimeAccounting: (warehouseId: string) => Promise<CashRegisterSummary>
  getCashTransactions: (warehouseId: string) => Promise<CashTransactionWithLines[]>
  createCashTransaction: (data: {
    type: 'ENTREE' | 'SORTIE'
    warehouseId: string
    totalAmount: number
    paymentMethod: string
    description?: string
    lines: { productId: string; quantity: number; unitPrice: number; subTotal: number }[]
  }) => Promise<CashTransactionWithLines>
  deleteCashTransaction: (id: string) => Promise<void>
  exportCashReport: (data: CashReportData) => Promise<string>
  // Mobile Money
  getMobileMoneyCells: (warehouseId: string, month: string) => Promise<MobileMoneyCell[]>
  saveMobileMoneyCells: (warehouseId: string, month: string, cells: { day: number; col: string; value: number }[]) => Promise<void>
  // Remises
  getDiscounts: (warehouseId?: string) => Promise<DiscountWithSale[]>

  // Purge de la base de données
  purgeDatabase: () => Promise<boolean>
  // AppSettings
  getAppSettings: () => Promise<AppSettings>
  updateAppSettings: (data: Partial<Omit<AppSettings, 'id' | 'updatedAt'>>) => Promise<AppSettings>
  getMonthlyReport: (warehouseId: string, year: number, month: number) => Promise<{
    categories: string[]
    salesByDay: Record<number, Record<string, number>>
    expensesByDay: Record<number, number>
    purchasesByDay: Record<number, number>
    discountsByDay: Record<number, number>
  }>
  getGlobalStats: () => Promise<GlobalStats>
  getDashboardStats: (period: string, warehouseId?: string) => Promise<DashboardSummary>
  // Canal+
  getCanalPlusCells: (warehouseId: string, month: string) => Promise<CanalPlusCell[]>
  saveCanalPlusCells: (warehouseId: string, month: string, cells: { day: number; col: string; value: number }[]) => Promise<void>
  createCanalPlusSale: (data: {
    warehouseId: string
    clientName: string
    subscriptionNumber: string
    phone: string
    formule: string
    saleType: 'abonnement' | 'reabonnement'
    amount: number
  }) => Promise<CanalPlusSale & { invoicePath: string }>
  getCanalPlusSales: (warehouseId: string, search?: string) => Promise<CanalPlusSaleWithWarehouse[]>
  getCanalPlusBalance: (warehouseId: string) => Promise<number>
  getCanalPlusDailyBalance: (warehouseId: string) => Promise<number>
  // Services (photocopie, impression, scan)
  getServiceSales: (warehouseId: string, search?: string) => Promise<ServiceSaleWithWarehouse[]>
  createServiceSale: (data: {
    warehouseId: string
    serviceType: string
    description?: string
    quantity: number
    unitPrice: number
    totalAmount: number
    clientName?: string
  }) => Promise<ServiceSale & { invoicePath: string }>
  // Exports Excel stylisés
  exportRapportExcel: (params: ExportRapportParams) => Promise<string>
  exportProductsExcel: (warehouseId?: string) => Promise<string>
  exportMobileMoneyExcel: (params: ExportMobileMoneyParams) => Promise<string>
  exportCanalPlusExcel: (params: ExportCanalPlusParams) => Promise<string>
  exportTablePdf: (html: string, filename: string) => Promise<string>
  // Magasin
  getMagasinStock: (warehouseId: string) => Promise<any[]>
  transferMagasinToBoutique: (data: { productId: string; warehouseId: string; quantity: number }) => Promise<any>
  sendToMagasin: (data: { productId: string; warehouseId: string; quantity: number }) => Promise<any>
  receivePurchaseToMagasin: (data: { productId: string; warehouseId: string; quantity: number; unitPrice: number; paymentMethod?: string }) => Promise<any>
  openFile: (filePath: string) => Promise<void>
  openExternal: (url: string) => Promise<void>
  showItemInFolder: (filePath: string) => Promise<void>
  getOrdersDirectory: () => Promise<string>
  // Agents
  getAgents: () => Promise<User[]> // Users avec rôle AGENT
  createAgent: (data: { email: string; password: string; nom: string; prenom: string; phone?: string; commissionRate?: number; notes?: string }) => Promise<User>
  updateAgent: (id: string, data: Partial<{ nom: string; prenom: string; email: string; password: string; phone: string; commissionRate: number; notes: string; active: boolean }>) => Promise<User>
  deleteAgent: (id: string) => Promise<void>
  // Actions sur les factures
  validateSale: (saleId: string, complementAmount?: number) => Promise<SaleWithClient>
  paySale: (saleId: string) => Promise<SaleWithClient>
  cancelSale: (saleId: string) => Promise<SaleWithClient>
  // Librairie
  getClassLevels: (system?: string) => Promise<ClassLevel[]>
  getSubjects: (system?: string) => Promise<Subject[]>
  getBooks: (classLevelId?: string) => Promise<BookWithRelations[]>
  getBook: (id: string) => Promise<BookWithRelations | null>
  createBook: (data: Partial<Book>) => Promise<Book>
  updateBook: (id: string, data: Partial<Book>) => Promise<Book>
  deleteBook: (id: string) => Promise<void>
  getBookStocks: (warehouseId: string, classLevelId?: string) => Promise<BookStockInfo[]>
  createBookStock: (data: { bookId: string; warehouseId: string; classLevelId: string; quantity?: number; alertLimit?: number }) => Promise<BookStockInfo>
  updateBookStock: (id: string, data: Partial<{ quantity: number; alertLimit: number }>) => Promise<BookStockInfo>
  createBookSale: (data: {
    warehouseId: string
    studentName?: string
    className?: string
    classLevelId?: string
    totalAmount: number
    discount?: number
    paymentMethod: string
    notes?: string
    items: { bookId: string; quantity: number; unitPrice: number }[]
  }) => Promise<BookSaleWithItems>
  getBookSalesReport: (params: { warehouseId: string; startDate?: string; endDate?: string }) => Promise<any>
  selectExcelFile: () => Promise<{ canceled: boolean; filePath?: string; fileName?: string }>
  previewExcel: (filePath: string, sheetName?: string) => Promise<ExcelPreviewData>
  executeExcelImport: (params: ExcelImportParams) => Promise<ExcelImportResult>
  onImportProgress?: (callback: (progress: ExcelImportProgress) => void) => () => void
  getBookSales: (warehouseId: string) => Promise<BookSaleWithItems[]>
  getStudentTotals: (warehouseId: string, classLevelId: string) => Promise<{ studentName: string; className: string; total: number; items: BookSaleItem[] }[]>
  restockBook: (data: { bookId: string; warehouseId: string; quantity: number; purchasePrice?: number; editor?: string }) => Promise<BookStockInfo>
  bulkRestockBooks: (data: {
    warehouseId: string
    supplierName?: string
    paymentMethod?: string
    items: {
      bookId: string
      quantity: number
      purchasePrice: number
      sellingPrice?: number
      editor?: string
      sendToMagasin?: boolean
    }[]
  }) => Promise<{ count: number; totalAmount: number }>
  bulkRestockProducts: (data: {
    warehouseId: string
    supplierId?: string
    supplierName?: string
    paymentMethod?: string
    items: {
      productId: string
      quantity: number
      purchasePrice: number
      sellingPrice?: number
      sendToMagasin?: boolean
    }[]
  }) => Promise<{ count: number; totalAmount: number }>
  searchStudents: (query: string, warehouseId: string) => Promise<BookSaleWithItems[]>
  getStudentSummary: (studentName: string, classLevelId: string, warehouseId: string) => Promise<{
    studentName: string
    classLevelId: string
    requiredBooks: BookWithRelations[]
    purchasedBookIds: string[]
    livresManquants: BookWithRelations[]
    livresAchetes: BookWithRelations[]
    coutTotal: number
    totalDepense: number
    reliquat: number
    sales: BookSaleWithItems[]
  }>
  updateBookAlertLimit: (bookId: string, warehouseId: string, alertLimit: number) => Promise<BookStockInfo>
  seedOfficialCurriculum: (warehouseId?: string) => Promise<{ success: boolean; count: number }>
  // Mouvements de Stock (Stock Ledger)
  getStockMovements: (params: { warehouseId?: string; productId?: string; bookId?: string; type?: string; startDate?: string; endDate?: string; page?: number; pageSize?: number }) => Promise<StockMovementSearchResult>
  // Sessions de Caisse (POS Clôture Z)
  getCurrentCashSession: (warehouseId: string) => Promise<CashSession | null>
  openCashSession: (params: { warehouseId: string; openingAmount: number; notes?: string }) => Promise<CashSession>
  closeCashSession: (params: { sessionId: string; closingAmountActual: number; notes?: string }) => Promise<CashSession>
  getCashSessionHistory: (warehouseId: string, page?: number, pageSize?: number) => Promise<CashSessionSearchResult>
  // Sauvegarde automatique
  backupCreate: () => Promise<BackupInfo>
  backupList: () => Promise<BackupInfo[]>
  backupRestore: (filePath: string) => Promise<void>
  // Import / Export données .iventello
  dataExport: () => Promise<DataExportResult>
  dataImport: (archivePath: string, restoreDb: boolean) => Promise<DataImportResult>
  dataExportStats: () => Promise<{ totalSizeBytes: number; fileCount: number }>
  dataSelectArchive: () => Promise<string | null>
  // Updates
  checkForUpdates: () => void
  installUpdate: () => void
  onUpdateAvailable: (callback: () => void) => () => void
  onUpdateDownloaded: (callback: () => void) => () => void
  onUpdateError: (callback: (error: any) => void) => () => void
}

export interface BackupInfo {
  fileName: string
  filePath: string
  date: string
  sizeBytes: number
}

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

export interface Discount {
  id: string
  saleId: string
  warehouseId: string
  amount: number
  reason: string | null
  createdAt: string
}

export interface DiscountWithSale extends Discount {
  sale: SaleWithClient
  warehouse: Warehouse
}

export interface AppSettings {
  id: string
  companyName: string
  companyNui: string | null
  companyBp: string | null
  companyAddress: string | null
  companyPhones: string | null
  companyEmail: string | null
  companyLogo: string | null
  companyDescription: string | null
  invoiceFooter: string | null
  updatedAt: string
}

export interface MobileMoneyCell {
  id: string
  warehouseId: string
  month: string
  day: number
  col: string
  value: number
}

export interface CanalPlusCell {
  id: string
  warehouseId: string
  month: string
  day: number
  col: string
  value: number
}

export interface CanalPlusDayRow {
  reabonnementAccess: number
  reabonnementEvasion: number
  reabonnementAccessPlus: number
  reabonnementToutCanal: number
  reabonnementOthers: number
  totalReabonnement: number
  abonnement: number
  achatDecoder: number
  installationDepannage: number
  commission: number
}

export interface ExportRapportParams {
  tab: string
  year: number
  month: number
  monthName: string
  warehouseName: string
  categories: string[]
  salesByDay: Record<number, Record<string, number>>
  expensesByDay: Record<number, number>
  purchasesByDay: Record<number, number>
  discountsByDay: Record<number, number>
}

export interface ExportMobileMoneyParams {
  month: string
  monthName: string
  warehouseName: string
  rows: {
    day: number
    soldeOM: number
    soldeMTN: number
    soldeCamtel: number
    commissionOM: number
    commissionMTN: number
    commissionCamtel: number
    deficit: number
    totalSoldes: number
    totalCommissions: number
    soldeReelAjuste: number
  }[]
}

export interface CanalPlusSale {
  id: string
  warehouseId: string
  clientName: string
  subscriptionNumber: string
  phone: string
  formule: string
  amount: number
  invoiceNumber: string
  invoicePath: string | null
  createdAt: string
}

export interface CanalPlusSaleWithWarehouse extends CanalPlusSale {
  warehouse: Warehouse
}

export interface ServiceSale {
  id: string
  warehouseId: string
  serviceType: string
  description: string | null
  quantity: number
  unitPrice: number
  totalAmount: number
  clientName: string | null
  invoiceNumber: string
  invoicePath: string | null
  createdAt: string
}

export interface ServiceSaleWithWarehouse extends ServiceSale {
  warehouse: Warehouse
}

export interface ExportCanalPlusParams {
  month: string
  monthName: string
  warehouseName: string
  rows: {
    day: number
    reabonnementAccess: number
    reabonnementEvasion: number
    reabonnementAccessPlus: number
    reabonnementToutCanal: number
    reabonnementOthers: number
    totalReabonnement: number
    abonnement: number
    achatDecoder: number
    installationDepannage: number
    commission: number
  }[]
}

export interface GlobalStats {
  warehouses: number
  products: number
  sales: number
  stockAlerts: number
  topWarehouse: {
    id: string
    name: string
    sales: number
    products: number
    totalItems: number
    alerts: number
  } | null
  warehouseStats: {
    id: string
    name: string
    sales: number
    products: number
    totalItems: number
    alerts: number
  }[]
}

// ── Module Librairie ────────────────────────────────────────────────────────

export interface ClassLevel {
  id: string
  code: string
  name: string
  system: 'FRANCOPHONE' | 'ANGLOPHONE'
  order: number
  cycle: string
  color: string
  icon: string
  createdAt: string
  updatedAt: string
}

export interface Subject {
  id: string
  code: string
  name: string
  system: 'FRANCOPHONE' | 'ANGLOPHONE'
  color: string
  createdAt: string
  updatedAt: string
}

export interface Book {
  id: string
  isbn: string | null
  title: string
  author: string | null
  editor: string | null
  year: string | null
  price: number
  purchasePrice: number | null
  isOfficialProgram: boolean
  isPacket: boolean
  itemsPerPacket: number
  unitSellingPrice: number | null
  classLevelId: string
  subjectId: string | null
  activityBookId: string | null
  imageUrl: string | null
  createdAt: string
  updatedAt: string
}

export interface BookWithRelations extends Book {
  classLevel: ClassLevel
  subject: Subject | null
  activityBook: Book | null
  linkedActivityBooks: Book[]
  stocks: BookStockInfo[]
}

export interface BookStockInfo {
  id: string
  bookId: string
  warehouseId: string
  classLevelId: string
  quantity: number
  alertLimit: number
  warehouse: Warehouse
  classLevel: ClassLevel
}

export interface BookSale {
  id: string
  warehouseId: string
  studentName: string | null
  className: string | null
  classLevelId: string | null
  totalAmount: number
  discount: number
  paymentMethod: string
  notes: string | null
  createdAt: string
}

export interface BookSaleWithItems extends BookSale {
  items: BookSaleItem[]
  warehouse: Warehouse
  classLevel: ClassLevel | null
}

export interface BookSaleItem {
  id: string
  saleId: string
  bookId: string
  quantity: number
  unitPrice: number
  book?: Book
}

// Interfaces pour l'importation Excel dynamique
export interface ExcelColumnMapping {
  // Champs standards
  name: string // Colonne Excel pour le nom/désignation (obligatoire)
  barcode?: string // Code-barres ou ISBN
  sellingPrice?: string // Prix de vente
  basePrice?: string // Prix d'achat (coût)
  quantity?: string // Quantité en stock
  category?: string // Nom de la catégorie
  alertLimit?: string // Seuil d'alerte de stock
  // Champs personnalisables (1 à 10)
  field1?: string
  field1_label?: string
  field2?: string
  field2_label?: string
  field3?: string
  field3_label?: string
  field4?: string
  field4_label?: string
  field5?: string
  field5_label?: string
  field6?: string
  field6_label?: string
  field7?: string
  field7_label?: string
  field8?: string
  field8_label?: string
  field9?: string
  field9_label?: string
  field10?: string
  field10_label?: string
}

export interface ExcelPreviewData {
  filePath: string
  fileName: string
  sheetNames: string[]
  activeSheet: string
  totalRows: number
  headers: string[]
  sampleRows: Record<string, any>[]
  suggestedMapping: Partial<ExcelColumnMapping>
}

export interface ExcelImportParams {
  filePath: string
  sheetName: string
  mapping: ExcelColumnMapping
  warehouseId: string
  startRow?: number
  updateExisting?: boolean
  createCategories?: boolean
  defaultAlertLimit?: number
}

export interface ExcelImportProgress {
  phase: 'preparing' | 'importing' | 'finishing'
  current: number
  total: number
  percent: number
  importedCount: number
  updatedCount: number
  skippedCount: number
  currentItemName?: string
}

export interface ExcelImportResult {
  success: boolean
  totalRead: number
  importedCount: number
  updatedCount: number
  skippedCount: number
  categoriesCreated: number
  booksImportedCount?: number
  errors: string[]
}

// ── Stock Movement & Cash Session ──────────────────────────────────────────

export type StockMovementType = 'VENTE' | 'ACHAT' | 'MAGASIN_ENTREE' | 'MAGASIN_SORTIE' | 'ANNULATION_VENTE' | 'AJUSTEMENT' | 'RETOUR'

export interface StockMovement {
  id: string
  productId: string | null
  bookId: string | null
  warehouseId: string
  type: StockMovementType
  quantity: number
  quantityBefore: number
  quantityAfter: number
  unitCost: number | null
  referenceDoc: string | null
  notes: string | null
  createdAt: string
  product?: Product | null
  book?: Book | null
  warehouse?: Warehouse
}

export interface StockMovementSearchResult {
  movements: StockMovement[]
  total?: number
  page?: number
  pageSize?: number
  totalPages?: number
}

export type CashSessionStatus = 'OUVERTE' | 'CLOTUREE'

export interface CashSession {
  id: string
  warehouseId: string
  userId: string | null
  openedAt: string
  closedAt: string | null
  status: CashSessionStatus
  openingAmount: number
  closingAmountExpected: number | null
  closingAmountActual: number | null
  difference: number | null
  totalSales: number
  totalCashIn: number
  totalCashOut: number
  notes: string | null
  createdAt: string
  updatedAt: string
  warehouse?: Warehouse
  user?: User | null
}

export interface CashSessionSearchResult {
  sessions: CashSession[]
  total?: number
  page?: number
  pageSize?: number
  totalPages?: number
}

export interface ProductDetailsResult {
  product: ProductWithRelations
  recentSales: {
    id: string
    quantity: number
    unitPrice: number
    sale: {
      id: string
      invoiceNumber: string
      createdAt: string
      status: SaleStatus
      paymentMethod: string
      finalTotal: number
      client: Client | null
      warehouse: Warehouse | null
      agent: User | null
    }
  }[]
  stockMovements: StockMovement[]
  stats: {
    totalUnitsSold: number
    totalRevenue: number
    totalRestocked: number
    marginPerUnit: number
    totalProfitEstimated: number
  }
}


