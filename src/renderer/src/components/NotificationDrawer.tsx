import { useState, useEffect } from 'react'
import {
  Bell,
  BellDot,
  ShoppingCart,
  Package,
  AlertTriangle,
  AlertOctagon,
  Info,
  CheckCheck,
  Trash2,
  X,
  Store,
  Clock,
  Sparkles,
  ChevronRight
} from 'lucide-react'
import { Button } from './ui/button'
import { cn } from '@/lib/utils'
import { useNotifications, type NotificationType, type Notification } from '@/stores/notificationStore'

interface NotificationDrawerProps {
  open: boolean
  onClose: () => void
  warehouseId?: string | null
  warehouseName?: string | null
}

const FILTERS: { label: string; value: NotificationType | 'all'; icon?: any }[] = [
  { label: 'Toutes', value: 'all' },
  { label: 'Ventes', value: 'vente', icon: ShoppingCart },
  { label: 'Produits', value: 'produit_cree', icon: Package },
  { label: 'Stock Faible', value: 'stock_alerte', icon: AlertTriangle },
  { label: 'Ruptures', value: 'stock_critique', icon: AlertOctagon },
  { label: 'Infos', value: 'info', icon: Info }
]

function getNotificationStyle(type: NotificationType) {
  switch (type) {
    case 'vente':
      return {
        icon: ShoppingCart,
        badgeClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
        iconBg: 'bg-emerald-500 text-white shadow-emerald-500/25',
        borderClass: 'hover:border-emerald-500/40'
      }
    case 'produit_cree':
      return {
        icon: Package,
        badgeClass: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
        iconBg: 'bg-blue-500 text-white shadow-blue-500/25',
        borderClass: 'hover:border-blue-500/40'
      }
    case 'stock_alerte':
      return {
        icon: AlertTriangle,
        badgeClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
        iconBg: 'bg-amber-500 text-white shadow-amber-500/25',
        borderClass: 'hover:border-amber-500/40'
      }
    case 'stock_critique':
      return {
        icon: AlertOctagon,
        badgeClass: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
        iconBg: 'bg-rose-500 text-white shadow-rose-500/25',
        borderClass: 'hover:border-rose-500/40'
      }
    case 'info':
    default:
      return {
        icon: Info,
        badgeClass: 'bg-primary/10 text-primary border-primary/20',
        iconBg: 'bg-primary text-primary-foreground shadow-primary/25',
        borderClass: 'hover:border-primary/40'
      }
  }
}

function formatRelativeTime(date: Date | string) {
  const d = new Date(date)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHours = Math.floor(diffMin / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffSec < 60) return "À l'instant"
  if (diffMin < 60) return `Il y a ${diffMin} min`
  if (diffHours < 24) return `Il y a ${diffHours} h`
  if (diffDays === 1) return 'Hier à ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) + ' à ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

export function NotificationDrawer({ open, onClose, warehouseId, warehouseName }: NotificationDrawerProps) {
  const { notifications, unreadCount, markRead, markAllRead, dismiss, clearAll } = useNotifications()
  const [filter, setFilter] = useState<NotificationType | 'all'>('all')

  // Fermer avec la touche Échap
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && open) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  if (!open) return null

  const scopeNotifications = warehouseId
    ? notifications.filter((n) => !n.warehouseId || n.warehouseId === warehouseId)
    : notifications

  const scopeUnread = scopeNotifications.filter((n) => !n.read).length
  const filtered = filter === 'all' ? scopeNotifications : scopeNotifications.filter((n) => n.type === filter)

  return (
    <div className="fixed inset-0 z-50 overflow-hidden animate-in fade-in duration-200">
      {/* Arrière-plan assombri avec flou */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Panneau latéral pleine hauteur qui glisse depuis la droite */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10 z-50">
        <div className="w-screen max-w-md sm:max-w-lg bg-card text-card-foreground border-l border-border shadow-2xl flex flex-col h-full animate-in slide-in-from-right duration-300">
          
          {/* ── EN-TÊTE DU DRAWER ─────────────────────────────────── */}
          <div className="p-4 sm:p-5 border-b border-border bg-muted/20 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-xs">
                  {scopeUnread > 0 ? <BellDot className="h-5 w-5" /> : <Bell className="h-5 w-5" />}
                </div>
                <div>
                  <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                    Notifications
                    {scopeUnread > 0 && (
                      <span className="inline-flex items-center rounded-full bg-destructive text-destructive-foreground px-2 py-0.5 text-[10px] font-bold">
                        {scopeUnread} non lue{scopeUnread > 1 ? 's' : ''}
                      </span>
                    )}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {warehouseName ? `Boutique : ${warehouseName}` : 'Toutes les boutiques'}
                  </p>
                </div>
              </div>

              {/* Bouton Fermer */}
              <button
                onClick={onClose}
                className="h-8 w-8 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                title="Fermer (Échap)"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Actions globales */}
            <div className="flex items-center justify-between pt-1 text-xs">
              <span className="text-muted-foreground font-medium">
                {scopeNotifications.length} notification{scopeNotifications.length > 1 ? 's' : ''}
              </span>
              <div className="flex items-center gap-2">
                {scopeUnread > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={markAllRead}
                    className="h-7 text-xs gap-1.5 px-2.5"
                  >
                    <CheckCheck className="h-3.5 w-3.5 text-primary" /> Tout marquer lu
                  </Button>
                )}
                {scopeNotifications.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearAll}
                    className="h-7 text-xs gap-1.5 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Tout effacer
                  </Button>
                )}
              </div>
            </div>

            {/* ── FILTRES PAR CATÉGORIES ─────────────────────────── */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 no-scrollbar">
              {FILTERS.map((f) => {
                const count = f.value === 'all'
                  ? scopeNotifications.length
                  : scopeNotifications.filter((n) => n.type === f.value).length
                
                return (
                  <button
                    key={f.value}
                    onClick={() => setFilter(f.value)}
                    className={cn(
                      'flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all shrink-0',
                      filter === f.value
                        ? 'bg-primary text-primary-foreground shadow-xs'
                        : 'bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    <span>{f.label}</span>
                    {count > 0 && (
                      <span className={cn(
                        'text-[10px] px-1.5 py-0.2 rounded-full font-bold',
                        filter === f.value ? 'bg-white/20 text-white' : 'bg-background/80 text-foreground'
                      )}>
                        {count}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* ── LISTE SCROLLABLE PLEINE HAUTEUR ──────────────────── */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2.5 divide-y-0">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-20 text-center px-4">
                <div className="h-16 w-16 rounded-2xl bg-muted/50 border border-border flex items-center justify-center text-muted-foreground/60 mb-3 shadow-inner">
                  <Bell className="h-8 w-8" />
                </div>
                <p className="text-sm font-semibold text-foreground">Aucune notification</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                  {filter === 'all'
                    ? 'Vous êtes à jour ! Aucune alerte ni notification récente pour le moment.'
                    : 'Aucune notification enregistrée dans cette catégorie.'}
                </p>
              </div>
            ) : (
              filtered.map((n) => {
                const style = getNotificationStyle(n.type)
                const Icon = style.icon

                return (
                  <div
                    key={n.id}
                    onClick={() => !n.read && markRead(n.id)}
                    className={cn(
                      'group relative rounded-xl border p-3.5 transition-all cursor-pointer flex items-start gap-3',
                      !n.read
                        ? 'bg-primary/[0.04] border-primary/30 shadow-xs'
                        : 'bg-card hover:bg-muted/30 border-border/70',
                      style.borderClass
                    )}
                  >
                    {/* Indicateur de non-lu (Pastille bleue) */}
                    {!n.read && (
                      <span className="absolute top-3 right-3 h-2 w-2 rounded-full bg-primary ring-4 ring-primary/20" />
                    )}

                    {/* Icône de type colorée */}
                    <div className={cn(
                      'h-9 w-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm mt-0.5',
                      style.iconBg
                    )}>
                      <Icon className="h-4 w-4" />
                    </div>

                    {/* Contenu textuel */}
                    <div className="flex-1 min-w-0 pr-4">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <span className="font-semibold text-xs text-foreground tracking-tight">
                          {n.title}
                        </span>
                        {n.warehouseName && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                            <Store className="h-2.5 w-2.5 text-primary" /> {n.warehouseName}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {n.description}
                      </p>

                      <div className="flex items-center justify-between mt-2 pt-1 border-t border-border/40 text-[11px] text-muted-foreground/70">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {formatRelativeTime(n.createdAt)}
                        </span>

                        {/* Actions individuelles */}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                          {!n.read && (
                            <button
                              onClick={() => markRead(n.id)}
                              className="p-1 rounded text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                              title="Marquer comme lu"
                            >
                              <CheckCheck className="h-3.5 w-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => dismiss(n.id)}
                            className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                            title="Supprimer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* ── PIED DE PAGE DU DRAWER ────────────────────────────── */}
          <div className="p-4 border-t border-border bg-muted/10 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {unreadCount > 0 ? `${unreadCount} non lue(s) au total` : 'Toutes les notifications sont lues'}
            </span>
            <Button variant="outline" size="sm" onClick={onClose} className="h-8 text-xs">
              Fermer
            </Button>
          </div>

        </div>
      </div>
    </div>
  )
}
