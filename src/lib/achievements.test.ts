import { describe, it, expect } from 'vitest'
import type { Stats } from './storage'
import { ACHIEVEMENTS, unlockedCount, isUnlocked } from './achievements'

const stats = (over: Partial<Stats>): Stats => ({
  currentStreak: 0,
  bestStreak: 0,
  daysPlayed: 0,
  parCount: 0,
  freezes: 0,
  history: [],
  ...over,
})

describe('achievements', () => {
  it('nada desbloqueado no começo', () => {
    expect(unlockedCount({ stats: stats({}), level: 1 })).toBe(0)
  })

  it('Estreia ao concluir o 1º dia', () => {
    const debut = ACHIEVEMENTS.find((a) => a.id === 'debut')!
    expect(isUnlocked(debut, { stats: stats({ daysPlayed: 1 }), level: 1 })).toBe(true)
  })

  it('conquista de nível respeita o nível', () => {
    const lv5 = ACHIEVEMENTS.find((a) => a.id === 'level5')!
    expect(isUnlocked(lv5, { stats: stats({}), level: 4 })).toBe(false)
    expect(isUnlocked(lv5, { stats: stats({}), level: 5 })).toBe(true)
  })

  it('conta várias corretamente', () => {
    const ctx = {
      stats: stats({ daysPlayed: 30, parCount: 10, bestStreak: 7 }),
      level: 10,
    }
    // debut, ideal1, ideal10, streak7, days30, level5, level10 = 7
    expect(unlockedCount(ctx)).toBe(7)
  })
})
