import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Input } from './ui/input'
import { Button } from './ui/button'
import { Label } from './ui/label'

export function OnboardingWizard({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState({ nom: '', prenom: '', email: '', password: '' })
  const [error, setError] = useState('')

  const handleCreateOwner = async () => {
    try {
      await window.api.auth.setupOwner(formData)
      setStep(3)
    } catch (e: any) {
      setError(e.message || 'Erreur lors de la création du compte')
    }
  }

  return (
    <div className="flex h-screen items-center justify-center bg-muted/20">
      <Card className="w-[400px]">
        {step === 1 && (
          <>
            <CardHeader>
              <CardTitle>Bienvenue sur Iventello</CardTitle>
              <CardDescription>Configurez votre espace de gestion</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" onClick={() => setStep(2)}>Commencer</Button>
            </CardContent>
          </>
        )}
        {step === 2 && (
          <>
            <CardHeader>
              <CardTitle>Compte Propriétaire</CardTitle>
              <CardDescription>Entrez vos informations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Nom</Label>
                <Input value={formData.nom} onChange={e => setFormData({...formData, nom: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Prénom</Label>
                <Input value={formData.prenom} onChange={e => setFormData({...formData, prenom: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Mot de passe</Label>
                <Input type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button className="w-full" onClick={handleCreateOwner}>Créer le compte</Button>
            </CardContent>
          </>
        )}
        {step === 3 && (
          <>
            <CardHeader>
              <CardTitle>Félicitations !</CardTitle>
              <CardDescription>Votre compte est prêt.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" onClick={onComplete}>Accéder à l'application</Button>
            </CardContent>
          </>
        )}
      </Card>
    </div>
  )
}
