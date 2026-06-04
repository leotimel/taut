import { describe, it, expect } from 'vitest'
import {
  PALETTES,
  paletteById,
  isPaletteUnlocked,
  DEFAULT_PALETTE,
} from './palettes'

describe('palettes', () => {
  it('a paleta padrão é a primeira (sunset, Nv1)', () => {
    expect(PALETTES[0].id).toBe(DEFAULT_PALETTE)
    expect(PALETTES[0].unlockLevel).toBe(1)
  })

  it('paletteById cai na primeira se o id é desconhecido', () => {
    expect(paletteById('xyz')).toBe(PALETTES[0])
    expect(paletteById('ocean').id).toBe('ocean')
  })

  it('isPaletteUnlocked respeita o nível de unlock', () => {
    const ocean = paletteById('ocean') // unlock 5
    expect(isPaletteUnlocked(ocean, 4)).toBe(false)
    expect(isPaletteUnlocked(ocean, 5)).toBe(true)
  })

  it('os níveis de unlock são crescentes', () => {
    for (let i = 1; i < PALETTES.length; i++) {
      expect(PALETTES[i].unlockLevel).toBeGreaterThan(PALETTES[i - 1].unlockLevel)
    }
  })
})
