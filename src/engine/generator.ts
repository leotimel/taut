/**
 * Gerador do puzzle do dia (o miolo). `generateDaily(date)` é determinístico:
 * deriva uma seed da data e roda um loop generate-and-test usando o solver como
 * ORÁCULO, garantindo que todo tabuleiro tem margem de melhora. TS puro, sem DOM.
 */
import type { Point, Puzzle, Score, Wall } from './types'
import { edgeKey, manhattan } from './geometry'
import { score } from './scorer'
import { solve } from './solver'
import { hashStringToSeed, mulberry32 } from './rng'

/** Botões de calibração do gerador (a Fase 5 expõe estes como tuning). */
export interface GeneratorConfig {
  /** Lado da grade quadrada. */
  size: number
  /** Quantidade de waypoints (números a ligar). */
  waypointCount: number
  /** Quantidade de paredes (barreiras de aresta). */
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

/**
 * Calibração padrão — a SUPERFÍCIE DE TUNING do jogo. Valores escolhidos por
 * medição empírica; limites importantes:
 * - `size` fica em **6**: o solver exato é instantâneo no 6×6, mas estoura no
 *   7×7 (um único solve chega a ~380 ms e a geração a dezenas de segundos).
 * - `waypointCount` em **4**: mais waypoints encurtam as pernas e ESMAGAM o gap
 *   (com 5, o gap trava em ~2), matando a otimização que é o coração do jogo.
 * - `wallCount`/`threshold` são as alavancas de dificuldade (a rampa sobe estes,
 *   ver `rampForDay`). No 6×6 com 4 waypoints o teto de gap fica ~6–10, então
 *   `threshold` acima de ~8 começa a cair em fallback.
 * - `k` (peso das curvas) deve casar com o resto do app (scorer/pontos).
 */
export const DEFAULT_CONFIG: GeneratorConfig = {
  size: 6,
  waypointCount: 4,
  wallCount: 8,
  k: 2,
  threshold: 6,
  minParLength: 8,
  maxAttempts: 800,
}

/** Dia 1 da rampa (mesma data-base do "Taut #N" em `lib/share`). */
export const RAMP_EPOCH = '2026-06-01'

function daysSinceUnixEpoch(date: string): number {
  const [y, m, d] = date.split('-').map(Number)
  return Math.floor(Date.UTC(y, m - 1, d) / 86_400_000)
}

/** Índice do dia (0 = RAMP_EPOCH; antes da época, 0). */
function dayIndex(date: string): number {
  return Math.max(0, daysSinceUnixEpoch(date) - daysSinceUnixEpoch(RAMP_EPOCH))
}

/**
 * Rampa de dificuldade: a DENSIDADE DE PAREDES sobe devagar com o tempo (grade
 * fixa em 6×6). O `threshold` NÃO sobe — medimos que no 6×6 com 4 waypoints o
 * gap raramente passa de 6, então threshold > 6 cairia em fallback (geração
 * lenta). Mais paredes deixam o labirinto mais fechado/torto sem quebrar a
 * geração. Teto verificado por diagnóstico numa faixa de dias.
 */
export function rampForDay(i: number): Pick<GeneratorConfig, 'wallCount'> {
  return {
    wallCount: Math.min(11, 8 + Math.floor(i / 28)), // +1 a cada ~4 semanas, teto 11
  }
}

type RNG = () => number

const DIRS: ReadonlyArray<Point> = [
  { x: 1, y: 0 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: -1 },
]

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

/** Sorteia uma aresta interna ainda não usada. Retorna null se não achar. */
function pickEdge(rng: RNG, size: number, used: Set<string>): Wall | null {
  for (let tries = 0; tries < size * size * 8; tries++) {
    const a: Point = { x: randInt(rng, size), y: randInt(rng, size) }
    const d = DIRS[randInt(rng, 4)]
    const b: Point = { x: a.x + d.x, y: a.y + d.y }
    if (b.x < 0 || b.y < 0 || b.x >= size || b.y >= size) continue
    const ek = edgeKey(a, b)
    if (used.has(ek)) continue
    used.add(ek)
    return { a, b }
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
  const usedCells = new Set<number>()

  const waypoints: Point[] = []
  for (let i = 0; i < waypointCount; i++) {
    const cell = pickFreeCell(rng, size, usedCells)
    if (cell === null) return null
    // Waypoints consecutivos não podem ser vizinhos (perna trivial).
    if (i > 0 && manhattan(waypoints[i - 1], cell) < 2) return null
    usedCells.add(cellId(size, cell))
    waypoints.push(cell)
  }

  const walls: Wall[] = []
  const usedEdges = new Set<string>()
  for (let i = 0; i < wallCount; i++) {
    const edge = pickEdge(rng, size, usedEdges)
    if (edge === null) return null
    walls.push(edge)
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
  const cfg = { ...DEFAULT_CONFIG, ...rampForDay(dayIndex(date)), ...config }
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
