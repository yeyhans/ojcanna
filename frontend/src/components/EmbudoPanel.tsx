// frontend/src/components/EmbudoPanel.tsx
// Panel del Embudo del Punitivismo — aparece al hacer click en una comuna en el mapa.
import { AnimatePresence, motion } from 'framer-motion'
import type { EtapaEmbudo } from '../hooks/useEmbudo'
import { useIsMobile } from '../hooks/useIsMobile'

const ETAPA_LABELS: Record<string, string> = {
  detenciones_policiales: 'Detenciones policiales',
  causas_defensor:        'Causas en Defensoría',
  investigaciones_pdi:    'Investigaciones PDI',
  condenas:               'Condenas (Est.)',
  encarcelamiento:        'Reclusión (Est.)',
}

const FUENTE_COLORS: Record<string, string> = {
  CEAD: 'bg-[#f8f8f6]',
  DPP:  'bg-[#b0b0b0]',
  PDI:  'bg-[#5a5a5a]',
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
}: Props) {
  const maxTotal = Math.max(...etapas.map((e) => e.total), 1)
  const disponibles = etapas.filter((e) => e.disponible && e.total > 0)

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-[#5a5a5a] mb-2">
            Desglose Territorial
          </p>
          <h3 className="text-2xl font-cal text-[#f8f8f6] leading-tight">
            {comunaNombre}
          </h3>
          {anio && (
            <div className="chip border-[#2a2a2a] text-[#b0b0b0] mt-3">
              TEMPORADA {anio}
            </div>
          )}
        </div>
        <button
          onClick={onClose}
          className="w-10 h-10 border border-[#2a2a2a] rounded-full flex items-center justify-center hover:bg-[#f8f8f6] hover:text-[#0a0a0a] transition-all font-cal text-xl"
        >
          ×
        </button>
      </div>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-[#f8f8f6] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : disponibles.length === 0 ? (
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] p-8 text-center rounded">
          <p className="text-xs text-[#5a5a5a] uppercase tracking-widest leading-loose">
            Sin intersecion de datos <br /> para este punto geográfico
          </p>
        </div>
      ) : (
        <div className="space-y-8 overflow-y-auto pr-2 custom-scrollbar">
          {etapas.map((etapa) => (
            <div key={etapa.etapa} className="group">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#f8f8f6]">
                  {ETAPA_LABELS[etapa.etapa] ?? etapa.etapa}
                </span>
                <span className="text-[9px] font-bold uppercase tracking-widest text-[#5a5a5a]">
                  {etapa.fuente}
                </span>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex-1 h-2 bg-[#2a2a2a]/30 rounded-full overflow-hidden">
                  {etapa.disponible ? (
                    <motion.div
                      className={`h-full ${FUENTE_COLORS[etapa.fuente] ?? 'bg-[#5a5a5a]'}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${(etapa.total / maxTotal) * 100}%` }}
                      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                    />
                  ) : (
                    <div className="h-full w-full bg-[#0a0a0a] border border-dashed border-[#2a2a2a]" />
                  )}
                </div>
                <span className="text-sm font-cal text-[#f8f8f6] w-12 text-right tabular-nums">
                  {etapa.disponible ? Math.round(etapa.total).toLocaleString('es-CL') : '—'}
                </span>
              </div>
            </div>
          ))}

          <div className="pt-8 border-t border-[#2a2a2a]">
            <p className="text-[9px] uppercase tracking-widest text-[#5a5a5a] leading-relaxed">
              * Datos proyectados mediante distribucion regional proporcional. 
              Estimacion sujeta a varianza territorial gubernamental.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export function EmbudoPanel({ comunaNombre, anio, etapas, isLoading, onClose }: Props) {
  const isMobile = useIsMobile()

  return (
    <AnimatePresence>
      {comunaNombre && (
        isMobile ? (
          <>
            <motion.div
              key="embudo-backdrop"
              className="fixed inset-0 z-[80] bg-[#f8f8f6]/20 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
            />
            <motion.div
              key="embudo-panel-mobile"
              className="fixed left-0 right-0 bottom-0 z-[90] bg-[#0a0a0a] border-t border-[#2a2a2a] shadow-2xl px-6 pt-4 pb-8 rounded-t-xl max-h-[85vh] overflow-y-auto"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            >
              <div className="flex justify-center mb-6">
                <div className="w-12 h-1 rounded-full bg-[#f8f8f6]/10" />
              </div>
              <PanelContent
                comunaNombre={comunaNombre}
                anio={anio}
                etapas={etapas}
                isLoading={isLoading}
                onClose={onClose}
              />
            </motion.div>
          </>
        ) : (
          <motion.div
            key="embudo-panel-desktop"
            className="absolute right-6 top-6 bottom-6 z-40 w-96 bg-[#0a0a0a]/80 backdrop-blur-xl border border-[#2a2a2a] shadow-2xl rounded-sm p-8"
            initial={{ x: 40, opacity: 0, filter: 'blur(10px)' }}
            animate={{ x: 0, opacity: 1, filter: 'blur(0px)' }}
            exit={{ x: 40, opacity: 0, filter: 'blur(10px)' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          >
            <PanelContent
              comunaNombre={comunaNombre}
              anio={anio}
              etapas={etapas}
              isLoading={isLoading}
              onClose={onClose}
            />
          </motion.div>
        )
      )}
    </AnimatePresence>
  )
}
