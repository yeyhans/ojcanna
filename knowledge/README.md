# Base de Conocimiento — DispensAI

Esta carpeta contiene los documentos markdown que alimentan el **chatbot RAG** de DispensAI.

## Cómo Funciona

1. Cada archivo `.md` se importa manualmente desde `/admin/conocimiento/nuevo`.
2. Al guardar, el sistema hace chunking (~2000 caracteres por chunk) y genera embeddings via `text-embedding-3-small`.
3. Los vectores se almacenan en `knowledge_embeddings` (pgvector, 1536 dimensiones).
4. Cuando un usuario hace una pregunta, se busca por similitud coseno (umbral 0.78, top 5 chunks) y el resultado alimenta a GPT-4o via `streamText`.

Los archivos `.md` son **semilla** — no se leen en runtime. Cambiar un archivo no actualiza el chatbot hasta que se reimporte desde el admin.

---

## Estructura de Categorías

La categoría define qué agente puede acceder al documento:

| Categoría | Acceso | Descripción |
|-----------|--------|-------------|
| `marco-legal` | Público + Paciente + Admin | Marco legal chileno (Ley 20.000, SAG, derechos del paciente) |
| `procesos` | Público + Paciente + Admin | Cómo funciona el sistema: obtener receta, qué es un dispensario |
| `politicas` | Público + Paciente + Admin | Ética, confidencialidad, principios organizacionales |
| `general` | Público + Paciente + Admin | Seguridad de uso, preguntas frecuentes |
| `productos` | Solo Paciente + Admin | Tipos de productos, dosificación — solo para pacientes aprobados |
| `iso-calidad` | Solo Admin | ISO 9001, ISO 27001 — solo para operadores del dispensario |
| `iso-rse` | Solo Admin | ISO 26000 — solo para operadores del dispensario |

> Los agentes `public` (sin login) y `patient` (aprobado) hacen sus consultas filtradas por categoría via `match_knowledge_by_categories()` RPC. El agente `admin` accede a todo.

---

## Documentos Disponibles

### `marco-legal/` — Marco Legal Chileno

| Archivo | Contenido |
|---------|-----------|
| `marco-legal-operativo-agentes.md` | Índice operativo para agentes: separación entre ley verificable, controles implementados, supuestos pendientes de counsel, cannabis controlado, datos de salud, Ley 19.628/Ley 21.719, Ley 21.663, OTS y límites ISO |
| `ley-cannabis-chile-2025.md` | Marco general de cannabis medicinal en Chile: Ley 20.000, Ley 21.575, autoridades competentes, límites de afirmación del agente y materias que requieren counsel |
| `derechos-del-paciente.md` | Ley 20.584, confidencialidad clínica, datos personales bajo Ley 19.628, transición Ley 21.719 desde 2026-12-01, solicitudes de terceros y escalamiento humano |
| `cultivo-autocultivo-legal.md` | Autocultivo, cultivo comercial/SAG y supuestos asociativos/cooperativos con separación entre orientación informativa, controles DispensAI y validación legal pendiente |
| `importacion-exportacion-legal.md` | Importación/exportación y viajes: orientación informativa, verificación ISP/Aduanas/autoridad competente y prohibición de asumir reconocimiento internacional de recetas |
| `legislacion-laboral-y-cannabis.md` | Marco laboral informativo: confidencialidad médica, tests laborales, impairment vs metabolitos, conductores/tareas críticas y derivación a abogado laboral/DT/SUSESO |

### `general/` — Seguridad y Preguntas Frecuentes

| Archivo | Contenido |
|---------|-----------|
| `seguridad-uso-cannabis-medicinal.md` | "Start low go slow" con mg reales, cuándo llamar al médico vs ir a urgencias, síndrome de hiperémesis cannabinoide (CHS), interacciones críticas (alcohol, benzodiacepinas, opioides, anticoagulantes), contraindicaciones absolutas, tiempos de impairment por vía |
| `cannabis-medicinal-preguntas-frecuentes.md` | Cannabis medicinal vs recreativo, THC vs CBD, riesgo de dependencia, interacciones con otros medicamentos, tiempo de acceso por vía, cobertura Fonasa, receta electrónica, menores de edad, hospitalización, conducción, viajes al extranjero |

### `iso/` — Sistema Integrado de Gestión (SIG)

| Archivo | Categoría | Contenido |
|---------|-----------|-----------|
| `iso-9001-para-dispensarios.md` | `iso-calidad` | Los 10 capítulos de ISO 9001:2015 aplicados a dispensarios, no conformidades frecuentes con causa raíz y acciones, KPIs mínimos para certificación, template de Política de Calidad, guía de auditorías internas, plan de implementación en 3 fases |
| `iso-26000-rse-cannabis-medicinal.md` | `iso-rse` | Las 7 materias fundamentales de ISO 26000 aplicadas a dispensarios, tabla de grupos de interés (stakeholders), programa de acceso para pacientes con recursos limitados, indicadores de impacto social, relación con medios y comunicación pública, template de informe RSE anual |
| `iso-27001-para-dispensarios.md` | `iso-calidad` | SGSI para dispensarios: marco legal chileno (Ley 19.628 vigente, Ley 21.719 futura, Ley 21.663 ciberseguridad), activos de información, riesgos, controles prioritarios, incidentes con tiempos de referencia y caveat OIV, OTS como evidencia de integridad, integración con ISO 9001/26000 |

### `politicas/` — Ética y Confidencialidad

| Archivo | Contenido |
|---------|-----------|
| `politica-confidencialidad-generica.md` | Datos recopilados, confidencialidad, tratamiento de datos de salud, Ley 19.628 vigente, transición Ley 21.719, incidentes Ley 21.663 y escalamiento humano/counsel |
| `codigo-de-etica-organizacion-cannabis.md` | 7 principios: acceso equitativo, no lucro real, cero tolerancia con menores, no facilitar uso recreativo, privacidad como valor fundamental, honestidad y no promesas falsas, calidad del producto sin compromisos. Gestión de conflictos de interés, canales de denuncia (Ministerio Salud, SAG, PDI), protocolo ante paciente en crisis |

### `procesos/` — Cómo Funciona el Sistema

| Archivo | Contenido |
|---------|-----------|
| `clinicas-y-medicos-receta-cannabis-chile.md` | Listado de plataformas y clínicas para obtener receta (recetacannabis.cl, medcann.cl, narma.cl, elcannal.cl, mariamed.cl, LAR Centro Médico, cannabimed.cl), qué debe decir la receta para quedar bien emitida, cómo verificar una clínica legítima, señales de alerta de "consultoras" ilegales |
| `proceso-obtencion-cannabis-medicinal.md` | 6 pasos: determinar si aplica → receta → elegir vía de acceso (farmacia/dispensario/autocultivo/importación) → registrarse → primera entrega → seguimiento. Situaciones especiales: receta vencida, hospitalización, cambio de médico |
| `que-es-un-dispensario-y-como-funciona.md` | Qué es un dispensario, respaldo documental, límites del modelo de donaciones/membresía, obligaciones de trazabilidad, privacidad y escalamiento legal |
| `renovacion-y-continuidad-tratamiento.md` | Vigencia de receta según producto y normativa aplicable, proceso de renovación, qué llevar al control médico, cambio de médico tratante, baja temporal, historial de tratamiento, cambio de dispensario |

### `productos/` — Productos y Dosificación (Solo Pacientes)

| Archivo | Contenido |
|---------|-----------|
| `tipos-de-productos-guia-generica.md` | Flores (solo vaporización, no fumar, cálculo de % THC/CBD, biodisponibilidad 30–40%), aceites (sublingual 20–35% vs deglución 6–12%, cómo leer etiqueta mg/mL), cápsulas (efecto primer paso hepático, esperar 2–3h antes de redosificar), tópicos (acción local, no sistémica), qué no está regulado en Chile (comestibles, bebidas, vapes), cómo leer un COA |
| `dosificacion-inicio-seguro.md` | Protocolo "start low go slow" semana a semana, fórmulas de cálculo por tipo de producto, tablas orientativas por condición (dolor crónico, ansiedad, insomnio, espasticidad, epilepsia), señales de dosis excesiva y qué hacer, tolerancia y cómo manejarla |

---

---

## Importar un Documento

1. Ir a `/admin/conocimiento/nuevo`
2. Pegar el contenido del archivo `.md`
3. Seleccionar la categoría correcta
4. Guardar — el sistema genera embeddings automáticamente via `POST /api/embeddings`

Para reimportar un documento editado: ir a `/admin/conocimiento/[id]/editar` → guardar → los embeddings se regeneran.

---

## Reglas de Contenido para Nuevos Documentos

- **Sin referencias tenant-específicas** — nunca nombres de dispensarios, emails, precios en CLP hardcodeados
- **Disclaimer médico al inicio** — "Esta información es educativa. Siempre consultar con el médico tratante."
- **Secciones h2 claras** — el chunker corta cada ~2000 caracteres; los h2 ayudan a que los cortes sean en puntos lógicos
- **Fuentes legales citadas** — cada afirmación legal cita la ley, decreto o resolución exacta
- **Fecha de vigencia al final** — `*Vigente al: [mes año]*` para saber cuándo actualizar
- **Placeholders para datos del tenant** — usar `[NOMBRE_DISPENSARIO]`, `[EMAIL_CONTACTO]` donde aplique
- **Separación legal/producto** — distinguir ley verificable, control implementado en DispensAI y supuesto pendiente de counsel
