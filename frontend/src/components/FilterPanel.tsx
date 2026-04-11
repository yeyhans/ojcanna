// frontend/src/components/FilterPanel.tsx
import { useEffect, useRef, useState } from 'react'
import { motion, useMotionValue } from 'framer-motion'
import { SubgrupoCheckbox } from './SubgrupoCheckbox'
import { useIsMobile } from '../hooks/useIsMobile'
import { useAppData } from '../providers/AppDataProvider'

const SNAP_COLLAPSED = 64
const getSnapHalf = () => window.innerHeight * 0.4
const getSnapFull = () => window.innerHeight * 0.85

interface FilterPanelProps {
  onChange: (anio: number, subgrupos: string[]) => void
  onExpandedChange?: (expanded: boolean) => void
}

export function FilterPanel({ onChange, onExpandedChange }: FilterPanelProps) {
  const isMobile = useIsMobile()
  // Filtros vienen del AppDataProvider — ya está cacheado y listo después del splash.
  // No re-fetcheamos aquí (antes hacía un fetch duplicado en el camino crítico).
  const { filtros } = useAppData()
  const [anio, setAnio] = useState<number>(2024)
  const [subgruposSeleccionados, setSubgruposSeleccionados] = useState<string[]>([])
  const [sheetHeight, setSheetHeight] = useState(SNAP_COLLAPSED)
  const dragY = useMotionValue(0)
  const initializedRef = useRef(false)

  // Notifica al padre cuando el sheet está expandido (half o full)
  // para que componentes como Legend puedan ocultarse y no tapar los filtros.
  useEffect(() => {
    if (!onExpandedChange) return
    onExpandedChange(isMobile && sheetHeight > SNAP_COLLAPSED + 10)
  }, [sheetHeight, isMobile, onExpandedChange])

  // Inicialización one-shot cuando filtros está disponible
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
      Math.abs(curr - y) < Math.abs(prev - y) ? curr : prev
    )
    setSheetHeight(closest)
    dragY.set(0)
  }

  const panelContent = (
    <div className="flex flex-col gap-6 h-full overflow-y-auto pr-2 custom-scrollbar">
      <div>
        <label className="text-label-deep text-[#b0b0b0] mb-2 block font-bold">Temporada de Análisis</label>
        <select
          value={anio}
          onChange={(e) => handleAnioChange(Number(e.target.value))}
          className="w-full text-xs font-cal border border-[#2a2a2a] rounded px-3 py-2 bg-[#1a1a1a]/50 focus:ring-1 focus:ring-[#f8f8f6] transition-all outline-none"
        >
          {filtros?.anios.slice().reverse().map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-label-deep text-[#b0b0b0] mb-4 block font-bold">Infracciones Ley 20.000</label>
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

      <p className="text-[9px] uppercase tracking-widest text-[#5a5a5a] mt-auto pt-8 border-t border-[#2a2a2a]">
        Fuente: CEAD / Ministerio del Interior Chile
      </p>
    </div>
  )

  if (!isMobile) {
    return (
      <aside className="absolute left-6 top-6 bottom-6 z-20 w-80 bg-[#0a0a0a]/80 backdrop-blur-xl border border-[#2a2a2a] shadow-2xl rounded-sm p-6 flex flex-col">
        <div className="mb-8">
           <div className="w-10 h-1 bg-[#f8f8f6] mb-4"></div>
           <h2 className="text-h2-deep text-[#f8f8f6] leading-tight font-cal">
             Fuerza Policial <br /> <span className="text-[#5a5a5a]">Territorial</span>
           </h2>
        </div>
        {panelContent}
      </aside>
    )
  }

  return (
    <motion.div
      className="absolute bottom-0 left-0 right-0 z-20 bg-[#0a0a0a]/95 backdrop-blur-xl border-t border-[#2a2a2a] shadow-2xl px-6 pt-4 rounded-t-xl overflow-hidden"
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
        <div className="w-12 h-1 rounded-full bg-[#f8f8f6]/10" />
      </div>
      {sheetHeight > SNAP_COLLAPSED + 10 ? (
        <>
          <h2 className="text-label-deep text-[#f8f8f6] mb-6">Parámetros de Visualización</h2>
          {panelContent}
        </>
      ) : (
        <div className="flex justify-center">
           <p className="text-[10px] uppercase tracking-widest font-bold text-[#b0b0b0]">
            {subgruposSeleccionados.length} Delitos · {anio}
           </p>
        </div>
      )}
    </motion.div>
  )
}
