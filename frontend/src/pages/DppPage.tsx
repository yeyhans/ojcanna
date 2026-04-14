// frontend/src/pages/DppPage.tsx
//
// Defensoría Penal Pública — causas Ley 20.000.
// Viz upgrades respecto a versión anterior:
//   · PieChart donut → Stacked100Bar (longitud > ángulo, Cleveland/McGill)
//   · BarChart regional → Lollipop (menos tinta, ranking ordenable)
//   · Tabla Formas de Término → SortableTable
//   · KPI extra "Tasa de Condena" = condena / (condena + absolución)
//   · Serie Ingresos vs Términos con área "stock abierto" = diferencia acumulada

import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend as RLegend, Area, ComposedChart,
} from 'recharts'
import { InfoModal } from '../components/InfoModal'
import {
  useDppFiltros, useDppResumen, useDppSerie, useDppRegiones,
  type FormaTermino,
} from '../hooks/useDppAnalytics'
import {
  PageShell, SectionTitle, DataCard, KpiCard, ChartFrame, SourceBadge,
  chartTooltipStyle, chartTooltipItemStyle, chartAxisTickStyle, chartGridProps,
  SortableTable, type SortableColumn, SiteFooter,
} from '../components/ui'
import { Stacked100Bar } from '../components/viz/Stacked100Bar'
import { Lollipop } from '../components/viz/Lollipop'

const fmt = new Intl.NumberFormat('es-CL').format

const FORMA_SHORT: Record<string, string> = {
  'Absolución': 'Absolución',
  'Condena': 'Condena',
  'Derivación': 'Derivación',
  'Facultativos de Fiscalía': 'Facultativos',
  'Otras formas de término': 'Otras',
  'Salida Alternativa': 'Salida Alt.',
}

const FORMAS_COLUMNS: SortableColumn<FormaTermino>[] = [
  {
    key: 'nombre',
    label: 'Forma de término',
    sortable: true,
    align: 'left',
    format: 'text',
  },
  {
    key: 'n_causas',
    label: 'N° causas',
    sortable: true,
    align: 'right',
    format: 'integer',
  },
  {
    key: 'porcentaje',
    label: '% del total',
    sortable: true,
    align: 'right',
    format: 'percent',
  },
]

function findValue(formas: FormaTermino[], nombre: string): number {
  return formas.find((f) => f.nombre === nombre)?.n_causas ?? 0
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

  // ─── Cálculos derivados ──────────────────────────────────────────────────
  const tasaCondena = useMemo(() => {
    if (!resumen) return null
    const condena = findValue(resumen.formas_termino, 'Condena')
    const absolucion = findValue(resumen.formas_termino, 'Absolución')
    const denom = condena + absolucion
    if (denom === 0) return null
    return (condena / denom) * 100
  }, [resumen])

  const segments = useMemo(
    () =>
      (resumen?.formas_termino ?? []).map((f) => ({
        label: FORMA_SHORT[f.nombre] ?? f.nombre,
        value: f.n_causas,
      })),
    [resumen],
  )

  // Serie con "stock abierto" = ingresos - terminos (causas pendientes acumuladas)
  const serieExtended = useMemo(() => {
    if (!serie) return []
    return serie.map((p) => ({
      ...p,
      stockAbierto: Math.max(0, p.ingresos - p.terminos),
    }))
  }, [serie])

  const regionItems = useMemo(
    () =>
      (regiones ?? []).map((r) => ({
        label: r.region_nombre,
        value: r.n_ingresos,
      })),
    [regiones],
  )

  return (
    <PageShell ghostText="DPP" maxWidth="7xl">
      <InfoModal open={infoOpen} onClose={() => setInfoOpen(false)} source="dpp" />

      {/* ─── Hero ────────────────────────────────────────────────────────── */}
      <motion.header
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="mb-12"
      >
        <div className="flex items-center gap-3 mb-5">
          <span className="rule-mark" aria-hidden="true" />
          <span className="text-label-deep">Defensoría Penal Pública · Ley 20.000</span>
          <SourceBadge source="DPP" granularidad="nacional" />
        </div>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div>
            <h1 className="text-h1-deep text-[var(--ink)] mb-4">
              Observatorio Judicial <br />
              <span className="text-[var(--dim)]">Ley de Drogas Chile</span>
            </h1>
            <p className="text-[var(--dim)] text-base sm:text-lg leading-relaxed max-w-2xl font-light">
              Causas penales gestionadas por la Defensoría en el sistema de Ley 20.000.
              Monitoreo de ingresos, términos y formas de resolución.
            </p>
          </div>

          {filtros?.anios?.length ? (
            <DataCard accent="left" padding="md" className="shrink-0">
              <div className="flex items-center gap-4">
                <label htmlFor="dpp-anio" className="text-[10px] uppercase tracking-[0.25em] text-[var(--dim-soft)] font-bold">
                  Año
                </label>
                <select
                  id="dpp-anio"
                  value={anio ?? ''}
                  onChange={(e) => setAnio(Number(e.target.value))}
                  className="font-cal text-sm bg-transparent text-[var(--ink)] border-none focus:ring-0 outline-none"
                >
                  {filtros.anios.map((a) => (
                    <option key={a} value={a} style={{ background: 'var(--paper-elev)' }}>
                      {a}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setInfoOpen(true)}
                  className="text-[9px] uppercase tracking-[0.2em] font-bold text-[var(--dim)] hover:text-[var(--ink)] border border-[var(--card-border)] hover:border-[var(--ink)] px-2 py-1 rounded-sm transition-colors"
                >
                  Info
                </button>
              </div>
            </DataCard>
          ) : null}
        </div>
      </motion.header>

      {/* ─── KPIs ─────────────────────────────────────────────────────────── */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
        {resumenLoading || !resumen ? (
          [0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-32 bg-[var(--paper-elev)] border border-[var(--card-border)] rounded-sm animate-pulse"
            />
          ))
        ) : (
          <>
            <KpiCard
              label="Ingresos Totales"
              value={fmt(resumen.total_ingresos)}
              sublabel={`Defensas iniciadas en ${anio}`}
              accent
            />
            <KpiCard
              label="Causas Terminadas"
              value={fmt(resumen.total_terminos)}
              sublabel="Resoluciones dictadas"
            />
            <KpiCard
              label="Eficacia de Gestión"
              value={`${(resumen.ratio_terminos * 100).toFixed(1)}%`}
              sublabel="Términos / Ingresos"
            />
            <KpiCard
              label="Tasa de Condena"
              value={tasaCondena !== null ? `${tasaCondena.toFixed(1)}%` : '—'}
              sublabel="Condena / (Condena + Absolución)"
            />
          </>
        )}
      </section>

      {/* ─── Composición de términos — Stacked100Bar ─────────────────────── */}
      <section className="mb-12">
        <DataCard accent="left" padding="lg">
          <SectionTitle
            eyebrow={`Composición · ${anio ?? ''}`}
            title="Formas de término de las causas"
            subtitle="Distribución porcentual de resoluciones dictadas. Cada segmento representa una forma distinta; la longitud es proporcional a su peso relativo."
          />
          <Stacked100Bar segments={segments} height={56} showLegend />
        </DataCard>
      </section>

      {/* ─── Evolución histórica + stock abierto ──────────────────────────── */}
      <section className="mb-12">
        <ChartFrame
          eyebrow="Serie Temporal"
          title="Ingresos vs términos (stock abierto)"
          subtitle="El área sombreada es el stock abierto estimado: ingresos del año que no fueron terminados (causas pendientes)."
          height={340}
        >
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={serieExtended} margin={{ top: 10, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid {...chartGridProps} />
              <XAxis dataKey="anio" tick={chartAxisTickStyle} axisLine={false} tickLine={false} />
              <YAxis
                tick={chartAxisTickStyle}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v))}
              />
              <Tooltip
                contentStyle={chartTooltipStyle}
                itemStyle={chartTooltipItemStyle}
                formatter={(v) => fmt(Number(v))}
              />
              <RLegend wrapperStyle={{ fontSize: '11px', paddingTop: 8 }} />
              <Area
                type="monotone"
                dataKey="stockAbierto"
                name="Stock abierto"
                fill="var(--chart-4)"
                fillOpacity={0.2}
                stroke="none"
              />
              <Line
                type="monotone"
                dataKey="ingresos"
                stroke="var(--chart-1)"
                strokeWidth={2}
                dot={{ r: 3, fill: 'var(--chart-1)' }}
                name="Ingresos"
              />
              <Line
                type="monotone"
                dataKey="terminos"
                stroke="var(--chart-3)"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ r: 3, fill: 'var(--chart-3)' }}
                name="Términos"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartFrame>
      </section>

      {/* ─── Ranking regional — Lollipop ───────────────────────────────────── */}
      <section className="mb-12">
        <DataCard accent="left" padding="lg">
          <SectionTitle
            eyebrow={`Ranking regional · ${anio ?? ''}`}
            title="Distribución regional de imputados"
            subtitle="Ordenado por volumen de ingresos. Cada línea representa una región; el punto al final marca el total."
          />
          <Lollipop data={regionItems} />
        </DataCard>
      </section>

      {/* ─── Detalle tabla ordenable ──────────────────────────────────────── */}
      <section className="mb-12">
        <SectionTitle
          eyebrow={`Detalle · ${anio ?? ''}`}
          title="Formas de término — tabla"
          subtitle="Ordenable por cualquier columna. Exportable a CSV preservando el orden actual."
        />
        <SortableTable
          columns={FORMAS_COLUMNS}
          data={resumen?.formas_termino ?? []}
          rowKey={(r) => r.nombre}
          initialSort={{ key: 'porcentaje', direction: 'desc' }}
          exportCsv
          exportFilename={`dpp_formas_termino_${anio ?? 'all'}.csv`}
        />
      </section>

      <SiteFooter
        organismo="Fuente: Defensoría Penal Pública (SIGDP)"
        source="DPP"
        granularidad="regional"
      />
    </PageShell>
  )
}
