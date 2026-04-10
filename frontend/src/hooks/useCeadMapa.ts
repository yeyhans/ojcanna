// frontend/src/hooks/useCeadMapa.ts
//
// Estrategia de caché (en orden de prioridad):
//   1. dataStore memoria   — instantáneo (misma tab, cualquier render)
//   2. dataStore session   — <50ms (refresh de página)
//   3. Red                 — único request por combinación (in-flight dedup via dataStore)
//
// Si AppDataProvider ya pre-fetchó la combinación más común (último año + todos los
// subgrupos), el hook encuentra un cache hit en el paso 1 y nunca toca la red.

import { useCallback, useEffect, useRef, useState } from 'react'
import type { ExpressionSpecification } from 'maplibre-gl'
import { buildLegendBreaks, buildStepExpression } from '../lib/colorScale'
import type { CeadFeatureCollection } from '../types/cead'
import { dataStore } from '../store/dataStore'

interface UseCeadMapaResult {
  geojson: CeadFeatureCollection | null
  colorExpression: ExpressionSpecification | null
  legendBreaks: number[]
  isLoading: boolean
  error: string | null
  retry: () => void
}

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

  // Identifica qué "request" es la vigente; descarta resultados de requests stale
  const requestIdRef = useRef<symbol>(Symbol())
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const applyData = useCallback((data: CeadFeatureCollection) => {
    setGeojson(data)
    setColorExpression(buildStepExpression(data.features))
    setLegendBreaks(buildLegendBreaks(data.features))
  }, [])

  const fetchData = useCallback(() => {
    if (anio === null || subgrupos.length === 0) return

    // 1. Cache hit sincrónico (memoria o sessionStorage)
    const cached = dataStore.get(anio, subgrupos)
    if (cached) {
      applyData(cached)
      setIsLoading(false)
      setError(null)
      return
    }

    // 2. Request de red (con dedup de in-flight via dataStore.prefetch)
    const requestId = Symbol()
    requestIdRef.current = requestId

    setIsLoading(true)
    setError(null)

    dataStore
      .prefetch(anio, subgrupos)
      .then((data) => {
        // Descartar si ya hubo un cambio de filtros posterior
        if (requestIdRef.current !== requestId) return
        if (data) {
          applyData(data)
        } else {
          setError('Error al cargar los datos')
        }
      })
      .catch((err: Error) => {
        if (requestIdRef.current !== requestId) return
        setError(err.message ?? 'Error al cargar los datos')
      })
      .finally(() => {
        if (requestIdRef.current === requestId) setIsLoading(false)
      })
  }, [anio, subgrupos, retryCount, applyData]) // eslint-disable-line react-hooks/exhaustive-deps

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
