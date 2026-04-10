// frontend/src/hooks/useDppMapa.ts
// Fetch del mapa DPP con cache global (urlCache) y debounce 300ms.
import { useCallback, useEffect, useRef, useState } from 'react'
import type { ExpressionSpecification } from 'maplibre-gl'
import { buildLegendBreaks, buildStepExpression } from '../lib/colorScale'
import type { DppFeatureCollection } from '../types/dpp'
import { urlCache } from '../store/urlCache'

const VALUE_PROPERTY = 'n_causas'

interface UseDppMapaResult {
  geojson: DppFeatureCollection | null
  colorExpression: ExpressionSpecification | null
  legendBreaks: number[]
  isLoading: boolean
  error: string | null
  retry: () => void
}

export function useDppMapa(anio: number | null): UseDppMapaResult {
  const [geojson, setGeojson] = useState<DppFeatureCollection | null>(null)
  const [colorExpression, setColorExpression] = useState<ExpressionSpecification | null>(null)
  const [legendBreaks, setLegendBreaks] = useState<number[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchData = useCallback(() => {
    if (anio === null) return

    const url = `/api/v1/mapa/dpp?anio=${anio}`

    // Cache global: memoria → sessionStorage
    const cached = urlCache.get<DppFeatureCollection>(url)
    if (cached) {
      setGeojson(cached)
      setColorExpression(buildStepExpression(cached.features, VALUE_PROPERTY))
      setLegendBreaks(buildLegendBreaks(cached.features, VALUE_PROPERTY))
      return
    }

    setIsLoading(true)
    setError(null)

    urlCache.fetch<DppFeatureCollection>(url)
      .then((data) => {
        if (!data) { setError('Error al cargar los datos DPP'); return }
        setGeojson(data)
        setColorExpression(buildStepExpression(data.features, VALUE_PROPERTY))
        setLegendBreaks(buildLegendBreaks(data.features, VALUE_PROPERTY))
      })
      .catch((err: Error) => {
        setError(err.message ?? 'Error al cargar los datos DPP')
      })
      .finally(() => setIsLoading(false))
  }, [anio, retryCount]) // eslint-disable-line react-hooks/exhaustive-deps

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
