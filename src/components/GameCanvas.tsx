/**
 * GameCanvas — o tabuleiro jogável em SVG. Renderiza a grade, os números
 * (waypoints) e as paredes; intercepta ponteiro/toque pra desenhar o traçado
 * com snap nas células, validando cada passo com o engine.
 *
 * Importa só do engine (regra de arquitetura). Na Fase 3.2 o estado migra pro
 * hook useTaut; por ora o componente cuida do próprio caminho.
 */
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import type { Point, Puzzle } from '../engine/types'
import { solve } from '../engine/solver'
import { score } from '../engine/scorer'
import { isLegalPath } from '../engine/validator'
import { routeTo } from '../engine/route'

interface GameCanvasProps {
  puzzle: Puzzle
  k?: number
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

export function GameCanvas({ puzzle, k = 2 }: GameCanvasProps) {
  const { size, waypoints, walls } = puzzle
  const lastWp = waypoints[waypoints.length - 1]

  const svgRef = useRef<SVGSVGElement>(null)

  const [path, setPathState] = useState<Point[]>(() => [waypoints[0]])
  const pathRef = useRef(path)
  const setPath = useCallback((next: Point[]) => {
    pathRef.current = next
    setPathState(next)
  }, [])

  const drawingRef = useRef(false)
  const [pointer, setPointer] = useState<Point | null>(null)

  // Recomeça quando o puzzle muda (outro dia).
  useEffect(() => {
    drawingRef.current = false
    setPointer(null)
    setPath([waypoints[0]])
  }, [puzzle, waypoints, setPath])

  const par = useMemo(() => solve(puzzle, k), [puzzle, k])
  const current = useMemo(() => score(path, k), [path, k])
  const completed = useMemo(() => isLegalPath(path, puzzle).legal, [path, puzzle])
  const atPar = completed && par !== null && current.total === par.par.total

  // Geometria de tela
  const span = PAD * 2 + size * CELL
  const cx = (x: number): number => PAD + x * CELL + CELL / 2
  const cy = (y: number): number => PAD + y * CELL + CELL / 2

  /** Converte o evento de ponteiro em coordenadas do SVG (unidades do viewBox). */
  const toSvg = useCallback((e: ReactPointerEvent): Point | null => {
    const svg = svgRef.current
    const ctm = svg?.getScreenCTM()
    if (!svg || !ctm) return null
    const dp = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse())
    return { x: dp.x, y: dp.y }
  }, [])

  /** Célula da grade sob um ponto do SVG (ou null se fora). */
  const cellAt = useCallback(
    (svgPt: Point): Point | null => {
      const gx = Math.floor((svgPt.x - PAD) / CELL)
      const gy = Math.floor((svgPt.y - PAD) / CELL)
      if (gx < 0 || gy < 0 || gx >= size || gy >= size) return null
      return { x: gx, y: gy }
    },
    [size],
  )

  const handleMove = useCallback(
    (e: ReactPointerEvent) => {
      if (!drawingRef.current) return
      const svgPt = toSvg(e)
      if (!svgPt) return
      e.preventDefault()
      // Para a linha elástica, guarda o ponto cru (limitado à área da grade).
      const clamp = (v: number) => Math.max(PAD, Math.min(span - PAD, v))
      setPointer({ x: clamp(svgPt.x), y: clamp(svgPt.y) })

      const path = pathRef.current
      if (isLegalPath(path, puzzle).legal) return // já concluído: trava

      const cell = cellAt(svgPt)
      if (!cell) return

      const next = routeTo(path, cell, puzzle)
      if (next === path) return // nada mudou
      setPath(next)
      if (next.length > path.length) {
        const reachedFinal = samePoint(next[next.length - 1], lastWp)
        vibrate(reachedFinal ? [10, 30, 10, 30, 16] : 6)
      }
    },
    [toSvg, span, cellAt, puzzle, setPath, lastWp],
  )

  const handleDown = useCallback(
    (e: ReactPointerEvent) => {
      const svgPt = toSvg(e)
      if (!svgPt) return
      const cell = cellAt(svgPt)
      if (!cell) return
      const path = pathRef.current
      const last = path[path.length - 1]
      if (samePoint(cell, last) && !isLegalPath(path, puzzle).legal) {
        drawingRef.current = true // continua o traço de onde parou
      } else if (samePoint(cell, waypoints[0])) {
        setPath([waypoints[0]]) // (re)começa no número 1
        drawingRef.current = true
      } else {
        return
      }
      svgRef.current?.setPointerCapture(e.pointerId)
      const clamp = (v: number) => Math.max(PAD, Math.min(span - PAD, v))
      setPointer({ x: clamp(svgPt.x), y: clamp(svgPt.y) })
      e.preventDefault()
    },
    [toSvg, cellAt, puzzle, waypoints, setPath, span],
  )

  const endStroke = useCallback(() => {
    drawingRef.current = false
    setPointer(null)
    if (isLegalPath(pathRef.current, puzzle).legal) vibrate([12, 40, 12])
  }, [puzzle])

  const reset = useCallback(() => {
    drawingRef.current = false
    setPointer(null)
    setPath([waypoints[0]])
  }, [waypoints, setPath])

  const pathPoints = path.map((p) => `${cx(p.x)},${cy(p.y)}`).join(' ')
  const head = path[path.length - 1]

  return (
    <div
      className="flex w-full flex-col items-center gap-4 select-none"
      style={{ color: 'var(--taut-text)' }}
    >
      <div className="flex items-center gap-3 text-lg font-semibold">
        <span>
          Caminho <span style={{ color: 'var(--taut-path)' }}>{current.total}</span>
        </span>
        <span style={{ color: 'var(--taut-muted)' }}>·</span>
        <span>
          Ideal{' '}
          <span style={{ color: 'var(--taut-muted)' }}>
            {completed ? (par?.par.total ?? '—') : '🔒'}
          </span>
        </span>
        {atPar ? (
          <span style={{ color: 'var(--taut-accent)' }}>Ideal! 🎉</span>
        ) : completed ? (
          <span style={{ color: 'var(--taut-accent)' }}>Concluído ✓</span>
        ) : null}
      </div>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${span} ${span}`}
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
        onClick={reset}
        className="rounded-full px-5 py-2 text-sm font-semibold transition active:scale-95"
        style={{ background: 'var(--taut-grid)', color: 'var(--taut-text)', border: '2px solid var(--taut-grid-line)' }}
      >
        Recomeçar
      </button>
    </div>
  )
}
