// frontend/src/hooks/usePdiAnalytics.ts
import { useState, useEffect } from 'react'

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

export function usePdiFiltros() {
  return useFetch<PdiFiltros>('/api/v1/pdi/filtros')
}

export function usePdiResumen(anio: number | null) {
  const result = useFetch<{ anio: number; categorias: PdiCategoria[] }>(
    anio ? `/api/v1/pdi/resumen?anio=${anio}` : null
  )
  return { ...result, data: result.data?.categorias ?? null }
}

export function usePdiRegiones(anio: number | null, categoria: string | null, subcategoria = 'delitos') {
  const params = anio && categoria
    ? `anio=${anio}&categoria=${encodeURIComponent(categoria)}&subcategoria=${encodeURIComponent(subcategoria)}`
    : null
  const result = useFetch<{ anio: number; categoria: string; subcategoria: string; regiones: PdiRegionItem[] }>(
    params ? `/api/v1/pdi/regiones?${params}` : null
  )
  return { ...result, data: result.data?.regiones ?? null }
}
