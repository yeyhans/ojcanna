// frontend/src/pages/EmbudoPage.tsx
// Página del Embudo del Punitivismo — análisis cross-source
import { useState, useEffect } from 'react'
import { InfoModal } from '../components/InfoModal'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend as RLegend, ResponsiveContainer,
} from 'recharts'
import { useEmbudoRanking } from '../hooks/useEmbudo'
import { useDppFiltros } from '../hooks/useDppAnalytics'
import { useIsMobile } from '../hooks/useIsMobile'

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

interface EmbudoItem {
  comuna_id: string
  nombre: string
  region_id: string
  detenciones: number
  causas_defensor: number
  ratio: number
}

function TablaRanking({
  items,
  search,
  onSearch,
}: {
  items: EmbudoItem[]
  search: string
  onSearch: (v: string) => void
}) {
  const isMobile = useIsMobile()
  const fmt = (n: number) => n.toLocaleString('es-CL')

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="px-4 sm:px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-700">Ranking comunas — ratio causas/detenciones</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {items.length > 0 ? `${items.length} comunas con detenciones Ley 20.000 — ` : ''}
            Ordenadas por mayor ratio
          </p>
        </div>
        <input
          type="search"
          placeholder="Buscar comuna..."
          value={search}
          onChange={e => onSearch(e.target.value)}
          className="w-full sm:w-52 text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-400"
        />
      </div>

      {isMobile ? (
        /* Card list para mobile */
        <div className="divide-y divide-slate-100">
          {items.map((item, i) => (
            <div key={item.comuna_id} className="px-4 py-3 hover:bg-slate-50/70 transition-colors">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-slate-400 tabular-nums">{i + 1}.</span>
                    <span className="text-sm font-semibold text-slate-800 truncate">{item.nombre}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{item.region_id}</p>
                </div>
                <RatioBadge ratio={item.ratio} />
              </div>
              <div className="mt-2 grid grid-cols-2 gap-x-4 text-xs">
                <div>
                  <span className="text-slate-500">Detenciones: </span>
                  <span className="font-mono text-slate-700">{fmt(Math.round(item.detenciones))}</span>
                </div>
                <div>
                  <span className="text-slate-500">Causas DPP: </span>
                  {item.causas_defensor > 0
                    ? <span className="font-mono text-violet-600 font-medium">{fmt(Math.round(item.causas_defensor))}</span>
                    : <span className="text-slate-300">—</span>
                  }
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Tabla para desktop */
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs font-medium text-slate-500 uppercase tracking-wide">
              <tr>
                <th className="px-5 py-3 text-left">#</th>
                <th className="px-5 py-3 text-left">Comuna</th>
                <th className="px-5 py-3 text-left">Región</th>
                <th className="px-4 py-3 text-right">Detenciones CEAD</th>
                <th className="px-4 py-3 text-right">Causas DPP</th>
                <th className="px-4 py-3 text-right">Ratio</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item, i) => (
                <tr key={item.comuna_id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-5 py-2.5 text-slate-400 tabular-nums text-xs">{i + 1}</td>
                  <td className="px-5 py-2.5 font-medium text-slate-800">{item.nombre}</td>
                  <td className="px-5 py-2.5 text-slate-500 text-xs">{item.region_id}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-slate-600">
                    {fmt(Math.round(item.detenciones))}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-violet-600 font-medium">
                    {item.causas_defensor > 0
                      ? fmt(Math.round(item.causas_defensor))
                      : <span className="text-slate-300">—</span>
                    }
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <RatioBadge ratio={item.ratio} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="px-4 sm:px-6 py-3 border-t border-slate-100">
        <p className="text-xs text-slate-400">
          Fuentes: CEAD (SPD — Subsecretaría de Prevención del Delito) · DPP SIGDP.
          Ratio = causas_DPP / detenciones_CEAD. Valores &gt;100% pueden ocurrir cuando la distribución regional genera más causas que detenciones locales.
        </p>
      </div>
    </div>
  )
}

export default function EmbudoPage() {
  const isMobile = useIsMobile()
  const { data: filtros } = useDppFiltros()
  const [anio, setAnio] = useState<number | null>(null)
  const [search, setSearch] = useState('')
  const [infoOpen, setInfoOpen] = useState(false)

  useEffect(() => {
    if (filtros?.anios?.length && anio === null) {
      setAnio(Math.max(...filtros.anios))
    }
  }, [filtros, anio])

  const { items, isLoading, error } = useEmbudoRanking(anio ?? 0)

  const filtered = items.filter(it =>
    it.nombre.toLowerCase().includes(search.toLowerCase())
  )

  const chartData = [...items]
    .filter(it => it.detenciones > 0)
    .sort((a, b) => b.detenciones - a.detenciones)
    .slice(0, isMobile ? 10 : 20)
    .map(it => ({
      nombre: it.nombre.length > 14 ? it.nombre.slice(0, 13) + '…' : it.nombre,
      fullNombre: it.nombre,
      detenciones: Math.round(it.detenciones),
      causas_defensor: Math.round(it.causas_defensor),
    }))

  const fmt = (n: number) => n.toLocaleString('es-CL')

  return (
    <div className="min-h-full bg-slate-50 pb-12">
      <InfoModal open={infoOpen} onClose={() => setInfoOpen(false)} source="embudo" />

      {/* Page header */}
      <div className="bg-white border-b border-slate-100 px-4 sm:px-6 py-4 sm:py-6">
        <div className="max-w-6xl xl:max-w-7xl mx-auto flex flex-col md:flex-row md:items-end md:justify-between gap-3 sm:gap-4">
          <div>
            <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-1">
              Análisis Cruzado · CEAD + DPP
            </p>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Embudo del Punitivismo</h1>
            <p className="mt-1 text-sm text-slate-500 max-w-xl line-clamp-2 sm:line-clamp-none">
              Compara detenciones policiales (CEAD) con causas ingresadas a la Defensoría Penal Pública (DPP)
              para estimar qué fracción de los detenidos recibe representación legal por Ley N° 20.000.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {filtros?.anios && (
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-slate-600">Año:</label>
                <select
                  value={anio ?? ''}
                  onChange={e => setAnio(Number(e.target.value))}
                  className="text-sm font-semibold text-slate-900 border border-slate-200 rounded-lg px-3 py-2 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {filtros.anios.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
            )}
            <button
              onClick={() => setInfoOpen(true)}
              title="Sobre los datos"
              className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 text-sm font-bold transition-colors"
            >
              i
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl xl:max-w-7xl mx-auto px-4 sm:px-6 mt-4 sm:mt-6 space-y-4 sm:space-y-6">

        {/* Methodological note */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 sm:px-5 py-4 text-sm text-amber-800">
          <p className="font-semibold mb-1">Nota metodológica</p>
          <p className="text-sm leading-relaxed">
            Los datos CEAD son comunales (por punto exacto de detención). Los datos DPP son regionales
            (la Defensoría no registra la comuna de origen del imputado). Para calcular el ratio por
            comuna, se distribuyen las causas DPP regionales proporcionalmente según el peso de
            detenciones de cada comuna dentro de su región.
            <span className="font-medium"> El ratio no es una tasa de condena</span> — es un indicador
            de cuántas personas detenidas acceden a representación de la Defensoría.
          </p>
        </div>

        {/* Stacked bar chart */}
        {isLoading
          ? <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 h-80 animate-pulse" />
          : chartData.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 sm:p-5">
              <h2 className="text-sm font-semibold text-slate-700 mb-1">
                Top {isMobile ? 10 : 20} comunas por detenciones Ley 20.000 — {anio}
              </h2>
              <p className="text-xs text-slate-400 mb-3 sm:mb-4">
                Detenciones policiales vs causas ingresadas a la Defensoría (barras apiladas)
              </p>
              <ResponsiveContainer width="100%" height={isMobile ? 280 : 380}>
                <BarChart
                  data={chartData}
                  margin={{ top: 5, right: 10, left: isMobile ? -10 : 0, bottom: isMobile ? 45 : 60 }}
                >
                  {!isMobile && <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />}
                  <XAxis
                    dataKey="nombre"
                    tick={{ fontSize: isMobile ? 9 : 11, fill: '#475569' }}
                    angle={-35}
                    textAnchor="end"
                    interval={0}
                  />
                  <YAxis
                    tick={{ fontSize: isMobile ? 10 : 11, fill: '#64748b' }}
                    tickFormatter={v => `${(v/1000).toFixed(0)}k`}
                    width={isMobile ? 36 : 45}
                  />
                  <Tooltip
                    formatter={(v, name) => [fmt(Number(v)), name === 'detenciones' ? 'Detenciones CEAD' : 'Causas DPP']}
                    labelFormatter={(l, payload) => ((payload as unknown) as Array<{ payload?: { fullNombre?: string } }>)?.[0]?.payload?.fullNombre ?? String(l)}
                  />
                  <RLegend
                    iconType="square"
                    wrapperStyle={{ fontSize: 11 }}
                    formatter={v => <span className="text-xs text-slate-600">{v === 'detenciones' ? 'Detenciones CEAD' : 'Causas DPP'}</span>}
                  />
                  <Bar dataKey="detenciones" fill="#3b82f6" name="detenciones" stackId="a" />
                  <Bar dataKey="causas_defensor" fill="#8b5cf6" name="causas_defensor" stackId="b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )
        }

        {/* Ranking table */}
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-6 py-8 text-center">
            <p className="text-sm text-red-500">{error}</p>
            <p className="text-xs text-slate-400 mt-1">Asegúrate de ejecutar el ETL de DPP para ver el ranking.</p>
          </div>
        ) : filtered.length === 0 && search ? (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-6 py-8 text-center">
            <p className="text-sm text-slate-400">Sin resultados para "{search}".</p>
          </div>
        ) : (
          <TablaRanking items={filtered} search={search} onSearch={setSearch} />
        )}

      </div>
    </div>
  )
}
