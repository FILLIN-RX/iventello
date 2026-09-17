import { describe, it, expect } from 'vitest'

// Simule la logique du protocol handler dans src/main/index.ts (lignes 1778-1807)
function protocolHandlerExtractPath(requestUrl: string): string {
  const prefix = 'local-file://'
  if (!requestUrl.startsWith(prefix)) return requestUrl
  const raw = requestUrl.slice(prefix.length)
  return decodeURIComponent(raw)
}

function protocolHandlerIsAllowed(resolved: string, allowedDirs: string[]): boolean {
  return allowedDirs.some(dir => resolved.startsWith(dir.replace(/\\/g, '/')))
}

describe('Protocole local-file:// — extraction du chemin', () => {
  it('extrait un chemin Windows simple', () => {
    const url = 'local-file://C:/Users/test/image.png'
    expect(protocolHandlerExtractPath(url)).toBe('C:/Users/test/image.png')
  })

  it('extrait avec backslashes encodés (Chromium encode %5C)', () => {
    const url = 'local-file://C:%5CUsers%5Ctest%5Cimage.png'
    const path = protocolHandlerExtractPath(url)
    expect(path).toBe('C:\\Users\\test\\image.png')
  })

  it('extrait avec espaces encodés', () => {
    const url = 'local-file://C:/Users/test/mon%20image.png'
    expect(protocolHandlerExtractPath(url)).toBe('C:/Users/test/mon image.png')
  })

  it('BUG DÉTECTÉ: préfixe local-file:/// (3 slashes)', () => {
    // Sur Windows, Chromium peut normaliser l'URL avec 3 slashes
    const url = 'local-file:///C:/Users/test/image.png'
    const path = protocolHandlerExtractPath(url)
    // Note: le slice enlève 14 chars, il reste "/C:/Users/test/image.png"
    // Sur Windows, resolve('/C:') peut donner un mauvais résultat
    // => `readFileSync('/C:/Users/test/image.png')` échoue
    expect(path.startsWith('/C:')).toBe(true)
  })

  it('extrait un chemin Unix', () => {
    const url = 'local-file:///home/user/image.png'
    expect(protocolHandlerExtractPath(url)).toBe('/home/user/image.png')
  })
})

describe('Vérification des dossiers autorisés', () => {
  const allowedDirs = [
    'C:/Users/app/userData',
    'C:/Users/app/logos',
    'C:/Users/app/product-images'
  ]

  it('autorise un chemin valide', () => {
    expect(protocolHandlerIsAllowed('C:/Users/app/logos/wh-logo.png', allowedDirs)).toBe(true)
  })

  it('rejette un chemin hors des dossiers autorisés', () => {
    expect(protocolHandlerIsAllowed('C:/Windows/system32/cmd.exe', allowedDirs)).toBe(false)
  })
})

describe('Construction des URLs img src dans le renderer', () => {
  // Reproduit le pattern utilisé dans Produits.tsx, ProduitForm.tsx, Entrepots.tsx, etc.
  function buildImgSrc(imageUrl: string | null, selectedFile?: string | null): string {
    if (selectedFile) return `local-file://${selectedFile}`
    if (!imageUrl) return ''
    if (imageUrl.startsWith('http')) return imageUrl
    return `local-file://${imageUrl}`
  }

  it('BUG: chemin Windows avec backslashes dans l\'URL', () => {
    const windowsPath = 'C:\\Users\\test\\product-images\\prod-1.png'
    const src = buildImgSrc(windowsPath)
    // L'URL construite contient des backslashes, ce qui est invalide en URL
    expect(src).toBe('local-file://C:\\Users\\test\\product-images\\prod-1.png')
    // Sur Windows, Chromium normalise les backslashes, mais le comportement est indéfini
    // La bonne pratique: normaliser en forward slashes
    const normalized = src.replace(/\\/g, '/')
    expect(normalized.includes('\\')).toBe(false)
  })

  it('URL web conservée telle quelle', () => {
    expect(buildImgSrc('https://example.com/img.png')).toBe('https://example.com/img.png')
    expect(buildImgSrc('http://localhost:8080/img.png')).toBe('http://localhost:8080/img.png')
  })

  it('chemin déjà normalisé fonctionne', () => {
    const normalPath = 'C:/Users/test/product-images/prod-1.png'
    expect(buildImgSrc(normalPath)).toBe('local-file://C:/Users/test/product-images/prod-1.png')
  })

  it('imageUrl null retourne chaîne vide', () => {
    expect(buildImgSrc(null)).toBe('')
  })
})

describe('Scénario complet: round-trip URL → fichier', () => {
  // Simule le cycle complet: renderer construit URL → protocol → extract → resolve → read
  function simulateProtocolFlow(rendererSrc: string): { raw: string; decoded: string } {
    const raw = rendererSrc.slice('local-file://'.length)
    const decoded = decodeURIComponent(raw)
    return { raw, decoded }
  }

  it('chemin sans backslash: OK', () => {
    const src = 'local-file://C:/Users/test/image.png'
    const { decoded } = simulateProtocolFlow(src)
    expect(decoded).toBe('C:/Users/test/image.png')
  })

  it('CHEMIN AVEC BACKSLASHES: l\'URL est mal formée', () => {
    // Ceci reproduit le bug: le renderer envoie des backslashes dans l'URL
    const src = 'local-file://C:\\Users\\test\\image.png'
    const { decoded } = simulateProtocolFlow(src)
    // decodeURIComponent ne change pas les backslashes
    expect(decoded).toBe('C:\\Users\\test\\image.png')
    // Mais un vrai navigateur Chromium peut avoir normalisé les \ en / ou %5C
    // => comportement imprévisible
  })
})
