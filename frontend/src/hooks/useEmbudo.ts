// frontend/src/hooks/useEmbudo.ts
import { useCachedFetch } from './useCachedFetch'
import type {
  EmbudoComunaResponse,
  EmbudoRankingResponse,
  EmbudoSankeyResponse,
} from '../types/embudo'

export function useEmbudo(anio: number | null, comunaId: string | null = null) {
  const params = new URLSearchParams()
  if (anio) params.set('anio', String(anio))
  if (comunaId) params.set('comuna_id', comunaId)
  const url = anio ? `/api/v1/embudo?${params.toString()}` : null
  return useCachedFetch<EmbudoComunaResponse>(url)
}

export function useEmbudoRanking(anio: number | null) {
  return useCachedFetch<EmbudoRankingResponse>(
    anio ? `/api/v1/embudo/ranking?anio=${anio}` : null
  )
}

export function useEmbudoSankey(anio: number | null, comunaId: string | null = null) {
  const params = new URLSearchParams()
  if (anio) params.set('anio', String(anio))
  if (comunaId) params.set('comuna_id', comunaId)
  const url = anio ? `/api/v1/embudo/sankey?${params.toString()}` : null
  return useCachedFetch<EmbudoSankeyResponse>(url)
}
