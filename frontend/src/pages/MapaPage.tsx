// frontend/src/pages/MapaPage.tsx
// Página del mapa coropleta CEAD — extrae la lógica de App.tsx
import { useState } from 'react'
import { MapaCEAD } from '../components/MapaCEAD'
import { FilterPanel } from '../components/FilterPanel'
import { Legend } from '../components/Legend'
import { InfoModal } from '../components/InfoModal'
import { TaxonomyBanner } from '../components/TaxonomyBanner'
import { useCeadMapa } from '../hooks/useCeadMapa'

export default function MapaPage() {
  const [anio, setAnio] = useState<number | null>(null)
  const [subgrupos, setSubgrupos] = useState<string[] | null>(null)
  const [infoOpen, setInfoOpen] = useState(false)
  const [filterExpanded, setFilterExpanded] = useState(false)

  const { geojson, colorExpression, legendBreaks, isLoading, error, retry } =
    useCeadMapa(anio, subgrupos ?? [])

  return (
    <div className="relative w-full h-full overflow-hidden bg-[var(--paper-deep)]">
      <MapaCEAD
        geojson={geojson}
        colorExpression={colorExpression}
        isLoading={isLoading}
      />

      <FilterPanel
        onChange={(a, s) => { setAnio(a); setSubgrupos(s) }}
        onExpandedChange={setFilterExpanded}
        geojson={geojson}
      />

      {legendBreaks.length > 0 && <Legend breaks={legendBreaks} hidden={filterExpanded} />}

      {/* Top-right chips: taxonomy + info */}
      <div className="absolute top-6 right-6 z-20 flex items-center gap-3">
        <TaxonomyBanner anio={anio} />
        <button
          onClick={() => setInfoOpen(true)}
          aria-label="Información sobre los datos"
          className="w-10 h-10 flex items-center justify-center rounded-full bg-[var(--paper-deep)]/80 backdrop-blur-xl border border-[var(--card-border)] shadow-2xl text-[var(--ink)] hover:bg-[var(--ink)] hover:text-[var(--paper-deep)] transition-all font-cal text-lg"
        >
          i
        </button>
      </div>

      <InfoModal open={infoOpen} onClose={() => setInfoOpen(false)} />

      {error && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 bg-[var(--paper-elev)] text-[var(--ink)] border border-[var(--card-border)] shadow-2xl px-6 py-4 flex items-center gap-6 rounded-sm">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--dim-soft)]">Error de Red</span>
            <span className="text-sm font-cal">{error}</span>
          </div>
          <button
            onClick={retry}
            className="chip border-[var(--ink)] bg-[var(--ink)] text-[var(--paper)] hover:opacity-80"
          >
            Reintentar
          </button>
        </div>
      )}
    </div>
  )
}
