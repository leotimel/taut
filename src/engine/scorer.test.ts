import { describe, it, expect } from 'vitest'
import type { Point } from './types'
import { score } from './scorer'

const p = (x: number, y: number): Point => ({ x, y })

describe('score', () => {
  it('reta: só comprimento, sem curvas', () => {
    // 4 células → 3 passos, 0 curvas, total 3
    expect(score([p(0, 0), p(1, 0), p(2, 0), p(3, 0)])).toEqual({
      length: 3,
      turns: 0,
      total: 3,
    })
  })

  it('cotovelo (L): 1 curva pesa k=2', () => {
    // 4 células → 3 passos, 1 curva, total 3 + 2·1 = 5
    expect(score([p(0, 0), p(1, 0), p(2, 0), p(2, 1)])).toEqual({
      length: 3,
      turns: 1,
      total: 5,
    })
  })

  it('U: 6 passos e 2 curvas', () => {
    const u = [p(0, 0), p(0, 1), p(0, 2), p(1, 2), p(2, 2), p(2, 1), p(2, 0)]
    expect(score(u)).toEqual({ length: 6, turns: 2, total: 10 })
  })

  it('escada: 4 passos e 3 curvas', () => {
    const stair = [p(0, 0), p(1, 0), p(1, 1), p(2, 1), p(2, 2)]
    expect(score(stair)).toEqual({ length: 4, turns: 3, total: 10 })
  })

  it('caminho de 1 célula: tudo zero', () => {
    expect(score([p(2, 2)])).toEqual({ length: 0, turns: 0, total: 0 })
  })

  it('caminho vazio: tudo zero', () => {
    expect(score([])).toEqual({ length: 0, turns: 0, total: 0 })
  })

  it('respeita um k customizado', () => {
    const l = [p(0, 0), p(1, 0), p(2, 0), p(2, 1)] // length 3, turns 1
    expect(score(l, 3).total).toBe(6) // 3 + 3·1
    expect(score(l, 0).total).toBe(3) // curvas não pesam
  })

  it('usa k=2 por padrão quando omitido', () => {
    const l = [p(0, 0), p(1, 0), p(2, 0), p(2, 1)]
    expect(score(l).total).toBe(score(l, 2).total)
  })
})
