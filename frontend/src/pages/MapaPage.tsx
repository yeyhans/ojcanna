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
    <div className="relative w-full h-full overflow-hidden bg-[#0a0a0a]">
      <MapaCEAD
        geojson={geojson}
        colorExpression={colorExpression}
        isLoading={isLoading}
        onComunaSelect={(cut, nombre) => setSelectedComuna({ cut, nombre })}
      />

      <FilterPanel onChange={(a, s) => { setAnio(a); setSubgrupos(s) }} />

      {legendBreaks.length > 0 && <Legend breaks={legendBreaks} />}

      {/* Info button */}
      <div className="absolute top-6 right-6 z-20">
        <button
          onClick={() => setInfoOpen(true)}
          aria-label="Información sobre los datos"
          className="w-10 h-10 flex items-center justify-center rounded-full bg-[#0a0a0a]/80 backdrop-blur-xl border border-[#2a2a2a] shadow-2xl text-[#f8f8f6] hover:bg-[#f8f8f6] hover:text-[#0a0a0a] transition-all font-cal text-lg"
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
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 bg-[#f8f8f6] text-[#0a0a0a] border border-[#f8f8f6] shadow-2xl px-6 py-4 flex items-center gap-6 rounded-sm">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#5a5a5a]">Error de Red</span>
            <span className="text-sm font-cal">{error}</span>
          </div>
          <button onClick={retry} className="chip bg-[#0a0a0a] text-[#f8f8f6] border-[#0a0a0a] hover:bg-[#1a1a1a]">
            Reintentar
          </button>
        </div>
      )}
    </div>
  )
}
