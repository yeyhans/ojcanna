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
}

export function KpiCard({
  label,
  value,
  sublabel,
  accent = false,
  isApproximation = false,
  className = '',
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
      >
        {value}
      </p>
      {sublabel && (
        <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--dim-soft)] mt-2">
          {sublabel}
        </p>
      )}
    </DataCard>
  )
}
