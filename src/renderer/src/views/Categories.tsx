import { useState } from 'react'
import { Plus, Pencil, Trash2, Tag, Search, Package, LayoutGrid } from 'lucide-react'
import { useCategories } from '../hooks/useCategories'
import { useProducts } from '../hooks/useProducts'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog'
import type { Category } from '../../../shared/types'

const PALETTE = [
  'bg-emerald-500', 'bg-blue-500', 'bg-purple-500', 'bg-amber-500',
  'bg-rose-500', 'bg-cyan-500', 'bg-indigo-500', 'bg-orange-500',
  'bg-teal-500', 'bg-pink-500',
]

function getColor(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return PALETTE[Math.abs(hash) % PALETTE.length]
}

export default function Categories() {
  const { categories, loading, refetch } = useCategories()
  const { products } = useProducts()
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Category | null>(null)
  const [form, setForm] = useState({ name: '', description: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const filtered = categories.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.description?.toLowerCase() ?? '').includes(search.toLowerCase())
  )

  const totalProducts = products.length
  const avgProductsPerCat = categories.length > 0 ? (totalProducts / categories.length).toFixed(1) : '0'

  function openCreate() {
    setEditing(null)
    setForm({ name: '', description: '' })
    setError(null)
    setShowForm(true)
  }

  function openEdit(cat: Category) {
    setEditing(cat)
    setForm({ name: cat.name, description: cat.description ?? '' })
    setError(null)
    setShowForm(true)
  }

  async function handleSave() {
    if (!form.name.trim()) { setError('Le nom est requis'); return }
    try {
      setSaving(true)
      if (editing) {
        await window.api.updateCategory(editing.id, { name: form.name.trim(), description: form.description || null })
      } else {
        await window.api.createCategory({ name: form.name.trim(), description: form.description || null })
      }
      setShowForm(false)
      refetch()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur')
    } finally { setSaving(false) }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Supprimer la catégorie "${name}" ? Les produits associés seront désassociés.`)) return
    try {
      await window.api.deleteCategory(id)
      refetch()
    } catch (err) { console.error(err) }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* En-tête */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Catégories</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2 shadow-md">
          <Plus className="h-4 w-4" /> Ajouter Catégorie
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="stat-card-green rounded-lg p-5 text-white shadow-lg">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm opacity-80">Total Catégories</p>
              <p className="mt-1 text-3xl font-bold">{categories.length}</p>
            </div>
            <div className="rounded-lg bg-white/20 p-2.5"><LayoutGrid className="h-5 w-5" /></div>
          </div>
        </div>
        <div className="stat-card-slate rounded-lg p-5 text-white shadow-lg">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm opacity-80">Total Produits</p>
              <p className="mt-1 text-3xl font-bold">{totalProducts}</p>
            </div>
            <div className="rounded-lg bg-white/20 p-2.5"><Package className="h-5 w-5" /></div>
          </div>
        </div>
        <div className="stat-card-indigo rounded-lg p-5 text-white shadow-lg">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm opacity-80">Moy. Produits/Cat.</p>
              <p className="mt-1 text-3xl font-bold">{avgProductsPerCat}</p>
            </div>
            <div className="rounded-lg bg-white/20 p-2.5"><Tag className="h-5 w-5" /></div>
          </div>
        </div>
      </div>

      {/* Recherche */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Rechercher catégories par nom ou description..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 h-11 rounded-lg border-border/60 bg-card"
        />
      </div>

      {/* Grille des catégories */}
      {loading && (
        <div className="flex justify-center py-12">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      )}
      {!loading && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
          <Tag className="h-10 w-10 text-muted-foreground/40" />
          <p className="mt-3 font-medium text-muted-foreground">
            {search ? 'Aucune catégorie trouvée' : 'Aucune catégorie créée'}
          </p>
          {!search && (
            <Button variant="outline" className="mt-4" onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" /> Créer la première catégorie
            </Button>
          )}
        </div>
      )}
      {!loading && filtered.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((cat) => {
            const productCount = products.filter(p => p.categoryId === cat.id).length
            const initial = cat.name.charAt(0).toUpperCase()
            const color = getColor(cat.name)
            return (
              <div key={cat.id} className="group relative rounded-lg border bg-card p-5 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5">
                {/* Actions */}
                <div className="absolute right-3 top-3 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <button onClick={() => openEdit(cat)}
                    className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => handleDelete(cat.id, cat.name)}
                    className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Avatar */}
                <div className="flex items-center gap-3">
                  <div className={`flex h-11 w-11 items-center justify-center rounded-lg text-white text-lg font-bold ${color}`}>
                    {initial}
                  </div>
                  <div>
                    <p className="font-semibold">{cat.name}</p>
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                      <Package className="h-3 w-3" /> {productCount} Produit{productCount !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>

                {/* Description */}
                {cat.description && (
                  <p className="mt-3 text-sm text-muted-foreground line-clamp-2">{cat.description}</p>
                )}

                {/* Dates */}
                <div className="mt-4 flex items-center justify-between border-t pt-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    📅 {new Date(cat.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                  <span className="flex items-center gap-1">
                    🔄 {new Date(cat.updatedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Dialog création/édition */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Modifier la catégorie' : 'Nouvelle catégorie'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {error && <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">{error}</div>}
            <div className="space-y-2">
              <Label>Nom de la catégorie</Label>
              <Input placeholder="ex: Électronique" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} autoFocus />
            </div>
            <div className="space-y-2">
              <Label>Description <span className="text-muted-foreground">(optionnel)</span></Label>
              <Input placeholder="Description de la catégorie..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            {form.name && (
              <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg text-white text-base font-bold ${getColor(form.name)}`}>
                  {form.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-medium text-sm">{form.name}</p>
                  <p className="text-xs text-muted-foreground">Aperçu de l'icône</p>
                </div>
              </div>
            )}
            <div className="flex justify-end gap-3 pt-1">
              <Button variant="outline" onClick={() => setShowForm(false)}>Annuler</Button>
              <Button onClick={handleSave} disabled={saving}>{saving ? 'Enregistrement...' : editing ? 'Modifier' : 'Créer'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
