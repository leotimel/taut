// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { buildShareText, puzzleNumber, share, TAUT_EPOCH } from './share'

const base = {
  date: '2026-06-04',
  points: 14,
  elapsedMs: 83_000, // 1:23
  streak: 3,
  geometry: 13,
  ideal: 11,
}

describe('puzzleNumber', () => {
  it('TAUT_EPOCH é o dia 1', () => {
    expect(puzzleNumber(TAUT_EPOCH)).toBe(1)
  })
  it('conta os dias corretamente', () => {
    expect(puzzleNumber('2026-06-04')).toBe(4)
  })
})

describe('buildShareText', () => {
  it('cabeçalho no formato certo e SEM revelar o ideal', () => {
    const txt = buildShareText(base)
    expect(txt).toContain('Taut #4 · 14 pts · ⏱1:23 · 🔥3')
    expect(txt).not.toContain('11') // o valor do ideal nunca aparece
  })
  it('barra cheia quando bate no ideal', () => {
    expect(buildShareText({ ...base, geometry: 11, ideal: 11 })).toContain('🟦🟦🟦🟦🟦')
  })
  it('perde um bloco por ponto de geometria acima do ideal', () => {
    expect(buildShareText({ ...base, geometry: 13, ideal: 11 })).toContain('🟦🟦🟦⬜⬜')
  })
  it('barra vazia quando muito acima do ideal', () => {
    expect(buildShareText({ ...base, geometry: 20, ideal: 11 })).toContain('⬜⬜⬜⬜⬜')
  })
})

describe('share', () => {
  it('copia pro clipboard quando não há share nativo', async () => {
    Object.defineProperty(navigator, 'share', { value: undefined, configurable: true })
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    })
    const r = await share('oi')
    expect(r).toBe('copied')
    expect(writeText).toHaveBeenCalledWith('oi')
  })
})
