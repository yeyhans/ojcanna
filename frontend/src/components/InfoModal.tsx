// frontend/src/components/InfoModal.tsx
import { AnimatePresence, motion } from 'framer-motion'

export type InfoSource = 'cead' | 'dpp' | 'pdi' | 'embudo'

interface Props {
  open: boolean
  onClose: () => void
  source?: InfoSource
}

interface SourceContent {
  titulo: string
  sections: { title: string; body: React.ReactNode }[]
}

const CONTENT: Record<InfoSource, SourceContent> = {
  cead: {
    titulo: 'Logística de Detenciones CEAD',
    sections: [
      {
        title: 'Definición',
        body: (
          <>
            Instrumento cartográfico que visualiza el despliegue policial frente a la 
            <span className="font-bold text-[#f8f8f6]"> Ley N° 20.000</span>. 
            Muestra la densidad de acciones preventivas y reactivas en las 346 comunas de Chile.
          </>
        ),
      },
      {
        title: 'Vector de Datos',
        body: (
          <>
            Extraído del <span className="font-bold text-[#f8f8f6]">CEAD</span> (SPD). 
            Procesado mendiante ingeniería inversa sobre APIs gubernamentales con 
            validación asíncrona y normalización INE.
          </>
        ),
      },
    ],
  },
  dpp: {
    titulo: 'Defensoría Penal Pública',
    sections: [
      {
        title: 'Alcance',
        body: (
          <>
            Métricas de judicialización y defensa de imputados por drogas. 
            Análisis de <span className="font-bold text-[#f8f8f6]">resiliencia legal</span> frente al sistema penal chileno.
          </>
        ),
      },
      {
        title: 'Origen',
        body: 'Datos extraídos del SIGDP (Defensoría) procesados bajo estándares de transparencia activa.',
      },
    ],
  },
  pdi: {
    titulo: 'Inteligencia Policial PDI',
    sections: [
      {
        title: 'Métrica',
        body: 'Estadísticas de la Policía de Investigaciones (BRAIN) sobre investigaciones dirigidas y procesos de inteligencia territorial.',
      },
    ],
  },
  embudo: {
    titulo: 'Embudo del Punitivismo',
    sections: [
      {
        title: 'Metodología',
        body: (
          <>
            Correlación algorítmica entre <span className="font-bold text-[#f8f8f6]">Detenciones</span>, 
            <span className="font-bold text-[#f8f8f6]">Causas</span> e 
            <span className="font-bold text-[#f8f8f6]">Investigaciones</span>. 
            Mide la eficiencia y el sesgo de la cadena de custodia legal.
          </>
        ),
      },
    ],
  },
}

export function InfoModal({ open, onClose, source = 'cead' }: Props) {
  const content = CONTENT[source]

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-[#f8f8f6]/40 backdrop-blur-sm p-4 sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="w-full max-w-lg bg-[#0a0a0a] border border-[#2a2a2a] shadow-2xl overflow-hidden rounded-sm"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-8 border-b border-[#2a2a2a] flex justify-between items-start">
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-[#5a5a5a] mb-2">Transparencia de Datos</p>
                <h2 className="text-2xl font-cal text-[#f8f8f6]">{content.titulo}</h2>
              </div>
              <button 
                onClick={onClose}
                className="w-10 h-10 border border-[#2a2a2a] rounded-full flex items-center justify-center hover:bg-[#f8f8f6] hover:text-[#0a0a0a] transition-all font-cal text-xl"
              >
                ×
              </button>
            </div>

            <div className="p-8 space-y-8 bg-[#1a1a1a]/50">
              {content.sections.map((s, i) => (
                <div key={i} className="space-y-3">
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#f8f8f6] flex items-center gap-3">
                    <span className="w-1.5 h-1.5 bg-[#f8f8f6] rounded-full"></span>
                    {s.title}
                  </h3>
                  <div className="text-sm text-[#b0b0b0] leading-relaxed pl-[1.1rem]">
                    {s.body}
                  </div>
                </div>
              ))}
            </div>

            <div className="p-8 bg-[#0a0a0a] border-t border-[#2a2a2a]">
               <p className="text-[9px] uppercase tracking-[0.2em] text-[#5a5a5a] text-center">
                 Observatorio Anonimous Canna · Derechos Reservados 2026
               </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
