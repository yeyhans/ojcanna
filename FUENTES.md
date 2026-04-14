# Fuentes de Datos — Observatorio Judicial Cannábico

Este documento especifica **qué datos consume el proyecto, desde dónde, cómo, con qué
limitaciones y qué se hace con ellos**. Es la referencia técnica y metodológica para
comunicar públicamente cualquier cifra publicada en la plataforma.

---

## Resumen Ejecutivo

| # | Fuente | Organismo | Granularidad | Cobertura temporal | Métrica base | Estado |
|---|--------|-----------|--------------|--------------------|--------------|--------|
| 1 | **CEAD** | Subsecretaría de Prevención del Delito | Comunal (344/346) | 2005-2024 | Tasa/100k + frecuencia | ✅ Operativa |
| 2 | **DPP** | Defensoría Penal Pública | Nacional + Regional (16) | 2020-2024 | Nº causas, nº imputados | ✅ Operativa |
| 3 | **PDI / datos.gob.cl** | Policía de Investigaciones vía portal de datos abiertos | Regional | 2024 | Frecuencia (delitos, denuncias, víctimas) | ✅ Operativa |
| 4 | **GADM v4.1** | Global Administrative Divisions (no-gov) | Comunal | N/A | Geometrías MULTIPOLYGON | ✅ Operativa |
| 5 | **PJud** | Poder Judicial (Oficina Judicial Virtual) | Sentencias individuales | — | Metadata de fallo + texto | 🔴 Planificada |

---

## 1. CEAD — Centro de Estudios y Análisis del Delito

### Organismo
**Subsecretaría de Prevención del Delito** (Ministerio del Interior y Seguridad Pública).
Publica estadísticas delictuales provenientes de denuncias de Carabineros y PDI.

### Portal público
- **Web:** https://cead.minsegpublica.gob.cl/estadisticas-delictuales/
- El portal obliga a filtrar manualmente por año/región/comuna/familia delictual.
  No ofrece descarga masiva ni API documentada.

### Endpoint interno usado
```
POST https://cead.minsegpublica.gob.cl/wp-content/themes/gobcl-wp-master/data/get_estadisticas_delictuales.php
```

**Payload (form-encoded):**
```
seleccion=...      # tipo de consulta
tipoVal=...        # casos policiales / aprehendidos
anio=2024
comuna=13101       # ID CEAD sin zero-padding
familia=4          # Ley de drogas
grupo=401
subgrupo=40101     # Tráfico (uno de 7)
medida=1           # 1=frecuencia, 2=tasa por 100k
```

Requiere una sesión HTTP válida obtenida por GET previo al portal (se establece en el
`lifespan` del extractor).

### Qué se extrae
Delitos de la **Ley N° 20.000** desagregados en **7 subgrupos**:

| ID | Subgrupo |
|----|----------|
| 40101 | Tráfico de sustancias |
| 40102 | Microtráfico de sustancias |
| 40103 | Elaboración o producción de sustancias |
| 40104 | Porte de droga para consumo |
| 70201 | Consumo de alcohol y drogas en vía pública |
| 70202 | Porte de bebidas alcohólicas en vía pública |
| 70203 | (séptimo subgrupo relacionado, ver `codigos_cead.json`) |

Dos métricas por combinación comuna × año × subgrupo:
- **Frecuencia** — conteo absoluto de casos
- **Tasa por 100.000 habitantes** — normalizada por población

### Taxonomía temporal (importante)
CEAD cambió su clasificación delictiva en 2024:
- **2005-2023:** `DMCS_legacy` (Delitos de Mayor Connotación Social, taxonomía antigua)
- **2024 en adelante:** `Taxonomia_2024` (nueva clasificación)

La constante `TAXONOMY_CUTOFF_YEAR = 2024` vive en `backend/etl/cead/config.py`.
Ambas taxonomías se almacenan en la misma tabla con una columna `taxonomy_version`
para que el UNIQUE constraint no colapse datos antiguos con nuevos.

> ⚠️ **Advertencia metodológica:** las series 2005-2024 NO son directamente
> comparables entre ambos regímenes taxonómicos. Cualquier gráfico de línea que
> cruce el año 2024 debe advertirlo explícitamente al usuario.

### Pipeline ETL
Ubicación: `backend/etl/cead/`

| Archivo | Rol |
|---------|-----|
| `config.py` | URLs, años (2005-2025), lista de subgrupos drogas, paths |
| `extractor.py` | `httpx.AsyncClient` con 5 conexiones concurrentes, POST al endpoint |
| `consolidator.py` | Lee `checkpoint.jsonl`, tipa columnas, hace `INSERT ... ON CONFLICT DO NOTHING` |
| `runner.py` | CLI orquestador (`--db-url`, `--remap`) |
| `models.py` | `CeadHecho` (Pydantic) |
| `codigos_cead.json` | Catálogo: 7 subgrupos × 16 regiones × 346 comunas |
| `mapper.py` | Playwright (legacy, no activo hoy — vestigio del primer approach) |
| `load_comunas.py` | Migración única: GADM GeoJSON → PostGIS |
| `sql/001_create_comunas.sql` | Crea tabla `comunas` con índice GIST |
| `sql/002_create_source_tables.sql` | Crea `cead_hechos`, `dpp_causas`, `datosgob_seguridad` |

### Tabla destino
```sql
CREATE TABLE cead_hechos (
  id              SERIAL PRIMARY KEY,
  anio            INT NOT NULL,
  comuna_id       VARCHAR(6) NOT NULL,
  subgrupo_id     VARCHAR(10) NOT NULL,
  tipo_caso       TEXT,                -- "casos_policiales" / "aprehendidos"
  taxonomy_version TEXT NOT NULL,      -- DMCS_legacy / Taxonomia_2024
  frecuencia      INT,
  tasa_100k       NUMERIC,
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(anio, comuna_id, subgrupo_id, tipo_caso, taxonomy_version)
);
CREATE INDEX idx_cead_filtros ON cead_hechos (comuna_id, anio, subgrupo_id);
```

### Volumen real
- Checkpoint (JSONL bruto): ~92.659 líneas
- Filas únicas en DB post-consolidación: **~50.862**

### Limitaciones conocidas
1. **Comunas faltantes en mapa:** Pozo Almonte (1404) y Antártica (12202) no existen
   en GADM v4.1, por lo que aunque tengan datos CEAD, no se renderizan en el mapa.
2. **Dependencia de sesión HTTP frágil:** el endpoint puede cambiar sin aviso si el
   portal se rediseña (corre sobre WordPress + PHP custom).
3. **Sin desagregación por sexo, edad o tipo de sustancia:** el CEAD público solo
   entrega totales por subgrupo.

---

## 2. DPP — Defensoría Penal Pública

### Organismo
**Defensoría Penal Pública** (servicio público descentralizado del Ministerio de
Justicia). Publica estadísticas anuales de causas ingresadas y terminadas por sus
defensores.

### Portal público
- **Web:** https://www.dpp.cl/pag/116/627/estadisticas

### Formato y URLs directas
Cada año publica un XLSX individual con hash en la URL. **Las URLs están hardcodeadas
en `backend/etl/dpp/config.py`** y se verificaron manualmente en marzo 2026:

| Año | URL |
|-----|-----|
| 2020 | `https://www.dpp.cl/resources/upload/dfd1854afd8d69e52e2ff76c5b7c960e.xlsx` |
| 2021 | `https://www.dpp.cl/resources/upload/68bbe2345b534143e39732b8f4870eb1.xlsx` |
| 2022 | `https://www.dpp.cl/resources/upload/e3edb59cb21761a9001988bcdb18d74c.xlsx` |
| 2023 | `https://www.dpp.cl/resources/upload/51bf67b31ac83cc35a41bc5fc9b34079.xlsx` |
| 2024 | `https://www.dpp.cl/resources/upload/7b0b60fd419b2663ea7540b5bc280ffc.xlsx` |

> ⚠️ Si la DPP renombra cualquiera de estos archivos, el pipeline se rompe silenciosamente.
> Pendiente: scrapear la página del portal para descubrir los links dinámicamente.

### Qué se extrae
Tres hojas del XLSX:

1. **"Delitos"** — Ingresos y términos nacionales por tipo de delito. Se filtra
   `"Delitos Ley de Drogas"`.
2. **"Delitos FT"** — Formas de término (desagregación del total nacional):
   - Absolución
   - Condena
   - Derivación
   - Facultativos
   - Otras
   - Salida Alternativa
3. **"Ingresos Terminos DR"** — Totales regionales por oficina de la defensoría
   (16 regiones).

### Tabla destino
```sql
CREATE TABLE dpp_causas (
  id              SERIAL PRIMARY KEY,
  anio            INT NOT NULL,
  region_id       VARCHAR(6),               -- NULL = dato nacional
  region_nombre   TEXT,
  tipo_delito     TEXT NOT NULL,
  tipo_termino    TEXT,                     -- NULL si es total de ingresos
  n_causas        INT,
  n_imputados     INT,
  fuente          TEXT DEFAULT 'dpp',
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(anio, COALESCE(region_id,''), tipo_delito, COALESCE(tipo_termino,''))
);
```

### Limitaciones conocidas
1. **No hay granularidad comunal.** Solo nacional y regional.
2. **No hay cruce región × forma de término.** Los totales nacionales vienen
   desagregados por forma de término, pero los datos regionales son totales brutos.
   El Embudo del Punitivismo suple esto con distribución proporcional (ver sección 6).
3. **Solo desde 2020.** Los registros previos no están publicados en el mismo formato.

### Pipeline ETL
Ubicación: `backend/etl/dpp/`
- `downloader.py` — descarga XLSX con `httpx` + reintentos (`tenacity`)
- `consolidator.py` — `pandas.read_excel` sobre las 3 hojas, filtro Ley 20.000,
  `staging_upsert` vía `etl/common/base_consolidator.py`
- `runner.py` — orquesta descarga + consolidación
- `config.py` — URLs + mapeo `region_nombre → region_id` (formato CEAD)

---

## 3. PDI / datos.gob.cl — Delitos Investigados

### Origen
**Portal de Datos Abiertos del Gobierno de Chile** — https://datos.gob.cl. El
publicador institucional es la **Policía de Investigaciones de Chile (PDI)**.

### Dataset
```
Dataset ID: 5373dac4-a77a-48b2-9a8b-9cef7311f941
```

### URLs directas (año 2024)
```
Delitos:
https://datos.gob.cl/dataset/5373dac4-a77a-48b2-9a8b-9cef7311f941/
  resource/26633482-466b-40f8-bb0d-024f2e95c960/download/
  cantidad-de-delitos-y-faltas-investigadas-2024.xls

Denuncias (Art. 18):
https://datos.gob.cl/dataset/5373dac4-a77a-48b2-9a8b-9cef7311f941/
  resource/74688cb0-4622-438f-8d53-dd5cff398557/download/
  cantidad-de-denuncias-art-18-2024.xls

Víctimas (Art. 18):
https://datos.gob.cl/dataset/5373dac4-a77a-48b2-9a8b-9cef7311f941/
  resource/63e21a08-b8e1-4a3e-9a01-8991a32be9df/download/
  cantidad-de-victimas-art-18-2024.xls
```

### Qué se extrae
Formato XLS (Excel legacy). Las columnas son regiones y las filas son delitos.
`consolidator.py` filtra por keywords de cannabis/drogas:
- `"ley de drogas"`
- `"20.000"` / `"20000"`
- `"tráfico"`, `"microtráfico"`
- `"porte de drogas"`
- `"consumo en vía"`

### Tabla destino
```sql
CREATE TABLE datosgob_seguridad (
  id              SERIAL PRIMARY KEY,
  anio            INT NOT NULL,
  region_id       VARCHAR(6),
  categoria       TEXT NOT NULL,       -- delitos_investigados / denuncias_art18 / victimas_art18
  subcategoria    TEXT,                -- nombre del delito específico
  frecuencia      INT,
  fuente          TEXT DEFAULT 'datosgob',
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(anio, COALESCE(region_id,''), categoria, COALESCE(subcategoria,''))
);
```

### Limitaciones
1. **Solo 2024 implementado hoy.** El dataset publica años anteriores; extenderlo
   requiere agregar URLs al `config.py` de `etl/pdi/`.
2. **Granularidad regional.** No hay datos comunales disponibles en el dataset.
3. **Filtrado por keywords = frágil** ante cambios en los nombres de delitos.
   Conviene auditar manualmente cada año nuevo.

### Pipeline ETL
Ubicación: `backend/etl/pdi/` (sigue el mismo patrón que DPP).

---

## 4. GADM v4.1 — Geometrías Comunales

### Organismo
**Global Administrative Divisions** — proyecto académico (no gubernamental chileno).
Repositorio internacional de límites administrativos. https://gadm.org

### Uso en el proyecto
- **Formato:** GeoJSON nivel 3 (comunas)
- **Proyección:** EPSG:4326 (WGS84)
- **Cobertura:** 344 de 346 comunas chilenas
- **Excluidas:** Pozo Almonte y Antártica (no existen en GADM v4.1)

### Por qué GADM y no BCN / IDE-Chile
GADM es más liviano, no requiere autenticación, y tiene cobertura consistente
multi-país. BCN (Biblioteca del Congreso Nacional) e IDE-Chile ofrecen geometrías
oficiales más detalladas pero imponen fricción (tokens, capas WFS, licencias).

### Migración
`backend/etl/cead/load_comunas.py` ejecuta **una sola vez** la carga:
1. Lee GeoJSON desde `backend/data/geo/comunas_bcn/`
2. Normaliza el campo CUT: sin zero-padding (`"5602"`, no `"05602"`) para matchear
   el formato del portal CEAD.
3. Inserta en `comunas` (PostGIS `MULTIPOLYGON`)
4. Crea índice GIST sobre `geom`

### API endpoint que las sirve
```
GET /api/v1/cead/geometrias
```
Retorna un `FeatureCollection` estático con todas las comunas. El frontend lo cachea
en memoria y sessionStorage porque no cambia entre requests.

---

## 5. PJud — Poder Judicial (PLANIFICADA)

### Objetivo
Fuente de datos **aún no implementada**. Es la parte más ambiciosa del proyecto
original: auditar la discrecionalidad judicial cruzando sentencias individuales de
causas Ley 20.000 con metadata de tribunal/juez/veredicto.

### Fuente prevista
**Oficina Judicial Virtual** — https://oficinajudicialvirtual.pjud.cl

El sistema no ofrece descarga masiva pública. Las alternativas técnicas evaluadas:

1. **Scraping autenticado** con cuenta Clave Única (scraping personal, riesgos
   legales en uso masivo).
2. **Ley de Transparencia (Solicitudes SAIP)** — requerir metadata anonimizada al
   Poder Judicial vía https://www.portaltransparencia.cl
3. **Convenios institucionales** con observatorios académicos que ya tengan acceso
   (ej. Centro de Estudios de Justicia de las Américas, Espacio Público).

### Qué se busca extraer
- **Metadata del fallo:** tribunal, juez ponente, fecha, tipo de juicio (oral / procedimiento abreviado / simplificado)
- **Resultado:** absolución / condena / salida alternativa / sobreseimiento
- **Pena impuesta** (si aplica): días/meses/años, régimen, beneficios
- **Delito base:** microtráfico / tráfico / porte para consumo / cultivo

### Lo que **NO** se debe extraer (regla de privacidad)
- ❌ Nombre, RUT o cualquier identificación del imputado
- ❌ Dirección o geolocalización del hecho
- ❌ Datos de víctimas o testigos

El pipeline NLP (spaCy + Transformers) debe ejecutar **anonimización como primer
paso obligatorio** antes de cualquier clasificación.

### Estado actual
🔴 **Cero líneas de código.** Los commits recientes no han tocado esta área. La
plataforma publicada hoy (CEAD + DPP + PDI + Embudo) ya es valiosa sin PJud, pero
el claim original de "auditar la discrecionalidad judicial" requiere esta fuente.

---

## 6. Embudo del Punitivismo — Metodología de Cruce

### Qué es
Un endpoint derivado (`/api/v1/embudo`) que **no tiene fuente propia**: integra las
tres fuentes anteriores en un único modelo por comuna.

### Etapas modeladas
| Etapa | Fuente | Granularidad original | Qué representa |
|-------|--------|-----------------------|----------------|
| 1. Policial | CEAD | Comunal | Casos conocidos por Carabineros/PDI |
| 2. Defensorial | DPP | Regional → comunal (proporcional) | Causas que llegan a tener defensor |
| 3. Investigativa | PDI (datos.gob) | Regional → comunal (proporcional) | Delitos efectivamente investigados |

### Problema metodológico
**DPP y PDI no publican datos comunales.** Para construir un embudo por comuna
el pipeline **distribuye proporcionalmente** los totales regionales usando los
pesos relativos del CEAD:

```
causas_dpp_comunaX = causas_dpp_region * (casos_cead_comunaX / casos_cead_region)
```

### Implicaciones honestas
- ✅ Es útil como **aproximación comparativa** entre comunas de la misma región.
- ✅ Detecta outliers: comunas con mucho CEAD y poco DPP/PDI (posible sobre-policía
  sin judicialización) o viceversa.
- ❌ **No es un cruce real caso-por-caso.** Los números del embudo **no** deben
  reportarse públicamente como "en la comuna X hubo Y defensas" sin el disclaimer
  metodológico.
- ❌ Asume que la distribución comunal del CEAD es un buen proxy de la distribución
  comunal real de DPP/PDI — supuesto discutible.

### Ranking
`/api/v1/embudo/ranking?anio=` entrega el Top 50 de comunas por **ratio
detenciones/causas** — comunas donde la pirámide se estrecha más agresivamente
entre la denuncia policial y la judicialización. Es la métrica más cercana al
concepto de "punitivismo selectivo".

---

## Reglas de Privacidad y Uso Público

1. **Datos agregados siempre.** Ninguna tabla almacena información personal, ni
   siquiera indirecta.
2. **PJud futuro:** cualquier procesamiento de sentencias debe pasar por un paso
   de anonimización previo. Ver sección 5.
3. **Disclaimers metodológicos:** toda visualización que use el Embudo o series CEAD
   que crucen 2023-2024 debe advertir sobre las aproximaciones y cambios de taxonomía.
4. **Trazabilidad:** cada fila en DB lleva columna `fuente` (o `taxonomy_version`
   en CEAD) para permitir reconstruir de dónde vino exactamente el dato.

---

## Checklist para Incorporar una Nueva Fuente

Si en el futuro se suma una cuarta fuente (por ejemplo, **INE** para contexto
demográfico o **PJud** para sentencias), seguir este patrón:

1. Crear subcarpeta `backend/etl/{fuente}/` con:
   - `config.py` (URLs, constantes, mapeos)
   - `downloader.py` o `extractor.py` (httpx + tenacity)
   - `consolidator.py` (lee, tipa, upsert vía `etl/common/base_consolidator.py`)
   - `runner.py` (CLI)
2. Agregar SQL de creación de tabla en `backend/etl/cead/sql/` (o mover a un path
   compartido si crecen).
3. Crear `backend/api/routers/{fuente}.py` con los endpoints que expondrán el dato.
4. Crear `backend/api/schemas/{fuente}.py` con los Pydantic models.
5. Registrar el router en `backend/api/main.py`.
6. Crear página y hooks equivalentes en `frontend/src/pages/` y `frontend/src/hooks/`.
7. **Actualizar este archivo** con toda la especificación descrita arriba.

---

## 7. Fuentes candidatas verificadas (abril 2026)

Catálogo de fuentes oficiales chilenas **no ingresadas todavía** al observatorio,
verificadas vía búsqueda web el 13 de abril de 2026. Cada entrada documenta
organismo, URL oficial, cobertura temporal, granularidad y — lo más importante —
**cruzabilidad honesta** con las fuentes operativas hoy.

### Regla de oro: política anti-imputación

> **Si dos fuentes no comparten una clave real (comuna, año, tipo_delito…), se
> muestran por separado con etiqueta explícita. Prohibido distribuir, interpolar o
> imputar valores para forzar un cruce comunal que el organismo no publica.**

El caso del Embudo del Punitivismo (sección 6), que distribuye proporcionalmente
DPP y PDI regionales a comunas usando pesos CEAD, es una excepción histórica que
**no se debe replicar** en nuevas integraciones. Cada ingesta nueva debe respetar
la granularidad nativa del organismo emisor.

---

### Eje 1 — Judicial / sentencias

#### 1.1 Poder Judicial en Números (PJud)
- **Organismo:** Corporación Administrativa del Poder Judicial (CAPJ), Subdirección de Estadísticas.
- **URL portal:** https://numeros.pjud.cl/Inicio
- **URL descargas:** https://numeros.pjud.cl/Descargas (CSV + XLS)
- **Cobertura:** desde inicio reforma procesal penal; actualización semestral (último corte dic-2024).
- **Granularidad:** tribunal + materia + término + año. Nacional + por Corte de Apelaciones. No comunal directo, mapeable a región vía jurisdicción del tribunal.
- **Formato:** CSV/XLSX abiertos, Ley 20.285.
- **Aporte:** cierra el embudo con **sentencias reales** (condenas, absoluciones, sobreseimientos) en materia Ley 20.000.
- **Caveat:** codificación de materia propia del PJud, distinta de subgrupos CEAD. Cruce con CEAD requiere mapeo explícito `materia PJud ↔ subgrupo CEAD`.

#### 1.2 Boletines Estadísticos Ministerio Público
- **Organismo:** Fiscalía Nacional, Ministerio Público.
- **URL:** https://www.fiscaliadechile.cl/persecucion-penal/estadisticas
- **Cobertura:** boletines trimestrales, semestrales, anuales. Boletín 1er semestre 2025 publicado dic-2025.
- **Granularidad:** causas ingresadas / terminadas / formalizadas por fiscalía regional + categoría de delito. No comunal. No individualizable.
- **Formato:** PDF + tablas Excel por boletín.
- **Aporte:** etapa "Ministerio Público" — formalizaciones y términos antes de sentencia. Complementa DPP (defensa) con persecución.
- **Caveat:** taxonomía Fiscalía ≠ taxonomía DPP. Ambos regionales.

#### 1.3 Portal Unificado de Sentencias (PJud)
- **URL:** https://www.pjud.cl/portal-unificado-sentencias
- **Granularidad:** sentencia individual (PDF/HTML), buscable por ROL.
- **Aporte:** fuente primaria para pipeline NLP futuro (sub-proyecto E). No dataset tabulado.

---

### Eje 2 — Cárceles / personas privadas de libertad

#### 2.1 Estadística General Penitenciaria — Gendarmería
- **Organismo:** Gendarmería de Chile (Ministerio de Justicia y DDHH).
- **URL:** https://www.gendarmeria.gob.cl/est_general.html
- **Reportes mensuales:** https://www.gendarmeria.gob.cl/rep_est_mes.html
- **Compendios anuales:** https://www.gendarmeria.gob.cl/compendios.html (desde 1991).
- **Granularidad:** unidad penal + región + tipo de población (imputados, condenados, penas sustitutivas). Desglose por delito incluyendo **Ley 20.000**.
- **Formato:** XLSX + PDF. Sin API — descarga manual por mes.
- **Aporte:** etapa FINAL del embudo (ejecución de pena) — hoy ausente del observatorio.
- **Caveat:** población stock a fecha de corte, no flujo. Sexo/edad sí, RUT no.

#### 2.2 Caracterización de personas privadas de libertad
- **URL:** https://www.gendarmeria.gob.cl/car_personas_pp.html
- **Granularidad:** nacional + región, con variables demográficas.
- **Aporte:** contexto demográfico (sexo, edad, nacionalidad) del stock condenado por Ley 20.000.

---

### Eje 3 — Contexto socioeconómico comunal

#### 3.1 CASEN 2024 — Observatorio Social
- **Organismo:** Ministerio de Desarrollo Social y Familia.
- **URL portal:** https://observatorio.ministeriodesarrollosocial.gob.cl/
- **Resultados 2024:** publicados enero 2026.
- **Cobertura:** bianual (2013, 2015, 2017, 2020, 2022, 2024).
- **Granularidad:** hogar/persona (microdato con ponderador) + agregados **comunales oficiales** (SAE — Small Area Estimation).
- **Variables:** pobreza por ingresos (17.3% nacional 2024), pobreza multidimensional, ingreso autónomo, escolaridad, hacinamiento.
- **Formato:** microdatos SPSS/Stata + reportes comunales PDF + tablas XLSX.
- **Aporte:** correlacionar tasa CEAD con pobreza comunal. Abre análisis de desigualdad punitiva.
- **Cruzabilidad:** ✅ `CUT comuna` = clave primaria compartida con CEAD.

#### 3.2 Censo 2024 — INE
- **URL:** https://censo2024.ine.gob.cl/
- **Base publicada:** dic-2025.
- **Granularidad:** comunal y menor (zona censal).
- **Variables:** población total, estructura etaria, hogares, migración.
- **Formato:** CSV/Excel abierto.
- **Aporte:** denominador oficial correcto para recalcular tasas comunales CEAD.
- **Cruzabilidad:** ✅ clave `CUT comuna`.

#### 3.3 Proyecciones de Población — INE
- **URL:** https://www.ine.gob.cl/estadisticas-por-tema/demografia-y-poblacion/proyecciones-de-poblacion
- **Granularidad:** comunal anual 2002–2035.
- **Formato:** Excel/CSV.
- **Aporte:** denominador anual para tasas comunales multi-año.

#### 3.4 SINIM — Sistema Nacional de Información Municipal
- **Organismo:** SUBDERE.
- **URL portal:** https://www.sinim.gov.cl/
- **URL datos:** https://datos.sinim.gov.cl/
- **Granularidad:** comunal (345 comunas).
- **Variables:** presupuesto municipal, personal, educación, salud primaria, seguridad ciudadana. Años 2001–actual.
- **Aporte:** capacidad institucional del municipio como variable de control.
- **Cruzabilidad:** ✅ `CUT comuna`.

---

### Eje 4 — Salud y uso terapéutico

#### 4.1 SENDA — Estudio Nacional de Drogas en Población General (ENPG)
- **Organismo:** Servicio Nacional para la Prevención y Rehabilitación del Consumo de Drogas y Alcohol.
- **URL observatorio:** https://www.senda.gob.cl/estudio-observatorio/poblacion-general/
- **Biblioteca:** https://bibliodrogas.gob.cl/observatorio/
- **Estudios recientes:** 14° ENPG (2022), 15° ENPE (2024 escolares), 16° ENPG (2024 población general — presentado dic-2025).
- **Granularidad:** nacional + regional + algunas comunas grandes del muestreo. **No todas las 345**.
- **Variables:** prevalencia consumo cannabis (vida, último año, último mes), edad de inicio, autoreporte médico.
- **Formato:** reportes PDF + bases microdato (bajo registro).
- **Aporte:** dimensión del consumo cruzada con la dimensión punitiva — comunas/regiones con más prevalencia vs más criminalización.
- **Cruzabilidad:** ⚠️ regional sí. Comunal solo ciudades muestreadas — **prohibido imputar al resto**.

#### 4.2 SENDA — Estudio Escolar (ENPE)
- **URL:** https://www.senda.gob.cl/wp-content/uploads/2025/03/Principales-Resultados-15%C2%B0-ENPE.pdf
- **Granularidad:** nacional + regional.
- **Aporte:** panorama del consumo adolescente — contrapeso al enfoque punitivo.

#### 4.3 ISP — Registro Sanitario de Productos Farmacéuticos
- **Organismo:** Instituto de Salud Pública.
- **URL:** https://registrosanitario.ispch.gob.cl/
- **Granularidad:** producto farmacéutico individual.
- **Aporte:** productos de cannabis medicinal con registro sanitario (Sativex y sucesores) — uso legal vs persecución.
- **Formato:** consulta web, sin API — requiere scraping cuidadoso.
- **Cruzabilidad:** ❌ no cruza con datos punitivos. Se presenta como sección contextual independiente.

#### 4.4 Farmacias autorizadas — ISP
- **URL:** https://www.ispch.gob.cl/anamed/establecimientos-farmaceuticos-y-cosmeticos/autorizacion-de-establecimientos/
- **Granularidad:** establecimiento (dirección).
- **Aporte:** georeferenciación de farmacias con capacidad magistral — mapa de acceso legal.

---

### Matriz de cruzabilidad

| Fuente nueva | CEAD (comunal) | DPP (regional) | PDI (regional) | Clave de cruce |
|---|---|---|---|---|
| PJud sentencias | ⚠️ región vía tribunal | ⚠️ taxonomía distinta | ⚠️ | `region_id, anio, materia` con mapeo explícito |
| Fiscalía boletines | ❌ no comunal | ✅ región+año | ✅ región+año | `region_id, anio, categoria_delito` |
| Gendarmería población penal | ❌ no comunal | ⚠️ región+año | ⚠️ | `region_id, anio, Ley 20.000` |
| CASEN 2024 | ✅ `cut_comuna` | ❌ sin comuna común | ❌ | `cut_comuna, anio_wave` |
| Censo 2024 / proyecciones INE | ✅ `cut_comuna` | ❌ | ❌ | denominador de tasas CEAD |
| SINIM | ✅ `cut_comuna` | ❌ | ❌ | `cut_comuna, anio` |
| SENDA ENPG | ❌ (salvo ciudades muestreadas) | ✅ región | ✅ región | `region_id, anio_estudio` |
| ISP registros / farmacias | ❌ | ❌ | ❌ | contextual independiente |

Las celdas ❌ **no se cruzan por distribución proporcional ni imputación**. Se
muestran en vistas separadas con etiqueta clara ("Dato regional — no distribuible
a comunas", "Dato contextual — no punitivo").

---

### Priorización sugerida (costo vs. beneficio)

1. **Censo 2024 + proyecciones INE** — denominador correcto inmediato para todas las tasas CEAD. Costo bajo, beneficio alto.
2. **PJud `numeros.pjud.cl/Descargas`** — cierra el embudo con sentencias reales. Costo medio (mapeo taxonómico), beneficio alto.
3. **Gendarmería compendios** — etapa final del embudo. Costo medio (descarga manual), beneficio alto.
4. **CASEN 2024 comunal** — eje correlacional socioeconómico. Costo bajo, beneficio analítico alto.
5. **SENDA ENPG** — contrapunto consumo/punitivismo. Costo medio (microdato bajo registro), beneficio narrativo alto.
6. **Fiscalía boletines** — valida DPP desde el ángulo persecutor. Costo bajo, beneficio incremental.
7. **SINIM** — capacidad municipal. Costo medio, beneficio en análisis avanzado.

Cada una de estas será un sub-proyecto con su propio plan de ETL + endpoints +
UI cuando se active, siguiendo el patrón del Checklist (sección final).

---

## 8. Estado de viabilidad técnica (verificado abril 2026)

Tras validación con WebFetch de cada portal, el estado real de las fuentes §7 es:

### ✅ VIABLES — descarga directa

| Fuente | URL XLSX/XLS directa | Notas |
|---|---|---|
| **Fiscalía — Boletín Anual 2024** | `fiscaliadechile.cl/sites/default/files/documentos/Boletin_Anual__2024.xls` | Categoría "Ley 20.000 / Drogas" explícita, 16 regiones |
| **Fiscalía — Boletín Anual 2025** | `fiscaliadechile.cl/sites/default/files/documentos/Boletín_Anual_2025-20260101_v1.xlsx` | Publicado enero 2026 |
| **Fiscalía — Boletín 1er Sem 2025** | `fiscaliadechile.cl/sites/default/files/documentos/Boletin_institucional_enero_junio_2025_20250703_v1.xlsx` | — |
| **INE Proyecciones 2002-2035** | `ine.gob.cl/docs/default-source/proyecciones-de-poblacion/cuadros-estadisticos/base-2017/estimaciones-y-proyecciones-2002-2035-comunas.xlsx` | Base Censo 2017. Actualización Censo 2024 esperada 2º sem 2026. |
| **CASEN 2024 — Base comunas** | Observatorio MIDESOF, portal `observatorio.ministeriodesarrollosocial.gob.cl/encuesta-casen-2024` | Solo formatos STATA/R/SPSS — requiere `pyreadstat`. Publicado enero 2026, 335 comunas, 78.654 hogares. |

### 🔒 BLOQUEADAS — acceso restringido o formato no-máquina

| Fuente | Razón bloqueo | Acción necesaria |
|---|---|---|
| **PJud numeros.pjud.cl/Descargas** | Portal requiere JavaScript renderizado; los 8 boletines PDF identificados NO mencionan Ley 20.000 (cubren homicidios, RPA, VIF, etc.) | Solicitud SAIP formal al Poder Judicial pidiendo dataset de causas Ley 20.000 por tribunal/año/materia |
| **INE Censo 2024 microdatos** | Solo accesible vía Redatam Web interactivo, sin descarga CSV/XLSX directa | Integrar cliente Redatam (complejo) o esperar publicación tabulada |
| **Gendarmería — Compendios PDF** | PDFs 2022-2024 son **imágenes escaneadas JPEG embebidas** (2709×1540px), texto NO extraíble | Pipeline OCR con Tesseract (datos de calidad incierta) o descargar reportes mensuales XLSX — pero estos últimos NO tienen desglose por delito Ley 20.000 |
| **SINIM datos.sinim.gov.cl** | NO publica variables de detenciones ni delitos. Áreas disponibles: Admin/Finanzas, RRHH, Educación, Salud, Social, Desarrollo Territorial, Caracterización Comunal, Género, Cementerio. "Seguridad ciudadana" ausente del portal de datos. | Abandonar — no aporta variables relacionadas al eje punitivo |
| **SENDA — Microdatos ENPG** | Portal `senda.gob.cl/.../base-de-datos/` devuelve 403. Solicitud formal con justificación de uso requerida. | Solicitud formal a Observatorio Chileno de Drogas. Mientras tanto, parsear tabulados regionales del PDF público ENPG 2022 (URL verificada). |
| **ISP — Registro Sanitario** | Portal `registrosanitario.ispch.gob.cl` requiere scraping JS dinámico. NO cruzable con punitivismo. | Diferir — baja prioridad; es data contextual no punitiva |

### Política

No se implementa ninguna fuente bloqueada mediante invención ni aproximación. Se
documentan acá con la razón real y la acción necesaria para desbloquearlas.
Cuando/si una se desbloquee, se mueve a §8 VIABLES y se abre un sub-proyecto
propio siguiendo el Checklist final.

---

*Última actualización: 2026-04-14*
