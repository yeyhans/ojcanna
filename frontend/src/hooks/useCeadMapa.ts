// frontend/src/hooks/useCeadMapa.ts
import { useCallback, useEffect, useRef, useState } from 'react'
import type { ExpressionSpecification } from 'maplibre-gl'
import { buildLegendBreaks, buildStepExpression } from '../lib/colorScale'
import type { CeadFeatureCollection } from '../types/cead'

interface UseCeadMapaResult {
  geojson: CeadFeatureCollection | null
  colorExpression: ExpressionSpecification | null
  legendBreaks: number[]
  isLoading: boolean
  error: string | null
  retry: () => void
}

// Cache de respuestas a nivel de módulo: sobrevive cambios de filtro en la misma sesión
const _clientCache = new Map<string, CeadFeatureCollection>()

export function useCeadMapa(
  anio: number | null,
  subgrupos: string[]
): UseCeadMapaResult {
  const [geojson, setGeojson] = useState<CeadFeatureCollection | null>(null)
  const [colorExpression, setColorExpression] =
    useState<ExpressionSpecification | null>(null)
  const [legendBreaks, setLegendBreaks] = useState<number[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)

  const abortRef = useRef<AbortController | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchData = useCallback(() => {
    if (anio === null || subgrupos.length === 0) return

    const params = new URLSearchParams({
      anio: String(anio),
      subgrupos: subgrupos.join(','),
    })
    const url = `/api/v1/mapa/cead?${params}`

    // Cache hit: sin red
    const cached = _clientCache.get(url)
    if (cached) {
      setGeojson(cached)
      setColorExpression(buildStepExpression(cached.features))
      setLegendBreaks(buildLegendBreaks(cached.features))
      return
    }

    // Cancelar request anterior
    if (abortRef.current) abortRef.current.abort()
    abortRef.current = new AbortController()
    const signal = abortRef.current.signal

    setIsLoading(true)
    setError(null)

    fetch(url, { signal })
      .then((res) => {
        if (!res.ok) throw new Error(`Error ${res.status}: ${res.statusText}`)
        return res.json() as Promise<CeadFeatureCollection>
      })
      .then((data) => {
        _clientCache.set(url, data)
        setGeojson(data)
        setColorExpression(buildStepExpression(data.features))
        setLegendBreaks(buildLegendBreaks(data.features))
      })
      .catch((err: Error) => {
        if (err.name === 'AbortError') return
        setError(err.message ?? 'Error al cargar los datos')
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [anio, subgrupos, retryCount]) // eslint-disable-line react-hooks/exhaustive-deps

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
