// frontend/src/hooks/usePdiMapa.ts
// Split geom + stats: geometrías compartidas con CEAD/DPP, stats PDI ligeras.
import { useCallback, useEffect, useRef, useState } from 'react'
import type { ExpressionSpecification } from 'maplibre-gl'
import { buildLegendBreaks, buildStepExpression } from '../lib/colorScale'
import type { PdiFeatureCollection, PdiFeatureProperties } from '../types/pdi'
import { urlCache } from '../store/urlCache'
import { fetchComunasGeom, mergeGeomWithStats, type GeomFeature } from '../store/geomStore'

const VALUE_PROPERTY = 'frecuencia'

interface PdiStatsItemDTO {
  cut: string
  nombre: string
  region_id: string
  frecuencia: number
  tiene_datos: boolean
}
interface PdiStatsResponseDTO {
  anio: number
  categoria: string
  stats: PdiStatsItemDTO[]
}

// Cache de FeatureCollection merged keyed por (anio, categoria)
const _pdiMergedCache = new Map<string, PdiFeatureCollection>()

function mergePdiStats(
  geomMap: Map<string, GeomFeature>,
  statsResp: PdiStatsResponseDTO,
): PdiFeatureCollection {
  const byCut = new Map<string, PdiFeatureProperties>()
  for (const s of statsResp.stats) {
    byCut.set(s.cut, {
      cut: s.cut,
      nombre: s.nombre,
      region_id: s.region_id,
      frecuencia: s.frecuencia,
      tiene_datos: s.tiene_datos,
    })
  }
  return mergeGeomWithStats<PdiFeatureProperties>(
    geomMap,
    byCut,
    (cut) => ({
      cut,
      nombre: '',
      region_id: '',
      frecuencia: 0,
      tiene_datos: false,
    }),
  ) as PdiFeatureCollection
}

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

  const apply = useCallback((data: PdiFeatureCollection) => {
    setGeojson(data)
    setColorExpression(buildStepExpression(data.features, VALUE_PROPERTY))
    setLegendBreaks(buildLegendBreaks(data.features, VALUE_PROPERTY))
  }, [])

  const fetchData = useCallback(() => {
    if (anio === null || !categoria) return

    const cacheKey = `${anio}__${categoria.toLowerCase()}`
    const cached = _pdiMergedCache.get(cacheKey)
    if (cached) {
      apply(cached)
      setIsLoading(false)
      setError(null)
      return
    }

    setIsLoading(true)
    setError(null)

    const params = new URLSearchParams({ anio: String(anio), categoria })
    const statsUrl = `/api/v1/pdi/stats?${params}`
    Promise.all([
      fetchComunasGeom(),
      urlCache.fetch<PdiStatsResponseDTO>(statsUrl),
    ])
      .then(([geomMap, statsResp]) => {
        if (!statsResp) {
          setError('Error al cargar datos PDI')
          return
        }
        const merged = mergePdiStats(geomMap, statsResp)
        _pdiMergedCache.set(cacheKey, merged)
        apply(merged)
      })
      .catch((err: Error) => {
        setError(err.message ?? 'Error al cargar datos PDI')
      })
      .finally(() => setIsLoading(false))
  }, [anio, categoria, retryCount, apply]) // eslint-disable-line react-hooks/exhaustive-deps

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
