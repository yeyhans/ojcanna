// frontend/src/components/ui/InfoTooltip.tsx
//
// Icono "i" que al hover/focus muestra popover con metodología.
// Obligatorio en cualquier viz aproximada (ver SourceBadge APROX).

import { useState, useRef, useEffect } from 'react'
import type { ReactNode } from 'react'

interface Props {
  label: string
  children: ReactNode
  position?: 'top' | 'bottom'
}

export function InfoTooltip({ label, children, position = 'top' }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onEsc)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onEsc)
    }
  }, [open])

  return (
    <div ref={ref} className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        onMouseEnter={() => setOpen(true)}
        aria-label={label}
        aria-expanded={open}
        className="w-5 h-5 inline-flex items-center justify-center rounded-full border border-[var(--card-border)] text-[var(--dim)] hover:text-[var(--ink)] hover:border-[var(--ink)] transition-colors focus-visible:ring-2 focus-visible:ring-[var(--ink)] focus-visible:outline-none"
      >
        <span className="text-[9px] font-bold font-mono leading-none">i</span>
      </button>
      {open && (
        <div
          role="tooltip"
          className={
            'absolute left-1/2 -translate-x-1/2 z-50 w-64 p-3 bg-[var(--paper-elev)] border border-[var(--card-border)] rounded-sm shadow-lg text-[11px] leading-relaxed text-[var(--dim)] ' +
            (position === 'top' ? 'bottom-full mb-2' : 'top-full mt-2')
          }
        >
          {children}
        </div>
      )}
    </div>
  )
}
