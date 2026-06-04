/**
 * GameCanvas — o tabuleiro jogável em SVG, CONTROLADO pelo hook useTaut.
 * Renderiza a grade, os números (waypoints) e as paredes (barreiras de aresta);
 * intercepta ponteiro/toque e reporta a célula-alvo via `onRoute`. Não guarda o
 * caminho — só o ponteiro pra linha elástica. Importa só tipos do engine.
 */
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import type { Point, Puzzle, Score } from '../engine/types'

interface GameCanvasProps {
  puzzle: Puzzle
  path: Point[]
  completed: boolean
  par: Score | null
  geometry: Score
  elapsedMs: number
  onRoute: (cell: Point) => void
  onReset: () => void
}

const CELL = 100
const PAD = 18
const INSET = 6 // recuo das células pro visual com "gap"

const samePoint = (a: Point, b: Point): boolean => a.x === b.x && a.y === b.y

function vibrate(pattern: number | number[]): void {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(pattern)
  }
}

function formatTime(ms: number): string {
  const s = Math.floor(ms / 1000)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export function GameCanvas({
  puzzle,
  path,
  completed,
  par,
  geometry,
  elapsedMs,
  onRoute,
  onReset,
}: GameCanvasProps) {
  const { size, waypoints, walls } = puzzle
  const svgRef = useRef<SVGSVGElement>(null)
  const drawingRef = useRef(false)
  const [pointer, setPointer] = useState<Point | null>(null)

  const atPar = completed && par !== null && geometry.total === par.total

  // Vibração ao fixar/concluir segmentos (compara o tamanho do caminho).
  const prevLenRef = useRef(path.length)
  useEffect(() => {
    if (path.length > prevLenRef.current) {
      vibrate(completed ? [10, 30, 10, 30, 16] : 6)
    }
    prevLenRef.current = path.length
  }, [path, completed])

  const span = PAD * 2 + size * CELL
  const cx = (x: number): number => PAD + x * CELL + CELL / 2
  const cy = (y: number): number => PAD + y * CELL + CELL / 2

  const toSvg = useCallback((e: ReactPointerEvent): Point | null => {
    const svg = svgRef.current
    const ctm = svg?.getScreenCTM()
    if (!svg || !ctm) return null
    const dp = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse())
    return { x: dp.x, y: dp.y }
  }, [])

  const cellAt = useCallback(
    (svgPt: Point): Point | null => {
      const gx = Math.floor((svgPt.x - PAD) / CELL)
      const gy = Math.floor((svgPt.y - PAD) / CELL)
      if (gx < 0 || gy < 0 || gx >= size || gy >= size) return null
      return { x: gx, y: gy }
    },
    [size],
  )

  const clampToBoard = (v: number) => Math.max(PAD, Math.min(span - PAD, v))

  const handleDown = useCallback(
    (e: ReactPointerEvent) => {
      const svgPt = toSvg(e)
      if (!svgPt) return
      const cell = cellAt(svgPt)
      if (!cell) return
      const head = path[path.length - 1]
      if (samePoint(cell, head) && !completed) {
        drawingRef.current = true // continua de onde parou
      } else if (samePoint(cell, waypoints[0])) {
        onReset() // (re)começa no número 1
        drawingRef.current = true
      } else {
        return
      }
      svgRef.current?.setPointerCapture(e.pointerId)
      setPointer({ x: clampToBoard(svgPt.x), y: clampToBoard(svgPt.y) })
      e.preventDefault()
    },
    [toSvg, cellAt, path, completed, waypoints, onReset],
  )

  const handleMove = useCallback(
    (e: ReactPointerEvent) => {
      if (!drawingRef.current) return
      const svgPt = toSvg(e)
      if (!svgPt) return
      e.preventDefault()
      setPointer({ x: clampToBoard(svgPt.x), y: clampToBoard(svgPt.y) })
      const cell = cellAt(svgPt)
      if (cell) onRoute(cell)
    },
    [toSvg, cellAt, onRoute],
  )

  const endStroke = useCallback(() => {
    drawingRef.current = false
    setPointer(null)
  }, [])

  const pathPoints = path.map((p) => `${cx(p.x)},${cy(p.y)}`).join(' ')
  const head = path[path.length - 1]

  return (
    <div
      className="flex w-full flex-col items-center gap-4 select-none"
      style={{ color: 'var(--taut-text)' }}
    >
      <div className="flex items-center gap-3 text-lg font-semibold">
        <span>
          Caminho{' '}
          <span style={{ color: 'var(--taut-path)' }}>{geometry.total}</span>
        </span>
        <span style={{ color: 'var(--taut-muted)' }}>·</span>
        <span>
          Ideal{' '}
          <span style={{ color: 'var(--taut-muted)' }}>
            {completed ? (par?.total ?? '—') : '🔒'}
          </span>
        </span>
        <span style={{ color: 'var(--taut-muted)' }}>·</span>
        <span style={{ color: 'var(--taut-muted)' }}>⏱ {formatTime(elapsedMs)}</span>
        {atPar ? (
          <span style={{ color: 'var(--taut-accent)' }}>Ideal! 🎉</span>
        ) : completed ? (
          <span style={{ color: 'var(--taut-accent)' }}>Concluído ✓</span>
        ) : null}
      </div>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${span} ${span}`}
        role="application"
        aria-label="Tabuleiro do Taut — arraste para ligar os números em ordem"
        className="h-auto w-full max-w-[min(90vw,520px)] rounded-3xl"
        style={{ touchAction: 'none', background: 'var(--taut-surface)' }}
        onPointerDown={handleDown}
        onPointerMove={handleMove}
        onPointerUp={endStroke}
        onPointerCancel={endStroke}
      >
        {/* Grade */}
        {Array.from({ length: size }).map((_, y) =>
          Array.from({ length: size }).map((_, x) => (
            <rect
              key={`g-${x}-${y}`}
              x={PAD + x * CELL + INSET}
              y={PAD + y * CELL + INSET}
              width={CELL - INSET * 2}
              height={CELL - INSET * 2}
              rx={14}
              fill="var(--taut-grid)"
              stroke="var(--taut-grid-line)"
              strokeWidth={2}
            />
          )),
        )}

        {/* Paredes — barreiras na aresta entre duas células */}
        {walls.map((w, i) => {
          const horizontal = w.a.y === w.b.y // vizinhos na horizontal → barra vertical
          if (horizontal) {
            const bx = PAD + Math.max(w.a.x, w.b.x) * CELL
            return (
              <line
                key={`w-${i}`}
                x1={bx}
                y1={PAD + w.a.y * CELL + INSET}
                x2={bx}
                y2={PAD + w.a.y * CELL + CELL - INSET}
                stroke="var(--taut-wall)"
                strokeWidth={CELL * 0.16}
                strokeLinecap="round"
              />
            )
          }
          const by = PAD + Math.max(w.a.y, w.b.y) * CELL
          return (
            <line
              key={`w-${i}`}
              x1={PAD + w.a.x * CELL + INSET}
              y1={by}
              x2={PAD + w.a.x * CELL + CELL - INSET}
              y2={by}
              stroke="var(--taut-wall)"
              strokeWidth={CELL * 0.16}
              strokeLinecap="round"
            />
          )
        })}

        {/* Caminho traçado */}
        {path.length >= 2 && (
          <polyline
            points={pathPoints}
            fill="none"
            stroke="var(--taut-path)"
            strokeWidth={CELL * 0.34}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Linha elástica até o ponteiro */}
        {pointer && !completed && head && (
          <line
            x1={cx(head.x)}
            y1={cy(head.y)}
            x2={pointer.x}
            y2={pointer.y}
            stroke="var(--taut-preview)"
            strokeWidth={CELL * 0.2}
            strokeLinecap="round"
            strokeDasharray="6 14"
          />
        )}

        {/* Ponta viva do traçado (feedback de onde você está) */}
        {!completed && head && (
          <circle
            className="taut-pulse"
            cx={cx(head.x)}
            cy={cy(head.y)}
            r={CELL * 0.42}
            fill="none"
            stroke="var(--taut-path)"
            strokeWidth={4}
          />
        )}

        {/* Waypoints (números) */}
        {waypoints.map((w, i) => (
          <g key={`wp-${i}`}>
            <circle
              cx={cx(w.x)}
              cy={cy(w.y)}
              r={CELL * 0.32}
              fill="var(--taut-wp)"
              stroke="var(--taut-wp-ring)"
              strokeWidth={4}
            />
            <text
              x={cx(w.x)}
              y={cy(w.y)}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={CELL * 0.4}
              fontWeight={800}
              fill="var(--taut-wp-text)"
            >
              {i + 1}
            </text>
          </g>
        ))}
      </svg>

      <button
        type="button"
        onClick={onReset}
        className="min-h-[44px] rounded-full px-5 py-2 text-sm font-semibold transition active:scale-95"
        style={{
          background: 'var(--taut-grid)',
          color: 'var(--taut-text)',
          border: '2px solid var(--taut-grid-line)',
        }}
      >
        Recomeçar
      </button>
    </div>
  )
}
