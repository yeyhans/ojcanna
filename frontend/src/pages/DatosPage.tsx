// frontend/src/pages/DatosPage.tsx
//
// Página /datos — transparencia máxima.
// Cualquier ciudadano puede descargar las 5 bases de datos oficiales en CSV o XLSX.
//
// Migrada al brand DispensAI: tokens CSS + PageShell + DataCard + KpiCard +
// SectionTitle + SourceBadge. Monocromo estricto (cero colores cromáticos).

import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import type { DatasetInfo, ExportManifest } from '../types/export'
import { useCachedFetch } from '../hooks/useCachedFetch'
import {
  PageShell,
  DataCard,
  KpiCard,
  SourceBadge,
  SiteFooter,
} from '../components/ui'

const fmt = new Intl.NumberFormat('es-CL').format

/** Fecha ISO UTC → "14 abr 2026, 01:15 UTC" legible. */
function fmtSnapshot(iso: string): string {
  try {
    const d = new Date(iso)
    const opts: Intl.DateTimeFormatOptions = {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'UTC',
    }
    return d.toLocaleString('es-CL', opts).replace(',', '') + ' UTC'
  } catch {
    return iso
  }
}

/** Estimación rudimentaria del peso del CSV en KB. */
function estimarCsvKB(filas: number, columnas: number): string {
  const bytes = filas * columnas * 12 // ~12 bytes promedio por celda
  if (bytes < 1024) return `<1 KB`
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

// ---------------------------------------------------------------------------
// Página principal
// ---------------------------------------------------------------------------

export default function DatosPage() {
  const { data: manifest, error } = useCachedFetch<ExportManifest>(
    '/api/v1/export/manifest',
  )

  const totalRegistros =
    manifest?.fuentes.reduce((sum, f) => sum + f.filas, 0) ?? 0

  return (
    <PageShell ghostText="DATA" maxWidth="7xl">
      {/* ─── Header ───────────────────────────────────────────────────── */}
      <motion.header
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="flex items-center gap-3 mb-5">
          <span className="rule-mark" aria-hidden="true" />
          <span className="text-label-deep">Transparencia · Datos abiertos</span>
        </div>

        <h1 className="text-h1-deep text-[var(--ink)] mb-6">
          Descarga las bases
          <br />
          <span className="text-[var(--dim)]">de datos crudas</span>
        </h1>

        <p className="text-[var(--dim)] text-base sm:text-lg leading-relaxed max-w-2xl font-light">
          Todos los números del Observatorio provienen de fuentes oficiales
          chilenas. Acá bajás la base completa en el formato que prefieras,
          con atribución explícita al organismo que la publica y sin
          intermediarios.
        </p>

        <div className="mt-6 inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.25em] font-bold text-[var(--dim)] bg-[var(--paper-elev)] border border-[var(--card-border)] px-3 py-2 rounded-sm">
          <span aria-hidden="true" className="text-[var(--ink)]">●</span>
          Cobertura temporal: 2005 – 2025
        </div>
      </motion.header>

      {/* ─── Stats globales ──────────────────────────────────────────── */}
      {manifest && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4"
        >
          <KpiCard
            label="Fuentes oficiales"
            value={String(manifest.fuentes.length)}
            sublabel="Organismos publicadores"
            accent
          />
          <KpiCard
            label="Registros publicados"
            value={fmt(totalRegistros)}
            sublabel="Suma de filas en todas las bases"
          />
          <KpiCard
            label="Snapshot"
            value={fmtSnapshot(manifest.snapshot_utc)}
            sublabel="Última actualización"
          />
        </motion.div>
      )}

      <div className="h-px bg-[var(--card-border)] my-10 sm:my-14" />

      {/* ─── Error state ───────────────────────────────────────────────── */}
      {error && (
        <DataCard accent="left" padding="lg" className="mb-8" as="section">
          <div role="alert">
            <p className="text-[10px] uppercase tracking-[0.25em] font-bold text-[var(--ink)] mb-2">
              Error cargando manifest
            </p>
            <p className="text-sm text-[var(--dim)]">{error}</p>
          </div>
        </DataCard>
      )}

      {/* ─── Loading skeleton ─────────────────────────────────────────── */}
      {!manifest && !error && (
        <div className="space-y-5">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-56 bg-[var(--paper-elev)] border border-[var(--card-border)] animate-pulse rounded-sm"
            />
          ))}
        </div>
      )}

      {/* ─── Dataset cards ─────────────────────────────────────────────── */}
      {manifest && (
        <div className="space-y-6 sm:space-y-8">
          {manifest.fuentes.map((ds, i) => (
            <DatasetCard key={ds.id} dataset={ds} index={i} />
          ))}
        </div>
      )}

      <SiteFooter organismo="Transparencia · Bases de datos oficiales chilenas" />
    </PageShell>
  )
}

// ---------------------------------------------------------------------------
// DatasetCard
// ---------------------------------------------------------------------------

const SOURCE_ID_TO_BADGE: Record<
  string,
  { source: 'CEAD' | 'DPP' | 'PDI' | 'FISCALIA' | 'PJUD'; granularidad: 'comunal' | 'regional' | 'nacional' | 'tribunal' }
> = {
  cead: { source: 'CEAD', granularidad: 'comunal' },
  dpp: { source: 'DPP', granularidad: 'regional' },
  pdi: { source: 'PDI', granularidad: 'regional' },
  fiscalia: { source: 'FISCALIA', granularidad: 'regional' },
  pjud: { source: 'PJUD', granularidad: 'tribunal' },
}

function DatasetCard({ dataset, index }: { dataset: DatasetInfo; index: number }) {
  const rango = dataset.rango_anios
  const rangoLabel =
    rango.min == null || rango.max == null
      ? '—'
      : rango.min === rango.max
        ? `${rango.min}`
        : `${rango.min} – ${rango.max}`

  const includes2025 = rango.max != null && rango.max >= 2025

  const anios = useMemo(() => dataset.anios_disponibles ?? [], [dataset.anios_disponibles])
  const [anioFiltro, setAnioFiltro] = useState<number | null>(null)

  const filasEfectivas =
    anioFiltro != null && anios.length > 0
      ? Math.round(dataset.filas / anios.length)
      : dataset.filas

  const pesoCsv = estimarCsvKB(filasEfectivas, dataset.columnas.length)

  const qs = anioFiltro != null ? `?anio=${anioFiltro}` : ''
  const csvHref = `${dataset.descargas.csv}${qs}`
  const xlsxHref = `${dataset.descargas.xlsx}${qs}`
  const filenameSuffix = anioFiltro != null ? `_${anioFiltro}` : ''

  const mostrarSelectorAnios = anios.length > 1
  const badge = SOURCE_ID_TO_BADGE[dataset.id.toLowerCase()]

  return (
    <motion.article
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.55,
        delay: 0.05 + index * 0.08,
        ease: [0.16, 1, 0.3, 1],
      }}
      aria-labelledby={`ds-titulo-${dataset.id}`}
    >
      <DataCard accent="left" accentStrong padding="lg" as="div">
        {/* ─── Eyebrow + badges (row superior, full width) ─────────── */}
        <div className="flex items-center flex-wrap gap-2 mb-6">
          <p className="text-[10px] uppercase tracking-[0.3em] text-[var(--dim-soft)] font-bold">
            Fuente {String(index + 1).padStart(2, '0')}
            {dataset.etiqueta_eje && (
              <> · <span className="text-[var(--ink)]">{dataset.etiqueta_eje}</span></>
            )}
          </p>
          {badge && <SourceBadge source={badge.source} granularidad={badge.granularidad} />}
          {includes2025 && (
            <span className="text-[9px] uppercase tracking-[0.2em] font-bold text-[var(--ink)] bg-[var(--ink)]/5 border border-[var(--ink)]/30 px-2 py-0.5 rounded-sm">
              Actualizado {rango.max}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
          {/* ─── Izquierda: identidad + metadata ────────────────────── */}
          <div className="lg:col-span-7 space-y-6 min-w-0">
            <h2
              id={`ds-titulo-${dataset.id}`}
              className="font-cal text-[var(--ink)]"
              style={{
                fontSize: 'clamp(1.5rem, 2.6vw, 2.1rem)',
                fontWeight: 200,
                letterSpacing: '-0.02em',
                lineHeight: 1.1,
              }}
            >
              {dataset.titulo}
            </h2>

            {dataset.descripcion && (
              <p className="text-sm sm:text-base text-[var(--dim)] leading-relaxed font-light">
                {dataset.descripcion}
              </p>
            )}

            {/* Chips métricas — grid fijo en desktop */}
            <div className="grid grid-cols-2 gap-2.5">
              <Chip label="Registros" value={fmt(dataset.filas)} />
              <Chip label="Años" value={rangoLabel} />
              <Chip label="Columnas" value={String(dataset.columnas.length)} />
              <Chip label="Granularidad" value={dataset.granularidad} />
            </div>

            {/* Organismo */}
            <Section label="Organismo">
              <p className="text-sm text-[var(--ink)] leading-relaxed font-light">
                {dataset.organismo}
              </p>
            </Section>

            {/* Fuente oficial */}
            <Section label="Fuente oficial">
              <a
                href={dataset.fuente_url}
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-2 text-sm text-[var(--ink)] hover:opacity-70 underline decoration-[var(--rule-strong)] hover:decoration-[var(--ink)] underline-offset-4 transition-all break-all focus-visible:ring-2 focus-visible:ring-[var(--ink)] focus-visible:outline-none rounded-sm"
              >
                <span className="font-mono-data text-[11px] sm:text-xs">
                  {dataset.fuente_url}
                </span>
                <span
                  aria-hidden="true"
                  className="text-[10px] opacity-50 group-hover:opacity-100 transition-opacity shrink-0"
                >
                  ↗
                </span>
              </a>
            </Section>

            {/* Caveat */}
            <Section label="Nota metodológica">
              <p className="text-xs text-[var(--dim)] leading-relaxed font-light flex gap-2">
                <span
                  aria-hidden="true"
                  className="text-[var(--dim-soft)] shrink-0 mt-[1px]"
                >
                  ⚠
                </span>
                <span>{dataset.caveat}</span>
              </p>
            </Section>

            {/* Link vista analítica */}
            {dataset.vista_analitica && (
              <div className="pt-2">
                <Link
                  to={dataset.vista_analitica}
                  className="group inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] font-bold text-[var(--ink)] hover:opacity-70 transition-opacity focus-visible:ring-2 focus-visible:ring-[var(--ink)] focus-visible:outline-none rounded-sm px-3 py-2 border border-[var(--card-border)] hover:border-[var(--ink)]"
                >
                  Ver análisis de {dataset.id.toUpperCase()}
                  <span
                    aria-hidden="true"
                    className="transition-transform group-hover:translate-x-0.5"
                  >
                    →
                  </span>
                </Link>
              </div>
            )}
          </div>

          {/* ─── Derecha: descargas (sticky desktop) ─────────────────── */}
          <aside className="lg:col-span-5 lg:sticky lg:top-4 flex flex-col gap-5">
            <div>
              <p className="text-[10px] uppercase tracking-[0.25em] text-[var(--dim-soft)] font-bold mb-3">
                Descargar base
              </p>
              <div className="flex flex-row gap-3">
                <DownloadButton
                  href={csvHref}
                  filename={`observatorio_${dataset.id}${filenameSuffix}.csv`}
                  format="CSV"
                  sublabel={`${pesoCsv} aprox.`}
                  primary
                />
                <DownloadButton
                  href={xlsxHref}
                  filename={`observatorio_${dataset.id}${filenameSuffix}.xlsx`}
                  format="XLSX"
                  sublabel="Excel"
                />
              </div>
            </div>

            {mostrarSelectorAnios && (
              <div>
                <p className="text-[10px] uppercase tracking-[0.25em] text-[var(--dim-soft)] font-bold mb-2">
                  Filtrar por año
                </p>
                <div
                  role="group"
                  aria-label="Seleccionar año para descarga"
                  className={
                    'flex flex-wrap gap-1.5 ' +
                    (anios.length > 12 ? 'max-h-40 overflow-y-auto pr-1' : '')
                  }
                >
                  <YearChip
                    label="Todos"
                    active={anioFiltro === null}
                    onClick={() => setAnioFiltro(null)}
                  />
                  {anios.map((a) => (
                    <YearChip
                      key={a}
                      label={String(a)}
                      active={anioFiltro === a}
                      onClick={() => setAnioFiltro(a)}
                    />
                  ))}
                </div>
              </div>
            )}
          </aside>
        </div>

        {/* ─── Columnas del dataset (colapsable, full width) ──────── */}
        <details className="mt-8 pt-6 border-t border-[var(--card-border)] group">
          <summary className="cursor-pointer list-none flex items-center justify-between gap-4 text-[10px] uppercase tracking-[0.25em] text-[var(--dim-soft)] font-bold hover:text-[var(--ink)] transition-colors focus-visible:ring-2 focus-visible:ring-[var(--ink)] focus-visible:outline-none rounded-sm">
            <span>Columnas del dataset ({dataset.columnas.length})</span>
            <span
              aria-hidden="true"
              className="text-[var(--dim)] transition-transform group-open:rotate-180"
            >
              ▾
            </span>
          </summary>
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1.5">
            {dataset.columnas.map((c) => (
              <code
                key={c}
                className="text-[10px] font-mono-data text-[var(--dim)] bg-[var(--paper-deep)] border border-[var(--card-border)] px-2 py-1 rounded-sm truncate"
                title={c}
              >
                {c}
              </code>
            ))}
          </div>
        </details>
      </DataCard>
    </motion.article>
  )
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-[10px] uppercase tracking-[0.25em] text-[var(--dim-soft)] font-bold">
        {label}
      </p>
      {children}
    </div>
  )
}

function YearChip({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={
        'text-[11px] font-cal font-light tabular-nums px-2.5 py-1 rounded-sm border transition-colors focus-visible:ring-2 focus-visible:ring-[var(--ink)] focus-visible:outline-none ' +
        (active
          ? 'bg-[var(--ink)] text-[var(--paper-deep)] border-[var(--ink)]'
          : 'bg-transparent text-[var(--dim)] border-[var(--card-border)] hover:border-[var(--ink)] hover:text-[var(--ink)]')
      }
    >
      {label}
    </button>
  )
}

function Chip({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[var(--paper-deep)] border border-[var(--card-border)] px-3 py-2 rounded-sm">
      <div className="text-[8px] uppercase tracking-[0.25em] text-[var(--dim-soft)] font-bold mb-0.5">
        {label}
      </div>
      <div className="text-sm text-[var(--ink)] font-mono-data tabular-nums">
        {value}
      </div>
    </div>
  )
}

function DownloadButton({
  href,
  filename,
  format,
  sublabel,
  primary = false,
}: {
  href: string
  filename: string
  format: string
  sublabel?: string
  primary?: boolean
}) {
  const base =
    'group flex items-center justify-between gap-4 px-5 py-4 border rounded-sm transition-all duration-200 focus-visible:ring-2 focus-visible:ring-[var(--ink)] focus-visible:outline-none flex-1 min-w-0'
  const style = primary
    ? 'bg-[var(--ink)] text-[var(--paper-deep)] border-[var(--ink)] hover:opacity-80'
    : 'bg-transparent text-[var(--ink)] border-[var(--card-border)] hover:border-[var(--ink)]'

  return (
    <a
      href={href}
      download={filename}
      aria-label={`Descargar ${filename} (${format})`}
      className={`${base} ${style}`}
    >
      <div className="text-left">
        <div
          className="text-[9px] uppercase tracking-[0.25em] font-bold"
          style={{ opacity: primary ? 0.55 : 0.7 }}
        >
          Descargar
        </div>
        <div className="font-cal text-lg font-light leading-none mt-1">{format}</div>
        {sublabel && (
          <div
            className="text-[9px] font-mono-data mt-1"
            style={{ opacity: primary ? 0.55 : 0.6 }}
          >
            {sublabel}
          </div>
        )}
      </div>
      <span
        aria-hidden="true"
        className="text-xl transition-transform group-hover:translate-y-0.5"
      >
        ↓
      </span>
    </a>
  )
}
