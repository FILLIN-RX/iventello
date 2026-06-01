import { useState, useEffect } from 'react'
import { Package, Tag, Image as ImageIcon, Upload, Trash2, ShieldAlert } from 'lucide-react'
import { useBarcodeScanner } from '../hooks/useBarcodeScanner'
import { useSuppliers } from '../hooks/useSuppliers'
import { useCategories } from '../hooks/useCategories'
import { useNotifications } from '../stores/notificationStore'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../components/ui/select'
import type { ProductWithRelations } from '../../../shared/types'

interface Props {
  product?: ProductWithRelations | null
  onSave: () => void
  onCancel: () => void
}

const defaultFields = [
  { key: 'field1', label: 'Marque' }, { key: 'field2', label: 'Modèle' },
  { key: 'field3', label: 'Couleur' }, { key: 'field4', label: 'Taille/Dimension' },
  { key: 'field5', label: 'Poids' }, { key: 'field6', label: "Date d'expiration" },
  { key: 'field7', label: 'Garantie (mois)' }, { key: 'field8', label: 'Numéro de lot' },
  { key: 'field9', label: 'Conditionnement' }, { key: 'field10', label: 'Note interne' }
]

export function ProduitForm({ product, onSave, onCancel }: Props) {
  const { suppliers } = useSuppliers()
  const { categories } = useCategories()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // États de saisie
  const [form, setForm] = useState<Record<string, string>>({
    barcode: '', name: '', basePrice: '0', sellingPrice: '0', vatRate: '19.25',
    supplierId: '__none__', categoryId: '__none__'
  })
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({})
  
  // États de gestion de l'image
  const [selectedImageFile, setSelectedImageFile] = useState<string | null>(null)
  const [imageUrl, setImageUrl] = useState<string>('')

  useEffect(() => {
    if (product) {
      setForm({
        barcode: product.barcode, name: product.name,
        basePrice: product.basePrice.toString(), sellingPrice: product.sellingPrice.toString(),
        vatRate: product.vatRate.toString(),
        supplierId: product.supplierId ?? '__none__',
        categoryId: product.categoryId ?? '__none__'
      })
      setImageUrl(product.imageUrl ?? '')
      setSelectedImageFile(null)
      
      const vals: Record<string, string> = {}
      for (const f of defaultFields) {
        const v = (product as any)[`${f.key}_value`]
        if (v) vals[f.key] = v
      }
      setFieldValues(vals)
    }
  }, [product])

  // Détection du scanner de code-barres matériel
  useBarcodeScanner((barcode) => setForm((f) => ({ ...f, barcode })))

  function setField(key: string, value: string) { setForm((f) => ({ ...f, [key]: value })) }

  // Sélection d'une image locale via la boîte de dialogue d'Electron
  async function handleSelectImage() {
    try {
      const path = await window.api.selectLogo()
      if (path) {
        setSelectedImageFile(path)
      }
    } catch (err) {
      console.error("Erreur lors de la sélection d'image :", err)
    }
  }

  // Suppression de l'image configurée
  function handleRemoveImage() {
    setSelectedImageFile(null)
    setImageUrl('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    
    if (!form.barcode.trim()) { setError('Le code-barres est requis'); return }
    if (!form.name.trim()) { setError('Le nom du produit est requis'); return }
    
    try {
      setSaving(true)
      
      // L'imageUrl finale en base de données. 
      // Si une nouvelle image locale a été sélectionnée, on met temporairement à vide puis on la copiera.
      let finalImageUrl = selectedImageFile ? '' : imageUrl

      const data: Record<string, any> = {
        barcode: form.barcode.trim(), name: form.name.trim(),
        basePrice: parseFloat(form.basePrice) || 0, sellingPrice: parseFloat(form.sellingPrice) || 0,
        vatRate: parseFloat(form.vatRate) || 19.25,
        supplierId: form.supplierId === '__none__' ? null : form.supplierId,
        categoryId: form.categoryId === '__none__' ? null : form.categoryId,
        imageUrl: finalImageUrl || null
      }
      
      for (const f of defaultFields) {
        data[`${f.key}_value`] = fieldValues[f.key] || null
      }

      let savedProduct;
      if (product) {
        savedProduct = await window.api.updateProduct(product.id, data)
      } else {
        savedProduct = await window.api.createProduct(data)
      }

      // Si un fichier d'image local a été choisi, on le copie localement et on met à jour le produit
      if (selectedImageFile && savedProduct) {
        try {
          const finalPath = await window.api.saveProductImage(selectedImageFile, savedProduct.id)
          await window.api.updateProduct(savedProduct.id, { imageUrl: finalPath })
        } catch (imgErr) {
          console.error("Erreur lors de la sauvegarde de l'image locale :", imgErr)
        }
      }

      // Notification globale d'activité
      useNotifications.getState().addNotification({
        type: 'produit_cree',
        title: product ? 'Produit mis à jour' : 'Nouveau produit créé',
        description: `${form.name} a été enregistré avec succès`,
        meta: { produit: form.name }
      })

      onSave()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'enregistrement du produit")
    } finally { 
      setSaving(false) 
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 animate-fade-in text-foreground">
      {error && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive flex items-center gap-2.5">
          <ShieldAlert className="h-5 w-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Grid Bento à 3 Colonnes sur grand écran */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Colonnes Principales : Informations et Classification (2/3 de l'espace) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Section 1 : Informations principales */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Package className="h-4 w-4" /> Informations de base
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 rounded-xl border bg-muted/20 p-5">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Nom du produit</Label>
                <Input 
                  placeholder="Ex: Coca-Cola 33cl" 
                  value={form.name} 
                  onChange={(e) => setField('name', e.target.value)} 
                  className="h-10 bg-background" 
                  required
                />
              </div>
              
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Code-barres (Scanner ou saisir)</Label>
                <Input 
                  placeholder="Scannez l'article ou saisissez manuellement" 
                  value={form.barcode} 
                  onChange={(e) => setField('barcode', e.target.value)} 
                  className="h-10 bg-background font-mono" 
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Prix d'achat de base (FCFA)</Label>
                <Input 
                  type="number" 
                  step="0.01" 
                  min="0" 
                  value={form.basePrice} 
                  onChange={(e) => setField('basePrice', e.target.value)} 
                  className="h-10 bg-background" 
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Prix de vente (FCFA)</Label>
                <Input 
                  type="number" 
                  step="0.01" 
                  min="0" 
                  value={form.sellingPrice} 
                  onChange={(e) => setField('sellingPrice', e.target.value)} 
                  className="h-10 bg-background font-semibold text-emerald-600 dark:text-emerald-400 focus-visible:ring-emerald-500" 
                />
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <Label className="text-xs font-medium">Taux de TVA (%)</Label>
                <Input 
                  type="number" 
                  step="0.01" 
                  min="0" 
                  value={form.vatRate} 
                  onChange={(e) => setField('vatRate', e.target.value)} 
                  className="h-10 bg-background" 
                />
              </div>
            </div>
          </div>

          {/* Section 2 : Classification et Partenaires */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Tag className="h-4 w-4" /> Classification & Relations
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 rounded-xl border bg-muted/20 p-5">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Catégorie</Label>
                <Select value={form.categoryId} onValueChange={(val) => setField('categoryId', val)}>
                  <SelectTrigger className="h-10 bg-background">
                    <SelectValue placeholder="Aucune catégorie (classé dans 'Autre')" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Aucune catégorie (classé dans 'Autre')</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Fournisseur</Label>
                <Select value={form.supplierId} onValueChange={(val) => setField('supplierId', val)}>
                  <SelectTrigger className="h-10 bg-background">
                    <SelectValue placeholder="Aucun fournisseur lié" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Aucun fournisseur lié</SelectItem>
                    {suppliers.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

        </div>

        {/* Colonne Latérale : Gestion de l'image et Caractéristiques (1/3 de l'espace) */}
        <div className="space-y-6">
          
          {/* Section 3 : Image du produit */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <ImageIcon className="h-4 w-4" /> Illustration du produit
            </h3>
            <div className="rounded-xl border bg-muted/20 p-5 flex flex-col items-center gap-4">
              
              {/* Cadre d'aperçu de l'image */}
              <div className="relative flex h-48 w-full items-center justify-center rounded-xl border-2 border-dashed border-muted-foreground/20 bg-background overflow-hidden group">
                {selectedImageFile || imageUrl ? (
                  <>
                    <img 
                      src={selectedImageFile ? `local-file://${selectedImageFile}` : imageUrl.startsWith('http') ? imageUrl : `local-file://${imageUrl}`} 
                      alt="Aperçu du produit" 
                      className="h-full w-full object-cover transition-transform group-hover:scale-105 duration-200" 
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity gap-2">
                      <Button type="button" size="sm" variant="secondary" onClick={handleSelectImage}>Changer</Button>
                      <Button type="button" size="sm" variant="destructive" onClick={handleRemoveImage}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground p-4 text-center">
                    <ImageIcon className="h-10 w-10 stroke-[1.2]" />
                    <p className="text-xs">Aucune image configurée</p>
                    <Button type="button" size="xs" variant="outline" onClick={handleSelectImage} className="mt-1">
                      <Upload className="h-3 w-3 mr-1" /> Choisir un fichier
                    </Button>
                  </div>
                )}
              </div>

              {/* Saisie d'une URL d'image alternative */}
              <div className="w-full space-y-1.5">
                <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Ou coller l'URL d'une image web</Label>
                <Input 
                  placeholder="https://exemple.com/image.jpg" 
                  value={imageUrl} 
                  onChange={(e) => {
                    setSelectedImageFile(null)
                    setImageUrl(e.target.value)
                  }} 
                  className="h-9 text-xs bg-background" 
                />
              </div>

            </div>
          </div>

          {/* Section 4 : Caractéristiques personnalisées */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Fiche Technique (Détails)</h3>
            <div className="rounded-xl border bg-muted/20 p-5 space-y-3 max-h-[300px] overflow-y-auto pr-1 shadow-inner">
              {defaultFields.map((f) => (
                <div key={f.key} className="space-y-1">
                  <Label className="text-xs font-medium text-muted-foreground">{f.label}</Label>
                  <Input
                    value={fieldValues[f.key] ?? ''}
                    onChange={(e) => setFieldValues((v) => ({ ...v, [f.key]: e.target.value }))}
                    type={f.key === 'field6' ? 'date' : f.key === 'field7' ? 'number' : 'text'}
                    className="h-8 text-xs bg-background"
                  />
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

      {/* Barre d'actions en bas */}
      <div className="flex justify-end gap-3 border-t pt-4">
        <Button type="button" variant="outline" onClick={onCancel} className="h-10 px-5">Annuler</Button>
        <Button type="submit" disabled={saving} className="h-10 px-6 min-w-[140px]">
          {saving ? 'Enregistrement...' : product ? 'Mettre à jour' : 'Créer le produit'}
        </Button>
      </div>
    </form>
  )
}
