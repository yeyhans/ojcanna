import { useState } from 'react'
import { NavLink } from 'react-router-dom'

const NAV_LINKS = [
  { to: '/',       label: 'Mapa 20.000',     title: 'Detenciones policiales por comuna' },
  { to: '/dpp',    label: 'Defensoría',      title: 'Causas Ley 20.000 — DPP' },
  { to: '/pdi',    label: 'PDI Analytics',   title: 'Investigaciones PDI por región' },
  { to: '/embudo', label: 'Funnel Legal',    title: 'Embudo del Punitivismo' },
]

export function NavBar() {
  const [open, setOpen] = useState(false)

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `px-4 py-2 text-[10px] uppercase tracking-[0.2em] font-bold transition-all duration-300 relative group ${
      isActive ? 'text-[#f8f8f6]' : 'text-[#b0b0b0] hover:text-[#f8f8f6]'
    }`

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0a]/80 backdrop-blur-xl border-b border-[#2a2a2a]" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <div className="max-w-7xl mx-auto h-16 px-6 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#f8f8f6] rounded flex items-center justify-center text-[#0a0a0a] font-cal text-lg">
            A
          </div>
          <span className="font-cal text-sm font-bold text-[#f8f8f6] tracking-tight uppercase">
            Anonimous Canna <span className="text-[#a0a0a0] font-normal">Observatorio</span>
          </span>
        </div>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-2">
          {NAV_LINKS.map(l => (
            <NavLink key={l.to} to={l.to} end={l.to === '/'} className={linkClass}>
              {({ isActive }) => (
                <>
                  {l.label}
                  {isActive && (
                    <span className="absolute bottom-0 left-4 right-4 h-0.5 bg-[#f8f8f6] rounded-full" />
                  )}
                </>
              )}
            </NavLink>
          ))}
          <div className="ml-4 h-6 w-px bg-[#2a2a2a]" />
          <button className="ml-4 chip bg-[#f8f8f6] text-[#0a0a0a] border-[#f8f8f6] hover:bg-[#e0e0e0] transition-colors">
            Corporativo
          </button>
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden w-10 h-10 flex flex-col items-center justify-center gap-1.5 rounded-full hover:bg-white/5 transition-colors"
          onClick={() => setOpen(o => !o)}
          aria-label="Menú"
        >
          <div className={`w-5 h-0.5 bg-[#f8f8f6] transition-all duration-300 ${open ? 'rotate-45 translate-y-2' : ''}`} />
          <div className={`w-5 h-0.5 bg-[#f8f8f6] transition-all duration-300 ${open ? 'opacity-0' : ''}`} />
          <div className={`w-5 h-0.5 bg-[#f8f8f6] transition-all duration-300 ${open ? '-rotate-45 -translate-y-2' : ''}`} />
        </button>
      </div>

      {/* Mobile menu */}
      <div className={`md:hidden absolute top-full left-0 right-0 bg-[#0a0a0a] border-b border-[#2a2a2a] transition-all duration-500 overflow-hidden ${open ? 'max-h-96 py-4' : 'max-h-0'}`}>
        <div className="px-6 flex flex-col gap-2">
          {NAV_LINKS.map(l => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.to === '/'}
              className="py-3 text-[11px] uppercase tracking-[0.2em] font-bold text-[#b0b0b0]"
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
