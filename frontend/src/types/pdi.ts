// frontend/src/types/pdi.ts
export interface PdiFiltrosResponse {
  anios: number[]
  categorias: string[]
}

export interface PdiFeatureProperties {
  cut: string
  nombre: string
  region_id: string
  frecuencia: number
  tiene_datos: boolean
}

export interface PdiFeature extends GeoJSON.Feature {
  properties: PdiFeatureProperties
}

export interface PdiFeatureCollection extends GeoJSON.FeatureCollection {
  features: PdiFeature[]
}
