import { describe, it, expect } from 'vitest'
import type { Point } from './types'
import {
  manhattan,
  areOrthogonallyAdjacent,
  countTurns,
  edgeKey,
} from './geometry'

const p = (x: number, y: number): Point => ({ x, y })

describe('manhattan', () => {
  it('é 0 para a mesma célula', () => {
    expect(manhattan(p(2, 3), p(2, 3))).toBe(0)
  })
  it('é 1 entre vizinhos ortogonais', () => {
    expect(manhattan(p(0, 0), p(1, 0))).toBe(1)
    expect(manhattan(p(0, 0), p(0, 1))).toBe(1)
  })
  it('é 2 na diagonal', () => {
    expect(manhattan(p(0, 0), p(1, 1))).toBe(2)
  })
  it('soma as distâncias nos dois eixos', () => {
    expect(manhattan(p(1, 2), p(4, 6))).toBe(7)
  })
  it('é simétrica', () => {
    expect(manhattan(p(1, 2), p(4, 6))).toBe(manhattan(p(4, 6), p(1, 2)))
  })
})

describe('areOrthogonallyAdjacent', () => {
  it('é true para os 4 vizinhos', () => {
    const c = p(2, 2)
    expect(areOrthogonallyAdjacent(c, p(3, 2))).toBe(true)
    expect(areOrthogonallyAdjacent(c, p(1, 2))).toBe(true)
    expect(areOrthogonallyAdjacent(c, p(2, 3))).toBe(true)
    expect(areOrthogonallyAdjacent(c, p(2, 1))).toBe(true)
  })
  it('é false para a própria célula', () => {
    expect(areOrthogonallyAdjacent(p(2, 2), p(2, 2))).toBe(false)
  })
  it('é false na diagonal', () => {
    expect(areOrthogonallyAdjacent(p(2, 2), p(3, 3))).toBe(false)
  })
  it('é false para células a dois passos', () => {
    expect(areOrthogonallyAdjacent(p(2, 2), p(4, 2))).toBe(false)
  })
})

describe('countTurns', () => {
  it('é 0 para caminhos com menos de 3 células', () => {
    expect(countTurns([])).toBe(0)
    expect(countTurns([p(0, 0)])).toBe(0)
    expect(countTurns([p(0, 0), p(1, 0)])).toBe(0)
  })
  it('é 0 numa reta', () => {
    expect(countTurns([p(0, 0), p(1, 0), p(2, 0), p(3, 0)])).toBe(0)
  })
  it('conta 1 num cotovelo (L)', () => {
    expect(countTurns([p(0, 0), p(1, 0), p(2, 0), p(2, 1)])).toBe(1)
  })
  it('conta 2 num U', () => {
    const u = [p(0, 0), p(0, 1), p(0, 2), p(1, 2), p(2, 2), p(2, 1), p(2, 0)]
    expect(countTurns(u)).toBe(2)
  })
  it('conta cada virada numa escada (zig-zag)', () => {
    const stair = [p(0, 0), p(1, 0), p(1, 1), p(2, 1), p(2, 2)]
    expect(countTurns(stair)).toBe(3)
  })
})

describe('edgeKey', () => {
  it('independe da ordem das células', () => {
    expect(edgeKey(p(1, 2), p(1, 3))).toBe(edgeKey(p(1, 3), p(1, 2)))
  })
  it('arestas diferentes geram chaves diferentes', () => {
    expect(edgeKey(p(1, 2), p(1, 3))).not.toBe(edgeKey(p(1, 2), p(2, 2)))
  })
})
