// frontend/src/types/pjud.ts
// Mirror de backend/api/schemas/pjud.py

export interface PjudFiltrosResponse {
  anios: number[]
  materias: string[]
  fuentes: string[]
}

export interface PjudStatsResponse {
  anio: number
  total_sentencias: number
  total_con_texto: number
  total_metadata_only: number
  total_tribunales: number
  total_materias: number
}

export interface PjudResumenTribunal {
  tribunal_id: string | null
  tribunal_nombre: string | null
  total: number
}

export interface PjudResumenMateria {
  materia: string | null
  total: number
}

export interface PjudResumenResponse {
  anio: number
  total: number
  por_tribunal: PjudResumenTribunal[]
  por_materia: PjudResumenMateria[]
}

export interface PjudProporcionalidadPunto {
  sentencia_id: string
  gramaje_g: number
  pena_meses: number
  veredicto: string | null
  tipo_delito: string | null
}

export interface PjudProporcionalidadResponse {
  anio: number
  total_puntos: number
  puntos: PjudProporcionalidadPunto[]
}

export interface PjudTribunalStats {
  tribunal_id: string | null
  tribunal_nombre: string | null
  total: number
  condenas: number
  absoluciones: number
  sobreseimientos: number
  salidas_alternativas: number
  otros: number
}

export interface PjudPorTribunalResponse {
  anio: number
  tribunales: PjudTribunalStats[]
}

export interface PjudRegionStats {
  region_id: string | null
  region_nombre: string | null
  total: number
  condenas: number
  absoluciones: number
  sobreseimientos: number
  salidas_alternativas: number
  otros: number
}

export interface PjudPorRegionResponse {
  anio: number
  regiones: PjudRegionStats[]
}

export interface PjudVeredictoItem {
  veredicto: string | null
  total: number
  porcentaje: number
}

export interface PjudVeredictosResponse {
  anio: number
  total_con_veredicto: number
  distribucion: PjudVeredictoItem[]
}
