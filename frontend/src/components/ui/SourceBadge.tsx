// frontend/src/components/ui/SourceBadge.tsx
//
// Chip: "FUENTE · GRANULARIDAD" + flag APROX opcional.
// Transparencia de origen + aproximación metodológica en un golpe de vista.

export type Granularidad = 'comunal' | 'regional' | 'nacional' | 'tribunal'

interface Props {
  source: 'CEAD' | 'DPP' | 'PDI' | 'FISCALIA' | 'PJUD'
  granularidad: Granularidad
  isApproximation?: boolean
  className?: string
}

const GRAN_LABEL: Record<Granularidad, string> = {
  comunal: 'Comunal',
  regional: 'Regional',
  nacional: 'Nacional',
  tribunal: 'Tribunal',
}

export function SourceBadge({
  source,
  granularidad,
  isApproximation = false,
  className = '',
}: Props) {
  return (
    <span
      className={
        'inline-flex items-center gap-1.5 text-[9px] uppercase tracking-[0.25em] font-bold border border-[var(--card-border)] px-2 py-1 rounded-sm text-[var(--dim)] ' +
        className
      }
    >
      <span className="text-[var(--ink)]">{source}</span>
      <span aria-hidden="true" className="text-[var(--rule-strong)]">·</span>
      <span>{GRAN_LABEL[granularidad]}</span>
      {isApproximation && (
        <>
          <span aria-hidden="true" className="text-[var(--rule-strong)]">·</span>
          <span
            className="text-[var(--ink)] tracking-[0.3em]"
            title="Valor aproximado por distribución proporcional"
          >
            Aprox
          </span>
        </>
      )}
    </span>
  )
}
