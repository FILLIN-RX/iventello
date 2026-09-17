import { useState, useEffect } from 'react'
import {
  FileSpreadsheet,
  Upload,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sliders,
  Table as TableIcon,
  Check,
  Building2,
  HelpCircle,
  Plus,
  Book
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { useWarehouses } from '../hooks/useWarehouses'
import { useEntrepotStore } from '../stores/entrepotStore'
import type {
  ExcelPreviewData,
  ExcelColumnMapping,
  ExcelImportResult,
  ExcelImportProgress
} from '../../../shared/types'

interface Props {
  open: boolean
  onClose: () => void
  onImportSuccess: () => void
}

type Step = 'file' | 'mapping' | 'preview' | 'importing' | 'result'

export function ImportExcelModal({ open, onClose, onImportSuccess }: Props) {
  const { warehouses } = useWarehouses()
  const defaultWarehouseId = useEntrepotStore((s) => s.selectedId)

  const [step, setStep] = useState<Step>('file')
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('')
  const [previewData, setPreviewData] = useState<ExcelPreviewData | null>(null)
  const [loadingFile, setLoadingFile] = useState(false)
  const [fileError, setFileError] = useState<string | null>(null)

  // Configuration du mapping
  const [mapping, setMapping] = useState<ExcelColumnMapping>({
    name: ''
  })

  // Options avancées
  const [updateExisting, setUpdateExisting] = useState(true)
  const [createCategories, setCreateCategories] = useState(true)
  const [defaultAlertLimit, setDefaultAlertLimit] = useState(5)
  const [showCustomFields, setShowCustomFields] = useState(false)

  // Progression & Résultat
  const [importResult, setImportResult] = useState<ExcelImportResult | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const [progress, setProgress] = useState<ExcelImportProgress | null>(null)

  // Écoute de la progression de l'import en direct
  useEffect(() => {
    if (!window.api.onImportProgress) return
    const unsubscribe = window.api.onImportProgress((data: any) => {
      setProgress(data as ExcelImportProgress)
    })
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe()
    }
  }, [])

  // Initialisation de la boutique
  useEffect(() => {
    if (defaultWarehouseId) {
      setSelectedWarehouseId(defaultWarehouseId)
    } else if (warehouses.length > 0) {
      setSelectedWarehouseId(warehouses[0].id)
    }
  }, [defaultWarehouseId, warehouses])

  // Réinitialisation à la fermeture/ouverture
  useEffect(() => {
    if (!open) {
      setStep('file')
      setPreviewData(null)
      setFileError(null)
      setImportResult(null)
      setImportError(null)
      setProgress(null)
    }
  }, [open])

  // Sélection du fichier via la boîte de dialogue native
  async function handleBrowseFile() {
    setFileError(null)
    try {
      const res = await window.api.selectExcelFile()
      if (res.canceled || !res.filePath) return
      await loadExcelPreview(res.filePath)
    } catch (err: any) {
      setFileError(err.message || 'Erreur lors de la sélection du fichier.')
    }
  }

  // Chargement et analyse du fichier Excel
  async function loadExcelPreview(filePath: string, sheetName?: string) {
    setLoadingFile(true)
    setFileError(null)
    try {
      const preview = await window.api.previewExcel(filePath, sheetName)
      setPreviewData(preview)

      // Initialiser le mapping avec les suggestions
      const suggested = preview.suggestedMapping || {}
      setMapping({
        name: suggested.name || '',
        barcode: suggested.barcode || '__none__',
        sellingPrice: suggested.sellingPrice || '__none__',
        basePrice: suggested.basePrice || '__none__',
        quantity: suggested.quantity || '__none__',
        category: suggested.category || '__none__',
        alertLimit: suggested.alertLimit || '__none__',
        field1: suggested.field1 || '__none__',
        field1_label: suggested.field1_label || 'Éditeur / Marque',
        field2: suggested.field2 || '__none__',
        field2_label: suggested.field2_label || 'Auteur / Modèle',
        field3: suggested.field3 || '__none__',
        field3_label: suggested.field3_label || 'Type / Spécification',
        field4: suggested.field4 || '__none__',
        field4_label: suggested.field4_label || 'Niveau / Dimension',
        field5: suggested.field5 || '__none__',
        field5_label: suggested.field5_label || 'Condition / État'
      })

      setStep('mapping')
    } catch (err: any) {
      setFileError(err.message || 'Impossible de lire ce fichier Excel.')
    } finally {
      setLoadingFile(false)
    }
  }

  // Changement de feuille
  async function handleSheetChange(sheetName: string) {
    if (!previewData) return
    await loadExcelPreview(previewData.filePath, sheetName)
  }

  // Lancement de l'importation
  async function handleExecuteImport() {
    if (!previewData || !selectedWarehouseId || !mapping.name) return

    setStep('importing')
    setImportError(null)

    // Nettoyer les "__none__" pour le backend
    const cleanMapping: ExcelColumnMapping = {
      name: mapping.name
    }

    const keys: (keyof ExcelColumnMapping)[] = [
      'barcode', 'sellingPrice', 'basePrice', 'quantity', 'category', 'alertLimit',
      'field1', 'field2', 'field3', 'field4', 'field5', 'field6', 'field7', 'field8', 'field9', 'field10'
    ]

    for (const k of keys) {
      const val = mapping[k]
      if (val && val !== '__none__') {
        cleanMapping[k] = val
        const labelKey = `${k}_label` as keyof ExcelColumnMapping
        if (mapping[labelKey]) {
          cleanMapping[labelKey] = mapping[labelKey]
        }
      }
    }

    try {
      const result = await window.api.executeExcelImport({
        filePath: previewData.filePath,
        sheetName: previewData.activeSheet,
        mapping: cleanMapping,
        warehouseId: selectedWarehouseId,
        updateExisting,
        createCategories,
        defaultAlertLimit
      })

      setImportResult(result)
      setStep('result')
      onImportSuccess()
    } catch (err: any) {
      setImportError(err.message || 'Une erreur est survenue pendant l\'importation.')
      setStep('preview')
    }
  }

  // Valeur d'exemple pour une colonne donnée
  function getSampleValue(colName?: string): string {
    if (!colName || colName === '__none__' || !previewData?.sampleRows.length) return '-'
    const val = previewData.sampleRows[0][colName]
    if (val === undefined || val === null || val === '') return '(vide)'
    return String(val)
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <FileSpreadsheet className="h-6 w-6" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold">Importation Excel Dynamique</DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Importez n'importe quel fichier Excel (.xlsx ou .xls) et associez vos colonnes sur mesure.
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* Indicateur d'étapes */}
        <div className="flex items-center justify-between border-b pb-3 text-xs font-medium">
          <div className={`flex items-center gap-1.5 ${step === 'file' ? 'text-primary font-bold' : 'text-muted-foreground'}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step === 'file' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>1</span>
            Fichier & Entrepôt
          </div>
          <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/50" />
          <div className={`flex items-center gap-1.5 ${step === 'mapping' ? 'text-primary font-bold' : 'text-muted-foreground'}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step === 'mapping' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>2</span>
            Mappage des Colonnes
          </div>
          <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/50" />
          <div className={`flex items-center gap-1.5 ${step === 'preview' ? 'text-primary font-bold' : 'text-muted-foreground'}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step === 'preview' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>3</span>
            Aperçu & Validation
          </div>
        </div>

        {/* ======================= ÉTAPE 1 : FICHIER & ENTREPOT ======================= */}
        {step === 'file' && (
          <div className="space-y-5 py-2">
            {/* Choix de l'entrepôt cible */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" />
                Entrepôt de destination pour le stock
              </Label>
              <Select value={selectedWarehouseId} onValueChange={setSelectedWarehouseId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Sélectionnez l'entrepôt cible" />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.name} {w.location ? `(${w.location})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Les stocks importés seront affectés à cet entrepôt.
              </p>
            </div>

            {/* Zone de sélection du fichier */}
            <div
              onClick={handleBrowseFile}
              className="border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-colors hover:border-primary/60 hover:bg-muted/40 group"
            >
              <div className="p-4 rounded-full bg-primary/10 text-primary group-hover:scale-110 transition-transform duration-200 mb-3">
                {loadingFile ? (
                  <Loader2 className="h-8 w-8 animate-spin" />
                ) : (
                  <Upload className="h-8 w-8" />
                )}
              </div>
              <h3 className="font-semibold text-base mb-1">
                {loadingFile ? 'Lecture du fichier Excel en cours...' : 'Cliquez pour choisir votre fichier Excel'}
              </h3>
              <p className="text-xs text-muted-foreground max-w-sm mb-3">
                Prend en charge les formats <strong>.xlsx</strong> et <strong>.xls</strong> (y compris vos bases de données complètes).
              </p>
              <Button size="sm" variant="outline" disabled={loadingFile} onClick={(e) => { e.stopPropagation(); handleBrowseFile() }}>
                Parcourir les fichiers
              </Button>
            </div>

            {fileError && (
              <div className="flex items-center gap-2 p-3 text-xs text-destructive bg-destructive/10 rounded-lg border border-destructive/20">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{fileError}</span>
              </div>
            )}
          </div>
        )}

        {/* ======================= ÉTAPE 2 : MAPPAGE DES COLONNES ======================= */}
        {step === 'mapping' && previewData && (
          <div className="space-y-4 py-2">
            {/* Résumé du fichier et sélecteur de feuille */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-muted/50 rounded-lg border text-xs">
              <div>
                <span className="text-muted-foreground">Fichier :</span>{' '}
                <strong className="text-foreground">{previewData.fileName}</strong>
                <Badge variant="secondary" className="ml-2 font-semibold">
                  {previewData.totalRows} articles détectés
                </Badge>
              </div>

              {previewData.sheetNames.length > 1 && (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Feuille :</span>
                  <Select value={previewData.activeSheet} onValueChange={handleSheetChange}>
                    <SelectTrigger className="h-7 text-xs w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {previewData.sheetNames.map((s) => (
                        <SelectItem key={s} value={s} className="text-xs">
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <p className="text-xs text-muted-foreground">
              Vérifiez la correspondance entre les colonnes de votre Excel et les champs Iventello. Les correspondances ont été <strong>auto-détectées</strong>.
            </p>

            {/* Grille des champs standards */}
            <div className="space-y-2.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Sliders className="h-3.5 w-3.5" /> Champs Essentiels
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* 1. Nom / Titre (Obligatoire) */}
                <div className="p-2.5 rounded-lg border bg-card space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold flex items-center gap-1">
                      Désignation / Nom <span className="text-destructive">*</span>
                    </Label>
                    <Badge variant="outline" className="text-[10px] text-emerald-600 dark:text-emerald-400">Obligatoire</Badge>
                  </div>
                  <Select
                    value={mapping.name}
                    onValueChange={(val) => setMapping((prev) => ({ ...prev, name: val }))}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Choisir la colonne" />
                    </SelectTrigger>
                    <SelectContent>
                      {previewData.headers.map((h) => (
                        <SelectItem key={h} value={h} className="text-xs">
                          {h}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-muted-foreground truncate">
                    Exemple : <span className="italic">{getSampleValue(mapping.name)}</span>
                  </p>
                </div>

                {/* 2. Code-barres / ISBN */}
                <div className="p-2.5 rounded-lg border bg-card space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold">Code-barres / ISBN</Label>
                    <span className="text-[10px] text-muted-foreground">Auto-généré si vide</span>
                  </div>
                  <Select
                    value={mapping.barcode || '__none__'}
                    onValueChange={(val) => setMapping((prev) => ({ ...prev, barcode: val }))}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Ignorer ou auto-générer" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__" className="text-xs text-muted-foreground">(Générer automatiquement)</SelectItem>
                      {previewData.headers.map((h) => (
                        <SelectItem key={h} value={h} className="text-xs">{h}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-muted-foreground truncate">
                    Exemple : <span className="italic">{getSampleValue(mapping.barcode)}</span>
                  </p>
                </div>

                {/* 3. Prix de vente */}
                <div className="p-2.5 rounded-lg border bg-card space-y-1.5">
                  <Label className="text-xs font-semibold">Prix de vente unitaire</Label>
                  <Select
                    value={mapping.sellingPrice || '__none__'}
                    onValueChange={(val) => setMapping((prev) => ({ ...prev, sellingPrice: val }))}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Non renseigné" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__" className="text-xs text-muted-foreground">(Aucun prix)</SelectItem>
                      {previewData.headers.map((h) => (
                        <SelectItem key={h} value={h} className="text-xs">{h}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-muted-foreground truncate">
                    Exemple : <span className="italic">{getSampleValue(mapping.sellingPrice)}</span>
                  </p>
                </div>

                {/* 4. Prix d'achat / Coût */}
                <div className="p-2.5 rounded-lg border bg-card space-y-1.5">
                  <Label className="text-xs font-semibold">Prix d'achat (Coût unitaire)</Label>
                  <Select
                    value={mapping.basePrice || '__none__'}
                    onValueChange={(val) => setMapping((prev) => ({ ...prev, basePrice: val }))}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Non renseigné" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__" className="text-xs text-muted-foreground">(Aucun coût)</SelectItem>
                      {previewData.headers.map((h) => (
                        <SelectItem key={h} value={h} className="text-xs">{h}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-muted-foreground truncate">
                    Exemple : <span className="italic">{getSampleValue(mapping.basePrice)}</span>
                  </p>
                </div>

                {/* 5. Quantité en stock */}
                <div className="p-2.5 rounded-lg border bg-card space-y-1.5">
                  <Label className="text-xs font-semibold">Quantité en stock</Label>
                  <Select
                    value={mapping.quantity || '__none__'}
                    onValueChange={(val) => setMapping((prev) => ({ ...prev, quantity: val }))}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="0 par défaut" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__" className="text-xs text-muted-foreground">(0 par défaut)</SelectItem>
                      {previewData.headers.map((h) => (
                        <SelectItem key={h} value={h} className="text-xs">{h}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-muted-foreground truncate">
                    Exemple : <span className="italic">{getSampleValue(mapping.quantity)}</span>
                  </p>
                </div>

                {/* 6. Catégorie */}
                <div className="p-2.5 rounded-lg border bg-card space-y-1.5">
                  <Label className="text-xs font-semibold">Catégorie</Label>
                  <Select
                    value={mapping.category || '__none__'}
                    onValueChange={(val) => setMapping((prev) => ({ ...prev, category: val }))}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Général par défaut" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__" className="text-xs text-muted-foreground">(Catégorie par défaut)</SelectItem>
                      {previewData.headers.map((h) => (
                        <SelectItem key={h} value={h} className="text-xs">{h}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-muted-foreground truncate">
                    Exemple : <span className="italic">{getSampleValue(mapping.category)}</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Section dépliable pour champs personnalisés */}
            <div className="border rounded-lg p-3 bg-muted/20">
              <button
                type="button"
                onClick={() => setShowCustomFields(!showCustomFields)}
                className="w-full flex items-center justify-between text-xs font-semibold text-left"
              >
                <span className="flex items-center gap-1.5">
                  <Plus className="h-3.5 w-3.5 text-primary" />
                  Champs Métier Spécifiques (Éditeur, Auteur, Format, Niveau, État...)
                </span>
                <Badge variant="outline" className="text-[10px]">
                  {showCustomFields ? 'Masquer' : 'Afficher (5 détectés)'}
                </Badge>
              </button>

              {showCustomFields && (
                <div className="mt-3 pt-3 border-t grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Champ 1 */}
                  <div className="space-y-1">
                    <div className="flex gap-2">
                      <Input
                        value={mapping.field1_label || ''}
                        onChange={(e) => setMapping((p) => ({ ...p, field1_label: e.target.value }))}
                        className="h-7 text-xs w-1/2 font-semibold"
                        placeholder="Libellé (ex: Éditeur)"
                      />
                      <Select
                        value={mapping.field1 || '__none__'}
                        onValueChange={(v) => setMapping((p) => ({ ...p, field1: v }))}
                      >
                        <SelectTrigger className="h-7 text-xs w-1/2">
                          <SelectValue placeholder="Colonne Excel" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__" className="text-xs text-muted-foreground">(Aucun)</SelectItem>
                          {previewData.headers.map((h) => (
                            <SelectItem key={h} value={h} className="text-xs">{h}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <p className="text-[10px] text-muted-foreground truncate">Ex: {getSampleValue(mapping.field1)}</p>
                  </div>

                  {/* Champ 2 */}
                  <div className="space-y-1">
                    <div className="flex gap-2">
                      <Input
                        value={mapping.field2_label || ''}
                        onChange={(e) => setMapping((p) => ({ ...p, field2_label: e.target.value }))}
                        className="h-7 text-xs w-1/2 font-semibold"
                        placeholder="Libellé (ex: Auteur)"
                      />
                      <Select
                        value={mapping.field2 || '__none__'}
                        onValueChange={(v) => setMapping((p) => ({ ...p, field2: v }))}
                      >
                        <SelectTrigger className="h-7 text-xs w-1/2">
                          <SelectValue placeholder="Colonne Excel" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__" className="text-xs text-muted-foreground">(Aucun)</SelectItem>
                          {previewData.headers.map((h) => (
                            <SelectItem key={h} value={h} className="text-xs">{h}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <p className="text-[10px] text-muted-foreground truncate">Ex: {getSampleValue(mapping.field2)}</p>
                  </div>

                  {/* Champ 3 */}
                  <div className="space-y-1">
                    <div className="flex gap-2">
                      <Input
                        value={mapping.field3_label || ''}
                        onChange={(e) => setMapping((p) => ({ ...p, field3_label: e.target.value }))}
                        className="h-7 text-xs w-1/2 font-semibold"
                        placeholder="Libellé (ex: Type)"
                      />
                      <Select
                        value={mapping.field3 || '__none__'}
                        onValueChange={(v) => setMapping((p) => ({ ...p, field3: v }))}
                      >
                        <SelectTrigger className="h-7 text-xs w-1/2">
                          <SelectValue placeholder="Colonne Excel" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__" className="text-xs text-muted-foreground">(Aucun)</SelectItem>
                          {previewData.headers.map((h) => (
                            <SelectItem key={h} value={h} className="text-xs">{h}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <p className="text-[10px] text-muted-foreground truncate">Ex: {getSampleValue(mapping.field3)}</p>
                  </div>

                  {/* Champ 4 */}
                  <div className="space-y-1">
                    <div className="flex gap-2">
                      <Input
                        value={mapping.field4_label || ''}
                        onChange={(e) => setMapping((p) => ({ ...p, field4_label: e.target.value }))}
                        className="h-7 text-xs w-1/2 font-semibold"
                        placeholder="Libellé (ex: Niveau)"
                      />
                      <Select
                        value={mapping.field4 || '__none__'}
                        onValueChange={(v) => setMapping((p) => ({ ...p, field4: v }))}
                      >
                        <SelectTrigger className="h-7 text-xs w-1/2">
                          <SelectValue placeholder="Colonne Excel" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__" className="text-xs text-muted-foreground">(Aucun)</SelectItem>
                          {previewData.headers.map((h) => (
                            <SelectItem key={h} value={h} className="text-xs">{h}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <p className="text-[10px] text-muted-foreground truncate">Ex: {getSampleValue(mapping.field4)}</p>
                  </div>

                  {/* Champ 5 */}
                  <div className="space-y-1">
                    <div className="flex gap-2">
                      <Input
                        value={mapping.field5_label || ''}
                        onChange={(e) => setMapping((p) => ({ ...p, field5_label: e.target.value }))}
                        className="h-7 text-xs w-1/2 font-semibold"
                        placeholder="Libellé (ex: État)"
                      />
                      <Select
                        value={mapping.field5 || '__none__'}
                        onValueChange={(v) => setMapping((p) => ({ ...p, field5: v }))}
                      >
                        <SelectTrigger className="h-7 text-xs w-1/2">
                          <SelectValue placeholder="Colonne Excel" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__" className="text-xs text-muted-foreground">(Aucun)</SelectItem>
                          {previewData.headers.map((h) => (
                            <SelectItem key={h} value={h} className="text-xs">{h}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <p className="text-[10px] text-muted-foreground truncate">Ex: {getSampleValue(mapping.field5)}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ======================= ÉTAPE 3 : APERÇU EN DIRECT & OPTIONS ======================= */}
        {step === 'preview' && previewData && (
          <div className="space-y-4 py-2">
            <div className="p-3 bg-muted/40 rounded-lg border flex items-center justify-between text-xs">
              <div>
                <strong>Aperçu des 5 premières lignes</strong> selon votre configuration de correspondance.
              </div>
              <Badge variant="secondary">{previewData.totalRows} articles au total</Badge>
            </div>

            {/* Tableau d'aperçu dynamique */}
            <div className="border rounded-lg overflow-x-auto max-h-64">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/80 sticky top-0 border-b font-semibold">
                  <tr>
                    <th className="p-2">Désignation</th>
                    <th className="p-2">Code / ISBN</th>
                    <th className="p-2">Catégorie</th>
                    <th className="p-2">Prix Vente</th>
                    <th className="p-2">Prix Achat</th>
                    <th className="p-2">Stock</th>
                    {mapping.field1 && mapping.field1 !== '__none__' && <th className="p-2">{mapping.field1_label}</th>}
                    {mapping.field2 && mapping.field2 !== '__none__' && <th className="p-2">{mapping.field2_label}</th>}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {previewData.sampleRows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-muted/30">
                      <td className="p-2 font-medium">{mapping.name ? row[mapping.name] || '(sans nom)' : '-'}</td>
                      <td className="p-2 text-muted-foreground">
                        {mapping.barcode && mapping.barcode !== '__none__' ? row[mapping.barcode] || '(auto)' : '(auto)'}
                      </td>
                      <td className="p-2">
                        {mapping.category && mapping.category !== '__none__' ? row[mapping.category] || 'Général' : 'Général'}
                      </td>
                      <td className="p-2 font-semibold">
                        {mapping.sellingPrice && mapping.sellingPrice !== '__none__' ? `${row[mapping.sellingPrice] || 0} FCFA` : '-'}
                      </td>
                      <td className="p-2 text-muted-foreground">
                        {mapping.basePrice && mapping.basePrice !== '__none__' ? `${row[mapping.basePrice] || 0} FCFA` : '-'}
                      </td>
                      <td className="p-2">
                        <Badge variant="outline" className="text-[10px]">
                          {mapping.quantity && mapping.quantity !== '__none__' ? row[mapping.quantity] || 0 : 0}
                        </Badge>
                      </td>
                      {mapping.field1 && mapping.field1 !== '__none__' && <td className="p-2">{row[mapping.field1] || '-'}</td>}
                      {mapping.field2 && mapping.field2 !== '__none__' && <td className="p-2">{row[mapping.field2] || '-'}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Options d'import */}
            <div className="p-3 rounded-lg border bg-card space-y-2 text-xs">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={updateExisting}
                  onChange={(e) => setUpdateExisting(e.target.checked)}
                  className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4"
                />
                <span>Mettre à jour les informations des produits existants s'ils ont déjà le même code-barres / ISBN</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={createCategories}
                  onChange={(e) => setCreateCategories(e.target.checked)}
                  className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4"
                />
                <span>Créer automatiquement les catégories inconnues rencontrées dans le fichier</span>
              </label>
            </div>

            {importError && (
              <div className="flex items-center gap-2 p-3 text-xs text-destructive bg-destructive/10 rounded-lg border border-destructive/20">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{importError}</span>
              </div>
            )}
          </div>
        )}

        {/* ======================= ÉTAPE 4 : CHARGEMENT / EN COURS ======================= */}
        {step === 'importing' && (
          <div className="py-10 px-4 flex flex-col items-center justify-center text-center space-y-6 max-w-md mx-auto">
            <div className="relative">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
              </div>
              {progress && (
                <div className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-sm">
                  {progress.percent}%
                </div>
              )}
            </div>

            <div className="space-y-1.5 w-full">
              <h3 className="text-base font-bold text-foreground">
                {progress?.phase === 'preparing'
                  ? 'Préparation et indexation du catalogue...'
                  : progress?.phase === 'finishing'
                  ? 'Finalisation de l\'enregistrement...'
                  : 'Importation des articles en cours...'}
              </h3>
              <p className="text-xs text-muted-foreground truncate">
                {progress?.currentItemName
                  ? `Traitement : ${progress.currentItemName}`
                  : 'Enregistrement sécurisé par lots sans blocage de l\'application'}
              </p>
            </div>

            {/* Barre de progression fluide */}
            <div className="w-full space-y-2">
              <div className="h-3 w-full bg-muted rounded-full overflow-hidden border">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${progress ? Math.max(progress.percent, 3) : 5}%` }}
                />
              </div>
              <div className="flex justify-between items-center text-[11px] text-muted-foreground font-medium">
                <span>
                  {progress
                    ? `${progress.current.toLocaleString('fr-FR')} / ${progress.total.toLocaleString('fr-FR')} articles`
                    : 'Initialisation...'}
                </span>
                <span className="font-bold text-primary">
                  {progress ? `${progress.percent}%` : '0%'}
                </span>
              </div>
            </div>

            {/* Badges temps réel */}
            {progress && (
              <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                <Badge variant="outline" className="text-[11px] bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200">
                  Créés : {progress.importedCount}
                </Badge>
                <Badge variant="outline" className="text-[11px] bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border-blue-200">
                  Mis à jour : {progress.updatedCount}
                </Badge>
                {progress.skippedCount > 0 && (
                  <Badge variant="outline" className="text-[11px] text-muted-foreground">
                    Ignorés : {progress.skippedCount}
                  </Badge>
                )}
              </div>
            )}

            <p className="text-[11px] text-muted-foreground/75 italic">
              ⚡ Traitement optimisé : l'application et la caisse restent réactives pendant l'import.
            </p>
          </div>
        )}

        {/* ======================= ÉTAPE 5 : RESULTAT ======================= */}
        {step === 'result' && importResult && (
          <div className="py-6 space-y-5 text-center">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-8 w-8" />
            </div>

            <div>
              <h3 className="text-lg font-bold">Importation terminée avec succès !</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Vos produits et leurs stocks sont maintenant disponibles dans Iventello.
              </p>
            </div>

            {/* Badges de synthèse */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-lg mx-auto">
              <div className="p-3 rounded-lg border bg-muted/30">
                <div className="text-xl font-extrabold text-foreground">{importResult.importedCount}</div>
                <div className="text-[11px] text-muted-foreground">Créés</div>
              </div>
              <div className="p-3 rounded-lg border bg-muted/30">
                <div className="text-xl font-extrabold text-primary">{importResult.updatedCount}</div>
                <div className="text-[11px] text-muted-foreground">Mis à jour</div>
              </div>
              <div className="p-3 rounded-lg border bg-muted/30">
                <div className="text-xl font-extrabold text-emerald-600">{importResult.categoriesCreated}</div>
                <div className="text-[11px] text-muted-foreground">Catégories</div>
              </div>
              <div className="p-3 rounded-lg border bg-muted/30">
                <div className="text-xl font-extrabold text-muted-foreground">{importResult.skippedCount}</div>
                <div className="text-[11px] text-muted-foreground">Ignorés/Vides</div>
              </div>
            </div>

            {Boolean(importResult.booksImportedCount && importResult.booksImportedCount > 0) && (
              <div className="p-2.5 rounded-lg border border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/20 text-xs text-emerald-800 dark:text-emerald-300 flex items-center justify-center gap-2 max-w-lg mx-auto">
                <Book className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>
                  <strong>{importResult.booksImportedCount}</strong> livres/manuels scolaires ont été automatiquement reliés à leur classe dans le <strong>module Librairie</strong>.
                </span>
              </div>
            )}

            {importResult.errors.length > 0 && (
              <div className="text-left text-xs bg-amber-500/10 border border-amber-500/20 p-3 rounded-lg max-h-28 overflow-y-auto">
                <div className="font-semibold text-amber-700 dark:text-amber-400 mb-1">
                  Avertissements ({importResult.errors.length}) :
                </div>
                <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-muted-foreground">
                  {importResult.errors.slice(0, 5).map((e, idx) => (
                    <li key={idx}>{e}</li>
                  ))}
                  {importResult.errors.length > 5 && (
                    <li>... et {importResult.errors.length - 5} autres avertissements</li>
                  )}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Footer avec boutons de navigation */}
        <DialogFooter className="border-t pt-3 flex items-center justify-between sm:justify-between">
          {step === 'file' && (
            <>
              <Button variant="ghost" size="sm" onClick={onClose}>
                Annuler
              </Button>
              <Button size="sm" disabled={!previewData || loadingFile} onClick={() => setStep('mapping')}>
                Suivant <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            </>
          )}

          {step === 'mapping' && (
            <>
              <Button variant="ghost" size="sm" onClick={() => setStep('file')}>
                <ArrowLeft className="mr-1.5 h-4 w-4" /> Retour
              </Button>
              <Button
                size="sm"
                disabled={!mapping.name}
                onClick={() => setStep('preview')}
              >
                Aperçu en direct <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            </>
          )}

          {step === 'preview' && (
            <>
              <Button variant="ghost" size="sm" onClick={() => setStep('mapping')}>
                <ArrowLeft className="mr-1.5 h-4 w-4" /> Modifier le mappage
              </Button>
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                onClick={handleExecuteImport}
              >
                Lancer l'importation ({previewData?.totalRows} articles)
              </Button>
            </>
          )}

          {step === 'result' && (
            <div className="w-full flex justify-end">
              <Button size="sm" onClick={onClose} className="px-6 font-semibold">
                Voir les produits
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
