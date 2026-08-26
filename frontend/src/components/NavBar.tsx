import { useEffect, useRef, useState } from 'react'
import { NavLink, Link, useLocation } from 'react-router-dom'
import { GROUP_LABEL, visibleRoutesByGroup, type RouteGroup } from '../routes'

/**
 * NavBar agrupada por capa de la arquitectura de información.
 *
 * Antes era una lista plana de 5 links nombrados por institución
 * ("Defensoría / Fiscalía / PDI Analytics") — organigrama del Estado, no la
 * pregunta del ciudadano, y sin espacio para las rutas del marco legal.
 * Ahora los grupos vienen de `routes.ts`, que es la fuente única compartida
 * con el ruteo y el tema.
 */
export function NavBar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [openGroup, setOpenGroup] = useState<RouteGroup | null>(null)
  const location = useLocation()
  const groups = visibleRoutesByGroup()
  const navRef = useRef<HTMLElement>(null)

  // Cerrar menús al navegar.
  useEffect(() => {
    setMobileOpen(false)
    setOpenGroup(null)
  }, [location.pathname])

  // Cerrar el dropdown con click afuera o Escape.
  useEffect(() => {
    if (!openGroup) return

    function onPointerDown(e: MouseEvent) {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setOpenGroup(null)
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpenGroup(null)
    }

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [openGroup])

  const itemClass = ({ isActive }: { isActive: boolean }) =>
    `block px-4 py-2.5 text-[10px] uppercase tracking-[0.2em] font-bold transition-colors ${
      isActive
        ? 'text-[var(--ink)] bg-[var(--paper-elev)]'
        : 'text-[var(--dim)] hover:text-[var(--ink)] hover:bg-[var(--paper-elev)]'
    }`

  return (
    <nav
      ref={navRef}
      className="fixed top-0 left-0 right-0 z-50 bg-[var(--paper-deep)]/80 backdrop-blur-xl border-b border-[var(--card-border)]"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div className="max-w-7xl mx-auto h-16 px-6 flex items-center justify-between">
        {/* Brand — alineado con el dominio transparencia.dispensai.cl */}
        <Link to="/" className="flex items-center gap-3 group" title="Portada del observatorio">
          <div
            aria-hidden="true"
            className="w-8 h-8 rounded flex items-center justify-center font-cal text-lg shrink-0"
            style={{ background: 'var(--ink)', color: 'var(--paper-deep)' }}
          >
            D
          </div>
          <span className="font-cal text-sm font-bold text-[var(--ink)] tracking-tight uppercase leading-none">
            DispensAI{' '}
            <span className="text-[var(--dim)] font-normal">Transparencia</span>
          </span>
        </Link>

        {/* Desktop — un botón por grupo, con dropdown */}
        <div className="hidden md:flex items-center gap-1">
          {groups.map(({ group, routes }) => {
            const isCurrent = routes.some((r) => r.path === location.pathname)
            const isOpen = openGroup === group

            return (
              <div key={group} className="relative">
                <button
                  type="button"
                  onClick={() => setOpenGroup(isOpen ? null : group)}
                  aria-expanded={isOpen}
                  aria-haspopup="true"
                  className={`px-4 py-2 text-[10px] uppercase tracking-[0.2em] font-bold transition-colors relative ${
                    isCurrent || isOpen
                      ? 'text-[var(--ink)]'
                      : 'text-[var(--dim)] hover:text-[var(--ink)]'
                  }`}
                >
                  {GROUP_LABEL[group]}
                  {isCurrent && (
                    <span
                      className="absolute bottom-0 left-4 right-4 h-0.5 rounded-full"
                      style={{ background: 'var(--ink)' }}
                    />
                  )}
                </button>

                {isOpen && (
                  <div
                    className="absolute right-0 top-full mt-1 min-w-[15rem] bg-[var(--paper-deep)] border border-[var(--card-border)] rounded-sm shadow-2xl overflow-hidden"
                    role="menu"
                  >
                    {routes.map((r) => (
                      <NavLink
                        key={r.path}
                        to={r.path}
                        className={itemClass}
                        title={r.title}
                        role="menuitem"
                      >
                        {r.label}
                        <span className="block mt-1 text-[9px] normal-case tracking-normal font-normal text-[var(--dim-soft)]">
                          {r.title}
                        </span>
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Mobile: hamburger */}
        <div className="md:hidden flex items-center gap-2">
          <button
            className="w-10 h-10 flex flex-col items-center justify-center gap-1.5 rounded-full hover:bg-[var(--paper-elev)] transition-colors"
            onClick={() => setMobileOpen((o) => !o)}
            aria-label="Menú"
            aria-expanded={mobileOpen}
          >
            <div
              className={`w-5 h-0.5 transition-all duration-300 ${mobileOpen ? 'rotate-45 translate-y-2' : ''}`}
              style={{ background: 'var(--ink)' }}
            />
            <div
              className={`w-5 h-0.5 transition-all duration-300 ${mobileOpen ? 'opacity-0' : ''}`}
              style={{ background: 'var(--ink)' }}
            />
            <div
              className={`w-5 h-0.5 transition-all duration-300 ${mobileOpen ? '-rotate-45 -translate-y-2' : ''}`}
              style={{ background: 'var(--ink)' }}
            />
          </button>
        </div>
      </div>

      {/* Mobile menu — agrupado, sin acordeón (menos taps, la lista es corta) */}
      <div
        className={`md:hidden absolute top-full left-0 right-0 bg-[var(--paper-deep)] border-b border-[var(--card-border)] transition-all duration-500 overflow-y-auto ${
          mobileOpen ? 'max-h-[70vh] py-4' : 'max-h-0'
        }`}
      >
        <div className="px-6 flex flex-col gap-5">
          {groups.map(({ group, routes }) => (
            <div key={group}>
              <p className="text-[9px] uppercase tracking-[0.3em] text-[var(--dim-soft)] font-bold mb-2">
                {GROUP_LABEL[group]}
              </p>
              <div className="flex flex-col">
                {routes.map((r) => (
                  <NavLink
                    key={r.path}
                    to={r.path}
                    className="py-2.5 text-[11px] uppercase tracking-[0.2em] font-bold text-[var(--dim)]"
                    onClick={() => setMobileOpen(false)}
                  >
                    {r.label}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </nav>
  )
}
