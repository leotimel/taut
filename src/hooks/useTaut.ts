/**
 * useTaut — estado de jogo do dia. Carrega o puzzle (determinístico pela data),
 * guarda o caminho atual, conta tentativas e roda o cronômetro de TEMPO ATIVO:
 * começa quando o grid está jogável (`active` — sem overlay por cima) e a aba
 * está visível; **pausa fora de foco**; congela na conclusão; persiste pra
 * retomar. Calcula geometria vs ideal + esforço do dia em tempo real e salva o
 * resultado ao concluir. Importa do engine e da lib; a UI consome este hook.
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
import { xpForDay, levelForXp, totalXpFromHistory } from '../lib/level'

const K = 2

/** Data de hoje no fuso local, ISO `YYYY-MM-DD`. */
export function todayISO(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * @param active O grid está jogável (sem overlay de tutorial/onboarding/painel
 *   por cima). O cronômetro só corre quando `active` **e** a aba está visível.
 * @param persist Grava sessão/resultado no storage. `false` = modo **treino**
 *   (jogar um dia passado sem afetar sessão de hoje, streak, stats ou XP).
 */
export function useTaut(dateOverride?: string, active = true, persist = true) {
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
  const [completedAt, setCompletedAt] = useState<number | null>(null)

  // Cronômetro: tempo ATIVO acumulado (ms). Sobe por deltas enquanto corre e
  // "banca" o trecho parcial ao pausar. `elapsedRef` espelha pra persistência.
  const [elapsedMs, setElapsedMs] = useState(0)
  const elapsedRef = useRef(0)
  useEffect(() => {
    elapsedRef.current = elapsedMs
  }, [elapsedMs])

  const [visible, setVisible] = useState(
    () => typeof document === 'undefined' || document.visibilityState === 'visible',
  )

  // Stats/XP: no jogo normal, relativos ao dia do puzzle (= hoje em produção);
  // em TREINO (dia passado), relativos a hoje de verdade (não é aquele dia).
  const statsDate = persist ? date : todayISO()
  const [stats, setStats] = useState<Stats>(() => getStats(statsDate))

  // (Re)carrega a sessão e zera o caminho quando o dia muda. Em treino
  // (`!persist`) começa sempre do zero, sem tocar na sessão salva de hoje.
  useEffect(() => {
    const s = persist
      ? loadSession(date)
      : { attempts: 1, completedAt: null, elapsedMs: 0, path: [] as Point[] }
    setAttempts(s.attempts)
    setCompletedAt(s.completedAt)
    elapsedRef.current = s.elapsedMs
    setElapsedMs(s.elapsedMs)
    setPath(s.path.length > 0 ? s.path : [puzzle.waypoints[0]])
    setStats(getStats(statsDate))
  }, [date, puzzle, setPath, persist, statsDate])

  const completed = useMemo(() => isLegalPath(path, puzzle).legal, [path, puzzle])
  const completedRef = useRef(completed)
  completedRef.current = completed

  // Visibilidade da aba: pausa o cronômetro fora de foco e persiste ao sair.
  useEffect(() => {
    if (typeof document === 'undefined') return
    const onVis = () => {
      const vis = document.visibilityState === 'visible'
      setVisible(vis)
      if (!vis && persist) {
        saveSession({
          date,
          elapsedMs: elapsedRef.current,
          completedAt,
          attempts,
          path: pathRef.current,
        })
      }
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [date, completedAt, attempts, persist])

  // Tique do cronômetro: corre só com grid jogável, aba visível e não concluído.
  useEffect(() => {
    if (!active || !visible || completed) return
    let last = Date.now()
    const id = setInterval(() => {
      const now = Date.now()
      const delta = now - last
      last = now
      setElapsedMs((e) => e + delta)
    }, 250)
    return () => {
      clearInterval(id)
      const rest = Date.now() - last
      if (rest > 0) setElapsedMs((e) => e + rest)
    }
  }, [active, visible, completed])

  const geometry = useMemo(() => score(path, K), [path])
  const points = useMemo<PointsBreakdown>(
    () => dailyPoints(geometry.total, elapsedMs, attempts),
    [geometry.total, elapsedMs, attempts],
  )

  // Ao concluir: salva/atualiza o resultado (uma vez). O cronômetro congela
  // sozinho (deixa de correr quando `completed`).
  useEffect(() => {
    if (!completed) return
    if (completedAt === null) {
      const finishedAt = Date.now()
      setCompletedAt(finishedAt)
      if (persist) {
        saveSession({
          date,
          elapsedMs: elapsedRef.current,
          completedAt: finishedAt,
          attempts,
          path: pathRef.current,
        })
      }
    }
    // Treino (`!persist`) não grava resultado nem mexe nas stats.
    if (persist) {
      saveResult({
        date,
        score: geometry.total,
        par: par?.total ?? geometry.total,
        completed: true,
        points: points.total,
      })
      setStats(getStats(date))
    }
  }, [completed, completedAt, date, attempts, geometry.total, par, points.total, persist])

  // Nível & XP (derivados do histórico). `leveledUp` compara antes/depois de hoje.
  const totalXp = useMemo(() => totalXpFromHistory(stats.history), [stats])
  const level = useMemo(() => levelForXp(totalXp), [totalXp])
  // Em treino não há ganho de XP nem "subiu de nível".
  const todayRecord = stats.history.find((r) => r.date === date)
  const todayXp =
    persist && completed && todayRecord !== undefined
      ? xpForDay(todayRecord.points ?? todayRecord.score, todayRecord.par)
      : 0
  const leveledUp = useMemo(
    () => persist && completed && levelForXp(totalXp - todayXp).level < level.level,
    [persist, completed, totalXp, todayXp, level.level],
  )

  /** Aplica o arrasto até `cell` (estende/retrocede). */
  const route = useCallback(
    (cell: Point) => {
      if (completedRef.current) return
      const prev = pathRef.current
      const next = routeTo(prev, cell, puzzle)
      if (next === prev) return
      setPath(next)
      if (persist) saveSession({ date, elapsedMs: elapsedRef.current, completedAt, attempts, path: next })
    },
    [puzzle, completedAt, date, attempts, setPath, persist],
  )

  /** Desfaz o último segmento. */
  const undo = useCallback(() => {
    if (completedRef.current) return
    const prev = pathRef.current
    if (prev.length <= 1) return
    const next = prev.slice(0, -1)
    setPath(next)
    if (persist) saveSession({ date, elapsedMs: elapsedRef.current, completedAt, attempts, path: next })
  }, [setPath, date, completedAt, attempts, persist])

  /** Recomeça do zero no mesmo dia; conta como tentativa se houve progresso. */
  const reset = useCallback(() => {
    const drew = pathRef.current.length > 1
    const nextAttempts = drew ? attempts + 1 : attempts
    if (drew) setAttempts(nextAttempts)
    const fresh = [puzzle.waypoints[0]]
    setPath(fresh)
    if (persist) {
      saveSession({
        date,
        elapsedMs: elapsedRef.current,
        completedAt,
        attempts: nextAttempts,
        path: fresh,
      })
    }
  }, [puzzle, completedAt, attempts, date, setPath, persist])

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
    level,
    todayXp,
    leveledUp,
    route,
    undo,
    reset,
  }
}
