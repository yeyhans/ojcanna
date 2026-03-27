// frontend/src/components/EmbudoPanel.tsx
// Panel del Embudo del Punitivismo — aparece al hacer click en una comuna en el mapa.
// Desktop: sidebar derecho. Mobile: bottom sheet.
import { AnimatePresence, motion } from 'framer-motion'
import type { EtapaEmbudo } from '../hooks/useEmbudo'
import { useIsMobile } from '../hooks/useIsMobile'

const ETAPA_LABELS: Record<string, string> = {
  detenciones_policiales: 'Detenciones policiales',
  causas_defensor:        'Causas en Defensoría',
  investigaciones_pdi:    'Investigaciones PDI',
  condenas:               'Condenas (pendiente)',
  encarcelamiento:        'Privados de libertad (pendiente)',
}

const FUENTE_COLORS: Record<string, string> = {
  CEAD: 'bg-blue-500',
  DPP:  'bg-violet-500',
  PDI:  'bg-emerald-500',
}

interface Props {
  comunaNombre: string | null
  anio: number | null
  etapas: EtapaEmbudo[]
  isLoading: boolean
  onClose: () => void
}

function PanelContent({
  comunaNombre,
  anio,
  etapas,
  isLoading,
  onClose,
  isMobile,
}: Props & { isMobile: boolean }) {
  const maxTotal = Math.max(...etapas.map((e) => e.total), 1)
  const disponibles = etapas.filter((e) => e.disponible && e.total > 0)

  return (
    <>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Embudo del punitivismo
          </p>
          <h3 className="text-base font-bold text-slate-800 leading-tight mt-0.5">
            {comunaNombre}
          </h3>
          {anio && (
            <p className="text-xs text-slate-400">{anio}</p>
          )}
        </div>
        <button
          onClick={onClose}
          aria-label="Cerrar panel"
          className="shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 text-xl leading-none transition-colors"
        >
          ×
        </button>
      </div>

      {/* Drag indicator para mobile */}
      {isMobile && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 bg-slate-300 rounded-full" />
      )}

      {/* Contenido */}
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center py-8">
          <div className="w-6 h-6 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : disponibles.length === 0 ? (
        <p className="text-sm text-slate-400 text-center mt-4 py-4">
          Sin datos cruzados disponibles para este año.<br />
          Ejecuta los ETL de DPP y PDI para completar el embudo.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {etapas.map((etapa) => (
            <div key={etapa.etapa}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-slate-600 font-medium">
                  {ETAPA_LABELS[etapa.etapa] ?? etapa.etapa}
                </span>
                <span className="text-xs text-slate-400">{etapa.fuente}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-5 bg-slate-100 rounded-full overflow-hidden">
                  {etapa.disponible ? (
                    <motion.div
                      className={`h-full rounded-full ${FUENTE_COLORS[etapa.fuente] ?? 'bg-slate-400'}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${(etapa.total / maxTotal) * 100}%` }}
                      transition={{ duration: 0.5, ease: 'easeOut' }}
                    />
                  ) : (
                    <div className="h-full w-full bg-slate-200 rounded-full flex items-center">
                      <span className="text-[10px] text-slate-400 pl-2">Pendiente</span>
                    </div>
                  )}
                </div>
                <span className="text-sm font-bold text-slate-700 w-16 text-right tabular-nums">
                  {etapa.disponible
                    ? Math.round(etapa.total).toLocaleString('es-CL')
                    : '—'}
                </span>
              </div>
            </div>
          ))}

          <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
            DPP y PDI son datos regionales distribuidos por comuna.
            Los valores exactos por comuna estarán disponibles con datos futuros de Fiscalía.
          </p>
        </div>
      )}
    </>
  )
}

export function EmbudoPanel({ comunaNombre, anio, etapas, isLoading, onClose }: Props) {
  const isMobile = useIsMobile()

  return (
    <AnimatePresence>
      {comunaNombre && (
        isMobile ? (
          /* Mobile: bottom sheet */
          <>
            {/* Backdrop */}
            <motion.div
              key="embudo-backdrop"
              className="absolute inset-0 z-20 bg-black/20"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
            />
            <motion.div
              key="embudo-panel-mobile"
              className="
                absolute left-0 right-0 bottom-0 z-30
                rounded-t-2xl
                bg-white/95 backdrop-blur-md
                border-t border-white/40
                shadow-xl shadow-slate-200/60
                px-5 pt-6 pb-6 flex flex-col gap-4
                overflow-y-auto
                max-h-[70vh]
                relative
              "
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            >
              <PanelContent
                comunaNombre={comunaNombre}
                anio={anio}
                etapas={etapas}
                isLoading={isLoading}
                onClose={onClose}
                isMobile={true}
              />
            </motion.div>
          </>
        ) : (
          /* Desktop: sidebar derecho */
          <motion.div
            key="embudo-panel-desktop"
            className="
              absolute right-4 top-4 bottom-4 z-30
              w-80 rounded-2xl
              bg-white/90 backdrop-blur-md
              border border-white/30
              shadow-xl shadow-slate-200/60
              p-5 flex flex-col gap-4
              overflow-y-auto
            "
            initial={{ x: 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 40, opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
          >
            <PanelContent
              comunaNombre={comunaNombre}
              anio={anio}
              etapas={etapas}
              isLoading={isLoading}
              onClose={onClose}
              isMobile={false}
            />
          </motion.div>
        )
      )}
    </AnimatePresence>
  )
}
