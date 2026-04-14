// frontend/src/components/TaxonomyBanner.tsx
//
// Indicador de taxonomía vigente para el año seleccionado.
// CEAD cambió de DMCS_legacy (2005–2023) a Taxonomía 2024+ en el corte 2024.
// Las series NO son comparables sin cautela — este chip deja la advertencia
// permanentemente visible.

import { InfoTooltip } from './ui/InfoTooltip'

const TAXONOMY_CUTOFF = 2024

interface Props {
  anio: number | null
  className?: string
}

export function TaxonomyBanner({ anio, className = '' }: Props) {
  if (anio == null) return null
  const esLegacy = anio < TAXONOMY_CUTOFF
  const label = esLegacy ? 'DMCS Legacy · 2005–2023' : 'Taxonomía 2024+'
  const short = esLegacy ? 'DMCS' : '2024+'

  return (
    <div
      className={
        'inline-flex items-center gap-2 bg-[var(--paper-elev)]/80 backdrop-blur-md border border-[var(--card-border)] px-3 py-2 rounded-sm ' +
        className
      }
      role="status"
    >
      <span
        aria-hidden="true"
        className="w-1.5 h-1.5 rounded-full"
        style={{ background: esLegacy ? 'var(--dim-soft)' : 'var(--ink)' }}
      />
      <span className="text-[9px] uppercase tracking-[0.25em] font-bold text-[var(--dim)]">
        Taxonomía <span className="text-[var(--ink)]">{short}</span>
      </span>
      <InfoTooltip label="Cambio de taxonomía CEAD" position="bottom">
        <p className="mb-2">
          <strong className="text-[var(--ink)]">{label}</strong>
        </p>
        <p>
          CEAD cambió su taxonomía de delitos en 2024. Las series anteriores
          (DMCS_legacy, 2005–2023) usan categorías diferentes a las de
          Taxonomía 2024+. <strong>No son comparables</strong> sin nota
          metodológica.
        </p>
      </InfoTooltip>
    </div>
  )
}
