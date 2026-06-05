/**
 * Tutorial interativo — substitui o onboarding estático na 1ª visita. O jogador
 * pratica de verdade num tabuleiro 3×3 (reusa o GameCanvas em modo `minimal` e o
 * `routeTo` puro do engine), coachado passo a passo conforme o traçado avança,
 * antes de encarar o puzzle do dia. O "?" no cabeçalho ainda abre o Onboarding
 * curto como referência.
 */
import { useEffect, useMemo, useState } from 'react'
import type { Point, Puzzle, Score } from '../engine/types'
import { routeTo } from '../engine/route'
import { samePoint } from '../engine/geometry'
import { GameCanvas } from './GameCanvas'

interface TutorialProps {
  open: boolean
  onClose: () => void
}

const pt = (x: number, y: number): Point => ({ x, y })

// Treino: 1=(0,0) → 2=(2,0) → 3=(2,2). Um "L" simples, sem paredes.
const PRACTICE: Puzzle = {
  date: 'tutorial',
  size: 3,
  waypoints: [pt(0, 0), pt(2, 0), pt(2, 2)],
  walls: [],
  seed: 0,
}

const DUMMY_SCORE: Score = { length: 0, turns: 0, total: 0 }
const START: Point[] = [PRACTICE.waypoints[0]]

const STEPS = [
  {
    title: 'Ligue na ordem',
    body: 'Arraste com o dedo do ① até o ②, uma célula por vez.',
  },
  {
    title: 'Continue até o fim',
    body: 'Boa! Agora siga do ② até o ③ pra fechar o caminho.',
  },
  {
    title: 'É isso! 🎉',
    body: 'Quanto mais curto e com menos curvas, menor o esforço. No jogo o Ideal fica escondido até você concluir — tente alcançá-lo!',
  },
]

export function Tutorial({ open, onClose }: TutorialProps) {
  const [path, setPath] = useState<Point[]>(START)

  // Reinicia o treino sempre que (re)abre.
  useEffect(() => {
    if (open) setPath(START)
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const reachedSecond = useMemo(
    () => path.some((c) => samePoint(c, PRACTICE.waypoints[1])),
    [path],
  )
  const completed = useMemo(
    () => PRACTICE.waypoints.every((w) => path.some((c) => samePoint(c, w))),
    [path],
  )
  const step = completed ? 2 : reachedSecond ? 1 : 0

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.5)' }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Tutorial"
        className="flex w-full max-w-xs flex-col items-center gap-3 rounded-3xl p-6 text-center shadow-2xl"
        style={{ background: 'var(--taut-grid)', color: 'var(--taut-text)' }}
      >
        <h2 className="text-lg font-black" style={{ color: 'var(--taut-path)' }}>
          {STEPS[step].title}
        </h2>
        <p className="min-h-[3.5rem] text-sm">{STEPS[step].body}</p>

        <div className="w-48">
          <GameCanvas
            puzzle={PRACTICE}
            path={path}
            completed={completed}
            par={null}
            geometry={DUMMY_SCORE}
            elapsedMs={0}
            onRoute={(cell) => setPath((prev) => routeTo(prev, cell, PRACTICE))}
            onReset={() => setPath(START)}
            minimal
          />
        </div>

        <div className="flex w-full items-center justify-center gap-3">
          {completed ? (
            <button
              type="button"
              onClick={onClose}
              autoFocus
              className="min-h-[44px] flex-1 rounded-full px-6 py-2 text-sm font-bold transition active:scale-95"
              style={{ background: 'var(--taut-path)', color: '#fff' }}
            >
              Jogar o de hoje
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setPath(START)}
                className="min-h-[44px] rounded-full px-4 py-2 text-sm font-semibold transition active:scale-95"
                style={{
                  background: 'var(--taut-grid)',
                  color: 'var(--taut-text)',
                  border: '2px solid var(--taut-grid-line)',
                }}
              >
                Recomeçar
              </button>
              <button
                type="button"
                onClick={onClose}
                className="min-h-[44px] rounded-full px-4 py-2 text-sm font-semibold transition active:scale-95"
                style={{ color: 'var(--taut-muted)' }}
              >
                Pular
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
