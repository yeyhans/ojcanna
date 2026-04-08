// frontend/src/pages/EmbudoPage.tsx
// Página del Embudo del Punitivismo — análisis cross-source
import { useState, useEffect } from 'react'
import { InfoModal } from '../components/InfoModal'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer
} from 'recharts'
import { useEmbudoRanking } from '../hooks/useEmbudo'
import { useDppFiltros } from '../hooks/useDppAnalytics'
import { useIsMobile } from '../hooks/useIsMobile'

// PIE_COLORS unused
function RatioBadge({ ratio }: { ratio: number }) {
  const pct = Math.round(ratio * 100)
  return (
    <span className="chip border-[#2a2a2a] text-[#f8f8f6] font-cal">
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
  const fmt = (n: number) => n.toLocaleString('es-CL')

  return (
    <div className="bg-[#1a1a1a] rounded border border-[#2a2a2a] overflow-hidden">
      <div className="px-6 py-6 border-b border-[#2a2a2a] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 bg-slate-50/30">
        <div>
          <h2 className="text-label-deep text-[#f8f8f6]">Ranking Territorial por Ratio</h2>
          <p className="text-[10px] text-[#5a5a5a] uppercase tracking-wider mt-1">
            {items.length} COMUNAS IDENTIFICADAS · ORDEN POR PUNITIVISMO
          </p>
        </div>
        <div className="relative">
          <input
            type="search"
            placeholder="BUSCAR COMUNA..."
            value={search}
            onChange={e => onSearch(e.target.value)}
            className="w-full sm:w-64 text-[10px] font-bold tracking-[0.1em] border border-[#2a2a2a] rounded px-4 py-2 focus:ring-1 focus:ring-[#f8f8f6] focus:border-[#f8f8f6] outline-none bg-[#1a1a1a] uppercase"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-slate-50/50 text-label-deep text-[#b0b0b0]">
            <tr>
              <th className="px-6 py-4 text-left font-medium">#</th>
              <th className="px-6 py-4 text-left font-medium">Comuna</th>
              <th className="px-6 py-4 text-left font-medium">Región</th>
              <th className="px-4 py-4 text-right font-medium">Detenciones</th>
              <th className="px-4 py-4 text-right font-medium">Causas DPP</th>
              <th className="px-6 py-4 text-right font-medium">Ratio</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#2a2a2a]">
            {items.map((item, i) => (
              <tr key={item.comuna_id} className="hover:bg-slate-50/30 transition-colors group">
                <td className="px-6 py-4 text-[#5a5a5a] font-cal">{i + 1}</td>
                <td className="px-6 py-4 font-cal text-[#f8f8f6] text-sm group-hover:underline cursor-default">{item.nombre}</td>
                <td className="px-6 py-4 text-[#b0b0b0] text-[10px] uppercase tracking-wider font-bold">{item.region_id}</td>
                <td className="px-4 py-4 text-right font-cal text-[#f8f8f6]">{fmt(Math.round(item.detenciones))}</td>
                <td className="px-4 py-4 text-right font-cal text-[#b0b0b0]">
                  {item.causas_defensor > 0 ? fmt(Math.round(item.causas_defensor)) : '—'}
                </td>
                <td className="px-6 py-4 text-right">
                  <RatioBadge ratio={item.ratio} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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

  const { items, error } = useEmbudoRanking(anio ?? 0)

  const filtered = items.filter(it =>
    it.nombre.toLowerCase().includes(search.toLowerCase())
  )

  const chartData = [...items]
    .filter(it => it.detenciones > 0)
    .sort((a, b) => b.detenciones - a.detenciones)
    .slice(0, isMobile ? 10 : 20)
    .map(it => ({
      nombre: it.nombre,
      detenciones: Math.round(it.detenciones),
      causas_defensor: Math.round(it.causas_defensor),
    }))



  return (
    <div className="min-h-full bg-[#0a0a0a] pb-24 relative">
      <div className="absolute inset-0 dot-grid-light pointer-events-none opacity-40"></div>
      <InfoModal open={infoOpen} onClose={() => setInfoOpen(false)} source="embudo" />

      {/* Hero Header */}
      <div className="relative px-6 py-16 sm:py-24 border-b border-[#2a2a2a]">
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div className="max-w-3xl">
              <span className="chip bg-[#f8f8f6] text-[#0a0a0a] border-[#f8f8f6] mb-6">
                DPP + CEAD · Embudo Analítico
              </span>
              <h1 className="text-h1-deep text-[#f8f8f6] mb-6">
                Embudo del <br /> <span className="text-[#5a5a5a]">Punitivismo</span>
              </h1>
              <p className="text-body-deep text-[#b0b0b0] max-w-2xl">
                Correlación entre detenciones policiales y acceso a representación legal. 
                Un análisis crítico de la brecha de justicia en procedimientos de drogas.
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
                DATOS & METODOLOGÍA
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 mt-12 space-y-12 relative z-10">
        
        {/* Methodological Box */}
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] p-8 rounded relative overflow-hidden group">
          <div className="absolute inset-0 dot-grid-light opacity-30"></div>
          <div className="relative z-10">
            <h4 className="font-cal text-sm uppercase tracking-widest text-[#f8f8f6] mb-4">Nota de Extracción</h4>
            <p className="text-sm text-[#b0b0b0] leading-relaxed max-w-4xl">
              Los datos <span className="text-[#f8f8f6] font-bold">CEAD</span> capturan el punto geográfico de detención, mientras que los registros de <span className="text-[#f8f8f6] font-bold">DPP</span> se agregan por jurisdicción regional. El ratio proyectado estima la cobertura legal efectiva frente a la actividad policial territorial en el marco de la <span className="italic">Ley N° 20.000</span>.
            </p>
          </div>
        </div>

        {/* Chart View */}
        <div className="bg-[#1a1a1a] rounded border border-[#2a2a2a] p-8 sm:p-12">
          <div className="flex justify-between items-start mb-12">
            <div>
              <h3 className="text-label-deep text-[#f8f8f6]">Fuerza Policial vs Defensa Pública</h3>
              <p className="text-[10px] text-[#5a5a5a] uppercase tracking-widest mt-2">Top 20 comunas con mayor volumen de detenciones</p>
            </div>
            <div className="flex gap-4">
               <div className="flex items-center gap-2">
                 <div className="w-3 h-3 rounded-full bg-[#f8f8f6]"></div>
                 <span className="text-[9px] font-bold uppercase tracking-widest text-[#b0b0b0]">Detenciones</span>
               </div>
               <div className="flex items-center gap-2">
                 <div className="w-3 h-3 rounded-full bg-[#2a2a2a]"></div>
                 <span className="text-[9px] font-bold uppercase tracking-widest text-[#b0b0b0]">Causas</span>
               </div>
            </div>
          </div>
          
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={chartData} margin={{ bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#2a2a2a" />
              <XAxis 
                dataKey="nombre" 
                tick={{ fontSize: 9, fill: '#b0b0b0', fontWeight: 600 }} 
                angle={-45} 
                textAnchor="end" 
                interval={0}
                axisLine={false}
                tickLine={false}
              />
              <YAxis 
                tick={{ fontSize: 10, fill: '#b0b0b0' }} 
                axisLine={false} 
                tickLine={false} 
                tickFormatter={v => `${(v/1000).toFixed(0)}k`} 
              />
              <Tooltip 
                cursor={{ fill: '#2a2a2a' }}
                contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '4px', fontSize: '10px' }}
                itemStyle={{ color: '#f8f8f6' }}
              />
              <Bar dataKey="detenciones" fill="#f8f8f6" radius={[2, 2, 0, 0]} />
              <Bar dataKey="causas_defensor" fill="#2a2a2a" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Data Table */}
        {error ? (
          <div className="bg-[#1a1a1a] rounded border border-red-100 p-12 text-center">
            <p className="text-sm text-red-500 font-bold mb-2">Error de Sincronización</p>
            <p className="text-xs text-[#5a5a5a] uppercase tracking-widest">Ejecutar tarea ETL DPP para reconstruir caché</p>
          </div>
        ) : (
          <TablaRanking items={filtered} search={search} onSearch={setSearch} />
        )}

        <footer className="pt-12 border-t border-[#2a2a2a]">
          <p className="text-[9px] uppercase tracking-[0.2em] text-[#5a5a5a]">
            Análisis de Punitivismo Territorial · Observatorio Anonimous Canna v2.0
          </p>
        </footer>
      </div>
    </div>
  )
}
