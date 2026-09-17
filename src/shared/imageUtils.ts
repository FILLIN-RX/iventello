const MIME_TYPES: Record<string, string> = {
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon', '.bmp': 'image/bmp'
}

export function getMimeType(ext: string): string {
  return MIME_TYPES[ext.toLowerCase()] || 'application/octet-stream'
}

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']

export function isAllowedMimeType(mime: string): boolean {
  return ALLOWED_MIME_TYPES.includes(mime)
}

export function toFileUrl(filePath: string): string {
  if (!filePath) return ''
  if (
    filePath.startsWith('local-file://') ||
    filePath.startsWith('http://') ||
    filePath.startsWith('https://') ||
    filePath.startsWith('data:')
  ) {
    return filePath
  }
  const normalized = filePath.replace(/\\/g, '/')
  return `local-file://${normalized.startsWith('/') ? normalized : normalized}`
}

export function fromFileUrl(url: string): string {
  const prefix = 'local-file://'
  if (!url.startsWith(prefix)) return url
  let pathPart = decodeURIComponent(url.slice(prefix.length))
  if (pathPart.startsWith('/')) {
    // Si c'est un chemin Unix (/home/...) on conserve le slash
    if (!/^\/[a-zA-Z]:/.test(pathPart)) {
      return pathPart.replace(/\//g, '\\')
    }
    pathPart = pathPart.slice(1)
  }
  if (/^[a-zA-Z]\//.test(pathPart)) {
    pathPart = pathPart[0] + ':/' + pathPart.slice(2)
  }
  return pathPart.replace(/\//g, '\\')
}

export function isAllowedPath(resolved: string, allowedDirs: string[]): boolean {
  const norm = resolved.replace(/\\/g, '/').toLowerCase()
  return allowedDirs.some(dir => norm.startsWith(dir.replace(/\\/g, '/').toLowerCase()))
}

const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.bmp']

export function isImageFile(filePath: string): boolean {
  const ext = filePath.toLowerCase().slice(filePath.lastIndexOf('.'))
  return IMAGE_EXTENSIONS.includes(ext)
}
