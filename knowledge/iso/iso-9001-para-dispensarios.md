# ISO 9001:2015 Aplicado a Dispensarios de Cannabis Medicinal

> ⚠️ **ISO STANDBY desde 2026-05-14** — Este documento describe funcionalidad ISO que está
> **en standby** y se ofrecerá como **módulo marketplace opcional** en el futuro. Knowledge base preservado para futuro `workers/iso` AI auditor. Activación
> per-corp via flag `site_settings.iso_module_enabled` + deploy `workers/iso`.
>
> Ver: `.claude/rules/dispensai-byo-infra.md` · `vault/wiki/architecture/iso-standby-2026-05.md` · engram `dispensai/iso-standby`


> **Aviso**: Este documento es una guía de referencia para administradores de dispensarios que deseen implementar un Sistema de Gestión de Calidad basado en ISO 9001:2015. ISO 9001 ayuda a gestionar procesos, evidencias y mejora continua, pero no prueba por sí sola cumplimiento legal ni autorización sanitaria. No reemplaza asesoría de un consultor certificado ni revisión de counsel.

---

## ¿Por Qué ISO 9001 Aplica a un Dispensario?

Un dispensario de cannabis medicinal es, en esencia, una organización de salud que:
- Entrega productos cuya calidad impacta directamente en la salud del paciente.
- Debe mantener trazabilidad completa desde el cultivo hasta la entrega.
- Está sujeta a auditorías de organismos reguladores (SAG, Ministerio de Salud).
- Gestiona documentación sensible (recetas, fichas de pacientes, registros de inventario).

ISO 9001 provee el marco sistemático para garantizar que todos estos procesos sean consistentes, documentados y mejorables. La certificación no es obligatoria legalmente, pero es una señal de seriedad y profesionalismo ante reguladores, médicos colaboradores y pacientes.

### Qué puede afirmar el agente

- ISO 9001 organiza procesos, registros, no conformidades, auditorías internas y mejora continua.
- Puede apoyar trazabilidad y disciplina documental.
- No sustituye permisos SAG/ISP/SEREMI ni revisión legal.

### Qué debe escalar a humano/counsel

- Declaraciones de cumplimiento legal o sanitario.
- Uso de certificación ISO en comunicaciones públicas, contratos o respuestas a autoridad.
- Interpretación de requisitos regulatorios concretos.

### Controles implementados en DispensAI

- Plantillas de políticas, KPIs, auditoría interna y no conformidades.
- Registro documental para soporte de trazabilidad y mejora.
- Módulo ISO en standby como referencia opcional, no certificación activa.

---

## Los 10 Capítulos de ISO 9001:2015

### Capítulo 4 — Contexto de la Organización

**Qué implica**: Entender el entorno legal, social y de negocios en el que opera el dispensario.

**En la práctica**:
- Mapeo de partes interesadas: pacientes, médicos, reguladores (SAG, ISP, SEREMI), proveedores de cannabis, comunidad local.
- Análisis FODA enfocado en riesgos regulatorios, calidad del producto y reputación.
- Definición del alcance del SGC: ¿incluye solo la dispensación o también la coordinación con cultivo?

---

### Capítulo 5 — Liderazgo

**Qué implica**: La dirección de la organización debe demostrar compromiso con la calidad.

**En la práctica**:
- Política de Calidad redactada y firmada por la dirección (ver sección más adelante).
- Roles y responsabilidades documentados: quién aprueba pacientes, quién gestiona inventario, quién cierra no conformidades.
- Revisión por la dirección al menos una vez al año.

---

### Capítulo 6 — Planificación

**Qué implica**: Identificar riesgos y oportunidades, establecer objetivos de calidad medibles.

**En la práctica**:
- Riesgos frecuentes en dispensarios: paciente sin receta vigente, producto vencido en inventario, error en identificación de producto, brecha de confidencialidad.
- Objetivos de calidad con indicadores (ver sección de KPIs).

---

### Capítulo 7 — Apoyo

**Qué implica**: Asegurar los recursos, competencias, comunicación e información documentada necesarios.

**En la práctica**:
- Capacitación documentada del personal: protocolos de entrega, manejo de recetas, confidencialidad.
- Infraestructura adecuada: almacenamiento en condiciones correctas de temperatura y humedad.
- Control de documentos: versiones vigentes de procedimientos, formularios, registros.

---

### Capítulo 8 — Operación

**Qué implica**: Planificar y controlar los procesos operativos.

**Procesos clave de un dispensario**:

| Proceso | Controles mínimos requeridos |
|---------|------------------------------|
| Admisión de pacientes | Verificación de receta, documentación de identidad, aprobación registrada |
| Recepción de productos | Verificación de COA, registro de lote, condiciones de almacenamiento |
| Dispensación | Coincidencia receta–producto, firma de recepción, registro de cantidad |
| Seguimiento de pacientes | Registro de uso, efectos reportados, fecha próxima renovación |
| Manejo de vencimientos | Revisión semanal de stock, retiro de productos próximos a vencer |

---

### Capítulo 9 — Evaluación del Desempeño

**Qué implica**: Medir, monitorear, analizar y evaluar el SGC.

**En la práctica**:
- Auditorías internas anuales (mínimo) contra los requisitos del propio SGC.
- Seguimiento de KPIs (ver sección de KPIs).
- Satisfacción del paciente: encuestas periódicas, análisis de quejas.
- Revisión por la dirección con los datos de desempeño consolidados.

---

### Capítulo 10 — Mejora

**Qué implica**: Gestionar no conformidades, acciones correctivas y mejora continua.

**En la práctica**:
- Registro formal de no conformidades con causa raíz identificada.
- Plan de acción correctiva con responsable y fecha.
- Verificación de que la acción fue efectiva.
- Ciclo PDCA (Plan–Do–Check–Act) aplicado a cada proceso crítico.

---

## No Conformidades Frecuentes en Dispensarios

Una **no conformidad (NC)** es cualquier desviación de un requisito establecido — ya sea legal, documental o de proceso interno.

### NC Críticas (deben cerrarse en menos de 72 horas)

| No conformidad | Causa raíz típica | Acción correctiva |
|----------------|-------------------|-------------------|
| Dispensación a paciente sin receta vigente | Falta de verificación de fecha al momento de la entrega | Implementar checklist de verificación pre-entrega; capacitar al personal |
| Producto vencido entregado | Sistema de inventario sin alerta de vencimientos | Implementar revisión semanal obligatoria con registro |
| Brecha de confidencialidad (datos de paciente expuestos) | Acceso no controlado a registros físicos o digitales | Revisión de control de acceso, registro de incidente, notificación si aplica |

### NC Mayores (deben cerrarse en menos de 15 días hábiles)

| No conformidad | Causa raíz típica |
|----------------|-------------------|
| Producto sin COA vigente en inventario | Proveedor no entregó documentación; control de recepción inadecuado |
| Registro de dispensación incompleto | Formulario mal diseñado o procedimiento no seguido |
| Personal sin capacitación documentada | Plan de inducción sin seguimiento |
| Temperatura de almacenamiento fuera de rango | Falla de equipo no detectada; falta de monitoreo |

### NC Menores (deben cerrarse en menos de 30 días hábiles)

| No conformidad | Ejemplo |
|----------------|---------|
| Documento desactualizado en uso | Formulario con versión antigua |
| Registro faltante en proceso no crítico | Bitácora de temperatura con días sin registrar |
| Capacitación vencida (más de 12 meses) | Personal sin recertificación en manejo confidencial de datos |

---

## KPIs Mínimos para el SGC

Los indicadores deben tener meta, frecuencia de medición y responsable.

| KPI | Meta sugerida | Frecuencia | Fuente de datos |
|-----|---------------|------------|-----------------|
| % de entregas con receta vigente verificada | 100% | Mensual | Registro de dispensación |
| % de productos con COA vigente en stock | 100% | Mensual | Inventario |
| Tiempo promedio de aprobación de paciente nuevo | < 5 días hábiles | Mensual | Registro de admisiones |
| Satisfacción del paciente (escala 1–10) | ≥ 8.0 | Trimestral | Encuesta post-dispensación |
| % de NC cerradas a tiempo | ≥ 90% | Mensual | Registro de NC |
| Temperatura de almacenamiento fuera de rango (incidentes) | 0 por mes | Mensual | Bitácora de temperatura |
| % de personal con capacitación al día | 100% | Semestral | Registro de capacitaciones |
| Tiempo de respuesta a queja de paciente | < 5 días hábiles | Por evento | Registro de quejas |

---

## Política de Calidad — Template Genérico

La Política de Calidad es un documento breve (1–2 páginas) que expresa el compromiso de la dirección con la calidad. Debe ser:
- Apropiada al propósito de la organización.
- Marco para establecer objetivos de calidad.
- Comprometida con la mejora continua.
- Comunicada y comprendida por todo el personal.

**Template base** (adaptar con datos del dispensario):

---

*Política de Calidad — [NOMBRE_DISPENSARIO]*

[NOMBRE_DISPENSARIO] es una organización sin fines de lucro cuya misión es mejorar la calidad de vida de personas con condiciones médicas que se benefician del tratamiento con cannabis medicinal, dentro del marco legal vigente en Chile.

Nos comprometemos a:

1. **Garantizar la calidad e inocuidad del producto** que dispensamos, mediante verificación de certificados de análisis, control de condiciones de almacenamiento y trazabilidad completa de cada lote.

2. **Cumplir los requisitos legales y reglamentarios** aplicables: Ley 20.000, Decreto 84, autorizaciones SAG vigentes, y cualquier normativa del Ministerio de Salud pertinente a nuestra operación.

3. **Proteger la confidencialidad y dignidad** de cada paciente, en cumplimiento de la Ley 20.584 y la Ley 19.628.

4. **Mejorar continuamente** nuestros procesos de admisión, dispensación, seguimiento y documentación, basándonos en datos, retroalimentación de pacientes y resultados de auditorías internas.

5. **Capacitar y comprometer a nuestro equipo** en el entendimiento y cumplimiento de esta política.

Esta política es revisada anualmente por la dirección y está disponible para pacientes, personal y partes interesadas que la soliciten.

*Firmado por: __________________________________ | Cargo: Dirección*
*Fecha de aprobación: __________________________*
*Versión: 1.0*

---

## Auditorías Internas

### Frecuencia mínima
- **Auditoría completa del SGC**: al menos una vez al año.
- **Auditorías de proceso crítico** (dispensación, almacenamiento, admisiones): recomendado cada 6 meses.

### Cómo documentar una auditoría interna

**Paso 1 — Planificación**:
- Definir alcance (qué procesos se auditan), auditor(es) (idealmente no el responsable del proceso), fecha y criterios de auditoría (requisito del SGC a verificar).

**Paso 2 — Ejecución**:
- Revisar documentos, registros y evidencias.
- Entrevistar al personal.
- Observar el proceso en operación real.
- Registrar hallazgos en formulario: conforme / no conforme / oportunidad de mejora.

**Paso 3 — Informe**:
- Resumen de hallazgos con evidencia objetiva.
- Lista de no conformidades detectadas con referencia al requisito incumplido.
- Oportunidades de mejora identificadas.

**Paso 4 — Plan de cierre**:
- Por cada NC: acción correctiva, responsable, fecha comprometida.
- Seguimiento de cierre: verificar que la acción fue implementada y es efectiva.

### Formulario mínimo de auditoría (campos)

```
INFORME DE AUDITORÍA INTERNA
Dispensario: [NOMBRE_DISPENSARIO]
Fecha: ____________
Auditor: ____________
Proceso auditado: ____________
Alcance: ____________

HALLAZGOS:
[ ] Conforme | [ ] NC Crítica | [ ] NC Mayor | [ ] NC Menor | [ ] Oportunidad de Mejora
Descripción: ________________________________
Evidencia objetiva: ________________________________
Referencia a requisito: ________________________________

PLAN DE ACCIÓN:
Acción correctiva: ________________________________
Responsable: ________________________________
Fecha compromiso: ____________
Fecha verificación efectividad: ____________

Firma auditor: ______________ Firma dirección: ______________
```

---

## Implementación Gradual Recomendada

Para dispensarios que parten de cero, un plan de implementación en 3 fases:

**Fase 1 — Documentación base (mes 1–2)**:
- Redactar y aprobar Política de Calidad.
- Mapear procesos clave y documentar procedimientos críticos (dispensación, admisión, almacenamiento).
- Diseñar formatos de registro.
- Establecer archivo documental (físico o digital).

**Fase 2 — Operación controlada (mes 3–4)**:
- Capacitar a todo el personal en los nuevos procedimientos.
- Activar el sistema de KPIs con medición mensual.
- Implementar el registro de no conformidades.
- Primera revisión de indicadores por la dirección.

**Fase 3 — Auditoría y mejora (mes 5–6)**:
- Realizar primera auditoría interna completa.
- Analizar hallazgos y cierre de NC.
- Revisión por la dirección con datos consolidados.
- Evaluar si buscar certificación externa (organismo certificador acreditado por INN).

---

*Vigente al: agosto 2026.*
