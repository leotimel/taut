import { describe, it, expect } from 'vitest'
import type { DayRecord, Stats } from './storage'
import { ACHIEVEMENTS, unlockedCount, isUnlocked, maxIdealStreak } from './achievements'

const stats = (over: Partial<Stats>): Stats => ({
  currentStreak: 0,
  bestStreak: 0,
  daysPlayed: 0,
  parCount: 0,
  freezes: 0,
  history: [],
  ...over,
})

const rec = (date: string, score: number, par: number): DayRecord => ({
  date,
  score,
  par,
  completed: true,
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
    // debut, ideal1, ideal3, ideal10, streak7, days30, level5, level10 = 8
    expect(unlockedCount(ctx)).toBe(8)
  })

  it('maxIdealStreak conta dias consecutivos no ideal', () => {
    const history = [
      rec('2026-06-01', 5, 5), // ideal
      rec('2026-06-02', 6, 5), // não-ideal → quebra
      rec('2026-06-03', 5, 5), // ideal
      rec('2026-06-04', 5, 5), // ideal
      rec('2026-06-05', 5, 5), // ideal → run de 3
      rec('2026-06-07', 5, 5), // ideal, mas pulou o dia 6 → reinicia
    ]
    expect(maxIdealStreak(history)).toBe(3)
    expect(maxIdealStreak([])).toBe(0)
  })

  it('Ideais seguidos desbloqueia com 3 ideais consecutivos', () => {
    const consec3 = ACHIEVEMENTS.find((a) => a.id === 'consec3')!
    const history = [rec('2026-06-01', 5, 5), rec('2026-06-02', 5, 5), rec('2026-06-03', 5, 5)]
    expect(isUnlocked(consec3, { stats: stats({ history }), level: 1 })).toBe(true)
    expect(isUnlocked(consec3, { stats: stats({ history: history.slice(0, 2) }), level: 1 })).toBe(false)
  })
})
