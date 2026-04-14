// frontend/src/components/viz/Lollipop.tsx
//
// Lollipop chart con HTML + flexbox. Alternativa más elegante que barra
// horizontal para rankings >8 categorías: la línea + punto reduce el peso
// visual y el número vive fuera de la barra. Cleveland/Mcgill friendly.
//
// Implementación HTML (no SVG) → responsive gratis, accesible con screen
// readers vía aria-label.

interface Item {
  label: string
  value: number
}

interface Props {
  data: Item[]
  /** Formato del valor (default: Intl locale es-CL, entero). */
  formatValue?: (v: number) => string
  /** Orden descendente por value antes de renderizar. */
  sortDesc?: boolean
  /** Tamaño del dot en px. */
  dotSize?: number
}

const numberFmt = new Intl.NumberFormat('es-CL')

export function Lollipop({
  data,
  formatValue = (v) => numberFmt.format(Math.round(v)),
  sortDesc = true,
  dotSize = 10,
}: Props) {
  const rows = sortDesc ? [...data].sort((a, b) => b.value - a.value) : data
  const max = Math.max(1, ...rows.map((r) => r.value))

  if (rows.length === 0) {
    return (
      <div className="text-[10px] uppercase tracking-widest text-[var(--dim-soft)] py-4">
        Sin datos
      </div>
    )
  }

  return (
    <ul
      className="w-full flex flex-col gap-2"
      role="list"
      aria-label={`Ranking: ${rows.map((r) => `${r.label} ${formatValue(r.value)}`).join(', ')}`}
    >
      {rows.map((row) => {
        const share = Math.max(0, Math.min(1, row.value / max))
        return (
          <li
            key={row.label}
            className="grid grid-cols-[minmax(120px,35%)_1fr_auto] items-center gap-3"
          >
            {/* Label */}
            <span
              className="text-[11px] text-[var(--dim)] truncate"
              title={row.label}
            >
              {row.label}
            </span>

            {/* Track + line + dot */}
            <div className="relative h-2 w-full">
              <div
                aria-hidden="true"
                className="absolute inset-0 top-1/2 h-px -translate-y-1/2 bg-[var(--rule)]"
              />
              <div
                aria-hidden="true"
                className="absolute top-1/2 -translate-y-1/2 h-[2px] bg-[var(--ink)]"
                style={{ width: `${share * 100}%`, left: 0 }}
              />
              <div
                aria-hidden="true"
                className="absolute top-1/2 -translate-y-1/2 rounded-full bg-[var(--ink)]"
                style={{
                  width: dotSize,
                  height: dotSize,
                  left: `calc(${share * 100}% - ${dotSize / 2}px)`,
                }}
              />
            </div>

            {/* Value */}
            <span className="font-mono-data text-[11px] text-[var(--ink)] tabular-nums">
              {formatValue(row.value)}
            </span>
          </li>
        )
      })}
    </ul>
  )
}
