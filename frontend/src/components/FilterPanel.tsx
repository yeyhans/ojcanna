// frontend/src/components/FilterPanel.tsx
import { useEffect, useState } from 'react'
import { motion, useMotionValue } from 'framer-motion'
import type { FiltrosResponse, SubgrupoItem } from '../types/cead'
import { SubgrupoCheckbox } from './SubgrupoCheckbox'
import { useIsMobile } from '../hooks/useIsMobile'

interface Props {
  onChange: (anio: number, subgrupos: string[]) => void
}

const SNAP_COLLAPSED = 64
const getSnapHalf = () => window.innerHeight * 0.4
const getSnapFull = () => window.innerHeight * 0.85

export function FilterPanel({ onChange }: Props) {
  const isMobile = useIsMobile()
  const [filtros, setFiltros] = useState<FiltrosResponse | null>(null)
  const [anio, setAnio] = useState<number>(2024)
  const [subgruposSeleccionados, setSubgruposSeleccionados] = useState<string[]>([])
  const [sheetHeight, setSheetHeight] = useState(SNAP_COLLAPSED)
  const dragY = useMotionValue(0)

  useEffect(() => {
    fetch('/api/v1/cead/filtros')
      .then((r) => r.json() as Promise<FiltrosResponse>)
      .then((data) => {
        setFiltros(data)
        const latestAnio = Math.max(...data.anios)
        setAnio(latestAnio)
        const allIds = data.subgrupos.map((s: SubgrupoItem) => s.id)
        setSubgruposSeleccionados(allIds)
        onChange(latestAnio, allIds)
      })
      .catch(console.error)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

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
    <div className="flex flex-col gap-5 h-full overflow-y-auto">
      <div>
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
          Año
        </label>
        <select
          value={anio}
          onChange={(e) => handleAnioChange(Number(e.target.value))}
          className="
            w-full rounded-lg border border-slate-200
            bg-white/80 px-3 py-2 text-sm text-slate-800
            focus:outline-none focus:ring-2 focus:ring-blue-400
          "
        >
          {filtros?.anios.slice().reverse().map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
          Delitos
        </label>
        <div className="flex flex-col gap-2.5">
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

      <p className="text-xs text-slate-400 mt-auto pb-2">
        Fuente: CEAD / Subsecretaría de Prevención del Delito
      </p>
    </div>
  )

  if (!isMobile) {
    return (
      <aside
        className="
          absolute left-4 top-4 bottom-4 z-20
          w-72 rounded-2xl
          bg-white/60 backdrop-blur-md
          border border-white/30
          shadow-xl shadow-slate-200/50
          p-5 flex flex-col
        "
      >
        <h2 className="text-base font-bold text-slate-800 mb-5 leading-tight">
          Persecución policial<br />
          <span className="text-blue-600">por ley de drogas</span>
        </h2>
        {panelContent}
      </aside>
    )
  }

  return (
    <motion.div
      className="
        absolute bottom-0 left-0 right-0 z-20
        rounded-t-2xl
        bg-white/80 backdrop-blur-md
        border-t border-white/30
        shadow-2xl shadow-slate-300/50
        px-5 pt-3
        overflow-hidden
      "
      style={{
        height: sheetHeight,
        paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))',
      }}
      drag="y"
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={0.1}
      onDragEnd={(_, info) => {
        const newHeight = sheetHeight - info.offset.y
        snapToNearest(Math.max(SNAP_COLLAPSED, Math.min(getSnapFull(), newHeight)))
      }}
      animate={{ height: sheetHeight }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
    >
      {/* Handle */}
      <div className="flex justify-center mb-3">
        <div className="w-10 h-1 rounded-full bg-slate-300" />
      </div>

      {sheetHeight > SNAP_COLLAPSED + 10 && (
        <>
          <h2 className="text-sm font-bold text-slate-800 mb-4">
            Persecución policial — ley de drogas
          </h2>
          {panelContent}
        </>
      )}

      {sheetHeight <= SNAP_COLLAPSED + 10 && (
        <p className="text-xs text-slate-500 text-center">
          {subgruposSeleccionados.length} delitos · {anio}
        </p>
      )}
    </motion.div>
  )
}
