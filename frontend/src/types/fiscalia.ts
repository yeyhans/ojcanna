// frontend/src/types/fiscalia.ts
// Tipos compartidos Fiscalía Nacional · Ministerio Público.

export interface FiscaliaFiltros {
  anios: number[]
}

export interface FiscaliaResumen {
  anio: number
  total_ingresos: number
  total_terminos: number
  ratio_terminos: number
}

export interface FiscaliaSeriePunto {
  anio: number
  ingresos: number
  terminos: number
}

export interface FiscaliaRegion {
  region_id: string
  region_nombre: string
  ingresos: number
  terminos: number
}
