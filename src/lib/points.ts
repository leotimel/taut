/**
 * Pontos do dia — FORA do engine. O par/ideal é puramente geométrico; aqui
 * somamos penalidades pequenas e com teto, que nunca afetam o ideal. Menor é
 * melhor.
 *
 *   pontos = geometria + penalidade de tempo + penalidade de tentativas
 */

/** Cada 30 s vale +1 de penalidade de tempo… */
export const TIME_PENALTY_STEP_MS = 30_000
/** …até no máximo +5. */
export const TIME_PENALTY_MAX = 5
/** Cada refazer além do 1º vale +1, até no máximo +3. */
export const ATTEMPTS_PENALTY_MAX = 3

/** Cada dica (espiar o ideal) custa +4 nos pontos do dia. */
export const HINT_PENALTY = 4

export interface PointsBreakdown {
  geometry: number
  timePenalty: number
  attemptsPenalty: number
  hintsPenalty: number
  total: number
}

/**
 * `dailyPoints(geometria, tempoMs, tentativas)` → detalhamento dos pontos do dia.
 * - tempo: `min(5, ⌊tempoMs / 30000⌋)`
 * - tentativas: `min(3, max(0, tentativas − 1))` (a 1ª tentativa não penaliza)
 */
export function dailyPoints(
  geometry: number,
  elapsedMs: number,
  attempts: number,
  hints = 0,
): PointsBreakdown {
  const timePenalty = Math.min(
    TIME_PENALTY_MAX,
    Math.floor(Math.max(0, elapsedMs) / TIME_PENALTY_STEP_MS),
  )
  const attemptsPenalty = Math.min(
    ATTEMPTS_PENALTY_MAX,
    Math.max(0, attempts - 1),
  )
  const hintsPenalty = Math.max(0, hints) * HINT_PENALTY
  return {
    geometry,
    timePenalty,
    attemptsPenalty,
    hintsPenalty,
    total: geometry + timePenalty + attemptsPenalty + hintsPenalty,
  }
}
