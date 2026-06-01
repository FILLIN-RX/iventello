import { useState, useEffect } from 'react'
import { ArrowLeft, Mail, Phone, MapPin, FileText, Star, TrendingUp, ShoppingCart } from 'lucide-react'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import type { ClientStats, SaleWithClient } from '../../../shared/types'
import { formatCurrency } from '@/lib/utils'

interface Props {
  clientId: string
  onBack: () => void
  onUpdate: () => void
}

function ClientDetail({ clientId, onBack, onUpdate }: Props) {
  const [data, setData] = useState<(ClientStats & { sales: SaleWithClient[] }) | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      try { setLoading(true); setData(await window.api.getClient(clientId) as any) }
      catch { /* ignore */ } finally { setLoading(false) }
    })()
  }, [clientId])

  if (loading) return <p className="text-muted-foreground">Chargement...</p>
  if (!data) return <p className="text-destructive">Client introuvable.</p>

  const { client, totalSpent, purchaseCount, rank, sales } = data

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={onBack}><ArrowLeft className="mr-2 h-4 w-4" />Retour</Button>

      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold">{client.name}</h2>
            {rank === 'premium' && <Badge className="bg-yellow-500 text-white"><Star className="mr-1 h-3 w-3" />Meilleur client</Badge>}
            {rank === 'fidele' && <Badge variant="secondary"><TrendingUp className="mr-1 h-3 w-3" />Client fidèle</Badge>}
            {rank === 'standard' && <Badge variant="outline">Client régulier</Badge>}
          </div>
          <div className="mt-2 space-y-1 text-sm text-muted-foreground">
            {client.email && <p className="flex items-center gap-2"><Mail className="h-4 w-4" />{client.email}</p>}
            {client.phone && <p className="flex items-center gap-2"><Phone className="h-4 w-4" />{client.phone}</p>}
            {client.address && <p className="flex items-center gap-2"><MapPin className="h-4 w-4" />{client.address}</p>}
            {client.notes && <p className="mt-2 italic">{client.notes}</p>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold">{purchaseCount}</p><p className="text-xs text-muted-foreground">Achats</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-green-600">{formatCurrency(totalSpent)}</p><p className="text-xs text-muted-foreground">Total dépensé</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold">{sales.length > 0 ? new Date(sales[0].createdAt).toLocaleDateString('fr-FR') : '—'}</p><p className="text-xs text-muted-foreground">Dernier achat</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" />Factures ({sales.length})</CardTitle></CardHeader>
        <CardContent>
          {sales.length === 0 && <p className="text-sm text-muted-foreground">Aucune facture.</p>}
          {sales.length > 0 && (
            <div className="space-y-2">
              {sales.map((sale) => (
                <div key={sale.id} className="flex items-center justify-between rounded-md border p-3">
                  <div>
                    <p className="text-sm font-medium">
                      {new Date(sale.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {sale.paymentMethod}  |  {sale.warehouse.name}  |  {sale.items?.length ?? 0} article(s)
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{formatCurrency(sale.finalTotal)}</p>
                    {sale.discount > 0 && <p className="text-xs text-muted-foreground">Remise: -{formatCurrency(sale.discount)}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default ClientDetail
