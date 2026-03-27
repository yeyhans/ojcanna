// frontend/src/hooks/usePdiMapa.ts
import { useCallback, useEffect, useRef, useState } from 'react'
import type { ExpressionSpecification } from 'maplibre-gl'
import { buildLegendBreaks, buildStepExpression } from '../lib/colorScale'
import type { PdiFeatureCollection } from '../types/pdi'

const VALUE_PROPERTY = 'frecuencia'

interface UsePdiMapaResult {
  geojson: PdiFeatureCollection | null
  colorExpression: ExpressionSpecification | null
  legendBreaks: number[]
  isLoading: boolean
  error: string | null
  retry: () => void
}

const _clientCache = new Map<string, PdiFeatureCollection>()

export function usePdiMapa(anio: number | null, categoria: string): UsePdiMapaResult {
  const [geojson, setGeojson] = useState<PdiFeatureCollection | null>(null)
  const [colorExpression, setColorExpression] = useState<ExpressionSpecification | null>(null)
  const [legendBreaks, setLegendBreaks] = useState<number[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)

  const abortRef = useRef<AbortController | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchData = useCallback(() => {
    if (anio === null || !categoria) return

    const params = new URLSearchParams({ anio: String(anio), categoria })
    const url = `/api/v1/mapa/pdi?${params}`

    const cached = _clientCache.get(url)
    if (cached) {
      setGeojson(cached)
      setColorExpression(buildStepExpression(cached.features, VALUE_PROPERTY))
      setLegendBreaks(buildLegendBreaks(cached.features, VALUE_PROPERTY))
      return
    }

    if (abortRef.current) abortRef.current.abort()
    abortRef.current = new AbortController()
    const signal = abortRef.current.signal

    setIsLoading(true)
    setError(null)

    fetch(url, { signal })
      .then((res) => {
        if (!res.ok) throw new Error(`Error ${res.status}: ${res.statusText}`)
        return res.json() as Promise<PdiFeatureCollection>
      })
      .then((data) => {
        _clientCache.set(url, data)
        setGeojson(data)
        setColorExpression(buildStepExpression(data.features, VALUE_PROPERTY))
        setLegendBreaks(buildLegendBreaks(data.features, VALUE_PROPERTY))
      })
      .catch((err: Error) => {
        if (err.name === 'AbortError') return
        setError(err.message ?? 'Error al cargar datos PDI')
      })
      .finally(() => setIsLoading(false))
  }, [anio, categoria, retryCount]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(fetchData, 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [fetchData])

  const retry = useCallback(() => setRetryCount((c) => c + 1), [])

  return { geojson, colorExpression, legendBreaks, isLoading, error, retry }
}
