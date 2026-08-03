import { useEffect, useState } from 'react'
import { useTaut, todayISO } from './hooks/useTaut'
import { GameCanvas } from './components/GameCanvas'
import { ResultModal } from './components/ResultModal'
import { buildShareText, share, puzzleNumber } from './lib/share'
import { Onboarding } from './components/Onboarding'
import { Tutorial } from './components/Tutorial'
import { Archive } from './components/Archive'
import {
  hasSeenOnboarding,
  markOnboardingSeen,
  getPaletteId,
  setPaletteId,
  isSoundOn,
  setSoundOn,
} from './lib/storage'
import { applyPalette } from './lib/palettes'
import { setMuted } from './lib/sound'
import { Analytics } from '@vercel/analytics/react'

export default function App() {
  const [modalOpen, setModalOpen] = useState(false)
  const [onboardingOpen, setOnboardingOpen] = useState(false)
  const [tutorialOpen, setTutorialOpen] = useState(() => !hasSeenOnboarding())
  const [paletteId, setPaletteIdState] = useState(() => getPaletteId())
  const [soundOn, setSoundOnState] = useState(() => isSoundOn())
  const [archiveOpen, setArchiveOpen] = useState(false)
  // Data em treino (dia passado); null = puzzle de hoje.
  const [trainingDate, setTrainingDate] = useState<string | null>(null)

  // O cronômetro só corre com o grid jogável (sem overlay por cima). A pausa
  // fora de foco (aba) é tratada dentro do useTaut. Em treino, persist=false.
  const gridActive = !modalOpen && !onboardingOpen && !tutorialOpen && !archiveOpen
  const taut = useTaut(trainingDate ?? undefined, gridActive, trainingDate === null)

  useEffect(() => {
    applyPalette(paletteId)
  }, [paletteId])

  useEffect(() => {
    setMuted(!soundOn)
  }, [soundOn])

  const toggleSound = () => {
    const next = !soundOn
    setSoundOn(next)
    setSoundOnState(next)
  }

  const closeOnboarding = () => setOnboardingOpen(false)

  const closeTutorial = () => {
    markOnboardingSeen()
    setTutorialOpen(false)
  }

  const selectPalette = (id: string) => {
    setPaletteId(id)
    setPaletteIdState(id)
  }

  const startTraining = (date: string) => {
    setArchiveOpen(false)
    setModalOpen(false)
    setTrainingDate(date)
  }
  const exitTraining = () => {
    setModalOpen(false)
    setTrainingDate(null)
  }

  const completedDates = new Set(
    taut.stats.history.filter((r) => r.completed).map((r) => r.date),
  )

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
        attempts: taut.attempts,
        geometry: taut.geometry.total,
        ideal: taut.par?.total ?? taut.geometry.total,
      }),
    )

  return (
    <main
      className="flex min-h-svh flex-col items-center justify-center gap-6 px-4 py-8"
      style={{ background: 'var(--taut-surface)', color: 'var(--taut-text)' }}
    >
      <header className="relative w-full max-w-[min(90vw,520px)] text-center">
        <div className="absolute top-0 left-0 flex gap-1">
          <button
            type="button"
            onClick={() => setOnboardingOpen(true)}
            aria-label="Como jogar"
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-lg font-bold transition active:scale-95"
            style={{ background: 'var(--taut-grid)', border: '2px solid var(--taut-grid-line)' }}
          >
            ?
          </button>
          <button
            type="button"
            onClick={() => setArchiveOpen(true)}
            aria-label="Arquivo de puzzles"
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-lg transition active:scale-95"
            style={{ background: 'var(--taut-grid)', border: '2px solid var(--taut-grid-line)' }}
          >
            📅
          </button>
        </div>
        <div className="absolute top-0 right-0 flex gap-1">
          <button
            type="button"
            onClick={toggleSound}
            aria-label={soundOn ? 'Desligar som' : 'Ligar som'}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-lg transition active:scale-95"
            style={{ background: 'var(--taut-grid)', border: '2px solid var(--taut-grid-line)' }}
          >
            {soundOn ? '🔊' : '🔇'}
          </button>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            aria-label="Estatísticas"
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-lg transition active:scale-95"
            style={{ background: 'var(--taut-grid)', border: '2px solid var(--taut-grid-line)' }}
          >
            📊
          </button>
        </div>
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

      {trainingDate && (
        <div
          className="flex items-center gap-3 rounded-full px-4 py-2 text-sm font-semibold"
          style={{
            background: 'var(--taut-grid)',
            border: '2px solid var(--taut-accent)',
            color: 'var(--taut-text)',
          }}
        >
          <span>🎯 Treino · Taut #{puzzleNumber(trainingDate)}</span>
          <button
            type="button"
            onClick={exitTraining}
            className="rounded-full px-3 py-1 text-xs font-bold transition active:scale-95"
            style={{ background: 'var(--taut-path)', color: '#fff' }}
          >
            Voltar pra hoje
          </button>
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
      />

      <Onboarding open={onboardingOpen} onClose={closeOnboarding} />
      <Tutorial open={tutorialOpen} onClose={closeTutorial} />
      <Archive
        open={archiveOpen}
        onClose={() => setArchiveOpen(false)}
        onSelect={startTraining}
        todayDate={todayISO()}
        completedDates={completedDates}
      />
      <Analytics />
    </main>
  )
}
