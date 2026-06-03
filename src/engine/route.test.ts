import { describe, it, expect } from 'vitest'
import type { Point, Puzzle, Wall } from './types'
import { routeTo } from './route'

const p = (x: number, y: number): Point => ({ x, y })
const edge = (a: Point, b: Point): Wall => ({ a, b })

const puzzle = (
  size: number,
  waypoints: Point[],
  walls: Wall[] = [],
): Puzzle => ({ date: '2026-06-03', size, waypoints, walls, seed: 0 })

describe('routeTo', () => {
  it('estende em linha reta até o alvo', () => {
    const pz = puzzle(4, [p(0, 0), p(3, 0)])
    expect(routeTo([p(0, 0)], p(3, 0), pz)).toEqual([
      p(0, 0), p(1, 0), p(2, 0), p(3, 0),
    ])
  })

  it('retrocede quando o alvo já está no traçado', () => {
    const pz = puzzle(4, [p(0, 0), p(3, 0)])
    const path = [p(0, 0), p(1, 0), p(2, 0), p(3, 0)]
    expect(routeTo(path, p(1, 0), pz)).toEqual([p(0, 0), p(1, 0)])
  })

  it('para antes de cruzar uma parede de aresta', () => {
    const pz = puzzle(5, [p(0, 0), p(4, 0)], [edge(p(2, 0), p(3, 0))])
    expect(routeTo([p(0, 0)], p(4, 0), pz)).toEqual([p(0, 0), p(1, 0), p(2, 0)])
  })

  it('não passa do último waypoint', () => {
    const pz = puzzle(4, [p(0, 0), p(2, 0)]) // (2,0) é o último
    expect(routeTo([p(0, 0)], p(3, 0), pz)).toEqual([p(0, 0), p(1, 0), p(2, 0)])
  })

  it('não pisa num waypoint fora de hora', () => {
    // 1=(0,0) 2=(3,3) 3=(0,3): o (0,3) é futuro e bloqueia a extensão.
    const pz = puzzle(4, [p(0, 0), p(3, 3), p(0, 3)])
    expect(routeTo([p(0, 0)], p(0, 3), pz)).toEqual([p(0, 0), p(0, 1), p(0, 2)])
  })

  it('devolve o MESMO array quando o alvo está na diagonal (no-op)', () => {
    const pz = puzzle(4, [p(0, 0), p(3, 3)])
    const path = [p(0, 0)]
    expect(routeTo(path, p(1, 1), pz)).toBe(path)
  })

  it('devolve o MESMO array quando o alvo é a cabeça atual', () => {
    const pz = puzzle(4, [p(0, 0), p(3, 0)])
    const path = [p(0, 0), p(1, 0)]
    expect(routeTo(path, p(1, 0), pz)).toBe(path)
  })
})
