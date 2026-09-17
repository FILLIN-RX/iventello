import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Input } from './ui/input'
import { Button } from './ui/button'
import { Label } from './ui/label'
import { useAuthStore } from '../stores/authStore'

type ViewMode = 'login' | 'register' | 'forgot-password' | 'security-question-setup'

const QUESTIONS = [
  'Quel est le nom de votre premier animal de compagnie ?',
  'Quelle est votre ville natale ?',
  'Quel est le nom de votre meilleur ami d\'enfance ?',
  'Quel est le plat que vous préférez ?',
  'Quel est le nom de votre premier enseignant ?',
  'Quelle est votre couleur préférée ?',
  'Quel est votre film préféré ?',
  'Quel est votre sport préféré ?'
]

export function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<ViewMode>('login')
  const [hasUsers, setHasUsers] = useState(true)
  const login = useAuthStore(state => state.login)
  const user = useAuthStore(state => state.user)

  // Registration state
  const [regEmail, setRegEmail] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regNom, setRegNom] = useState('')
  const [regPrenom, setRegPrenom] = useState('')
  const [regQuestion, setRegQuestion] = useState('')
  const [regAnswer, setRegAnswer] = useState('')
  const [regError, setRegError] = useState('')
  const [regLoading, setRegLoading] = useState(false)

  // Forgot password state
  const [fpEmail, setFpEmail] = useState('')
  const [fpStep, setFpStep] = useState<'email' | 'verify' | 'newpass' | 'done'>('email')
  const [fpQuestion, setFpQuestion] = useState('')
  const [fpAnswer, setFpAnswer] = useState('')
  const [fpHasSecurity, setFpHasSecurity] = useState(false)
  const [fpHasRecovery, setFpHasRecovery] = useState(false)
  const [fpUseCode, setFpUseCode] = useState(false)
  const [fpCode, setFpCode] = useState('')
  const [fpNewPassword, setFpNewPassword] = useState('')
  const [fpError, setFpError] = useState('')
  const [fpLoading, setFpLoading] = useState(false)
  const [fpRecoveryFile, setFpRecoveryFile] = useState('')
  const [isProprietaire, setIsProprietaire] = useState(false)

  // Security question setup state
  const [sqQuestion, setSqQuestion] = useState('')
  const [sqAnswer, setSqAnswer] = useState('')
  const [sqError, setSqError] = useState('')
  const [sqLoading, setSqLoading] = useState(false)
  const [sqDone, setSqDone] = useState(false)
  const [sqRecoveryCode, setSqRecoveryCode] = useState('')
  const [sqRecoveryFilePath, setSqRecoveryFilePath] = useState('')

  useEffect(() => {
    window.api.auth.hasUsers().then(setHasUsers)
  }, [])

  // Check if user needs to set security question
  useEffect(() => {
    if (user && !sqDone) {
      // Check if user has a security question already
      window.api.auth.hasSecurityQuestion(user.email).then(({ has }) => {
        if (!has) {
          setMode('security-question-setup')
        }
      })
    }
  }, [user])

  const handleLogin = async () => {
    setError('')
    setLoading(true)
    try {
      await login(email, password)
    } catch (e: any) {
      setError(e.message || 'Erreur de connexion')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleLogin()
  }

  // ── Registration ──────────────────────────────────────────

  const handleRegister = async () => {
    setRegError('')
    if (!regEmail.trim() || !regPassword.trim() || !regNom.trim() || !regPrenom.trim()) {
      setRegError('Tous les champs sont requis')
      return
    }
    if (regPassword.length < 6) {
      setRegError('Le mot de passe doit contenir au moins 6 caractères')
      return
    }
    setRegLoading(true)
    try {
      await window.api.auth.setupOwner({
        email: regEmail.trim(),
        password: regPassword,
        nom: regNom.trim(),
        prenom: regPrenom.trim()
      })

      // Set security question if provided
      if (regQuestion && regAnswer.trim()) {
        const newUser = await window.api.auth.login(regEmail.trim(), regPassword)
        await window.api.auth.setSecurityQuestion(newUser.id, regQuestion, regAnswer.trim())
      }

      // Generate recovery code for proprietaire
      if (regQuestion && regAnswer.trim()) {
        const newUser = await window.api.auth.login(regEmail.trim(), regPassword)
        await window.api.auth.setSecurityQuestion(newUser.id, regQuestion, regAnswer.trim())
        const { code, filePath } = await window.api.auth.generateRecoveryCode(newUser.id)
        setSqRecoveryCode(code)
        setSqRecoveryFilePath(filePath)
      }

      await login(regEmail.trim(), regPassword)
      setMode('login')
    } catch (e: any) {
      setRegError(e.message || 'Erreur lors de la création')
    } finally {
      setRegLoading(false)
    }
  }

  // ── Forgot Password ───────────────────────────────────────

  const handleForgotEmail = async () => {
    setFpError('')
    if (!fpEmail.trim()) {
      setFpError('Veuillez saisir votre email')
      return
    }
    setFpLoading(true)
    try {
      const { has, question } = await window.api.auth.hasSecurityQuestion(fpEmail.trim())

      // Check if user exists by trying to get their recovery code status
      let hasRecovery = false
      let proprietaire = false
      try {
        hasRecovery = await window.api.auth.hasRecoveryCode(fpEmail.trim())
        // Check if proprietaire by trying to find the role
        const users = await window.api.auth.getUsers()
        const found = users.find(u => u.email === fpEmail.trim())
        if (found) {
          proprietaire = found.role === 'PROPRIETAIRE'
        }
      } catch {}

      if (!has && !proprietaire) {
        setFpError('Aucune question de sécurité configurée. Contactez le propriétaire pour réinitialiser votre mot de passe.')
        setFpLoading(false)
        return
      }

      setIsProprietaire(proprietaire)
      setFpHasSecurity(has)
      setFpQuestion(question || '')
      setFpHasRecovery(hasRecovery)
      setFpStep('verify')
    } catch (e: any) {
      setFpError(e.message || 'Erreur')
    } finally {
      setFpLoading(false)
    }
  }

  const handleForgotVerify = async () => {
    setFpError('')
    setFpLoading(true)
    try {
      if (fpUseCode) {
        const valid = await window.api.auth.verifyRecoveryCode(fpEmail.trim(), fpCode.trim())
        if (!valid) {
          setFpError('Code de récupération incorrect')
          setFpLoading(false)
          return
        }
      } else {
        const valid = await window.api.auth.verifySecurityAnswer(fpEmail.trim(), fpAnswer.trim())
        if (!valid) {
          setFpError('Réponse incorrecte')
          setFpLoading(false)
          return
        }
      }
      setFpStep('newpass')
    } catch (e: any) {
      setFpError(e.message || 'Erreur')
    } finally {
      setFpLoading(false)
    }
  }

  const handleForgotNewPass = async () => {
    setFpError('')
    if (!fpNewPassword || fpNewPassword.length < 6) {
      setFpError('Le mot de passe doit contenir au moins 6 caractères')
      return
    }
    setFpLoading(true)
    try {
      await window.api.auth.resetPassword(fpEmail.trim(), fpNewPassword)
      setFpStep('done')
    } catch (e: any) {
      setFpError(e.message || 'Erreur')
    } finally {
      setFpLoading(false)
    }
  }

  // ── Security Question Setup ──────────────────────────────

  const handleSaveSecurityQuestion = async () => {
    setSqError('')
    if (!sqQuestion || !sqAnswer.trim()) {
      setSqError('Veuillez choisir une question et saisir une réponse')
      return
    }
    if (sqAnswer.trim().length < 2) {
      setSqError('La réponse doit contenir au moins 2 caractères')
      return
    }
    setSqLoading(true)
    try {
      await window.api.auth.setSecurityQuestion(user!.id, sqQuestion, sqAnswer.trim())
      // Generate recovery code for proprietaire
      if (user!.role === 'PROPRIETAIRE') {
        const { code, filePath } = await window.api.auth.generateRecoveryCode(user!.id)
        setSqRecoveryCode(code)
        setSqRecoveryFilePath(filePath)
      }
      setSqDone(true)
    } catch (e: any) {
      setSqError(e.message || 'Erreur')
    } finally {
      setSqLoading(false)
    }
  }

  const handleSkipSecurityQuestion = () => {
    setSqDone(true)
    setMode('login')
  }

  // ── Render helper ──────────────────────────────────────────

  const SvgBg = () => (
    <svg className="pointer-events-none absolute inset-0 h-full w-full text-primary/5" viewBox="0 0 1000 1000" preserveAspectRatio="none">
      <defs>
        <linearGradient id="g1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.15" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <circle cx="100" cy="150" r="80" fill="url(#g1)" />
      <circle cx="900" cy="800" r="120" fill="url(#g1)" />
      <rect x="50" y="400" width="60" height="60" rx="12" fill="url(#g1)" />
      <rect x="880" y="200" width="50" height="50" rx="10" fill="url(#g1)" />
      <path d="M200,700 Q300,600 400,700 T600,700" stroke="currentColor" strokeWidth="2" fill="none" opacity="0.08" />
    </svg>
  )

  // ── Security Question Setup View ──────────────────────────

  if (mode === 'security-question-setup' && user) {
    return (
      <div className="relative flex h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-primary/5 via-background to-primary/10">
        <SvgBg />
        <div className="animate-fade-in z-10">
          <Card className="w-[450px] border-primary/10 shadow-2xl shadow-primary/5 backdrop-blur-sm bg-card/95">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-xl font-bold">
                {sqDone ? 'Configuration terminée' : 'Configurez votre récupération'}
              </CardTitle>
              <CardDescription className="text-sm">
                {sqDone
                  ? 'Votre question de sécurité a été enregistrée.'
                  : 'Choisissez une question de sécurité pour pouvoir réinitialiser votre mot de passe.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              {sqDone ? (
                <div className="space-y-4">
                  {sqRecoveryCode && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm dark:border-amber-800 dark:bg-amber-950">
                      <p className="mb-2 font-semibold text-amber-800 dark:text-amber-200">Code de récupération</p>
                      <p className="mb-2 text-amber-700 dark:text-amber-300">
                        Un code de récupération a été généré et sauvegardé sur votre bureau :
                      </p>
                      <p className="mb-1 font-mono text-base font-bold text-amber-900 dark:text-amber-100">{sqRecoveryCode}</p>
                      <p className="text-xs text-amber-600 dark:text-amber-400">{sqRecoveryFilePath}</p>
                      <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                        Conservez ce code précieusement. Il vous permet de réinitialiser votre mot de passe.
                      </p>
                    </div>
                  )}
                  <Button className="w-full" onClick={() => { setSqDone(false); setMode('login') }}>
                    Accéder à l'application
                  </Button>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Question de sécurité</Label>
                    <select
                      className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50"
                      value={sqQuestion}
                      onChange={e => setSqQuestion(e.target.value)}
                    >
                      <option value="">Sélectionnez une question...</option>
                      {QUESTIONS.map((q, i) => (
                        <option key={i} value={q}>{q}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Votre réponse</Label>
                    <Input
                      value={sqAnswer}
                      onChange={e => setSqAnswer(e.target.value)}
                      placeholder="Saisissez votre réponse"
                      className="h-10"
                    />
                  </div>
                  {sqError && (
                    <div className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive text-center">{sqError}</div>
                  )}
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1" onClick={handleSkipSecurityQuestion}>
                      Plus tard
                    </Button>
                    <Button className="flex-1" onClick={handleSaveSecurityQuestion} disabled={sqLoading}>
                      {sqLoading ? 'Enregistrement...' : 'Enregistrer'}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // ── Register View ────────────────────────────────────────

  if (mode === 'register') {
    return (
      <div className="relative flex h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-primary/5 via-background to-primary/10">
        <SvgBg />
        <div className="animate-fade-in z-10">
          <Card className="w-[450px] border-primary/10 shadow-2xl shadow-primary/5 backdrop-blur-sm bg-card/95">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/70 shadow-lg">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-7 w-7 text-primary-foreground">
                  <path d="M4 7V4h16v3" /><path d="M9 20h6" /><path d="M12 4v16" />
                  <rect x="3" y="7" width="18" height="13" rx="2" />
                </svg>
              </div>
              <CardTitle className="text-xl font-bold">Créer un compte</CardTitle>
              <CardDescription className="text-sm">
                {hasUsers ? "Seul l'administrateur peut créer des utilisateurs." : 'Premier compte — vous serez propriétaire'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Prénom</Label>
                  <Input value={regPrenom} onChange={e => setRegPrenom(e.target.value)} placeholder="Jean" className="h-10" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Nom</Label>
                  <Input value={regNom} onChange={e => setRegNom(e.target.value)} placeholder="Dupont" className="h-10" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium">Email</Label>
                <Input type="email" value={regEmail} onChange={e => setRegEmail(e.target.value)} placeholder="exemple@email.com" className="h-10" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium">Mot de passe</Label>
                <Input type="password" value={regPassword} onChange={e => setRegPassword(e.target.value)} placeholder="••••••••" className="h-10" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium">Question de sécurité (recommandé)</Label>
                <select
                  className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50"
                  value={regQuestion}
                  onChange={e => setRegQuestion(e.target.value)}
                >
                  <option value="">Sélectionnez une question...</option>
                  {QUESTIONS.map((q, i) => (
                    <option key={i} value={q}>{q}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium">Réponse</Label>
                <Input value={regAnswer} onChange={e => setRegAnswer(e.target.value)} placeholder="Votre réponse" className="h-10" />
              </div>
              {regError && (
                <div className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive text-center">{regError}</div>
              )}
              <Button className="w-full h-10 font-semibold" onClick={handleRegister} disabled={regLoading}>
                {regLoading ? 'Création...' : 'Créer le compte'}
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                Déjà un compte ?{' '}
                <button onClick={() => { setMode('login'); setRegError('') }} className="font-medium text-primary hover:underline">
                  Se connecter
                </button>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // ── Forgot Password View ─────────────────────────────────

  if (mode === 'forgot-password') {
    return (
      <div className="relative flex h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-primary/5 via-background to-primary/10">
        <SvgBg />
        <div className="animate-fade-in z-10">
          <Card className="w-[420px] border-primary/10 shadow-2xl shadow-primary/5 backdrop-blur-sm bg-card/95">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-xl font-bold">Mot de passe oublié</CardTitle>
              <CardDescription className="text-sm">
                {fpStep === 'email' && 'Saisissez votre email pour commencer la réinitialisation.'}
                {fpStep === 'verify' && 'Vérifiez votre identité pour continuer.'}
                {fpStep === 'newpass' && 'Choisissez un nouveau mot de passe.'}
                {fpStep === 'done' && 'Mot de passe réinitialisé avec succès !'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              {fpStep === 'email' && (
                <>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Email</Label>
                    <Input type="email" value={fpEmail} onChange={e => setFpEmail(e.target.value)} placeholder="exemple@email.com" className="h-10" onKeyDown={e => e.key === 'Enter' && handleForgotEmail()} />
                  </div>
                  {fpError && (
                    <div className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive text-center">{fpError}</div>
                  )}
                  <Button className="w-full h-10" onClick={handleForgotEmail} disabled={fpLoading}>
                    {fpLoading ? 'Vérification...' : 'Continuer'}
                  </Button>
                </>
              )}

              {fpStep === 'verify' && (
                <>
                  {fpHasSecurity && !fpUseCode && (
                    <div className="space-y-2">
                      <Label className="text-xs font-medium">Question de sécurité</Label>
                      <p className="rounded-lg bg-muted px-3 py-2 text-sm">{fpQuestion}</p>
                      <Input
                        value={fpAnswer}
                        onChange={e => setFpAnswer(e.target.value)}
                        placeholder="Votre réponse"
                        className="h-10"
                        onKeyDown={e => e.key === 'Enter' && handleForgotVerify()}
                      />
                    </div>
                  )}

                  {isProprietaire && !fpHasSecurity && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm dark:border-amber-800 dark:bg-amber-950">
                      <p className="mb-2 font-medium text-amber-800 dark:text-amber-200">
                        Aucune question de sécurité configurée.
                      </p>
                      <p className="mb-2 text-amber-700 dark:text-amber-300">
                        Utilisez votre code de récupération (fichier <strong>Iventello-CodeRecuperation.txt</strong> sur votre bureau).
                      </p>
                    </div>
                  )}

                  {fpHasRecovery && fpUseCode && (
                    <div className="space-y-2">
                      <Label className="text-xs font-medium">Code de récupération</Label>
                      <Input
                        value={fpCode}
                        onChange={e => setFpCode(e.target.value.toUpperCase())}
                        placeholder="Ex: A3F8B2C1D9E0"
                        className="h-10 font-mono"
                        onKeyDown={e => e.key === 'Enter' && handleForgotVerify()}
                      />
                    </div>
                  )}

                  {fpHasSecurity && isProprietaire && (
                    <div className="text-center">
                      <button
                        onClick={() => setFpUseCode(!fpUseCode)}
                        className="text-xs text-primary hover:underline"
                      >
                        {fpUseCode ? 'Utiliser la question de sécurité' : 'Utiliser le code de récupération'}
                      </button>
                    </div>
                  )}

                  {fpHasRecovery && fpHasSecurity && !fpUseCode && (
                    <div className="text-center">
                      <button
                        onClick={() => setFpUseCode(true)}
                        className="text-xs text-primary hover:underline"
                      >
                        Utiliser le code de récupération
                      </button>
                    </div>
                  )}

                  {fpError && (
                    <div className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive text-center">{fpError}</div>
                  )}

                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1" onClick={() => { setFpStep('email'); setFpError('') }}>
                      Retour
                    </Button>
                    <Button className="flex-1" onClick={handleForgotVerify} disabled={fpLoading}>
                      {fpLoading ? 'Vérification...' : 'Vérifier'}
                    </Button>
                  </div>
                </>
              )}

              {fpStep === 'newpass' && (
                <>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Nouveau mot de passe</Label>
                    <Input type="password" value={fpNewPassword} onChange={e => setFpNewPassword(e.target.value)} placeholder="•••••••• (min. 6 caractères)" className="h-10" onKeyDown={e => e.key === 'Enter' && handleForgotNewPass()} />
                  </div>
                  {fpError && (
                    <div className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive text-center">{fpError}</div>
                  )}
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1" onClick={() => setFpStep('verify')}>
                      Retour
                    </Button>
                    <Button className="flex-1" onClick={handleForgotNewPass} disabled={fpLoading}>
                      {fpLoading ? 'Réinitialisation...' : 'Réinitialiser'}
                    </Button>
                  </div>
                </>
              )}

              {fpStep === 'done' && (
                <div className="space-y-4">
                  <p className="text-center text-sm text-green-600 font-medium dark:text-green-400">
                    Votre mot de passe a été réinitialisé avec succès.
                  </p>
                  <Button className="w-full" onClick={() => {
                    setMode('login')
                    setPassword('')
                    setEmail(fpEmail)
                    setFpStep('email')
                    setFpAnswer('')
                    setFpCode('')
                    setFpNewPassword('')
                    setFpError('')
                  }}>
                    Se connecter avec le nouveau mot de passe
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            <button onClick={() => { setMode('login'); setFpError('') }} className="hover:underline">
              Retour à la connexion
            </button>
          </p>
        </div>
      </div>
    )
  }

  // ── Login View ────────────────────────────────────────────

  return (
    <div className="relative flex h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-primary/5 via-background to-primary/10">
      <SvgBg />

      <div className="animate-fade-in z-10">
        <Card className="w-[380px] border-primary/10 shadow-2xl shadow-primary/5 backdrop-blur-sm bg-card/95">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/70 shadow-lg">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-7 w-7 text-primary-foreground">
                <path d="M4 7V4h16v3" /><path d="M9 20h6" /><path d="M12 4v16" />
                <rect x="3" y="7" width="18" height="13" rx="2" />
              </svg>
            </div>
            <CardTitle className="text-xl font-bold">Iventello</CardTitle>
            <CardDescription className="text-sm">Gestion de stock & caisse</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label className="text-xs font-medium">Email</Label>
              <Input type="email" placeholder="exemple@email.com" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={handleKeyDown} className="h-10" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium">Mot de passe</Label>
              <Input type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={handleKeyDown} className="h-10" />
            </div>
            <div className="text-right">
              <button onClick={() => setMode('forgot-password')} className="text-xs text-primary hover:underline">
                Mot de passe oublié ?
              </button>
            </div>
            {error && (
              <div className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive text-center">{error}</div>
            )}
            <Button className="w-full h-10 font-semibold" onClick={handleLogin} disabled={loading}>
              {loading ? 'Connexion...' : 'Se connecter'}
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              {hasUsers ? "Pas encore de compte ?" : "Aucun compte ?"}{' '}
              <button onClick={() => setMode('register')} className="font-medium text-primary hover:underline">
                Créer un compte
              </button>
            </p>
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-xs text-muted-foreground/60">
          Iventello v1.0.0 &mdash; Gestion de stock & caisse
        </p>
      </div>
    </div>
  )
}