import { useState } from 'react'
import { Plus, Search, Mail, Phone, TrendingUp, Star } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { useProducts } from '../hooks/useProducts'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Badge } from '../components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import ClientDetail from './ClientDetail'
import type { ClientStats, Client } from '../../../shared/types'

function Clients() {
  const [clients, setClients] = useState<ClientStats[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Client | null>(null)
  const [form, setForm] = useState({ name: '', email: '', phone: '', address: '', notes: '' })
  const [saving, setSaving] = useState(false)

  async function load() {
    try { setLoading(true); setClients(await window.api.getClients() as ClientStats[]) }
    catch { /* ignore */ } finally { setLoading(false) }
  }
  useState(() => { load() })

  const filtered = clients.filter((c) =>
    c.client.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.client.email?.toLowerCase().includes(search.toLowerCase()) ?? false) ||
    (c.client.phone?.includes(search) ?? false)
  )

  function openCreate() { setEditing(null); setForm({ name: '', email: '', phone: '', address: '', notes: '' }); setShowForm(true) }
  function openEdit(c: Client) { setEditing(c); setForm({ name: c.name, email: c.email ?? '', phone: c.phone ?? '', address: c.address ?? '', notes: c.notes ?? '' }); setShowForm(true) }

  async function handleSave() {
    if (!form.name.trim()) return
    try {
      setSaving(true)
      if (editing) await window.api.updateClient(editing.id, form)
      else await window.api.createClient(form)
      setShowForm(false); load()
    } catch (err) { console.error(err) } finally { setSaving(false) }
  }

  async function handleDelete(id: string) {
    if (!confirm('Supprimer ce client ?')) return
    try { await window.api.deleteClient(id); load() }
    catch (err) { console.error(err) }
  }

  function rankBadge(rank: string) {
    if (rank === 'premium') return <Badge className="bg-yellow-500 text-white"><Star className="mr-1 h-3 w-3" />Premium</Badge>
    if (rank === 'fidele') return <Badge variant="secondary"><TrendingUp className="mr-1 h-3 w-3" />Fidèle</Badge>
    return <Badge variant="outline">Standard</Badge>
  }

  if (selectedId) return <ClientDetail clientId={selectedId} onBack={() => setSelectedId(null)} onUpdate={load} />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Clients</h2>
        <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Nouveau client</Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Rechercher un client..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      {loading && <p className="text-muted-foreground">Chargement...</p>}
      {!loading && filtered.length === 0 && <p className="text-muted-foreground">{search ? 'Aucun client trouvé.' : 'Aucun client.'}</p>}

      {!loading && filtered.length > 0 && (
        <div className="space-y-2">
          {filtered.map((s) => (
            <Card key={s.client.id} className="cursor-pointer hover:shadow-md" onClick={() => setSelectedId(s.client.id)}>
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{s.client.name}</p>
                    {rankBadge(s.rank)}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    {s.client.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{s.client.email}</span>}
                    {s.client.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{s.client.phone}</span>}
                    <span>{s.purchaseCount} achat(s)</span>
                    <span className="font-medium text-foreground">{formatCurrency(s.totalSpent)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Modifier le client' : 'Nouveau client'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Nom</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="space-y-2"><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div className="space-y-2"><Label>Téléphone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <div className="space-y-2"><Label>Adresse</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
            <div className="space-y-2"><Label>Notes</Label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowForm(false)}>Annuler</Button>
              <Button onClick={handleSave} disabled={saving || !form.name.trim()}>{saving ? '...' : editing ? 'Modifier' : 'Créer'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default Clients
