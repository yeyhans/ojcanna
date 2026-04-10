// frontend/src/hooks/usePdiMapa.ts
import { useCallback, useEffect, useRef, useState } from 'react'
import type { ExpressionSpecification } from 'maplibre-gl'
import { buildLegendBreaks, buildStepExpression } from '../lib/colorScale'
import type { PdiFeatureCollection } from '../types/pdi'
import { urlCache } from '../store/urlCache'

const VALUE_PROPERTY = 'frecuencia'

interface UsePdiMapaResult {
  geojson: PdiFeatureCollection | null
  colorExpression: ExpressionSpecification | null
  legendBreaks: number[]
  isLoading: boolean
  error: string | null
  retry: () => void
}

export function usePdiMapa(anio: number | null, categoria: string): UsePdiMapaResult {
  const [geojson, setGeojson] = useState<PdiFeatureCollection | null>(null)
  const [colorExpression, setColorExpression] = useState<ExpressionSpecification | null>(null)
  const [legendBreaks, setLegendBreaks] = useState<number[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchData = useCallback(() => {
    if (anio === null || !categoria) return

    const params = new URLSearchParams({ anio: String(anio), categoria })
    const url = `/api/v1/mapa/pdi?${params}`

    // Cache global: memoria → sessionStorage
    const cached = urlCache.get<PdiFeatureCollection>(url)
    if (cached) {
      setGeojson(cached)
      setColorExpression(buildStepExpression(cached.features, VALUE_PROPERTY))
      setLegendBreaks(buildLegendBreaks(cached.features, VALUE_PROPERTY))
      return
    }

    setIsLoading(true)
    setError(null)

    urlCache.fetch<PdiFeatureCollection>(url)
      .then((data) => {
        if (!data) { setError('Error al cargar datos PDI'); return }
        setGeojson(data)
        setColorExpression(buildStepExpression(data.features, VALUE_PROPERTY))
        setLegendBreaks(buildLegendBreaks(data.features, VALUE_PROPERTY))
      })
      .catch((err: Error) => {
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
