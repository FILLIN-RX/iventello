import { useState, useEffect, useRef } from 'react'
import {
  LayoutDashboard, Package, Tag, AlertTriangle, XCircle,
  ShoppingCart, FileText, ShoppingBag, Wallet, Users,
  BarChart3, Activity, Truck, Warehouse as WarehouseIcon,
  Bell, BellDot, ChevronDown, Moon, Sun, Home, Settings as SettingsIcon,
  ArrowLeft, Plus, Receipt, Smartphone, Satellite,
  CheckCheck, X, Info, AlertOctagon, ShoppingCart as CartIcon
} from 'lucide-react'
import { cn } from './lib/utils'
import { useEntrepotStore } from './stores/entrepotStore'
import { useNotifications, typeToColor } from './stores/notificationStore'
import { useWarehouses } from './hooks/useWarehouses'
import { setGlobalNav } from './hooks/useNavigate'

import Dashboard from './views/Dashboard'
import Produits from './views/Produits'
import Categories from './views/Categories'
import StockFaible from './views/StockFaible'
import Rupture from './views/Rupture'
import Caisse from './views/Caisse'
import CahierCaisse from './views/CahierCaisse'
import { MobileMoneySheet } from './views/MobileMoneySheet'
import { CanalPlus } from './views/CanalPlus'
import { UpdateNotifier } from './components/UpdateNotifier'
import Factures from './views/Factures'
import Achats from './views/Achats'
import Depenses from './views/Depenses'
import Clients from './views/Clients'
import Rapports from './views/Rapports'
import ActivityLog from './views/ActivityLog'
import Fournisseurs from './views/Fournisseurs'
import Entrepots from './views/Entrepots'
import Accueil from './views/Accueil'
import SettingsView from './views/Settings'

type MainView = 'accueil' | 'entrepots' | 'settings'
type WorkspaceView =
  | 'dashboard' | 'produits' | 'categories'
  | 'stock-faible' | 'rupture' | 'caisse'
  | 'cahier-caisse' | 'factures' | 'achats' | 'depenses'
  | 'clients' | 'rapports' | 'journal'
  | 'fournisseurs'
  | 'canal-plus'

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
  { id: 'caisse', label: 'Ventes', icon: ShoppingCart, group: 'commercial' },
  { id: 'cahier-caisse', label: 'Cahier de caisse', icon: Receipt, group: 'commercial' },
  { id: 'factures', label: 'Factures', icon: FileText, group: 'commercial' },
  { id: 'achats', label: 'Achats', icon: ShoppingBag, group: 'commercial' },
  { id: 'depenses', label: 'Dépenses', icon: Wallet, group: 'commercial' },
  { id: 'clients', label: 'Clients', icon: Users, group: 'relations' },
  { id: 'fournisseurs', label: 'Fournisseurs', icon: Truck, group: 'relations' },
  { id: 'rapports', label: 'Rapports', icon: BarChart3, group: 'analyse' },
  { id: 'journal', label: "Journal d'activité", icon: Activity, group: 'analyse' },
  { id: 'mobile-money', label: 'Mobile Money', icon: Smartphone, group: 'analyse' },
  { id: 'canal-plus', label: 'Canal+', icon: Satellite, group: 'analyse' },
]

const GROUP_LABELS: Record<string, string> = {
  principal: '', catalogue: 'Catalogue', stock: 'Stock',
  commercial: 'Commercial', relations: 'Relations', analyse: 'Analyse',
}

const VIEW_TITLES: Record<string, string> = {
  accueil: 'Accueil', entrepots: 'Entrepôts', settings: 'Paramètres', notifications: 'Notifications',
  dashboard: 'Tableau de bord', produits: 'Produits', categories: 'Catégories',
  'stock-faible': 'Stock faible', rupture: 'Rupture de stock', caisse: 'Ventes',
  'cahier-caisse': 'Cahier de caisse', 'mobile-money': 'Mobile Money', factures: 'Factures', achats: 'Achats', depenses: 'Dépenses',
  clients: 'Clients', rapports: 'Rapports', journal: "Journal d'activité",
  fournisseurs: 'Fournisseurs',
  'canal-plus': 'Canal+',
}

function getInitialTheme(): boolean {
  if (typeof window === 'undefined') return false
  const stored = localStorage.getItem('theme')
  if (stored) return stored === 'dark'
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

const mainNav = [
  { id: 'accueil' as const, label: 'Accueil', icon: Home },
  { id: 'entrepots' as const, label: 'Entrepôts', icon: WarehouseIcon },
  { id: 'settings' as const, label: 'Paramètres', icon: SettingsIcon },
]

export default function App() {
  const { selectedId, selectedName, clear } = useEntrepotStore()
  const [mainView, setMainView] = useState<MainView>('accueil')
  const [workspaceView, setWorkspaceView] = useState<WorkspaceView>('dashboard')
  const [dark, setDark] = useState(getInitialTheme)
  const isWorkspace = selectedId !== null

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem('theme', dark ? 'dark' : 'light')
  }, [dark])

  useEffect(() => {
    setGlobalNav((target) => {
      if (target.type === 'main') {
        setMainView(target.view as MainView)
        clear()
      } else {
        setWorkspaceView(target.view as WorkspaceView)
      }
    })
  }, [clear])

  useEffect(() => {
    const { checkAlerts } = useNotifications.getState()
    checkAlerts()
    const interval = setInterval(checkAlerts, 30_000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const { warehouses, refetch } = useWarehouses()

  useEffect(() => { if (selectedId) refetch() }, [selectedId])
  const selectedWarehouse = warehouses.find((w) => w.id === selectedId)
  const hasMobileMoney = selectedWarehouse?.mobileMoneyEnabled ?? false

  const groups = ['principal', 'catalogue', 'stock', 'commercial', 'relations', 'analyse']
  const currentTitle = isWorkspace ? VIEW_TITLES[workspaceView] ?? workspaceView : VIEW_TITLES[mainView]
  const { notifications, unreadCount, markRead, markAllRead, dismiss } = useNotifications()
  const [notifOpen, setNotifOpen] = useState(false)
  const notifRef = useRef<HTMLDivElement>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  function handleBackToList() {
    clear()
    setMainView('entrepots')
  }

  function handleCreateEntrepot() {
    clear()
    setMainView('entrepots')
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background" style={{ fontFamily: "'Poppins', sans-serif" }}>
      <UpdateNotifier />
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-60' : 'w-0'} flex flex-shrink-0 flex-col border-r bg-card shadow-sm transition-all duration-200 overflow-hidden`}>
        {/* Logo */}
        <div className="flex h-16 items-center gap-2.5 border-b px-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg shadow-sm">
            <img src="/iventello.png" alt="iventello" className="h-8 w-8 object-contain" />
          </div>
          <span className="text-lg font-bold tracking-tight text-foreground">iventello</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-0.5">
          {isWorkspace ? (
            <>
              {groups.map(group => {
                const items = workspaceNav
                  .filter(n => n.group === group)
                  .filter(n => n.id !== 'mobile-money' || hasMobileMoney)
                return (
                  <div key={group} className="mb-1">
                    {GROUP_LABELS[group] && (
                      <p className="mb-1 mt-3 px-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                        {GROUP_LABELS[group]}
                      </p>
                    )}
                    {items.map(item => {
                      const isActive = workspaceView === item.id
                      return (
                        <button
                          key={item.id}
                          onClick={() => setWorkspaceView(item.id)}
                          className={cn(
                            'flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 text-left',
                            isActive
                              ? 'bg-primary text-primary-foreground shadow-sm'
                              : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                          )}
                        >
                          <item.icon className={cn('h-4 w-4 flex-shrink-0', isActive ? 'text-primary-foreground' : '')} />
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
              {mainNav.map((item) => {
                const isActive = mainView === item.id
                return (
                  <button
                    key={item.id}
                    onClick={() => setMainView(item.id)}
                    className={cn(
                          'flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 text-left',
                          isActive
                            ? 'bg-primary text-primary-foreground shadow-sm'
                            : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                        )}
                      >
                        <item.icon className={cn('h-4 w-4 flex-shrink-0', isActive ? 'text-primary-foreground' : '')} />
                        <span className="flex-1 truncate text-left">{item.label}</span>
                      </button>
                )
              })}
            </>
          )}
        </nav>

        {/* User footer */}
        <div className="border-t px-3 py-3 space-y-2">
          {isWorkspace && (
            <button
              onClick={handleBackToList}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-destructive/30 px-3 py-2 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Sortir de l'entrepôt</span>
            </button>
          )}
          <div className="flex items-center justify-between rounded-lg bg-muted/60 px-3 py-2.5">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-bold">R</div>
              <div className="min-w-0">
                <p className="text-xs font-semibold truncate">Ruxel</p>
                <p className="text-[10px] text-muted-foreground">Administrateur</p>
              </div>
            </div>
            <button
              onClick={() => setDark(!dark)}
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            >
              {dark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 flex-shrink-0 items-center justify-between border-b bg-card px-6 shadow-sm">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d={sidebarOpen ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'} />
              </svg>
            </button>
            <h2 className="text-base font-bold text-foreground">{currentTitle}</h2>
            <span className="hidden md:inline text-xs text-muted-foreground capitalize">
              {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </span>
            {isWorkspace && selectedWarehouse && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                <WarehouseIcon className="h-3 w-3" />
                {selectedWarehouse.name}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setNotifOpen(!notifOpen)}
                className="relative rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              >
                {unreadCount > 0 ? (
                  <>
                    <BellDot className="h-5 w-5" />
                    <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  </>
                ) : (
                  <Bell className="h-5 w-5" />
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 top-10 z-50 w-80 rounded-lg border bg-popover shadow-lg">
                  <div className="flex items-center justify-between border-b px-4 py-3">
                    <span className="text-sm font-semibold">Notifications</span>
                    {unreadCount > 0 && (
                      <button onClick={markAllRead} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                        <CheckCheck className="h-3 w-3" /> Tout lire
                      </button>
                    )}
                  </div>
                  <div className="max-h-[350px] overflow-y-auto">
                    {notifications.length === 0 && (
                      <p className="p-6 text-center text-sm text-muted-foreground">Aucune notification</p>
                    )}
                    {notifications.slice(0, 10).map((n) => (
                      <div
                        key={n.id}
                        className={cn(
                          'flex items-start gap-3 border-b px-4 py-3 text-sm transition-colors hover:bg-accent/50 cursor-pointer',
                          !n.read && 'bg-accent/30'
                        )}
                        onClick={() => markRead(n.id)}
                      >
                        <div className={cn('mt-0.5 flex h-5 w-5 items-center justify-center rounded-full text-white', typeToColor(n.type))}>
                          {n.type === 'vente' && <CartIcon className="h-3 w-3" />}
                          {n.type === 'produit_cree' && <Package className="h-3 w-3" />}
                          {n.type === 'stock_alerte' && <AlertTriangle className="h-3 w-3" />}
                          {n.type === 'stock_critique' && <AlertOctagon className="h-3 w-3" />}
                          {n.type === 'info' && <Info className="h-3 w-3" />}
                        </div>
                        <div className="flex-1 space-y-0.5 min-w-0">
                          <p className="font-medium text-xs">{n.title}</p>
                          <p className="text-xs text-muted-foreground line-clamp-2">{n.description}</p>
                          {n.warehouseName && (
                            <p className="text-[10px] text-muted-foreground/60">{n.warehouseName}</p>
                          )}
                          <p className="text-[10px] text-muted-foreground">
                            {new Date(n.createdAt).toLocaleString('fr-FR')}
                          </p>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); dismiss(n.id) }} className="shrink-0 text-muted-foreground hover:text-foreground">
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                  {notifications.length > 10 && (
                    <div className="border-t p-2 text-center">
                      <span className="text-xs text-muted-foreground">+{notifications.length - 10} autres</span>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 rounded-lg border bg-background px-3 py-1.5">
              <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold">R</div>
              <div className="text-right">
                <p className="text-xs font-semibold leading-none">RUXEL</p>
                <p className="text-[10px] text-muted-foreground leading-none mt-0.5">Administrateur</p>
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          {isWorkspace ? (
            <>
              {workspaceView === 'dashboard' && <Dashboard onNavigate={(v) => setWorkspaceView(v as WorkspaceView)} />}
              {workspaceView === 'produits' && <Produits />}
              {workspaceView === 'categories' && <Categories />}
              {workspaceView === 'stock-faible' && <StockFaible />}
              {workspaceView === 'rupture' && <Rupture />}
              {workspaceView === 'caisse' && <Caisse />}
              {workspaceView === 'cahier-caisse' && <CahierCaisse />}
              {workspaceView === 'factures' && <Factures />}
              {workspaceView === 'achats' && <Achats />}
              {workspaceView === 'depenses' && <Depenses />}
              {workspaceView === 'clients' && <Clients />}
              {workspaceView === 'rapports' && <Rapports />}
              {workspaceView === 'journal' && <ActivityLog />}
              {workspaceView === 'mobile-money' && <MobileMoneySheet />}
              {workspaceView === 'canal-plus' && <CanalPlus />}
              {workspaceView === 'fournisseurs' && <Fournisseurs />}
            </>
          ) : (
            <>
              {mainView === 'accueil' && <Accueil />}
              {mainView === 'entrepots' && <Entrepots />}
              {mainView === 'settings' && <SettingsView />}
            </>
          )}
        </main>
      </div>
    </div>
  )
}
