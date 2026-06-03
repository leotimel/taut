/**
 * Geometria do engine: distância de Manhattan, adjacência ortogonal e contagem
 * de curvas. TypeScript puro, sem DOM.
 */
import type { Point } from './types'

/** Distância de Manhattan (L1) entre duas células. */
export function manhattan(a: Point, b: Point): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y)
}

/**
 * Duas células são ortogonalmente adjacentes quando estão a exatamente um passo
 * (cima/baixo/esquerda/direita) — ou seja, distância de Manhattan igual a 1.
 * Exclui a própria célula (0) e diagonais (2).
 */
export function areOrthogonallyAdjacent(a: Point, b: Point): boolean {
  return manhattan(a, b) === 1
}

/** Direção de um passo, normalizada para um vetor unitário em {-1, 0, 1}². */
function direction(from: Point, to: Point): Point {
  return { x: Math.sign(to.x - from.x), y: Math.sign(to.y - from.y) }
}

/**
 * Conta quantas vezes a direção muda ao percorrer o caminho — o número de
 * "curvas". Um caminho reto tem 0; cada cotovelo (L) soma 1. Caminhos com menos
 * de 3 células não têm curvas possíveis.
 */
export function countTurns(path: Point[]): number {
  if (path.length < 3) return 0
  let turns = 0
  for (let i = 2; i < path.length; i++) {
    const prev = direction(path[i - 2], path[i - 1])
    const curr = direction(path[i - 1], path[i])
    if (prev.x !== curr.x || prev.y !== curr.y) turns++
  }
  return turns
}
