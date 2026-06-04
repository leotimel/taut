/**
 * Camadas estáticas do tabuleiro em SVG, compartilhadas entre o GameCanvas (jogo)
 * e o BoardReveal (modal). `BoardBackground` = grade + paredes (fundo);
 * `BoardWaypoints` = os números (frente). O consumidor sanduícha o traçado entre
 * as duas, dentro do próprio `<svg viewBox>`, com suas constantes de tamanho.
 */
import type { Puzzle } from '../engine/types'

interface BackgroundProps {
  puzzle: Puzzle
  cell: number
  pad: number
  gridInset: number
  cellRx: number
  gridStroke: number
  wallInset: number
  wallWidth: number
}

/** Grade (células arredondadas) + paredes (barreiras nas arestas). */
export function BoardBackground({
  puzzle,
  cell,
  pad,
  gridInset,
  cellRx,
  gridStroke,
  wallInset,
  wallWidth,
}: BackgroundProps) {
  const { size, walls } = puzzle
  return (
    <>
      {Array.from({ length: size }).map((_, y) =>
        Array.from({ length: size }).map((_, x) => (
          <rect
            key={`g-${x}-${y}`}
            x={pad + x * cell + gridInset}
            y={pad + y * cell + gridInset}
            width={cell - gridInset * 2}
            height={cell - gridInset * 2}
            rx={cellRx}
            fill="var(--taut-grid)"
            stroke="var(--taut-grid-line)"
            strokeWidth={gridStroke}
          />
        )),
      )}
      {walls.map((w, i) => {
        const horizontal = w.a.y === w.b.y // vizinhos na horizontal → barra vertical
        if (horizontal) {
          const bx = pad + Math.max(w.a.x, w.b.x) * cell
          return (
            <line
              key={`w-${i}`}
              x1={bx}
              y1={pad + w.a.y * cell + wallInset}
              x2={bx}
              y2={pad + w.a.y * cell + cell - wallInset}
              stroke="var(--taut-wall)"
              strokeWidth={wallWidth}
              strokeLinecap="round"
            />
          )
        }
        const by = pad + Math.max(w.a.y, w.b.y) * cell
        return (
          <line
            key={`w-${i}`}
            x1={pad + w.a.x * cell + wallInset}
            y1={by}
            x2={pad + w.a.x * cell + cell - wallInset}
            y2={by}
            stroke="var(--taut-wall)"
            strokeWidth={wallWidth}
            strokeLinecap="round"
          />
        )
      })}
    </>
  )
}

interface WaypointsProps {
  puzzle: Puzzle
  cell: number
  pad: number
  rRatio: number
  ringWidth: number
  fontRatio: number
}

/** Os números (waypoints) como círculos numerados. */
export function BoardWaypoints({
  puzzle,
  cell,
  pad,
  rRatio,
  ringWidth,
  fontRatio,
}: WaypointsProps) {
  const cx = (x: number) => pad + x * cell + cell / 2
  const cy = (y: number) => pad + y * cell + cell / 2
  return (
    <>
      {puzzle.waypoints.map((w, i) => (
        <g key={`wp-${i}`}>
          <circle
            cx={cx(w.x)}
            cy={cy(w.y)}
            r={cell * rRatio}
            fill="var(--taut-wp)"
            stroke="var(--taut-wp-ring)"
            strokeWidth={ringWidth}
          />
          <text
            x={cx(w.x)}
            y={cy(w.y)}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={cell * fontRatio}
            fontWeight={800}
            fill="var(--taut-wp-text)"
          >
            {i + 1}
          </text>
        </g>
      ))}
    </>
  )
}
