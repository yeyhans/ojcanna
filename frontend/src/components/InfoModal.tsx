// frontend/src/components/InfoModal.tsx
//
// Modal de transparencia: por cada fuente expone el organismo emisor, la URL
// oficial, la cobertura temporal/geográfica y los caveats metodológicos.
//
// Todos los datos provienen de /FUENTES.md (documento maestro del proyecto).
// Si la fuente cambia (nueva taxonomía, nuevo año), actualizar ambos lados.

import { AnimatePresence, motion } from 'framer-motion'

export type InfoSource = 'cead' | 'dpp' | 'pdi' | 'fiscalia'

interface Props {
  open: boolean
  onClose: () => void
  source?: InfoSource
}

interface SourceContent {
  titulo: string
  eyebrow: string
  organismo: string
  fuenteUrl: string
  fuenteLabel: string
  cobertura: string
  granularidad: string
  metrica: string
  caveats: string[]
}

const CONTENT: Record<InfoSource, SourceContent> = {
  cead: {
    titulo: 'CEAD · Casos policiales Ley 20.000',
    eyebrow: 'Fuente Policial',
    organismo:
      'Subsecretaría de Prevención del Delito (Ministerio del Interior)',
    fuenteUrl: 'https://cead.minsegpublica.gob.cl/estadisticas-delictuales/',
    fuenteLabel: 'cead.minsegpublica.gob.cl',
    cobertura: '2005 – 2024',
    granularidad: 'Comunal · 344 de 346 comunas',
    metrica:
      'Frecuencia absoluta y tasa por 100.000 hab. en 7 subgrupos de la Ley 20.000 (tráfico, microtráfico, elaboración, porte, consumo en vía pública, etc.)',
    caveats: [
      'Taxonomía cambia en 2024: series 2005-2023 (DMCS_legacy) y 2024+ (Taxonomia_2024) NO son directamente comparables.',
      'Comunas Pozo Almonte y Antártica sin geometría en GADM v4.1.',
      'Sin desagregación por sexo, edad o sustancia específica.',
    ],
  },
  dpp: {
    titulo: 'DPP · Defensoría Penal Pública',
    eyebrow: 'Fuente Defensorial',
    organismo: 'Defensoría Penal Pública (Ministerio de Justicia)',
    fuenteUrl: 'https://www.dpp.cl/pag/116/627/estadisticas',
    fuenteLabel: 'dpp.cl/estadisticas',
    cobertura: '2020 – 2024',
    granularidad: 'Nacional + Regional (16 regiones)',
    metrica:
      'Causas ingresadas, imputados atendidos y formas de término (absolución, condena, salida alternativa, derivación, facultativos) en causas de Ley de Drogas.',
    caveats: [
      'No hay granularidad comunal: solo totales nacionales y regionales.',
      'Cruce región × forma de término no publicado por la DPP.',
      'Publicación en XLSX anuales con URLs hasheadas (sin API estable).',
    ],
  },
  pdi: {
    titulo: 'PDI · Delitos investigados (datos.gob.cl)',
    eyebrow: 'Fuente Investigativa',
    organismo:
      'Policía de Investigaciones de Chile · publicado vía Portal de Datos Abiertos',
    fuenteUrl:
      'https://datos.gob.cl/dataset/5373dac4-a77a-48b2-9a8b-9cef7311f941',
    fuenteLabel: 'datos.gob.cl · dataset 5373dac4',
    cobertura: '2024',
    granularidad: 'Regional (15 regiones)',
    metrica:
      'Delitos investigados, denuncias Art. 18 y víctimas Art. 18, filtrado por palabras clave de cannabis/drogas.',
    caveats: [
      'Solo año 2024 cargado — expandir requiere agregar URLs anuales al pipeline.',
      'Filtrado por keywords es frágil ante cambios en la nomenclatura oficial.',
      'Formato XLS legacy (no XLSX ni CSV).',
    ],
  },
  fiscalia: {
    titulo: 'Fiscalía · Causas Ley 20.000 (Ministerio Público)',
    eyebrow: 'Fuente Persecutoria',
    organismo:
      'Fiscalía Nacional · Ministerio Público de Chile',
    fuenteUrl:
      'https://www.fiscaliadechile.cl/persecucion-penal/estadisticas',
    fuenteLabel: 'fiscaliadechile.cl · estadísticas',
    cobertura: '2020 – 2025',
    granularidad: 'Regional · 16 regiones',
    metrica:
      'Causas ingresadas y terminadas por la Fiscalía en la categoría oficial "DELITOS LEY DE DROGAS". Ratio T/I (términos sobre ingresos) como proxy de congestión del sistema persecutorio.',
    caveats: [
      'Granularidad regional, no comunal — todas las comunas de una región comparten el mismo valor en el mapa.',
      'Las 4 fiscalías zonales de la Región Metropolitana se agregan como una sola RM.',
      'La categoría "DELITOS LEY DE DROGAS" es más amplia que sólo cannabis: incluye todas las infracciones a la Ley 20.000.',
    ],
  },
}

export function InfoModal({ open, onClose, source = 'cead' }: Props) {
  const content = CONTENT[source]

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-[var(--paper-deep)]/60 backdrop-blur-sm p-4 sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="w-full max-w-xl bg-[var(--paper-deep)] border border-[var(--card-border)] shadow-2xl overflow-hidden rounded-sm max-h-[90vh] overflow-y-auto"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-7 sm:p-8 border-b border-[var(--card-border)] flex justify-between items-start">
              <div>
                <p className="text-[10px] uppercase tracking-[0.25em] font-bold text-[var(--dim-soft)] mb-2">
                  {content.eyebrow}
                </p>
                <h2 className="text-2xl font-cal text-[var(--ink)] leading-tight">
                  {content.titulo}
                </h2>
              </div>
              <button
                onClick={onClose}
                className="shrink-0 ml-4 w-10 h-10 border border-[var(--card-border)] rounded-full flex items-center justify-center text-[var(--ink)] hover:bg-[var(--ink)] hover:text-[var(--paper-deep)] transition-all font-cal text-xl"
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>

            {/* Body */}
            <div className="p-7 sm:p-8 space-y-6 bg-[var(--paper-elev)]">
              <Row label="Organismo">{content.organismo}</Row>
              <Row label="Cobertura temporal">{content.cobertura}</Row>
              <Row label="Granularidad">{content.granularidad}</Row>
              <Row label="Métrica">{content.metrica}</Row>

              <div className="space-y-2 pt-2">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--ink)]">
                  Fuente oficial
                </p>
                <a
                  href={content.fuenteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex items-center gap-2 text-sm text-[var(--ink)] hover:opacity-70 underline decoration-[var(--rule-strong)] hover:decoration-[var(--ink)] underline-offset-4 transition-all break-all"
                >
                  <span>{content.fuenteLabel}</span>
                  <span
                    aria-hidden
                    className="text-[10px] tracking-widest opacity-50 group-hover:opacity-100"
                  >
                    ↗
                  </span>
                </a>
              </div>

              <div className="space-y-2 pt-2">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--ink)]">
                  Caveats metodológicos
                </p>
                <ul className="space-y-2">
                  {content.caveats.map((c, i) => (
                    <li
                      key={i}
                      className="text-xs text-[var(--dim)] leading-relaxed flex gap-3"
                    >
                      <span className="text-[var(--dim-soft)] shrink-0">·</span>
                      <span>{c}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 sm:p-7 bg-[var(--paper-deep)] border-t border-[var(--card-border)] flex items-center justify-between gap-4">
              <p className="text-[9px] uppercase tracking-[0.2em] text-[var(--dim-soft)]">
                Transparencia · Ley 20.000
              </p>
              <a
                href="/datos"
                className="text-[10px] uppercase tracking-[0.2em] text-[var(--ink)] hover:opacity-70 transition-opacity"
              >
                Descargar datos →
              </a>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--ink)]">
        {label}
      </p>
      <p className="text-sm text-[var(--dim)] leading-relaxed">{children}</p>
    </div>
  )
}
