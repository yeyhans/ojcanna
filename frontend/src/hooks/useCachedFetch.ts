// frontend/src/hooks/useCachedFetch.ts
//
// Drop-in replacement para useFetch que usa urlCache.
//
// Diferencia clave con useFetch:
//   - Inicializa el estado sincrónicamente desde cache en el primer render.
//   - Si el dato ya fue pre-fetched (por AppDataProvider), isLoading nunca
//     pasa a true y el componente muestra datos de inmediato.
//   - Si url cambia, chequea cache antes de ir a la red.

import { useEffect, useState } from 'react'
import { urlCache } from '../store/urlCache'

interface CachedFetchResult<T> {
  data: T | null
  isLoading: boolean
  error: string | null
}

export function useCachedFetch<T>(url: string | null): CachedFetchResult<T> {
  // Inicialización sincrónica desde cache → 0ms si el dato ya fue pre-fetched
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

    // Chequeo sincrónico — si url cambió y el nuevo dato ya está en cache
    const cached = urlCache.get<T>(url)
    if (cached !== null) {
      setData(cached)
      setIsLoading(false)
      setError(null)
      return
    }

    // Fetch necesario
    let active = true
    setIsLoading(true)
    setError(null)

    urlCache
      .fetch<T>(url)
      .then((d) => {
        if (!active) return
        if (d !== null) {
          setData(d)
        } else {
          setError('Error al cargar los datos')
        }
        setIsLoading(false)
      })
      .catch(() => {
        if (!active) return
        setError('Error al cargar los datos')
        setIsLoading(false)
      })

    return () => {
      active = false
    }
  }, [url])

  return { data, isLoading, error }
}
