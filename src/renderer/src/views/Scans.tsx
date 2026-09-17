import { useState, useEffect, useRef } from 'react'
import {
  Scan,
  Camera,
  FileText,
  Calendar,
  Search,
  Plus,
  Trash2,
  Printer,
  Eye,
  FolderOpen,
  Image as ImageIcon,
  CheckCircle2,
  RefreshCw,
  Loader2,
  Upload,
  Tag,
  Filter,
  X
} from 'lucide-react'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Badge } from '../components/ui/badge'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog'
import { useEntrepotStore } from '../stores/entrepotStore'
import { feedback } from '../stores/feedbackStore'
import { toFileUrl } from '../../../shared/imageUtils'
import type { ScannedDocumentItem } from '../../../shared/types'

const CATEGORIES = [
  { value: 'FACTURE', label: 'Facture papier / Achat' },
  { value: 'RECU', label: 'Reçu de caisse / Acompte' },
  { value: 'BON_LIVRAISON', label: 'Bon de livraison' },
  { value: 'CONTRAT', label: 'Contrat / Document officiel' },
  { value: 'AUTRE', label: 'Autre document' }
]

export default function Scans() {
  const workspaceId = useEntrepotStore((s) => s.selectedId)
  const [documents, setDocuments] = useState<ScannedDocumentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL')

  // Modales
  const [showNewScanModal, setShowNewScanModal] = useState(false)
  const [previewDoc, setPreviewDoc] = useState<ScannedDocumentItem | null>(null)
  const [scanTab, setScanTab] = useState<'file' | 'camera'>('file')

  // Formulaire Nouveau Scan
  const [title, setTitle] = useState('')
  const [docDate, setDocDate] = useState<string>(() => new Date().toISOString().slice(0, 10))
  const [category, setCategory] = useState('FACTURE')
  const [notes, setNotes] = useState('')
  const [filePath, setFilePath] = useState('')
  const [saving, setSaving] = useState(false)

  // Caméra Live Stream
  const videoRef = useRef<HTMLVideoElement>(null)
  const [cameraActive, setCameraActive] = useState(false)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)

  async function loadDocuments() {
    try {
      setLoading(true)
      const list = await window.api.getScannedDocuments(
        selectedDate || undefined,
        workspaceId || undefined,
        search || undefined
      )
      setDocuments(list as ScannedDocumentItem[])
    } catch (err: any) {
      console.error('Erreur chargement scans:', err)
      feedback.toast.error(err?.message || 'Impossible de charger les documents scannés')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDocuments()
  }, [selectedDate, workspaceId, search])

  // Lancer/Arrêter la caméra WebCam
  async function startCamera() {
    try {
      setCapturedImage(null)
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } }
      })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
        setCameraActive(true)
      }
    } catch (err) {
      console.error('Erreur accès caméra:', err)
      feedback.toast.error('Caméra non détectée', 'Veuillez vérifier l\'accès à la webcam ou utiliser l\'option Fichier / Scanner.')
    }
  }

  function stopCamera() {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream
      stream.getTracks().forEach((t) => t.stop())
      videoRef.current.srcObject = null
      setCameraActive(false)
    }
  }

  // Prendre photo avec la caméra
  function captureCameraPhoto() {
    if (!videoRef.current) return
    const canvas = document.createElement('canvas')
    canvas.width = videoRef.current.videoWidth || 1280
    canvas.height = videoRef.current.videoHeight || 720
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height)
      const dataUrl = canvas.toDataURL('image/png')
      setCapturedImage(dataUrl)
      stopCamera()
    }
  }

  // Sélectionner un fichier depuis le scanner matériel / explorateur
  async function handleSelectFile() {
    try {
      const selected = await window.api.selectScanFile()
      if (selected) {
        setFilePath(selected)
        setCapturedImage(null)
      }
    } catch (err: any) {
      feedback.toast.error(err?.message || 'Erreur lors de la sélection du fichier')
    }
  }

  // Enregistrer le nouveau scan
  async function handleSaveScan() {
    if (!title.trim()) {
      feedback.toast.error('Nom obligatoire', 'Veuillez saisir un nom ou titre pour le document scanné.')
      return
    }

    let finalFilePath = filePath

    // Si photo prise par caméra, la convertir en fichier temporaire
    if (scanTab === 'camera' && capturedImage) {
      try {
        const base64Data = capturedImage.replace(/^data:image\/\w+;base64,/, '')
        const byteCharacters = atob(base64Data)
        const byteNumbers = new Array(byteCharacters.length)
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i)
        }
        const byteArray = new Uint8Array(byteNumbers)
        const blob = new Blob([byteArray], { type: 'image/png' })
        const file = new File([blob], `scan-${Date.now()}.png`, { type: 'image/png' })
        
        // Pour Electron, utiliser un canvas/data-url directement ou file-saver via window.api.saveProductImage ou similaire
        // Mais nous pouvons simplement passer capturedImage ou sauvegarder via file picker.
        // Option simple : nous créons une image blob URL et l'enregistrons.
      } catch (e) {
        console.error('Erreur conversion image caméra', e)
      }
    }

    if (!finalFilePath && !capturedImage) {
      feedback.toast.error('Aucun document numérisé', 'Veuillez scanner un document avec le scanner/caméra ou sélectionner un fichier.')
      return
    }

    try {
      setSaving(true)
      
      // Si on a capturedImage, on crée un fichier via le bridge
      let targetPath = finalFilePath
      if (capturedImage && !finalFilePath) {
        // Enregistrer temporairement l'image dataUrl
        targetPath = capturedImage
      }

      await window.api.createScannedDocument({
        title: title.trim(),
        date: docDate,
        filePath: targetPath,
        category,
        notes: notes.trim() || undefined,
        warehouseId: workspaceId || undefined
      })

      feedback.toast.success('Document scanné sauvegardé', `Le document "${title.trim()}" a été archivé avec succès dans l'application.`)
      setShowNewScanModal(false)
      resetForm()
      loadDocuments()
    } catch (err: any) {
      console.error('Erreur sauvegarde scan:', err)
      feedback.toast.error(err?.message || 'Erreur lors de la sauvegarde du document')
    } finally {
      setSaving(false)
    }
  }

  function resetForm() {
    setTitle('')
    setDocDate(new Date().toISOString().slice(0, 10))
    setCategory('FACTURE')
    setNotes('')
    setFilePath('')
    setCapturedImage(null)
    stopCamera()
  }

  // Supprimer un document scanné
  function handleDelete(doc: ScannedDocumentItem) {
    feedback.confirm({
      title: 'Supprimer ce document scanné ?',
      message: `Cette action va supprimer définitivement le document "${doc.title}" de l'application.`,
      itemName: doc.title,
      confirmLabel: 'Supprimer définitivement',
      variant: 'destructive',
      onConfirm: async () => {
        try {
          await window.api.deleteScannedDocument(doc.id)
          feedback.toast.success('Document supprimé')
          loadDocuments()
        } catch (err: any) {
          feedback.toast.error(err?.message || 'Erreur lors de la suppression')
        }
      }
    })
  }

  // Imprimer un document scanné
  async function handlePrintDoc(doc: ScannedDocumentItem) {
    try {
      if (doc.filePath) {
        await window.api.openFile(doc.filePath)
        feedback.toast.success('Ouverture pour impression', 'Le document a été ouvert pour impression.')
      }
    } catch (err: any) {
      feedback.toast.error('Erreur lors de l\'ouverture du document')
    }
  }

  // Filtrer les documents par catégorie
  const filteredDocs = documents.filter((d) => {
    if (selectedCategory !== 'ALL' && d.category !== selectedCategory) return false
    return true
  })

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header View */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Scan className="h-6 w-6 text-primary" /> Numérisation & Scans de Documents
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Scannez et sauvegardez toutes vos factures papier, reçus et pièces justificatives dans l'application
          </p>
        </div>

        <Button
          onClick={() => {
            resetForm()
            setShowNewScanModal(true)
          }}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2 text-xs h-11 px-5 shadow-sm shrink-0"
        >
          <Plus className="h-4 w-4" /> Nouveau Scan / Numérisation
        </Button>
      </div>

      {/* Barre de Filtres & Recherche par Date */}
      <div className="bg-card border border-border p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Recherche par Nom */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par nom de facture..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-xs"
            />
          </div>

          {/* Filtre par Date */}
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="text-xs font-mono font-semibold w-36"
            />
            {selectedDate && (
              <Button variant="ghost" size="sm" onClick={() => setSelectedDate('')} className="h-8 px-2 text-xs">
                Toutes les dates
              </Button>
            )}
          </div>
        </div>

        {/* Filtre par Catégorie */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          <Tag className="h-4 w-4 text-muted-foreground shrink-0" />
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-48 text-xs font-medium">
              <SelectValue placeholder="Catégorie" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Toutes les catégories</SelectItem>
              {CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Grille des Documents Scannées */}
      {loading ? (
        <div className="p-12 text-center text-muted-foreground text-sm flex items-center justify-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          Chargement des documents scannés...
        </div>
      ) : filteredDocs.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filteredDocs.map((doc) => {
            const isPdf = doc.fileType?.includes('pdf') || doc.filePath?.toLowerCase().endsWith('.pdf')
            const imgUrl = doc.filePath ? (doc.filePath.startsWith('data:') ? doc.filePath : toFileUrl(doc.filePath)) : null

            return (
              <div key={doc.id} className="group rounded-2xl border border-border bg-card overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                {/* Aperçu du document */}
                <div className="relative h-44 bg-slate-900/5 dark:bg-slate-950/40 flex items-center justify-center overflow-hidden border-b border-border">
                  {imgUrl && !isPdf ? (
                    <img
                      src={imgUrl}
                      alt={doc.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-muted-foreground gap-2 p-4 text-center">
                      <FileText className="h-12 w-12 text-primary/70" />
                      <span className="text-[11px] font-bold font-mono uppercase bg-primary/10 text-primary px-2 py-0.5 rounded">
                        Document PDF
                      </span>
                    </div>
                  )}

                  <div className="absolute top-2.5 right-2.5">
                    <Badge variant="secondary" className="text-[10px] font-bold shadow-xs bg-background/90 backdrop-blur-xs">
                      {doc.category}
                    </Badge>
                  </div>
                </div>

                {/* Contenu et Détails du Scan */}
                <div className="p-4 space-y-2 flex-1">
                  <div>
                    <h3 className="font-extrabold text-sm text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                      {doc.title}
                    </h3>
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-0.5 font-mono">
                      <Calendar className="h-3 w-3 text-muted-foreground" />
                      <span>{new Date(doc.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                    </div>
                  </div>

                  {doc.notes && (
                    <p className="text-[11px] text-muted-foreground line-clamp-2 bg-muted/40 p-2 rounded-lg italic">
                      "{doc.notes}"
                    </p>
                  )}
                </div>

                {/* Boutons d'Action */}
                <div className="p-3 bg-muted/20 border-t border-border flex items-center justify-between gap-1 text-xs">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setPreviewDoc(doc)}
                    className="h-8 px-2 text-[11px] text-foreground font-semibold gap-1"
                  >
                    <Eye className="h-3.5 w-3.5 text-primary" /> Aperçu
                  </Button>

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handlePrintDoc(doc)}
                    className="h-8 px-2 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold gap-1"
                  >
                    <Printer className="h-3.5 w-3.5" /> Imprimer
                  </Button>

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDelete(doc)}
                    className="h-8 px-2 text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center text-muted-foreground space-y-3 bg-card/50">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Scan className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-bold text-foreground">Aucun document scanné trouvé</h3>
            <p className="text-xs text-muted-foreground mt-1">
              {selectedDate ? `Aucun scan enregistré pour la date du ${selectedDate}.` : 'Commencez par numériser une facture avec votre scanner matériel ou votre caméra.'}
            </p>
          </div>
          <Button
            onClick={() => {
              resetForm()
              setShowNewScanModal(true)
            }}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-2 mt-2"
          >
            <Plus className="h-4 w-4" /> Numériser une facture maintenant
          </Button>
        </div>
      )}

      {/* Modal Aperçu Plein Écran */}
      <Dialog open={previewDoc !== null} onOpenChange={(v) => { if (!v) setPreviewDoc(null) }}>
        <DialogContent className="sm:max-w-4xl max-h-[92vh] overflow-y-auto p-6">
          <DialogHeader className="pb-2 border-b border-border">
            <DialogTitle className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                <span className="font-bold">{previewDoc?.title}</span>
              </div>
              <Badge variant="outline" className="font-mono text-xs">{previewDoc?.date}</Badge>
            </DialogTitle>
          </DialogHeader>

          {previewDoc && (
            <div className="space-y-4 py-2">
              <div className="rounded-xl border border-border bg-slate-950 p-2 flex items-center justify-center min-h-[400px]">
                {previewDoc.filePath && (
                  <img
                    src={previewDoc.filePath.startsWith('data:') ? previewDoc.filePath : toFileUrl(previewDoc.filePath)}
                    alt={previewDoc.title}
                    className="max-h-[600px] w-auto object-contain rounded-lg shadow-md"
                  />
                )}
              </div>

              {previewDoc.notes && (
                <div className="bg-muted/40 p-3 rounded-lg text-xs space-y-1">
                  <span className="font-bold text-foreground block">Notes d'observation :</span>
                  <p className="text-muted-foreground">{previewDoc.notes}</p>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" onClick={() => setPreviewDoc(null)}>
                  Fermer
                </Button>
                <Button
                  onClick={() => handlePrintDoc(previewDoc)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2"
                >
                  <Printer className="h-4 w-4" /> Imprimer le Document
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal Nouveau Scan / Numérisation */}
      <Dialog open={showNewScanModal} onOpenChange={(v) => { if (!v) { setShowNewScanModal(false); stopCamera() } }}>
        <DialogContent className="sm:max-w-2xl max-h-[92vh] overflow-y-auto p-6">
          <DialogHeader className="pb-3 border-b border-border">
            <DialogTitle className="flex items-center gap-2.5 text-lg font-bold text-foreground">
              <Scan className="h-5 w-5 text-emerald-600" />
              Numériser & Sauvegarder un Document / Facture
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 my-2">
            {/* Onglets de Mode de Numérisation */}
            <div className="flex rounded-xl bg-muted p-1 gap-1 text-xs font-semibold">
              <button
                type="button"
                onClick={() => { setScanTab('file'); stopCamera() }}
                className={`flex-1 py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition-all ${scanTab === 'file' ? 'bg-background text-foreground shadow-xs font-bold' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <Upload className="h-4 w-4 text-primary" /> Fichier Scanner Matériel / PDF
              </button>
              <button
                type="button"
                onClick={() => { setScanTab('camera'); startCamera() }}
                className={`flex-1 py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition-all ${scanTab === 'camera' ? 'bg-background text-foreground shadow-xs font-bold' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <Camera className="h-4 w-4 text-emerald-600" /> Caméra / Numériseur Direct
              </button>
            </div>

            {/* Mode 1: Fichier Scanner */}
            {scanTab === 'file' && (
              <div className="space-y-3 bg-muted/30 border border-border p-4 rounded-xl text-xs">
                <Label className="font-bold text-foreground">Document Numérisé (Image ou PDF) :</Label>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    placeholder="Aucun fichier sélectionné"
                    value={filePath}
                    className="font-mono text-xs bg-background"
                  />
                  <Button type="button" onClick={handleSelectFile} className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold shrink-0 gap-1.5">
                    <FolderOpen className="h-4 w-4" /> Numériser / Parcourir
                  </Button>
                </div>
              </div>
            )}

            {/* Mode 2: Caméra Directe */}
            {scanTab === 'camera' && (
              <div className="space-y-3 bg-slate-950 p-4 rounded-xl border border-border text-center text-xs text-white">
                {!capturedImage ? (
                  <div className="space-y-3">
                    <div className="relative h-64 bg-black rounded-lg overflow-hidden flex items-center justify-center">
                      <video ref={videoRef} className="w-full h-full object-cover" />
                      {!cameraActive && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/80 text-muted-foreground">
                          Caméra inactive...
                        </div>
                      )}
                    </div>
                    <Button
                      type="button"
                      onClick={captureCameraPhoto}
                      disabled={!cameraActive}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2 w-full h-11 text-xs"
                    >
                      <Camera className="h-4 w-4" /> 📸 Capturer la Photo du Document
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <img src={capturedImage} alt="Capture" className="max-h-56 mx-auto rounded-lg border border-white/20 shadow-md" />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => { setCapturedImage(null); startCamera() }}
                      className="text-white border-white/30 hover:bg-white/10 text-xs font-semibold gap-1.5"
                    >
                      <RefreshCw className="h-3.5 w-3.5" /> Reprendre une autre photo
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Formulaire des Métadonnées du Document */}
            <div className="space-y-4 pt-2 border-t border-border">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">
                    Nom / Titre du Document Scanné <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    placeholder="Ex: Facture Achat Papeterie #102"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="text-xs font-medium"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">
                    Date du Document <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    type="date"
                    value={docDate}
                    onChange={(e) => setDocDate(e.target.value)}
                    className="text-xs font-mono font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">Catégorie du Document</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="text-xs font-medium">
                      <SelectValue placeholder="Catégorie" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">Notes / Observations</Label>
                  <Input
                    placeholder="Observations particulières..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="text-xs"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-border">
            <Button
              variant="outline"
              onClick={() => {
                setShowNewScanModal(false)
                stopCamera()
              }}
              disabled={saving}
            >
              Annuler
            </Button>
            <Button
              onClick={handleSaveScan}
              disabled={saving || !title.trim()}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2 px-6"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Enregistrer dans l'Application
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
