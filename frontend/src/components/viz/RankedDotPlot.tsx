// frontend/src/components/viz/RankedDotPlot.tsx
//
// Dot plot horizontal ordenado por valor. Cada fila: label + barra ligera
// hasta el dot + valor numérico. Equivalente visual a Lollipop pero con
// un dot más destacado y la opción de múltiples series (ej. delitos vs
// denuncias vs víctimas en la misma fila).

interface SeriesPoint {
  seriesKey: string
  value: number
}

interface Row {
  label: string
  points: SeriesPoint[]
  total?: number
}

interface SeriesConfig {
  key: string
  label: string
  /** Tamaño del dot. */
  dotSize?: number
  /** Color override (fallback: paleta por índice). */
  color?: string
}

interface Props {
  rows: Row[]
  series: SeriesConfig[]
  formatValue?: (v: number) => string
  /** Orden descendente por total. */
  sortBy?: 'total' | 'none'
}

const DEFAULT_COLORS = [
  'var(--chart-1)',
  'var(--chart-3)',
  'var(--chart-4)',
]
const numberFmt = new Intl.NumberFormat('es-CL')

export function RankedDotPlot({
  rows,
  series,
  formatValue = (v) => numberFmt.format(Math.round(v)),
  sortBy = 'total',
}: Props) {
  const sorted =
    sortBy === 'total'
      ? [...rows].sort((a, b) => (b.total ?? 0) - (a.total ?? 0))
      : rows
  const max = Math.max(
    1,
    ...rows.flatMap((r) => r.points.map((p) => p.value)),
  )

  if (sorted.length === 0) {
    return <p className="text-[10px] uppercase tracking-widest text-[var(--dim-soft)] py-4">Sin datos</p>
  }

  return (
    <div className="w-full">
      {/* Leyenda de series */}
      <div className="flex flex-wrap gap-4 mb-4">
        {series.map((s, i) => (
          <div key={s.key} className="flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className="rounded-full"
              style={{
                width: s.dotSize ?? 10,
                height: s.dotSize ?? 10,
                background: s.color ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length],
              }}
            />
            <span className="text-[9px] uppercase tracking-[0.2em] font-bold text-[var(--dim)]">
              {s.label}
            </span>
          </div>
        ))}
      </div>

      <ul className="flex flex-col gap-2.5">
        {sorted.map((row) => (
          <li
            key={row.label}
            className="grid grid-cols-[minmax(140px,30%)_1fr_auto] items-center gap-3"
          >
            <span className="text-[11px] text-[var(--dim)] truncate" title={row.label}>
              {row.label}
            </span>
            <div className="relative h-3">
              <div
                aria-hidden="true"
                className="absolute inset-0 top-1/2 h-px -translate-y-1/2 bg-[var(--rule)]"
              />
              {row.points.map((p, i) => {
                const share = Math.max(0, Math.min(1, p.value / max))
                const cfg =
                  series.find((s) => s.key === p.seriesKey) ?? series[0]
                const color = cfg.color ?? DEFAULT_COLORS[series.findIndex((s) => s.key === p.seriesKey) % DEFAULT_COLORS.length]
                const dotSize = cfg.dotSize ?? 10
                return (
                  <div
                    key={p.seriesKey + i}
                    aria-hidden="true"
                    className="absolute top-1/2 -translate-y-1/2 rounded-full border border-[var(--paper-deep)]"
                    style={{
                      width: dotSize,
                      height: dotSize,
                      left: `calc(${share * 100}% - ${dotSize / 2}px)`,
                      background: color,
                    }}
                    title={`${cfg.label}: ${formatValue(p.value)}`}
                  />
                )
              })}
            </div>
            <span className="font-mono-data text-[11px] text-[var(--ink)]">
              {formatValue(row.total ?? row.points.reduce((a, b) => a + b.value, 0))}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
