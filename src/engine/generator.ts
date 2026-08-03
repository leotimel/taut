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
  /** Quantidade de células proibidas (buracos não-pisáveis). */
  blockedCount: number
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
 * - **Medição (jul/2026):** no 6×6/4wp a densidade de paredes NÃO aumenta o gap —
 *   só eleva a taxa de fallback (mais paredes → mais tabuleiros de gap baixo).
 *   `wallCount 9` mantém ~15% de fallback (igual a 8) com teto de gap um pouco
 *   maior; `wallCount ≥ 10` já sobe pra ~30%. Por isso a dificuldade REAL vem dos
 *   elementos de tabuleiro (célula proibida etc.), não de afinar paredes.
 * - `minParLength 10` garante caminhos mais longos/menos triviais sem custo de
 *   fallback (mede-se igual a 8). `threshold` fica em 6 (acima disso → fallback).
 * - `k` (peso das curvas) deve casar com o resto do app (scorer/pontos).
 */
export const DEFAULT_CONFIG: GeneratorConfig = {
  size: 6,
  waypointCount: 4,
  wallCount: 9,
  blockedCount: 0, // a rampa introduz 1 célula proibida com o tempo (0→1)
  k: 2,
  threshold: 6,
  minParLength: 10,
  maxAttempts: 800,
}

/**
 * Config do **Modo Expert** (2º puzzle diário, opt-in): mais denso que o normal —
 * mais paredes e 2 células proibidas. Sobrepõe a rampa. Aceita mais fallback (a
 * dificuldade aqui é navegar o labirinto fechado, não só o gap).
 */
export const EXPERT_CONFIG: Partial<GeneratorConfig> = {
  wallCount: 11,
  blockedCount: 2,
}

/** Salt de seed do Expert — garante um tabuleiro diferente do normal no mesmo dia. */
export const EXPERT_SALT = ':expert'

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
 * Rampa de dificuldade. Duas alavancas sobem **de leve** com o tempo (grade fixa
 * 6×6):
 * - **Paredes** 9 → 10 (teto baixo DE PROPÓSITO: medimos que paredes demais não
 *   elevam o gap, só a taxa de fallback — ≥11 → ~45%).
 * - **Células proibidas** 0 → 1 (o elemento novo: o traçado contorna um buraco).
 *   Cap em 1 DE PROPÓSITO no normal: medimos que 2 buracos no 6×6 levam ~75% dos
 *   dias a fallback (gap ≤ 4) — o caminho guloso já fica quase no ideal, matando
 *   o loop de otimização. Densidade maior fica pro Expert (Onda 4).
 *
 * `threshold` não sobe (>6 cairia em fallback).
 */
export function rampForDay(
  i: number,
): Pick<GeneratorConfig, 'wallCount' | 'blockedCount'> {
  return {
    wallCount: Math.min(10, 9 + Math.floor(i / 28)), // 9 → 10 após ~4 semanas
    blockedCount: Math.min(1, Math.floor(i / 30)), // 0 → 1 após ~1 mês
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
  const { size, waypointCount, wallCount, blockedCount } = cfg
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

  // Células proibidas: em células livres (nunca sobre waypoints). Se travarem o
  // tabuleiro, o solve falha adiante e o candidato é descartado.
  const blocked: Point[] = []
  for (let i = 0; i < blockedCount; i++) {
    const cell = pickFreeCell(rng, size, usedCells)
    if (cell === null) return null
    usedCells.add(cellId(size, cell))
    blocked.push(cell)
  }

  return { date, size, waypoints, walls, blocked, seed }
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
  seedSalt = '',
): Puzzle {
  const cfg = { ...DEFAULT_CONFIG, ...rampForDay(dayIndex(date)), ...config }
  const seed = hashStringToSeed(date + seedSalt)
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
