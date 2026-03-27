// frontend/src/components/EmbudoView.tsx
// Vista dedicada del Embudo del Punitivismo con tabla de ranking y buscador de comunas.
import { useState } from 'react'
import { useEmbudoRanking } from '../hooks/useEmbudo'


interface Props {
  anio: number
  onClose: () => void
}

export function EmbudoView({ anio, onClose }: Props) {
  const { items, isLoading, error } = useEmbudoRanking(anio)
  const [search, setSearch] = useState('')

  const filtered = items.filter((it) =>
    it.nombre.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div
      className="
        absolute inset-4 z-40
        bg-white/95 backdrop-blur-md
        rounded-2xl shadow-2xl
        border border-white/30
        flex flex-col
        overflow-hidden
      "
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
        <div>
          <h2 className="text-lg font-bold text-slate-800">
            Embudo del Punitivismo — {anio}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Ratio causas en Defensoría / detenciones policiales por comuna
          </p>
        </div>
        <button
          onClick={onClose}
          aria-label="Cerrar vista embudo"
          className="
            w-8 h-8 flex items-center justify-center
            rounded-full bg-slate-100 hover:bg-slate-200
            text-slate-500 text-xl leading-none transition-colors
          "
        >
          ×
        </button>
      </div>

      {/* Buscador */}
      <div className="px-6 py-3 border-b border-slate-100">
        <input
          type="search"
          placeholder="Buscar comuna..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="
            w-full max-w-sm rounded-lg border border-slate-200
            px-3 py-2 text-sm text-slate-800
            focus:outline-none focus:ring-2 focus:ring-blue-400
          "
        />
      </div>

      {/* Tabla */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <p className="text-sm text-red-500 text-center mt-8">
            {error}
            <br />
            <span className="text-slate-400 text-xs">
              Asegúrate de ejecutar el ETL de DPP y PDI para ver el ranking.
            </span>
          </p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-slate-400 text-center mt-8">
            Sin resultados para "{search}".
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-slate-500 uppercase tracking-wider border-b border-slate-100">
                <th className="text-left py-2 pr-4 font-semibold">Comuna</th>
                <th className="text-right py-2 px-3 font-semibold">Detenciones</th>
                <th className="text-right py-2 px-3 font-semibold">Causas DPP</th>
                <th className="text-right py-2 pl-3 font-semibold">Ratio</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map((item, i) => (
                <tr key={item.comuna_id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-2 pr-4">
                    <span className="text-slate-400 text-xs mr-2 tabular-nums">{i + 1}</span>
                    <span className="font-medium text-slate-800">{item.nombre}</span>
                  </td>
                  <td className="text-right py-2 px-3 text-slate-600 tabular-nums">
                    {Math.round(item.detenciones).toLocaleString('es-CL')}
                  </td>
                  <td className="text-right py-2 px-3 text-violet-600 font-medium tabular-nums">
                    {item.causas_defensor > 0
                      ? Math.round(item.causas_defensor).toLocaleString('es-CL')
                      : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="text-right py-2 pl-3">
                    <RatioBadge ratio={item.ratio} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Footer */}
      <div className="px-6 py-3 border-t border-slate-100">
        <p className="text-xs text-slate-400">
          Fuentes: CEAD (detenciones Ley 20.000) · DPP SIGDP (causas regionales distribuidas por comuna) ·{' '}
          {items.length} comunas con datos · Datos PDI y Fiscalía pendientes
        </p>
      </div>
    </div>
  )
}

function RatioBadge({ ratio }: { ratio: number }) {
  const pct = Math.round(ratio * 100)
  const color =
    pct > 80 ? 'bg-red-100 text-red-700' :
    pct > 50 ? 'bg-amber-100 text-amber-700' :
    pct > 20 ? 'bg-blue-100 text-blue-700' :
               'bg-slate-100 text-slate-500'

  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${color}`}>
      {pct}%
    </span>
  )
}
