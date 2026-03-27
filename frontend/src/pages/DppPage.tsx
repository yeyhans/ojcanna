// frontend/src/pages/DppPage.tsx
// Página de análisis de la Defensoría Penal Pública (Ley 20.000)
import { useState, useEffect } from 'react'
import { InfoModal } from '../components/InfoModal'
import {
  PieChart, Pie, Cell, Tooltip, Legend as RLegend, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  BarChart, Bar,
} from 'recharts'
import {
  useDppFiltros,
  useDppResumen,
  useDppSerie,
  useDppRegiones,
} from '../hooks/useDppAnalytics'
import { useIsMobile } from '../hooks/useIsMobile'

// Color palette for pie chart
const PIE_COLORS = ['#dc2626', '#2563eb', '#7c3aed', '#d97706', '#059669', '#64748b']

const FORMA_SHORT: Record<string, string> = {
  'Absolución':               'Absolución',
  'Condena':                  'Condena',
  'Derivación':               'Derivación',
  'Facultativos de Fiscalía': 'Facultativos',
  'Otras formas de término':  'Otras',
  'Salida Alternativa':       'Salida Alt.',
}

function KpiCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 sm:p-5">
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
      <p className="mt-1 text-2xl sm:text-3xl font-bold text-slate-900">{value}</p>
      {sub && <p className="mt-1 text-xs text-slate-400">{sub}</p>}
    </div>
  )
}

function LoadingCard({ title }: { title: string }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 animate-pulse">
      <p className="text-sm font-semibold text-slate-400">{title}</p>
      <div className="mt-4 h-48 bg-slate-100 rounded-xl" />
    </div>
  )
}

function fmt(n: number) {
  return n.toLocaleString('es-CL')
}

interface FormaTermino {
  nombre: string
  n_causas: number
  porcentaje: number
}

function TablaFormas({ formas, anio }: { formas: FormaTermino[]; anio: number | null }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="px-4 sm:px-5 py-4 border-b border-slate-100">
        <h2 className="text-sm font-semibold text-slate-700">Detalle por forma de término — {anio}</h2>
        <p className="text-xs text-slate-400 mt-0.5">Causas Ley N° 20.000 gestionadas por la Defensoría</p>
      </div>

      {/* Card list para mobile */}
      <div className="sm:hidden divide-y divide-slate-100">
        {formas.map((f, i) => (
          <div key={f.nombre} className="flex items-center justify-between px-4 py-3 hover:bg-slate-50/70">
            <div className="flex items-center gap-2 min-w-0">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ background: PIE_COLORS[i % PIE_COLORS.length] }}
              />
              <span className="text-sm font-medium text-slate-800 truncate">{f.nombre}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0 ml-2">
              <span className="text-sm font-mono text-slate-700">{fmt(f.n_causas)}</span>
              <span className="inline-block bg-slate-100 text-slate-600 text-xs font-semibold rounded-full px-2 py-0.5">
                {f.porcentaje}%
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Tabla para desktop */}
      <table className="hidden sm:table w-full text-sm">
        <thead className="bg-slate-50 text-xs font-medium text-slate-500 uppercase tracking-wide">
          <tr>
            <th className="px-5 py-3 text-left">Forma de término</th>
            <th className="px-5 py-3 text-right">N° causas</th>
            <th className="px-5 py-3 text-right">% del total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {formas.map((f, i) => (
            <tr key={f.nombre} className="hover:bg-slate-50/70 transition-colors">
              <td className="px-5 py-3 font-medium text-slate-800">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ background: PIE_COLORS[i % PIE_COLORS.length] }}
                  />
                  {f.nombre}
                </div>
              </td>
              <td className="px-5 py-3 text-right font-mono text-slate-700">{fmt(f.n_causas)}</td>
              <td className="px-5 py-3 text-right">
                <span className="inline-block bg-slate-100 text-slate-600 text-xs font-semibold rounded-full px-2 py-0.5">
                  {f.porcentaje}%
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function DppPage() {
  const isMobile = useIsMobile()
  const { data: filtros } = useDppFiltros()
  const [anio, setAnio] = useState<number | null>(null)
  const [infoOpen, setInfoOpen] = useState(false)

  useEffect(() => {
    if (filtros?.anios?.length && anio === null) {
      setAnio(Math.max(...filtros.anios))
    }
  }, [filtros, anio])

  const { data: resumen, isLoading: resumenLoading } = useDppResumen(anio)
  const { data: serie, isLoading: serieLoading } = useDppSerie()
  const { data: regiones, isLoading: regionesLoading } = useDppRegiones(anio)

  const pieData = resumen?.formas_termino.map((f, i) => ({
    name: FORMA_SHORT[f.nombre] ?? f.nombre,
    fullName: f.nombre,
    value: f.n_causas,
    porcentaje: f.porcentaje,
    fill: PIE_COLORS[i % PIE_COLORS.length],
  })) ?? []

  // YAxis width para barras regionales — menor en mobile
  const yAxisWidth = isMobile ? 110 : 180

  // Row height para barras regionales
  const rowHeight = isMobile ? 28 : 32

  return (
    <div className="min-h-full bg-slate-50 pb-12">
      <InfoModal open={infoOpen} onClose={() => setInfoOpen(false)} source="dpp" />

      {/* Page header */}
      <div className="bg-white border-b border-slate-100 px-4 sm:px-6 py-4 sm:py-6">
        <div className="max-w-6xl xl:max-w-7xl mx-auto flex flex-col md:flex-row md:items-end md:justify-between gap-3 sm:gap-4">
          <div>
            <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-1">
              Defensoría Penal Pública · SIGDP
            </p>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
              Causas Ley de Drogas (Ley N° 20.000)
            </h1>
            <p className="mt-1 text-sm text-slate-500 max-w-xl line-clamp-2 sm:line-clamp-none">
              Ingresos y términos de causas penales de drogas gestionadas por la Defensoría Penal Pública.
              Datos nacionales — granularidad regional disponible para distribución de imputados.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {filtros?.anios && (
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-slate-600">Año:</label>
                <select
                  value={anio ?? ''}
                  onChange={e => setAnio(Number(e.target.value))}
                  className="text-sm font-semibold text-slate-900 border border-slate-200 rounded-lg px-3 py-2 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {filtros.anios.map(a => (
                    <option key={a} value={a}>{a}</option>
                  ))}
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

        {/* KPI cards */}
        {resumenLoading || !resumen ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {[1,2,3].map(i => <div key={i} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 animate-pulse h-24" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            <KpiCard
              label="Ingresos Ley de Drogas"
              value={fmt(resumen.total_ingresos)}
              sub={`Causas ingresadas a la Defensoría — ${anio}`}
            />
            <KpiCard
              label="Términos"
              value={fmt(resumen.total_terminos)}
              sub="Causas con resolución final"
            />
            <KpiCard
              label="Ratio términos/ingresos"
              value={`${(resumen.ratio_terminos * 100).toFixed(1)}%`}
              sub="Causas resueltas respecto a ingresadas"
            />
          </div>
        )}

        {/* Formas de término + Serie temporal */}
        <div className="grid md:grid-cols-2 gap-4 sm:gap-6">

          {/* Pie chart formas de término */}
          {resumenLoading || !resumen
            ? <LoadingCard title="Formas de término" />
            : (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 sm:p-5">
                <h2 className="text-sm font-semibold text-slate-700 mb-1">Formas de término</h2>
                <p className="text-xs text-slate-400 mb-3 sm:mb-4">
                  Cómo se resolvieron las causas Ley 20.000 — {anio}
                </p>
                <ResponsiveContainer width="100%" height={isMobile ? 220 : 260}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={isMobile ? 45 : 60}
                      outerRadius={isMobile ? 80 : 100}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {pieData.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value, _name, props) => [
                        `${fmt(Number(value))} causas (${(props.payload as { porcentaje?: number })?.porcentaje ?? 0}%)`,
                        (props.payload as { fullName?: string })?.fullName ?? '',
                      ]}
                    />
                    <RLegend
                      iconType="circle"
                      iconSize={8}
                      wrapperStyle={{ fontSize: 11 }}
                      formatter={(v) => <span className="text-xs text-slate-600">{v}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>

                {resumen.formas_termino.find(f => f.nombre === 'Condena') && (
                  <p className="mt-3 text-xs text-slate-500 border-t border-slate-100 pt-3">
                    <span className="font-semibold text-slate-700">
                      {resumen.formas_termino.find(f => f.nombre === 'Condena')?.porcentaje}%
                    </span>
                    {' '}de las causas resueltas terminaron en condena.
                    {resumen.formas_termino.find(f => f.nombre === 'Salida Alternativa') && (
                      <> Las salidas alternativas representan el{' '}
                        <span className="font-semibold text-slate-700">
                          {resumen.formas_termino.find(f => f.nombre === 'Salida Alternativa')?.porcentaje}%
                        </span>.
                      </>
                    )}
                  </p>
                )}
              </div>
            )
          }

          {/* Line chart serie temporal */}
          {serieLoading || !serie
            ? <LoadingCard title="Serie temporal" />
            : (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 sm:p-5">
                <h2 className="text-sm font-semibold text-slate-700 mb-1">Tendencia 2020–{Math.max(...serie.map(d => d.anio))}</h2>
                <p className="text-xs text-slate-400 mb-3 sm:mb-4">Ingresos y términos nacionales de causas Ley de Drogas</p>
                <ResponsiveContainer width="100%" height={isMobile ? 200 : 260}>
                  <LineChart data={serie} margin={{ top: 5, right: 10, left: isMobile ? -10 : 0, bottom: 5 }}>
                    {!isMobile && <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />}
                    <XAxis dataKey="anio" tick={{ fontSize: isMobile ? 10 : 12, fill: '#64748b' }} />
                    <YAxis
                      tick={{ fontSize: isMobile ? 10 : 12, fill: '#64748b' }}
                      tickFormatter={v => `${(v/1000).toFixed(0)}k`}
                      width={isMobile ? 36 : 45}
                    />
                    <Tooltip formatter={(v) => fmt(Number(v))} labelFormatter={l => `Año ${l}`} />
                    <RLegend
                      iconType="circle"
                      iconSize={8}
                      wrapperStyle={{ fontSize: 11 }}
                      formatter={v => <span className="text-xs text-slate-600">{v}</span>}
                    />
                    <Line
                      type="monotone"
                      dataKey="ingresos"
                      stroke="#2563eb"
                      strokeWidth={2.5}
                      dot={{ r: isMobile ? 3 : 4 }}
                      name="Ingresos"
                    />
                    <Line
                      type="monotone"
                      dataKey="terminos"
                      stroke="#7c3aed"
                      strokeWidth={2.5}
                      dot={{ r: isMobile ? 3 : 4 }}
                      name="Términos"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )
          }
        </div>

        {/* Regional distribution — horizontal bar */}
        {regionesLoading || !regiones
          ? <LoadingCard title="Distribución regional de imputados" />
          : regiones.length === 0 ? null : (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 sm:p-5">
              <h2 className="text-sm font-semibold text-slate-700 mb-1">Distribución regional de imputados</h2>
              <p className="text-xs text-slate-400 mb-1">
                Total imputados ingresados al sistema judicial por región — {anio}
              </p>
              <p className="text-xs text-amber-600 mb-3 sm:mb-4">
                Nota: corresponde al total de imputados por todos los delitos, no exclusivamente Ley 20.000 (los Excel DPP no desglosan drogas por región).
              </p>
              <div className="overflow-x-auto">
                <ResponsiveContainer width="100%" height={regiones.length * rowHeight + 20} minWidth={280}>
                  <BarChart
                    data={[...regiones].sort((a, b) => a.n_ingresos - b.n_ingresos)}
                    layout="vertical"
                    margin={{ top: 0, right: isMobile ? 40 : 60, left: 4, bottom: 0 }}
                  >
                    {!isMobile && <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />}
                    <XAxis
                      type="number"
                      tick={{ fontSize: isMobile ? 10 : 11, fill: '#64748b' }}
                      tickFormatter={v => `${(v/1000).toFixed(0)}k`}
                    />
                    <YAxis
                      type="category"
                      dataKey="region_nombre"
                      tick={{ fontSize: isMobile ? 9 : 11, fill: '#475569' }}
                      width={yAxisWidth}
                      tickFormatter={v => isMobile && v.length > 14 ? v.slice(0, 13) + '…' : v}
                    />
                    <Tooltip formatter={(v) => fmt(Number(v))} labelFormatter={l => String(l)} />
                    <Bar dataKey="n_ingresos" fill="#2563eb" radius={[0, 4, 4, 0]} name="Imputados" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )
        }

        {/* Tabla detalle formas de término */}
        {resumen && resumen.formas_termino.length > 0 && (
          <TablaFormas formas={resumen.formas_termino} anio={anio} />
        )}

        {/* Footer / source note */}
        <p className="text-xs text-slate-400 pb-4">
          Fuente: Defensoría Penal Pública, Sistema Informático de Gestión de la Defensa Pública (SIGDP).
          Datos descargados de <span className="font-medium">dpp.cl/estadísticas</span>.
          Cobertura: 2020–2024 · Granularidad: Nacional / Regional (imputados totales).
        </p>
      </div>
    </div>
  )
}
