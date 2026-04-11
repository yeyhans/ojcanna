// frontend/src/providers/AppDataProvider.tsx
//
// Context que arranca al montar la app y orquesta la carga inicial:
//
//   Step 1 (await):    /api/v1/cead/filtros           → 33%
//   Step 2 (parallel): /api/v1/cead/geometrias  ┐
//                      /api/v1/cead/stats?...   ┘    → 100%
//   Step 3 (idle):     prefetch DPP/PDI/Embudo + chunks lazy de páginas
//
// Geom y stats van en PARALELO porque no dependen entre sí. El splash termina
// cuando ambos resuelven (max(t_geom, t_stats)) en vez de la suma.
//
// Splash como presentación: el splash se muestra SIEMPRE en cada montaje
// con una duración mínima de SPLASH_MIN_MS para que la animación sea
// apreciable aún con datos cacheados.

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { FiltrosResponse } from '../types/cead'
import { dataStore } from '../store/dataStore'
import { fetchComunasGeom } from '../store/geomStore'
import { urlCache } from '../store/urlCache'

// Tiempo mínimo que el splash queda visible aunque la data ya esté cacheada.
// Subir si querés que la presentación sea más larga; bajar a 0 para velocidad pura.
const SPLASH_MIN_MS = 2500

interface AppDataContextValue {
  isAppReady: boolean
  filtros: FiltrosResponse | null
  showSplash: boolean
  /** 0 → 100 progreso real de la carga inicial. */
  progress: number
}

const AppDataContext = createContext<AppDataContextValue>({
  isAppReady: false,
  filtros: null,
  showSplash: false,
  progress: 0,
})

export function useAppData() {
  return useContext(AppDataContext)
}

// requestIdleCallback con fallback a setTimeout para Safari
type IdleHandle = number
interface IdleDeadline {
  didTimeout: boolean
  timeRemaining: () => number
}
const ric: (cb: (deadline: IdleDeadline) => void, opts?: { timeout: number }) => IdleHandle =
  typeof window !== 'undefined' && 'requestIdleCallback' in window
    ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).requestIdleCallback.bind(window)
    : (cb) => window.setTimeout(() => cb({ didTimeout: false, timeRemaining: () => 50 }), 1)

function prefetchLazyChunks(): void {
  // Carga los módulos en idle para que el primer click al NavBar encuentre
  // el chunk listo.
  ric(() => {
    void import('../pages/DppPage')
  })
  ric(() => {
    void import('../pages/PdiPage')
  })
  ric(() => {
    void import('../pages/EmbudoPage')
  })
}

// Prefetch fire-and-forget de los datos analíticos.
// IMPORTANTE: cada dataset tiene su propio rango de años. NO podemos asumir
// que el "último año" de CEAD existe en DPP/PDI — antes generaba 404 ruidosos.
// Resolvemos primero los filtros de cada dataset y usamos su propio máximo.
async function prefetchAnalytics(): Promise<void> {
  const [dppFiltros, pdiFiltros] = await Promise.all([
    urlCache.fetch<{ anios: number[] }>('/api/v1/dpp/filtros'),
    urlCache.fetch<{ anios: number[]; categorias: string[] }>('/api/v1/pdi/filtros'),
  ])

  const tasks: Promise<unknown>[] = [urlCache.fetch('/api/v1/dpp/serie')]

  if (dppFiltros?.anios?.length) {
    const dppLast = Math.max(...dppFiltros.anios)
    tasks.push(
      urlCache.fetch(`/api/v1/dpp/resumen?anio=${dppLast}`),
      urlCache.fetch(`/api/v1/dpp/regiones?anio=${dppLast}`),
      urlCache.fetch(`/api/v1/dpp/stats?anio=${dppLast}`),
      urlCache.fetch(`/api/v1/embudo/ranking?anio=${dppLast}`),
    )
  }

  if (pdiFiltros?.anios?.length) {
    const pdiLast = Math.max(...pdiFiltros.anios)
    tasks.push(urlCache.fetch(`/api/v1/pdi/resumen?anio=${pdiLast}`))
  }

  await Promise.all(tasks)
}

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [filtros, setFiltros] = useState<FiltrosResponse | null>(null)
  const [isAppReady, setIsAppReady] = useState(false)
  const [progress, setProgress] = useState(0)
  // El splash se muestra SIEMPRE en cada montaje (modo presentación).
  // Se oculta cuando: (a) la data está lista Y (b) pasaron al menos SPLASH_MIN_MS.
  const [showSplash, setShowSplash] = useState<boolean>(true)
  const initialized = useRef(false)

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true

    const startedAt = Date.now()

    async function init() {
      try {
        // Step 1: filtros CEAD (rápido, ~1-3 KB)
        const res = await fetch('/api/v1/cead/filtros')
        if (!res.ok) throw new Error(`filtros: ${res.status}`)
        const data: FiltrosResponse = await res.json()
        setFiltros(data)
        setProgress(33)

        const lastAnio = Math.max(...data.anios)
        const subgrupos = data.subgrupos.map((s) => s.id)

        // Step 2: geometrías + stats CEAD en PARALELO (no dependen entre sí)
        await Promise.all([
          fetchComunasGeom().then(() => setProgress(66)),
          dataStore.prefetch(lastAnio, subgrupos),
        ])
        setProgress(100)
      } catch {
        // Si algo falla, la app sigue funcionando — cada hook maneja su error
        setProgress(100)
      } finally {
        setIsAppReady(true)
        // Step 3: tareas en idle (no bloquean UI)
        void prefetchAnalytics()
        prefetchLazyChunks()

        // Garantizar duración mínima del splash (modo presentación).
        // Si la data llegó antes de SPLASH_MIN_MS, esperamos lo que falta.
        const elapsed = Date.now() - startedAt
        const remaining = Math.max(0, SPLASH_MIN_MS - elapsed)
        window.setTimeout(() => setShowSplash(false), remaining)
      }
    }

    void init()
  }, [])

  return (
    <AppDataContext.Provider value={{ isAppReady, filtros, showSplash, progress }}>
      {children}
    </AppDataContext.Provider>
  )
}
