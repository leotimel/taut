/**
 * RNG determinístico da camada de app. Re-exporta o RNG puro do engine pra que a
 * UI/lib derive aleatoriedade da data sem duplicar implementação.
 */
import { hashStringToSeed, mulberry32 } from '../engine/rng'

export { hashStringToSeed, mulberry32 }

/** Um gerador `() => number` em [0, 1) determinístico pela string de data. */
export function rngFromDate(date: string): () => number {
  return mulberry32(hashStringToSeed(date))
}
