// frontend/src/pages/PjudPage.tsx
// Página de análisis Poder Judicial — sentencias Ley 20.000 (Fase E)
// Estado actual: metadata-only (reCAPTCHA bloquea texto completo, SAIP pendiente).
import { useEffect, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, ScatterChart, Scatter, ZAxis,
  PieChart, Pie, Legend,
} from 'recharts'
import {
  usePjudFiltros, usePjudStats, usePjudResumen,
  usePjudProporcionalidad, usePjudPorTribunal, usePjudVeredictos,
} from '../hooks/usePjud'
import { useIsMobile } from '../hooks/useIsMobile'
import { InfoModal } from '../components/InfoModal'

const VEREDICTO_COLORS: Record<string, string> = {
  condena:              '#dc2626',
  absolucion:           '#16a34a',
  sobreseimiento:       '#0891b2',
  salida_alternativa:   '#ca8a04',
  otros:                '#6b7280',
}

const VEREDICTO_LABELS: Record<string, string> = {
  condena:              'Condena',
  absolucion:           'Absolución',
  sobreseimiento:       'Sobreseimiento',
  salida_alternativa:   'Salida alternativa',
  otros:                'Otro',
}

function fmt(n: number) {
  return n.toLocaleString('es-CL')
}

function EmptyState({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center border border-dashed border-[#2a2a2a] rounded">
      <div className="w-12 h-12 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center mb-4">
        <span className="text-[#5a5a5a] text-xl">∅</span>
      </div>
      <p className="text-[#f8f8f6] font-cal text-sm mb-1">{title}</p>
      <p className="text-[#8a8a8a] text-xs max-w-md">{sub}</p>
    </div>
  )
}

export default function PjudPage() {
  const isMobile = useIsMobile()
  const { data: filtros } = usePjudFiltros()
  const [anio, setAnio] = useState<number | null>(null)
  const [infoOpen, setInfoOpen] = useState(false)

  useEffect(() => {
    if (filtros?.anios?.length && anio === null) {
      setAnio(Math.max(...filtros.anios))
    } else if (filtros && !filtros.anios?.length && anio === null) {
      // No hay datos aún — usar 2025 (vigencia Acta 164) para que UI no quede en blanco
      setAnio(2025)
    }
  }, [filtros, anio])

  const { data: stats } = usePjudStats(anio)
  const { data: resumen } = usePjudResumen(anio)
  const { data: scatter } = usePjudProporcionalidad(anio)
  const { data: porTribunal } = usePjudPorTribunal(anio)
  const { data: veredictos } = usePjudVeredictos(anio)

  const sinDatos = (stats?.total_sentencias ?? 0) === 0
  const tribunalesData = porTribunal?.tribunales?.slice(0, 15).map(t => ({
    nombre: (t.tribunal_nombre || t.tribunal_id || 'Sin tribunal').slice(0, 30),
    condenas: t.condenas,
    absoluciones: t.absoluciones,
    otros: t.sobreseimientos + t.salidas_alternativas + t.otros,
    total: t.total,
  })) ?? []

  const veredictoData = veredictos?.distribucion?.map(v => ({
    name: VEREDICTO_LABELS[v.veredicto || 'otros'] ?? v.veredicto ?? 'Otro',
    value: v.total,
    color: VEREDICTO_COLORS[v.veredicto || 'otros'] ?? '#6b7280',
    porcentaje: v.porcentaje,
  })) ?? []

  return (
    <div className="min-h-full bg-[#0a0a0a] pb-24 relative">
      <div className="absolute inset-0 dot-grid-light pointer-events-none opacity-40" />
      <InfoModal open={infoOpen} onClose={() => setInfoOpen(false)} source="cead" />

      {/* Hero */}
      <div className="relative px-6 py-16 sm:py-24 border-b border-[#2a2a2a]">
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div className="max-w-3xl">
              <span className="chip bg-[#f8f8f6] text-[#0a0a0a] border-[#f8f8f6] mb-6">
                PJud · Sentencias Ley 20.000 · Fase E
              </span>
              <h1 className="text-h1-deep text-[#f8f8f6] mb-6">
                Discrecionalidad <br />
                <span className="text-[#5a5a5a]">Judicial</span>
              </h1>
              <p className="text-body-deep text-[#b0b0b0] max-w-2xl">
                Auditoría de sentencias del Poder Judicial bajo Ley 20.000, post Acta 164-2024
                de la Corte Suprema. Cruce de gramaje y pena para detectar disparidades de
                criterio entre tribunales.
              </p>
              {sinDatos && (
                <div className="mt-6 px-4 py-3 border border-[#ca8a04]/40 bg-[#ca8a04]/5 rounded text-[11px] text-[#e0c97a] tracking-wide max-w-2xl">
                  <strong className="font-bold">⚠ DATOS PENDIENTES — </strong>
                  El scraping anónimo del Portal Unificado está bloqueado por reCAPTCHA v3.
                  Se requiere convenio SAIP institucional con el PJud (en gestión) para
                  acceso al texto completo de sentencias.
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4 bg-[#1a1a1a] p-4 rounded border border-[#2a2a2a] shadow-sm">
              <div className="flex items-center gap-4 mr-4">
                <label className="text-label-deep text-[#b0b0b0]">AÑO</label>
                <select
                  value={anio ?? ''}
                  onChange={e => setAnio(Number(e.target.value))}
                  className="font-cal text-sm border-none focus:ring-0 bg-transparent text-[#f8f8f6]"
                >
                  {(filtros?.anios?.length ? filtros.anios : [2025]).map(a =>
                    <option key={a} value={a} className="bg-[#1a1a1a]">{a}</option>
                  )}
                </select>
              </div>
              <button
                onClick={() => setInfoOpen(true)}
                className="chip bg-transparent text-[#b0b0b0] border-[#2a2a2a] hover:border-[#f8f8f6] hover:text-[#f8f8f6] transition-colors"
              >
                Metodología
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="relative px-6 py-12 max-w-7xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-12">
          {[
            { label: 'TOTAL SENTENCIAS', value: stats?.total_sentencias ?? 0 },
            { label: 'CON TEXTO',         value: stats?.total_con_texto ?? 0 },
            { label: 'METADATA-ONLY',     value: stats?.total_metadata_only ?? 0 },
            { label: 'TRIBUNALES',        value: stats?.total_tribunales ?? 0 },
            { label: 'MATERIAS',          value: stats?.total_materias ?? 0 },
          ].map(s => (
            <div key={s.label} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded p-4 border-t-2 border-t-[#5a5a5a]">
              <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-[#8a8a8a] mb-2">
                {s.label}
              </p>
              {s.value === 0 ? (
                <p className="text-base sm:text-lg font-cal text-[#5a5a5a] italic">Sin datos</p>
              ) : (
                <p className="text-2xl sm:text-3xl font-cal text-[#f8f8f6]">{fmt(s.value)}</p>
              )}
            </div>
          ))}
        </div>

        {/* Scatter Proporcionalidad gramaje vs pena */}
        <section className="mb-12">
          <header className="mb-6">
            <span className="chip bg-transparent text-[#b0b0b0] border-[#2a2a2a] mb-3">
              Análisis 1 · Proporcionalidad penal
            </span>
            <h2 className="text-h2-deep text-[#f8f8f6] mb-2">
              Gramaje incautado vs. pena impuesta
            </h2>
            <p className="text-sm text-[#8a8a8a] max-w-2xl">
              Cada punto representa una condena. Disparidades horizontales para gramajes
              similares revelan diferencias de criterio entre tribunales.
            </p>
          </header>
          {scatter?.puntos?.length ? (
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded p-4 sm:p-6">
              <ResponsiveContainer width="100%" height={isMobile ? 300 : 420}>
                <ScatterChart margin={{ top: 20, right: 20, bottom: 40, left: 40 }}>
                  <CartesianGrid stroke="#2a2a2a" />
                  <XAxis
                    type="number"
                    dataKey="gramaje_g"
                    name="Gramos"
                    label={{ value: 'Gramaje (g)', position: 'bottom', fill: '#b0b0b0' }}
                    tick={{ fill: '#8a8a8a', fontSize: 11 }}
                  />
                  <YAxis
                    type="number"
                    dataKey="pena_meses"
                    name="Meses"
                    label={{ value: 'Pena (meses)', angle: -90, position: 'left', fill: '#b0b0b0' }}
                    tick={{ fill: '#8a8a8a', fontSize: 11 }}
                  />
                  <ZAxis range={[60, 60]} />
                  <Tooltip
                    cursor={{ strokeDasharray: '3 3' }}
                    contentStyle={{ background: '#0a0a0a', border: '1px solid #2a2a2a', color: '#f8f8f6' }}
                  />
                  <Scatter data={scatter.puntos} fill="#f8f8f6" />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState
              title="Sin sentencias condenatorias con gramaje extraído"
              sub="El extractor rule-v1 ya está implementado. Sólo falta el corpus textual de sentencias (bloqueado por reCAPTCHA / pendiente SAIP)."
            />
          )}
        </section>

        {/* Por tribunal */}
        <section className="mb-12">
          <header className="mb-6">
            <span className="chip bg-transparent text-[#b0b0b0] border-[#2a2a2a] mb-3">
              Análisis 2 · Distribución por tribunal
            </span>
            <h2 className="text-h2-deep text-[#f8f8f6] mb-2">
              Veredictos por tribunal
            </h2>
            <p className="text-sm text-[#8a8a8a] max-w-2xl">
              Top 15 tribunales por volumen. Permite detectar tribunales con tasas
              anómalas de condena o absolución.
            </p>
          </header>
          {tribunalesData.length ? (
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded p-4 sm:p-6">
              <ResponsiveContainer width="100%" height={Math.max(320, tribunalesData.length * 32)}>
                <BarChart data={tribunalesData} layout="vertical" margin={{ left: 120, right: 20 }}>
                  <CartesianGrid stroke="#2a2a2a" horizontal={false} />
                  <XAxis type="number" tick={{ fill: '#8a8a8a', fontSize: 11 }} />
                  <YAxis
                    type="category"
                    dataKey="nombre"
                    tick={{ fill: '#b0b0b0', fontSize: 11 }}
                    width={120}
                  />
                  <Tooltip
                    contentStyle={{ background: '#0a0a0a', border: '1px solid #2a2a2a', color: '#f8f8f6' }}
                  />
                  <Bar dataKey="condenas"     stackId="v" fill={VEREDICTO_COLORS.condena}     name="Condenas" />
                  <Bar dataKey="absoluciones" stackId="v" fill={VEREDICTO_COLORS.absolucion}  name="Absoluciones" />
                  <Bar dataKey="otros"        stackId="v" fill={VEREDICTO_COLORS.otros}       name="Otros" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState
              title="Sin sentencias indexadas por tribunal"
              sub="Se mostrará apenas el pipeline reciba data del SAIP o auth institucional."
            />
          )}
        </section>

        {/* Distribución veredictos */}
        <section className="mb-12">
          <header className="mb-6">
            <span className="chip bg-transparent text-[#b0b0b0] border-[#2a2a2a] mb-3">
              Análisis 3 · Atrición del sistema
            </span>
            <h2 className="text-h2-deep text-[#f8f8f6] mb-2">
              Distribución nacional de veredictos
            </h2>
            <p className="text-sm text-[#8a8a8a] max-w-2xl">
              Insumo para el embudo del punitivismo: cuántas detenciones policiales (CEAD)
              terminan efectivamente en condena.
            </p>
          </header>
          {veredictoData.length ? (
            <div className="grid md:grid-cols-2 gap-6 bg-[#1a1a1a] border border-[#2a2a2a] rounded p-4 sm:p-6">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={veredictoData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={(p) => `${p.name}: ${(p.percent! * 100).toFixed(1)}%`}
                  >
                    {veredictoData.map((v, i) =>
                      <Cell key={i} fill={v.color} />
                    )}
                  </Pie>
                  <Legend wrapperStyle={{ color: '#b0b0b0', fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-col justify-center gap-3">
                {veredictoData.map(v => (
                  <div key={v.name} className="flex items-center justify-between border-b border-[#2a2a2a] pb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-sm" style={{ background: v.color }} />
                      <span className="text-sm text-[#f8f8f6]">{v.name}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-cal text-[#f8f8f6]">{fmt(v.value)}</p>
                      <p className="text-[10px] text-[#8a8a8a]">{v.porcentaje.toFixed(1)}%</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <EmptyState
              title="Sin veredictos extraídos"
              sub="El extractor rule-v1 (regex Ley 20.000 + spaCy) está listo. Esperando texto fuente."
            />
          )}
        </section>

        {/* Resumen materias */}
        {resumen?.por_materia?.length ? (
          <section className="mb-12">
            <header className="mb-6">
              <span className="chip bg-transparent text-[#b0b0b0] border-[#2a2a2a] mb-3">
                Análisis 4 · Materias judicializadas
              </span>
              <h2 className="text-h2-deep text-[#f8f8f6] mb-2">
                Distribución por materia
              </h2>
            </header>
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded p-4 sm:p-6">
              <ResponsiveContainer width="100%" height={Math.max(240, resumen.por_materia.length * 32)}>
                <BarChart data={resumen.por_materia.slice(0, 15)} layout="vertical" margin={{ left: 140, right: 20 }}>
                  <CartesianGrid stroke="#2a2a2a" horizontal={false} />
                  <XAxis type="number" tick={{ fill: '#8a8a8a', fontSize: 11 }} />
                  <YAxis type="category" dataKey="materia" tick={{ fill: '#b0b0b0', fontSize: 11 }} width={140} />
                  <Tooltip contentStyle={{ background: '#0a0a0a', border: '1px solid #2a2a2a', color: '#f8f8f6' }} />
                  <Bar dataKey="total" fill="#f8f8f6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
        ) : null}

        {/* Footer normativo */}
        <footer className="mt-16 pt-8 border-t border-[#2a2a2a] text-xs text-[#5a5a5a] max-w-3xl">
          <p className="mb-2">
            <strong className="text-[#8a8a8a]">Marco normativo:</strong>{' '}
            Acta 164-2024 Corte Suprema (vigente desde 2025-01-01) +
            6° Plan Estado Abierto Compromiso N° 5 (Justicia Abierta) +
            Ley 19.628 Protección de la Vida Privada.
          </p>
          <p>
            <strong className="text-[#8a8a8a]">Privacidad por diseño:</strong>{' '}
            Solo se publican agregados estadísticos. El texto original NO se
            almacena. Los identificadores personales (RUT, nombres, domicilios)
            son suprimidos antes de la persistencia mediante spaCy NER + regex
            (anonimizador-v1, auditoría reproducible vía HMAC salado).
          </p>
        </footer>
      </div>
    </div>
  )
}
