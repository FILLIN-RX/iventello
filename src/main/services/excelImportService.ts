import fs from 'fs'
import path from 'path'
import os from 'os'
import { randomUUID } from 'crypto'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import * as xlsx from 'xlsx'
import { PrismaClient } from '@prisma/client'
import type {
  ExcelColumnMapping,
  ExcelPreviewData,
  ExcelImportParams,
  ExcelImportResult,
  ExcelImportProgress
} from '../../shared/types'

const execFileAsync = promisify(execFile)

// Chargement résilient des classeurs Excel (.xlsx et .xls même chiffrés BIFF8 standard)
async function readWorkbookSafe(filePath: string): Promise<xlsx.WorkBook> {
  try {
    return xlsx.readFile(filePath)
  } catch (err: any) {
    const msg = (err?.message || '').toLowerCase()
    if (msg.includes('password-protected') || msg.includes('encryption scheme') || msg.includes('password')) {
      // Tentative de déchiffrement transparent via script Python msoffcrypto
      // Utilise execFile async pour ne PAS bloquer le Main Process (contrairement à execSync)
      const tempScript = path.join(os.tmpdir(), `iventello_dec_script_${Date.now()}.py`)
      const tempOut = path.join(os.tmpdir(), `iventello_dec_${Date.now()}.xls`)
      const scriptCode = `import sys
import msoffcrypto

in_file = sys.argv[1]
out_file = sys.argv[2]

try:
    with open(in_file, 'rb') as f:
        file = msoffcrypto.OfficeFile(f)
        for pw in ['VelvetSweatshop', '', '1234', '123456', 'admin']:
            try:
                file.load_key(password=pw)
                with open(out_file, 'wb') as out:
                    file.decrypt(out)
                sys.exit(0)
            except Exception:
                continue
    sys.exit(2)
except Exception:
    sys.exit(1)
`
      try {
        fs.writeFileSync(tempScript, scriptCode, 'utf8')
        // execFileAsync : non-bloquant — le Main Process reste réactif pendant le déchiffrement
        await execFileAsync('python', [tempScript, filePath, tempOut], { timeout: 20_000 })
        if (fs.existsSync(tempOut) && fs.statSync(tempOut).size > 0) {
          const wb = xlsx.readFile(tempOut)
          try { fs.unlinkSync(tempOut) } catch {}
          return wb
        }
      } catch (pyErr) {
        console.warn('Déchiffrement msoffcrypto échoué :', pyErr)
      } finally {
        try { if (fs.existsSync(tempScript)) fs.unlinkSync(tempScript) } catch {}
        try { if (fs.existsSync(tempOut)) fs.unlinkSync(tempOut) } catch {}
      }
    }
    throw new Error(`Impossible de lire le fichier Excel : ${err.message}`)
  }
}


// Nettoyage et normalisation du texte pour la détection
function cleanHeader(val: unknown): string {
  if (val === null || val === undefined) return ''
  return String(val)
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['’]/g, '')
}

/**
 * Mappeur intelligent pour associer une chaîne de niveau/classe (ex: "CP", "5e", "F1", "C3", "Tle C")
 * au code standard de ClassLevel (ex: "FRA_CP", "FRA_5E", "ANG_FM1", "ANG_CL3", "FRA_TLE").
 */
export function mapLevelToClassLevelCode(levelRaw?: string, typeRaw?: string, catRaw?: string): string | null {
  if (!levelRaw) return null
  const lvl = levelRaw.trim()
  if (!lvl || lvl === 'N/A' || lvl === 'NA' || lvl === '0' || lvl === '-') return null
  const lower = lvl.toLowerCase()

  // Francophone Maternelle
  if (['ps', 'petite section', 'p s', 'p/m', 'pm', 'p s '].includes(lower)) return 'FRA_PS'
  if (['ms', 'moyenne section', 'm s', 'm.s'].includes(lower)) return 'FRA_MS'
  if (['gs', 'grande section', 'g s', 'g.s', 'grande serction', 'gm', 'g m', 'g s '].includes(lower)) return 'FRA_GS'

  // Francophone Primaire
  if (['sil', 'sil/cp', 'sil,cp', 'sil-cp'].includes(lower)) return 'FRA_SIL'
  if (['cp', 'cp/ce1', 'cp/ce'].includes(lower)) return 'FRA_CP'
  if (['ce1', 'cei', 'ce1/ce2', 'ce1-ce2', 'ce1/ ce2'].includes(lower)) return 'FRA_CE1'
  if (['ce2', 'ce3', 'ce'].includes(lower)) return 'FRA_CE2'
  if (['cm1', 'cm1/cm2', 'cm1-cm2', 'cm'].includes(lower)) return 'FRA_CM1'
  if (['cm2', ' cm2'].includes(lower)) return 'FRA_CM2'

  // Francophone Secondaire 1
  if (['6e', '6eme', '6 eme', '6e', '6e/5e', '6e/1e a', '6e/1ann', '6e/1e annee', '6e&5e'].includes(lower)) return 'FRA_6E'
  if (['5e', '5eme', '5 eme', '5e/2e a', '5e/2eann', '5e & 2e a'].includes(lower)) return 'FRA_5E'
  if (['4e', '4eme', '4e/3e', '4e/3e a', '4e/3eann', '4e & 3e a', 'livello 1/4e', '4e,3e'].includes(lower)) return 'FRA_4E'
  if (['3e', '3eme', '3e/4e a', '3e/4ea', '3e esg', '3e esg / 4eme annee est', 'livello 2/3e', '3e/4eann', '3e & 4e a', '3eme/4eme'].includes(lower)) return 'FRA_3E'

  // Francophone Secondaire 2
  if (['2nde', '2nd', '2nde a', '2nde c', '2nde s', '2nde litteraires', '2nde litteraire', '2 nde litteraires', '2nde esg', '2nde c/e', '2nde c-e-sti', '2nde a-ses', '2nd a b', '2nd stt', '2nde a,c', '2nde a-c', '2nde a,c,', '2nd & 1ere stt', '2nd,1ere,tle'].includes(lower)) return 'FRA_2NDE'
  if (['1ere', '1e', '1e a', '1ere c', '1ere d', '1ere ti', '1 ere', '1eres litteraires', '1eres scientifiques', '1e d', '1e c', '1ere c,d', '1e a-ses', '1ere c , ti et e', '1ere c d i', '1ere c d,e et ti', '1ere c-d-e', '1ere c,d,e', '1ere c,d,e,ti', '1ere c,d,e,ti,f,bt,ses', '1ere d,ti', '1ere d ti', '1ere f2,f3,f5', '1ere sm', '1ere acc, cg, fig, ses', '1e se', '1e c&e', '1e d et ti', '1 c-d-e'].includes(lower)) return 'FRA_1ERE'
  if (['tle', 'tle a', 'tle c', 'tle d', 'tle ti', 'tles', 'tles litteraires', 'tle es', 'tle c,d', 'tle s', 'tle a-ses', 'tle c-d-e-ti', 'tle c,d,e', 'tle c,d, e', 'tle c,d, & e', 'tle c,d,e,ti', 'tle c,e', 'tle c& e', 'tle d, ti', 'tle d,ti', 'tle d & ti', 'tle c/d', 'tle a-b', 'tle stg', 'tle se', 'tle es-l-s', 'tle c d eet ti'].includes(lower)) return 'FRA_TLE'

  // Anglophone Nursery
  if (['n1', 'nursery 1', 'nursey 1', 'pre-nursery', 'pre nursery', 'pre-nursey', 'nursery', 'nursery1', 'nursery 1 and 2'].includes(lower)) return 'ANG_NUR1'
  if (['n2', 'nursery 2', 'nursey 2'].includes(lower)) return 'ANG_NUR2'

  // Anglophone Primary (C1-C6 ou Class 1-6)
  if (['c1', 'class 1', 'cl1', 'bk 1', 'bk1', 'b1', 'level 1', 'l1', 'c1&c2', 'c1/c2'].includes(lower)) return 'ANG_CL1'
  if (['c2', 'class 2', 'cl2', 'bk 2', 'b2', 'level 2', 'l2'].includes(lower)) return 'ANG_CL2'
  if (['c3', 'class 3', 'c3', 'cl3', 'bk 3', 'b3', 'level 3', 'l3', 'c3,c4', 'c3&c4', 'c3 and c4', 'c3,4'].includes(lower)) return 'ANG_CL3'
  if (['c4', 'class 4', 'cl4', 'bk 4', 'c4 nouveau'].includes(lower)) return 'ANG_CL4'
  if (['c5', 'class 5', 'cl5', 'bk 5', 'c5/6', 'c5/c6', 'c5&c6', 'c5 & c6', 'c5,c6', 'c5 and 6'].includes(lower)) return 'ANG_CL5'
  if (['c6', 'class 6', 'cl6', 'bk 6', 'c 6', 'c6-c5'].includes(lower)) return 'ANG_CL6'

  // Anglophone Secondary (F1-F5, Lower/Upper Sixth)
  if (['f1', 'form 1', 'f 1', 'f1.'].includes(lower)) return 'ANG_FM1'
  if (['f2', 'form 2', 'f 2', 'f2/f3'].includes(lower)) return 'ANG_FM2'
  if (['f3', 'form 3', 'f 3', 'f 3,4,5', 'f3,4 and 5', 'f3,4,5', 'f3-f4-f5', 'f3/f5'].includes(lower)) return 'ANG_FM3'
  if (['f4', 'form 4', 'f 4', 'f4 and 5', 'f4&5', 'f 4& 5', 'f4/f5', 'f4,5'].includes(lower)) return 'ANG_FM4'
  if (['f5', 'form 5', 'f 5', 'o/l', 'ordinary level', 'ol', 'o/level', 'o l', 'o/ l', 'senior level'].includes(lower)) return 'ANG_FM5'
  if (['a/l', 'al', 'a/level', 'lower sixth', 'upper sixth', 'lower and upper 6', 'lower/upper six', 'lower/upper 6', 'advanced level', 'advenced level', 'l6', 'high school'].includes(lower)) return 'ANG_L6'

  return null
}

// Algorithme d'auto-détection intelligente des colonnes
export function suggestMapping(headers: string[]): Partial<ExcelColumnMapping> {
  const mapping: Partial<ExcelColumnMapping> = {}
  const used = new Set<string>()

  function matchCol(patterns: (string | RegExp)[]): string | undefined {
    for (const h of headers) {
      if (!h || used.has(h)) continue
      const cleaned = cleanHeader(h)
      for (const p of patterns) {
        if (typeof p === 'string') {
          if (cleaned === p || cleaned.includes(p)) {
            used.add(h)
            return h
          }
        } else if (p.test(cleaned)) {
          used.add(h)
          return h
        }
      }
    }
    return undefined
  }

  // 1. Désignation / Nom (prioritaire)
  mapping.name = matchCol([
    'description', 'designation', 'titre', 'nom', 'article', 'libelle', 'produit', 'name'
  ])

  // 2. Code-barres / ISBN
  mapping.barcode = matchCol([
    'isbn', 'isbn number', 'code-barre', 'code barre', 'codebarre', 'code_barre', 'barcode', 'ean', 'ref', 'reference', 'code'
  ])

  // 3. Prix d'achat / Coût unitaire (avant Prix générique pour éviter tout conflit)
  mapping.basePrice = matchCol([
    'prix dachat', 'prix achat', 'cout', 'cost', 'pu achat', 'pa', 'achat'
  ])

  // 4. Prix de vente
  mapping.sellingPrice = matchCol([
    'prix de vente', 'prix vente', 'pu vente', 'selling', 'vente', 'price', 'pv', 'prix'
  ])

  // 5. Quantité / Stock
  mapping.quantity = matchCol([
    'qty', 'quantite', 'quantité', 'qte', 'stock', 'qte disponible', 'nombre', 'quantity'
  ])

  // 6. Catégorie
  mapping.category = matchCol([
    'categories', 'category', 'categorie', 'catégorie', 'famille', 'rayon', 'classe'
  ])

  // 7. Seuil d'alerte
  mapping.alertLimit = matchCol([
    'alerte', 'seuil', 'alert', 'limite', 'min stock'
  ])

  // 8. Champs personnalisés & Détection Librairie
  const colEditor = matchCol(['editor', 'editeur', 'éditeur', 'fournisseur', 'marque', 'brand'])
  if (colEditor) {
    mapping.field1 = colEditor
    mapping.field1_label = 'Éditeur / Marque'
  }

  const colAuthor = matchCol(['author', 'auteur', 'modele', 'modèle', 'model'])
  if (colAuthor) {
    mapping.field2 = colAuthor
    mapping.field2_label = 'Auteur / Modèle'
  }

  const colType = matchCol(['type', 'genre', 'format', 'spec', 'couleur', 'color'])
  if (colType) {
    mapping.field3 = colType
    mapping.field3_label = 'Type / Système'
  }

  const colLevel = matchCol(['level', 'niveau', 'classe', 'taille', 'dimension', 'size'])
  if (colLevel) {
    mapping.field4 = colLevel
    mapping.field4_label = 'Niveau Scolaire'
  }

  const colNew = matchCol(['new', 'etat', 'état', 'condition', 'poids', 'weight'])
  if (colNew) {
    mapping.field5 = colNew
    mapping.field5_label = 'Condition / État'
  }

  return mapping
}

export function createExcelImportService(prisma: PrismaClient) {
  return {
    /**
     * Prévisualise le fichier Excel : liste les feuilles, détecte les en-têtes et les 5 premières lignes
     * Optimisé pour ne lire que les premières lignes sans surcharger la mémoire
     */
    async previewExcel(filePath: string, sheetName?: string): Promise<ExcelPreviewData> {
      const wb = await readWorkbookSafe(filePath)
      const sheetNames = wb.SheetNames
      if (!sheetNames || sheetNames.length === 0) {
        throw new Error('Le classeur Excel ne contient aucune feuille.')
      }

      const activeSheet = sheetName && sheetNames.includes(sheetName) ? sheetName : sheetNames[0]
      const ws = wb.Sheets[activeSheet]
      if (!ws) {
        throw new Error(`Feuille introuvable : ${activeSheet}`)
      }

      // Décodage ultra-rapide des dimensions sans charger tout le fichier en JSON
      let totalDataRows = 0
      let sampleRange = ws['!ref']
      if (sampleRange) {
        try {
          const decoded = xlsx.utils.decode_range(sampleRange)
          totalDataRows = Math.max(0, decoded.e.r)
          // Ne convertir que les 30 premières lignes pour un aperçu instantané
          decoded.e.r = Math.min(decoded.e.r, 29)
          sampleRange = xlsx.utils.encode_range(decoded)
        } catch {}
      }

      // Convertir seulement les premières lignes pour l'aperçu
      const rows: any[][] = xlsx.utils.sheet_to_json(ws, { header: 1, defval: '', range: sampleRange })
      if (!rows || rows.length === 0) {
        return {
          filePath,
          fileName: path.basename(filePath),
          sheetNames,
          activeSheet,
          totalRows: 0,
          headers: [],
          sampleRows: [],
          suggestedMapping: {}
        }
      }

      // Trouver la première ligne contenant des en-têtes significatifs
      let headerRowIndex = 0
      for (let i = 0; i < Math.min(10, rows.length); i++) {
        const nonEmptyCount = rows[i].filter((c: any) => String(c).trim() !== '').length
        if (nonEmptyCount >= 2) {
          headerRowIndex = i
          break
        }
      }

      const rawHeaders = rows[headerRowIndex] || []
      const headers: string[] = []
      const seen = new Map<string, number>()

      for (let c = 0; c < rawHeaders.length; c++) {
        let h = String(rawHeaders[c] ?? '').trim()
        if (!h) h = `Colonne_${c + 1}`
        if (seen.has(h)) {
          const count = seen.get(h)! + 1
          seen.set(h, count)
          h = `${h}_${count}`
        } else {
          seen.set(h, 1)
        }
        headers.push(h)
      }

      // Échantillon des 5 premières lignes de données non vides
      const sampleRows: Record<string, any>[] = []
      for (let r = headerRowIndex + 1; r < rows.length; r++) {
        const row = rows[r]
        if (!row || row.every((c: any) => String(c).trim() === '')) continue

        if (sampleRows.length < 5) {
          const rowObj: Record<string, any> = {}
          for (let c = 0; c < headers.length; c++) {
            rowObj[headers[c]] = row[c] !== undefined ? row[c] : ''
          }
          sampleRows.push(rowObj)
        }
      }

      const suggestedMapping = suggestMapping(headers)

      return {
        filePath,
        fileName: path.basename(filePath),
        sheetNames,
        activeSheet,
        totalRows: totalDataRows,
        headers,
        sampleRows,
        suggestedMapping
      }
    },

    /**
     * Exécute l'importation complète avec :
     * - Pré-indexation en mémoire (évite des milliers de SELECT dans la boucle)
     * - Traitement par petits lots (batch de 50)
     * - Yielding régulier vers l'Event Loop Node.js (ne ralentit pas l'application)
     * - Notification continue de la progression en direct (pourcentage, compteurs)
     */
    async executeImport(
      params: ExcelImportParams,
      onProgress?: (progress: ExcelImportProgress) => void
    ): Promise<ExcelImportResult> {
      const {
        filePath,
        sheetName,
        mapping,
        warehouseId,
        updateExisting = true,
        createCategories = true,
        defaultAlertLimit = 5
      } = params

      onProgress?.({
        phase: 'preparing',
        current: 0,
        total: 0,
        percent: 0,
        importedCount: 0,
        updatedCount: 0,
        skippedCount: 0
      })

      const wb = await readWorkbookSafe(filePath)
      const ws = wb.Sheets[sheetName]
      if (!ws) {
        throw new Error(`Feuille ${sheetName} introuvable`)
      }

      // Vérification de la boutique cible
      const warehouse = await prisma.warehouse.findUnique({ where: { id: warehouseId } })
      if (!warehouse) {
        throw new Error(`Boutique introuvable (ID: ${warehouseId})`)
      }

      // Libérer l'Event Loop
      await new Promise((resolve) => setImmediate(resolve))

      // Convertir en tableau
      const rows: any[][] = xlsx.utils.sheet_to_json(ws, { header: 1, defval: '' })
      if (!rows || rows.length < 2) {
        return {
          success: true,
          totalRead: 0,
          importedCount: 0,
          updatedCount: 0,
          skippedCount: 0,
          categoriesCreated: 0,
          booksImportedCount: 0,
          errors: []
        }
      }

      await new Promise((resolve) => setImmediate(resolve))

      // Identifier les index des colonnes à partir du premier row d'en-tête
      let headerRowIndex = 0
      for (let i = 0; i < Math.min(10, rows.length); i++) {
        const nonEmpty = rows[i].filter((c: any) => String(c).trim() !== '').length
        if (nonEmpty >= 2) {
          headerRowIndex = i
          break
        }
      }

      const rawHeaders = rows[headerRowIndex] || []
      const headerIndexMap = new Map<string, number>()
      const seen = new Map<string, number>()

      for (let c = 0; c < rawHeaders.length; c++) {
        let h = String(rawHeaders[c] ?? '').trim()
        if (!h) h = `Colonne_${c + 1}`
        if (seen.has(h)) {
          const count = seen.get(h)! + 1
          seen.set(h, count)
          h = `${h}_${count}`
        } else {
          seen.set(h, 1)
        }
        headerIndexMap.set(h, c)
      }

      const getVal = (row: any[], colName?: string): string => {
        if (!colName) return ''
        const idx = headerIndexMap.get(colName)
        if (idx === undefined || idx < 0 || idx >= row.length) return ''
        const raw = row[idx]
        if (raw === null || raw === undefined) return ''
        return String(raw).trim()
      }

      const getNum = (row: any[], colName?: string, fallback = 0): number => {
        const val = getVal(row, colName)
        if (!val) return fallback
        const parsed = parseFloat(val.replace(',', '.').replace(/\s/g, ''))
        return isNaN(parsed) ? fallback : parsed
      }

      // Pré-chargement massif en mémoire en parallèle
      const [
        existingCategories,
        existingClassLevels,
        existingProducts,
        existingStocks,
        existingBooks,
        existingBookStocks
      ] = await Promise.all([
        prisma.category.findMany({
          where: { OR: [{ warehouseId }, { warehouseId: null }] },
          select: { id: true, name: true }
        }),
        prisma.classLevel.findMany({ select: { id: true, code: true } }),
        prisma.product.findMany({
          where: { warehouseId },
          select: { id: true, barcode: true }
        }),
        prisma.stock.findMany({
          where: { warehouseId },
          select: { productId: true }
        }),
        prisma.book.findMany({
          select: { id: true, title: true, classLevelId: true }
        }),
        prisma.bookStock.findMany({
          where: { warehouseId },
          select: { id: true, bookId: true }
        })
      ])

      const categoryMap = new Map<string, string>()
      for (const cat of existingCategories) {
        categoryMap.set(cat.name.trim().toLowerCase(), cat.id)
      }

      let defaultCatId = categoryMap.get('général') || categoryMap.get('general') || categoryMap.get('autre')
      if (!defaultCatId) {
        const defCat = await prisma.category.create({
          data: { name: 'Général', description: 'Catégorie par défaut', warehouseId }
        })
        defaultCatId = defCat.id
        categoryMap.set('général', defCat.id)
        categoryMap.set('general', defCat.id)
      }

      const classLevelCodeToId = new Map<string, string>()
      for (const cl of existingClassLevels) {
        classLevelCodeToId.set(cl.code, cl.id)
      }

      const barcodeToIdMap = new Map<string, string>()
      for (const p of existingProducts) {
        if (p.barcode) barcodeToIdMap.set(p.barcode.trim().toUpperCase(), p.id)
      }

      const stockProductIds = new Set<string>(existingStocks.map((s) => s.productId))

      const bookMap = new Map<string, string>()
      for (const b of existingBooks) {
        bookMap.set(`${b.title.trim().toLowerCase()}_${b.classLevelId || ''}`, b.id)
      }

      const bookStockMap = new Map<string, string>()
      for (const bs of existingBookStocks) {
        bookStockMap.set(bs.bookId, bs.id)
      }

      let totalRead = 0
      let importedCount = 0
      let updatedCount = 0
      let skippedCount = 0
      let categoriesCreated = 0
      let booksImportedCount = 0
      const errors: string[] = []

      // Pré-création des catégories rencontrées dans le fichier
      if (createCategories && mapping.category) {
        const distinctCatNames = new Set<string>()
        for (let r = headerRowIndex + 1; r < rows.length; r++) {
          const row = rows[r]
          if (!row || row.every((c: any) => String(c).trim() === '')) continue
          const catName = getVal(row, mapping.category)
          if (catName && !categoryMap.has(catName.toLowerCase())) {
            distinctCatNames.add(catName)
          }
        }

        for (const catName of distinctCatNames) {
          try {
            const newCat = await prisma.category.create({
              data: { name: catName, description: 'Importé depuis Excel', warehouseId }
            })
            categoryMap.set(catName.toLowerCase(), newCat.id)
            categoriesCreated++
          } catch {}
        }
      }

      // Préparation et normalisation des articles
      interface ProcessedItem {
        barcode: string
        name: string
        basePrice: number
        sellingPrice: number
        categoryId: string
        quantity: number
        alertLimit: number
        customFields: Record<string, string>
        customLabels: Record<string, string>
        isBook: boolean
        classLevelId?: string
        isOfficialProgram: boolean
        editor?: string
        author?: string
        type?: string
      }

      const itemsToProcess: ProcessedItem[] = []
      let barcodeAutoIncrement = 1

      for (let r = headerRowIndex + 1; r < rows.length; r++) {
        if (r % 1000 === 0) {
          await new Promise((resolve) => setImmediate(resolve))
        }

        const row = rows[r]
        if (!row || row.every((c: any) => String(c).trim() === '')) continue
        totalRead++

        const name = getVal(row, mapping.name)
        if (!name || name === '0.0' || name === '-') {
          skippedCount++
          continue
        }

        let rawBarcode = getVal(row, mapping.barcode)
        if (rawBarcode.endsWith('.0')) {
          rawBarcode = rawBarcode.slice(0, -2)
        }
        if (!rawBarcode) {
          rawBarcode = `AUTO-${Date.now().toString().slice(-6)}-${barcodeAutoIncrement++}`
        }

        const basePrice = getNum(row, mapping.basePrice, 0)
        let sellingPrice = getNum(row, mapping.sellingPrice, 0)
        if (sellingPrice === 0 && basePrice > 0) {
          sellingPrice = basePrice
        }

        const quantity = Math.round(getNum(row, mapping.quantity, 0))
        const alertLimit = Math.round(getNum(row, mapping.alertLimit, defaultAlertLimit))

        const catName = getVal(row, mapping.category)
        const categoryId = (catName && categoryMap.get(catName.toLowerCase())) || defaultCatId

        const customFields: Record<string, string> = {}
        const customLabels: Record<string, string> = {}

        for (let i = 1; i <= 10; i++) {
          const colKey = `field${i}` as keyof ExcelColumnMapping
          const labelKey = `field${i}_label` as keyof ExcelColumnMapping
          const colName = mapping[colKey]
          if (colName) {
            let val = getVal(row, colName)
            if (val.endsWith('.0')) val = val.slice(0, -2)
            if (val && val !== '0' && val !== '-') {
              customFields[`field${i}_value`] = val
              const customLabel = mapping[labelKey] || colName
              customLabels[`field${i}_label`] = customLabel
            }
          }
        }

        const levelVal = customFields['field4_value'] || getVal(row, 'Level') || getVal(row, 'Niveau')
        const editorVal = customFields['field1_value'] || getVal(row, 'Editor') || getVal(row, 'Éditeur')
        const authorVal = customFields['field2_value'] || getVal(row, 'Author') || getVal(row, 'Auteur')
        const typeVal = customFields['field3_value'] || getVal(row, 'Type')

        const classCode = mapLevelToClassLevelCode(levelVal, typeVal, catName)
        const classLevelId = classCode ? classLevelCodeToId.get(classCode) : undefined

        const catLower = (catName || '').toLowerCase()
        const isBookCategory = ['textbooks', 'novels', 'cartoons', 'cultural textbooks', 'study aids', 'dictionaries', 'livres', 'manuels'].some(k => catLower.includes(k))
        const isBook = Boolean(classLevelId || isBookCategory)
        const isOfficialProgram = false

        itemsToProcess.push({
          barcode: rawBarcode,
          name,
          basePrice,
          sellingPrice,
          categoryId,
          quantity,
          alertLimit,
          customFields,
          customLabels,
          isBook,
          classLevelId,
          isOfficialProgram,
          editor: editorVal || undefined,
          author: authorVal || undefined,
          type: typeVal || undefined
        })
      }

      // Exécution par petits lots de 50 avec pause pour laisser respirer l'Event Loop
      const BATCH_SIZE = 50
      const totalItems = itemsToProcess.length

      for (let i = 0; i < totalItems; i += BATCH_SIZE) {
        const batch = itemsToProcess.slice(i, i + BATCH_SIZE)

        await prisma.$transaction(async (tx) => {
          for (const item of batch) {
            try {
              const existingId = barcodeToIdMap.get(item.barcode.toUpperCase())

              if (existingId && updateExisting) {
                await tx.product.update({
                  where: { id: existingId },
                  data: {
                    name: item.name,
                    basePrice: item.basePrice,
                    sellingPrice: item.sellingPrice,
                    categoryId: item.categoryId,
                    warehouseId,
                    ...item.customFields,
                    ...item.customLabels
                  }
                })

                if (stockProductIds.has(existingId)) {
                  await tx.stock.update({
                    where: {
                      productId_warehouseId: {
                        productId: existingId,
                        warehouseId
                      }
                    },
                    data: {
                      quantity: item.quantity,
                      alertLimit: item.alertLimit
                    }
                  })
                } else {
                  await tx.stock.create({
                    data: {
                      productId: existingId,
                      warehouseId,
                      quantity: item.quantity,
                      alertLimit: item.alertLimit
                    }
                  })
                  stockProductIds.add(existingId)
                }

                updatedCount++
              } else if (!existingId) {
                const newProductId = randomUUID()
                await tx.product.create({
                  data: {
                    id: newProductId,
                    barcode: item.barcode,
                    name: item.name,
                    basePrice: item.basePrice,
                    sellingPrice: item.sellingPrice,
                    categoryId: item.categoryId,
                    warehouseId,
                    ...item.customFields,
                    ...item.customLabels
                  }
                })

                barcodeToIdMap.set(item.barcode.toUpperCase(), newProductId)

                await tx.stock.create({
                  data: {
                    productId: newProductId,
                    warehouseId,
                    quantity: item.quantity,
                    alertLimit: item.alertLimit
                  }
                })
                stockProductIds.add(newProductId)

                importedCount++
              } else {
                skippedCount++
              }

              // Synchronisation Librairie ultra-rapide sans SELECT
              if (item.isBook && item.classLevelId) {
                try {
                  const bookKey = `${item.name.trim().toLowerCase()}_${item.classLevelId}`
                  const existingBookId = bookMap.get(bookKey)
                  let bookId = existingBookId
                  const isbnVal = item.barcode.startsWith('AUTO-') ? null : item.barcode

                  if (existingBookId) {
                    await tx.book.update({
                      where: { id: existingBookId },
                      data: {
                        price: item.sellingPrice,
                        purchasePrice: item.basePrice,
                        author: item.author || undefined,
                        editor: item.editor || undefined,
                        isbn: isbnVal
                      }
                    })
                  } else {
                    bookId = randomUUID()
                    await tx.book.create({
                      data: {
                        id: bookId,
                        title: item.name,
                        price: item.sellingPrice,
                        purchasePrice: item.basePrice,
                        author: item.author || null,
                        editor: item.editor || null,
                        isbn: isbnVal,
                        isOfficialProgram: false,
                        classLevelId: item.classLevelId
                      }
                    })
                    bookMap.set(bookKey, bookId)
                  }

                  if (bookId) {
                    const existingBookStockId = bookStockMap.get(bookId)
                    if (existingBookStockId) {
                      await tx.bookStock.update({
                        where: { id: existingBookStockId },
                        data: {
                          quantity: item.quantity,
                          alertLimit: item.alertLimit,
                          classLevelId: item.classLevelId
                        }
                      })
                    } else {
                      const newBsId = randomUUID()
                      await tx.bookStock.create({
                        data: {
                          id: newBsId,
                          bookId,
                          warehouseId,
                          classLevelId: item.classLevelId,
                          quantity: item.quantity,
                          alertLimit: item.alertLimit
                        }
                      })
                      bookStockMap.set(bookId, newBsId)
                    }
                    booksImportedCount++
                  }
                } catch {}
              }
            } catch (itemErr: any) {
              errors.push(`Ligne "${item.name}" (${item.barcode}): ${itemErr.message}`)
              skippedCount++
            }
          }
        })

        // YIELD pour laisser Electron traiter les événements et animations UI
        await new Promise((resolve) => setTimeout(resolve, 5))

        const processedCount = Math.min(i + BATCH_SIZE, totalItems)
        onProgress?.({
          phase: 'importing',
          current: processedCount,
          total: totalItems,
          percent: totalItems > 0 ? Math.round((processedCount / totalItems) * 100) : 100,
          importedCount,
          updatedCount,
          skippedCount,
          currentItemName: batch[batch.length - 1]?.name
        })
      }

      onProgress?.({
        phase: 'finishing',
        current: totalItems,
        total: totalItems,
        percent: 100,
        importedCount,
        updatedCount,
        skippedCount
      })

      return {
        success: true,
        totalRead,
        importedCount,
        updatedCount,
        skippedCount,
        categoriesCreated,
        booksImportedCount,
        errors: errors.slice(0, 50)
      }
    }
  }
}
