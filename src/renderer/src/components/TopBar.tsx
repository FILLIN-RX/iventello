import { useEffect, useState, useRef } from 'react'
import { Moon, Sun, Bell, BellDot, CheckCheck, X, ShoppingCart, Package, AlertTriangle, AlertOctagon, Info } from 'lucide-react'
import { Button } from './ui/button'
import { cn } from '@/lib/utils'
import { useNotifications, typeToColor } from '@/stores/notificationStore'

interface TopBarProps {
  dark: boolean
  onToggleDark: () => void
  onViewAll?: () => void
}

function typeIcon(type: string) {
  switch (type) {
    case 'vente': return <ShoppingCart className="h-3.5 w-3.5" />
    case 'produit_cree': return <Package className="h-3.5 w-3.5" />
    case 'stock_alerte': return <AlertTriangle className="h-3.5 w-3.5" />
    case 'stock_critique': return <AlertOctagon className="h-3.5 w-3.5" />
    default: return <Info className="h-3.5 w-3.5" />
  }
}

export function TopBar({ dark, onToggleDark, onViewAll }: TopBarProps) {
  const [notifOpen, setNotifOpen] = useState(false)
  const notifRef = useRef<HTMLDivElement>(null)
  const { notifications, unreadCount, markRead, markAllRead, dismiss, checkAlerts } = useNotifications()

  useEffect(() => {
    checkAlerts()
    const interval = setInterval(checkAlerts, 30_000)
    return () => clearInterval(interval)
  }, [checkAlerts])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <header className="flex h-14 items-center justify-between border-b bg-card px-6">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
          <Package className="h-4 w-4 text-primary-foreground" />
        </div>
        <span className="text-sm font-semibold">Gestion Stock & Caisse</span>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="relative" onClick={() => setNotifOpen(!notifOpen)}>
          {unreadCount > 0 ? (
            <>
              <BellDot className="h-4 w-4" />
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            </>
          ) : (
            <Bell className="h-4 w-4" />
          )}
        </Button>

        <Button variant="ghost" size="icon" onClick={onToggleDark}>
          {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
      </div>

      {notifOpen && (
        <div
          ref={notifRef}
          className="absolute right-6 top-14 z-50 w-80 rounded-lg border bg-popover shadow-lg"
        >
          <div className="flex items-center justify-between border-b px-4 py-3">
            <span className="text-sm font-semibold">Notifications</span>
            <div className="flex gap-1">
              {unreadCount > 0 && (
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={markAllRead}>
                  <CheckCheck className="mr-1 h-3 w-3" /> Tout lire
                </Button>
              )}
            </div>
          </div>

          <div className="max-h-[300px] overflow-y-auto">
            {notifications.length === 0 && (
              <p className="p-4 text-center text-sm text-muted-foreground">Aucune notification</p>
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
                  {typeIcon(n.type)}
                </div>
                <div className="flex-1 space-y-0.5 min-w-0">
                  <p className="font-medium text-xs">{n.title}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2">{n.description}</p>
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

          {onViewAll && notifications.length > 0 && (
            <div className="border-t p-2">
              <Button variant="ghost" size="sm" className="w-full text-xs" onClick={onViewAll}>
                Voir toutes les notifications
              </Button>
            </div>
          )}
        </div>
      )}
    </header>
  )
}
