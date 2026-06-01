import { useState, useRef, useEffect } from 'react'
import { ShoppingCart, Plus, Minus, Trash2, Barcode, Printer, User, UserPlus } from 'lucide-react'
import { useProducts } from '../hooks/useProducts'
import { useWarehouses } from '../hooks/useWarehouses'
import { useBarcodeScanner } from '../hooks/useBarcodeScanner'
import { useDeviceCheck } from '../hooks/useDeviceCheck'
import { DeviceCheckModal } from '../components/DeviceCheckModal'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../components/ui/select'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog'
import { useEntrepotStore } from '../stores/entrepotStore'
import { useNotifications } from '../stores/notificationStore'
import { formatCurrency } from '@/lib/utils'
import type { ProductWithRelations, Warehouse, Client } from '../../../shared/types'

interface CartItem {
  productId: string
  name: string
  price: number
  quantity: number
  stock: number
}

function Caisse() {
  const { products } = useProducts()
  const { warehouses } = useWarehouses()
  const { selectedId: workspaceId, selectedName: workspaceName } = useEntrepotStore()
  const [items, setItems] = useState<CartItem[]>([])
  const [warehouseId, setWarehouseId] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('Cash')
  const [discount, setDiscount] = useState(0)
  const [clientSearch, setClientSearch] = useState('')
  const [clients, setClients] = useState<Client[]>([])
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [showClientSearch, setShowClientSearch] = useState(false)
  const [validating, setValidating] = useState(false)
  const [applyVat, setApplyVat] = useState(true)
  const [saleDone, setSaleDone] = useState(false)
  const [scanFeedback, setScanFeedback] = useState<string | null>(null)
  const [showPrintDialog, setShowPrintDialog] = useState(false)
  const [lastSaleId, setLastSaleId] = useState('')
  const [printers, setPrinters] = useState<string[]>([])
  const [deviceModal, setDeviceModal] = useState<'scanner' | 'printer' | null>(null)
  const [showNewClient, setShowNewClient] = useState(false)
  const [newClientName, setNewClientName] = useState('')
  const [newClientPhone, setNewClientPhone] = useState('')
  const [newClientEmail, setNewClientEmail] = useState('')
  const { checkScanner, testScanner, testPrinter } = useDeviceCheck()

  useEffect(() => {
    if (warehouses.length > 0 && !warehouseId) setWarehouseId(warehouses[0].id)
    if (!checkScanner()) setDeviceModal('scanner')
  }, [warehouses])

  useBarcodeScanner(async (barcode) => {
    const found = products.find((p) => p.barcode === barcode)
    if (found) {
      addItem(found)
      setScanFeedback(`${found.name} ajouté`)
    } else {
      setScanFeedback(`Produit non trouvé : ${barcode}`)
    }
    setTimeout(() => setScanFeedback(null), 2000)
  })

  function addItem(p: ProductWithRelations) {
    setItems((prev) => {
      const existing = prev.find((i) => i.productId === p.id)
      if (existing) return prev.map((i) => i.productId === p.id ? { ...i, quantity: i.quantity + 1 } : i)
      return [...prev, { productId: p.id, name: p.name, price: p.sellingPrice, quantity: 1, stock: p.stocks?.[0]?.quantity ?? 0 }]
    })
  }

  function updateQuantity(productId: string, qty: number) {
    if (qty <= 0) { setItems((prev) => prev.filter((i) => i.productId !== productId)); return }
    setItems((prev) => prev.map((i) => i.productId === productId ? { ...i, quantity: qty } : i))
  }

  const subTotal = items.reduce((s, i) => s + i.price * i.quantity, 0)
  const vatTotal = applyVat ? subTotal * 0.1925 : 0
  const finalTotal = subTotal + vatTotal - discount

  async function searchClient(q: string) {
    setClientSearch(q)
    if (q.length < 2) { setClients([]); return }
    try {
      const all = await window.api.getClients() as any[]
      setClients(all.filter((c: any) => c.client.name.toLowerCase().includes(q.toLowerCase())).map((c: any) => c.client))
    } catch { /* ignore */ }
  }

  async function handleValidate() {
    if (items.length === 0 || !warehouseId) return
    try {
      setValidating(true)
      const sale = await window.api.createSale({
        warehouseId,
        clientId: selectedClient?.id ?? null,
        subTotal,
        vatTotal,
        discount,
        finalTotal,
        paymentMethod,
        items: items.map((i) => ({ productId: i.productId, quantity: i.quantity, unitPrice: i.price }))
      })
      setLastSaleId(sale.id)
      setItems([])
      setDiscount(0)
      setSaleDone(true)
      useNotifications.getState().addNotification({
        type: 'vente',
        title: 'Nouvelle vente',
        description: `Vente de ${formatCurrency(subTotal)} — ${items.length} article${items.length > 1 ? 's' : ''}${selectedClient ? ` — ${selectedClient.name}` : ''}`,
        warehouseId: workspaceId ?? undefined,
        warehouseName: workspaceName ?? undefined,
        meta: { montant: finalTotal, articles: items.length, client: selectedClient?.name ?? '' }
      })
      const p = await window.api.getPrinters()
      setPrinters(p)
      if (p.length > 0) setShowPrintDialog(true)
      else setDeviceModal('printer')
    } catch (err) { console.error('Erreur vente', err) }
    finally { setValidating(false) }
  }

  async function handleCreateClient() {
    if (!newClientName.trim()) return
    try {
      const client = await window.api.createClient({ name: newClientName.trim(), phone: newClientPhone.trim() || undefined, email: newClientEmail.trim() || undefined })
      setSelectedClient(client)
      setShowNewClient(false)
      setNewClientName('')
      setNewClientPhone('')
      setNewClientEmail('')
      setClientSearch('')
      setShowClientSearch(false)
    } catch (err) { console.error('Erreur création client', err) }
  }

  async function handlePrint() {
    try {
      await window.api.printReceipt({
        items: items.map((i) => ({ product: { name: i.name, price: i.price }, quantity: i.quantity })),
        totalAmount: finalTotal,
        saleId: lastSaleId,
        date: new Date().toLocaleString('fr-FR')
      })
    } catch (err) { console.error('Erreur impression', err) }
    setShowPrintDialog(false)
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Barcode className="h-5 w-5" />Produits
              <span className="ml-auto text-sm font-normal text-muted-foreground">Scannez un code-barres</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {scanFeedback && <div className="mb-3 rounded-md bg-primary/10 p-2 text-center text-sm text-primary">{scanFeedback}</div>}
            {products.length === 0 && <p className="text-muted-foreground">Aucun produit en base.</p>}
            {products.length > 0 && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {products.map((p) => (
                  <Card key={p.id} className="cursor-pointer hover:shadow-md">
                    <CardContent className="flex items-center justify-between p-4">
                      <div>
                        <p className="font-medium">{p.name}</p>
                        <p className="text-sm text-muted-foreground">{formatCurrency(p.sellingPrice)}</p>
                        <div className="mt-1 flex items-center gap-2">
                          <Badge variant={p.stocks?.[0]?.quantity <= p.stocks?.[0]?.alertLimit ? 'destructive' : 'default'} className="text-xs">Stock: {p.stocks?.[0]?.quantity ?? 0}</Badge>
                          <span className="text-xs text-muted-foreground">{p.barcode}</span>
                        </div>
                      </div>
                      <Button size="icon" onClick={() => addItem(p)} disabled={(p.stocks?.[0]?.quantity ?? 0) <= 0}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><ShoppingCart className="h-5 w-5" />Panier ({items.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Point de vente</Label>
              <Select value={warehouseId} onValueChange={(val) => setWarehouseId(val)}>
                <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                <SelectContent>
                  {warehouses.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

              <div className="space-y-2">
                <Label>Client</Label>
                {selectedClient ? (
                  <div className="flex items-center justify-between rounded-md border p-2 text-sm">
                    <span className="flex items-center gap-2"><User className="h-3 w-3" />{selectedClient.name}</span>
                    <Button variant="ghost" size="sm" onClick={() => { setSelectedClient(null); setClientSearch('') }}>X</Button>
                  </div>
                ) : (
                  <div className="relative">
                    <Input placeholder="Rechercher un client..." value={clientSearch} onChange={(e) => searchClient(e.target.value)} onFocus={() => setShowClientSearch(true)} />
                    {showClientSearch && (
                      <>
                        {clients.length > 0 && (
                          <div className="absolute z-10 mt-1 w-full rounded-md border bg-background shadow-lg">
                            {clients.map((c) => (
                              <button key={c.id} className="w-full px-3 py-2 text-left text-sm hover:bg-muted" onClick={() => { setSelectedClient(c); setShowClientSearch(false); setClientSearch('') }}>
                                {c.name} {c.email && <span className="text-muted-foreground">— {c.email}</span>}
                              </button>
                            ))}
                          </div>
                        )}
                        {clientSearch.length >= 2 && clients.length === 0 && (
                          <div className="absolute z-10 mt-1 w-full rounded-md border bg-background shadow-lg p-3 text-center">
                            <p className="text-xs text-muted-foreground mb-2">Aucun client trouvé</p>
                            <Button size="sm" variant="outline" onClick={() => { setShowNewClient(true); setNewClientName(clientSearch) }}>
                              <UserPlus className="mr-1.5 h-3.5 w-3.5" /> Créer "{clientSearch}"
                            </Button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>

            {items.length === 0 && <p className="text-center text-sm text-muted-foreground">Panier vide.</p>}
            {items.map((item) => (
              <div key={item.productId} className="flex items-center justify-between rounded border p-3">
                <div className="flex-1">
                  <p className="text-sm font-medium">{item.name}</p>
                  <p className="text-xs text-muted-foreground">{formatCurrency(item.price)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => updateQuantity(item.productId, item.quantity - 1)}><Minus className="h-3 w-3" /></Button>
                  <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                  <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => updateQuantity(item.productId, item.quantity + 1)}><Plus className="h-3 w-3" /></Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => updateQuantity(item.productId, 0)}><Trash2 className="h-3 w-3" /></Button>
                </div>
              </div>
            ))}

            <div className="space-y-2">
              <Label>Méthode de paiement</Label>
              <Select value={paymentMethod} onValueChange={(val) => setPaymentMethod(val)}>
                <SelectTrigger><SelectValue placeholder="Espèces" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cash">Espèces</SelectItem>
                  <SelectItem value="Mobile Money">Mobile Money</SelectItem>
                  <SelectItem value="Carte">Carte bancaire</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <input id="applyVat" type="checkbox" checked={applyVat} onChange={(e) => setApplyVat(e.target.checked)} className="h-4 w-4 rounded border-muted text-primary focus:ring-primary" />
              <Label htmlFor="applyVat" className="text-sm cursor-pointer">Appliquer TVA (19.25%)</Label>
            </div>

            {discount > 0 && (
              <div className="space-y-1">
                <Label>Remise</Label>
                <Input type="number" min="0" step="0.01" value={discount} onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)} />
              </div>
            )}
            <Button variant="ghost" size="sm" onClick={() => setDiscount(5)} className="text-xs">+ Remise</Button>
          </CardContent>
          <CardFooter className="flex-col gap-3">
            <div className="w-full space-y-1 text-sm">
              <div className="flex justify-between"><span>Sous-total</span><span>{formatCurrency(subTotal)}</span></div>
              {applyVat && <div className="flex justify-between text-muted-foreground"><span>TVA (19.25%)</span><span>{formatCurrency(vatTotal)}</span></div>}
              {discount > 0 && <div className="flex justify-between text-destructive"><span>Remise</span><span>-{formatCurrency(discount)}</span></div>}
              <div className="flex justify-between text-lg font-bold border-t pt-2"><span>Total</span><span>{formatCurrency(finalTotal)}</span></div>
            </div>
            <Button className="w-full" size="lg" disabled={items.length === 0 || validating || !warehouseId} onClick={handleValidate}>
              {validating ? 'Validation...' : saleDone ? '✓ Vente enregistrée' : 'Valider la vente'}
            </Button>
          </CardFooter>
        </Card>

        {saleDone && (
          <Card className="mt-4">
            <CardContent className="flex items-center justify-center gap-4 py-4">
              <p className="font-medium text-green-600">✓ Vente enregistrée</p>
              {printers.length > 0 && <Button variant="outline" size="sm" onClick={() => setShowPrintDialog(true)}><Printer className="mr-2 h-4 w-4" />Imprimer</Button>}
              <Button variant="ghost" size="sm" onClick={() => setSaleDone(false)}>OK</Button>
            </CardContent>
          </Card>
        )}

        <Dialog open={showPrintDialog} onOpenChange={setShowPrintDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Impression du ticket</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Imprimer le ticket de caisse ?</p>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setShowPrintDialog(false)}>Annuler</Button>
                <Button onClick={handlePrint}><Printer className="mr-2 h-4 w-4" />Imprimer</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showNewClient} onOpenChange={setShowNewClient}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><UserPlus className="h-4 w-4" /> Nouveau client</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Nom *</Label>
                <Input value={newClientName} onChange={(e) => setNewClientName(e.target.value)} placeholder="Nom du client" autoFocus />
              </div>
              <div>
                <Label>Téléphone</Label>
                <Input value={newClientPhone} onChange={(e) => setNewClientPhone(e.target.value)} placeholder="+237 6XX XXX XXX" />
              </div>
              <div>
                <Label>Email</Label>
                <Input value={newClientEmail} onChange={(e) => setNewClientEmail(e.target.value)} placeholder="client@email.com" type="email" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" onClick={() => setShowNewClient(false)}>Annuler</Button>
                <Button onClick={handleCreateClient} disabled={!newClientName.trim()}>Créer et sélectionner</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <DeviceCheckModal
          open={deviceModal === 'scanner'}
          onClose={() => setDeviceModal(null)}
          device="scanner"
          onTest={testScanner}
        />
        <DeviceCheckModal
          open={deviceModal === 'printer'}
          onClose={() => setDeviceModal(null)}
          device="ticket"
          onTest={testPrinter}
        />
      </div>
    </div>
  )
}

export default Caisse
