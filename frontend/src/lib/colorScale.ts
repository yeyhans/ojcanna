// frontend/src/lib/colorScale.ts
import type { ExpressionSpecification } from 'maplibre-gl'

export const PALETTE = ['#e0f2fe', '#7dd3fc', '#3b82f6', '#1d4ed8', '#1e3a8a']
export const NO_DATA = '#f1f5f9'

/**
 * Calcula 5 breaks cuantiles sobre la propiedad indicada y construye
 * una expresión MapLibre `step` para fill-color.
 *
 * @param features   Array de GeoJSON features con propiedades numéricas.
 * @param valueProperty  Nombre de la propiedad a usar (default: 'frecuencia_total').
 */
export function buildStepExpression(
  features: GeoJSON.Feature[],
  valueProperty: string = 'frecuencia_total'
): ExpressionSpecification {
  const values = features
    .map((f) => (f.properties?.[valueProperty] ?? 0) as number)
    .filter((v) => v > 0)
    .sort((a, b) => a - b)

  if (values.length === 0) {
    return ['literal', NO_DATA] as ExpressionSpecification
  }

  const breaks = [0.2, 0.4, 0.6, 0.8].map(
    (q) => values[Math.floor(q * values.length)] ?? values[values.length - 1]
  )

  return [
    'step',
    ['get', valueProperty],
    NO_DATA,
    0.001, PALETTE[0],
    breaks[0], PALETTE[1],
    breaks[1], PALETTE[2],
    breaks[2], PALETTE[3],
    breaks[3], PALETTE[4],
  ] as ExpressionSpecification
}

/**
 * Devuelve los breaks cuantiles para construir la leyenda.
 *
 * @param features   Array de GeoJSON features.
 * @param valueProperty  Nombre de la propiedad numérica (default: 'frecuencia_total').
 */
export function buildLegendBreaks(
  features: GeoJSON.Feature[],
  valueProperty: string = 'frecuencia_total'
): number[] {
  const values = features
    .map((f) => (f.properties?.[valueProperty] ?? 0) as number)
    .filter((v) => v > 0)
    .sort((a, b) => a - b)

  if (values.length === 0) return []

  return [0.2, 0.4, 0.6, 0.8].map(
    (q) => values[Math.floor(q * values.length)] ?? values[values.length - 1]
  )
}
