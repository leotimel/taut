import { useEffect, useState } from 'react'
import { useTaut } from './hooks/useTaut'
import { GameCanvas } from './components/GameCanvas'
import { ResultModal } from './components/ResultModal'
import { buildShareText, share } from './lib/share'
import { buildChallengeUrl, parseChallenge } from './lib/challenge'
import { Onboarding } from './components/Onboarding'
import {
  hasSeenOnboarding,
  markOnboardingSeen,
  getPaletteId,
  setPaletteId,
} from './lib/storage'
import { applyPalette } from './lib/palettes'
import { Analytics } from '@vercel/analytics/react'

export default function App() {
  const taut = useTaut()
  const [modalOpen, setModalOpen] = useState(false)
  const [challenge] = useState(() => parseChallenge())
  const [onboardingOpen, setOnboardingOpen] = useState(() => !hasSeenOnboarding())
  const [paletteId, setPaletteIdState] = useState(() => getPaletteId())

  useEffect(() => {
    applyPalette(paletteId)
  }, [paletteId])

  const closeOnboarding = () => {
    markOnboardingSeen()
    setOnboardingOpen(false)
  }

  const selectPalette = (id: string) => {
    setPaletteId(id)
    setPaletteIdState(id)
  }

  // Abre o painel automaticamente ao concluir.
  useEffect(() => {
    if (taut.completed) setModalOpen(true)
  }, [taut.completed])

  const handleShare = () =>
    share(
      buildShareText({
        date: taut.date,
        points: taut.points.total,
        elapsedMs: taut.elapsedMs,
        streak: taut.stats.currentStreak,
        geometry: taut.geometry.total,
        ideal: taut.par?.total ?? taut.geometry.total,
      }),
    )

  const handleChallenge = () =>
    share(buildChallengeUrl({ date: taut.date, points: taut.points.total }))

  return (
    <main
      className="flex min-h-svh flex-col items-center justify-center gap-6 px-4 py-8"
      style={{ background: 'var(--taut-surface)', color: 'var(--taut-text)' }}
    >
      <header className="relative w-full max-w-[min(90vw,520px)] text-center">
        <button
          type="button"
          onClick={() => setOnboardingOpen(true)}
          aria-label="Como jogar"
          className="absolute top-0 left-0 flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-lg font-bold transition active:scale-95"
          style={{ background: 'var(--taut-grid)', border: '2px solid var(--taut-grid-line)' }}
        >
          ?
        </button>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          aria-label="Estatísticas"
          className="absolute top-0 right-0 flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-lg transition active:scale-95"
          style={{ background: 'var(--taut-grid)', border: '2px solid var(--taut-grid-line)' }}
        >
          📊
        </button>
        <h1
          className="text-4xl font-black tracking-tight"
          style={{ color: 'var(--taut-path)' }}
        >
          Taut
        </h1>
        <p className="text-sm" style={{ color: 'var(--taut-muted)' }}>
          Ligue os números em ordem · contorne as paredes · chegue no ideal
        </p>
        <div className="mt-2 flex justify-center">
          <span
            className="rounded-full px-3 py-1 text-xs font-bold"
            style={{
              background: 'var(--taut-grid)',
              border: '2px solid var(--taut-grid-line)',
              color: 'var(--taut-text)',
            }}
          >
            Nv {taut.level.level} · {taut.level.codename}
          </span>
        </div>
      </header>

      {challenge && challenge.date === taut.date && (
        <div
          className="rounded-full px-4 py-2 text-sm font-semibold"
          style={{
            background: 'var(--taut-grid)',
            border: '2px solid var(--taut-accent)',
            color: 'var(--taut-text)',
          }}
        >
          🎯 Supere {challenge.points} pts
          {taut.completed
            ? taut.points.total < challenge.points
              ? ' · Você superou! 🎉'
              : taut.points.total === challenge.points
                ? ' · Empatou!'
                : ' · Não superou'
            : ''}
        </div>
      )}

      <GameCanvas
        puzzle={taut.puzzle}
        path={taut.path}
        completed={taut.completed}
        par={taut.par}
        geometry={taut.geometry}
        elapsedMs={taut.elapsedMs}
        onRoute={taut.route}
        onReset={taut.reset}
        onUndo={taut.undo}
      />

      <footer className="text-xs" style={{ color: 'var(--taut-muted)' }}>
        {taut.date}
      </footer>

      <ResultModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        completed={taut.completed}
        puzzle={taut.puzzle}
        playerPath={taut.path}
        bestPath={taut.bestPath}
        par={taut.par}
        geometry={taut.geometry}
        elapsedMs={taut.elapsedMs}
        points={taut.points}
        stats={taut.stats}
        level={taut.level}
        todayXp={taut.todayXp}
        leveledUp={taut.leveledUp}
        paletteId={paletteId}
        onSelectPalette={selectPalette}
        onShare={handleShare}
        onChallenge={handleChallenge}
      />

      <Onboarding open={onboardingOpen} onClose={closeOnboarding} />
      <Analytics />
    </main>
  )
}
