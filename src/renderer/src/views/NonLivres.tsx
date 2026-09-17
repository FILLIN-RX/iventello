import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Truck, Search, Clock, CheckCircle2, AlertCircle, Phone, Package,
  Wallet, DollarSign, Calendar, MessageSquare, ArrowRight, X,
  FileText, ShieldCheck, Check, RefreshCw
} from 'lucide-react'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Badge } from '../components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '../components/ui/dialog'
import { useEntrepotStore } from '../stores/entrepotStore'
import { useCashRegisterStore } from '../stores/cashRegisterStore'
import { feedback } from '../stores/feedbackStore'
import { formatCurrency } from '@/lib/utils'
import type { SaleWithClient } from '../../../shared/types'

export default function NonLivres() {
  const selectedId = useEntrepotStore((s) => s.selectedId)
  const queryClient = useQueryClient()

  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'NON_LIVRE' | 'DISPONIBLE'>('ALL')
  const [deliveryModalSale, setDeliveryModalSale] = useState<SaleWithClient | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<'ESPECES' | 'CARTE_BANCAIRE' | 'MOBILE_MONEY' | 'VIREMENT'>('ESPECES')

  // Fetch pending delivery sales
  const { data: pendingSales = [], isLoading, isFetching, refetch } = useQuery<SaleWithClient[]>({
    queryKey: ['pending-deliveries', selectedId],
    queryFn: () => window.api.getPendingDeliveries(selectedId || undefined)
  })

  // Delivery mutation
  const deliverMutation = useMutation({
    mutationFn: async ({ saleId, method }: { saleId: string; method: string }) => {
      return window.api.deliverSale(saleId, method)
    },
    onSuccess: (updatedSale) => {
      queryClient.invalidateQueries({ queryKey: ['pending-deliveries'] })
      queryClient.invalidateQueries({ queryKey: ['cash-transactions'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      queryClient.invalidateQueries({ queryKey: ['global-stats'] })
      if (selectedId) {
        useCashRegisterStore.getState().fetchDailyData(selectedId)
      }
      
      const avance = updatedSale.montantAvance ?? 0
      const reste = Math.max(0, updatedSale.finalTotal - avance)
      
      feedback.toast.success(
        'Livraison effectuée & Encaissée !',
        `Facture N° ${updatedSale.invoiceNumber} — ${reste > 0 ? `${formatCurrency(reste)} encaissé(s) dans le cahier de caisse.` : 'Commande livrée (déjà réglée).'}`
      )
      setDeliveryModalSale(null)
    },
    onError: (err: any) => {
      console.error(err)
      feedback.toast.error(err?.message || 'Erreur lors de la livraison et de l\'encaissement', 'Erreur')
    }
  })

  // Update status (e.g. mark DISPONIBLE / ready for pickup)
  const updateStatusMutation = useMutation({
    mutationFn: async ({ saleId, status }: { saleId: string; status: 'NON_LIVRE' | 'DISPONIBLE' | 'LIVRE' }) => {
      return window.api.updateDeliveryStatus(saleId, status)
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['pending-deliveries'] })
      if (selectedId) {
        useCashRegisterStore.getState().fetchDailyData(selectedId)
      }
      if (variables.status === 'DISPONIBLE') {
        feedback.toast.success('Commande marquée disponible !', 'L\'article est arrivé en boutique et prêt à être retiré.')
      }
    }
  })

  // Notify client mutation
  const notifyMutation = useMutation({
    mutationFn: async (saleId: string) => {
      return window.api.notifySaleClient(saleId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-deliveries'] })
      feedback.toast.success('Client notifié', 'Le signalement d\'arrivage a été enregistré.')
    }
  })

  // Filtered pending sales
  const filteredSales = useMemo(() => {
    return pendingSales.filter(s => {
      if (filterStatus === 'NON_LIVRE' && s.deliveryStatus !== 'NON_LIVRE') return false
      if (filterStatus === 'DISPONIBLE' && s.deliveryStatus !== 'DISPONIBLE') return false

      const q = search.toLowerCase().trim()
      if (!q) return true

      const invoiceMatch = s.invoiceNumber.toLowerCase().includes(q)
      const clientNameMatch = s.client?.name.toLowerCase().includes(q)
      const clientPhoneMatch = s.client?.phone?.toLowerCase().includes(q)
      const itemMatch = s.items.some(i => 
        (i.product?.name && i.product.name.toLowerCase().includes(q)) ||
        (i.book?.title && i.book.title.toLowerCase().includes(q))
      )

      return invoiceMatch || clientNameMatch || clientPhoneMatch || itemMatch
    })
  }, [pendingSales, search, filterStatus])

  // Aggregate stats
  const totalCount = pendingSales.length
  const totalValue = pendingSales.reduce((acc, s) => acc + s.finalTotal, 0)
  const totalAvances = pendingSales.reduce((acc, s) => acc + (s.montantAvance ?? 0), 0)
  const totalReste = Math.max(0, totalValue - totalAvances)

  const nonLivresCount = pendingSales.filter(s => s.deliveryStatus !== 'DISPONIBLE').length
  const disponiblesCount = pendingSales.filter(s => s.deliveryStatus === 'DISPONIBLE').length

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 text-foreground">
            <Truck className="h-6 w-6 text-amber-500" /> Commandes Non Livrées
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Suivi des produits en attente de livraison, encaissement des soldes et gestion des arrivages
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="gap-1.5"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
          <div className="rounded-lg bg-amber-500 px-4 py-1.5 text-sm font-bold text-white shadow-sm">
            {totalCount} commande{totalCount !== 1 ? 's' : ''} en attente
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Articles non livrés</span>
            <div className="rounded-lg bg-amber-500/10 p-2 text-amber-600 dark:text-amber-400">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold tabular-nums text-foreground">{totalCount}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {disponiblesCount} disponible(s) en boutique
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Valeur totale</span>
            <div className="rounded-lg bg-blue-500/10 p-2 text-blue-600 dark:text-blue-400">
              <Package className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold tabular-nums text-foreground">{formatCurrency(totalValue)}</p>
          <p className="text-xs text-muted-foreground mt-1">Valeur des commandes en attente</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Avances encaissées</span>
            <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-600 dark:text-emerald-400">
              <Wallet className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">{formatCurrency(totalAvances)}</p>
          <p className="text-xs text-muted-foreground mt-1">Acompte déjà versé par les clients</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-sm bg-gradient-to-br from-amber-500/5 to-orange-500/10 dark:from-amber-950/20 dark:to-orange-950/30 border-amber-500/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-amber-800 dark:text-amber-300 uppercase tracking-wider">Reste à Encaisser</span>
            <div className="rounded-lg bg-amber-500 p-2 text-white shadow-sm">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold tabular-nums text-amber-900 dark:text-amber-200">{formatCurrency(totalReste)}</p>
          <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
            À percevoir à la livraison (se déduit au fur et à mesure)
          </p>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher par N° facture, client, téléphone, produit ou livre..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10 h-11 rounded-lg"
          />
        </div>

        <div className="flex gap-2">
          <Button
            variant={filterStatus === 'ALL' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterStatus('ALL')}
            className="h-11"
          >
            Tous ({pendingSales.length})
          </Button>
          <Button
            variant={filterStatus === 'NON_LIVRE' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterStatus('NON_LIVRE')}
            className="h-11"
          >
            En attente ({nonLivresCount})
          </Button>
          <Button
            variant={filterStatus === 'DISPONIBLE' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterStatus('DISPONIBLE')}
            className="h-11"
          >
            Disponibles ({disponiblesCount})
          </Button>
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-primary border-t-transparent" />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && filteredSales.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-center bg-card/50">
          <Truck className="h-12 w-12 text-emerald-500/60 mb-3" />
          <p className="text-base font-semibold text-foreground">
            {search || filterStatus !== 'ALL'
              ? 'Aucune commande ne correspond à vos critères'
              : 'Toutes les commandes ont été livrées et encaissées !'}
          </p>
          <p className="text-xs text-muted-foreground mt-1 max-w-md">
            {search || filterStatus !== 'ALL'
              ? 'Essayez de modifier votre recherche ou vos filtres.'
              : 'Lorsqu\'une nouvelle commande avec livraison en attente est créée à la caisse, elle apparaîtra automatiquement ici.'}
          </p>
        </div>
      )}

      {/* Deliveries List */}
      {!isLoading && filteredSales.length > 0 && (
        <div className="space-y-4">
          {filteredSales.map((sale) => {
            const avance = sale.montantAvance ?? 0
            const reste = Math.max(0, sale.finalTotal - avance)
            const isDisponible = sale.deliveryStatus === 'DISPONIBLE'

            return (
              <div
                key={sale.id}
                className="rounded-xl border border-border bg-card p-5 shadow-sm hover:border-border/80 transition-all"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Info principale */}
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="font-mono text-sm font-bold text-foreground bg-muted px-2.5 py-1 rounded-md">
                        N° {sale.invoiceNumber}
                      </span>

                      <Badge
                        variant="secondary"
                        className={isDisponible
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200'
                        }
                      >
                        {isDisponible ? 'Prêt à être retiré / Arrivé' : 'En attente d\'arrivage'}
                      </Badge>

                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {new Date(sale.createdAt).toLocaleDateString('fr-FR', {
                          day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
                        })}
                      </span>
                    </div>

                    {/* Client info */}
                    <div className="flex items-center gap-4 flex-wrap text-sm text-foreground">
                      <span className="font-semibold flex items-center gap-1.5">
                        👤 Client : {sale.client?.name || 'Client comptant'}
                      </span>
                      {sale.client?.phone && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Phone className="h-3.5 w-3.5 text-emerald-600" />
                          {sale.client.phone}
                        </span>
                      )}
                      {sale.warehouse?.name && (
                        <span className="text-xs text-muted-foreground">
                          • Boutique : {sale.warehouse.name}
                        </span>
                      )}
                    </div>

                    {/* Articles list */}
                    <div className="bg-muted/40 rounded-lg p-3 text-xs space-y-1.5 border border-border/50">
                      <p className="font-medium text-muted-foreground uppercase text-[10px] tracking-wider mb-1">
                        Articles commandés ({sale.items.length})
                      </p>
                      {sale.items.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between text-foreground">
                          <span className="font-medium">
                            • {item.product?.name || item.book?.title || 'Article'} (Quantité : {item.quantity})
                          </span>
                          <span className="tabular-nums font-semibold">
                            {formatCurrency(item.quantity * item.unitPrice)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Financial & Actions section */}
                  <div className="flex flex-col sm:flex-row lg:flex-col items-end justify-between gap-4 border-t lg:border-t-0 lg:border-l border-border pt-4 lg:pt-0 lg:pl-6 min-w-[240px]">
                    {/* Amounts */}
                    <div className="text-right space-y-1 w-full sm:w-auto">
                      <div className="flex items-center justify-between sm:justify-end gap-3 text-xs">
                        <span className="text-muted-foreground">Total commande :</span>
                        <span className="font-semibold tabular-nums">{formatCurrency(sale.finalTotal)}</span>
                      </div>
                      <div className="flex items-center justify-between sm:justify-end gap-3 text-xs">
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium">Avance versée :</span>
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                          {formatCurrency(avance)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between sm:justify-end gap-3 text-sm pt-1 border-t border-border">
                        <span className="font-bold text-amber-700 dark:text-amber-400">Reste à Encaisser :</span>
                        <span className="font-extrabold text-base text-amber-600 dark:text-amber-400 tabular-nums">
                          {formatCurrency(reste)}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
                      {!isDisponible && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateStatusMutation.mutate({ saleId: sale.id, status: 'DISPONIBLE' })}
                          disabled={updateStatusMutation.isPending}
                          className="gap-1.5 text-xs border-blue-200 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-blue-700 dark:text-blue-300"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 text-blue-600" />
                          Marquer disponible
                        </Button>
                      )}

                      {sale.client?.phone && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => notifyMutation.mutate(sale.id)}
                          disabled={notifyMutation.isPending}
                          title="Notifier le client par téléphone / appel"
                          className="h-9 px-2 text-xs"
                        >
                          <MessageSquare className="h-3.5 w-3.5 text-emerald-600 mr-1" />
                          {sale.notifiedAt ? 'Notifié' : 'Notifier'}
                        </Button>
                      )}

                      <Button
                        size="sm"
                        onClick={() => {
                          setDeliveryModalSale(sale)
                          setPaymentMethod((sale.paymentMethod as any) || 'ESPECES')
                        }}
                        className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-sm"
                      >
                        <ShieldCheck className="h-4 w-4" />
                        Livrer & Encaisser ({formatCurrency(reste)})
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal de Confirmation de Livraison & Encaissement */}
      {deliveryModalSale && (
        <Dialog open={Boolean(deliveryModalSale)} onOpenChange={(open) => !open && setDeliveryModalSale(null)}>
          <DialogContent className="max-w-md p-6">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg font-bold">
                <ShieldCheck className="h-5 w-5 text-emerald-600" />
                Confirmer la livraison & Encaisser
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 my-2">
              <div className="bg-muted p-3.5 rounded-lg space-y-2 text-xs">
                <div className="flex justify-between font-semibold">
                  <span>Facture N° {deliveryModalSale.invoiceNumber}</span>
                  <span>{deliveryModalSale.client?.name || 'Client comptant'}</span>
                </div>
                <div className="divide-y divide-border/60">
                  {deliveryModalSale.items.map((it, idx) => (
                    <div key={idx} className="py-1 flex justify-between text-muted-foreground">
                      <span>• {it.product?.name || it.book?.title || 'Article'} (×{it.quantity})</span>
                      <span>{formatCurrency(it.quantity * it.unitPrice)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Financial Recap */}
              <div className="space-y-1.5 text-sm rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4">
                <div className="flex justify-between text-muted-foreground text-xs">
                  <span>Montant total de la commande :</span>
                  <span className="font-semibold">{formatCurrency(deliveryModalSale.finalTotal)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground text-xs">
                  <span>Avance déjà encaissée :</span>
                  <span className="font-semibold text-emerald-600">{formatCurrency(deliveryModalSale.montantAvance ?? 0)}</span>
                </div>
                <div className="flex justify-between text-base font-bold pt-2 border-t border-emerald-500/20 text-emerald-800 dark:text-emerald-300">
                  <span>Solde à encaisser maintenant :</span>
                  <span className="tabular-nums">
                    {formatCurrency(Math.max(0, deliveryModalSale.finalTotal - (deliveryModalSale.montantAvance ?? 0)))}
                  </span>
                </div>
              </div>

              {/* Selecteur mode de paiement */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Mode d'encaissement du solde :
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'ESPECES', label: 'Espèces' },
                    { id: 'MOBILE_MONEY', label: 'Mobile Money' },
                    { id: 'CARTE_BANCAIRE', label: 'Carte Bancaire' },
                    { id: 'VIREMENT', label: 'Virement' },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setPaymentMethod(m.id as any)}
                      className={`px-3 py-2 text-xs font-semibold rounded-lg border text-center transition-all ${
                        paymentMethod === m.id
                          ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                          : 'bg-card text-muted-foreground border-border hover:bg-muted'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <span>
                  Cette action déduira les articles du stock physique et enregistrera l'entrée de caisse avec trace d'audit complète.
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3">
              <Button variant="outline" onClick={() => setDeliveryModalSale(null)} disabled={deliverMutation.isPending}>
                Annuler
              </Button>
              <Button
                onClick={() => deliverMutation.mutate({ saleId: deliveryModalSale.id, method: paymentMethod })}
                disabled={deliverMutation.isPending}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1.5"
              >
                {deliverMutation.isPending ? 'Encaissement...' : 'Valider livraison & Encaisser'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
