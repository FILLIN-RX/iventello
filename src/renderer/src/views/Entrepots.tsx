import { useState } from 'react'
import { Plus, Pencil, Trash2, Warehouse as WarehouseIcon, ArrowRight, ImageUp, X, Smartphone } from 'lucide-react'
import { useWarehouses } from '../hooks/useWarehouses'
import { useNavigate } from '../hooks/useNavigate'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Switch } from '../components/ui/switch'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import type { Warehouse } from '../../../shared/types'

function Entrepots() {
  const { warehouses, loading, error, refetch } = useWarehouses()
  const navigate = useNavigate()
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Warehouse | null>(null)
  const [formName, setFormName] = useState('')
  const [formLocation, setFormLocation] = useState('')
  const [formLogoUrl, setFormLogoUrl] = useState('')
  const [formMobileMoney, setFormMobileMoney] = useState(false)
  const [saving, setSaving] = useState(false)

  function openCreate() {
    setEditing(null)
    setFormName('')
    setFormLocation('')
    setFormLogoUrl('')
    setFormMobileMoney(false)
    setShowForm(true)
  }

  function openEdit(w: Warehouse) {
    setEditing(w)
    setFormName(w.name)
    setFormLocation(w.location ?? '')
    setFormLogoUrl(w.logoUrl ?? '')
    setFormMobileMoney(w.mobileMoneyEnabled ?? false)
    setShowForm(true)
  }

  async function handleSelectLogo() {
    const path = await window.api.selectLogo()
    if (path) {
      const id = editing?.id || '__temp__'
      const saved = await window.api.saveLogo(path, id)
      setFormLogoUrl(saved)
    }
  }

  async function handleSave() {
    if (!formName.trim()) return
    try {
      setSaving(true)
      if (editing) {
        await window.api.updateWarehouse(editing.id, {
          name: formName.trim(),
          location: formLocation.trim() || undefined,
          logoUrl: formLogoUrl || undefined,
          mobileMoneyEnabled: formMobileMoney
        })
      } else {
        const wh = await window.api.createWarehouse({
          name: formName.trim(),
          location: formLocation.trim() || undefined,
          mobileMoneyEnabled: formMobileMoney
        })
        if (formLogoUrl) {
          const saved = await window.api.saveLogo(formLogoUrl, wh.id)
          await window.api.updateWarehouse(wh.id, { logoUrl: saved })
        }
      }
      setShowForm(false)
      refetch()
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Supprimer cet entrepôt ?')) return
    try {
      await window.api.deleteWarehouse(id)
      refetch()
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Entrepôts</h2>
        <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" /> Nouvel entrepôt</Button>
      </div>

      {loading && <p className="text-muted-foreground">Chargement...</p>}
      {error && <p className="text-destructive">Erreur : {error}</p>}
      {!loading && !error && warehouses.length === 0 && (
        <p className="text-muted-foreground">Aucun entrepôt. Créez-en un pour organiser vos stocks.</p>
      )}

      {!loading && warehouses.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {warehouses.map((w) => (
            <Card key={w.id} className="group transition-all hover:shadow-md">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {w.logoUrl ? (
                      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border bg-background">
                        <img src={`local-file://${w.logoUrl}`} alt={w.name} className="h-full w-full object-contain" />
                      </div>
                    ) : (
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                        <WarehouseIcon className="h-6 w-6 text-primary" />
                      </div>
                    )}
                    <div>
                      <CardTitle className="text-lg">{w.name}</CardTitle>
                      {w.location && <p className="mt-0.5 text-xs text-muted-foreground">{w.location}</p>}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  className="w-full"
                  size="sm"
                  onClick={() => navigate('dashboard', w.id, w.name)}
                >
                  Ouvrir <ArrowRight className="ml-1 h-3.5 w-3.5" />
                </Button>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => openEdit(w)}>
                    <Pencil className="mr-1 h-3 w-3" /> Modifier
                  </Button>
                  <Button size="sm" variant="destructive" className="flex-1" onClick={() => handleDelete(w.id)}>
                    <Trash2 className="mr-1 h-3 w-3" /> Supprimer
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Modifier l'entrepôt" : 'Nouvel entrepôt'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="wh-name">Nom</Label>
              <input id="wh-name" autoFocus value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Entrepôt principal" className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm text-foreground shadow-sm" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wh-location">Emplacement</Label>
              <Input id="wh-location" value={formLocation} onChange={(e) => setFormLocation(e.target.value)} placeholder="Zone A, Bâtiment 2..." />
            </div>
            <div className="space-y-2">
              <Label>Logo</Label>
              <div className="flex items-center gap-3">
                {formLogoUrl ? (
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border bg-background">
                    <img src={`local-file://${formLogoUrl}`} alt="Logo" className="h-full w-full object-contain" />
                    <button onClick={() => setFormLogoUrl('')} className="absolute right-0 top-0 rounded-bl bg-background/80 p-0.5 text-muted-foreground hover:text-foreground">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border border-dashed bg-muted/30 text-muted-foreground">
                    <ImageUp className="h-5 w-5" />
                  </div>
                )}
                <Button type="button" variant="outline" size="sm" onClick={handleSelectLogo}>
                  {formLogoUrl ? 'Changer' : 'Sélectionner'}
                </Button>
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                  <Smartphone className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">Module Services Mobile Money</p>
                  <p className="text-[10px] text-muted-foreground">Tableur de suivi Orange Money, MTN MoMo, Camtel</p>
                </div>
              </div>
              <Switch checked={formMobileMoney} onCheckedChange={setFormMobileMoney} />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowForm(false)}>Annuler</Button>
              <Button onClick={handleSave} disabled={saving || !formName.trim()}>
                {saving ? '...' : editing ? 'Modifier' : 'Créer'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default Entrepots
