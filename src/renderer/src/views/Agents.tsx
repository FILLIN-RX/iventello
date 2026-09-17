import { useEffect, useState } from 'react'
import { UserCheck, Plus, Pencil, Trash2, Percent, Phone, ToggleLeft, ToggleRight, AtSign, ShieldAlert, Building2 } from 'lucide-react'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog'
import { useWarehouses } from '../hooks/useWarehouses'
import { useAuthStore } from '../stores/authStore'
import { feedback } from '../stores/feedbackStore'
import type { User } from '../../../shared/types'

const ROLES = [
  { value: 'MANAGER', label: 'Manager' },
  { value: 'CAISSIER', label: 'Caissier' },
  { value: 'EMPLOYE', label: 'Employé' },
  { value: 'AGENT', label: 'Agent Commercial' }
]

export default function Agents() {
  const { user: currentUser } = useAuthStore()
  const { warehouses } = useWarehouses()
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  
  const [form, setForm] = useState({
    email: '',
    password: '',
    nom: '',
    prenom: '',
    phone: '',
    commissionRate: 0,
    notes: ''
  })
  const [role, setRole] = useState('EMPLOYE')
  const [selectedWarehouses, setSelectedWarehouses] = useState<string[]>([])

  async function load() {
    try {
      setLoading(true)
      const u = await window.api.auth.getUsers()
      setUsers(u)
    } catch (err: any) {
      feedback.toast.error(err?.message || 'Impossible de charger les utilisateurs')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  function openCreate() {
    setEditingId(null)
    setForm({ email: '', password: '', nom: '', prenom: '', phone: '', commissionRate: 0, notes: '' })
    setRole('EMPLOYE')
    setSelectedWarehouses([])
    setShowForm(true)
  }

  function openEdit(u: any) {
    setEditingId(u.id)
    setForm({
      email: u.email,
      password: '',
      nom: u.nom,
      prenom: u.prenom,
      phone: u.phone || '',
      commissionRate: u.commissionRate || 0,
      notes: u.notes || ''
    })
    setRole(u.role)
    const assignedIds = u.warehouseAccess?.map((wa: any) => wa.warehouseId) || []
    setSelectedWarehouses(assignedIds)
    setShowForm(true)
  }

  async function handleSubmit(e?: any) {
    if (e?.preventDefault) e.preventDefault()
    if (!form.email.trim() || !form.nom.trim()) {
      feedback.toast.error('Veuillez remplir les champs obligatoires (Email, Nom)')
      return
    }
    if (!editingId && !form.password.trim()) {
      feedback.toast.error('Le mot de passe est requis pour un nouvel utilisateur')
      return
    }
    try {
      let savedUser: any = null
      if (editingId) {
        const payload: any = { 
          nom: form.nom.trim(),
          prenom: form.prenom.trim(),
          email: form.email.trim(),
          role,
          phone: form.phone || null,
          commissionRate: form.commissionRate,
          notes: form.notes || null
        }
        if (form.password.trim()) payload.password = form.password
        savedUser = await window.api.auth.updateUser(editingId, payload)
        feedback.toast.success(`Utilisateur "${form.prenom} ${form.nom}" modifié`)
      } else {
        savedUser = await window.api.auth.createUser({
          nom: form.nom.trim(),
          prenom: form.prenom.trim(),
          email: form.email.trim(),
          password: form.password,
          role,
          phone: form.phone || null,
          commissionRate: form.commissionRate,
          notes: form.notes || null,
          active: true
        })
        feedback.toast.success(`Utilisateur "${form.prenom} ${form.nom}" créé avec succès`)
      }

      if (savedUser) {
        // Enregistrer l'accès aux entrepôts
        await window.api.auth.assignWarehouses(savedUser.id, selectedWarehouses)
      }

      setShowForm(false)
      load()
    } catch (err: any) {
      feedback.toast.error(err?.message || 'Erreur lors de l\'enregistrement', 'Erreur')
    }
  }

  async function handleToggleActive(u: any) {
    if (u.id === currentUser?.id) {
      feedback.toast.warning('Vous ne pouvez pas désactiver votre propre compte.')
      return
    }
    try {
      await window.api.auth.updateUser(u.id, { active: !u.active })
      feedback.toast.success(`Compte ${!u.active ? 'activé' : 'désactivé'} avec succès`)
      load()
    } catch (err: any) {
      feedback.toast.error(err?.message || 'Erreur lors de la mise à jour', 'Erreur')
    }
  }

  function handleDelete(u: any) {
    if (u.id === currentUser?.id) {
      feedback.toast.warning('Vous ne pouvez pas supprimer votre propre compte.')
      return
    }
    if (u.role === 'PROPRIETAIRE') {
      feedback.toast.warning('Le compte propriétaire principal ne peut pas être supprimé.')
      return
    }
    feedback.confirm({
      title: 'Supprimer cet utilisateur ?',
      message: 'Cet utilisateur n\'aura plus accès au logiciel. Ses opérations passées resteront enregistrées.',
      itemName: `${u.prenom} ${u.nom}`,
      confirmLabel: 'Supprimer l\'utilisateur',
      variant: 'destructive',
      onConfirm: async () => {
        try {
          await window.api.auth.deleteUser(u.id)
          feedback.toast.success(`Utilisateur "${u.prenom} ${u.nom}" supprimé`)
          load()
        } catch (err: any) {
          feedback.toast.error(err?.message || 'Erreur lors de la suppression', 'Erreur')
        }
      }
    })
  }

  return (
    <div className="space-y-6 animate-fade-in text-foreground">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <UserCheck className="h-6 w-6 text-primary" /> Utilisateurs & Collaborateurs
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Gérez les accès, les rôles (Managers, Caissiers, Employés, Agents) et leurs boutiques autorisées.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1.5" /> Nouvel utilisateur
        </Button>
      </div>

      {loading && (
        <div className="flex justify-center py-12">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      )}

      {!loading && users.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
          <UserCheck className="h-10 w-10 text-muted-foreground/40" />
          <p className="mt-3 font-semibold text-muted-foreground">Aucun utilisateur enregistré</p>
          <Button variant="outline" className="mt-4" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1.5" /> Créer un utilisateur
          </Button>
        </div>
      )}

      {!loading && users.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {users.map((u) => {
            const isSelf = u.id === currentUser?.id
            return (
              <Card key={u.id} className={`${u.active ? '' : 'opacity-60'} border hover:shadow-sm transition-shadow`}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between text-base">
                    <span className="flex items-center gap-2">
                      <UserCheck className="h-4 w-4 text-primary" /> {u.prenom} {u.nom}
                      {isSelf && (
                        <span className="ml-1 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                          Moi
                        </span>
                      )}
                    </span>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(u)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      {!isSelf && u.role !== 'PROPRIETAIRE' && (
                        <>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => handleDelete(u)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleToggleActive(u)}>
                            {u.active ? <ToggleRight className="h-4 w-4 text-emerald-500" /> : <ToggleLeft className="h-4 w-4 text-muted-foreground" />}
                          </Button>
                        </>
                      )}
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2.5 text-sm">
                  <div className="space-y-1">
                    <p className="flex items-center gap-2 text-muted-foreground">
                      <AtSign className="h-3.5 w-3.5" /> {u.email}
                    </p>
                    {u.phone && (
                      <p className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="h-3.5 w-3.5" /> {u.phone}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-1.5 items-center">
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {u.role}
                    </span>
                    {u.role === 'AGENT' && u.commissionRate > 0 && (
                      <span className="flex items-center gap-0.5 font-semibold text-primary text-xs">
                        <Percent className="h-3 w-3" /> Commission : {u.commissionRate}%
                      </span>
                    )}
                  </div>

                  {u.notes && (
                    <p className="text-xs text-muted-foreground italic line-clamp-2">{u.notes}</p>
                  )}

                  <div className="pt-2 border-t space-y-1">
                    <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                      <Building2 className="h-3.5 w-3.5 text-muted-foreground/75" /> Boutiques autorisées :
                    </p>
                    <p className="text-xs text-foreground font-medium pl-4.5">
                      {u.role === 'PROPRIETAIRE' || u.role === 'MANAGER' ? (
                        <span className="text-primary">Toutes les boutiques (Administrateur)</span>
                      ) : u.warehouseAccess && u.warehouseAccess.length > 0 ? (
                        u.warehouseAccess.map((wa: any) => wa.warehouse?.name).join(', ')
                      ) : (
                        <span className="text-destructive font-semibold">Aucun accès configuré</span>
                      )}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5" /> {editingId ? "Modifier le compte" : 'Nouvel utilisateur'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Prénom *</Label>
                <Input value={form.prenom} onChange={(e) => setForm({ ...form, prenom: e.target.value })} placeholder="Jean" autoFocus />
              </div>
              <div className="space-y-1.5">
                <Label>Nom *</Label>
                <Input value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} placeholder="Dupont" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Email *</Label>
              <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@exemple.com" type="email" />
            </div>

            <div className="space-y-1.5">
              <Label>{editingId ? 'Nouveau mot de passe (laisser vide pour conserver)' : 'Mot de passe *'}</Label>
              <Input value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="••••••••" type="password" />
            </div>

            <div className="space-y-1.5">
              <Label>Téléphone</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+237 6XX XXX XXX" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Rôle *</Label>
                {editingId && users.find(u => u.id === editingId)?.role === 'PROPRIETAIRE' ? (
                  <div className="h-10 border rounded-md flex items-center px-3 bg-muted/40 text-sm font-semibold">
                    PROPRIETAIRE
                  </div>
                ) : (
                  <select 
                    value={role} 
                    onChange={(e) => setRole(e.target.value)} 
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {ROLES.map(r => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                )}
              </div>

              <div className="space-y-1.5">
                <Label>Taux de commission (%)</Label>
                <Input 
                  type="number" 
                  min="0" 
                  max="100" 
                  step="0.5" 
                  disabled={role !== 'AGENT'}
                  value={form.commissionRate} 
                  onChange={(e) => setForm({ ...form, commissionRate: parseFloat(e.target.value) || 0 })} 
                />
              </div>
            </div>

            {/* Warehouse Checkboxes */}
            {role !== 'PROPRIETAIRE' && role !== 'MANAGER' && (
              <div className="space-y-2">
                <Label className="text-xs font-semibold flex items-center gap-1.5 text-muted-foreground">
                  <Building2 className="h-3.5 w-3.5" /> Boutiques autorisées
                </Label>
                <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto rounded-lg border p-3 bg-background">
                  {warehouses.map((w) => {
                    const isChecked = selectedWarehouses.includes(w.id)
                    return (
                      <label key={w.id} className="flex items-center gap-2 text-xs font-medium cursor-pointer py-1 px-1.5 rounded hover:bg-muted select-none">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedWarehouses([...selectedWarehouses, w.id])
                            } else {
                              setSelectedWarehouses(selectedWarehouses.filter(id => id !== w.id))
                            }
                          }}
                          className="rounded border-input text-primary focus:ring-primary h-3.5 w-3.5"
                        />
                        <span className="truncate">{w.name}</span>
                      </label>
                    )
                  })}
                  {warehouses.length === 0 && (
                    <span className="col-span-2 text-xs text-muted-foreground text-center py-2">
                      Aucune boutique disponible.
                    </span>
                  )}
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Informations complémentaires" />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setShowForm(false)}>Annuler</Button>
              <Button onClick={handleSubmit} disabled={!form.email.trim() || !form.nom.trim() || (!editingId && !form.password.trim())}>
                {editingId ? 'Modifier' : 'Créer'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}