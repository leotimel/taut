// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import {
  saveResult,
  getDay,
  getStats,
  clearAll,
  hasSeenOnboarding,
  markOnboardingSeen,
} from './storage'

const rec = (date: string, score: number, par = 11, completed = true) => ({
  date, score, par, completed,
})

beforeEach(() => clearAll())

describe('storage', () => {
  it('salva e lê um dia', () => {
    saveResult(rec('2026-06-03', 14))
    expect(getDay('2026-06-03')).toEqual(rec('2026-06-03', 14))
  })

  it('melhora a pontuação (mantém o menor) com o dia aberto', () => {
    saveResult(rec('2026-06-03', 14))
    saveResult(rec('2026-06-03', 12))
    expect(getDay('2026-06-03')!.score).toBe(12)
    saveResult(rec('2026-06-03', 20)) // pior não regride
    expect(getDay('2026-06-03')!.score).toBe(12)
  })

  it('conta streak de dias consecutivos concluídos', () => {
    saveResult(rec('2026-06-01', 12))
    saveResult(rec('2026-06-02', 11))
    saveResult(rec('2026-06-03', 13))
    const s = getStats('2026-06-03')
    expect(s.currentStreak).toBe(3)
    expect(s.bestStreak).toBe(3)
    expect(s.daysPlayed).toBe(3)
  })

  it('streak quebra ao pular um dia', () => {
    saveResult(rec('2026-06-01', 12))
    saveResult(rec('2026-06-03', 12)) // pulou 06-02
    const s = getStats('2026-06-03')
    expect(s.currentStreak).toBe(1)
    expect(s.bestStreak).toBe(1)
  })

  it('streak atual continua vivo se o último jogo foi ontem', () => {
    saveResult(rec('2026-06-02', 12))
    expect(getStats('2026-06-03').currentStreak).toBe(1)
  })

  it('streak atual zera se o último jogo foi anteontem', () => {
    saveResult(rec('2026-06-01', 12))
    expect(getStats('2026-06-03').currentStreak).toBe(0)
  })

  it('escudo: tolera um dia pulado quando há ≥10 dias concluídos', () => {
    for (let d = 1; d <= 10; d++) {
      saveResult(rec(`2026-06-${String(d).padStart(2, '0')}`, 12))
    }
    saveResult(rec('2026-06-12', 12)) // pulou 06-11
    const s = getStats('2026-06-12')
    expect(s.freezes).toBe(1)
    expect(s.currentStreak).toBe(11) // o escudo cobre o 06-11
  })

  it('sem escudo (poucos dias), pular quebra o streak', () => {
    saveResult(rec('2026-06-01', 12))
    saveResult(rec('2026-06-02', 12))
    saveResult(rec('2026-06-04', 12)) // pulou 06-03; só 3 dias → 0 escudos
    const s = getStats('2026-06-04')
    expect(s.freezes).toBe(0)
    expect(s.currentStreak).toBe(1)
  })

  it('mantém o melhor streak mesmo após quebrar o atual', () => {
    saveResult(rec('2026-06-01', 12))
    saveResult(rec('2026-06-02', 12))
    saveResult(rec('2026-06-03', 12)) // streak 3
    saveResult(rec('2026-06-10', 12)) // pulou vários → atual 1
    const s = getStats('2026-06-10')
    expect(s.currentStreak).toBe(1)
    expect(s.bestStreak).toBe(3)
  })

  it('conta dias no ideal (score === par) como selo', () => {
    saveResult(rec('2026-06-01', 11, 11)) // no ideal
    saveResult(rec('2026-06-02', 13, 11)) // acima
    expect(getStats('2026-06-02').parCount).toBe(1)
  })

  it('não conta dia não-concluído no streak', () => {
    saveResult(rec('2026-06-03', 0, 11, false))
    const s = getStats('2026-06-03')
    expect(s.daysPlayed).toBe(0)
    expect(s.currentStreak).toBe(0)
  })

  it('concluir depois grava o score (não fica preso no não-concluído)', () => {
    saveResult(rec('2026-06-03', 0, 11, false))
    saveResult(rec('2026-06-03', 13, 11, true))
    const d = getDay('2026-06-03')!
    expect(d.completed).toBe(true)
    expect(d.score).toBe(13)
  })

  it('sobrevive a localStorage corrompido', () => {
    localStorage.setItem('taut:v1', 'isto não é json')
    expect(getStats('2026-06-03').history).toEqual([])
  })

  it('onboarding: começa não-visto e fica visto ao marcar', () => {
    expect(hasSeenOnboarding()).toBe(false)
    markOnboardingSeen()
    expect(hasSeenOnboarding()).toBe(true)
  })

  it('modo expert tem histórico/stats separados do normal', () => {
    saveResult(rec('2026-06-03', 5, 5), 'expert')
    // não vaza pro daily
    expect(getDay('2026-06-03')).toBeUndefined()
    expect(getStats('2026-06-03', 'daily').daysPlayed).toBe(0)
    // e existe no expert
    expect(getDay('2026-06-03', 'expert')).toBeDefined()
    const s = getStats('2026-06-03', 'expert')
    expect(s.daysPlayed).toBe(1)
    expect(s.parCount).toBe(1)
  })
})
