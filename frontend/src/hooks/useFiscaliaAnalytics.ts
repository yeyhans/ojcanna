// frontend/src/hooks/useFiscaliaAnalytics.ts
import { useCachedFetch } from './useCachedFetch'
import type {
  FiscaliaFiltros,
  FiscaliaRegion,
  FiscaliaResumen,
  FiscaliaSeriePunto,
} from '../types/fiscalia'

export function useFiscaliaFiltros() {
  return useCachedFetch<FiscaliaFiltros>('/api/v1/fiscalia/filtros')
}

export function useFiscaliaResumen(anio: number | null) {
  return useCachedFetch<FiscaliaResumen>(
    anio ? `/api/v1/fiscalia/resumen?anio=${anio}` : null,
  )
}

export function useFiscaliaSerie() {
  const result = useCachedFetch<{ datos: FiscaliaSeriePunto[] }>('/api/v1/fiscalia/serie')
  return { ...result, data: result.data?.datos ?? null }
}

export function useFiscaliaRegiones(anio: number | null) {
  const result = useCachedFetch<{ anio: number; regiones: FiscaliaRegion[] }>(
    anio ? `/api/v1/fiscalia/regiones?anio=${anio}` : null,
  )
  return { ...result, data: result.data?.regiones ?? null }
}
