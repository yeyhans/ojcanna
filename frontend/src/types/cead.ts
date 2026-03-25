// frontend/src/types/cead.ts

export interface SubgrupoItem {
  id: string
  nombre: string
}

export interface FiltrosResponse {
  anios: number[]
  subgrupos: SubgrupoItem[]
}

export interface CeadFeatureProperties {
  cut: string
  nombre: string
  tasa_agregada: number
  frecuencia_total: number
}

export interface CeadFeature extends GeoJSON.Feature {
  properties: CeadFeatureProperties
}

export interface CeadFeatureCollection extends GeoJSON.FeatureCollection {
  features: CeadFeature[]
}
