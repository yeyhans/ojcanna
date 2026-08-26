// frontend/src/hooks/useFiscaliaAnalytics.ts
import { useCachedFetch } from './useCachedFetch'
import type {
  FiscaliaDemografia,
  FiscaliaFiltros,
  FiscaliaJuicios,
  FiscaliaRegion,
  FiscaliaResumen,
  FiscaliaSeriePunto,
  FiscaliaTerminos,
  FiscaliaTramitacion,
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

// --- Detalle del boletín (hojas TB6.2, TB9, TB7, TB5.2.1) ------------------

/** Cómo terminan las causas según el Ministerio Público (hoja TB6.2). */
export function useFiscaliaTerminos(anio: number | null) {
  return useCachedFetch<FiscaliaTerminos>(
    anio ? `/api/v1/fiscalia/terminos?anio=${anio}` : null,
  )
}

/** Juicios orales por región (hoja TB9). */
export function useFiscaliaJuicios(anio: number | null) {
  return useCachedFetch<FiscaliaJuicios>(
    anio ? `/api/v1/fiscalia/juicios-orales?anio=${anio}` : null,
  )
}

/** Días promedio de tramitación por región y vía de salida (hoja TB7). */
export function useFiscaliaTramitacion(anio: number | null) {
  return useCachedFetch<FiscaliaTramitacion>(
    anio ? `/api/v1/fiscalia/tramitacion?anio=${anio}` : null,
  )
}

/** Imputados por sexo y tramo etario, sólo nacional (hoja TB5.2.1). */
export function useFiscaliaDemografia(anio: number | null) {
  return useCachedFetch<FiscaliaDemografia>(
    anio ? `/api/v1/fiscalia/demografia?anio=${anio}` : null,
  )
}
