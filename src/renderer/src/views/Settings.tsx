import { useEffect, useState } from 'react'
import { FileText, Upload, Trash2 } from 'lucide-react'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Textarea } from '../components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../components/ui/select'
import type { Warehouse } from '../../../shared/types'

interface FormState {
  invoiceCompanyName: string
  invoiceCompanyNui: string
  invoiceCompanyBp: string
  invoiceCompanyAddress: string
  invoiceCompanyPhones: string
  invoiceCompanyEmail: string
  invoiceCompanyLogo: string
  invoiceCompanyDescription: string
  invoiceFooter: string
}

const emptyForm: FormState = {
  invoiceCompanyName: '',
  invoiceCompanyNui: '',
  invoiceCompanyBp: '',
  invoiceCompanyAddress: '',
  invoiceCompanyPhones: '',
  invoiceCompanyEmail: '',
  invoiceCompanyLogo: '',
  invoiceCompanyDescription: '',
  invoiceFooter: ''
}

export default function SettingsView() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [selectedId, setSelectedId] = useState<string>('')
  const [form, setForm] = useState<FormState>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)

  const selectedWarehouse = warehouses.find((w) => w.id === selectedId)

  useEffect(() => {
    window.api.getWarehouses().then((list) => {
      setWarehouses(list)
      if (list.length > 0) {
        setSelectedId(list[0].id)
      }
    })
  }, [])

  useEffect(() => {
    if (selectedWarehouse) {
      setForm({
        invoiceCompanyName: selectedWarehouse.invoiceCompanyName ?? '',
        invoiceCompanyNui: selectedWarehouse.invoiceCompanyNui ?? '',
        invoiceCompanyBp: selectedWarehouse.invoiceCompanyBp ?? '',
        invoiceCompanyAddress: selectedWarehouse.invoiceCompanyAddress ?? '',
        invoiceCompanyPhones: selectedWarehouse.invoiceCompanyPhones ?? '',
        invoiceCompanyEmail: selectedWarehouse.invoiceCompanyEmail ?? '',
        invoiceCompanyLogo: selectedWarehouse.invoiceCompanyLogo ?? '',
        invoiceCompanyDescription: selectedWarehouse.invoiceCompanyDescription ?? '',
        invoiceFooter: selectedWarehouse.invoiceFooter ?? ''
      })
    } else {
      setForm(emptyForm)
    }
  }, [selectedId, warehouses])

  async function handleSave() {
    if (!selectedId) return
    setSaving(true)
    try {
      const updated = await window.api.updateWarehouse(selectedId, form)
      setWarehouses((prev) => prev.map((w) => (w.id === updated.id ? updated : w)))
      setDone(true)
      setTimeout(() => setDone(false), 2000)
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  async function handleSelectLogo() {
    const path = await window.api.selectLogo()
    if (path) {
      const saved = await window.api.saveInvoiceLogo(path, selectedId)
      setForm((prev) => ({ ...prev, invoiceCompanyLogo: saved }))
    }
  }

  function handleRemoveLogo() {
    setForm((prev) => ({ ...prev, invoiceCompanyLogo: '' }))
  }

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function displayVal(val: string | null | undefined): string {
    return val ?? ''
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" /> Paramètres de facturation
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configurez les informations qui apparaîtront sur les factures et reçus de chaque entrepôt.
          </p>
        </div>
      </div>

      {/* Sélecteur d'entrepôt */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <Label className="whitespace-nowrap">Entrepôt</Label>
            <Select value={selectedId} onValueChange={setSelectedId}>
              <SelectTrigger className="w-72">
                <SelectValue placeholder="Sélectionner un entrepôt" />
              </SelectTrigger>
              <SelectContent>
                {warehouses.map((w) => (
                  <SelectItem key={w.id} value={w.id}>
                    {w.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedWarehouse && (
              <span className="text-sm text-muted-foreground">
                {selectedWarehouse.location ?? ''}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {selectedId && (
        <div className="grid grid-cols-[1fr_400px] gap-6">
          {/* COLONNE GAUCHE — Formulaire */}
          <div className="space-y-6">
            {/* Logo */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Logo de l'entreprise</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {form.invoiceCompanyLogo ? (
                  <div className="flex items-center gap-3">
                    <img
                      src={
                        form.invoiceCompanyLogo.startsWith('http')
                          ? form.invoiceCompanyLogo
                          : `local-file://${form.invoiceCompanyLogo}`
                      }
                      alt="Logo facture"
                      className="h-16 w-16 rounded-lg object-cover border"
                    />
                    <Button variant="outline" size="sm" onClick={handleRemoveLogo}>
                      <Trash2 className="h-3.5 w-3.5 mr-1" /> Supprimer
                    </Button>
                  </div>
                ) : (
                  <Button variant="outline" onClick={handleSelectLogo}>
                    <Upload className="h-4 w-4 mr-2" /> Choisir un logo
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Informations société */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Informations de l'entreprise</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Nom de l'entreprise</Label>
                  <Input
                    value={form.invoiceCompanyName}
                    onChange={(e) => setField('invoiceCompanyName', e.target.value)}
                    placeholder={selectedWarehouse?.name ?? ''}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>NUI (Numéro d'Identification Unique)</Label>
                    <Input
                      value={form.invoiceCompanyNui}
                      onChange={(e) => setField('invoiceCompanyNui', e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>BP (Boîte Postale)</Label>
                    <Input
                      value={form.invoiceCompanyBp}
                      onChange={(e) => setField('invoiceCompanyBp', e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Adresse</Label>
                  <Input
                    value={form.invoiceCompanyAddress}
                    onChange={(e) => setField('invoiceCompanyAddress', e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Téléphones (un par ligne)</Label>
                    <Textarea
                      rows={3}
                      value={form.invoiceCompanyPhones}
                      onChange={(e) => setField('invoiceCompanyPhones', e.target.value)}
                      placeholder="+237 6XX XXX XXX&#10;+237 6XX XXX XXX"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Email</Label>
                    <Input
                      value={form.invoiceCompanyEmail}
                      onChange={(e) => setField('invoiceCompanyEmail', e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Description / Slogan</Label>
                  <Textarea
                    rows={2}
                    value={form.invoiceCompanyDescription}
                    onChange={(e) => setField('invoiceCompanyDescription', e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Pied de page */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Pied de page de la facture</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1.5">
                  <Label>Texte supplémentaire (conditions, remerciements…)</Label>
                  <Textarea
                    rows={3}
                    value={form.invoiceFooter}
                    onChange={(e) => setField('invoiceFooter', e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            <div className="flex items-center gap-3">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? 'Enregistrement...' : 'Enregistrer les paramètres'}
              </Button>
              {done && <span className="text-sm text-emerald-600 font-medium">✓ Enregistré</span>}
            </div>
          </div>

          {/* COLONNE DROITE — Aperçu */}
          <div className="sticky top-6 self-start">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Aperçu de la facture</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border bg-white p-6 text-sm">
                  {/* En-tête */}
                  <div className="flex items-start gap-4">
                    {form.invoiceCompanyLogo && (
                      <img
                        src={
                          form.invoiceCompanyLogo.startsWith('http')
                            ? form.invoiceCompanyLogo
                            : `local-file://${form.invoiceCompanyLogo}`
                        }
                        alt="Logo"
                        className="h-14 w-14 rounded object-cover"
                      />
                    )}
                    <div>
                      <h2 className="text-lg font-bold">
                        {form.invoiceCompanyName || selectedWarehouse?.name || 'Mon Entreprise'}
                      </h2>
                      {form.invoiceCompanyDescription && (
                        <p className="text-xs text-gray-500 italic">{form.invoiceCompanyDescription}</p>
                      )}
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-500 mt-1">
                        {form.invoiceCompanyNui && <span>NUI: {form.invoiceCompanyNui}</span>}
                        {form.invoiceCompanyBp && <span>BP: {form.invoiceCompanyBp}</span>}
                      </div>
                      {form.invoiceCompanyAddress && (
                        <p className="text-sm text-gray-600">{form.invoiceCompanyAddress}</p>
                      )}
                      <div className="flex flex-col gap-0.5 text-sm text-gray-500 mt-1">
                        {form.invoiceCompanyPhones
                          ?.split('\n')
                          .filter(Boolean)
                          .map((tel, i) => <span key={i}>{tel}</span>)}
                        {form.invoiceCompanyEmail && <span>{form.invoiceCompanyEmail}</span>}
                      </div>
                    </div>
                  </div>

                  {/* Corps facture */}
                  <div className="mt-4 border-t pt-3 text-right">
                    <h3 className="text-xl font-bold">FACTURE</h3>
                    <p className="text-sm text-gray-500">N° FACT-2026-0001</p>
                    <p className="text-sm text-gray-500">Date: 01/06/2026</p>
                  </div>

                  <div className="mt-3 border-y py-2">
                    <div className="flex justify-between text-xs font-medium text-gray-400 uppercase tracking-wide">
                      <span>Article</span>
                      <span>Qté × Px</span>
                      <span>Total</span>
                    </div>
                    <div className="flex justify-between text-sm py-1.5">
                      <span>Produit exemple</span>
                      <span>2 × 5 000</span>
                      <span>10 000 F</span>
                    </div>
                    <div className="flex justify-between text-sm py-1.5">
                      <span>Second article</span>
                      <span>1 × 3 500</span>
                      <span>3 500 F</span>
                    </div>
                  </div>

                  <div className="flex justify-between text-sm font-semibold pt-2">
                    <span>Total</span>
                    <span>13 500 F</span>
                  </div>

                  {/* Pied de page */}
                  {form.invoiceFooter && (
                    <div className="mt-4 border-t pt-3 text-xs text-gray-500 text-center">
                      {form.invoiceFooter}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {warehouses.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-12">
          Aucun entrepôt trouvé. Créez d'abord un entrepôt dans la section Entrepôts.
        </p>
      )}
    </div>
  )
}
