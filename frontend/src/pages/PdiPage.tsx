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

const SHORT_CAT: Record<string, string> = {
  'Crímenes y simples delitos contenidos en la ley Nº 20.000': 'Ley N° 20.000',
  'Consumo de alcohol y de drogas en la vía pública.':          'Consumo en vía pública',
}

function fmt(n: number) {
  return n.toLocaleString('es-CL')
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

  const { data: resumen } = usePdiResumen(anio)
  const { data: regiones } = usePdiRegiones(anio, selectedCat, selectedSub)

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

  const rowHeight = isMobile ? 32 : 44

  return (
    <div className="min-h-full bg-[#0a0a0a] pb-24 relative">
      <div className="absolute inset-0 dot-grid-light pointer-events-none opacity-40"></div>
      <InfoModal open={infoOpen} onClose={() => setInfoOpen(false)} source="pdi" />

      {/* Hero Header */}
      <div className="relative px-6 py-16 sm:py-24 border-b border-[#2a2a2a]">
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div className="max-w-3xl">
              <span className="chip bg-[#f8f8f6] text-[#0a0a0a] border-[#f8f8f6] mb-6">
                PDI · Inteligencia Institucional
              </span>
              <h1 className="text-h1-deep text-[#f8f8f6] mb-6">
                Investigaciones y <br /> <span className="text-[#5a5a5a]">Carga Judicial PDI</span>
              </h1>
              <p className="text-body-deep text-[#b0b0b0] max-w-2xl">
                Análisis de la actividad investigativa y reportes de la Policía de Investigaciones. 
                Monitoreo de denuncias y víctimas bajo estricta metodología de datos gubernamentales.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4 bg-[#1a1a1a] p-4 rounded border border-[#2a2a2a] shadow-sm">
              <div className="flex items-center gap-4 mr-4">
                <label className="text-label-deep text-[#b0b0b0]">AÑO</label>
                <select
                  value={anio ?? ''}
                  onChange={e => setAnio(Number(e.target.value))}
                  className="font-cal text-sm border-none focus:ring-0 bg-transparent"
                >
                  {filtros?.anios?.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
              <button
                onClick={() => setInfoOpen(true)}
                className="chip border-[#2a2a2a] text-[#f8f8f6] hover:bg-[#f8f8f6] hover:text-[#0a0a0a] transition-all"
              >
                INFO FUENTE
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 mt-12 space-y-12 relative z-10">

        {/* Categories Bar Chart */}
        <div className="grid lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2 bg-[#1a1a1a] rounded border border-[#2a2a2a] p-8">
            <h3 className="text-label-deep text-[#f8f8f6] mb-8">Volumen Nacional por Categoría</h3>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={categoryTotals} margin={{ bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#2a2a2a" />
                <XAxis 
                  dataKey="categoria" 
                  tick={{ fontSize: 9, fill: '#b0b0b0', fontWeight: 600 }} 
                  axisLine={false} 
                  tickLine={false} 
                  interval={0}
                />
                <YAxis hide />
                <Tooltip 
                  cursor={{ fill: '#2a2a2a' }}
                  contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '4px', fontSize: '10px' }}
                  itemStyle={{ color: '#f8f8f6' }}
                />
                <Bar dataKey="total" radius={[2, 2, 0, 0]} barSize={40}>
                  {categoryTotals.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === 0 ? '#f8f8f6' : '#5a5a5a'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-6">
            <h3 className="text-label-deep text-[#f8f8f6]">Resumen Métricas</h3>
            {subBreakdown.map(s => (
              <div key={s.subcategoria} className="bg-[#1a1a1a] border border-[#2a2a2a] p-6 rounded group hover:border-[#f8f8f6] transition-all">
                <p className="text-[10px] text-[#5a5a5a] uppercase tracking-widest mb-2 font-bold">{s.label}</p>
                <p className="text-3xl font-cal text-[#f8f8f6]">{fmt(Math.round(s.total))}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Regional Dark Section */}
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded p-8 sm:p-12 text-[#f8f8f6] overflow-hidden relative group">
          <div className="absolute inset-0 dot-grid-dark opacity-10"></div>
          <div className="relative z-10">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-8 mb-12">
              <div>
                <h3 className="text-label-deep text-[#f8f8f6] mb-2 uppercase tracking-widest">Distribución Regional de Impacto</h3>
                <p className="text-[10px] text-[#b0b0b0] uppercase tracking-widest font-bold">Selección detallada por territorio y tipo</p>
              </div>
              
              <div className="flex flex-wrap gap-4">
                <select
                  value={selectedCat ?? ''}
                  onChange={e => setSelectedCat(e.target.value)}
                  className="text-[10px] font-bold tracking-[0.1em] bg-[#1a1a1a] text-[#f8f8f6] border-none rounded px-4 py-2 uppercase outline-none"
                >
                  {filtros?.categorias?.map(c => (
                    <option key={c} value={c}>{SHORT_CAT[c] ?? c}</option>
                  ))}
                </select>

                <div className="flex gap-1">
                  {(['delitos', 'denuncias', 'victimas'] as const).map(s => (
                    <button
                      key={s}
                      onClick={() => setSelectedSub(s)}
                      className={`text-[9px] font-bold px-4 py-2 rounded uppercase tracking-widest transition-all ${
                        selectedSub === s ? 'bg-[#1a1a1a] text-[#f8f8f6]' : 'bg-[#1a1a1a] text-[#b0b0b0] hover:text-white'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <ResponsiveContainer width="100%" height={regiones?.length ? regiones.length * rowHeight + 40 : 400}>
              <BarChart
                data={[...(regiones ?? [])].sort((a, b) => a.frecuencia - b.frecuencia)}
                layout="vertical"
                margin={{ right: 40, left: 10 }}
              >
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="region_nombre"
                  tick={{ fontSize: 9, fill: '#b0b0b0', fontWeight: 700 }}
                  axisLine={false}
                  tickLine={false}
                  width={isMobile ? 100 : 160}
                />
                <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a', color: '#f8f8f6', borderRadius: '4px', fontSize: '10px' }} itemStyle={{ color: '#f8f8f6' }} />
                <Bar
                  dataKey="frecuencia"
                  fill="#f8f8f6"
                  radius={[0, 2, 2, 0]}
                  barSize={16}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <footer className="pt-12 border-t border-[#2a2a2a]">
          <p className="text-[9px] uppercase tracking-[0.2em] text-[#5a5a5a]">
            Fuente: PDI · Registro Administrativo BRAIN · datos.gob.cl
          </p>
        </footer>
      </div>
    </div>
  )
}
