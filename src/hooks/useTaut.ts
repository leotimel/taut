/**
 * useTaut — estado de jogo do dia. Carrega o puzzle (determinístico pela data),
 * guarda o caminho atual, conta tentativas, roda o timer (começa na 1ª interação,
 * pausa na conclusão, persiste pra não reiniciar ao reabrir) e calcula geometria
 * vs ideal + pontos do dia em tempo real. Salva o resultado no storage ao
 * concluir. Importa do engine e da lib; a UI consome este hook.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Point } from '../engine/types'
import { generateDaily } from '../engine/generator'
import { score } from '../engine/scorer'
import { solve } from '../engine/solver'
import { isLegalPath } from '../engine/validator'
import { routeTo } from '../engine/route'
import { dailyPoints, type PointsBreakdown } from '../lib/points'
import {
  saveResult,
  getStats,
  loadSession,
  saveSession,
  type Stats,
} from '../lib/storage'

const K = 2

/** Data de hoje no fuso local, ISO `YYYY-MM-DD`. */
export function todayISO(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function useTaut(dateOverride?: string) {
  const date = useMemo(() => dateOverride ?? todayISO(), [dateOverride])
  const puzzle = useMemo(() => generateDaily(date), [date])
  const solution = useMemo(() => solve(puzzle, K), [puzzle])
  const par = solution?.par ?? null
  const bestPath = solution?.bestPath ?? null

  const [path, setPathState] = useState<Point[]>(() => [puzzle.waypoints[0]])
  const pathRef = useRef(path)
  const setPath = useCallback((p: Point[]) => {
    pathRef.current = p
    setPathState(p)
  }, [])

  const [attempts, setAttempts] = useState(1)
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const [completedAt, setCompletedAt] = useState<number | null>(null)
  const [nowMs, setNowMs] = useState(() => Date.now())
  const [stats, setStats] = useState<Stats>(() => getStats(date))

  // (Re)carrega a sessão e zera o caminho quando o dia muda.
  useEffect(() => {
    const s = loadSession(date)
    setAttempts(s.attempts)
    setStartedAt(s.startedAt)
    setCompletedAt(s.completedAt)
    setPath([puzzle.waypoints[0]])
    setStats(getStats(date))
  }, [date, puzzle, setPath])

  const completed = useMemo(() => isLegalPath(path, puzzle).legal, [path, puzzle])
  const completedRef = useRef(completed)
  completedRef.current = completed

  // Tique do timer só enquanto está rodando.
  useEffect(() => {
    if (startedAt === null || completedAt !== null) return
    const id = setInterval(() => setNowMs(Date.now()), 250)
    return () => clearInterval(id)
  }, [startedAt, completedAt])

  const elapsedMs = startedAt === null ? 0 : (completedAt ?? nowMs) - startedAt
  const geometry = useMemo(() => score(path, K), [path])
  const points = useMemo<PointsBreakdown>(
    () => dailyPoints(geometry.total, elapsedMs, attempts),
    [geometry.total, elapsedMs, attempts],
  )

  // Ao concluir: congela o timer (1ª vez) e salva/atualiza o resultado.
  useEffect(() => {
    if (!completed) return
    if (completedAt === null) {
      const finishedAt = Date.now()
      setCompletedAt(finishedAt)
      saveSession({
        date,
        startedAt: startedAt ?? finishedAt,
        completedAt: finishedAt,
        attempts,
      })
    }
    saveResult({
      date,
      score: geometry.total,
      par: par?.total ?? geometry.total,
      completed: true,
    })
    setStats(getStats(date))
  }, [completed, completedAt, date, startedAt, attempts, geometry.total, par])

  /** Aplica o arrasto até `cell` (estende/retrocede); inicia o timer na 1ª vez. */
  const route = useCallback(
    (cell: Point) => {
      if (completedRef.current) return
      const prev = pathRef.current
      const next = routeTo(prev, cell, puzzle)
      if (next === prev) return
      if (startedAt === null) {
        const t = Date.now()
        setStartedAt(t)
        saveSession({ date, startedAt: t, completedAt: null, attempts })
      }
      setPath(next)
    },
    [puzzle, startedAt, date, attempts, setPath],
  )

  /** Desfaz o último segmento. */
  const undo = useCallback(() => {
    if (completedRef.current) return
    const prev = pathRef.current
    if (prev.length > 1) setPath(prev.slice(0, -1))
  }, [setPath])

  /** Recomeça do zero no mesmo dia; conta como tentativa se houve progresso. */
  const reset = useCallback(() => {
    const drew = pathRef.current.length > 1
    const nextAttempts = drew ? attempts + 1 : attempts
    if (drew) setAttempts(nextAttempts)
    setPath([puzzle.waypoints[0]])
    saveSession({ date, startedAt, completedAt, attempts: nextAttempts })
  }, [puzzle, startedAt, completedAt, attempts, date, setPath])

  return {
    date,
    puzzle,
    path,
    par,
    bestPath,
    geometry,
    completed,
    attempts,
    elapsedMs,
    points,
    stats,
    route,
    undo,
    reset,
  }
}
