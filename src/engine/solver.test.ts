import { describe, it, expect } from 'vitest'
import type { Point, Puzzle, Wall } from './types'
import { solve } from './solver'
import { score } from './scorer'
import { isLegalPath } from './validator'

const p = (x: number, y: number): Point => ({ x, y })
const edge = (a: Point, b: Point): Wall => ({ a, b })

const puzzle = (
  size: number,
  waypoints: Point[],
  walls: Wall[] = [],
): Puzzle => ({ date: '2026-06-03', size, waypoints, walls, seed: 0 })

describe('solve', () => {
  it('reta entre 2 waypoints: total 2, sem curvas', () => {
    const r = solve(puzzle(3, [p(0, 0), p(2, 0)]))
    expect(r).not.toBeNull()
    expect(r!.par).toEqual({ length: 2, turns: 0, total: 2 })
    expect(r!.bestPath).toEqual([p(0, 0), p(1, 0), p(2, 0)])
  })

  it('canto (L): comprimento 4 + 1 curva = total 6', () => {
    const r = solve(puzzle(3, [p(0, 0), p(2, 2)]))
    expect(r!.par).toEqual({ length: 4, turns: 1, total: 6 })
  })

  it('desvio obrigatório por parede de aresta: total 8', () => {
    // Barreira em (1,0)|(2,0) bloqueia a reta; a volta custa 4 passos e 2 curvas.
    const r = solve(puzzle(3, [p(0, 0), p(2, 0)], [edge(p(1, 0), p(2, 0))]))
    expect(r!.par).toEqual({ length: 4, turns: 2, total: 8 })
  })

  it('contorna célula proibida: a reta vira desvio (total 8)', () => {
    // (0,0)→(2,0) seria reta (total 2), mas (1,0) é proibida → desce e volta.
    const pz: Puzzle = {
      date: '2026-06-03',
      size: 3,
      waypoints: [p(0, 0), p(2, 0)],
      walls: [],
      blocked: [p(1, 0)],
      seed: 0,
    }
    const r = solve(pz)!
    expect(r).not.toBeNull()
    expect(isLegalPath(r.bestPath, pz)).toEqual({ legal: true })
    expect(r.bestPath.some((c) => c.x === 1 && c.y === 0)).toBe(false)
    expect(r.par).toEqual({ length: 4, turns: 2, total: 8 })
  })

  it('3 waypoints em L: total 6 (uma curva no waypoint do meio)', () => {
    const r = solve(puzzle(3, [p(0, 0), p(2, 0), p(2, 2)]))
    expect(r!.par).toEqual({ length: 4, turns: 1, total: 6 })
  })

  it('retorna null quando insolúvel (arestas isolam a coluna)', () => {
    const walls = [
      edge(p(1, 0), p(2, 0)),
      edge(p(1, 1), p(2, 1)),
      edge(p(1, 2), p(2, 2)),
    ]
    const r = solve(puzzle(3, [p(0, 0), p(2, 0)], walls))
    expect(r).toBeNull()
  })

  it('o bestPath é legal e o par bate com o scorer', () => {
    const pz = puzzle(4, [p(0, 0), p(3, 0), p(3, 3)], [edge(p(1, 1), p(2, 1))])
    const r = solve(pz)!
    expect(isLegalPath(r.bestPath, pz)).toEqual({ legal: true })
    expect(score(r.bestPath, 2)).toEqual(r.par)
  })

  it('é determinístico (mesmo puzzle → mesmo bestPath)', () => {
    const pz = puzzle(5, [p(0, 0), p(4, 1), p(2, 4)], [edge(p(2, 2), p(2, 3))])
    expect(solve(pz)).toEqual(solve(pz))
  })

  it('respeita k: curvas pesam mais com k maior', () => {
    const pz = puzzle(3, [p(0, 0), p(2, 2)])
    expect(solve(pz, 2)!.par.total).toBe(6) // 4 + 2·1
    expect(solve(pz, 5)!.par.total).toBe(9) // 4 + 5·1
  })

  it('resolve um 6×6 com paredes em bem menos de 100ms', () => {
    const pz = puzzle(
      6,
      [p(0, 0), p(5, 0), p(5, 5), p(0, 5)],
      [
        edge(p(2, 2), p(3, 2)),
        edge(p(2, 3), p(3, 3)),
        edge(p(2, 2), p(2, 3)),
        edge(p(3, 2), p(3, 3)),
      ],
    )
    const t0 = performance.now()
    const r = solve(pz)
    const ms = performance.now() - t0
    expect(r).not.toBeNull()
    expect(isLegalPath(r!.bestPath, pz)).toEqual({ legal: true })
    expect(score(r!.bestPath, 2)).toEqual(r!.par)
    expect(ms).toBeLessThan(100)
  })
})
