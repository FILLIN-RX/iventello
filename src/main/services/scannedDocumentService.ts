import { PrismaClient } from '@prisma/client'
import { app, dialog } from 'electron'
import { join, extname } from 'node:path'
import { mkdirSync, existsSync, copyFileSync, unlinkSync, writeFileSync } from 'node:fs'

export interface ScannedDocInput {
  title: string
  date?: string // 'YYYY-MM-DD'
  filePath: string // local path of scanned file / captured image
  category?: string
  notes?: string
  warehouseId?: string
}

export function createScannedDocumentService(prisma: PrismaClient) {
  const getDocDir = () => {
    const dir = join(app.getPath('userData'), 'scanned-documents')
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true })
    }
    return dir
  }

  return {
    async getAll(dateStr?: string, warehouseId?: string, search?: string) {
      const warehouseFilter = (warehouseId && warehouseId !== 'ALL' && warehouseId !== '') ? { warehouseId } : {}
      const where: any = { ...warehouseFilter }

      if (dateStr && dateStr !== 'ALL' && dateStr !== '') {
        where.date = dateStr
      }

      if (search && search.trim()) {
        const q = search.trim()
        where.OR = [
          { title: { contains: q } },
          { notes: { contains: q } },
          { category: { contains: q } }
        ]
      }

      try {
        return await (prisma as any).scannedDocument.findMany({
          where,
          include: { warehouse: true },
          orderBy: [{ date: 'desc' }, { createdAt: 'desc' }]
        })
      } catch {
        // Fallback Raw SQL if Prisma client schema not re-indexed in memory
        let query = `SELECT * FROM "ScannedDocument" WHERE 1=1`
        const params: any[] = []
        if (warehouseId && warehouseId !== 'ALL' && warehouseId !== '') {
          query += ` AND "warehouseId" = ?`
          params.push(warehouseId)
        }
        if (dateStr && dateStr !== 'ALL' && dateStr !== '') {
          query += ` AND "date" = ?`
          params.push(dateStr)
        }
        query += ` ORDER BY "date" DESC, "createdAt" DESC`
        return await (prisma as any).$queryRawUnsafe(query, ...params)
      }
    },

    async create(data: ScannedDocInput) {
      if (!data.title || !data.title.trim()) {
        throw new Error('Le nom/titre du document scanné est obligatoire')
      }
      if (!data.filePath) {
        throw new Error('Aucun fichier ou capture d\'image scannée n\'a été fourni')
      }

      const docDir = getDocDir()
      const fileUuid = require('node:crypto').randomUUID()
      let destinationPath = ''
      let fileType = 'image/png'

      if (data.filePath.startsWith('data:')) {
        // Digital capture / Base64 Data URL
        const matches = data.filePath.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/)
        if (!matches || matches.length !== 3) {
          throw new Error('Format d\'image scannée invalide')
        }
        fileType = matches[1] || 'image/png'
        const ext = fileType.includes('pdf') ? '.pdf' : '.png'
        const buffer = Buffer.from(matches[2], 'base64')
        destinationPath = join(docDir, `doc-${fileUuid}${ext}`)
        writeFileSync(destinationPath, buffer)
      } else {
        // Disk file path (hardware scanner / file dialog)
        if (!existsSync(data.filePath)) {
          throw new Error('Le fichier scanné n\'a pas pu être trouvé à l\'emplacement spécifié sur le disque')
        }
        const ext = extname(data.filePath) || '.png'
        fileType = ext.toLowerCase().includes('pdf') ? 'application/pdf' : 'image/png'
        destinationPath = join(docDir, `doc-${fileUuid}${ext}`)
        copyFileSync(data.filePath, destinationPath)
      }

      const docDate = data.date || new Date().toISOString().slice(0, 10)

      try {
        return await (prisma as any).scannedDocument.create({
          data: {
            title: data.title.trim(),
            date: docDate,
            filePath: destinationPath,
            fileType,
            category: data.category || 'FACTURE',
            notes: data.notes || null,
            warehouseId: data.warehouseId || null
          }
        })
      } catch {
        const id = require('node:crypto').randomUUID()
        const now = new Date().toISOString()
        await (prisma as any).$executeRawUnsafe(
          `INSERT INTO "ScannedDocument" ("id", "title", "date", "filePath", "fileType", "category", "notes", "warehouseId", "createdAt", "updatedAt") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          id, data.title.trim(), docDate, destinationPath, fileType, data.category || 'FACTURE', data.notes || null, data.warehouseId || null, now, now
        )
        return {
          id,
          title: data.title.trim(),
          date: docDate,
          filePath: destinationPath,
          fileType,
          category: data.category || 'FACTURE',
          notes: data.notes || null,
          warehouseId: data.warehouseId || null
        }
      }
    },

    async delete(id: string) {
      let doc: any = null
      try {
        doc = await (prisma as any).scannedDocument.findUnique({ where: { id } })
      } catch {
        const rows = await (prisma as any).$queryRawUnsafe(`SELECT * FROM "ScannedDocument" WHERE "id" = ?`, id)
        doc = rows[0]
      }

      if (doc && doc.filePath && existsSync(doc.filePath)) {
        try {
          unlinkSync(doc.filePath)
        } catch { /* ignore */ }
      }

      try {
        await (prisma as any).scannedDocument.delete({ where: { id } })
      } catch {
        await (prisma as any).$executeRawUnsafe(`DELETE FROM "ScannedDocument" WHERE "id" = ?`, id)
      }
    },

    async selectDocumentFile() {
      const result = await dialog.showOpenDialog({
        title: 'Sélectionner le document ou le fichier numérisé',
        properties: ['openFile'],
        filters: [
          { name: 'Documents & Images Scannés', extensions: ['png', 'jpg', 'jpeg', 'pdf', 'bmp', 'tiff'] },
          { name: 'Images (*.png, *.jpg)', extensions: ['png', 'jpg', 'jpeg'] },
          { name: 'Fichiers PDF (*.pdf)', extensions: ['pdf'] }
        ]
      })
      if (result.canceled || result.filePaths.length === 0) return null
      return result.filePaths[0]
    }
  }
}
