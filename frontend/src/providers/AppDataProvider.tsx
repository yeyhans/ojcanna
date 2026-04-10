// frontend/src/providers/AppDataProvider.tsx
//
// Context que arranca al montar la app y:
//   1. Fetcha los filtros (/api/v1/cead/filtros) — datos pequeños, vienen rápido.
//   2. Comprueba si hay datos en sessionStorage (segunda visita → skip de splash).
//   3. Pre-fetcha TODOS los datos de todas las páginas en paralelo durante el splash.
//   4. Expone { isAppReady, filtros, showSplash } al árbol.
//
// El splash espera solo el dato crítico (CEAD GeoJSON). Los datos de DPP/PDI/Embudo
// se pre-fetchan en paralelo (fire-and-forget), de modo que cuando el usuario
// navega a esas páginas los datos ya están en cache → cero re-fetches.

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import type { FiltrosResponse } from '../types/cead'
import { dataStore, hasAnySessionData } from '../store/dataStore'
import { urlCache } from '../store/urlCache'

interface AppDataContextValue {
  isAppReady: boolean
  filtros: FiltrosResponse | null
  showSplash: boolean
}

const AppDataContext = createContext<AppDataContextValue>({
  isAppReady: false,
  filtros: null,
  showSplash: false,
})

export function useAppData() {
  return useContext(AppDataContext)
}

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [filtros, setFiltros] = useState<FiltrosResponse | null>(null)
  const [isAppReady, setIsAppReady] = useState(false)
  // showSplash se calcula de forma sincrónica en el primer render:
  // true  → primera visita (no hay datos en sessionStorage)
  // false → segunda visita o refresh (datos ya en sessionStorage)
  const [showSplash] = useState<boolean>(() => !hasAnySessionData())
  const initialized = useRef(false)

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true

    async function init() {
      try {
        // 1. Cargar filtros CEAD
        const res = await fetch('/api/v1/cead/filtros')
        if (!res.ok) throw new Error(`filtros: ${res.status}`)
        const data: FiltrosResponse = await res.json()
        setFiltros(data)

        const lastAnio = Math.max(...data.anios)
        const subgrupos = data.subgrupos.map((s) => s.id)

        // 2. Pre-fetch de todas las páginas en paralelo (fire-and-forget)
        //    No bloqueamos el splash — los datos estarán listos cuando el usuario navegue.
        void Promise.all([
          urlCache.fetch(`/api/v1/dpp/filtros`),
          urlCache.fetch(`/api/v1/dpp/serie`),
          urlCache.fetch(`/api/v1/dpp/resumen?anio=${lastAnio}`),
          urlCache.fetch(`/api/v1/dpp/regiones?anio=${lastAnio}`),
          urlCache.fetch(`/api/v1/mapa/dpp?anio=${lastAnio}`),
          urlCache.fetch(`/api/v1/pdi/filtros`),
          urlCache.fetch(`/api/v1/pdi/resumen?anio=${lastAnio}`),
          urlCache.fetch(`/api/v1/embudo/ranking?anio=${lastAnio}`),
        ])

        // 3. El splash espera solo el dato crítico: CEAD GeoJSON
        await dataStore.prefetch(lastAnio, subgrupos)
      } catch {
        // Si algo falla, la app sigue funcionando — cada hook manejará su propio error
      } finally {
        setIsAppReady(true)
      }
    }

    void init()
  }, [])

  return (
    <AppDataContext.Provider value={{ isAppReady, filtros, showSplash }}>
      {children}
    </AppDataContext.Provider>
  )
}
