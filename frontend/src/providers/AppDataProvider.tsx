// frontend/src/providers/AppDataProvider.tsx
//
// Context que arranca al montar la app y orquesta la carga.
//
// PRIORIDAD INVERTIDA (reestructuración): la landing dejó de ser el mapa, así
// que el arranque ya NO bloquea en el GeoJSON de 344 comunas. Antes el splash
// esperaba geom+stats de CEAD; con la portada narrativa en "/" eso significaba
// que todo visitante nuevo pagaba la espera de un payload que no iba a ver.
//
//   Step 1 (await, ~1-3 KB): /api/v1/cead/filtros        → 40%
//   Step 2 (idle, NO bloquea): geom + stats CEAD          → 70%   isMapaReady
//   Step 3 (idle, NO bloquea): chunks lazy + analítica    → 100%
//
// El splash ahora sólo cubre el arranque inicial (presentación de marca), no
// una dependencia de datos. Se oculta apenas pasa SPLASH_MIN_MS.
//
// `isMapaReady` (antes `isAppReady`, que mentía): significa "el mapa CEAD tiene
// geometrías y stats para pintar". NO significa que la app esté lista — la
// portada y las páginas-documento no dependen de él.

import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { FiltrosResponse } from '../types/cead'
import { AppDataContext } from './appDataContext'
import { dataStore, hasAnySessionData } from '../store/dataStore'
import { fetchComunasGeom } from '../store/geomStore'
import { urlCache } from '../store/urlCache'

// Tiempo mínimo del splash en la PRIMERA visita (presentación de marca).
// Bajó de 2000 ms: ya no espera datos, así que sostenerlo más era teatro.
// En visitas con sessionStorage caliente no hay espera forzada.
const SPLASH_MIN_MS = 1200

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
  // el chunk listo. MapaPage entra acá porque dejó de ser la landing: arrastra
  // MapLibre GL y ya no está en el bundle inicial.
  ric(() => {
    void import('../pages/MapaPage')
  })
  ric(() => {
    void import('../pages/DppPage')
  })
  ric(() => {
    void import('../pages/PdiPage')
  })
  ric(() => {
    void import('../pages/FiscaliaPage')
  })
  ric(() => {
    void import('../pages/DatosPage')
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
  const [isMapaReady, setIsMapaReady] = useState(false)
  const [progress, setProgress] = useState(0)
  const [showSplash, setShowSplash] = useState<boolean>(true)
  const initialized = useRef(false)

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true

    // El splash ya no espera datos: se agenda su cierre de entrada.
    //
    // Sin cleanup a propósito. El guard `initialized` hace que la segunda
    // pasada del efecto en StrictMode salga temprano, así que un cleanup que
    // cancelara este timer lo dejaría cancelado para siempre y el splash no se
    // cerraría nunca en desarrollo.
    const minWait = hasAnySessionData() ? 0 : SPLASH_MIN_MS
    window.setTimeout(() => setShowSplash(false), minWait)

    async function init() {
      let step1Ok = false

      try {
        // Step 1: filtros CEAD (rápido, ~1-3 KB). Alimenta el FilterPanel y
        // da el último año disponible para el prefetch del mapa.
        const res = await fetch('/api/v1/cead/filtros')
        if (!res.ok) throw new Error(`filtros: ${res.status}`)
        const data: FiltrosResponse = await res.json()
        setFiltros(data)
        setProgress(40)
        step1Ok = true

        const lastAnio = Math.max(...data.anios)
        const subgrupos = data.subgrupos.map((s) => s.id)

        // Step 2: geometrías + stats del mapa EN IDLE. Ya no bloquean nada.
        // Si el usuario entra directo a /mapa, useCeadMapa maneja su propio
        // loading state y el fetch se deduplica en dataStore/geomStore.
        ric(() => {
          void Promise.all([fetchComunasGeom(), dataStore.prefetch(lastAnio, subgrupos)])
            .then(() => {
              setProgress(70)
              setIsMapaReady(true)
            })
            .catch(() => {
              setProgress(70)
            })
        })
      } catch {
        // Si algo falla, la app sigue funcionando — cada hook maneja su error
        setProgress(40)
      } finally {
        // Step 3: chunks lazy en idle (no bloquean UI)
        prefetchLazyChunks()

        // Analítica DPP/PDI/Fiscalía en background. Se salta si Step 1 falló
        // (sin filtros no hay año/rango que asumir, y la sesión ya está
        // en estado degradado).
        if (step1Ok) {
          ric(() => {
            void prefetchAnalytics()
              .then(() => setProgress(100))
              .catch(() => setProgress(100))
          })
        }
      }
    }

    void init()
  }, [])

  return (
    <AppDataContext.Provider value={{ isMapaReady, filtros, showSplash, progress }}>
      {children}
    </AppDataContext.Provider>
  )
}
