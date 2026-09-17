import multer from 'multer'
import { join } from 'path'
import { existsSync, mkdirSync } from 'fs'
import { app } from 'electron'

// Configurer le dossier de stockage pour multer
// Note : Utile si un serveur Express ou HTTP local est démarré au sein d'Electron.
const getUploadsDirectory = () => {
  const userData = app.getPath('userData')
  const uploadsDir = join(userData, 'uploads')
  if (!existsSync(uploadsDir)) {
    mkdirSync(uploadsDir, { recursive: true })
  }
  return uploadsDir
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, getUploadsDirectory())
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9)
    const parts = file.originalname.split('.')
    const ext = parts.length > 1 ? parts.pop() : 'png'
    cb(null, `${file.fieldname}-${uniqueSuffix}.${ext}`)
  }
})

export const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // Limite à 5 Mo
  },
  fileFilter: (_req, file, cb) => {
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('Format de fichier non supporté. Seules les images sont autorisées.') as any, false)
    }
  }
})
