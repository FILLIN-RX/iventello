import { useEffect, useState } from 'react'
import {
  FileText,
  Upload,
  Trash2,
  Palette,
  LayoutTemplate,
  ScrollText,
  Landmark,
  Sparkles,
  Check,
  Building,
  ShieldCheck,
  Zap,
  Info
} from 'lucide-react'
import { toFileUrl } from '../../../shared/imageUtils'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Textarea } from '../components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../components/ui/select'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs'
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
  invoiceTemplate: 'MODERNE' | 'CLASSIQUE' | 'MINIMALISTE'
  invoiceColor: string
  invoiceTerms: string
  invoiceBankDetails: string
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
  invoiceFooter: '',
  invoiceTemplate: 'MODERNE',
  invoiceColor: '#2563eb',
  invoiceTerms: '',
  invoiceBankDetails: ''
}

const COLOR_PRESETS = [
  { name: 'Bleu Roi', hex: '#2563eb' },
  { name: 'Bleu Marine', hex: '#1e3a8a' },
  { name: 'Émeraude', hex: '#059669' },
  { name: 'Indigo', hex: '#4f46e5' },
  { name: 'Violet Sombre', hex: '#7c3aed' },
  { name: 'Bordeaux', hex: '#991b1b' },
  { name: 'Ambre / Or', hex: '#d97706' },
  { name: 'Noir Élégant', hex: '#18181b' },
  { name: 'Anthracite', hex: '#334155' },
  { name: 'Teal Moderne', hex: '#0d9488' }
]

const TERMS_PRESETS = [
  {
    title: 'Standard (Commerce général)',
    text: 'Les marchandises vendues ne sont ni reprises ni échangées après un délai de 48 heures. Tout retard de paiement entraînera l\'application de pénalités.'
  },
  {
    title: 'Garantie & Électronique (6 mois)',
    text: 'Garantie constructeur de 6 mois applicable sur présentation obligatoire de la facture originale. La garantie exclut l\'oxydation, les chocs physiques et l\'usage non conforme.'
  },
  {
    title: 'Vente au comptant (Sans reprise)',
    text: 'Marchandises vérifiées et reçues en parfait état. Aucun retour ni échange possible après sortie du magasin.'
  },
  {
    title: 'Prestation de Services & Pro',
    text: 'Paiement exigible à réception de facture ou selon les modalités convenues. Propriété des biens réservée jusqu\'au paiement intégral du prix.'
  }
]

export default function SettingsView() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [selectedId, setSelectedId] = useState<string>('')
  const [form, setForm] = useState<FormState>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [activeTab, setActiveTab] = useState<'design' | 'general' | 'terms' | 'bank'>('design')

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
        invoiceFooter: selectedWarehouse.invoiceFooter ?? '',
        invoiceTemplate: (selectedWarehouse.invoiceTemplate as any) || 'MODERNE',
        invoiceColor: selectedWarehouse.invoiceColor || '#2563eb',
        invoiceTerms: selectedWarehouse.invoiceTerms ?? '',
        invoiceBankDetails: selectedWarehouse.invoiceBankDetails ?? ''
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
      setTimeout(() => setDone(false), 2500)
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

  const primaryColor = form.invoiceColor || '#2563eb'

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* En-tête principal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2.5 text-foreground">
            <FileText className="h-6 w-6 text-primary" /> Paramètres & Personnalisation Facture
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Personnalisez vos modèles de factures, votre identité visuelle, vos couleurs et vos mentions légales.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={handleSave} disabled={saving} className="shadow-sm">
            {saving ? 'Enregistrement...' : 'Enregistrer les modifications'}
          </Button>
          {done && (
            <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-3 py-1.5 rounded-full animate-in fade-in">
              <Check className="h-3.5 w-3.5" /> Enregistré
            </span>
          )}
        </div>
      </div>

      {/* Sélecteur de boutique */}
      <Card className="border-border/60 shadow-sm">
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-wrap items-center gap-4">
            <Label className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Boutique :</Label>
            <Select value={selectedId} onValueChange={setSelectedId}>
              <SelectTrigger className="w-72 font-medium">
                <SelectValue placeholder="Sélectionner une boutique" />
              </SelectTrigger>
              <SelectContent>
                {warehouses.map((w) => (
                  <SelectItem key={w.id} value={w.id}>
                    {w.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedWarehouse?.location && (
              <span className="text-xs bg-muted text-muted-foreground px-2.5 py-1 rounded-md">
                📍 {selectedWarehouse.location}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {selectedId && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* COLONNE GAUCHE — Configuration & Onglets */}
          <div className="lg:col-span-7 space-y-6">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
              <TabsList className="grid grid-cols-4 w-full h-11 p-1 bg-muted/60">
                <TabsTrigger value="design" className="flex items-center gap-1.5 text-xs font-medium">
                  <Palette className="h-3.5 w-3.5" /> Design & Modèle
                </TabsTrigger>
                <TabsTrigger value="general" className="flex items-center gap-1.5 text-xs font-medium">
                  <Building className="h-3.5 w-3.5" /> Société & Logo
                </TabsTrigger>
                <TabsTrigger value="terms" className="flex items-center gap-1.5 text-xs font-medium">
                  <ScrollText className="h-3.5 w-3.5" /> Conditions & Termes
                </TabsTrigger>
                <TabsTrigger value="bank" className="flex items-center gap-1.5 text-xs font-medium">
                  <Landmark className="h-3.5 w-3.5" /> Paiements & Pied
                </TabsTrigger>
              </TabsList>

              {/* ONGLET 1 : DESIGN & MODÈLES */}
              <TabsContent value="design" className="space-y-6 mt-5">
                {/* Choix des 3 Templates */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <LayoutTemplate className="h-4 w-4 text-primary" /> Modèle de facture (Template)
                    </CardTitle>
                    <CardDescription>
                      Choisissez le style visuel qui correspond le mieux à votre image de marque.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                      {/* Template 1: Moderne */}
                      <div
                        onClick={() => setField('invoiceTemplate', 'MODERNE')}
                        className={`cursor-pointer rounded-xl border-2 p-3.5 transition-all relative flex flex-col justify-between ${
                          form.invoiceTemplate === 'MODERNE'
                            ? 'border-primary bg-primary/5 shadow-md ring-2 ring-primary/20'
                            : 'border-border/70 hover:border-border hover:bg-muted/40'
                        }`}
                      >
                        {form.invoiceTemplate === 'MODERNE' && (
                          <span className="absolute top-2.5 right-2.5 h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold">
                            <Check className="h-3 w-3" />
                          </span>
                        )}
                        <div>
                          <div className="h-16 w-full rounded-md bg-muted/80 p-2 mb-2.5 flex flex-col justify-between overflow-hidden border">
                            <div className="h-3 rounded-t" style={{ backgroundColor: primaryColor }} />
                            <div className="space-y-1">
                              <div className="h-1.5 w-3/4 bg-foreground/20 rounded" />
                              <div className="h-1.5 w-1/2 bg-foreground/15 rounded" />
                            </div>
                          </div>
                          <p className="font-semibold text-sm">1. Moderne</p>
                          <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
                            Bandeau coloré, typographie épurée, accents visuels contemporains.
                          </p>
                        </div>
                        <span className="mt-3 inline-flex text-[11px] font-medium text-primary">Recommandé</span>
                      </div>

                      {/* Template 2: Classique */}
                      <div
                        onClick={() => setField('invoiceTemplate', 'CLASSIQUE')}
                        className={`cursor-pointer rounded-xl border-2 p-3.5 transition-all relative flex flex-col justify-between ${
                          form.invoiceTemplate === 'CLASSIQUE'
                            ? 'border-primary bg-primary/5 shadow-md ring-2 ring-primary/20'
                            : 'border-border/70 hover:border-border hover:bg-muted/40'
                        }`}
                      >
                        {form.invoiceTemplate === 'CLASSIQUE' && (
                          <span className="absolute top-2.5 right-2.5 h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold">
                            <Check className="h-3 w-3" />
                          </span>
                        )}
                        <div>
                          <div className="h-16 w-full rounded-md bg-muted/80 p-2 mb-2.5 flex flex-col justify-between overflow-hidden border border-dashed">
                            <div className="flex justify-between items-center border-b pb-1">
                              <div className="h-2 w-10 bg-foreground/40 rounded" />
                              <div className="h-2 w-12 rounded" style={{ backgroundColor: primaryColor }} />
                            </div>
                            <div className="grid grid-cols-3 gap-1">
                              <div className="h-3 bg-foreground/10 rounded" />
                              <div className="h-3 bg-foreground/10 rounded" />
                              <div className="h-3 bg-foreground/10 rounded" />
                            </div>
                          </div>
                          <p className="font-semibold text-sm">2. Classique</p>
                          <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
                            Structure commerciale officielle, encadrés formels et clairs.
                          </p>
                        </div>
                        <span className="mt-3 inline-flex text-[11px] font-medium text-muted-foreground">Corporate</span>
                      </div>

                      {/* Template 3: Minimaliste */}
                      <div
                        onClick={() => setField('invoiceTemplate', 'MINIMALISTE')}
                        className={`cursor-pointer rounded-xl border-2 p-3.5 transition-all relative flex flex-col justify-between ${
                          form.invoiceTemplate === 'MINIMALISTE'
                            ? 'border-primary bg-primary/5 shadow-md ring-2 ring-primary/20'
                            : 'border-border/70 hover:border-border hover:bg-muted/40'
                        }`}
                      >
                        {form.invoiceTemplate === 'MINIMALISTE' && (
                          <span className="absolute top-2.5 right-2.5 h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold">
                            <Check className="h-3 w-3" />
                          </span>
                        )}
                        <div>
                          <div className="h-16 w-full rounded-md bg-background p-2 mb-2.5 flex flex-col justify-between border">
                            <div className="flex justify-between">
                              <div className="h-2 w-8 bg-foreground/50 rounded" />
                              <div className="h-1.5 w-6 rounded" style={{ backgroundColor: primaryColor }} />
                            </div>
                            <div className="border-t border-b py-1 flex justify-between">
                              <div className="h-1 w-12 bg-foreground/20 rounded" />
                              <div className="h-1 w-6 bg-foreground/20 rounded" />
                            </div>
                          </div>
                          <p className="font-semibold text-sm">3. Minimaliste</p>
                          <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
                            Design ultra sobre, lignes fines, style moderne et économique en encre.
                          </p>
                        </div>
                        <span className="mt-3 inline-flex text-[11px] font-medium text-muted-foreground">Épuré</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Couleur Principale */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Palette className="h-4 w-4 text-primary" /> Couleur principale de la marque
                    </CardTitle>
                    <CardDescription>
                      Cette couleur sera appliquée aux titres, bordures et accents des factures générées.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Palette rapide */}
                    <div>
                      <Label className="text-xs text-muted-foreground mb-2 block font-medium">Palette prédéfinie :</Label>
                      <div className="flex flex-wrap gap-2.5 items-center">
                        {COLOR_PRESETS.map((col) => (
                          <button
                            key={col.hex}
                            type="button"
                            title={col.name}
                            onClick={() => setField('invoiceColor', col.hex)}
                            className={`h-8 w-8 rounded-full transition-transform flex items-center justify-center shadow-sm relative ${
                              form.invoiceColor?.toLowerCase() === col.hex.toLowerCase()
                                ? 'scale-110 ring-2 ring-offset-2 ring-primary'
                                : 'hover:scale-105 opacity-90 hover:opacity-100'
                            }`}
                            style={{ backgroundColor: col.hex }}
                          >
                            {form.invoiceColor?.toLowerCase() === col.hex.toLowerCase() && (
                              <Check className="h-4 w-4 text-white drop-shadow" />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Sélecteur de couleur custom */}
                    <div className="flex items-center gap-3 pt-2 border-t">
                      <div className="space-y-1">
                        <Label className="text-xs">Couleur personnalisée (Hex)</Label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={form.invoiceColor || '#2563eb'}
                            onChange={(e) => setField('invoiceColor', e.target.value)}
                            className="h-9 w-12 rounded cursor-pointer border p-0.5 bg-background"
                          />
                          <Input
                            value={form.invoiceColor || '#2563eb'}
                            onChange={(e) => setField('invoiceColor', e.target.value)}
                            className="w-28 font-mono uppercase text-xs"
                            placeholder="#2563EB"
                          />
                        </div>
                      </div>
                      <div className="ml-auto text-xs text-muted-foreground flex items-center gap-1.5">
                        <div className="h-4 w-4 rounded" style={{ backgroundColor: primaryColor }} />
                        <span>Aperçu de la couleur</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ONGLET 2 : SOCIÉTÉ & LOGO */}
              <TabsContent value="general" className="space-y-6 mt-5">
                {/* Logo */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Logo de l'entreprise</CardTitle>
                    <CardDescription>Format carré ou rectangulaire conseillé (PNG, JPG).</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {form.invoiceCompanyLogo ? (
                      <div className="flex items-center gap-4 p-3 border rounded-lg bg-muted/20">
                        <img
                          src={
                            form.invoiceCompanyLogo.startsWith('http')
                              ? form.invoiceCompanyLogo
                              : toFileUrl(form.invoiceCompanyLogo)
                          }
                          alt="Logo facture"
                          className="h-16 w-16 rounded-lg object-contain bg-white border p-1"
                        />
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-foreground">Logo actuel configuré</p>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={handleSelectLogo}>
                              <Upload className="h-3.5 w-3.5 mr-1" /> Changer
                            </Button>
                            <Button variant="ghost" size="sm" onClick={handleRemoveLogo} className="text-destructive hover:text-destructive">
                              <Trash2 className="h-3.5 w-3.5 mr-1" /> Supprimer
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <Button variant="outline" onClick={handleSelectLogo} className="w-full py-6 border-dashed">
                        <Upload className="h-4 w-4 mr-2" /> Sélectionner un logo sur votre ordinateur
                      </Button>
                    )}
                  </CardContent>
                </Card>

                {/* Coordonnées */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Informations de l'entreprise</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-1.5">
                      <Label>Nom commercial / Raison Sociale</Label>
                      <Input
                        value={form.invoiceCompanyName}
                        onChange={(e) => setField('invoiceCompanyName', e.target.value)}
                        placeholder={selectedWarehouse?.name ?? 'Nom de votre magasin'}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label>NUI (Identifiant Unique / Registre)</Label>
                        <Input
                          value={form.invoiceCompanyNui}
                          onChange={(e) => setField('invoiceCompanyNui', e.target.value)}
                          placeholder="M101900012345Z"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>BP (Boîte Postale & Ville)</Label>
                        <Input
                          value={form.invoiceCompanyBp}
                          onChange={(e) => setField('invoiceCompanyBp', e.target.value)}
                          placeholder="BP 1234 Douala"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Adresse physique / Localisation</Label>
                      <Input
                        value={form.invoiceCompanyAddress}
                        onChange={(e) => setField('invoiceCompanyAddress', e.target.value)}
                        placeholder="Carrefour Akwa, Face Hôtel..."
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label>Téléphones (un par ligne)</Label>
                        <Textarea
                          rows={2}
                          value={form.invoiceCompanyPhones}
                          onChange={(e) => setField('invoiceCompanyPhones', e.target.value)}
                          placeholder="+237 6XX XXX XXX&#10;+237 6XX XXX XXX"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Email commercial</Label>
                        <Input
                          value={form.invoiceCompanyEmail}
                          onChange={(e) => setField('invoiceCompanyEmail', e.target.value)}
                          placeholder="contact@entreprise.com"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Slogan / Activité</Label>
                      <Input
                        value={form.invoiceCompanyDescription}
                        onChange={(e) => setField('invoiceCompanyDescription', e.target.value)}
                        placeholder="Vente de matériel informatique & accessoires"
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ONGLET 3 : CONDITIONS & TERMES */}
              <TabsContent value="terms" className="space-y-6 mt-5">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <ScrollText className="h-4 w-4 text-primary" /> Conditions générales de vente & Mentions
                    </CardTitle>
                    <CardDescription>
                      Ces termes apparaîtront au bas de chaque facture pour encadrer les garanties, retours et délais.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Modèles prédéfinis en 1 clic */}
                    <div>
                      <Label className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5 text-amber-500" /> Insérer un modèle prêt à l'emploi :
                      </Label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {TERMS_PRESETS.map((preset, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setField('invoiceTerms', preset.text)}
                            className="text-left p-2.5 rounded-lg border bg-card hover:bg-muted/60 transition-colors text-xs space-y-1 group"
                          >
                            <div className="font-semibold text-foreground group-hover:text-primary transition-colors flex items-center justify-between">
                              <span>{preset.title}</span>
                              <Zap className="h-3 w-3 text-muted-foreground group-hover:text-primary" />
                            </div>
                            <p className="text-muted-foreground line-clamp-2 text-[11px]">{preset.text}</p>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1.5 pt-2">
                      <Label className="font-medium">Texte des conditions de vente (modifiable librement) :</Label>
                      <Textarea
                        rows={5}
                        value={form.invoiceTerms}
                        onChange={(e) => setField('invoiceTerms', e.target.value)}
                        placeholder="Ex : Les marchandises vendues ne sont ni reprises ni échangées après 48h. Garantie 6 mois..."
                        className="text-xs font-normal"
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ONGLET 4 : BANQUE & PIED DE PAGE */}
              <TabsContent value="bank" className="space-y-6 mt-5">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Landmark className="h-4 w-4 text-primary" /> Coordonnées de paiement (Bancaire & Mobile Money)
                    </CardTitle>
                    <CardDescription>
                      Affichées sur la facture pour faciliter les virements et règlements à distance.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-1.5">
                      <Label>Coordonnées Bancaires / Mobile Money</Label>
                      <Textarea
                        rows={4}
                        value={form.invoiceBankDetails}
                        onChange={(e) => setField('invoiceBankDetails', e.target.value)}
                        placeholder={'Banque : UBA | IBAN : CM21 1003 3000 0000 1234 56\nOrange Money : 699 00 00 00 (Mon Entreprise)\nMTN Mobile Money : 677 00 00 00'}
                        className="text-xs font-mono"
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Pied de page & Remerciements</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-1.5">
                      <Label>Message de fin de facture</Label>
                      <Input
                        value={form.invoiceFooter}
                        onChange={(e) => setField('invoiceFooter', e.target.value)}
                        placeholder="Merci de votre confiance ! À très bientôt."
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* COLONNE DROITE — Live Preview Exacte */}
          <div className="lg:col-span-5 sticky top-6">
            <Card className="border-border/80 shadow-lg overflow-hidden">
              <CardHeader className="bg-muted/40 py-3 px-4 border-b flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4 text-primary" /> Aperçu en direct (Live Preview)
                  </CardTitle>
                  <span className="text-[11px] text-muted-foreground">
                    Modèle {form.invoiceTemplate} • {COLOR_PRESETS.find(c => c.hex.toLowerCase() === form.invoiceColor.toLowerCase())?.name || form.invoiceColor}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="p-4 bg-muted/20">
                {/* FEUILLE DE FACTURE PRÉVISUALISÉE */}
                <div className="rounded-xl border bg-white text-gray-900 shadow-sm p-5 text-xs select-none min-h-[500px] flex flex-col justify-between">
                  {/* TEMPLATE 1 : MODERNE */}
                  {form.invoiceTemplate === 'MODERNE' && (
                    <div className="space-y-4">
                      {/* Bandeau d'en-tête coloré */}
                      <div
                        className="rounded-lg p-3 text-white flex items-center justify-between"
                        style={{ backgroundColor: primaryColor }}
                      >
                        <div className="flex items-center gap-3">
                          {form.invoiceCompanyLogo && (
                            <img
                              src={form.invoiceCompanyLogo.startsWith('http') ? form.invoiceCompanyLogo : toFileUrl(form.invoiceCompanyLogo)}
                              alt="Logo"
                              className="h-10 w-10 rounded-md object-contain bg-white/95 p-0.5 shadow-sm"
                            />
                          )}
                          <div>
                            <h2 className="text-sm font-bold tracking-tight">
                              {form.invoiceCompanyName || selectedWarehouse?.name || 'Mon Entreprise'}
                            </h2>
                            {form.invoiceCompanyDescription && (
                              <p className="text-[10px] text-white/80 line-clamp-1">{form.invoiceCompanyDescription}</p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-black tracking-widest uppercase bg-white/20 px-2 py-0.5 rounded">FACTURE</span>
                          <p className="text-[10px] text-white/80 font-mono mt-0.5">N° FACT-2026-001</p>
                        </div>
                      </div>

                      {/* Coordonnées & Client */}
                      <div className="grid grid-cols-2 gap-3 text-[11px] text-gray-600 border-b pb-3">
                        <div className="space-y-0.5">
                          <p className="font-semibold text-gray-900 text-xs">Émetteur</p>
                          {form.invoiceCompanyAddress && <p>{form.invoiceCompanyAddress}</p>}
                          {form.invoiceCompanyNui && <p>NUI: {form.invoiceCompanyNui}</p>}
                          {form.invoiceCompanyPhones && <p>Tél: {form.invoiceCompanyPhones.split('\n')[0]}</p>}
                          {form.invoiceCompanyEmail && <p>{form.invoiceCompanyEmail}</p>}
                        </div>
                        <div className="space-y-0.5 bg-gray-50 p-2 rounded-lg border text-right">
                          <p className="font-semibold text-gray-900 text-xs">Client : ETS Jean Dupont</p>
                          <p>Date : 14/09/2026</p>
                          <p className="font-medium" style={{ color: primaryColor }}>Statut : PAYÉ</p>
                        </div>
                      </div>

                      {/* Tableau Moderne */}
                      <div className="overflow-hidden rounded-lg border">
                        <table className="w-full text-left text-[11px]">
                          <thead style={{ backgroundColor: primaryColor, color: '#ffffff' }}>
                            <tr>
                              <th className="py-1.5 px-2.5 font-semibold">Article</th>
                              <th className="py-1.5 px-2 text-center font-semibold">Qté</th>
                              <th className="py-1.5 px-2 text-right font-semibold">Prix U.</th>
                              <th className="py-1.5 px-2.5 text-right font-semibold">Total</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 bg-white">
                            <tr className="hover:bg-gray-50/60">
                              <td className="py-1.5 px-2.5 font-medium text-gray-800">Écran Dell UltraSharp 27"</td>
                              <td className="py-1.5 px-2 text-center">1</td>
                              <td className="py-1.5 px-2 text-right">180 000 F</td>
                              <td className="py-1.5 px-2.5 text-right font-medium">180 000 F</td>
                            </tr>
                            <tr className="bg-gray-50/40">
                              <td className="py-1.5 px-2.5 font-medium text-gray-800">Clavier Sans Fil Mécanique</td>
                              <td className="py-1.5 px-2 text-center">2</td>
                              <td className="py-1.5 px-2 text-right">25 000 F</td>
                              <td className="py-1.5 px-2.5 text-right font-medium">50 000 F</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      {/* Totaux */}
                      <div className="flex justify-end pt-1">
                        <div className="w-48 space-y-1 text-right">
                          <div className="flex justify-between text-gray-500 text-[11px]">
                            <span>Sous-total</span>
                            <span>230 000 F</span>
                          </div>
                          <div className="flex justify-between text-[11px] font-bold p-1.5 rounded" style={{ backgroundColor: `${primaryColor}15`, color: primaryColor }}>
                            <span>NET À PAYER</span>
                            <span>230 000 F</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TEMPLATE 2 : CLASSIQUE */}
                  {form.invoiceTemplate === 'CLASSIQUE' && (
                    <div className="space-y-4">
                      {/* En-tête classique entreprise */}
                      <div className="border-b-2 pb-3" style={{ borderColor: primaryColor }}>
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            {form.invoiceCompanyLogo && (
                              <img
                                src={form.invoiceCompanyLogo.startsWith('http') ? form.invoiceCompanyLogo : toFileUrl(form.invoiceCompanyLogo)}
                                alt="Logo"
                                className="h-12 w-12 rounded object-contain border p-0.5"
                              />
                            )}
                            <div>
                              <h2 className="text-base font-bold uppercase tracking-wide" style={{ color: primaryColor }}>
                                {form.invoiceCompanyName || selectedWarehouse?.name || 'Mon Entreprise'}
                              </h2>
                              {form.invoiceCompanyDescription && (
                                <p className="text-[10px] text-gray-500 italic">{form.invoiceCompanyDescription}</p>
                              )}
                              <p className="text-[10px] text-gray-500">{form.invoiceCompanyAddress || 'Douala, Cameroun'}</p>
                              <div className="flex gap-2 text-[10px] text-gray-500">
                                {form.invoiceCompanyNui && <span>NUI: {form.invoiceCompanyNui}</span>}
                                {form.invoiceCompanyBp && <span>BP: {form.invoiceCompanyBp}</span>}
                              </div>
                            </div>
                          </div>
                          <div className="border-2 p-2 rounded text-right" style={{ borderColor: primaryColor }}>
                            <p className="text-xs font-bold" style={{ color: primaryColor }}>FACTURE COMMERCIALE</p>
                            <p className="text-[10px] font-mono">N° FACT-2026-001</p>
                            <p className="text-[10px] text-gray-500">Date : 14/09/2026</p>
                          </div>
                        </div>
                      </div>

                      {/* Cadre Client Formel */}
                      <div className="border rounded p-2 bg-gray-50/70 text-[11px]">
                        <p className="font-bold text-gray-800">Facturé à : ETS Jean Dupont</p>
                        <p className="text-gray-600">Akwa, Douala • Tél: +237 699 00 00 00</p>
                      </div>

                      {/* Tableau Classique */}
                      <table className="w-full text-left text-[11px] border border-gray-300">
                        <thead className="bg-gray-100 border-b border-gray-300 text-gray-800">
                          <tr>
                            <th className="py-1 px-2 border-r">Désignation</th>
                            <th className="py-1 px-2 text-center border-r">Qté</th>
                            <th className="py-1 px-2 text-right border-r">Prix Unit.</th>
                            <th className="py-1 px-2 text-right">Montant</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          <tr>
                            <td className="py-1 px-2 border-r">Écran Dell UltraSharp 27"</td>
                            <td className="py-1 px-2 text-center border-r">1</td>
                            <td className="py-1 px-2 text-right border-r">180 000 F</td>
                            <td className="py-1 px-2 text-right font-medium">180 000 F</td>
                          </tr>
                          <tr>
                            <td className="py-1 px-2 border-r">Clavier Sans Fil Mécanique</td>
                            <td className="py-1 px-2 text-center border-r">2</td>
                            <td className="py-1 px-2 text-right border-r">25 000 F</td>
                            <td className="py-1 px-2 text-right font-medium">50 000 F</td>
                          </tr>
                        </tbody>
                      </table>

                      {/* Totaux Classique */}
                      <div className="flex justify-end pt-1">
                        <table className="w-48 text-[11px] border border-gray-300">
                          <tbody>
                            <tr className="border-b">
                              <td className="p-1 px-2 text-gray-600">Total HT</td>
                              <td className="p-1 px-2 text-right font-medium">230 000 F</td>
                            </tr>
                            <tr className="font-bold text-white" style={{ backgroundColor: primaryColor }}>
                              <td className="p-1 px-2">Total TTC</td>
                              <td className="p-1 px-2 text-right">230 000 F</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* TEMPLATE 3 : MINIMALISTE */}
                  {form.invoiceTemplate === 'MINIMALISTE' && (
                    <div className="space-y-4">
                      {/* En-tête épuré */}
                      <div className="flex justify-between items-start">
                        <div>
                          {form.invoiceCompanyLogo && (
                            <img
                              src={form.invoiceCompanyLogo.startsWith('http') ? form.invoiceCompanyLogo : toFileUrl(form.invoiceCompanyLogo)}
                              alt="Logo"
                              className="h-9 w-9 rounded object-contain mb-1.5"
                            />
                          )}
                          <h2 className="text-sm font-bold text-gray-900 tracking-tight">
                            {form.invoiceCompanyName || selectedWarehouse?.name || 'Mon Entreprise'}
                          </h2>
                          <p className="text-[10px] text-gray-500">{form.invoiceCompanyAddress || 'Douala'}</p>
                          {form.invoiceCompanyEmail && <p className="text-[10px] text-gray-500">{form.invoiceCompanyEmail}</p>}
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">FACTURE</p>
                          <p className="text-sm font-mono font-bold text-gray-900">#FACT-2026-001</p>
                          <p className="text-[10px] text-gray-400">14 Sept. 2026</p>
                        </div>
                      </div>

                      {/* Client */}
                      <div className="text-[11px] pt-1 border-t border-gray-100">
                        <span className="text-gray-400 text-[10px] uppercase">Facturé à</span>
                        <p className="font-medium text-gray-800">ETS Jean Dupont</p>
                      </div>

                      {/* Tableau Minimaliste */}
                      <table className="w-full text-left text-[11px]">
                        <thead>
                          <tr className="border-b border-gray-200 text-gray-400 text-[10px] uppercase">
                            <th className="py-1 font-normal">Description</th>
                            <th className="py-1 text-center font-normal">Qté</th>
                            <th className="py-1 text-right font-normal">Prix</th>
                            <th className="py-1 text-right font-normal">Montant</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          <tr>
                            <td className="py-1.5 font-medium text-gray-800">Écran Dell UltraSharp 27"</td>
                            <td className="py-1.5 text-center text-gray-600">1</td>
                            <td className="py-1.5 text-right text-gray-600">180 000 F</td>
                            <td className="py-1.5 text-right font-semibold text-gray-900">180 000 F</td>
                          </tr>
                          <tr>
                            <td className="py-1.5 font-medium text-gray-800">Clavier Sans Fil Mécanique</td>
                            <td className="py-1.5 text-center text-gray-600">2</td>
                            <td className="py-1.5 text-right text-gray-600">25 000 F</td>
                            <td className="py-1.5 text-right font-semibold text-gray-900">50 000 F</td>
                          </tr>
                        </tbody>
                      </table>

                      {/* Total Minimaliste */}
                      <div className="flex justify-between items-baseline pt-2 border-t border-gray-200">
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total</span>
                        <span className="text-base font-black" style={{ color: primaryColor }}>230 000 F</span>
                      </div>
                    </div>
                  )}

                  {/* BAS DE FACTURE COMMUN DYNAMIQUE (Coordonnées & Termes) */}
                  <div className="mt-4 pt-3 border-t border-gray-100 space-y-2 text-[10px] text-gray-500">
                    {form.invoiceBankDetails && (
                      <div className="p-2 rounded bg-gray-50 border border-gray-200/60">
                        <p className="font-semibold text-gray-700 text-[10px] flex items-center gap-1 mb-0.5">
                          <Landmark className="h-3 w-3 text-primary" /> Coordonnées de règlement :
                        </p>
                        <p className="whitespace-pre-line font-mono text-[9px] text-gray-600">{form.invoiceBankDetails}</p>
                      </div>
                    )}

                    {form.invoiceTerms && (
                      <div className="space-y-0.5">
                        <p className="font-semibold text-gray-700 text-[10px] flex items-center gap-1">
                          <ShieldCheck className="h-3 w-3 text-emerald-600" /> Conditions & Garanties :
                        </p>
                        <p className="italic text-gray-600 leading-snug">{form.invoiceTerms}</p>
                      </div>
                    )}

                    {form.invoiceFooter && (
                      <p className="text-center font-medium text-gray-600 pt-1 border-t border-dashed">
                        {form.invoiceFooter}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {warehouses.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-12">
          Aucune boutique trouvée. Créez d'abord une boutique dans la section Boutiques.
        </p>
      )}
    </div>
  )
}

