// frontend/src/components/ui/ChartFrame.tsx
//
// Wrapper común para todos los gráficos Recharts.
// Garantiza padding, título, altura responsive y estilos de tooltip consistentes.
//
// Los presets de Recharts (tooltip/grid) se exponen como objetos para que
// las páginas los puedan esparcir directamente en sus componentes internos.

import type { ReactNode } from 'react'
import { DataCard } from './DataCard'
import { SectionTitle } from './SectionTitle'

interface Props {
  eyebrow: string
  title: ReactNode
  subtitle?: ReactNode
  children: ReactNode
  height?: number | string
  onInfoClick?: () => void
  footer?: ReactNode
  accent?: 'left' | 'top' | 'none'
  className?: string
}

export function ChartFrame({
  eyebrow,
  title,
  subtitle,
  children,
  height = 320,
  onInfoClick,
  footer,
  accent = 'left',
  className = '',
}: Props) {
  return (
    <DataCard accent={accent} padding="lg" as="section" className={className}>
      <SectionTitle
        eyebrow={eyebrow}
        title={title}
        subtitle={subtitle}
        onInfoClick={onInfoClick}
      />
      <div
        className="w-full"
        style={{ height: typeof height === 'number' ? `${height}px` : height }}
      >
        {children}
      </div>
      {footer && <div className="mt-4 pt-4 border-t border-[var(--card-border)]">{footer}</div>}
    </DataCard>
  )
}

// ─── Presets para Recharts ────────────────────────────────────────────────
// Pasar a los componentes Recharts con el spread operator.
// NOTA: al usar CSS vars en Recharts hay que inlinear (no class) — Recharts
// lee el valor estático de la prop, no recalcula al cambiar theme.
// La solución: usar valores absolutos o leer var() via getComputedStyle si
// se necesita reactividad. Aquí usamos los colores dark por default; el
// re-render al cambiar theme ocurre porque las páginas re-ejecutan.

export const chartTooltipStyle = {
  backgroundColor: 'var(--chart-tooltip-bg)',
  border: '1px solid var(--card-border)',
  borderRadius: '4px',
  fontSize: '12px',
  color: 'var(--ink)',
  fontFamily: 'JetBrains Mono, monospace',
} as const

export const chartTooltipItemStyle = {
  color: 'var(--ink)',
} as const

export const chartAxisTickStyle = {
  fontSize: 11,
  fill: 'var(--dim)',
  fontFamily: 'JetBrains Mono, monospace',
}

export const chartGridProps = {
  strokeDasharray: '3 3',
  stroke: 'var(--chart-grid)',
  vertical: false,
} as const
