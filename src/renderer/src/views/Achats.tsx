import { useState, useEffect, useMemo, useRef } from 'react'
import {
  ShoppingBag,
  RefreshCw,
  FileText,
  Package,
  Warehouse,
  CheckCircle2,
  Store,
  ListOrdered,
  BookOpen,
  Boxes,
  Search,
  Percent,
  Check,
  RotateCcw,
  Plus,
  Truck,
  DollarSign,
  Printer,
  ArrowLeft,
  Trash2,
  Calendar,
  CreditCard,
  Receipt,
  FileSpreadsheet
} from 'lucide-react'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Badge } from '../components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '../components/ui/dialog'
import { cn, formatCurrency } from '@/lib/utils'
import { useEntrepotStore } from '../stores/entrepotStore'
import { useNotifications } from '../stores/notificationStore'
import { feedback } from '../stores/feedbackStore'
import type {
  PurchaseOrderItem,
  ProductWithRelations,
  BookWithRelations,
  ClassLevel,
  Category,
  Supplier,
  Subject
} from '../../../shared/types'

type ViewScreen = 'home' | 'entry' | 'report' | 'analyse_auto'

interface PurchaseLineItem {
  id: string
  itemId: string
  isBook: boolean
  name: string
  subtitle?: string
  barcodeOrIsbn?: string
  sellingPrice: number
  discountPercent?: number // Seulement pour les livres (défaut: 20)
  purchasePrice: number // Prix d'achat réel en FCFA
  quantity: number
  sendToMagasin: boolean
}

interface PurchaseReportData {
  reference: string
  date: string
  supplierName: string
  paymentMethod: string
  invoiceNumber?: string
  warehouseName: string
  items: PurchaseLineItem[]
  totalAmount: number
  totalQuantity: number
  potentialRevenue: number
  estimatedMargin: number
}

function mapPurchaseOrderToReport(po: any): PurchaseReportData {
  const items: PurchaseLineItem[] = (po.items || []).map((i: any) => {
    const qty = i.quantity || 1
    const price = i.unitPrice || 0
    return {
      id: i.id,
      itemId: i.productId || i.id,
      isBook: false,
      name: i.productName || 'Article',
      subtitle: i.warehouseName || po.warehouse?.name,
      barcodeOrIsbn: i.productBarcode || '',
      sellingPrice: price,
      purchasePrice: price,
      quantity: qty,
      sendToMagasin: false
    }
  })

  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0)
  const totalAmount = po.totalAmount && po.totalAmount > 0
    ? po.totalAmount
    : items.reduce((sum, item) => sum + item.quantity * item.purchasePrice, 0)

  const dateStr = po.createdAt
    ? new Date(po.createdAt).toLocaleString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    : new Date().toLocaleDateString('fr-FR')

  return {
    reference: `ACH-${new Date(po.createdAt || Date.now()).getFullYear()}-${(po.id || '').slice(-6).toUpperCase()}`,
    date: dateStr,
    supplierName: po.supplierName || 'Achat Direct / Réception Marchandise',
    paymentMethod: 'Comptant',
    warehouseName: po.warehouse?.name || 'Boutique Principale',
    items,
    totalAmount,
    totalQuantity,
    potentialRevenue: totalAmount,
    estimatedMargin: 0
  }
}

export default function Achats() {
  const { selectedId: workspaceId, selectedName: workspaceName, setWorkspaceView } = useEntrepotStore()
  const [screen, setScreen] = useState<ViewScreen>('home')

  // Métadonnées
  const [products, setProducts] = useState<ProductWithRelations[]>([])
  const [books, setBooks] = useState<BookWithRelations[]>([])
  const [classLevels, setClassLevels] = useState<ClassLevel[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [recentReports, setRecentReports] = useState<PurchaseReportData[]>([])

  // ── État de la saisie d'un Achat ─────────────────────────────────────────
  const [searchItemType, setSearchItemType] = useState<'all' | 'livres' | 'produits'>('all')
  const [itemSearchText, setItemSearchText] = useState('')
  const [selectedSearchIndex, setSelectedSearchIndex] = useState<number>(0)
  const [isSearchFocused, setIsSearchFocused] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const [purchaseLines, setPurchaseLines] = useState<PurchaseLineItem[]>([])
  const [savingPurchase, setSavingPurchase] = useState(false)
  const [showPurchasePreviewModal, setShowPurchasePreviewModal] = useState(false)
  const [currentReport, setCurrentReport] = useState<PurchaseReportData | null>(null)

  // ── Modals de Création Rapide d'un article inexistant ─────────────────────
  const [showCreateProductModal, setShowCreateProductModal] = useState(false)
  const [newProductName, setNewProductName] = useState('')
  const [newProductBarcode, setNewProductBarcode] = useState('')
  const [newProductSellingPrice, setNewProductSellingPrice] = useState<number | ''>('')
  const [newProductPurchasePrice, setNewProductPurchasePrice] = useState<number | ''>('')
  const [newProductCategoryId, setNewProductCategoryId] = useState<string>('')
  const [creatingProduct, setCreatingProduct] = useState(false)

  const [showCreateBookModal, setShowCreateBookModal] = useState(false)
  const [newBookTitle, setNewBookTitle] = useState('')
  const [newBookClassLevelId, setNewBookClassLevelId] = useState('')
  const [newBookSellingPrice, setNewBookSellingPrice] = useState<number | ''>('')
  const [newBookPurchasePrice, setNewBookPurchasePrice] = useState<number | ''>('')
  const [newBookEditor, setNewBookEditor] = useState('')
  const [newBookAuthor, setNewBookAuthor] = useState('')
  const [newBookIsbn, setNewBookIsbn] = useState('')
  const [creatingBook, setCreatingBook] = useState(false)

  // ── Mode Analyse Automatique ─────────────────────────────────────────────
  const [analyzing, setAnalyzing] = useState(false)
  const [orders, setOrders] = useState<PurchaseOrderItem[]>([])
  const [pdfPath, setPdfPath] = useState<string | null>(null)
  const [analysisDone, setAnalysisDone] = useState(false)
  const [analysisError, setAnalysisError] = useState<string | null>(null)
  const [confirmingSupplier, setConfirmingSupplier] = useState<string | null>(null)
  const [analysisToMagasin, setAnalysisToMagasin] = useState<Record<string, boolean>>({})
  const [analysisUnitPrices, setAnalysisUnitPrices] = useState<Record<string, string>>({})

  // Focus automatique du champ de recherche lors de l'ouverture de la saisie
  useEffect(() => {
    if (screen === 'entry') {
      setTimeout(() => {
        searchInputRef.current?.focus()
      }, 100)
    }
  }, [screen])

  // Chargement des données de base
  useEffect(() => {
    window.api.getSuppliers(workspaceId || undefined).then(setSuppliers).catch(() => {})
    window.api.getCategories(workspaceId || undefined).then(setCategories).catch(() => {})
    window.api.getClassLevels().then(setClassLevels).catch(() => {})
    loadCatalog()
    loadPurchaseHistory()
  }, [workspaceId])

  async function loadPurchaseHistory() {
    try {
      const orders = await window.api.getPurchaseOrders()
      if (orders && Array.isArray(orders) && orders.length > 0) {
        const reports = orders.map(mapPurchaseOrderToReport)
        setRecentReports(reports)
      }
    } catch (err) {
      console.error('Erreur chargement historique achats backend:', err)
    }
  }

  async function handleViewReport(report: PurchaseReportData) {
    if (report.rawId) {
      try {
        const fullOrder = await window.api.getPurchaseOrder(report.rawId)
        if (fullOrder) {
          const fresh = mapPurchaseOrderToReport(fullOrder)
          setCurrentReport(fresh)
          setScreen('report')
          return
        }
      } catch (err) {
        console.error('Erreur chargement rapport détaillé:', err)
      }
    }
    setCurrentReport(report)
    setScreen('report')
  }

  async function loadCatalog() {
    try {
      const [prods, bks] = await Promise.all([
        window.api.getProducts(workspaceId || undefined),
        window.api.getBooks()
      ])
      setProducts(prods)
      setBooks(bks)
    } catch (e) {
      console.error('Erreur chargement catalogue:', e)
    }
  }

  // ── MOTEUR DE RECHERCHE ULTRA-INTELLIGENT (Normalisation + Multi-tokens + Scoring) ──
  const normalize = (str: string) =>
    (str || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()

  const searchResults = useMemo(() => {
    const rawQuery = itemSearchText.trim()
    if (!rawQuery) return []

    const normalizedQuery = normalize(rawQuery)
    const tokens = normalizedQuery.split(/\s+/).filter(Boolean)
    if (tokens.length === 0) return []

    type MatchResult = {
      isBook: boolean
      data: any
      score: number
      exactBarcode: boolean
      currentCartQty: number
    }

    const matches: MatchResult[] = []

    // 1. Recherche dans les Produits Généraux
    if (searchItemType === 'all' || searchItemType === 'produits') {
      for (const p of products) {
        const pName = normalize(p.name)
        const pBarcode = normalize(p.barcode)
        const pCat = normalize(p.category?.name || '')
        const pSupplier = normalize(p.supplier?.name || '')

        const isExactBarcode = pBarcode === normalizedQuery || p.barcode === rawQuery
        let score = 0

        if (isExactBarcode) {
          score += 1000 // Priorité absolue au code-barres exact
        } else if (pName === normalizedQuery) {
          score += 500
        } else if (pName.startsWith(normalizedQuery)) {
          score += 300
        }

        // Vérification de correspondance de tous les tokens
        const allTokensMatch = tokens.every((token) => {
          return (
            pName.includes(token) ||
            pBarcode.includes(token) ||
            pCat.includes(token) ||
            pSupplier.includes(token)
          )
        })

        if (allTokensMatch || isExactBarcode) {
          // Bonus de pertinence selon les positions
          tokens.forEach((t) => {
            if (pName.includes(t)) score += 30
            if (pBarcode.includes(t)) score += 40
            if (pCat.includes(t)) score += 15
          })

          const inCart = purchaseLines.find((l) => !l.isBook && l.itemId === p.id)

          matches.push({
            isBook: false,
            data: p,
            score,
            exactBarcode: isExactBarcode,
            currentCartQty: inCart?.quantity ?? 0
          })
        }
      }
    }

    // 2. Recherche dans les Livres Scolaires
    if (searchItemType === 'all' || searchItemType === 'livres') {
      for (const b of books) {
        const bTitle = normalize(b.title)
        const bIsbn = normalize(b.isbn || '')
        const bEditor = normalize(b.editor || '')
        const bAuthor = normalize(b.author || '')
        const bClass = normalize(b.classLevel?.name || '')

        const isExactIsbn = bIsbn === normalizedQuery || (b.isbn && b.isbn === rawQuery)
        let score = 0

        if (isExactIsbn) {
          score += 1000
        } else if (bTitle === normalizedQuery) {
          score += 500
        } else if (bTitle.startsWith(normalizedQuery)) {
          score += 300
        }

        const allTokensMatch = tokens.every((token) => {
          return (
            bTitle.includes(token) ||
            bIsbn.includes(token) ||
            bEditor.includes(token) ||
            bAuthor.includes(token) ||
            bClass.includes(token)
          )
        })

        if (allTokensMatch || isExactIsbn) {
          tokens.forEach((t) => {
            if (bTitle.includes(t)) score += 35
            if (bIsbn.includes(t)) score += 40
            if (bClass.includes(t)) score += 20
            if (bEditor.includes(t)) score += 15
          })

          const inCart = purchaseLines.find((l) => l.isBook && l.itemId === b.id)

          matches.push({
            isBook: true,
            data: b,
            score,
            exactBarcode: Boolean(isExactIsbn),
            currentCartQty: inCart?.quantity ?? 0
          })
        }
      }
    }

    // Tri par score décroissant et limitation aux 20 meilleurs résultats
    matches.sort((a, b) => b.score - a.score)
    return matches.slice(0, 20)
  }, [itemSearchText, searchItemType, products, books, purchaseLines])

  // Reset de l'index de sélection lors du changement de texte
  useEffect(() => {
    setSelectedSearchIndex(0)
  }, [searchResults.length])

  // Ajouter un produit au bordereau d'achat
  function handleAddProductToPurchase(product: ProductWithRelations) {
    const existingIndex = purchaseLines.findIndex((l) => !l.isBook && l.itemId === product.id)
    if (existingIndex >= 0) {
      setPurchaseLines((prev) => {
        const next = [...prev]
        next[existingIndex].quantity += 1
        return next
      })
      feedback.toast.info(`+1 "${product.name}" (Total: ${purchaseLines[existingIndex].quantity + 1})`)
    } else {
      const buyPrice = product.basePrice && product.basePrice > 0 ? product.basePrice : 0
      const newLine: PurchaseLineItem = {
        id: `line-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        itemId: product.id,
        isBook: false,
        name: product.name,
        subtitle: product.category?.name || 'Général',
        barcodeOrIsbn: product.barcode,
        sellingPrice: product.sellingPrice,
        purchasePrice: buyPrice,
        quantity: 1,
        sendToMagasin: false
      }
      setPurchaseLines((prev) => [newLine, ...prev])
      feedback.toast.success(`"${product.name}" ajouté au bordereau`)
    }
    setItemSearchText('')
    searchInputRef.current?.focus()
  }

  // Ajouter un livre au bordereau d'achat
  function handleAddBookToPurchase(book: BookWithRelations) {
    const existingIndex = purchaseLines.findIndex((l) => l.isBook && l.itemId === book.id)
    if (existingIndex >= 0) {
      setPurchaseLines((prev) => {
        const next = [...prev]
        next[existingIndex].quantity += 1
        return next
      })
      feedback.toast.info(`+1 "${book.title}" (Total: ${purchaseLines[existingIndex].quantity + 1})`)
    } else {
      const defaultDiscount = 20
      const defaultBuyPrice =
        book.purchasePrice && book.purchasePrice > 0
          ? book.purchasePrice
          : Math.round(book.price * (1 - defaultDiscount / 100))

      const newLine: PurchaseLineItem = {
        id: `line-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        itemId: book.id,
        isBook: true,
        name: book.title,
        subtitle: book.classLevel ? `${book.classLevel.name}${book.editor ? ` — ${book.editor}` : ''}` : book.editor || '',
        barcodeOrIsbn: book.isbn || '',
        sellingPrice: book.price,
        discountPercent: defaultDiscount,
        purchasePrice: defaultBuyPrice,
        quantity: 1,
        sendToMagasin: false
      }
      setPurchaseLines((prev) => [newLine, ...prev])
      feedback.toast.success(`"${book.title}" ajouté au bordereau`)
    }
    setItemSearchText('')
    searchInputRef.current?.focus()
  }

  // Navigation clavier ultra-rapide dans la recherche (Flèches Haut/Bas, Entrée, Echap)
  function handleSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (searchResults.length === 0) {
      if (e.key === 'Enter' && itemSearchText.trim()) {
        e.preventDefault()
        setNewProductName(itemSearchText.trim())
        setShowCreateProductModal(true)
      }
      return
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedSearchIndex((prev) => (prev + 1) % searchResults.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedSearchIndex((prev) => (prev - 1 + searchResults.length) % searchResults.length)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const selected = searchResults[selectedSearchIndex] || searchResults[0]
      if (selected) {
        if (selected.isBook) handleAddBookToPurchase(selected.data)
        else handleAddProductToPurchase(selected.data)
      }
    } else if (e.key === 'Escape') {
      setItemSearchText('')
      setIsSearchFocused(false)
    }
  }

  // Mise à jour d'une ligne d'achat (Prix de Vente, Prix d'Achat, Quantité, Remise)
  function updatePurchaseLine(lineId: string, updates: Partial<PurchaseLineItem>) {
    setPurchaseLines((prev) =>
      prev.map((l) => {
        if (l.id !== lineId) return l
        const updated = { ...l, ...updates }
        if (updates.sellingPrice !== undefined) {
          if (l.isBook && l.discountPercent !== undefined) {
            updated.purchasePrice = Math.round(updated.sellingPrice * (1 - l.discountPercent / 100))
          }
        }
        if (updates.purchasePrice !== undefined) {
          if (l.isBook && updated.sellingPrice > 0) {
            updated.discountPercent = Math.max(0, Math.round((1 - updated.purchasePrice / updated.sellingPrice) * 100))
          }
        }
        if (updates.discountPercent !== undefined && l.isBook) {
          updated.purchasePrice = Math.round(updated.sellingPrice * (1 - updates.discountPercent / 100))
        }
        return updated
      })
    )
  }

  // Supprimer une ligne
  function removePurchaseLine(lineId: string) {
    setPurchaseLines((prev) => prev.filter((l) => l.id !== lineId))
  }

  // Totaux calculés en direct pour le bordereau
  const currentPurchaseSummary = useMemo(() => {
    let totalItemsCount = purchaseLines.length
    let totalUnits = 0
    let totalCost = 0
    let totalPotentialRevenue = 0

    for (const l of purchaseLines) {
      totalUnits += l.quantity
      totalCost += l.quantity * l.purchasePrice
      totalPotentialRevenue += l.quantity * l.sellingPrice
    }

    return {
      totalItemsCount,
      totalUnits,
      totalCost,
      totalPotentialRevenue,
      estimatedMargin: totalPotentialRevenue - totalCost
    }
  }, [purchaseLines])

  // ── Création Rapide d'un Produit Inexistant ──────────────────────────────
  async function handleCreateQuickProduct() {
    if (!newProductName.trim()) return
    setCreatingProduct(true)
    try {
      const sellPrice = typeof newProductSellingPrice === 'number' ? newProductSellingPrice : 0
      const buyPrice = typeof newProductPurchasePrice === 'number' ? newProductPurchasePrice : 0
      const barcode = newProductBarcode.trim() || `PRD-${Date.now().toString().slice(-7)}`

      const created = await window.api.createProduct({
        name: newProductName.trim(),
        barcode,
        sellingPrice: sellPrice,
        basePrice: buyPrice,
        vatRate: 0,
        categoryId: newProductCategoryId || undefined,
        warehouseId: workspaceId || undefined
      })

      await loadCatalog()
      handleAddProductToPurchase(created as any)

      setShowCreateProductModal(false)
      setNewProductName('')
      setNewProductBarcode('')
      setNewProductSellingPrice('')
      setNewProductPurchasePrice('')
      feedback.toast.success(`Produit "${newProductName.trim()}" créé et ajouté à l'achat`)
    } catch (err: any) {
      feedback.toast.error(err?.message || 'Erreur lors de la création du produit', 'Erreur')
    } finally {
      setCreatingProduct(false)
    }
  }

  // ── Création Rapide d'un Livre Inexistant ────────────────────────────────
  async function handleCreateQuickBook() {
    if (!newBookTitle.trim()) return
    setCreatingBook(true)
    try {
      const targetClassId = newBookClassLevelId || classLevels[0]?.id
      if (!targetClassId) throw new Error('Veuillez choisir une classe')
      const sellPrice = typeof newBookSellingPrice === 'number' ? newBookSellingPrice : 0
      const buyPrice =
        typeof newBookPurchasePrice === 'number' && newBookPurchasePrice > 0
          ? newBookPurchasePrice
          : Math.round(sellPrice * 0.8)

      const created = await window.api.createBook({
        title: newBookTitle.trim(),
        price: sellPrice,
        purchasePrice: buyPrice,
        classLevelId: targetClassId,
        editor: newBookEditor.trim() || undefined,
        author: newBookAuthor.trim() || undefined,
        isbn: newBookIsbn.trim() || undefined
      })

      await loadCatalog()
      handleAddBookToPurchase(created as any)

      setShowCreateBookModal(false)
      setNewBookTitle('')
      setNewBookSellingPrice('')
      setNewBookPurchasePrice('')
      setNewBookEditor('')
      setNewBookAuthor('')
      setNewBookIsbn('')
      feedback.toast.success(`Livre "${newBookTitle.trim()}" créé et ajouté à l'achat`)
    } catch (err: any) {
      feedback.toast.error(err?.message || 'Erreur lors de la création du livre', 'Erreur')
    } finally {
      setCreatingBook(false)
    }
  }

  // ── Validation de l'Achat & Génération du Rapport ────────────────────────
  async function handleValidatePurchase() {
    let targetWhId = workspaceId
    if (!targetWhId) {
      try {
        const whs = await window.api.getWarehouses()
        if (whs && whs.length > 0) {
          useEntrepotStore.getState().select(whs[0].id, whs[0].name)
        }
      } catch { /* ignore */ }
    }

    if (!workspaceId && !useEntrepotStore.getState().selectedId) {
      feedback.toast.warning('Veuillez sélectionner une boutique.')
      return
    }
    if (purchaseLines.length === 0) {
      feedback.toast.warning('Votre bordereau d\'achat est vide. Ajoutez au moins un article.')
      return
    }

    setShowPurchasePreviewModal(true)
  }

  async function executePurchase() {
    let targetWhId = workspaceId
    let targetWhName = workspaceName
    if (!targetWhId) {
      try {
        const whs = await window.api.getWarehouses()
        if (whs && whs.length > 0) {
          targetWhId = whs[0].id
          targetWhName = whs[0].name
        }
      } catch { /* ignore */ }
    }

    setSavingPurchase(true)
    try {
      const bookItems = purchaseLines
        .filter((l) => l.isBook && l.quantity > 0)
        .map((l) => ({
          bookId: l.itemId,
          quantity: l.quantity,
          purchasePrice: l.purchasePrice,
          sellingPrice: l.sellingPrice,
          editor: l.subtitle || undefined,
          sendToMagasin: l.sendToMagasin
        }))

      const productItems = purchaseLines
        .filter((l) => !l.isBook && l.quantity > 0)
        .map((l) => ({
          productId: l.itemId,
          quantity: l.quantity,
          purchasePrice: l.purchasePrice,
          sellingPrice: l.sellingPrice,
          sendToMagasin: l.sendToMagasin
        }))

      // Exécution en lot directe
      if (bookItems.length > 0) {
        await window.api.bulkRestockBooks({
          warehouseId: targetWhId!,
          paymentMethod: 'ESPECES',
          items: bookItems
        })
      }

      if (productItems.length > 0) {
        await window.api.bulkRestockProducts({
          warehouseId: targetWhId!,
          paymentMethod: 'ESPECES',
          items: productItems
        })
      }

      // Enregistrer le bon de commande dans la base de données backend
      try {
        await window.api.createPurchaseOrder({
          supplierName: 'Achat Direct / Réception Marchandise',
          warehouseId: targetWhId!,
          status: 'RECU',
          totalAmount: currentPurchaseSummary.totalCost,
          items: purchaseLines.map((l) => ({
            productId: l.itemId,
            productName: l.name,
            productBarcode: l.barcodeOrIsbn || '',
            quantity: l.quantity,
            unitPrice: l.purchasePrice,
            warehouseName: targetWhName || 'Boutique Principale',
            warehouseId: targetWhId!
          }))
        })
      } catch (poErr) {
        console.warn('Création du bon de commande backend:', poErr)
      }

      // Construction du Rapport des Achats
      const refNum = `ACH-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`
      const report: PurchaseReportData = {
        reference: refNum,
        date: new Date().toLocaleString('fr-FR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }),
        supplierName: 'Achat Direct / Réception Marchandise',
        paymentMethod: 'Comptant',
        warehouseName: targetWhName || 'Boutique Principale',
        items: [...purchaseLines],
        totalAmount: currentPurchaseSummary.totalCost,
        totalQuantity: currentPurchaseSummary.totalUnits,
        potentialRevenue: currentPurchaseSummary.totalPotentialRevenue,
        estimatedMargin: currentPurchaseSummary.estimatedMargin
      }

      setCurrentReport(report)
      setRecentReports((prev) => [report, ...prev.slice(0, 19)])
      await loadPurchaseHistory()
      setScreen('report')

      feedback.toast.success('Achat enregistré avec succès', `${purchaseLines.length} article(s) réceptionné(s).`)

      useNotifications.getState().addNotification({
        type: 'info',
        title: 'Achat & Réception Enregistré',
        description: `${purchaseLines.length} article(s) (${currentPurchaseSummary.totalUnits} unités) pour ${formatCurrency(currentPurchaseSummary.totalCost)}.`,
        warehouseId: workspaceId ?? undefined,
        warehouseName: workspaceName ?? undefined
      })

      // Réinitialiser la saisie
      setPurchaseLines([])
      setItemSearchText('')
      loadCatalog()
    } catch (err: any) {
      feedback.toast.error(err?.message || 'Erreur lors de l\'enregistrement de l\'achat', 'Erreur')
    } finally {
      setSavingPurchase(false)
    }
  }

  // Impression du Rapport des Achats
  function handlePrintReport() {
    window.print()
  }

  // ── Analyse Automatique Handlers ──────────────────────────────────────────
  async function handleAnalyze() {
    try {
      setAnalyzing(true)
      setAnalysisError(null)
      setAnalysisDone(false)
      const result = await window.api.analyzeStock()
      setOrders(result.orders)
      setPdfPath(result.pdfPath)
      setAnalysisDone(true)
    } catch (err) {
      setAnalysisError(err instanceof Error ? err.message : "Erreur d'analyse")
    } finally {
      setAnalyzing(false)
    }
  }

  function toggleAnalysisMagasin(productId: string) {
    setAnalysisToMagasin((prev) => ({ ...prev, [productId]: !prev[productId] }))
  }

  async function handleConfirmPurchase(sName: string, items: PurchaseOrderItem[]) {
    if (!workspaceId || !sName || items.length === 0) return
    try {
      setConfirmingSupplier(sName)
      await window.api.confirmPurchase({
        warehouseId: workspaceId,
        supplierName: sName,
        items: items.map((i) => ({
          productId: i.productId,
          productName: i.productName,
          quantity: i.suggestedQuantity,
          unitPrice: parseFloat(analysisUnitPrices[i.productId]) || 0,
          sendToMagasin: !!analysisToMagasin[i.productId]
        }))
      })
    } catch (err) {
      console.error('Erreur confirmation achat', err)
    } finally {
      setConfirmingSupplier(null)
    }
  }

  const bySupplier: Record<string, PurchaseOrderItem[]> = {}
  for (const o of orders) {
    if (!bySupplier[o.supplierName]) bySupplier[o.supplierName] = []
    bySupplier[o.supplierName].push(o)
  }

  return (
    <div className="space-y-6 animate-fade-in pb-24">
      {/* ────────────────────────────────────────────────────────────────────────
          1. ÉCRAN D'ACCUEIL : HUB DES ACHATS SIMPLE & ÉPURÉ
      ──────────────────────────────────────────────────────────────────────── */}
      {screen === 'home' && (
        <div className="space-y-6">
          {/* En-tête avec bouton principal bien visible */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gradient-to-r from-card to-muted/40 p-6 rounded-3xl border shadow-sm">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                  <ShoppingBag className="h-5 w-5" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-foreground">
                    Achats & Réapprovisionnement
                  </h1>
                  <p className="text-xs text-muted-foreground">
                    Enregistrez rapidement vos réceptions de marchandises avec recherche ultra-intelligente et rapport instantané.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setScreen('analyse_auto')}
                className="gap-2 text-xs font-semibold h-11 px-4 rounded-xl border-dashed"
              >
                <RefreshCw className="h-4 w-4" /> Analyse Ruptures (Scan Auto)
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setWorkspaceView('bons-commandes')}
                className="gap-2 text-xs font-semibold h-11 px-4 rounded-xl"
              >
                <ListOrdered className="h-4 w-4" /> Historique Bons PDF
              </Button>

              <Button
                size="lg"
                onClick={() => {
                  setPurchaseLines([])
                  setScreen('entry')
                }}
                className="gap-2.5 px-6 font-bold shadow-lg shadow-primary/25 rounded-xl h-11 bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                <Plus className="h-5 w-5" /> Nouvel Achat Rapide
              </Button>
            </div>
          </div>

          {/* Cartes KPI rapides */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-2xl border bg-card p-4 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Dernier Achat Effectué
                </span>
                <Receipt className="h-4 w-4 text-primary" />
              </div>
              <p className="text-xl font-bold text-foreground mt-2">
                {recentReports.length > 0 ? formatCurrency(recentReports[0].totalAmount) : '0 FCFA'}
              </p>
              <p className="text-[11px] text-muted-foreground mt-1">
                {recentReports.length > 0 ? `${recentReports[0].supplierName} — ${recentReports[0].date}` : 'Aucun achat enregistré cette session'}
              </p>
            </div>

            <div className="rounded-2xl border bg-card p-4 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Articles en Catalogue
                </span>
                <Package className="h-4 w-4 text-emerald-500" />
              </div>
              <p className="text-xl font-bold text-foreground mt-2">
                {products.length + books.length} <span className="text-xs font-normal text-muted-foreground">références</span>
              </p>
              <p className="text-[11px] text-muted-foreground mt-1">
                {books.length} livres scolaires + {products.length} produits généraux
              </p>
            </div>

            <div className="rounded-2xl border bg-card p-4 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Rapports Générés
                </span>
                <FileText className="h-4 w-4 text-amber-500" />
              </div>
              <p className="text-xl font-bold text-foreground mt-2">
                {recentReports.length} <span className="text-xs font-normal text-muted-foreground">sessions</span>
              </p>
              <p className="text-[11px] text-muted-foreground mt-1">
                Disponibles pour impression et consultation
              </p>
            </div>
          </div>

          {/* Tableau / Historique des Rapports d'Achats Récents */}
          <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
            <div className="p-4 border-b bg-muted/30 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" /> Rapports des Achats & Réceptions Récents
                </h3>
                <p className="text-xs text-muted-foreground">
                  Consultez ou réimprimez les rapports générés lors de vos réapprovisionnements.
                </p>
              </div>
            </div>

            {recentReports.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center px-4">
                <ShoppingBag className="h-12 w-12 text-muted-foreground/30 mb-3" />
                <p className="text-sm font-semibold text-foreground">Aucun achat enregistré pour le moment</p>
                <p className="text-xs text-muted-foreground max-w-sm mt-1">
                  Cliquez sur le bouton ci-dessous pour choisir vos articles, saisir les quantités et générer votre rapport des achats.
                </p>
                <Button
                  size="sm"
                  onClick={() => {
                    setPurchaseLines([])
                    setScreen('entry')
                  }}
                  className="mt-4 gap-2 font-bold"
                >
                  <Plus className="h-4 w-4" /> Entrer les Achats
                </Button>
              </div>
            ) : (
              <div className="divide-y text-xs">
                {recentReports.map((rep, idx) => (
                  <div
                    key={idx}
                    className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:bg-muted/20 transition-colors"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-primary">{rep.reference}</span>
                        <Badge variant="outline" className="text-[10px]">
                          {rep.paymentMethod}
                        </Badge>
                      </div>
                      <p className="font-semibold text-foreground mt-1">{rep.supplierName}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {rep.date} • {rep.items.length} article(s) • {rep.totalQuantity} unité(s) totale(s)
                      </p>
                    </div>

                    <div className="flex items-center gap-4 self-end sm:self-center">
                      <div className="text-right">
                        <p className="text-sm font-extrabold text-foreground">{formatCurrency(rep.totalAmount)}</p>
                        <p className="text-[10px] text-emerald-600 font-semibold">
                          Marge: +{formatCurrency(rep.estimatedMargin)}
                        </p>
                      </div>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleViewReport(rep)}
                        className="gap-1.5 text-xs h-8"
                      >
                        <FileText className="h-3.5 w-3.5" /> Voir le Rapport
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────
          2. ÉCRAN DE SAISIE : NOUVEL ACHAT RAPIDE & RECHERCHE ULTRA-INTELLIGENTE
      ──────────────────────────────────────────────────────────────────────── */}
      {screen === 'entry' && (
        <div className="space-y-5">
          {/* En-tête de saisie */}
          <div className="flex items-center justify-between gap-4 border-b pb-4">
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setScreen('home')}
                className="gap-1.5 text-xs rounded-xl h-9"
              >
                <ArrowLeft className="h-4 w-4" /> Retour
              </Button>
              <div>
                <h2 className="text-xl font-bold tracking-tight text-foreground">
                  Nouvel Achat / Entrée en Stock
                </h2>
                <p className="text-xs text-muted-foreground">
                  Sélectionnez vos articles avec la recherche intelligente ou scannez directement les codes-barres.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setNewBookTitle(itemSearchText.trim())
                  setShowCreateBookModal(true)
                }}
                className="h-9 gap-1.5 text-xs text-indigo-600 border-indigo-200 hover:bg-indigo-50 font-semibold rounded-xl"
              >
                <Plus className="h-3.5 w-3.5" /> Créer un Livre
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setNewProductName(itemSearchText.trim())
                  setShowCreateProductModal(true)
                }}
                className="h-9 gap-1.5 text-xs text-emerald-600 border-emerald-200 hover:bg-emerald-50 font-semibold rounded-xl"
              >
                <Plus className="h-3.5 w-3.5" /> Créer un Produit
              </Button>
            </div>
          </div>

          {/* Moteur de Recherche Ultra-Intelligent */}
          <div className="rounded-3xl border bg-card p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              {/* Filtres Rapides par Catégorie */}
              <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl border text-xs">
                <button
                  type="button"
                  onClick={() => setSearchItemType('all')}
                  className={cn(
                    'px-3 py-1.5 rounded-lg font-medium transition-all',
                    searchItemType === 'all'
                      ? 'bg-background shadow-xs font-bold text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  Tous ({products.length + books.length})
                </button>
                <button
                  type="button"
                  onClick={() => setSearchItemType('livres')}
                  className={cn(
                    'px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5',
                    searchItemType === 'livres'
                      ? 'bg-background shadow-xs font-bold text-indigo-600'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <BookOpen className="h-3.5 w-3.5" /> Livres scolaires ({books.length})
                </button>
                <button
                  type="button"
                  onClick={() => setSearchItemType('produits')}
                  className={cn(
                    'px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5',
                    searchItemType === 'produits'
                      ? 'bg-background shadow-xs font-bold text-emerald-600'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Package className="h-3.5 w-3.5" /> Produits généraux ({products.length})
                </button>
              </div>

              <div className="text-xs text-muted-foreground hidden sm:flex items-center gap-2 font-mono">
                <span className="bg-muted px-2 py-0.5 rounded text-[11px]">↑ / ↓</span> pour naviguer
                <span className="bg-muted px-2 py-0.5 rounded text-[11px]">Entrée</span> pour ajouter
              </div>
            </div>

            {/* Champ de Recherche Intelligent */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-primary" />
              <Input
                ref={searchInputRef}
                placeholder="Rechercher par nom, code-barres, ISBN, éditeur, classe, matière... (Tapez ou scannez)"
                value={itemSearchText}
                onChange={(e) => {
                  setItemSearchText(e.target.value)
                  setIsSearchFocused(true)
                }}
                onFocus={() => setIsSearchFocused(true)}
                onKeyDown={handleSearchKeyDown}
                className="h-13 pl-12 pr-12 text-sm sm:text-base rounded-2xl border-2 border-primary/30 focus:border-primary shadow-xs font-medium"
              />

              {itemSearchText && (
                <button
                  type="button"
                  onClick={() => {
                    setItemSearchText('')
                    searchInputRef.current?.focus()
                  }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs bg-muted/80 hover:bg-muted p-1 rounded-full"
                >
                  ✕
                </button>
              )}

              {/* Dropdown des résultats de recherche intelligente */}
              {isSearchFocused && searchResults.length > 0 && (
                <div className="absolute left-0 right-0 top-14 z-30 bg-card border border-border/80 rounded-2xl shadow-2xl overflow-hidden max-h-80 overflow-y-auto divide-y animate-fade-in backdrop-blur-md">
                  <div className="bg-muted/40 px-4 py-2 text-[11px] font-semibold text-muted-foreground flex items-center justify-between">
                    <span>{searchResults.length} article(s) trouvé(s)</span>
                    <span>Appuyez sur Entrée pour ajouter</span>
                  </div>

                  {searchResults.map((item, i) => {
                    const isSelected = i === selectedSearchIndex
                    const isBook = item.isBook
                    const data = item.data
                    const stockTotal = isBook
                      ? (data.stock ?? 0)
                      : (data.stocks?.reduce((s: number, st: any) => s + (st.quantity ?? 0), 0) ?? 0)

                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          if (isBook) handleAddBookToPurchase(data)
                          else handleAddProductToPurchase(data)
                        }}
                        onMouseEnter={() => setSelectedSearchIndex(i)}
                        className={cn(
                          'w-full text-left p-3.5 transition-colors flex items-center justify-between gap-3',
                          isSelected ? 'bg-primary/10' : 'hover:bg-muted/50'
                        )}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={cn(
                              'h-10 w-10 rounded-xl flex items-center justify-center shrink-0 border shadow-2xs font-bold',
                              isBook ? 'bg-indigo-50 text-indigo-600 border-indigo-200 dark:bg-indigo-950/40 dark:border-indigo-800' : 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800'
                            )}
                          >
                            {isBook ? <BookOpen className="h-5 w-5" /> : <Package className="h-5 w-5" />}
                          </div>

                          <div className="min-w-0 space-y-0.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-bold text-xs sm:text-sm text-foreground truncate">
                                {isBook ? data.title : data.name}
                              </p>

                              {item.exactBarcode && (
                                <Badge className="bg-primary text-primary-foreground text-[9px] py-0 px-1.5 font-bold">
                                  Code exact ✓
                                </Badge>
                              )}

                              {item.currentCartQty > 0 && (
                                <Badge variant="secondary" className="text-[10px] text-emerald-700 bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300 font-semibold py-0">
                                  Dans le bordereau : {item.currentCartQty}
                                </Badge>
                              )}
                            </div>

                            <p className="text-[11px] text-muted-foreground truncate flex items-center gap-2">
                              {isBook ? (
                                <>
                                  <span className="font-semibold text-foreground/80">{data.classLevel?.name || 'Général'}</span>
                                  {data.editor && <span>• Éditeur: {data.editor}</span>}
                                  {data.isbn && <span className="font-mono text-[10px]">• ISBN: {data.isbn}</span>}
                                </>
                              ) : (
                                <>
                                  <span className="font-semibold text-foreground/80">{data.category?.name || 'Sans catégorie'}</span>
                                  {data.barcode && <span className="font-mono text-[10px]">• Code: {data.barcode}</span>}
                                </>
                              )}
                              <span className="text-[10px] text-muted-foreground/80 font-medium">
                                (Stock actuel: {stockTotal})
                              </span>
                            </p>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <p className="text-xs sm:text-sm font-extrabold text-primary font-mono">
                            {formatCurrency(isBook ? data.price : data.sellingPrice)}
                          </p>
                          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-bold mt-0.5">
                            <Plus className="h-3 w-3" /> Ajouter (+1)
                          </span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Tableau du Bordereau d'Achat en Cours */}
          <div className="rounded-3xl border bg-card shadow-sm overflow-hidden">
            <div className="p-4 px-6 border-b bg-muted/20 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                  <Boxes className="h-4 w-4 text-primary" /> Articles du Bordereau ({purchaseLines.length})
                </h3>
              </div>
              {purchaseLines.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPurchaseLines([])}
                  className="text-xs text-muted-foreground hover:text-destructive h-7 gap-1"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Tout vider
                </Button>
              )}
            </div>

            {purchaseLines.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center px-4">
                <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center mb-3">
                  <ShoppingBag className="h-8 w-8 text-muted-foreground/40" />
                </div>
                <p className="text-base font-bold text-foreground">Votre bordereau d'achat est vide</p>
                <p className="text-xs text-muted-foreground max-w-md mt-1">
                  Utilisez la barre de recherche ci-dessus ou scannez vos articles au code-barres pour les ajouter instantanément.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-muted/40 border-b text-muted-foreground font-semibold uppercase tracking-wider text-[10px]">
                      <th className="py-3 px-6">Article</th>
                      <th className="py-3 px-3 text-right">Prix Vente</th>
                      <th className="py-3 px-3 text-center">Remise %</th>
                      <th className="py-3 px-3 text-right">Prix d'Achat Unitaire</th>
                      <th className="py-3 px-3 text-center">Quantité</th>
                      <th className="py-3 px-3 text-center">Destination</th>
                      <th className="py-3 px-6 text-right">Total</th>
                      <th className="py-3 px-3 text-center" />
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {purchaseLines.map((line) => {
                      const lineTotal = line.quantity * line.purchasePrice
                      return (
                        <tr key={line.id} className="hover:bg-muted/20 transition-colors">
                          <td className="py-3 px-6">
                            <div className="flex items-center gap-3">
                              <div
                                className={cn(
                                  'h-8 w-8 rounded-lg flex items-center justify-center shrink-0 border',
                                  line.isBook ? 'bg-indigo-50 text-indigo-600 border-indigo-200' : 'bg-emerald-50 text-emerald-600 border-emerald-200'
                                )}
                              >
                                {line.isBook ? <BookOpen className="h-4 w-4" /> : <Package className="h-4 w-4" />}
                              </div>
                              <div className="min-w-0">
                                <p className="font-semibold text-foreground truncate max-w-xs">{line.name}</p>
                                <p className="text-[10px] text-muted-foreground font-mono">{line.subtitle} {line.barcodeOrIsbn ? `• ${line.barcodeOrIsbn}` : ''}</p>
                              </div>
                            </div>
                          </td>

                          {/* Prix de Vente modifiable manuellement */}
                          <td className="py-3 px-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Input
                                type="number"
                                min={0}
                                value={line.sellingPrice || ''}
                                onChange={(e) =>
                                  updatePurchaseLine(line.id, {
                                    sellingPrice: Math.max(0, parseFloat(e.target.value) || 0)
                                  })
                                }
                                className="h-8 w-24 text-right font-mono font-bold text-xs bg-background text-emerald-600 dark:text-emerald-400"
                              />
                              <span className="text-[10px] text-muted-foreground">FCFA</span>
                            </div>
                          </td>

                          {/* Remise en % si livre, ou badge Direct si produit */}
                          <td className="py-3 px-3 text-center">
                            {line.isBook ? (
                              <div className="inline-flex items-center gap-1 bg-background border rounded-md px-1.5 py-0.5 shadow-2xs">
                                <input
                                  type="number"
                                  min={0}
                                  max={100}
                                  value={line.discountPercent ?? 20}
                                  onChange={(e) =>
                                    updatePurchaseLine(line.id, {
                                      discountPercent: Math.max(0, Math.min(100, parseFloat(e.target.value) || 0))
                                    })
                                  }
                                  className="w-10 text-center font-bold text-indigo-600 text-xs bg-transparent focus:outline-none"
                                />
                                <span className="text-[10px] text-muted-foreground">%</span>
                              </div>
                            ) : (
                              <Badge variant="outline" className="text-[9px] text-muted-foreground">
                                Direct
                              </Badge>
                            )}
                          </td>

                          {/* Prix d'Achat unitaire */}
                          <td className="py-3 px-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Input
                                type="number"
                                min={0}
                                value={line.purchasePrice || ''}
                                onChange={(e) =>
                                  updatePurchaseLine(line.id, {
                                    purchasePrice: Math.max(0, parseFloat(e.target.value) || 0)
                                  })
                                }
                                className="h-8 w-24 text-right font-mono font-bold text-xs bg-background"
                              />
                              <span className="text-[10px] text-muted-foreground">FCFA</span>
                            </div>
                          </td>

                          {/* Quantité achetée avec boutons +/- */}
                          <td className="py-3 px-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => updatePurchaseLine(line.id, { quantity: Math.max(1, line.quantity - 1) })}
                                className="h-7 w-7 rounded-lg border bg-background hover:bg-muted font-bold text-xs flex items-center justify-center text-muted-foreground"
                              >
                                -
                              </button>
                              <Input
                                type="number"
                                min={1}
                                value={line.quantity || ''}
                                onChange={(e) =>
                                  updatePurchaseLine(line.id, {
                                    quantity: Math.max(1, parseInt(e.target.value) || 1)
                                  })
                                }
                                className="h-8 w-14 text-center font-bold text-xs bg-background"
                              />
                              <button
                                type="button"
                                onClick={() => updatePurchaseLine(line.id, { quantity: line.quantity + 1 })}
                                className="h-7 w-7 rounded-lg border bg-background hover:bg-muted font-bold text-xs flex items-center justify-center text-muted-foreground"
                              >
                                +
                              </button>
                            </div>
                          </td>

                          {/* Destination : Boutique vs Magasin */}
                          <td className="py-3 px-3 text-center">
                            <button
                              type="button"
                              onClick={() =>
                                updatePurchaseLine(line.id, { sendToMagasin: !line.sendToMagasin })
                              }
                              className={cn(
                                'px-3 py-1.5 rounded-xl text-[11px] font-semibold transition-all border inline-flex items-center gap-1.5 shadow-2xs',
                                line.sendToMagasin
                                  ? 'border-amber-400 bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                                  : 'border-emerald-400 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                              )}
                            >
                              {line.sendToMagasin ? (
                                <>
                                  <Warehouse className="h-3 w-3" /> Magasin Réserve
                                </>
                              ) : (
                                <>
                                  <Store className="h-3 w-3" /> Boutique Rayon
                                </>
                              )}
                            </button>
                          </td>

                          {/* Total Ligne */}
                          <td className="py-3 px-6 text-right font-mono font-bold text-primary text-sm">
                            {formatCurrency(lineTotal)}
                          </td>

                          {/* Supprimer */}
                          <td className="py-3 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => removePurchaseLine(line.id)}
                              className="p-1.5 text-muted-foreground hover:text-destructive rounded-lg hover:bg-muted transition-colors"
                              title="Retirer de la liste"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Bandeau de Validation & Totaux */}
          <div className="rounded-3xl border bg-card p-6 shadow-xl flex flex-col md:flex-row items-center justify-between gap-5">
            <div className="flex items-center gap-6 flex-wrap">
              <div>
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                  Articles Sélectionnés
                </p>
                <p className="text-xl font-bold text-foreground">
                  {currentPurchaseSummary.totalItemsCount} <span className="text-xs font-normal text-muted-foreground">réf.</span>
                </p>
              </div>

              <div className="border-l pl-5">
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                  Quantité Totale
                </p>
                <p className="text-xl font-bold text-foreground">
                  {currentPurchaseSummary.totalUnits} <span className="text-xs font-normal text-muted-foreground">unités</span>
                </p>
              </div>

              <div className="border-l pl-5">
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                  Montant Total Achat
                </p>
                <p className="text-2xl font-extrabold text-primary font-mono">
                  {formatCurrency(currentPurchaseSummary.totalCost)}
                </p>
              </div>
              <div className="border-l pl-5 hidden sm:block">
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                  Marge Estimée
                </p>
                <p className="text-base font-bold text-emerald-600">
                  +{formatCurrency(currentPurchaseSummary.estimatedMargin)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setScreen('home')}
                className="h-11 px-4 text-xs rounded-xl"
              >
                Annuler
              </Button>

              <Button
                size="default"
                onClick={handleValidatePurchase}
                disabled={savingPurchase || purchaseLines.length === 0}
                className="gap-2 h-11 px-7 font-bold shadow-lg shadow-emerald-600/20 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm"
              >
                {savingPurchase ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" /> Enregistrement...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-5 w-5" /> Valider l'Achat ({formatCurrency(currentPurchaseSummary.totalCost)})
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────
          3. ÉCRAN DU RAPPORT DES ACHATS / BORDEREAU DE RÉCEPTION
      ──────────────────────────────────────────────────────────────────────── */}
      {screen === 'report' && currentReport && (
        <div className="space-y-6 max-w-4xl mx-auto">
          {/* Barre d'action haut */}
          <div className="flex items-center justify-between gap-4 print:hidden">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setScreen('home')}
              className="gap-1.5 text-xs"
            >
              <ArrowLeft className="h-4 w-4" /> Retour aux Achats
            </Button>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={handlePrintReport}
                className="gap-2 font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
              >
                <Printer className="h-4 w-4" /> Imprimer le Rapport
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setPurchaseLines([])
                  setScreen('entry')
                }}
                className="gap-1.5 font-semibold text-xs"
              >
                <Plus className="h-3.5 w-3.5" /> Nouvel Achat
              </Button>
            </div>
          </div>

          {/* Document Officiel Rapport des Achats */}
          <div className="bg-card border rounded-3xl p-8 shadow-md space-y-6 print:border-none print:shadow-none print:p-2">
            {/* En-tête Rapport */}
            <div className="border-b pb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <span className="text-[11px] font-bold text-primary uppercase tracking-widest bg-primary/10 px-2.5 py-1 rounded-md">
                  Document Officiel
                </span>
                <h2 className="text-2xl font-extrabold text-foreground mt-2 tracking-tight">
                  RAPPORT DES ACHATS & RÉCEPTION
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Bordereau de réapprovisionnement et d'entrée en stock
                </p>
              </div>

              <div className="text-left sm:text-right">
                <p className="font-mono font-bold text-sm text-foreground">{currentReport.reference}</p>
                <p className="text-xs text-muted-foreground flex items-center sm:justify-end gap-1 mt-0.5">
                  <Calendar className="h-3.5 w-3.5" /> {currentReport.date}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Lieu : <strong>{currentReport.warehouseName}</strong>
                </p>
              </div>
            </div>

            {/* Infos Fournisseur & Paiement */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-muted/30 p-4 rounded-2xl border">
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  Fournisseur / Éditeur
                </p>
                <p className="font-bold text-sm text-foreground mt-0.5 flex items-center gap-1.5">
                  <Truck className="h-4 w-4 text-primary" /> {currentReport.supplierName}
                </p>
              </div>

              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  Mode de Règlement
                </p>
                <p className="font-bold text-sm text-foreground mt-0.5 flex items-center gap-1.5">
                  <CreditCard className="h-4 w-4 text-emerald-600" /> {currentReport.paymentMethod}
                </p>
              </div>

              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  N° Facture Fournisseur
                </p>
                <p className="font-mono font-bold text-sm text-foreground mt-0.5">
                  {currentReport.invoiceNumber || '— Non renseigné —'}
                </p>
              </div>
            </div>

            {/* Tableau des articles achetés */}
            <div className="rounded-2xl border overflow-hidden">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-muted/60 border-b text-muted-foreground font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-2.5 px-4">#</th>
                    <th className="py-2.5 px-4">Désignation de l'Article</th>
                    <th className="py-2.5 px-3 text-center">Destination</th>
                    <th className="py-2.5 px-3 text-center">Quantité</th>
                    <th className="py-2.5 px-3 text-right">Prix d'Achat Unit.</th>
                    <th className="py-2.5 px-4 text-right">Total Achat</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {currentReport.items.map((it, idx) => (
                    <tr key={it.id} className="hover:bg-muted/10">
                      <td className="py-2.5 px-4 font-mono text-muted-foreground">{idx + 1}</td>
                      <td className="py-2.5 px-4">
                        <p className="font-semibold text-foreground">{it.name}</p>
                        {it.subtitle && <p className="text-[10px] text-muted-foreground">{it.subtitle}</p>}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <Badge variant="outline" className="text-[10px]">
                          {it.sendToMagasin ? 'Magasin Réserve' : 'Boutique Rayon'}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold font-mono text-foreground">
                        {it.quantity}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono">
                        {formatCurrency(it.purchasePrice)}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold text-foreground">
                        {formatCurrency(it.quantity * it.purchasePrice)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Récapitulatif Total du Rapport */}
            <div className="border-t pt-4 flex flex-col sm:flex-row items-end justify-between gap-4">
              <div className="text-xs text-muted-foreground space-y-1">
                <p>• Les stocks ont été automatiquement incrémentés dans la base de données.</p>
                <p>• La sortie comptable correspondante a été consignée dans le cahier de caisse.</p>
              </div>

              <div className="w-full sm:w-72 space-y-2 bg-muted/40 p-4 rounded-2xl border">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Total Articles :</span>
                  <span className="font-semibold text-foreground">{currentReport.items.length} références</span>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Unités Totales :</span>
                  <span className="font-semibold text-foreground">{currentReport.totalQuantity} unités</span>
                </div>
                <div className="border-t pt-2 flex justify-between items-baseline">
                  <span className="text-sm font-bold text-foreground">TOTAL ACHATS :</span>
                  <span className="text-xl font-extrabold text-primary font-mono">
                    {formatCurrency(currentReport.totalAmount)}
                  </span>
                </div>
              </div>
            </div>

            {/* Signatures en bas du document */}
            <div className="grid grid-cols-2 gap-8 pt-8 border-t text-xs text-muted-foreground text-center">
              <div>
                <p className="font-bold text-foreground mb-12">Le Responsable des Achats / Réception</p>
                <div className="border-t border-dashed w-36 mx-auto pt-1">Signature & Date</div>
              </div>
              <div>
                <p className="font-bold text-foreground mb-12">Le Fournisseur / Livreur</p>
                <div className="border-t border-dashed w-36 mx-auto pt-1">Signature & Date</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────
          4. ÉCRAN : ANALYSE DES RUPTURES & SCAN AUTOMATIQUE
      ──────────────────────────────────────────────────────────────────────── */}
      {screen === 'analyse_auto' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setScreen('home')}
              className="gap-1.5 text-xs"
            >
              <ArrowLeft className="h-4 w-4" /> Retour aux Achats
            </Button>
            <h2 className="text-lg font-bold text-foreground">Analyse Automatique des Stocks Critiques</h2>
            <div className="w-24" />
          </div>

          <div className="flex items-center justify-between bg-card border rounded-2xl p-4 shadow-sm">
            <div>
              <p className="font-semibold text-sm">Détection automatique des seuils d'alerte</p>
              <p className="text-xs text-muted-foreground">
                Scanne l'ensemble des stocks et génère automatiquement les bons de commande fournisseurs en PDF.
              </p>
            </div>
            <Button onClick={handleAnalyze} disabled={analyzing} className="gap-2 shadow-sm">
              {analyzing ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" /> Analyse…
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" /> Lancer l'analyse
                </>
              )}
            </Button>
          </div>

          {analysisError && (
            <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-4 text-xs text-destructive">
              {analysisError}
            </div>
          )}

          {!analysisDone && !analyzing && (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed py-20 text-center bg-card/40">
              <RefreshCw className="h-12 w-12 text-primary/30" />
              <p className="mt-4 text-base font-semibold text-foreground">Analyser les stocks critiques</p>
              <p className="mt-1 text-xs text-muted-foreground max-w-sm">
                Cliquez sur "Lancer l'analyse" pour identifier les produits et livres sous le seuil critique et générer les bons de commande.
              </p>
            </div>
          )}

          {analysisDone && orders.length === 0 && (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed py-16 text-center bg-card/40">
              <Package className="h-12 w-12 text-emerald-500/60" />
              <p className="mt-3 text-base font-semibold text-emerald-600">✓ Aucun réapprovisionnement nécessaire</p>
              <p className="mt-1 text-xs text-muted-foreground">Tous les stocks sont au-dessus de leur seuil critique.</p>
            </div>
          )}

          {analysisDone && orders.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-xl border bg-amber-50 px-5 py-4 dark:bg-amber-950/20">
                <p className="text-xs font-semibold text-amber-800 dark:text-amber-400">
                  ⚠️ {orders.length} produit{orders.length !== 1 ? 's' : ''} nécessitent un réapprovisionnement urgent
                </p>
                <div className="flex gap-2">
                  {pdfPath && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2 text-amber-700 border-amber-300 hover:bg-amber-100 dark:text-amber-400 dark:border-amber-800"
                      onClick={() => window.api.openFile(pdfPath)}
                    >
                      <FileText className="h-4 w-4" /> Voir le PDF généré
                    </Button>
                  )}
                </div>
              </div>

              {Object.entries(bySupplier).map(([supplier, items]) => (
                <div key={supplier} className="rounded-2xl border bg-card shadow-sm overflow-hidden">
                  <div className="bg-muted/40 px-5 py-3 border-b flex items-center justify-between flex-wrap gap-2">
                    <p className="font-semibold text-sm flex items-center gap-2">
                      <Truck className="h-4 w-4 text-primary" /> {supplier}
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 text-emerald-600 border-emerald-300 hover:bg-emerald-50 dark:text-emerald-400 dark:border-emerald-800"
                      onClick={() => handleConfirmPurchase(supplier, items)}
                      disabled={confirmingSupplier === supplier}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {confirmingSupplier === supplier ? 'Confirmation...' : 'Confirmer la réception'}
                    </Button>
                  </div>

                  <div className="divide-y text-xs">
                    {items.map((o, i) => {
                      const isMagasin = !!analysisToMagasin[o.productId]
                      return (
                        <div key={i} className="flex items-center gap-4 px-5 py-3 flex-wrap sm:flex-nowrap">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground">{o.productName}</p>
                            <p className="text-[10px] text-muted-foreground font-mono">Code: {o.productBarcode}</p>
                          </div>

                          <button
                            onClick={() => toggleAnalysisMagasin(o.productId)}
                            className={cn(
                              'flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors',
                              isMagasin
                                ? 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-400'
                                : 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400'
                            )}
                          >
                            <Store className="h-3 w-3" />
                            {isMagasin ? '→ Magasin' : 'Boutique'}
                          </button>

                          <div className="text-right shrink-0">
                            <p className="text-[10px] text-muted-foreground">Stock / Seuil</p>
                            <p className="font-semibold text-rose-600 font-mono">
                              {o.currentStock} / {o.alertLimit}
                            </p>
                          </div>

                          <div className="shrink-0">
                            <input
                              type="number"
                              min="0"
                              value={analysisUnitPrices[o.productId] ?? ''}
                              onChange={(e) =>
                                setAnalysisUnitPrices((prev) => ({ ...prev, [o.productId]: e.target.value }))
                              }
                              placeholder="Prix unitaire"
                              className="w-24 rounded-lg border px-2 py-1 text-right text-xs bg-background"
                            />
                          </div>

                          <div
                            className={cn(
                              'rounded-full px-2.5 py-0.5 text-xs font-bold text-white shrink-0',
                              isMagasin ? 'bg-amber-600' : 'bg-primary'
                            )}
                          >
                            Qté : {o.suggestedQuantity}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────
          MODAL : CRÉER RAPIDEMENT UN PRODUIT INEXISTANT
      ──────────────────────────────────────────────────────────────────────── */}
      <Dialog open={showCreateProductModal} onOpenChange={setShowCreateProductModal}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" /> Créer un nouveau produit
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3.5 py-2">
            <div className="space-y-1">
              <Label className="text-xs">Nom du produit *</Label>
              <Input
                placeholder="Ex: Cahier 200 pages, Stylo Bic..."
                value={newProductName}
                onChange={(e) => setNewProductName(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Prix d'Achat unitaire (FCFA)</Label>
                <Input
                  type="number"
                  min={0}
                  placeholder="Ex: 400"
                  value={newProductPurchasePrice}
                  onChange={(e) => setNewProductPurchasePrice(e.target.value === '' ? '' : parseFloat(e.target.value))}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Prix de Vente (FCFA) *</Label>
                <Input
                  type="number"
                  min={0}
                  placeholder="Ex: 500"
                  value={newProductSellingPrice}
                  onChange={(e) => setNewProductSellingPrice(e.target.value === '' ? '' : parseFloat(e.target.value))}
                  className="h-9 text-xs font-bold"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Code-barres (optionnel)</Label>
              <Input
                placeholder="Auto-généré si vide"
                value={newProductBarcode}
                onChange={(e) => setNewProductBarcode(e.target.value)}
                className="h-9 text-xs font-mono"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Catégorie</Label>
              <select
                value={newProductCategoryId}
                onChange={(e) => setNewProductCategoryId(e.target.value)}
                className="w-full h-9 rounded-lg border bg-background px-2.5 text-xs focus:outline-none"
              >
                <option value="">Sélectionner une catégorie...</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCreateProductModal(false)}
              disabled={creatingProduct}
            >
              Annuler
            </Button>
            <Button
              size="sm"
              onClick={handleCreateQuickProduct}
              disabled={creatingProduct || !newProductName.trim()}
              className="font-bold"
            >
              {creatingProduct ? 'Création...' : 'Créer et ajouter au bordereau'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ────────────────────────────────────────────────────────────────────────
          MODAL : CRÉER RAPIDEMENT UN LIVRE INEXISTANT
      ──────────────────────────────────────────────────────────────────────── */}
      <Dialog open={showCreateBookModal} onOpenChange={setShowCreateBookModal}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-indigo-500" /> Créer un nouveau livre scolaire
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3.5 py-2">
            <div className="space-y-1">
              <Label className="text-xs">Titre du livre *</Label>
              <Input
                placeholder="Ex: Mon Cahier d'Activités CP, Mathématiques 6e..."
                value={newBookTitle}
                onChange={(e) => setNewBookTitle(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Classe / Niveau *</Label>
                <select
                  value={newBookClassLevelId}
                  onChange={(e) => setNewBookClassLevelId(e.target.value)}
                  className="w-full h-9 rounded-lg border bg-background px-2.5 text-xs focus:outline-none"
                >
                  {classLevels.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Éditeur</Label>
                <Input
                  placeholder="Ex: Hatier, Afrédit..."
                  value={newBookEditor}
                  onChange={(e) => setNewBookEditor(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Prix Public Vente (FCFA) *</Label>
                <Input
                  type="number"
                  min={0}
                  placeholder="Ex: 2500"
                  value={newBookSellingPrice}
                  onChange={(e) => setNewBookSellingPrice(e.target.value === '' ? '' : parseFloat(e.target.value))}
                  className="h-9 text-xs font-bold"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">
                  Prix d'Achat (-20% standard)
                </Label>
                <Input
                  type="number"
                  min={0}
                  placeholder={
                    typeof newBookSellingPrice === 'number' && newBookSellingPrice > 0
                      ? `${Math.round(newBookSellingPrice * 0.8)}`
                      : 'Ex: 2000'
                  }
                  value={newBookPurchasePrice}
                  onChange={(e) => setNewBookPurchasePrice(e.target.value === '' ? '' : parseFloat(e.target.value))}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Auteur (optionnel)</Label>
                <Input
                  placeholder="Ex: J. Dupont"
                  value={newBookAuthor}
                  onChange={(e) => setNewBookAuthor(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">ISBN (optionnel)</Label>
                <Input
                  placeholder="Ex: 978-2-..."
                  value={newBookIsbn}
                  onChange={(e) => setNewBookIsbn(e.target.value)}
                  className="h-9 text-xs font-mono"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCreateBookModal(false)}
              disabled={creatingBook}
            >
              Annuler
            </Button>
            <Button
              size="sm"
              onClick={handleCreateQuickBook}
              disabled={creatingBook || !newBookTitle.trim()}
              className="font-bold"
            >
              {creatingBook ? 'Création...' : 'Créer et ajouter au bordereau'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal d'Aperçu du Bordereau d'Achat avant Validation */}
      <Dialog open={showPurchasePreviewModal} onOpenChange={setShowPurchasePreviewModal}>
        <DialogContent className="max-w-lg p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold text-foreground">
              <Receipt className="h-5 w-5 text-emerald-600" />
              Aperçu du Bordereau d'Achat avant Validation
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 my-2 text-xs">
            {/* Header info */}
            <div className="bg-card border border-border p-3.5 rounded-lg space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-bold text-sm text-foreground">{workspaceName || 'Boutique Principale'}</span>
                <Badge variant="outline" className="font-mono text-[10px] bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40">
                  Réception Marchandise
                </Badge>
              </div>
              <div className="flex justify-between text-muted-foreground pt-1 border-t border-border/50">
                <span>Date & Heure : {new Date().toLocaleString('fr-FR')}</span>
                <span>Mode : <strong className="text-foreground">Comptant (Espèces Caisse)</strong></span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Fournisseur / Origine : <strong className="text-foreground">Achat Direct / Grossiste</strong></span>
              </div>
            </div>

            {/* Articles Table */}
            <div className="rounded-lg border border-border overflow-hidden">
              <div className="bg-muted px-3 py-2 font-semibold flex justify-between text-[11px] text-muted-foreground uppercase tracking-wider">
                <span>Article ({purchaseLines.length})</span>
                <span>Destination & Qte</span>
                <span>Total Achat</span>
              </div>
              <div className="divide-y divide-border max-h-56 overflow-y-auto">
                {purchaseLines.map((line) => {
                  const totalLine = line.quantity * line.purchasePrice
                  return (
                    <div key={line.id} className="px-3 py-2 flex items-center justify-between text-foreground">
                      <div className="min-w-0 flex-1 pr-2">
                        <p className="font-semibold truncate">{line.name}</p>
                        <p className="text-[10px] text-muted-foreground font-mono">
                          {line.subtitle} {line.barcodeOrIsbn ? `• ${line.barcodeOrIsbn}` : ''}
                        </p>
                      </div>
                      <div className="px-2 text-center shrink-0">
                        <Badge variant="secondary" className="text-[9px] px-1.5 py-0">
                          {line.sendToMagasin ? 'Magasin' : 'Boutique'}
                        </Badge>
                        <p className="text-[10px] font-bold text-foreground mt-0.5">{line.quantity} unit.</p>
                      </div>
                      <div className="text-right font-semibold tabular-nums shrink-0 pl-2">
                        <span className="text-muted-foreground text-[10px]">{formatCurrency(line.purchasePrice)} × {line.quantity} =</span>
                        <p className="text-emerald-600 font-bold text-xs">{formatCurrency(totalLine)}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Financial Summary */}
            <div className="bg-muted/50 p-4 rounded-lg space-y-1.5 border border-border">
              <div className="flex justify-between text-muted-foreground">
                <span>Nombre de Références :</span>
                <span className="font-semibold tabular-nums">{currentPurchaseSummary.totalItemsCount} articles</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Quantité Totale Réceptionnée :</span>
                <span className="font-semibold tabular-nums">{currentPurchaseSummary.totalUnits} unités</span>
              </div>
              <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                <span>Marge Brute Estimée à la revente :</span>
                <span className="font-semibold tabular-nums">+{formatCurrency(currentPurchaseSummary.estimatedMargin)}</span>
              </div>

              <div className="flex justify-between text-base font-extrabold text-foreground pt-2 border-t border-border">
                <span>Total Décaissé (Caisse) :</span>
                <span className="tabular-nums text-emerald-600 text-lg">{formatCurrency(currentPurchaseSummary.totalCost)}</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowPurchasePreviewModal(false)} disabled={savingPurchase}>
              ← Modifier la saisie
            </Button>
            <Button
              onClick={async () => {
                setShowPurchasePreviewModal(false)
                await executePurchase()
              }}
              disabled={savingPurchase}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1.5"
            >
              {savingPurchase ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Confirmer l'Achat ({formatCurrency(currentPurchaseSummary.totalCost)})
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
