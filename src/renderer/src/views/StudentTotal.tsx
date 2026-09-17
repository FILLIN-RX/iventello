import { useState, useEffect, useMemo } from 'react'
import { Users, DollarSign, BookOpen, ArrowLeft, Search, FileSpreadsheet } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Badge } from '../components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '../components/ui/select'
import { useEntrepotStore } from '../stores/entrepotStore'
import type { ClassLevel, BookSaleItem } from '../../../shared/types'

interface StudentTotalData {
  studentName: string
  className: string
  total: number
  items: BookSaleItem[]
}

type SortOption = 'name' | 'total-desc'

interface Props {
  classLevelId?: string
  onClose: () => void
}

function StudentTotal({ classLevelId: initialClassLevelId, onClose }: Props) {
  const warehouseId = useEntrepotStore((s) => s.selectedId)

  const [classLevelId, setClassLevelId] = useState(initialClassLevelId ?? '')
  const [classLevels, setClassLevels] = useState<ClassLevel[]>([])
  const [data, setData] = useState<StudentTotalData[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<SortOption>('total-desc')
  const [expanded, setExpanded] = useState<Set<number>>(new Set())
  const [classLevelsLoading, setClassLevelsLoading] = useState(!initialClassLevelId)

  useEffect(() => {
    if (initialClassLevelId) return
    async function load() {
      try {
        setClassLevelsLoading(true)
        const levels = await window.api.getClassLevels()
        setClassLevels(levels as ClassLevel[])
        if (levels.length > 0 && !classLevelId) setClassLevelId(levels[0].id)
      } catch { /* ignore */ } finally { setClassLevelsLoading(false) }
    }
    load()
  }, [initialClassLevelId])

  useEffect(() => {
    if (!warehouseId || !classLevelId) return
    async function load() {
      try {
        setLoading(true)
        const result = await window.api.getStudentTotals(warehouseId!, classLevelId!)
        setData(result as StudentTotalData[])
      } catch { /* ignore */ } finally { setLoading(false) }
    }
    load()
  }, [warehouseId, classLevelId])

  const selectedClassLevel = initialClassLevelId
    ? null
    : classLevels.find((c) => c.id === classLevelId)

  const filtered = useMemo(() => {
    let list = [...data]
    if (search) {
      const q = search.toLowerCase()
      list = list.filter((d) => d.studentName.toLowerCase().includes(q))
    }
    if (sort === 'name') {
      list.sort((a, b) => a.studentName.localeCompare(b.studentName))
    } else {
      list.sort((a, b) => b.total - a.total)
    }
    return list
  }, [data, search, sort])

  const grandTotal = useMemo(() => data.reduce((acc, d) => acc + d.total, 0), [data])

  function toggleExpand(idx: number) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }

  if (!warehouseId) {
    return (
      <div className="flex items-center justify-center p-12">
        <p className="text-muted-foreground">Veuillez sélectionner une boutique.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onClose}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h2 className="text-xl font-semibold">
            Total par élève
            {selectedClassLevel && (
              <span className="ml-2 text-muted-foreground">— {selectedClassLevel.name}</span>
            )}
          </h2>
        </div>
      </div>

      {!initialClassLevelId && (
        <div className="flex items-center gap-4">
          <div className="w-64">
            <Select value={classLevelId} onValueChange={setClassLevelId}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un niveau" />
              </SelectTrigger>
              <SelectContent>
                {classLevels.map((cl) => (
                  <SelectItem key={cl.id} value={cl.id}>{cl.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {classLevelsLoading && <p className="text-sm text-muted-foreground">Chargement...</p>}
        </div>
      )}

      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher par nom d'élève..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="w-48">
          <Select value={sort} onValueChange={(v) => setSort(v as SortOption)}>
            <SelectTrigger>
              <SelectValue placeholder="Trier par" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="total-desc">Total (décroissant)</SelectItem>
              <SelectItem value="name">Nom (A-Z)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" disabled>
          <FileSpreadsheet className="mr-2 h-4 w-4" />Exporter
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Nombre d'élèves</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{data.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total général</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(grandTotal)}</p>
          </CardContent>
        </Card>
      </div>

      {loading && <p className="text-muted-foreground">Chargement...</p>}

      {!loading && filtered.length === 0 && (
        <p className="text-muted-foreground">
          {search ? 'Aucun élève trouvé.' : 'Aucune donnée pour ce niveau.'}
        </p>
      )}

      {!loading && filtered.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Élève</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Classe</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Total</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Nb articles</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((row, idx) => (
                  <>
                    <tr
                      key={idx}
                      className="cursor-pointer border-b last:border-b-0 hover:bg-muted/50"
                      onClick={() => toggleExpand(idx)}
                    >
                      <td className="px-4 py-3 font-medium">{row.studentName}</td>
                      <td className="px-4 py-3 text-muted-foreground">{row.className}</td>
                      <td className="px-4 py-3 text-right font-semibold">{formatCurrency(row.total)}</td>
                      <td className="px-4 py-3 text-right text-muted-foreground">{row.items.length}</td>
                      <td className="px-4 py-3 text-center text-muted-foreground">
                        {expanded.has(idx) ? '▲' : '▼'}
                      </td>
                    </tr>
                    {expanded.has(idx) && (
                      <tr key={`detail-${idx}`}>
                        <td colSpan={5} className="bg-muted/30 px-4 py-3">
                          <div className="space-y-1">
                            {row.items.length === 0 && (
                              <p className="text-sm text-muted-foreground">Aucun article.</p>
                            )}
                            {row.items.map((item, iidx) => (
                              <div key={iidx} className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2">
                                  <BookOpen className="h-3 w-3 text-muted-foreground" />
                                  <span>{item.book?.title ?? `Article #${item.bookId}`}</span>
                                </div>
                                <div className="flex items-center gap-4">
                                  <span className="text-muted-foreground">x{item.quantity}</span>
                                  <span>{formatCurrency(item.unitPrice * item.quantity)}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default StudentTotal
