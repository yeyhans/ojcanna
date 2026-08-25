// frontend/src/providers/AppDataProvider.tsx
//
// Context que arranca al montar la app y orquesta la carga inicial:
//
//   Step 1 (await):    /api/v1/cead/filtros           → 20%
//   Step 2 (await):    /api/v1/cead/geometrias  ┐
//                      /api/v1/cead/stats?...   ┘    → 70%  ← isAppReady=true, splash se oculta
//   Step 3 (background, NO bloquea): DPP/PDI/Fiscalía + chunks lazy → 100%
//
// Geom y stats van en PARALELO porque no dependen entre sí. `isAppReady`
// significa "el mapa CEAD tiene lo que necesita para pintar" — NO implica
// que la analítica de otras fuentes ya esté cacheada (eso corre en background
// en Step 3 y no tiene flag propio; cada página analítica maneja su propio
// loading state si el usuario navega antes de que termine).
//
// Splash como presentación: en la primera visita se muestra con una duración
// mínima de SPLASH_MIN_MS para que la animación sea apreciable. Con
// sessionStorage caliente (`hasAnySessionData`) esa espera mínima se salta.

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { FiltrosResponse } from '../types/cead'
import { dataStore, hasAnySessionData } from '../store/dataStore'
import { fetchComunasGeom } from '../store/geomStore'
import { urlCache } from '../store/urlCache'

// Tiempo mínimo que el splash queda visible en la PRIMERA visita (sin cache).
// En visitas con sessionStorage caliente (hasAnySessionData) el splash no
// fuerza espera — el mapa aparece apenas los datos CEAD están listos.
const SPLASH_MIN_MS = 2000

interface AppDataContextValue {
  /** true cuando geom+stats de CEAD están listos — NO implica que DPP/PDI/Fiscalía ya cargaron. */
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
    void import('../pages/FiscaliaPage')
  })
}

// Prefetch fire-and-forget de los datos analíticos.
// IMPORTANTE: cada dataset tiene su propio rango de años. NO podemos asumir
// que el "último año" de CEAD existe en DPP/PDI — antes generaba 404 ruidosos.
// Resolvemos primero los filtros de cada dataset y usamos su propio máximo.
async function prefetchAnalytics(): Promise<void> {
  const [dppFiltros, pdiFiltros, fiscaliaFiltros] = await Promise.all([
    urlCache.fetch<{ anios: number[] }>('/api/v1/dpp/filtros'),
    urlCache.fetch<{ anios: number[]; categorias: string[] }>('/api/v1/pdi/filtros'),
    urlCache.fetch<{ anios: number[] }>('/api/v1/fiscalia/filtros'),
  ])

  const tasks: Promise<unknown>[] = [
    urlCache.fetch('/api/v1/dpp/serie'),
    urlCache.fetch('/api/v1/fiscalia/serie'),
  ]

  if (dppFiltros?.anios?.length) {
    const dppLast = Math.max(...dppFiltros.anios)
    tasks.push(
      urlCache.fetch(`/api/v1/dpp/resumen?anio=${dppLast}`),
      urlCache.fetch(`/api/v1/dpp/regiones?anio=${dppLast}`),
      urlCache.fetch(`/api/v1/dpp/stats?anio=${dppLast}`),
    )
  }

  if (pdiFiltros?.anios?.length) {
    const pdiLast = Math.max(...pdiFiltros.anios)
    tasks.push(urlCache.fetch(`/api/v1/pdi/resumen?anio=${pdiLast}`))
  }

  if (fiscaliaFiltros?.anios?.length) {
    const fiscaliaLast = Math.max(...fiscaliaFiltros.anios)
    tasks.push(
      urlCache.fetch(`/api/v1/fiscalia/resumen?anio=${fiscaliaLast}`),
      urlCache.fetch(`/api/v1/fiscalia/regiones?anio=${fiscaliaLast}`),
    )
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
    let step1Ok = false

    async function init() {
      try {
        // Step 1: filtros CEAD (rápido, ~1-3 KB)
        const res = await fetch('/api/v1/cead/filtros')
        if (!res.ok) throw new Error(`filtros: ${res.status}`)
        const data: FiltrosResponse = await res.json()
        setFiltros(data)
        setProgress(20)
        step1Ok = true

        const lastAnio = Math.max(...data.anios)
        const subgrupos = data.subgrupos.map((s) => s.id)

        // Step 2: SOLO lo que el mapa CEAD necesita para pintar (geom + stats).
        // La analítica DPP/PDI/Fiscalía NO bloquea el splash — corre en
        // background (ver finally) porque el usuario ya está viendo el mapa
        // para cuando esos datos importan (navegar a /dpp, /pdi, etc).
        await Promise.all([
          fetchComunasGeom().then(() => setProgress(45)),
          dataStore.prefetch(lastAnio, subgrupos).then(() => setProgress(70)),
        ])
        setProgress(70)
      } catch {
        // Si algo falla, la app sigue funcionando — cada hook maneja su error
        setProgress(70)
      } finally {
        setIsAppReady(true)
        // Step 3: chunks lazy en idle (no bloquean UI)
        prefetchLazyChunks()

        // Analítica DPP/PDI/Fiscalía en background — no bloquea el splash ni
        // el primer render del mapa. Se salta si Step 1 falló (sin filtros no
        // hay año/rango que asumir, y la sesión ya está en estado degradado).
        if (step1Ok) {
          void prefetchAnalytics()
            .then(() => setProgress(100))
            .catch(() => setProgress(100))
        }

        // Duración mínima del splash SOLO en la primera visita (sin cache).
        // Con sessionStorage caliente (hasAnySessionData) no hay espera forzada.
        const elapsed = Date.now() - startedAt
        const minWait = hasAnySessionData() ? 0 : SPLASH_MIN_MS
        const remaining = Math.max(0, minWait - elapsed)
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
