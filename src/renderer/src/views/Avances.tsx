import { useEffect, useState, useMemo } from 'react'
import {
  Clock,
  Search,
  User,
  Eye,
  Unlock,
  Building2,
  Package,
  Calendar,
  PhoneCall,
  MessageSquare,
  Truck,
  Sparkles,
  Send
} from 'lucide-react'
import { Input } from '../components/ui/input'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { Card, CardContent } from '../components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog'
import { FactureDetailModal } from '../components/FactureDetailModal'
import { feedback } from '../stores/feedbackStore'
import { useCashRegisterStore } from '../stores/cashRegisterStore'
import type { SaleWithClient, ProductWithRelations } from '../../../shared/types'
import { formatCurrency } from '@/lib/utils'

export default function Avances() {
  const [sales, setSales] = useState<SaleWithClient[]>([])
  const [products, setProducts] = useState<ProductWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState<'all' | 'reservations' | 'non_livres'>('all')
  const [selectedSale, setSelectedSale] = useState<SaleWithClient | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // Modal pour prévenir le client
  const [notifyModalSale, setNotifyModalSale] = useState<SaleWithClient | null>(null)
  const [customNotifyMsg, setCustomNotifyMsg] = useState('')

  function load() {
    setLoading(true)
    Promise.all([
      window.api.getSales(),
      window.api.getProducts().catch(() => [])
    ])
      .then(([s, p]: any) => {
        setSales(s || [])
        setProducts(p || [])
        setLoading(false)
        useCashRegisterStore.getState().fetchDailyData('')
      })
      .catch((err: any) => {
        feedback.toast.error(err?.message || 'Erreur lors du chargement des avances')
        setLoading(false)
      })
  }

  useEffect(() => {
    load()
  }, [])

  // Filtrer les ventes selon leur type (Avance sur stock réservé OU Commande non livrée)
  const allAvancesAndOrders = useMemo(() => {
    return sales.filter((s) => {
      if (s.status === 'ANNULE') return false
      const isPendingDeliv = (s as any).isPendingDelivery === true || (s as any).deliveryStatus === 'NON_LIVRE' || (s as any).deliveryStatus === 'DISPONIBLE'
      const avance = (s as any).montantAvance as number | null
      const reste = s.finalTotal - (avance ?? s.finalTotal)

      // Cas 1 : Commande non livrée
      if (isPendingDeliv) return true

      // Cas 2 : Avance avec réservation de stock
      if (avance != null && (s.status === 'EN_ATTENTE' || (s.status === 'VALIDE' && reste > 0))) {
        return true
      }

      return false
    })
  }, [sales])

  // Filtrer selon l'onglet actif et la recherche
  const filtered = useMemo(() => {
    return allAvancesAndOrders.filter((s) => {
      const isPendingDeliv = (s as any).isPendingDelivery === true || (s as any).deliveryStatus === 'NON_LIVRE' || (s as any).deliveryStatus === 'DISPONIBLE'
      if (activeTab === 'reservations' && isPendingDeliv) return false
      if (activeTab === 'non_livres' && !isPendingDeliv) return false

      const q = search.toLowerCase()
      const clientName = (s.client?.name ?? 'anonyme').toLowerCase()
      const clientPhone = (s.client?.phone ?? '').toLowerCase()
      const invoice = s.invoiceNumber.toLowerCase()
      const warehouse = s.warehouse.name.toLowerCase()

      return clientName.includes(q) || clientPhone.includes(q) || invoice.includes(q) || warehouse.includes(q)
    })
  }, [allAvancesAndOrders, activeTab, search])

  // Calculs statistiques
  const totalAvancesPerceues = useMemo(() => {
    return filtered.reduce((sum, s) => sum + ((s as any).montantAvance ?? (s as any).isPendingDelivery ? s.finalTotal : 0), 0)
  }, [filtered])

  const totalRestant = useMemo(() => {
    return filtered.reduce((sum, s) => {
      const a = (s as any).montantAvance as number | null
      return sum + (a != null ? Math.max(0, s.finalTotal - a) : 0)
    }, 0)
  }, [filtered])

  const totalArticlesBloques = useMemo(() => {
    return allAvancesAndOrders
      .filter((s) => !(s as any).isPendingDelivery)
      .reduce((sum, s) => sum + (s.items?.reduce((isum, item) => isum + item.quantity, 0) ?? 0), 0)
  }, [allAvancesAndOrders])

  const totalCommandesNonLivrees = useMemo(() => {
    return allAvancesAndOrders.filter((s) => (s as any).isPendingDelivery).length
  }, [allAvancesAndOrders])

  // Vérifier si les produits d'une commande non livrée sont maintenant en stock
  function checkStockAvailability(sale: SaleWithClient) {
    if (!sale.items || sale.items.length === 0) return { ready: false, details: [] }
    let allReady = true
    const details = sale.items.map((item) => {
      const prod = products.find((p) => p.id === item.productId)
      const whStock = prod?.stocks?.find((st) => st.warehouse.id === sale.warehouseId)?.quantity ?? 0
      const available = whStock >= item.quantity
      if (!available) allReady = false
      return {
        name: prod?.name ?? (item as any).book?.title ?? 'Produit',
        orderedQty: item.quantity,
        currentStock: whStock,
        available
      }
    })
    return { ready: allReady, details }
  }

  // Déblocage / Annulation d'une avance avec restitution immédiate du stock
  function handleCancelAdvance(sale: SaleWithClient) {
    const isPendingDeliv = (sale as any).isPendingDelivery
    feedback.confirm({
      title: isPendingDeliv ? 'Annuler et rembourser cette commande ?' : 'Débloquer et annuler cette réservation ?',
      message: isPendingDeliv
        ? 'Cette action va annuler la commande client en attente de livraison et enregistrer le remboursement de la somme perçue dans la caisse.'
        : 'Cette action va annuler la réservation client, restituer tous les articles réservés au stock disponible de la boutique et enregistrer le remboursement de l\'avance dans la caisse.',
      itemName: `Facture #${sale.invoiceNumber}`,
      confirmLabel: isPendingDeliv ? 'Annuler la commande' : 'Débloquer le stock',
      variant: 'destructive',
      onConfirm: async () => {
        setActionLoading(sale.id)
        try {
          await window.api.cancelSale(sale.id)
          feedback.toast.success(
            isPendingDeliv ? 'Commande annulée' : 'Réservation débloquée',
            isPendingDeliv ? 'La commande a été annulée et remboursée.' : 'Les articles sont à nouveau disponibles en stock et l\'avance a été annulée.'
          )
          load()
        } catch (err: any) {
          feedback.toast.error(err?.message || 'Erreur lors de l\'annulation')
        } finally {
          setActionLoading(null)
        }
      }
    })
  }

  // Marquer une commande non livrée comme livrée (déduit le stock réapprovisionné)
  async function handleDeliverOrder(sale: SaleWithClient) {
    setActionLoading(sale.id)
    try {
      await window.api.deliverSale(sale.id)
      feedback.toast.success('Commande livrée avec succès', 'Le stock réapprovisionné a été déduit et la livraison est validée.')
      load()
    } catch (err: any) {
      feedback.toast.error(err?.message || 'Impossible de valider la livraison')
    } finally {
      setActionLoading(null)
    }
  }

  // Ouvrir le dialogue pour faire signe au client
  function openNotifyModal(sale: SaleWithClient) {
    setNotifyModalSale(sale)
    const clientName = sale.client?.name ?? 'Client'
    const itemsList = sale.items?.map((i) => (i as any).product?.name ?? (i as any).book?.title ?? 'Article').join(', ') ?? 'vos articles'
    setCustomNotifyMsg(
      `Bonjour ${clientName}, bonne nouvelle ! Votre commande de "${itemsList}" (Facture #${sale.invoiceNumber}) est bien arrivée et disponible dans notre magasin ${sale.warehouse.name}. Vous pouvez venir la récupérer.`
    )
  }

  // Confirmer l'envoi de notification au client
  async function handleSendNotification(method: 'whatsapp' | 'call') {
    if (!notifyModalSale) return
    const phone = notifyModalSale.client?.phone?.replace(/\s+/g, '') ?? ''

    try {
      await window.api.notifySaleClient(notifyModalSale.id)
      feedback.toast.success('Signalement client enregistré')
      load()
    } catch { /* ignorer */ }

    if (method === 'whatsapp') {
      let formattedPhone = phone
      if (!formattedPhone.startsWith('+') && formattedPhone.length === 9) {
        formattedPhone = `237${formattedPhone}` // Indicatif Cameroun par défaut si 9 chiffres
      }
      const waUrl = `https://wa.me/${formattedPhone.replace('+', '')}?text=${encodeURIComponent(customNotifyMsg)}`
      window.open(waUrl, '_blank')
    } else if (method === 'call') {
      window.location.href = `tel:${phone}`
    }

    setNotifyModalSale(null)
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* En-tête et métriques clés */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Clock className="h-6 w-6 text-amber-500" /> Avances, Réservations & Commandes Non Livrées
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Suivi des acomptes, des articles bloqués en boutique et des commandes en attente d'arrivage avec signalement client
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-xl border bg-card/60 p-3 text-right">
            <p className="text-[11px] font-medium text-muted-foreground">Articles bloqués</p>
            <p className="text-lg font-bold text-amber-600">{totalArticlesBloques} unité(s)</p>
          </div>
          <div className="rounded-xl border bg-card/60 p-3 text-right">
            <p className="text-[11px] font-medium text-muted-foreground">En attente d'arrivage</p>
            <p className="text-lg font-bold text-blue-600">{totalCommandesNonLivrees} commande(s)</p>
          </div>
          <div className="rounded-xl border bg-card/60 p-3 text-right">
            <p className="text-[11px] font-medium text-muted-foreground">Avances perçues</p>
            <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
              {formatCurrency(totalAvancesPerceues)}
            </p>
          </div>
          <div className="rounded-xl border bg-card/60 p-3 text-right">
            <p className="text-[11px] font-medium text-muted-foreground">Reste à percevoir</p>
            <p className="text-lg font-bold text-destructive">{formatCurrency(totalRestant)}</p>
          </div>
        </div>
      </div>

      {/* Onglets de filtrage & Barre de recherche */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Onglets */}
            <div className="flex items-center gap-1.5 p-1 rounded-lg bg-muted/60 border text-xs">
              <button
                type="button"
                className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                  activeTab === 'all'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                onClick={() => setActiveTab('all')}
              >
                Toutes ({allAvancesAndOrders.length})
              </button>
              <button
                type="button"
                className={`px-3 py-1.5 rounded-md font-medium transition-all flex items-center gap-1.5 ${
                  activeTab === 'reservations'
                    ? 'bg-background text-amber-600 shadow-sm font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                onClick={() => setActiveTab('reservations')}
              >
                🔒 Réservations sur stock ({allAvancesAndOrders.filter((s) => !(s as any).isPendingDelivery).length})
              </button>
              <button
                type="button"
                className={`px-3 py-1.5 rounded-md font-medium transition-all flex items-center gap-1.5 ${
                  activeTab === 'non_livres'
                    ? 'bg-background text-blue-600 shadow-sm font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                onClick={() => setActiveTab('non_livres')}
              >
                📦 En attente d'arrivage (Non livrés) ({totalCommandesNonLivrees})
              </button>
            </div>

            {/* Total affiché */}
            <span className="text-xs text-muted-foreground font-medium">
              {filtered.length} élément{filtered.length > 1 ? 's' : ''}
            </span>
          </div>

          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Rechercher par nom de client, numéro de téléphone, numéro de facture, boutique…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-10 rounded-lg"
            />
          </div>
        </CardContent>
      </Card>

      {/* Loader */}
      {loading && (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      )}

      {/* État vide */}
      {!loading && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
          <Clock className="h-10 w-10 text-muted-foreground/40 mb-2" />
          <p className="font-semibold text-muted-foreground text-sm">
            {search ? 'Aucun résultat correspondant' : 'Aucune avance ou commande en attente'}
          </p>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm">
            Toutes les ventes sont soit payées et livrées, soit le stock a été entièrement libéré.
          </p>
        </div>
      )}

      {/* Liste des avances et commandes */}
      {!loading && filtered.length > 0 && (
        <div className="space-y-3">
          {filtered.map((s) => {
            const isPendingDeliv = (s as any).isPendingDelivery === true || (s as any).deliveryStatus === 'NON_LIVRE' || (s as any).deliveryStatus === 'DISPONIBLE'
            const avance = (s as any).montantAvance as number | null ?? (isPendingDeliv ? s.finalTotal : 0)
            const reste = Math.max(0, s.finalTotal - avance)
            const reservedQty = s.items?.reduce((sum, item) => sum + item.quantity, 0) ?? 0
            const daysAgo = Math.floor(
              (Date.now() - new Date(s.createdAt).getTime()) / (1000 * 60 * 60 * 24)
            )
            const isLate = daysAgo >= 7
            const percentPaid = Math.round((avance / (s.finalTotal || 1)) * 100)

            const stockCheck = isPendingDeliv ? checkStockAvailability(s) : null
            const isStockArrived = stockCheck?.ready === true
            const notifiedAt = (s as any).notifiedAt ? new Date((s as any).notifiedAt) : null

            return (
              <Card
                key={s.id}
                className={`hover:shadow-md transition-all border ${
                  isPendingDeliv
                    ? isStockArrived
                      ? 'border-emerald-400 bg-emerald-50/15 dark:bg-emerald-950/10'
                      : 'border-blue-300 dark:border-blue-900 bg-blue-50/10'
                    : isLate
                    ? 'border-amber-400/60 bg-amber-50/10'
                    : ''
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    {/* Infos Principales */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-sm text-foreground">
                          {s.client?.name ?? 'Client anonyme'}
                        </p>
                        {s.client?.phone ? (
                          <span className="text-xs font-mono font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded">
                            📞 {s.client.phone}
                          </span>
                        ) : (
                          <Badge variant="destructive" className="text-[10px]">
                            ⚠️ Téléphone manquant
                          </Badge>
                        )}

                        {/* Badges de statut */}
                        {isPendingDeliv ? (
                          <>
                            <Badge
                              variant="outline"
                              className="text-[10px] bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950/40 dark:text-blue-400 font-bold"
                            >
                              📦 Commande Non Livrée
                            </Badge>
                            {isStockArrived ? (
                              <Badge className="text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1 animate-pulse">
                                <Sparkles className="h-3 w-3" /> Arrivé en stock ! (Prêt à livrer)
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="text-[10px] text-amber-700 dark:text-amber-400">
                                ⏳ En attente de réapprovisionnement
                              </Badge>
                            )}
                          </>
                        ) : (
                          <Badge
                            variant="outline"
                            className="text-[10px] bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-400 font-bold"
                          >
                            🔒 Stock Réservé en boutique
                          </Badge>
                        )}

                        {notifiedAt && (
                          <Badge variant="secondary" className="text-[10px] text-emerald-700 dark:text-emerald-300 font-medium">
                            ✓ Client prévenu le {notifiedAt.toLocaleDateString('fr-FR')} à {notifiedAt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                          </Badge>
                        )}

                        {isLate && (
                          <Badge variant="destructive" className="text-[10px] font-bold">
                            ⚠️ Ancienneté : {daysAgo} jours
                          </Badge>
                        )}
                      </div>

                      {/* Métadonnées facture */}
                      <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span className="font-mono font-medium text-foreground">
                          N° {s.invoiceNumber}
                        </span>
                        <span className="flex items-center gap-1">
                          <Building2 className="h-3 w-3" /> {s.warehouse.name}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(s.createdAt).toLocaleDateString('fr-FR', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}{' '}
                          ({daysAgo === 0 ? "Aujourd'hui" : `il y a ${daysAgo} j`})
                        </span>
                      </div>

                      {/* Progression du paiement */}
                      <div className="mt-2.5 max-w-md">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-muted-foreground">
                            Versé : <strong className="text-emerald-600">{formatCurrency(avance)}</strong> ({percentPaid}%)
                          </span>
                          <span>
                            {reste > 0 ? (
                              <>
                                Reste : <strong className="text-destructive">{formatCurrency(reste)}</strong>
                              </>
                            ) : (
                              <strong className="text-emerald-600">✓ Totalement payé</strong>
                            )}
                          </span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                            style={{ width: `${Math.min(100, Math.max(0, percentPaid))}%` }}
                          />
                        </div>
                      </div>

                      {/* Liste des articles et vérification de stock pour non livrés */}
                      {s.items && s.items.length > 0 && (
                        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                          <span className="text-xs text-muted-foreground mr-1">
                            {isPendingDeliv ? 'Articles commandés :' : 'Articles bloqués :'}
                          </span>
                          {s.items.map((item, i) => {
                            const detail = stockCheck?.details[i]
                            return (
                              <Badge
                                key={i}
                                variant="secondary"
                                className={`text-[10px] font-medium ${
                                  isPendingDeliv
                                    ? detail?.available
                                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300'
                                      : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                    : 'bg-muted/80'
                                }`}
                              >
                                {(item as any).product?.name ?? (item as any).book?.title ?? 'Produit'} ×{' '}
                                <strong>{item.quantity}</strong>
                                {isPendingDeliv && detail && (
                                  <span className="ml-1 opacity-80">
                                    ({detail.currentStock} en stock)
                                  </span>
                                )}
                              </Badge>
                            )
                          })}
                        </div>
                      )}
                    </div>

                    {/* Actions directes */}
                    <div className="flex flex-row md:flex-col items-end justify-between md:justify-center gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0">
                      <div className="text-right">
                        <span className={`text-xs font-semibold block ${isPendingDeliv ? 'text-blue-600' : 'text-amber-600'}`}>
                          {isPendingDeliv ? '📦' : '🔒'} {reservedQty} article{reservedQty > 1 ? 's' : ''} {isPendingDeliv ? 'en commande' : 'réservé(s)'}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          Total : {formatCurrency(s.finalTotal)}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 flex-wrap justify-end">
                        {/* Bouton pour faire signe au client (Appel / WhatsApp) */}
                        {s.client?.phone && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs gap-1 text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 border-emerald-300 dark:border-emerald-800"
                            onClick={() => openNotifyModal(s)}
                            title="Envoyer un message WhatsApp ou appeler le client"
                          >
                            <MessageSquare className="h-3.5 w-3.5 text-emerald-600" /> Faire signe
                          </Button>
                        )}

                        {/* Bouton livrer si commande non livrée */}
                        {isPendingDeliv && (
                          <Button
                            size="sm"
                            className={`h-8 text-xs gap-1 ${
                              isStockArrived
                                ? 'bg-emerald-600 hover:bg-emerald-700 text-white font-semibold'
                                : 'bg-blue-600 hover:bg-blue-700 text-white'
                            }`}
                            disabled={actionLoading === s.id}
                            onClick={() => handleDeliverOrder(s)}
                            title={
                              isStockArrived
                                ? 'Les articles sont en stock. Cliquez pour déduire le stock et valider la livraison.'
                                : 'Livrer la commande et déduire le stock'
                            }
                          >
                            <Truck className="h-3.5 w-3.5" /> Livrer
                          </Button>
                        )}

                        {/* Bouton pour voir la facture / solder */}
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs gap-1"
                          onClick={() => setSelectedSale(s)}
                        >
                          <Eye className="h-3.5 w-3.5" /> Gérer / Solder
                        </Button>

                        {/* Bouton débloquer / annuler */}
                        <Button
                          variant="destructive"
                          size="sm"
                          className="h-8 text-xs gap-1"
                          disabled={actionLoading === s.id}
                          onClick={() => handleCancelAdvance(s)}
                          title={
                            isPendingDeliv
                              ? 'Annuler la commande et rembourser l\'avance'
                              : 'Annuler la réservation et réintégrer le stock en boutique'
                          }
                        >
                          <Unlock className="h-3.5 w-3.5" /> Annuler
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Modal faire signe au client */}
      <Dialog open={notifyModalSale !== null} onOpenChange={(open) => { if (!open) setNotifyModalSale(null) }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-emerald-600" /> Faire signe au client
            </DialogTitle>
          </DialogHeader>

          {notifyModalSale && (
            <div className="space-y-4 py-2">
              <div className="rounded-lg border bg-muted/40 p-3 space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Client :</span>
                  <strong className="text-foreground">{notifyModalSale.client?.name}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Téléphone :</span>
                  <strong className="font-mono text-primary">{notifyModalSale.client?.phone}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Facture N° :</span>
                  <span className="font-mono">{notifyModalSale.invoiceNumber}</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Message pré-rempli (WhatsApp / SMS) :</label>
                <textarea
                  className="w-full h-24 rounded-lg border bg-background p-2.5 text-xs focus:ring-1 focus:ring-primary outline-none"
                  value={customNotifyMsg}
                  onChange={(e) => setCustomNotifyMsg(e.target.value)}
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                <Button
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-2"
                  onClick={() => handleSendNotification('whatsapp')}
                >
                  <Send className="h-4 w-4" /> Envoyer via WhatsApp
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 gap-2 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                  onClick={() => handleSendNotification('call')}
                >
                  <PhoneCall className="h-4 w-4" /> Appeler le client
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal complet de facture / encaissement solde */}
      <FactureDetailModal
        open={selectedSale !== null}
        onClose={() => setSelectedSale(null)}
        sale={selectedSale}
        onUpdate={load}
      />
    </div>
  )
}
