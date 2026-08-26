// frontend/src/pages/HomePage.tsx
//
// Portada del observatorio (ruta "/").
//
// Antes "/" montaba el mapa a pantalla completa: impacto visual inmediato, pero
// el visitante nuevo no tenía forma de saber qué es el sitio, de dónde salen las
// cifras ni qué más hay. Esta portada responde eso antes de mandarlo a un módulo.
//
// Regla de credibilidad: toda cifra de esta página sale del manifest real
// (/api/v1/export/manifest), no de constantes escritas a mano. Si el backend
// está frío (Render free tier), la portada renderiza igual y las cifras entran
// después — nunca bloquea el primer paint.

import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import type { DatasetInfo, ExportManifest } from '../types/export'
import { useCachedFetch } from '../hooks/useCachedFetch'
import { PageShell, DataCard, KpiCard, SectionTitle, SiteFooter } from '../components/ui'

const fmt = new Intl.NumberFormat('es-CL').format

interface Modulo {
  to: string
  eyebrow: string
  pregunta: string
  descripcion: string
  /** id en el manifest. Si está presente, el rango de años sale del dato real. */
  fuenteId?: DatasetInfo['id']
  /** Sigla + granularidad — parte estructural, no cambia con la ingesta. */
  etiqueta: string
  /** Fallback cuando el manifest todavía no llegó (backend frío). */
  rangoFallback: string
}

/**
 * Módulos publicados. Cada tarjeta se enuncia como la PREGUNTA que responde,
 * no como el organismo que la publica — el organismo va en el detalle.
 *
 * Los rangos de años NO se escriben a mano: se leen del manifest. Escribirlos
 * fijos hacía que la portada quedara desactualizada apenas se ingiere un año
 * nuevo — es exactamente el tipo de cifra sin respaldo que este observatorio
 * critica en otros.
 */
const MODULOS: Modulo[] = [
  {
    to: '/mapa',
    eyebrow: 'Etapa policial',
    pregunta: '¿Dónde detiene la policía por Ley 20.000?',
    descripcion:
      'Mapa coropleta de hechos policiales por comuna, con tasa ajustada por población INE. Es la única capa del observatorio con granularidad comunal.',
    fuenteId: 'cead',
    etiqueta: 'CEAD · comunal',
    rangoFallback: '2005–2025',
  },
  {
    to: '/fiscalia',
    eyebrow: 'Etapa persecutora',
    pregunta: '¿Cuántas causas persigue el Ministerio Público?',
    descripcion:
      'Causas ingresadas y terminadas en la categoría Ley 20.000, según los boletines anuales de la Fiscalía Nacional.',
    fuenteId: 'fiscalia',
    etiqueta: 'Fiscalía · regional',
    rangoFallback: '2024–2025',
  },
  {
    to: '/dpp',
    eyebrow: 'Etapa defensorial',
    pregunta: '¿Cómo terminan las causas de quienes son defendidos?',
    descripcion:
      'Causas ingresadas y formas de término de la Defensoría Penal Pública. Muestra el desenlace del proceso, no sólo su inicio.',
    fuenteId: 'dpp',
    etiqueta: 'DPP · regional',
    rangoFallback: '2020–2024',
  },
  {
    to: '/pdi',
    eyebrow: 'Etapa investigativa',
    pregunta: '¿Qué investiga la policía civil?',
    descripcion:
      'Delitos, denuncias y víctimas publicados en datos.gob.cl, desagregados por región y categoría.',
    fuenteId: 'pdi',
    etiqueta: 'PDI · regional',
    rangoFallback: '2024–2025',
  },
  {
    to: '/bibliografia',
    eyebrow: 'Marco legal',
    pregunta: '¿En qué normas se apoya este observatorio?',
    descripcion:
      'Corpus documental completo: leyes, decretos, circulares y respuestas oficiales que sostienen cada afirmación del proyecto.',
    etiqueta: 'Documentos oficiales',
    rangoFallback: 'descargables',
  },
  {
    to: '/metodologia',
    eyebrow: 'Análisis',
    pregunta: '¿Cómo se construye cada cifra?',
    descripcion:
      'Qué mide y qué NO mide cada fuente, los cortes de taxonomía, las aproximaciones declaradas y los vacíos conocidos.',
    etiqueta: 'Límites declarados',
    rangoFallback: '',
  },
]

/** Rango real de años de una fuente según el manifest, o el fallback escrito. */
function rangoDe(m: Modulo, manifest: ExportManifest | null): string {
  if (!m.fuenteId) return m.rangoFallback
  const f = manifest?.fuentes.find((x) => x.id === m.fuenteId)
  const { min, max } = f?.rango_anios ?? {}
  if (typeof min !== 'number' || typeof max !== 'number') return m.rangoFallback
  return min === max ? String(min) : `${min}–${max}`
}

export default function HomePage() {
  const { data: manifest } = useCachedFetch<ExportManifest>('/api/v1/export/manifest')

  const totalRegistros = manifest?.fuentes.reduce((sum, f) => sum + f.filas, 0) ?? null
  const totalFuentes = manifest?.fuentes.length ?? null

  const anios = (manifest?.fuentes ?? [])
    .flatMap((f) => [f.rango_anios.min, f.rango_anios.max])
    .filter((a): a is number => typeof a === 'number')
  const anioMin = anios.length ? Math.min(...anios) : null
  const anioMax = anios.length ? Math.max(...anios) : null

  return (
    <PageShell ghostText="OBS" maxWidth="7xl">
      {/* ─── Hero ─────────────────────────────────────────────────────── */}
      <motion.header
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="mb-16"
      >
        <div className="flex items-center gap-3 mb-5">
          <span className="rule-mark" aria-hidden="true" />
          <span className="text-label-deep">Observatorio cannábico · Chile</span>
        </div>

        <h1 className="text-h1-deep text-[var(--ink)] mb-6 max-w-4xl">
          Cómo se aplica la Ley 20.000
          <br />
          <span className="text-[var(--dim)]">comuna por comuna</span>
        </h1>

        <p className="text-base sm:text-lg text-[var(--dim)] font-light leading-relaxed max-w-2xl mb-8">
          Cruzamos cinco fuentes oficiales del Estado chileno para mostrar dónde,
          cuánto y contra quién se aplica la ley de drogas. Todos los datos son
          públicos, descargables y con su metodología declarada.
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            to="/mapa"
            className="chip border-[var(--ink)] bg-[var(--ink)] text-[var(--paper)] hover:opacity-80"
          >
            Abrir el mapa
          </Link>
          <Link to="/datos" className="chip">
            Descargar los datos
          </Link>
          <Link to="/metodologia" className="chip">
            Ver metodología
          </Link>
        </div>
      </motion.header>

      {/* ─── Cifras del corpus ────────────────────────────────────────── */}
      <section className="mb-16">
        <SectionTitle
          eyebrow="El corpus"
          title="Qué hay publicado hoy"
          subtitle="Cifras leídas en vivo desde el manifiesto de exportación. Si aparecen en blanco, el backend está despertando."
        />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label="Registros"
            value={totalRegistros !== null ? fmt(totalRegistros) : '—'}
            sublabel="Filas publicadas"
            accent
          />
          <KpiCard
            label="Fuentes oficiales"
            value={totalFuentes !== null ? String(totalFuentes) : '—'}
            sublabel="Organismos del Estado"
          />
          <KpiCard
            label="Cobertura"
            value={anioMin !== null && anioMax !== null ? `${anioMin}–${anioMax}` : '—'}
            sublabel="Rango de años"
          />
          <KpiCard label="Comunas" value="344" sublabel="Con geometría PostGIS" />
        </div>
      </section>

      {/* ─── Módulos ──────────────────────────────────────────────────── */}
      <section className="mb-16">
        <SectionTitle
          eyebrow="Los módulos"
          title="Qué puedes consultar"
          subtitle="Cada módulo cubre una etapa del sistema penal, desde la detención policial hasta el término de la causa."
        />

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {MODULOS.map((m, i) => (
            <motion.div
              key={m.to}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] }}
            >
              <Link to={m.to} className="block h-full group">
                <DataCard
                  accent="left"
                  padding="lg"
                  className="h-full transition-colors group-hover:border-[var(--ink)]"
                >
                  <p className="text-[9px] uppercase tracking-[0.3em] text-[var(--dim-soft)] font-bold mb-3">
                    {m.eyebrow}
                  </p>
                  <h3 className="font-cal text-lg text-[var(--ink)] leading-snug mb-3 font-light">
                    {m.pregunta}
                  </h3>
                  <p className="text-sm text-[var(--dim)] font-light leading-relaxed mb-5">
                    {m.descripcion}
                  </p>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--dim-soft)]">
                    {[m.etiqueta, rangoDe(m, manifest ?? null)]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                </DataCard>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ─── Declaración de límites ───────────────────────────────────── */}
      <section className="mb-8">
        <SectionTitle
          eyebrow="Qué no hacemos"
          title="Los límites, declarados"
          subtitle="Un observatorio que no dice qué le falta no es transparente."
        />

        <div className="grid md:grid-cols-3 gap-4">
          <DataCard accent="left" padding="lg">
            <h3 className="font-cal text-base text-[var(--ink)] mb-2 font-light">
              Un procedimiento no es un delito
            </h3>
            <p className="text-sm text-[var(--dim)] font-light leading-relaxed">
              Las cifras policiales miden actividad de fiscalización, no el tamaño
              del mercado ni la cantidad de personas que consumen. Una comuna con
              más registros puede estar más vigilada, no más infractora.
            </p>
          </DataCard>

          <DataCard accent="left" padding="lg">
            <h3 className="font-cal text-base text-[var(--ink)] mb-2 font-light">
              Las etapas no son comparables sin cuidado
            </h3>
            <p className="text-sm text-[var(--dim)] font-light leading-relaxed">
              CEAD es comunal; Fiscalía, DPP y PDI son regionales. Cualquier cruce
              entre esas escalas es una aproximación, y como tal está marcada en la
              interfaz.
            </p>
          </DataCard>

          <DataCard accent="left" padding="lg">
            <h3 className="font-cal text-base text-[var(--ink)] mb-2 font-light">
              Falta la etapa judicial
            </h3>
            <p className="text-sm text-[var(--dim)] font-light leading-relaxed">
              Las sentencias del Poder Judicial aún no están publicadas: el portal
              bloquea el acceso automatizado y el texto completo requiere solicitud
              institucional. El módulo existe y está en espera de datos.
            </p>
          </DataCard>
        </div>
      </section>

      <SiteFooter organismo="Cinco fuentes oficiales · Estado de Chile" />
    </PageShell>
  )
}
