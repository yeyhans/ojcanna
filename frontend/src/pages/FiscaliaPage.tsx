// frontend/src/pages/FiscaliaPage.tsx
//
// Fiscalía Nacional · Ministerio Público. Análisis de causas Ley 20.000.
// Upgrades: componentes compartidos, tabla ordenable, paleta estrictamente
// monocroma (sin verdes/ámbares).

import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend as RLegend,
} from 'recharts'
import {
  useFiscaliaFiltros, useFiscaliaResumen, useFiscaliaSerie, useFiscaliaRegiones,
} from '../hooks/useFiscaliaAnalytics'
import type { FiscaliaRegion } from '../types/fiscalia'
import { InfoModal } from '../components/InfoModal'
import {
  PageShell, SectionTitle, DataCard, KpiCard, ChartFrame, SourceBadge,
  SortableTable, type SortableColumn, SiteFooter,
  chartTooltipStyle, chartTooltipItemStyle, chartAxisTickStyle, chartGridProps,
} from '../components/ui'
import { Lollipop } from '../components/viz/Lollipop'

const fmt = new Intl.NumberFormat('es-CL').format

interface RegionRow extends FiscaliaRegion {
  ratio: number | null
}

const REGION_COLUMNS: SortableColumn<RegionRow>[] = [
  {
    key: 'region_id',
    label: 'ID',
    sortable: true,
    align: 'left',
    format: 'text',
    width: '70px',
    render: (_row, v) => (
      <span className="font-mono-data text-[var(--dim-soft)] text-[10px]">
        R{String(v ?? '').padStart(2, '0')}
      </span>
    ),
  },
  {
    key: 'region_nombre',
    label: 'Región',
    sortable: true,
    align: 'left',
    format: 'text',
  },
  {
    key: 'ingresos',
    label: 'Ingresos',
    sortable: true,
    align: 'right',
    format: 'integer',
  },
  {
    key: 'terminos',
    label: 'Términos',
    sortable: true,
    align: 'right',
    format: 'integer',
  },
  {
    key: 'ratio',
    label: 'Ratio T/I',
    sortable: true,
    align: 'right',
    format: 'decimal',
    accessor: (row) => row.ratio,
    render: (row) => {
      if (row.ratio == null) return <span className="text-[var(--dim-soft)]">—</span>
      // Glifo monocromo: ▲ si >=1 (terminando más de lo que entra),
      // ▼ si <1 (stock abierto crece). Cero chromatic colors.
      const glyph = row.ratio >= 1 ? '▲' : '▼'
      return (
        <span className="inline-flex items-center gap-1.5 font-mono-data tabular-nums text-[var(--ink)]">
          <span
            className="text-[10px]"
            style={{ color: row.ratio >= 1 ? 'var(--ink)' : 'var(--dim)' }}
            aria-label={row.ratio >= 1 ? 'Sobre 1.0' : 'Bajo 1.0'}
          >
            {glyph}
          </span>
          {row.ratio.toFixed(2)}
        </span>
      )
    },
  },
]

export default function FiscaliaPage() {
  const { data: filtros } = useFiscaliaFiltros()
  const [anio, setAnio] = useState<number | null>(null)
  const [infoOpen, setInfoOpen] = useState(false)

  useEffect(() => {
    if (filtros?.anios?.length && anio === null) {
      setAnio(Math.max(...filtros.anios))
    }
  }, [filtros, anio])

  const { data: resumen } = useFiscaliaResumen(anio)
  const { data: serie } = useFiscaliaSerie()
  const { data: regiones } = useFiscaliaRegiones(anio)

  const regionRows = useMemo<RegionRow[]>(
    () =>
      (regiones ?? []).map((r) => ({
        ...r,
        ratio: r.ingresos > 0 ? r.terminos / r.ingresos : null,
      })),
    [regiones],
  )

  const top10Ingresos = useMemo(
    () =>
      (regiones ?? [])
        .slice()
        .sort((a, b) => b.ingresos - a.ingresos)
        .slice(0, 10)
        .map((r) => ({ label: r.region_nombre, value: r.ingresos })),
    [regiones],
  )

  return (
    <PageShell ghostText="MP" maxWidth="7xl">
      <InfoModal open={infoOpen} onClose={() => setInfoOpen(false)} source="fiscalia" />

      {/* ─── Hero ────────────────────────────────────────────────────────── */}
      <motion.header
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="mb-12"
      >
        <div className="flex items-center gap-3 mb-5 flex-wrap">
          <span className="rule-mark" aria-hidden="true" />
          <span className="text-label-deep">Ministerio Público · Persecución penal</span>
          <SourceBadge source="FISCALIA" granularidad="regional" />
        </div>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div>
            <h1 className="text-h1-deep text-[var(--ink)] mb-4">
              Fiscalía <br />
              <span className="text-[var(--dim)]">Nacional</span>
            </h1>
            <p className="text-[var(--dim)] text-base sm:text-lg leading-relaxed max-w-2xl font-light">
              Causas ingresadas y terminadas por la Fiscalía en la categoría
              oficial <strong className="text-[var(--ink)]">Delitos Ley de Drogas</strong>.
              Datos regionales (16 regiones), desglose por año.
            </p>
          </div>

          {filtros?.anios?.length ? (
            <DataCard accent="left" padding="md" className="shrink-0">
              <div className="flex items-center gap-4">
                <label htmlFor="fiscalia-anio" className="text-[10px] uppercase tracking-[0.25em] text-[var(--dim-soft)] font-bold">
                  Año
                </label>
                <select
                  id="fiscalia-anio"
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
      {resumen && (
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12">
          <KpiCard
            label="Causas ingresadas"
            value={fmt(resumen.total_ingresos)}
            sublabel={`Año ${resumen.anio}`}
            accent
          />
          <KpiCard
            label="Causas terminadas"
            value={fmt(resumen.total_terminos)}
            sublabel={`Año ${resumen.anio}`}
          />
          <KpiCard
            label="Ratio términos / ingresos"
            value={resumen.ratio_terminos.toFixed(2)}
            sublabel={
              resumen.ratio_terminos >= 1
                ? 'Terminando más de lo que ingresa'
                : 'Ingresando más de lo que termina'
            }
          />
        </section>
      )}

      {/* ─── Serie temporal ──────────────────────────────────────────────── */}
      {serie && serie.length > 1 && (
        <section className="mb-10">
          <ChartFrame
            eyebrow="Serie Temporal"
            title="Ingresos vs términos por año"
            subtitle="Suma nacional (16 regiones) de la categoría Delitos Ley de Drogas."
            height={320}
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={serie} margin={{ top: 10, right: 16, bottom: 0, left: 0 }}>
                <CartesianGrid {...chartGridProps} />
                <XAxis dataKey="anio" tick={chartAxisTickStyle} axisLine={false} tickLine={false} />
                <YAxis
                  tick={chartAxisTickStyle}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) => fmt(v)}
                />
                <Tooltip
                  contentStyle={chartTooltipStyle}
                  itemStyle={chartTooltipItemStyle}
                  formatter={(v) => fmt(Number(v))}
                />
                <RLegend wrapperStyle={{ fontSize: '11px', paddingTop: 8 }} />
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
              </LineChart>
            </ResponsiveContainer>
          </ChartFrame>
        </section>
      )}

      {/* ─── Top 10 regiones (Lollipop) ────────────────────────────────────── */}
      {top10Ingresos.length > 0 && (
        <section className="mb-10">
          <DataCard accent="left" padding="lg">
            <SectionTitle
              eyebrow={`Ranking regional · ${anio ?? ''}`}
              title="Top 10 regiones por ingresos"
              subtitle="Todas las 16 regiones se listan en la tabla debajo (ordenable)."
            />
            <Lollipop data={top10Ingresos} />
          </DataCard>
        </section>
      )}

      {/* ─── Tabla ordenable 16 regiones ──────────────────────────────────── */}
      {regionRows.length > 0 && (
        <section className="mb-10">
          <SectionTitle
            eyebrow={`Desglose · ${anio ?? ''}`}
            title={`${regionRows.length} regiones`}
            subtitle="Click en encabezado para ordenar. Ratio T/I = causas terminadas / causas ingresadas."
          />
          <SortableTable
            columns={REGION_COLUMNS}
            data={regionRows}
            rowKey={(r) => r.region_id}
            initialSort={{ key: 'ingresos', direction: 'desc' }}
            exportCsv
            exportFilename={`fiscalia_regiones_${anio ?? 'all'}.csv`}
          />
        </section>
      )}

      {/* ─── Empty state ─────────────────────────────────────────────────── */}
      {!resumen && !regiones && (
        <div className="space-y-5 mb-12">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-40 bg-[var(--paper-elev)] border border-[var(--card-border)] animate-pulse rounded-sm"
            />
          ))}
        </div>
      )}

      <SiteFooter
        organismo="Fuente: Fiscalía Nacional · Ministerio Público de Chile"
        source="FISCALIA"
        granularidad="regional"
      />
    </PageShell>
  )
}
