// frontend/src/types/common.ts
// Tipos compartidos entre las distintas fuentes de datos del Observatorio.

/**
 * Propiedades mínimas que todo Feature del mapa debe tener,
 * independientemente de la fuente (CEAD, DPP, datos.gob.cl, etc.).
 */
export interface BaseFeatureProperties {
  cut: string
  nombre: string
  /** Valor principal usado para la escala de color del coropleta. */
  valor_principal: number
  /** Etiqueta para valor_principal, ej: "casos", "causas", "imputados". */
  valor_label: string
  /** Valor secundario opcional (ej: tasa por 100k hab.). */
  valor_secundario?: number
  valor_secundario_label?: string
}

export interface BaseFeature extends GeoJSON.Feature {
  properties: BaseFeatureProperties
}

export interface BaseFeatureCollection extends GeoJSON.FeatureCollection {
  features: BaseFeature[]
}

/** Identificadores de las fuentes disponibles en el Observatorio. */
export type FuenteId = 'cead' | 'dpp' | 'datosgob'

export interface FuenteInfo {
  id: FuenteId
  label: string
  descripcion: string
  disponible: boolean
}

export const FUENTES: FuenteInfo[] = [
  {
    id: 'cead',
    label: 'CEAD',
    descripcion: 'Casos policiales — Ley 20.000 (2005-2024)',
    disponible: true,
  },
  {
    id: 'dpp',
    label: 'DPP',
    descripcion: 'Causas Defensoría Penal Pública (2020-2024)',
    disponible: false,
  },
  {
    id: 'datosgob',
    label: 'datos.gob.cl',
    descripcion: 'Seguridad ciudadana comunal',
    disponible: false,
  },
]
