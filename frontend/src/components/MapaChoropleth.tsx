// frontend/src/components/MapaChoropleth.tsx
// Mapa coropleta genérico. Acepta cualquier GeoJSON FeatureCollection
// con al menos las propiedades: cut, nombre, y un campo numérico para el color.
import { useCallback, useState } from 'react'
import type { ExpressionSpecification, MapLayerMouseEvent } from 'maplibre-gl'
import Map, { Layer, Source } from 'react-map-gl/maplibre'
import { useIsMobile } from '../hooks/useIsMobile'
import { NO_DATA } from '../lib/colorScale'

const CHILE_CENTER = { longitude: -71.5, latitude: -37.5, zoom: 4 }
const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json'

interface TooltipState {
  nombre: string
  valor: number
  valorLabel: string
  valorSecundario?: number
  valorSecundarioLabel?: string
  x: number
  y: number
}

export interface MapaChoroplethProps {
  geojson: GeoJSON.FeatureCollection | null
  colorExpression: ExpressionSpecification | null
  isLoading: boolean
  /** Propiedad GeoJSON usada como valor principal (para el tooltip). */
  valueProperty?: string
  /** Etiqueta del valor principal, ej: "casos", "causas". */
  valueLabel?: string
  /** Propiedad GeoJSON opcional para valor secundario (ej: tasa_100k). */
  secondaryProperty?: string
  /** Etiqueta del valor secundario. */
  secondaryLabel?: string
  /** Callback cuando el usuario hace click en una comuna (para el embudo). */
  onComunaSelect?: (cut: string, nombre: string) => void
}

export function MapaChoropleth({
  geojson,
  colorExpression,
  isLoading,
  valueProperty = 'valor_principal',
  valueLabel = 'casos',
  secondaryProperty,
  secondaryLabel,
  onComunaSelect,
}: MapaChoroplethProps) {
  const isMobile = useIsMobile()
  const [tooltip, setTooltip] = useState<TooltipState | null>(null)
  const [selectedCut, setSelectedCut] = useState<string | null>(null)

  const onMouseMove = useCallback(
    (e: MapLayerMouseEvent) => {
      if (isMobile) return
      const feature = e.features?.[0]
      if (!feature?.properties) return
      const props = feature.properties as Record<string, unknown>
      setTooltip({
        nombre: String(props.nombre ?? ''),
        valor: Number(props[valueProperty] ?? 0),
        valorLabel: valueLabel,
        valorSecundario: secondaryProperty ? Number(props[secondaryProperty] ?? 0) : undefined,
        valorSecundarioLabel: secondaryLabel,
        x: e.originalEvent.clientX,
        y: e.originalEvent.clientY,
      })
    },
    [isMobile, valueProperty, valueLabel, secondaryProperty, secondaryLabel]
  )

  const onMouseLeave = useCallback(() => setTooltip(null), [])

  const onClick = useCallback(
    (e: MapLayerMouseEvent) => {
      const feature = e.features?.[0]
      if (!feature?.properties) {
        setSelectedCut(null)
        return
      }
      const props = feature.properties as Record<string, unknown>
      const cut = String(props.cut ?? '')
      const nombre = String(props.nombre ?? '')
      setSelectedCut(cut)
      onComunaSelect?.(cut, nombre)
    },
    [onComunaSelect]
  )

  const fillColor = colorExpression ?? NO_DATA

  return (
    <div className="relative w-full h-full">
      {isLoading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/40 backdrop-blur-[2px]">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      <Map
        initialViewState={CHILE_CENTER}
        style={{ width: '100%', height: '100%' }}
        mapStyle={MAP_STYLE}
        interactiveLayerIds={geojson ? ['choropleth-fill'] : []}
        onMouseMove={onMouseMove}
        onMouseLeave={onMouseLeave}
        onClick={onClick}
        attributionControl={false}
      >
        {geojson && (
          <Source id="choropleth-data" type="geojson" data={geojson}>
            <Layer
              id="choropleth-fill"
              type="fill"
              paint={{
                'fill-color': fillColor as ExpressionSpecification,
                'fill-opacity': [
                  'case',
                  ['==', ['get', 'cut'], selectedCut ?? ''],
                  0.95,
                  0.75,
                ],
              }}
            />
            <Layer
              id="choropleth-outline"
              type="line"
              paint={{
                'line-color': '#94a3b8',
                'line-width': 0.5,
              }}
            />
          </Source>
        )}
      </Map>

      {/* Tooltip desktop */}
      {!isMobile && tooltip && (
        <div
          className="
            pointer-events-none fixed z-50
            bg-white/75 backdrop-blur-md
            border border-white/30
            rounded-xl shadow-lg
            px-4 py-3 min-w-[180px]
          "
          style={{ left: tooltip.x + 12, top: tooltip.y - 10 }}
        >
          <p className="font-semibold text-slate-800 text-sm leading-tight mb-2">
            {tooltip.nombre}
          </p>
          <div className="flex flex-col gap-1">
            <div>
              <span className="text-2xl font-bold text-blue-700 leading-none">
                {Math.round(tooltip.valor).toLocaleString('es-CL')}
              </span>
              <span className="text-slate-500 text-xs ml-1">{tooltip.valorLabel}</span>
            </div>
            {tooltip.valorSecundario !== undefined && tooltip.valorSecundarioLabel && (
              <p className="text-slate-500 text-xs">
                {tooltip.valorSecundario.toFixed(1)} {tooltip.valorSecundarioLabel}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
