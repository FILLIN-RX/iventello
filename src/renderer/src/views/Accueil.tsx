import { Warehouse as WarehouseIcon, ArrowRight } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from '../hooks/useNavigate'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import type { Warehouse } from '../../../shared/types'

export default function Accueil() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    window.api.getWarehouses().then(setWarehouses).catch(() => {}).finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Bienvenue sur iventello</h1>
        <p className="mt-1 text-sm text-muted-foreground">Sélectionnez un entrepôt pour commencer à travailler.</p>
      </div>

      {loading && <p className="text-muted-foreground">Chargement...</p>}

      {!loading && warehouses.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-4 py-12">
            <WarehouseIcon className="h-12 w-12 text-muted-foreground" />
            <div className="text-center">
              <p className="font-medium">Aucun entrepôt</p>
              <p className="text-sm text-muted-foreground">Créez votre premier entrepôt pour commencer.</p>
            </div>
            <Button onClick={() => navigate('entrepots')}>
              Créer un entrepôt
            </Button>
          </CardContent>
        </Card>
      )}

      {!loading && warehouses.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {warehouses.map((w) => (
            <Card
              key={w.id}
              className="cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5 group"
              onClick={() => navigate('workspace', w.id, w.name)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{w.name}</CardTitle>
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                    <WarehouseIcon className="h-5 w-5 text-primary" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {w.location && (
                  <p className="text-sm text-muted-foreground">{w.location}</p>
                )}
                <div className="mt-3 flex items-center gap-2 text-sm text-primary">
                  <span className="font-medium">Ouvrir</span>
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                </div>
              </CardContent>
            </Card>
          ))}
          <Card
            className="cursor-pointer border-dashed transition-all hover:border-primary hover:bg-primary/5"
            onClick={() => navigate('entrepots')}
          >
            <CardContent className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground hover:text-primary">
              <WarehouseIcon className="h-5 w-5" />
              <span>Nouvel entrepôt</span>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
