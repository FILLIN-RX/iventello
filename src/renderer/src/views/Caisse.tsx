import { useState, useRef, useEffect, useMemo, useDeferredValue } from 'react'
import {
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Barcode,
  Printer,
  User,
  UserPlus,
  UserCheck,
  Clock,
  BookOpen,
  Book,
  PackageOpen,
  Package,
  Scissors,
  Search,
  X,
  Wifi,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Loader2,
  Check,
  CheckCircle2,
  CornerDownLeft,
  GraduationCap,
  Sparkles
} from 'lucide-react'
import { useProducts } from '../hooks/useProducts'
import { useWarehouses } from '../hooks/useWarehouses'
import { useBarcodeScanner } from '../hooks/useBarcodeScanner'
import { useDeviceCheck } from '../hooks/useDeviceCheck'
import { DeviceCheckModal } from '../components/DeviceCheckModal'
import { PrinterConfigModal } from '../components/PrinterConfigModal'
import { usePrinterStore } from '../stores/printerStore'
import { useCashRegisterStore } from '../stores/cashRegisterStore'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem, SelectGroup, SelectLabel, SelectSeparator } from '../components/ui/select'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog'
import { useEntrepotStore } from '../stores/entrepotStore'
import { useNotifications } from '../stores/notificationStore'
import { feedback } from '../stores/feedbackStore'
import { cn, formatCurrency, normalizeText } from '@/lib/utils'
import type { ProductWithRelations, Warehouse, Client, User as AgentUser, Category, ClassLevel } from '../../../shared/types'
import type { BookWithRelations, BookStockInfo } from '../../../shared/types'

interface CartItem {
  productId: string
  name: string
  price: number
  quantity: number
  stock: number
  vatRate: number
  type: 'product' | 'book'
  classLevelName?: string
}

function Caisse() {
  const { products } = useProducts()
  const { warehouses } = useWarehouses()
  const { selectedId: workspaceId, selectedName: workspaceName } = useEntrepotStore()
  const [items, setItems] = useState<CartItem[]>([])
  const [warehouseId, setWarehouseId] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('ESPECES')
  const [discount, setDiscount] = useState(0)
  const [clientSearch, setClientSearch] = useState('')
  const [clients, setClients] = useState<Client[]>([])
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [showClientSearch, setShowClientSearch] = useState(false)
  const [validating, setValidating] = useState(false)
  const [applyVat, setApplyVat] = useState(false)
  const [saleDone, setSaleDone] = useState(false)
  const [saleError, setSaleError] = useState<string | null>(null)
  const [scanFeedback, setScanFeedback] = useState<string | null>(null)
  const [showPrintDialog, setShowPrintDialog] = useState(false)
  const [showPrinterConfigModal, setShowPrinterConfigModal] = useState(false)
  const printerConfig = usePrinterStore((s) => s.config)
  const [lastSaleId, setLastSaleId] = useState('')
  const [lastSaleInvoice, setLastSaleInvoice] = useState('')
  const [lastPrintData, setLastPrintData] = useState<{ items: CartItem[]; total: number } | null>(null)
  const [completedSale, setCompletedSale] = useState<{ total: number; count: number; invoiceNumber?: string } | null>(null)
  const [printers, setPrinters] = useState<string[]>([])
  const [deviceModal, setDeviceModal] = useState<'scanner' | 'printer' | null>(null)
  const [showNewClient, setShowNewClient] = useState(false)
  const [newClientName, setNewClientName] = useState('')
  const [newClientPhone, setNewClientPhone] = useState('')
  const [newClientEmail, setNewClientEmail] = useState('')
  // Librairie state
  const [caisseTab, setCaisseTab] = useState<'produits' | 'livres'>('produits')
  const [librairieEnabled, setLibrairieEnabled] = useState(false)
  const [books, setBooks] = useState<BookWithRelations[]>([])
  const [bookStocks, setBookStocks] = useState<BookStockInfo[]>([])
  const [classLevels, setClassLevels] = useState<ClassLevel[]>([])
  const [classFilter, setClassFilter] = useState<string>('__all')
  const [showPacketDialog, setShowPacketDialog] = useState(false)
  const [packetBook, setPacketBook] = useState<BookWithRelations | null>(null)
  const [packetUnitPrice, setPacketUnitPrice] = useState(0)
  const [packetQuantity, setPacketQuantity] = useState(1)

  // Search + category filter
  const [searchQuery, setSearchQuery] = useState('')
  const deferredSearch = useDeferredValue(searchQuery)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const [categoryFilter, setCategoryFilter] = useState('__all')
  const [categories, setCategories] = useState<Category[]>([])

  // Avance / Non livré / agent
  const [isAvance, setIsAvance] = useState(false)
  const [isNonLivre, setIsNonLivre] = useState(false)
  const [montantAvance, setMontantAvance] = useState<number>(0)
  const [showMissingPhoneModal, setShowMissingPhoneModal] = useState(false)
  const [missingPhone, setMissingPhone] = useState('')
  const [savingPhone, setSavingPhone] = useState(false)
  const [agents, setAgents] = useState<AgentUser[]>([])
  const [selectedAgentId, setSelectedAgentId] = useState<string>('')
  const { testScanner, testPrinter } = useDeviceCheck()
  const searchTimeoutRef = useRef<any>(null)

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    }
  }, [])

  // Keyboard shortcut: press '/' or 'F2' to focus POS search, 'Escape' to clear
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const activeTag = document.activeElement?.tagName
      if ((e.key === '/' || e.key === 'F2') && activeTag !== 'INPUT' && activeTag !== 'TEXTAREA') {
        e.preventDefault()
        searchInputRef.current?.focus()
        searchInputRef.current?.select()
      }
      if (e.key === 'Escape' && searchQuery) {
        setSearchQuery('')
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [searchQuery])

  useEffect(() => {
    if (workspaceId) {
      setWarehouseId(workspaceId)
    } else if (warehouses.length > 0 && !warehouseId) {
      setWarehouseId(warehouses[0].id)
    }
  }, [workspaceId, warehouses])

  useEffect(() => {
    if (!warehouseId) return
    const wh = warehouses.find(w => w.id === warehouseId)
    setLibrairieEnabled(wh?.librairieEnabled ?? false)
    window.api.getBooks().then((b) => setBooks(b || [])).catch(() => {})
    window.api.getBookStocks(warehouseId).then((bs) => setBookStocks(bs || [])).catch(() => {})
    window.api.getClassLevels().then((cls: any) => setClassLevels(cls || [])).catch(() => {})
  }, [warehouseId, warehouses])

  useEffect(() => {
    window.api.getAgents().then((a: any) => setAgents(a)).catch(() => {})
  }, [])

  useEffect(() => {
    window.api.getCategories().then((c: any) => setCategories(c)).catch(() => {})
  }, [])

  const subTotal = useMemo(() => Math.round(items.reduce((s, i) => s + i.price * i.quantity, 0)), [items])
  const vatTotal = useMemo(() => applyVat ? Math.round(items.reduce((s, i) => s + i.price * i.quantity * (i.vatRate / 100), 0)) : 0, [applyVat, items])
  const finalTotal = useMemo(() => Math.max(0, Math.round(subTotal + vatTotal - discount)), [subTotal, vatTotal, discount])

  useEffect(() => {
    setMontantAvance(finalTotal)
  }, [isAvance, isNonLivre, finalTotal])

  useBarcodeScanner(async (barcode) => {
    const found = products.find((p) => p.barcode === barcode)
    if (found) {
      addItem(found)
      setScanFeedback(`${found.name} ajouté`)
    } else {
      setScanFeedback(`Produit non trouvé : ${barcode}`)
    }
    setTimeout(() => setScanFeedback(null), 2000)
  })

  function addItem(p: ProductWithRelations) {
    const stock = p.stocks?.find((s) => s.warehouse.id === warehouseId)?.quantity ?? 0
    if (!isNonLivre && stock <= 0) {
      feedback.toast.warning(`"${p.name}" est en rupture de stock. Activez l'option "Non livré (en attente d'arrivage)" pour enregistrer une commande.`)
      return
    }

    setItems((prev) => {
      const existing = prev.find((i) => i.productId === p.id)
      if (existing) {
        if (!isNonLivre && existing.quantity + 1 > stock) {
          feedback.toast.warning(`Stock insuffisant pour "${p.name}" : seulement ${stock} unité(s) disponible(s) en boutique.`)
          return prev
        }
        return prev.map((i) => i.productId === p.id ? { ...i, quantity: i.quantity + 1 } : i)
      }
      return [...prev, { productId: p.id, name: p.name, price: p.sellingPrice, quantity: 1, stock, vatRate: p.vatRate, type: 'product' }]
    })
  }

  function addBookToCart(book: BookWithRelations, qty: number = 1, unitPrice?: number) {
    const price = unitPrice ?? book.price
    const stockQty = bookStocks.find(s => s.bookId === book.id)?.quantity ?? 0
    if (!isNonLivre && stockQty <= 0) {
      feedback.toast.warning(`"${book.title}" est en rupture de stock. Activez l'option "Non livré" pour enregistrer une commande.`)
      return
    }

    const classLevelName = book.classLevel?.name || book.classLevel?.code || ''

    setItems((prev) => {
      const existing = prev.find((i) => i.productId === book.id)
      if (existing) {
        if (!isNonLivre && existing.quantity + qty > stockQty) {
          feedback.toast.warning(`Stock insuffisant pour "${book.title}" : seulement ${stockQty} unité(s) disponible(s).`)
          return prev
        }
        return prev.map((i) => i.productId === book.id ? { ...i, quantity: i.quantity + qty } : i)
      }
      return [...prev, { productId: book.id, name: book.title, price, quantity: qty, stock: stockQty, vatRate: 0, type: 'book', classLevelName }]
    })
  }

  function updateQuantity(productId: string, qty: number) {
    if (qty <= 0) { setItems((prev) => prev.filter((i) => i.productId !== productId)); return }
    const item = items.find(i => i.productId === productId)
    if (item && !isNonLivre && qty > item.stock) {
      feedback.toast.warning(`Quantité limitée au stock disponible (${item.stock} unité(s)). Activez l'option "Non livré" pour commander au-delà.`)
      qty = item.stock
    }
    setItems((prev) => prev.map((i) => i.productId === productId ? { ...i, quantity: qty } : i))
  }

  function openPacketDialog(book: BookWithRelations) {
    setPacketBook(book)
    setPacketUnitPrice(book.unitSellingPrice ?? book.price)
    setPacketQuantity(1)
    setShowPacketDialog(true)
  }

  async function searchClient(q: string) {
    setClientSearch(q)
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)

    if (q.length < 2) {
      setClients([])
      return
    }

    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const results = await window.api.searchClients(q) as any[]
        setClients(results.map((c: any) => c.client))
      } catch { /* ignore */ }
    }, 250)
  }

  const [showSalePreviewModal, setShowSalePreviewModal] = useState(false)

  async function handleValidate() {
    if (items.length === 0 || !warehouseId) return

    // Vérification téléphone obligatoire pour les avances et commandes non livrées
    if (isAvance || isNonLivre) {
      if (!selectedClient) {
        setSaleError('Client obligatoire : Vous devez obligatoirement sélectionner ou créer un client avec un numéro de téléphone.')
        setShowClientSearch(true)
        feedback.toast.error('Client requis', 'Veuillez sélectionner ou créer un client avec son numéro de téléphone.')
        return
      }
      if (!selectedClient.phone || !selectedClient.phone.trim()) {
        setMissingPhone('')
        setShowMissingPhoneModal(true)
        return
      }
    }

    setShowSalePreviewModal(true)
  }

  async function executeSale(customPhone?: string) {
    try {
      setValidating(true)
      setSaleError(null)

      let clientToUse = selectedClient
      if (customPhone && selectedClient) {
        try {
          const updated = await window.api.updateClient(selectedClient.id, { phone: customPhone.trim() })
          setSelectedClient(updated)
          clientToUse = updated
        } catch (e) {
          console.error('Erreur mise à jour téléphone client', e)
        }
      }

      const isPending = isNonLivre
      const isAdvanceSale = isAvance || (isNonLivre && montantAvance < finalTotal)
      const saleStatus = (isAvance || isNonLivre) ? 'EN_ATTENTE' : 'PAYE'

      const sale = await window.api.createSale({
        warehouseId,
        clientId: clientToUse?.id ?? null,
        subTotal,
        vatTotal: applyVat ? vatTotal : 0,
        discount,
        finalTotal,
        paymentMethod,
        status: saleStatus,
        agentId: selectedAgentId || null,
        isPendingDelivery: isPending,
        montantAvance: isAdvanceSale ? montantAvance : undefined,
        items: items.map((i) => ({
          productId: i.type === 'product' ? i.productId : undefined,
          bookId: i.type === 'book' ? i.productId : undefined,
          quantity: i.quantity,
          unitPrice: i.price
        }))
      })
      const saleTotal = finalTotal
      const totalUnits = items.reduce((acc, i) => acc + i.quantity, 0)
      const initialItemsCount = items.length

      setLastSaleId(sale.id)
      setLastSaleInvoice(sale.invoiceNumber)

      setLastPrintData({ items: [...items], total: saleTotal })
      setCompletedSale({ total: saleTotal, count: totalUnits, invoiceNumber: sale.invoiceNumber })
      setItems([])
      setDiscount(0)
      setIsAvance(false)
      setIsNonLivre(false)
      setSaleDone(true)

      useCashRegisterStore.getState().fetchDailyData(warehouseId)
      useNotifications.getState().addNotification({
        type: 'vente',
        title: isPending ? 'Nouvelle commande (non livrée)' : isAvance ? 'Nouvelle avance client' : 'Nouvelle vente',
        description: `Vente de ${formatCurrency(subTotal)} — ${initialItemsCount} article${initialItemsCount > 1 ? 's' : ''}${clientToUse ? ` — ${clientToUse.name}` : ''}${isPending ? ' (en attente de livraison)' : isAvance ? ' (avance)' : ''}`,
        warehouseId: workspaceId ?? undefined,
        warehouseName: workspaceName ?? undefined,
        meta: { montant: saleTotal, articles: initialItemsCount, client: clientToUse?.name ?? '' }
      })
    } catch (err) {
      setSaleError(err instanceof Error ? err.message : 'Erreur lors de la vente')
    }
    finally { setValidating(false) }
  }

  async function handleCreateClient() {
    if (!newClientName.trim()) return
    if ((isAvance || isNonLivre) && !newClientPhone.trim()) {
      feedback.toast.error('Téléphone requis', 'Le numéro de téléphone est obligatoire pour enregistrer une avance ou une commande.')
      return
    }
    try {
      const client = await window.api.createClient({ name: newClientName.trim(), phone: newClientPhone.trim() || undefined, email: newClientEmail.trim() || undefined })
      setSelectedClient(client)
      setShowNewClient(false)
      setNewClientName('')
      setNewClientPhone('')
      setNewClientEmail('')
      setClientSearch('')
      setShowClientSearch(false)
    } catch (err) { console.error('Erreur création client', err) }
  }

  async function handlePrint() {
    if (!lastPrintData) return
    try {
      await window.api.printReceipt({
        items: lastPrintData.items.map((i) => ({ product: { name: i.name, price: i.price }, quantity: i.quantity })),
        totalAmount: lastPrintData.total,
        saleId: lastSaleId,
        invoiceNumber: lastSaleInvoice,
        date: new Date().toLocaleString('fr-FR')
      }, printerConfig)
      feedback.toast.success('Ticket imprimé avec succès')
    } catch (err: any) {
      console.error('Erreur impression', err)
      feedback.toast.error(err?.message || 'Erreur lors de l\'impression du ticket', 'Erreur impression')
    }
    setShowPrintDialog(false)
  }

  // Pre-indexed products for ultra-fast normalized multi-token searching
  const indexedProducts = useMemo(() => {
    return products.map((p) => {
      const searchTokens = [
        p.name,
        p.barcode,
        p.category?.name,
        p.supplier?.name,
        p.field1_value,
        p.field2_value,
        p.field3_value
      ]
        .filter(Boolean)
        .map((s) => normalizeText(s))
        .join(' ')

      return {
        product: p,
        searchTokens,
        normalizedBarcode: normalizeText(p.barcode)
      }
    })
  }, [products])

// Helper to get smart aliases and abbreviations for school classes
function getClassAliases(code?: string | null, name?: string | null): string[] {
  if (!code && !name) return []
  const normCode = normalizeText(code || '')
  const normName = normalizeText(name || '')
  const aliases: string[] = [normCode, normName].filter(Boolean)

  // Abbréviations / Alias francophones
  if (/6/i.test(normCode) || /sixieme/i.test(normName)) aliases.push('6e', '6eme', 'sixieme', '6 eme')
  if (/5/i.test(normCode) || /cinquieme/i.test(normName)) aliases.push('5e', '5eme', 'cinquieme', '5 eme')
  if (/4/i.test(normCode) || /quatrieme/i.test(normName)) aliases.push('4e', '4eme', 'quatrieme', '4 eme')
  if (/3/i.test(normCode) || /troisieme/i.test(normName)) aliases.push('3e', '3eme', 'troisieme', '3 eme')
  if (/2/i.test(normCode) || /seconde/i.test(normName)) aliases.push('2nd', '2nde', 'seconde', '2 nde')
  if (/1/i.test(normCode) || /premiere/i.test(normName)) aliases.push('1ere', '1re', 'premiere', '1 ere')
  if (/tle|term/i.test(normCode) || /terminale/i.test(normName)) aliases.push('tle', 'term', 'terminale', 'terminal')
  if (/sil/i.test(normCode) || /sil/i.test(normName)) aliases.push('sil', 'section d initiation')
  if (/cp/i.test(normCode) || /cours preparatoire/i.test(normName)) aliases.push('cp', 'cours preparatoire')
  if (/ce1/i.test(normCode) || /ce 1/i.test(normName)) aliases.push('ce1', 'ce 1', 'cours elementaire 1')
  if (/ce2/i.test(normCode) || /ce 2/i.test(normName)) aliases.push('ce2', 'ce 2', 'cours elementaire 2')
  if (/cm1/i.test(normCode) || /cm 1/i.test(normName)) aliases.push('cm1', 'cm 1', 'cours moyen 1')
  if (/cm2/i.test(normCode) || /cm 2/i.test(normName)) aliases.push('cm2', 'cm 2', 'cours moyen 2')
  if (/mat|petite|moyenne|grande/i.test(normCode) || /maternelle/i.test(normName)) aliases.push('maternelle', 'ps', 'ms', 'gs')

  // Abbréviations / Alias anglophones
  if (/form\s*1/i.test(normCode) || /form\s*1/i.test(normName)) aliases.push('form 1', 'f1', 'form1')
  if (/form\s*2/i.test(normCode) || /form\s*2/i.test(normName)) aliases.push('form 2', 'f2', 'form2')
  if (/form\s*3/i.test(normCode) || /form\s*3/i.test(normName)) aliases.push('form 3', 'f3', 'form3')
  if (/form\s*4/i.test(normCode) || /form\s*4/i.test(normName)) aliases.push('form 4', 'f4', 'form4')
  if (/form\s*5/i.test(normCode) || /form\s*5/i.test(normName)) aliases.push('form 5', 'f5', 'form5')
  if (/lower\s*sixth/i.test(normCode) || /lower/i.test(normName)) aliases.push('lower sixth', 'l6', 'lowersixth')
  if (/upper\s*sixth/i.test(normCode) || /upper/i.test(normName)) aliases.push('upper sixth', 'u6', 'uppersixth')
  if (/class\s*1/i.test(normCode) || /class\s*1/i.test(normName)) aliases.push('class 1', 'c1')
  if (/class\s*2/i.test(normCode) || /class\s*2/i.test(normName)) aliases.push('class 2', 'c2')
  if (/class\s*3/i.test(normCode) || /class\s*3/i.test(normName)) aliases.push('class 3', 'c3')
  if (/class\s*4/i.test(normCode) || /class\s*4/i.test(normName)) aliases.push('class 4', 'c4')
  if (/class\s*5/i.test(normCode) || /class\s*5/i.test(normName)) aliases.push('class 5', 'c5')
  if (/class\s*6/i.test(normCode) || /class\s*6/i.test(normName)) aliases.push('class 6', 'c6')

  return Array.from(new Set(aliases.map(normalizeText)))
}

  // Pre-indexed books for fast normalized searching including class aliases
  const indexedBooks = useMemo(() => {
    return books.map((b) => {
      const classAliases = getClassAliases(b.classLevel?.code, b.classLevel?.name)
      const searchTokens = [
        b.title,
        b.isbn,
        b.author,
        b.editor,
        b.subject?.name,
        b.classLevel?.name,
        b.classLevel?.code,
        b.classLevel?.cycle,
        b.classLevel?.system,
        ...classAliases
      ]
        .filter(Boolean)
        .map((s) => normalizeText(s as string))
        .join(' ')

      return {
        book: b,
        searchTokens,
        normalizedIsbn: normalizeText(b.isbn)
      }
    })
  }, [books])

  // Filter products by multi-token search + category
  const filteredProducts = useMemo(() => {
    const normalizedQuery = normalizeText(deferredSearch)
    const terms = normalizedQuery.split(/\s+/).filter(Boolean)

    return indexedProducts
      .filter(({ product, searchTokens, normalizedBarcode }) => {
        if (categoryFilter !== '__all' && product.categoryId !== categoryFilter) return false
        if (terms.length === 0) return true
        if (normalizedBarcode && normalizedBarcode === normalizedQuery) return true
        return terms.every((term) => searchTokens.includes(term))
      })
      .map(({ product }) => product)
  }, [indexedProducts, categoryFilter, deferredSearch])

  // Filter books by multi-token search + class level filter
  const filteredBooks = useMemo(() => {
    const normalizedQuery = normalizeText(deferredSearch)
    const terms = normalizedQuery.split(/\s+/).filter(Boolean)

    return indexedBooks
      .filter(({ book, searchTokens, normalizedIsbn }) => {
        if (classFilter !== '__all' && book.classLevelId !== classFilter) return false
        if (terms.length === 0) return true
        if (normalizedIsbn && normalizedIsbn === normalizedQuery) return true
        return terms.every((term) => searchTokens.includes(term))
      })
      .map(({ book }) => book)
  }, [indexedBooks, classFilter, deferredSearch])

  // Quick Action on Enter in Search Bar (Instant Scan / Fast Add)
  function handleSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      const q = searchQuery.trim()
      if (!q) return

      if (caisseTab === 'produits') {
        const exactBarcode = products.find((p) => p.barcode === q)
        if (exactBarcode) {
          addItem(exactBarcode)
          setScanFeedback(`${exactBarcode.name} ajouté`)
          setTimeout(() => setScanFeedback(null), 2000)
          setSearchQuery('')
          return
        }
        if (filteredProducts.length > 0) {
          const topMatch = filteredProducts[0]
          addItem(topMatch)
          setScanFeedback(`${topMatch.name} ajouté`)
          setTimeout(() => setScanFeedback(null), 2000)
          if (filteredProducts.length === 1) {
            setSearchQuery('')
          }
        }
      } else if (caisseTab === 'livres' && librairieEnabled) {
        const exactIsbn = books.find((b) => b.isbn === q)
        if (exactIsbn) {
          addBookToCart(exactIsbn)
          setScanFeedback(`${exactIsbn.title} ajouté`)
          setTimeout(() => setScanFeedback(null), 2000)
          setSearchQuery('')
          return
        }
        if (filteredBooks.length > 0) {
          const topBook = filteredBooks[0]
          addBookToCart(topBook)
          setScanFeedback(`${topBook.title} ajouté`)
          setTimeout(() => setScanFeedback(null), 2000)
          if (filteredBooks.length === 1) {
            setSearchQuery('')
          }
        }
      }
    }
  }

  // Infinite Scroll state
  const INITIAL_BATCH_SIZE = 24
  const BATCH_INCREMENT = 16
  const [visibleProdCount, setVisibleProdCount] = useState(INITIAL_BATCH_SIZE)
  const [visibleBookCount, setVisibleBookCount] = useState(INITIAL_BATCH_SIZE)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const prodSentinelRef = useRef<HTMLDivElement>(null)
  const bookSentinelRef = useRef<HTMLDivElement>(null)
  const catalogScrollRef = useRef<HTMLDivElement>(null)

  // Reset batch count on filters change
  useEffect(() => {
    setVisibleProdCount(INITIAL_BATCH_SIZE)
    if (catalogScrollRef.current) {
      catalogScrollRef.current.scrollTop = 0
    }
  }, [searchQuery, categoryFilter])

  useEffect(() => {
    setVisibleBookCount(INITIAL_BATCH_SIZE)
    if (catalogScrollRef.current) {
      catalogScrollRef.current.scrollTop = 0
    }
  }, [searchQuery])

  // Infinite scroll observer for Products
  useEffect(() => {
    if (caisseTab !== 'produits') return
    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0]
        if (first.isIntersecting && visibleProdCount < filteredProducts.length) {
          setIsLoadingMore(true)
          setTimeout(() => {
            setVisibleProdCount((prev) => Math.min(prev + BATCH_INCREMENT, filteredProducts.length))
            setIsLoadingMore(false)
          }, 100)
        }
      },
      { root: null, rootMargin: '250px', threshold: 0.05 }
    )

    const currentSentinel = prodSentinelRef.current
    if (currentSentinel) observer.observe(currentSentinel)
    return () => {
      if (currentSentinel) observer.unobserve(currentSentinel)
    }
  }, [caisseTab, visibleProdCount, filteredProducts.length])

  // Infinite scroll observer for Books
  useEffect(() => {
    if (caisseTab !== 'livres' || !librairieEnabled) return
    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0]
        if (first.isIntersecting && visibleBookCount < filteredBooks.length) {
          setIsLoadingMore(true)
          setTimeout(() => {
            setVisibleBookCount((prev) => Math.min(prev + BATCH_INCREMENT, filteredBooks.length))
            setIsLoadingMore(false)
          }, 100)
        }
      },
      { root: null, rootMargin: '250px', threshold: 0.05 }
    )

    const currentSentinel = bookSentinelRef.current
    if (currentSentinel) observer.observe(currentSentinel)
    return () => {
      if (currentSentinel) observer.unobserve(currentSentinel)
    }
  }, [caisseTab, librairieEnabled, visibleBookCount, filteredBooks.length])

  const paginatedProducts = useMemo(() => {
    return filteredProducts.slice(0, visibleProdCount)
  }, [filteredProducts, visibleProdCount])

  const paginatedBooks = useMemo(() => {
    return filteredBooks.slice(0, visibleBookCount)
  }, [filteredBooks, visibleBookCount])

  const selectedCategory = useMemo(() => categories.find(c => c.id === categoryFilter), [categories, categoryFilter])
  const selectedClass = useMemo(() => classLevels.find(cl => cl.id === classFilter), [classLevels, classFilter])
  const activeResultsCount = caisseTab === 'produits' ? filteredProducts.length : filteredBooks.length

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 h-auto lg:h-[calc(100vh-115px)] min-h-0">
      {/* Colonne de Gauche : Recherche + Catalogue de Produits / Livres */}
      <div className="lg:col-span-2 flex flex-col h-full min-h-0 space-y-2.5">
        {/* Barre de Recherche + Filtre Catégorie / Classe + Imprimante */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              ref={searchInputRef}
              placeholder={caisseTab === 'livres' ? "Rechercher titre, classe (ex: 6e, CM2, Tle), auteur, ISBN... (F2 ou /)" : "Rechercher nom, code-barres, fournisseur... (F2 ou /)"}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              className="pl-9 pr-24 h-9 sm:h-10 rounded-xl bg-card border-border/70 focus-visible:ring-primary/40 shadow-sm text-sm"
              autoFocus
            />
            {/* Quick Badge / Clear Button inside Search Bar */}
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
              {searchQuery ? (
                <>
                  <Badge
                    variant="secondary"
                    className="text-[10px] font-mono px-1.5 py-0 text-muted-foreground bg-muted/80 hidden sm:inline-flex"
                  >
                    {activeResultsCount}
                  </Badge>
                  <button
                    onClick={() => {
                      setSearchQuery('')
                      searchInputRef.current?.focus()
                    }}
                    className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    title="Effacer la recherche (Échap)"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </>
              ) : (
                <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border bg-muted/50 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                  /
                </kbd>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Filtre Catégorie pour Produits */}
            {caisseTab === 'produits' && categories.length > 0 && (
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-36 sm:w-44 rounded-xl h-9 sm:h-10 text-xs sm:text-sm">
                  <SelectValue placeholder="Toutes catégories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all">Toutes catégories</SelectItem>
                  {categories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {caisseTab === 'produits' && selectedCategory && (
              <Button variant="ghost" size="sm" onClick={() => setCategoryFilter('__all')} className="h-9 sm:h-10 px-2.5">
                <X className="h-4 w-4" />
              </Button>
            )}

            {/* Filtre Classe pour Livres */}
            {caisseTab === 'livres' && classLevels.length > 0 && (
              <Select value={classFilter} onValueChange={setClassFilter}>
                <SelectTrigger className="w-40 sm:w-48 rounded-xl h-9 sm:h-10 text-xs sm:text-sm">
                  <GraduationCap className="h-3.5 w-3.5 mr-1.5 text-primary shrink-0" />
                  <SelectValue placeholder="Toutes les classes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all">Toutes les classes</SelectItem>
                  {classLevels.map(cl => (
                    <SelectItem key={cl.id} value={cl.id}>
                      {cl.name} ({cl.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {caisseTab === 'livres' && selectedClass && (
              <Button variant="ghost" size="sm" onClick={() => setClassFilter('__all')} className="h-9 sm:h-10 px-2.5" title="Réinitialiser la classe">
                <X className="h-4 w-4" />
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPrinterConfigModal(true)}
              className="h-9 sm:h-10 text-xs border-dashed gap-1.5 shrink-0 rounded-xl px-2.5"
              title="Configurer l'imprimante ticket (USB / Wi-Fi)"
            >
              {printerConfig.type === 'NETWORK' ? (
                <>
                  <Wifi className="h-3.5 w-3.5 text-emerald-500" />
                  <span className="hidden md:inline">Wi-Fi : {printerConfig.ip || '9100'}</span>
                </>
              ) : (
                <>
                  <Printer className="h-3.5 w-3.5 text-primary" />
                  <span className="hidden md:inline">USB : {printerConfig.printerName || 'Par défaut'}</span>
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Barre de Suggestions intelligentes de Classes (onglet Livres) */}
        {caisseTab === 'livres' && classLevels.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 shrink-0 no-scrollbar">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider shrink-0 flex items-center gap-1 pl-1">
              <GraduationCap className="h-3 w-3 text-primary" /> Suggestions :
            </span>
            <button
              onClick={() => setClassFilter('__all')}
              className={cn(
                'h-6 text-[11px] rounded-full px-2.5 font-medium shrink-0 border transition-all',
                classFilter === '__all'
                  ? 'bg-primary text-primary-foreground border-primary shadow-xs font-bold'
                  : 'bg-card hover:bg-muted text-muted-foreground hover:text-foreground border-border/70'
              )}
            >
              Toutes ({books.length})
            </button>
            {classLevels.map((cl) => {
              const isSelected = classFilter === cl.id
              const queryNorm = normalizeText(deferredSearch)
              const aliases = getClassAliases(cl.code, cl.name)
              const isMatchedBySearch = queryNorm.length > 0 && (
                normalizeText(cl.name).includes(queryNorm) ||
                normalizeText(cl.code).includes(queryNorm) ||
                aliases.some(a => a.includes(queryNorm) || queryNorm.includes(a))
              )
              const bookCount = books.filter(b => b.classLevelId === cl.id).length

              return (
                <button
                  key={cl.id}
                  onClick={() => setClassFilter(isSelected ? '__all' : cl.id)}
                  className={cn(
                    'h-6 text-[11px] rounded-full px-2.5 font-medium shrink-0 border transition-all flex items-center gap-1.5',
                    isSelected
                      ? 'bg-primary text-primary-foreground border-primary shadow-xs font-bold'
                      : isMatchedBySearch
                      ? 'bg-primary/15 text-primary border-primary/50 font-bold ring-1 ring-primary/40'
                      : 'bg-card hover:bg-muted text-muted-foreground hover:text-foreground border-border/70'
                  )}
                  title={`Filtrer les livres de ${cl.name}`}
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: cl.color || '#3b82f6' }}
                  />
                  <span>{cl.name}</span>
                  <span className={cn('text-[9px] opacity-75', isSelected ? 'text-primary-foreground' : 'text-muted-foreground')}>
                    ({bookCount})
                  </span>
                </button>
              )
            })}
          </div>
        )}

        {/* Carte Catalogue */}
        <Card className="flex-1 flex flex-col min-h-0 overflow-hidden shadow-sm">
          <CardHeader className="py-2.5 px-4 shrink-0 border-b">
            {(librairieEnabled || books.length > 0 || classLevels.length > 0) ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCaisseTab('produits')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-colors ${caisseTab === 'produits' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                ><Package className="h-3.5 w-3.5" /> Produits ({filteredProducts.length})</button>
                <button
                  onClick={() => setCaisseTab('livres')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-colors ${caisseTab === 'livres' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                ><BookOpen className="h-3.5 w-3.5" /> Livres scolaires ({filteredBooks.length})</button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Barcode className="h-4 w-4 text-primary" /> Produits ({filteredProducts.length})
                </CardTitle>
                <span className="text-[11px] text-muted-foreground">Scannez ou cliquez pour ajouter au panier</span>
              </div>
            )}
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto p-3 min-h-0">
            {scanFeedback && <div className="mb-2.5 rounded-md bg-primary/10 p-2 text-center text-xs font-medium text-primary animate-fade-in">{scanFeedback}</div>}

            {/* Onglet Produits avec Infinite Scroll */}
            {caisseTab === 'produits' && (
              <div className="space-y-3">
                {filteredProducts.length === 0 && (
                  <div className="text-muted-foreground py-12 text-center flex flex-col items-center gap-2">
                    <Package className="h-10 w-10 opacity-30" />
                    <p className="text-sm">Aucun produit ne correspond à votre recherche.</p>
                  </div>
                )}
                {filteredProducts.length > 0 && (
                  <>
                    <div
                      ref={catalogScrollRef}
                      className="grid grid-cols-1 gap-2.5 sm:grid-cols-2"
                    >
                      {paginatedProducts.map((p) => {
                        const stockData = p.stocks?.find((s) => s.warehouse.id === warehouseId)
                        const stockQty = stockData?.quantity ?? 0
                        const reservedQty = stockData?.quantityReservee ?? 0
                        const alertLimit = stockData?.alertLimit ?? 0
                        const availableQty = stockQty
                        return (
                          <Card
                            key={p.id}
                            className="cursor-pointer hover:shadow-md transition-all hover:border-primary/40 group active:scale-[0.99] border-border/80"
                            onClick={() => addItem(p)}
                          >
                            <CardContent className="flex items-center justify-between p-3">
                              <div className="min-w-0 flex-1 pr-2">
                                <p className="font-semibold text-xs sm:text-sm truncate group-hover:text-primary transition-colors" title={p.name}>
                                  {p.name}
                                </p>
                                <p className="text-xs sm:text-sm font-bold text-primary mt-0.5">
                                  {formatCurrency(p.sellingPrice)}
                                </p>
                                <div className="mt-1 flex flex-wrap items-center gap-1">
                                  <Badge variant={availableQty <= alertLimit ? 'destructive' : 'default'} className="text-[10px] px-1.5 py-0">
                                    Stock: {availableQty}
                                  </Badge>
                                  {reservedQty > 0 && <span className="text-[10px] text-amber-600 font-medium">Réservé: {reservedQty}</span>}
                                  {p.barcode && <span className="text-[10px] text-muted-foreground font-mono truncate max-w-[100px]">{p.barcode}</span>}
                                </div>
                              </div>
                              <Button
                                size="icon"
                                className="h-7 w-7 sm:h-8 sm:w-8 shrink-0 shadow-sm"
                                onClick={(e) => { e.stopPropagation(); addItem(p) }}
                                disabled={stockQty <= 0}
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            </CardContent>
                          </Card>
                        )
                      })}

                      {/* Sentinel trigger for infinite scrolling */}
                      <div ref={prodSentinelRef} className="col-span-1 sm:col-span-2 h-2 w-full" />
                    </div>

                    {/* Infinite Scroll Footer Indicator */}
                    <div className="flex flex-col items-center justify-center pt-2 pb-1 border-t text-xs text-muted-foreground gap-1">
                      <div className="flex items-center gap-2 text-[11px]">
                        <span>Affichage de {paginatedProducts.length} sur {filteredProducts.length} produit{filteredProducts.length > 1 ? 's' : ''}</span>
                        {isLoadingMore && (
                          <span className="flex items-center gap-1 text-primary font-medium">
                            <Loader2 className="h-3 w-3 animate-spin" /> Chargement...
                          </span>
                        )}
                      </div>

                      {visibleProdCount < filteredProducts.length ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 text-xs text-primary hover:bg-primary/10 gap-1.5 py-0"
                          onClick={() => setVisibleProdCount(prev => Math.min(prev + BATCH_INCREMENT, filteredProducts.length))}
                        >
                          Afficher +{Math.min(BATCH_INCREMENT, filteredProducts.length - visibleProdCount)} produits
                        </Button>
                      ) : (
                        <span className="text-[11px] text-muted-foreground/60 flex items-center gap-1">
                          <Check className="h-3 w-3 text-emerald-500" /> Tous les produits sont affichés
                        </span>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Onglet Livres avec Infinite Scroll & Classe à côté */}
            {caisseTab === 'livres' && (
              <div className="space-y-3">
                {filteredBooks.length === 0 && (
                  <div className="text-muted-foreground py-12 text-center flex flex-col items-center gap-2">
                    <BookOpen className="h-10 w-10 opacity-30" />
                    <p className="text-sm">Aucun livre trouvé {classFilter !== '__all' ? `pour la classe "${selectedClass?.name || classFilter}"` : ''}.</p>
                    {classFilter !== '__all' && (
                      <Button variant="outline" size="sm" onClick={() => setClassFilter('__all')} className="mt-2 text-xs">
                        Afficher toutes les classes
                      </Button>
                    )}
                  </div>
                )}
                {filteredBooks.length > 0 && (
                  <>
                    <div
                      ref={catalogScrollRef}
                      className="grid grid-cols-1 gap-2.5 sm:grid-cols-2"
                    >
                      {paginatedBooks.map(book => {
                        const stockQty = bookStocks.find(s => s.bookId === book.id)?.quantity ?? 0
                        const stock = bookStocks.find(s => s.bookId === book.id)
                        const alertLimit = stock?.alertLimit ?? 5
                        return (
                          <Card key={book.id} className="hover:shadow-md transition-all group active:scale-[0.99] border-border/80">
                            <CardContent className="p-3">
                              <div className="flex items-start justify-between">
                                <div className="flex-1 min-w-0 pr-2">
                                  {/* Titre + Badge de Classe côte à côte */}
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <p className="font-semibold text-xs sm:text-sm truncate group-hover:text-primary transition-colors" title={book.title}>
                                      {book.title}
                                    </p>
                                    {book.classLevel && (
                                      <Badge
                                        className="text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 border shadow-2xs"
                                        style={{
                                          backgroundColor: (book.classLevel.color || '#3b82f6') + '22',
                                          color: book.classLevel.color || '#3b82f6',
                                          borderColor: (book.classLevel.color || '#3b82f6') + '50'
                                        }}
                                      >
                                        {book.classLevel.name}
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                                    {book.author ? `${book.author}` : ''}{book.editor ? ` — ${book.editor}` : ''}
                                  </p>
                                  <p className="text-xs sm:text-sm font-bold text-primary mt-1">
                                    {formatCurrency(book.price)}
                                  </p>
                                  <div className="mt-1 flex flex-wrap items-center gap-1">
                                    <Badge variant={stockQty <= alertLimit ? 'destructive' : 'default'} className="text-[10px] px-1.5 py-0">
                                      Stock: {stockQty}
                                    </Badge>
                                    {book.isPacket && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Packet ({book.itemsPerPacket} p.)</Badge>}
                                    {book.subject && (
                                      <Badge className="text-[10px] px-1.5 py-0" style={{ backgroundColor: book.subject.color + '20', color: book.subject.color }}>
                                        {book.subject.name}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                                <div className="flex flex-col gap-1 shrink-0">
                                  <Button size="icon" className="h-7 w-7 sm:h-8 sm:w-8" onClick={() => addBookToCart(book)} title="Ajouter au panier" disabled={stockQty <= 0}>
                                    <Plus className="h-4 w-4" />
                                  </Button>
                                  {book.isPacket && book.unitSellingPrice && (
                                    <Button size="icon" variant="outline" className="h-7 w-7 sm:h-8 sm:w-8" onClick={() => openPacketDialog(book)} title="Détacher le packet">
                                      <Scissors className="h-3.5 w-3.5" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        )
                      })}

                      {/* Sentinel trigger for infinite scrolling */}
                      <div ref={bookSentinelRef} className="col-span-1 sm:col-span-2 h-2 w-full" />
                    </div>

                    {/* Infinite Scroll Footer Indicator */}
                    <div className="flex flex-col items-center justify-center pt-2 pb-1 border-t text-xs text-muted-foreground gap-1">
                      <div className="flex items-center gap-2 text-[11px]">
                        <span>Affichage de {paginatedBooks.length} sur {filteredBooks.length} livre{filteredBooks.length > 1 ? 's' : ''}</span>
                        {isLoadingMore && (
                          <span className="flex items-center gap-1 text-primary font-medium">
                            <Loader2 className="h-3 w-3 animate-spin" /> Chargement...
                          </span>
                        )}
                      </div>

                      {visibleBookCount < filteredBooks.length ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 text-xs text-primary hover:bg-primary/10 gap-1.5 py-0"
                          onClick={() => setVisibleBookCount(prev => Math.min(prev + BATCH_INCREMENT, filteredBooks.length))}
                        >
                          Afficher +{Math.min(BATCH_INCREMENT, filteredBooks.length - visibleBookCount)} livres
                        </Button>
                      ) : (
                        <span className="text-[11px] text-muted-foreground/60 flex items-center gap-1">
                          <Check className="h-3 w-3 text-emerald-500" /> Tous les livres sont affichés
                        </span>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Colonne de Droite : Panier & Encaissement Pinned */}
      <div className="h-full min-h-0">
        <Card className="flex flex-col h-full min-h-0 overflow-hidden shadow-md border-border/80">
          <CardHeader className="py-2.5 px-4 shrink-0 border-b">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-primary" /> Panier
                <Badge variant="secondary" className="text-xs px-1.5 py-0 font-mono">
                  {items.reduce((s, i) => s + i.quantity, 0)}
                </Badge>
              </CardTitle>
              {items.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setItems([])}
                  className="h-6 text-[11px] text-muted-foreground hover:text-destructive gap-1 px-1.5"
                >
                  <Trash2 className="h-3 w-3" /> Vider
                </Button>
              )}
            </div>
          </CardHeader>

          {/* Corps défilable : Point de vente, Client, Agent, Options, Articles */}
          <CardContent className="flex-1 overflow-y-auto p-3.5 space-y-3 min-h-0 pr-2">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Point de vente</Label>
              <Select value={warehouseId} onValueChange={(val) => setWarehouseId(val)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                <SelectContent>
                  {warehouses.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Client</Label>
              {selectedClient ? (
                <div className="flex items-center justify-between rounded-lg border bg-muted/20 px-2.5 py-1.5 text-xs">
                  <div className="min-w-0 flex-1">
                    <span className="font-semibold flex items-center gap-1.5 truncate">
                      <User className="h-3 w-3 text-primary" /> {selectedClient.name}
                    </span>
                    {selectedClient.phone && (
                      <span className="text-[10px] text-muted-foreground block truncate">{selectedClient.phone}</span>
                    )}
                  </div>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => { setSelectedClient(null); setClientSearch('') }}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ) : (
                <div className="relative">
                  <Input
                    placeholder="Rechercher un client..."
                    value={clientSearch}
                    onChange={(e) => searchClient(e.target.value)}
                    onFocus={() => setShowClientSearch(true)}
                    className="h-8 text-xs"
                  />
                  {showClientSearch && (
                    <>
                      {clients.length > 0 && (
                        <div className="absolute z-20 mt-1 w-full rounded-md border bg-background shadow-lg max-h-48 overflow-y-auto">
                          {clients.map((c) => (
                            <button
                              key={c.id}
                              className="w-full px-3 py-1.5 text-left text-xs hover:bg-muted transition-colors flex flex-col"
                              onClick={() => { setSelectedClient(c); setShowClientSearch(false); setClientSearch('') }}
                            >
                              <span className="font-medium">{c.name}</span>
                              <span className="text-[10px] text-muted-foreground">{c.phone || c.email || 'Pas de contact'}</span>
                            </button>
                          ))}
                        </div>
                      )}
                      {clientSearch.length >= 2 && clients.length === 0 && (
                        <div className="absolute z-20 mt-1 w-full rounded-md border bg-background shadow-lg p-2.5 text-center">
                          <p className="text-[11px] text-muted-foreground mb-1.5">Aucun client trouvé</p>
                          <Button size="sm" variant="outline" className="h-7 text-xs w-full" onClick={() => { setShowNewClient(true); setNewClientName(clientSearch) }}>
                            <UserPlus className="mr-1 h-3 w-3" /> Créer "{clientSearch}"
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Agent */}
            {agents.length > 0 && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground flex items-center gap-1"><UserCheck className="h-3 w-3" /> Agent commercial</Label>
                <Select value={selectedAgentId} onValueChange={(val) => setSelectedAgentId(val)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Aucun agent" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Aucun agent</SelectItem>
                    {agents.filter(a => a.active).map((a) => (
                      <SelectItem key={a.id} value={a.id}>{a.prenom} {a.nom} {a.commissionRate > 0 ? `(${a.commissionRate}%)` : ''}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Options spéciales de vente : Avance & Non livré */}
            <div className="space-y-2 rounded-lg border bg-muted/30 p-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-foreground">Type d'encaissement</span>
                {(isAvance || isNonLivre) && (
                  <Badge variant="secondary" className="text-[9px] bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-bold px-1.5 py-0">
                    Tél. requis
                  </Badge>
                )}
              </div>

              {/* Mode avance */}
              <div className="flex items-center gap-2">
                <input
                  id="isAvance"
                  type="checkbox"
                  checked={isAvance}
                  onChange={(e) => {
                    const checked = e.target.checked
                    setIsAvance(checked)
                    if (checked) setIsNonLivre(false)
                  }}
                  className="h-3.5 w-3.5 rounded border-muted text-primary focus:ring-primary cursor-pointer"
                />
                <Label htmlFor="isAvance" className="text-[11px] cursor-pointer flex items-center gap-1 font-medium">
                  <Clock className="h-3 w-3 text-amber-500" /> Avance (stock réservé en magasin)
                </Label>
              </div>

              {/* Mode non livré (en attente d'arrivage) */}
              <div className="flex items-center gap-2 pt-1 border-t border-dashed">
                <input
                  id="isNonLivre"
                  type="checkbox"
                  checked={isNonLivre}
                  onChange={(e) => {
                    const checked = e.target.checked
                    setIsNonLivre(checked)
                    if (checked) setIsAvance(false)
                  }}
                  className="h-3.5 w-3.5 rounded border-muted text-primary focus:ring-primary cursor-pointer"
                />
                <Label htmlFor="isNonLivre" className="text-[11px] cursor-pointer flex items-center gap-1 font-medium">
                  <Package className="h-3 w-3 text-blue-500" /> Non livré (en attente d'arrivage)
                </Label>
              </div>
            </div>

            {/* Détails du montant versé si Avance ou Non Livré */}
            {(isAvance || isNonLivre) && (
              <div className="space-y-1.5 rounded-lg border border-amber-200 bg-amber-50/70 dark:border-amber-800 dark:bg-amber-950/20 p-2.5 animate-fade-in">
                <div className="flex items-center justify-between">
                  <Label className="text-[11px] text-amber-800 dark:text-amber-400 font-semibold">
                    {isNonLivre ? 'Montant payé' : 'Montant versé (acompte)'}
                  </Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-5 text-[10px] text-amber-700 hover:text-amber-900 px-1"
                    onClick={() => setMontantAvance(finalTotal)}
                  >
                    Payer tout ({formatCurrency(finalTotal)})
                  </Button>
                </div>
                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={montantAvance}
                  onChange={(e) => setMontantAvance(Math.round(parseFloat(e.target.value) || 0))}
                  className="h-8 border-amber-300 dark:border-amber-700 bg-white dark:bg-background text-xs font-bold"
                />
                {montantAvance < finalTotal && (
                  <p className="text-[10px] text-amber-700 dark:text-amber-400 font-medium">
                    Reste à percevoir : <strong>{formatCurrency(finalTotal - montantAvance)}</strong>
                  </p>
                )}
                {montantAvance === finalTotal && (
                  <p className="text-[10px] text-emerald-600 font-medium">
                    ✓ Totalité ({formatCurrency(finalTotal)}) payée d'avance
                  </p>
                )}
                {montantAvance > finalTotal && (
                  <p className="text-[10px] text-destructive">
                    Ne peut pas dépasser {formatCurrency(finalTotal)}
                  </p>
                )}
              </div>
            )}

            {/* Articles du Panier */}
            <div className="space-y-2 pt-1 border-t">
              {items.length === 0 ? (
                <div className="py-6 text-center text-xs text-muted-foreground">
                  Panier vide. Cliquez sur un produit ou scannez son code-barres.
                </div>
              ) : (
                items.map((item) => (
                  <div key={item.productId} className="flex items-center justify-between rounded-lg border bg-card/60 p-2 text-xs shadow-xs">
                    <div className="flex-1 min-w-0 pr-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="font-medium truncate text-xs" title={item.name}>{item.name}</p>
                        {item.classLevelName && (
                          <Badge variant="outline" className="text-[9px] font-bold px-1 py-0 bg-primary/10 text-primary border-primary/30 shrink-0">
                            {item.classLevelName}
                          </Badge>
                        )}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {formatCurrency(item.price)} {item.type === 'book' && !item.classLevelName && <Badge variant="outline" className="text-[9px] ml-1 px-1 py-0">Livre</Badge>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => updateQuantity(item.productId, item.quantity - 1)}>
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-6 text-center font-bold text-xs tabular-nums">{item.quantity}</span>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => updateQuantity(item.productId, item.quantity + 1)}>
                        <Plus className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:bg-destructive/10" onClick={() => updateQuantity(item.productId, 0)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                    <p className="ml-2 w-16 text-right text-xs font-bold tabular-nums shrink-0">{formatCurrency(item.price * item.quantity)}</p>
                  </div>
                ))
              )}
            </div>
          </CardContent>

          {/* Pied de Carte Pinned : Totaux, Remise, TVA toggle, Paiement, Validation */}
          <CardFooter className="flex-col gap-2 p-3 border-t bg-card/95 shrink-0">
            {/* Totaux */}
            <div className="space-y-1 w-full text-xs">
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Sous-total</span>
                <span className="font-semibold text-foreground">{formatCurrency(subTotal)}</span>
              </div>

              {/* TVA optionnelle */}
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-1.5 cursor-pointer text-muted-foreground hover:text-foreground select-none">
                  <input
                    type="checkbox"
                    checked={applyVat}
                    onChange={(e) => setApplyVat(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-muted text-primary cursor-pointer"
                  />
                  <span>TVA (19.25%)</span>
                </label>
                {applyVat ? (
                  <span className="font-semibold text-foreground">{formatCurrency(vatTotal)}</span>
                ) : (
                  <span className="text-[10px] text-muted-foreground italic">Non appliquée</span>
                )}
              </div>

              {/* Remise */}
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Remise</span>
                <Input
                  type="number"
                  min="0"
                  value={discount || ''}
                  placeholder="0"
                  onChange={(e) => setDiscount(Math.round(parseFloat(e.target.value) || 0))}
                  className="h-6 w-24 text-right text-xs"
                />
              </div>

              <div className="flex items-center justify-between border-t pt-1.5 text-sm sm:text-base font-bold">
                <span>Total</span>
                <span className="text-primary text-base sm:text-lg">{formatCurrency(finalTotal)}</span>
              </div>
            </div>

            {/* Mode de paiement & Bouton Valider */}
            <div className="flex gap-2 w-full pt-1">
              <div className="w-2/5 sm:w-1/3">
                <Select value={paymentMethod} onValueChange={(val) => setPaymentMethod(val)}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ESPECES">Espèces</SelectItem>
                    <SelectItem value="MOBILE_MONEY">Mobile Money</SelectItem>
                    <SelectItem value="CARTE_BANCAIRE">Carte bancaire</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                className="flex-1 h-9 text-xs sm:text-sm font-bold shadow-sm"
                onClick={handleValidate}
                disabled={items.length === 0 || validating}
              >
                {validating ? (
                  <span className="flex items-center gap-1.5"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Validation...</span>
                ) : (
                  'Valider l\'encaissement'
                )}
              </Button>
            </div>

            {saleError && <p className="text-[11px] text-destructive text-center w-full">{saleError}</p>}
          </CardFooter>
        </Card>
      </div>

      {/* Dialog impression */}
      <Dialog open={showPrintDialog} onOpenChange={setShowPrintDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Imprimer le ticket</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Button className="w-full" onClick={handlePrint}><Printer className="mr-2 h-4 w-4" />Imprimer</Button>
            <Button variant="outline" className="w-full" onClick={() => { setShowPrintDialog(false); setShowPrinterConfigModal(true) }}>Configurer l'imprimante</Button>
            <Button variant="ghost" className="w-full" onClick={() => setShowPrintDialog(false)}>Ne pas imprimer</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog packet */}
      <Dialog open={showPacketDialog} onOpenChange={setShowPacketDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Détacher le packet — {packetBook?.title}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Label>Prix unitaire</Label>
            <Input type="number" min={0} step={1} value={packetUnitPrice} onChange={(e) => setPacketUnitPrice(parseFloat(e.target.value) || 0)} />
            <Label>Quantité</Label>
            <Input type="number" min={0} value={packetQuantity} onChange={(e) => setPacketQuantity(Math.max(1, parseInt(e.target.value) || 1))} />
            <Button className="w-full" onClick={() => { if (packetBook) { addBookToCart(packetBook, packetQuantity, packetUnitPrice); setShowPacketDialog(false) } }}>
              Ajouter au panier
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Device check modal */}
      <DeviceCheckModal device={deviceModal} onClose={() => setDeviceModal(null)} />

      {/* Printer config modal */}
      <PrinterConfigModal
        open={showPrinterConfigModal}
        onClose={() => setShowPrinterConfigModal(false)}
      />

      {/* Dialog nouveau client */}
      <Dialog open={showNewClient} onOpenChange={setShowNewClient}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouveau client</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Nom *</Label>
              <Input
                value={newClientName}
                onChange={(e) => setNewClientName(e.target.value)}
                placeholder="Nom complet du client"
              />
            </div>
            <div>
              <Label className="flex items-center justify-between">
                <span>Téléphone {(isAvance || isNonLivre) ? <strong className="text-destructive">* (Obligatoire pour avance/commande)</strong> : ''}</span>
              </Label>
              <Input
                value={newClientPhone}
                onChange={(e) => setNewClientPhone(e.target.value)}
                placeholder="Ex: 699123456"
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                value={newClientEmail}
                onChange={(e) => setNewClientEmail(e.target.value)}
                placeholder="client@email.com (facultatif)"
              />
            </div>
            <Button className="w-full" onClick={handleCreateClient}>
              Créer et sélectionner
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog numéro de téléphone obligatoire si manquant */}
      <Dialog open={showMissingPhoneModal} onOpenChange={setShowMissingPhoneModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-amber-500" /> Numéro de téléphone requis
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Pour enregistrer {isNonLivre ? 'une commande non livrée' : 'une avance avec réservation'}, le client{' '}
              <strong className="text-foreground">{selectedClient?.name}</strong> doit obligatoirement avoir un numéro de téléphone afin que vous puissiez lui faire signe dès que les articles sont disponibles ou prêts à être livrés.
            </p>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Numéro de téléphone du client *</Label>
              <Input
                placeholder="Ex: 699123456 / 677123456"
                value={missingPhone}
                onChange={(e) => setMissingPhone(e.target.value)}
                autoFocus
              />
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Button variant="ghost" size="sm" onClick={() => setShowMissingPhoneModal(false)}>
                Annuler
              </Button>
              <Button
                size="sm"
                className="bg-primary text-primary-foreground font-semibold"
                disabled={!missingPhone.trim() || savingPhone}
                onClick={async () => {
                  if (!missingPhone.trim()) return
                  setSavingPhone(true)
                  setShowMissingPhoneModal(false)
                  await executeSale(missingPhone.trim())
                  setSavingPhone(false)
                }}
              >
                {savingPhone ? 'Enregistrement...' : 'Enregistrer et continuer'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal d'Aperçu de la Facture avant Validation */}
      <Dialog open={showSalePreviewModal} onOpenChange={setShowSalePreviewModal}>
        <DialogContent className="sm:max-w-4xl lg:max-w-5xl max-h-[92vh] overflow-y-auto p-6 lg:p-8">
          <DialogHeader className="pb-3 border-b border-border">
            <DialogTitle className="flex items-center gap-2.5 text-xl font-bold text-foreground">
              <Printer className="h-6 w-6 text-primary" />
              Aperçu Officiel de la Facture avant Validation
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 my-4 text-xs">
            {/* Header Info Banner */}
            <div className="bg-card border border-border p-5 rounded-xl shadow-sm space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
                <div>
                  <h3 className="font-extrabold text-base text-foreground uppercase tracking-wide">{workspaceName || 'Boutique Magasin'}</h3>
                  <p className="text-muted-foreground text-[11px] mt-0.5">Aperçu du document de vente avant encaissement</p>
                </div>
                <Badge variant="outline" className="font-mono text-xs px-3 py-1 border-primary/40 bg-primary/5 text-primary">
                  {isNonLivre ? '📦 Commande Non Livrée' : isAvance ? '⏳ Avance Client' : '🛍️ Vente Directe'}
                </Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-muted-foreground">
                <div className="bg-muted/40 p-2.5 rounded-lg">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block">Date & Heure</span>
                  <strong className="text-foreground text-xs">{new Date().toLocaleString('fr-FR')}</strong>
                </div>
                <div className="bg-muted/40 p-2.5 rounded-lg">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block">Mode de Paiement</span>
                  <strong className="text-foreground text-xs">{paymentMethod}</strong>
                </div>
                <div className="bg-muted/40 p-2.5 rounded-lg">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block">Client</span>
                  <strong className="text-foreground text-xs">{selectedClient ? `${selectedClient.name} ${selectedClient.phone ? `(${selectedClient.phone})` : ''}` : 'Client comptant'}</strong>
                </div>
              </div>
            </div>

            {/* Articles Table */}
            <div className="rounded-xl border border-border overflow-hidden shadow-sm">
              <div className="bg-muted px-4 py-3 font-bold grid grid-cols-12 text-xs text-muted-foreground uppercase tracking-wider">
                <span className="col-span-6">Désignation de l'article</span>
                <span className="col-span-2 text-right">P.U</span>
                <span className="col-span-2 text-center">Qté</span>
                <span className="col-span-2 text-right">Total HT</span>
              </div>
              <div className="divide-y divide-border max-h-60 overflow-y-auto">
                {items.map((it, i) => (
                  <div key={i} className="px-4 py-3 grid grid-cols-12 items-center text-foreground hover:bg-muted/30 transition-colors">
                    <div className="col-span-6 pr-2">
                      <p className="font-semibold text-sm truncate">{it.name}</p>
                      {it.classLevelName && <p className="text-[11px] text-muted-foreground">Classe : {it.classLevelName}</p>}
                    </div>
                    <span className="col-span-2 text-right font-mono tabular-nums text-muted-foreground">{formatCurrency(it.price)}</span>
                    <span className="col-span-2 text-center font-bold text-foreground font-mono">×{it.quantity}</span>
                    <span className="col-span-2 text-right font-extrabold tabular-nums text-foreground">{formatCurrency(it.price * it.quantity)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Financial Summary Box */}
            <div className="bg-muted/40 p-5 rounded-xl space-y-2.5 border border-border">
              <div className="flex justify-between text-muted-foreground text-sm">
                <span>Sous-total articles :</span>
                <span className="font-semibold tabular-nums">{formatCurrency(subTotal)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-emerald-600 dark:text-emerald-400 text-sm">
                  <span>Remise accordée :</span>
                  <span className="font-semibold tabular-nums">- {formatCurrency(discount)}</span>
                </div>
              )}
              {applyVat && (
                <div className="flex justify-between text-muted-foreground text-sm">
                  <span>TVA appliquée (19.25%) :</span>
                  <span className="font-semibold tabular-nums">+ {formatCurrency(vatTotal)}</span>
                </div>
              )}

              <div className="flex justify-between items-center text-lg font-black text-foreground pt-3 border-t border-border">
                <span>Total Net de la Vente :</span>
                <span className="tabular-nums text-emerald-600 dark:text-emerald-400 text-2xl">{formatCurrency(finalTotal)}</span>
              </div>

              {(isAvance || isNonLivre) && (
                <div className="pt-3 border-t border-border/80 space-y-1.5 text-amber-800 dark:text-amber-300">
                  <div className="flex justify-between text-sm font-medium">
                    <span>Acompte / Avance perçue maintenant :</span>
                    <span className="tabular-nums font-bold text-base">{formatCurrency(montantAvance)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold">
                    <span>Reste à encaisser à la livraison :</span>
                    <span className="tabular-nums text-base">{formatCurrency(Math.max(0, finalTotal - montantAvance))}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-border">
            <Button variant="outline" size="lg" onClick={() => setShowSalePreviewModal(false)} disabled={validating}>
              ← Modifier la vente
            </Button>
            <Button
              size="lg"
              onClick={async () => {
                setShowSalePreviewModal(false)
                await executeSale()
              }}
              disabled={validating}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2 px-6"
            >
              {validating ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />}
              Confirmer & Encaisser ({formatCurrency((isAvance || isNonLivre) ? montantAvance : finalTotal)})
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Unique Post-Sale Receipt & Print Dialog */}
      <Dialog open={saleDone} onOpenChange={(v) => { if (!v) { setSaleDone(false); setCompletedSale(null) } }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto p-6">
          <DialogHeader className="pb-2 border-b border-border">
            <DialogTitle className="flex items-center gap-2.5 text-lg font-bold text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-6 w-6 text-emerald-600" /> Vente enregistrée avec succès
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-2">
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-5 text-center shadow-xs">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-emerald-600 text-white mb-3 shadow-md">
                <Check className="h-8 w-8 stroke-[3]" />
              </div>
              {completedSale?.invoiceNumber && (
                <div className="inline-block bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-mono text-xs px-3 py-1 rounded-full font-bold mb-2">
                  Facture N° {completedSale.invoiceNumber}
                </div>
              )}
              <p className="text-3xl sm:text-4xl font-black text-foreground tracking-tight tabular-nums">
                {formatCurrency(completedSale?.total ?? 0)}
              </p>
              <p className="text-sm text-muted-foreground mt-1 font-medium">
                {completedSale?.count ?? 0} article{(completedSale?.count ?? 0) > 1 ? 's' : ''} vendu{(completedSale?.count ?? 0) > 1 ? 's' : ''} avec succès
              </p>
            </div>

            {/* Print Preview Card */}
            {lastPrintData && (
              <div className="rounded-xl border border-border p-4 bg-muted/30 space-y-2 text-xs">
                <div className="flex justify-between items-center font-bold text-foreground pb-2 border-b border-border">
                  <span>Résumé des articles du ticket</span>
                  <span>{lastPrintData.items.length} référence(s)</span>
                </div>
                <div className="max-h-36 overflow-y-auto space-y-1 divide-y divide-border/60">
                  {lastPrintData.items.map((it, idx) => (
                    <div key={idx} className="flex justify-between items-center py-1 text-muted-foreground">
                      <span className="font-medium text-foreground">{it.name} (x{it.quantity})</span>
                      <span className="font-mono tabular-nums">{formatCurrency(it.price * it.quantity)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-3 border-t border-border">
            <Button
              size="lg"
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2 text-sm h-12 shadow-sm"
              onClick={handlePrint}
            >
              <Printer className="h-5 w-5" /> Imprimer le Ticket de Caisse
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="flex-1 font-semibold text-sm h-12"
              onClick={() => {
                setSaleDone(false)
                setCompletedSale(null)
                searchInputRef.current?.focus()
              }}
            >
              Nouvelle Vente
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default Caisse
