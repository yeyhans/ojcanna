// frontend/src/components/ui/KpiCard.tsx
//
// KPI card unificado. Valor en JetBrains Mono + weight 200.
// Soporta marcador APROX cuando la cifra es aproximada.

import type { ReactNode } from 'react'
import { DataCard } from './DataCard'

interface Props {
  label: string
  value: string
  sublabel?: ReactNode
  accent?: boolean
  isApproximation?: boolean
  className?: string
  /**
   * La cifra todavía no llegó del backend. Muestra una barra en carga en lugar
   * del valor: un guion suelto se lee como "no hay dato", que es una afirmación
   * distinta y falsa mientras la request sigue viva.
   */
  loading?: boolean
}

export function KpiCard({
  label,
  value,
  sublabel,
  accent = false,
  isApproximation = false,
  className = '',
  loading = false,
}: Props) {
  return (
    <DataCard accent="left" accentStrong={accent} padding="md" className={className}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <p className="text-[10px] uppercase tracking-[0.25em] text-[var(--dim-soft)] font-bold">
          {label}
        </p>
        {isApproximation && (
          <span
            className="text-[8px] uppercase tracking-[0.2em] font-bold text-[var(--dim)] border border-[var(--rule-strong)] px-1.5 py-0.5 rounded-sm"
            title="Valor aproximado por distribución proporcional regional"
          >
            Aprox
          </span>
        )}
      </div>
      <p
        className="font-mono-data text-[var(--ink)] mb-1"
        style={{
          fontSize: 'clamp(1.8rem, 4vw, 2.6rem)',
          fontWeight: 300,
          letterSpacing: '-0.02em',
          lineHeight: 1,
        }}
        aria-busy={loading || undefined}
      >
        {loading ? (
          <span
            className="block h-[0.8em] w-3/5 animate-pulse rounded-sm bg-[var(--dim-soft)] opacity-25"
            role="status"
            aria-label="Cargando cifra"
          />
        ) : (
          value
        )}
      </p>
      {sublabel && (
        <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--dim-soft)] mt-2">
          {sublabel}
        </p>
      )}
    </DataCard>
  )
}
