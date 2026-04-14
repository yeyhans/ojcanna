# Observatorio Judicial Cannábico — Contexto del Proyecto

## Propósito
Plataforma cívica de fiscalización que mapea la aplicación de la **Ley N° 20.000**
(drogas) en Chile cruzando **cinco fuentes oficiales** a nivel comunal/regional y
construyendo un **"Embudo del Punitivismo"** que integra la etapa policial,
investigativa, defensorial y persecutora. Objetivo final: auditar la discrecionalidad
judicial en causas de cannabis cruzando sentencias del PJud.

**Fuentes operativas hoy:**
- CEAD (policial, comunal)
- DPP (defensorial, regional)
- PDI / datos.gob.cl (investigativa, regional)
- Fiscalía Nacional / Ministerio Público (persecutora, regional)
- INE Proyecciones base 2017 (denominador poblacional comunal, 2002-2035)

**Fuente planificada:** PJud (sentencias) — pipeline scraper + NLP (MVP metadata-only;
texto completo pendiente de SAIP, reCAPTCHA v3 bloquea scraping anónimo).

> Ver [`FUENTES.md`](./FUENTES.md) para la especificación completa de cada fuente,
> URLs, taxonomías y limitaciones conocidas.

## Stack Tecnológico
- **Frontend**: React 18, TypeScript, Vite 8 (rolldown), MapLibre GL JS (WebGL), Framer Motion, Tailwind CSS, shadcn/ui, Recharts, react-router-dom
- **Backend**: Python 3.10+, FastAPI (ASGI/asyncpg), Pydantic v2, GZipMiddleware
- **Base de Datos**: Neon PostgreSQL + PostGIS (serverless, `sslmode=require`)
- **ETL**: Python, `httpx` async, `pandas`, `tenacity`, `openpyxl`/`xlrd` (lectura XLSX/XLS), `playwright-stealth` (PJud)
- **NLP / Privacidad**: HMAC salado (`PJUD_AUDIT_SALT`) para tabla de auditoría; anonimizador de texto con versión (`anonimizador_version`)
- **Deploy**: backend Render (cold starts free tier), frontend Vercel

## Estructura del Proyecto
```
anonimouscanna/
├── backend/
│   ├── api/                        # FastAPI — endpoints por fuente + embudo + export
│   │   ├── main.py                 # App, GZipMiddleware, CORS, lifespan asyncpg, prewarm_cache
│   │   ├── database.py             # Pool asyncpg, dependency injection
│   │   ├── routers/
│   │   │   ├── cead.py             # /api/v1/cead/* (+ prewarm de geom_cache)
│   │   │   ├── contexto.py         # /api/v1/contexto/* (población INE)
│   │   │   ├── dpp.py              # /api/v1/dpp/*
│   │   │   ├── pdi.py              # /api/v1/pdi/*
│   │   │   ├── fiscalia.py         # /api/v1/fiscalia/*
│   │   │   ├── pjud.py             # /api/v1/pjud/* (metadata-only mientras no haya texto)
│   │   │   ├── embudo.py           # /api/v1/embudo{,/ranking,/sankey} — cruce 4 fuentes
│   │   │   └── export.py           # /api/v1/export/{source}.{csv,xlsx} + /manifest
│   │   └── schemas/
│   │       ├── cead.py             # FeatureCollection, FiltrosResponse, StatsResponse
│   │       ├── contexto.py         # PoblacionResponse, PoblacionSerieResponse
│   │       ├── dpp.py              # DppResumenResponse, DppSerieResponse, DppRegionesResponse
│   │       ├── pdi.py              # PdiResumenResponse, PdiRegionesResponse, PdiSerieResponse
│   │       ├── fiscalia.py         # FiscaliaFiltrosResponse, FiscaliaResumenResponse, FiscaliaSerieResponse, FiscaliaRegionesResponse
│   │       ├── pjud.py             # PjudFiltrosResponse, PjudStatsResponse, PjudResumenResponse, PjudProporcionalidadResponse, PjudPorTribunalResponse, PjudPorRegionResponse, PjudVeredictosResponse
│   │       └── embudo.py           # EmbudoComunaResponse, EmbudoRankingResponse, EmbudoSankeyResponse
│   ├── etl/
│   │   ├── common/
│   │   │   ├── base_consolidator.py  # Helper staging_upsert()
│   │   │   └── checkpoint.py         # JSONL persistence
│   │   ├── cead/                   # Pipeline CEAD (minsegpublica.gob.cl)
│   │   │   ├── config.py           # URLs, taxonomía, años (2005-2025), 7 subgrupos drogas
│   │   │   ├── extractor.py        # httpx async — POST al endpoint interno
│   │   │   ├── consolidator.py     # JSONL → PostgreSQL (ON CONFLICT DO NOTHING)
│   │   │   ├── runner.py           # CLI orquestador
│   │   │   ├── mapper.py           # Playwright (legacy, no activo)
│   │   │   ├── models.py           # Pydantic: CeadHecho, CodigosMap
│   │   │   ├── codigos_cead.json   # 7 subgrupos, 16 regiones, 346 comunas
│   │   │   ├── load_comunas.py     # Migración única GADM → PostGIS
│   │   │   ├── run_sql.py          # Ejecutor de archivos .sql
│   │   │   └── sql/
│   │   │       ├── 001_create_comunas.sql
│   │   │       ├── 002_create_source_tables.sql
│   │   │       ├── 003_create_ine_poblacion.sql
│   │   │       ├── 004_create_fiscalia_boletin.sql
│   │   │       └── 005_create_pjud_tables.sql
│   │   ├── dpp/                    # Pipeline Defensoría Penal Pública (XLSX 2020-2024)
│   │   ├── pdi/                    # Pipeline datos.gob.cl (delitos/denuncias/víctimas)
│   │   ├── fiscalia/               # Pipeline Fiscalía Nacional (Boletines Anuales 2024-2025)
│   │   │   ├── config.py           # URLs XLS/XLSX boletines + mapeo REGION_ID_MAP
│   │   │   ├── downloader.py
│   │   │   ├── consolidator.py     # Normaliza categoría "Ley 20.000"
│   │   │   └── runner.py
│   │   ├── ine_proyecciones/       # Pipeline INE base 2017 (denominador poblacional)
│   │   │   ├── config.py           # XLSX oficial 2002-2035, cache 30 días
│   │   │   ├── downloader.py
│   │   │   ├── consolidator.py     # → tabla ine_poblacion (cut, anio, poblacion_total)
│   │   │   └── runner.py
│   │   └── pjud/                   # Pipeline Poder Judicial (MVP metadata-only)
│   │       ├── config.py
│   │       ├── session.py          # playwright-stealth + cookies/headers
│   │       ├── downloader.py       # Portal Unificado (bloqueado por reCAPTCHA v3)
│   │       ├── extractor.py        # Parser de fallos
│   │       ├── anonimizer.py       # Redacción RUT/nombres (versionado)
│   │       ├── hmac_util.py        # HMAC-SHA256 salado con PJUD_AUDIT_SALT
│   │       ├── consolidator.py     # → pjud_sentencias + pjud_extracciones + pjud_audit
│   │       ├── models.py
│   │       └── runner.py
│   ├── data/                       # NO commitear (.gitignore)
│   │   ├── checkpoint.jsonl        # ~92k filas CEAD 2005-2024
│   │   ├── dpp/                    # XLSX 2020-2024
│   │   ├── pdi/                    # XLS 2024-2025 (delitos, denuncias, víctimas)
│   │   ├── fiscalia/               # XLS 2024 + XLSX 2025
│   │   ├── ine/                    # proyecciones_comunas.xlsx
│   │   └── geo/comunas_bcn/        # GeoJSON GADM Chile nivel-3
│   ├── tests/
│   │   ├── api/                    # tests CEAD, contexto, export, PJud
│   │   └── etl/pjud/               # tests anonimizador, extractor
│   ├── requirements.txt
│   └── .env                        # DATABASE_URL, PJUD_AUDIT_SALT (NO commitear)
├── frontend/
│   └── src/
│       ├── App.tsx                 # Persistent map + Routes, splash por navegación, tema light/dark por ruta
│       ├── pages/
│       │   ├── MapaPage.tsx        # Mapa coropleta CEAD (ruta "/") — SIEMPRE montada
│       │   ├── DppPage.tsx         # Analytics DPP (/dpp)
│       │   ├── PdiPage.tsx         # Analytics PDI (/pdi)
│       │   ├── FiscaliaPage.tsx    # Analytics Fiscalía (/fiscalia)
│       │   ├── PjudPage.tsx        # Analytics PJud (HIDDEN — pendiente SAIP)
│       │   ├── EmbudoPage.tsx      # Embudo/Sankey (HIDDEN — requiere datos PJud)
│       │   └── DatosPage.tsx       # Metadata de las 5 fuentes, descargas CSV/XLSX (/datos)
│       ├── components/
│       │   ├── MapaCEAD.tsx        # Canvas MapLibre
│       │   ├── MapaChoropleth.tsx  # Layer con step expression
│       │   ├── FilterPanel.tsx     # Bottom sheet mobile / sidebar desktop
│       │   ├── Legend.tsx          # Leyenda de 5 cuantiles
│       │   ├── SubgrupoCheckbox.tsx
│       │   ├── ComunaTooltip.tsx
│       │   ├── ComunaRanking.tsx
│       │   ├── SourceSelector.tsx
│       │   ├── NavBar.tsx          # Links /, /dpp, /pdi, /fiscalia, /datos (pjud y embudo comentados)
│       │   ├── InfoModal.tsx
│       │   ├── SplashScreen.tsx    # Inicial + per-route (1500ms)
│       │   ├── SourceAttribution.tsx
│       │   ├── TaxonomyBanner.tsx  # Advierte del corte CEAD 2024
│       │   ├── EmbudoSankey.tsx    # Diagrama Sankey UNODC
│       │   ├── ui/                 # Shared UI library (barrel en index.ts)
│       │   │   ├── PageShell.tsx
│       │   │   ├── SectionTitle.tsx
│       │   │   ├── DataCard.tsx
│       │   │   ├── KpiCard.tsx
│       │   │   ├── ChartFrame.tsx  # + helpers chartTooltipStyle/chartAxisTickStyle/chartGridProps
│       │   │   ├── InfoTooltip.tsx
│       │   │   ├── SourceBadge.tsx # + type Granularidad
│       │   │   ├── SegmentedControl.tsx
│       │   │   ├── SortableTable.tsx
│       │   │   ├── ThemeToggle.tsx
│       │   │   └── SiteFooter.tsx
│       │   └── viz/                # Visualization primitives
│       │       ├── Heatmap.tsx
│       │       ├── Lollipop.tsx
│       │       ├── RankedDotPlot.tsx
│       │       └── Stacked100Bar.tsx
│       ├── hooks/
│       │   ├── useCeadMapa.ts
│       │   ├── useCachedFetch.ts
│       │   ├── useDppMapa.ts
│       │   ├── useDppAnalytics.ts
│       │   ├── usePdiMapa.ts
│       │   ├── usePdiAnalytics.ts
│       │   ├── useFiscaliaAnalytics.ts
│       │   ├── usePjud.ts
│       │   ├── useEmbudo.ts
│       │   ├── useTheme.ts         # Controla data-theme del <html> + persistencia localStorage
│       │   └── useIsMobile.ts
│       ├── store/
│       │   ├── dataStore.ts        # Cache memory + sessionStorage + dedup in-flight
│       │   └── urlCache.ts
│       ├── providers/
│       │   └── AppDataProvider.tsx # Pre-fetch durante splash + idle-prefetch de chunks lazy
│       ├── lib/
│       │   └── colorScale.ts       # buildStepExpression (5 cuantiles MapLibre)
│       └── types/
│           ├── cead.ts  common.ts  dpp.ts  pdi.ts
│           ├── fiscalia.ts
│           ├── pjud.ts
│           ├── embudo.ts
│           └── export.ts
├── CLAUDE.md                       # Este archivo
├── FUENTES.md                      # Especificación de fuentes de datos
└── docs/
    ├── superpowers/specs/          # Specs de diseño aprobados
    └── saip_pjud_borrador.md       # Borrador oficio SAIP al Poder Judicial
```

## Base de Datos — Schema relevante
```sql
-- Comunas (344 de 346 — Pozo Almonte y Antártica no en GADM v4.1)
CREATE TABLE comunas (cut VARCHAR(6) PRIMARY KEY, nombre, region_id, geom GEOMETRY(MULTIPOLYGON,4326));
CREATE INDEX ON comunas USING GIST(geom);

-- CEAD: hechos policiales comunales (~50.862 filas, 2005-2024)
CREATE TABLE cead_hechos (...);
-- UNIQUE(anio, comuna_id, subgrupo_id, tipo_caso, taxonomy_version)

-- DPP: causas defensoriales (2020-2024)
CREATE TABLE dpp_causas (...);
-- UNIQUE(anio, COALESCE(region_id,''), tipo_delito, COALESCE(tipo_termino,''))

-- PDI / datos.gob.cl: delitos, denuncias, víctimas (2024-2025, regional)
CREATE TABLE datosgob_seguridad (...);
-- UNIQUE(anio, COALESCE(region_id,''), categoria, COALESCE(subcategoria,''))

-- Fiscalía: boletines anuales categoría "Ley 20.000" (2024-2025, regional)
CREATE TABLE fiscalia_boletin (anio, region_id, region_nombre, categoria_delito, tipo_metrica, n_causas, ...);
-- UNIQUE(anio, region_id, categoria_delito, tipo_metrica)
-- tipo_metrica ∈ {ingresos, terminos, formalizaciones}

-- INE Proyecciones base Censo 2017 (denominador 2002-2035, comunal)
CREATE TABLE ine_poblacion (cut, nombre, anio, poblacion_total, fuente, ...);
-- UNIQUE(cut, anio, fuente)

-- PJud Fase E (2025+, capa pública + auditoría con HMAC salado)
CREATE TABLE pjud_sentencias (id UUID PK, rol, tribunal_id, comuna_id FK, fecha, materia, texto_anonimizado, anonimizador_version, ocr_required, ...);
CREATE TABLE pjud_extracciones (sentencia_id FK, extractor_version, gramaje_g, veredicto, pena_meses, tipo_delito, receta_medica, atipicidad_consumo_personal, confianza, ...);
CREATE TABLE pjud_download_log (rol, tribunal_id, status, intentos, ...);  -- idempotencia scraper
CREATE TABLE pjud_audit (sentencia_id FK, texto_hmac, entidades_detectadas JSONB, ...);  -- admin-only
-- Marco normativo: Acta 164-2024 CS (vigencia 2025-01-01) + Ley 19.628 (Privacidad por Diseño)
```

**Nota CUT:** Los IDs comunales (`cead_hechos.comuna_id`, `comunas.cut`, `ine_poblacion.cut`)
usan el formato CEAD **sin zero-padding** (`"5602"`, no `"05602"`). `load_comunas.py`
normaliza GADM al ingerir.

**Taxonomías CEAD:** 2005-2023 = `DMCS_legacy`, 2024+ = `Taxonomia_2024`
(constante `TAXONOMY_CUTOFF_YEAR=2024`). La UI advierte vía `TaxonomyBanner.tsx`.

## Comandos Principales

### Backend (desde `backend/`)
```bash
# Iniciar API
uvicorn api.main:app --reload --port 8000

# Tests de integración (requieren Neon activo)
pytest tests/api/ -v
pytest tests/etl/pjud/ -v

# Migración geoespacial (primera vez o al cambiar geometrías)
python etl/cead/load_comunas.py

# Ejecutar pipelines ETL
python -m etl.cead.runner            --db-url $DATABASE_URL
python -m etl.dpp.runner             --db-url $DATABASE_URL
python -m etl.pdi.runner             --db-url $DATABASE_URL
python -m etl.fiscalia.runner        --db-url $DATABASE_URL
python -m etl.ine_proyecciones.runner --db-url $DATABASE_URL
python -m etl.pjud.runner            --db-url $DATABASE_URL  # bloqueado por reCAPTCHA

# Ejecutar SQL manualmente
python etl/cead/run_sql.py etl/cead/sql/003_create_ine_poblacion.sql
python etl/cead/run_sql.py etl/cead/sql/004_create_fiscalia_boletin.sql
python etl/cead/run_sql.py etl/cead/sql/005_create_pjud_tables.sql
```

### Frontend (desde `frontend/`)
```bash
npm run dev       # Desarrollo — proxy /api → localhost:8000
npm run build     # Build producción
npx tsc --noEmit  # Type check sin compilar
```

## API Endpoints

### Salud
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/health` | Health check |

### CEAD (comunal, 2005-2024)
| Ruta | Descripción |
|------|-------------|
| `GET /api/v1/cead/filtros` | Años disponibles + 7 subgrupos |
| `GET /api/v1/cead/geometrias` | GeoJSON 344 comunas (prewarmed en lifespan) |
| `GET /api/v1/cead/stats?anio=&subgrupos=` | Stats comunales (tasa + frecuencia) |
| `GET /api/v1/mapa/cead` | **DEPRECATED** — geom+stats en un solo payload |

### Contexto — Población INE (comunal, 2002-2035)
| Ruta | Descripción |
|------|-------------|
| `GET /api/v1/contexto/poblacion?anio=` | Población por comuna para un año |
| `GET /api/v1/contexto/poblacion/serie?comuna=` | Serie anual 2002-2035 por comuna |

### DPP (regional/nacional, 2020-2024)
| Ruta | Descripción |
|------|-------------|
| `GET /api/v1/dpp/filtros` | Años disponibles |
| `GET /api/v1/dpp/stats?anio=` | Stats agregadas |
| `GET /api/v1/dpp/resumen?anio=` | Ingresos/términos + formas de término |
| `GET /api/v1/dpp/serie` | Serie temporal 2020-2024 |
| `GET /api/v1/dpp/regiones?anio=` | Distribución regional |

### PDI / datos.gob.cl (regional, 2024-2025)
| Ruta | Descripción |
|------|-------------|
| `GET /api/v1/pdi/filtros` | Años + categorías disponibles |
| `GET /api/v1/pdi/stats?anio=&categoria=` | Stats agregadas |
| `GET /api/v1/pdi/resumen?anio=` | Totales nacionales |
| `GET /api/v1/pdi/regiones?anio=&categoria=&subcategoria=` | Distribución regional |
| `GET /api/v1/pdi/serie` | Serie temporal |

### Fiscalía Nacional (regional, 2024-2025)
| Ruta | Descripción |
|------|-------------|
| `GET /api/v1/fiscalia/filtros` | Años + tipos de métrica (ingresos/términos/formalizaciones) |
| `GET /api/v1/fiscalia/resumen?anio=` | Totales nacionales Ley 20.000 |
| `GET /api/v1/fiscalia/serie` | Serie temporal |
| `GET /api/v1/fiscalia/regiones?anio=&tipo_metrica=` | Distribución regional |

### PJud — Sentencias Ley 20.000 (MVP metadata-only)
| Ruta | Descripción |
|------|-------------|
| `GET /api/v1/pjud/filtros` | Años, materias y fuentes disponibles |
| `GET /api/v1/pjud/stats?anio=` | Stats (con/sin texto, total tribunales) |
| `GET /api/v1/pjud/resumen?anio=` | Breakdown por tribunal y materia |
| `GET /api/v1/pjud/proporcionalidad?anio=` | Scatter gramaje (g) vs pena (meses) |
| `GET /api/v1/pjud/por-tribunal?anio=` | Veredictos por tribunal |
| `GET /api/v1/pjud/por-region?anio=` | Veredictos por región |
| `GET /api/v1/pjud/veredictos?anio=` | Distribución nacional de veredictos |

### Embudo del Punitivismo (cruce CEAD + PDI + DPP + Fiscalía + PJud)
| Ruta | Descripción |
|------|-------------|
| `GET /api/v1/embudo?anio=&comuna_id=` | Etapas (policial, investigativa, persecutora, defensorial, judicial) + `tasa_atricion_pct` |
| `GET /api/v1/embudo/ranking?anio=` | Top 50 comunas por volumen + ratio policial→judicial |
| `GET /api/v1/embudo/sankey?anio=&comuna_id=` | Nodos+flujos para diagrama Sankey UNODC |

### Export / Datos abiertos
| Ruta | Descripción |
|------|-------------|
| `GET /api/v1/export/{source}.csv?anio=` | CSV streaming por fuente (cead/dpp/pdi/fiscalia/pjud) |
| `GET /api/v1/export/{source}.xlsx?anio=` | XLSX in-memory por fuente |
| `GET /api/v1/export/manifest` | Metadata de todas las fuentes (cobertura, última actualización, licencia) |

> **Bloqueos operativos PJud:** (1) reCAPTCHA v3 del Portal Unificado bloquea scraping
> anónimo (HTTP 500 tras bootstrap). Mitigaciones: `playwright-stealth` integrado, proxy
> residencial pendiente, oficio SAIP institucional (ver `docs/saip_pjud_borrador.md`).
> (2) Texto completo requiere autenticación PJud institucional. (3) Variable de entorno
> `PJUD_AUDIT_SALT` es **obligatoria** en `backend/.env` (fail-fast) para HMAC de la
> tabla `pjud_audit`. Generar: `python -c "import secrets; print(secrets.token_hex(32))"`.

> **Cruce DPP en `/embudo`:** DPP no tiene granularidad comunal. Las causas regionales
> se **distribuyen proporcionalmente** entre comunas usando los pesos relativos del
> CEAD. Es aproximación metodológica, no cruce directo. Ver `FUENTES.md`.

## Sub-proyectos
| # | Nombre | Estado |
|---|--------|--------|
| A | Mapa coropleta CEAD | ✅ **Completo** |
| B | Analytics DPP (causas defensoriales) | ✅ **Completo** |
| C | Analytics PDI / datos.gob.cl | ✅ **Completo** |
| D | Analytics Fiscalía (Boletines Anuales) | ✅ **Completo** |
| E | INE Proyecciones — denominador poblacional | ✅ **Completo** |
| F | Embudo del Punitivismo + Sankey UNODC | 🟡 **Backend listo, UI oculta** — restaurar ruta `/embudo` cuando haya datos PJud |
| G | Scraper PJud + Pipeline NLP | 🟡 **MVP metadata-only** — pipeline + 7 endpoints listos; bloqueado por reCAPTCHA v3 y auth institucional. UI oculta del NavBar |
| H | Dashboards de discrecionalidad judicial | 🟡 **UI oculta** — código preservado; restaurar destapando las dos rutas comentadas en `App.tsx` y `NavBar.tsx` cuando llegue dataset PJud |
| I | Página de datos abiertos `/datos` | ✅ **Completo** — manifest + export CSV/XLSX de las 5 fuentes |

## Arquitectura del Frontend

### Layout persistente (`App.tsx`)
El mapa (`MapaPage`) **nunca se desmonta**. Vive en un slot absoluto `inset:0` que
alterna `visibility`/`zIndex`/`pointerEvents` según la ruta (`isMapaRoute`). Las
rutas analíticas viven en un segundo slot que ocupa el mismo espacio cuando el path
no es `/`. MapLibre conserva su instancia, tiles y style entre navegaciones.

### Tema por ruta
- `/` (mapa) → `data-theme="light"` (basemap Carto claro)
- Resto de rutas → `data-theme="dark"`

El switch es automático en cada navegación client-side; `useTheme.ts` controla el
estado para componentes que lo necesitan.

### Splash en cada navegación
Además del splash inicial (`showSplash`), cada cambio de ruta muestra un splash
corto (`ROUTE_SPLASH_MS = 1500`) para dar feedback durante el lazy-load del chunk.

### Rutas activas
`/`, `/dpp`, `/pdi`, `/fiscalia`, `/datos`.
`/pjud` y `/embudo` están **comentadas** en `App.tsx` y `NavBar.tsx` hasta que haya
datos PJud reales. El código está vivo y los tests siguen corriendo.

### Caché multinivel
`frontend/src/store/dataStore.ts` implementa tres capas:
1. **Memory** — instantáneo, `Map` de módulo.
2. **sessionStorage** — sobrevive recargas (<50ms).
3. **Red** — dedup por Symbol de requests in-flight para evitar duplicados.

`AppDataProvider` hace pre-fetch del último año + filtros durante el splash inicial,
y dispara **idle-prefetch** de los chunks lazy (`DppPage`, `PdiPage`, etc.) para que
el primer click al NavBar los encuentre ya descargados.

## Librería UI compartida

Todos los dashboards analíticos se construyen con primitivas bajo
`frontend/src/components/ui/` (importables por barrel `./ui`) y visualizaciones
bajo `frontend/src/components/viz/`. Ver memoria
[Design: DispensAI brand unification](../.claude/projects/.../design_dispensai_unification.md)
para las reglas estéticas (monocromo estricto, Cal Sans/Montserrat/JetBrains Mono).

**UI (`components/ui/`)**: `PageShell`, `SectionTitle`, `DataCard`, `KpiCard`,
`ChartFrame` (+ helpers de Recharts), `InfoTooltip`, `SourceBadge`, `SegmentedControl`,
`SortableTable`, `ThemeToggle`, `SiteFooter`.

**Viz (`components/viz/`)**: `Heatmap`, `Lollipop`, `RankedDotPlot`, `Stacked100Bar`.

## Reglas y Convenciones
- `async def` en todos los endpoints FastAPI (pool asyncpg, no SQLAlchemy sync en API).
- Pydantic v2 para validar TODAS las respuestas de la API.
- GeoJSON es el único formato de salida para datos geoespaciales (consumo en MapLibre).
- Separar `geometrias` (estático, cacheable) de `stats` (dinámico por filtros) — los
  endpoints `/mapa/*` están deprecados por tamaño de payload.
- `@import` de CSS externo SIEMPRE antes de las directivas `@tailwind` (orden PostCSS).
- Privacidad (PJud): el NLP ignora identidad de imputados; solo metadata de tribunal,
  juez y veredicto. Texto anonimizado + HMAC salado en tabla de auditoría.
- `DATABASE_URL` y `PJUD_AUDIT_SALT` siempre desde variable de entorno, nunca hardcoded.
- `backend/.env` y `backend/data/` NO se commitean (`.gitignore`).
- Cada pipeline ETL vive en `backend/etl/{fuente}/` con patrón
  `config.py → downloader/extractor.py → consolidator.py → runner.py`.
- Los consolidators usan `ON CONFLICT DO NOTHING` (no upsert con sobreescritura)
  para preservar historial y permitir reruns idempotentes.
- Nunca cross-derivar el "último año" entre fuentes: cada dataset tiene su propio
  rango. Consultar `filtros` de cada router para el prefetch.
- Rutas nuevas deben agregarse a `App.tsx` + `NavBar.tsx` **y** al `AppDataProvider`
  (si necesitan prefetch) + al idle-prefetch de chunks lazy.

## Dependencias clave instaladas
**Python** (`backend/requirements.txt`): `fastapi`, `uvicorn[standard]`, `asyncpg`,
`python-dotenv`, `geopandas`, `shapely`, `pandas`, `psycopg2-binary`, `pydantic`,
`httpx`, `tenacity`, `openpyxl`, `xlrd`, `playwright`, `playwright-stealth`,
`SQLAlchemy` (solo en ETL, no en API).

**Node** (`frontend/package.json`): `maplibre-gl@^4`, `react-map-gl@^8`,
`framer-motion@^11`, `recharts`, `react-router-dom`, `tailwindcss@^3`, `vite@^8`
(rolldown — `manualChunks` debe ser función, no record).
