import { useState, useEffect, useRef } from 'react'
import {
  Plus, ArrowUpRight, ArrowDownRight, TrendingUp, TrendingDown,
  Package, Search, X, Barcode, Wallet, Trash2, FileDown,
  ShoppingCart, ShoppingBag, Landmark, Smartphone, CreditCard, Receipt,
  Percent, Clock, Lock, Unlock, History, CheckCircle2, AlertCircle,
  Truck, Filter, Layers
} from 'lucide-react'
import { useEntrepotStore } from '../stores/entrepotStore'
import { useCashRegisterStore } from '../stores/cashRegisterStore'
import { useNotifications } from '../stores/notificationStore'
import { feedback } from '../stores/feedbackStore'
import { useProducts } from '../hooks/useProducts'
import { useBarcodeScanner } from '../hooks/useBarcodeScanner'
import { useDeviceCheck } from '../hooks/useDeviceCheck'
import { DeviceCheckModal } from '../components/DeviceCheckModal'
import { QuantitySelector } from '../components/QuantitySelector'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Badge } from '../components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog'
import { cn, formatCurrency } from '@/lib/utils'
import type { ProductWithRelations, CashSession } from '../../../shared/types'

type FlowType = 'ENTREE' | 'SORTIE'
type PanelView = 'closed' | 'form'
type FilterMode = 'ALL' | 'DIRECT' | 'AVANCES' | 'NON_LIVRES'

const PAYMENT_OPTIONS = [
  { value: 'ESPECES', label: 'Espèces', icon: Wallet },
  { value: 'CARTE_BANCAIRE', label: 'Carte bancaire', icon: CreditCard },
  { value: 'MOBILE_MONEY', label: 'Mobile Money', icon: Smartphone },
  { value: 'VIREMENT', label: 'Virement', icon: Landmark },
]

function CahierCaisse() {
  const { selectedId, selectedName } = useEntrepotStore()
  const { summary, transactions, isLoading, fetchDailyData, addTransaction, deleteTransaction } = useCashRegisterStore()
  const { products } = useProducts()
  const [panel, setPanel] = useState<PanelView>('closed')
  const [flowType, setFlowType] = useState<FlowType>('ENTREE')
  const [paymentMethod, setPaymentMethod] = useState('ESPECES')
  const [description, setDescription] = useState('')
  const [productSearch, setProductSearch] = useState('')
  const [selectedProduct, setSelectedProduct] = useState<ProductWithRelations | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [saving, setSaving] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)
  const [showDeviceModal, setShowDeviceModal] = useState(false)
  const [filterMode, setFilterMode] = useState<FilterMode>('ALL')
  const { checkScanner, testScanner } = useDeviceCheck()

  // POS Session state
  const [currentSession, setCurrentSession] = useState<CashSession | null>(null)
  const [showOpenSessionModal, setShowOpenSessionModal] = useState(false)
  const [showCloseSessionModal, setShowCloseSessionModal] = useState(false)
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [openingAmountInput, setOpeningAmountInput] = useState('')
  const [closingAmountActualInput, setClosingAmountActualInput] = useState('')
  const [sessionNotesInput, setSessionNotesInput] = useState('')
  const [sessionHistory, setSessionHistory] = useState<CashSession[]>([])
  const [sessionLoading, setSessionLoading] = useState(false)

  // Sécurité suppression transaction : Mot de passe propriétaire obligatoire
  const [deleteModalTx, setDeleteModalTx] = useState<any | null>(null)
  const [ownerPassword, setOwnerPassword] = useState('')
  const [deletingTx, setDeletingTx] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  useEffect(() => {
    if (!checkScanner()) setShowDeviceModal(true)
  }, [])

  const wid = selectedId ?? ''

  async function loadSession() {
    if (!wid) return
    try {
      const sess = await window.api.getCurrentCashSession(wid)
      setCurrentSession(sess)
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    if (wid) {
      fetchDailyData(wid)
      loadSession()
    }
  }, [wid])

  async function handleOpenSession(e: React.FormEvent) {
    e.preventDefault()
    if (!wid) return
    const amt = parseFloat(openingAmountInput) || 0
    try {
      setSessionLoading(true)
      const sess = await window.api.openCashSession({
        warehouseId: wid,
        openingAmount: amt,
        notes: sessionNotesInput || undefined
      })
      setCurrentSession(sess)
      setShowOpenSessionModal(false)
      setOpeningAmountInput('')
      setSessionNotesInput('')
      feedback.toast.success('Session de caisse ouverte', `Fond initial : ${formatCurrency(amt)}`)
      useNotifications.getState().addNotification({
        type: 'info',
        title: 'Session de caisse ouverte',
        description: `Fond de caisse initial : ${formatCurrency(amt)}`,
        meta: {}
      })
    } catch (err: any) {
      feedback.toast.error(err?.message || 'Erreur lors de l\'ouverture de session', 'Erreur')
    } finally {
      setSessionLoading(false)
    }
  }

  async function handleCloseSession(e: React.FormEvent) {
    e.preventDefault()
    if (!currentSession) return
    const actual = parseFloat(closingAmountActualInput) || 0
    try {
      setSessionLoading(true)
      const closed = await window.api.closeCashSession({
        sessionId: currentSession.id,
        closingAmountActual: actual,
        notes: sessionNotesInput || undefined
      })
      setCurrentSession(null)
      setShowCloseSessionModal(false)
      setClosingAmountActualInput('')
      setSessionNotesInput('')
      const diff = closed.difference ?? 0
      feedback.toast.success('Session clôturée', `Compté : ${formatCurrency(actual)} | Écart : ${diff >= 0 ? '+' : ''}${formatCurrency(diff)}`)
      useNotifications.getState().addNotification({
        type: diff === 0 ? 'info' : diff > 0 ? 'vente' : 'stock_alerte',
        title: 'Session de caisse clôturée (Z-Report)',
        description: `Compté : ${formatCurrency(actual)} | Écart : ${diff >= 0 ? '+' : ''}${formatCurrency(diff)}`,
        meta: {}
      })
    } catch (err: any) {
      feedback.toast.error(err?.message || 'Erreur lors de la clôture de session', 'Erreur')
    } finally {
      setSessionLoading(false)
    }
  }

  async function handleOpenHistory() {
    if (!wid) return
    try {
      const res = await window.api.getCashSessionHistory(wid)
      setSessionHistory(res.sessions || (res as any) || [])
      setShowHistoryModal(true)
    } catch (e) {
      console.error(e)
    }
  }

  useBarcodeScanner((barcode) => {
    if (panel !== 'form') return
    const found = products.find((p) => p.barcode === barcode)
    if (found) setSelectedProduct(found)
  })

  const filteredProducts = productSearch.length > 0
    ? products.filter((p) =>
        p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
        p.barcode.includes(productSearch))
    : []

  const stockForProduct = selectedProduct
    ? selectedProduct.stocks?.find((s) => s.warehouse.id === selectedId)?.quantity ?? 0
    : 0

  const lineTotal = selectedProduct ? quantity * (flowType === 'ENTREE' ? selectedProduct.sellingPrice : selectedProduct.basePrice) : 0

  function openForm(type: FlowType) {
    setFlowType(type)
    setSelectedProduct(null)
    setProductSearch('')
    setQuantity(1)
    setDescription('')
    setPaymentMethod('ESPECES')
    setPanel('form')
    setTimeout(() => searchRef.current?.focus(), 100)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!wid || !selectedProduct) return
    const unitPrice = flowType === 'ENTREE' ? selectedProduct.sellingPrice : selectedProduct.basePrice
    try {
      setSaving(true)
      const t = await window.api.createCashTransaction({
        type: flowType,
        warehouseId: wid,
        totalAmount: lineTotal,
        paymentMethod,
        description: description || undefined,
        lines: [{ productId: selectedProduct.id, quantity, unitPrice, subTotal: lineTotal }]
      })
      useNotifications.getState().addNotification({
        type: flowType === 'ENTREE' ? 'vente' : 'info',
        title: flowType === 'ENTREE' ? 'Vente enregistrée' : 'Achat enregistré',
        description: `${selectedProduct.name} x${quantity} — ${formatCurrency(lineTotal)}`,
        meta: { montant: lineTotal, produit: selectedProduct.name, quantite: quantity }
      })
      await fetchDailyData(wid)
      setPanel('closed')
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  async function handleExportPDF() {
    if (!transactions.length) return
    const today = new Date().toISOString().slice(0, 10)
    const data = {
      warehouseName: selectedName ?? '',
      warehouseLogo: null,
      operatorName: 'Administrateur',
      dateRange: { start: today, end: today },
      soldeOuverture: 0,
      totalEntrees: summary?.totalEntrees ?? 0,
      totalSorties: summary?.totalSorties ?? 0,
      soldeCloture: summary?.soldeDuJour ?? 0,
      transactions
    }
    try {
      const path = await window.api.exportCashReport(data)
      useNotifications.getState().addNotification({
        type: 'info',
        title: 'PDF exporté',
        description: `Rapport de caisse sauvegardé sur le bureau`,
        meta: {}
      })
    } catch (err) {
      console.error(err)
    }
  }

  const tzOffset = new Date().getTimezoneOffset() * 60000
  const yesterdayStart = new Date(Date.now() - 86400000 - tzOffset).toISOString().slice(0, 10)
  const yesterdayEnd = new Date(Date.now() - 86400000 - tzOffset).toISOString().slice(0, 10)

  return (
    <div className="space-y-6">
      {/* Session de Caisse POS Banner */}
      <div className={cn(
        'rounded-2xl p-4 border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm',
        currentSession
          ? 'bg-emerald-500/10 border-emerald-500/30 dark:bg-emerald-950/30 dark:border-emerald-800/40'
          : 'bg-amber-500/10 border-amber-500/30 dark:bg-amber-950/30 dark:border-amber-800/40'
      )}>
        <div className="flex items-center gap-3">
          <div className={cn(
            'p-2.5 rounded-xl text-white font-bold',
            currentSession ? 'bg-emerald-600' : 'bg-amber-600'
          )}>
            {currentSession ? <Unlock className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {currentSession ? 'Session de caisse active' : 'Aucune session de caisse ouverte'}
              </h3>
              <Badge className={currentSession ? 'bg-emerald-600 hover:bg-emerald-600' : 'bg-amber-600 hover:bg-amber-600'}>
                {currentSession ? 'OUVERTE' : 'FERMÉE'}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {currentSession ? (
                <>Ouverte à {new Date(currentSession.openedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} · Fond initial : <span className="font-semibold text-slate-800 dark:text-slate-200">{formatCurrency(currentSession.openingAmount)}</span></>
              ) : (
                'Veuillez ouvrir une session pour démarrer la journée et saisir le fond de caisse initial.'
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleOpenHistory} className="text-xs border-slate-300 dark:border-slate-700">
            <History className="w-3.5 h-3.5 mr-1.5" /> Historique Z
          </Button>

          {currentSession ? (
            <Button
              size="sm"
              onClick={() => {
                setClosingAmountActualInput('')
                setSessionNotesInput('')
                setShowCloseSessionModal(true)
              }}
              className="bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-xs font-semibold"
            >
              <Lock className="w-3.5 h-3.5 mr-1.5" /> Clôturer la journée (Z)
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={() => {
                setOpeningAmountInput('0')
                setSessionNotesInput('')
                setShowOpenSessionModal(true)
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
            >
              <Unlock className="w-3.5 h-3.5 mr-1.5" /> Ouvrir la caisse
            </Button>
          )}
        </div>
      </div>

      {/* Bento Grid — Résumé des 4 Soldes & Stocks */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Solde Général de Caisse (Total Général du Jour) */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 p-5 text-white shadow-md lg:col-span-2">
          <div className="absolute right-0 top-0 h-36 w-36 translate-x-8 -translate-y-8 rounded-full bg-white/10 blur-sm" />
          <div className="absolute bottom-0 left-0 h-28 w-28 -translate-x-8 translate-y-8 rounded-full bg-white/5" />
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-bold text-emerald-100">
              <Wallet className="h-3.5 w-3.5" /> Solde Global en Caisse
            </span>
            <span className="text-[11px] text-emerald-200/90 font-medium">Aujourd'hui</span>
          </div>
          <p className="mt-2 text-3xl sm:text-4xl font-black tabular-nums tracking-tight">
            {formatCurrency(summary?.soldeDuJour ?? 0)}
          </p>
          <div className="mt-3 flex items-center flex-wrap gap-3 text-xs">
            <span className="flex items-center gap-1 text-emerald-100 font-semibold bg-emerald-800/40 px-2 py-1 rounded-lg">
              <TrendingUp className="h-3.5 w-3.5 text-emerald-300" /> Entrées: +{formatCurrency(summary?.totalEntrees ?? 0)}
            </span>
            <span className="flex items-center gap-1 text-rose-100 font-semibold bg-emerald-800/40 px-2 py-1 rounded-lg">
              <TrendingDown className="h-3.5 w-3.5 text-rose-300" /> Dépenses: -{formatCurrency(summary?.totalSorties ?? 0)}
            </span>
            {(summary?.totalAchats ?? 0) > 0 && (
              <span className="flex items-center gap-1 text-sky-100 bg-emerald-800/40 px-2 py-1 rounded-lg text-[11px]">
                <ShoppingBag className="h-3 w-3 text-sky-300" /> Achats: {formatCurrency(summary?.totalAchats ?? 0)}
              </span>
            )}
          </div>
        </div>

        {/* 2. Total Ventes Directes (Sans avances ni non livrés) */}
        <div className="rounded-2xl border border-emerald-200/70 bg-gradient-to-b from-emerald-50/50 to-white dark:from-emerald-950/20 dark:to-card dark:border-emerald-900/50 p-4 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                <ShoppingCart className="h-3.5 w-3.5" /> Ventes Directes
              </span>
              <Badge variant="outline" className="text-[10px] border-emerald-300 bg-emerald-100/50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                Sans les 2
              </Badge>
            </div>
            <p className="mt-2 text-2xl font-black text-emerald-700 dark:text-emerald-300 tabular-nums">
              {formatCurrency(summary?.totalVentesDirectes ?? 0)}
            </p>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground leading-tight">
            Encaissements immédiats (hors avances et commandes non livrées).
          </p>
        </div>

        {/* 3. Solde Avances Clients */}
        <div className="rounded-2xl border border-amber-200/80 bg-gradient-to-b from-amber-50/50 to-white dark:from-amber-950/20 dark:to-card dark:border-amber-900/50 p-4 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 dark:text-amber-400">
                <Clock className="h-3.5 w-3.5" /> Solde Avances
              </span>
              <Badge variant="outline" className="text-[10px] border-amber-300 bg-amber-100/50 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                Réservations
              </Badge>
            </div>
            <p className="mt-2 text-2xl font-black text-amber-700 dark:text-amber-300 tabular-nums">
              {formatCurrency(summary?.totalAvances ?? 0)}
            </p>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground leading-tight">
            Acomptes perçus pour articles réservés en stock magasin.
          </p>
        </div>

        {/* 4. Solde Non Livrés */}
        <div className="rounded-2xl border border-indigo-200/80 bg-gradient-to-b from-indigo-50/50 to-white dark:from-indigo-950/20 dark:to-card dark:border-indigo-900/50 p-4 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1 text-xs font-bold text-indigo-700 dark:text-indigo-400">
                <Truck className="h-3.5 w-3.5" /> Solde Non Livrés
              </span>
              <Badge variant="outline" className="text-[10px] border-indigo-300 bg-indigo-100/50 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                En attente
              </Badge>
            </div>
            <p className="mt-2 text-2xl font-black text-indigo-700 dark:text-indigo-300 tabular-nums">
              {formatCurrency(summary?.totalNonLivre ?? 0)}
            </p>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground leading-tight">
            Montants encaissés pour produits en attente de livraison fournisseur.
          </p>
        </div>

        {/* 5. Valeur Totale du Stock */}
        <div className="rounded-2xl border bg-card p-4 shadow-sm flex flex-col justify-between lg:col-span-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Package className="h-4 w-4" />
              </div>
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Valeur du Stock Physique</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">{summary?.totalProducts ?? 0}</span> articles
              {(summary?.alertCount ?? 0) > 0 && (
                <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                  {summary?.alertCount} alerte{(summary?.alertCount ?? 0) > 1 ? 's' : ''}
                </Badge>
              )}
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <p className="text-xl font-black tabular-nums text-foreground">
              {formatCurrency(summary?.valeurTotaleStock ?? 0)}
            </p>
            <span className="text-xs text-muted-foreground">Valorisation au prix d'achat de base</span>
          </div>
        </div>
      </div>

      {/* Barre de Filtres & Export */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
        {/* Onglets Filtres */}
        {(() => {
          const countNonLivres = transactions.filter(t => {
            const desc = t.description || ''
            const isLivraison = t.category === 'LIVRAISON' || /livraison\s*effectu/i.test(desc)
            return !isLivraison && (t.category === 'NON_LIVRE' || /non\s*livr|attente\s*de\s*livraison/i.test(desc))
          }).length

          const countAvances = transactions.filter(t => {
            const desc = t.description || ''
            const isLivraison = t.category === 'LIVRAISON' || /livraison\s*effectu/i.test(desc)
            const isNonLivre = !isLivraison && (t.category === 'NON_LIVRE' || /non\s*livr|attente\s*de\s*livraison/i.test(desc))
            return !isLivraison && !isNonLivre && (t.category === 'AVANCE' || (/avance/i.test(desc) && !/avance\s*initiale/i.test(desc)))
          }).length

          const countDirect = transactions.filter(t => {
            const desc = t.description || ''
            const isLivraison = t.category === 'LIVRAISON' || /livraison\s*effectu/i.test(desc)
            const isNonLivre = !isLivraison && (t.category === 'NON_LIVRE' || /non\s*livr|attente\s*de\s*livraison/i.test(desc))
            const isAvance = !isLivraison && !isNonLivre && (t.category === 'AVANCE' || (/avance/i.test(desc) && !/avance\s*initiale/i.test(desc)))
            return t.type === 'ENTREE' && !isNonLivre && !isAvance && !desc.toLowerCase().startsWith('remise')
          }).length

          return (
            <div className="flex items-center gap-1.5 p-1 bg-muted/50 rounded-xl border flex-wrap">
              <button
                type="button"
                onClick={() => setFilterMode('ALL')}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5',
                  filterMode === 'ALL'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Layers className="h-3.5 w-3.5" /> Tous ({transactions.length})
              </button>

              <button
                type="button"
                onClick={() => setFilterMode('DIRECT')}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5',
                  filterMode === 'DIRECT'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
                )}
              >
                <ShoppingCart className="h-3.5 w-3.5" /> Ventes directes ({countDirect})
              </button>

              <button
                type="button"
                onClick={() => setFilterMode('AVANCES')}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5',
                  filterMode === 'AVANCES'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30'
                )}
              >
                <Clock className="h-3.5 w-3.5" /> Avances ({countAvances})
              </button>

              <button
                type="button"
                onClick={() => setFilterMode('NON_LIVRES')}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5',
                  filterMode === 'NON_LIVRES'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-indigo-700 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30'
                )}
              >
                <Truck className="h-3.5 w-3.5" /> Non livrés ({countNonLivres})
              </button>
            </div>
          )
        })()}

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExportPDF} disabled={!transactions.length} className="text-xs font-medium">
            <FileDown className="mr-1.5 h-3.5 w-3.5" /> Export PDF
          </Button>
        </div>
      </div>

      {/* Tableau du Journal de Caisse */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            Journal des flux du jour
            {filterMode === 'DIRECT' && <Badge variant="outline" className="text-emerald-700 border-emerald-300">Ventes directes uniquement</Badge>}
            {filterMode === 'AVANCES' && <Badge variant="outline" className="text-amber-700 border-amber-300">Avances uniquement</Badge>}
            {filterMode === 'NON_LIVRES' && <Badge variant="outline" className="text-indigo-700 border-indigo-300">Non livrés uniquement</Badge>}
          </h3>
          <span className="text-[11px] text-muted-foreground hidden sm:inline">
            🔒 Suppression sécurisée par mot de passe propriétaire
          </span>
        </div>

        {(() => {
          const filteredTx = transactions.filter(t => {
            const desc = t.description || ''
            const isLivraison = t.category === 'LIVRAISON' || /livraison\s*effectu/i.test(desc)
            const isNonLivre = !isLivraison && (t.category === 'NON_LIVRE' || /non\s*livr|attente\s*de\s*livraison/i.test(desc))
            const isAvance = !isLivraison && !isNonLivre && (t.category === 'AVANCE' || (/avance/i.test(desc) && !/avance\s*initiale/i.test(desc)))
            const isDirect = t.type === 'ENTREE' && !isNonLivre && !isAvance && !desc.toLowerCase().startsWith('remise')

            if (filterMode === 'DIRECT') return isDirect || isLivraison
            if (filterMode === 'AVANCES') return isAvance
            if (filterMode === 'NON_LIVRES') return isNonLivre
            return true
          })

          if (filteredTx.length === 0) return (
            <div className="py-12 text-center rounded-2xl border border-dashed bg-muted/20">
              <p className="text-sm font-medium text-muted-foreground">
                {isLoading ? 'Chargement des flux...' : 'Aucune transaction ne correspond à ce filtre pour aujourd\'hui'}
              </p>
            </div>
          )

          return (
            <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/40 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    <th className="px-4 py-3 text-left">Heure</th>
                    <th className="px-4 py-3 text-left">Type & Statut</th>
                    <th className="px-4 py-3 text-left">Libellé / Désignation</th>
                    <th className="px-4 py-3 text-right">Qté</th>
                    <th className="px-4 py-3 text-right">Montant</th>
                    <th className="px-4 py-3 text-left">Paiement</th>
                    <th className="px-4 py-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-sm">
                  {filteredTx.map((t) => {
                    const isEntree = t.type === 'ENTREE'
                    const desc = t.description || ''
                    const isLivraison = t.category === 'LIVRAISON' || /livraison\s*effectu/i.test(desc)
                    const isNonLivre = !isLivraison && (t.category === 'NON_LIVRE' || /non\s*livr|attente\s*de\s*livraison/i.test(desc))
                    const isAvance = !isLivraison && !isNonLivre && (t.category === 'AVANCE' || (/avance/i.test(desc) && !/avance\s*initiale/i.test(desc)))
                    const isRemise = desc.toLowerCase().startsWith('remise')
                    const firstLine = t.lines?.[0]

                    return (
                      <tr
                        key={t.id}
                        className={cn(
                          'group transition-colors',
                          isLivraison
                            ? 'bg-emerald-50/30 hover:bg-emerald-50/60 dark:bg-emerald-950/15 dark:hover:bg-emerald-950/30'
                            : isNonLivre
                            ? 'bg-indigo-50/40 hover:bg-indigo-50/80 dark:bg-indigo-950/15 dark:hover:bg-indigo-950/30'
                            : isAvance
                            ? 'bg-amber-50/40 hover:bg-amber-50/80 dark:bg-amber-950/15 dark:hover:bg-amber-950/30'
                            : 'hover:bg-muted/30'
                        )}
                      >
                        <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap font-medium">
                          {new Date(t.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        </td>

                        <td className="px-4 py-3">
                          {isLivraison ? (
                            <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                              <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Livré & Encaissé
                            </span>
                          ) : isNonLivre ? (
                            <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                              <Truck className="h-3 w-3" /> Non livré
                            </span>
                          ) : isAvance ? (
                            <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                              <Clock className="h-3 w-3" /> Avance
                            </span>
                          ) : isRemise ? (
                            <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300">
                              <Percent className="h-3 w-3" /> Remise
                            </span>
                          ) : isEntree ? (
                            <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                              <ArrowUpRight className="h-3 w-3" /> Vente directe
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
                              <ArrowDownRight className="h-3 w-3" /> Sortie
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-3">
                          <p className="font-medium text-foreground text-sm">
                            {firstLine?.product?.name ?? t.description ?? 'Transaction'}
                          </p>
                          {t.description && firstLine?.product && (
                            <p className="text-xs text-muted-foreground mt-0.5">{t.description}</p>
                          )}
                        </td>

                        <td className="px-4 py-3 text-right text-sm">
                          {firstLine ? (
                            <span className="font-semibold text-foreground">{firstLine.quantity}</span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>

                        <td className={cn(
                          'px-4 py-3 text-right text-sm font-black tabular-nums whitespace-nowrap',
                          isEntree ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                        )}>
                          {isEntree ? '+' : '-'}{formatCurrency(t.totalAmount)}
                        </td>

                        <td className="px-4 py-3">
                          <Badge variant="outline" className="text-[10px] font-medium">
                            {PAYMENT_OPTIONS.find(p => p.value === t.paymentMethod)?.label ?? t.paymentMethod}
                          </Badge>
                        </td>

                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => {
                              setDeleteModalTx(t)
                              setOwnerPassword('')
                              setDeleteError(null)
                            }}
                            className="rounded-lg p-1.5 text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-all"
                            title="Supprimer (Mot de passe propriétaire requis)"
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
          )
        })()}
      </div>

      {/* Bottom Sheet / Panel */}
      {panel === 'form' && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm" onClick={() => setPanel('closed')}>
          <div
            className="w-full max-w-lg animate-slide-up rounded-t-2xl border bg-card p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            style={{ maxHeight: '85vh', overflowY: 'auto' }}
          >
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-base font-semibold">
                {flowType === 'ENTREE' ? 'Nouvel encaissement' : 'Nouveau décaissement'}
              </h3>
              <button onClick={() => setPanel('closed')} className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Sélecteur de type */}
              <div className="flex rounded-xl border bg-muted/30 p-1">
                <button
                  type="button"
                  onClick={() => setFlowType('ENTREE')}
                  className={cn(
                    'flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-all',
                    flowType === 'ENTREE' ? 'bg-emerald-500 text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <ShoppingCart className="mr-1.5 inline h-4 w-4" /> Encaissement
                </button>
                <button
                  type="button"
                  onClick={() => setFlowType('SORTIE')}
                  className={cn(
                    'flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-all',
                    flowType === 'SORTIE' ? 'bg-red-500 text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <ShoppingBag className="mr-1.5 inline h-4 w-4" /> Décaissement
                </button>
              </div>

              {/* Recherche produit */}
              <div className="space-y-2">
                <Label>Produit</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    ref={searchRef}
                    placeholder="Rechercher ou scanner un produit..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="pl-9"
                  />
                  <Barcode className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                </div>
                {productSearch && filteredProducts.length > 0 && (
                  <div className="max-h-40 overflow-y-auto rounded-lg border bg-background shadow-sm">
                    {filteredProducts.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => { setSelectedProduct(p); setProductSearch('') }}
                        className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-accent"
                      >
                        <span>{p.name}</span>
                        <span className="text-xs text-muted-foreground">{p.barcode}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Produit sélectionné */}
              {selectedProduct && (
                <div className="rounded-xl border bg-muted/20 p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold">{selectedProduct.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {flowType === 'ENTREE'
                          ? `Prix vente: ${formatCurrency(selectedProduct.sellingPrice)}`
                          : `Prix achat: ${formatCurrency(selectedProduct.basePrice)}`
                        }
                      </p>
                    </div>
                    <button type="button" onClick={() => setSelectedProduct(null)} className="rounded p-1 text-muted-foreground hover:bg-accent">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-3">
                    <QuantitySelector
                      currentStock={stockForProduct}
                      unitPrice={flowType === 'ENTREE' ? selectedProduct.sellingPrice : selectedProduct.basePrice}
                      type={flowType}
                      onChange={(qty) => setQuantity(qty)}
                    />
                  </div>
                </div>
              )}

              {/* Mode de paiement */}
              <div className="space-y-2">
                <Label>Mode de paiement</Label>
                <div className="grid grid-cols-2 gap-2">
                  {PAYMENT_OPTIONS.map((opt) => {
                    const Icon = opt.icon
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setPaymentMethod(opt.value)}
                        className={cn(
                          'flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm transition-all',
                          paymentMethod === opt.value
                            ? 'border-primary bg-primary/10 text-primary font-medium'
                            : 'border-input text-muted-foreground hover:bg-accent'
                        )}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        <span>{opt.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label>Description (optionnelle)</Label>
                <Input
                  placeholder={flowType === 'ENTREE' ? 'Ex: Vente au détail' : 'Ex: Achat fournisseur'}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setPanel('closed')}>
                  Annuler
                </Button>
                <Button
                  type="submit"
                  className={cn('flex-1', flowType === 'ENTREE' ? 'bg-emerald-600 hover:bg-emerald-700' : '')}
                  variant={flowType === 'SORTIE' ? 'destructive' : 'default'}
                  disabled={!selectedProduct || saving}
                >
                  {saving ? 'Enregistrement...' : flowType === 'ENTREE' ? 'Encaisser' : 'Décaisser'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Ouverture Session */}
      {showOpenSessionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-background rounded-2xl border p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600">
                  <Unlock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base">Ouverture de session de caisse</h3>
                  <p className="text-xs text-muted-foreground">Saisissez le fond de caisse initial en espèces</p>
                </div>
              </div>
              <button onClick={() => setShowOpenSessionModal(false)} className="rounded-lg p-1.5 hover:bg-accent text-muted-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleOpenSession} className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Fond de caisse initial (Espèces FCFA)</Label>
                <Input
                  type="number"
                  min="0"
                  step="100"
                  required
                  autoFocus
                  placeholder="Ex: 50000"
                  value={openingAmountInput}
                  onChange={(e) => setOpeningAmountInput(e.target.value)}
                  className="text-lg font-bold"
                />
              </div>

              <div className="space-y-2">
                <Label>Notes / Observation (optionnel)</Label>
                <Input
                  placeholder="Ex: Billet de 10k x5"
                  value={sessionNotesInput}
                  onChange={(e) => setSessionNotesInput(e.target.value)}
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setShowOpenSessionModal(false)}>
                  Annuler
                </Button>
                <Button type="submit" disabled={sessionLoading} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">
                  {sessionLoading ? 'Ouverture...' : 'Confirmer l\'ouverture'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Clôture Session (Z de caisse) */}
      {showCloseSessionModal && currentSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-background rounded-2xl border p-6 w-full max-w-lg shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base">Clôture de Caisse (Z-Report)</h3>
                  <p className="text-xs text-muted-foreground">Bilan de fin de journée et comptage des espèces</p>
                </div>
              </div>
              <button onClick={() => setShowCloseSessionModal(false)} className="rounded-lg p-1.5 hover:bg-accent text-muted-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Récapitulatif théorique */}
            <div className="bg-muted/40 rounded-xl p-3.5 space-y-2 text-xs">
              <div className="flex justify-between text-muted-foreground">
                <span>Fond de caisse initial :</span>
                <span className="font-semibold text-foreground">{formatCurrency(currentSession.openingAmount)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Total Entrées Espèces (Ventes + versements) :</span>
                <span className="font-semibold text-emerald-600">+{formatCurrency(summary?.totalEntrees ?? 0)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Total Sorties Espèces (Achats + dépenses) :</span>
                <span className="font-semibold text-rose-600">-{formatCurrency(summary?.totalSorties ?? 0)}</span>
              </div>
              <div className="border-t pt-2 flex justify-between font-bold text-sm">
                <span>Solde Théorique Attendu :</span>
                <span className="text-primary">{formatCurrency(currentSession.openingAmount + (summary?.soldeDuJour ?? 0))}</span>
              </div>
            </div>

            <form onSubmit={handleCloseSession} className="space-y-4 pt-1">
              <div className="space-y-2">
                <Label>Montant réel compté en caisse (Espèces FCFA)</Label>
                <Input
                  type="number"
                  min="0"
                  step="100"
                  required
                  autoFocus
                  placeholder="Ex: 145000"
                  value={closingAmountActualInput}
                  onChange={(e) => setClosingAmountActualInput(e.target.value)}
                  className="text-lg font-bold"
                />
              </div>

              {/* Live difference preview */}
              {closingAmountActualInput !== '' && (
                (function () {
                  const expected = currentSession.openingAmount + (summary?.soldeDuJour ?? 0)
                  const actual = parseFloat(closingAmountActualInput) || 0
                  const diff = actual - expected
                  return (
                    <div className={cn(
                      'p-3 rounded-xl border flex items-center justify-between text-xs',
                      diff === 0 ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                        : diff > 0 ? 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300'
                        : 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300'
                    )}>
                      <div className="flex items-center gap-2">
                        {diff === 0 ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                        <span className="font-medium">
                          {diff === 0 ? 'Caisse parfaite (Aucun écart)' : diff > 0 ? 'Excédent de caisse' : 'Manquant de caisse (Déficit)'}
                        </span>
                      </div>
                      <span className="font-bold text-sm">
                        {diff >= 0 ? `+${formatCurrency(diff)}` : formatCurrency(diff)}
                      </span>
                    </div>
                  )
                })()
              )}

              <div className="space-y-2">
                <Label>Remarques / Justification éventuelle</Label>
                <Input
                  placeholder="Ex: Monnaie non rendue 500f, etc."
                  value={sessionNotesInput}
                  onChange={(e) => setSessionNotesInput(e.target.value)}
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setShowCloseSessionModal(false)}>
                  Annuler
                </Button>
                <Button type="submit" disabled={sessionLoading} className="flex-1 bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 font-semibold">
                  {sessionLoading ? 'Clôture en cours...' : 'Valider la clôture (Z)'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Sécurité : Mot de passe Propriétaire pour supprimer */}
      {deleteModalTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-background rounded-2xl border p-6 w-full max-w-md shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-destructive/10 text-destructive">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-foreground">Autorisation Propriétaire Requise</h3>
                <p className="text-xs text-muted-foreground">Sécurité du cahier de caisse</p>
              </div>
            </div>

            <div className="rounded-xl border bg-muted/40 p-3 space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Écriture :</span>
                <strong className="text-foreground">{deleteModalTx.description || 'Transaction'}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Montant :</span>
                <strong className={deleteModalTx.type === 'ENTREE' ? 'text-emerald-600' : 'text-destructive'}>
                  {deleteModalTx.type === 'ENTREE' ? '+' : '-'}{formatCurrency(deleteModalTx.totalAmount)}
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Date :</span>
                <span>{new Date(deleteModalTx.createdAt).toLocaleString('fr-FR')}</span>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              Pour supprimer définitivement cette écriture du journal de caisse, veuillez saisir le mot de passe du <strong>Propriétaire / Administrateur</strong> :
            </p>

            <form
              onSubmit={async (e) => {
                e.preventDefault()
                if (!ownerPassword.trim()) return
                setDeletingTx(true)
                setDeleteError(null)
                try {
                  const isAuthorized = await window.api.auth.verifyOwnerPassword(ownerPassword)
                  if (!isAuthorized) {
                    setDeleteError('Mot de passe propriétaire incorrect. Suppression refusée.')
                    setDeletingTx(false)
                    return
                  }
                  await deleteTransaction(deleteModalTx.id, wid)
                  feedback.toast.success('Écriture de caisse supprimée')
                  setDeleteModalTx(null)
                } catch (err: any) {
                  setDeleteError(err?.message || 'Erreur lors de la suppression')
                } finally {
                  setDeletingTx(false)
                }
              }}
              className="space-y-3"
            >
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Mot de passe Propriétaire *</Label>
                <Input
                  type="password"
                  placeholder="Saisissez votre mot de passe"
                  value={ownerPassword}
                  onChange={(e) => setOwnerPassword(e.target.value)}
                  autoFocus
                  required
                />
              </div>

              {deleteError && (
                <div className="rounded-lg bg-destructive/10 p-2 text-xs text-destructive flex items-center gap-1.5 font-medium">
                  <AlertCircle className="h-4 w-4 shrink-0" /> {deleteError}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setDeleteModalTx(null)}
                  disabled={deletingTx}
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  variant="destructive"
                  className="flex-1 font-semibold"
                  disabled={!ownerPassword.trim() || deletingTx}
                >
                  {deletingTx ? 'Vérification...' : 'Supprimer l\'écriture'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Styles pour l'animation slide-up */}
      <style>{`
        @keyframes slide-up {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-slide-up { animation: slide-up 0.25s ease-out; }
      `}</style>

      <DeviceCheckModal
        open={showDeviceModal}
        onClose={() => setShowDeviceModal(false)}
        device="scanner"
        onTest={testScanner}
      />

      {/* Modal Historique des Sessions et Clôtures Z */}
      <Dialog open={showHistoryModal} onOpenChange={setShowHistoryModal}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              <History className="h-5 w-5 text-primary" />
              Historique des Sessions & Clôtures Z ({selectedName || 'Boutique Principale'})
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 my-2 text-xs">
            {sessionHistory.length === 0 ? (
              <div className="py-12 text-center rounded-xl border border-dashed text-muted-foreground">
                <Lock className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p className="font-semibold text-sm">Aucune clôture Z enregistrée</p>
                <p className="text-xs">Les rapports de clôture de caisse apparaîtront ici au fur et à mesure.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-muted/50 border-b text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      <th className="py-2.5 px-3">Ouverture</th>
                      <th className="py-2.5 px-3">Clôture (Z)</th>
                      <th className="py-2.5 px-3 text-center">Statut</th>
                      <th className="py-2.5 px-3 text-right">Fond Initial</th>
                      <th className="py-2.5 px-3 text-right">Attendu (Théorique)</th>
                      <th className="py-2.5 px-3 text-right">Compté (Réel)</th>
                      <th className="py-2.5 px-3 text-right">Écart</th>
                      <th className="py-2.5 px-3">Agent</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y text-xs">
                    {sessionHistory.map((sess) => {
                      const isClosed = sess.status === 'CLOTUREE'
                      const diff = sess.difference ?? 0
                      return (
                        <tr key={sess.id} className="hover:bg-muted/30 transition-colors">
                          <td className="py-2.5 px-3 font-mono text-muted-foreground">
                            {new Date(sess.openedAt).toLocaleString('fr-FR', {
                              day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit'
                            })}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-muted-foreground">
                            {sess.closedAt
                              ? new Date(sess.closedAt).toLocaleString('fr-FR', {
                                  day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit'
                                })
                              : 'En cours...'}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <Badge variant={isClosed ? 'secondary' : 'default'} className={cn(
                              'text-[10px] px-2 py-0.5',
                              isClosed ? 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-200' : 'bg-emerald-600 text-white'
                            )}>
                              {isClosed ? 'Clôturée' : 'Active'}
                            </Badge>
                          </td>
                          <td className="py-2.5 px-3 text-right font-medium">
                            {formatCurrency(sess.openingAmount)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-semibold text-foreground">
                            {sess.closingAmountExpected != null ? formatCurrency(sess.closingAmountExpected) : '—'}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-foreground">
                            {sess.closingAmountActual != null ? formatCurrency(sess.closingAmountActual) : '—'}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold">
                            {isClosed ? (
                              <span className={cn(
                                'inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[11px]',
                                diff === 0 ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40' : diff > 0 ? 'text-blue-600 bg-blue-50 dark:bg-blue-950/40' : 'text-rose-600 bg-rose-50 dark:bg-rose-950/40'
                              )}>
                                {diff >= 0 ? `+${formatCurrency(diff)}` : formatCurrency(diff)}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-muted-foreground truncate max-w-[120px]">
                            {sess.user ? `${sess.user.prenom} ${sess.user.nom}` : 'Système'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default CahierCaisse

