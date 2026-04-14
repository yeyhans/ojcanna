// frontend/src/hooks/usePjud.ts
import { useCachedFetch } from './useCachedFetch'
import type {
  PjudFiltrosResponse,
  PjudStatsResponse,
  PjudResumenResponse,
  PjudProporcionalidadResponse,
  PjudPorTribunalResponse,
  PjudPorRegionResponse,
  PjudVeredictosResponse,
} from '../types/pjud'

export function usePjudFiltros() {
  return useCachedFetch<PjudFiltrosResponse>('/api/v1/pjud/filtros')
}

export function usePjudStats(anio: number | null) {
  return useCachedFetch<PjudStatsResponse>(
    anio ? `/api/v1/pjud/stats?anio=${anio}` : null
  )
}

export function usePjudResumen(anio: number | null) {
  return useCachedFetch<PjudResumenResponse>(
    anio ? `/api/v1/pjud/resumen?anio=${anio}` : null
  )
}

export function usePjudProporcionalidad(anio: number | null) {
  return useCachedFetch<PjudProporcionalidadResponse>(
    anio ? `/api/v1/pjud/proporcionalidad?anio=${anio}` : null
  )
}

export function usePjudPorTribunal(anio: number | null) {
  return useCachedFetch<PjudPorTribunalResponse>(
    anio ? `/api/v1/pjud/por-tribunal?anio=${anio}` : null
  )
}

export function usePjudPorRegion(anio: number | null) {
  return useCachedFetch<PjudPorRegionResponse>(
    anio ? `/api/v1/pjud/por-region?anio=${anio}` : null
  )
}

export function usePjudVeredictos(anio: number | null) {
  return useCachedFetch<PjudVeredictosResponse>(
    anio ? `/api/v1/pjud/veredictos?anio=${anio}` : null
  )
}
