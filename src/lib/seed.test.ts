import { describe, it, expect } from 'vitest'
import { rngFromDate, hashStringToSeed } from './seed'

describe('rngFromDate', () => {
  it('é determinístico pela data', () => {
    const a = rngFromDate('2026-06-03')
    const b = rngFromDate('2026-06-03')
    expect([a(), a(), a()]).toEqual([b(), b(), b()])
  })

  it('datas diferentes geram sequências diferentes', () => {
    const a = rngFromDate('2026-06-03')
    const b = rngFromDate('2026-06-04')
    expect(a()).not.toBe(b())
  })

  it('produz floats em [0, 1)', () => {
    const r = rngFromDate('2026-06-03')
    for (let i = 0; i < 100; i++) {
      const v = r()
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })

  it('re-exporta o hash do engine', () => {
    expect(typeof hashStringToSeed('x')).toBe('number')
  })
})
