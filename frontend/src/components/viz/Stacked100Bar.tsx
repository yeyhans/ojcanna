// frontend/src/components/viz/Stacked100Bar.tsx
//
// Barra horizontal apilada al 100%. Reemplaza PieCharts con ≥6 categorías:
// más precisa perceptivamente (longitud > ángulo/área, Cleveland/McGill).
//
// Input: array de segmentos {label, value, color?}.
// Output: una sola barra con porcentajes dentro de cada segmento (si caben).

interface Segment {
  label: string
  value: number
}

interface Props {
  segments: Segment[]
  height?: number
  /** Paleta monocroma. Default: 5 tonos de chart-1..chart-5. */
  palette?: string[]
  /** Mostrar leyenda debajo. */
  showLegend?: boolean
  formatValue?: (v: number) => string
}

const DEFAULT_PALETTE = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
  'var(--rule-strong)',
]

const numberFmt = new Intl.NumberFormat('es-CL')

export function Stacked100Bar({
  segments,
  height = 48,
  palette = DEFAULT_PALETTE,
  showLegend = true,
  formatValue = (v) => numberFmt.format(v),
}: Props) {
  const total = segments.reduce((a, b) => a + b.value, 0)
  if (total === 0) {
    return (
      <div
        className="flex items-center justify-center text-[10px] uppercase tracking-widest text-[var(--dim-soft)]"
        style={{ height }}
      >
        Sin datos
      </div>
    )
  }

  const withShare = segments.map((s, i) => ({
    ...s,
    share: (s.value / total) * 100,
    color: palette[i % palette.length],
  }))

  return (
    <div className="w-full">
      <div
        className="flex w-full rounded-sm overflow-hidden border border-[var(--card-border)]"
        style={{ height }}
        role="img"
        aria-label={`Composición apilada: ${withShare
          .map((s) => `${s.label} ${s.share.toFixed(1)}%`)
          .join(', ')}`}
      >
        {withShare.map((s) => (
          <div
            key={s.label}
            className="flex items-center justify-center relative group"
            style={{
              width: `${s.share}%`,
              background: s.color,
              minWidth: s.share > 0 ? 2 : 0,
            }}
            title={`${s.label}: ${formatValue(s.value)} (${s.share.toFixed(1)}%)`}
          >
            {s.share >= 8 && (
              <span
                className="font-mono-data text-[10px] font-bold px-2 truncate"
                style={{
                  color: 'var(--paper-deep)',
                  mixBlendMode: 'difference',
                  filter: 'invert(1)',
                }}
              >
                {s.share.toFixed(0)}%
              </span>
            )}
          </div>
        ))}
      </div>

      {showLegend && (
        <div className="flex flex-wrap gap-x-5 gap-y-2 mt-4">
          {withShare.map((s) => (
            <div key={s.label} className="flex items-center gap-2 text-[11px]">
              <span
                aria-hidden="true"
                className="w-3 h-3 rounded-sm shrink-0"
                style={{ background: s.color }}
              />
              <span className="text-[var(--dim)] uppercase tracking-[0.1em] text-[9px] font-bold">
                {s.label}
              </span>
              <span className="font-mono-data text-[var(--ink)] text-[10px]">
                {formatValue(s.value)}
              </span>
              <span className="font-mono-data text-[var(--dim-soft)] text-[10px]">
                {s.share.toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
