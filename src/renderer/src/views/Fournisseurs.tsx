import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, Truck, Mail, Phone } from 'lucide-react'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import type { Supplier } from '../../../shared/types'

function Fournisseurs() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Supplier | null>(null)
  const [form, setForm] = useState({ name: '', email: '', phone: '', address: '' })
  const [saving, setSaving] = useState(false)

  async function load() {
    try { setLoading(true); setSuppliers(await window.api.getSuppliers() as Supplier[]) }
    catch { /* ignore */ } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  function openCreate() { setEditing(null); setForm({ name: '', email: '', phone: '', address: '' }); setShowForm(true) }
  function openEdit(s: Supplier) { setEditing(s); setForm({ name: s.name, email: s.email ?? '', phone: s.phone ?? '', address: s.address ?? '' }); setShowForm(true) }

  async function handleSave() {
    if (!form.name.trim()) return
    try {
      setSaving(true)
      if (editing) await window.api.updateSupplier(editing.id, form)
      else await window.api.createSupplier(form)
      setShowForm(false); load()
    } catch (err) { console.error(err) } finally { setSaving(false) }
  }

  async function handleDelete(id: string) {
    if (!confirm('Supprimer ce fournisseur ? Les produits liés seront désassignés.')) return
    try { await window.api.deleteSupplier(id); load() }
    catch (err) { console.error(err) }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Fournisseurs</h2>
        <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Nouveau fournisseur</Button>
      </div>

      {loading && <p className="text-muted-foreground">Chargement...</p>}
      {!loading && suppliers.length === 0 && <p className="text-muted-foreground">Aucun fournisseur.</p>}

      {!loading && suppliers.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {suppliers.map((s) => (
            <Card key={s.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base flex items-center gap-2"><Truck className="h-4 w-4" />{s.name}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-1 text-sm text-muted-foreground">
                  {s.email && <p className="flex items-center gap-2"><Mail className="h-3 w-3" />{s.email}</p>}
                  {s.phone && <p className="flex items-center gap-2"><Phone className="h-3 w-3" />{s.phone}</p>}
                  {s.address && <p className="text-xs">{s.address}</p>}
                </div>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => openEdit(s)}><Pencil className="mr-1 h-3 w-3" />Modifier</Button>
                  <Button size="sm" variant="destructive" className="flex-1" onClick={() => handleDelete(s.id)}><Trash2 className="mr-1 h-3 w-3" />Supprimer</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Modifier le fournisseur' : 'Nouveau fournisseur'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Nom</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="space-y-2"><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div className="space-y-2"><Label>Téléphone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <div className="space-y-2"><Label>Adresse</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
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

export default Fournisseurs
