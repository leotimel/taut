/**
 * Solver — calcula o PAR de um puzzle: o caminho auto-evitante de MENOR score
 * composto (`length + k·turns`) que liga os waypoints na ordem, contornando
 * paredes. Busca exata com branch-and-bound. TypeScript puro, sem DOM.
 *
 * É time-agnostic: o par é puramente geométrico (o tempo nunca entra aqui).
 */
import type { Path, Point, Puzzle, Score } from './types'
import { manhattan } from './geometry'
import { score } from './scorer'

export interface SolveResult {
  par: Score
  bestPath: Path
}

const DIRS: ReadonlyArray<Point> = [
  { x: 1, y: 0 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: -1 },
]

/**
 * Encontra o par. Retorna `null` se o puzzle for insolúvel.
 *
 * Poda por cota inferior admissível: comprimento restante ≥ Manhattan até o
 * próximo waypoint + soma das Manhattan entre os waypoints ainda não visitados;
 * mais ≥1 curva quando o alvo difere nos dois eixos. Como a cota nunca
 * superestima, a primeira solução de menor custo encontrada é o ótimo.
 */
export function solve(puzzle: Puzzle, k = 2): SolveResult | null {
  const { size, waypoints, walls } = puzzle
  const n = waypoints.length
  if (n === 0) return null

  const cellIndex = (x: number, y: number): number => y * size + x

  const blocked = new Uint8Array(size * size)
  for (const w of walls) {
    if (w.x >= 0 && w.y >= 0 && w.x < size && w.y < size) {
      blocked[cellIndex(w.x, w.y)] = 1
    }
  }

  // Mapa célula → índice do waypoint (ou -1). Usado pra travar a ordem.
  const wpAt = new Int16Array(size * size).fill(-1)
  for (let i = 0; i < n; i++) {
    const w = waypoints[i]
    wpAt[cellIndex(w.x, w.y)] = i
  }

  const start = waypoints[0]
  if (blocked[cellIndex(start.x, start.y)]) return null

  // Somas-sufixo das distâncias de Manhattan entre waypoints consecutivos:
  // suffix[i] = distância mínima de wp[i] até wp[n-1] passando pelos do meio.
  const suffix = new Array<number>(n).fill(0)
  for (let i = n - 2; i >= 0; i--) {
    suffix[i] = manhattan(waypoints[i], waypoints[i + 1]) + suffix[i + 1]
  }

  const visited = new Uint8Array(size * size)
  const path: Point[] = [start]
  visited[cellIndex(start.x, start.y)] = 1

  let best = Infinity
  let bestPath: Point[] | null = null

  function dfs(
    cur: Point,
    lastDx: number,
    lastDy: number,
    hasDir: boolean,
    steps: number,
    turns: number,
    targetIdx: number,
  ): void {
    // Todos os waypoints alcançados (terminamos exatamente no último).
    if (targetIdx === n) {
      const total = steps + k * turns
      if (total < best) {
        best = total
        bestPath = path.slice()
      }
      return
    }

    const target = waypoints[targetIdx]

    // Cota inferior admissível do que falta.
    const lengthLB = manhattan(cur, target) + suffix[targetIdx]
    const turnLB = cur.x !== target.x && cur.y !== target.y ? 1 : 0
    if (steps + k * turns + lengthLB + k * turnLB >= best) return

    // Coleta os vizinhos legais e ordena pra achar bom incumbente cedo.
    const cands: { p: Point; dx: number; dy: number; turn: number; md: number }[] = []
    for (const d of DIRS) {
      const nx = cur.x + d.x
      const ny = cur.y + d.y
      if (nx < 0 || ny < 0 || nx >= size || ny >= size) continue
      const id = cellIndex(nx, ny)
      if (blocked[id] || visited[id]) continue
      const w = wpAt[id]
      if (w >= 0 && w !== targetIdx) continue // waypoint fora de hora: proibido
      const turn = hasDir && (d.x !== lastDx || d.y !== lastDy) ? 1 : 0
      const md = Math.abs(nx - target.x) + Math.abs(ny - target.y)
      cands.push({ p: { x: nx, y: ny }, dx: d.x, dy: d.y, turn, md })
    }
    cands.sort((a, b) => a.turn - b.turn || a.md - b.md)

    for (const c of cands) {
      const id = cellIndex(c.p.x, c.p.y)
      visited[id] = 1
      path.push(c.p)
      const reached = c.p.x === target.x && c.p.y === target.y
      dfs(c.p, c.dx, c.dy, true, steps + 1, turns + c.turn, reached ? targetIdx + 1 : targetIdx)
      path.pop()
      visited[id] = 0
    }
  }

  dfs(start, 0, 0, false, 0, 0, 1)

  const result = bestPath
  if (result === null) return null
  return { par: score(result, k), bestPath: result }
}
