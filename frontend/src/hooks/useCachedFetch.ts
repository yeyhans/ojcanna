// frontend/src/hooks/useCachedFetch.ts
//
// Drop-in replacement para useFetch que usa urlCache con estrategia
// stale-while-revalidate:
//   1. Render 1 sincrónico: sirve cache si existe (0ms, sin spinner).
//   2. Background: SIEMPRE revalida contra la red.
//   3. Si el servidor devuelve datos distintos → actualiza state + cache.
//
// Esto garantiza que cuando el backend se actualiza (ej. ETL 2025 agregado)
// el usuario ve los datos nuevos sin hard-reload, simplemente navegando.

import { useEffect, useState } from 'react'
import { urlCache } from '../store/urlCache'

interface CachedFetchResult<T> {
  data: T | null
  isLoading: boolean
  error: string | null
}

async function revalidate<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    return (await res.json()) as T
  } catch {
    return null
  }
}

export function useCachedFetch<T>(url: string | null): CachedFetchResult<T> {
  const [data, setData] = useState<T | null>(() =>
    url ? urlCache.get<T>(url) : null
  )
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!url) {
      setData(null)
      return
    }

    let active = true
    const cached = urlCache.get<T>(url)

    // Paint inmediato con cache si existe (UX sin spinner)
    if (cached !== null) {
      setData(cached)
      setIsLoading(false)
      setError(null)
    } else {
      setIsLoading(true)
      setError(null)
    }

    // Siempre revalidar en background — el cache de sessionStorage puede
    // estar obsoleto si el backend fue actualizado.
    revalidate<T>(url).then((fresh) => {
      if (!active) return
      if (fresh !== null) {
        const prev = JSON.stringify(cached)
        const next = JSON.stringify(fresh)
        if (prev !== next) {
          urlCache.set(url, fresh)
          setData(fresh)
        }
        setIsLoading(false)
        setError(null)
      } else if (cached === null) {
        setError('Error al cargar los datos')
        setIsLoading(false)
      }
    })

    return () => {
      active = false
    }
  }, [url])

  return { data, isLoading, error }
}
