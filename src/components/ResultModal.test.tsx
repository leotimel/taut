// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { ResultModal } from './ResultModal'

afterEach(cleanup)
import type { Point, Puzzle, Score } from '../engine/types'
import type { PointsBreakdown } from '../lib/points'
import type { Stats } from '../lib/storage'
import { levelForXp } from '../lib/level'

const p = (x: number, y: number): Point => ({ x, y })

const puzzle: Puzzle = {
  date: '2026-06-03',
  size: 3,
  waypoints: [p(0, 0), p(2, 0)],
  walls: [],
  seed: 0,
}
const score: Score = { length: 2, turns: 0, total: 2 }
const points: PointsBreakdown = {
  geometry: 2,
  timePenalty: 0,
  attemptsPenalty: 0,
  total: 2,
}
const stats: Stats = {
  currentStreak: 3,
  bestStreak: 5,
  daysPlayed: 7,
  parCount: 4,
  history: [],
}
const base = {
  onClose: () => {},
  puzzle,
  playerPath: [p(0, 0), p(1, 0), p(2, 0)],
  bestPath: [p(0, 0), p(1, 0), p(2, 0)],
  par: score,
  geometry: score,
  elapsedMs: 65_000,
  points,
  stats,
  level: levelForXp(0),
  todayXp: 0,
  leveledUp: false,
}

describe('ResultModal', () => {
  it('não renderiza nada quando fechado', () => {
    const { container } = render(
      <ResultModal {...base} completed open={false} />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('concluído no ideal: revela o ideal e mostra os pontos do dia', () => {
    render(<ResultModal {...base} completed open />)
    expect(screen.getByText('No ideal! 🎉')).toBeInTheDocument()
    expect(screen.getByText(/Caminho/)).toBeInTheDocument()
    expect(screen.getByText('pontos do dia')).toBeInTheDocument()
    expect(screen.getByText('streak 🔥')).toBeInTheDocument()
  })

  it('não-concluído: esconde o ideal e só mostra as estatísticas', () => {
    render(<ResultModal {...base} completed={false} open />)
    expect(screen.getByText('Estatísticas')).toBeInTheDocument()
    expect(screen.queryByText(/Caminho/)).not.toBeInTheDocument()
  })
})
