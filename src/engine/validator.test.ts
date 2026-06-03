import { describe, it, expect } from 'vitest'
import type { Point, Puzzle } from './types'
import { isLegalPath } from './validator'

const p = (x: number, y: number): Point => ({ x, y })

/** Puzzle-base 4×4: 1 em (0,0), 2 em (3,0), 3 em (3,3); uma parede em (1,2). */
const base: Puzzle = {
  date: '2026-06-03',
  size: 4,
  waypoints: [p(0, 0), p(3, 0), p(3, 3)],
  walls: [p(1, 2)],
  seed: 0,
}

/** Caminho legal de referência: contorna a parede, extremos travados. */
const goodPath = [p(0, 0), p(1, 0), p(2, 0), p(3, 0), p(3, 1), p(3, 2), p(3, 3)]

describe('isLegalPath', () => {
  it('aceita um caminho válido', () => {
    expect(isLegalPath(goodPath, base)).toEqual({ legal: true })
  })

  it('rejeita caminho vazio', () => {
    expect(isLegalPath([], base)).toEqual({ legal: false, reason: 'empty' })
  })

  it('rejeita célula fora da grade', () => {
    const path = [p(0, 0), p(0, 1), p(0, 2), p(0, 3), p(0, 4)] // y=4 fora (size 4)
    const r = isLegalPath(path, base)
    expect(r).toMatchObject({ legal: false, reason: 'out-of-bounds', at: p(0, 4) })
  })

  it('rejeita caminho que pisa numa parede', () => {
    const path = [p(0, 0), p(0, 1), p(1, 1), p(1, 2)] // (1,2) é parede
    const r = isLegalPath(path, base)
    expect(r).toMatchObject({ legal: false, reason: 'hits-wall', at: p(1, 2) })
  })

  it('rejeita passo não adjacente (salto)', () => {
    const path = [p(0, 0), p(2, 0)] // pulo de 2
    const r = isLegalPath(path, base)
    expect(r).toMatchObject({ legal: false, reason: 'not-adjacent', at: p(2, 0) })
  })

  it('rejeita cruzamento — volta numa célula já visitada', () => {
    const path = [p(0, 0), p(1, 0), p(1, 1), p(0, 1), p(0, 0)] // fecha o laço
    const r = isLegalPath(path, base)
    expect(r).toMatchObject({
      legal: false,
      reason: 'self-intersecting',
      at: p(0, 0),
    })
  })

  it('rejeita caminho que não começa no waypoint 1', () => {
    // Geometricamente legal, mas começa no 2 e nem inclui o 1.
    const path = [p(3, 0), p(3, 1), p(3, 2), p(3, 3)]
    expect(isLegalPath(path, base)).toEqual({
      legal: false,
      reason: 'waypoints-order',
    })
  })

  it('rejeita waypoints fora de ordem (visita o 3 antes do 2)', () => {
    // 4 waypoints: 1=(0,0) 2=(3,0) 3=(0,3) 4=(3,3); o caminho toca o 3 antes do 2.
    const puzzle: Puzzle = {
      date: '2026-06-03',
      size: 4,
      waypoints: [p(0, 0), p(3, 0), p(0, 3), p(3, 3)],
      walls: [],
      seed: 0,
    }
    const path = [
      p(0, 0), p(0, 1), p(0, 2), p(0, 3), // toca o waypoint 3 (0,3) cedo
      p(1, 3), p(2, 3), p(2, 2), p(2, 1), p(2, 0),
      p(3, 0), // só agora chega no waypoint 2 (3,0)
      p(3, 1), p(3, 2), p(3, 3),
    ]
    expect(isLegalPath(path, puzzle)).toEqual({
      legal: false,
      reason: 'waypoints-order',
    })
  })

  it('aceita um caminho de waypoint único (start = end)', () => {
    const trivial: Puzzle = {
      date: '2026-06-03',
      size: 2,
      waypoints: [p(0, 0)],
      walls: [],
      seed: 0,
    }
    expect(isLegalPath([p(0, 0)], trivial)).toEqual({ legal: true })
  })
})
