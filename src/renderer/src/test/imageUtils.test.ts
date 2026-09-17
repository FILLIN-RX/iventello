import { describe, it, expect } from 'vitest'
import { toFileUrl, fromFileUrl, getMimeType, isAllowedMimeType, isImageFile, isAllowedPath } from '../../../shared/imageUtils'

describe('toFileUrl — conversion chemin → URL local-file://', () => {
  it('convertit un chemin Windows avec backslashes', () => {
    const result = toFileUrl('C:\\Users\\test\\image.png')
    expect(result).toBe('local-file://C:/Users/test/image.png')
  })

  it('conserve les chemins déjà avec forward slashes', () => {
    const result = toFileUrl('C:/Users/test/image.png')
    expect(result).toBe('local-file://C:/Users/test/image.png')
  })

  it('gère les espaces dans le chemin', () => {
    const result = toFileUrl('C:\\Users\\test\\mon image.png')
    expect(result).toBe('local-file://C:/Users/test/mon image.png')
  })

  it('gère les chemins Unix', () => {
    const result = toFileUrl('/home/user/image.png')
    expect(result).toBe('local-file:///home/user/image.png')
  })
})

describe('fromFileUrl — conversion URL → chemin système', () => {
  it('extrait le chemin depuis une URL local-file', () => {
    const result = fromFileUrl('local-file://C:/Users/test/image.png')
    expect(result).toBe('C:\\Users\\test\\image.png')
  })

  it('gère les chemins Unix', () => {
    const result = fromFileUrl('local-file:///home/user/image.png')
    expect(result).toBe('\\home\\user\\image.png')
  })

  it('retourne l\'entrée inchangée si pas un préfixe local-file://', () => {
    const result = fromFileUrl('https://example.com/image.png')
    expect(result).toBe('https://example.com/image.png')
  })
})

describe('getMimeType', () => {
  it('retourne le bon type MIME pour les extensions courantes', () => {
    expect(getMimeType('.png')).toBe('image/png')
    expect(getMimeType('.jpg')).toBe('image/jpeg')
    expect(getMimeType('.jpeg')).toBe('image/jpeg')
    expect(getMimeType('.gif')).toBe('image/gif')
    expect(getMimeType('.webp')).toBe('image/webp')
    expect(getMimeType('.svg')).toBe('image/svg+xml')
    expect(getMimeType('.ico')).toBe('image/x-icon')
  })

  it('retourne application/octet-stream pour les extensions inconnues', () => {
    expect(getMimeType('.pdf')).toBe('application/octet-stream')
    expect(getMimeType('.txt')).toBe('application/octet-stream')
  })

  it('est insensible à la casse', () => {
    expect(getMimeType('.PNG')).toBe('image/png')
    expect(getMimeType('.JPG')).toBe('image/jpeg')
  })
})

describe('isAllowedMimeType', () => {
  it('accepte les types image courants', () => {
    expect(isAllowedMimeType('image/jpeg')).toBe(true)
    expect(isAllowedMimeType('image/png')).toBe(true)
    expect(isAllowedMimeType('image/gif')).toBe(true)
    expect(isAllowedMimeType('image/webp')).toBe(true)
    expect(isAllowedMimeType('image/svg+xml')).toBe(true)
  })

  it('rejette les types non-image', () => {
    expect(isAllowedMimeType('application/pdf')).toBe(false)
    expect(isAllowedMimeType('text/plain')).toBe(false)
  })
})

describe('isImageFile', () => {
  it('détecte les fichiers image par extension', () => {
    expect(isImageFile('photo.png')).toBe(true)
    expect(isImageFile('photo.jpg')).toBe(true)
    expect(isImageFile('photo.jpeg')).toBe(true)
    expect(isImageFile('photo.gif')).toBe(true)
    expect(isImageFile('photo.webp')).toBe(true)
    expect(isImageFile('photo.svg')).toBe(true)
    expect(isImageFile('photo.bmp')).toBe(true)
  })

  it('rejette les fichiers non-image', () => {
    expect(isImageFile('document.pdf')).toBe(false)
    expect(isImageFile('archive.zip')).toBe(false)
  })
})

describe('isAllowedPath — vérification des dossiers autorisés', () => {
  const allowed = ['C:\\Users\\app\\userData', 'C:\\Users\\app\\logos', 'C:\\Users\\app\\product-images']

  it('autorise les chemins dans les dossiers autorisés', () => {
    expect(isAllowedPath('C:\\Users\\app\\userData\\logos\\logo.png', allowed)).toBe(true)
    expect(isAllowedPath('C:\\Users\\app\\logos\\warehouse-1.png', allowed)).toBe(true)
    expect(isAllowedPath('C:\\Users\\app\\product-images\\product-1.png', allowed)).toBe(true)
  })

  it('rejette les chemins en dehors des dossiers autorisés', () => {
    expect(isAllowedPath('C:\\Windows\\system32\\malware.exe', allowed)).toBe(false)
    expect(isAllowedPath('D:\\autres\\image.png', allowed)).toBe(false)
  })
})

describe('toFileUrl + fromFileUrl — round-trip', () => {
  it('conserve l\'intégrité du chemin après conversion aller-retour', () => {
    const original = 'C:\\Users\\test\\dossier\\mon image.png'
    const url = toFileUrl(original)
    const back = fromFileUrl(url)
    expect(back).toBe(original)
  })
})
