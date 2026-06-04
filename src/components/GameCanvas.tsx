/**
 * GameCanvas — o tabuleiro jogável em SVG, CONTROLADO pelo hook useTaut.
 * Renderiza grade/paredes/números (via BoardSVG) e o traçado; intercepta
 * ponteiro/toque E teclado (setas) e reporta a célula-alvo via `onRoute`. Não
 * guarda o caminho — só o ponteiro pra linha elástica.
 */
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react'
import type { Point, Puzzle, Score } from '../engine/types'
import { samePoint } from '../engine/geometry'
import { BoardBackground, BoardWaypoints } from './BoardSVG'

interface GameCanvasProps {
  puzzle: Puzzle
  path: Point[]
  completed: boolean
  par: Score | null
  geometry: Score
  elapsedMs: number
  bestPath?: Point[] | null
  onRoute: (cell: Point) => void
  onReset: () => void
  onUndo?: () => void
  onHint?: () => void
}

const CELL = 100
const PAD = 18
const INSET = 6 // recuo das células pro visual com "gap"

function vibrate(pattern: number | number[]): void {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(pattern)
  }
}

function formatTime(ms: number): string {
  const s = Math.floor(ms / 1000)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

const KEY_DIRS: Record<string, Point> = {
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
}

export function GameCanvas({
  puzzle,
  path,
  completed,
  par,
  geometry,
  elapsedMs,
  bestPath,
  onRoute,
  onReset,
  onUndo,
  onHint,
}: GameCanvasProps) {
  const { size, waypoints } = puzzle
  const svgRef = useRef<SVGSVGElement>(null)
  const drawingRef = useRef(false)
  const [pointer, setPointer] = useState<Point | null>(null)
  const [peeking, setPeeking] = useState(false)
  const peekTimer = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (peekTimer.current) clearTimeout(peekTimer.current)
    }
  }, [])

  const handleHint = useCallback(() => {
    if (completed || !bestPath || bestPath.length < 2) return
    onHint?.()
    setPeeking(true)
    if (peekTimer.current) clearTimeout(peekTimer.current)
    peekTimer.current = window.setTimeout(() => setPeeking(false), 2000)
  }, [completed, bestPath, onHint])

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

  // Teclado: setas estendem/voltam o traçado; Backspace desfaz.
  const handleKey = useCallback(
    (e: ReactKeyboardEvent) => {
      if (completed) return
      const head = path[path.length - 1]
      const d = KEY_DIRS[e.key]
      if (d) {
        e.preventDefault()
        onRoute({ x: head.x + d.x, y: head.y + d.y })
      } else if (e.key === 'Backspace') {
        e.preventDefault()
        onUndo?.()
      }
    },
    [completed, path, onRoute, onUndo],
  )

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
        tabIndex={0}
        aria-label="Tabuleiro do Taut — arraste ou use as setas para ligar os números em ordem"
        className="h-auto w-full max-w-[min(90vw,520px)] rounded-3xl focus-visible:[outline:3px_solid_var(--taut-path)] focus-visible:[outline-offset:2px]"
        style={{ touchAction: 'none', background: 'var(--taut-surface)' }}
        onPointerDown={handleDown}
        onPointerMove={handleMove}
        onPointerUp={endStroke}
        onPointerCancel={endStroke}
        onKeyDown={handleKey}
      >
        <BoardBackground
          puzzle={puzzle}
          cell={CELL}
          pad={PAD}
          gridInset={INSET}
          cellRx={14}
          gridStroke={2}
          wallInset={INSET}
          wallWidth={CELL * 0.16}
        />

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

        {/* Dica: espia o ideal por ~2s */}
        {peeking && bestPath && bestPath.length >= 2 && (
          <polyline
            points={bestPath.map((p) => `${cx(p.x)},${cy(p.y)}`).join(' ')}
            fill="none"
            stroke="var(--taut-accent)"
            strokeWidth={CELL * 0.18}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="2 12"
            opacity={0.75}
          />
        )}

        <BoardWaypoints
          puzzle={puzzle}
          cell={CELL}
          pad={PAD}
          rRatio={0.32}
          ringWidth={4}
          fontRatio={0.4}
        />
      </svg>

      <div className="flex gap-3">
        {onHint && (
          <button
            type="button"
            onClick={handleHint}
            disabled={completed || !bestPath}
            title="Espia o ideal por 2s (custa pontos)"
            className="min-h-[44px] rounded-full px-5 py-2 text-sm font-semibold transition active:scale-95 disabled:opacity-40"
            style={{
              background: 'var(--taut-grid)',
              color: 'var(--taut-text)',
              border: '2px solid var(--taut-grid-line)',
            }}
          >
            💡 Dica
          </button>
        )}
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
    </div>
  )
}
