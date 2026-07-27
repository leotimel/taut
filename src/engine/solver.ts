/**
 * Solver — calcula o PAR de um puzzle: o caminho auto-evitante de MENOR score
 * composto (`length + k·turns`) que liga os waypoints na ordem, contornando
 * paredes (barreiras de aresta). Busca exata com branch-and-bound. TS puro.
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
  { x: 1, y: 0 }, // 0: direita
  { x: -1, y: 0 }, // 1: esquerda
  { x: 0, y: 1 }, // 2: baixo
  { x: 0, y: -1 }, // 3: cima
]

/** Índice da direção de um passo unitário (consistente com DIRS). */
function dirIndex(dx: number, dy: number): number {
  if (dx === 1) return 0
  if (dx === -1) return 1
  if (dy === 1) return 2
  return 3
}

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

  // Arestas bloqueadas: blockedEdge[cell*4 + dir] = 1 impede o passo naquela
  // direção. O oposto (dir ^ 1) é bloqueado no vizinho também.
  const blockedEdge = new Uint8Array(size * size * 4)
  for (const w of walls) {
    const dx = w.b.x - w.a.x
    const dy = w.b.y - w.a.y
    if (Math.abs(dx) + Math.abs(dy) !== 1) continue // não-adjacente: ignora
    const inBounds = (p: Point) =>
      p.x >= 0 && p.y >= 0 && p.x < size && p.y < size
    if (!inBounds(w.a) || !inBounds(w.b)) continue
    const di = dirIndex(dx, dy)
    blockedEdge[cellIndex(w.a.x, w.a.y) * 4 + di] = 1
    blockedEdge[cellIndex(w.b.x, w.b.y) * 4 + (di ^ 1)] = 1
  }

  // Mapa célula → índice do waypoint (ou -1). Usado pra travar a ordem.
  const wpAt = new Int16Array(size * size).fill(-1)
  for (let i = 0; i < n; i++) {
    const w = waypoints[i]
    wpAt[cellIndex(w.x, w.y)] = i
  }

  const start = waypoints[0]

  // Somas-sufixo das distâncias de Manhattan entre waypoints consecutivos.
  const suffix = new Array<number>(n).fill(0)
  for (let i = n - 2; i >= 0; i--) {
    suffix[i] = manhattan(waypoints[i], waypoints[i + 1]) + suffix[i + 1]
  }

  const visited = new Uint8Array(size * size)
  // Células proibidas: marca como "visitadas" de saída → o DFS nunca entra nelas.
  for (const b of puzzle.blocked ?? []) {
    if (b.x >= 0 && b.y >= 0 && b.x < size && b.y < size) {
      visited[cellIndex(b.x, b.y)] = 1
    }
  }
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
    if (targetIdx === n) {
      const total = steps + k * turns
      if (total < best) {
        best = total
        bestPath = path.slice()
      }
      return
    }

    const target = waypoints[targetIdx]

    const lengthLB = manhattan(cur, target) + suffix[targetIdx]
    const turnLB = cur.x !== target.x && cur.y !== target.y ? 1 : 0
    if (steps + k * turns + lengthLB + k * turnLB >= best) return

    const curCell = cellIndex(cur.x, cur.y)
    const cands: { p: Point; dx: number; dy: number; turn: number; md: number }[] = []
    for (let di = 0; di < 4; di++) {
      if (blockedEdge[curCell * 4 + di]) continue // parede na aresta
      const d = DIRS[di]
      const nx = cur.x + d.x
      const ny = cur.y + d.y
      if (nx < 0 || ny < 0 || nx >= size || ny >= size) continue
      const id = cellIndex(nx, ny)
      if (visited[id]) continue
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
