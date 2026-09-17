import { describe, it, expect } from 'vitest'
import { suggestMapping } from '../../../main/services/excelImportService'

describe('excelImportService - suggestMapping', () => {
  it('détecte automatiquement les colonnes de base standard', () => {
    const headers = ['Description', 'ISBN Number', 'Qty', 'Cost', 'Price', 'Category']
    const mapping = suggestMapping(headers)

    expect(mapping.name).toBe('Description')
    expect(mapping.barcode).toBe('ISBN Number')
    expect(mapping.quantity).toBe('Qty')
    expect(mapping.basePrice).toBe('Cost')
    expect(mapping.sellingPrice).toBe('Price')
    expect(mapping.category).toBe('Category')
  })

  it('détecte automatiquement les champs personnalisés spécifiques (Éditeur, Auteur, Type, Niveau)', () => {
    const headers = [
      'Category', 'Description', 'ISBN Number', 'Editor', 'Author',
      'Type', 'Level', 'New', 'IFORFACT II', 'Qty', 'Cost', 'Price'
    ]
    const mapping = suggestMapping(headers)

    expect(mapping.name).toBe('Description')
    expect(mapping.barcode).toBe('ISBN Number')
    expect(mapping.field1).toBe('Editor')
    expect(mapping.field1_label).toBe('Éditeur / Marque')
    expect(mapping.field2).toBe('Author')
    expect(mapping.field2_label).toBe('Auteur / Modèle')
    expect(mapping.field3).toBe('Type')
    expect(mapping.field3_label).toBe('Type / Système')
    expect(mapping.field4).toBe('Level')
    expect(mapping.field4_label).toBe('Niveau Scolaire')
    expect(mapping.field5).toBe('New')
    expect(mapping.field5_label).toBe('Condition / État')
  })

  it('gère les en-têtes avec variations françaises et accents', () => {
    const headers = ['Désignation du produit', 'Code Barre', 'Quantité en Stock', 'Prix d\'achat unitaire', 'Prix de Vente TTC', 'Famille']
    const mapping = suggestMapping(headers)

    expect(mapping.name).toBe('Désignation du produit')
    expect(mapping.barcode).toBe('Code Barre')
    expect(mapping.quantity).toBe('Quantité en Stock')
    expect(mapping.basePrice).toBe('Prix d\'achat unitaire')
    expect(mapping.sellingPrice).toBe('Prix de Vente TTC')
    expect(mapping.category).toBe('Famille')
  })
})
