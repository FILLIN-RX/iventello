import path from 'path'
import fs from 'fs'

export interface ExcelSheetPreviewNative {
  sheetNames: string[]
  activeSheet: string
  rows: string[][]
  totalRows: number
}

export interface ExportResultNative {
  outputPath: string
  sizeBytes: number
  filesCount: number
}

export interface ImportResultNative {
  dataJson: string
  hasImages: boolean
  imagesExtracted: number
  dbIncluded: boolean
}

export interface NativeModule {
  fastPreviewExcel?: (filePath: string, sheetName?: string, maxRows?: number) => ExcelSheetPreviewNative
  fastReadAllRows?: (filePath: string, sheetName?: string) => string[][]
  createIventelloArchive?: (dataJsonPath: string, userDataDir: string, dbPath: string, outputPath: string) => ExportResultNative
  extractIventelloArchive?: (archivePath: string, extractDir: string, restoreDb: boolean) => ImportResultNative
  getDirStats?: (dirPath: string) => string
}

let cachedNativeModule: NativeModule | null | false = null

export function getNativeModule(): NativeModule | null {
  if (cachedNativeModule === false) return null
  if (cachedNativeModule !== null) return cachedNativeModule

  const candidatePaths = [
    path.join(process.cwd(), 'native', 'target', 'release', 'iventello_native.node'),
    path.join(process.cwd(), 'native', 'target', 'release', 'iventello_native.dll'),
    path.join(__dirname, '../../native/target/release/iventello_native.node'),
    path.join(__dirname, '../../native/target/release/iventello_native.dll'),
    path.join(process.resourcesPath || '', 'native', 'iventello_native.node'),
  ]

  for (const candidate of candidatePaths) {
    if (candidate && fs.existsSync(candidate)) {
      try {
        const mod = require(candidate)
        console.log('[NativeBridge] 🦀 Module Rust natif chargé avec succès depuis :', candidate)
        cachedNativeModule = mod
        return mod
      } catch (err) {
        console.warn('[NativeBridge] Échec chargement binaire natif :', candidate, err)
      }
    }
  }

  // Fallback silencieux en dev tant que le module n'est pas compilé
  return null
}
