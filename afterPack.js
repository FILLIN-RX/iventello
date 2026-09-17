/**
 * afterPack.js — Copie forcée des modules Prisma hors de l'ASAR.
 * Appelé par electron-builder après le packaging, avant la création de l'installateur.
 *
 * Problème résolu : `require('.prisma/client/default')` depuis l'intérieur de l'ASAR
 * échoue car les fichiers .node natifs ne peuvent pas s'exécuter depuis une archive.
 * Cette approche copie TOUT @prisma/client et .prisma/client dans app.asar.unpacked.
 */

const fs = require('fs')
const path = require('path')

exports.default = async function afterPack(context) {
  const { appOutDir } = context

  const resourcesDir = path.join(appOutDir, 'resources')
  const unpackedDir = path.join(resourcesDir, 'app.asar.unpacked', 'node_modules')

  const sources = [
    {
      from: path.join(process.cwd(), 'node_modules', '.prisma'),
      to: path.join(unpackedDir, '.prisma'),
    },
    {
      from: path.join(process.cwd(), 'node_modules', '@prisma', 'client'),
      to: path.join(unpackedDir, '@prisma', 'client'),
    },
  ]

  for (const { from, to } of sources) {
    if (fs.existsSync(from)) {
      console.log(`[afterPack] Copie : ${from} → ${to}`)
      fs.mkdirSync(to, { recursive: true })
      copyRecursive(from, to)
    } else {
      console.warn(`[afterPack] Source introuvable, ignorée : ${from}`)
    }
  }

  console.log('[afterPack] Modules Prisma copiés dans app.asar.unpacked ✓')
}

function copyRecursive(src, dest) {
  const entries = fs.readdirSync(src, { withFileTypes: true })
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name)
    const destPath = path.join(dest, entry.name)
    if (entry.isDirectory()) {
      fs.mkdirSync(destPath, { recursive: true })
      copyRecursive(srcPath, destPath)
    } else {
      fs.copyFileSync(srcPath, destPath)
    }
  }
}
