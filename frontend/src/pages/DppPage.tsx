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

// Color palette inspired by deep tech but with semantic clarity
const PIE_COLORS = ['#f8f8f6', '#b0b0b0', '#5a5a5a', '#2a2a2a', '#d1d5db', '#9ca3af']

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
    <div className="bg-[#1a1a1a] rounded border border-[#2a2a2a] p-6 relative overflow-hidden group">
      <div className="absolute inset-0 dot-grid-light opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
      <p className="text-label-deep text-[#b0b0b0] mb-2">{label}</p>
      <p className="text-3xl font-cal text-[#f8f8f6] mb-1">{value}</p>
      {sub && <p className="text-[10px] text-[#5a5a5a] uppercase tracking-wider">{sub}</p>}
    </div>
  )
}

function LoadingCard({ title: _title }: { title: string }) {
  return (
    <div className="bg-[#1a1a1a] rounded border border-[#2a2a2a] p-6 animate-pulse">
      <div className="h-2 w-24 bg-[#2a2a2a] mb-4" />
      <div className="h-8 w-32 bg-[#2a2a2a] mb-4" />
      <div className="mt-4 h-48 bg-slate-50 rounded" />
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
    <div className="bg-[#1a1a1a] rounded border border-[#2a2a2a] overflow-hidden">
      <div className="px-6 py-4 border-b border-[#2a2a2a] bg-slate-50/50">
        <h2 className="text-label-deep text-[#f8f8f6]">Detalle de Términos — {anio}</h2>
      </div>

      <div className="sm:hidden divide-y divide-[#2a2a2a]">
        {formas.map((f, i) => (
          <div key={f.nombre} className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-3">
              <span className="w-2 h-2 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
              <span className="text-xs font-semibold text-[#f8f8f6] uppercase tracking-wider">{f.nombre}</span>
            </div>
            <div className="text-right">
              <span className="text-sm font-cal text-[#f8f8f6]">{fmt(f.n_causas)}</span>
              <span className="ml-2 text-[10px] text-[#b0b0b0]">{f.porcentaje}%</span>
            </div>
          </div>
        ))}
      </div>

      <table className="hidden sm:table w-full text-xs">
        <thead className="bg-slate-50/50 text-label-deep text-[#b0b0b0]">
          <tr>
            <th className="px-6 py-4 text-left font-medium">Forma de término</th>
            <th className="px-6 py-4 text-right font-medium">N° causas</th>
            <th className="px-6 py-4 text-right font-medium">% del total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#2a2a2a]">
          {formas.map((f, i) => (
            <tr key={f.nombre} className="hover:bg-slate-50/30 transition-colors">
              <td className="px-6 py-4 text-[#f8f8f6]">
                <div className="flex items-center gap-3">
                  <span className="w-2 h-2 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                  {f.nombre}
                </div>
              </td>
              <td className="px-6 py-4 text-right font-cal text-[#f8f8f6] text-sm">{fmt(f.n_causas)}</td>
              <td className="px-6 py-4 text-right">
                <span className="chip border-[#2a2a2a] text-[#b0b0b0]">{f.porcentaje}%</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function DppPage() {
  const { data: filtros } = useDppFiltros()
  const [anio, setAnio] = useState<number | null>(null)
  const [infoOpen, setInfoOpen] = useState(false)

  useEffect(() => {
    if (filtros?.anios?.length && anio === null) {
      setAnio(Math.max(...filtros.anios))
    }
  }, [filtros, anio])

  const { data: resumen, isLoading: resumenLoading } = useDppResumen(anio)
  const { data: serie } = useDppSerie()
  const { data: regiones } = useDppRegiones(anio)

  const pieData = resumen?.formas_termino.map((f, i) => ({
    name: FORMA_SHORT[f.nombre] ?? f.nombre,
    fullName: f.nombre,
    value: f.n_causas,
    porcentaje: f.porcentaje,
    fill: PIE_COLORS[i % PIE_COLORS.length],
  })) ?? []

  return (
    <div className="min-h-full bg-[#0a0a0a] pb-24 relative">
      <div className="absolute inset-0 dot-grid-light pointer-events-none opacity-40"></div>
      
      <InfoModal open={infoOpen} onClose={() => setInfoOpen(false)} source="dpp" />

      {/* Hero Header */}
      <div className="relative px-6 py-16 sm:py-24 border-b border-[#2a2a2a]">
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div className="max-w-3xl">
              <span className="chip bg-[#f8f8f6] text-[#0a0a0a] border-[#f8f8f6] mb-6">
                DPP · Análisis Estadístico
              </span>
              <h1 className="text-h1-deep text-[#f8f8f6] mb-6">
                Observatorio Judicial <br /> <span className="text-[#5a5a5a]">Ley de Drogas Chile</span>
              </h1>
              <p className="text-body-deep text-[#b0b0b0] max-w-2xl">
                Visualización avanzada de causas penales gestionadas por la Defensoría Penal Pública. 
                Monitoreo del punitivismo y cumplimiento de derechos en el sistema judicial.
              </p>
            </div>

            <div className="flex items-center gap-4 bg-[#1a1a1a] p-4 rounded border border-[#2a2a2a] shadow-sm">
              <label className="text-label-deep text-[#b0b0b0]">Filtrar Año</label>
              <select
                value={anio ?? ''}
                onChange={e => setAnio(Number(e.target.value))}
                className="font-cal text-sm border-none focus:ring-0 bg-transparent"
              >
                {filtros?.anios?.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 mt-12 space-y-12 relative z-10">
        
        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {resumenLoading ? [1,2,3].map(i => <LoadingCard key={i} title="..." />) : (
            <>
              <KpiCard label="Ingresos Totales" value={fmt(resumen?.total_ingresos ?? 0)} sub={`Defensas iniciadas en ${anio}`} />
              <KpiCard label="Causas Terminadas" value={fmt(resumen?.total_terminos ?? 0)} sub="Resoluciones dictadas" />
              <KpiCard label="Eficacia de Gestión" value={`${((resumen?.ratio_terminos ?? 0) * 100).toFixed(1)}%`} sub="Relación términos/ingresos" />
            </>
          )}
        </div>

        {/* Charts Section */}
        <div className="grid lg:grid-cols-2 gap-12">
          
          {/* Pie Chart */}
          <div className="bg-[#1a1a1a] rounded border border-[#2a2a2a] p-8">
            <h3 className="text-label-deep text-[#f8f8f6] mb-8">Composición de Términos</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={110}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} stroke="transparent" />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '4px', fontSize: '10px' }}
                  itemStyle={{ color: '#f8f8f6' }}
                />
                <RLegend layout="vertical" align="right" verticalAlign="middle" iconType="circle" wrapperStyle={{ fontSize: '10px', textTransform: 'uppercase' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Line Chart */}
          <div className="bg-[#1a1a1a] rounded border border-[#2a2a2a] p-8">
            <h3 className="text-label-deep text-[#f8f8f6] mb-8">Evolución Histórica</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={serie ?? []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#2a2a2a" />
                <XAxis dataKey="anio" tick={{ fontSize: 10, fill: '#b0b0b0' }} axisLine={false} tickLine={false} dy={10} />
                <YAxis tick={{ fontSize: 10, fill: '#b0b0b0' }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '4px', fontSize: '10px' }} itemStyle={{ color: '#f8f8f6' }} />
                <Line type="monotone" dataKey="ingresos" stroke="#f8f8f6" strokeWidth={3} dot={{ r: 4, fill: '#f8f8f6' }} name="Ingresos" />
                <Line type="monotone" dataKey="terminos" stroke="#5a5a5a" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 4, fill: '#5a5a5a' }} name="Términos" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Region Bar Chart */}
        <div className="bg-[#1a1a1a] rounded p-8 sm:p-12 border border-[#2a2a2a] text-[#f8f8f6] overflow-hidden relative group">
          <div className="absolute inset-0 dot-grid-dark opacity-20"></div>
          <div className="relative z-10">
            <h3 className="text-label-deep text-[#f8f8f6] mb-8">Distribución Regional de Imputados (Total Sistema)</h3>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={[...(regiones ?? [])].sort((a,b) => b.n_ingresos - a.n_ingresos)} layout="vertical" margin={{ left: 40 }}>
                <XAxis type="number" hide />
                <YAxis dataKey="region_nombre" type="category" tick={{ fontSize: 9, fill: '#b0b0b0' }} axisLine={false} tickLine={false} width={120} />
                <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a', color: '#f8f8f6', borderRadius: '4px', fontSize: '10px' }} itemStyle={{ color: '#f8f8f6' }} />
                <Bar dataKey="n_ingresos" fill="#f8f8f6" radius={[0, 2, 2, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Detailed Table */}
        <TablaFormas formas={resumen?.formas_termino ?? []} anio={anio} />

        <footer className="pt-12 border-t border-[#2a2a2a]">
          <p className="text-[9px] uppercase tracking-[0.2em] text-[#5a5a5a]">
            Fuente: Defensoría Penal Pública (SIGDP) · Observatorio Judicial Anonimous Canna 2026
          </p>
        </footer>
      </div>
    </div>
  )
}
