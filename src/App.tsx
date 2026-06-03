import { useMemo } from 'react'
import { generateDaily } from './engine/generator'
import { GameCanvas } from './components/GameCanvas'

/** Data de hoje no fuso local, no formato ISO `YYYY-MM-DD`. */
function todayISO(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export default function App() {
  const date = todayISO()
  const puzzle = useMemo(() => generateDaily(date), [date])

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

      <GameCanvas puzzle={puzzle} />

      <footer className="text-xs" style={{ color: 'var(--taut-muted)' }}>
        {date}
      </footer>
    </main>
  )
}
