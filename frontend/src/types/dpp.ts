// frontend/src/types/dpp.ts
// Tipos para los datos de la Defensoría Penal Pública.
// Granularidad: regional (todas las comunas de una región comparten el mismo valor).

export interface DppFiltrosResponse {
  anios: number[]
}

export interface DppFeatureProperties {
  cut: string
  nombre: string
  region_id: string
  n_causas: number
  tiene_datos: boolean
}

export interface DppFeature extends GeoJSON.Feature {
  properties: DppFeatureProperties
}

export interface DppFeatureCollection extends GeoJSON.FeatureCollection {
  features: DppFeature[]
}
