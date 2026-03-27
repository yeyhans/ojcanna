// frontend/src/components/NavBar.tsx
import { useState } from 'react'
import { NavLink } from 'react-router-dom'

const NAV_LINKS = [
  { to: '/',       label: 'Mapa CEAD',     title: 'Detenciones policiales por comuna' },
  { to: '/dpp',    label: 'Defensoría',    title: 'Causas Ley 20.000 — DPP' },
  { to: '/pdi',    label: 'PDI',           title: 'Investigaciones PDI por región' },
  { to: '/embudo', label: 'Embudo',        title: 'Embudo del Punitivismo' },
]

export function NavBar() {
  const [open, setOpen] = useState(false)

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    [
      'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap',
      isActive
        ? 'bg-blue-600 text-white shadow-sm'
        : 'text-slate-600 hover:text-slate-900 hover:bg-white/60',
    ].join(' ')

  return (
    <nav className="
      fixed top-0 left-0 right-0 z-50
      bg-white/75 backdrop-blur-md
      border-b border-white/40
      shadow-sm shadow-slate-200/50
    " style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <div className="max-w-6xl mx-auto h-12 px-4 flex items-center justify-between gap-4">
        {/* Brand */}
        <span className="text-sm font-bold text-slate-800 tracking-tight shrink-0">
          Observatorio Judicial Cannábico
        </span>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map(l => (
            <NavLink key={l.to} to={l.to} end={l.to === '/'} className={linkClass} title={l.title}>
              {l.label}
            </NavLink>
          ))}
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden min-w-[44px] min-h-[44px] flex flex-col items-center justify-center gap-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          onClick={() => setOpen(o => !o)}
          aria-label="Menú"
          aria-expanded={open}
        >
          <span className={`block w-5 h-0.5 bg-slate-600 transition-transform ${open ? 'rotate-45 translate-y-2' : ''}`} />
          <span className={`block w-5 h-0.5 bg-slate-600 transition-opacity ${open ? 'opacity-0' : ''}`} />
          <span className={`block w-5 h-0.5 bg-slate-600 transition-transform ${open ? '-rotate-45 -translate-y-2' : ''}`} />
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden bg-white/95 backdrop-blur-md border-t border-slate-100 px-4 py-3 flex flex-col gap-1">
          {NAV_LINKS.map(l => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.to === '/'}
              className={linkClass}
              onClick={() => setOpen(false)}
            >
              {l.label}
            </NavLink>
          ))}
        </div>
      )}
    </nav>
  )
}
