# Roadmap del Observatorio — transparencia.dispensai.cl

> Documento de estructura de información. Compara el estado actual del proyecto
> con el observatorio de En Volá (envola.cl/observatorio) y define qué construir
> para pasar de "5 datasets con dashboards" a "observatorio cannábico completo".

---

## 1. Diagnóstico comparado

### Qué tiene En Volá

| Módulo | Contenido | Estado declarado |
|--------|-----------|------------------|
| A | Procedimientos policiales + kg decomisados (CEAD, PDI, Carabineros) | kilos publicados, procedimientos "en carga" |
| B | Gasto fiscal en persecución del cannabis — estimación propia con fórmula pública | metodología en desarrollo |
| C | Buscador de normas vigentes, cada ficha con fuente oficial y fecha de vigencia | sin revisión jurídica externa |
| D | Seguimiento legislativo — boletines activos y su estado | "proyectos en carga" |
| — | Mapa de regulación comparada (67 países) | declarado fuera de módulo, basado en Wikipedia |

**Fortaleza real de En Volá:** la *narrativa metodológica*. Declaran fecha de corte
por cifra, qué está publicado y qué no, y advierten explícitamente que "un decomiso
mide actividad policial, no tamaño del mercado".

**Debilidad real:** casi todo está vacío. Tres de cuatro módulos son promesas. Su
única serie viva son kilos decomisados agregados a nivel nacional.

### Qué tenemos nosotros

- **5 fuentes oficiales ya ingestadas y consultables**: CEAD (comunal, 2005-2024),
  DPP, PDI/datos.gob.cl, Fiscalía Nacional, INE (denominador poblacional comunal).
- **Granularidad comunal** con PostGIS + coropleta MapLibre — En Volá es nacional.
- **Embudo del Punitivismo** (backend listo) — cruce de 4 etapas del sistema penal.
- **Export CSV/XLSX + manifest** de las 5 fuentes en `/datos`.
- **Base de conocimiento** (`knowledge/`, 20 documentos) que hoy sólo alimenta el
  chatbot RAG y no se publica.
- **17 PDFs normativos** en `frontend/public/bibliografias/` sin superficie web.

**Conclusión:** ganamos ampliamente en datos duros y granularidad; perdemos en
narrativa normativa, seguimiento legislativo y visibilidad de las fuentes que nos
respaldan. Las tres brechas son de contenido, no de infraestructura.

---

## 2. Brechas priorizadas

| # | Brecha | Impacto | Esfuerzo |
|---|--------|---------|----------|
| 1 | Bibliografía normativa invisible (17 PDFs sin UI) | Alto — es la defensa documental del proyecto | Bajo |
| 2 | Sin módulo de normativa vigente navegable | Alto — es el módulo C de la competencia | Medio |
| 3 | Sin página de metodología pública | Alto — credibilidad | Bajo |
| 4 | `knowledge/` no publicado como capa educativa | Medio — diferenciador DispensAI | Medio |
| 5 | Sin seguimiento legislativo (boletines Cámara/Senado) | Medio | Medio |
| 6 | Sin serie de decomisos en kg (sólo casos policiales) | Medio — paridad con módulo A | Medio |
| 7 | Sin estimación de gasto fiscal | Alto — nadie lo tiene resuelto | Alto |
| 8 | Embudo y PJud ocultos | Alto cuando lleguen datos SAIP | Bloqueado |

---

## 3. Arquitectura de información propuesta

Estructura en cuatro capas, de dato duro a interpretación:

```
CAPA 1 — EVIDENCIA          /              mapa CEAD comunal
                            /dpp /pdi /fiscalia
                            /datos          descargas + manifest

CAPA 2 — MARCO NORMATIVO    /normativa      fichas de ley navegables + buscador
                            /bibliografia   los 17 PDFs con contexto
                            /legislativo    boletines en tramitación

CAPA 3 — INTERPRETACIÓN     /embudo         embudo del punitivismo (desbloquear)
                            /metodologia    cómo se construye cada cifra
                            /glosario       términos técnicos y jurídicos

CAPA 4 — CONOCIMIENTO       /aprende        knowledge/ publicado (marco-legal,
                                            procesos, general) — puente a DispensAI
```

### Regla transversal de credibilidad

Adoptar y superar el estándar de En Volá: **cada cifra publicada declara fuente,
fecha de corte y limitación conocida**. Ya existe `SourceBadge` y
`TaxonomyBanner` — extender el patrón a un componente `DataProvenance` que
acompañe todo KPI.

---

## 4. Módulos nuevos — especificación

### 4.1 `/bibliografia` — Corpus documental (prioridad 1)

Los 17 PDFs de `frontend/public/bibliografias/` catalogados y navegables.

Clasificación propuesta:

| Grupo | Documentos |
|-------|-----------|
| **Ley penal de drogas** | Ley 20.000, Ley 21.575, DTO-867/2008 (reglamento), ORD 1022/2025 |
| **Salud y derechos del paciente** | Ley 20.584, DFL-1/2005 (texto refundido del sistema de salud) |
| **Datos personales y privacidad** | Ley 19.628, Ley 21.719 |
| **Cultivo y agricultura** | Circular SAG 772/2024, Orientaciones Técnicas Huertos Medicinales |
| **Responsabilidad y sociedad civil** | Ley 20.393 (RPPJ), Ley 20.500 (asociaciones) |
| **Fiscalización y respuestas oficiales** | Oficio N°9579824, ORD 2964/2024, respuesta DOS y respuesta ISP para GROSCann, Indicación SENDA Narcotest |

> **Dos correcciones verificadas al catalogar** (contrastadas contra la BCN):
> **Ley 21.575** (23-may-2023) no es una norma de sociedad civil: modifica diversos
> cuerpos legales para mejorar la persecución del narcotráfico y establece que el
> cultivo se entiende justificado con receta de médico cirujano tratante. Es norma
> central del observatorio.
> **DFL-1/2005** (publicado 24-abr-2006, MINSAL) no es el Código Sanitario —ese es
> el DFL 725/1967—, sino el texto refundido del DL 2.763/1979 y las leyes 18.933 y
> 18.469: organización del MINSAL, FONASA, ISP, CENABAST e Isapres.

Metadata mínima por ficha: título oficial, tipo de norma, fecha de publicación,
organismo emisor, vigencia, resumen de 2-3 líneas, relevancia para el observatorio,
enlace al PDF local y a la fuente oficial (BCN / Diario Oficial).

Implementación: JSON estático `frontend/src/data/bibliografia.ts` + página con
filtro por grupo y buscador de texto. Sin backend.

### 4.2 `/normativa` — Fichas de ley (prioridad 2)

Contenido derivado de `knowledge/marco-legal/` + los PDFs. Cada ficha responde:
qué dice la norma, qué NO permite, qué autoridad la aplica, qué está pendiente de
validación legal. Reutilizar la separación de tres capas que ya usa
`marco-legal-operativo-agentes.md`: **ley verificable / control implementado /
supuesto pendiente de counsel**. Esa distinción es más honesta que el módulo C de
la competencia y hay que decirlo explícitamente en la página.

### 4.3 `/metodologia` — Cómo se construye cada cifra (prioridad 3)

Una sección por fuente, derivada de `FUENTES.md`:
- Qué mide exactamente y qué NO mide.
- Corte de taxonomía CEAD 2024 (`DMCS_legacy` → `Taxonomia_2024`).
- Distribución proporcional DPP regional → comunal vía pesos CEAD (aproximación
  declarada, no cruce directo).
- Comunas sin geometría (Pozo Almonte, Antártica).
- Denominador poblacional INE base 2017 y por qué las tasas usan proyección.

### 4.4 `/legislativo` — Seguimiento de boletines (prioridad 5)

Scraper de camara.cl / senado.cl para boletines con materia cannabis / Ley 20.000.
Pipeline nuevo en `backend/etl/legislativo/` siguiendo el patrón
`config → downloader → consolidator → runner`. Tabla `legislativo_boletines`
(boletin, titulo, fecha_ingreso, camara_origen, estado, ultimo_tramite, url).

### 4.5 `/aprende` — Capa educativa (prioridad 4)

Publicar los documentos de `knowledge/` con categoría pública (`marco-legal`,
`procesos`, `general`, `politicas`). Es el puente natural entre el observatorio y
DispensAI: el observatorio muestra cómo se persigue, `/aprende` muestra cómo se
accede legalmente. **No publicar** `productos/` ni `iso/` — están restringidos a
paciente/admin por diseño del RAG.

### 4.6 Decomisos en kilogramos (prioridad 6)

Paridad con el módulo A de En Volá. Fuente: balances anuales de Carabineros y
SENDA. Advertencia obligatoria en la UI: *un decomiso mide actividad policial, no
tamaño del mercado*.

### 4.7 Gasto fiscal (prioridad 7, diferenciador mayor)

Estimación eslabón por eslabón con fórmula pública. Insumos: presupuesto DIPRES por
partida (Carabineros, PDI, Ministerio Público, DPP, Gendarmería) × proporción de
causas Ley 20.000 sobre el total — proporción que **ya podemos calcular** con los
datos de Fiscalía y DPP que tenemos ingestados. Es la ventaja competitiva más clara:
En Volá declara la metodología en desarrollo; nosotros tenemos el denominador.

---

## 5. Secuencia de ejecución

**Fase 1 — Credibilidad documental (bajo esfuerzo, alto impacto)**
1. `/bibliografia` con los 17 PDFs catalogados.
2. `/metodologia` derivada de `FUENTES.md`.
3. Componente `DataProvenance` aplicado a todos los KPI existentes.

**Fase 2 — Marco normativo**
4. `/normativa` con fichas desde `knowledge/marco-legal/`.
5. `/glosario`.

**Fase 3 — Capa educativa y expansión**
6. `/aprende` publicando `knowledge/` público.
7. Pipeline `legislativo` + página `/legislativo`.

**Fase 4 — Análisis propio**
8. Serie de decomisos en kg.
9. Módulo de gasto fiscal.
10. Desbloquear `/embudo` y `/pjud` cuando llegue el dataset SAIP.

---

## 6. Impacto en la arquitectura existente

- Rutas nuevas deben registrarse en `App.tsx`, `NavBar.tsx`, `AppDataProvider`
  (prefetch) y el idle-prefetch de chunks lazy — regla ya documentada en `CLAUDE.md`.
- `/bibliografia`, `/metodologia` y `/glosario` son estáticas: sin endpoints nuevos,
  sin carga para el backend en Render (evita cold starts).
- `/normativa` y `/aprende` pueden servirse como contenido estático importado en
  build; sólo `/legislativo` requiere pipeline ETL y tabla nueva.
- El NavBar ya tiene 5 items; con 4-5 más necesita agrupación por capa
  (Evidencia / Marco legal / Análisis) en vez de lista plana.

---

*Documento de estructura. No sustituye revisión jurídica de las fichas normativas.*
