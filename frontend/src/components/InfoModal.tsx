// frontend/src/components/InfoModal.tsx
import { AnimatePresence, motion } from 'framer-motion'

export type InfoSource = 'cead' | 'dpp' | 'pdi' | 'embudo'

interface Props {
  open: boolean
  onClose: () => void
  source?: InfoSource
}

const CONTENT: Record<InfoSource, { color: string; sections: { title: string; body: React.ReactNode }[] }> = {
  cead: {
    color: 'text-blue-600',
    sections: [
      {
        title: 'Origen de los datos',
        body: (
          <>
            Los datos provienen del{' '}
            <span className="font-medium text-slate-700">CEAD</span>{' '}
            (Centro de Estudios y Análisis del Delito) de la Subsecretaría de Prevención del Delito.
            El portal no ofrece descarga masiva, por lo que se realizó una extracción automatizada
            mediante ingeniería inversa de las peticiones HTTP, iterando sobre cada combinación de
            año, región y comuna con{' '}
            <span className="font-mono text-[11px] bg-slate-100 px-1 py-0.5 rounded">httpx</span>{' '}
            asíncrono y checkpoints para tolerar interrupciones.
          </>
        ),
      },
      {
        title: '¿Qué son los Casos?',
        body: (
          <>
            La <span className="font-medium text-slate-700">frecuencia total</span> de hechos
            policiales registrados bajo la Ley N° 20.000 (drogas) en la comuna para el año y
            subgrupos de delitos seleccionados en los filtros.
          </>
        ),
      },
      {
        title: '¿Qué es la tasa por 100k hab.?',
        body: (
          <>
            Los casos normalizados por la{' '}
            <span className="font-medium text-slate-700">población comunal</span> (proyección INE),
            expresados por cada 100.000 habitantes. Permite comparar comunas de tamaños muy distintos
            sin que las más grandes distorsionen el mapa.
          </>
        ),
      },
      {
        title: 'Contribuidores',
        body: (
          <ul className="flex flex-col gap-1.5">
            {[
              { label: 'Datos delictuales', value: 'CEAD / Subsecretaría de Prevención del Delito' },
              { label: 'Geometrías',        value: 'GADM v4.1' },
              { label: 'Cartografía base',  value: '© CARTO, © OpenStreetMap contributors' },
              { label: 'Motor de mapas',    value: 'MapLibre GL JS' },
              { label: 'Plataforma',        value: 'dispensai.cl' },
            ].map(({ label, value }) => (
              <li key={label} className="flex items-baseline gap-2">
                <span className="text-[11px] font-medium text-slate-400 shrink-0 w-28">{label}</span>
                <span className="text-xs text-slate-600">{value}</span>
              </li>
            ))}
          </ul>
        ),
      },
    ],
  },

  dpp: {
    color: 'text-emerald-600',
    sections: [
      {
        title: 'Origen de los datos',
        body: (
          <>
            Los datos provienen del{' '}
            <span className="font-medium text-slate-700">SIGDP</span> (Sistema de Gestión de la
            Defensoría Penal Pública). La DPP publica anualmente estadísticas de ingresos, términos
            y formas de término para causas representadas por defensores públicos.
          </>
        ),
      },
      {
        title: 'Granularidad y limitaciones',
        body: (
          <>
            Los datos de{' '}
            <span className="font-medium text-slate-700">Delitos Ley de Drogas</span> (Ley N° 20.000)
            están disponibles únicamente a nivel{' '}
            <span className="font-medium text-slate-700">nacional</span>. No existe desglose comunal
            ni regional específico para drogas en los registros públicos de la DPP. Los datos
            regionales que aparecen en este módulo corresponden al{' '}
            <span className="font-medium text-slate-700">total de causas</span> de todos los delitos
            (usados como pesos de distribución proporcional).
          </>
        ),
      },
      {
        title: 'Formas de término',
        body: (
          <>
            Incluye: Absolución, Condena, Salida Alternativa (suspensión condicional, acuerdo
            reparatorio), Facultativos (sobreseimiento, archivo provisional), y Derivación a
            tribunal de familia u otro. El porcentaje refleja la composición del total de causas
            con término en el año seleccionado.
          </>
        ),
      },
      {
        title: 'Contribuidores',
        body: (
          <ul className="flex flex-col gap-1.5">
            {[
              { label: 'Datos judiciales', value: 'Defensoría Penal Pública (DPP) — SIGDP' },
              { label: 'Plataforma',       value: 'dispensai.cl' },
            ].map(({ label, value }) => (
              <li key={label} className="flex items-baseline gap-2">
                <span className="text-[11px] font-medium text-slate-400 shrink-0 w-28">{label}</span>
                <span className="text-xs text-slate-600">{value}</span>
              </li>
            ))}
          </ul>
        ),
      },
    ],
  },

  pdi: {
    color: 'text-purple-600',
    sections: [
      {
        title: 'Origen de los datos',
        body: (
          <>
            Los datos provienen de la{' '}
            <span className="font-medium text-slate-700">PDI</span> (Policía de Investigaciones de
            Chile) a través de{' '}
            <span className="font-medium text-slate-700">datos.gob.cl</span>, publicados desde la
            Base Relacional para Análisis e Información (BRAIN). Incluyen estadísticas de delitos
            investigados, denuncias recibidas y víctimas registradas bajo la Ley N° 20.000.
          </>
        ),
      },
      {
        title: 'Granularidad',
        body: (
          <>
            La PDI publica estos datos a nivel{' '}
            <span className="font-medium text-slate-700">regional</span> (16 regiones). No existe
            desglose comunal. Todas las comunas de una región comparten el mismo valor regional.
            La cobertura actual es 2024.
          </>
        ),
      },
      {
        title: 'Categorías disponibles',
        body: (
          <>
            <span className="font-medium text-slate-700">Crímenes y simples delitos Ley N° 20.000</span>{' '}
            (tráfico, microtráfico, elaboración) y{' '}
            <span className="font-medium text-slate-700">Consumo de alcohol y drogas en vía pública</span>.
            Cada categoría se desglosa en tres subcategorías: delitos investigados, denuncias
            recibidas y víctimas registradas.
          </>
        ),
      },
      {
        title: 'Contribuidores',
        body: (
          <ul className="flex flex-col gap-1.5">
            {[
              { label: 'Datos policiales', value: 'PDI — BRAIN (datos.gob.cl)' },
              { label: 'Plataforma',       value: 'dispensai.cl' },
            ].map(({ label, value }) => (
              <li key={label} className="flex items-baseline gap-2">
                <span className="text-[11px] font-medium text-slate-400 shrink-0 w-28">{label}</span>
                <span className="text-xs text-slate-600">{value}</span>
              </li>
            ))}
          </ul>
        ),
      },
    ],
  },

  embudo: {
    color: 'text-emerald-600',
    sections: [
      {
        title: '¿Qué es el Embudo del Punitivismo?',
        body: (
          <>
            Visualiza la cadena de persecución penal por Ley N° 20.000 en tres etapas:{' '}
            <span className="font-medium text-slate-700">detenciones policiales</span> (CEAD) →{' '}
            <span className="font-medium text-slate-700">causas en la Defensoría</span> (DPP) →{' '}
            <span className="font-medium text-slate-700">investigaciones PDI</span>. El objetivo es
            estimar qué fracción de personas detenidas accede a representación legal pública y
            cuántas terminan con investigación formal.
          </>
        ),
      },
      {
        title: 'Metodología de distribución',
        body: (
          <>
            Los datos DPP de drogas son{' '}
            <span className="font-medium text-slate-700">nacionales</span> (no tienen desglose
            regional). Para estimar causas por región se usa distribución proporcional:{' '}
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
            El ratio = causas_DPP estimadas / detenciones CEAD. Un valor{' '}
            <span className="font-medium text-slate-700">&gt; 100%</span> puede ocurrir cuando
            la distribución regional genera más causas estimadas que detenciones locales (la
            distribución es proporcional, no exacta). El ratio{' '}
            <span className="font-medium text-red-600">no es una tasa de condena</span> — mide el
            acceso a representación legal de la Defensoría, no el resultado judicial.
          </>
        ),
      },
      {
        title: 'Fuentes',
        body: (
          <ul className="flex flex-col gap-1.5">
            {[
              { label: 'Detenciones',      value: 'CEAD / Subsecretaría de Prevención del Delito' },
              { label: 'Causas',           value: 'Defensoría Penal Pública (DPP) — SIGDP' },
              { label: 'Investigaciones',  value: 'PDI — BRAIN (datos.gob.cl)' },
              { label: 'Plataforma',       value: 'dispensai.cl' },
            ].map(({ label, value }) => (
              <li key={label} className="flex items-baseline gap-2">
                <span className="text-[11px] font-medium text-slate-400 shrink-0 w-28">{label}</span>
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
  const { color, sections } = CONTENT[source]

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
              {sections.map(({ title, body }) => (
                <section key={title} className="flex flex-col gap-1.5">
                  <h3 className={`text-xs font-semibold uppercase tracking-wider ${color}`}>
                    {title}
                  </h3>
                  <div className="text-xs text-slate-600 leading-relaxed">{body}</div>
                </section>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
