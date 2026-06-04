/**
 * Link de desafio — sem backend. Codifica APENAS o dia e os pontos-alvo no HASH
 * da URL (base64url de um JSON). Nada de traçado, solução nem do valor do ideal
 * (que continua oculto até a pessoa concluir). A pessoa que abre o link joga o
 * MESMO puzzle do dia e tenta superar os pontos.
 */

export interface Challenge {
  date: string
  points: number
}

function encode(obj: unknown): string {
  return btoa(JSON.stringify(obj))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

function decode(s: string): unknown {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/')
  return JSON.parse(atob(b64))
}

/** Gera a URL de desafio com base na origem atual + hash `#c=<base64url>`. */
export function buildChallengeUrl(challenge: Challenge): string {
  const base =
    typeof window !== 'undefined'
      ? `${window.location.origin}${window.location.pathname}`
      : ''
  return `${base}#c=${encode({ d: challenge.date, p: challenge.points })}`
}

/**
 * Lê um desafio do hash (ou de uma string passada). Retorna null se ausente ou
 * inválido. Valida o formato pra não confiar em dados arbitrários da URL.
 */
export function parseChallenge(hash?: string): Challenge | null {
  const h =
    hash ?? (typeof window !== 'undefined' ? window.location.hash : '')
  const m = /[#&]c=([^&]+)/.exec(h)
  if (m === null) return null
  try {
    const obj = decode(m[1]) as { d?: unknown; p?: unknown }
    if (
      typeof obj.d === 'string' &&
      /^\d{4}-\d{2}-\d{2}$/.test(obj.d) &&
      typeof obj.p === 'number' &&
      Number.isFinite(obj.p)
    ) {
      return { date: obj.d, points: obj.p }
    }
  } catch {
    // base64/JSON inválido — ignora
  }
  return null
}
