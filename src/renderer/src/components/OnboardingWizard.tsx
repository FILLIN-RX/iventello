import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Input } from './ui/input'
import { Button } from './ui/button'
import { Label } from './ui/label'
import { Package, ArrowRight, CheckCircle2, Sparkles, User, Mail, Lock, UserCircle } from 'lucide-react'

const floatingIcons = [
  { Icon: Package, className: 'top-[10%] left-[8%] animate-float text-primary/10', size: 48 },
  { Icon: Sparkles, className: 'top-[25%] right-[10%] animate-float-delayed text-primary/10', size: 36 },
  { Icon: CheckCircle2, className: 'bottom-[30%] left-[12%] animate-float-slow text-primary/10', size: 32 },
  { Icon: User, className: 'bottom-[10%] right-[8%] animate-float text-primary/10', size: 40 },
  { Icon: UserCircle, className: 'top-[50%] left-[4%] animate-float-delayed text-primary/10', size: 28 },
  { Icon: Sparkles, className: 'top-[5%] right-[40%] animate-float-slow text-primary/10', size: 24 },
  { Icon: Mail, className: 'bottom-[50%] right-[5%] animate-float text-primary/10', size: 30 },
  { Icon: Lock, className: 'top-[40%] right-[15%] animate-float-delayed text-primary/10', size: 26 },
]

export function OnboardingWizard({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState({ nom: '', prenom: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleCreateOwner = async () => {
    if (!formData.nom || !formData.prenom || !formData.email || !formData.password) {
      setError('Tous les champs sont obligatoires')
      return
    }
    setError('')
    setLoading(true)
    try {
      await window.api.auth.setupOwner(formData)
      await window.api.auth.login(formData.email, formData.password)
      onComplete()
    } catch (e: any) {
      setError(e.message || 'Erreur lors de la création du compte')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-primary/5 via-background to-primary/10">
      <div className="animate-gradient absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-primary/10" />

      {floatingIcons.map(({ Icon, className, size }, i) => (
        <div key={i} className={`absolute ${className}`}>
          <Icon size={size} />
        </div>
      ))}

      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-primary/5 to-transparent" />

      <div className="animate-fade-in z-10">
        <Card className="w-[420px] border-primary/10 shadow-2xl shadow-primary/5 backdrop-blur-sm bg-card/95">
          {step === 1 && (
            <>
              <CardHeader className="text-center pb-2 pt-8">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/70 shadow-lg">
                  <Package className="h-8 w-8 text-primary-foreground" />
                </div>
                <CardTitle className="text-xl font-bold">Bienvenue sur Iventello</CardTitle>
                <CardDescription className="text-sm mt-1">
                  Configurez votre espace de gestion de stock et de caisse
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-4 pb-8">
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { icon: Package, label: 'Gestion de stock' },
                    { icon: User, label: 'Gestion des ventes' },
                    { icon: Sparkles, label: 'Rapports' },
                  ].map(({ icon: Icon, label }) => (
                    <div key={label} className="flex flex-col items-center gap-1.5 rounded-lg border bg-muted/30 px-3 py-3 text-center">
                      <Icon className="h-5 w-5 text-primary" />
                      <span className="text-[11px] font-medium text-muted-foreground leading-tight">{label}</span>
                    </div>
                  ))}
                </div>
                <Button className="w-full h-10" onClick={() => setStep(2)}>
                  Commencer
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </>
          )}

          {step === 2 && (
            <>
              <CardHeader className="text-center pb-2 pt-8">
                <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/70 shadow-lg">
                  <UserCircle className="h-7 w-7 text-primary-foreground" />
                </div>
                <CardTitle className="text-xl font-bold">Compte Propriétaire</CardTitle>
                <CardDescription className="text-sm mt-1">
                  Créez le compte administrateur principal
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3.5 pt-2">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Nom</Label>
                    <Input
                      value={formData.nom}
                      onChange={e => setFormData({...formData, nom: e.target.value})}
                      placeholder="Votre nom"
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Prénom</Label>
                    <Input
                      value={formData.prenom}
                      onChange={e => setFormData({...formData, prenom: e.target.value})}
                      placeholder="Votre prénom"
                      className="h-10"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Email</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                    placeholder="exemple@email.com"
                    className="h-10"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Mot de passe</Label>
                  <Input
                    type="password"
                    value={formData.password}
                    onChange={e => setFormData({...formData, password: e.target.value})}
                    placeholder="••••••••"
                    className="h-10"
                  />
                </div>
                {error && (
                  <div className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive text-center">
                    {error}
                  </div>
                )}
                <Button
                  className="w-full h-10 font-semibold mt-1"
                  onClick={handleCreateOwner}
                  disabled={loading}
                >
                  {loading ? 'Création en cours...' : 'Créer le compte'}
                </Button>
              </CardContent>
            </>
          )}
        </Card>

        {step === 1 && (
          <p className="mt-6 text-center text-xs text-muted-foreground/60">
            Iventello v1.0.0 &mdash; Configuration initiale
          </p>
        )}
      </div>
    </div>
  )
}
