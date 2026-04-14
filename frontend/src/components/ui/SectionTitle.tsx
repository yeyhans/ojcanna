// frontend/src/components/ui/SectionTitle.tsx
//
// Eyebrow + rule-mark + H2 + subtítulo + info button opcional.
// Patrón Deep Tech Premium — usar en toda sección de página analítica.

import type { ReactNode } from 'react'

interface Props {
  eyebrow: string
  title: ReactNode
  subtitle?: ReactNode
  onInfoClick?: () => void
  infoLabel?: string
  className?: string
}

export function SectionTitle({
  eyebrow,
  title,
  subtitle,
  onInfoClick,
  infoLabel = 'Información metodológica',
  className = '',
}: Props) {
  return (
    <div className={'mb-6 ' + className}>
      <div className="flex items-center gap-3 mb-3">
        <span className="rule-mark" aria-hidden="true" />
        <span className="text-label-deep">{eyebrow}</span>
        {onInfoClick && (
          <button
            type="button"
            onClick={onInfoClick}
            aria-label={infoLabel}
            className="ml-1 w-5 h-5 inline-flex items-center justify-center rounded-full border border-[var(--card-border)] text-[var(--dim)] hover:text-[var(--ink)] hover:border-[var(--ink)] transition-colors focus-visible:ring-2 focus-visible:ring-[var(--ink)] focus-visible:outline-none"
          >
            <span className="text-[9px] font-bold font-mono leading-none">i</span>
          </button>
        )}
      </div>
      <h2
        className="font-cal text-[var(--ink)] leading-tight"
        style={{
          fontSize: 'clamp(1.4rem, 3vw, 2rem)',
          fontWeight: 200,
          letterSpacing: '-0.02em',
        }}
      >
        {title}
      </h2>
      {subtitle && (
        <p className="text-sm text-[var(--dim)] mt-2 font-light leading-relaxed max-w-2xl">
          {subtitle}
        </p>
      )}
    </div>
  )
}
