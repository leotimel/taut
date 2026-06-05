/**
 * Texto de compartilhamento estilo Wordle — sem imagem, SEM revelar o traçado
 * nem o número do ideal (que fica oculto pra quem ainda não jogou). O "floreio"
 * é uma barra abstrata de 5 blocos indicando o quão perto do ideal você ficou.
 * Camada de app (pode tocar o DOM no share/clipboard).
 */

/** Dia 1 do Taut — base pra numerar os puzzles ("Taut #N"). */
export const TAUT_EPOCH = '2026-06-01'

/** URL pública do jogo (entra no fim do texto de compartilhamento). */
export const TAUT_URL = 'https://playtaut.vercel.app'

function dayNumber(date: string): number {
  const [y, m, d] = date.split('-').map(Number)
  return Math.floor(Date.UTC(y, m - 1, d) / 86_400_000)
}

/** Número do puzzle do dia (1 = TAUT_EPOCH). */
export function puzzleNumber(date: string): number {
  return dayNumber(date) - dayNumber(TAUT_EPOCH) + 1
}

function formatTime(ms: number): string {
  const s = Math.floor(Math.max(0, ms) / 1000)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export interface ShareParams {
  date: string
  /** Pontos do dia (geometria + tempo + tentativas). */
  points: number
  elapsedMs: number
  streak: number
  /** Geometria do jogador e ideal — usados só pro floreio; o ideal NÃO é impresso. */
  geometry: number
  ideal: number
}

/**
 * Monta a string de compartilhamento. Formato:
 *
 *   Taut #12 · esforço 14 · ⏱1:23 · 🔥3
 *   🟦🟦🟦⬜⬜
 *
 * A barra tem 5 blocos: cheia (5 azuis) quando bateu no ideal; perde um bloco a
 * cada ponto de geometria acima do ideal. Nunca aparece o valor do ideal.
 */
export function buildShareText(params: ShareParams): string {
  const n = puzzleNumber(params.date)
  const gap = Math.max(0, params.geometry - params.ideal)
  const filled = Math.max(0, Math.min(5, 5 - gap))
  const bar = '🟦'.repeat(filled) + '⬜'.repeat(5 - filled)
  return (
    `Taut #${n} · esforço ${params.points} · ⏱${formatTime(params.elapsedMs)} · 🔥${params.streak}\n` +
    `${bar}\n${TAUT_URL}`
  )
}

export type ShareResult = 'shared' | 'copied' | 'downloaded' | 'unavailable'

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // ignora (sem permissão/contexto inseguro)
  }
  return false
}

/**
 * Compartilha o texto: usa `navigator.share` (nativo, mobile) quando existe;
 * senão copia pro clipboard. Retorna o que aconteceu pra UI dar feedback.
 */
export async function share(text: string): Promise<ShareResult> {
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share({ text })
      return 'shared'
    } catch (err) {
      // Usuário cancelou o share nativo: não precisa copiar.
      if (err instanceof Error && err.name === 'AbortError') return 'shared'
      // Outro erro: tenta o clipboard.
    }
  }
  return (await copyToClipboard(text)) ? 'copied' : 'unavailable'
}
