// frontend/src/components/FilterPanel.tsx
import { useEffect, useRef, useState } from 'react'
import { motion, useMotionValue } from 'framer-motion'
import { SubgrupoCheckbox } from './SubgrupoCheckbox'
import { useIsMobile } from '../hooks/useIsMobile'
import { useAppData } from '../providers/AppDataProvider'
import { ComunaRanking } from './ComunaRanking'
import type { CeadFeatureCollection } from '../types/cead'

const SNAP_COLLAPSED = 64
const getSnapHalf = () => window.innerHeight * 0.4
const getSnapFull = () => window.innerHeight * 0.85

interface FilterPanelProps {
  onChange: (anio: number, subgrupos: string[]) => void
  onExpandedChange?: (expanded: boolean) => void
  geojson?: CeadFeatureCollection | null
  onComunaSelect?: (cut: string, nombre: string) => void
}

export function FilterPanel({
  onChange,
  onExpandedChange,
  geojson,
  onComunaSelect,
}: FilterPanelProps) {
  const isMobile = useIsMobile()
  const { filtros } = useAppData()
  const [anio, setAnio] = useState<number>(2024)
  const [subgruposSeleccionados, setSubgruposSeleccionados] = useState<string[]>([])
  const [sheetHeight, setSheetHeight] = useState(SNAP_COLLAPSED)
  const dragY = useMotionValue(0)
  const initializedRef = useRef(false)

  useEffect(() => {
    if (!onExpandedChange) return
    onExpandedChange(isMobile && sheetHeight > SNAP_COLLAPSED + 10)
  }, [sheetHeight, isMobile, onExpandedChange])

  useEffect(() => {
    if (initializedRef.current || !filtros) return
    initializedRef.current = true
    const latestAnio = Math.max(...filtros.anios)
    const allIds = filtros.subgrupos.map((s) => s.id)
    setAnio(latestAnio)
    setSubgruposSeleccionados(allIds)
    onChange(latestAnio, allIds)
  }, [filtros, onChange])

  const handleAnioChange = (newAnio: number) => {
    setAnio(newAnio)
    onChange(newAnio, subgruposSeleccionados)
  }

  const handleSubgrupoChange = (id: string, checked: boolean) => {
    const updated = checked
      ? [...subgruposSeleccionados, id]
      : subgruposSeleccionados.filter((s) => s !== id)
    if (updated.length === 0) return
    setSubgruposSeleccionados(updated)
    onChange(anio, updated)
  }

  const snapToNearest = (y: number) => {
    const snaps = [SNAP_COLLAPSED, getSnapHalf(), getSnapFull()]
    const closest = snaps.reduce((prev, curr) =>
      Math.abs(curr - y) < Math.abs(prev - y) ? curr : prev,
    )
    setSheetHeight(closest)
    dragY.set(0)
  }

  const filterControls = (
    <div className="flex flex-col gap-6">
      <div>
        <label className="text-label-deep mb-2 block">Temporada de Análisis</label>
        <select
          value={anio}
          onChange={(e) => handleAnioChange(Number(e.target.value))}
          className="w-full text-xs font-cal border border-[var(--card-border)] rounded px-3 py-2 bg-[var(--paper-elev)] text-[var(--ink)] focus:ring-1 focus:ring-[var(--ink)] transition-all outline-none"
        >
          {filtros?.anios.slice().reverse().map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-label-deep mb-4 block">Infracciones Ley 20.000</label>
        <div className="flex flex-col gap-1">
          {filtros?.subgrupos.map((s) => (
            <SubgrupoCheckbox
              key={s.id}
              id={s.id}
              nombre={s.nombre}
              checked={subgruposSeleccionados.includes(s.id)}
              onChange={handleSubgrupoChange}
            />
          ))}
        </div>
      </div>
    </div>
  )

  if (!isMobile) {
    return (
      <aside className="absolute left-6 top-6 bottom-6 z-20 w-80 bg-[var(--paper-deep)]/80 backdrop-blur-xl border border-[var(--card-border)] shadow-2xl rounded-sm p-6 flex flex-col overflow-hidden">
        <div className="mb-8 shrink-0">
          <div className="w-10 h-1 bg-[var(--ink)] mb-4" />
          <h2 className="text-h2-deep text-[var(--ink)] leading-tight">
            Fuerza Policial <br /> <span className="text-[var(--dim)]">Territorial</span>
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar flex flex-col gap-8">
          {filterControls}

          {geojson && (
            <div className="pt-2 border-t border-[var(--card-border)]">
              <ComunaRanking geojson={geojson} top={20} onSelect={onComunaSelect} />
            </div>
          )}

          <p className="text-[9px] uppercase tracking-widest text-[var(--dim-soft)] pt-8 border-t border-[var(--card-border)]">
            Fuente: CEAD / Ministerio del Interior Chile
          </p>
        </div>
      </aside>
    )
  }

  return (
    <motion.div
      className="absolute bottom-0 left-0 right-0 z-20 bg-[var(--paper-deep)]/95 backdrop-blur-xl border-t border-[var(--card-border)] shadow-2xl px-6 pt-4 rounded-t-xl overflow-hidden"
      style={{ height: sheetHeight }}
      drag="y"
      dragConstraints={{ top: 0, bottom: 0 }}
      onDragEnd={(_, info) => {
        const newHeight = sheetHeight - info.offset.y
        snapToNearest(Math.max(SNAP_COLLAPSED, Math.min(getSnapFull(), newHeight)))
      }}
      animate={{ height: sheetHeight }}
    >
      <div className="flex justify-center mb-6">
        <div className="w-12 h-1 rounded-full bg-[var(--ink)]/20" />
      </div>
      {sheetHeight > SNAP_COLLAPSED + 10 ? (
        <div className="overflow-y-auto h-full pb-6">
          <h2 className="text-label-deep mb-6">Parámetros de Visualización</h2>
          {filterControls}
          {geojson && (
            <div className="mt-8 pt-6 border-t border-[var(--card-border)]">
              <ComunaRanking geojson={geojson} top={15} onSelect={onComunaSelect} />
            </div>
          )}
        </div>
      ) : (
        <div className="flex justify-center">
          <p className="text-[10px] uppercase tracking-widest font-bold text-[var(--dim)]">
            {subgruposSeleccionados.length} Delitos · {anio}
          </p>
        </div>
      )}
    </motion.div>
  )
}
