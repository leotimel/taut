import { describe, it, expect } from 'vitest'
import { buildChallengeUrl, parseChallenge } from './challenge'

describe('link de desafio', () => {
  it('round-trip: codifica e decodifica dia + pontos', () => {
    const url = buildChallengeUrl({ date: '2026-06-04', points: 14 })
    expect(url).toContain('#c=')
    expect(parseChallenge(url)).toEqual({ date: '2026-06-04', points: 14 })
  })

  it('só embute d e p (nada de traçado, solução ou ideal)', () => {
    const url = buildChallengeUrl({ date: '2026-06-04', points: 14 })
    const b64 = url.split('#c=')[1].replace(/-/g, '+').replace(/_/g, '/')
    const obj = JSON.parse(atob(b64))
    expect(Object.keys(obj).sort()).toEqual(['d', 'p'])
  })

  it('null quando não há parâmetro', () => {
    expect(parseChallenge('#foo=bar')).toBeNull()
    expect(parseChallenge('')).toBeNull()
  })

  it('null quando o conteúdo é inválido', () => {
    expect(parseChallenge('#c=@@@nao-base64@@@')).toBeNull()
  })

  it('null quando o formato do JSON não bate', () => {
    const bad = btoa(JSON.stringify({ d: 'xxxx', p: 'nan' }))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')
    expect(parseChallenge(`#c=${bad}`)).toBeNull()
  })
})
