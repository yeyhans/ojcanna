// frontend/src/components/ui/DataCard.tsx
//
// Contenedor unificado para cards de datos. Accent bar a la izquierda
// (o arriba, según prop). Reemplaza el patrón ad-hoc `bg-[#1a1a1a] border`
// repartido por la app.

import type { ReactNode, HTMLAttributes } from 'react'

interface Props extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  accent?: 'left' | 'top' | 'none'
  accentStrong?: boolean
  padding?: 'sm' | 'md' | 'lg'
  as?: 'div' | 'section' | 'article'
}

const PADDINGS = {
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-6 sm:p-8',
}

export function DataCard({
  children,
  accent = 'left',
  accentStrong = false,
  padding = 'md',
  as: Tag = 'div',
  className = '',
  ...rest
}: Props) {
  const barColor = accentStrong ? 'var(--accent-bar)' : 'var(--rule-strong)'

  return (
    <Tag
      {...rest}
      className={
        'relative bg-[var(--paper-elev)] border border-[var(--card-border)] rounded-sm overflow-hidden ' +
        className
      }
    >
      {accent === 'left' && (
        <span
          aria-hidden="true"
          className="absolute left-0 top-0 bottom-0 w-[3px]"
          style={{ background: barColor }}
        />
      )}
      {accent === 'top' && (
        <span
          aria-hidden="true"
          className="absolute left-0 right-0 top-0 h-[3px]"
          style={{ background: barColor }}
        />
      )}
      <div
        className={
          PADDINGS[padding] +
          (accent === 'left' ? ' pl-6 sm:pl-8' : '') +
          (accent === 'top' ? ' pt-5 sm:pt-7' : '')
        }
      >
        {children}
      </div>
    </Tag>
  )
}
