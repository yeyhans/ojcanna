import { useState } from 'react'
import { NavLink } from 'react-router-dom'

const NAV_LINKS = [
  { to: '/',         label: 'Mapa 20.000',   title: 'Detenciones policiales por comuna' },
  { to: '/dpp',      label: 'Defensoría',    title: 'Causas Ley 20.000 — DPP' },
  { to: '/fiscalia', label: 'Fiscalía',      title: 'Causas Ministerio Público — Ley 20.000' },
  { to: '/pdi',      label: 'PDI Analytics', title: 'Investigaciones PDI por región' },
  // HIDDEN — pendiente datos reales PJud (SAIP en gestión). Restaurar al recibir dataset:
  // { to: '/pjud',     label: 'Poder Judicial', title: 'Sentencias Ley 20.000 — discrecionalidad judicial' },
  // { to: '/embudo',   label: 'Embudo',        title: 'Embudo del Punitivismo — flujo CEAD→PDI→DPP→PJud' },
  { to: '/datos',    label: 'Datos',         title: 'Descargar bases de datos crudas' },
]

export function NavBar() {
  const [open, setOpen] = useState(false)

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `px-4 py-2 text-[10px] uppercase tracking-[0.2em] font-bold transition-all duration-300 relative group ${
      isActive ? 'text-[var(--ink)]' : 'text-[var(--dim)] hover:text-[var(--ink)]'
    }`

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 bg-[var(--paper-deep)]/80 backdrop-blur-xl border-b border-[var(--card-border)]"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div className="max-w-7xl mx-auto h-16 px-6 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div
            aria-hidden="true"
            className="w-8 h-8 rounded flex items-center justify-center font-cal text-lg"
            style={{ background: 'var(--ink)', color: 'var(--paper-deep)' }}
          >
            A
          </div>
          <span className="font-cal text-sm font-bold text-[var(--ink)] tracking-tight uppercase">
            Anonimous Canna <span className="text-[var(--dim)] font-normal">Observatorio</span>
          </span>
        </div>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-2">
          {NAV_LINKS.map(l => (
            <NavLink key={l.to} to={l.to} end={l.to === '/'} className={linkClass} title={l.title}>
              {({ isActive }) => (
                <>
                  {l.label}
                  {isActive && (
                    <span
                      className="absolute bottom-0 left-4 right-4 h-0.5 rounded-full"
                      style={{ background: 'var(--ink)' }}
                    />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </div>

        {/* Mobile: hamburger */}
        <div className="md:hidden flex items-center gap-2">
          <button
            className="w-10 h-10 flex flex-col items-center justify-center gap-1.5 rounded-full hover:bg-[var(--paper-elev)] transition-colors"
            onClick={() => setOpen(o => !o)}
            aria-label="Menú"
            aria-expanded={open}
          >
            <div
              className={`w-5 h-0.5 transition-all duration-300 ${open ? 'rotate-45 translate-y-2' : ''}`}
              style={{ background: 'var(--ink)' }}
            />
            <div
              className={`w-5 h-0.5 transition-all duration-300 ${open ? 'opacity-0' : ''}`}
              style={{ background: 'var(--ink)' }}
            />
            <div
              className={`w-5 h-0.5 transition-all duration-300 ${open ? '-rotate-45 -translate-y-2' : ''}`}
              style={{ background: 'var(--ink)' }}
            />
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <div
        className={`md:hidden absolute top-full left-0 right-0 bg-[var(--paper-deep)] border-b border-[var(--card-border)] transition-all duration-500 overflow-hidden ${
          open ? 'max-h-96 py-4' : 'max-h-0'
        }`}
      >
        <div className="px-6 flex flex-col gap-2">
          {NAV_LINKS.map(l => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.to === '/'}
              className="py-3 text-[11px] uppercase tracking-[0.2em] font-bold text-[var(--dim)]"
              onClick={() => setOpen(false)}
            >
              {l.label}
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  )
}
