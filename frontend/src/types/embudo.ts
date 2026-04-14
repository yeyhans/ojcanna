// frontend/src/types/embudo.ts
export interface EtapaEmbudo {
  etapa: 'policial' | 'investigativa' | 'defensorial' | 'judicial'
  fuente: 'CEAD' | 'PDI' | 'DPP' | 'PJud'
  label: string
  n_casos: number
  nivel_real: 'comunal' | 'regional' | 'nacional'
  es_aproximacion: boolean
  nota_metodologica: string | null
}

export interface EmbudoComunaResponse {
  anio: number
  comuna_id: string | null
  comuna_nombre: string | null
  region_id: string | null
  etapas: EtapaEmbudo[]
  tasa_atricion_pct: number | null
}

export interface EmbudoRankingItem {
  comuna_id: string
  comuna_nombre: string
  region_id: string | null
  n_policial: number
  n_judicial: number
  ratio_policial_judicial: number
}

export interface EmbudoRankingResponse {
  anio: number
  items: EmbudoRankingItem[]
}

export interface SankeyNodo {
  id: string
  label: string
  fuente: string
  etapa: string
  n_casos: number
}

export interface SankeyFlujo {
  source: string
  target: string
  value: number
  perdida: boolean
}

export interface EmbudoSankeyResponse {
  anio: number
  comuna_id: string | null
  nodos: SankeyNodo[]
  flujos: SankeyFlujo[]
  nota_metodologica: string
}
