// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { renderHook, act, cleanup } from '@testing-library/react'
import { useTaut } from './useTaut'
import { solve } from '../engine/solver'
import { clearAll } from '../lib/storage'

beforeEach(() => clearAll())
afterEach(cleanup)

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
})
