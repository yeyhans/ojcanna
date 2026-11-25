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
//
// Reintentos: el backend corre en Render free tier y se duerme por inactividad.
// La primera request tras el spin-down puede fallar (cold start más largo que el
// timeout del proxy). Sin reintento la vista se queda en blanco de forma
// permanente, aunque el backend despierte segundos después.

import { useEffect, useRef, useState } from 'react'
import { urlCache } from '../store/urlCache'

interface CachedFetchResult<T> {
  data: T | null
  isLoading: boolean
  error: string | null
}

/** Backoff entre reintentos, en ms. Cubre ~60s de cold start de Render. */
const RETRY_DELAYS_MS = [2_000, 5_000, 10_000, 20_000, 30_000]

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function fetchOnce<T>(url: string, signal: AbortSignal): Promise<T | null> {
  try {
    const res = await fetch(url, { signal })
    if (!res.ok) return null
    return (await res.json()) as T
  } catch {
    return null
  }
}

/**
 * Pide la URL y reintenta con backoff mientras el backend no responda.
 * Aborta en cuanto el efecto que la lanzó se desmonta.
 */
async function revalidate<T>(url: string, signal: AbortSignal): Promise<T | null> {
  for (let attempt = 0; ; attempt++) {
    const data = await fetchOnce<T>(url, signal)
    if (data !== null || signal.aborted) return data
    if (attempt >= RETRY_DELAYS_MS.length) return null
    await sleep(RETRY_DELAYS_MS[attempt])
    if (signal.aborted) return null
  }
}

export function useCachedFetch<T>(url: string | null): CachedFetchResult<T> {
  const [data, setData] = useState<T | null>(() =>
    url ? urlCache.get<T>(url) : null
  )
  const [isLoading, setIsLoading] = useState(() =>
    url ? urlCache.get<T>(url) === null : false
  )
  const [error, setError] = useState<string | null>(null)

  // Incrementar este contador vuelve a disparar el efecto de fetch.
  const [reloadTick, setReloadTick] = useState(0)

  // Al cambiar la URL o pedir un reintento, el estado síncrono (paint inmediato
  // con cache, o spinner si no hay) se ajusta durante el render, en el mismo
  // commit, en vez de en un efecto que pintaría primero el estado viejo.
  const [synced, setSynced] = useState({ url, reloadTick })
  if (synced.url !== url || synced.reloadTick !== reloadTick) {
    setSynced({ url, reloadTick })
    const cached = url ? urlCache.get<T>(url) : null
    if (!url) {
      setData(null)
    } else if (cached !== null) {
      setData(cached)
      setIsLoading(false)
      setError(null)
    } else {
      setIsLoading(true)
      setError(null)
    }
  }

  // Los listeners de recuperación necesitan leer el estado actual sin volver a
  // suscribirse en cada render; un ref evita re-registrarlos.
  const hasDataRef = useRef(data !== null)
  useEffect(() => {
    hasDataRef.current = data !== null
  }, [data])

  useEffect(() => {
    if (!url) return

    let active = true
    const controller = new AbortController()
    const cached = urlCache.get<T>(url)

    // Siempre revalidar en background — el cache de sessionStorage puede
    // estar obsoleto si el backend fue actualizado.
    revalidate<T>(url, controller.signal).then((fresh) => {
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
      controller.abort()
    }
  }, [url, reloadTick])

  // Recuperación tras agotar la ventana de reintentos.
  //
  // Si el backend seguía dormido al terminar RETRY_DELAYS_MS, el estado quedaba
  // en error de forma permanente: la vista mostraba guiones hasta que el
  // visitante recargaba a mano. Volver a la pestaña o recuperar la conexión son
  // señales baratas de que vale la pena intentar de nuevo.
  useEffect(() => {
    if (!url) return

    const retry = () => {
      if (hasDataRef.current) return
      if (document.visibilityState !== 'visible') return
      setReloadTick((t) => t + 1)
    }

    window.addEventListener('online', retry)
    document.addEventListener('visibilitychange', retry)
    return () => {
      window.removeEventListener('online', retry)
      document.removeEventListener('visibilitychange', retry)
    }
  }, [url])

  return { data, isLoading, error }
}
