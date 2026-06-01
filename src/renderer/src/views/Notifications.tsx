import { useState } from 'react'
import { ShoppingCart, Package, AlertTriangle, AlertOctagon, Info, CheckCheck, Trash2, X, Bell, BellDot } from 'lucide-react'
import { Button } from '../components/ui/button'
import { cn } from '@/lib/utils'
import { useNotifications, typeToColor, type NotificationType } from '@/stores/notificationStore'

interface NotificationsProps {
  warehouseId?: string
  warehouseName?: string
}

const FILTERS: { label: string; value: NotificationType | 'all' }[] = [
  { label: 'Toutes', value: 'all' },
  { label: 'Ventes', value: 'vente' },
  { label: 'Produits', value: 'produit_cree' },
  { label: 'Stock faible', value: 'stock_alerte' },
  { label: 'Rupture', value: 'stock_critique' }
]

const TYPE_ICONS: Record<string, typeof ShoppingCart> = {
  vente: ShoppingCart,
  produit_cree: Package,
  stock_alerte: AlertTriangle,
  stock_critique: AlertOctagon,
  info: Info
}

function Notifications({ warehouseId, warehouseName }: NotificationsProps) {
  const { notifications, unreadCount, markRead, markAllRead, dismiss, clearAll } = useNotifications()
  const [filter, setFilter] = useState<NotificationType | 'all'>('all')

  const scopeNotifications = warehouseId
    ? notifications.filter((n) => n.warehouseId === warehouseId)
    : notifications

  const scopeUnread = scopeNotifications.filter((n) => !n.read).length

  const filtered = filter === 'all' ? scopeNotifications : scopeNotifications.filter((n) => n.type === filter)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold">
            {warehouseName ? `Notifications — ${warehouseName}` : 'Notifications'}
          </h2>
          {scopeUnread > 0 && (
            <span className="flex items-center gap-1 rounded-full bg-destructive/10 px-2.5 py-0.5 text-xs font-medium text-destructive">
              <BellDot className="h-3 w-3" /> {scopeUnread} non lue{scopeUnread > 1 ? 's' : ''}
            </span>
          )}
        </div>
        <div className="flex gap-2">
          {scopeUnread > 0 && (
            <Button variant="outline" size="sm" onClick={markAllRead}>
              <CheckCheck className="mr-1 h-4 w-4" /> Tout marquer lu
            </Button>
          )}
          {scopeNotifications.length > 0 && (
            <Button variant="ghost" size="sm" onClick={clearAll} className="text-destructive hover:text-destructive">
              <Trash2 className="mr-1 h-4 w-4" /> Tout effacer
            </Button>
          )}
        </div>
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={cn(
              'rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
              filter === f.value
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-accent hover:text-foreground'
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Liste */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Bell className="mb-3 h-12 w-12" />
          <p className="text-sm font-medium">Aucune notification</p>
          <p className="text-xs">{filter === 'all' ? (warehouseId ? 'Aucune notification pour cet entrepôt' : 'Rien pour le moment') : 'Aucune dans cette catégorie'}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((n) => {
            const Icon = TYPE_ICONS[n.type]
            return (
              <div
                key={n.id}
                className={cn(
                  'flex items-start gap-4 rounded-lg border p-4 transition-colors',
                  !n.read && 'bg-accent/30 border-primary/20'
                )}
              >
                <div className={cn('mt-0.5 flex h-8 w-8 items-center justify-center rounded-full text-white', typeToColor(n.type))}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium">{n.title}</p>
                      <p className="text-sm text-muted-foreground mt-0.5">{n.description}</p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      {!n.read && (
                        <button
                          onClick={() => markRead(n.id)}
                          className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                          title="Marquer lu"
                        >
                          <CheckCheck className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => dismiss(n.id)}
                        className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                        title="Supprimer"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    {new Date(n.createdAt).toLocaleString('fr-FR', {
                      day: 'numeric', month: 'long', year: 'numeric',
                      hour: '2-digit', minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default Notifications
