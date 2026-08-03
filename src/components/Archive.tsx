/**
 * Arquivo / treino — escolher um puzzle de um dia passado pra jogar. O gerador é
 * determinístico por data, então basta carregar aquele dia (em modo treino: não
 * afeta streak/stats/XP). Lista os dias anteriores a hoje (mais recentes no topo),
 * marcando os que você já concluiu no histórico.
 */
import { useEffect } from 'react'
import { puzzleNumber, TAUT_EPOCH } from '../lib/share'

interface ArchiveProps {
  open: boolean
  onClose: () => void
  onSelect: (date: string) => void
  /** Data de hoje (ISO). Só dias ANTES desta aparecem. */
  todayDate: string
  /** Datas já concluídas (do histórico) — recebem um ✓. */
  completedDates: Set<string>
}

const MAX_DAYS = 60

function dayNum(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number)
  return Math.floor(Date.UTC(y, m - 1, d) / 86_400_000)
}
function isoFromNum(n: number): string {
  const dt = new Date(n * 86_400_000)
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`
}

export function Archive({ open, onClose, onSelect, todayDate, completedDates }: ArchiveProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const epochN = dayNum(TAUT_EPOCH)
  const days: string[] = []
  for (let n = dayNum(todayDate) - 1; n >= epochN && days.length < MAX_DAYS; n--) {
    days.push(isoFromNum(n))
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onPointerDown={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Arquivo de puzzles"
        className="flex max-h-[85svh] w-full max-w-sm flex-col overflow-hidden rounded-3xl shadow-2xl"
        style={{ background: 'var(--taut-grid)', color: 'var(--taut-text)' }}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between px-6 pt-5 pb-2">
          <h2 className="text-xl font-black" style={{ color: 'var(--taut-path)' }}>
            Arquivo · treino
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="flex min-h-[44px] min-w-[44px] items-center justify-center text-xl leading-none"
            style={{ color: 'var(--taut-muted)' }}
          >
            ✕
          </button>
        </div>
        <p className="shrink-0 px-6 pb-3 text-xs" style={{ color: 'var(--taut-muted)' }}>
          Jogue puzzles de dias passados. Treino não conta pro streak nem pras
          estatísticas.
        </p>

        {days.length === 0 ? (
          <p className="px-6 pb-6 text-sm" style={{ color: 'var(--taut-muted)' }}>
            Ainda não há dias anteriores. Volte amanhã!
          </p>
        ) : (
          <div className="flex flex-col gap-1 overflow-y-auto px-4 pb-4">
            {days.map((d) => {
              const done = completedDates.has(d)
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => onSelect(d)}
                  className="flex min-h-[44px] items-center justify-between rounded-2xl px-4 py-2 text-left transition active:scale-[0.99]"
                  style={{
                    background: 'var(--taut-surface)',
                    border: '2px solid var(--taut-grid-line)',
                  }}
                >
                  <span className="font-bold">Taut #{puzzleNumber(d)}</span>
                  <span className="flex items-center gap-2 text-sm" style={{ color: 'var(--taut-muted)' }}>
                    {d}
                    {done && <span style={{ color: 'var(--taut-accent)' }}>✓</span>}
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
