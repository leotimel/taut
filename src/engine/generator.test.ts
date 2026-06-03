import { describe, it, expect } from 'vitest'
import {
  generateDaily,
  analyzePuzzle,
  DEFAULT_CONFIG,
} from './generator'
import { solve } from './solver'
import { hashStringToSeed } from './rng'

const week = [
  '2026-06-01', '2026-06-02', '2026-06-03', '2026-06-04',
  '2026-06-05', '2026-06-06', '2026-06-07',
]

const cellKey = (p: { x: number; y: number }) => `${p.x},${p.y}`

describe('generateDaily', () => {
  it('é determinístico: mesma data → mesmo puzzle', () => {
    expect(generateDaily('2026-06-03')).toEqual(generateDaily('2026-06-03'))
  })

  it('datas diferentes → puzzles diferentes', () => {
    const a = generateDaily('2026-06-03')
    const b = generateDaily('2026-06-04')
    expect(a).not.toEqual(b)
  })

  it('grava a seed derivada da data no puzzle', () => {
    const date = '2026-06-03'
    expect(generateDaily(date).seed).toBe(hashStringToSeed(date))
  })

  it('respeita overrides de config', () => {
    const pz = generateDaily('2026-06-03', { waypointCount: 3 })
    expect(pz.waypoints).toHaveLength(3)
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

        // Tudo dentro da grade
        for (const c of [...waypoints, ...walls]) {
          expect(c.x).toBeGreaterThanOrEqual(0)
          expect(c.y).toBeGreaterThanOrEqual(0)
          expect(c.x).toBeLessThan(size)
          expect(c.y).toBeLessThan(size)
        }

        // Células distintas (waypoints e paredes não se sobrepõem)
        const keys = [...waypoints, ...walls].map(cellKey)
        expect(new Set(keys).size).toBe(keys.length)

        // Solúvel
        const solved = solve(pz, DEFAULT_CONFIG.k)
        expect(solved).not.toBeNull()

        // Não-trivial: há margem de melhora e o par não é curto demais
        const analysis = analyzePuzzle(pz, DEFAULT_CONFIG.k)!
        expect(analysis.gap).toBeGreaterThanOrEqual(DEFAULT_CONFIG.threshold)
        expect(analysis.par.length).toBeGreaterThanOrEqual(DEFAULT_CONFIG.minParLength)
      })
    }
  })
})
