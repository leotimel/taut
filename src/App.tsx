import { useTaut } from './hooks/useTaut'
import { GameCanvas } from './components/GameCanvas'

export default function App() {
  const taut = useTaut()

  return (
    <main
      className="flex min-h-svh flex-col items-center justify-center gap-6 px-4 py-8"
      style={{ background: 'var(--taut-surface)', color: 'var(--taut-text)' }}
    >
      <header className="text-center">
        <h1
          className="text-4xl font-black tracking-tight"
          style={{ color: 'var(--taut-path)' }}
        >
          Taut
        </h1>
        <p className="text-sm" style={{ color: 'var(--taut-muted)' }}>
          Ligue os números em ordem · contorne as paredes · chegue no ideal
        </p>
      </header>

      <GameCanvas
        puzzle={taut.puzzle}
        path={taut.path}
        completed={taut.completed}
        par={taut.par}
        geometry={taut.geometry}
        elapsedMs={taut.elapsedMs}
        onRoute={taut.route}
        onReset={taut.reset}
      />

      <footer className="text-xs" style={{ color: 'var(--taut-muted)' }}>
        {taut.date}
      </footer>
    </main>
  )
}
