# Marco Legal Operativo para Agentes DispensAI

> **Aviso**: Este documento es una guía informativa para agentes de DispensAI. No constituye asesoría legal, no reemplaza revisión de abogado habilitado y no autoriza operaciones por sí mismo. Las decisiones legales de producción deben ser validadas por counsel y por la autoridad competente cuando corresponda.

---

## Propósito

Este documento resume el marco legal y de cumplimiento que los agentes deben usar al responder preguntas sobre cannabis medicinal, datos de salud, ciberseguridad, evidencia digital e ISO en Chile.

Los agentes deben distinguir siempre entre:

- **Ley o norma verificable**: referencia legal o institucional que puede citarse como marco general.
- **Control implementado en DispensAI**: medida técnica o proceso interno que ayuda a cumplir, auditar o evidenciar obligaciones.
- **Supuesto pendiente de counsel**: hipótesis de producto o interpretación operativa que no debe presentarse como derecho vigente.

---

## Fuentes Estables de Referencia

Usar nombres oficiales y referencias estables, sin inventar artículos ni requisitos específicos no verificados:

- **Ley 20.000**: sanciona el tráfico ilícito de estupefacientes y sustancias sicotrópicas; regula el marco base de sustancias controladas.
- **Ley 21.575**: modifica la Ley 20.000 en materias asociadas a cannabis medicinal y autocultivo terapéutico. No debe describirse como una ley que por sí sola crea topes universales de plantas, reglas de receta retenida de 90 días, artículo 8 bis o régimen cooperativo comercial.
- **Decreto Supremo 867/2007 del Ministerio del Interior** y normativa sanitaria relacionada: marco reglamentario aplicable a sustancias controladas y autorizaciones.
- **Decreto 84/2015 del Ministerio de Salud**: incorpora cannabis y derivados en reglas sanitarias específicas.
- **Instituciones competentes**: SAG, ISP, MINSAL/SEREMI de Salud, PDI/Carabineros, Ministerio Público, Ministerio de Justicia, SII, Dirección del Trabajo y SUSESO según materia.
- **Ley 20.584**: derechos y deberes de los pacientes, ficha clínica, información, consentimiento, trato digno y confidencialidad.
- **Ley 19.628**: régimen vigente de protección de datos personales hasta la entrada en vigor de la Ley 21.719.
- **Ley 21.719**: moderniza la protección de datos personales; entrada en vigencia general el **2026-12-01**. Hasta entonces debe tratarse como transición, no como régimen plenamente operativo.
- **Ley 21.663**: Ley Marco de Ciberseguridad. Aplica según calificación y alcance institucional; no es la nueva ley de datos personales.
- **Ley 19.799**: firma electrónica y documentos electrónicos. OTS no equivale por sí solo a firma electrónica avanzada.
- **ISO 27001, ISO 9001 e ISO 26000**: marcos de gestión y mejora. No prueban cumplimiento legal por sí mismos.

---

## Cannabis Controlado y Cannabis Medicinal en Chile

### Qué puede afirmar el agente

- El cannabis sigue siendo una sustancia controlada en Chile.
- El acceso medicinal requiere indicación médica y debe operar dentro de canales autorizados o documentados según la vía de acceso.
- El cultivo, producción, transporte, dispensación, importación o exportación pueden requerir autorizaciones de organismos como SAG, ISP, MINSAL/SEREMI u otros según el caso.
- La existencia de receta médica no convierte automáticamente cualquier cultivo, distribución o transporte en legal.
- La venta o distribución fuera del marco autorizado puede generar riesgo penal, sanitario y administrativo.

### Qué debe escalar a humano/counsel

- Si una operación específica está autorizada legalmente.
- Validez, alcance o vigencia de una autorización SAG, ISP, SEREMI u otra autoridad.
- Número permitido de plantas, gramos, socios, entregas o lotes.
- Modelos cooperativos, asociativos o de donaciones que impliquen distribución de cannabis.
- Respuestas a fiscalizaciones, incautaciones, denuncias o controles policiales.

### Controles implementados en DispensAI

- Registro de paciente, receta/documentación clínica y trazabilidad de entregas.
- Separación de categorías de conocimiento para agente público, paciente y admin.
- Enfoque de mínima afirmación legal: el agente informa, orienta y deriva; no declara legalidad de una operación concreta.

---

## Autocultivo, Comercial/SAG y Cooperativa

### Autocultivo

El autocultivo medicinal debe tratarse como una vía sensible y caso a caso. La receta o indicación médica puede ser parte de la documentación, pero no debe presentarse como autorización suficiente para cultivar sin revisar el marco aplicable y la autoridad competente.

### Comercial o SAG

Toda operación de cultivo, producción o distribución a escala organizacional debe ser tratada como dependiente de permisos, condiciones de resolución, trazabilidad, controles sanitarios y verificación documental. El agente no debe afirmar que un operador está habilitado si no se ha verificado su resolución vigente.

### Cooperativa o modelo asociativo

Los modelos cooperativos/asociativos de cannabis son **supuestos de producto pendientes de validación legal** salvo que exista respaldo documental revisado por counsel para el tenant específico.

El agente no debe afirmar que existe un régimen cooperativo general que permite cultivar y repartir cannabis entre socios. Puede decir que DispensAI puede modelar flujos asociativos como hipótesis operacional, pero su uso productivo requiere revisión legal.

---

## Pacientes, Recetas y Documentos Clínicos

### Qué puede afirmar el agente

- La Ley 20.584 protege derechos del paciente como información clara, trato digno, confidencialidad, consentimiento informado y acceso a antecedentes clínicos según corresponda.
- Las recetas, diagnósticos, fichas, consentimientos y registros de dispensación contienen datos sensibles de salud.
- El paciente debe consultar a su médico tratante para indicación, dosis, interacciones, contraindicaciones y continuidad terapéutica.

### Qué debe escalar a humano/counsel

- Validez formal de una receta concreta.
- Si una receta permite un producto, cantidad, plazo o vía de acceso específica.
- Entrega a menores de edad, pacientes con representación legal, hospitalizaciones o conflictos familiares.
- Solicitudes judiciales, policiales, laborales o de terceros sobre datos de pacientes.

### Controles implementados en DispensAI

- Categorías de conocimiento que restringen contenidos de producto y dosificación a paciente/admin.
- Enfoque de minimización: evitar exponer diagnóstico, RUT, receta, documentos, firmas o URLs sensibles en canales no autorizados.
- Documentos de política y confidencialidad que instruyen acceso restringido y respuesta formal a solicitudes de datos.

---

## Datos Personales y Privacidad

### Ley 19.628 vigente

La Ley 19.628 es el marco chileno vigente de protección de datos personales hasta que entre en vigor la Ley 21.719. Para agentes, la línea segura es afirmar que los datos personales y especialmente los datos de salud deben tratarse con finalidad legítima, proporcionalidad, acceso restringido, seguridad y respeto de derechos del titular.

### Ley 21.719 en transición

La Ley 21.719 moderniza el régimen chileno y entra en vigencia general el **2026-12-01**. Los agentes pueden mencionarla como transición futura y preparación organizacional, no como obligación plenamente vigente antes de esa fecha.

### Qué debe escalar a humano/counsel

- Respuestas formales a solicitudes ARCO/ARCOP.
- Eliminación de registros sujetos a retención sanitaria, contractual, contable o legal.
- Bases de licitud para nuevos tratamientos de datos.
- Transferencias a terceros, proveedores, otros dispensarios o autoridades.

### Controles implementados en DispensAI

- Separación por tenant y autorización en servidor.
- RLS y controles de acceso según infraestructura del tenant cuando corresponda.
- Políticas de confidencialidad y seguridad para orientar a agentes y administradores.

---

## Ciberseguridad e Incidentes: Ley 21.663

La Ley 21.663 corresponde a ciberseguridad, no a protección general de datos personales. Sus obligaciones concretas dependen de la calificación de la organización, el tipo de servicio y la autoridad competente.

### Tiempos de referencia para agentes

Cuando aplique el régimen de la Ley 21.663 y las instrucciones de la autoridad competente, manejar estos tiempos de alto nivel:

- **3 horas**: alerta temprana inicial.
- **72 horas**: actualización o reporte con mayor información.
- **24 horas condicional**: actualización para Operadores de Importancia Vital (OIV) cuando aplique.
- **15 días**: informe final.

Estos plazos deben tratarse como guía de escalamiento, no como determinación automática de aplicabilidad.

### Qué puede afirmar el agente

- Todo incidente que afecte confidencialidad, integridad o disponibilidad de datos clínicos o sistemas críticos debe registrarse, contenerse y escalarse de inmediato.
- Si hay datos personales o de salud involucrados, también puede existir una dimensión de privacidad y derechos del paciente.

### Qué debe escalar a humano/counsel

- Si el tenant califica como OIV o sujeto obligado específico.
- Qué autoridad debe recibir una notificación formal.
- Contenido exacto de reportes regulatorios.
- Comunicación a pacientes, medios, proveedores o autoridades.

### Controles implementados en DispensAI

- Registro de incidentes y no conformidades en documentos ISO/SGSI.
- Separación de evento técnico, impacto legal, evidencia y acciones correctivas.
- Advertencia de no enviar datos clínicos completos por canales inseguros.

---

## Sellado OTS, Evidencia y Firma Electrónica

### Qué puede afirmar el agente

- OpenTimestamps (OTS) puede aportar evidencia de existencia temporal e integridad de un hash/documento.
- Un hash sellado ayuda a detectar alteraciones posteriores.
- OTS por sí solo no acredita identidad del firmante, voluntad contractual ni cumplimiento de firma electrónica avanzada.

### Qué debe escalar a humano/counsel

- Si un documento sellado sirve como prueba suficiente en juicio.
- Si se requiere Firma Electrónica Avanzada, prestador acreditado, timestamping authority (TSA), certificación notarial u otra formalidad.
- Uso de sellos para consentimiento informado, recetas, contratos, documentos laborales o respuestas regulatorias.

### Controles implementados en DispensAI

- Sellado de documentos y eventos como control de integridad y trazabilidad.
- Advertencia de que `fea_equivalent` debe tratarse como falso salvo revisión y arquitectura específica.
- Recomendación de TSA/counsel para documentos con uso probatorio alto.

---

## ISO 27001, ISO 9001 e ISO 26000

### Qué puede afirmar el agente

- ISO 27001 apoya la gestión de seguridad de la información.
- ISO 9001 apoya la gestión de calidad, procesos, no conformidades y mejora continua.
- ISO 26000 orienta responsabilidad social; no es certificable.
- Estos marcos ayudan a demostrar gestión, disciplina documental y mejora, pero no prueban cumplimiento legal por sí solos.

### Qué debe escalar a humano/counsel

- Declaraciones de certificación, alcance certificado o equivalencia con cumplimiento legal.
- Mapeos de artículos legales a controles ISO para auditorías externas.
- Compromisos contractuales con pacientes, reguladores o terceros basados en ISO.

### Controles implementados en DispensAI

- Knowledge base ISO preservada como referencia de módulo opcional en standby.
- Plantillas de políticas, riesgos, KPIs, incidentes, no conformidades y auditoría interna.
- Posicionamiento como sistema de gestión, no como garantía legal.

---

## Regla de Respuesta para Agentes

Cuando una pregunta sea legal o de cumplimiento, responder con esta estructura mental:

1. **Información general**: explicar el marco aplicable sin prometer resultado.
2. **Límite**: indicar qué no puede determinar el agente.
3. **Evidencia requerida**: receta, autorización, resolución, ficha, permiso, contrato o registro según el caso.
4. **Escalamiento**: derivar a médico, administrador, autoridad o counsel cuando corresponda.
5. **Control DispensAI**: explicar qué registra o verifica el sistema, sin convertirlo en autorización legal.

---

*Vigente al: agosto 2026. Revisar ante cambios normativos, instrucciones de autoridad o validación de counsel por tenant.*
