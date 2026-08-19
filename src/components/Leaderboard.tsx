/**
 * Ranking diário no modal de resultado — top-N (esforço, desempate por tempo) +
 * sua posição. Nome de exibição editável (opcional). Best-effort: se o backend
 * não responder, some sem quebrar nada.
 */
import { useCallback, useEffect, useState } from 'react'
import type { Mode } from '../lib/storage'
import {
  fetchLeaderboard,
  updateName,
  leaderboardEnabled,
  type LeaderboardData,
} from '../lib/leaderboard'
import { getAnonId, getPlayerName, setPlayerName } from '../lib/anonId'

function fmt(ms: number): string {
  const s = Math.floor(Math.max(0, ms) / 1000)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export function Leaderboard({ day, mode }: { day: string; mode: Mode }) {
  const [anonId] = useState(getAnonId)
  const [data, setData] = useState<LeaderboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState(getPlayerName)

  const load = useCallback(() => {
    setLoading(true)
    fetchLeaderboard(day, mode, anonId).then((d) => {
      setData(d)
      setLoading(false)
    })
  }, [day, mode, anonId])

  useEffect(() => {
    load()
  }, [load])

  if (!leaderboardEnabled) return null

  const commitName = () => {
    const trimmed = name.trim().slice(0, 20)
    setPlayerName(trimmed)
    updateName(day, mode, anonId, trimmed).then(load)
  }

  const inTop = data?.top.some((r) => r.anon_id === anonId) ?? false

  return (
    <div className="w-full">
      <div
        className="mb-1 flex items-center justify-between text-xs font-semibold"
        style={{ color: 'var(--taut-text)' }}
      >
        <span>Ranking de hoje</span>
        {data && data.total > 0 && (
          <span style={{ color: 'var(--taut-muted)' }}>
            {data.total} {data.total === 1 ? 'jogador' : 'jogadores'}
          </span>
        )}
      </div>

      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={commitName}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
        }}
        placeholder="Seu nome no ranking"
        maxLength={20}
        className="mb-2 w-full rounded-xl px-3 py-1.5 text-sm outline-none"
        style={{
          background: 'var(--taut-surface)',
          border: '2px solid var(--taut-grid-line)',
          color: 'var(--taut-text)',
        }}
      />

      {loading ? (
        <p className="text-xs" style={{ color: 'var(--taut-muted)' }}>
          Carregando…
        </p>
      ) : !data || data.total === 0 ? (
        <p className="text-xs" style={{ color: 'var(--taut-muted)' }}>
          Seja o primeiro a concluir hoje! 🏁
        </p>
      ) : (
        <div className="flex flex-col gap-1">
          {data.top.map((r, i) => {
            const mine = r.anon_id === anonId
            return (
              <div
                key={r.anon_id}
                className="flex items-center justify-between rounded-xl px-3 py-1.5 text-sm"
                style={{
                  background: mine ? 'var(--taut-path)' : 'var(--taut-surface)',
                  color: mine ? '#fff' : 'var(--taut-text)',
                  border: `2px solid ${mine ? 'var(--taut-path)' : 'var(--taut-grid-line)'}`,
                }}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span className="font-bold" style={{ minWidth: 22 }}>
                    {i + 1}.
                  </span>
                  <span className="truncate">{r.name || 'anônimo'}</span>
                </span>
                <span className="shrink-0 font-semibold">
                  {r.effort} · ⏱{fmt(r.time_ms)}
                </span>
              </div>
            )
          })}
          {data.myRank !== null && !inTop && (
            <p
              className="mt-1 text-center text-xs font-bold"
              style={{ color: 'var(--taut-accent)' }}
            >
              Você: #{data.myRank}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
