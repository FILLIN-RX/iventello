import { useEffect, useState } from 'react'
import { Download, RefreshCw, X } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

export function UpdateNotifier() {
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [updateDownloaded, setUpdateDownloaded] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Vérifier les mises à jour au démarrage
    window.api.checkForUpdates()

    window.api.onUpdateAvailable(() => {
      setUpdateAvailable(true)
      // On ne montre pas forcément un popup tout de suite pour ne pas déranger
    })

    window.api.onUpdateDownloaded(() => {
      setUpdateDownloaded(true)
      setIsOpen(true) // Là on prévient l'utilisateur que c'est prêt
    })

    window.api.onUpdateError((err: any) => {
      console.error('Update error:', err)
      // setError('Erreur lors de la mise à jour')
    })
  }, [])

  const handleInstall = () => {
    window.api.installUpdate()
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary mb-2">
            <Download className="h-5 w-5" />
            <DialogTitle>Mise à jour disponible</DialogTitle>
          </div>
          <DialogDescription>
            Une nouvelle version de l'application a été téléchargée et est prête à être installée.
          </DialogDescription>
        </DialogHeader>
        
        <div className="bg-muted/50 p-4 rounded-lg text-sm space-y-2">
          <p className="font-medium text-foreground">Améliorations incluses :</p>
          <ul className="list-disc list-inside text-muted-foreground space-y-1">
            <li>Corrections de bugs et optimisations</li>
            <li>Nouvelles fonctionnalités de gestion</li>
            <li>Amélioration de la stabilité</li>
          </ul>
        </div>

        <DialogFooter className="flex sm:justify-between gap-2 mt-4">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setIsOpen(false)}
            className="text-xs"
          >
            Plus tard
          </Button>
          <Button
            type="button"
            onClick={handleInstall}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Redémarrer et installer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
