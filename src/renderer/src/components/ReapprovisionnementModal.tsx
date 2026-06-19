import { useState } from 'react'
import { Package, Minus, Plus, RotateCw } from 'lucide-react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Switch } from './ui/switch'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from './ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from './ui/dialog'
import type { ProductWithRelations } from '../../../shared/types'
import { formatCurrency } from '@/lib/utils'

interface Props {
  open: boolean
  onClose: () => void
  product: ProductWithRelations | null
  warehouseId: string
  warehouseName?: string
  onSuccess: () => void
}

export function ReapprovisionnementModal({ open, onClose, product, warehouseId, warehouseName, onSuccess }: Props) {
  const [quantity, setQuantity] = useState(1)
  const [unitPrice, setUnitPrice] = useState(product?.basePrice?.toString() ?? '0')
  const [considerAsPurchase, setConsiderAsPurchase] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState('ESPECES')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const currentStock = product?.stocks?.find((s) => s.warehouseId === warehouseId)

  async function handleSubmit() {
    if (!product || !warehouseId) return
    if (quantity < 1) { setError('La quantité doit être supérieure à 0'); return }
    setSaving(true)
    setError(null)
    try {
      await window.api.restockProduct({
        productId: product.id,
        warehouseId,
        quantity,
        unitPrice: considerAsPurchase ? (parseFloat(unitPrice) || 0) : 0,
        considerAsPurchase,
        paymentMethod: considerAsPurchase ? paymentMethod : undefined
      })
      onSuccess()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RotateCw className="h-5 w-5 text-primary" />
            Réapprovisionnement
            {warehouseName && <span className="text-sm font-normal text-muted-foreground">— {warehouseName}</span>}
          </DialogTitle>
        </DialogHeader>

        {product && (
          <div className="space-y-4">
            {/* Produit */}
            <div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Package className="h-6 w-6" />
              </div>
              <div>
                <p className="font-semibold text-sm">{product.name}</p>
                <p className="text-xs text-muted-foreground font-mono">{product.barcode}</p>
                <p className="text-xs text-muted-foreground">
                  Prix d'achat: {formatCurrency(product.basePrice)}
                  {currentStock && <> — Stock actuel: <span className={currentStock.quantity <= currentStock.alertLimit ? 'text-destructive font-bold' : ''}>{currentStock.quantity}</span></>}
                </p>
              </div>
            </div>

            {/* Quantité */}
            <div className="space-y-1.5">
              <Label>Quantité</Label>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={() => setQuantity(Math.max(1, quantity - 1))}>
                  <Minus className="h-4 w-4" />
                </Button>
                <Input
                  type="number"
                  min={1}
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="text-center"
                />
                <Button variant="outline" size="icon" onClick={() => setQuantity(quantity + 1)}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Considérer comme achat */}
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label htmlFor="consider-purchase" className="font-medium">Considérer comme un achat</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Enregistre une sortie de caisse et met à jour le stock
                </p>
              </div>
              <Switch
                id="consider-purchase"
                checked={considerAsPurchase}
                onCheckedChange={setConsiderAsPurchase}
              />
            </div>

            {considerAsPurchase && (
              <>
                {/* Prix unitaire — prérempli avec le prix d'achat */}
                <div className="space-y-1.5">
                  <Label>Prix d'achat unitaire</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min={0}
                    value={unitPrice}
                    onChange={(e) => setUnitPrice(e.target.value)}
                  />
                </div>

                {/* Mode de paiement */}
                <div className="space-y-1.5">
                  <Label>Mode de paiement</Label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ESPECES">Espèces</SelectItem>
                      <SelectItem value="OM">Orange Money</SelectItem>
                      <SelectItem value="MTN">MTN Mobile Money</SelectItem>
                      <SelectItem value="CARTE">Carte bancaire</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Total */}
                <div className="rounded-lg bg-muted p-3 text-sm">
                  <span className="text-muted-foreground">Total achat: </span>
                  <span className="font-bold">{formatCurrency((parseFloat(unitPrice) || 0) * quantity)}</span>
                </div>
              </>
            )}

            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={handleSubmit} disabled={saving || !product || !warehouseId}>
            {saving ? 'En cours...' : 'Confirmer le réapprovisionnement'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
