/**
 * Ranking diário — backend leve via Supabase. Envia o resultado (esforço/tempo)
 * ao concluir e busca o placar do dia (top-N + sua posição). Anônimo: cada
 * dispositivo tem um UUID (ver `anonId`). A segurança vem do RLS na tabela, não
 * do segredo da chave (a `anon` é pública por design).
 *
 * Tudo é best-effort: qualquer erro (offline, tabela ausente, RLS) é engolido e
 * a UI simplesmente não mostra o ranking. Desliga sozinho sem credenciais.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Mode } from './storage'

const env = import.meta.env as Record<string, string | undefined>
// A chave `anon` é pública (vai no bundle de qualquer jeito); protegida por RLS.
const SUPABASE_URL = env.VITE_SUPABASE_URL ?? 'https://mmjhwsynjkomttqwnfpv.supabase.co'
const SUPABASE_ANON_KEY =
  env.VITE_SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1tamh3c3luamtvbXR0cXduZnB2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcxMDA3MTgsImV4cCI6MjEwMjY3NjcxOH0.yMJd0vztv_7zLA7JWikjkpFx7t8wct4ocNJ0lwDSp24'

export const leaderboardEnabled = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY)

// Carrega o SDK do Supabase sob demanda (chunk separado) — não pesa o load inicial.
let clientPromise: Promise<SupabaseClient | null> | null = null
function db(): Promise<SupabaseClient | null> {
  if (!leaderboardEnabled) return Promise.resolve(null)
  if (!clientPromise) {
    clientPromise = import('@supabase/supabase-js')
      .then(({ createClient }) =>
        createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
          auth: { persistSession: false },
        }),
      )
      .catch(() => null)
  }
  return clientPromise
}

const TABLE = 'results'

export interface LeaderRow {
  anon_id: string
  name: string | null
  effort: number
  time_ms: number
}

export interface LeaderboardData {
  top: LeaderRow[]
  total: number
  /** Posição do jogador (1 = melhor), ou null se ainda não enviou. */
  myRank: number | null
}

/** Envia (ou atualiza) o resultado do dia. Upsert por (day, mode, anon_id). */
export async function submitScore(p: {
  day: string
  mode: Mode
  anonId: string
  name: string
  effort: number
  timeMs: number
}): Promise<void> {
  const c = await db()
  if (!c) return
  try {
    await c.from(TABLE).upsert(
      {
        day: p.day,
        mode: p.mode,
        anon_id: p.anonId,
        name: p.name.trim() ? p.name.trim().slice(0, 20) : null,
        effort: p.effort,
        time_ms: p.timeMs,
      },
      { onConflict: 'day,mode,anon_id' },
    )
  } catch {
    // best-effort
  }
}

/** Atualiza só o nome da linha do jogador (se já enviou hoje). */
export async function updateName(
  day: string,
  mode: Mode,
  anonId: string,
  name: string,
): Promise<void> {
  const c = await db()
  if (!c) return
  try {
    await c
      .from(TABLE)
      .update({ name: name.trim() ? name.trim().slice(0, 20) : null })
      .eq('day', day)
      .eq('mode', mode)
      .eq('anon_id', anonId)
  } catch {
    // best-effort
  }
}

/** Busca o placar do dia: top-N (por esforço, desempate por tempo) + sua posição. */
export async function fetchLeaderboard(
  day: string,
  mode: Mode,
  anonId: string,
  topN = 10,
): Promise<LeaderboardData | null> {
  const c = await db()
  if (!c) return null
  try {
    const [{ data: top }, { count: total }] = await Promise.all([
      c
        .from(TABLE)
        .select('anon_id,name,effort,time_ms')
        .eq('day', day)
        .eq('mode', mode)
        .order('effort', { ascending: true })
        .order('time_ms', { ascending: true })
        .limit(topN),
      c
        .from(TABLE)
        .select('*', { count: 'exact', head: true })
        .eq('day', day)
        .eq('mode', mode),
    ])
    const rows = (top ?? []) as LeaderRow[]

    // Posição do jogador: no top é o índice; senão, conta quantos são melhores.
    let myRank: number | null = null
    const idx = rows.findIndex((r) => r.anon_id === anonId)
    if (idx >= 0) {
      myRank = idx + 1
    } else {
      const { data: mineRows } = await c
        .from(TABLE)
        .select('effort,time_ms')
        .eq('day', day)
        .eq('mode', mode)
        .eq('anon_id', anonId)
        .limit(1)
      const mine = mineRows?.[0] as { effort: number; time_ms: number } | undefined
      if (mine) {
        const [{ count: better }, { count: tie }] = await Promise.all([
          c
            .from(TABLE)
            .select('*', { count: 'exact', head: true })
            .eq('day', day)
            .eq('mode', mode)
            .lt('effort', mine.effort),
          c
            .from(TABLE)
            .select('*', { count: 'exact', head: true })
            .eq('day', day)
            .eq('mode', mode)
            .eq('effort', mine.effort)
            .lt('time_ms', mine.time_ms),
        ])
        myRank = (better ?? 0) + (tie ?? 0) + 1
      }
    }

    return { top: rows, total: total ?? 0, myRank }
  } catch {
    return null
  }
}
