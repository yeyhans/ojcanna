// frontend/src/lib/colorScale.ts
import type { ExpressionSpecification } from 'maplibre-gl'
import type { CeadFeature } from '../types/cead'

export const PALETTE = ['#e0f2fe', '#7dd3fc', '#3b82f6', '#1d4ed8', '#1e3a8a']
export const NO_DATA = '#f1f5f9'

/**
 * Calcula 5 breaks cuantiles sobre frecuencia_total y construye
 * una expresión MapLibre `step` para fill-color.
 */
export function buildStepExpression(
  features: CeadFeature[]
): ExpressionSpecification {
  const values = features
    .map((f) => f.properties?.frecuencia_total ?? 0)
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
    ['get', 'frecuencia_total'],
    NO_DATA,
    0.001, PALETTE[0],
    breaks[0], PALETTE[1],
    breaks[1], PALETTE[2],
    breaks[2], PALETTE[3],
    breaks[3], PALETTE[4],
  ] as ExpressionSpecification
}

/**
 * Devuelve las etiquetas de leyenda basadas en los breaks.
 */
export function buildLegendBreaks(features: CeadFeature[]): number[] {
  const values = features
    .map((f) => f.properties?.frecuencia_total ?? 0)
    .filter((v) => v > 0)
    .sort((a, b) => a - b)

  if (values.length === 0) return []

  return [0.2, 0.4, 0.6, 0.8].map(
    (q) => values[Math.floor(q * values.length)] ?? values[values.length - 1]
  )
}
