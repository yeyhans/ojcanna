// frontend/src/pages/EmbudoPage.tsx
// Embudo del Punitivismo — 4 etapas: CEAD → PDI → DPP → PJud
import { useEffect, useState } from 'react'
import { useEmbudo, useEmbudoRanking, useEmbudoSankey } from '../hooks/useEmbudo'
import { EmbudoSankey } from '../components/EmbudoSankey'
import { useIsMobile } from '../hooks/useIsMobile'

const STAGE_COLORS: Record<string, string> = {
  policial:        '#dc2626',
  investigativa:   '#0891b2',
  defensorial:     '#ca8a04',
  judicial:        '#16a34a',
}

const ANIOS_DISPONIBLES = [2024, 2023, 2022, 2021, 2020]

function fmt(n: number) {
  return n.toLocaleString('es-CL')
}

export default function EmbudoPage() {
  const isMobile = useIsMobile()
  const [anio, setAnio] = useState<number>(2024)
  const [comunaId, setComunaId] = useState<string | null>(null)

  const { data: embudo } = useEmbudo(anio, comunaId)
  const { data: sankey } = useEmbudoSankey(anio, comunaId)
  const { data: ranking } = useEmbudoRanking(anio)

  useEffect(() => {
    // Reset comuna al cambiar año
  }, [anio])

  const totalPolicial = embudo?.etapas?.find(e => e.etapa === 'policial')?.n_casos ?? 0
  const totalJudicial = embudo?.etapas?.find(e => e.etapa === 'judicial')?.n_casos ?? 0
  const tasaAtricion = embudo?.tasa_atricion_pct ?? null

  return (
    <div className="min-h-full bg-[#0a0a0a] pb-24 relative">
      <div className="absolute inset-0 dot-grid-light pointer-events-none opacity-40" />

      {/* Hero */}
      <div className="relative px-6 py-16 sm:py-24 border-b border-[#2a2a2a]">
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div className="max-w-3xl">
              <span className="chip bg-[#f8f8f6] text-[#0a0a0a] border-[#f8f8f6] mb-6">
                Embudo · 4 fuentes oficiales · Ley 20.000
              </span>
              <h1 className="text-h1-deep text-[#f8f8f6] mb-6">
                El Embudo <br /> <span className="text-[#5a5a5a]">del Punitivismo</span>
              </h1>
              <p className="text-body-deep text-[#b0b0b0] max-w-2xl">
                Flujo del sistema penal chileno desde la detención policial (CEAD) hasta
                la sentencia judicial (PJud). Visualiza la "tasa de atrición" —
                cuántas detenciones terminan efectivamente en condena — siguiendo
                estándares UNODC.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4 bg-[#1a1a1a] p-4 rounded border border-[#2a2a2a]">
              <div className="flex items-center gap-4">
                <label className="text-label-deep text-[#b0b0b0]">AÑO</label>
                <select
                  value={anio}
                  onChange={e => { setAnio(Number(e.target.value)); setComunaId(null) }}
                  className="font-cal text-sm border-none focus:ring-0 bg-transparent text-[#f8f8f6]"
                >
                  {ANIOS_DISPONIBLES.map(a => (
                    <option key={a} value={a} className="bg-[#1a1a1a]">{a}</option>
                  ))}
                </select>
              </div>
              {comunaId && (
                <button
                  onClick={() => setComunaId(null)}
                  className="chip bg-transparent text-[#b0b0b0] border-[#2a2a2a] hover:border-[#f8f8f6] hover:text-[#f8f8f6] transition-colors"
                >
                  ← Vista nacional
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats hero */}
      <div className="relative px-6 py-12 max-w-7xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          {embudo?.etapas?.map(e => {
            const sinDatos = e.n_casos === 0
            return (
              <div
                key={e.etapa}
                className="bg-[#1a1a1a] border border-[#2a2a2a] rounded p-4 border-t-2"
                style={{ borderTopColor: STAGE_COLORS[e.etapa] }}
              >
                <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-[#8a8a8a] mb-2">
                  {e.fuente} · {e.etapa}
                </p>
                {sinDatos ? (
                  <p className="text-base sm:text-lg font-cal text-[#5a5a5a] mb-1 italic">
                    Sin datos
                  </p>
                ) : (
                  <p className="text-2xl sm:text-3xl font-cal text-[#f8f8f6] mb-1">
                    {fmt(e.n_casos)}
                  </p>
                )}
                <p className="text-xs text-[#b0b0b0]">{e.label}</p>
                {e.es_aproximacion && !sinDatos && (
                  <p className="text-[10px] text-[#ca8a04] mt-2" title={e.nota_metodologica || ''}>
                    ⚠ Aproximación
                  </p>
                )}
                {sinDatos && e.fuente === 'PJud' && (
                  <p className="text-[10px] text-[#ca8a04] mt-2">
                    Pendiente SAIP / auth
                  </p>
                )}
              </div>
            )
          })}
        </div>

        {/* Tasa de atrición — solo si hay datos PJud reales */}
        {totalPolicial > 0 && totalJudicial > 0 && tasaAtricion !== null && (
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded p-6 mb-12">
            <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-[#8a8a8a] mb-2">
              Tasa de atrición — {embudo?.comuna_nombre ?? 'Nacional'}
            </p>
            <div className="flex items-baseline gap-4">
              <p className="text-4xl sm:text-5xl font-cal text-[#16a34a]">
                {tasaAtricion.toFixed(2)}%
              </p>
              <p className="text-sm text-[#b0b0b0]">
                {fmt(totalJudicial)} sentencias judiciales / {fmt(totalPolicial)} detenciones policiales
              </p>
            </div>
          </div>
        )}

        {/* Aviso explícito cuando falta etapa judicial */}
        {totalPolicial > 0 && totalJudicial === 0 && (
          <div className="bg-[#1a1a1a] border border-[#ca8a04]/40 rounded p-6 mb-12">
            <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-[#ca8a04] mb-2">
              Tasa de atrición — no calculable
            </p>
            <p className="text-sm text-[#e0c97a] leading-relaxed">
              No se publican datos PJud porque aún no recibimos las sentencias originales
              del Poder Judicial. Solicitud SAIP en gestión.
            </p>
          </div>
        )}

        {/* Sankey */}
        <section className="mb-12">
          <header className="mb-6">
            <span className="chip bg-transparent text-[#b0b0b0] border-[#2a2a2a] mb-3">
              Visualización · Diagrama de Sankey UNODC
            </span>
            <h2 className="text-h2-deep text-[#f8f8f6] mb-2">
              Flujo del sistema penal · {embudo?.comuna_nombre ?? 'Nacional'} · {anio}
            </h2>
            <p className="text-sm text-[#8a8a8a] max-w-3xl">
              Cada barra representa el volumen de casos en cada etapa. Las áreas grises
              entre etapas son flujos; cuando el target es menor que el source, indica
              caída del embudo (casos que no avanzaron a la siguiente etapa).
            </p>
          </header>
          {sankey && (
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded p-4 sm:p-6 overflow-x-auto">
              <EmbudoSankey data={sankey} height={isMobile ? 280 : 380} />
              <p className="text-xs text-[#5a5a5a] mt-4 max-w-3xl">
                <strong className="text-[#8a8a8a]">Nota metodológica:</strong>{' '}
                {sankey.nota_metodologica}
              </p>
            </div>
          )}
        </section>

        {/* Ranking */}
        <section className="mb-12">
          <header className="mb-6">
            <span className="chip bg-transparent text-[#b0b0b0] border-[#2a2a2a] mb-3">
              Ranking · Top 50 comunas
            </span>
            <h2 className="text-h2-deep text-[#f8f8f6] mb-2">
              Comunas con mayor intensidad policial
            </h2>
            <p className="text-sm text-[#8a8a8a] max-w-2xl">
              Click en una comuna para ver su embudo individual. Ratio = sentencias
              PJud / detenciones CEAD.
            </p>
          </header>
          {ranking?.items?.length ? (
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-[#0a0a0a] border-b border-[#2a2a2a]">
                  <tr className="text-left">
                    <th className="px-4 py-3 text-[10px] uppercase tracking-[0.15em] text-[#8a8a8a] font-bold">#</th>
                    <th className="px-4 py-3 text-[10px] uppercase tracking-[0.15em] text-[#8a8a8a] font-bold">Comuna</th>
                    <th className="px-4 py-3 text-[10px] uppercase tracking-[0.15em] text-[#8a8a8a] font-bold text-right">Detenciones (CEAD)</th>
                    <th className="px-4 py-3 text-[10px] uppercase tracking-[0.15em] text-[#8a8a8a] font-bold text-right">Sentencias (PJud)</th>
                    <th className="px-4 py-3 text-[10px] uppercase tracking-[0.15em] text-[#8a8a8a] font-bold text-right">Ratio</th>
                  </tr>
                </thead>
                <tbody>
                  {ranking.items.map((it, i) => (
                    <tr
                      key={it.comuna_id}
                      className={`border-b border-[#2a2a2a] hover:bg-[#0a0a0a] cursor-pointer transition-colors ${
                        comunaId === it.comuna_id ? 'bg-[#0a0a0a]' : ''
                      }`}
                      onClick={() => setComunaId(it.comuna_id)}
                    >
                      <td className="px-4 py-3 text-[#5a5a5a]">{i + 1}</td>
                      <td className="px-4 py-3 text-[#f8f8f6] font-cal">{it.comuna_nombre}</td>
                      <td className="px-4 py-3 text-right text-[#f8f8f6] font-cal">{fmt(it.n_policial)}</td>
                      <td className="px-4 py-3 text-right font-cal" style={{ color: it.n_judicial === 0 ? '#5a5a5a' : '#f8f8f6' }}>
                        {it.n_judicial === 0 ? '—' : fmt(it.n_judicial)}
                      </td>
                      <td className="px-4 py-3 text-right font-cal" style={{ color: it.n_judicial === 0 ? '#5a5a5a' : '#16a34a' }}>
                        {it.n_judicial === 0 ? '—' : `${(it.ratio_policial_judicial * 100).toFixed(2)}%`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-[#5a5a5a] text-sm">Sin datos para {anio}.</p>
          )}
        </section>

        {/* Footer normativo */}
        <footer className="mt-16 pt-8 border-t border-[#2a2a2a] text-xs text-[#5a5a5a] max-w-3xl">
          <p>
            <strong className="text-[#8a8a8a]">Distribución proporcional:</strong>{' '}
            DPP y PDI son regionales. Para nivel comunal usamos pesos relativos
            del CEAD: <em>n_comuna = n_region × (cead_comuna / cead_region)</em>.
            Las etapas marcadas con ⚠ Aproximación lo indican explícitamente.
          </p>
        </footer>
      </div>
    </div>
  )
}
