import { useState } from 'react'
import { Plus, ShoppingCart, Satellite, Bug, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FloatingActionsProps {
  onNavigate: (view: string) => void
}

export function FloatingActions({ onNavigate }: FloatingActionsProps) {
  const [open, setOpen] = useState(false)

  const actions = [
    { id: 'caisse', label: 'Nouvelle vente', icon: ShoppingCart, color: 'bg-emerald-500 hover:bg-emerald-600' },
    { id: 'canal-plus', label: 'Canal+', icon: Satellite, color: 'bg-blue-500 hover:bg-blue-600' },
    { id: 'bug-report', label: 'Signaler un bug', icon: Bug, color: 'bg-amber-500 hover:bg-amber-600' },
  ]

  function handleClick(id: string) {
    setOpen(false)
    if (id === 'bug-report') {
      // TODO: intégrer le système de rapport de bugs
      return
    }
    onNavigate(id)
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {open && (
        <div className="flex flex-col items-end gap-2" data-state={open ? 'open' : 'closed'}>
          {actions.map((action) => {
            const Icon = action.icon
            return (
              <button
                key={action.id}
                onClick={() => handleClick(action.id)}
                className={cn(
                  'flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium text-white shadow-lg transition-all hover:scale-105',
                  action.color
                )}
              >
                <span className="whitespace-nowrap">{action.label}</span>
                <Icon className="h-4 w-4 shrink-0" />
              </button>
            )
          })}
        </div>
      )}
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'flex h-14 w-14 items-center justify-center rounded-full shadow-xl transition-all',
          open
            ? 'bg-muted-foreground hover:bg-muted-foreground/90 rotate-45'
            : 'bg-primary hover:bg-primary/90'
        )}
      >
        {open ? (
          <X className="h-6 w-6 text-white" />
        ) : (
          <Plus className="h-6 w-6 text-primary-foreground" />
        )}
      </button>
    </div>
  )
}
