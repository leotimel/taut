import { describe, it, expect } from 'vitest'
import {
  PALETTES,
  paletteById,
  isPaletteUnlocked,
  DEFAULT_PALETTE,
} from './palettes'

describe('palettes', () => {
  it('ids únicos e unlockLevel não-decrescente', () => {
    const ids = PALETTES.map((p) => p.id)
    expect(new Set(ids).size).toBe(ids.length)
    const levels = PALETTES.map((p) => p.unlockLevel)
    expect([...levels].sort((a, b) => a - b)).toEqual(levels)
  })

  it('a paleta default existe e é nível 1', () => {
    expect(paletteById(DEFAULT_PALETTE).unlockLevel).toBe(1)
  })

  it('isPaletteUnlocked respeita o nível de unlock', () => {
    const aurea = paletteById('aurea')
    expect(isPaletteUnlocked(aurea, 99)).toBe(false)
    expect(isPaletteUnlocked(aurea, 100)).toBe(true)
  })
})
