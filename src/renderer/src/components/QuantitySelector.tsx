import { useState, useEffect } from 'react'
import { Minus, Plus, AlertTriangle, CheckCircle } from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'

interface QuantitySelectorProps {
  currentStock: number
  unitPrice: number
  type: 'ENTREE' | 'SORTIE'
  onChange: (qty: number, total: number) => void
}

export function QuantitySelector({ currentStock, unitPrice, type, onChange }: QuantitySelectorProps) {
  const [quantity, setQuantity] = useState(1)
  const isVente = type === 'ENTREE'
  const isOut = isVente && quantity >= currentStock
  const total = quantity * unitPrice

  useEffect(() => {
    onChange(quantity, total)
  }, [quantity, unitPrice, type])

  function handleIncrement() {
    if (isVente && quantity >= currentStock) return
    setQuantity(q => q + 1)
  }

  function handleDecrement() {
    if (quantity > 1) setQuantity(q => q - 1)
  }

  return (
    <div className="space-y-3 rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">Quantité</span>
        <div className="flex items-center gap-1 rounded-full border bg-background p-1">
          <button
            type="button"
            onClick={handleDecrement}
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <Minus className="h-4 w-4" />
          </button>
          <span className="flex h-8 w-12 items-center justify-center text-base font-bold tabular-nums">{quantity}</span>
          <button
            type="button"
            onClick={handleIncrement}
            disabled={isVente && quantity >= currentStock}
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-1.5 text-xs">
        {isVente ? (
          quantity >= currentStock ? (
            <span className="flex items-center gap-1 font-semibold text-amber-500">
              <AlertTriangle className="h-3.5 w-3.5" /> Stock max: {currentStock}
            </span>
          ) : (
            <span className="flex items-center gap-1 font-medium text-emerald-500">
              <CheckCircle className="h-3.5 w-3.5" /> Restant: {currentStock - quantity} unités
            </span>
          )
        ) : (
          <span className="flex items-center gap-1 font-medium text-blue-500">
            <CheckCircle className="h-3.5 w-3.5" /> Stock projeté: {currentStock + quantity} unités
          </span>
        )}
      </div>

      <div className="flex items-center justify-between border-t pt-2.5 text-xs text-muted-foreground">
        <span>{quantity} × {formatCurrency(unitPrice)}</span>
        <span className={cn('text-base font-black', isVente ? 'text-emerald-500' : 'text-red-500')}>
          {isVente ? '+' : '-'}{formatCurrency(total)}
        </span>
      </div>
    </div>
  )
}
