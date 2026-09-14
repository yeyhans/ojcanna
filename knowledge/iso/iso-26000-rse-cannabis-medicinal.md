# ISO 26000 — Responsabilidad Social para Dispensarios de Cannabis Medicinal

> ⚠️ **ISO STANDBY desde 2026-05-14** — Este documento describe funcionalidad ISO que está
> **en standby** y se ofrecerá como **módulo marketplace opcional** en el futuro. Knowledge base preservado para futuro `workers/iso` AI auditor. Activación
> per-corp via flag `site_settings.iso_module_enabled` + deploy `workers/iso`.
>
> Ver: `.claude/rules/dispensai-byo-infra.md` · `vault/wiki/architecture/iso-standby-2026-05.md` · engram `dispensai/iso-standby`


> **Aviso**: ISO 26000 no es una norma certificable. No existe un organismo que emita una certificación ISO 26000. Su valor es como marco de referencia y guía de implementación para responsabilidad social. No prueba cumplimiento legal ni autoriza operaciones de cannabis.

---

## ¿Qué es ISO 26000 y Por Qué Importa a un Dispensario?

ISO 26000:2010 es una guía internacional sobre responsabilidad social (RS) que puede aplicarse a cualquier tipo de organización, independientemente de su tamaño o sector.

Para un dispensario de cannabis medicinal, la RS no es opcional — es estructural:
- La organización opera en un sector estigmatizado que debe ganarse continuamente la confianza de la comunidad y los reguladores.
- Sus decisiones afectan directamente la salud de personas vulnerables.
- El modelo sin fines de lucro implica una obligación ética de devolver valor a la comunidad.
- La reputación es un activo crítico: un escándalo ético puede llevar al cierre de la organización.

### Qué puede afirmar el agente

- ISO 26000 orienta responsabilidad social, gobernanza, derechos humanos, prácticas laborales, medio ambiente, prácticas justas, asuntos de pacientes y comunidad.
- No es certificable y no equivale a cumplimiento legal.

### Qué debe escalar a humano/counsel

- Comunicaciones públicas sobre impacto social, donaciones, acceso o legalidad.
- Declaraciones que puedan interpretarse como certificación o garantía normativa.
- Programas de acceso que afecten derechos, datos sensibles o condiciones económicas de pacientes.

### Controles implementados en DispensAI

- Knowledge ISO/RSE como guía de buenas prácticas.
- Reglas de privacidad, no discriminación y comunicación responsable para agentes.
- Módulo ISO en standby como referencia opcional.

---

## Las 7 Materias Fundamentales de ISO 26000

### Materia 1 — Gobernanza de la Organización

**Qué significa**: Los sistemas y procesos por los cuales la organización toma decisiones y rinde cuentas.

**En un dispensario**:
- Estructura directiva clara con roles definidos (directorio, equipo ejecutivo, comités).
- Procesos transparentes de toma de decisiones: ¿cómo se decide qué productos dispensar? ¿cómo se determina el sistema de donaciones?
- Gestión de conflictos de interés declarada y documentada.
- Revisión periódica del desempeño de la organización con las partes interesadas.
- Rendición de cuentas a los socios sobre el uso de los excedentes.

**Acciones concretas mínimas**:
- Estatutos o reglamento interno actualizado y accesible.
- Actas de sesiones de directorio.
- Declaración anual de uso de fondos disponible para socios.

---

### Materia 2 — Derechos Humanos

**Qué significa**: Respeto por los derechos fundamentales de todas las personas con las que la organización interactúa.

**En un dispensario**:
- No discriminación en el acceso al tratamiento (Ley 20.000 + Ley 20.584).
- Acceso equitativo para personas en situación de pobreza: programas de apoyo económico sin estigmatización.
- Respeto a la dignidad del paciente en cada interacción.
- No exigir información personal más allá de lo requerido por la ley.
- Protección especial para pacientes en situación de vulnerabilidad (adultos mayores, personas con discapacidad).

**Acciones concretas mínimas**:
- Política de acceso equitativo documentada.
- Programa de apoyo a pacientes con recursos limitados (aunque sea informal).
- Protocolo de atención para pacientes con discapacidad o necesidades especiales.

---

### Materia 3 — Prácticas Laborales

**Qué significa**: Condiciones de trabajo justas para todo el personal, remunerado o voluntario.

**En un dispensario**:
- Contratos de trabajo claros (aunque sea modalidad voluntariado — en ese caso, acuerdos documentados).
- Pago de remuneraciones justas al personal remunerado, cumpliendo la legislación laboral chilena.
- Ambiente de trabajo seguro y libre de acoso.
- Acceso a capacitación y desarrollo profesional.
- No discriminación en la contratación.
- Si hay voluntarios: protocolos claros sobre sus derechos y responsabilidades.

**Acciones concretas mínimas**:
- Reglamento interno de trabajo actualizado.
- Registro de horas y remuneraciones.
- Canal de denuncia de acoso o malos tratos.

---

### Materia 4 — Medio Ambiente

**Qué significa**: Minimizar el impacto ambiental de las operaciones.

**En un dispensario**:
- Gestión de residuos: ¿cómo se eliminan los productos vencidos o dañados? (residuos peligrosos).
- Eficiencia energética en instalaciones y almacenamiento.
- Si hay cultivo asociado: gestión de agua, pesticidas y residuos de cosecha.
- Materiales de embalaje: reducir plásticos de un solo uso cuando sea posible.

**Acciones concretas mínimas**:
- Protocolo de destrucción de productos vencidos (con registro).
- Registro de consumo energético si tienen instalaciones propias de cultivo.

---

### Materia 5 — Prácticas Justas de Operación

**Qué significa**: Comportamiento ético en las relaciones con otras organizaciones y en el mercado.

**En un dispensario**:
- Relaciones con proveedores (cultivadores): contratos justos, pago oportuno, no abuso de posición dominante.
- No prácticas corruptas: no soborno a funcionarios reguladores, no falsificación de documentos.
- Transparencia con médicos colaboradores: no ofrecer beneficios a cambio de derivaciones.
- Respeto a la propiedad intelectual.
- No competencia desleal con otras organizaciones del sector.

**Acciones concretas mínimas**:
- Contratos con proveedores documentados.
- Política anticorrupción.
- Declaración de no incentivos a médicos.

---

### Materia 6 — Asuntos de Consumidores (Pacientes)

**Qué significa**: Proteger los intereses de los pacientes como consumidores de los productos y servicios del dispensario.

**En un dispensario** (esta es la materia más crítica):

**Información veraz y accesible**:
- Etiquetado completo y correcto de productos.
- Información sobre efectos, dosis y contraindicaciones en lenguaje comprensible.
- No hacer promesas falsas sobre los beneficios del cannabis.

**Seguridad del producto**:
- COA (Certificado de Análisis) de cada lote.
- Procedimientos de retiro de producto si se detecta contaminación.
- Almacenamiento y cadena de frío (si aplica) correctamente documentados.

**Privacidad y protección de datos**:
- Cumplimiento estricto de Ley 19.628 y Ley 20.584.
- Datos del paciente no compartidos con terceros sin consentimiento.

**Atención de quejas**:
- Canal formal de quejas accesible y respondido en plazo razonable (máximo 5 días hábiles).
- Registro de todas las quejas recibidas y su resolución.
- Seguimiento de satisfacción del paciente.

**Acceso para personas vulnerables**:
- Materiales informativos en formatos accesibles (letra grande, versión simplificada).
- Atención preferencial para adultos mayores o personas con discapacidad.

---

### Materia 7 — Participación Activa y Desarrollo de la Comunidad

**Qué significa**: Contribuir al desarrollo de la comunidad donde opera la organización.

**En un dispensario**:
- **Educación en salud**: charlas para pacientes y familiares, talleres de uso seguro.
- **Desestigmatización**: comunicación pública responsable que combata el estigma del cannabis medicinal.
- **Colaboración con el sistema de salud**: relación constructiva con médicos, CESFAM, hospitales.
- **Apoyo a investigación**: colaborar con universidades o centros de investigación si hay capacidad.
- **Impacto en pacientes vulnerables**: programas de acceso para personas de bajos recursos.

---

## Grupos de Interés (Stakeholders) de un Dispensario

Identificar y gestionar las expectativas de cada grupo de interés es central en ISO 26000.

| Grupo de Interés | Expectativas Principales | Cómo Relacionarse |
|------------------|--------------------------|-------------------|
| Pacientes | Acceso seguro, productos de calidad, confidencialidad, trato digno | Encuestas de satisfacción, reuniones informativas, canal de quejas |
| Familiares de pacientes | Información comprensible, seguridad del tratamiento | Talleres educativos, material informativo |
| Médicos colaboradores | Transparencia en productos, seguimiento de pacientes, no promesas falsas | Reuniones periódicas, informes de seguimiento |
| Reguladores (SAG, ISP, SEREMI) | Cumplimiento legal, documentación completa, trazabilidad | Comunicación proactiva, auditorías colaborativas |
| Comunidad local | Discreción, bajo perfil, no aumento de tráfico conflictivo | Reuniones con vecinos si hay sede física, comunicación preventiva |
| Cultivadores / proveedores | Contratos justos, pago oportuno, requisitos claros de calidad | Contratos formales, visitas de inspección de buenas prácticas |
| Personal y voluntarios | Condiciones laborales justas, capacitación, reconocimiento | Plan de capacitación, evaluaciones periódicas |

---

## Programa de Acceso para Pacientes con Recursos Limitados

### Por qué es necesario

Si el tenant usa un modelo de aportes, cuotas o donaciones, este debe estar revisado legalmente y comunicado con precisión. En la práctica, esos aportes suelen financiar costos reales (análisis de laboratorio, producción, administración). Una política de acceso para personas de escasos recursos es una buena práctica ética alineada con ISO 26000, no una autorización legal por sí misma.

### Cómo diseñarlo éticamente

**Criterios de elegibilidad** (claros, objetivos, no discriminatorios):
- Acreditar situación socioeconómica mediante documentos reconocidos: certificado de residencia + cotizaciones Fonasa si aplica, o declaración simple.
- El criterio no puede ser subjetivo ni estar sujeto a la apreciación personal del staff.

**Proceso**:
- El paciente solicita el apoyo al momento de la admisión o en cualquier momento durante el tratamiento.
- Se evalúa la solicitud con los criterios establecidos.
- La decisión se registra y notifica al paciente con respeto y sin estigmatización.

**Tipos de apoyo**:
- Donación sugerida reducida (porcentaje fijo de reducción).
- Donación diferida (pagar cuando las condiciones lo permitan).
- Gratuidad total para casos de extrema vulnerabilidad (límite mensual definido por capacidad de la organización).

**Sostenibilidad**:
- El programa debe ser financieramente sostenible. Definir un porcentaje máximo de atenciones subsidiadas según el presupuesto.
- Si la demanda supera la capacidad, mantener lista de espera con criterio de urgencia médica.

---

## Indicadores de Impacto Social Mínimos

Medir el impacto social es parte de la transparencia que ISO 26000 promueve.

| Indicador | Descripción | Frecuencia |
|-----------|-------------|------------|
| Número de pacientes activos | Total de pacientes con tratamiento activo | Mensual |
| Distribución por condición médica | % de pacientes por diagnóstico principal | Semestral |
| Distribución geográfica | Regiones o comunas de origen de los pacientes | Semestral |
| % de pacientes con acceso subsidiado | Pacientes que reciben apoyo económico | Mensual |
| Quejas recibidas | Número y tipo de quejas, tiempo de resolución | Mensual |
| Satisfacción del paciente | Puntaje promedio en encuesta de satisfacción | Trimestral |
| Actividades educativas realizadas | Charlas, talleres, materiales distribuidos | Semestral |
| Tiempo promedio de espera para primera entrega | Desde solicitud hasta primera dispensación | Mensual |

---

## Relación con Medios y Comunicación Pública

La comunicación pública de un dispensario requiere equilibrio entre visibilidad y prudencia legal.

### Qué sí comunicar

- Misión y valores de la organización.
- Información educativa sobre cannabis medicinal (rigor científico, sin exageraciones).
- Logros de impacto social: número de pacientes atendidos, talleres realizados.
- Novedades normativas que afecten a los pacientes.
- Transparencia sobre el uso de fondos (cuando corresponda).

### Qué no comunicar

- Datos identificables de pacientes sin consentimiento explícito (ni con consentimiento, si el paciente podría sufrir consecuencias).
- Declaraciones que impliquen que el dispensario "vende" cannabis o que el modelo de donaciones/membresía está legalmente validado sin revisión de counsel.
- Promesas de curación o beneficios terapéuticos que no estén respaldados por evidencia científica.
- Comentarios que impliquen toma de posición política en el debate de legalización recreativa.
- Precios o condiciones de donación en canales públicos no controlados.

### Redes sociales y marketing

- Mantener un tono educativo, no comercial.
- Instagram y Facebook prohíben la promoción de cannabis en muchos países — revisar las políticas vigentes de cada plataforma antes de publicar.
- Nunca mostrar productos en forma que pueda interpretarse como publicidad de drogas.
- Siempre incluir advertencia de uso medicinal y requiero de receta médica.

---

## Revisión y Reporte de RSE

### Informe de RSE

Se recomienda que los dispensarios elaboren un informe anual de RSE que incluya:

1. **Carta de la dirección**: compromiso y objetivos del período.
2. **Perfil de la organización**: misión, estructura, alcance de operaciones.
3. **Desempeño por materia fundamental**: logros y desafíos en cada una de las 7 materias.
4. **Indicadores de impacto social**: tabla con resultados vs. metas.
5. **Gestión de grupos de interés**: cómo se relacionaron con cada grupo.
6. **Desafíos y mejoras para el próximo período**.

Este informe no requiere verificación externa, pero tiene alto valor si se comparte con socios, pacientes y reguladores.

---

*Vigente al: agosto 2026.*
