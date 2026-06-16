/**
 * Conquistas — metas colecionáveis, 100% derivadas do histórico/stats (sem estado
 * próprio). Premiam consistência, precisão e progressão. Fora do engine.
 */
import type { DayRecord, Stats } from './storage'

export interface AchievementCtx {
  stats: Stats
  level: number
}

export interface Achievement {
  id: string
  name: string
  desc: string
  icon: string
  check: (ctx: AchievementCtx) => boolean
}

function dayNum(date: string): number {
  const [y, m, d] = date.split('-').map(Number)
  return Math.floor(Date.UTC(y, m - 1, d) / 86_400_000)
}

/** Maior sequência de dias CONSECUTIVOS batendo o ideal (`score === par`). */
export function maxIdealStreak(history: DayRecord[]): number {
  const days = history
    .filter((r) => r.completed && r.score === r.par)
    .map((r) => dayNum(r.date))
    .sort((a, b) => a - b)
  let best = 0
  let run = 0
  let prev: number | null = null
  for (const n of days) {
    if (n === prev) continue // dia duplicado — ignora
    run = prev !== null && n === prev + 1 ? run + 1 : 1
    if (run > best) best = run
    prev = n
  }
  return best
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'debut', name: 'Estreia', desc: 'Conclua seu 1º puzzle', icon: '🎬', check: ({ stats }) => stats.daysPlayed >= 1 },
  { id: 'ideal1', name: 'No ideal', desc: 'Bata o ideal uma vez', icon: '🎯', check: ({ stats }) => stats.parCount >= 1 },
  { id: 'ideal3', name: 'No alvo', desc: 'Bata o ideal 3 vezes', icon: '🏹', check: ({ stats }) => stats.parCount >= 3 },
  { id: 'ideal10', name: 'Perfeccionista', desc: 'Bata o ideal 10 vezes', icon: '💎', check: ({ stats }) => stats.parCount >= 10 },
  { id: 'ideal25', name: 'Ourives', desc: 'Bata o ideal 25 vezes', icon: '💠', check: ({ stats }) => stats.parCount >= 25 },
  { id: 'ideal50', name: 'Lendário', desc: 'Bata o ideal 50 vezes', icon: '👑', check: ({ stats }) => stats.parCount >= 50 },
  { id: 'streak7', name: 'Constante', desc: 'Streak de 7 dias', icon: '🔥', check: ({ stats }) => stats.bestStreak >= 7 },
  { id: 'streak14', name: 'Persistente', desc: 'Streak de 14 dias', icon: '📆', check: ({ stats }) => stats.bestStreak >= 14 },
  { id: 'streak30', name: 'Devoto', desc: 'Streak de 30 dias', icon: '🌟', check: ({ stats }) => stats.bestStreak >= 30 },
  { id: 'streak50', name: 'Tenaz', desc: 'Streak de 50 dias', icon: '🪨', check: ({ stats }) => stats.bestStreak >= 50 },
  { id: 'streak100', name: 'Inabalável', desc: 'Streak de 100 dias', icon: '⛰️', check: ({ stats }) => stats.bestStreak >= 100 },
  { id: 'streak150', name: 'Colosso', desc: 'Streak de 150 dias', icon: '🗿', check: ({ stats }) => stats.bestStreak >= 150 },
  { id: 'streak250', name: 'Titã', desc: 'Streak de 250 dias', icon: '🌋', check: ({ stats }) => stats.bestStreak >= 250 },
  { id: 'streak365', name: 'Imortal', desc: 'Streak de 365 dias', icon: '🐉', check: ({ stats }) => stats.bestStreak >= 365 },
  { id: 'consec3', name: 'Em série', desc: '3 ideais seguidos', icon: '⚡', check: ({ stats }) => maxIdealStreak(stats.history) >= 3 },
  { id: 'consec7', name: 'Impecável', desc: '7 ideais seguidos', icon: '💫', check: ({ stats }) => maxIdealStreak(stats.history) >= 7 },
  { id: 'days30', name: 'Veterano', desc: 'Jogue 30 dias', icon: '🏅', check: ({ stats }) => stats.daysPlayed >= 30 },
  { id: 'days100', name: 'Centurião', desc: 'Jogue 100 dias', icon: '🏆', check: ({ stats }) => stats.daysPlayed >= 100 },
  { id: 'level5', name: 'Segmento', desc: 'Alcance o Nível 5', icon: '🌌', check: ({ level }) => level >= 5 },
  { id: 'level10', name: 'Polígono', desc: 'Alcance o Nível 10', icon: '✨', check: ({ level }) => level >= 10 },
]

/** Quantas conquistas estão desbloqueadas dado o contexto. */
export function unlockedCount(ctx: AchievementCtx): number {
  return ACHIEVEMENTS.reduce((n, a) => (a.check(ctx) ? n + 1 : n), 0)
}

export function isUnlocked(a: Achievement, ctx: AchievementCtx): boolean {
  return a.check(ctx)
}
