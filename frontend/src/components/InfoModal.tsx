// frontend/src/components/InfoModal.tsx
import { AnimatePresence, motion } from 'framer-motion'

interface Props {
  open: boolean
  onClose: () => void
}

export function InfoModal({ open, onClose }: Props) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-[2px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="
              w-full max-w-sm
              bg-white/90 backdrop-blur-xl
              border border-white/40
              rounded-2xl shadow-2xl shadow-slate-400/20
              overflow-hidden
            "
            initial={{ opacity: 0, scale: 0.97, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 10 }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-800">Sobre los datos</h2>
              <button
                onClick={onClose}
                aria-label="Cerrar"
                className="
                  w-7 h-7 flex items-center justify-center
                  rounded-full bg-slate-100 hover:bg-slate-200
                  text-slate-500 text-lg leading-none
                  transition-colors shrink-0
                "
              >
                ×
              </button>
            </div>

            {/* Content */}
            <div className="px-5 py-4 flex flex-col gap-5 overflow-y-auto max-h-[75vh]">

              <section className="flex flex-col gap-1.5">
                <h3 className="text-xs font-semibold text-blue-600 uppercase tracking-wider">
                  Origen de los datos
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Los datos provienen del{' '}
                  <span className="font-medium text-slate-700">CEAD</span>{' '}
                  (Centro de Estudios y Análisis del Delito) de la Subsecretaría de Prevención del
                  Delito. El portal no ofrece descarga masiva, por lo que se realizó una extracción
                  automatizada mediante ingeniería inversa de las peticiones HTTP, iterando sobre
                  cada combinación de año, región y comuna con{' '}
                  <span className="font-mono text-[11px] bg-slate-100 px-1 py-0.5 rounded">httpx</span>{' '}
                  asíncrono y checkpoints para tolerar interrupciones.
                </p>
              </section>

              <section className="flex flex-col gap-1.5">
                <h3 className="text-xs font-semibold text-blue-600 uppercase tracking-wider">
                  ¿Qué son los Casos?
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  La <span className="font-medium text-slate-700">frecuencia total</span> de hechos
                  policiales registrados bajo la Ley N° 20.000 (drogas) en la comuna para el año y
                  subgrupos de delitos seleccionados en los filtros.
                </p>
              </section>

              <section className="flex flex-col gap-1.5">
                <h3 className="text-xs font-semibold text-blue-600 uppercase tracking-wider">
                  ¿Qué es la tasa por 100k hab.?
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Los casos normalizados por la{' '}
                  <span className="font-medium text-slate-700">población comunal</span> (proyección
                  INE), expresados por cada 100.000 habitantes. Permite comparar comunas de tamaños
                  muy distintos sin que las más grandes distorsionen el mapa.
                </p>
              </section>

              <section className="flex flex-col gap-2">
                <h3 className="text-xs font-semibold text-blue-600 uppercase tracking-wider">
                  Contribuidores
                </h3>
                <ul className="flex flex-col gap-1.5">
                  {[
                    { label: 'Datos delictuales', value: 'CEAD / Subsecretaría de Prevención del Delito' },
                    { label: 'Geometrías', value: 'GADM v4.1' },
                    { label: 'Cartografía base', value: '© CARTO, © OpenStreetMap contributors' },
                    { label: 'Motor de mapas', value: 'MapLibre GL JS' },
                    { label: 'Plataforma', value: 'dispensai.cl' },
                  ].map(({ label, value }) => (
                    <li key={label} className="flex items-baseline gap-2">
                      <span className="text-[11px] font-medium text-slate-400 shrink-0 w-28">{label}</span>
                      <span className="text-xs text-slate-600">{value}</span>
                    </li>
                  ))}
                </ul>
              </section>

            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
