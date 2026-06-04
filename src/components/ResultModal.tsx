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
import { STREAK_MILESTONES, type Stats, type DayRecord } from '../lib/storage'
import type { ShareResult } from '../lib/share'
import { isLandmark, type LevelInfo } from '../lib/level'
import { PALETTES } from '../lib/palettes'
import { ACHIEVEMENTS, unlockedCount, isUnlocked } from '../lib/achievements'
import { playLevelUp } from '../lib/sound'
import confetti from 'canvas-confetti'
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
  paletteId: string
  onSelectPalette: (id: string) => void
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

/** Histograma da "precisão": quantos dias você ficou no ideal, +1, +2, +3, +4+. */
function GapHistogram({ history }: { history: DayRecord[] }) {
  const labels = ['ideal', '+1', '+2', '+3', '+4+']
  const buckets = [0, 0, 0, 0, 0]
  for (const r of history) {
    if (!r.completed) continue
    buckets[Math.min(4, Math.max(0, r.score - r.par))]++
  }
  const max = Math.max(1, ...buckets)
  return (
    <div className="w-full">
      <div className="mb-1 text-xs font-semibold" style={{ color: 'var(--taut-text)' }}>
        Sua precisão
      </div>
      <div className="flex h-16 items-end justify-around gap-1">
        {buckets.map((c, i) => (
          <div key={i} className="flex flex-1 flex-col items-center justify-end gap-1">
            <span className="text-[9px]" style={{ color: 'var(--taut-muted)' }}>
              {c}
            </span>
            <div
              className="w-full rounded-t"
              style={{
                height: `${(c / max) * 100}%`,
                minHeight: c > 0 ? 4 : 1,
                background: i === 0 ? 'var(--taut-accent)' : 'var(--taut-path)',
              }}
            />
            <span className="text-[9px]" style={{ color: 'var(--taut-muted)' }}>
              {labels[i]}
            </span>
          </div>
        ))}
      </div>
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
  paletteId,
  onSelectPalette,
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

  // Comemoração: confete ao bater o ideal / subir de nível; fanfarra no level-up.
  useEffect(() => {
    if (!open) return
    const hitIdeal = completed && par !== null && geometry.total === par.total
    if (hitIdeal || leveledUp) {
      try {
        void confetti({
          particleCount: hitIdeal ? 90 : 60,
          spread: 70,
          origin: { y: 0.4 },
          disableForReducedMotion: true,
        })
      } catch {
        // ambiente sem canvas/matchMedia (ex.: testes) — ignora
      }
    }
    if (leveledUp) playLevelUp()
  }, [open, completed, par, geometry.total, leveledUp])

  if (!open) return null

  const atPar = completed && par !== null && geometry.total === par.total
  const streakMilestone =
    completed && STREAK_MILESTONES.includes(stats.currentStreak)
      ? stats.currentStreak
      : null
  const achCtx = { stats, level: level.level }

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
        className="flex max-h-[90svh] w-full max-w-sm flex-col overflow-hidden rounded-3xl text-center shadow-2xl"
        style={{ background: 'var(--taut-grid)', color: 'var(--taut-text)' }}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 justify-end px-4 pt-3">
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            autoFocus
            className="flex min-h-[44px] min-w-[44px] items-center justify-center text-xl leading-none"
            style={{ color: 'var(--taut-muted)' }}
          >
            ✕
          </button>
        </div>

        <div className="flex flex-1 flex-col items-center gap-4 overflow-y-auto px-6 pb-4">
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
              {points.hintsPenalty > 0 ? ` + ${points.hintsPenalty} dicas` : ''}
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

        {(streakMilestone !== null || stats.freezes > 0) && (
          <div className="flex flex-col items-center gap-1 text-xs">
            {streakMilestone !== null && (
              <span className="font-bold" style={{ color: 'var(--taut-accent)' }}>
                🔥 {streakMilestone} dias seguidos!
              </span>
            )}
            {stats.freezes > 0 && (
              <span style={{ color: 'var(--taut-muted)' }}>
                🛡️ {stats.freezes} escudo{stats.freezes > 1 ? 's' : ''} — segura{' '}
                {stats.freezes > 1 ? 'dias pulados' : 'um dia pulado'}
              </span>
            )}
          </div>
        )}

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

        {/* Precisão (histograma) */}
        {stats.daysPlayed > 0 && <GapHistogram history={stats.history} />}

        {/* Conquistas */}
        <div className="w-full">
          <div
            className="mb-1 flex items-center justify-between text-xs font-semibold"
            style={{ color: 'var(--taut-text)' }}
          >
            <span>Conquistas</span>
            <span style={{ color: 'var(--taut-muted)' }}>
              {unlockedCount(achCtx)}/{ACHIEVEMENTS.length}
            </span>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {ACHIEVEMENTS.map((a) => {
              const got = isUnlocked(a, achCtx)
              return (
                <div
                  key={a.id}
                  title={`${a.name} — ${a.desc}`}
                  className="flex h-9 w-9 items-center justify-center rounded-full text-lg"
                  style={{
                    background: 'var(--taut-surface)',
                    border: '2px solid var(--taut-grid-line)',
                    opacity: got ? 1 : 0.35,
                    filter: got ? 'none' : 'grayscale(1)',
                  }}
                >
                  {a.icon}
                </div>
              )
            })}
          </div>
        </div>

        {/* Temas (paletas desbloqueáveis por nível) */}
        <div className="w-full">
          <div
            className="mb-1 text-xs font-semibold"
            style={{ color: 'var(--taut-text)' }}
          >
            Tema
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {PALETTES.map((p) => {
              const unlocked = level.level >= p.unlockLevel
              const selected = p.id === paletteId
              return (
                <button
                  key={p.id}
                  type="button"
                  disabled={!unlocked}
                  onClick={() => onSelectPalette(p.id)}
                  className="flex min-h-[40px] items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] transition active:scale-95 disabled:opacity-50"
                  style={{
                    background: 'var(--taut-surface)',
                    border: selected
                      ? '2px solid var(--taut-accent)'
                      : '2px solid var(--taut-grid-line)',
                    color: 'var(--taut-text)',
                  }}
                >
                  <span className="inline-flex">
                    <span
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: 99,
                        background: p.swatch.path,
                        border: '1px solid rgba(0,0,0,0.15)',
                      }}
                    />
                    <span
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: 99,
                        background: p.swatch.wp,
                        marginLeft: -4,
                        border: '1px solid rgba(0,0,0,0.15)',
                      }}
                    />
                  </span>
                  {unlocked ? p.name : `🔒 Nv ${p.unlockLevel}`}
                </button>
              )
            })}
          </div>
        </div>

          <div className="text-sm" style={{ color: 'var(--taut-muted)' }}>
            Próximo puzzle em{' '}
            <span className="font-mono font-semibold" style={{ color: 'var(--taut-text)' }}>
              {fmtCountdown(countdown)}
            </span>
          </div>
        </div>

        {completed && (
          <div
            className="flex w-full shrink-0 flex-col gap-2 px-6 py-4"
            style={{ borderTop: '1px solid var(--taut-grid-line)' }}
          >
            {toast && (
              <p
                className="text-sm font-semibold"
                style={{ color: 'var(--taut-accent)' }}
              >
                {toast}
              </p>
            )}
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
          </div>
        )}
      </div>
    </div>
  )
}
