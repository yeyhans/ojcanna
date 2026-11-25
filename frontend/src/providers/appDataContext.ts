// frontend/src/providers/appDataContext.ts
//
// Context y hook de AppData, separados de AppDataProvider.tsx para que ese
// archivo exporte sólo componentes (requisito de Fast Refresh).

import { createContext, useContext } from 'react'
import type { FiltrosResponse } from '../types/cead'

export interface AppDataContextValue {
  /** true cuando geom+stats de CEAD están listos — SOLO afecta a /mapa. */
  isMapaReady: boolean
  filtros: FiltrosResponse | null
  showSplash: boolean
  /** 0 → 100 progreso real de la carga en background. */
  progress: number
}

export const AppDataContext = createContext<AppDataContextValue>({
  isMapaReady: false,
  filtros: null,
  showSplash: false,
  progress: 0,
})

export function useAppData() {
  return useContext(AppDataContext)
}
