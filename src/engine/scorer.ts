/**
 * Score do caminho — puramente GEOMÉTRICO e time-agnostic. O engine não conhece
 * tempo; a penalidade de tempo (pontos do dia) vive na camada do app (`lib/`).
 */
import type { Path, Score } from './types'
import { countTurns } from './geometry'

/**
 * `score(path, k)` → `{ length, turns, total }`.
 * - `length` = nº de passos (um caminho de N células tem N−1 passos).
 * - `turns`  = nº de curvas (`countTurns`).
 * - `total`  = `length + k·turns` (k=2 por padrão; menor é melhor).
 */
export function score(path: Path, k = 2): Score {
  const length = Math.max(0, path.length - 1)
  const turns = countTurns(path)
  return { length, turns, total: length + k * turns }
}
