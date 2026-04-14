// frontend/src/types/export.ts
//
// Tipos del endpoint /api/v1/export/manifest — describe cada base de datos
// publicada y sus metadata oficiales.

export interface DatasetInfo {
  id: 'cead' | 'dpp' | 'pdi' | 'fiscalia' | 'ine_poblacion'
  titulo: string
  organismo: string
  fuente_url: string
  granularidad: string
  /** Frase corta que describe qué contiene el dataset — mostrada al usuario. */
  descripcion?: string | null
  /** Eje narrativo del observatorio (Policial, Defensorial, Persecución penal…). */
  etiqueta_eje?: string | null
  /** Ruta frontend con la vista analítica. null si es solo descarga (ej. INE). */
  vista_analitica?: string | null
  columnas: string[]
  caveat: string
  filas: number
  rango_anios: { min: number | null; max: number | null }
  /** Lista exacta de años con registros — para renderizar chips de descarga. */
  anios_disponibles?: number[]
  descargas: { csv: string; xlsx: string }
}

export interface ExportManifest {
  snapshot_utc: string
  fuentes: DatasetInfo[]
}
