/**
 * Sons sintetizados via Web Audio (sem arquivos): tick ao fixar segmento, acorde
 * ao concluir, fanfarra no level-up. Mudo controlado de fora (toggle no header).
 * O AudioContext só "acorda" após um gesto do usuário (o 1º tick no arrasto).
 */

let ctx: AudioContext | null = null
let muted = false

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  try {
    if (ctx === null) {
      const AC =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext
      if (!AC) return null
      ctx = new AC()
    }
    if (ctx.state === 'suspended') void ctx.resume()
    return ctx
  } catch {
    return null
  }
}

export function setMuted(m: boolean): void {
  muted = m
}

export function isMuted(): boolean {
  return muted
}

function tone(
  freq: number,
  startOffset: number,
  dur: number,
  type: OscillatorType = 'sine',
  gain = 0.06,
): void {
  const ac = getCtx()
  if (!ac || muted) return
  const o = ac.createOscillator()
  const g = ac.createGain()
  o.type = type
  o.frequency.value = freq
  o.connect(g)
  g.connect(ac.destination)
  const t0 = ac.currentTime + startOffset
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  o.start(t0)
  o.stop(t0 + dur + 0.02)
}

/** Blip curto ao fixar um segmento. */
export function playTick(): void {
  tone(520, 0, 0.07, 'triangle', 0.05)
}

/** Acorde ascendente ao concluir o puzzle. */
export function playComplete(): void {
  ;[523.25, 659.25, 783.99].forEach((f, i) => tone(f, i * 0.07, 0.28, 'sine', 0.06))
}

/** Fanfarra mais alta no level-up. */
export function playLevelUp(): void {
  ;[523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
    tone(f, i * 0.08, 0.32, 'triangle', 0.06),
  )
}
