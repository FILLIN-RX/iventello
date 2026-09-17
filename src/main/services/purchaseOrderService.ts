import { app } from 'electron'
import { join } from 'node:path'
import { writeFile, mkdir } from 'node:fs/promises'
import { PrismaClient } from '@prisma/client'
import ExcelJS from 'exceljs'
import { appLog } from '../logger'

export function createPurchaseOrderService(prisma: PrismaClient) {
  const getDesktopOrdersDir = async () => {
    const desktopPath = app.getPath('desktop')
    const dir = join(desktopPath, 'bons-de-commande')
    await mkdir(dir, { recursive: true })
    return dir
  }

  return {
    async getAll() {
      try {
        const orders = await prisma.purchaseOrder.findMany({
          include: {
            items: true,
            warehouse: true
          },
          orderBy: { createdAt: 'desc' }
        })
        return orders || []
      } catch (err) {
        console.error('Erreur purchaseOrderService.getAll:', err)
        return []
      }
    },

    async getById(id: string) {
      try {
        return await prisma.purchaseOrder.findUnique({
          where: { id },
          include: {
            items: { include: { product: true } },
            warehouse: true
          }
        })
      } catch (err) {
        console.error(`Erreur purchaseOrderService.getById(${id}):`, err)
        return null
      }
    },

    async create(data: {
      supplierName: string
      warehouseId?: string
      status?: string
      pdfPath?: string
      totalAmount?: number
      items: {
        productId: string
        productName: string
        productBarcode: string
        quantity: number
        unitPrice?: number
        currentStock?: number
        alertLimit?: number
        warehouseName: string
        warehouseId: string
      }[]
    }) {
      // RÈGLE STRICTE : AUCUN BON DE COMMANDE SI AUCUN PRODUIT
      if (!data.items || data.items.length === 0) {
        return null
      }

      try {
        const order = await prisma.purchaseOrder.create({
          data: {
            supplierName: data.supplierName,
            warehouseId: data.warehouseId || null,
            status: data.status || 'EN_ATTENTE',
            pdfPath: null, // Toujours généré de manière tabulaire ci-dessous
            totalAmount: data.totalAmount || 0,
            items: {
              create: data.items.map((item) => ({
                productId: item.productId,
                productName: item.productName,
                productBarcode: item.productBarcode || '',
                quantity: item.quantity,
                unitPrice: item.unitPrice || 0,
                currentStock: item.currentStock || 0,
                alertLimit: item.alertLimit || 0,
                warehouseName: item.warehouseName || '',
                warehouseId: item.warehouseId || ''
              }))
            }
          },
          include: {
            items: true,
            warehouse: true
          }
        })

        // Générer automatiquement le PDF tabulaire professionnel
        try {
          const generatedPdf = await this.generateOrderPdf(order.id)
          if (generatedPdf) {
            await prisma.purchaseOrder.update({
              where: { id: order.id },
              data: { pdfPath: generatedPdf }
            })
            order.pdfPath = generatedPdf
          }
        } catch (pdfErr) {
          appLog('WARN', 'purchaseOrder', `Impossible de générer le PDF initial pour ${order.id}: ${pdfErr}`)
        }

        return order
      } catch (err) {
        console.error('Erreur purchaseOrderService.create:', err)
        throw err
      }
    },

    async updateStatus(id: string, status: string) {
      try {
        const updated = await prisma.purchaseOrder.update({
          where: { id },
          data: { status },
          include: {
            items: true,
            warehouse: true
          }
        })

        // Régénérer le PDF avec le nouveau statut
        try {
          await this.generateOrderPdf(id)
        } catch (_) {}

        return updated
      } catch (err) {
        console.error(`Erreur purchaseOrderService.updateStatus(${id}):`, err)
        throw err
      }
    },

    async delete(id: string) {
      try {
        await prisma.purchaseOrder.delete({ where: { id } })
      } catch (err) {
        console.error(`Erreur purchaseOrderService.delete(${id}):`, err)
        throw err
      }
    },

    /**
     * Génère un PDF TABULAIRE HAUTE QUALITÉ pour un bon de commande avec en-tête valorisant la boutique
     */
    async generateOrderPdf(orderId: string): Promise<string | null> {
      try {
        const order = await prisma.purchaseOrder.findUnique({
          where: { id: orderId },
          include: {
            items: { include: { product: true } },
            warehouse: true
          }
        })

        if (!order) return null

        const supplier = await prisma.supplier.findFirst({
          where: { name: order.supplierName }
        })

        // Résolution de la boutique et de ses informations
        let wh = order.warehouse
        if (!wh && order.warehouseId) {
          wh = await prisma.warehouse.findUnique({ where: { id: order.warehouseId } }).catch(() => null)
        }
        if (!wh && order.items && order.items.length > 0) {
          const itemWithWh = order.items.find((i: any) => i.warehouseId)
          if (itemWithWh?.warehouseId) {
            wh = await prisma.warehouse.findUnique({ where: { id: itemWithWh.warehouseId } }).catch(() => null)
          }
        }
        if (!wh) {
          wh = await prisma.warehouse.findFirst().catch(() => null)
        }

        const appSettings = await prisma.appSettings.findFirst().catch(() => null)
        const boutiqueName = (wh?.name || appSettings?.companyName || 'Boutique Principale').trim()
        const boutiqueAddress = wh?.invoiceCompanyAddress || wh?.location || appSettings?.companyAddress || 'Point de vente & Gestion de Stock'
        const boutiquePhone = wh?.invoiceCompanyPhones?.split('\n')[0] || appSettings?.companyPhones?.split('\n')[0] || '—'
        const boutiqueEmail = wh?.invoiceCompanyEmail || appSettings?.companyEmail || '—'
        const primaryColor = wh?.invoiceColor || '#1e3a8a'
        const brandSub = wh?.invoiceCompanyDescription || 'Boutique & Point de Vente Commercial'

        const ordersDir = await getDesktopOrdersDir()
        const dateStr = new Date(order.createdAt).toISOString().slice(0, 10)
        const safeSupplier = order.supplierName.replace(/[^a-zA-Z0-9]/g, '_')
        const safeBoutique = boutiqueName.replace(/[^a-zA-Z0-9]/g, '_')
        const filename = `Bon_Commande_${safeBoutique}_${safeSupplier}_${dateStr}_${order.id.slice(0, 8)}.pdf`
        const pdfPath = join(ordersDir, filename)

        const { default: PDFDocument } = await import('pdfkit')
        const doc = new PDFDocument({
          size: 'A4',
          margins: { top: 25, bottom: 25, left: 25, right: 25 },
          info: {
            Title: `Bon de Commande - ${boutiqueName} - ${order.supplierName}`,
            Author: `${boutiqueName} - Iventello ERP`,
            Subject: 'Approvisionnement Stock'
          }
        })

        const buffers: Buffer[] = []
        doc.on('data', (chunk: Buffer) => buffers.push(chunk))

        await new Promise<void>((resolve, reject) => {
          doc.on('end', async () => {
            try {
              await writeFile(pdfPath, Buffer.concat(buffers))
              resolve()
            } catch (e) {
              reject(e)
            }
          })
          doc.on('error', reject)

          const items = order.items || []
          const totalQty = items.reduce((s, i) => s + i.quantity, 0)
          const totalAmount = order.totalAmount || items.reduce((s, i) => s + (i.quantity * (i.unitPrice || 0)), 0)

          // ── 1. EN-TÊTE ÉLÉGANT AVEC NOM DE LA BOUTIQUE BIEN DESIGNÉ ──
          doc.rect(25, 25, 545, 80).fill(primaryColor)

          // Badge / Monogramme Boutique à gauche
          doc.roundedRect(38, 35, 58, 58, 6).fill('#ffffff')
          const initials = boutiqueName.split(/\s+/).map((w: string) => w[0]).join('').slice(0, 3).toUpperCase() || 'BT'
          doc.fillColor(primaryColor).fontSize(19).font('Helvetica-Bold')
            .text(initials, 38, 54, { width: 58, align: 'center' })

          // Nom de la boutique & Coordonnées
          doc.fillColor('#ffffff').fontSize(16).font('Helvetica-Bold')
            .text(boutiqueName.toUpperCase(), 108, 36, { width: 280, ellipsis: true })
          
          doc.fillColor('#e0e7ff').fontSize(8.5).font('Helvetica')
            .text(brandSub, 108, 57, { width: 280 })
            .text(`Adresse : ${boutiqueAddress}`, 108, 69, { width: 280, ellipsis: true })
            .text(`Tél : ${boutiquePhone}  |  Email : ${boutiqueEmail}`, 108, 81, { width: 280, ellipsis: true })

          // Cartouche Droit (Titre du document & N° Bon)
          doc.fillColor('#ffffff').fontSize(14).font('Helvetica-Bold')
            .text('BON DE COMMANDE', 390, 35, { width: 170, align: 'right' })

          doc.roundedRect(400, 53, 160, 20, 3).fill('#ffffff')
          doc.fillColor(primaryColor).fontSize(9).font('Helvetica-Bold')
            .text(`N° BC-${new Date(order.createdAt).getFullYear()}-${order.id.slice(0, 8).toUpperCase()}`, 400, 58, { width: 160, align: 'center' })

          doc.fillColor('#e0e7ff').fontSize(8).font('Helvetica')
            .text(`Date d'émission : ${new Date(order.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}`, 390, 78, { width: 170, align: 'right' })
            .text(`Statut : ${order.status}`, 390, 90, { width: 170, align: 'right' })

          // ── 2. BLOCS INFOS (Fournisseur & Boutique de Livraison) ──
          const infoY = 115
          const colWidth = 265

          // Cadre Fournisseur
          doc.roundedRect(25, infoY, colWidth, 70, 4).fillAndStroke('#f8fafc', '#cbd5e1')
          doc.rect(25, infoY, colWidth, 18).fill('#f1f5f9')
          doc.fillColor('#334155').fontSize(8.5).font('Helvetica-Bold')
            .text('FOURNISSEUR DESTINATAIRE', 35, infoY + 5)
          doc.fillColor('#0f172a').fontSize(10.5).font('Helvetica-Bold')
            .text(order.supplierName, 35, infoY + 23)
          doc.fillColor('#475569').fontSize(8).font('Helvetica')
            .text(`Email : ${supplier?.email || '—'}`, 35, infoY + 39)
            .text(`Tél : ${supplier?.phone || '—'}  |  Adresse : ${supplier?.address || '—'}`, 35, infoY + 51, { width: 245, ellipsis: true })

          // Cadre Boutique / Livraison
          doc.roundedRect(305, infoY, colWidth, 70, 4).fillAndStroke('#f8fafc', '#cbd5e1')
          doc.rect(305, infoY, colWidth, 18).fill('#f1f5f9')
          doc.fillColor('#334155').fontSize(8.5).font('Helvetica-Bold')
            .text('BOUTIQUE DE LIVRAISON & RÉCEPTION', 315, infoY + 5)
          doc.fillColor('#0f172a').fontSize(10.5).font('Helvetica-Bold')
            .text(boutiqueName, 315, infoY + 23)
          doc.fillColor('#475569').fontSize(8).font('Helvetica')
            .text(`Contact : ${boutiqueEmail}`, 315, infoY + 39)
            .text(`Tél : ${boutiquePhone}  |  Lieu : ${boutiqueAddress}`, 315, infoY + 51, { width: 245, ellipsis: true })

          // ── 3. TABLEAU TABULAIRE HAUTE DÉFINITION ──
          let tableY = 195

          const drawTableHeader = (yPos: number) => {
            doc.rect(25, yPos, 545, 22).fill(primaryColor)
            doc.fillColor('#ffffff').fontSize(7.5).font('Helvetica-Bold')
            doc.text('#', 28, yPos + 7, { width: 20, align: 'center' })
            doc.text('DÉSIGNATION ARTICLE', 52, yPos + 7, { width: 180, align: 'left' })
            doc.text('CODE-BARRES / RÉF', 236, yPos + 7, { width: 80, align: 'left' })
            doc.text('STOCK', 320, yPos + 7, { width: 38, align: 'center' })
            doc.text('SEUIL', 362, yPos + 7, { width: 38, align: 'center' })
            doc.text('QTÉ CDE', 404, yPos + 7, { width: 44, align: 'center' })
            doc.text('PRIX UNIT.', 452, yPos + 7, { width: 55, align: 'right' })
            doc.text('TOTAL HT', 511, yPos + 7, { width: 55, align: 'right' })
          }

          drawTableHeader(tableY)
          tableY += 22

          // Lignes d'articles
          items.forEach((item, index) => {
            if (tableY > 710) {
              doc.addPage()
              tableY = 30
              drawTableHeader(tableY)
              tableY += 22
            }

            const rowHeight = 20
            const isEven = index % 2 === 0
            if (isEven) {
              doc.rect(25, tableY, 545, rowHeight).fill('#f8fafc')
            }

            // Bordure inférieure
            doc.rect(25, tableY + rowHeight, 545, 0.5).fill('#e2e8f0')

            const subTotal = item.quantity * (item.unitPrice || 0)
            const isCritical = item.currentStock <= item.alertLimit

            // Colonne #
            doc.fillColor('#64748b').fontSize(8).font('Helvetica')
              .text(String(index + 1), 28, tableY + 6, { width: 20, align: 'center' })

            // Désignation
            doc.fillColor('#0f172a').fontSize(8.5).font('Helvetica-Bold')
              .text(item.productName || 'Article', 52, tableY + 6, { width: 180, lineBreak: false, ellipsis: true })

            // Code-barres
            doc.fillColor('#475569').fontSize(7.5).font('Courier')
              .text(item.productBarcode || '—', 236, tableY + 6, { width: 80, lineBreak: false })

            // Stock actuel
            doc.fillColor(isCritical ? '#dc2626' : '#334155').fontSize(8).font(isCritical ? 'Helvetica-Bold' : 'Helvetica')
              .text(String(item.currentStock), 320, tableY + 6, { width: 38, align: 'center' })

            // Seuil alerte
            doc.fillColor('#64748b').fontSize(8).font('Helvetica')
              .text(String(item.alertLimit), 362, tableY + 6, { width: 38, align: 'center' })

            // Qté commandée (mise en avant)
            doc.fillColor(primaryColor).fontSize(8.5).font('Helvetica-Bold')
              .text(`+${item.quantity}`, 404, tableY + 6, { width: 44, align: 'center' })

            // Prix unitaire
            doc.fillColor('#334155').fontSize(8).font('Helvetica')
              .text(item.unitPrice > 0 ? (item.unitPrice).toLocaleString('fr-FR') : '—', 452, tableY + 6, { width: 55, align: 'right' })

            // Total
            doc.fillColor('#0f172a').fontSize(8.5).font('Helvetica-Bold')
              .text(subTotal > 0 ? (subTotal).toLocaleString('fr-FR') : '—', 511, tableY + 6, { width: 55, align: 'right' })

            tableY += rowHeight
          })

          // ── 4. BLOC TOTAUX ──
          if (tableY > 670) {
            doc.addPage()
            tableY = 30
          } else {
            tableY += 12
          }

          const totalsX = 325
          const totalsWidth = 245
          doc.roundedRect(totalsX, tableY, totalsWidth, 58, 4).fillAndStroke('#f8fafc', '#cbd5e1')

          doc.fillColor('#475569').fontSize(8.5).font('Helvetica')
            .text('Nombre de références :', totalsX + 12, tableY + 8)
            .text('Total unités commandées :', totalsX + 12, tableY + 23)

          doc.fillColor('#0f172a').fontSize(8.5).font('Helvetica-Bold')
            .text(`${items.length} produit(s)`, totalsX + 140, tableY + 8, { align: 'right', width: 92 })
            .text(`${totalQty} unité(s)`, totalsX + 140, tableY + 23, { align: 'right', width: 92 })

          // Ligne totale en couleur primaire
          doc.rect(totalsX, tableY + 36, totalsWidth, 22).fill(primaryColor)
          doc.fillColor('#ffffff').fontSize(9.5).font('Helvetica-Bold')
            .text('TOTAL ESTIMÉ HT :', totalsX + 12, tableY + 42)
            .text(`${totalAmount.toLocaleString('fr-FR')} FCFA`, totalsX + 110, tableY + 42, { align: 'right', width: 122 })

          tableY += 72

          // ── 5. CADRES DE SIGNATURES & VISAS ──
          if (tableY > 690) {
            doc.addPage()
            tableY = 30
          }

          const signWidth = 265
          // Signature Demandeur Boutique
          doc.roundedRect(25, tableY, signWidth, 62, 4).fillAndStroke('#ffffff', '#cbd5e1')
          doc.rect(25, tableY, signWidth, 16).fill('#f1f5f9')
          doc.fillColor('#334155').fontSize(8).font('Helvetica-Bold')
            .text(`VISA RESPONSABLE — ${boutiqueName.toUpperCase()}`, 35, tableY + 4)
          doc.fillColor('#94a3b8').fontSize(7.5).font('Helvetica-Oblique')
            .text('Date, Nom et Signature autorisée', 35, tableY + 46)

          // Signature Fournisseur
          doc.roundedRect(305, tableY, signWidth, 62, 4).fillAndStroke('#ffffff', '#cbd5e1')
          doc.rect(305, tableY, signWidth, 16).fill('#f1f5f9')
          doc.fillColor('#334155').fontSize(8).font('Helvetica-Bold')
            .text('ACCUSÉ DE RÉCEPTION FOURNISSEUR', 315, tableY + 4)
          doc.fillColor('#94a3b8').fontSize(7.5).font('Helvetica-Oblique')
            .text('Bon pour accord, Date et Cachet commercial', 315, tableY + 46)

          // ── 6. PIED DE PAGE INSTITUTIONNEL ──
          doc.fontSize(7.5).font('Helvetica').fillColor('#94a3b8')
            .text(
              `${boutiqueName} — Bon de Commande ${order.id} | Fichier exporté dans "Bureau/bons-de-commande/" le ${new Date().toLocaleString('fr-FR')}`,
              25,
              800,
              { align: 'center', width: 545 }
            )

          doc.end()
        })

        return pdfPath
      } catch (err) {
        appLog('ERROR', 'purchaseOrderService', `Erreur generateOrderPdf(${orderId}): ${err}`)
        throw err
      }
    },

    /**
     * Génère un fichier EXCEL (.xlsx) HAUTEMENT STYLISÉ ET COMPLET pour un bon de commande
     */
    async generateOrderExcel(orderId: string): Promise<string> {
      try {
        const order = await prisma.purchaseOrder.findUnique({
          where: { id: orderId },
          include: {
            items: { include: { product: true } },
            warehouse: true
          }
        })

        if (!order) throw new Error(`Bon de commande ${orderId} introuvable`)

        const supplier = await prisma.supplier.findFirst({
          where: { name: order.supplierName }
        })

        // Résolution de la boutique
        let wh = order.warehouse
        if (!wh && order.warehouseId) {
          wh = await prisma.warehouse.findUnique({ where: { id: order.warehouseId } }).catch(() => null)
        }
        if (!wh && order.items && order.items.length > 0) {
          const itemWithWh = order.items.find((i: any) => i.warehouseId)
          if (itemWithWh?.warehouseId) {
            wh = await prisma.warehouse.findUnique({ where: { id: itemWithWh.warehouseId } }).catch(() => null)
          }
        }
        if (!wh) {
          wh = await prisma.warehouse.findFirst().catch(() => null)
        }

        const appSettings = await prisma.appSettings.findFirst().catch(() => null)
        const boutiqueName = (wh?.name || appSettings?.companyName || 'Boutique Principale').trim()
        const boutiqueAddress = wh?.invoiceCompanyAddress || wh?.location || appSettings?.companyAddress || 'Point de vente & Gestion de Stock'
        const boutiquePhone = wh?.invoiceCompanyPhones?.split('\n')[0] || appSettings?.companyPhones?.split('\n')[0] || '—'
        const boutiqueEmail = wh?.invoiceCompanyEmail || appSettings?.companyEmail || '—'

        const ordersDir = await getDesktopOrdersDir()
        const dateStr = new Date(order.createdAt).toISOString().slice(0, 10)
        const safeSupplier = order.supplierName.replace(/[^a-zA-Z0-9]/g, '_')
        const safeBoutique = boutiqueName.replace(/[^a-zA-Z0-9]/g, '_')
        const filename = `Bon_Commande_${safeBoutique}_${safeSupplier}_${dateStr}_${order.id.slice(0, 8)}.xlsx`
        const excelPath = join(ordersDir, filename)

        const workbook = new ExcelJS.Workbook()
        workbook.creator = `${boutiqueName} - Iventello ERP`
        workbook.created = new Date()

        const sheet = workbook.addWorksheet('Bon de Commande', {
          views: [{ showGridLines: true }]
        })

        // ── 1. TITRE & EN-TÊTE AVEC NOM DE LA BOUTIQUE ──
        sheet.mergeCells('A1:H1')
        const titleCell = sheet.getCell('A1')
        titleCell.value = `BON DE COMMANDE — ${boutiqueName.toUpperCase()}`
        titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFFFF' } }
        titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } }
        titleCell.alignment = { vertical: 'middle', horizontal: 'center' }
        sheet.getRow(1).height = 34

        // ── 2. BLOCS INFORMATIONS ──
        sheet.addRow([]) // ligne 2 vide

        sheet.addRow(['Boutique émettrice :', boutiqueName, '', 'Fournisseur :', order.supplierName])
        sheet.addRow(['Adresse Boutique :', boutiqueAddress, '', 'Email Fournisseur :', supplier?.email || '—'])
        sheet.addRow(['Contact Boutique :', `${boutiquePhone} / ${boutiqueEmail}`, '', 'Tél Fournisseur :', supplier?.phone || '—'])
        sheet.addRow(['N° de Commande :', `BC-${order.id.slice(0, 8).toUpperCase()}`, '', 'Date émission :', new Date(order.createdAt).toLocaleDateString('fr-FR')])
        sheet.addRow(['Statut commande :', order.status, '', 'Adresse Fournisseur :', supplier?.address || '—'])
        sheet.addRow([]) // ligne 8 vide

        // Style des métadonnées (lignes 3 à 7)
        for (let r = 3; r <= 7; r++) {
          const row = sheet.getRow(r)
          row.getCell(1).font = { bold: true, color: { argb: 'FF475569' } }
          row.getCell(2).font = { bold: true, color: { argb: 'FF0F172A' } }
          row.getCell(4).font = { bold: true, color: { argb: 'FF475569' } }
          row.getCell(5).font = { bold: true, color: { argb: 'FF0F172A' } }
          row.height = 18
        }

        // ── 3. EN-TÊTE DU TABLEAU D'ARTICLES ──
        const headerRowIndex = 9
        const headers = [
          '#',
          'Désignation du Produit',
          'Code-barres / Réf',
          'Stock Actuel',
          'Seuil Alerte',
          'Qté Commandée',
          'Prix Unitaire (FCFA)',
          'Total HT (FCFA)'
        ]

        const headerRow = sheet.getRow(headerRowIndex)
        headerRow.values = headers
        headerRow.height = 24

        headerRow.eachCell((cell) => {
          cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } }
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } }
          cell.alignment = { vertical: 'middle', horizontal: 'center' }
          cell.border = {
            top: { style: 'thin', color: { argb: 'FF1D4ED8' } },
            left: { style: 'thin', color: { argb: 'FF1D4ED8' } },
            bottom: { style: 'medium', color: { argb: 'FF1E40AF' } },
            right: { style: 'thin', color: { argb: 'FF1D4ED8' } }
          }
        })

        // ── 4. LIGNES D'ARTICLES ──
        let currentRow = headerRowIndex + 1
        const startDataRow = currentRow
        const items = order.items || []

        items.forEach((item, index) => {
          const row = sheet.getRow(currentRow)
          const isEven = index % 2 === 0
          const bgColor = isEven ? 'FFF8FAFC' : 'FFFFFFFF'

          row.values = [
            index + 1,
            item.productName,
            item.productBarcode || '—',
            item.currentStock,
            item.alertLimit,
            item.quantity,
            item.unitPrice || 0,
            { formula: `F${currentRow}*G${currentRow}`, result: item.quantity * (item.unitPrice || 0) }
          ]

          row.height = 20

          // Alignements et styles spécifiques
          row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' }
          row.getCell(2).alignment = { horizontal: 'left', vertical: 'middle' }
          row.getCell(2).font = { bold: true }
          row.getCell(3).alignment = { horizontal: 'left', vertical: 'middle' }
          row.getCell(3).font = { name: 'Courier New' }
          row.getCell(4).alignment = { horizontal: 'center', vertical: 'middle' }
          row.getCell(5).alignment = { horizontal: 'center', vertical: 'middle' }
          row.getCell(6).alignment = { horizontal: 'center', vertical: 'middle' }
          row.getCell(6).font = { bold: true, color: { argb: 'FF2563EB' } }

          // Format monétaire
          row.getCell(7).alignment = { horizontal: 'right', vertical: 'middle' }
          row.getCell(7).numFmt = '#,##0 "FCFA"'
          row.getCell(8).alignment = { horizontal: 'right', vertical: 'middle' }
          row.getCell(8).numFmt = '#,##0 "FCFA"'
          row.getCell(8).font = { bold: true }

          // Bordures & fonds
          row.eachCell((cell) => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } }
            cell.border = {
              top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
              left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
              bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
              right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
            }
          })

          currentRow++
        })

        const endDataRow = currentRow - 1

        // ── 5. LIGNE DU TOTAL ──
        sheet.addRow([]) // ligne vide
        currentRow++

        const totalRow = sheet.getRow(currentRow)
        totalRow.getCell(5).value = 'TOTAL GÉNÉRAL :'
        totalRow.getCell(6).value = { formula: `SUM(F${startDataRow}:F${endDataRow})`, result: items.reduce((s, i) => s + i.quantity, 0) }
        totalRow.getCell(8).value = { formula: `SUM(H${startDataRow}:H${endDataRow})`, result: order.totalAmount }

        totalRow.height = 24
        totalRow.getCell(5).font = { bold: true, size: 11 }
        totalRow.getCell(5).alignment = { horizontal: 'right', vertical: 'middle' }
        totalRow.getCell(6).font = { bold: true, size: 11, color: { argb: 'FF2563EB' } }
        totalRow.getCell(6).alignment = { horizontal: 'center', vertical: 'middle' }
        totalRow.getCell(8).font = { bold: true, size: 12, color: { argb: 'FF16A34A' } }
        totalRow.getCell(8).alignment = { horizontal: 'right', vertical: 'middle' }
        totalRow.getCell(8).numFmt = '#,##0 "FCFA"'

        totalRow.eachCell((cell) => {
          cell.border = {
            top: { style: 'medium', color: { argb: 'FF1E293B' } },
            bottom: { style: 'double', color: { argb: 'FF1E293B' } }
          }
        })

        // ── 6. AJUSTEMENT AUTOMATIQUE DES LARGEURS DE COLONNES ──
        sheet.columns = [
          { width: 6 },   // #
          { width: 36 },  // Désignation
          { width: 20 },  // Code-barres
          { width: 14 },  // Stock Actuel
          { width: 14 },  // Seuil Alerte
          { width: 16 },  // Qté Commandée
          { width: 22 },  // Prix Unitaire
          { width: 24 }   // Total HT
        ]

        await workbook.xlsx.writeFile(excelPath)
        return excelPath
      } catch (err) {
        appLog('ERROR', 'purchaseOrderService', `Erreur generateOrderExcel(${orderId}): ${err}`)
        throw err
      }
    },

    /**
     * Génère un fichier Excel récapitulatif avec TOUS les bons de commande
     */
    async generateAllOrdersExcel(): Promise<string> {
      try {
        const orders = await prisma.purchaseOrder.findMany({
          include: {
            items: true,
            warehouse: true
          },
          orderBy: { createdAt: 'desc' }
        })

        const ordersDir = await getDesktopOrdersDir()
        const dateStr = new Date().toISOString().slice(0, 10)
        const filename = `Synthese_Bons_Commande_${dateStr}.xlsx`
        const excelPath = join(ordersDir, filename)

        const workbook = new ExcelJS.Workbook()
        workbook.creator = 'Iventello ERP'

        // Feuille synthèse
        const summarySheet = workbook.addWorksheet('Synthèse Générale', { views: [{ showGridLines: true }] })
        
        summarySheet.mergeCells('A1:G1')
        const tCell = summarySheet.getCell('A1')
        tCell.value = 'SYNTHÈSE DES BONS DE COMMANDE FOURNISSEURS'
        tCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFFFF' } }
        tCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } }
        tCell.alignment = { vertical: 'middle', horizontal: 'center' }
        summarySheet.getRow(1).height = 30

        summarySheet.addRow([])
        const headers = ['N° Bon', 'Fournisseur', 'Date d\'émission', 'Statut', 'Articles', 'Quantité Totale', 'Montant Estimé']
        const hRow = summarySheet.addRow(headers)
        hRow.height = 22
        hRow.eachCell((cell) => {
          cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } }
          cell.alignment = { vertical: 'middle', horizontal: 'center' }
        })

        orders.forEach((o, i) => {
          const itemCount = o.items?.length || 0
          const totalQty = o.items?.reduce((s, it) => s + it.quantity, 0) || 0
          const row = summarySheet.addRow([
            `BC-${o.id.slice(0, 8).toUpperCase()}`,
            o.supplierName,
            new Date(o.createdAt).toLocaleDateString('fr-FR'),
            o.status,
            itemCount,
            totalQty,
            o.totalAmount
          ])

          row.getCell(7).numFmt = '#,##0 "FCFA"'
          row.getCell(7).font = { bold: true }
          const bgColor = i % 2 === 0 ? 'FFF8FAFC' : 'FFFFFFFF'
          row.eachCell((c) => {
            c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } }
            c.border = { top: { style: 'thin', color: { argb: 'FFE2E8F0' } }, bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } } }
          })
        })

        summarySheet.columns = [
          { width: 16 }, { width: 30 }, { width: 18 }, { width: 16 }, { width: 12 }, { width: 16 }, { width: 22 }
        ]

        // ── Feuille 2 : Détail exhaustif de Tous les Articles Commandés ──
        const itemsSheet = workbook.addWorksheet('Articles Détaillés', { views: [{ showGridLines: true }] })

        itemsSheet.mergeCells('A1:J1')
        const itemTitleCell = itemsSheet.getCell('A1')
        itemTitleCell.value = 'LISTE EXHAUSTIVE DES ARTICLES EN COMMANDE FOURNISSEURS'
        itemTitleCell.font = { name: 'Arial', size: 13, bold: true, color: { argb: 'FFFFFFFF' } }
        itemTitleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } }
        itemTitleCell.alignment = { vertical: 'middle', horizontal: 'center' }
        itemsSheet.getRow(1).height = 30

        itemsSheet.addRow([])
        const itemHeaders = [
          'N° Bon',
          'Fournisseur',
          'Désignation Produit',
          'Code-barres / Réf',
          'Stock Actuel',
          'Seuil Alerte',
          'Qté Commandée',
          'Prix Unitaire (FCFA)',
          'Total HT (FCFA)',
          'Boutique'
        ]
        const itemHRow = itemsSheet.addRow(itemHeaders)
        itemHRow.height = 22
        itemHRow.eachCell((cell) => {
          cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0D9488' } }
          cell.alignment = { vertical: 'middle', horizontal: 'center' }
        })

        let itemRowIdx = 0
        orders.forEach((o) => {
          const items = o.items || []
          items.forEach((it) => {
            const subTotal = it.quantity * (it.unitPrice || 0)
            const r = itemsSheet.addRow([
              `BC-${o.id.slice(0, 8).toUpperCase()}`,
              o.supplierName,
              it.productName,
              it.productBarcode || '—',
              it.currentStock,
              it.alertLimit,
              it.quantity,
              it.unitPrice || 0,
              subTotal,
              it.warehouseName || o.warehouse?.name || '—'
            ])

            r.getCell(1).alignment = { horizontal: 'center' }
            r.getCell(4).font = { name: 'Courier New' }
            r.getCell(5).alignment = { horizontal: 'center' }
            r.getCell(6).alignment = { horizontal: 'center' }
            r.getCell(7).alignment = { horizontal: 'center' }
            r.getCell(7).font = { bold: true, color: { argb: 'FF0D9488' } }
            r.getCell(8).numFmt = '#,##0 "FCFA"'
            r.getCell(9).numFmt = '#,##0 "FCFA"'
            r.getCell(9).font = { bold: true }

            const bg = itemRowIdx % 2 === 0 ? 'FFF8FAFC' : 'FFFFFFFF'
            r.eachCell((c) => {
              c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } }
              c.border = { top: { style: 'thin', color: { argb: 'FFE2E8F0' } }, bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } } }
            })
            itemRowIdx++
          })
        })

        itemsSheet.columns = [
          { width: 16 }, // N° Bon
          { width: 26 }, // Fournisseur
          { width: 34 }, // Désignation
          { width: 20 }, // Code-barres
          { width: 14 }, // Stock Actuel
          { width: 14 }, // Seuil Alerte
          { width: 16 }, // Qté Commandée
          { width: 22 }, // Prix Unitaire
          { width: 24 }, // Total HT
          { width: 22 }  // Boutique
        ]

        await workbook.xlsx.writeFile(excelPath)
        return excelPath
      } catch (err) {
        appLog('ERROR', 'purchaseOrderService', `Erreur generateAllOrdersExcel: ${err}`)
        throw err
      }
    }
  }
}

