import { useEffect, useState } from 'react'
import { UserCheck, Plus, Pencil, Trash2, Percent, Phone, Mail, ToggleLeft, ToggleRight, Key, AtSign } from 'lucide-react'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog'
import type { User } from '../../../shared/types'

export default function Agents() {
  const [agents, setAgents] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ email: '', password: '', nom: '', prenom: '', phone: '', commissionRate: 0, notes: '' })

  function load() {
    setLoading(true)
    window.api.getAgents().then((a: any) => { setAgents(a); setLoading(false) })
  }

  useEffect(() => { load() }, [])

  function openCreate() {
    setEditingId(null)
    setForm({ email: '', password: '', nom: '', prenom: '', phone: '', commissionRate: 0, notes: '' })
    setShowForm(true)
  }

  function openEdit(a: User) {
    setEditingId(a.id)
    setForm({
      email: a.email,
      password: '',
      nom: a.nom,
      prenom: a.prenom,
      phone: a.phone || '',
      commissionRate: a.commissionRate,
      notes: a.notes || ''
    })
    setShowForm(true)
  }

  async function handleSave() {
    if (!form.email.trim() || !form.nom.trim()) return
    if (!editingId && !form.password.trim()) return
    try {
      if (editingId) {
        const data: any = { nom: form.nom, prenom: form.prenom, email: form.email, phone: form.phone || null, commissionRate: form.commissionRate, notes: form.notes || null }
        if (form.password.trim()) data.password = form.password
        await window.api.updateAgent(editingId, data)
      } else {
        await window.api.createAgent({
          email: form.email, password: form.password,
          nom: form.nom, prenom: form.prenom,
          phone: form.phone || null,
          commissionRate: form.commissionRate,
          notes: form.notes || null
        })
      }
      setShowForm(false)
      load()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erreur')
    }
  }

  async function handleToggleActive(a: User) {
    try {
      await window.api.updateAgent(a.id, { active: !a.active } as any)
      load()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erreur')
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Supprimer cet agent ?')) return
    try {
      await window.api.deleteAgent(id)
      load()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erreur')
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <UserCheck className="h-6 w-6 text-primary" /> Agents commerciaux
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Gérez les agents — ils peuvent se connecter à la plateforme avec leur email et mot de passe
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1.5" /> Nouvel agent
        </Button>
      </div>

      {loading && <div className="flex justify-center py-12"><div className="h-7 w-7 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>}

      {!loading && agents.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
          <UserCheck className="h-10 w-10 text-muted-foreground/40" />
          <p className="mt-3 font-semibold text-muted-foreground">Aucun agent enregistré</p>
          <p className="text-xs text-muted-foreground">Créez des agents avec email et mot de passe pour qu'ils puissent se connecter</p>
          <Button variant="outline" className="mt-4" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1.5" /> Créer un agent
          </Button>
        </div>
      )}

      {!loading && agents.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {agents.map((a) => (
            <Card key={a.id} className={a.active ? '' : 'opacity-60'}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-base">
                  <span className="flex items-center gap-2">
                    <UserCheck className="h-4 w-4 text-primary" /> {a.prenom} {a.nom}
                  </span>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(a)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => handleDelete(a.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleToggleActive(a)}>
                      {a.active ? <ToggleRight className="h-4 w-4 text-emerald-500" /> : <ToggleLeft className="h-4 w-4 text-muted-foreground" />}
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1.5 text-sm">
                <p className="flex items-center gap-2 text-muted-foreground">
                  <AtSign className="h-3.5 w-3.5" /> {a.email}
                </p>
                {a.phone && (
                  <p className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-3.5 w-3.5" /> {a.phone}
                  </p>
                )}
                <p className="flex items-center gap-2 font-semibold text-primary">
                  <Percent className="h-3.5 w-3.5" /> Commission : {a.commissionRate}%
                </p>
                {a.notes && (
                  <p className="text-xs text-muted-foreground italic mt-1">{a.notes}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  {a.active ? 'Actif' : 'Inactif'}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCheck className="h-4 w-4" /> {editingId ? "Modifier l'agent" : 'Nouvel agent'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Prénom *</Label>
                <Input value={form.prenom} onChange={(e) => setForm({ ...form, prenom: e.target.value })} placeholder="Jean" autoFocus />
              </div>
              <div>
                <Label>Nom *</Label>
                <Input value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} placeholder="Dupont" />
              </div>
            </div>
            <div>
              <Label>Email *</Label>
              <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="agent@email.com" type="email" />
            </div>
            <div>
              <Label>{editingId ? 'Nouveau mot de passe (laisser vide pour conserver)' : 'Mot de passe *'}</Label>
              <Input value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="••••••••" type="password" />
            </div>
            <div>
              <Label>Téléphone</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+237 6XX XXX XXX" />
            </div>
            <div>
              <Label>Taux de commission (%)</Label>
              <Input type="number" min="0" max="100" step="0.5" value={form.commissionRate} onChange={(e) => setForm({ ...form, commissionRate: parseFloat(e.target.value) || 0 })} />
            </div>
            <div>
              <Label>Notes</Label>
              <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Informations complémentaires" />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setShowForm(false)}>Annuler</Button>
              <Button onClick={handleSave} disabled={!form.email.trim() || !form.nom.trim() || (!editingId && !form.password.trim())}>
                {editingId ? 'Modifier' : 'Créer'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}