/**
 * Paletas de cores desbloqueáveis por nível. Os VALORES das cores ficam no CSS
 * (`:root[data-palette="..."]` em index.css); aqui mora só o metadado (nome,
 * nível de unlock e um swatch pro preview) e a aplicação no documento.
 */

export interface PaletteMeta {
  id: string
  name: string
  /** Nível necessário pra desbloquear (1 = sempre disponível). */
  unlockLevel: number
  /** Cores pro preview (swatch): fundo, traçado e número. */
  swatch: { bg: string; path: string; wp: string }
}

export const PALETTES: PaletteMeta[] = [
  { id: 'sunset', name: 'Pôr do sol', unlockLevel: 1, swatch: { bg: '#fff7ed', path: '#db2777', wp: '#f59e0b' } },
  { id: 'ocean', name: 'Oceano', unlockLevel: 5, swatch: { bg: '#ecfeff', path: '#0d9488', wp: '#fb7185' } },
  { id: 'forest', name: 'Floresta', unlockLevel: 10, swatch: { bg: '#f7fee7', path: '#16a34a', wp: '#f59e0b' } },
  { id: 'neon', name: 'Neon noturno', unlockLevel: 25, swatch: { bg: '#0b1020', path: '#22d3ee', wp: '#f472b6' } },
]

export const DEFAULT_PALETTE = 'sunset'

export function paletteById(id: string): PaletteMeta {
  return PALETTES.find((p) => p.id === id) ?? PALETTES[0]
}

export function isPaletteUnlocked(p: PaletteMeta, level: number): boolean {
  return level >= p.unlockLevel
}

/** Aplica a paleta no documento (atributo `data-palette` no <html>). */
export function applyPalette(id: string): void {
  if (typeof document !== 'undefined') {
    document.documentElement.dataset.palette = id
  }
}
