/**
 * Validador do caminho. Decide se um traçado é legal segundo as regras do jogo
 * e, em caso negativo, devolve o motivo. TypeScript puro, sem DOM.
 */
import type { Path, Point, Puzzle } from './types'
import { areOrthogonallyAdjacent, edgeKey, samePoint, pointKey } from './geometry'

/** Motivo pelo qual um caminho é ilegal (uma regra por motivo). */
export type InvalidReason =
  | 'empty' // caminho vazio
  | 'out-of-bounds' // célula fora da grade
  | 'crosses-wall' // passo cruza uma parede (barreira de aresta)
  | 'not-adjacent' // passo não é ortogonalmente adjacente
  | 'self-intersecting' // repete/cruza uma célula (não é auto-evitante)
  | 'waypoints-order' // não passa por todos os waypoints na ordem crescente

export type ValidationResult =
  | { legal: true }
  | { legal: false; reason: InvalidReason; at?: Point }

/**
 * `isLegalPath` valida um caminho COMPLETO contra um puzzle. Reporta a primeira
 * regra violada, na ordem: vazio → limites → adjacência → parede → auto-evitante
 * → waypoints.
 *
 * Extremos travados: o caminho deve começar no waypoint 1 e terminar no
 * waypoint N, visitando os intermediários em ordem crescente.
 */
export function isLegalPath(path: Path, puzzle: Puzzle): ValidationResult {
  const { size, walls, waypoints } = puzzle

  if (path.length === 0) return { legal: false, reason: 'empty' }

  const wallSet = new Set(walls.map((w) => edgeKey(w.a, w.b)))
  const seen = new Set<string>()

  for (let i = 0; i < path.length; i++) {
    const cell = path[i]

    // 1. Dentro da grade quadrada.
    if (cell.x < 0 || cell.y < 0 || cell.x >= size || cell.y >= size) {
      return { legal: false, reason: 'out-of-bounds', at: cell }
    }

    if (i > 0) {
      const prev = path[i - 1]
      // 2. Cada passo é ortogonalmente adjacente ao anterior.
      if (!areOrthogonallyAdjacent(prev, cell)) {
        return { legal: false, reason: 'not-adjacent', at: cell }
      }
      // 3. O passo não cruza uma parede (barreira na aresta prev→cell).
      if (wallSet.has(edgeKey(prev, cell))) {
        return { legal: false, reason: 'crosses-wall', at: cell }
      }
    }

    // 4. Auto-evitante: nunca repete (nem cruza) uma célula.
    const k = pointKey(cell)
    if (seen.has(k)) {
      return { legal: false, reason: 'self-intersecting', at: cell }
    }
    seen.add(k)
  }

  // 5. Passa por todos os waypoints em ordem, começando no 1 e terminando no N.
  if (!visitsWaypointsInOrder(path, waypoints)) {
    return { legal: false, reason: 'waypoints-order' }
  }

  return { legal: true }
}

/**
 * O caminho começa no primeiro waypoint, termina no último, e os índices de cada
 * waypoint ao longo do caminho são estritamente crescentes (todos presentes).
 * Assume um caminho já validado como auto-evitante (cada célula aparece 1x).
 */
function visitsWaypointsInOrder(path: Path, waypoints: Point[]): boolean {
  if (waypoints.length === 0) return true

  const first = waypoints[0]
  const last = waypoints[waypoints.length - 1]
  if (!samePoint(path[0], first)) return false
  if (!samePoint(path[path.length - 1], last)) return false

  let prevIndex = -1
  for (const wp of waypoints) {
    const idx = path.findIndex((c) => samePoint(c, wp))
    if (idx === -1) return false // waypoint ausente
    if (idx <= prevIndex) return false // fora de ordem
    prevIndex = idx
  }
  return true
}
