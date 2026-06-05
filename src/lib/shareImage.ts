/**
 * Card de imagem pro compartilhamento — renderiza um PNG num canvas com o
 * resultado do dia (sem traçado nem o valor do ideal). Usa as cores da paleta
 * atual (CSS vars). Compartilha via navigator.share (com arquivo) ou baixa.
 */
import { puzzleNumber, TAUT_URL } from './share'

export interface CardParams {
  date: string
  points: number
  elapsedMs: number
  streak: number
  level: number
  codename: string
  /** geometria e ideal — só pro floreio (o ideal NÃO é desenhado). */
  geometry: number
  ideal: number
}

function fmtTime(ms: number): string {
  const s = Math.floor(Math.max(0, ms) / 1000)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

/** Renderiza o card e devolve um PNG (ou null se canvas indisponível). */
export async function renderCard(p: CardParams): Promise<Blob | null> {
  if (typeof document === 'undefined') return null
  try {
    const W = 600
    const H = 315
    const canvas = document.createElement('canvas')
    canvas.width = W
    canvas.height = H
    const ctx = canvas.getContext('2d')
    if (!ctx) return null

    const css = getComputedStyle(document.documentElement)
    const v = (name: string, fb: string) => css.getPropertyValue(name).trim() || fb
    const surface = v('--taut-surface', '#fff7ed')
    const path = v('--taut-path', '#db2777')
    const text = v('--taut-text', '#451a03')
    const muted = v('--taut-muted', '#b45309')
    const grid = v('--taut-grid', '#ffffff')
    const gridLine = v('--taut-grid-line', '#f7dcc4')

    ctx.fillStyle = surface
    ctx.fillRect(0, 0, W, H)
    ctx.fillStyle = path
    ctx.fillRect(0, 0, W, 8)

    ctx.textBaseline = 'top'
    ctx.fillStyle = path
    ctx.font = '700 56px system-ui, sans-serif'
    ctx.fillText('Taut', 40, 40)

    ctx.fillStyle = muted
    ctx.font = '500 20px system-ui, sans-serif'
    ctx.fillText(`#${puzzleNumber(p.date)} · Nv ${p.level} · ${p.codename}`, 42, 108)

    ctx.fillStyle = text
    ctx.font = '800 72px system-ui, sans-serif'
    const num = `${p.points}`
    ctx.fillText(num, 40, 150)
    const numW = ctx.measureText(num).width
    ctx.fillStyle = muted
    ctx.font = '600 30px system-ui, sans-serif'
    ctx.fillText('esforço', 40 + numW + 14, 188)

    ctx.fillStyle = text
    ctx.font = '500 28px system-ui, sans-serif'
    ctx.fillText(`⏱ ${fmtTime(p.elapsedMs)}     🔥 ${p.streak}`, 42, 248)

    // Floreio: 5 blocos (cheios = perto do ideal), sem mostrar o valor.
    const gap = Math.max(0, p.geometry - p.ideal)
    const filled = Math.max(0, Math.min(5, 5 - gap))
    const bs = 34
    const gapb = 8
    const bx0 = W - 40 - (5 * bs + 4 * gapb)
    for (let i = 0; i < 5; i++) {
      roundRect(ctx, bx0 + i * (bs + gapb), 60, bs, bs, 8)
      ctx.fillStyle = i < filled ? path : grid
      ctx.fill()
      ctx.lineWidth = 2
      ctx.strokeStyle = gridLine
      ctx.stroke()
    }

    ctx.fillStyle = muted
    ctx.font = '500 20px system-ui, sans-serif'
    ctx.fillText(TAUT_URL.replace(/^https?:\/\//, ''), 40, H - 40)

    return await new Promise<Blob | null>((res) =>
      canvas.toBlob((b) => res(b), 'image/png'),
    )
  } catch {
    return null
  }
}

export type ImageShareResult = 'shared' | 'downloaded' | 'unavailable'

/** Compartilha o PNG (navigator.share com arquivo) ou baixa como fallback. */
export async function shareCard(blob: Blob, text: string): Promise<ImageShareResult> {
  const file = new File([blob], 'taut.png', { type: 'image/png' })
  const nav = navigator as Navigator & {
    canShare?: (data: ShareData) => boolean
  }
  try {
    if (
      typeof nav.share === 'function' &&
      nav.canShare?.({ files: [file] })
    ) {
      await nav.share({ files: [file], text })
      return 'shared'
    }
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') return 'shared'
  }
  try {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'taut.png'
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    return 'downloaded'
  } catch {
    return 'unavailable'
  }
}
