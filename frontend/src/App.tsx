// frontend/src/App.tsx
import { useState } from 'react'
import { MapaCEAD } from './components/MapaCEAD'
import { FilterPanel } from './components/FilterPanel'
import { Legend } from './components/Legend'
import { InfoModal } from './components/InfoModal'
import { useCeadMapa } from './hooks/useCeadMapa'

export default function App() {
  const [anio, setAnio] = useState(2024)
  const [subgrupos, setSubgrupos] = useState<string[]>([
    '40101', '40102', '40103', '40104', '70201', '70202', '70204',
  ])
  const [infoOpen, setInfoOpen] = useState(false)

  const { geojson, colorExpression, legendBreaks, isLoading, error, retry } =
    useCeadMapa(anio, subgrupos)

  const handleFilterChange = (newAnio: number, newSubgrupos: string[]) => {
    setAnio(newAnio)
    setSubgrupos(newSubgrupos)
  }

  return (
    <div className="relative w-full h-[100dvh] bg-slate-50 overflow-hidden">
      {/* Mapa full-viewport */}
      <MapaCEAD
        geojson={geojson}
        colorExpression={colorExpression}
        isLoading={isLoading}
      />

      {/* Panel de filtros */}
      <FilterPanel onChange={handleFilterChange} />

      {/* Leyenda */}
      {legendBreaks.length > 0 && (
        <Legend breaks={legendBreaks} />
      )}

      {/* Botón de info */}
      <button
        onClick={() => setInfoOpen(true)}
        aria-label="Información sobre los datos"
        className="
          absolute top-4 right-4 z-20
          w-8 h-8 flex items-center justify-center
          rounded-full
          bg-white/70 backdrop-blur-md
          border border-white/40
          shadow-md shadow-slate-200/60
          text-slate-500 hover:text-slate-800
          text-sm font-semibold
          transition-colors
        "
      >
        i
      </button>

      {/* Modal informativo */}
      <InfoModal open={infoOpen} onClose={() => setInfoOpen(false)} />

      {/* Error toast */}
      {error && (
        <div
          className="
            absolute top-4 left-1/2 -translate-x-1/2 z-30
            bg-red-50 border border-red-200
            rounded-xl shadow-lg
            px-4 py-3 flex items-center gap-3
            max-w-sm
          "
        >
          <span className="text-sm text-red-700 flex-1">{error}</span>
          <button
            onClick={retry}
            className="text-xs font-semibold text-red-600 hover:text-red-800 shrink-0"
          >
            Reintentar
          </button>
        </div>
      )}
    </div>
  )
}
