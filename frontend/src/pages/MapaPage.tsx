// frontend/src/pages/MapaPage.tsx
// Página del mapa coropleta CEAD — extrae la lógica de App.tsx
import { useState } from 'react'
import { MapaCEAD } from '../components/MapaCEAD'
import { FilterPanel } from '../components/FilterPanel'
import { Legend } from '../components/Legend'
import { InfoModal } from '../components/InfoModal'
import { EmbudoPanel } from '../components/EmbudoPanel'
import { useCeadMapa } from '../hooks/useCeadMapa'
import { useEmbudo } from '../hooks/useEmbudo'

export default function MapaPage() {
  const [anio, setAnio] = useState<number | null>(null)
  const [subgrupos, setSubgrupos] = useState<string[] | null>(null)
  const [infoOpen, setInfoOpen] = useState(false)
  const [selectedComuna, setSelectedComuna] = useState<{ cut: string; nombre: string } | null>(null)

  const { geojson, colorExpression, legendBreaks, isLoading, error, retry } =
    useCeadMapa(anio, subgrupos ?? [])

  const { data: embudoData, isLoading: embudoLoading } = useEmbudo(
    anio,
    selectedComuna?.cut ?? null
  )

  return (
    <div className="relative w-full h-full overflow-hidden">
      <MapaCEAD
        geojson={geojson}
        colorExpression={colorExpression}
        isLoading={isLoading}
        onComunaSelect={(cut, nombre) => setSelectedComuna({ cut, nombre })}
      />

      <FilterPanel onChange={(a, s) => { setAnio(a); setSubgrupos(s) }} />

      {legendBreaks.length > 0 && <Legend breaks={legendBreaks} />}

      {/* Info button */}
      <div className="absolute top-4 right-4 z-20">
        <button
          onClick={() => setInfoOpen(true)}
          aria-label="Información sobre los datos"
          className="
            w-8 h-8 flex items-center justify-center
            rounded-full
            bg-white/70 backdrop-blur-md
            border border-white/40
            shadow-md shadow-slate-200/60
            text-slate-500 hover:text-slate-800
            text-sm font-semibold transition-colors
          "
        >
          i
        </button>
      </div>

      <EmbudoPanel
        comunaNombre={selectedComuna?.nombre ?? null}
        anio={anio}
        etapas={embudoData?.etapas ?? []}
        isLoading={embudoLoading}
        onClose={() => setSelectedComuna(null)}
      />

      <InfoModal open={infoOpen} onClose={() => setInfoOpen(false)} />

      {error && (
        <div className="
          absolute top-16 left-1/2 -translate-x-1/2 z-30
          bg-red-50 border border-red-200
          rounded-xl shadow-lg
          px-4 py-3 flex items-center gap-3
          max-w-sm
        ">
          <span className="text-sm text-red-700 flex-1">{error}</span>
          <button onClick={retry} className="text-xs font-semibold text-red-600 hover:text-red-800 shrink-0">
            Reintentar
          </button>
        </div>
      )}
    </div>
  )
}
