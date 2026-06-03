import { useEffect, useState } from 'react'
import { Percent, Search, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { Input } from '../components/ui/input'
import { Badge } from '../components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../components/ui/select'
import { useEntrepotStore } from '../stores/entrepotStore'
import { formatCurrency } from '@/lib/utils'
import type { DiscountWithSale } from '../../../shared/types'

const PAYMENT_LABELS: Record<string, string> = {
  Cash: 'Espèces', 'Mobile Money': 'Mobile Money', Carte: 'Carte bancaire',
  ESPECES: 'Espèces', OM: 'Orange Money', MTN: 'MTN Mobile Money',
}

export default function Remises() {
  const { selectedId } = useEntrepotStore()
  const [discounts, setDiscounts] = useState<DiscountWithSale[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    setLoading(true)
    window.api.getDiscounts(selectedId ?? undefined).then((list) => {
      setDiscounts(list)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [selectedId])

  const filtered = discounts.filter((d) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      d.sale?.id?.toLowerCase().includes(q) ||
      d.sale?.client?.name?.toLowerCase().includes(q)
    )
  })

  const totalRemises = discounts.reduce((s, d) => s + d.amount, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Percent className="h-6 w-6 text-primary" /> Remises accordées
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Historique des remises appliquées sur les ventes.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total remises</p>
            <p className="mt-1 text-2xl font-black text-red-600">{formatCurrency(totalRemises)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Nombre de remises</p>
            <p className="mt-1 text-2xl font-black">{discounts.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Moyenne par remise</p>
            <p className="mt-1 text-2xl font-black">
              {discounts.length > 0 ? formatCurrency(totalRemises / discounts.length) : formatCurrency(0)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recherche */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Rechercher par vente ou client..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Liste */}
      {loading ? (
        <p className="text-center text-sm text-muted-foreground py-12">Chargement...</p>
      ) : filtered.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-12">
          {search ? 'Aucune remise trouvée.' : 'Aucune remise enregistrée.'}
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/40 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Vente</th>
                <th className="px-4 py-3 text-left">Client</th>
                <th className="px-4 py-3 text-right">Montant remisé</th>
                <th className="px-4 py-3 text-right">Total vente</th>
                <th className="px-4 py-3 text-left">Paiement</th>
                <th className="px-4 py-3 text-left">Entrepôt</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((d) => (
                <tr key={d.id} className="group transition-colors hover:bg-muted/30">
                  <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">
                    {new Date(d.createdAt).toLocaleDateString('fr-FR', {
                      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm font-mono font-medium">
                      N° {d.sale?.invoiceNumber ?? d.saleId.slice(0, 8).toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {d.sale?.client?.name ?? (
                      <span className="text-muted-foreground italic">Anonyme</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-base font-bold text-red-600">
                      -{formatCurrency(d.amount)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-base font-bold tabular-nums">
                    {formatCurrency(d.sale?.finalTotal ?? 0)}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className="text-[10px]">
                      {PAYMENT_LABELS[d.sale?.paymentMethod] ?? d.sale?.paymentMethod}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {d.warehouse?.name ?? '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
