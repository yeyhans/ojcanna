// frontend/src/pages/PdiPage.tsx
//
// PDI — datos.gob.cl. Viz upgrades:
//   · Bar vertical categorías → RankedDotPlot (multi-serie delitos/denuncias/víctimas)
//   · Bar horizontal regional → Lollipop
//   · Nueva sección: Heatmap categoría × subcategoría (nacional)
//   · Segmented control para subcategoría
//   · Tabla regional ordenable como complemento del mapa

import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { InfoModal } from '../components/InfoModal'
import { usePdiFiltros, usePdiResumen, usePdiRegiones, type PdiRegionItem } from '../hooks/usePdiAnalytics'
import {
  PageShell, SectionTitle, DataCard, KpiCard, SourceBadge,
  SegmentedControl, SortableTable, type SortableColumn, SiteFooter,
} from '../components/ui'
import { Lollipop } from '../components/viz/Lollipop'
import { RankedDotPlot } from '../components/viz/RankedDotPlot'
import { Heatmap } from '../components/viz/Heatmap'

const fmt = new Intl.NumberFormat('es-CL').format

const SUBCATEGORIA_OPTIONS = [
  { value: 'delitos', label: 'Delitos' },
  { value: 'denuncias', label: 'Denuncias' },
  { value: 'victimas', label: 'Víctimas' },
] as const

type Subcat = (typeof SUBCATEGORIA_OPTIONS)[number]['value']

const SHORT_CAT: Record<string, string> = {
  'Crímenes y simples delitos contenidos en la ley Nº 20.000': 'Ley 20.000',
  'Consumo de alcohol y de drogas en la vía pública.': 'Consumo vía pública',
}

function shortCat(s: string): string {
  return SHORT_CAT[s] ?? s
}

const REGION_COLUMNS: SortableColumn<PdiRegionItem>[] = [
  {
    key: 'region_id',
    label: 'ID',
    sortable: true,
    align: 'left',
    format: 'text',
    width: '60px',
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
    key: 'frecuencia',
    label: 'Frecuencia',
    sortable: true,
    align: 'right',
    format: 'integer',
  },
]

export default function PdiPage() {
  const { data: filtros } = usePdiFiltros()
  const [anio, setAnio] = useState<number | null>(null)
  const [selectedCat, setSelectedCat] = useState<string | null>(null)
  const [selectedSub, setSelectedSub] = useState<Subcat>('delitos')
  const [infoOpen, setInfoOpen] = useState(false)

  useEffect(() => {
    if (filtros?.anios?.length && anio === null) {
      setAnio(Math.max(...filtros.anios))
    }
    if (filtros?.categorias?.length && selectedCat === null) {
      const mainCat =
        filtros.categorias.find((c) => c.includes('20.000')) ?? filtros.categorias[0]
      setSelectedCat(mainCat)
    }
  }, [filtros, anio, selectedCat])

  const { data: resumen } = usePdiResumen(anio)
  const { data: regiones } = usePdiRegiones(anio, selectedCat, selectedSub)

  // ─── Derivados ───────────────────────────────────────────────────────────
  // Categorías únicas con totales por subcategoría (dot plot).
  const categoryRows = useMemo(() => {
    if (!resumen) return []
    const map = new Map<string, Record<Subcat, number>>()
    for (const item of resumen) {
      const key = shortCat(item.categoria)
      if (!map.has(key)) {
        map.set(key, { delitos: 0, denuncias: 0, victimas: 0 })
      }
      const bucket = map.get(key)!
      const sub = item.subcategoria as Subcat
      if (sub in bucket) bucket[sub] = (bucket[sub] ?? 0) + item.total_nacional
    }
    return Array.from(map.entries()).map(([label, vals]) => ({
      label,
      points: [
        { seriesKey: 'delitos', value: vals.delitos },
        { seriesKey: 'denuncias', value: vals.denuncias },
        { seriesKey: 'victimas', value: vals.victimas },
      ],
      total: vals.delitos + vals.denuncias + vals.victimas,
    }))
  }, [resumen])

  // Heatmap: categoría × subcategoría — matriz 2D directa del resumen.
  const heatmapRows = useMemo(() => {
    if (!resumen) return []
    const uniq = new Set<string>()
    resumen.forEach((r) => uniq.add(shortCat(r.categoria)))
    return Array.from(uniq).sort()
  }, [resumen])

  const heatmapValue = (row: string, col: Subcat): number | null => {
    if (!resumen) return null
    const match = resumen.find(
      (r) => shortCat(r.categoria) === row && r.subcategoria === col,
    )
    return match ? match.total_nacional : null
  }

  // KPIs: totales de la categoría principal seleccionada por subcategoría.
  const kpiTotals = useMemo(() => {
    if (!resumen || !selectedCat) return null
    const catItems = resumen.filter((r) => r.categoria === selectedCat)
    return {
      delitos: catItems.find((r) => r.subcategoria === 'delitos')?.total_nacional ?? 0,
      denuncias: catItems.find((r) => r.subcategoria === 'denuncias')?.total_nacional ?? 0,
      victimas: catItems.find((r) => r.subcategoria === 'victimas')?.total_nacional ?? 0,
    }
  }, [resumen, selectedCat])

  const regionLollipop = useMemo(
    () =>
      (regiones ?? [])
        .slice()
        .sort((a, b) => b.frecuencia - a.frecuencia)
        .map((r) => ({ label: r.region_nombre, value: r.frecuencia })),
    [regiones],
  )

  return (
    <PageShell ghostText="PDI" maxWidth="7xl">
      <InfoModal open={infoOpen} onClose={() => setInfoOpen(false)} source="pdi" />

      {/* ─── Hero ────────────────────────────────────────────────────────── */}
      <motion.header
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="mb-12"
      >
        <div className="flex items-center gap-3 mb-5 flex-wrap">
          <span className="rule-mark" aria-hidden="true" />
          <span className="text-label-deep">PDI · Inteligencia Institucional</span>
          <SourceBadge source="PDI" granularidad="regional" />
        </div>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div>
            <h1 className="text-h1-deep text-[var(--ink)] mb-4">
              Investigaciones y <br />
              <span className="text-[var(--dim)]">Carga Judicial PDI</span>
            </h1>
            <p className="text-[var(--dim)] text-base sm:text-lg leading-relaxed max-w-2xl font-light">
              Actividad investigativa y reportes de la Policía de Investigaciones bajo
              metodología oficial. Delitos, denuncias y víctimas a nivel regional.
            </p>
          </div>

          {filtros?.anios?.length ? (
            <DataCard accent="left" padding="md" className="shrink-0">
              <div className="flex items-center gap-4">
                <label htmlFor="pdi-anio" className="text-[10px] uppercase tracking-[0.25em] text-[var(--dim-soft)] font-bold">
                  Año
                </label>
                <select
                  id="pdi-anio"
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

      {/* ─── KPIs (categoría principal) ───────────────────────────────────── */}
      {kpiTotals && selectedCat && (
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12">
          <KpiCard
            label="Delitos investigados"
            value={fmt(Math.round(kpiTotals.delitos))}
            sublabel={shortCat(selectedCat)}
            accent
          />
          <KpiCard
            label="Denuncias recibidas"
            value={fmt(Math.round(kpiTotals.denuncias))}
            sublabel={shortCat(selectedCat)}
          />
          <KpiCard
            label="Víctimas registradas"
            value={fmt(Math.round(kpiTotals.victimas))}
            sublabel={shortCat(selectedCat)}
          />
        </section>
      )}

      {/* ─── Ranking categorías — Dot Plot multi-serie ────────────────────── */}
      <section className="mb-12">
        <DataCard accent="left" padding="lg">
          <SectionTitle
            eyebrow={`Volumen nacional · ${anio ?? ''}`}
            title="Categorías — delitos / denuncias / víctimas"
            subtitle="Cada fila es una categoría. Los tres dots muestran el volumen relativo en cada subcategoría respecto al máximo global."
          />
          <RankedDotPlot
            rows={categoryRows}
            series={[
              { key: 'delitos', label: 'Delitos', dotSize: 12 },
              { key: 'denuncias', label: 'Denuncias', dotSize: 10 },
              { key: 'victimas', label: 'Víctimas', dotSize: 8 },
            ]}
            sortBy="total"
          />
        </DataCard>
      </section>

      {/* ─── Heatmap categoría × subcategoría ─────────────────────────────── */}
      <section className="mb-12">
        <DataCard accent="left" padding="lg">
          <SectionTitle
            eyebrow={`Matriz nacional · ${anio ?? ''}`}
            title="Intensidad por categoría × tipo de registro"
            subtitle="La intensidad monocroma mapea el valor relativo al máximo de la matriz — celdas más oscuras concentran mayor actividad."
          />
          <Heatmap<string, Subcat>
            rows={heatmapRows}
            cols={['delitos', 'denuncias', 'victimas']}
            getKey={(r, c) => `${r}-${c}`}
            getValue={(r, c) => heatmapValue(r, c)}
            getRowLabel={(r) => r}
            getColLabel={(c) => c.toUpperCase()}
          />
        </DataCard>
      </section>

      {/* ─── Distribución regional ────────────────────────────────────────── */}
      <section className="mb-12">
        <DataCard accent="left" padding="lg">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6 mb-6">
            <SectionTitle
              eyebrow={`Distribución regional · ${anio ?? ''}`}
              title="Ranking por región"
              subtitle="Seleccioná categoría y tipo de registro para ver la distribución territorial."
              className="mb-0"
            />
            <div className="flex flex-col sm:flex-row gap-3">
              <select
                value={selectedCat ?? ''}
                onChange={(e) => setSelectedCat(e.target.value)}
                className="text-[10px] font-bold tracking-[0.1em] bg-[var(--paper-deep)] text-[var(--ink)] border border-[var(--card-border)] rounded-sm px-3 py-2 uppercase outline-none focus:ring-2 focus:ring-[var(--ink)]"
                aria-label="Categoría"
              >
                {filtros?.categorias?.map((c) => (
                  <option key={c} value={c} style={{ background: 'var(--paper-elev)' }}>
                    {shortCat(c)}
                  </option>
                ))}
              </select>

              <SegmentedControl
                options={SUBCATEGORIA_OPTIONS as unknown as { value: Subcat; label: string }[]}
                value={selectedSub}
                onChange={(v) => setSelectedSub(v)}
                label="Subcategoría"
              />
            </div>
          </div>

          <Lollipop data={regionLollipop} />
        </DataCard>
      </section>

      {/* ─── Tabla regional ordenable ─────────────────────────────────────── */}
      <section className="mb-12">
        <SectionTitle
          eyebrow={`Detalle · ${anio ?? ''} · ${selectedSub.toUpperCase()}`}
          title="Regiones — tabla ordenable"
          subtitle="Click en encabezado para ordenar. Exportá como CSV."
        />
        <SortableTable
          columns={REGION_COLUMNS}
          data={regiones ?? []}
          rowKey={(r) => r.region_id}
          initialSort={{ key: 'frecuencia', direction: 'desc' }}
          exportCsv
          exportFilename={`pdi_${selectedSub}_${anio ?? 'all'}.csv`}
        />
      </section>

      <SiteFooter
        organismo="Fuente: PDI · Registro Administrativo BRAIN · datos.gob.cl"
        source="PDI"
        granularidad="regional"
      />
    </PageShell>
  )
}
