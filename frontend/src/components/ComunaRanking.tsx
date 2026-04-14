// frontend/src/components/ComunaRanking.tsx
//
// Ranking compacto de comunas derivado del FeatureCollection CEAD ya en memoria.
// Se renderiza dentro del FilterPanel en desktop.
// - Click en fila → selecciona comuna (onSelect callback).
// - Sort por frecuencia o tasa — usa SortableTable.

import { useMemo } from 'react'
import type { CeadFeatureCollection } from '../types/cead'
import { SortableTable, type SortableColumn } from './ui/SortableTable'

interface Row {
  cut: string
  nombre: string
  frecuencia_total: number
  tasa_agregada: number
}

interface Props {
  geojson: CeadFeatureCollection | null
  top?: number
  onSelect?: (cut: string, nombre: string) => void
}

const COLUMNS: SortableColumn<Row>[] = [
  {
    key: 'nombre',
    label: 'Comuna',
    sortable: true,
    align: 'left',
    format: 'text',
  },
  {
    key: 'frecuencia_total',
    label: 'Detenciones',
    sortable: true,
    align: 'right',
    format: 'integer',
  },
  {
    key: 'tasa_agregada',
    label: 'Tasa ×100k',
    sortable: true,
    align: 'right',
    format: 'decimal',
    hiddenOnMobile: true,
  },
]

export function ComunaRanking({ geojson, top = 20, onSelect }: Props) {
  const rows = useMemo<Row[]>(() => {
    if (!geojson) return []
    return geojson.features
      .map(f => f.properties)
      .filter(p => p.frecuencia_total > 0)
      .map(p => ({
        cut: p.cut,
        nombre: p.nombre,
        frecuencia_total: p.frecuencia_total,
        tasa_agregada: p.tasa_agregada,
      }))
      .sort((a, b) => b.frecuencia_total - a.frecuencia_total)
      .slice(0, top)
  }, [geojson, top])

  if (rows.length === 0) return null

  return (
    <SortableTable
      columns={COLUMNS}
      data={rows}
      rowKey={r => r.cut}
      initialSort={{ key: 'frecuencia_total', direction: 'desc' }}
      onRowClick={onSelect ? r => onSelect(r.cut, r.nombre) : undefined}
      caption={`Top ${top} · ranking comunal`}
      mobileLayout="table"
      className="text-[11px]"
    />
  )
}
