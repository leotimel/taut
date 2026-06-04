/**
 * Navegação do traçado — a lógica de "para onde o dedo arrastou" como função
 * pura (sem DOM), pra ser testável e reusada pela UI e pelo hook.
 *
 * `routeTo` recebe o caminho atual e a célula-alvo sob o ponteiro e devolve o
 * novo caminho: retrocede se o alvo já está no traçado, ou estende em linha reta
 * (mesma linha/coluna) enquanto cada passo for legal, parando no último
 * waypoint. Se nada muda, devolve o MESMO array (pra o chamador detectar no-op).
 */
import type { Path, Point, Puzzle } from './types'
import { edgeKey, pointKey, samePoint } from './geometry'

export function routeTo(path: Path, target: Point, puzzle: Puzzle): Path {
  if (path.length === 0) return path
  const { size, walls, waypoints } = puzzle

  // O alvo já está no traçado → retrocede até ele (desfazer arrastando de volta).
  const idx = path.findIndex((c) => samePoint(c, target))
  if (idx !== -1) {
    return idx < path.length - 1 ? path.slice(0, idx + 1) : path
  }

  const last = path[path.length - 1]
  // Só estende em linha reta (mesma linha ou coluna).
  if (target.x !== last.x && target.y !== last.y) return path
  if (target.x < 0 || target.y < 0 || target.x >= size || target.y >= size) return path

  const wallSet = new Set(walls.map((w) => edgeKey(w.a, w.b)))
  const wpIndex = new Map<string, number>()
  waypoints.forEach((w, i) => wpIndex.set(pointKey(w), i))

  const visited = new Set(path.map(pointKey))
  let reached = 0
  while (reached < waypoints.length && visited.has(pointKey(waypoints[reached])))
    reached++

  const lastWp = waypoints[waypoints.length - 1]
  const additions: Point[] = []
  let curr = last
  const dx = Math.sign(target.x - curr.x)
  const dy = Math.sign(target.y - curr.y)
  while (!(curr.x === target.x && curr.y === target.y)) {
    const next: Point = { x: curr.x + dx, y: curr.y + dy }
    if (wallSet.has(edgeKey(curr, next))) break // parede na aresta
    const nk = pointKey(next)
    if (visited.has(nk)) break // auto-evitante
    const wi = wpIndex.get(nk)
    if (wi !== undefined && wi !== reached) break // waypoint fora de hora
    visited.add(nk)
    additions.push(next)
    if (wi === reached) reached++
    curr = next
    if (samePoint(next, lastWp)) break // não passa do último waypoint
  }

  return additions.length > 0 ? [...path, ...additions] : path
}
