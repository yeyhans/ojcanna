// frontend/src/data/bibliografia.ts
//
// Catálogo del corpus normativo que respalda el observatorio.
// Los PDFs viven en `frontend/public/bibliografias/` y se sirven estáticos.
//
// REGLA DE HONESTIDAD DOCUMENTAL
// El campo `verificacion` distingue tres estados y NO debe inflarse:
//
//   'confirmado' → el título y el contenido fueron contrastados contra la
//                  fuente oficial (BCN / Diario Oficial) o contra el texto del
//                  propio documento.
//   'pendiente'  → el documento está en el corpus y su identificación proviene
//                  del nombre de archivo o del emisor, pero su contenido NO ha
//                  sido leído y resumido. Se muestra como tal en la UI.
//
// La mayoría de estos PDFs son escaneos sin capa de texto, así que la
// verificación de los `pendiente` requiere lectura manual u OCR. Declararlo es
// preferible a publicar un resumen inventado.

export type GrupoNormativo =
  | 'ley-penal'
  | 'salud-paciente'
  | 'datos-privacidad'
  | 'cultivo-agricultura'
  | 'sociedad-civil'
  | 'respuestas-oficiales'

export interface DocumentoNormativo {
  id: string
  /** Nombre exacto del archivo en public/bibliografias/ */
  archivo: string
  /** Título oficial o el más preciso disponible. */
  titulo: string
  tipo: string
  organismo: string
  /** Fecha de publicación en texto legible. */
  fecha: string
  grupo: GrupoNormativo
  /** Qué dice el documento. Vacío si verificacion === 'pendiente'. */
  resumen: string
  /** Por qué está en el corpus del observatorio. */
  relevancia: string
  /** URL de la fuente oficial, si se conoce. */
  fuenteOficial?: string
  verificacion: 'confirmado' | 'pendiente'
}

export const GRUPO_LABEL: Record<GrupoNormativo, string> = {
  'ley-penal': 'Ley penal de drogas',
  'salud-paciente': 'Salud y derechos del paciente',
  'datos-privacidad': 'Datos personales y privacidad',
  'cultivo-agricultura': 'Cultivo y agricultura',
  'sociedad-civil': 'Responsabilidad y sociedad civil',
  'respuestas-oficiales': 'Fiscalización y respuestas oficiales',
}

export const GRUPO_DESCRIPCION: Record<GrupoNormativo, string> = {
  'ley-penal':
    'El núcleo punitivo que este observatorio fiscaliza: la ley de drogas, su reglamento y sus modificaciones.',
  'salud-paciente':
    'El marco sanitario que define derechos del paciente y la institucionalidad de salud que autoriza medicamentos.',
  'datos-privacidad':
    'Las normas que obligan a anonimizar y proteger los datos personales que este proyecto procesa.',
  'cultivo-agricultura':
    'La regulación agrícola del cultivo y las orientaciones técnicas oficiales.',
  'sociedad-civil':
    'Responsabilidad penal de organizaciones y el marco de participación de la sociedad civil.',
  'respuestas-oficiales':
    'Oficios, ordinarios y respuestas de organismos públicos a solicitudes concretas.',
}

/** Orden de presentación de los grupos. */
export const GRUPO_ORDER: GrupoNormativo[] = [
  'ley-penal',
  'salud-paciente',
  'datos-privacidad',
  'cultivo-agricultura',
  'sociedad-civil',
  'respuestas-oficiales',
]

export const BIBLIOGRAFIA: DocumentoNormativo[] = [
  // ─── Ley penal de drogas ────────────────────────────────────────────
  {
    id: 'ley-20000',
    archivo: 'LEY-20000_16-FEB-2005.pdf',
    titulo: 'Ley N° 20.000 — Sustituye la Ley N° 19.366, que sanciona el tráfico ilícito de estupefacientes y sustancias sicotrópicas',
    tipo: 'Ley',
    organismo: 'Ministerio del Interior',
    fecha: '16 de febrero de 2005',
    grupo: 'ley-penal',
    resumen:
      'Norma penal que tipifica el tráfico, la elaboración, el cultivo y la posesión de sustancias sujetas a control. Distingue el tráfico del microtráfico y contempla la excepción del consumo personal exclusivo y próximo en el tiempo.',
    relevancia:
      'Es la ley cuya aplicación mide todo el observatorio. Cada cifra de CEAD, Fiscalía, DPP y PDI que publicamos corresponde a causas o procedimientos bajo este cuerpo legal.',
    fuenteOficial: 'https://www.bcn.cl/leychile/navegar?idNorma=235507',
    verificacion: 'confirmado',
  },
  {
    id: 'ley-21575',
    archivo: 'Ley-21575_23-MAY-2023.pdf',
    titulo:
      'Ley N° 21.575 — Modifica diversos cuerpos legales para mejorar la persecución del narcotráfico y crimen organizado, regular el destino de los bienes incautados y fortalecer las instituciones de rehabilitación y reinserción social',
    tipo: 'Ley modificatoria',
    organismo: 'Ministerio del Interior y Seguridad Pública',
    fecha: '23 de mayo de 2023',
    grupo: 'ley-penal',
    resumen:
      'Endurece la persecución del narcotráfico, regula la enajenación temprana y el destino de bienes incautados, amplía las facultades de fiscalización de Carabineros y la PDI, y crea nuevos delitos. En materia de cannabis medicinal establece que el cultivo se entiende justificado para la atención de un tratamiento médico cuando se cuenta con receta extendida por un médico cirujano tratante.',
    relevancia:
      'Modifica el marco que este observatorio mide y contiene la regla explícita sobre cultivo justificado por receta médica — el punto exacto donde la discrecionalidad policial y judicial se vuelve medible.',
    fuenteOficial: 'https://www.bcn.cl/leychile/navegar?idNorma=1192530',
    verificacion: 'confirmado',
  },
  {
    id: 'dto-867',
    archivo: 'DTO-867_19-FEB-2008.pdf',
    titulo: 'Decreto Supremo N° 867 — Reglamento de la Ley N° 20.000',
    tipo: 'Decreto supremo',
    organismo: 'Ministerio del Interior',
    fecha: '19 de febrero de 2008',
    grupo: 'ley-penal',
    resumen: '',
    relevancia:
      'Reglamento que operativiza la Ley N° 20.000, incluida la clasificación de sustancias sujetas a control.',
    fuenteOficial: 'https://www.bcn.cl/leychile/navegar?idNorma=269885',
    verificacion: 'pendiente',
  },
  {
    id: 'ord-1022-2025',
    archivo: 'ORD_1022_13-06-2025_Modificaciones_Ley_20.000.pdf',
    titulo: 'ORD N° 1022 — Modificaciones a la Ley N° 20.000',
    tipo: 'Ordinario',
    organismo: 'Organismo emisor por confirmar',
    fecha: '13 de junio de 2025',
    grupo: 'ley-penal',
    resumen: '',
    relevancia:
      'Documento sobre modificaciones a la ley de drogas. Identificado por su nombre de archivo; contenido pendiente de lectura.',
    verificacion: 'pendiente',
  },

  // ─── Salud y derechos del paciente ──────────────────────────────────
  {
    id: 'ley-20584',
    archivo: 'Ley-20584_24-ABR-2012.pdf',
    titulo:
      'Ley N° 20.584 — Regula los derechos y deberes que tienen las personas en relación con acciones vinculadas a su atención en salud',
    tipo: 'Ley',
    organismo: 'Ministerio de Salud',
    fecha: '24 de abril de 2012',
    grupo: 'salud-paciente',
    resumen:
      'Establece los derechos del paciente: información, consentimiento informado, trato digno, y la reserva de la ficha clínica y de los datos sensibles de salud.',
    relevancia:
      'Fundamenta la confidencialidad clínica del paciente de cannabis medicinal y el deber de reserva que este proyecto aplica a todo dato de salud.',
    fuenteOficial: 'https://www.bcn.cl/leychile/navegar?idNorma=1039348',
    verificacion: 'confirmado',
  },
  {
    id: 'dfl-1-2006',
    archivo: 'DFL-1_24-ABR-2006.pdf',
    titulo:
      'DFL N° 1 de 2005 — Fija texto refundido, coordinado y sistematizado del DL N° 2.763 de 1979 y de las leyes N° 18.933 y N° 18.469',
    tipo: 'Decreto con fuerza de ley',
    organismo: 'Ministerio de Salud',
    fecha: 'Publicado el 24 de abril de 2006',
    grupo: 'salud-paciente',
    resumen:
      'Refunde la organización del sistema de salud chileno: Ministerio de Salud, FONASA, Instituto de Salud Pública, CENABAST y Servicios de Salud (DL 2.763/1979), el régimen de Isapres (Ley 18.933) y el régimen de prestaciones de salud (Ley 18.469).',
    relevancia:
      'Define la institucionalidad sanitaria que autoriza medicamentos y fiscaliza productos — el ISP, en particular, es la autoridad de referencia en cannabis medicinal.',
    fuenteOficial: 'https://www.bcn.cl/leychile/navegar?idNorma=249177',
    verificacion: 'confirmado',
  },

  // ─── Datos personales y privacidad ──────────────────────────────────
  {
    id: 'ley-19628',
    archivo: 'LEY-19628_28-AGO-1999.pdf',
    titulo: 'Ley N° 19.628 — Sobre protección de la vida privada',
    tipo: 'Ley',
    organismo: 'Ministerio Secretaría General de la Presidencia',
    fecha: '28 de agosto de 1999',
    grupo: 'datos-privacidad',
    resumen:
      'Régimen vigente de tratamiento de datos personales en Chile. Define los datos sensibles —entre ellos los de salud— y las condiciones bajo las cuales pueden tratarse.',
    relevancia:
      'Es el marco que obliga a anonimizar el texto de las sentencias antes de publicarlas y a mantener la tabla de auditoría con HMAC salado en vez de identidades en claro.',
    fuenteOficial: 'https://www.bcn.cl/leychile/navegar?idNorma=141599',
    verificacion: 'confirmado',
  },
  {
    id: 'ley-21719',
    archivo: 'Ley-21719_13-DIC-2024.pdf',
    titulo:
      'Ley N° 21.719 — Nueva ley que regula la protección y el tratamiento de datos personales y crea la Agencia de Protección de Datos Personales',
    tipo: 'Ley',
    organismo: 'Ministerio de Economía / SEGPRES',
    fecha: '13 de diciembre de 2024',
    grupo: 'datos-privacidad',
    resumen:
      'Sustituye el régimen de la Ley N° 19.628. Introduce bases de licitud, derechos ARCO reforzados, deber de notificación de brechas y una autoridad de control con potestad sancionatoria.',
    relevancia:
      'Es el estándar al que debe migrar el tratamiento de datos del observatorio. Su entrada en vigencia obliga a revisar el modelo de anonimización antes de publicar texto de sentencias.',
    fuenteOficial: 'https://www.bcn.cl/leychile/navegar?idNorma=1207201',
    verificacion: 'confirmado',
  },

  // ─── Cultivo y agricultura ──────────────────────────────────────────
  {
    id: 'circular-sag-772',
    archivo: 'Circular SAG 772 -2024.pdf',
    titulo: 'Circular SAG N° 772 de 2024',
    tipo: 'Circular',
    organismo: 'Servicio Agrícola y Ganadero (SAG)',
    fecha: '2024',
    grupo: 'cultivo-agricultura',
    resumen: '',
    relevancia:
      'El SAG es la autoridad que autoriza el cultivo de cannabis con fines de producción. Sus circulares fijan el procedimiento administrativo aplicable.',
    verificacion: 'pendiente',
  },
  {
    id: 'huertos-medicinales',
    archivo: 'Orientaciones Tecnicas de HUERTOS MEDICINALES.pdf',
    titulo: 'Orientaciones Técnicas de Huertos Medicinales',
    tipo: 'Orientación técnica',
    organismo: 'Organismo emisor por confirmar',
    fecha: 'Sin fecha confirmada',
    grupo: 'cultivo-agricultura',
    resumen: '',
    relevancia:
      'Documento técnico oficial sobre huertos medicinales. Contenido pendiente de lectura y resumen.',
    verificacion: 'pendiente',
  },

  // ─── Responsabilidad y sociedad civil ───────────────────────────────
  {
    id: 'ley-20393',
    archivo: 'Ley-20393_02-DIC-2009.pdf',
    titulo:
      'Ley N° 20.393 — Establece la responsabilidad penal de las personas jurídicas',
    tipo: 'Ley',
    organismo: 'Ministerio de Hacienda',
    fecha: '2 de diciembre de 2009',
    grupo: 'sociedad-civil',
    resumen:
      'Hace penalmente responsables a las personas jurídicas por delitos determinados y exige modelos de prevención con encargado de cumplimiento.',
    relevancia:
      'Marco de responsabilidad aplicable a organizaciones y fundaciones que operan en el ámbito del cannabis medicinal.',
    fuenteOficial: 'https://www.bcn.cl/leychile/navegar?idNorma=1008668',
    verificacion: 'confirmado',
  },
  {
    id: 'ley-20500',
    archivo: 'Ley-20500_16-FEB-2011.pdf',
    titulo:
      'Ley N° 20.500 — Sobre asociaciones y participación ciudadana en la gestión pública',
    tipo: 'Ley',
    organismo: 'Ministerio Secretaría General de Gobierno',
    fecha: '16 de febrero de 2011',
    grupo: 'sociedad-civil',
    resumen:
      'Reconoce el derecho de asociación, regula las organizaciones de interés público y obliga a los órganos del Estado a habilitar mecanismos de participación ciudadana.',
    relevancia:
      'Sustenta la legitimidad de la fiscalización ciudadana: es el marco bajo el cual una organización de la sociedad civil puede exigir y usar información pública del Estado.',
    fuenteOficial: 'https://www.bcn.cl/leychile/navegar?idNorma=1023143',
    verificacion: 'confirmado',
  },

  // ─── Fiscalización y respuestas oficiales ───────────────────────────
  {
    id: 'respuesta-isp',
    archivo: 'Respuesta ISP para GROSCann.pdf',
    titulo: 'Respuesta del Instituto de Salud Pública a solicitud de pronunciamiento',
    tipo: 'Ordinario',
    organismo:
      'Instituto de Salud Pública de Chile · Departamento Agencia Nacional de Medicamentos',
    fecha: 'Sin fecha confirmada',
    grupo: 'respuestas-oficiales',
    resumen: '',
    relevancia:
      'Pronunciamiento de la autoridad sanitaria ante una solicitud concreta. Firmado por la Dirección del ISP. Contenido pendiente de lectura.',
    verificacion: 'pendiente',
  },
  {
    id: 'respuesta-dos',
    archivo: 'respuesta DOS para GROSCann.pdf',
    titulo: 'Respuesta de la División de Organizaciones Sociales',
    tipo: 'Respuesta oficial',
    organismo: 'División de Organizaciones Sociales (DOS)',
    fecha: 'Sin fecha confirmada',
    grupo: 'respuestas-oficiales',
    resumen: '',
    relevancia:
      'Respuesta oficial en el marco de la participación de organizaciones sociales. Contenido pendiente de lectura.',
    verificacion: 'pendiente',
  },
  {
    id: 'oficio-9579824',
    archivo: 'Oficio N°9579824.pdf',
    titulo: 'Oficio N° 9579824',
    tipo: 'Oficio',
    organismo: 'Cámara de Diputados',
    fecha: 'Sin fecha confirmada',
    grupo: 'respuestas-oficiales',
    resumen: '',
    relevancia:
      'Oficio con código de verificación de la extranet de la Cámara de Diputados. Contenido pendiente de lectura.',
    verificacion: 'pendiente',
  },
  {
    id: 'ord-2964-2024',
    archivo: 'ORD_2964_14-11-2024.pdf',
    titulo: 'ORD N° 2964',
    tipo: 'Ordinario',
    organismo: 'Organismo emisor por confirmar',
    fecha: '14 de noviembre de 2024',
    grupo: 'respuestas-oficiales',
    resumen: '',
    relevancia:
      'Documento oficial del corpus. Es un escaneo sin capa de texto; su identificación proviene del nombre de archivo.',
    verificacion: 'pendiente',
  },
  {
    id: 'senda-narcotest',
    archivo: 'Indicacion_SENDA_Programa_Tolerancia_Cero_Narcotest.pdf',
    titulo: 'Indicación SENDA — Programa Tolerancia Cero / Narcotest',
    tipo: 'Indicación',
    organismo: 'SENDA',
    fecha: 'Sin fecha confirmada',
    grupo: 'respuestas-oficiales',
    resumen: '',
    relevancia:
      'Documento sobre el uso de narcotest en el marco del programa Tolerancia Cero — relevante para la discusión entre impairment real y presencia de metabolitos.',
    verificacion: 'pendiente',
  },
]

/** Ruta pública del PDF, con el nombre de archivo escapado para la URL. */
export function pdfHref(doc: DocumentoNormativo): string {
  return `/bibliografias/${encodeURIComponent(doc.archivo)}`
}

export const TOTAL_DOCUMENTOS = BIBLIOGRAFIA.length
export const TOTAL_CONFIRMADOS = BIBLIOGRAFIA.filter(
  (d) => d.verificacion === 'confirmado',
).length
