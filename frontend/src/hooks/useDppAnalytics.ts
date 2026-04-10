// frontend/src/hooks/useDppAnalytics.ts
import { useCachedFetch } from './useCachedFetch'

export interface FormaTermino {
  nombre: string
  n_causas: number
  porcentaje: number
}

export interface DppResumen {
  anio: number
  total_ingresos: number
  total_terminos: number
  ratio_terminos: number
  formas_termino: FormaTermino[]
}

export interface DppSeriePunto {
  anio: number
  ingresos: number
  terminos: number
}

export interface DppRegion {
  region_id: string
  region_nombre: string
  n_ingresos: number
}

export interface DppFiltros {
  anios: number[]
}

export function useDppFiltros() {
  return useCachedFetch<DppFiltros>('/api/v1/dpp/filtros')
}

export function useDppResumen(anio: number | null) {
  return useCachedFetch<DppResumen>(anio ? `/api/v1/dpp/resumen?anio=${anio}` : null)
}

export function useDppSerie() {
  const result = useCachedFetch<{ datos: DppSeriePunto[] }>('/api/v1/dpp/serie')
  return { ...result, data: result.data?.datos ?? null }
}

export function useDppRegiones(anio: number | null) {
  const result = useCachedFetch<{ anio: number; regiones: DppRegion[] }>(
    anio ? `/api/v1/dpp/regiones?anio=${anio}` : null
  )
  return { ...result, data: result.data?.regiones ?? null }
}
