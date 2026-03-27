// frontend/src/pages/PdiPage.tsx
// Página de análisis PDI (Policía de Investigaciones) — datos.gob.cl
import { useState, useEffect } from 'react'
import { InfoModal } from '../components/InfoModal'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts'
import { usePdiFiltros, usePdiResumen, usePdiRegiones } from '../hooks/usePdiAnalytics'
import { useIsMobile } from '../hooks/useIsMobile'

const SUBCATEGORIA_LABELS: Record<string, string> = {
  delitos:   'Delitos investigados',
  denuncias: 'Denuncias recibidas',
  victimas:  'Víctimas registradas',
}

const SUBCAT_COLORS: Record<string, string> = {
  delitos:   '#2563eb',
  denuncias: '#7c3aed',
  victimas:  '#dc2626',
}

const SHORT_CAT: Record<string, string> = {
  'Crímenes y simples delitos contenidos en la ley Nº 20.000': 'Ley N° 20.000',
  'Consumo de alcohol y de drogas en la vía pública.':          'Consumo en vía pública',
}

function fmt(n: number) {
  return n.toLocaleString('es-CL')
}

function LoadingCard({ title }: { title: string }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 animate-pulse">
      <p className="text-sm font-semibold text-slate-400">{title}</p>
      <div className="mt-4 h-48 bg-slate-100 rounded-xl" />
    </div>
  )
}

export default function PdiPage() {
  const isMobile = useIsMobile()
  const { data: filtros } = usePdiFiltros()
  const [anio, setAnio] = useState<number | null>(null)
  const [selectedCat, setSelectedCat] = useState<string | null>(null)
  const [selectedSub, setSelectedSub] = useState('delitos')
  const [infoOpen, setInfoOpen] = useState(false)

  useEffect(() => {
    if (filtros?.anios?.length && anio === null) {
      setAnio(Math.max(...filtros.anios))
    }
    if (filtros?.categorias?.length && selectedCat === null) {
      const mainCat = filtros.categorias.find(c => c.includes('20.000')) ?? filtros.categorias[0]
      setSelectedCat(mainCat)
    }
  }, [filtros, anio, selectedCat])

  const { data: resumen, isLoading: resumenLoading } = usePdiResumen(anio)
  const { data: regiones, isLoading: regionesLoading } = usePdiRegiones(anio, selectedCat, selectedSub)

  const categoryTotals = resumen
    ? Array.from(
        resumen.reduce((acc, item) => {
          const key = SHORT_CAT[item.categoria] ?? item.categoria
          acc.set(key, (acc.get(key) ?? 0) + item.total_nacional)
          return acc
        }, new Map<string, number>())
      ).map(([categoria, total]) => ({ categoria, total }))
        .sort((a, b) => b.total - a.total)
    : []

  const subBreakdown = resumen
    ?.filter(r => selectedCat && r.categoria.includes(selectedCat.substring(0, 20)))
    .map(r => ({
      subcategoria: r.subcategoria,
      total: r.total_nacional,
      label: SUBCATEGORIA_LABELS[r.subcategoria] ?? r.subcategoria,
    }))
    ?? []

  const yAxisWidth = isMobile ? 110 : 190
  const rowHeight = isMobile ? 28 : 36

  return (
    <div className="min-h-full bg-slate-50 pb-12">
      <InfoModal open={infoOpen} onClose={() => setInfoOpen(false)} source="pdi" />

      {/* Page header */}
      <div className="bg-white border-b border-slate-100 px-4 sm:px-6 py-4 sm:py-6">
        <div className="max-w-6xl xl:max-w-7xl mx-auto flex flex-col md:flex-row md:items-end md:justify-between gap-3 sm:gap-4">
          <div>
            <p className="text-xs font-semibold text-purple-600 uppercase tracking-wider mb-1">
              Policía de Investigaciones · datos.gob.cl
            </p>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
              Investigaciones y Denuncias por Drogas
            </h1>
            <p className="mt-1 text-sm text-slate-500 max-w-xl line-clamp-2 sm:line-clamp-none">
              Estadísticas PDI de delitos investigados, denuncias recibidas y víctimas registradas
              bajo la Ley N° 20.000 y normas relacionadas. Granularidad regional — año 2024.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {filtros?.anios && (
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-slate-600">Año:</label>
                <select
                  value={anio ?? ''}
                  onChange={e => setAnio(Number(e.target.value))}
                  className="text-sm font-semibold text-slate-900 border border-slate-200 rounded-lg px-3 py-2 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
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

        {/* National breakdown by category */}
        {resumenLoading
          ? <LoadingCard title="Resumen nacional por categoría" />
          : categoryTotals.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 sm:p-5">
              <h2 className="text-sm font-semibold text-slate-700 mb-1">Total nacional por categoría — {anio}</h2>
              <p className="text-xs text-slate-400 mb-3 sm:mb-4">
                Suma de delitos investigados + denuncias + víctimas registradas por categoría delictual
              </p>
              <ResponsiveContainer width="100%" height={isMobile ? 160 : 200}>
                <BarChart
                  data={categoryTotals}
                  margin={{ top: 0, right: 10, left: isMobile ? -10 : 0, bottom: isMobile ? 30 : 40 }}
                >
                  {!isMobile && <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />}
                  <XAxis
                    dataKey="categoria"
                    tick={{ fontSize: isMobile ? 10 : 11, fill: '#475569' }}
                    angle={-20}
                    textAnchor="end"
                    interval={0}
                  />
                  <YAxis
                    tick={{ fontSize: isMobile ? 10 : 11, fill: '#64748b' }}
                    tickFormatter={v => `${(v/1000).toFixed(1)}k`}
                    width={isMobile ? 36 : 45}
                  />
                  <Tooltip formatter={(v) => fmt(Number(v))} />
                  <Bar dataKey="total" radius={[4, 4, 0, 0]} name="Total casos">
                    {categoryTotals.map((_, i) => (
                      <Cell key={i} fill={i === 0 ? '#7c3aed' : '#94a3b8'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )
        }

        {/* Filters + regional view */}
        {filtros?.categorias && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 sm:p-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-3">Distribución regional detallada</h2>

            <div className="flex flex-col sm:flex-row flex-wrap gap-3 mb-4 sm:mb-5">
              {/* Category selector */}
              <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-slate-600 shrink-0">Categoría:</label>
                <select
                  value={selectedCat ?? ''}
                  onChange={e => setSelectedCat(e.target.value)}
                  className="flex-1 sm:flex-none text-sm text-slate-900 border border-slate-200 rounded-lg px-3 py-2 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  {filtros.categorias.map(c => (
                    <option key={c} value={c}>{SHORT_CAT[c] ?? c}</option>
                  ))}
                </select>
              </div>

              {/* Subcategory toggle */}
              <div className="flex gap-1 flex-wrap">
                {(['delitos', 'denuncias', 'victimas'] as const).map(s => (
                  <button
                    key={s}
                    onClick={() => setSelectedSub(s)}
                    className={[
                      'text-xs font-semibold px-3 min-h-[44px] sm:min-h-[36px] rounded-lg transition-colors',
                      selectedSub === s
                        ? 'text-white shadow-sm'
                        : 'text-slate-600 bg-slate-100 hover:bg-slate-200',
                    ].join(' ')}
                    style={selectedSub === s ? { background: SUBCAT_COLORS[s] } : {}}
                  >
                    {SUBCATEGORIA_LABELS[s]}
                  </button>
                ))}
              </div>
            </div>

            {/* Regional bar chart */}
            {regionesLoading
              ? <div className="h-80 bg-slate-100 rounded-xl animate-pulse" />
              : !regiones || regiones.length === 0
                ? (
                  <div className="py-8 text-center text-sm text-slate-400">
                    Sin datos para la selección actual.
                  </div>
                )
                : (
                  <>
                    <div className="overflow-x-auto">
                      <ResponsiveContainer width="100%" height={regiones.length * rowHeight + 20} minWidth={280}>
                        <BarChart
                          data={[...regiones].sort((a, b) => a.frecuencia - b.frecuencia)}
                          layout="vertical"
                          margin={{ top: 0, right: isMobile ? 40 : 60, left: 4, bottom: 0 }}
                        >
                          {!isMobile && <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />}
                          <XAxis
                            type="number"
                            tick={{ fontSize: isMobile ? 10 : 11, fill: '#64748b' }}
                          />
                          <YAxis
                            type="category"
                            dataKey="region_nombre"
                            tick={{ fontSize: isMobile ? 9 : 11, fill: '#475569' }}
                            width={yAxisWidth}
                            tickFormatter={v => isMobile && v.length > 14 ? v.slice(0, 13) + '…' : v}
                          />
                          <Tooltip formatter={(v) => fmt(Number(v))} />
                          <Bar
                            dataKey="frecuencia"
                            fill={SUBCAT_COLORS[selectedSub] ?? '#7c3aed'}
                            radius={[0, 4, 4, 0]}
                            name={SUBCATEGORIA_LABELS[selectedSub]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Sub breakdown */}
                    {subBreakdown.length > 0 && (
                      <div className="mt-4 sm:mt-5 border-t border-slate-100 pt-4">
                        <p className="text-xs font-medium text-slate-500 mb-2">
                          Total nacional por tipo de registro — {SHORT_CAT[selectedCat ?? ''] ?? selectedCat}
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
                          {subBreakdown.map(s => (
                            <div key={s.subcategoria} className="bg-slate-50 rounded-xl px-4 py-3 border border-slate-100">
                              <p className="text-xs text-slate-500">{s.label}</p>
                              <p className="text-xl sm:text-lg font-bold text-slate-900 mt-0.5">{fmt(Math.round(s.total))}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )
            }
          </div>
        )}

        {/* Source note */}
        <p className="text-xs text-slate-400 pb-4">
          Fuente: Policía de Investigaciones de Chile (PDI) — Base Relacional para Análisis e Información (BRAIN).
          Datos publicados en <span className="font-medium">datos.gob.cl</span>.
          Cobertura: 2024 · Granularidad: Regional (16 regiones).
        </p>
      </div>
    </div>
  )
}
