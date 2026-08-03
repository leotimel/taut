import { describe, it, expect } from 'vitest'
import {
  generateDaily,
  analyzePuzzle,
  rampForDay,
  DEFAULT_CONFIG,
  EXPERT_CONFIG,
  EXPERT_SALT,
} from './generator'
import { solve } from './solver'
import { isLegalPath } from './validator'
import { hashStringToSeed } from './rng'
import { manhattan, edgeKey } from './geometry'

const week = [
  '2026-06-01', '2026-06-02', '2026-06-03', '2026-06-04',
  '2026-06-05', '2026-06-06', '2026-06-07',
]

const inBounds = (p: { x: number; y: number }, size: number) =>
  p.x >= 0 && p.y >= 0 && p.x < size && p.y < size

describe('generateDaily', () => {
  it('é determinístico: mesma data → mesmo puzzle', () => {
    expect(generateDaily('2026-06-03')).toEqual(generateDaily('2026-06-03'))
  })

  it('datas diferentes → puzzles diferentes', () => {
    expect(generateDaily('2026-06-03')).not.toEqual(generateDaily('2026-06-04'))
  })

  it('grava a seed derivada da data no puzzle', () => {
    const date = '2026-06-03'
    expect(generateDaily(date).seed).toBe(hashStringToSeed(date))
  })

  it('respeita overrides de config', () => {
    const pz = generateDaily('2026-06-03', { waypointCount: 3 })
    expect(pz.waypoints).toHaveLength(3)
  })

  it('Expert: mais denso (11 paredes + 2 proibidas), solúvel e ≠ do normal', () => {
    for (const date of week) {
      const expert = generateDaily(date, EXPERT_CONFIG, EXPERT_SALT)
      expect(expert.walls).toHaveLength(EXPERT_CONFIG.wallCount!)
      expect(expert.blocked).toHaveLength(EXPERT_CONFIG.blockedCount!)
      expect(solve(expert, DEFAULT_CONFIG.k)).not.toBeNull()
      expect(isLegalPath(solve(expert, DEFAULT_CONFIG.k)!.bestPath, expert).legal).toBe(true)
      // o salt garante um tabuleiro diferente do normal no mesmo dia
      expect(expert).not.toEqual(generateDaily(date))
    }
  })

  it('com células proibidas: válido, solúvel e o par as contorna', () => {
    const pz = generateDaily('2026-06-03', { blockedCount: 2 })
    expect(pz.blocked).toHaveLength(2)
    // proibidas nunca sobre um waypoint
    const wpKeys = new Set(pz.waypoints.map((c) => `${c.x},${c.y}`))
    for (const b of pz.blocked!) expect(wpKeys.has(`${b.x},${b.y}`)).toBe(false)
    // solúvel e o par (ótimo) é um caminho legal → não pisa nas proibidas
    const sol = solve(pz, DEFAULT_CONFIG.k)
    expect(sol).not.toBeNull()
    expect(isLegalPath(sol!.bestPath, pz).legal).toBe(true)
  })

  describe('rampForDay (rampa de dificuldade)', () => {
    it('paredes: começa em 9 e sobe devagar até o teto 10', () => {
      expect(rampForDay(0).wallCount).toBe(9)
      expect(rampForDay(28).wallCount).toBe(10)
      expect(rampForDay(300).wallCount).toBe(10)
    })
    it('células proibidas: 0 no começo, 1 após ~1 mês (teto 1 no normal)', () => {
      expect(rampForDay(0).blockedCount).toBe(0)
      expect(rampForDay(30).blockedCount).toBe(1)
      expect(rampForDay(300).blockedCount).toBe(1)
    })
    it('é monotônica não-decrescente (paredes e proibidas)', () => {
      let prevW = 0
      let prevB = 0
      for (let i = 0; i < 400; i += 7) {
        const { wallCount, blockedCount } = rampForDay(i)
        expect(wallCount).toBeGreaterThanOrEqual(prevW)
        expect(blockedCount).toBeGreaterThanOrEqual(prevB)
        prevW = wallCount
        prevB = blockedCount
      }
    })
  })

  describe('uma semana de tabuleiros é válida, solúvel e não-trivial', () => {
    for (const date of week) {
      it(date, () => {
        const pz = generateDaily(date)
        const { size, waypoints, walls } = pz

        // Estrutura
        expect(size).toBe(DEFAULT_CONFIG.size)
        expect(waypoints).toHaveLength(DEFAULT_CONFIG.waypointCount)
        expect(walls).toHaveLength(DEFAULT_CONFIG.wallCount)

        // Waypoints: dentro da grade e distintos
        for (const c of waypoints) expect(inBounds(c, size)).toBe(true)
        const wpKeys = waypoints.map((c) => `${c.x},${c.y}`)
        expect(new Set(wpKeys).size).toBe(wpKeys.length)

        // Paredes: arestas válidas (vizinhas, dentro da grade) e distintas
        for (const w of walls) {
          expect(inBounds(w.a, size)).toBe(true)
          expect(inBounds(w.b, size)).toBe(true)
          expect(manhattan(w.a, w.b)).toBe(1)
        }
        const wallKeys = walls.map((w) => edgeKey(w.a, w.b))
        expect(new Set(wallKeys).size).toBe(wallKeys.length)

        // Solúvel
        expect(solve(pz, DEFAULT_CONFIG.k)).not.toBeNull()

        // Não-trivial: há margem de melhora e o par não é curto demais
        const analysis = analyzePuzzle(pz, DEFAULT_CONFIG.k)!
        expect(analysis.gap).toBeGreaterThanOrEqual(DEFAULT_CONFIG.threshold)
        expect(analysis.par.length).toBeGreaterThanOrEqual(DEFAULT_CONFIG.minParLength)
      })
    }
  })
})
