/**
 * Persistência 100% local (localStorage), sem backend. Guarda o histórico diário
 * e deriva as estatísticas (streak, melhor streak, dias no ideal) pro modal.
 *
 * Camada de app — pode tocar o DOM. O streak conta dias CONCLUÍDOS consecutivos
 * e NÃO quebra por desempenho; só quebra ao pular um dia. Dá pra melhorar a
 * pontuação (menor é melhor) enquanto o dia está aberto.
 */

import type { Point } from '../engine/types'

const STORAGE_KEY = 'taut:v1'

export interface DayRecord {
  /** Data ISO `YYYY-MM-DD`. */
  date: string
  /** Melhor score GEOMÉTRICO do dia (`length + k·turns`). Menor é melhor. */
  score: number
  /** O ideal/par geométrico do dia. "No ideal" quando `score === par`. */
  par: number
  /** O jogador concluiu o puzzle (ligou todos os números em ordem). */
  completed: boolean
  /** Melhor pontos do dia (geometria + tempo + tentativas). Alimenta o XP. */
  points?: number
}

export interface Stats {
  /** Dias concluídos consecutivos terminando hoje/ontem (0 se quebrou). */
  currentStreak: number
  /** Maior streak já alcançado. */
  bestStreak: number
  /** Total de dias concluídos. */
  daysPlayed: number
  /** Dias terminados no ideal (`score === par`) — o selo. */
  parCount: number
  /** Escudos de streak disponíveis (toleram dias pulados). */
  freezes: number
  /** Histórico completo, em ordem cronológica. */
  history: DayRecord[]
}

interface StoredData {
  history: DayRecord[]
}

function isValidRecord(r: unknown): r is DayRecord {
  return (
    typeof r === 'object' &&
    r !== null &&
    typeof (r as DayRecord).date === 'string' &&
    typeof (r as DayRecord).score === 'number' &&
    typeof (r as DayRecord).par === 'number' &&
    typeof (r as DayRecord).completed === 'boolean' &&
    ((r as DayRecord).points === undefined ||
      typeof (r as DayRecord).points === 'number')
  )
}

function load(): StoredData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw === null) return { history: [] }
    const parsed = JSON.parse(raw) as Partial<StoredData>
    if (parsed === null || !Array.isArray(parsed.history)) return { history: [] }
    return { history: parsed.history.filter(isValidRecord) }
  } catch {
    return { history: [] }
  }
}

function persist(data: StoredData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {
    // localStorage indisponível (modo privado/quota) — ignora silenciosamente.
  }
}

/** Dias inteiros desde a epoch (UTC), pra comparar datas sem efeito de fuso. */
function dayNumber(date: string): number {
  const [y, m, d] = date.split('-').map(Number)
  return Math.floor(Date.UTC(y, m - 1, d) / 86_400_000)
}

// --- Streak freeze (escudo) & marcos ---

/** Marcos de streak que disparam selo/celebração. */
export const STREAK_MILESTONES = [7, 30, 100, 365]

const FREEZE_PER_DAYS = 10 // 1 escudo a cada 10 dias concluídos…
const MAX_FREEZES = 2 // …até no máximo 2.

/** Escudos disponíveis — cada um tolera 1 dia pulado no streak atual. */
function availableFreezes(daysCompleted: number): number {
  return Math.min(MAX_FREEZES, Math.floor(daysCompleted / FREEZE_PER_DAYS))
}

/**
 * Streak atual terminando hoje, tolerando até `freezes` dias pulados (1 dia por
 * escudo). Com 0 escudos é o streak estrito clássico. Conta só dias jogados.
 */
function computeCurrentStreak(
  nums: number[],
  todayN: number,
  freezes: number,
): number {
  if (nums.length === 0) return 0
  const played = new Set(nums)
  const lastN = nums[nums.length - 1]
  if (lastN > todayN) return 0
  let budget = freezes - Math.max(0, todayN - lastN - 1) // dias perdidos até hoje
  if (budget < 0) return 0
  let streak = 1
  let cursor = lastN
  while (true) {
    if (played.has(cursor - 1)) {
      streak++
      cursor -= 1
    } else if (budget > 0 && played.has(cursor - 2)) {
      budget-- // gasta 1 escudo pra cobrir o dia pulado
      streak++
      cursor -= 2
    } else {
      break
    }
  }
  return streak
}

export function getDay(date: string): DayRecord | undefined {
  return load().history.find((r) => r.date === date)
}

/**
 * Salva/atualiza o resultado de um dia (upsert por data): mantém o MENOR score
 * (melhoria), o par do dia, e "concluído" pegajoso. Resultados não-concluídos
 * não sobrescrevem um score já concluído.
 */
export function saveResult(record: DayRecord): void {
  const data = load()
  const existing = data.history.find((r) => r.date === record.date)
  if (existing === undefined) {
    data.history.push({ ...record })
  } else {
    existing.par = record.par
    if (record.completed) {
      existing.score = existing.completed
        ? Math.min(existing.score, record.score)
        : record.score
      if (record.points !== undefined) {
        existing.points =
          existing.points !== undefined
            ? Math.min(existing.points, record.points)
            : record.points
      }
      existing.completed = true
    }
  }
  persist(data)
}

export function getStats(today: string): Stats {
  const history = [...load().history].sort(
    (a, b) => dayNumber(a.date) - dayNumber(b.date),
  )
  const completed = history.filter((r) => r.completed)
  const nums = completed.map((r) => dayNumber(r.date))

  // Melhor streak: maior corrida de dias consecutivos.
  let bestStreak = 0
  let run = 0
  let prev: number | null = null
  for (const n of nums) {
    run = prev !== null && n - prev === 1 ? run + 1 : 1
    if (run > bestStreak) bestStreak = run
    prev = n
  }

  // Streak atual (terminando hoje), tolerando dias pulados com escudos.
  const freezes = availableFreezes(completed.length)
  const currentStreak = computeCurrentStreak(nums, dayNumber(today), freezes)

  const parCount = completed.filter((r) => r.score === r.par).length

  return {
    currentStreak,
    bestStreak,
    daysPlayed: completed.length,
    parCount,
    freezes,
    history,
  }
}

/** Limpa todo o histórico (usado em testes e por um eventual reset). */
export function clearAll(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem(SESSION_KEY)
    localStorage.removeItem(ONBOARDING_KEY)
    localStorage.removeItem(PALETTE_KEY)
    localStorage.removeItem(SOUND_KEY)
  } catch {
    // ignora
  }
}

// --- Sessão do dia (timer + tentativas), pra não reiniciar ao reabrir ---

const SESSION_KEY = 'taut:session:v1'

export interface DaySession {
  date: string
  /** Epoch ms da primeira interação (null antes de começar). */
  startedAt: number | null
  /** Epoch ms da conclusão (congela o timer; null enquanto joga). */
  completedAt: number | null
  /** Tentativas no dia (1 = primeira; cada "Recomeçar" com progresso soma 1). */
  attempts: number
  /** Dicas usadas no dia (espiar o ideal) — penalizam os pontos. */
  hints: number
  /** Caminho em andamento — restaurado ao reabrir (não perde o traçado). */
  path: Point[]
}

/** Carrega a sessão do dia; se não houver (ou for de outro dia), começa do zero. */
export function loadSession(date: string): DaySession {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (raw !== null) {
      const s = JSON.parse(raw) as DaySession
      if (s !== null && s.date === date && typeof s.attempts === 'number') {
        return {
          date: s.date,
          startedAt: s.startedAt ?? null,
          completedAt: s.completedAt ?? null,
          attempts: s.attempts,
          hints: typeof s.hints === 'number' ? s.hints : 0,
          path: Array.isArray(s.path) ? s.path : [],
        }
      }
    }
  } catch {
    // ignora
  }
  return { date, startedAt: null, completedAt: null, attempts: 1, hints: 0, path: [] }
}

export function saveSession(session: DaySession): void {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  } catch {
    // ignora
  }
}

// --- Onboarding (só na 1ª visita) ---

const ONBOARDING_KEY = 'taut:onboarded:v1'

export function hasSeenOnboarding(): boolean {
  try {
    return localStorage.getItem(ONBOARDING_KEY) === '1'
  } catch {
    return false
  }
}

export function markOnboardingSeen(): void {
  try {
    localStorage.setItem(ONBOARDING_KEY, '1')
  } catch {
    // ignora
  }
}

// --- Paleta de cores selecionada ---

const PALETTE_KEY = 'taut:palette:v1'

export function getPaletteId(): string {
  try {
    return localStorage.getItem(PALETTE_KEY) ?? 'sunset'
  } catch {
    return 'sunset'
  }
}

export function setPaletteId(id: string): void {
  try {
    localStorage.setItem(PALETTE_KEY, id)
  } catch {
    // ignora
  }
}

// --- Preferência de som (default ligado) ---

const SOUND_KEY = 'taut:sound:v1'

export function isSoundOn(): boolean {
  try {
    return localStorage.getItem(SOUND_KEY) !== '0'
  } catch {
    return true
  }
}

export function setSoundOn(on: boolean): void {
  try {
    localStorage.setItem(SOUND_KEY, on ? '1' : '0')
  } catch {
    // ignora
  }
}
