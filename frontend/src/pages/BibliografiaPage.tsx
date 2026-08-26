// frontend/src/pages/BibliografiaPage.tsx
//
// Ruta /bibliografia — el corpus normativo que respalda el observatorio.
//
// Los 17 documentos estaban en public/bibliografias/ sin ninguna superficie web:
// se descargaban sólo si alguien adivinaba la URL. Esta página los cataloga,
// los agrupa por materia y declara cuáles tienen su contenido verificado.
//
// Página estática: sin llamadas al backend, sin cold start de Render.

import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  BIBLIOGRAFIA,
  GRUPO_DESCRIPCION,
  GRUPO_LABEL,
  GRUPO_ORDER,
  TOTAL_CONFIRMADOS,
  TOTAL_DOCUMENTOS,
  pdfHref,
  type DocumentoNormativo,
  type GrupoNormativo,
} from '../data/bibliografia'
import {
  PageShell,
  DataCard,
  KpiCard,
  SectionTitle,
  SegmentedControl,
  SiteFooter,
} from '../components/ui'

type Filtro = GrupoNormativo | 'todos'

function DocumentoFicha({ doc }: { doc: DocumentoNormativo }) {
  const pendiente = doc.verificacion === 'pendiente'

  return (
    <DataCard accent="left" padding="lg" as="article">
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span className="text-[9px] uppercase tracking-[0.3em] text-[var(--dim-soft)] font-bold">
          {doc.tipo}
        </span>
        <span aria-hidden="true" className="text-[var(--rule-strong)]">
          ·
        </span>
        <span className="text-[9px] uppercase tracking-[0.3em] text-[var(--dim-soft)]">
          {doc.fecha}
        </span>
        {pendiente && (
          <span
            className="ml-auto text-[8px] uppercase tracking-[0.2em] font-bold text-[var(--dim)] border border-[var(--rule-strong)] px-1.5 py-0.5 rounded-sm"
            title="El documento está en el corpus, pero su contenido aún no ha sido leído y resumido"
          >
            Sin resumen verificado
          </span>
        )}
      </div>

      <h3 className="font-cal text-base text-[var(--ink)] leading-snug mb-3 font-light">
        {doc.titulo}
      </h3>

      <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--dim-soft)] mb-4">
        {doc.organismo}
      </p>

      {doc.resumen ? (
        <p className="text-sm text-[var(--dim)] font-light leading-relaxed mb-4">
          {doc.resumen}
        </p>
      ) : (
        <p className="text-sm text-[var(--dim-soft)] font-light leading-relaxed mb-4 italic">
          Documento disponible para descarga. Su contenido no ha sido resumido
          todavía: el archivo es un escaneo sin capa de texto y requiere lectura
          manual antes de publicar una síntesis.
        </p>
      )}

      <div className="h-px bg-[var(--card-border)] mb-4" />

      <p className="text-xs text-[var(--dim)] font-light leading-relaxed mb-5">
        <span className="text-[9px] uppercase tracking-[0.25em] text-[var(--dim-soft)] font-bold block mb-1">
          Por qué está acá
        </span>
        {doc.relevancia}
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <a
          href={pdfHref(doc)}
          target="_blank"
          rel="noopener noreferrer"
          className="chip border-[var(--ink)] bg-[var(--ink)] text-[var(--paper)] hover:opacity-80"
        >
          Abrir PDF
        </a>
        {doc.fuenteOficial && (
          <a
            href={doc.fuenteOficial}
            target="_blank"
            rel="noopener noreferrer"
            className="chip"
          >
            Fuente oficial
          </a>
        )}
      </div>
    </DataCard>
  )
}

export default function BibliografiaPage() {
  const [filtro, setFiltro] = useState<Filtro>('todos')
  const [query, setQuery] = useState('')

  const documentos = useMemo(() => {
    const q = query.trim().toLowerCase()
    return BIBLIOGRAFIA.filter((d) => {
      if (filtro !== 'todos' && d.grupo !== filtro) return false
      if (!q) return true
      return (
        d.titulo.toLowerCase().includes(q) ||
        d.organismo.toLowerCase().includes(q) ||
        d.resumen.toLowerCase().includes(q) ||
        d.relevancia.toLowerCase().includes(q)
      )
    })
  }, [filtro, query])

  // Agrupados sólo cuando no hay filtro de grupo activo.
  const gruposVisibles = useMemo(() => {
    return GRUPO_ORDER.map((g) => ({
      grupo: g,
      docs: documentos.filter((d) => d.grupo === g),
    })).filter((g) => g.docs.length > 0)
  }, [documentos])

  const opciones = useMemo(
    () => [
      { value: 'todos' as Filtro, label: 'Todos' },
      ...GRUPO_ORDER.map((g) => ({ value: g as Filtro, label: GRUPO_LABEL[g] })),
    ],
    [],
  )

  return (
    <PageShell ghostText="LEX" maxWidth="7xl">
      {/* ─── Header ───────────────────────────────────────────────────── */}
      <motion.header
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="mb-12"
      >
        <div className="flex items-center gap-3 mb-5">
          <span className="rule-mark" aria-hidden="true" />
          <span className="text-label-deep">Marco legal · Corpus documental</span>
        </div>

        <h1 className="text-h1-deep text-[var(--ink)] mb-6">
          Las normas que
          <br />
          <span className="text-[var(--dim)]">sostienen este proyecto</span>
        </h1>

        <p className="text-base text-[var(--dim)] font-light leading-relaxed max-w-2xl">
          Leyes, decretos, circulares y respuestas oficiales que respaldan cada
          afirmación del observatorio. Todos descargables en su versión original,
          sin intermediación.
        </p>
      </motion.header>

      {/* ─── Estado del corpus ────────────────────────────────────────── */}
      <section className="mb-12">
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <KpiCard
            label="Documentos"
            value={String(TOTAL_DOCUMENTOS)}
            sublabel="En el corpus"
            accent
          />
          <KpiCard
            label="Con resumen verificado"
            value={`${TOTAL_CONFIRMADOS}/${TOTAL_DOCUMENTOS}`}
            sublabel="Contrastados con la fuente"
          />
          <KpiCard
            label="Materias"
            value={String(GRUPO_ORDER.length)}
            sublabel="Grupos temáticos"
          />
        </div>

        <DataCard accent="left" padding="md" className="mt-4">
          <p className="text-xs text-[var(--dim)] font-light leading-relaxed">
            <span className="text-[9px] uppercase tracking-[0.25em] text-[var(--dim-soft)] font-bold block mb-2">
              Sobre la verificación
            </span>
            Un documento marcado como <em>sin resumen verificado</em> está
            disponible y es auténtico, pero su contenido todavía no fue leído y
            sintetizado por el equipo. La mayoría de esos archivos son escaneos sin
            capa de texto. Preferimos declararlo antes que publicar un resumen que
            no podemos sostener.
          </p>
        </DataCard>
      </section>

      {/* ─── Filtros ──────────────────────────────────────────────────── */}
      <section className="mb-10">
        <SectionTitle
          eyebrow="Explorar"
          title="Buscar en el corpus"
          subtitle="Filtra por materia o busca por título, organismo o contenido."
        />

        <div className="flex flex-col gap-4">
          {/* 7 opciones desbordan en móvil: el SegmentedControl es inline-flex
              sin wrap, así que el scroll horizontal va en el contenedor. */}
          <div className="-mx-6 px-6 sm:mx-0 sm:px-0 overflow-x-auto">
            <SegmentedControl
              options={opciones}
              value={filtro}
              onChange={setFiltro}
              label="Filtrar por materia"
            />
          </div>

          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por título, organismo o materia…"
            aria-label="Buscar en el corpus normativo"
            className="w-full max-w-lg bg-[var(--paper-elev)] border border-[var(--card-border)] rounded-sm px-4 py-3 text-sm text-[var(--ink)] placeholder:text-[var(--dim-soft)] focus:border-[var(--ink)] focus:outline-none transition-colors"
          />
        </div>
      </section>

      {/* ─── Resultados ───────────────────────────────────────────────── */}
      {documentos.length === 0 ? (
        <DataCard accent="left" padding="lg">
          <p className="text-sm text-[var(--dim)] font-light">
            Sin resultados para «{query}». Prueba con el número de la ley o el
            nombre del organismo.
          </p>
        </DataCard>
      ) : (
        gruposVisibles.map(({ grupo, docs }) => (
          <section key={grupo} className="mb-14">
            <SectionTitle
              eyebrow={`${docs.length} ${docs.length === 1 ? 'documento' : 'documentos'}`}
              title={GRUPO_LABEL[grupo]}
              subtitle={GRUPO_DESCRIPCION[grupo]}
            />
            <div className="grid md:grid-cols-2 gap-4">
              {docs.map((doc) => (
                <DocumentoFicha key={doc.id} doc={doc} />
              ))}
            </div>
          </section>
        ))
      )}

      <SiteFooter
        organismo="Documentos oficiales · Biblioteca del Congreso Nacional y organismos emisores"
        disclaimer="Documentos públicos · Reproducidos en su versión original"
      />
    </PageShell>
  )
}
