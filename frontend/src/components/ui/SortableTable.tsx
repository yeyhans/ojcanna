// frontend/src/components/ui/SortableTable.tsx
//
// Tabla ordenable + accesible + con export CSV.
//
// - Click o Enter/Space en header ordena por esa columna.
// - Ciclo: sin orden → desc → asc → desc (default inicial: initialSort).
// - Sort estable (se guarda el índice original como tiebreaker).
// - Números en font-mono con tabular-nums.
// - Mobile: si hay >4 columnas o mobileLayout="cards", renderiza cards
//   con label+value apilado.
// - exportCsv: botón en header exporta data ordenada actual.
//
// La data original NO se muta — se trabaja sobre copia.

import { useMemo, useState, useCallback } from 'react'
import type { ReactNode, KeyboardEvent } from 'react'

export type ColumnFormat = 'integer' | 'decimal' | 'percent' | 'text' | 'raw'
export type ColumnAlign = 'left' | 'right' | 'center'

export interface SortableColumn<T> {
  key: string
  label: string
  /** Valor usado para ordenar. Si omite, intenta `row[key]`. */
  accessor?: (row: T) => number | string | null | undefined
  /** Render de la celda. Si omite, usa el valor formateado con `format`. */
  render?: (row: T, value: unknown) => ReactNode
  sortable?: boolean
  align?: ColumnAlign
  format?: ColumnFormat
  /** Ancho preferido (CSS, ej. "120px"). */
  width?: string
  /** Mostrar solo en desktop. */
  hiddenOnMobile?: boolean
}

export interface SortState {
  key: string
  direction: 'asc' | 'desc'
}

interface Props<T> {
  columns: SortableColumn<T>[]
  data: T[]
  /** Columna a la que se ordena por default. */
  initialSort?: SortState
  /** Click en una fila. Cursor-pointer se activa si pasás esto. */
  onRowClick?: (row: T) => void
  /** Key estable por fila para React. */
  rowKey: (row: T, index: number) => string
  mobileLayout?: 'cards' | 'table'
  stickyHeader?: boolean
  exportCsv?: boolean
  exportFilename?: string
  caption?: string
  className?: string
  emptyMessage?: string
}

const numberFmt = new Intl.NumberFormat('es-CL')
const percentFmt = new Intl.NumberFormat('es-CL', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 2,
})

function formatValue(value: unknown, format: ColumnFormat = 'text'): string {
  if (value == null) return '—'
  if (format === 'integer') {
    const n = Number(value)
    return Number.isFinite(n) ? numberFmt.format(Math.round(n)) : String(value)
  }
  if (format === 'decimal') {
    const n = Number(value)
    return Number.isFinite(n)
      ? n.toLocaleString('es-CL', { minimumFractionDigits: 1, maximumFractionDigits: 2 })
      : String(value)
  }
  if (format === 'percent') {
    const n = Number(value)
    return Number.isFinite(n) ? `${percentFmt.format(n)}%` : String(value)
  }
  return String(value)
}

function compareValues(a: unknown, b: unknown): number {
  if (a == null && b == null) return 0
  if (a == null) return 1
  if (b == null) return -1
  if (typeof a === 'number' && typeof b === 'number') return a - b
  const an = Number(a)
  const bn = Number(b)
  if (Number.isFinite(an) && Number.isFinite(bn)) return an - bn
  return String(a).localeCompare(String(b), 'es-CL', { numeric: true, sensitivity: 'base' })
}

function ariaSortFor(col: SortableColumn<unknown>, sort: SortState | null): 'ascending' | 'descending' | 'none' {
  if (!col.sortable) return 'none'
  if (!sort || sort.key !== col.key) return 'none'
  return sort.direction === 'asc' ? 'ascending' : 'descending'
}

function rowsToCsv<T>(columns: SortableColumn<T>[], rows: T[]): string {
  const escape = (v: unknown) => {
    const s = v == null ? '' : String(v)
    if (s.includes('"') || s.includes(',') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`
    }
    return s
  }
  const header = columns.map(c => escape(c.label)).join(',')
  const body = rows
    .map(r =>
      columns
        .map(c => {
          const v = c.accessor ? c.accessor(r) : (r as Record<string, unknown>)[c.key]
          return escape(v)
        })
        .join(','),
    )
    .join('\n')
  return `${header}\n${body}`
}

function downloadCsv(filename: string, csv: string) {
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function SortableTable<T>({
  columns,
  data,
  initialSort,
  onRowClick,
  rowKey,
  mobileLayout = 'table',
  stickyHeader = false,
  exportCsv = false,
  exportFilename = 'export.csv',
  caption,
  className = '',
  emptyMessage = 'Sin datos',
}: Props<T>) {
  const [sort, setSort] = useState<SortState | null>(initialSort ?? null)

  const sortedData = useMemo(() => {
    if (!sort) return [...data]
    const col = columns.find(c => c.key === sort.key)
    if (!col) return [...data]
    const accessor = col.accessor ?? ((row: T) => (row as Record<string, unknown>)[col.key])
    const dir = sort.direction === 'asc' ? 1 : -1
    // Usamos índice original como tiebreaker para garantizar sort estable.
    const indexed = data.map((row, idx) => ({ row, idx }))
    indexed.sort((a, b) => {
      const cmp = compareValues(accessor(a.row), accessor(b.row))
      return cmp !== 0 ? cmp * dir : a.idx - b.idx
    })
    return indexed.map(x => x.row)
  }, [data, sort, columns])

  const toggleSort = useCallback(
    (col: SortableColumn<T>) => {
      if (!col.sortable) return
      setSort(curr => {
        if (!curr || curr.key !== col.key) return { key: col.key, direction: 'desc' }
        if (curr.direction === 'desc') return { key: col.key, direction: 'asc' }
        return { key: col.key, direction: 'desc' }
      })
    },
    [],
  )

  const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>, col: SortableColumn<T>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      toggleSort(col)
    }
  }

  const onExport = () => {
    const csv = rowsToCsv(columns, sortedData)
    downloadCsv(exportFilename, csv)
  }

  const desktopColumns = columns
  const mobileColumns = columns.filter(c => !c.hiddenOnMobile)

  const shouldUseCards = mobileLayout === 'cards' || desktopColumns.length > 5

  return (
    <div className={'w-full ' + className}>
      {(caption || exportCsv) && (
        <div className="flex items-center justify-between gap-4 mb-3 px-1">
          {caption && <p className="text-label-deep">{caption}</p>}
          {exportCsv && (
            <button
              type="button"
              onClick={onExport}
              className="text-[10px] uppercase tracking-[0.2em] font-bold text-[var(--dim)] hover:text-[var(--ink)] border border-[var(--card-border)] hover:border-[var(--ink)] px-3 py-1.5 rounded-sm transition-colors focus-visible:ring-2 focus-visible:ring-[var(--ink)] focus-visible:outline-none"
              aria-label="Descargar datos como CSV"
            >
              ↓ CSV
            </button>
          )}
        </div>
      )}

      {/* Desktop table */}
      <div
        className={
          (shouldUseCards ? 'hidden md:block ' : '') +
          'overflow-x-auto border border-[var(--card-border)] rounded-sm bg-[var(--paper-elev)]'
        }
      >
        <table className="w-full text-sm">
          <thead
            className={
              'bg-[var(--paper-deep)] border-b border-[var(--card-border)] ' +
              (stickyHeader ? 'sticky top-0 z-10 ' : '')
            }
          >
            <tr>
              {desktopColumns.map(col => {
                const isSortedColumn = sort?.key === col.key
                const dir = isSortedColumn ? sort.direction : null
                return (
                  <th
                    key={col.key}
                    scope="col"
                    aria-sort={ariaSortFor(col as SortableColumn<unknown>, sort)}
                    style={col.width ? { width: col.width } : undefined}
                    className={
                      'px-4 py-3 text-[10px] uppercase tracking-[0.2em] font-bold text-[var(--dim)] ' +
                      (col.align === 'right'
                        ? 'text-right'
                        : col.align === 'center'
                          ? 'text-center'
                          : 'text-left')
                    }
                  >
                    {col.sortable ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(col)}
                        onKeyDown={e => handleKeyDown(e, col)}
                        className={
                          'inline-flex items-center gap-1.5 group hover:text-[var(--ink)] transition-colors focus-visible:ring-2 focus-visible:ring-[var(--ink)] focus-visible:outline-none rounded-sm ' +
                          (isSortedColumn ? 'text-[var(--ink)]' : '')
                        }
                      >
                        <span>{col.label}</span>
                        <span
                          aria-hidden="true"
                          className={
                            'text-[9px] font-mono transition-opacity ' +
                            (isSortedColumn ? 'opacity-100' : 'opacity-40 group-hover:opacity-80')
                          }
                        >
                          {dir === 'asc' ? '↑' : dir === 'desc' ? '↓' : '⇅'}
                        </span>
                      </button>
                    ) : (
                      col.label
                    )}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--card-border)]">
            {sortedData.length === 0 ? (
              <tr>
                <td
                  colSpan={desktopColumns.length}
                  className="px-4 py-8 text-center text-[11px] text-[var(--dim-soft)] uppercase tracking-widest"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              sortedData.map((row, idx) => (
                <tr
                  key={rowKey(row, idx)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={
                    'transition-colors ' +
                    (onRowClick ? 'cursor-pointer hover:bg-[var(--paper-deep)] ' : 'hover:bg-[var(--paper-deep)] ')
                  }
                >
                  {desktopColumns.map(col => {
                    const rawValue = col.accessor
                      ? col.accessor(row)
                      : (row as Record<string, unknown>)[col.key]
                    const isNumeric =
                      col.format === 'integer' || col.format === 'decimal' || col.format === 'percent'
                    const cellContent = col.render
                      ? col.render(row, rawValue)
                      : formatValue(rawValue, col.format ?? 'text')
                    return (
                      <td
                        key={col.key}
                        className={
                          'px-4 py-3 ' +
                          (col.align === 'right'
                            ? 'text-right '
                            : col.align === 'center'
                              ? 'text-center '
                              : 'text-left ') +
                          (isNumeric ? 'font-mono-data text-[var(--ink)] ' : 'text-[var(--ink)] ')
                        }
                      >
                        {cellContent}
                      </td>
                    )
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      {shouldUseCards && (
        <div className="md:hidden space-y-2">
          {sortedData.length === 0 ? (
            <div className="p-6 text-center text-[11px] text-[var(--dim-soft)] uppercase tracking-widest border border-[var(--card-border)] rounded-sm">
              {emptyMessage}
            </div>
          ) : (
            sortedData.map((row, idx) => (
              <div
                key={rowKey(row, idx)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={
                  'bg-[var(--paper-elev)] border border-[var(--card-border)] rounded-sm p-4 transition-colors ' +
                  (onRowClick ? 'cursor-pointer hover:border-[var(--ink)]' : '')
                }
              >
                {mobileColumns.map(col => {
                  const rawValue = col.accessor
                    ? col.accessor(row)
                    : (row as Record<string, unknown>)[col.key]
                  const isNumeric =
                    col.format === 'integer' || col.format === 'decimal' || col.format === 'percent'
                  const cellContent = col.render
                    ? col.render(row, rawValue)
                    : formatValue(rawValue, col.format ?? 'text')
                  return (
                    <div
                      key={col.key}
                      className="flex items-center justify-between gap-4 py-1.5 first:pt-0 last:pb-0"
                    >
                      <span className="text-[9px] uppercase tracking-[0.2em] font-bold text-[var(--dim-soft)]">
                        {col.label}
                      </span>
                      <span
                        className={
                          'text-sm ' +
                          (isNumeric ? 'font-mono-data text-[var(--ink)]' : 'text-[var(--ink)]')
                        }
                      >
                        {cellContent}
                      </span>
                    </div>
                  )
                })}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
