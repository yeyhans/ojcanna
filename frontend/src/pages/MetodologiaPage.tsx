// frontend/src/pages/MetodologiaPage.tsx
//
// Ruta /metodologia — cómo se construye cada cifra publicada.
//
// El contenido es una síntesis fiel de FUENTES.md, que es el documento canónico
// del proyecto. Si FUENTES.md cambia, esta página debe actualizarse: no hay
// generación automática, es contenido curado a propósito.
//
// Página estática: sin llamadas al backend.

import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import type { DatasetInfo, ExportManifest } from '../types/export'
import { useCachedFetch } from '../hooks/useCachedFetch'
import {
  PageShell,
  DataCard,
  SectionTitle,
  SourceBadge,
  SiteFooter,
  type Granularidad,
} from '../components/ui'

interface FichaFuente {
  /** id en el manifest — la cobertura temporal se lee del dato real. */
  id: DatasetInfo['id']
  fuente: 'CEAD' | 'DPP' | 'PDI' | 'FISCALIA'
  granularidad: Granularidad
  organismo: string
  /** Detalle estructural de cobertura (comunas, regiones). No cambia con la ingesta. */
  alcance: string
  /** Rango a mostrar si el manifest no llegó (backend frío). */
  rangoFallback: string
  mide: string
  noMide: string[]
  limitaciones: string[]
  ruta?: string
}

const FUENTES: FichaFuente[] = [
  {
    id: 'cead',
    fuente: 'CEAD',
    granularidad: 'comunal',
    organismo:
      'Centro de Estudios y Análisis del Delito · Subsecretaría de Prevención del Delito',
    alcance: '344 de 346 comunas',
    rangoFallback: '2005–2025',
    mide:
      'Casos policiales y aprehendidos por delitos de la Ley N° 20.000, desagregados en siete subgrupos (tráfico, microtráfico, elaboración, porte para consumo, consumo en vía pública y afines). Se publica tanto la frecuencia absoluta como la tasa por 100.000 habitantes.',
    noMide: [
      'La cantidad de personas que consumen o cultivan cannabis.',
      'El resultado judicial de esos procedimientos.',
      'El tipo de sustancia específica dentro de cada subgrupo.',
      'Desagregación por sexo o edad: el CEAD público sólo entrega totales por subgrupo.',
    ],
    limitaciones: [
      'Un caso policial mide actividad de fiscalización, no infracción comprobada. Una comuna con más registros puede estar más vigilada, no ser más infractora.',
      'Pozo Almonte (1404) y Antártica (12202) tienen datos CEAD pero no aparecen en el mapa: no existen en la fuente de geometrías GADM v4.1.',
      'El portal no ofrece descarga masiva ni API documentada; la extracción depende de un endpoint interno que puede cambiar sin aviso.',
    ],
    ruta: '/mapa',
  },
  {
    id: 'fiscalia',
    fuente: 'FISCALIA',
    granularidad: 'regional',
    organismo: 'Fiscalía Nacional · Ministerio Público',
    alcance: '16 regiones',
    rangoFallback: '2024–2025',
    mide:
      'Causas ingresadas y terminadas bajo la categoría Ley 20.000, tomadas de los boletines anuales institucionales. Además, del mismo boletín: los tipos de término aplicados (sentencia condenatoria, absolutoria, sobreseimientos, suspensión condicional, archivo provisional y otros), los juicios orales realizados, los días promedio de tramitación y la composición por sexo y tramo etario de los imputados.',
    noMide: [
      'Desagregación comunal: los boletines llegan hasta fiscalía regional.',
      'Causas individualizables o identidad de imputados.',
      'El contenido de la sentencia — la Fiscalía persigue, no falla.',
      'Formalizaciones: el boletín las publica sólo por región, sin desglosar por categoría de delito, así que no es posible aislar las causas de Ley 20.000. Publicamos únicamente ingresos y términos.',
    ],
    limitaciones: [
      'La taxonomía de delitos de la Fiscalía no coincide con la del CEAD ni con la de la Defensoría. Comparar categorías entre organismos exige un mapeo explícito que hoy no publicamos.',
      'Cobertura corta: sólo dos años disponibles en el formato ingerido.',
      'Los días de tramitación de la Metropolitana se muestran en sus cuatro fiscalías zonales por separado: son promedios y agregarlos sin el volumen de causas de cada una daría una cifra inexistente en la fuente.',
      'En el boletín 2025 el subtotal de imputados hombres no cuadra con sus propios componentes por una unidad. Conservamos el desglose original sin corregirlo.',
    ],
    ruta: '/fiscalia',
  },
  {
    id: 'dpp',
    fuente: 'DPP',
    granularidad: 'regional',
    organismo: 'Defensoría Penal Pública · Ministerio de Justicia',
    alcance: 'nacional y 16 regiones',
    rangoFallback: '2020–2024',
    mide:
      'Causas ingresadas y terminadas por delitos de la Ley de Drogas atendidas por defensores públicos, con sus formas de término: absolución, condena, derivación, facultativos, salida alternativa y otras.',
    noMide: [
      'Causas con defensa privada — sólo cubre a quienes son defendidos por la DPP.',
      'Granularidad comunal: sólo nacional y regional.',
      'El cruce región × forma de término: las formas de término vienen desagregadas sólo a nivel nacional; los datos regionales son totales brutos.',
    ],
    limitaciones: [
      'Serie corta: desde 2020, porque los registros previos no están publicados en el mismo formato.',
      'Las URLs de los archivos anuales están fijadas manualmente; si la Defensoría renombra un archivo, la actualización de ese año falla.',
    ],
    ruta: '/dpp',
  },
  {
    id: 'pdi',
    fuente: 'PDI',
    granularidad: 'regional',
    organismo: 'Policía de Investigaciones · vía Portal de Datos Abiertos datos.gob.cl',
    alcance: '16 regiones',
    rangoFallback: '2024–2025',
    mide:
      'Delitos y faltas investigadas, denuncias y víctimas del Artículo 18, filtrados por las categorías relacionadas con drogas.',
    noMide: [
      'Granularidad comunal: el dataset publicado es regional.',
      'Resultados de la investigación.',
    ],
    limitaciones: [
      'El filtrado de las categorías de drogas se hace por palabras clave sobre los nombres de delito. Es frágil: si el organismo cambia la redacción de una categoría, esa fila deja de contarse. Cada año nuevo requiere auditoría manual.',
      'Cobertura acotada a los años cargados; el dataset original publica más años que los ingeridos hoy.',
    ],
    ruta: '/pdi',
  },
]

interface Bloqueo {
  fuente: string
  razon: string
  accion: string
}

const BLOQUEADAS: Bloqueo[] = [
  {
    fuente: 'Poder Judicial — sentencias Ley 20.000',
    razon:
      'El portal de descargas requiere JavaScript renderizado y los boletines publicados no cubren la Ley 20.000. El Portal Unificado de Sentencias bloquea el acceso automatizado con reCAPTCHA, y el texto completo de los fallos exige autenticación institucional.',
    accion:
      'Solicitud formal por Ley de Transparencia al Poder Judicial pidiendo el dataset de causas Ley 20.000 por tribunal, año y materia.',
  },
  {
    fuente: 'Gendarmería — población penal por delito',
    razon:
      'Los compendios anuales en PDF son imágenes escaneadas sin capa de texto. Los reportes mensuales en planilla existen, pero no traen desglose por delito de la Ley 20.000.',
    accion:
      'Pipeline OCR de calidad incierta, o solicitud del dato desagregado al organismo.',
  },
  {
    fuente: 'SENDA — microdatos de consumo',
    razon:
      'El portal de bases de datos responde con acceso denegado. La entrega de microdatos requiere solicitud formal con justificación de uso.',
    accion:
      'Solicitud al Observatorio Chileno de Drogas. Mientras tanto sólo son utilizables los tabulados regionales de los informes públicos.',
  },
  {
    fuente: 'INE — microdatos Censo 2024',
    razon:
      'Sólo accesibles mediante una herramienta web interactiva, sin descarga directa en formato abierto.',
    accion: 'Esperar la publicación tabulada o integrar un cliente específico.',
  },
]

/** Cobertura temporal real de una fuente según el manifest. */
function coberturaDe(f: FichaFuente, manifest: ExportManifest | null): string {
  const m = manifest?.fuentes.find((x) => x.id === f.id)
  const { min, max } = m?.rango_anios ?? {}
  const rango =
    typeof min === 'number' && typeof max === 'number'
      ? min === max
        ? String(min)
        : `${min}–${max}`
      : f.rangoFallback
  return `${rango} · ${f.alcance}`
}

export default function MetodologiaPage() {
  const { data: manifest } = useCachedFetch<ExportManifest>('/api/v1/export/manifest')

  const ine = manifest?.fuentes.find((f) => f.id === 'ine_poblacion')
  const ineRango =
    typeof ine?.rango_anios.min === 'number' && typeof ine?.rango_anios.max === 'number'
      ? `${ine.rango_anios.min}–${ine.rango_anios.max}`
      : '2005–2025'

  return (
    <PageShell ghostText="MET" maxWidth="7xl">
      {/* ─── Header ───────────────────────────────────────────────────── */}
      <motion.header
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="mb-12"
      >
        <div className="flex items-center gap-3 mb-5">
          <span className="rule-mark" aria-hidden="true" />
          <span className="text-label-deep">Análisis · Metodología</span>
        </div>

        <h1 className="text-h1-deep text-[var(--ink)] mb-6">
          Cómo se construye
          <br />
          <span className="text-[var(--dim)]">cada cifra</span>
        </h1>

        <p className="text-base text-[var(--dim)] font-light leading-relaxed max-w-2xl">
          Qué mide y qué no mide cada fuente, dónde están los cortes, cuáles son
          las aproximaciones declaradas y qué datos no pudimos obtener. Un
          observatorio que no dice qué le falta no es transparente.
        </p>
      </motion.header>

      {/* ─── Regla de oro ─────────────────────────────────────────────── */}
      <section className="mb-16">
        <SectionTitle
          eyebrow="Principio rector"
          title="Política anti-imputación"
          subtitle="La regla que gobierna toda integración de fuentes nuevas."
        />

        <DataCard accent="left" accentStrong padding="lg">
          <p className="font-cal text-lg text-[var(--ink)] font-light leading-relaxed mb-4">
            Si dos fuentes no comparten una clave real —comuna, año, tipo de
            delito— se muestran por separado con etiqueta explícita. No
            distribuimos, interpolamos ni imputamos valores para forzar un cruce
            que el organismo no publica.
          </p>
          <p className="text-sm text-[var(--dim)] font-light leading-relaxed">
            Existe una excepción histórica, declarada más abajo: el Embudo del
            Punitivismo. No se replica en integraciones nuevas.
          </p>
        </DataCard>
      </section>

      {/* ─── Fichas por fuente ────────────────────────────────────────── */}
      <section className="mb-16">
        <SectionTitle
          eyebrow="Las fuentes"
          title="Qué mide cada una"
          subtitle="Cada organismo publica lo que su función le permite observar. Ninguno ve el fenómeno completo."
        />

        <div className="flex flex-col gap-4">
          {FUENTES.map((f) => (
            <DataCard key={f.id} accent="left" padding="lg" as="article">
              <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                <div>
                  <h3 className="font-cal text-lg text-[var(--ink)] font-light mb-1">
                    {f.organismo}
                  </h3>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--dim-soft)]">
                    {coberturaDe(f, manifest ?? null)}
                  </p>
                </div>
                <SourceBadge source={f.fuente} granularidad={f.granularidad} />
              </div>

              <p className="text-sm text-[var(--dim)] font-light leading-relaxed mb-6">
                {f.mide}
              </p>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <p className="text-[9px] uppercase tracking-[0.25em] text-[var(--dim-soft)] font-bold mb-3">
                    Qué NO mide
                  </p>
                  <ul className="flex flex-col gap-2">
                    {f.noMide.map((item, i) => (
                      <li
                        key={i}
                        className="text-xs text-[var(--dim)] font-light leading-relaxed pl-4 relative"
                      >
                        <span
                          aria-hidden="true"
                          className="absolute left-0 top-[0.45em] w-1.5 h-px bg-[var(--rule-strong)]"
                        />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <p className="text-[9px] uppercase tracking-[0.25em] text-[var(--dim-soft)] font-bold mb-3">
                    Limitaciones conocidas
                  </p>
                  <ul className="flex flex-col gap-2">
                    {f.limitaciones.map((item, i) => (
                      <li
                        key={i}
                        className="text-xs text-[var(--dim)] font-light leading-relaxed pl-4 relative"
                      >
                        <span
                          aria-hidden="true"
                          className="absolute left-0 top-[0.45em] w-1.5 h-px bg-[var(--rule-strong)]"
                        />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {f.ruta && (
                <div className="mt-6">
                  <Link to={f.ruta} className="chip">
                    Ver el módulo
                  </Link>
                </div>
              )}
            </DataCard>
          ))}
        </div>
      </section>

      {/* ─── Advertencias transversales ───────────────────────────────── */}
      <section className="mb-16">
        <SectionTitle
          eyebrow="Cortes y aproximaciones"
          title="Lo que hay que saber antes de comparar"
          subtitle="Tres advertencias que afectan a cualquier lectura de las series."
        />

        <div className="grid md:grid-cols-3 gap-4">
          <DataCard accent="left" padding="lg">
            <h3 className="font-cal text-base text-[var(--ink)] mb-3 font-light">
              El corte de taxonomía de 2024
            </h3>
            <p className="text-sm text-[var(--dim)] font-light leading-relaxed">
              El CEAD cambió su clasificación delictiva en 2024. Las series
              2005–2023 y 2024 en adelante corresponden a taxonomías distintas y
              no son directamente comparables. Cualquier gráfico que cruce ese
              año lo advierte en la interfaz.
            </p>
          </DataCard>

          <DataCard accent="left" padding="lg">
            <h3 className="font-cal text-base text-[var(--ink)] mb-3 font-light">
              El denominador poblacional
            </h3>
            <p className="text-sm text-[var(--dim)] font-light leading-relaxed">
              Las tasas por 100.000 habitantes usan las proyecciones comunales
              del INE con base en el Censo 2017. La serie oficial cubre
              2002–2035; de ella hay cargado el tramo {ineRango}, que es el que
              acota las tasas calculables. La actualización con base en el Censo
              2024 aún no está incorporada.
            </p>
          </DataCard>

          <DataCard accent="left" padding="lg">
            <h3 className="font-cal text-base text-[var(--ink)] mb-3 font-light">
              El Embudo es una aproximación
            </h3>
            <p className="text-sm text-[var(--dim)] font-light leading-relaxed">
              La Defensoría y la PDI no publican datos comunales. Para construir
              un embudo por comuna sus totales regionales se distribuyen usando
              los pesos relativos del CEAD. Sirve para comparar comunas de una
              misma región y detectar anomalías; no es un cruce caso por caso y
              no debe citarse como tal.
            </p>
          </DataCard>
        </div>
      </section>

      {/* ─── Fuentes bloqueadas ───────────────────────────────────────── */}
      <section className="mb-16">
        <SectionTitle
          eyebrow="Los vacíos"
          title="Qué no pudimos obtener"
          subtitle="Ninguna fuente bloqueada se sustituye por estimación o invención. Se documenta la razón real y la acción necesaria para desbloquearla."
        />

        <div className="flex flex-col gap-3">
          {BLOQUEADAS.map((b) => (
            <DataCard key={b.fuente} accent="left" padding="lg">
              <h3 className="font-cal text-base text-[var(--ink)] mb-3 font-light">
                {b.fuente}
              </h3>
              <div className="grid md:grid-cols-2 gap-5">
                <div>
                  <p className="text-[9px] uppercase tracking-[0.25em] text-[var(--dim-soft)] font-bold mb-2">
                    Por qué está bloqueada
                  </p>
                  <p className="text-xs text-[var(--dim)] font-light leading-relaxed">
                    {b.razon}
                  </p>
                </div>
                <div>
                  <p className="text-[9px] uppercase tracking-[0.25em] text-[var(--dim-soft)] font-bold mb-2">
                    Qué se necesita
                  </p>
                  <p className="text-xs text-[var(--dim)] font-light leading-relaxed">
                    {b.accion}
                  </p>
                </div>
              </div>
            </DataCard>
          ))}
        </div>
      </section>

      {/* ─── Cierre ───────────────────────────────────────────────────── */}
      <section className="mb-8">
        <DataCard accent="left" padding="lg">
          <h3 className="font-cal text-base text-[var(--ink)] mb-3 font-light">
            Verificable de punta a punta
          </h3>
          <p className="text-sm text-[var(--dim)] font-light leading-relaxed mb-5">
            Todas las bases están publicadas en formato abierto y todas las normas
            que respaldan el proyecto están disponibles en su versión original.
            Cualquiera puede rehacer los cálculos.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link to="/datos" className="chip">
              Descargar las bases
            </Link>
            <Link to="/bibliografia" className="chip">
              Ver el corpus normativo
            </Link>
          </div>
        </DataCard>
      </section>

      <SiteFooter
        organismo="Metodología · Síntesis de la especificación técnica del proyecto"
        disclaimer="Documento vivo · Se actualiza con cada fuente nueva"
      />
    </PageShell>
  )
}
