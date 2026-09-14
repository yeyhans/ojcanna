# ISO 27001:2022 — Seguridad de la Información para Dispensarios de Cannabis Medicinal

> ⚠️ **ISO STANDBY desde 2026-05-14** — Este documento describe funcionalidad ISO que está
> **en standby** y se ofrecerá como **módulo marketplace opcional** en el futuro. Knowledge base preservado para futuro `workers/iso` AI auditor. Activación
> per-corp via flag `site_settings.iso_module_enabled` + deploy `workers/iso`.
>
> Ver: `.claude/rules/dispensai-byo-infra.md` · `vault/wiki/architecture/iso-standby-2026-05.md` · engram `dispensai/iso-standby`


> **Aviso**: Este documento es una guía de referencia para administradores de dispensarios que deseen implementar un Sistema de Gestión de Seguridad de la Información (SGSI) basado en ISO 27001:2022. ISO 27001 ayuda a gestionar riesgos y evidencias, pero no prueba por sí sola cumplimiento legal. Consultar con un consultor certificado CISA/CISM, counsel y responsables técnicos para implementación formal.

---

## ¿Por Qué ISO 27001 es Especialmente Crítico en un Dispensario?

Un dispensario de cannabis medicinal maneja datos que se encuentran entre los más sensibles que puede tener una persona:

- **Diagnóstico médico y condición de salud**: estigma social y laboral potencial.
- **RUT + domicilio + teléfono**: datos de identidad completos.
- **Recetas médicas**: revelan el médico tratante, la patología y el tratamiento.
- **Firma digital y fotografías de documentos de identidad**.
- **Historial de compras/donaciones**: revela consumo de sustancia controlada.

Una brecha de estos datos puede causar daño real a los pacientes: discriminación laboral, problemas con seguros de salud, exposición pública involuntaria. La seguridad de la información no es solo una obligación legal — es una obligación ética fundamental.

---

## Marco Legal Chileno Relacionado con Seguridad de Datos

| Norma | Relevancia |
|-------|-----------|
| **Ley 19.628** (Protección de Datos Personales) | Regula el tratamiento de datos personales; obligaciones de seguridad, consentimiento y derechos del titular |
| **Ley 20.584** (Derechos y Deberes del Paciente) | Garantiza la confidencialidad de la información de salud |
| **Ley 21.663** (Ley Marco de Ciberseguridad) | Marco de ciberseguridad e incidentes. La aplicabilidad y obligaciones concretas dependen de la calificación de la organización y autoridad competente. |
| **Ley 21.719** (nueva Ley de Protección de Datos Personales) | Moderniza el régimen de datos personales. Entrada en vigencia general: **2026-12-01**. Preparar transición, sin tratarla como plenamente vigente antes de esa fecha. |
| **Resolución ISP 5.500** | Exige trazabilidad de registros — implica responsabilidad sobre su integridad |

**Nota**: no confundir Ley 21.663 con la nueva ley de datos personales. La primera es ciberseguridad; la segunda es Ley 21.719. Para notificaciones regulatorias, confirmar aplicabilidad con counsel o asesor especializado.

### Qué puede afirmar el agente

- ISO 27001 estructura la gestión de riesgos, controles, evidencias e incidentes.
- Los datos de salud y recetas son información sensible que requiere controles estrictos.
- Ley 19.628 está vigente y Ley 21.719 exige preparación de transición hacia 2026-12-01.

### Qué debe escalar a humano/counsel

- Determinar si el tenant está sujeto a obligaciones específicas de Ley 21.663.
- Definir reportes formales a autoridad, pacientes o terceros.
- Declarar cumplimiento legal, alcance certificado o equivalencia ISO/legal.

### Controles implementados en DispensAI

- Separación de tenant, autorización por servidor y RLS cuando corresponde.
- Logs, documentos y sellos de evidencia para auditoría.
- Knowledge ISO en standby como módulo opcional, no como certificación activa.

---

## Estructura de ISO 27001:2022

### Cláusulas Principales (4–10)

ISO 27001:2022 sigue la misma estructura de alto nivel que ISO 9001:2015, lo que facilita la integración de ambos sistemas.

| Cláusula | Nombre | Foco principal |
|----------|--------|----------------|
| 4 | Contexto | Entender quién puede afectar o ser afectado por la seguridad de la información |
| 5 | Liderazgo | Compromiso de la dirección con el SGSI, política de seguridad |
| 6 | Planificación | Evaluación de riesgos de seguridad, declaración de aplicabilidad |
| 7 | Apoyo | Recursos, competencias, concienciación, comunicación, documentación |
| 8 | Operación | Implementación y control de procesos de seguridad, gestión de incidentes |
| 9 | Evaluación | Monitoreo, auditoría interna, revisión por la dirección |
| 10 | Mejora | Tratamiento de no conformidades, mejora continua |

### Anexo A — Controles de Seguridad (93 controles en 4 grupos)

Los controles del Anexo A son las medidas concretas de seguridad. No todos son obligatorios — se seleccionan según la evaluación de riesgos.

| Grupo | Número de controles | Ejemplos relevantes para dispensario |
|-------|---------------------|--------------------------------------|
| Controles organizacionales | 37 | Política de seguridad, roles, gestión de activos, respuesta a incidentes |
| Controles de personas | 8 | Capacitación, acuerdos de confidencialidad, teletrabajo seguro |
| Controles físicos | 14 | Acceso a instalaciones, escritorios limpios, destrucción segura de documentos |
| Controles tecnológicos | 34 | Autenticación, cifrado, logs de acceso, gestión de parches, backups |

---

## Activos de Información de un Dispensario

El primer paso del SGSI es identificar qué se debe proteger.

### Activos Críticos

| Activo | Formato | Riesgo principal |
|--------|---------|-----------------|
| Base de datos de pacientes | Digital (Supabase/nube) | Acceso no autorizado, filtración |
| Recetas médicas digitalizadas | Digital (R2/S3) | Acceso no autorizado, alteración |
| Documentos de identidad (fotos) | Digital (R2/S3) | Filtración, uso fraudulento |
| Sistema de gestión (software) | Digital | Ransomware, acceso no autorizado |
| Registros de dispensación | Digital y/o papel | Alteración, acceso por terceros |
| Claves de acceso y API keys | Digital | Compromiso de sistemas |
| Fichas físicas (si existen) | Papel | Robo, acceso físico no autorizado |

### Inventario de Activos (Práctica Mínima)

Mantener un registro simple con: nombre del activo, formato, propietario responsable, clasificación (público / interno / confidencial / restringido), y medidas de protección actuales.

---

## Evaluación de Riesgos de Seguridad

### Metodología simplificada

```
Riesgo = Probabilidad × Impacto

Probabilidad: 1 (muy baja) a 5 (muy alta)
Impacto: 1 (mínimo) a 5 (catastrófico)
```

### Riesgos típicos en un dispensario

| Amenaza | Probabilidad | Impacto | Nivel | Control recomendado |
|---------|-------------|---------|-------|---------------------|
| Acceso no autorizado a BD pacientes | Media (3) | Crítico (5) | ALTO (15) | Autenticación multifactor, RLS estricto |
| Phishing a personal administrativo | Alta (4) | Alto (4) | ALTO (16) | Capacitación, filtros de correo |
| Dispositivo perdido/robado con datos | Media (3) | Alto (4) | ALTO (12) | Cifrado de disco, política BYOD |
| Brecha en proveedor cloud (Supabase/R2) | Baja (2) | Crítico (5) | ALTO (10) | Cifrado en tránsito y reposo, evaluación de proveedores |
| Acceso físico no autorizado a instalaciones | Baja (2) | Alto (4) | MEDIO (8) | Control de acceso físico, escritorio limpio |
| Insider threat (personal malintencionado) | Baja (2) | Crítico (5) | ALTO (10) | Principio de mínimo privilegio, logs de acceso |
| Ransomware | Baja (2) | Crítico (5) | ALTO (10) | Backups offline, parches actualizados |
| Error humano (enviar datos al paciente equivocado) | Media (3) | Alto (4) | ALTO (12) | Revisión doble antes de envío, capacitación |

---

## Controles Prioritarios para Dispensarios

### Acceso y Autenticación

- **Principio de mínimo privilegio**: cada persona accede solo a lo que necesita para su función.
- **Autenticación multifactor (MFA)**: obligatoria para acceso al sistema de gestión.
- **Contraseñas seguras**: mínimo 12 caracteres, gestión con password manager.
- **Cuentas individuales**: prohibido compartir credenciales, incluso dentro del equipo.
- **Revocación inmediata**: cuando un colaborador deja la organización, sus accesos se eliminan en el día.
- **Revisiones de acceso**: verificar trimestralmente que los permisos de cada persona siguen siendo apropiados.

### Gestión de Datos de Pacientes

- **Cifrado en tránsito**: toda comunicación vía HTTPS (TLS 1.2 o superior).
- **Cifrado en reposo**: documentos sensibles almacenados cifrados en el proveedor cloud.
- **Datos mínimos necesarios**: no recopilar más información de la que exige la Ley 20.000 y el proceso de admisión.
- **Retención limitada**: conservar solo durante los plazos exigidos por normativa, autorización, contrato o finalidad vigente; luego eliminar o anonimizar de forma segura cuando proceda.
- **Anonimización para análisis**: si se analizan datos para mejorar el servicio, usar datos anonimizados.

### Seguridad Física

- **Área de dispensación**: acceso restringido solo al personal autorizado.
- **Documentos físicos**: armarios con llave, política de escritorio limpio al final del día.
- **Destrucción segura**: documentos físicos sensibles se destruyen con trituradora de papel (corte en cruz).
- **Cámaras de seguridad**: si se instalan, cumplir con la normativa de videovigilancia (informar a las personas, retención máxima 30 días).

### Gestión de Incidentes de Seguridad

Un **incidente de seguridad** es cualquier evento que comprometa — o que potencialmente pueda comprometer — la confidencialidad, integridad o disponibilidad de información de pacientes.

**Ejemplos**:
- Acceso no autorizado detectado a la base de datos.
- Dispositivo con datos de pacientes perdido o robado.
- Correo con datos de un paciente enviado a la dirección equivocada.
- Ransomware o malware en un equipo del dispensario.
- Empleado accede a datos fuera de su área de responsabilidad.

**Protocolo de respuesta mínimo**:

1. **Detectar y contener** (primeras horas): aislar el sistema afectado, revocar accesos comprometidos.
2. **Evaluar el alcance**: ¿qué datos se vieron afectados? ¿cuántos pacientes?
3. **Notificar internamente**: informar a la dirección en las primeras 24 horas.
4. **Evaluar notificación regulatoria**: si aplica Ley 21.663 u otra obligación sectorial, escalar de inmediato. Como referencia de alto nivel para ciberseguridad: alerta temprana de 3 horas, actualización de 72 horas, actualización condicional de 24 horas para OIV cuando corresponda e informe final de 15 días. La aplicabilidad debe confirmarse.
5. **Notificar a los afectados**: si la brecha puede generar daño al paciente, notificarlo sin demora indebida.
6. **Documentar el incidente**: registro completo para análisis y mejora.
7. **Acciones correctivas**: corregir la vulnerabilidad que permitió el incidente.

---

## OTS, Sellado y Evidencia Digital

DispensAI puede usar sellado de documentos o eventos como evidencia técnica de integridad y existencia temporal. Este control apoya ISO 27001, trazabilidad y auditoría, pero tiene límites.

### Qué puede afirmar el agente

- Un hash sellado permite detectar alteraciones posteriores del documento o evento.
- OpenTimestamps puede aportar evidencia de existencia temporal asociada a un hash.
- El sellado mejora la trazabilidad y la recolección de evidencia.

### Qué no debe afirmar el agente

- Que OTS equivale por sí solo a Firma Electrónica Avanzada.
- Que un documento sellado será suficiente en juicio sin otros requisitos.
- Que el sellado reemplaza receta, autorización SAG/ISP, consentimiento válido o registro clínico.

### Qué debe escalar a humano/counsel

- Uso probatorio en litigios, fiscalizaciones o auditorías externas.
- Necesidad de TSA, prestador acreditado, firma electrónica avanzada o formalidades notariales.
- Mapeo artículo legal/control ISO para evidencias críticas.

---

## Política de Seguridad de la Información — Template

La Política de Seguridad de la Información es el documento que expresa el compromiso de la dirección con la protección de los datos. Debe ser breve, aprobada por la dirección, y comunicada a todo el personal.

---

*Política de Seguridad de la Información — [NOMBRE_DISPENSARIO]*

[NOMBRE_DISPENSARIO] maneja datos de salud de sus pacientes, que constituyen información de carácter sensible y confidencial. La protección de esta información es una responsabilidad ética y legal irrenunciable.

Nos comprometemos a:

1. **Proteger la confidencialidad** de los datos de pacientes contra acceso, divulgación o uso no autorizado.

2. **Garantizar la integridad** de la información: los registros médicos, recetas y datos de dispensación deben ser exactos y completos.

3. **Asegurar la disponibilidad** de los sistemas necesarios para la atención de los pacientes, minimizando interrupciones no planificadas.

4. **Cumplir la legislación aplicable**: Ley 19.628, Ley 20.584, Ley 21.663 cuando aplique, preparar transición Ley 21.719, y cualquier normativa sectorial vigente.

5. **Gestionar los riesgos de seguridad** mediante evaluaciones periódicas e implementación de controles apropiados.

6. **Responder a los incidentes** con rapidez, conteniendo el daño y notificando a quienes corresponda.

7. **Capacitar a nuestro equipo** para que comprenda sus responsabilidades en materia de seguridad de la información.

Esta política es revisada anualmente y aplica a todo el personal, voluntarios, y terceros con acceso a los sistemas de la organización.

*Firmado por: __________________________________ | Cargo: Dirección*
*Fecha de aprobación: __________________________*
*Versión: 1.0*

---

## Integración con ISO 9001 e ISO 26000

ISO 27001 se integra naturalmente con los otros dos pilares del Sistema Integrado de Gestión (SIG):

| Área | ISO 9001 | ISO 26000 | ISO 27001 |
|------|----------|-----------|-----------|
| Gestión de quejas | NC formal si se vulnera la calidad | Canal de quejas de pacientes | Incidente si la queja involucra una brecha de datos |
| Auditorías | Auditoría interna anual de calidad | Reporte de impacto social | Auditoría de controles de seguridad semestral |
| Mejora continua | Ciclo PDCA para procesos de servicio | Mejora en programas sociales | Ciclo PDCA para controles de seguridad |
| Gestión de riesgos | Riesgos de calidad de producto | Riesgos de reputación e impacto social | Riesgos de seguridad de información |
| Documentación | Procedimientos de dispensación | Política RSE, Código de Ética | Política de Seguridad, Registro de activos |

Una no conformidad de seguridad grave (brecha de datos de pacientes) **automáticamente genera una no conformidad ISO 9001 crítica** y puede afectar el indicador de satisfacción de pacientes (ISO 26000).

---

## KPIs de Seguridad Mínimos

| KPI | Meta | Frecuencia |
|-----|------|-----------|
| Incidentes de seguridad registrados | 0 críticos por trimestre | Mensual |
| % de personal capacitado en seguridad de la información | 100% | Semestral |
| Días sin actualización de parches críticos | 0 (parches críticos en < 72h) | Mensual |
| Revisiones de acceso completadas en plazo | 100% | Trimestral |
| Tiempo de respuesta inicial a incidente de seguridad | < 4 horas | Por evento |
| % de sistemas con MFA habilitado | 100% | Mensual |
| Backups verificados y funcionales | 100% | Mensual |

---

## Capacitación Mínima del Personal

Todo el personal y voluntarios deben recibir capacitación al momento de incorporarse y al menos una vez al año:

- **Qué es un incidente de seguridad** y cómo reportarlo.
- **Contraseñas seguras** y por qué no se comparten.
- **Phishing y ingeniería social**: cómo identificar correos y llamadas fraudulentas.
- **Escritorio limpio**: no dejar documentos visibles con datos de pacientes.
- **Dispositivos móviles**: qué hacer si se pierde un teléfono con acceso al sistema.
- **Derechos del paciente sobre sus datos**: qué puede pedir un paciente y cómo responder.

La capacitación debe quedar documentada (fecha, contenido, asistentes, firma o evidencia de completación).

---

*Vigente al: agosto 2026. Verificar aplicabilidad Ley 21.663, transición Ley 21.719 y estado del módulo ISO antes de usar en auditorías formales.*
