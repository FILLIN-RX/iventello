import { describe, it, expect } from 'vitest'
import { getColor } from '@/lib/utils'

describe('getColor - fonction de hachage déterministe', () => {
  it('retourne toujours la même couleur pour un même nom', () => {
    const color1 = getColor('Livres')
    const color2 = getColor('Livres')
    expect(color1).toBe(color2)
  })

  it('retourne des couleurs différentes pour des noms différents (probabiliste)', () => {
    const couleurs = new Set(Array.from({ length: 20 }, (_, i) => getColor(`Catégorie ${i}`)))
    expect(couleurs.size).toBeGreaterThan(1)
  })
})

