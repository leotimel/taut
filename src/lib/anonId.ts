/**
 * Identidade anônima do jogador pro ranking — um UUID no localStorage (sem
 * login/senha) + um nome de exibição opcional. Não identifica a pessoa; só
 * distingue um dispositivo do outro no placar.
 */

const ID_KEY = 'taut:anon:v1'
const NAME_KEY = 'taut:name:v1'
const FALLBACK_ID = '00000000-0000-0000-0000-000000000000'

/** UUID anônimo estável deste dispositivo (cria na 1ª vez). */
export function getAnonId(): string {
  try {
    let id = localStorage.getItem(ID_KEY)
    if (!id) {
      id =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(16).slice(2)}`
      localStorage.setItem(ID_KEY, id)
    }
    return id
  } catch {
    return FALLBACK_ID
  }
}

/** Nome de exibição no ranking (vazio = anônimo). Máx. 20 chars. */
export function getPlayerName(): string {
  try {
    return localStorage.getItem(NAME_KEY) ?? ''
  } catch {
    return ''
  }
}

export function setPlayerName(name: string): void {
  try {
    localStorage.setItem(NAME_KEY, name.trim().slice(0, 20))
  } catch {
    // ignora
  }
}
