# Observatorio Judicial Cannábico — Contexto del Proyecto

## Propósito
Plataforma cívica de fiscalización que mapea la persecución policial por ley de drogas
(Ley N° 20.000) en las 346 comunas de Chile, y audita la discrecionalidad judicial
en causas de cannabis. Fuentes: CEAD (policiales) y PJud (sentencias).

## Stack Tecnológico
- **Frontend**: React 18, TypeScript, Vite, MapLibre GL JS (WebGL), Framer Motion, Tailwind CSS, shadcn/ui, Tremor (analytics)
- **Backend**: Python 3.10+, FastAPI (ASGI/asyncpg), Pydantic v2
- **Base de Datos**: Neon PostgreSQL + PostGIS (serverless, `sslmode=require`)
- **ETL**: Python, Playwright (mapper), httpx async (extractor), pandas+SQLAlchemy (consolidator)
- **NLP** (futuro): spaCy, Transformers — clasificación de sentencias PJud

## Estructura del Proyecto
```
anonimouscanna/
├── backend/
│   ├── api/                    # FastAPI — endpoints del mapa y filtros
│   │   ├── main.py             # App, GZipMiddleware, CORS, lifespan asyncpg
│   │   ├── database.py         # Pool asyncpg, dependency injection
│   │   ├── routers/cead.py     # GET /api/v1/mapa/cead, GET /api/v1/cead/filtros
│   │   └── schemas/cead.py     # Pydantic: FeatureCollection, FiltrosResponse
│   ├── etl/cead/               # Pipeline ETL del CEAD (completo)
│   │   ├── mapper.py           # Playwright — captura códigos del portal
│   │   ├── extractor.py        # httpx async — descarga masiva con checkpoint
│   │   ├── consolidator.py     # pandas → PostgreSQL (ON CONFLICT DO NOTHING)
│   │   ├── runner.py           # Orquestador CLI (--db-url, --remap)
│   │   ├── config.py           # Constantes: URLs, taxonomía, años, paths
│   │   ├── models.py           # Pydantic: CeadHecho, CodigosMap
│   │   ├── codigos_cead.json   # Catálogo: 7 subgrupos, 346 comunas, regiones
│   │   ├── load_comunas.py     # Migración única: GADM GeoJSON → PostGIS
│   │   └── run_sql.py          # Ejecutor de archivos .sql contra la DB
│   ├── data/
│   │   ├── checkpoint.jsonl    # ~92k filas CEAD (NO commitear — .gitignore)
│   │   └── geo/comunas_bcn/   # GeoJSON GADM Chile nivel-3 (NO commitear)
│   ├── tests/api/              # 9 tests de integración (requieren Neon)
│   └── .env                    # DATABASE_URL (NO commitear)
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── MapaCEAD.tsx        # Mapa MapLibre full-viewport
│       │   ├── FilterPanel.tsx     # Bottom sheet mobile / sidebar desktop
│       │   ├── SubgrupoCheckbox.tsx
│       │   ├── ComunaTooltip.tsx   # Popup glassmorfismo
│       │   └── Legend.tsx          # Leyenda de cuantiles
│       ├── hooks/useCeadMapa.ts    # Fetch + debounce 300ms + AbortController
│       ├── lib/colorScale.ts       # buildStepExpression (5 cuantiles MapLibre)
│       └── types/cead.ts           # Interfaces TypeScript
└── docs/superpowers/specs/         # Specs de diseño aprobados
```

## Base de Datos — Schema relevante
```sql
-- Tabla espacial de comunas (344 de 346 — Pozo Almonte y Antártica no en GADM v4.1)
CREATE TABLE comunas (cut VARCHAR(6) PRIMARY KEY, nombre, region_id, geom GEOMETRY(MULTIPOLYGON,4326));
CREATE INDEX ON comunas USING GIST(geom);

-- Hechos policiales del CEAD (50.862 filas, 2005-2024)
-- UNIQUE(anio, comuna_id, subgrupo_id, tipo_caso, taxonomy_version)
CREATE TABLE cead_hechos (...);
CREATE INDEX idx_cead_filtros ON cead_hechos (comuna_id, anio, subgrupo_id);
```

**Nota CUT:** Los IDs de comunas en `cead_hechos.comuna_id` provienen del portal CEAD
y NO tienen zero-padding (ej. `"5602"` no `"05602"`). La tabla `comunas.cut` usa el
mismo formato. `load_comunas.py` normaliza esto al ingerir BCN/GADM.

**Taxonomías:** 2005-2023 = `DMCS_legacy`, 2024+ = `Taxonomia_2024`
(constante `TAXONOMY_CUTOFF_YEAR=2024` en `config.py`).

## Comandos Principales

### Backend (desde `backend/`)
```bash
# Iniciar API
uvicorn api.main:app --reload --port 8000

# Tests de integración (requieren Neon activo)
pytest tests/api/ -v

# Migración única (primera vez o al cambiar geometrías)
python etl/cead/load_comunas.py
python -m etl.cead.runner --db-url $DATABASE_URL

# Ejecutar SQL manualmente
python etl/cead/run_sql.py etl/cead/sql/001_create_comunas.sql
```

### Frontend (desde `frontend/`)
```bash
npm run dev     # Desarrollo — proxy /api → localhost:8000
npm run build   # Build producción
npx tsc --noEmit  # Type check sin compilar
```

## API Endpoints (Sub-proyecto A — operativos)
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/health` | Health check |
| GET | `/api/v1/cead/filtros` | Años disponibles + 7 subgrupos |
| GET | `/api/v1/mapa/cead?anio=&subgrupos=` | GeoJSON FeatureCollection 344 comunas |

## Sub-proyectos
| # | Nombre | Estado |
|---|--------|--------|
| A | Mapa coropleta CEAD | **Completo** |
| B | Scraper PJud + Pipeline NLP | Pendiente |
| C | Dashboards analíticos (jueces, funnel) | Pendiente (depende de B) |

## Reglas y Convenciones
- `async def` en todos los endpoints FastAPI (pool asyncpg, no SQLAlchemy sync en API).
- Pydantic v2 para validar TODAS las respuestas de la API.
- GeoJSON es el único formato de salida para datos geoespaciales (consumo en MapLibre).
- `@import` de CSS externo SIEMPRE antes de las directivas `@tailwind` (orden PostCSS).
- Privacidad: los algoritmos NLP deben ignorar la identidad de imputados; solo metadata
  de tribunal, juez y veredicto.
- `DATABASE_URL` siempre desde variable de entorno, nunca hardcodeado en código.
- El archivo `backend/.env` y los datos en `backend/data/` NO se commitean (`.gitignore`).

## Dependencias clave instaladas
**Python** (`backend/requirements.txt`): fastapi, uvicorn[standard], asyncpg, python-dotenv,
geopandas, shapely, pandas, psycopg2-binary, pydantic, playwright, SQLAlchemy, httpx, tenacity

**Node** (`frontend/package.json`): maplibre-gl@^4, react-map-gl@^8, framer-motion@^11,
tailwindcss@^3, vite@^8

## Reglas y Convenciones
- Utilizar funciones asíncronas (`async def`) en los endpoints de FastAPI para maximizar la concurrencia.
- Validar estrictamente todas las respuestas de la API utilizando esquemas de Pydantic.
- Los datos geoespaciales (comunas) deben ser serializados y expuestos exclusivamente en formato GeoJSON para su consumo en MapLibre.
- Resguardar la normativa de privacidad: los algoritmos de extracción de sentencias deben ignorar la identidad de los imputados y centrarse únicamente en la metadata del tribunal, el juez y el veredicto.

### Sobre la descarga masiva desde el CEAD

El portal de Estadísticas Delictuales de la Subsecretaría de Prevención del Delito (CEAD) no ofrece un único botón o una API abierta tradicional para descargar la totalidad de la base de datos nacional en un solo archivo CSV. La interfaz obliga a los usuarios a interactuar con un formulario dinámico filtrando por año, región, comuna y familia delictual para luego descargar el reporte.[1]

Para lograr la extracción masiva y automatizada que necesitas para el proyecto, deberás utilizar técnicas de *web scraping*. Aquí tienes las recomendaciones técnicas para programar este proceso en Python:

1. **Ingeniería Inversa de Peticiones:** En lugar de simular clics con un navegador virtual, abre las Herramientas para Desarrolladores de tu navegador web (pestaña "Red" o "Network") y realiza una consulta manual en el portal del CEAD filtrando por "Crímenes y simples delitos ley de drogas" a nivel comunal. Identifica la petición HTTP interna (generalmente un `POST` o `GET` a un endpoint oculto) que el sitio realiza para obtener los datos.
2. **Automatización con Requests:** Utiliza la librería `requests` de Python para replicar esa llamada de red. Deberás iterar programáticamente alterando el código de la comuna y el año en el *payload* de la petición.
3. **Procesamiento y Consolidación:** Captura las respuestas del servidor del CEAD, utiliza la librería `pandas` de Python para limpiar las tablas, normalizar los nombres de las comunas y concatenar todas las descargas en un único archivo CSV maestro que luego podrás inyectar en tu base de datos PostgreSQL.