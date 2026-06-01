import { useState } from 'react'
import { Wallet, Plus, Trash2, TrendingDown } from 'lucide-react'
import { useExpenses } from '../hooks/useExpenses'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog'
import { useEntrepotStore } from '../stores/entrepotStore'
import { formatCurrency } from '@/lib/utils'

const CATEGORIES_DEPENSES = [
  'Loyer', 'Salaires', 'Fournisseurs', 'Transport', 'Électricité',
  'Internet', 'Matériel', 'Marketing', 'Maintenance', 'Autre'
]

const CAT_COLORS: Record<string, string> = {
  Loyer: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400',
  Salaires: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400',
  Fournisseurs: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400',
  Transport: 'bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400',
}

export default function Depenses() {
  const { expenses, loading, refetch } = useExpenses()
  const { selectedId: workspaceId } = useEntrepotStore()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: '', amount: '', category: '', description: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const total = expenses.reduce((s, e) => s + e.amount, 0)
  const thisMonth = expenses.filter(e => {
    const d = new Date(e.date)
    const now = new Date()
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  })
  const totalMois = thisMonth.reduce((s, e) => s + e.amount, 0)

  async function handleSave() {
    if (!form.title.trim() || !form.amount || !form.category) {
      setError('Titre, montant et catégorie sont requis')
      return
    }
    try {
      setSaving(true)
      await window.api.createExpense({
        title: form.title.trim(),
        amount: parseFloat(form.amount),
        category: form.category,
        description: form.description || null,
        warehouseId: workspaceId ?? undefined,
        paymentMethod: 'ESPECES'
      })
      setShowForm(false)
      setForm({ title: '', amount: '', category: '', description: '' })
      refetch()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur')
    } finally { setSaving(false) }
  }

  async function handleDelete(id: string) {
    if (!confirm('Supprimer cette dépense ?')) return
    await window.api.deleteExpense(id)
    refetch()
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Wallet className="h-6 w-6 text-primary" /> Dépenses
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Suivi des coûts d'exploitation</p>
        </div>
        <Button onClick={() => { setShowForm(true); setError(null) }} className="gap-2 shadow-md">
          <Plus className="h-4 w-4" /> Nouvelle dépense
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="stat-card-slate rounded-lg p-5 text-white shadow-lg">
          <p className="text-sm opacity-80">Total des dépenses</p>
          <p className="mt-1 text-3xl font-bold">{formatCurrency(total)}</p>
          <p className="mt-1 text-xs opacity-60">{expenses.length} opérations</p>
        </div>
        <div className="stat-card-rose rounded-lg p-5 text-white shadow-lg">
          <p className="text-sm opacity-80">Ce mois-ci</p>
          <p className="mt-1 text-3xl font-bold">{formatCurrency(totalMois)}</p>
          <p className="mt-1 text-xs opacity-60">{thisMonth.length} opérations</p>
        </div>
      </div>

      {loading && <div className="flex justify-center py-12"><div className="h-7 w-7 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>}

      {!loading && expenses.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
          <TrendingDown className="h-10 w-10 text-muted-foreground/40" />
          <p className="mt-3 font-semibold text-muted-foreground">Aucune dépense enregistrée</p>
          <Button variant="outline" className="mt-4" onClick={() => setShowForm(true)}>
            <Plus className="mr-2 h-4 w-4" /> Ajouter une dépense
          </Button>
        </div>
      )}

      {!loading && expenses.length > 0 && (
        <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
          <div className="divide-y">
            {expenses.map(exp => (
              <div key={exp.id} className="flex items-center gap-4 px-5 py-4 group">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 dark:bg-primary/20">
                  <TrendingDown className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm">{exp.title}</p>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${CAT_COLORS[exp.category] ?? 'bg-muted text-muted-foreground'}`}>
                      {exp.category}
                    </span>
                  </div>
                  {exp.description && <p className="text-xs text-muted-foreground mt-0.5 truncate">{exp.description}</p>}
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {new Date(exp.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
                  </p>
                </div>
                <div className="text-right flex items-center gap-3 flex-shrink-0">
                  <p className="font-bold text-rose-600 text-sm whitespace-nowrap">
                    -{formatCurrency(exp.amount)}
                  </p>
                  <button onClick={() => handleDelete(exp.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nouvelle dépense</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {error && <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">{error}</div>}
            <div className="space-y-2">
              <Label>Titre</Label>
              <Input placeholder="ex: Facture électricité" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} autoFocus />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Montant (FCFA)</Label>
                <Input type="number" min="0" step="0.01" placeholder="0" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Catégorie</Label>
                <Select value={form.category} onValueChange={val => setForm(f => ({ ...f, category: val }))}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES_DEPENSES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description <span className="text-muted-foreground">(optionnel)</span></Label>
              <Input placeholder="Notes..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="flex justify-end gap-3 pt-1">
              <Button variant="outline" onClick={() => setShowForm(false)}>Annuler</Button>
              <Button onClick={handleSave} disabled={saving}>{saving ? 'Enregistrement...' : 'Ajouter'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
