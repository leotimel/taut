// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act, cleanup } from '@testing-library/react'
import { useTaut } from './useTaut'
import { solve } from '../engine/solver'
import { clearAll } from '../lib/storage'

beforeEach(() => clearAll())
afterEach(cleanup)

function setVisibility(value: 'visible' | 'hidden') {
  Object.defineProperty(document, 'visibilityState', { value, configurable: true })
  document.dispatchEvent(new Event('visibilitychange'))
}

describe('useTaut', () => {
  it('carrega o puzzle do dia e começa no waypoint 1', () => {
    const { result } = renderHook(() => useTaut('2026-06-03'))
    expect(result.current.path).toHaveLength(1)
    expect(result.current.path[0]).toEqual(result.current.puzzle.waypoints[0])
    expect(result.current.completed).toBe(false)
    expect(result.current.par).not.toBeNull()
    expect(result.current.attempts).toBe(1)
  })

  it('percorrer o caminho ótimo conclui, bate no ideal e atualiza o streak', () => {
    const { result } = renderHook(() => useTaut('2026-06-03'))
    const best = solve(result.current.puzzle, 2)!.bestPath
    act(() => {
      for (const cell of best.slice(1)) result.current.route(cell)
    })
    expect(result.current.completed).toBe(true)
    expect(result.current.geometry.total).toBe(result.current.par!.total)
    expect(result.current.points.total).toBe(result.current.geometry.total) // sem tempo/refazer
    expect(result.current.stats.currentStreak).toBe(1)
    expect(result.current.stats.parCount).toBe(1)
  })

  it('reset volta o caminho pro início', () => {
    const { result } = renderHook(() => useTaut('2026-06-03'))
    const best = solve(result.current.puzzle, 2)!.bestPath
    act(() => {
      result.current.route(best[1])
    })
    expect(result.current.path.length).toBeGreaterThan(1)
    act(() => {
      result.current.reset()
    })
    expect(result.current.path).toHaveLength(1)
  })

  it('treino (persist=false): conclui sem gravar sessão nem histórico', () => {
    const { result } = renderHook(() => useTaut('2026-06-03', true, false))
    const best = solve(result.current.puzzle, 2)!.bestPath
    act(() => {
      for (const cell of best.slice(1)) result.current.route(cell)
    })
    expect(result.current.completed).toBe(true)
    expect(localStorage.getItem('taut:session:v1')).toBeNull() // sessão intacta
    expect(result.current.stats.daysPlayed).toBe(0) // nada no histórico
    expect(result.current.leveledUp).toBe(false) // sem XP em treino
  })

  it('o cronômetro só corre quando active (grid jogável)', () => {
    vi.useFakeTimers()
    try {
      const { result, rerender } = renderHook(
        ({ active }) => useTaut('2026-06-03', active),
        { initialProps: { active: false } },
      )
      // Pausado enquanto há overlay (active=false): tempo não anda.
      act(() => vi.advanceTimersByTime(2000))
      expect(result.current.elapsedMs).toBe(0)
      // Grid liberado: passa a contar.
      rerender({ active: true })
      act(() => vi.advanceTimersByTime(1000))
      expect(result.current.elapsedMs).toBeGreaterThanOrEqual(900)
    } finally {
      vi.useRealTimers()
    }
  })

  it('pausa o cronômetro quando a aba sai de foco', () => {
    vi.useFakeTimers()
    try {
      const { result } = renderHook(() => useTaut('2026-06-03', true))
      act(() => vi.advanceTimersByTime(1000))
      const before = result.current.elapsedMs
      expect(before).toBeGreaterThanOrEqual(900)
      // Aba escondida: o tempo parado NÃO conta.
      act(() => setVisibility('hidden'))
      act(() => vi.advanceTimersByTime(5000))
      expect(result.current.elapsedMs).toBe(before)
      // Voltou ao foco: retoma.
      act(() => setVisibility('visible'))
      act(() => vi.advanceTimersByTime(1000))
      expect(result.current.elapsedMs).toBeGreaterThanOrEqual(before + 900)
    } finally {
      setVisibility('visible')
      vi.useRealTimers()
    }
  })
})
