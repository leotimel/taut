import { describe, it, expect } from 'vitest'
import type { DayRecord } from './storage'
import {
  xpForDay,
  totalXpFromHistory,
  xpToNext,
  levelForXp,
  codenameForLevel,
  isLandmark,
} from './level'

describe('xpForDay', () => {
  it('dia perfeito (pontos == ideal) dá o máximo', () => {
    expect(xpForDay(11, 11)).toBe(30) // 10 base + 20 perf
  })
  it('cai 1 XP por ponto de excesso', () => {
    expect(xpForDay(17, 11)).toBe(24) // excesso 6 → 10 + 14
  })
  it('piso no base por concluir', () => {
    expect(xpForDay(40, 11)).toBe(10) // excesso 29 → 10 + 0
  })
})

describe('xpToNext', () => {
  it('barato no começo e satura no teto 85', () => {
    expect(xpToNext(1)).toBe(40)
    expect(xpToNext(6)).toBe(85)
    expect(xpToNext(20)).toBe(85)
  })
})

describe('levelForXp', () => {
  it('0 XP = nível 1', () => {
    const l = levelForXp(0)
    expect(l.level).toBe(1)
    expect(l.xpInLevel).toBe(0)
    expect(l.xpForNext).toBe(40)
  })
  it('sobe ao cruzar o custo do nível', () => {
    expect(levelForXp(39).level).toBe(1)
    expect(levelForXp(40).level).toBe(2)
    expect(levelForXp(40).xpInLevel).toBe(0)
  })
  it('acumula corretamente (Nv1→2:40, 2→3:49, 3→4:58; cum=147)', () => {
    expect(levelForXp(146).level).toBe(3)
    expect(levelForXp(147).level).toBe(4)
  })
})

describe('codinomes (Cosmos)', () => {
  it('mapeia os landmarks; entre eles vale o último', () => {
    expect(codenameForLevel(1)).toBe('Ponto')
    expect(codenameForLevel(4)).toBe('Ponto')
    expect(codenameForLevel(5)).toBe('Segmento')
    expect(codenameForLevel(10)).toBe('Polígono')
    expect(codenameForLevel(25)).toBe('Espiral')
    expect(codenameForLevel(50)).toBe('Fractal')
    expect(codenameForLevel(120)).toBe('Infinito')
  })
  it('isLandmark', () => {
    expect(isLandmark(5)).toBe(true)
    expect(isLandmark(6)).toBe(false)
  })
})

describe('totalXpFromHistory', () => {
  it('soma só os concluídos, usando points (ou score como fallback)', () => {
    const h: DayRecord[] = [
      { date: '2026-06-01', score: 11, par: 11, completed: true, points: 11 }, // 30
      { date: '2026-06-02', score: 14, par: 11, completed: true, points: 17 }, // 24
      { date: '2026-06-03', score: 11, par: 11, completed: false }, // ignora
      { date: '2026-06-04', score: 13, par: 11, completed: true }, // sem points → score 13 → 28
    ]
    expect(totalXpFromHistory(h)).toBe(30 + 24 + 28)
  })
})
