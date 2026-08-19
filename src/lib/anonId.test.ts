// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { getAnonId, getPlayerName, setPlayerName } from './anonId'

beforeEach(() => localStorage.clear())

describe('anonId', () => {
  it('gera um id estável entre chamadas', () => {
    const a = getAnonId()
    const b = getAnonId()
    expect(a).toBe(b)
    expect(a.length).toBeGreaterThan(8)
  })

  it('nome: vazio por padrão, persiste (trim) e trunca em 20', () => {
    expect(getPlayerName()).toBe('')
    setPlayerName('  Leo  ')
    expect(getPlayerName()).toBe('Leo')
    setPlayerName('x'.repeat(30))
    expect(getPlayerName().length).toBe(20)
  })
})
