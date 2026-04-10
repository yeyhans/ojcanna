// frontend/src/hooks/useEmbudo.ts
import { useEffect, useState } from 'react'
import { urlCache } from '../store/urlCache'

export interface EtapaEmbudo {
  etapa: string
  fuente: string
  total: number
  disponible: boolean
}

export interface EmbudoData {
  anio: number
  comuna_id: string
  comuna_nombre: string
  region_id: string
  etapas: EtapaEmbudo[]
}

export interface RankingItem {
  comuna_id: string
  nombre: string
  region_id: string
  detenciones: number
  causas_defensor: number
  ratio: number
}

interface UseEmbudoResult {
  data: EmbudoData | null
  isLoading: boolean
  error: string | null
}

export function useEmbudo(
  anio: number | null,
  comunaId: string | null
): UseEmbudoResult {
  const [data, setData] = useState<EmbudoData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!anio || !comunaId) {
      setData(null)
      return
    }

    const controller = new AbortController()
    setIsLoading(true)
    setError(null)

    fetch(`/api/v1/embudo?anio=${anio}&comuna_id=${comunaId}`, {
      signal: controller.signal,
    })
      .then((res) => {
        if (!res.ok) throw new Error(`Error ${res.status}`)
        return res.json() as Promise<EmbudoData>
      })
      .then(setData)
      .catch((err: Error) => {
        if (err.name !== 'AbortError') setError(err.message)
      })
      .finally(() => setIsLoading(false))

    return () => controller.abort()
  }, [anio, comunaId])

  return { data, isLoading, error }
}

interface UseEmbudoRankingResult {
  items: RankingItem[]
  isLoading: boolean
  error: string | null
}

export function useEmbudoRanking(anio: number | null): UseEmbudoRankingResult {
  const url = anio ? `/api/v1/embudo/ranking?anio=${anio}` : null

  // Inicialización sincrónica desde cache
  const [items, setItems] = useState<RankingItem[]>(() => {
    if (!url) return []
    const cached = urlCache.get<{ anio: number; items: RankingItem[] }>(url)
    return cached?.items ?? []
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!url) return

    // Cache hit → no fetch necesario
    const cached = urlCache.get<{ anio: number; items: RankingItem[] }>(url)
    if (cached) {
      setItems(cached.items)
      return
    }

    let active = true
    setIsLoading(true)
    setError(null)

    urlCache.fetch<{ anio: number; items: RankingItem[] }>(url)
      .then((d) => {
        if (!active) return
        if (d) setItems(d.items)
        else setError('Error al cargar el ranking')
        setIsLoading(false)
      })
      .catch((err: Error) => {
        if (!active) return
        setError(err.message)
        setIsLoading(false)
      })

    return () => { active = false }
  }, [url])

  return { items, isLoading, error }
}
