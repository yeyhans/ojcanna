// frontend/src/hooks/usePdiAnalytics.ts
import { useCachedFetch } from './useCachedFetch'

export interface PdiCategoria {
  categoria: string
  subcategoria: string
  total_nacional: number
}

export interface PdiRegionItem {
  region_id: string
  region_nombre: string
  frecuencia: number
}

export interface PdiFiltros {
  anios: number[]
  categorias: string[]
}

export function usePdiFiltros() {
  return useCachedFetch<PdiFiltros>('/api/v1/pdi/filtros')
}

export function usePdiResumen(anio: number | null) {
  const result = useCachedFetch<{ anio: number; categorias: PdiCategoria[] }>(
    anio ? `/api/v1/pdi/resumen?anio=${anio}` : null
  )
  return { ...result, data: result.data?.categorias ?? null }
}

export function usePdiRegiones(anio: number | null, categoria: string | null, subcategoria = 'delitos') {
  const params = anio && categoria
    ? `anio=${anio}&categoria=${encodeURIComponent(categoria)}&subcategoria=${encodeURIComponent(subcategoria)}`
    : null
  const result = useCachedFetch<{ anio: number; categoria: string; subcategoria: string; regiones: PdiRegionItem[] }>(
    params ? `/api/v1/pdi/regiones?${params}` : null
  )
  return { ...result, data: result.data?.regiones ?? null }
}
