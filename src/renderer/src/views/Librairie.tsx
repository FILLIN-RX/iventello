import { useState, useEffect, useMemo, useRef } from 'react'
import {
  Book, BookOpen, GraduationCap, Baby, Shapes, Calculator, Languages, FlaskConical,
  Plus, Pencil, Trash2, Search, X, Package, PackageSearch, ShoppingCart, AlertTriangle, ArrowLeft,
  RefreshCw, UserSearch, CheckCircle2, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  Sparkles, BookMarked, Check, LayoutGrid, List
} from 'lucide-react'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Badge } from '../components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '../components/ui/dialog'
import { useEntrepotStore } from '../stores/entrepotStore'
import { useNotifications } from '../stores/notificationStore'
import { feedback } from '../stores/feedbackStore'
import { useNavigate } from '../hooks/useNavigate'
import { formatCurrency } from '@/lib/utils'
import type {
  ClassLevel, Subject, BookWithRelations, BookStockInfo,
  BookSaleWithItems, BookSaleItem, Warehouse
} from '../../../shared/types'

const iconMap: Record<string, React.FC<{ className?: string }>> = {
  Book, BookOpen, GraduationCap, Baby, Shapes, Calculator, Languages, FlaskConical
}

const cycleColors: Record<string, string> = {
  MATERNELLE: 'bg-pink-100 text-pink-700 border-pink-200 dark:bg-pink-950/40 dark:text-pink-300 dark:border-pink-800',
  PRIMAIRE: 'bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800',
  SECONDAIRE_1: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
  SECONDAIRE_2: 'bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-800',
}

function Librairie() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [system, setSystem] = useState<'FRANCOPHONE' | 'ANGLOPHONE'>('FRANCOPHONE')
  const [selectedCycle, setSelectedCycle] = useState<string | null>(null)
  const [classLevels, setClassLevels] = useState<ClassLevel[]>([])
  const [selectedClassLevel, setSelectedClassLevel] = useState<ClassLevel | null>(null)
  const [books, setBooks] = useState<BookWithRelations[]>([])
  const [bookSales, setBookSales] = useState<BookSaleWithItems[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'livres' | 'ventes'>('livres')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [programFilter, setProgramFilter] = useState<'all' | 'official' | 'extra'>('all')
  const [seedingCurriculum, setSeedingCurriculum] = useState(false)

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(18)

  // Restock modal
  const [restockBook, setRestockBook] = useState<BookWithRelations | null>(null)
  const [restockQty, setRestockQty] = useState(1)
  const [restockPrice, setRestockPrice] = useState(0)
  const [restockEditor, setRestockEditor] = useState('')
  const [restockSaving, setRestockSaving] = useState(false)

  // Student search
  const [studentQuery, setStudentQuery] = useState('')
  const [studentResults, setStudentResults] = useState<BookSaleWithItems[]>([])
  const [studentSearching, setStudentSearching] = useState(false)

  const warehouseId = useEntrepotStore((s) => s.selectedId)
  const warehouseName = useEntrepotStore((s) => s.selectedName)
  const navigate = useNavigate()

  const isMountedRef = useRef(true)

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  useEffect(() => {
    setSelectedClassLevel(null)
    setSelectedCycle(null)
    loadClassLevels()
  }, [system])

  async function loadClassLevels() {
    try {
      if (isMountedRef.current) setLoading(true)
      const levels = await window.api.getClassLevels(system)
      if (isMountedRef.current) setClassLevels(levels)
    } catch { /* ignore */ } finally {
      if (isMountedRef.current) setLoading(false)
    }
  }

  useEffect(() => {
    if (selectedClassLevel) {
      loadBooks()
      setCurrentPage(1)
    }
  }, [selectedClassLevel])

  async function loadBooks() {
    try {
      if (isMountedRef.current) setLoading(true)
      const data = await window.api.getBooks(selectedClassLevel!.id)
      if (isMountedRef.current) setBooks(data)
    } catch { /* ignore */ } finally {
      if (isMountedRef.current) setLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'ventes' && warehouseId) loadSales()
  }, [activeTab, warehouseId])

  async function loadSales() {
    try {
      const sales = await window.api.getBookSales(warehouseId!)
      if (isMountedRef.current) setBookSales(sales)
    } catch { /* ignore */ }
  }

  // Remonter en haut de page à chaque changement de page
  useEffect(() => {
    const mainEl = containerRef.current?.closest('main')
    if (mainEl) {
      mainEl.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [currentPage])

  useEffect(() => {
    setCurrentPage(1)
  }, [search, programFilter])

  async function handleSeedCurriculum() {
    try {
      setSeedingCurriculum(true)
      const res = await window.api.seedOfficialCurriculum(warehouseId ?? undefined)
      useNotifications.getState().addNotification({
        type: 'info',
        title: 'Manuels Scolaires Officiels',
        description: `${res.count} manuels scolaires officiels (Cameroun) synchronisés.`,
        warehouseId: warehouseId ?? undefined,
        warehouseName: warehouseName ?? undefined
      })
      if (selectedClassLevel) {
        await loadBooks()
      }
      feedback.toast.success('Synchronisation terminée', `${res.count} manuels officiels synchronisés.`)
    } catch (e: any) {
      feedback.toast.error(e?.message || 'Erreur lors de la synchronisation des manuels', 'Erreur')
    } finally {
      setSeedingCurriculum(false)
    }
  }

  const filteredBooks = useMemo(() => {
    let list = books
    if (programFilter === 'official') {
      list = list.filter((b) => b.isOfficialProgram !== false)
    } else if (programFilter === 'extra') {
      list = list.filter((b) => b.isOfficialProgram === false)
    }
    if (!search.trim()) return list
    const q = search.toLowerCase()
    return list.filter(
      (b) =>
        b.title.toLowerCase().includes(q) ||
        (b.author?.toLowerCase().includes(q) ?? false) ||
        (b.editor?.toLowerCase().includes(q) ?? false)
    )
  }, [books, search, programFilter])

  const totalPages = Math.max(1, Math.ceil(filteredBooks.length / pageSize))
  const paginatedBooks = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredBooks.slice(start, start + pageSize)
  }, [filteredBooks, currentPage, pageSize])

  const cycles = useMemo(() => [...new Set(classLevels.map((c) => c.cycle))], [classLevels])

  const levelsForCycle = useMemo(() => {
    if (!selectedCycle) return classLevels
    return classLevels.filter((c) => c.cycle === selectedCycle)
  }, [classLevels, selectedCycle])

  function getStock(book: BookWithRelations): BookStockInfo | undefined {
    if (!warehouseId) return undefined
    return book.stocks?.find((s) => s.warehouseId === warehouseId)
  }

  function handleDeleteBook(book: BookWithRelations) {
    feedback.confirm({
      title: 'Supprimer ce manuel scolaire ?',
      message: 'Le livre et ses stocks associés seront supprimés de la librairie.',
      itemName: book.title,
      confirmLabel: 'Supprimer le livre',
      variant: 'destructive',
      onConfirm: async () => {
        try {
          await window.api.deleteBook(book.id)
          feedback.toast.success(`Livre "${book.title}" supprimé`)
          useNotifications.getState().addNotification({
            type: 'info',
            title: 'Livre supprimé',
            description: `"${book.title}" a été supprimé.`,
            warehouseId: warehouseId ?? undefined,
            warehouseName: warehouseName ?? undefined
          })
          loadBooks()
        } catch (err: any) {
          feedback.toast.error(err?.message || 'Erreur lors de la suppression')
        }
      }
    })
  }

  async function handleRestock() {
    if (!restockBook || !warehouseId) return
    try {
      setRestockSaving(true)
      await window.api.restockBook({
        bookId: restockBook.id,
        warehouseId,
        quantity: restockQty,
        purchasePrice: restockPrice > 0 ? restockPrice : undefined,
        editor: restockEditor || undefined
      })
      feedback.toast.success('Stock mis à jour', `+${restockQty} exemplaire(s) pour "${restockBook.title}"`)
      setRestockBook(null)
      setRestockQty(1)
      setRestockPrice(0)
      setRestockEditor('')
      loadBooks()
      useNotifications.getState().addNotification({
        type: 'info',
        title: 'Stock ajouté',
        description: `${restockQty} exemplaire${restockQty > 1 ? 's' : ''} de "${restockBook.title}" ajouté${restockQty > 1 ? 's' : ''}`,
        warehouseId: warehouseId ?? undefined,
        warehouseName: warehouseName ?? undefined,
        meta: {}
      })
    } catch (err: any) {
      feedback.toast.error(err?.message || 'Erreur réapprovisionnement', 'Erreur')
    } finally { setRestockSaving(false) }
  }

  async function handleStudentSearch() {
    if (!studentQuery.trim() || !warehouseId) return
    try {
      setStudentSearching(true)
      const results = await window.api.searchStudents(studentQuery.trim(), warehouseId)
      setStudentResults(results)
    } catch { /* ignore */ } finally { setStudentSearching(false) }
  }

  const studentSummaries = useMemo(() => {
    const grouped = new Map<string, BookSaleWithItems[]>()
    for (const s of studentResults) {
      const key = s.studentName ?? '?'
      if (!grouped.has(key)) grouped.set(key, [])
      grouped.get(key)!.push(s)
    }
    return Array.from(grouped.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  }, [studentResults])

  useEffect(() => {
    if (restockBook?.purchasePrice) setRestockPrice(restockBook.purchasePrice)
    else setRestockPrice(0)
  }, [restockBook])

  function handleGoToCaisse() {
    navigate('caisse', warehouseId ?? undefined, warehouseName ?? undefined)
  }

  function renderIcon(iconName: string, className?: string) {
    const Icon = iconMap[iconName]
    if (!Icon) return <Book className={className} />
    return <Icon className={className} />
  }

  if (!warehouseId) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-muted-foreground">Sélectionnez un point de vente pour accéder à la librairie.</p>
      </div>
    )
  }

  const startIndex = (currentPage - 1) * pageSize + 1
  const endIndex = Math.min(currentPage * pageSize, filteredBooks.length)

  return (
    <div ref={containerRef} className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Librairie & Manuels Scolaires</h1>
          <p className="text-sm text-muted-foreground">
            Gestion des manuels scolaires au programme officiel (Cameroun) et fournitures par classe
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSeedCurriculum}
            disabled={seedingCurriculum}
            className="border-primary/40 hover:bg-primary/10 gap-1.5 text-primary"
            title="Charger les manuels scolaires officiels du Cameroun (MINEDUB/MINESEC)"
          >
            <Sparkles className="h-4 w-4 text-amber-500" />
            {seedingCurriculum ? 'Synchronisation...' : 'Manuels Officiels Cameroun'}
          </Button>

          {selectedClassLevel && (
            <Button size="sm" onClick={() => {
              useEntrepotStore.getState().setBookFormContext(undefined, selectedClassLevel.id)
              navigate('book-form')
            }}>
              <Plus className="mr-1.5 h-4 w-4" />Nouveau livre
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handleGoToCaisse}>
            <ShoppingCart className="mr-1.5 h-4 w-4" />Vendre
          </Button>
        </div>
      </div>

      {/* Student search */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <UserSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher un élève..."
            value={studentQuery}
            onChange={(e) => setStudentQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleStudentSearch() }}
            className="pl-9 h-10"
          />
        </div>
        <Button size="sm" variant="secondary" onClick={handleStudentSearch} disabled={studentSearching}>
          <UserSearch className="mr-1.5 h-4 w-4" />Chercher
        </Button>
      </div>

      {studentResults.length > 0 && (
        <Card className="border-primary/30">
          <CardContent className="p-4 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Résultats — {studentSummaries.length} élève{studentSummaries.length !== 1 ? 's' : ''}
            </p>
            {studentSummaries.map(([name, sales]) => {
              const total = sales.reduce((s, sale) => s + sale.totalAmount, 0)
              const classes = [...new Set(sales.map(s => s.classLevel?.name).filter(Boolean))]
              return (
                <div key={name} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="font-medium text-sm">{name}</p>
                    <p className="text-xs text-muted-foreground">{classes.join(', ')} — {sales.length} achat{sales.length > 1 ? 's' : ''}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{formatCurrency(total)}</span>
                    <Button size="sm" variant="outline" className="h-8 text-xs"
                      onClick={async () => {
                        if (!warehouseId || !selectedClassLevel?.id) return
                        const summary = await window.api.getStudentSummary(name, selectedClassLevel.id, warehouseId)
                        useEntrepotStore.getState().setStudentSummary(summary)
                        navigate('student-total')
                      }}
                      disabled={!selectedClassLevel}
                    >
                      <CheckCircle2 className="mr-1 h-3 w-3" />Fiche
                    </Button>
                  </div>
                </div>
              )
            })}
            <Button variant="ghost" size="sm" className="text-xs" onClick={() => { setStudentResults([]); setStudentQuery('') }}>
              <X className="mr-1 h-3 w-3" />Fermer
            </Button>
          </CardContent>
        </Card>
      )}

      {/* System selector */}
      <div className="inline-flex rounded-lg border p-1 bg-muted/50">
        <button
          onClick={() => setSystem('FRANCOPHONE')}
          className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
            system === 'FRANCOPHONE' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          FRANCOPHONE
        </button>
        <button
          onClick={() => setSystem('ANGLOPHONE')}
          className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
            system === 'ANGLOPHONE' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          ANGLOPHONE
        </button>
      </div>

      {/* Cycle tabs */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedCycle(null)}
          className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors border ${
            !selectedCycle
              ? 'bg-foreground text-background border-foreground'
              : 'bg-background text-muted-foreground border-border hover:border-foreground/30'
          }`}
        >
          Tous les cycles
        </button>
        {cycles.map((cycle) => (
          <button
            key={cycle}
            onClick={() => setSelectedCycle(cycle)}
            className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors border ${
              selectedCycle === cycle
                ? 'bg-foreground text-background border-foreground'
                : `${cycleColors[cycle] ?? 'bg-background text-muted-foreground border-border'} hover:opacity-80`
            }`}
          >
            {cycle === 'SECONDAIRE_1' ? '1er Cycle Secondaire' : cycle === 'SECONDAIRE_2' ? '2ème Cycle Secondaire' : cycle.charAt(0) + cycle.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {/* Class levels grid */}
      {loading && !selectedClassLevel && (
        <p className="text-sm text-muted-foreground py-8 text-center">Chargement des classes...</p>
      )}

      {!loading && classLevels.length === 0 && (
        <p className="text-sm text-muted-foreground py-8 text-center">Aucune classe trouvée pour ce système.</p>
      )}

      {classLevels.length > 0 && !selectedClassLevel && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {levelsForCycle.map((level) => (
            <button
              key={level.id}
              onClick={() => setSelectedClassLevel(level)}
              className="group flex flex-col items-center justify-center gap-2 rounded-xl border p-4 transition-all hover:shadow-md hover:-translate-y-0.5"
              style={{ backgroundColor: level.color + '15', borderColor: level.color + '40' }}
            >
              <div
                className="flex h-10 w-10 items-center justify-center rounded-lg text-white"
                style={{ backgroundColor: level.color }}
              >
                {renderIcon(level.icon, 'h-5 w-5')}
              </div>
              <span className="text-center text-xs font-medium leading-tight">{level.name}</span>
              <span className="text-[10px] text-muted-foreground">{level.code}</span>
            </button>
          ))}
        </div>
      )}

      {/* Selected class level - books view */}
      {selectedClassLevel && (
        <>
          <div className="flex items-center gap-3 flex-wrap">
            <Button variant="ghost" size="sm" onClick={() => setSelectedClassLevel(null)}>
              <ArrowLeft className="mr-1 h-4 w-4" /> Retour aux classes
            </Button>
            <div
              className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium text-white"
              style={{ backgroundColor: selectedClassLevel.color }}
            >
              {renderIcon(selectedClassLevel.icon, 'h-4 w-4')}
              {selectedClassLevel.name}
            </div>

            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 ml-auto text-primary border-primary/30 hover:bg-primary/5 font-semibold text-xs h-8"
              onClick={() => useEntrepotStore.getState().setWorkspaceView('achats')}
            >
              <Package className="h-3.5 w-3.5" /> Approvisionnement Rapide (-20%)
            </Button>
          </div>

          {/* Total cost card */}
          {books.length > 0 && (
            <div className="rounded-lg border bg-gradient-to-r from-primary/5 to-primary/10 p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">
                  Coût total des livres pour un parent
                </p>
                <p className="text-2xl font-bold mt-1">
                  {formatCurrency(books.reduce((s, b) => s + b.price, 0))}
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-primary">
                  {books.length} livre{books.length !== 1 ? 's' : ''}
                </p>
                <p className="text-xs text-muted-foreground">enregistrés pour cette classe</p>
              </div>
            </div>
          )}

          {/* Search + Program Filter + Tabs */}
          <div className="flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Rechercher titre, auteur, éditeur..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 pr-8"
                />
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Filtre Au programme / Hors programme */}
              <div className="inline-flex rounded-lg border p-1 bg-muted/30">
                <button
                  onClick={() => setProgramFilter('all')}
                  className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                    programFilter === 'all' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'
                  }`}
                >
                  Tous ({books.length})
                </button>
                <button
                  onClick={() => setProgramFilter('official')}
                  className={`rounded-md px-3 py-1 text-xs font-medium transition-colors flex items-center gap-1 ${
                    programFilter === 'official' ? 'bg-emerald-500 text-white shadow-sm' : 'text-emerald-700 hover:text-emerald-900'
                  }`}
                >
                  <BookMarked className="h-3 w-3" />
                  Au programme
                </button>
                <button
                  onClick={() => setProgramFilter('extra')}
                  className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                    programFilter === 'extra' ? 'bg-amber-500 text-white shadow-sm' : 'text-amber-700 hover:text-amber-900'
                  }`}
                >
                  Hors programme
                </button>
              </div>

              <div className="flex items-center gap-1 rounded-lg border p-1 bg-muted/30">
                <button
                  onClick={() => setActiveTab('livres')}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    activeTab === 'livres' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'
                  }`}
                >
                  Livres
                </button>
                <button
                  onClick={() => { setActiveTab('ventes'); loadSales() }}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    activeTab === 'ventes' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'
                  }`}
                >
                  Ventes
                </button>
              </div>

              {/* Sélecteur Mode Grille / Mode Liste */}
              {activeTab === 'livres' && (
                <div className="flex items-center rounded-lg border p-1 bg-muted/30">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`rounded-md p-1.5 transition-colors ${
                      viewMode === 'grid'
                        ? 'bg-background shadow-sm text-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                    title="Affichage en grille"
                  >
                    <LayoutGrid className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`rounded-md p-1.5 transition-colors ${
                      viewMode === 'list'
                        ? 'bg-background shadow-sm text-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                    title="Affichage en liste"
                  >
                    <List className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Livres tab */}
          {activeTab === 'livres' && (
            <>
              {loading && <p className="text-sm text-muted-foreground py-8 text-center">Chargement des livres...</p>}

              {!loading && filteredBooks.length === 0 && (
                <div className="text-center py-12 border rounded-lg bg-card text-muted-foreground">
                  <Book className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  <p>{search ? 'Aucun livre ne correspond à votre recherche.' : 'Aucun livre pour cette sélection.'}</p>
                </div>
              )}

              {/* Mode Grille */}
              {!loading && filteredBooks.length > 0 && viewMode === 'grid' && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {paginatedBooks.map((book) => {
                    const stock = getStock(book)
                    const qty = stock?.quantity ?? 0
                    const alertLimit = stock?.alertLimit ?? 0
                    const isLow = qty <= alertLimit
                    const isOfficial = book.isOfficialProgram !== false

                    return (
                      <Card key={book.id} className="relative overflow-hidden flex flex-col justify-between hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 mb-1">
                                {isOfficial ? (
                                  <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-400 text-[9px] py-0 px-1.5">
                                    Au programme
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-amber-700 bg-amber-50 border-amber-300 dark:bg-amber-950/30 dark:text-amber-400 text-[9px] py-0 px-1.5">
                                    Hors programme
                                  </Badge>
                                )}
                              </div>
                              <p className="font-semibold text-sm leading-tight truncate" title={book.title}>{book.title}</p>
                              {book.author && (
                                <p className="mt-0.5 text-xs text-muted-foreground truncate">{book.author}</p>
                              )}
                              {book.editor && (
                                <p className="text-xs text-muted-foreground truncate">Éditeur : {book.editor}</p>
                              )}
                            </div>
                            <div className="flex shrink-0 gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => {
                                  useEntrepotStore.getState().setBookFormContext(book.id, selectedClassLevel?.id)
                                  navigate('book-form')
                                }}
                                title="Modifier"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-blue-500"
                                onClick={() => {
                                  setRestockQty(1)
                                  setRestockEditor(book.editor ?? '')
                                  setRestockPrice(
                                    book.purchasePrice && book.purchasePrice > 0
                                      ? book.purchasePrice
                                      : Math.round(book.price * 0.8)
                                  )
                                  setRestockBook(book)
                                }}
                                title="Réapprovisionner"
                              >
                                <RefreshCw className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive"
                                onClick={() => handleDeleteBook(book)}
                                title="Supprimer"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>

                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            <span className="text-base font-bold text-primary">{formatCurrency(book.price)}</span>
                            {book.isPacket && (
                              <Badge variant="secondary" className="text-[10px]">
                                <PackageSearch className="mr-1 h-3 w-3" />
                                Pack ×{book.itemsPerPacket}
                              </Badge>
                            )}
                            {book.subject && (
                              <Badge
                                className="text-[10px] text-white border-0"
                                style={{ backgroundColor: book.subject.color }}
                              >
                                {book.subject.name}
                              </Badge>
                            )}
                          </div>

                          <div className="mt-3 flex items-center justify-between pt-2 border-t text-xs">
                            {stock ? (
                              <Badge variant={isLow ? 'destructive' : 'default'} className="text-[10px]">
                                {isLow && <AlertTriangle className="mr-1 h-3 w-3" />}
                                Stock: {qty}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px]">
                                Stock: 0
                              </Badge>
                            )}
                            {book.isbn && (
                              <span className="text-[10px] text-muted-foreground font-mono">
                                ISBN: {book.isbn}
                              </span>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              )}

              {/* Mode Liste */}
              {!loading && filteredBooks.length > 0 && viewMode === 'list' && (
                <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-muted/50 border-b text-muted-foreground font-semibold uppercase tracking-wider text-[10px]">
                        <tr>
                          <th className="px-4 py-3">Statut</th>
                          <th className="px-4 py-3">Titre du Manuel</th>
                          <th className="px-4 py-3">Auteur / Éditeur</th>
                          <th className="px-4 py-3">Matière / Pack</th>
                          <th className="px-4 py-3 text-right">Prix Unitaire</th>
                          <th className="px-4 py-3 text-center">Stock</th>
                          <th className="px-4 py-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {paginatedBooks.map((book) => {
                          const stock = getStock(book)
                          const qty = stock?.quantity ?? 0
                          const alertLimit = stock?.alertLimit ?? 0
                          const isLow = qty <= alertLimit
                          const isOfficial = book.isOfficialProgram !== false

                          return (
                            <tr key={book.id} className="hover:bg-muted/40 transition-colors group">
                              <td className="px-4 py-3 whitespace-nowrap">
                                {isOfficial ? (
                                  <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-400 text-[10px] py-0 px-2">
                                    Au programme
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-amber-700 bg-amber-50 border-amber-300 dark:bg-amber-950/30 dark:text-amber-400 text-[10px] py-0 px-2">
                                    Hors programme
                                  </Badge>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                <p className="font-semibold text-foreground text-sm leading-snug">{book.title}</p>
                                {book.isbn && (
                                  <p className="text-[10px] text-muted-foreground font-mono mt-0.5">ISBN: {book.isbn}</p>
                                )}
                              </td>
                              <td className="px-4 py-3 text-muted-foreground">
                                <p className="font-medium text-foreground/80">{book.author || '—'}</p>
                                {book.editor && <p className="text-[10px] text-muted-foreground">Éditeur: {book.editor}</p>}
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  {book.subject && (
                                    <Badge
                                      className="text-[10px] text-white border-0 py-0.5 px-2 font-medium"
                                      style={{ backgroundColor: book.subject.color }}
                                    >
                                      {book.subject.name}
                                    </Badge>
                                  )}
                                  {book.isPacket && (
                                    <Badge variant="secondary" className="text-[10px]">
                                      <PackageSearch className="mr-1 h-3 w-3" />
                                      Pack ×{book.itemsPerPacket}
                                    </Badge>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-right font-bold text-primary text-sm whitespace-nowrap">
                                {formatCurrency(book.price)}
                              </td>
                              <td className="px-4 py-3 text-center whitespace-nowrap">
                                {stock ? (
                                  <Badge variant={isLow ? 'destructive' : 'default'} className="text-[10px]">
                                    {isLow && <AlertTriangle className="mr-1 h-3 w-3" />}
                                    {qty} en stock
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-[10px] text-destructive border-destructive/30">
                                    0 en stock
                                  </Badge>
                                )}
                              </td>
                              <td className="px-4 py-3 text-right whitespace-nowrap">
                                <div className="flex items-center justify-end gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                    onClick={() => {
                                      useEntrepotStore.getState().setBookFormContext(book.id, selectedClassLevel?.id)
                                      navigate('book-form')
                                    }}
                                    title="Modifier"
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/40"
                                    onClick={() => {
                                      setRestockQty(1)
                                      setRestockEditor(book.editor ?? '')
                                      setRestockPrice(
                                        book.purchasePrice && book.purchasePrice > 0
                                          ? book.purchasePrice
                                          : Math.round(book.price * 0.8)
                                      )
                                      setRestockBook(book)
                                    }}
                                    title="Réapprovisionner"
                                  >
                                    <RefreshCw className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-destructive hover:bg-destructive/10"
                                    onClick={() => handleDeleteBook(book)}
                                    title="Supprimer"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Pagination Livres */}
              {!loading && filteredBooks.length > 0 && totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t text-xs text-muted-foreground">
                  <div>
                    Affichage de <span className="font-semibold text-foreground">{startIndex}</span> à{' '}
                    <span className="font-semibold text-foreground">{endIndex}</span> sur{' '}
                    <span className="font-semibold text-foreground">{filteredBooks.length}</span> livre{filteredBooks.length > 1 ? 's' : ''}
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                      title="Première page"
                    >
                      <ChevronsLeft className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      title="Page précédente"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </Button>

                    <span className="px-2 font-medium text-foreground">
                      Page {currentPage} / {totalPages}
                    </span>

                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      title="Page suivante"
                    >
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages}
                      title="Dernière page"
                    >
                      <ChevronsRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Ventes tab */}
          {activeTab === 'ventes' && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between px-4 py-3">
                <CardTitle className="text-sm font-medium">
                  Ventes — {selectedClassLevel.name}
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('student-total')}
                >
                  Totaux par élève
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                {bookSales.length === 0 ? (
                  <p className="p-4 text-sm text-muted-foreground">Aucune vente enregistrée.</p>
                ) : (
                  <div className="divide-y text-xs">
                    {bookSales.map((sale) => (
                      <div key={sale.id} className="flex items-center justify-between p-3">
                        <div>
                          <p className="font-medium">{sale.studentName ?? 'Client libre'}</p>
                          <p className="text-muted-foreground">{sale.className ?? selectedClassLevel.name} — {sale.items.length} article(s)</p>
                          <p className="text-[10px] text-muted-foreground">{new Date(sale.createdAt).toLocaleString('fr-FR')}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{formatCurrency(sale.totalAmount)}</p>
                          <Badge variant="outline" className="text-[10px]">{sale.paymentMethod}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Restock dialog */}
      <Dialog open={!!restockBook} onOpenChange={(open) => { if (!open) setRestockBook(null) }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Réapprovisionner — {restockBook?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>Quantité à ajouter</Label>
              <Input
                type="number"
                min={1}
                value={restockQty}
                onChange={(e) => setRestockQty(Math.max(1, parseInt(e.target.value) || 1))}
              />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label>Prix d'achat unitaire</Label>
                {restockBook && (
                  <span className="text-[10px] text-muted-foreground font-semibold">
                    Prix public: {formatCurrency(restockBook.price)} (-20% = {formatCurrency(Math.round(restockBook.price * 0.8))})
                  </span>
                )}
              </div>
              <Input
                type="number"
                min={0}
                value={restockPrice || ''}
                placeholder="Ex: 2500"
                onChange={(e) => setRestockPrice(parseFloat(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Fournisseur / Éditeur (optionnel)</Label>
              <Input
                value={restockEditor}
                placeholder="Ex: Hatier, Afrédit..."
                onChange={(e) => setRestockEditor(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <DialogClose asChild>
                <Button variant="outline">Annuler</Button>
              </DialogClose>
              <Button onClick={handleRestock} disabled={restockSaving}>
                {restockSaving ? 'Enregistrement...' : 'Ajouter au stock'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default Librairie
