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

*Última actualización: 2026-04-11*
