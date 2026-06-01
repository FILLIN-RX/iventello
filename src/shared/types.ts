export interface Product {
  id: string
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
}

export interface ProductWithRelations extends Product {
  supplier: Supplier | null
  stocks: StockInfo[]
  category: Category | null
}

export interface StockInfo {
  id: string
  quantity: number
  alertLimit: number
  shelfLocation: string | null
  warehouse: Warehouse
}

export interface Category {
  id: string
  name: string
  description: string | null
  createdAt: string
  updatedAt: string
  _count?: { products: number }
}

export interface Expense {
  id: string
  title: string
  amount: number
  category: string
  date: string
  description: string | null
}

export interface Supplier {
  id: string
  name: string
  email: string | null
  phone: string | null
  address: string | null
  createdAt: string
}

export interface Client {
  id: string
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
  subTotal: number
  vatTotal: number
  discount: number
  finalTotal: number
  paymentMethod: string
  createdAt: string
}

export interface SaleWithClient extends Sale {
  client: Client | null
  items: SaleItem[]
  warehouse: Warehouse
}

export interface SaleItem {
  id: string
  saleId: string
  productId: string
  quantity: number
  unitPrice: number
}

export interface Warehouse {
  id: string
  name: string
  location: string | null
  logoUrl: string | null
  mobileMoneyEnabled: boolean
}

export interface StockAlert {
  product: Product
  stock: StockInfo
  warehouse: Warehouse
}

export interface ReceiptData {
  items: { product: { name: string; price: number }; quantity: number }[]
  totalAmount: number
  saleId: string
  date: string
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
  warehouseId: string
  createdAt: string
  updatedAt: string
}

export interface CashTransactionLine {
  id: string
  transactionId: string
  productId: string
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
  totalProducts: number
  alertCount: number
}

export interface CashReportData {
  warehouseName: string
  warehouseLogo: string | null
  operatorName: string
  dateRange: { start: string; end: string }
  soldeOuverture: number
  totalEntrees: number
  totalSorties: number
  soldeCloture: number
  transactions: (CashTransactionWithLines)[]
}

export interface ElectronApi {
  getProducts: () => Promise<ProductWithRelations[]>
  getProductByBarcode: (barcode: string) => Promise<ProductWithRelations | null>
  createProduct: (data: Partial<Product>) => Promise<Product>
  updateProduct: (id: string, data: Partial<Product>) => Promise<Product>
  deleteProduct: (id: string) => Promise<void>
  createSale: (data: {
    warehouseId: string
    clientId?: string | null
    subTotal: number
    vatTotal?: number
    discount?: number
    finalTotal: number
    paymentMethod: string
    items: { productId: string; quantity: number; unitPrice: number }[]
  }) => Promise<Sale>
  getSales: (clientId?: string) => Promise<SaleWithClient[]>
  getWarehouses: () => Promise<Warehouse[]>
  createWarehouse: (data: { name: string; location?: string; logoUrl?: string; mobileMoneyEnabled?: boolean }) => Promise<Warehouse>
  updateWarehouse: (id: string, data: Partial<{ name: string; location: string; logoUrl: string; mobileMoneyEnabled: boolean }>) => Promise<Warehouse>
  selectLogo: () => Promise<string | null>
  saveLogo: (sourcePath: string, warehouseId: string) => Promise<string>
  saveProductImage: (sourcePath: string, productId: string) => Promise<string>
  deleteWarehouse: (id: string) => Promise<void>
  getStockAlerts: () => Promise<StockAlert[]>
  getPrinters: () => Promise<string[]>
  printReceipt: (data: ReceiptData) => Promise<void>
  exportStockReport: (data: { products: unknown[]; alerts: unknown[]; totalProducts: number; totalValue: number; alertCount: number; date: string }) => Promise<string>
  getClients: () => Promise<ClientStats[]>
  getClient: (id: string) => Promise<ClientStats & { sales: SaleWithClient[] }>
  createClient: (data: { name: string; email?: string; phone?: string; address?: string; notes?: string }) => Promise<Client>
  updateClient: (id: string, data: Partial<{ name: string; email: string; phone: string; address: string; notes: string }>) => Promise<Client>
  deleteClient: (id: string) => Promise<void>
  getSuppliers: () => Promise<Supplier[]>
  createSupplier: (data: { name: string; email?: string; phone?: string; address?: string }) => Promise<Supplier>
  updateSupplier: (id: string, data: Partial<{ name: string; email: string; phone: string; address: string }>) => Promise<Supplier>
  deleteSupplier: (id: string) => Promise<void>
  analyzeStock: () => Promise<{ orders: PurchaseOrderItem[]; pdfPath: string }>
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
  getCategories: () => Promise<Category[]>
  createCategory: (data: { name: string; description?: string | null }) => Promise<Category>
  updateCategory: (id: string, data: Partial<{ name: string; description: string | null }>) => Promise<Category>
  deleteCategory: (id: string) => Promise<void>
  // Dépenses
  getExpenses: () => Promise<Expense[]>
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
  exportMobileMoneySheet: (warehouseId: string, month: string, data: MobileMoneyExportRow[]) => Promise<string>
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
  // Canal+
  getCanalPlusCells: (warehouseId: string, month: string) => Promise<CanalPlusCell[]>
  saveCanalPlusCells: (warehouseId: string, month: string, cells: { day: number; col: string; value: number }[]) => Promise<void>
  exportTablePdf: (html: string, filename: string) => Promise<string>
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

export interface MobileMoneyExportRow {
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
