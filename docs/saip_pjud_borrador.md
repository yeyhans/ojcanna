# Solicitud SAIP — Poder Judicial de Chile

**Asunto:** Solicitud de información estadística estructurada sobre causas tramitadas bajo Ley N° 20.000 (período 2025 en adelante), amparada en el 6° Plan de Acción de Estado Abierto y el Acta 164-2024 de la Excma. Corte Suprema.

**Destinatario:** Dirección de Comunicaciones del Poder Judicial / Oficina de Transparencia / Dirección de Estudios.

**Vía:** [https://www.pjud.cl/transparencia](https://www.pjud.cl/transparencia) (formulario web SAIP) o [solicitudes.cplt.cl](https://solicitudes.cplt.cl) (Consejo para la Transparencia, plazo legal 20 días hábiles).

---

## I. Identificación del solicitante

| Campo | Valor |
|---|---|
| Nombre / Razón social | _____ |
| RUT | _____ |
| Domicilio | _____ |
| Email de notificación | _____ |
| Teléfono | _____ |
| Calidad invocada | Interés cívico de auditoría / investigación / academia (especificar) |

> **Recomendación**: si firma una organización (ONG, universidad, observatorio cívico),
> indicar la personalidad jurídica. Aumenta la probabilidad de respuesta detallada.

---

## II. Marco normativo invocado

1. **Ley N° 20.285 sobre Acceso a la Información Pública** — artículo 10 y 11.
2. **6° Plan de Acción de Estado Abierto de Chile (2023-2027)**, Compromiso N° 5
   *"Justicia Abierta para un Estado Abierto"*, suscrito por el Poder Judicial y la
   Defensoría Penal Pública. El presente requerimiento se enmarca directamente en
   este compromiso de transparencia institucional.
3. **Acta 164-2024 de la Excma. Corte Suprema** (vigencia 2025-01-01), que declara
   públicas las carpetas electrónicas y regula el Buscador de Jurisprudencia para
   la publicación de sentencias íntegras o anonimizadas.
4. **Ley N° 19.628 sobre Protección de la Vida Privada** — el solicitante se compromete
   a tratar los datos bajo principios de Privacidad por Diseño, anonimizando RUT,
   nombres y domicilios mediante pipelines NLP (spaCy + regex chileno) antes de
   cualquier persistencia o publicación.

---

## III. Información solicitada

Se requiere un dataset estructurado en formato **CSV o JSON** que contenga los
siguientes campos para todas las **causas tramitadas en materia de Ley N° 20.000
(tráfico, microtráfico, porte, consumo personal exclusivo, justificación médica del
Art. 8°)** desde el **1 de enero de 2025** a la fecha más reciente disponible:

| Campo | Tipo | Descripción |
|---|---|---|
| `rol_unico_causa` | string | RIT / RUC del proceso (sin anonimizar — identificador interno PJud) |
| `tribunal_id` | string | Código del tribunal sentenciador |
| `tribunal_nombre` | string | Nombre del tribunal (Juzgado de Garantía / TOP / Corte) |
| `region_id` | string | Código regional (estándar SUBDERE) |
| `comuna_id` | string | Código comunal (CUT 6 dígitos) |
| `fecha_inicio` | date | Fecha de ingreso |
| `fecha_sentencia` | date | Fecha de sentencia definitiva (si existe) |
| `materia_pjud` | string | Materia interna PJud (taxonomía propia) |
| `articulo_invocado` | string | Artículos Ley 20.000 invocados (separados por coma) |
| `tipo_termino` | string | condena / absolución / sobreseimiento / salida_alternativa / suspensión condicional / acuerdo_reparatorio / otros |
| `pena_meses` | int (nullable) | Pena efectiva en meses (solo condenas) |
| `pena_dias` | int (nullable) | Pena efectiva en días residuales |
| `cumplimiento` | string (nullable) | Efectivo / sustitutivo / remisión condicional |
| `gramaje_g_referencia` | numeric (nullable) | Gramos de cannabis declarados en sentencia (si consta) |
| `tipo_sustancia` | string (nullable) | Cannabis / cocaína / pasta base / otros |
| `genero_imputado` | string (nullable) | M / F / X — **agregado, no individualizado** |
| `nacionalidad_imputado` | string (nullable) | Código ISO 3166 — **agregado, no individualizado** |
| `defensor_dpp` | bool | Si tuvo defensor DPP (sin nombre) |
| `tiene_receta_medica` | bool (nullable) | Si invocó Art. 8° Ley 21.575 |

**Cobertura temporal:** desde 2025-01-01 hasta hoy. Idealmente actualizable
trimestralmente.

**Granularidad:** una fila por causa terminada o sentenciada.

**Formato preferido:** CSV UTF-8 con comillas dobles, o JSON Lines (`.jsonl`).

**NO se solicita texto íntegro de las sentencias en este oficio.** El observatorio
no requiere identificadores personales (RUT, nombres, domicilios).

---

## IV. Justificación del interés público

El observatorio ciudadano [nombre] desarrolla una plataforma de **fiscalización
abierta** que cruza cuatro fuentes oficiales:

- **CEAD** (Subsecretaría de Prevención del Delito) — etapa policial comunal
- **PDI** (datos.gob.cl) — etapa investigativa regional
- **DPP** (Defensoría Penal Pública) — etapa defensorial regional
- **PJud** — etapa judicial (faltante)

El cruce permite calcular la **tasa de atrición** del sistema penal en materia
Ley 20.000: cuántas detenciones policiales terminan efectivamente en condena.
Sin el dataset PJud, la última etapa del embudo queda en blanco, impidiendo
auditar la **proporcionalidad penológica** (relación entre gramaje incautado y
pena impuesta) y la **disparidad territorial de criterios judiciales**.

El presente requerimiento contribuye directamente a los objetivos del Compromiso
N° 5 del 6° Plan de Acción de Estado Abierto, fortaleciendo la confianza
institucional en el sistema judicial chileno mediante datos verificables y
auditables por la ciudadanía.

---

## V. Compromisos del solicitante

1. **Privacidad por Diseño**: ningún campo personal será publicado. Los datos
   se almacenan únicamente en formato agregado y estadístico.
2. **Citación obligatoria de fuente** en todas las publicaciones derivadas:
   *"Fuente: Poder Judicial de Chile, dataset SAIP [folio], procesado por
   Observatorio [nombre]"*.
3. **Publicación de metodología** (regex, prompts, criterios de extracción)
   en el sitio público del observatorio para auditoría académica.
4. **Reciprocidad**: entrega al PJud de los análisis derivados antes de su
   publicación, para corrección de eventuales errores metodológicos.
5. **Apertura del dataset procesado** bajo licencia Creative Commons BY-SA
   para reutilización por academia, periodismo y sociedad civil.

---

## VI. Fundamentación legal de la solicitud

> *"El principio de transparencia de la función pública consiste en respetar y
> cautelar la publicidad de los actos, resoluciones, procedimientos y documentos
> de la Administración, así como la de sus fundamentos, y en facilitar el
> acceso de cualquier persona a esa información, a través de los medios y
> procedimientos que al efecto establezca la ley"* — Art. 4° Ley 20.285.

> *"Las carpetas electrónicas son públicas (...). El Buscador de Jurisprudencia
> permitirá acceso a sentencias íntegras o anonimizadas"* — Acta 164-2024 CS,
> vigencia 2025-01-01.

El dataset solicitado se enmarca en información de **interés público manifiesto**,
relativa al funcionamiento del aparato sancionador del Estado en una materia
penal de alto impacto social (Ley de Drogas). No se requieren datos sensibles
de personas naturales identificadas, sino agregados estadísticos y metadatos
procesales.

---

## VII. Plazo de respuesta

Conforme al artículo 14 de la Ley 20.285, el órgano requerido dispone de **20
días hábiles** para responder, prorrogables por otros 10 días en casos justificados.

Solicitamos respuesta dentro del plazo legal o, en su defecto, indicación del
número de folio asignado para hacer seguimiento ante el Consejo para la
Transparencia.

---

## VIII. Notificación

Solicito ser notificado por correo electrónico a la dirección indicada en el
punto I, conforme al artículo 12 letra c) de la Ley 20.285.

---

**[Lugar], [Fecha]**

**[Firma]**
**[Nombre y RUT]**

---

## Anexo técnico — formato esperado del dataset

```jsonl
{"rol_unico_causa": "RIT 1234-2025", "tribunal_id": "JG-SCL-7", "tribunal_nombre": "7° Juzgado de Garantía de Santiago", "region_id": "13", "comuna_id": "13101", "fecha_inicio": "2025-02-14", "fecha_sentencia": "2025-08-22", "materia_pjud": "Ley 20.000 Art. 4", "articulo_invocado": "4", "tipo_termino": "absolucion", "pena_meses": null, "pena_dias": null, "cumplimiento": null, "gramaje_g_referencia": 12.5, "tipo_sustancia": "cannabis", "genero_imputado": "M", "nacionalidad_imputado": "CL", "defensor_dpp": true, "tiene_receta_medica": true}
{"rol_unico_causa": "RIT 5678-2025", "tribunal_id": "JG-VAL-3", "tribunal_nombre": "3° Juzgado de Garantía de Valparaíso", "region_id": "5", "comuna_id": "5101", "fecha_inicio": "2025-03-08", "fecha_sentencia": "2025-09-12", "materia_pjud": "Ley 20.000 Art. 3", "articulo_invocado": "3", "tipo_termino": "condena", "pena_meses": 18, "pena_dias": 0, "cumplimiento": "remision_condicional", "gramaje_g_referencia": 87.0, "tipo_sustancia": "cannabis", "genero_imputado": "M", "nacionalidad_imputado": "CL", "defensor_dpp": true, "tiene_receta_medica": false}
```

---

## Notas operativas (para el solicitante — borrar antes de enviar)

- **Folio CPLT**: si el PJud rechaza o no responde en 20 días hábiles, escalar a
  amparo ante el Consejo para la Transparencia (CPLT) en `consejotransparencia.cl`.
- **Costo**: la SAIP es gratuita por mandato legal. Cualquier cobro debe ser fundado.
- **Identificación organizacional**: si firma una universidad (ej. Centro Estudios
  Justicia U. Diego Portales) o ONG (ej. Fundación Pro Bono, Espacio Público),
  el plazo de respuesta y nivel de detalle suele mejorar.
- **Plan B si el dataset llega en PDF**: el pipeline ya tiene PyMuPDF integrado
  para extracción de texto. Documentar la pérdida de estructura como limitación
  metodológica.
- **Plan C si rechazan total**: amparo CPLT + presión mediática focalizada en el
  Compromiso N° 5 del 6° Plan Estado Abierto que ellos mismos firmaron.

---

*Borrador generado por el Observatorio Judicial Cannábico v0.1 — abril 2026.*
