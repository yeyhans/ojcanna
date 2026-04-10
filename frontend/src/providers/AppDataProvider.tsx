// frontend/src/providers/AppDataProvider.tsx
//
// Context que arranca al montar la app y:
//   1. Fetcha los filtros (/api/v1/cead/filtros) — datos pequeños, vienen rápido.
//   2. Comprueba si hay datos en sessionStorage (segunda visita → skip de splash).
//   3. Pre-fetcha el GeoJSON más común (último año, todos los subgrupos).
//   4. Expone { isAppReady, filtros, showSplash } al árbol.
//
// Cuando useCeadMapa corre con los mismos params, encuentra el dato en dataStore
// sin hacer ningún request de red adicional.

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import type { FiltrosResponse } from '../types/cead'
import { dataStore, hasAnySessionData } from '../store/dataStore'

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
        // 1. Cargar filtros
        const res = await fetch('/api/v1/cead/filtros')
        if (!res.ok) throw new Error(`filtros: ${res.status}`)
        const data: FiltrosResponse = await res.json()
        setFiltros(data)

        // 2. Pre-fetch del GeoJSON más común
        const anio = Math.max(...data.anios)
        const subgrupos = data.subgrupos.map((s) => s.id)
        await dataStore.prefetch(anio, subgrupos)
      } catch {
        // Si algo falla, la app sigue funcionando — useCeadMapa manejará su propio error
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
