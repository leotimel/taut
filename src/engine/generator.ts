/**
 * Gerador do puzzle do dia (o miolo). `generateDaily(date)` é determinístico:
 * deriva uma seed da data e roda um loop generate-and-test usando o solver como
 * ORÁCULO, garantindo que todo tabuleiro tem margem de melhora. TS puro, sem DOM.
 */
import type { Point, Puzzle, Score } from './types'
import { manhattan } from './geometry'
import { score } from './scorer'
import { solve } from './solver'
import { hashStringToSeed, mulberry32 } from './rng'

/** Botões de calibração do gerador (a Fase 5 expõe estes como tuning). */
export interface GeneratorConfig {
  /** Lado da grade quadrada. */
  size: number
  /** Quantidade de waypoints (números a ligar). */
  waypointCount: number
  /** Quantidade de paredes. */
  wallCount: number
  /** Peso das curvas no score (deve casar com o resto do app). */
  k: number
  /** Margem mínima exigida: `custo_guloso − par.total ≥ threshold`. */
  threshold: number
  /** Comprimento mínimo do par (rejeita tabuleiros curtos demais). */
  minParLength: number
  /** Tentativas máximas antes do fallback. */
  maxAttempts: number
}

export const DEFAULT_CONFIG: GeneratorConfig = {
  size: 6,
  waypointCount: 4,
  wallCount: 5,
  k: 2,
  threshold: 4,
  minParLength: 8,
  maxAttempts: 800,
}

type RNG = () => number

const cellId = (size: number, p: Point): number => p.y * size + p.x
const randInt = (rng: RNG, maxExclusive: number): number =>
  Math.floor(rng() * maxExclusive)

/** Sorteia uma célula livre (fora de `used`). Retorna null se não achar. */
function pickFreeCell(rng: RNG, size: number, used: Set<number>): Point | null {
  for (let tries = 0; tries < size * size * 4; tries++) {
    const cell: Point = { x: randInt(rng, size), y: randInt(rng, size) }
    if (!used.has(cellId(size, cell))) return cell
  }
  return null
}

/** Sorteia um tabuleiro candidato (sem checar solubilidade nem gap). */
function drawCandidate(
  rng: RNG,
  cfg: GeneratorConfig,
  date: string,
  seed: number,
): Puzzle | null {
  const { size, waypointCount, wallCount } = cfg
  const used = new Set<number>()

  const waypoints: Point[] = []
  for (let i = 0; i < waypointCount; i++) {
    const cell = pickFreeCell(rng, size, used)
    if (cell === null) return null
    // Waypoints consecutivos não podem ser vizinhos (perna trivial).
    if (i > 0 && manhattan(waypoints[i - 1], cell) < 2) return null
    used.add(cellId(size, cell))
    waypoints.push(cell)
  }

  const walls: Point[] = []
  for (let i = 0; i < wallCount; i++) {
    const cell = pickFreeCell(rng, size, used)
    if (cell === null) return null
    used.add(cellId(size, cell))
    walls.push(cell)
  }

  return { date, size, waypoints, walls, seed }
}

export interface PuzzleAnalysis {
  /** Par (mínimo de length + k·turns). */
  par: Score
  /** Custo do caminho guloso (menor comprimento) medido com o k real. */
  greedyTotal: number
  /** Margem de melhora: `greedyTotal − par.total`. */
  gap: number
}

/**
 * Analisa um puzzle usando o solver como oráculo: par (k real) vs. caminho
 * guloso (= menor comprimento, via solver com k=0). Retorna null se insolúvel.
 */
export function analyzePuzzle(puzzle: Puzzle, k = 2): PuzzleAnalysis | null {
  const par = solve(puzzle, k)
  if (par === null) return null
  const greedy = solve(puzzle, 0)
  if (greedy === null) return null
  const greedyTotal = score(greedy.bestPath, k).total
  return { par: par.par, greedyTotal, gap: greedyTotal - par.par.total }
}

/**
 * Gera o puzzle do dia. Determinístico: a mesma `date` sempre produz o mesmo
 * tabuleiro. Aceita o primeiro candidato solúvel, não-trivial e com
 * `gap ≥ threshold`. Se nenhuma tentativa bater o limiar, devolve o de maior gap
 * (garante que todo dia tem um puzzle).
 */
export function generateDaily(
  date: string,
  config: Partial<GeneratorConfig> = {},
): Puzzle {
  const cfg = { ...DEFAULT_CONFIG, ...config }
  const seed = hashStringToSeed(date)
  const rng = mulberry32(seed)

  let best: { puzzle: Puzzle; gap: number } | null = null

  for (let attempt = 0; attempt < cfg.maxAttempts; attempt++) {
    const candidate = drawCandidate(rng, cfg, date, seed)
    if (candidate === null) continue

    const analysis = analyzePuzzle(candidate, cfg.k)
    if (analysis === null) continue // insolúvel
    if (analysis.par.length < cfg.minParLength) continue // trivial por tamanho

    if (analysis.gap >= cfg.threshold) return candidate
    if (best === null || analysis.gap > best.gap) {
      best = { puzzle: candidate, gap: analysis.gap }
    }
  }

  if (best !== null) return best.puzzle
  throw new Error(`generateDaily: nenhum tabuleiro válido para "${date}"`)
}
