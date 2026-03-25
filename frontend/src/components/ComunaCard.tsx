// frontend/src/components/ComunaCard.tsx
import { AnimatePresence, motion } from 'framer-motion'
import type { CeadFeatureProperties } from '../types/cead'

interface Props {
  feature: { properties: CeadFeatureProperties } | null
  onClose: () => void
}

export function ComunaCard({ feature, onClose }: Props) {
  return (
    <AnimatePresence>
      {feature && (
        <motion.div
          key="comuna-card"
          className="
            fixed left-4 right-4 z-50
            bg-white/90 backdrop-blur-md
            border border-white/40
            rounded-2xl shadow-xl
            px-4 py-4
          "
          style={{
            bottom: 'calc(72px + env(safe-area-inset-bottom, 0px))',
          }}
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 24, opacity: 0 }}
          transition={{ type: 'spring', damping: 28, stiffness: 260 }}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col gap-1.5 min-w-0">
              <p className="font-semibold text-slate-800 text-sm leading-tight truncate">
                {feature.properties.nombre}
              </p>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-bold text-blue-700 leading-none">
                  {Math.round(feature.properties.frecuencia_total).toLocaleString('es-CL')}
                </span>
                <span className="text-slate-500 text-xs">casos</span>
              </div>
              <p className="text-slate-400 text-xs">
                {feature.properties.tasa_agregada.toFixed(1)} por 100k hab.
              </p>
            </div>

            <button
              onClick={onClose}
              aria-label="Cerrar"
              className="
                shrink-0 w-7 h-7 flex items-center justify-center
                rounded-full bg-slate-100 hover:bg-slate-200
                text-slate-500 text-lg leading-none
                transition-colors
              "
            >
              ×
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
