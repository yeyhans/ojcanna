// frontend/src/components/MapaCEAD.tsx
import { useCallback, useRef, useState } from 'react'
import type { ExpressionSpecification, MapLayerMouseEvent } from 'maplibre-gl'
import Map, { Layer, Source } from 'react-map-gl/maplibre'
import type { CeadFeatureCollection, CeadFeatureProperties } from '../types/cead'
import { ComunaTooltip } from './ComunaTooltip'
import { ComunaCard } from './ComunaCard'
import { useIsMobile } from '../hooks/useIsMobile'
import { NO_DATA } from '../lib/colorScale'

const CHILE_CENTER = { longitude: -71.5, latitude: -37.5, zoom: 4 }
const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json'

interface Props {
  geojson: CeadFeatureCollection | null
  colorExpression: ExpressionSpecification | null
  isLoading: boolean
  onComunaSelect?: (cut: string, nombre: string) => void
}

interface TooltipState {
  feature: { properties: CeadFeatureProperties } | null
  x: number
  y: number
}

export function MapaCEAD({ geojson, colorExpression, isLoading, onComunaSelect }: Props) {
  const isMobile = useIsMobile()
  const [tooltip, setTooltip] = useState<TooltipState>({ feature: null, x: 0, y: 0 })
  const [selectedFeature, setSelectedFeature] = useState<{ properties: CeadFeatureProperties } | null>(null)
  const mapRef = useRef(null)

  const onMouseMove = useCallback((e: MapLayerMouseEvent) => {
    const feature = e.features?.[0]
    if (feature) {
      setTooltip({
        feature: feature as unknown as { properties: CeadFeatureProperties },
        x: e.originalEvent.clientX,
        y: e.originalEvent.clientY,
      })
    }
  }, [])

  const onMouseLeave = useCallback(() => {
    setTooltip({ feature: null, x: 0, y: 0 })
  }, [])

  const onClick = useCallback((e: MapLayerMouseEvent) => {
    const feature = e.features?.[0]
    if (feature) {
      const typed = feature as unknown as { properties: CeadFeatureProperties }
      setSelectedFeature(typed)
      onComunaSelect?.(typed.properties.cut, typed.properties.nombre)
    } else {
      setSelectedFeature(null)
    }
  }, [onComunaSelect])

  const fillColor = colorExpression ?? NO_DATA

  return (
    <div className="relative w-full h-full">
      {isLoading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/40 backdrop-blur-[2px]">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      <Map
        ref={mapRef}
        initialViewState={CHILE_CENTER}
        style={{ width: '100%', height: '100%' }}
        mapStyle={MAP_STYLE}
        interactiveLayerIds={geojson ? ['comunas-fill'] : []}
        onMouseMove={isMobile ? undefined : onMouseMove}
        onMouseLeave={isMobile ? undefined : onMouseLeave}
        onClick={onClick}
        attributionControl={false}
      >
        {geojson && (
          <Source id="comunas" type="geojson" data={geojson}>
            <Layer
              id="comunas-fill"
              type="fill"
              paint={{
                'fill-color': fillColor as ExpressionSpecification,
                'fill-opacity': 0.75,
              }}
            />
            <Layer
              id="comunas-outline"
              type="line"
              paint={{
                'line-color': '#94a3b8',
                'line-width': 0.5,
              }}
            />
          </Source>
        )}
      </Map>

      {/* Desktop: tooltip sigue el cursor */}
      {!isMobile && (
        <ComunaTooltip feature={tooltip.feature} x={tooltip.x} y={tooltip.y} />
      )}

      {/* Mobile: card fija sobre el bottom sheet */}
      {isMobile && (
        <ComunaCard
          feature={selectedFeature}
          onClose={() => setSelectedFeature(null)}
        />
      )}
    </div>
  )
}
