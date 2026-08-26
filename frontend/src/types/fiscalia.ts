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

// ---------------------------------------------------------------------------
// Detalle del boletín (hojas TB6.2, TB9, TB7, TB5.2.1)
// ---------------------------------------------------------------------------

export type GrupoTermino = 'salida_judicial' | 'salida_no_judicial' | 'otros_terminos'

export interface FiscaliaTipoTermino {
  tipo: string
  grupo: GrupoTermino | string
  n_causas: number
  porcentaje: number
}

export interface FiscaliaTerminos {
  anio: number
  total_terminos: number
  tipos: FiscaliaTipoTermino[]
}

export interface FiscaliaJuicioRegion {
  region_id: string
  region_nombre: string
  juicios_orales: number
}

export interface FiscaliaJuicios {
  anio: number
  total_nacional: number
  regiones: FiscaliaJuicioRegion[]
}

export interface FiscaliaTramitacionRegion {
  region_id: string
  region_nombre: string
  /** Etiqueta zonal de la RM — la fuente publica 4 fiscalías metropolitanas. */
  zonal: string | null
  dias_salida_judicial: number | null
  dias_salida_no_judicial: number | null
}

export interface FiscaliaTramitacion {
  anio: number
  unidad: string
  regiones: FiscaliaTramitacionRegion[]
}

export interface FiscaliaDemografiaItem {
  sexo: string
  tramo_etario: string
  n_imputados: number
}

export interface FiscaliaDemografia {
  anio: number
  total_imputados: number
  granularidad: string
  items: FiscaliaDemografiaItem[]
}
