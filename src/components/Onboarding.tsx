/**
 * Onboarding "como jogar" — overlay da 1ª visita (flag no localStorage, gerido
 * pelo App). A regra em uma frase + um exemplo animado (a linha ideal se
 * desenhando em loop). "Entendi" fecha; o "?" no cabeçalho reabre.
 */

import { useEffect } from 'react'

interface OnboardingProps {
  open: boolean
  onClose: () => void
}

const CELL = 44
const PAD = 10
// 1=(0,0) → 2=(2,0) → 3=(2,2): o traçado ideal (curto e com 1 curva só).
const NUMBERS = [
  { x: 0, y: 0 },
  { x: 2, y: 0 },
  { x: 2, y: 2 },
]
const PATH = [
  { x: 0, y: 0 },
  { x: 1, y: 0 },
  { x: 2, y: 0 },
  { x: 2, y: 1 },
  { x: 2, y: 2 },
]

function Example() {
  const size = 3
  const span = PAD * 2 + size * CELL
  const cx = (x: number) => PAD + x * CELL + CELL / 2
  const cy = (y: number) => PAD + y * CELL + CELL / 2
  const pts = PATH.map((p) => `${cx(p.x)},${cy(p.y)}`).join(' ')

  return (
    <svg
      viewBox={`0 0 ${span} ${span}`}
      className="h-auto w-44 rounded-2xl"
      style={{ background: 'var(--taut-surface)' }}
      aria-hidden="true"
    >
      {Array.from({ length: size }).map((_, y) =>
        Array.from({ length: size }).map((_, x) => (
          <rect
            key={`g-${x}-${y}`}
            x={PAD + x * CELL + 3}
            y={PAD + y * CELL + 3}
            width={CELL - 6}
            height={CELL - 6}
            rx={8}
            fill="var(--taut-grid)"
            stroke="var(--taut-grid-line)"
            strokeWidth={1.5}
          />
        )),
      )}
      <polyline
        className="taut-draw"
        points={pts}
        fill="none"
        stroke="var(--taut-path)"
        strokeWidth={CELL * 0.3}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ ['--taut-len' as string]: '200' }}
      />
      {NUMBERS.map((w, i) => (
        <g key={`n-${i}`}>
          <circle
            cx={cx(w.x)}
            cy={cy(w.y)}
            r={CELL * 0.3}
            fill="var(--taut-wp)"
            stroke="var(--taut-wp-ring)"
            strokeWidth={2}
          />
          <text
            x={cx(w.x)}
            y={cy(w.y)}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={CELL * 0.36}
            fontWeight={800}
            fill="var(--taut-wp-text)"
          >
            {i + 1}
          </text>
        </g>
      ))}
    </svg>
  )
}

export function Onboarding({ open, onClose }: OnboardingProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onPointerDown={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Como jogar"
        className="flex w-full max-w-xs flex-col items-center gap-4 rounded-3xl p-6 text-center shadow-2xl"
        style={{ background: 'var(--taut-grid)', color: 'var(--taut-text)' }}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-black" style={{ color: 'var(--taut-path)' }}>
          Como jogar
        </h2>
        <p className="text-sm">
          Ligue os números em ordem com o caminho mais curto e com menos curvas —
          chegue no ideal.
        </p>
        <Example />
        <button
          type="button"
          onClick={onClose}
          autoFocus
          className="min-h-[44px] rounded-full px-6 py-2 text-sm font-bold transition active:scale-95"
          style={{ background: 'var(--taut-path)', color: '#fff' }}
        >
          Entendi
        </button>
      </div>
    </div>
  )
}
