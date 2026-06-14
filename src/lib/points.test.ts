import { describe, it, expect } from 'vitest'
import { dailyPoints } from './points'

describe('dailyPoints', () => {
  it('sem tempo nem refazeres: só a geometria', () => {
    expect(dailyPoints(11, 0, 1)).toEqual({
      geometry: 11,
      timePenalty: 0,
      attemptsPenalty: 0,
      total: 11,
    })
  })

  it('penaliza +1 a cada 30 s', () => {
    expect(dailyPoints(10, 29_999, 1).timePenalty).toBe(0)
    expect(dailyPoints(10, 30_000, 1).timePenalty).toBe(1)
    expect(dailyPoints(10, 95_000, 1).timePenalty).toBe(3)
  })

  it('tempo tem teto de +5', () => {
    expect(dailyPoints(10, 10 * 60_000, 1).timePenalty).toBe(5)
  })

  it('a 1ª tentativa não penaliza; cada refazer soma +5', () => {
    expect(dailyPoints(10, 0, 1).attemptsPenalty).toBe(0)
    expect(dailyPoints(10, 0, 2).attemptsPenalty).toBe(5)
    expect(dailyPoints(10, 0, 4).attemptsPenalty).toBe(15)
  })

  it('tentativas não têm teto', () => {
    expect(dailyPoints(10, 0, 11).attemptsPenalty).toBe(50)
  })

  it('soma tudo no total', () => {
    // geometria 14 + tempo (60s→+2) + tentativas (3ª = 2 refeitas → +10) = 26
    expect(dailyPoints(14, 60_000, 3).total).toBe(26)
  })
})
