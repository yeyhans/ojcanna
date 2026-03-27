// frontend/src/hooks/useDppAnalytics.ts
import { useState, useEffect } from 'react'

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

function useFetch<T>(url: string | null): { data: T | null; isLoading: boolean; error: string | null } {
  const [data, setData] = useState<T | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!url) return
    const ctrl = new AbortController()
    setIsLoading(true)
    setError(null)
    fetch(url, { signal: ctrl.signal })
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() })
      .then(d => { setData(d); setIsLoading(false) })
      .catch(e => { if (e.name !== 'AbortError') { setError(e.message); setIsLoading(false) } })
    return () => ctrl.abort()
  }, [url])

  return { data, isLoading, error }
}

export function useDppFiltros() {
  return useFetch<DppFiltros>('/api/v1/dpp/filtros')
}

export function useDppResumen(anio: number | null) {
  return useFetch<DppResumen>(anio ? `/api/v1/dpp/resumen?anio=${anio}` : null)
}

export function useDppSerie() {
  const result = useFetch<{ datos: DppSeriePunto[] }>('/api/v1/dpp/serie')
  return { ...result, data: result.data?.datos ?? null }
}

export function useDppRegiones(anio: number | null) {
  const result = useFetch<{ anio: number; regiones: DppRegion[] }>(
    anio ? `/api/v1/dpp/regiones?anio=${anio}` : null
  )
  return { ...result, data: result.data?.regiones ?? null }
}
