// frontend/src/components/SourceAttribution.tsx
//
// Componente reutilizable para atribuir cada valor mostrado al organismo
// oficial que lo publica. A11y WCAG 2.2 AA: cite semántico, aria-describedby,
// focus-visible, rel="noopener", contraste ≥4.5:1 sobre Jet #0a0a0a.
//
// Uso:
//   <SourceAttribution
//     organismo="Subsecretaría de Prevención del Delito"
//     fuenteUrl="https://cead.minsegpublica.gob.cl/"
//     snapshotUtc="2026-04-13T12:00:00Z"
//     caveat="Taxonomía cambió en 2024."
//     variant="card"
//   />

import { useId } from 'react'
import type { ReactNode } from 'react'

export interface SourceAttributionProps {
  organismo: string
  fuenteUrl: string
  snapshotUtc?: string
  caveat?: string
  variant?: 'inline' | 'card' | 'tooltip' | 'export-header'
  className?: string
}

function fmtSnapshot(iso?: string): string | undefined {
  if (!iso) return undefined
  return iso.replace('T', ' ').replace('Z', ' UTC')
}

function ExternalLink({
  href,
  children,
  describedBy,
}: {
  href: string
  children: ReactNode
  describedBy?: string
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-describedby={describedBy}
      className="group inline-flex items-center gap-1.5 underline decoration-[#3a3a3a]
                 hover:decoration-white underline-offset-4 transition-colors
                 focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none
                 rounded-sm"
    >
      {children}
      <span aria-hidden="true" className="text-[10px] opacity-50 group-hover:opacity-100">↗</span>
    </a>
  )
}

export function SourceAttribution({
  organismo,
  fuenteUrl,
  snapshotUtc,
  caveat,
  variant = 'card',
  className = '',
}: SourceAttributionProps) {
  const uid = useId()
  const caveatId = caveat ? `sa-caveat-${uid}` : undefined
  const snapshot = fmtSnapshot(snapshotUtc)

  if (variant === 'inline') {
    return (
      <span className={`text-xs text-[#b0b0b0] font-light ${className}`}>
        Fuente:{' '}
        <ExternalLink href={fuenteUrl} describedBy={caveatId}>
          <cite className="not-italic text-[#d0d0d0]">{organismo}</cite>
        </ExternalLink>
        {caveat && (
          <abbr
            id={caveatId}
            title={caveat}
            className="ml-1 cursor-help border-b border-dotted border-[#5a5a5a]"
          >
            ⚠
          </abbr>
        )}
      </span>
    )
  }

  if (variant === 'tooltip') {
    return (
      <div className={`text-[10px] text-[#a0a0a0] border-t border-[#ffffff1a] pt-1.5 mt-1.5 ${className}`}>
        <ExternalLink href={fuenteUrl}>
          <cite className="not-italic truncate max-w-[160px] inline-block">{organismo}</cite>
        </ExternalLink>
      </div>
    )
  }

  if (variant === 'export-header') {
    const text = [
      `# Fuente oficial: ${organismo}`,
      `# URL: ${fuenteUrl}`,
      snapshot && `# Snapshot: ${snapshot}`,
      caveat && `# Nota metodológica: ${caveat}`,
    ]
      .filter(Boolean)
      .join('\n')
    return <span hidden aria-hidden="true" className={className}>{text}</span>
  }

  // card (default)
  return (
    <div className={`relative pl-4 ${className}`}>
      <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#f8f8f6]" />
      <div className="space-y-2">
        <p className="text-[10px] uppercase tracking-[0.25em] text-[#7a7a7a] font-bold">
          Fuente oficial
        </p>
        <p className="text-sm text-[#d0d0d0] leading-relaxed font-light">
          <cite className="not-italic">{organismo}</cite>
        </p>
        <ExternalLink href={fuenteUrl} describedBy={caveatId}>
          <span className="font-mono text-[11px] text-[#e0e0e0] break-all">{fuenteUrl}</span>
        </ExternalLink>
        {snapshot && (
          <p className="font-mono text-[10px] text-[#5a5a5a]">Snapshot · {snapshot}</p>
        )}
        {caveat && (
          <p
            id={caveatId}
            className="text-xs text-[#a0a0a0] leading-relaxed font-light flex gap-2"
          >
            <span className="text-[#5a5a5a] shrink-0" aria-hidden="true">·</span>
            {caveat}
          </p>
        )}
      </div>
    </div>
  )
}
