import { useEffect, useState } from 'react'
import { FileText, Upload, Trash2 } from 'lucide-react'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Textarea } from '../components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import type { AppSettings } from '../../../shared/types'

export default function SettingsView() {
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    window.api.getAppSettings().then(setSettings)
  }, [])

  async function handleSave() {
    if (!settings) return
    setSaving(true)
    try {
      const updated = await window.api.updateAppSettings({
        companyName: settings.companyName,
        companyNui: settings.companyNui,
        companyBp: settings.companyBp,
        companyAddress: settings.companyAddress,
        companyPhones: settings.companyPhones,
        companyEmail: settings.companyEmail,
        companyLogo: settings.companyLogo,
        companyDescription: settings.companyDescription,
        invoiceFooter: settings.invoiceFooter
      })
      setSettings(updated)
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
    if (path && settings) setSettings({ ...settings, companyLogo: path })
  }

  function handleRemoveLogo() {
    if (settings) setSettings({ ...settings, companyLogo: null })
  }

  function set<K extends keyof AppSettings>(key: K, value: AppSettings[K]) {
    if (settings) setSettings({ ...settings, [key]: value })
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
        <FileText className="h-6 w-6 text-primary" /> Paramètres de facturation
      </h1>
      <p className="text-sm text-muted-foreground -mt-4">
        Ces informations apparaîtront sur vos factures et reçus.
      </p>

      {settings && (
        <>
          {/* Logo */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Logo de l'entreprise</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {settings.companyLogo ? (
                <div className="flex items-center gap-3">
                  <img
                    src={settings.companyLogo.startsWith('http') ? settings.companyLogo : `local-file://${settings.companyLogo}`}
                    alt="Logo"
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
                <Input value={settings.companyName} onChange={(e) => set('companyName', e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>NUI (Numéro d'Identification Unique)</Label>
                  <Input value={settings.companyNui ?? ''} onChange={(e) => set('companyNui', e.target.value || null)} />
                </div>
                <div className="space-y-1.5">
                  <Label>BP (Boîte Postale)</Label>
                  <Input value={settings.companyBp ?? ''} onChange={(e) => set('companyBp', e.target.value || null)} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Adresse</Label>
                <Input value={settings.companyAddress ?? ''} onChange={(e) => set('companyAddress', e.target.value || null)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Téléphones (un par ligne)</Label>
                  <Textarea
                    rows={3}
                    value={settings.companyPhones ?? ''}
                    onChange={(e) => set('companyPhones', e.target.value || null)}
                    placeholder="+237 6XX XXX XXX&#10;+237 6XX XXX XXX"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Email</Label>
                  <Input value={settings.companyEmail ?? ''} onChange={(e) => set('companyEmail', e.target.value || null)} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Description / Slogan</Label>
                <Textarea
                  rows={2}
                  value={settings.companyDescription ?? ''}
                  onChange={(e) => set('companyDescription', e.target.value || null)}
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
                  value={settings.invoiceFooter ?? ''}
                  onChange={(e) => set('invoiceFooter', e.target.value || null)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Aperçu */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Aperçu de l'en-tête de facture</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border bg-white p-6">
                <div className="flex items-start gap-4">
                  {settings.companyLogo && (
                    <img
                      src={settings.companyLogo.startsWith('http') ? settings.companyLogo : `local-file://${settings.companyLogo}`}
                      alt="Logo"
                      className="h-14 w-14 rounded object-cover"
                    />
                  )}
                  <div>
                    <h2 className="text-lg font-bold">{settings.companyName || 'Mon Entreprise'}</h2>
                    {settings.companyDescription && <p className="text-xs text-gray-500 italic">{settings.companyDescription}</p>}
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-500 mt-1">
                      {settings.companyNui && <span>NUI: {settings.companyNui}</span>}
                      {settings.companyBp && <span>BP: {settings.companyBp}</span>}
                    </div>
                    {settings.companyAddress && <p className="text-sm text-gray-600">{settings.companyAddress}</p>}
                    <div className="flex flex-col gap-0.5 text-sm text-gray-500 mt-1">
                      {settings.companyPhones?.split('\n').filter(Boolean).map((tel, i) => <span key={i}>{tel}</span>)}
                      {settings.companyEmail && <span>{settings.companyEmail}</span>}
                    </div>
                  </div>
                </div>
                <div className="mt-4 border-t pt-3 text-right">
                  <h3 className="text-xl font-bold">FACTURE</h3>
                  <p className="text-sm text-gray-500">N° FACT-2026-0001</p>
                  <p className="text-sm text-gray-500">Date: 01/06/2026</p>
                </div>
                {settings.invoiceFooter && (
                  <div className="mt-4 border-t pt-3 text-xs text-gray-500 text-center">
                    {settings.invoiceFooter}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center gap-3">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Enregistrement...' : 'Enregistrer les paramètres'}
            </Button>
            {done && <span className="text-sm text-emerald-600 font-medium">✓ Enregistré</span>}
          </div>
        </>
      )}
    </div>
  )
}
