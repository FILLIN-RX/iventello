import { useState, useEffect } from 'react'
import { Book, Save, ArrowLeft, X, Image, Package, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../components/ui/card'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  SelectGroup,
  SelectLabel,
  SelectSeparator
} from '../components/ui/select'
import type { ClassLevel, Subject, BookWithRelations } from '../../../shared/types'
import { toFileUrl } from '../../../shared/imageUtils'
import { formatCurrency } from '@/lib/utils'

interface Props {
  bookId?: string
  onClose: () => void
  classLevelId?: string
}

export default function BookForm({ bookId, onClose, classLevelId: initialClassLevelId }: Props) {
  const [title, setTitle] = useState('')
  const [isbn, setIsbn] = useState('')
  const [author, setAuthor] = useState('')
  const [editor, setEditor] = useState('')
  const [year, setYear] = useState('')
  const [price, setPrice] = useState('')
  const [purchasePrice, setPurchasePrice] = useState('')
  const [classLevelId, setClassLevelId] = useState(initialClassLevelId ?? '')
  const [subjectId, setSubjectId] = useState('')
  const [activityBookId, setActivityBookId] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [imagePath, setImagePath] = useState('')
  const [success, setSuccess] = useState(false)

  const [classLevels, setClassLevels] = useState<ClassLevel[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [activityBooks, setActivityBooks] = useState<BookWithRelations[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selectedClassLevel = classLevels.find((cl) => cl.id === classLevelId)
  const system = selectedClassLevel?.system ?? 'FRANCOPHONE'

  useEffect(() => {
    window.api.getClassLevels().then(setClassLevels).catch(console.error)
  }, [])

  useEffect(() => {
    if (!system) return
    window.api.getSubjects(system).then(setSubjects).catch(console.error)
  }, [system])

  useEffect(() => {
    if (!classLevelId) {
      setActivityBooks([])
      return
    }
    window.api.getBooks(classLevelId).then(setActivityBooks).catch(console.error)
  }, [classLevelId])

  useEffect(() => {
    if (!bookId) return
    setLoading(true)
    window.api
      .getBook(bookId)
      .then((book) => {
        if (!book) return
        setTitle(book.title)
        setIsbn(book.isbn ?? '')
        setAuthor(book.author ?? '')
        setEditor(book.editor ?? '')
        setYear(book.year ?? '')
        setPrice(book.price.toString())
        setPurchasePrice(book.purchasePrice?.toString() ?? '')
        setClassLevelId(book.classLevelId)
        setSubjectId(book.subjectId ?? '')
        setActivityBookId(book.activityBookId ?? '')
        setImageUrl(book.imageUrl ?? '')
        setImagePath(book.imageUrl ?? '')
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [bookId])

  useEffect(() => {
    if (initialClassLevelId) {
      setClassLevelId(initialClassLevelId)
    }
  }, [initialClassLevelId])

  const francophoneLevels = classLevels.filter((cl) => cl.system === 'FRANCOPHONE')
  const anglophoneLevels = classLevels.filter((cl) => cl.system === 'ANGLOPHONE')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!title.trim()) {
      setError('Le titre est requis.')
      return
    }
    if (!classLevelId) {
      setError('Veuillez sélectionner un niveau.')
      return
    }
    if (!price || parseFloat(price) <= 0) {
      setError('Le prix de vente doit être supérieur à zéro.')
      return
    }

    try {
      setSaving(true)
      const data = {
        title: title.trim(),
        isbn: isbn.trim() || null,
        author: author.trim() || null,
        editor: editor.trim() || null,
        year: year.trim() || null,
        price: parseFloat(price),
        purchasePrice: purchasePrice ? parseFloat(purchasePrice) : null,
        classLevelId,
        subjectId: subjectId || null,
        activityBookId: activityBookId || null,
        isPacket: false,
        itemsPerPacket: 1,
        unitSellingPrice: null,
        imageUrl: imageUrl.trim() || null
      }

      if (bookId) {
        await window.api.updateBook(bookId, data)
      } else {
        const created = await window.api.createBook(data)
        if (imagePath) {
          const saved = await window.api.saveBookImage(imagePath, created.id)
          await window.api.updateBook(created.id, { imageUrl: saved })
        }
      }

      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'enregistrement du livre.")
    } finally {
      setSaving(false)
    }
  }

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 animate-fade-in">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
          <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div className="text-center">
          <h3 className="text-lg font-semibold">{bookId ? 'Livre modifié' : 'Livre créé'}</h3>
          <p className="text-sm text-muted-foreground">Le livre a été enregistré avec succès.</p>
        </div>
        <Button onClick={onClose} className="mt-2">
          <ArrowLeft className="mr-2 h-4 w-4" /> Retour à la librairie
        </Button>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Chargement...
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Book className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">
            {bookId ? 'Modifier le livre' : 'Nouveau livre'}
          </h2>
        </div>
        <Button type="button" variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {error && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Book className="h-4 w-4" />
                Informations du livre
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Titre *</Label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Titre du livre"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">ISBN</Label>
                  <Input
                    value={isbn}
                    onChange={(e) => setIsbn(e.target.value)}
                    placeholder="978-2-1234-5680-1"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Auteur</Label>
                  <Input
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    placeholder="Nom de l'auteur"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Éditeur</Label>
                  <Input
                    value={editor}
                    onChange={(e) => setEditor(e.target.value)}
                    placeholder="Maison d'édition"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Année scolaire / Édition</Label>
                  <Input
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    placeholder="2024-2025"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Package className="h-4 w-4" />
                Classification
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Niveau *</Label>
                <Select value={classLevelId} onValueChange={setClassLevelId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un niveau" />
                  </SelectTrigger>
                  <SelectContent>
                    {francophoneLevels.length > 0 && (
                      <SelectGroup>
                        <SelectLabel>Francophone</SelectLabel>
                        {francophoneLevels.map((cl) => (
                          <SelectItem key={cl.id} value={cl.id}>
                            {cl.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    )}
                    {francophoneLevels.length > 0 && anglophoneLevels.length > 0 && <SelectSeparator />}
                    {anglophoneLevels.length > 0 && (
                      <SelectGroup>
                        <SelectLabel>Anglophone</SelectLabel>
                        {anglophoneLevels.map((cl) => (
                          <SelectItem key={cl.id} value={cl.id}>
                            {cl.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Matière</Label>
                <Select value={subjectId} onValueChange={setSubjectId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner une matière" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Aucune matière</SelectItem>
                    {subjects.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Cahier d'activités lié</Label>
                <Select value={activityBookId} onValueChange={setActivityBookId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Aucun cahier d'activités" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Aucun</SelectItem>
                    {activityBooks
                      .filter((b) => b.id !== bookId)
                      .map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.title}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Package className="h-4 w-4" />
                Prix et stock
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Prix de vente (FCFA) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0"
                  required
                />
                {price && parseFloat(price) > 0 && (
                  <p className="text-[10px] text-muted-foreground">
                    {formatCurrency(parseFloat(price))}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Prix d'achat (FCFA)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={purchasePrice}
                  onChange={(e) => setPurchasePrice(e.target.value)}
                  placeholder="Optionnel"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Image className="h-4 w-4" />
                Image
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {imageUrl && (
                <div className="relative rounded-lg overflow-hidden border">
                  <img
                    src={imageUrl.startsWith('/') ? toFileUrl(imageUrl) : imageUrl}
                    alt="Aperçu"
                    className="w-full h-32 object-cover"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute top-1 right-1 h-6 w-6 bg-background/80"
                    onClick={() => { setImageUrl(''); setImagePath('') }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={async () => {
                  const path = await window.api.selectLogo()
                  if (path) {
                    setImagePath(path)
                    setImageUrl(toFileUrl(path))
                  }
                }}
              >
                <Image className="mr-2 h-4 w-4" />
                {imageUrl ? 'Changer l\'image' : 'Sélectionner une image'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <CardFooter className="flex justify-end gap-3 px-0">
        <Button type="button" variant="outline" onClick={onClose} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Annuler
        </Button>
        <Button type="submit" disabled={saving} className="gap-2 min-w-[140px]">
          <Save className="h-4 w-4" />
          {saving ? 'Enregistrement...' : bookId ? 'Mettre à jour' : 'Créer le livre'}
        </Button>
      </CardFooter>
    </form>
  )
}
