// frontend/src/components/ui/PageShell.tsx
//
// Wrapper común para páginas analíticas: fondo paper-deep + dot-grid + padding.
// No incluye NavBar (es fija global en App.tsx). No aplica a MapaPage (que
// ocupa pantalla completa).

import type { ReactNode } from 'react'

interface Props {
  children: ReactNode
  /** Máximo ancho del contenido. Default: 7xl (1280px). */
  maxWidth?: 'md' | 'lg' | 'xl' | '2xl' | '4xl' | '5xl' | '7xl' | 'full'
  /** Ghost text gigante de fondo (DispensAI). Null para omitir. */
  ghostText?: string | null
  className?: string
}

const MAX_W: Record<NonNullable<Props['maxWidth']>, string> = {
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '4xl': 'max-w-4xl',
  '5xl': 'max-w-5xl',
  '7xl': 'max-w-7xl',
  full: 'max-w-full',
}

export function PageShell({
  children,
  maxWidth = '7xl',
  ghostText = null,
  className = '',
}: Props) {
  return (
    <div
      className={
        'min-h-full w-full text-[var(--ink)] bg-[var(--paper-deep)] dot-grid relative ' +
        className
      }
    >
      {ghostText && (
        <span
          aria-hidden="true"
          className="ghost-text absolute top-20 right-0 md:right-12 select-none"
        >
          {ghostText}
        </span>
      )}
      <div className={`${MAX_W[maxWidth]} mx-auto px-6 sm:px-10 py-12 sm:py-16 relative z-10`}>
        {children}
      </div>
    </div>
  )
}
