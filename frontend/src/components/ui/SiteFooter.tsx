// frontend/src/components/ui/SiteFooter.tsx
//
// Footer unificado para páginas analíticas (DPP, PDI, Fiscalía, Datos).
// MapaPage NO lo usa (ocupa pantalla completa, sin footer).
//
// Estructura:
//   - línea horizontal (rule)
//   - organismo / fuente (izquierda)     SourceBadge (derecha)
//   - marca observatorio (izquierda)     disclaimer (derecha)

import type { ReactNode } from 'react'
import { SourceBadge, type Granularidad } from './SourceBadge'

interface Props {
  /** Texto primario (organismo emisor de los datos). */
  organismo: ReactNode
  /** Fuente a mostrar en el badge. */
  source?: 'CEAD' | 'DPP' | 'PDI' | 'FISCALIA' | 'PJUD'
  granularidad?: Granularidad
  /** Disclaimer corto (default: "Datos públicos · Uso libre con atribución"). */
  disclaimer?: string
}

const DEFAULT_DISCLAIMER = 'Datos públicos · Uso libre con atribución'

export function SiteFooter({
  organismo,
  source,
  granularidad,
  disclaimer = DEFAULT_DISCLAIMER,
}: Props) {
  return (
    <footer className="mt-16">
      <div className="h-px bg-[var(--card-border)] mb-6" />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <p className="text-[10px] uppercase tracking-[0.25em] text-[var(--dim)]">
          {organismo}
        </p>
        {source && granularidad && (
          <SourceBadge source={source} granularidad={granularidad} />
        )}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-4 text-[var(--dim-soft)]">
        <p className="text-[10px] uppercase tracking-[0.25em]">
          Observatorio Judicial Cannábico
        </p>
        <p className="text-[10px] uppercase tracking-[0.25em]">
          {disclaimer}
        </p>
      </div>
    </footer>
  )
}
