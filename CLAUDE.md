# Observatorio Judicial Cannábico — Contexto del Proyecto

## Propósito
Plataforma cívica de fiscalización que mapea la aplicación de la **Ley N° 20.000**
(drogas) en Chile cruzando tres fuentes oficiales a nivel comunal/regional y
construyendo un **"Embudo del Punitivismo"** que integra la etapa policial,
defensorial e investigativa. Objetivo final (pendiente): auditar la discrecionalidad
judicial en causas de cannabis cruzando sentencias del PJud.

**Fuentes operativas hoy:** CEAD (policial, comunal) + DPP (defensorial, regional)
+ PDI / datos.gob.cl (investigativa, regional).
**Fuente planificada:** PJud (sentencias) + pipeline NLP.

> Ver [`FUENTES.md`](./FUENTES.md) para la especificación completa de cada fuente,
> URLs, taxonomías y limitaciones conocidas.

## Stack Tecnológico
- **Frontend**: React 18, TypeScript, Vite, MapLibre GL JS (WebGL), Framer Motion, Tailwind CSS, shadcn/ui, Recharts
- **Backend**: Python 3.10+, FastAPI (ASGI/asyncpg), Pydantic v2
- **Base de Datos**: Neon PostgreSQL + PostGIS (serverless, `sslmode=require`)
- **ETL**: Python, `httpx` async, `pandas`, `tenacity`, `openpyxl`/`xlrd` (lectura XLSX/XLS)
- **NLP** (futuro): spaCy, Transformers — clasificación de sentencias PJud

## Estructura del Proyecto
```
anonimouscanna/
├── backend/
│   ├── api/                        # FastAPI — endpoints de las 3 fuentes + embudo
│   │   ├── main.py                 # App, GZipMiddleware, CORS, lifespan asyncpg
│   │   ├── database.py             # Pool asyncpg, dependency injection
│   │   ├── routers/
│   │   │   ├── cead.py             # /cead/* (filtros, geometrias, stats, mapa*)
│   │   │   ├── dpp.py              # /dpp/* (filtros, stats, resumen, serie, regiones, mapa*)
│   │   │   ├── pdi.py              # /pdi/* (filtros, stats, resumen, regiones, serie, mapa*)
│   │   │   └── embudo.py           # /embudo, /embudo/ranking — cruza las 3 fuentes
│   │   └── schemas/
│   │       ├── cead.py             # FeatureCollection, FiltrosResponse, StatsResponse
│   │       ├── dpp.py              # DppResumenResponse, DppSerieResponse, DppRegionesResponse
│   │       ├── pdi.py              # PdiResumenResponse, PdiRegionesResponse, PdiSerieResponse
│   │       └── embudo.py           # EmbudoComunaResponse, EmbudoRankingResponse
│   ├── etl/
│   │   ├── common/
│   │   │   ├── base_consolidator.py  # Helper staging_upsert()
│   │   │   └── checkpoint.py         # JSONL persistence
│   │   ├── cead/                   # Pipeline CEAD (minsegpublica.gob.cl)
│   │   │   ├── config.py           # URLs, taxonomía, años (2005-2025), subgrupos drogas
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
│   │   │       └── 002_create_source_tables.sql
│   │   ├── dpp/                    # Pipeline Defensoría Penal Pública
│   │   │   ├── config.py           # URLs XLSX directas (hashes), mapeo regional
│   │   │   ├── downloader.py       # httpx + tenacity → descarga 2020-2024
│   │   │   ├── consolidator.py     # Hojas "Delitos", "Delitos FT", "Ingresos Terminos DR"
│   │   │   └── runner.py
│   │   └── pdi/                    # Pipeline datos.gob.cl (investigados por PDI)
│   │       ├── config.py           # Dataset 5373dac4-... (delitos/denuncias/víctimas)
│   │       ├── downloader.py
│   │       ├── consolidator.py     # Filtro por keywords de drogas
│   │       └── runner.py
│   ├── data/                       # NO commitear (.gitignore)
│   │   ├── checkpoint.jsonl        # ~92k filas CEAD 2005-2024
│   │   ├── dpp/                    # 5 XLSX 2020-2024
│   │   ├── pdi/                    # 3 XLS 2024 (delitos, denuncias, víctimas)
│   │   └── geo/comunas_bcn/        # GeoJSON GADM Chile nivel-3
│   ├── tests/api/                  # 9 tests de integración (requieren Neon)
│   ├── requirements.txt
│   └── .env                        # DATABASE_URL (NO commitear)
├── frontend/
│   └── src/
│       ├── pages/
│       │   ├── MapaPage.tsx        # Mapa coropleta CEAD (ruta /)
│       │   ├── DppPage.tsx         # Analytics DPP (/dpp)
│       │   ├── PdiPage.tsx         # Analytics PDI (/pdi)
│       │   └── EmbudoPage.tsx      # Ranking punitivismo (/embudo)
│       ├── components/
│       │   ├── MapaCEAD.tsx        # Canvas MapLibre
│       │   ├── MapaChoropleth.tsx  # Layer con step expression
│       │   ├── FilterPanel.tsx     # Bottom sheet mobile / sidebar desktop
│       │   ├── Legend.tsx          # Leyenda de 5 cuantiles
│       │   ├── SubgrupoCheckbox.tsx
│       │   ├── ComunaTooltip.tsx   # Popup glassmorfismo
│       │   ├── SourceSelector.tsx  # Toggle CEAD/DPP/PDI
│       │   ├── NavBar.tsx          # Links /, /dpp, /pdi, /embudo
│       │   ├── InfoModal.tsx
│       │   ├── EmbudoPanel.tsx     # Desglose 3 etapas por comuna
│       │   ├── EmbudoView.tsx
│       │   └── SplashScreen.tsx
│       ├── hooks/
│       │   ├── useCeadMapa.ts      # Fetch + debounce 300ms + AbortController
│       │   ├── useCachedFetch.ts   # Helper cache (sessionStorage)
│       │   ├── useDppMapa.ts
│       │   ├── useDppAnalytics.ts
│       │   ├── usePdiMapa.ts
│       │   ├── usePdiAnalytics.ts
│       │   ├── useEmbudo.ts
│       │   └── useIsMobile.ts
│       ├── store/
│       │   ├── dataStore.ts        # Cache memory + sessionStorage + dedup in-flight
│       │   └── urlCache.ts
│       ├── providers/
│       │   └── AppDataProvider.tsx # Pre-fetch durante splash screen
│       ├── lib/
│       │   └── colorScale.ts       # buildStepExpression (5 cuantiles MapLibre)
│       └── types/
│           ├── cead.ts
│           ├── dpp.ts
│           ├── pdi.ts
│           └── common.ts
├── CLAUDE.md                       # Este archivo
├── FUENTES.md                      # Especificación de fuentes de datos
└── docs/superpowers/specs/         # Specs de diseño aprobados
```

## Base de Datos — Schema relevante
```sql
-- Tabla espacial de comunas (344 de 346 — Pozo Almonte y Antártica no en GADM v4.1)
CREATE TABLE comunas (cut VARCHAR(6) PRIMARY KEY, nombre, region_id, geom GEOMETRY(MULTIPOLYGON,4326));
CREATE INDEX ON comunas USING GIST(geom);

-- CEAD: hechos policiales comunales (~50.862 filas, 2005-2024)
CREATE TABLE cead_hechos (...);
-- UNIQUE(anio, comuna_id, subgrupo_id, tipo_caso, taxonomy_version)
CREATE INDEX idx_cead_filtros ON cead_hechos (comuna_id, anio, subgrupo_id);

-- DPP: causas defensoriales nacionales + regionales (2020-2024)
CREATE TABLE dpp_causas (...);
-- UNIQUE(anio, COALESCE(region_id,''), tipo_delito, COALESCE(tipo_termino,''))

-- datos.gob.cl / PDI: delitos, denuncias, víctimas (2024, regional)
CREATE TABLE datosgob_seguridad (...);
-- UNIQUE(anio, COALESCE(region_id,''), categoria, COALESCE(subcategoria,''))
```

**Nota CUT:** Los IDs de comunas en `cead_hechos.comuna_id` provienen del portal CEAD
y NO tienen zero-padding (ej. `"5602"` no `"05602"`). La tabla `comunas.cut` usa el
mismo formato. `load_comunas.py` normaliza esto al ingerir GADM.

**Taxonomías CEAD:** 2005-2023 = `DMCS_legacy`, 2024+ = `Taxonomia_2024`
(constante `TAXONOMY_CUTOFF_YEAR=2024` en `etl/cead/config.py`). La UI debe advertir
al usuario que la serie no es continua sin precaución metodológica.

## Comandos Principales

### Backend (desde `backend/`)
```bash
# Iniciar API
uvicorn api.main:app --reload --port 8000

# Tests de integración (requieren Neon activo)
pytest tests/api/ -v

# Migración geoespacial (primera vez o al cambiar geometrías)
python etl/cead/load_comunas.py

# Ejecutar pipelines ETL
python -m etl.cead.runner --db-url $DATABASE_URL
python -m etl.dpp.runner  --db-url $DATABASE_URL
python -m etl.pdi.runner  --db-url $DATABASE_URL

# Ejecutar SQL manualmente
python etl/cead/run_sql.py etl/cead/sql/001_create_comunas.sql
python etl/cead/run_sql.py etl/cead/sql/002_create_source_tables.sql
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
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/v1/cead/filtros` | Años disponibles + 7 subgrupos |
| GET | `/api/v1/cead/geometrias` | GeoJSON de las 344 comunas (estático, cacheable) |
| GET | `/api/v1/cead/stats?anio=&subgrupos=` | Stats comunales (tasa agregada + frecuencia) |
| GET | `/api/v1/mapa/cead` | **DEPRECATED** — GeoJSON + stats en un solo payload |

### DPP (regional/nacional, 2020-2024)
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/v1/dpp/filtros` | Años disponibles |
| GET | `/api/v1/dpp/stats?anio=` | Stats agregadas |
| GET | `/api/v1/dpp/resumen?anio=` | Ingresos/términos + formas de término |
| GET | `/api/v1/dpp/serie` | Serie temporal 2020-2024 |
| GET | `/api/v1/dpp/regiones?anio=` | Distribución regional |
| GET | `/api/v1/mapa/dpp` | **DEPRECATED** |

### PDI / datos.gob.cl (regional, 2024)
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/v1/pdi/filtros` | Años + categorías disponibles |
| GET | `/api/v1/pdi/stats?anio=&categoria=` | Stats agregadas |
| GET | `/api/v1/pdi/resumen?anio=` | Totales nacionales |
| GET | `/api/v1/pdi/regiones?anio=&categoria=&subcategoria=` | Distribución regional |
| GET | `/api/v1/pdi/serie` | Serie temporal |
| GET | `/api/v1/mapa/pdi` | **DEPRECATED** |

### Embudo del Punitivismo (cruce CEAD + DPP + PDI)
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/v1/embudo?anio=&comuna_id=` | 3 etapas (policial, defensorial, investigativa) por comuna |
| GET | `/api/v1/embudo/ranking?anio=` | Top 50 comunas por ratio detenciones/causas |

> **Importante sobre `/embudo`:** como DPP no tiene granularidad comunal, las causas
> regionales se **distribuyen proporcionalmente** entre las comunas de cada región
> usando los pesos relativos del CEAD. Es una aproximación metodológica, no un cruce
> directo. Ver `FUENTES.md` para detalles.

## Sub-proyectos
| # | Nombre | Estado |
|---|--------|--------|
| A | Mapa coropleta CEAD | ✅ **Completo** |
| B | Analytics DPP (causas defensoriales) | ✅ **Completo** |
| C | Analytics PDI / datos.gob.cl | ✅ **Completo** |
| D | Embudo del Punitivismo (cruce 3 fuentes) | ✅ **Completo** |
| E | Scraper PJud + Pipeline NLP (sentencias) | 🔴 **Pendiente** |
| F | Dashboards de discrecionalidad judicial (jueces, veredictos) | 🔴 **Pendiente** (depende de E) |

## Reglas y Convenciones
- `async def` en todos los endpoints FastAPI (pool asyncpg, no SQLAlchemy sync en API).
- Pydantic v2 para validar TODAS las respuestas de la API.
- GeoJSON es el único formato de salida para datos geoespaciales (consumo en MapLibre).
- Separar `geometrias` (estático, cacheable) de `stats` (dinámico por filtros) en el
  frontend — los endpoints `/mapa/*` están deprecados por tamaño de payload.
- `@import` de CSS externo SIEMPRE antes de las directivas `@tailwind` (orden PostCSS).
- Privacidad: los algoritmos NLP (cuando se implementen) deben ignorar la identidad
  de imputados; solo metadata de tribunal, juez y veredicto.
- `DATABASE_URL` siempre desde variable de entorno, nunca hardcodeado en código.
- El archivo `backend/.env` y los datos en `backend/data/` NO se commitean (`.gitignore`).
- Cada pipeline ETL vive en su propia subcarpeta bajo `backend/etl/{fuente}/` con el
  patrón `config.py → downloader/extractor.py → consolidator.py → runner.py`.
- Los endpoints usan `ON CONFLICT DO NOTHING` (no upsert con sobreescritura) para
  preservar datos históricos y permitir reruns idempotentes.

## Dependencias clave instaladas
**Python** (`backend/requirements.txt`): `fastapi`, `uvicorn[standard]`, `asyncpg`,
`python-dotenv`, `geopandas`, `shapely`, `pandas`, `psycopg2-binary`, `pydantic`,
`httpx`, `tenacity`, `openpyxl`, `xlrd`, `SQLAlchemy` (solo en ETL, no en API).

**Node** (`frontend/package.json`): `maplibre-gl@^4`, `react-map-gl@^8`,
`framer-motion@^11`, `recharts`, `tailwindcss@^3`, `vite@^8`.

## Caché multinivel del frontend
`frontend/src/store/dataStore.ts` implementa tres capas:
1. **Memory** — instantáneo, vive en el `Map` del módulo.
2. **sessionStorage** — sobrevive recargas de página (<50ms).
3. **Red** — dedup de requests in-flight por Symbol para evitar llamadas duplicadas
   mientras otro componente ya está esperando el mismo payload.

`AppDataProvider` hace pre-fetch del último año + filtros durante el `SplashScreen`
para que `MapaPage` aparezca con datos ya calientes.
