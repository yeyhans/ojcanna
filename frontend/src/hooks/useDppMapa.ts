// frontend/src/hooks/useDppMapa.ts
// Fetch del mapa DPP usando el split geom + stats:
//   - Geometrías: singleton cargado una sola vez por sesión (geomStore).
//   - Stats DPP: payload ligero ~5KB por año, cacheado en urlCache.
// El merge se hace en el cliente. Debounce 300ms.
import { useCallback, useEffect, useRef, useState } from 'react'
import type { ExpressionSpecification } from 'maplibre-gl'
import { buildLegendBreaks, buildStepExpression } from '../lib/colorScale'
import type { DppFeatureCollection, DppFeatureProperties } from '../types/dpp'
import { urlCache } from '../store/urlCache'
import { fetchComunasGeom, mergeGeomWithStats, type GeomFeature } from '../store/geomStore'

const VALUE_PROPERTY = 'n_causas'

interface DppStatsItemDTO {
  cut: string
  nombre: string
  region_id: string
  n_causas: number
  tiene_datos: boolean
}
interface DppStatsResponseDTO {
  anio: number
  stats: DppStatsItemDTO[]
}

// Cache de FeatureCollection merged para DPP, keyed por anio.
const _dppMergedCache = new Map<number, DppFeatureCollection>()

function mergeDppStats(
  geomMap: Map<string, GeomFeature>,
  statsResp: DppStatsResponseDTO,
): DppFeatureCollection {
  const byCut = new Map<string, DppFeatureProperties>()
  for (const s of statsResp.stats) {
    byCut.set(s.cut, {
      cut: s.cut,
      nombre: s.nombre,
      region_id: s.region_id,
      n_causas: s.n_causas,
      tiene_datos: s.tiene_datos,
    })
  }
  return mergeGeomWithStats<DppFeatureProperties>(
    geomMap,
    byCut,
    (cut) => ({
      cut,
      nombre: '',
      region_id: '',
      n_causas: 0,
      tiene_datos: false,
    }),
  ) as DppFeatureCollection
}

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

  const apply = useCallback((data: DppFeatureCollection) => {
    setGeojson(data)
    setColorExpression(buildStepExpression(data.features, VALUE_PROPERTY))
    setLegendBreaks(buildLegendBreaks(data.features, VALUE_PROPERTY))
  }, [])

  const fetchData = useCallback(() => {
    if (anio === null) return

    // 1. Cache hit del FeatureCollection ya merged
    const cachedMerged = _dppMergedCache.get(anio)
    if (cachedMerged) {
      apply(cachedMerged)
      setIsLoading(false)
      setError(null)
      return
    }

    setIsLoading(true)
    setError(null)

    const statsUrl = `/api/v1/dpp/stats?anio=${anio}`
    Promise.all([
      fetchComunasGeom(),
      urlCache.fetch<DppStatsResponseDTO>(statsUrl),
    ])
      .then(([geomMap, statsResp]) => {
        if (!statsResp) {
          setError('Error al cargar los datos DPP')
          return
        }
        const merged = mergeDppStats(geomMap, statsResp)
        _dppMergedCache.set(anio, merged)
        apply(merged)
      })
      .catch((err: Error) => {
        setError(err.message ?? 'Error al cargar los datos DPP')
      })
      .finally(() => setIsLoading(false))
  }, [anio, retryCount, apply]) // eslint-disable-line react-hooks/exhaustive-deps

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
