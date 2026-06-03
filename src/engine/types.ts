/**
 * Tipos do engine do Taut.
 *
 * O engine é TypeScript puro (sem DOM/React). Estes tipos descrevem a geometria
 * do tabuleiro e do traçado — nada de tempo nem de "pontos do dia", que vivem na
 * camada do app (`src/lib/`).
 */

/** Uma célula da grade, em coordenadas inteiras (origem no canto superior esquerdo). */
export interface Point {
  x: number
  y: number
}

/** Uma célula bloqueada que o caminho precisa contornar. */
export type Wall = Point

/**
 * O tabuleiro de um dia. Determinístico pela data: a mesma `date` sempre produz
 * o mesmo `Puzzle` (via `seed`).
 */
export interface Puzzle {
  /** Data do puzzle no formato ISO `YYYY-MM-DD`. */
  date: string
  /** Lado da grade quadrada (ex.: 6 para uma grade 6×6). */
  size: number
  /** Os números a ligar, já na ordem crescente 1..N. */
  waypoints: Point[]
  /** Células bloqueadas. */
  walls: Point[]
  /** Seed derivada da data — torna a geração reproduzível. */
  seed: number
}

/** O traçado do jogador: a sequência ordenada de células visitadas. */
export type Path = Point[]

/**
 * Score puramente geométrico (time-agnostic): `total = length + k·turns`.
 * O `k` mora no scorer; o tempo nunca entra aqui.
 */
export interface Score {
  /** Número de passos do caminho (arestas percorridas). */
  length: number
  /** Número de mudanças de direção (curvas). */
  turns: number
  /** Score composto: `length + k·turns`. */
  total: number
}
