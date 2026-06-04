/**
 * Nível do jogador (XP & codinomes) — 100% local, derivado do histórico. Premia
 * a PERFORMANCE: quanto menor os pontos do dia (perto do ideal, rápido, de
 * primeira), mais XP. Fora do engine; nunca afeta o ideal/par.
 */
import type { DayRecord } from './storage'

/** XP por dia: base por concluir + bônus que cai com o "excesso" sobre o ótimo. */
export const XP_BASE = 10
export const XP_PERF_MAX = 20

/** XP do dia a partir dos pontos do dia e do ideal (menor pontos → mais XP). */
export function xpForDay(points: number, ideal: number): number {
  const excess = Math.max(0, points - ideal)
  return XP_BASE + Math.max(0, XP_PERF_MAX - excess)
}

/** Soma o XP de todos os dias concluídos do histórico (sem dupla contagem). */
export function totalXpFromHistory(history: DayRecord[]): number {
  return history
    .filter((r) => r.completed)
    .reduce((sum, r) => sum + xpForDay(r.points ?? r.score, r.par), 0)
}

// --- Curva de nível ---

export const XP_FIRST = 40 // custo do 1º nível (Nv1 → Nv2)
export const XP_GROWTH = 9 // crescimento por nível…
export const XP_CAP = 85 // …até este teto (depois fica ~constante)

/** XP necessário pra subir do nível `level` pro próximo. */
export function xpToNext(level: number): number {
  return Math.min(XP_CAP, XP_FIRST + XP_GROWTH * (level - 1))
}

/** Landmarks com codinome (tema Cosmos). Entre eles vale o codinome do último. */
export const LANDMARKS: ReadonlyArray<{ level: number; name: string }> = [
  { level: 1, name: 'Ponto' },
  { level: 5, name: 'Segmento' },
  { level: 10, name: 'Polígono' },
  { level: 25, name: 'Espiral' },
  { level: 50, name: 'Fractal' },
  { level: 100, name: 'Infinito' },
]

export function codenameForLevel(level: number): string {
  let name = LANDMARKS[0].name
  for (const lm of LANDMARKS) {
    if (level >= lm.level) name = lm.name
  }
  return name
}

/** O nível é um landmark (ganha codinome novo)? */
export function isLandmark(level: number): boolean {
  return LANDMARKS.some((lm) => lm.level === level)
}

export interface LevelInfo {
  level: number
  codename: string
  /** XP acumulado DENTRO do nível atual. */
  xpInLevel: number
  /** XP total necessário pra subir do nível atual. */
  xpForNext: number
  /** XP total acumulado. */
  totalXp: number
}

/** Deriva o nível (e o progresso dentro dele) a partir do XP total. */
export function levelForXp(totalXp: number): LevelInfo {
  let level = 1
  let remaining = Math.max(0, Math.floor(totalXp))
  while (remaining >= xpToNext(level)) {
    remaining -= xpToNext(level)
    level++
  }
  return {
    level,
    codename: codenameForLevel(level),
    xpInLevel: remaining,
    xpForNext: xpToNext(level),
    totalXp: Math.max(0, Math.floor(totalXp)),
  }
}
