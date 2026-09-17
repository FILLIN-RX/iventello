import { useState, useEffect } from 'react'
import {
  Download, Upload, HardDrive, Shield, AlertTriangle,
  CheckCircle2, Loader2, RotateCw, Archive, Clock, Database
} from 'lucide-react'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { feedback } from '../stores/feedbackStore'
import type { BackupInfo, DataExportResult, DataImportResult } from '../../../shared/types'

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`
  return `${(bytes / 1024 / 1024).toFixed(1)} Mo`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

export default function ImportExport() {
  const [backups, setBackups] = useState<BackupInfo[]>([])
  const [backupsLoading, setBackupsLoading] = useState(true)
  const [creatingBackup, setCreatingBackup] = useState(false)
  const [restoringId, setRestoringId] = useState<string | null>(null)

  const [exporting, setExporting] = useState(false)
  const [exportResult, setExportResult] = useState<DataExportResult | null>(null)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<DataImportResult | null>(null)
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge')

  const [dirStats, setDirStats] = useState<{ totalSizeBytes: number; fileCount: number } | null>(null)

  useEffect(() => {
    loadBackups()
    window.api.dataExportStats().then(setDirStats).catch(() => {})
  }, [])

  async function loadBackups() {
    setBackupsLoading(true)
    try {
      const list = await window.api.backupList()
      setBackups(list)
    } catch (e) {
      console.error(e)
    } finally {
      setBackupsLoading(false)
    }
  }

  async function handleCreateBackup() {
    setCreatingBackup(true)
    try {
      const info = await window.api.backupCreate()
      feedback.toast.success('Sauvegarde créée', `${info.fileName} (${formatSize(info.sizeBytes)})`)
      await loadBackups()
    } catch (e: any) {
      feedback.toast.error(e?.message || 'Erreur lors de la sauvegarde', 'Erreur')
    } finally {
      setCreatingBackup(false)
    }
  }

  async function handleRestore(backup: BackupInfo) {
    const ok = window.confirm(
      `⚠️ Restaurer la sauvegarde "${backup.fileName}" ?\n\nToutes les données actuelles seront remplacées par celles de cette sauvegarde. L'application redémarrera automatiquement.\n\nUne sauvegarde de sécurité sera créée avant la restauration.`
    )
    if (!ok) return
    setRestoringId(backup.fileName)
    try {
      await window.api.backupRestore(backup.filePath)
      // L'app redémarre — cet écran ne sera plus visible
    } catch (e: any) {
      feedback.toast.error(e?.message || 'Erreur restauration', 'Erreur')
      setRestoringId(null)
    }
  }

  async function handleExport() {
    setExporting(true)
    setExportResult(null)
    try {
      const result = await window.api.dataExport()
      setExportResult(result)
      feedback.toast.success(
        'Export réussi',
        `Fichier .iventello enregistré sur votre Bureau (${formatSize(result.sizeBytes)}, ${result.filesCount} fichiers)`
      )
    } catch (e: any) {
      feedback.toast.error(e?.message || 'Erreur lors de l\'export', 'Erreur export')
    } finally {
      setExporting(false)
    }
  }

  async function handleImport() {
    const archivePath = await window.api.dataSelectArchive()
    if (!archivePath) return

    const restoreDb = importMode === 'replace'
    if (restoreDb) {
      const ok = window.confirm(
        '⚠️ Mode REMPLACEMENT sélectionné.\n\nLa base de données sera entièrement remplacée par celle de l\'archive. L\'application redémarrera.\n\nContinuer ?'
      )
      if (!ok) return
    }

    setImporting(true)
    setImportResult(null)
    try {
      const result = await window.api.dataImport(archivePath, restoreDb)
      setImportResult(result)
      feedback.toast.success(
        'Import terminé',
        `${result.products} produits, ${result.sales} ventes, ${result.clients} clients importés`
      )
      if (restoreDb) {
        // L'app va redémarrer
        feedback.toast.success('Redémarrage', 'L\'application va redémarrer pour appliquer les changements')
      }
    } catch (e: any) {
      feedback.toast.error(e?.message || 'Erreur lors de l\'import', 'Erreur import')
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Archive className="h-6 w-6 text-primary" /> Import / Export & Sauvegardes
        </h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Sauvegardez, exportez et importez toutes vos données Iventello
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ── Export données ────────────────────────────────────── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Download className="h-5 w-5 text-emerald-500" />
              Exporter mes données
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Crée un fichier <code className="bg-muted px-1 rounded text-xs">.iventello</code> contenant
              toutes vos données (produits, ventes, clients, livres...) et vos images.
              Sauvegardé sur votre Bureau.
            </p>

            {dirStats && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
                <Database className="h-4 w-4 flex-shrink-0" />
                <span>{dirStats.fileCount} fichiers · {formatSize(dirStats.totalSizeBytes)} à exporter</span>
              </div>
            )}

            <Button onClick={handleExport} disabled={exporting} className="w-full gap-2">
              {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              {exporting ? 'Export en cours (Rust 🦀)...' : 'Exporter tout (.iventello)'}
            </Button>

            {exportResult && (
              <div className="flex items-start gap-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-3 text-sm animate-fade-in">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-emerald-800 dark:text-emerald-300">Export réussi !</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {exportResult.filesCount} fichiers · {formatSize(exportResult.sizeBytes)}
                  </p>
                  <p className="text-xs text-muted-foreground font-mono mt-1 truncate">{exportResult.outputPath}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Import données ────────────────────────────────────── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Upload className="h-5 w-5 text-blue-500" />
              Importer des données
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Importez un fichier <code className="bg-muted px-1 rounded text-xs">.iventello</code> depuis
              une autre installation ou une sauvegarde.
            </p>

            {/* Mode d'import */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Mode d'import</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setImportMode('merge')}
                  className={`rounded-lg border p-3 text-left transition-colors ${
                    importMode === 'merge'
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:bg-muted/50'
                  }`}
                >
                  <p className="text-sm font-semibold">Fusionner</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Ajoute sans écraser les données existantes</p>
                </button>
                <button
                  onClick={() => setImportMode('replace')}
                  className={`rounded-lg border p-3 text-left transition-colors ${
                    importMode === 'replace'
                      ? 'border-rose-500 bg-rose-500/10'
                      : 'border-border hover:bg-muted/50'
                  }`}
                >
                  <p className="text-sm font-semibold text-rose-600 dark:text-rose-400">Remplacer</p>
                  <p className="text-xs text-muted-foreground mt-0.5">⚠️ Remplace toute la base de données</p>
                </button>
              </div>
            </div>

            <Button
              onClick={handleImport}
              disabled={importing}
              variant={importMode === 'replace' ? 'destructive' : 'default'}
              className="w-full gap-2"
            >
              {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {importing ? 'Import en cours (Rust 🦀)...' : 'Sélectionner un fichier .iventello'}
            </Button>

            {importResult && (
              <div className="rounded-lg border bg-muted/30 p-3 space-y-2 animate-fade-in text-sm">
                <p className="font-semibold flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  Import terminé
                </p>
                <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
                  <span>Produits : <strong>{importResult.products}</strong></span>
                  <span>Ventes : <strong>{importResult.sales}</strong></span>
                  <span>Clients : <strong>{importResult.clients}</strong></span>
                  <span>Fournisseurs : <strong>{importResult.suppliers}</strong></span>
                  <span>Boutiques : <strong>{importResult.warehouses}</strong></span>
                  <span>Livres : <strong>{importResult.books}</strong></span>
                  <span>Images : <strong>{importResult.imagesExtracted}</strong></span>
                  <span>Dépenses : <strong>{importResult.expenses}</strong></span>
                </div>
                {importResult.warnings.length > 0 && (
                  <details className="text-xs">
                    <summary className="cursor-pointer text-amber-600">
                      {importResult.warnings.length} avertissement(s)
                    </summary>
                    <ul className="mt-1 space-y-0.5 text-muted-foreground">
                      {importResult.warnings.map((w, i) => <li key={i}>• {w}</li>)}
                    </ul>
                  </details>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Sauvegardes automatiques ──────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield className="h-5 w-5 text-amber-500" />
              Sauvegardes automatiques
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={loadBackups} disabled={backupsLoading} className="gap-1.5">
                <RotateCw className={`h-4 w-4 ${backupsLoading ? 'animate-spin' : ''}`} />
                Actualiser
              </Button>
              <Button size="sm" onClick={handleCreateBackup} disabled={creatingBackup} className="gap-1.5">
                {creatingBackup ? <Loader2 className="h-4 w-4 animate-spin" /> : <HardDrive className="h-4 w-4" />}
                Sauvegarder maintenant
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Iventello crée automatiquement une copie de votre base de données à chaque démarrage et toutes les 24h.
            Les 7 sauvegardes les plus récentes sont conservées.
          </p>

          {backupsLoading && (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {!backupsLoading && backups.length === 0 && (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-10 text-center">
              <HardDrive className="h-8 w-8 text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">Aucune sauvegarde disponible</p>
              <p className="text-xs text-muted-foreground mt-1">Cliquez sur "Sauvegarder maintenant" pour créer votre première sauvegarde</p>
            </div>
          )}

          {!backupsLoading && backups.length > 0 && (
            <div className="rounded-lg border overflow-hidden">
              <div className="divide-y">
                {backups.map((b, i) => (
                  <div key={b.fileName} className="flex items-center gap-4 px-4 py-3 hover:bg-muted/30 transition-colors">
                    <HardDrive className="h-9 w-9 flex-shrink-0 rounded-lg bg-amber-100 dark:bg-amber-950/40 p-2 text-amber-600 dark:text-amber-400" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate font-mono">{b.fileName}</p>
                        {i === 0 && <Badge variant="secondary" className="text-[10px] py-0 flex-shrink-0">La plus récente</Badge>}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{formatDate(b.date)}</span>
                        <span>{formatSize(b.sizeBytes)}</span>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRestore(b)}
                      disabled={!!restoringId}
                      className="flex-shrink-0 gap-1.5 text-rose-600 border-rose-200 hover:bg-rose-50 dark:hover:bg-rose-950/20"
                    >
                      {restoringId === b.fileName ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <AlertTriangle className="h-3.5 w-3.5" />
                      )}
                      Restaurer
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
