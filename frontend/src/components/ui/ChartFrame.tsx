// frontend/src/components/ui/ChartFrame.tsx
//
// Wrapper común para todos los gráficos Recharts.
// Garantiza padding, título, altura responsive y estilos de tooltip consistentes.
//
// Los presets de Recharts (tooltip/grid) viven en chartPresets.ts y se exponen
// desde el barrel para que las páginas los esparzan en sus componentes.

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
