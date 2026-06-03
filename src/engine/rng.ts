/**
 * RNG determinístico (TS puro). Deriva uma seed numérica de uma string (a data)
 * e gera uma sequência reproduzível. É a fonte de aleatoriedade do engine; o
 * `lib/seed.ts` (Fase 3) re-exporta daqui, sem duplicar.
 */

/** xmur3: faz o hash de uma string e devolve uma seed de 32 bits. */
export function hashStringToSeed(str: string): number {
  let h = 1779033703 ^ str.length
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507)
  h = Math.imul(h ^ (h >>> 13), 3266489909)
  h ^= h >>> 16
  return h >>> 0
}

/** mulberry32: PRNG rápido. Retorna uma função que produz floats em [0, 1). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
