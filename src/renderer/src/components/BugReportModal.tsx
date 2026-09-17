import { useState } from 'react'
import { Bug, Send, MessageSquare, Copy, Check, X, ShieldAlert, PhoneCall } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { feedback } from '../stores/feedbackStore'

interface Props {
  open: boolean
  onClose: () => void
}

const SUPPORT_PHONE = '237674376524'
const SUPPORT_PHONE_FORMATTED = '+237 674 37 65 24'

const BUG_CATEGORIES = [
  { id: 'caisse', label: 'Caisse & Ventes' },
  { id: 'stock', label: 'Gestion des Stocks & Produits' },
  { id: 'librairie', label: 'Librairie Scolaire' },
  { id: 'impression', label: 'Impression & PDF' },
  { id: 'autre', label: 'Autre Problème / Suggestion' }
]

export function BugReportModal({ open, onClose }: Props) {
  const [category, setCategory] = useState('caisse')
  const [description, setDescription] = useState('')
  const [copied, setCopied] = useState(false)

  const handleCopyNumber = () => {
    navigator.clipboard.writeText('674376524')
    setCopied(true)
    feedback.toast.success('Numéro copié !', 'Le numéro 674376524 a été copié dans votre presse-papier.')
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSendWhatsApp = () => {
    const categoryLabel = BUG_CATEGORIES.find((c) => c.id === category)?.label || 'Signaler un bug'
    let text = `*SIGNIFICATION DE BUG - IVENTELLO*\n`
    text += `📌 *Catégorie* : ${categoryLabel}\n`
    if (description.trim()) {
      text += `📝 *Description du problème* :\n${description.trim()}\n`
    } else {
      text += `📝 *Description* : Bonjour, je souhaite signaler un dysfonctionnement sur l'application.\n`
    }
    text += `\n📅 *Date* : ${new Date().toLocaleString('fr-FR')}`

    const whatsappUrl = `https://wa.me/${SUPPORT_PHONE}?text=${encodeURIComponent(text)}`

    try {
      if (window.api?.openExternal) {
        window.api.openExternal(whatsappUrl)
      } else {
        window.open(whatsappUrl, '_blank')
      }
      feedback.toast.success('WhatsApp ouvert', 'Redirection vers le support WhatsApp...')
      onClose()
    } catch (err) {
      console.error('Erreur ouverture WhatsApp:', err)
      feedback.toast.error('Impossible d\'ouvrir WhatsApp automatiquement')
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="sm:max-w-md p-6 rounded-3xl border border-border shadow-2xl bg-card">
        <DialogHeader className="pb-3 border-b border-border">
          <DialogTitle className="flex items-center gap-2.5 text-lg font-bold text-foreground">
            <div className="h-9 w-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/20">
              <Bug className="h-5 w-5" />
            </div>
            Signaler un Bug / Support WhatsApp Direct
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground mt-1">
            Envoyez un message direct sur WhatsApp au numéro d'assistance <strong className="text-foreground">{SUPPORT_PHONE_FORMATTED}</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 my-2">
          {/* Bloc Numéro Direct */}
          <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl p-3.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                <MessageSquare className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-extrabold text-emerald-900 dark:text-emerald-200">Support WhatsApp Officiel</p>
                <p className="text-xs font-mono font-bold text-emerald-700 dark:text-emerald-400">{SUPPORT_PHONE_FORMATTED}</p>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopyNumber}
              className="h-8 text-[11px] font-semibold gap-1.5 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? 'Copié' : 'Copier'}
            </Button>
          </div>

          {/* Choix de la catégorie du bug */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-foreground">Catégorie du problème</Label>
            <div className="grid grid-cols-2 gap-2">
              {BUG_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategory(cat.id)}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold text-left transition-all border ${category === cat.id ? 'bg-amber-500/15 border-amber-500 text-amber-700 dark:text-amber-300 font-bold shadow-2xs' : 'bg-muted/40 border-border text-muted-foreground hover:text-foreground hover:bg-muted'}`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Saisie libre de la description */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-foreground">
              Description du problème (optionnel)
            </Label>
            <Textarea
              placeholder="Expliquez brièvement ce qui s'est passé (ex: 'Le bouton d'impression ne réagit pas', 'Le total est erroné'...)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="text-xs min-h-[90px] rounded-xl resize-none"
            />
          </div>
        </div>

        {/* Boutons d'Action */}
        <div className="flex flex-col sm:flex-row items-center justify-end gap-2 pt-3 border-t border-border">
          <Button variant="outline" size="sm" onClick={onClose} className="w-full sm:w-auto text-xs">
            Annuler
          </Button>

          <Button
            type="button"
            onClick={handleSendWhatsApp}
            className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2 text-xs h-10 px-5 shadow-md shadow-emerald-600/20"
          >
            <MessageSquare className="h-4 w-4" /> Envoyer sur WhatsApp (674376524)
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
