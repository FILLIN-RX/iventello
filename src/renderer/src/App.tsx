import { useState, useEffect, useRef, useTransition, lazy, Suspense } from 'react'
import {
  LayoutDashboard, Package, Tag, AlertTriangle, XCircle,
  ShoppingCart, FileText, ShoppingBag, Wallet, Users,
  BarChart3, Activity, Truck, Warehouse as WarehouseIcon, Store,
  Bell, BellDot, ChevronDown, Moon, Sun, Home, Settings as SettingsIcon,
  ArrowLeft, Plus, Receipt, Smartphone, Satellite, Percent,
  CheckCheck, X, Info, AlertOctagon, ShoppingCart as CartIcon,
  Printer, UserCheck, BookOpen, Clock, History, Archive, Scan,
} from 'lucide-react'
import { cn } from './lib/utils'
import { useEntrepotStore } from './stores/entrepotStore'
import { useNotifications, typeToColor } from './stores/notificationStore'
import { useWarehouses } from './hooks/useWarehouses'
import { setGlobalNav } from './hooks/useNavigate'
import { useAuthStore } from './stores/authStore'
import { OnboardingWizard } from './components/OnboardingWizard'
import { LoginScreen } from './components/LoginScreen'
import { UpdateNotifier } from './components/UpdateNotifier'
import { FloatingActions } from './components/FloatingActions'
import { ViewSkeleton } from './components/ViewSkeleton'
import { GlobalFeedbackProvider } from './components/GlobalFeedbackProvider'
import { NotificationDrawer } from './components/NotificationDrawer'
import { toFileUrl } from '../../shared/imageUtils'
import iventelloLogo from '../../assets/iventello.png'

// Lazy-loaded Views for zero-block smooth transitions
const Dashboard = lazy(() => import('./views/Dashboard'))
const Produits = lazy(() => import('./views/Produits'))
const Categories = lazy(() => import('./views/Categories'))
const StockFaible = lazy(() => import('./views/StockFaible'))
const Rupture = lazy(() => import('./views/Rupture'))
const Caisse = lazy(() => import('./views/Caisse'))
const CahierCaisse = lazy(() => import('./views/CahierCaisse'))
const MobileMoneySheet = lazy(() => import('./views/MobileMoneySheet').then(m => ({ default: m.MobileMoneySheet })))
const CanalPlus = lazy(() => import('./views/CanalPlus').then(m => ({ default: m.CanalPlus })))
const Services = lazy(() => import('./views/Services').then(m => ({ default: m.Services })))
const Magasin = lazy(() => import('./views/Magasin'))
const Factures = lazy(() => import('./views/Factures'))
const Achats = lazy(() => import('./views/Achats'))
const Depenses = lazy(() => import('./views/Depenses'))
const Remises = lazy(() => import('./views/Remises'))
const Clients = lazy(() => import('./views/Clients'))
const Rapports = lazy(() => import('./views/Rapports'))
const ActivityLog = lazy(() => import('./views/ActivityLog'))
const Fournisseurs = lazy(() => import('./views/Fournisseurs'))
const Agents = lazy(() => import('./views/Agents'))
const Entrepots = lazy(() => import('./views/Entrepots'))
const Accueil = lazy(() => import('./views/Accueil'))
const ImportExportView = lazy(() => import('./views/ImportExport'))
const SettingsView = lazy(() => import('./views/Settings'))
const Librairie = lazy(() => import('./views/Librairie'))
const BookForm = lazy(() => import('./views/BookForm'))
const StudentTotal = lazy(() => import('./views/StudentTotal'))
const FicheEleve = lazy(() => import('./views/FicheEleve'))
const Avances = lazy(() => import('./views/Avances'))
const BonsCommandes = lazy(() => import('./views/BonsCommandes'))
const MouvementsStock = lazy(() => import('./views/MouvementsStock'))
const NonLivres = lazy(() => import('./views/NonLivres'))
const Scans = lazy(() => import('./views/Scans'))

type MainView = 'accueil' | 'entrepots' | 'settings' | 'agents' | 'import-export'
type WorkspaceView =
  | 'dashboard' | 'produits' | 'categories'
  | 'stock-faible' | 'rupture' | 'caisse'
  | 'cahier-caisse' | 'factures' | 'achats' | 'depenses'
  | 'remises' | 'avances' | 'non-livres' | 'scans'
  | 'clients' | 'rapports' | 'journal'
  | 'fournisseurs'
  | 'agents'
  | 'canal-plus'
  | 'services'
  | 'mobile-money'
  | 'magasin'
  | 'librairie'
  | 'book-form'
  | 'student-total'
  | 'bons-commandes'
  | 'mouvements-stock'

interface NavItem {
  id: WorkspaceView
  label: string
  icon: any
  group?: string
}

const workspaceNav: NavItem[] = [
  { id: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard, group: 'principal' },
  { id: 'produits', label: 'Produits', icon: Package, group: 'catalogue' },
  { id: 'categories', label: 'Catégories', icon: Tag, group: 'catalogue' },
  { id: 'stock-faible', label: 'Stock faible', icon: AlertTriangle, group: 'stock' },
  { id: 'rupture', label: 'Rupture', icon: XCircle, group: 'stock' },
  { id: 'mouvements-stock', label: 'Mouvements', icon: History, group: 'stock' },
  { id: 'magasin', label: 'Magasin', icon: WarehouseIcon, group: 'stock' },
  { id: 'librairie', label: 'Librairie', icon: BookOpen, group: 'catalogue' },
  { id: 'caisse', label: 'Ventes', icon: ShoppingCart, group: 'commercial' },
  { id: 'cahier-caisse', label: 'Cahier de caisse', icon: Receipt, group: 'commercial' },
  { id: 'factures', label: 'Factures', icon: FileText, group: 'commercial' },
  { id: 'non-livres', label: 'Non livrés', icon: Truck, group: 'commercial' },
  { id: 'avances', label: 'Avances', icon: Clock, group: 'commercial' },
  { id: 'achats', label: 'Achats', icon: ShoppingBag, group: 'commercial' },
  { id: 'bons-commandes', label: 'Bons de commande', icon: FileText, group: 'commercial' },
  { id: 'depenses', label: 'Dépenses', icon: Wallet, group: 'commercial' },
  { id: 'scans', label: 'Numérisation & Scans', icon: Scan, group: 'commercial' },
  { id: 'remises', label: 'Remises', icon: Percent, group: 'commercial' },
  { id: 'clients', label: 'Clients', icon: Users, group: 'relations' },
  { id: 'fournisseurs', label: 'Fournisseurs', icon: Truck, group: 'relations' },
  { id: 'rapports', label: 'Rapports', icon: BarChart3, group: 'analyse' },
  { id: 'journal', label: "Journal d'activité", icon: Activity, group: 'analyse' },
  { id: 'mobile-money', label: 'Mobile Money', icon: Smartphone, group: 'analyse' },
  { id: 'canal-plus', label: 'Canal+', icon: Satellite, group: 'analyse' },
  { id: 'services', label: 'Services', icon: Printer, group: 'commercial' },
]

const GROUP_LABELS: Record<string, string> = {
  principal: '', catalogue: 'Catalogue', stock: 'Stock',
  commercial: 'Commercial', relations: 'Relations', analyse: 'Analyse',
}

const VIEW_TITLES: Record<string, string> = {
  accueil: 'Accueil', entrepots: 'Boutiques', settings: 'Paramètres', notifications: 'Notifications',
  'import-export': 'Sauvegardes & Données',
  dashboard: 'Tableau de bord', produits: 'Produits', categories: 'Catégories',
  'stock-faible': 'Stock faible', rupture: 'Rupture de stock', caisse: 'Ventes',
  'cahier-caisse': 'Cahier de caisse', 'mobile-money': 'Mobile Money', factures: 'Factures', achats: 'Achats', depenses: 'Dépenses',
  clients: 'Clients', remises: 'Remises', avances: 'Avances', 'non-livres': 'Commandes non livrées', rapports: 'Rapports', journal: "Journal d'activité",
  fournisseurs: 'Fournisseurs',
  agents: 'Agents commerciaux',
  'canal-plus': 'Canal+',
  services: 'Services (Photocopie, Impression, Scan)',
  magasin: 'Magasin',
  librairie: 'Librairie',
  'book-form': 'Formulaire livre',
  'student-total': 'Totaux par élève',
  'bons-commandes': 'Bons de commande',
  'mouvements-stock': 'Mouvements de stock',
}

function getInitialTheme(): boolean {
  if (typeof window === 'undefined') return false
  const stored = localStorage.getItem('theme')
  if (stored) return stored === 'dark'
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

const mainNav = [
  { id: 'accueil' as const, label: 'Accueil', icon: Home },
  { id: 'entrepots' as const, label: 'Boutiques', icon: Store },
  { id: 'agents' as const, label: 'Agents', icon: UserCheck },
  { id: 'import-export' as const, label: 'Sauvegardes & Données', icon: Archive },
  { id: 'settings' as const, label: 'Paramètres', icon: SettingsIcon },
]

export default function App() {
  const { user, isAuthenticated, isLoading, checkSession, startActivityWatcher } = useAuthStore()
  const [hasUsers, setHasUsers] = useState<boolean | null>(null)
  const [, startTransition] = useTransition()
  
  const { selectedId, selectedName, clear, workspaceView, setWorkspaceView } = useEntrepotStore()
  const [mainView, setMainView] = useState<MainView>('accueil')
  const [dark, setDark] = useState(getInitialTheme)
  const isWorkspace = selectedId !== null

  // Define what's allowed for each role
  const isAllowed = (viewId: WorkspaceView) => {
    if (!user) return false
    if (user.role === 'PROPRIETAIRE') return true
    if (user.role === 'MANAGER') return !['settings', 'journal', 'entrepots'].includes(viewId)
    if (user.role === 'CAISSIER') return ['caisse', 'cahier-caisse', 'factures', 'avances', 'clients', 'services', 'librairie'].includes(viewId)
    if (user.role === 'EMPLOYE') return ['caisse', 'produits', 'clients', 'services', 'librairie'].includes(viewId)
    if (user.role === 'AGENT') return ['caisse', 'produits', 'clients', 'factures', 'avances'].includes(viewId)
    return false
  }

  // Filter nav items based on role
  const filteredWorkspaceNav = workspaceNav.filter(item => isAllowed(item.id))

  useEffect(() => {
    checkSession()
    window.api.auth.hasUsers().then(setHasUsers)
  }, [])

  // Session timeout : surveille l'inactivité et déconnecte après 24h
  useEffect(() => {
    if (!isAuthenticated) return
    const cleanup = startActivityWatcher()
    return cleanup
  }, [isAuthenticated, startActivityWatcher])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem('theme', dark ? 'dark' : 'light')
  }, [dark])

  useEffect(() => {
    setGlobalNav((target) => {
      startTransition(() => {
        if (target.type === 'main') {
          setMainView(target.view as MainView)
          clear()
        } else {
          setWorkspaceView(target.view as WorkspaceView)
        }
      })
    })
  }, [clear])

  useEffect(() => {
    const { checkAlerts } = useNotifications.getState()
    checkAlerts()
    const interval = setInterval(checkAlerts, 30_000)
    return () => clearInterval(interval)
  }, [])

  const { warehouses, refetch } = useWarehouses()
  useEffect(() => { if (selectedId) refetch() }, [selectedId])
  const { unreadCount } = useNotifications()

  const [notifOpen, setNotifOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  if (isLoading || hasUsers === null) return <div className="flex h-screen items-center justify-center">Chargement...</div>

  // Après la création du propriétaire, on recharge la session via le store
  // au lieu d'un window.location.reload() qui brutalise tout le state et le cache
  const handleOnboardingComplete = async () => {
    await checkSession()           // met à jour isAuthenticated + user dans Zustand
    setHasUsers(true)             // cache la wizard immédiatement
  }

  if (!hasUsers) return <OnboardingWizard onComplete={handleOnboardingComplete} />
  if (!isAuthenticated) return <LoginScreen />

  const selectedWarehouse = warehouses.find((w) => w.id === selectedId)

  const groups = ['principal', 'catalogue', 'stock', 'commercial', 'relations', 'analyse']
  const currentTitle = isWorkspace ? VIEW_TITLES[workspaceView] ?? workspaceView : VIEW_TITLES[mainView]

  const canManage = user?.role === 'PROPRIETAIRE' || user?.role === 'MANAGER'
  const filteredMainNav = mainNav.filter(item => {
    if (item.id === 'agents' || item.id === 'settings' || item.id === 'entrepots' || item.id === 'import-export') return canManage
    return true
  })

  function handleWorkspaceNav(v: WorkspaceView) {
    startTransition(() => {
      setWorkspaceView(v)
    })
  }

  function handleMainNav(v: MainView) {
    startTransition(() => {
      setMainView(v)
    })
  }

  function handleBackToList() {
    startTransition(() => {
      clear()
      setMainView('entrepots')
    })
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <UpdateNotifier />
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-56' : 'w-0'} flex flex-shrink-0 flex-col border-r bg-[hsl(var(--sidebar-bg))] transition-all duration-200 overflow-hidden`}>
        {/* Logo / Header sidebar */}
        <div className="flex h-14 items-center gap-2.5 border-b px-3.5 bg-muted/10">
          {isWorkspace && selectedWarehouse ? (
            <>
              {selectedWarehouse.logoUrl ? (
                <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-background overflow-hidden shrink-0 shadow-2xs">
                  <img
                    src={toFileUrl(selectedWarehouse.logoUrl)}
                    alt={selectedWarehouse.name}
                    className="h-full w-full object-contain p-0.5"
                  />
                </div>
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-xs font-bold text-primary shrink-0 shadow-2xs">
                  {selectedWarehouse.name.slice(0, 2).toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <span className="text-xs font-bold tracking-tight text-foreground truncate block" title={selectedWarehouse.name}>
                  {selectedWarehouse.name}
                </span>
                <p className="text-[10px] text-muted-foreground truncate leading-none mt-0.5">
                  {selectedWarehouse.location || 'Boutique active'}
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-background overflow-hidden shrink-0 shadow-2xs">
                <img
                  src={iventelloLogo}
                  alt="Iventello"
                  className="h-full w-full object-contain p-0.5"
                />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-sm font-bold tracking-tight text-foreground block">Iventello</span>
                <p className="text-[10px] text-muted-foreground leading-none mt-0.5">Stock &amp; Caisse</p>
              </div>
            </>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-2 py-2 space-y-3">
          {isWorkspace ? (
            <>
              {groups.map((grp) => {
                const items = filteredWorkspaceNav.filter((n) => n.group === grp)
                if (items.length === 0) return null
                const label = GROUP_LABELS[grp]
                return (
                  <div key={grp} className="space-y-px">
                    {label && (
                      <p className="px-2 pt-3 pb-1 text-[10px] font-medium uppercase tracking-widest text-muted-foreground/50">
                        {label}
                      </p>
                    )}
                    {items.map((item) => {
                      const isActive = workspaceView === item.id
                      return (
                        <button
                          key={item.id}
                          onClick={() => handleWorkspaceNav(item.id)}
                          className={cn(
                            'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[0.8rem] font-medium transition-all duration-150 text-left',
                            isActive
                              ? 'bg-accent/80 text-foreground font-semibold shadow-2xs'
                              : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
                          )}
                        >
                          <item.icon
                            className={cn(
                              'h-3.5 w-3.5 flex-shrink-0 transition-colors',
                              isActive ? 'text-primary' : 'text-muted-foreground/70'
                            )}
                            strokeWidth={isActive ? 2 : 1.5}
                          />
                          <span className="flex-1 truncate text-left">{item.label}</span>
                        </button>
                      )
                    })}
                  </div>
                )
              })}
            </>
          ) : (
            <>
              {filteredMainNav.map((item) => {
                const isActive = mainView === item.id
                return (
                  <button
                    key={item.id}
                    onClick={() => handleMainNav(item.id)}
                    className={cn(
                      'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[0.8rem] font-medium transition-all duration-150 text-left',
                      isActive
                        ? 'bg-accent/80 text-foreground font-semibold shadow-2xs'
                        : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
                    )}
                  >
                    <item.icon
                      className={cn(
                        'h-3.5 w-3.5 flex-shrink-0 transition-colors',
                        isActive ? 'text-primary' : 'text-muted-foreground/70'
                      )}
                      strokeWidth={isActive ? 2 : 1.5}
                    />
                    <span className="flex-1 truncate text-left">{item.label}</span>
                  </button>
                )
              })}
            </>
          )}
        </nav>

        {/* User footer */}
        <div className="border-t px-2 py-2 space-y-1.5">
          {isWorkspace && (
            <button
              onClick={handleBackToList}
              className="flex w-full items-center justify-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
              <span>Sortir de la boutique</span>
            </button>
          )}
          <div className="flex items-center justify-between px-2 py-1.5">
            <div className="flex items-center gap-2 min-w-0">
              <div className="flex h-6 w-6 items-center justify-center rounded border border-border text-[10px] font-semibold text-foreground shrink-0">
                {user?.prenom?.[0]?.toUpperCase() ?? user?.nom?.[0]?.toUpperCase() ?? 'U'}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium truncate text-foreground">{user?.prenom} {user?.nom}</p>
                <p className="text-[10px] text-muted-foreground">{user?.role}</p>
              </div>
            </div>
            <button
              onClick={() => setDark(!dark)}
              className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors shrink-0"
            >
              {dark ? <Sun className="h-3.5 w-3.5" strokeWidth={1.5} /> : <Moon className="h-3.5 w-3.5" strokeWidth={1.5} />}
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-12 flex-shrink-0 items-center justify-between border-b bg-card px-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d={sidebarOpen ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'} />
              </svg>
            </button>
            <h2 className="text-sm font-semibold text-foreground">{currentTitle}</h2>
            <span className="hidden md:inline text-xs text-muted-foreground capitalize">
              {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </span>
            {isWorkspace && selectedWarehouse && (
              <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/40 px-2.5 py-1 text-xs font-medium text-foreground">
                {selectedWarehouse.logoUrl ? (
                  <img
                    src={toFileUrl(selectedWarehouse.logoUrl)}
                    alt=""
                    className="h-3.5 w-3.5 object-contain rounded-xs shrink-0"
                  />
                ) : (
                  <Store className="h-3.5 w-3.5 text-primary shrink-0" strokeWidth={1.5} />
                )}
                <span className="font-semibold">{selectedWarehouse.name}</span>
                {selectedWarehouse.location && (
                  <span className="text-[10px] text-muted-foreground hidden sm:inline">({selectedWarehouse.location})</span>
                )}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setNotifOpen(true)}
              className="relative rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              title="Centre de notifications"
            >
              {unreadCount > 0 ? (
                <>
                  <BellDot className="h-4 w-4 text-primary" strokeWidth={1.5} />
                  <span className="absolute -right-0.5 -top-0.5 flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-destructive px-0.5 text-[9px] font-bold text-destructive-foreground animate-pulse">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                </>
              ) : (
                <Bell className="h-4 w-4" strokeWidth={1.5} />
              )}
            </button>

            {/* Notification Drawer pleine hauteur glissant de la droite */}
            <NotificationDrawer
              open={notifOpen}
              onClose={() => setNotifOpen(false)}
              warehouseId={isWorkspace ? selectedId : null}
              warehouseName={isWorkspace ? selectedWarehouse?.name : null}
            />
            <div className="flex items-center gap-2 border-l border-border pl-3 ml-1">
              <div className="h-6 w-6 rounded border border-border flex items-center justify-center text-[10px] font-semibold text-foreground">
                {user?.prenom?.[0]?.toUpperCase() ?? user?.nom?.[0]?.toUpperCase() ?? 'U'}
              </div>
              <div>
                <p className="text-xs font-medium leading-none text-foreground">{user?.prenom} {user?.nom}</p>
                <p className="text-[10px] text-muted-foreground leading-none mt-0.5">{user?.role}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Page content with Suspense fallback for smooth non-blocking transition */}
        <main className="flex-1 overflow-y-auto p-5 pb-24">
          <Suspense fallback={<ViewSkeleton />}>
            {isWorkspace ? (
              <>
                {workspaceView === 'dashboard' && <Dashboard onNavigate={(v) => handleWorkspaceNav(v as WorkspaceView)} />}
                {workspaceView === 'produits' && <Produits />}
                {workspaceView === 'categories' && <Categories />}
                {workspaceView === 'stock-faible' && <StockFaible />}
                {workspaceView === 'rupture' && <Rupture />}
                {workspaceView === 'caisse' && <Caisse />}
                {workspaceView === 'cahier-caisse' && <CahierCaisse />}
                {workspaceView === 'factures' && <Factures />}
                {workspaceView === 'achats' && <Achats />}
                {workspaceView === 'depenses' && <Depenses />}
                {workspaceView === 'remises' && <Remises />}
                {workspaceView === 'avances' && <Avances />}
                {workspaceView === 'non-livres' && <NonLivres />}
                {workspaceView === 'scans' && <Scans />}
                {workspaceView === 'clients' && <Clients />}
                {workspaceView === 'rapports' && <Rapports />}
                {workspaceView === 'journal' && <ActivityLog />}
                {workspaceView === 'mobile-money' && <MobileMoneySheet />}
                {workspaceView === 'canal-plus' && <CanalPlus />}
                {workspaceView === 'services' && <Services />}
                {workspaceView === 'magasin' && <Magasin />}
                {workspaceView === 'fournisseurs' && <Fournisseurs />}
                {workspaceView === 'bons-commandes' && <BonsCommandes />}
                {workspaceView === 'agents' && <Agents />}
                {workspaceView === 'librairie' && <Librairie />}
                {workspaceView === 'mouvements-stock' && <MouvementsStock />}
                {workspaceView === 'book-form' && <BookForm
                  bookId={useEntrepotStore.getState().bookFormBookId ?? undefined}
                  classLevelId={useEntrepotStore.getState().bookFormClassLevelId ?? undefined}
                  onClose={() => handleWorkspaceNav('librairie')}
                />}
                {workspaceView === 'student-total' && (
                  useEntrepotStore.getState().studentSummary
                    ? <FicheEleve
                        data={useEntrepotStore.getState().studentSummary}
                        onClose={() => { useEntrepotStore.getState().setStudentSummary(null); handleWorkspaceNav('librairie') }}
                      />
                    : <StudentTotal
                        classLevelId={useEntrepotStore.getState().bookFormClassLevelId ?? undefined}
                        onClose={() => handleWorkspaceNav('librairie')}
                      />
                )}
              </>
            ) : (
              <>
                {mainView === 'accueil' && <Accueil />}
                {mainView === 'entrepots' && <Entrepots />}
                {mainView === 'agents' && <Agents />}
                {mainView === 'import-export' && <ImportExportView />}
                {mainView === 'settings' && <SettingsView />}
              </>
            )}
          </Suspense>
        </main>
        {isWorkspace && <FloatingActions onNavigate={(v) => handleWorkspaceNav(v as WorkspaceView)} />}
      </div>
      <GlobalFeedbackProvider />
    </div>
  )
}
