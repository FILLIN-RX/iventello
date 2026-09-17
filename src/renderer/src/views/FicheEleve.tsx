import { useState, useEffect } from 'react'
import { CheckCircle2, XCircle, ArrowLeft, BookOpen, ShoppingCart, DollarSign } from 'lucide-react'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { formatCurrency } from '@/lib/utils'
import type { BookWithRelations } from '../../../shared/types'

interface StudentSummary {
  studentName: string
  classLevelId: string
  requiredBooks: BookWithRelations[]
  purchasedBookIds: string[]
  livresManquants: BookWithRelations[]
  livresAchetes: BookWithRelations[]
  coutTotal: number
  totalDepense: number
  reliquat: number
  sales: any[]
}

interface Props {
  data: StudentSummary
  onClose: () => void
}

export default function FicheEleve({ data, onClose }: Props) {
  const [summary] = useState(data)
  const [expandedSale, setExpandedSale] = useState<Set<number>>(new Set())

  function toggleSale(idx: number) {
    setExpandedSale(prev => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onClose}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" /> {summary.studentName}
          </h1>
          <p className="text-sm text-muted-foreground">Fiche récapitulative des livres</p>
        </div>
      </div>

      {/* Totaux */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Coût total des livres</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(summary.coutTotal)}</p>
            <p className="text-xs text-muted-foreground">{summary.requiredBooks.length} livre{summary.requiredBooks.length !== 1 ? 's' : ''} obligatoire{summary.requiredBooks.length !== 1 ? 's' : ''}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total dépensé</CardTitle>
            <ShoppingCart className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(summary.totalDepense)}</p>
            <p className="text-xs text-muted-foreground">{summary.livresAchetes.length} livre{summary.livresAchetes.length !== 1 ? 's' : ''} acheté{summary.livresAchetes.length !== 1 ? 's' : ''}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Reliquat</CardTitle>
            <DollarSign className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${summary.reliquat > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
              {summary.reliquat > 0 ? formatCurrency(summary.reliquat) : 'Aucun'}
            </p>
            <p className="text-xs text-muted-foreground">
              {summary.reliquat > 0 ? 'Reste à acheter' : 'Tous les livres sont achetés'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Liste des livres */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Livres de la classe</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {summary.requiredBooks.map((book) => {
              const isPurchased = summary.purchasedBookIds.includes(book.id)
              return (
                <div key={book.id} className="flex items-center justify-between px-5 py-3">
                  <div className="flex items-center gap-3">
                    {isPurchased
                      ? <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0" />
                      : <XCircle className="h-5 w-5 text-rose-400 flex-shrink-0" />
                    }
                    <div>
                      <p className="text-sm font-medium">{book.title}</p>
                      {book.author && <p className="text-xs text-muted-foreground">{book.author}</p>}
                      {book.subject && (
                        <p className="text-xs" style={{ color: book.subject.color }}>
                          {book.subject.name}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right flex items-center gap-2">
                    <span className="text-sm">{formatCurrency(book.price)}</span>
                    <Badge variant={isPurchased ? 'default' : 'outline'} className="text-[10px]">
                      {isPurchased ? '✅ Acheté' : '❌ Manquant'}
                    </Badge>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Historique des ventes */}
      {summary.sales.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Historique des achats ({summary.sales.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {summary.sales.map((sale, idx) => (
                <div key={idx}>
                  <div
                    className="flex items-center justify-between px-5 py-3 cursor-pointer hover:bg-muted/30"
                    onClick={() => toggleSale(idx)}
                  >
                    <div>
                      <p className="text-sm font-medium">{new Date(sale.createdAt).toLocaleDateString('fr-FR')}</p>
                      <p className="text-xs text-muted-foreground">{sale.paymentMethod === 'ESPECES' ? 'Espèces' : sale.paymentMethod}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold">{formatCurrency(sale.totalAmount)}</span>
                      <span className="text-xs text-muted-foreground">{expandedSale.has(idx) ? '▲' : '▼'}</span>
                    </div>
                  </div>
                  {expandedSale.has(idx) && (
                    <div className="bg-muted/20 px-5 py-2 space-y-1">
                      {sale.items?.map((item: any, iidx: number) => (
                        <div key={iidx} className="flex items-center justify-between text-sm">
                          <span>{item.book?.title ?? 'Livre'}</span>
                          <span className="text-muted-foreground">x{item.quantity} — {formatCurrency(item.unitPrice * item.quantity)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
