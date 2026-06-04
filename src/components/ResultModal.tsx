/**
 * ResultModal — painel de resultado e estatísticas. Ao concluir (nunca há
 * derrota), revela o Ideal (oculto durante o jogo), o tempo, os pontos do dia e
 * o "traçado perfeito" do solver sobreposto ao seu. Também abre a qualquer
 * momento pelo ícone de stats — nesse caso, se o dia ainda não foi concluído,
 * NÃO revela o Ideal nem a solução. Importa só tipos do engine/lib.
 */
import { useEffect, useState } from 'react'
import type { Point, Puzzle, Score } from '../engine/types'
import type { PointsBreakdown } from '../lib/points'
import type { Stats } from '../lib/storage'
import type { ShareResult } from '../lib/share'
import { isLandmark, type LevelInfo } from '../lib/level'
import { BoardBackground, BoardWaypoints } from './BoardSVG'

interface ResultModalProps {
  open: boolean
  onClose: () => void
  completed: boolean
  puzzle: Puzzle
  playerPath: Point[]
  bestPath: Point[] | null
  par: Score | null
  geometry: Score
  elapsedMs: number
  points: PointsBreakdown
  stats: Stats
  level: LevelInfo
  todayXp: number
  leveledUp: boolean
  onShare?: () => Promise<ShareResult> | void
  onChallenge?: () => Promise<ShareResult> | void
}

const CELL = 40
const PAD = 8

function fmtTime(ms: number): string {
  const s = Math.floor(ms / 1000)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

function fmtCountdown(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

function msUntilMidnight(): number {
  const now = new Date()
  const next = new Date(now)
  next.setHours(24, 0, 0, 0)
  return next.getTime() - now.getTime()
}

function useCountdown(active: boolean): number {
  const [ms, setMs] = useState(() => msUntilMidnight())
  useEffect(() => {
    if (!active) return
    setMs(msUntilMidnight())
    const id = setInterval(() => setMs(msUntilMidnight()), 1000)
    return () => clearInterval(id)
  }, [active])
  return ms
}

/** Tabuleiro estático: seu traçado + o caminho ideal (tracejado) por cima. */
function BoardReveal({
  puzzle,
  playerPath,
  bestPath,
}: {
  puzzle: Puzzle
  playerPath: Point[]
  bestPath: Point[] | null
}) {
  const { size } = puzzle
  const span = PAD * 2 + size * CELL
  const cx = (x: number) => PAD + x * CELL + CELL / 2
  const cy = (y: number) => PAD + y * CELL + CELL / 2
  const toStr = (p: Point[]) => p.map((c) => `${cx(c.x)},${cy(c.y)}`).join(' ')

  return (
    <svg
      viewBox={`0 0 ${span} ${span}`}
      className="h-auto w-full max-w-[260px] rounded-2xl"
      style={{ background: 'var(--taut-surface)' }}
    >
      <BoardBackground
        puzzle={puzzle}
        cell={CELL}
        pad={PAD}
        gridInset={2}
        cellRx={6}
        gridStroke={1}
        wallInset={3}
        wallWidth={CELL * 0.14}
      />
      {playerPath.length >= 2 && (
        <polyline
          points={toStr(playerPath)}
          fill="none"
          stroke="var(--taut-path)"
          strokeWidth={CELL * 0.3}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.4}
        />
      )}
      {bestPath && bestPath.length >= 2 && (
        <polyline
          className="taut-reveal"
          points={toStr(bestPath)}
          fill="none"
          stroke="var(--taut-accent)"
          strokeWidth={CELL * 0.18}
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ ['--taut-len' as string]: '900' }}
        />
      )}
      <BoardWaypoints
        puzzle={puzzle}
        cell={CELL}
        pad={PAD}
        rRatio={0.28}
        ringWidth={2}
        fontRatio={0.34}
      />
    </svg>
  )
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="text-2xl font-black" style={{ color: 'var(--taut-path)' }}>
        {value}
      </span>
      <span className="text-xs" style={{ color: 'var(--taut-muted)' }}>
        {label}
      </span>
    </div>
  )
}

export function ResultModal({
  open,
  onClose,
  completed,
  puzzle,
  playerPath,
  bestPath,
  par,
  geometry,
  elapsedMs,
  points,
  stats,
  level,
  todayXp,
  leveledUp,
  onShare,
  onChallenge,
}: ResultModalProps) {
  const countdown = useCountdown(open)
  const [toast, setToast] = useState<string | null>(null)
  const [barW, setBarW] = useState('0%')

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  useEffect(() => {
    if (!open) {
      setBarW('0%')
      return
    }
    const pct = Math.min(100, Math.round((level.xpInLevel / level.xpForNext) * 100))
    const id = setTimeout(() => setBarW(`${pct}%`), 60)
    return () => clearTimeout(id)
  }, [open, level])

  if (!open) return null

  const atPar = completed && par !== null && geometry.total === par.total

  const flash = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2000)
  }
  const handleShareClick = async () => {
    const r = await onShare?.()
    if (r === 'copied') flash('Copiado! 📋')
    else if (r === 'unavailable') flash('Não deu pra copiar')
  }
  const handleChallengeClick = async () => {
    const r = await onChallenge?.()
    if (r === 'copied') flash('Link copiado! 🔗')
    else if (r === 'unavailable') flash('Não deu pra copiar')
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onPointerDown={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="flex max-h-[90svh] w-full max-w-sm flex-col items-center gap-4 overflow-y-auto rounded-3xl p-6 text-center shadow-2xl"
        style={{ background: 'var(--taut-grid)', color: 'var(--taut-text)' }}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          autoFocus
          className="flex min-h-[44px] min-w-[44px] items-center justify-center self-end text-xl leading-none"
          style={{ color: 'var(--taut-muted)' }}
        >
          ✕
        </button>

        {completed ? (
          <>
            <h2 className="text-2xl font-black">
              {atPar ? 'No ideal! 🎉' : 'Concluído! ✓'}
            </h2>

            <div className="flex items-center justify-center gap-4 text-lg font-semibold">
              <span>
                Caminho{' '}
                <span style={{ color: 'var(--taut-path)' }}>{geometry.total}</span>
              </span>
              <span style={{ color: 'var(--taut-muted)' }}>·</span>
              <span>
                Ideal{' '}
                <span style={{ color: 'var(--taut-accent)' }}>
                  {par?.total ?? '—'}
                </span>
              </span>
            </div>

            <BoardReveal
              puzzle={puzzle}
              playerPath={playerPath}
              bestPath={bestPath}
            />
            <p className="text-xs" style={{ color: 'var(--taut-muted)' }}>
              <span style={{ color: 'var(--taut-path)' }}>━</span> seu traçado ·{' '}
              <span style={{ color: 'var(--taut-accent)' }}>━</span> o ideal
            </p>

            <div className="flex w-full items-center justify-around rounded-2xl py-3" style={{ background: 'var(--taut-surface)' }}>
              <Stat label="tempo" value={fmtTime(elapsedMs)} />
              <Stat label="pontos do dia" value={points.total} />
            </div>
            <p className="text-xs" style={{ color: 'var(--taut-muted)' }}>
              {points.geometry} geometria
              {points.timePenalty > 0 ? ` + ${points.timePenalty} tempo` : ''}
              {points.attemptsPenalty > 0 ? ` + ${points.attemptsPenalty} tentativas` : ''}
            </p>
          </>
        ) : (
          <>
            <h2 className="text-2xl font-black">Estatísticas</h2>
            <p className="text-sm" style={{ color: 'var(--taut-muted)' }}>
              Conclua o puzzle de hoje pra revelar o ideal e o traçado perfeito.
            </p>
          </>
        )}

        <div className="flex w-full items-center justify-around rounded-2xl py-3" style={{ background: 'var(--taut-surface)' }}>
          <Stat label="streak 🔥" value={stats.currentStreak} />
          <Stat label="melhor" value={stats.bestStreak} />
          <Stat label="jogados" value={stats.daysPlayed} />
          <Stat label="no ideal" value={stats.parCount} />
        </div>

        {/* Nível & barra de XP */}
        <div className="w-full">
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="font-semibold" style={{ color: 'var(--taut-text)' }}>
              Nv {level.level} · {level.codename}
            </span>
            {completed && todayXp > 0 && (
              <span style={{ color: 'var(--taut-accent)' }}>+{todayXp} XP</span>
            )}
          </div>
          <div
            className="h-3 w-full overflow-hidden rounded-full"
            style={{ background: 'var(--taut-surface)' }}
          >
            <div
              className="taut-xpfill h-full rounded-full"
              style={{ width: barW, background: 'var(--taut-path)' }}
            />
          </div>
          <div
            className="mt-1 text-right text-[10px]"
            style={{ color: 'var(--taut-muted)' }}
          >
            {level.xpInLevel}/{level.xpForNext} XP
          </div>
          {leveledUp && (
            <p
              className="mt-2 text-center text-sm font-bold"
              style={{ color: 'var(--taut-accent)' }}
            >
              ⬆️ Subiu pro Nível {level.level}
              {isLandmark(level.level) ? ` · ${level.codename}! 🌌` : '!'}
            </p>
          )}
        </div>

        <div className="text-sm" style={{ color: 'var(--taut-muted)' }}>
          Próximo puzzle em{' '}
          <span className="font-mono font-semibold" style={{ color: 'var(--taut-text)' }}>
            {fmtCountdown(countdown)}
          </span>
        </div>

        {completed && (
          <div className="flex w-full gap-3">
            <button
              type="button"
              onClick={handleShareClick}
              disabled={!onShare}
              className="min-h-[44px] flex-1 rounded-full px-4 py-2 text-sm font-bold transition active:scale-95 disabled:opacity-40"
              style={{ background: 'var(--taut-path)', color: '#fff' }}
            >
              Compartilhar
            </button>
            <button
              type="button"
              onClick={handleChallengeClick}
              disabled={!onChallenge}
              className="min-h-[44px] flex-1 rounded-full px-4 py-2 text-sm font-bold transition active:scale-95 disabled:opacity-40"
              style={{
                background: 'var(--taut-grid)',
                color: 'var(--taut-text)',
                border: '2px solid var(--taut-grid-line)',
              }}
            >
              Desafiar amigo
            </button>
          </div>
        )}

        {toast && (
          <p
            className="text-sm font-semibold"
            style={{ color: 'var(--taut-accent)' }}
          >
            {toast}
          </p>
        )}
      </div>
    </div>
  )
}
