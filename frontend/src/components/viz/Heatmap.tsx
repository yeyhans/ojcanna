// frontend/src/components/viz/Heatmap.tsx
//
// Heatmap 2D monocromo. Escala de 5 niveles desde --chart-5 (más claro) a
// --chart-1 (más intenso). Ideal para mostrar hotspots en estructuras
// (ej. región × categoría).
//
// Input: matriz de filas × columnas + función que extrae el valor.

import { useMemo } from 'react'

interface Cell {
  value: number | null
  label?: string
}

interface Props<R, C> {
  rows: R[]
  cols: C[]
  getKey: (r: R, c: C) => string
  getValue: (r: R, c: C) => number | null | undefined
  getRowLabel: (r: R) => string
  getColLabel: (c: C) => string
  formatValue?: (v: number) => string
  /** Altura de cada celda en px. */
  cellHeight?: number
  /** Ancho mínimo de cada celda en px. */
  minCellWidth?: number
  className?: string
}

const PALETTE = [
  'var(--chart-5)', // menor intensidad
  'var(--chart-4)',
  'var(--chart-3)',
  'var(--chart-2)',
  'var(--chart-1)', // mayor intensidad
]

const numberFmt = new Intl.NumberFormat('es-CL')

function intensityClass(value: number | null, max: number): string {
  if (value == null || value === 0 || max === 0) return 'var(--rule)'
  const share = value / max
  if (share < 0.2) return PALETTE[0]
  if (share < 0.4) return PALETTE[1]
  if (share < 0.6) return PALETTE[2]
  if (share < 0.8) return PALETTE[3]
  return PALETTE[4]
}

export function Heatmap<R, C>({
  rows,
  cols,
  getValue,
  getRowLabel,
  getColLabel,
  formatValue = (v) => numberFmt.format(Math.round(v)),
  cellHeight = 32,
  minCellWidth = 72,
  className = '',
}: Props<R, C>) {
  // Matriz precomputada + máximo
  const matrix = useMemo(() => {
    let max = 0
    const data: Cell[][] = rows.map((r) =>
      cols.map((c) => {
        const v = getValue(r, c)
        const val = v == null || Number.isNaN(v) ? null : Number(v)
        if (val != null && val > max) max = val
        return { value: val }
      }),
    )
    return { data, max }
  }, [rows, cols, getValue])

  if (rows.length === 0 || cols.length === 0) {
    return (
      <p className="text-[10px] uppercase tracking-widest text-[var(--dim-soft)] py-4">
        Sin datos
      </p>
    )
  }

  return (
    <div className={'w-full overflow-x-auto ' + className}>
      <table className="border-separate border-spacing-0.5">
        <thead>
          <tr>
            <th aria-hidden="true" style={{ minWidth: 140 }} />
            {cols.map((c) => (
              <th
                key={getColLabel(c)}
                scope="col"
                className="text-[9px] uppercase tracking-[0.2em] font-bold text-[var(--dim)] px-2 pb-2 text-center"
                style={{ minWidth: minCellWidth }}
              >
                {getColLabel(c)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, ri) => (
            <tr key={getRowLabel(r)}>
              <th
                scope="row"
                className="text-[11px] text-[var(--dim)] text-left pr-3 font-normal truncate"
                style={{ minWidth: 140, maxWidth: 200 }}
                title={getRowLabel(r)}
              >
                {getRowLabel(r)}
              </th>
              {cols.map((c, ci) => {
                const cell = matrix.data[ri][ci]
                const color = intensityClass(cell.value, matrix.max)
                const share = cell.value != null && matrix.max > 0 ? cell.value / matrix.max : 0
                // Texto del valor: claro sobre fondo oscuro y viceversa.
                const textColor =
                  share > 0.55 ? 'var(--paper-deep)' : 'var(--ink)'
                return (
                  <td
                    key={getKeySafe(ri, ci)}
                    style={{
                      background: color,
                      height: cellHeight,
                      minWidth: minCellWidth,
                    }}
                    className="text-center align-middle"
                    title={
                      cell.value != null
                        ? `${getRowLabel(r)} · ${getColLabel(c)}: ${formatValue(cell.value)}`
                        : `${getRowLabel(r)} · ${getColLabel(c)}: sin datos`
                    }
                  >
                    {cell.value != null && (
                      <span
                        className="text-[10px] font-mono-data tabular-nums"
                        style={{ color: textColor }}
                      >
                        {formatValue(cell.value)}
                      </span>
                    )}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function getKeySafe(ri: number, ci: number): string {
  return `${ri}-${ci}`
}
