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
  color: string
  accentBg: string
  sections: { title: string; body: React.ReactNode }[]
}

const CONTENT: Record<InfoSource, SourceContent> = {
  cead: {
    titulo: 'Mapa de Detenciones CEAD',
    color: 'text-blue-600',
    accentBg: 'bg-blue-50',
    sections: [
      {
        title: '¿Qué es?',
        body: (
          <>
            Mapa coroplético interactivo que visualiza la{' '}
            <span className="font-semibold text-slate-700">persecución policial por drogas</span> en
            las 346 comunas de Chile. Muestra la frecuencia de hechos policiales y la tasa por 100.000
            habitantes registrados bajo la Ley N° 20.000, permitiendo identificar zonas de alta
            concentración punitiva y comparar comunas de tamaños distintos.
          </>
        ),
      },
      {
        title: 'Origen de los datos',
        body: (
          <>
            Los datos provienen del{' '}
            <span className="font-semibold text-slate-700">CEAD</span>{' '}
            (Centro de Estudios y Análisis del Delito) de la Subsecretaría de Prevención del Delito,
            Ministerio del Interior. El portal publica estadísticas delictuales por comuna desde 2005.
            La extracción se realizó mediante ingeniería inversa de las peticiones HTTP del portal,
            iterando sobre cada combinación de año, región y comuna con{' '}
            <span className="font-mono text-[11px] bg-slate-100 px-1 py-0.5 rounded">httpx</span>{' '}
            asíncrono y checkpoints para tolerar interrupciones.
          </>
        ),
      },
      {
        title: '¿Qué son los Casos?',
        body: (
          <>
            La <span className="font-semibold text-slate-700">frecuencia total</span> de hechos
            policiales registrados bajo la Ley N° 20.000 (drogas) en la comuna, para el año y
            subgrupos de delitos seleccionados. Incluye: tráfico, microtráfico, consumo, porte,
            cultivo, elaboración y otros delitos de la ley de drogas.
          </>
        ),
      },
      {
        title: '¿Qué es la tasa por 100k hab.?',
        body: (
          <>
            Los casos normalizados por la{' '}
            <span className="font-semibold text-slate-700">población comunal</span> (proyección INE),
            expresados por cada 100.000 habitantes. Permite comparar comunas de tamaños muy distintos
            sin que las más pobladas distorsionen el mapa.
          </>
        ),
      },
      {
        title: 'Cobertura',
        body: (
          <>
            <span className="font-semibold text-slate-700">Temporal:</span> 2005–2024 (dos taxonomías:
            DMCS_legacy hasta 2023, Taxonomía_2024 desde 2024).{' '}
            <span className="font-semibold text-slate-700">Geográfica:</span> 344 de 346 comunas
            (Pozo Almonte y Antártica no tienen geometría en GADM v4.1).
          </>
        ),
      },
      {
        title: 'Contribuidores',
        body: (
          <ul className="flex flex-col gap-1.5">
            {[
              { label: 'Datos delictuales', value: 'CEAD / Subsecretaría de Prevención del Delito' },
              { label: 'Geometrías',        value: 'GADM v4.1 (Global Administrative Areas Database)' },
              { label: 'Cartografía base',  value: '© CARTO Positron, © OpenStreetMap contributors' },
              { label: 'Motor de mapas',    value: 'MapLibre GL JS (WebGL)' },
              { label: 'Visualización',     value: 'Recharts, Framer Motion' },
              { label: 'Plataforma',        value: 'Observatorio Judicial Cannábico — dispensai.cl' },
            ].map(({ label, value }) => (
              <li key={label} className="flex items-baseline gap-2">
                <span className="text-[11px] font-semibold text-slate-400 shrink-0 w-28">{label}</span>
                <span className="text-xs text-slate-600">{value}</span>
              </li>
            ))}
          </ul>
        ),
      },
    ],
  },

  dpp: {
    titulo: 'Defensoría Penal Pública',
    color: 'text-blue-600',
    accentBg: 'bg-blue-50',
    sections: [
      {
        title: '¿Qué es?',
        body: (
          <>
            Dashboard analítico que presenta las{' '}
            <span className="font-semibold text-slate-700">causas penales por Ley de Drogas</span>{' '}
            (Ley N° 20.000) gestionadas por la Defensoría Penal Pública de Chile. Permite analizar
            ingresos, términos, formas de resolución (condena, absolución, salidas alternativas) y
            la distribución regional de imputados representados por defensores públicos.
          </>
        ),
      },
      {
        title: 'Origen de los datos',
        body: (
          <>
            Los datos provienen del{' '}
            <span className="font-semibold text-slate-700">SIGDP</span> (Sistema Informático de
            Gestión de la Defensa Pública). La DPP publica anualmente boletines estadísticos con
            el detalle de causas ingresadas, terminadas y formas de resolución. Los archivos Excel
            fueron descargados de{' '}
            <span className="font-semibold text-slate-700">dpp.cl/estadísticas</span> y procesados
            mediante un pipeline ETL en Python.
          </>
        ),
      },
      {
        title: 'Granularidad y limitaciones',
        body: (
          <>
            Los datos de{' '}
            <span className="font-semibold text-slate-700">Ley de Drogas</span> están disponibles
            únicamente a nivel <span className="font-semibold text-slate-700">nacional</span>. No
            existe desglose comunal ni regional específico para drogas. Los datos regionales de
            imputados que aparecen corresponden al total de todos los delitos (no exclusivamente
            drogas) y se usan como pesos de distribución proporcional en el módulo Embudo.
          </>
        ),
      },
      {
        title: 'Formas de término',
        body: (
          <>
            Las causas pueden terminar en:{' '}
            <span className="font-semibold text-slate-700">Condena</span> (pena efectiva),{' '}
            <span className="font-semibold text-slate-700">Absolución</span>,{' '}
            <span className="font-semibold text-slate-700">Salida Alternativa</span> (suspensión
            condicional, acuerdo reparatorio),{' '}
            <span className="font-semibold text-slate-700">Facultativos de Fiscalía</span>{' '}
            (sobreseimiento, archivo provisional),{' '}
            <span className="font-semibold text-slate-700">Derivación</span> a otro tribunal, u{' '}
            <span className="font-semibold text-slate-700">Otras formas</span>.
          </>
        ),
      },
      {
        title: 'Cobertura',
        body: (
          <>
            <span className="font-semibold text-slate-700">Temporal:</span> 2020–2024.{' '}
            <span className="font-semibold text-slate-700">Geográfica:</span> Nacional (ingresos y
            términos por drogas), Regional (total de imputados, todos los delitos).
          </>
        ),
      },
      {
        title: 'Contribuidores',
        body: (
          <ul className="flex flex-col gap-1.5">
            {[
              { label: 'Datos judiciales', value: 'Defensoría Penal Pública (DPP) — SIGDP' },
              { label: 'Procesamiento',    value: 'Pipeline ETL Python (pandas, openpyxl)' },
              { label: 'Visualización',    value: 'Recharts (donut, línea temporal, barras)' },
              { label: 'Plataforma',       value: 'Observatorio Judicial Cannábico — dispensai.cl' },
            ].map(({ label, value }) => (
              <li key={label} className="flex items-baseline gap-2">
                <span className="text-[11px] font-semibold text-slate-400 shrink-0 w-28">{label}</span>
                <span className="text-xs text-slate-600">{value}</span>
              </li>
            ))}
          </ul>
        ),
      },
    ],
  },

  pdi: {
    titulo: 'Policía de Investigaciones',
    color: 'text-purple-600',
    accentBg: 'bg-purple-50',
    sections: [
      {
        title: '¿Qué es?',
        body: (
          <>
            Dashboard de estadísticas de la{' '}
            <span className="font-semibold text-slate-700">PDI</span> (Policía de Investigaciones de
            Chile) sobre delitos investigados, denuncias recibidas y víctimas registradas bajo la
            Ley N° 20.000 y normas relacionadas. Permite visualizar la distribución regional de la
            actividad investigativa policial en materia de drogas.
          </>
        ),
      },
      {
        title: 'Origen de los datos',
        body: (
          <>
            Los datos provienen de la base{' '}
            <span className="font-semibold text-slate-700">BRAIN</span> (Base Relacional para
            Análisis e Información) de la PDI, publicados en el portal de datos abiertos{' '}
            <span className="font-semibold text-slate-700">datos.gob.cl</span> del Gobierno de Chile.
            Los archivos CSV fueron descargados y procesados mediante un pipeline ETL en Python.
          </>
        ),
      },
      {
        title: 'Categorías y subcategorías',
        body: (
          <>
            Dos categorías principales:{' '}
            <span className="font-semibold text-slate-700">Crímenes y simples delitos Ley N° 20.000</span>{' '}
            (tráfico, microtráfico, elaboración) y{' '}
            <span className="font-semibold text-slate-700">Consumo en vía pública</span>.
            Cada una se desglosa en tres subcategorías: delitos investigados (casos con investigación
            formal), denuncias recibidas (reportes ciudadanos), y víctimas registradas.
          </>
        ),
      },
      {
        title: 'Cobertura',
        body: (
          <>
            <span className="font-semibold text-slate-700">Temporal:</span> 2024.{' '}
            <span className="font-semibold text-slate-700">Geográfica:</span> Regional (16 regiones
            de Chile). No existe desglose comunal en los datos publicados por la PDI.
          </>
        ),
      },
      {
        title: 'Contribuidores',
        body: (
          <ul className="flex flex-col gap-1.5">
            {[
              { label: 'Datos policiales', value: 'PDI — BRAIN (datos.gob.cl)' },
              { label: 'Datos abiertos',   value: 'Gobierno de Chile — datos.gob.cl' },
              { label: 'Procesamiento',    value: 'Pipeline ETL Python (pandas)' },
              { label: 'Visualización',    value: 'Recharts (barras verticales y horizontales)' },
              { label: 'Plataforma',       value: 'Observatorio Judicial Cannábico — dispensai.cl' },
            ].map(({ label, value }) => (
              <li key={label} className="flex items-baseline gap-2">
                <span className="text-[11px] font-semibold text-slate-400 shrink-0 w-28">{label}</span>
                <span className="text-xs text-slate-600">{value}</span>
              </li>
            ))}
          </ul>
        ),
      },
    ],
  },

  embudo: {
    titulo: 'Embudo del Punitivismo',
    color: 'text-emerald-600',
    accentBg: 'bg-emerald-50',
    sections: [
      {
        title: '¿Qué es?',
        body: (
          <>
            Análisis cruzado que visualiza la{' '}
            <span className="font-semibold text-slate-700">cadena de persecución penal</span> por
            Ley N° 20.000 en tres etapas:{' '}
            <span className="font-semibold text-blue-600">detenciones policiales</span> (CEAD) →{' '}
            <span className="font-semibold text-violet-600">causas en la Defensoría</span> (DPP) →{' '}
            <span className="font-semibold text-emerald-600">investigaciones PDI</span>.
            Estima qué fracción de personas detenidas por drogas accede a representación legal
            pública y permite comparar la intensidad punitiva entre comunas.
          </>
        ),
      },
      {
        title: 'Origen de los datos',
        body: (
          <>
            Combina tres fuentes de datos públicos:{' '}
            <span className="font-semibold text-slate-700">CEAD</span> (detenciones comunales por
            drogas, Subsecretaría de Prevención del Delito),{' '}
            <span className="font-semibold text-slate-700">DPP</span> (causas Ley 20.000 a nivel
            nacional, Defensoría Penal Pública), y{' '}
            <span className="font-semibold text-slate-700">PDI</span> (investigaciones regionales,
            datos.gob.cl). Cada fuente tiene granularidad distinta, por lo que se aplica distribución
            proporcional para estimar valores comunales.
          </>
        ),
      },
      {
        title: 'Metodología de distribución',
        body: (
          <>
            Los datos DPP de drogas son{' '}
            <span className="font-semibold text-slate-700">nacionales</span>. Para estimar causas
            por región se usa distribución proporcional:{' '}
            <span className="font-mono text-[11px] bg-slate-100 px-1 py-0.5 rounded">
              causas_región = total_nacional × (peso_región / Σ pesos)
            </span>{' '}
            donde el peso regional es el total de imputados de todos los delitos en la DPP. Luego,
            por comuna:{' '}
            <span className="font-mono text-[11px] bg-slate-100 px-1 py-0.5 rounded">
              causas_comuna = causas_región × (det_comuna / det_región)
            </span>
          </>
        ),
      },
      {
        title: 'Interpretación del Ratio',
        body: (
          <>
            El <span className="font-semibold text-slate-700">ratio</span> = causas DPP estimadas /
            detenciones CEAD. Un valor{' '}
            <span className="font-semibold text-slate-700">&gt; 100%</span> puede ocurrir cuando la
            distribución proporcional genera más causas estimadas que detenciones locales. El ratio{' '}
            <span className="font-semibold text-red-600">no es una tasa de condena</span> — mide
            el acceso estimado a representación legal de la Defensoría, no el resultado judicial final.
          </>
        ),
      },
      {
        title: 'Cobertura',
        body: (
          <>
            <span className="font-semibold text-slate-700">Temporal:</span> 2020–2024 (intersección
            de años disponibles en CEAD y DPP).{' '}
            <span className="font-semibold text-slate-700">Geográfica:</span> Comunal (estimado por
            distribución proporcional desde datos regionales/nacionales).
          </>
        ),
      },
      {
        title: 'Contribuidores',
        body: (
          <ul className="flex flex-col gap-1.5">
            {[
              { label: 'Detenciones',      value: 'CEAD / Subsecretaría de Prevención del Delito' },
              { label: 'Causas',           value: 'Defensoría Penal Pública (DPP) — SIGDP' },
              { label: 'Investigaciones',  value: 'PDI — BRAIN (datos.gob.cl)' },
              { label: 'Procesamiento',    value: 'Pipeline ETL Python (httpx, pandas, asyncpg)' },
              { label: 'Visualización',    value: 'Recharts (barras apiladas), Framer Motion' },
              { label: 'Plataforma',       value: 'Observatorio Judicial Cannábico — dispensai.cl' },
            ].map(({ label, value }) => (
              <li key={label} className="flex items-baseline gap-2">
                <span className="text-[11px] font-semibold text-slate-400 shrink-0 w-28">{label}</span>
                <span className="text-xs text-slate-600">{value}</span>
              </li>
            ))}
          </ul>
        ),
      },
    ],
  },
}

export function InfoModal({ open, onClose, source = 'cead' }: Props) {
  const { titulo, color, accentBg, sections } = CONTENT[source]

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-slate-900/30 backdrop-blur-[2px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="
              w-full sm:max-w-md
              bg-white/95 backdrop-blur-xl
              border border-white/40
              rounded-t-2xl sm:rounded-2xl
              shadow-2xl shadow-slate-400/20
              overflow-hidden
              max-h-[85vh] sm:max-h-[80vh]
              flex flex-col
            "
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drag indicator mobile */}
            <div className="sm:hidden flex justify-center pt-2">
              <div className="w-10 h-1 bg-slate-300 rounded-full" />
            </div>

            {/* Header */}
            <div className={`flex items-center justify-between px-5 pt-3 sm:pt-4 pb-3 border-b border-slate-100 ${accentBg}`}>
              <div>
                <h2 className="text-sm font-bold text-slate-800">Sobre los datos</h2>
                <p className={`text-xs font-semibold ${color} mt-0.5`}>{titulo}</p>
              </div>
              <button
                onClick={onClose}
                aria-label="Cerrar"
                className="
                  min-w-[44px] min-h-[44px]
                  flex items-center justify-center
                  rounded-full bg-white/60 hover:bg-white
                  text-slate-500 text-xl leading-none
                  transition-colors shrink-0
                "
              >
                ×
              </button>
            </div>

            {/* Content */}
            <div className="px-5 py-4 flex flex-col gap-5 overflow-y-auto flex-1">
              {sections.map(({ title, body }) => (
                <section key={title} className="flex flex-col gap-1.5">
                  <h3 className={`text-xs font-semibold uppercase tracking-wider ${color}`}>
                    {title}
                  </h3>
                  <div className="text-xs text-slate-600 leading-relaxed">{body}</div>
                </section>
              ))}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50">
              <p className="text-[11px] text-slate-400 text-center">
                Observatorio Judicial Cannábico · Plataforma de fiscalización cívica
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
