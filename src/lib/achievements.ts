/**
 * Conquistas — metas colecionáveis, 100% derivadas do histórico/stats (sem estado
 * próprio). Premiam consistência, precisão e progressão. Fora do engine.
 */
import type { Stats } from './storage'

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

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'debut', name: 'Estreia', desc: 'Conclua seu 1º puzzle', icon: '🎬', check: ({ stats }) => stats.daysPlayed >= 1 },
  { id: 'ideal1', name: 'No ideal', desc: 'Bata o ideal uma vez', icon: '🎯', check: ({ stats }) => stats.parCount >= 1 },
  { id: 'ideal10', name: 'Perfeccionista', desc: 'Bata o ideal 10 vezes', icon: '💎', check: ({ stats }) => stats.parCount >= 10 },
  { id: 'streak7', name: 'Constante', desc: 'Streak de 7 dias', icon: '🔥', check: ({ stats }) => stats.bestStreak >= 7 },
  { id: 'streak30', name: 'Devoto', desc: 'Streak de 30 dias', icon: '🌟', check: ({ stats }) => stats.bestStreak >= 30 },
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
