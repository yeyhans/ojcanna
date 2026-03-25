# Sub-proyecto A: Mapa Coropleta CEAD
**Fecha:** 2026-03-25
**Estado:** Aprobado para implementación

---

## Contexto

El Observatorio Judicial Cannábico necesita visualizar geográficamente las tasas de persecución policial por ley de drogas en las 346 comunas de Chile. El ETL ya completó la extracción: `backend/data/checkpoint.jsonl` contiene ~92.659 filas con estadísticas del CEAD (años ~2005–2024, 7 subgrupos, tasa por 100k habitantes). Este sub-proyecto conecta esos datos con geometrías comunales y los expone en un mapa interactivo.

---

## Alcance

**Incluye:**
- Migración única: PostGIS en Neon + tabla `comunas` + carga de GeoJSON BCN + índices
- Carga de `checkpoint.jsonl` a `cead_hechos` vía `CeadConsolidator` existente
- API FastAPI: 2 endpoints
- Frontend React + MapLibre GL JS: mapa coropleta full-viewport con filtros

**Excluye:**
- Scraper PJud (Sub-proyecto B)
- Dashboards de jueces / funnel penal (Sub-proyecto C)
- Autenticación / despliegue en producción

---

## Catálogo de subgrupos (7 en total)

Fuente: `backend/etl/cead/codigos_cead.json` → clave `subgrupos_drogas`

| id | nombre |
|----|--------|
| `40101` | Tráfico de sustancias |
| `40102` | Microtráfico de sustancias |
| `40103` | Elaboración o producción de sustancias |
| `40104` | Otras infracciones a la ley de drogas |
| `70201` | Consumo de drogas en la vía pública |
| `70202` | Porte de drogas |
| `70204` | Consumo de alcohol en la vía pública |

---

## Base de Datos (Neon PostgreSQL + PostGIS)

### Tablas

```sql
CREATE EXTENSION IF NOT EXISTS postgis;

-- Geometrías comunales (carga única desde GeoJSON BCN)
CREATE TABLE comunas (
    cut         VARCHAR(6) PRIMARY KEY,  -- ID CEAD sin zero-padding (ver nota)
    nombre      VARCHAR(100) NOT NULL,
    region_id   VARCHAR(3),
    geom        GEOMETRY(MULTIPOLYGON, 4326) NOT NULL
);
CREATE INDEX ON comunas USING GIST(geom);

-- Índice compuesto en cead_hechos (cubre exactamente el LEFT JOIN)
CREATE INDEX idx_cead_filtros ON cead_hechos (comuna_id, anio, subgrupo_id);
```

> **Nota clave — CUT vs ID CEAD:** Los IDs en `cead_hechos.comuna_id` vienen del portal CEAD y **no tienen zero-padding** (ej. `"5602"` para Algarrobo). Los archivos BCN usan el CUT INE con 5 dígitos zero-padded (ej. `"05602"`). La columna `comunas.cut` almacena el ID CEAD (sin padding). `load_comunas.py` debe normalizar con `LPAD(cut_bcn, 6, '0')` → strip leading zeros → almacenar como CEAD ID. Alternativamente, usar `LPAD(h.comuna_id, 5, '0')` en el JOIN.

### Query central

```sql
SELECT
    c.cut,
    c.nombre,
    ST_AsGeoJSON(
        ST_SimplifyPreserveTopology(c.geom, 0.001), 6
    )::json                               AS geometry,
    COALESCE(SUM(h.tasa_100k),  0)        AS tasa_agregada,
    COALESCE(SUM(h.frecuencia), 0)        AS frecuencia_total
FROM comunas c
LEFT JOIN cead_hechos h
    ON  c.cut          = h.comuna_id
    AND h.anio         = $1
    AND h.subgrupo_id  = ANY($2)
    AND h.taxonomy_version = CASE
            WHEN $1 >= 2024 THEN 'Taxonomia_2024'
            ELSE 'DMCS_legacy'
        END
GROUP BY c.cut, c.nombre, c.geom
```

**Notas de implementación:**
- `ST_SimplifyPreserveTopology(geom, 0.001)`: tolerancia ~100m, reduce payload a ~800 KB–2 MB para 346 comunas (vs 5–15 MB sin simplificación). Aplicar al insertar geometrías en la migración para no recalcular en cada request.
- `ST_AsGeoJSON(geom, 6)`: 6 decimales (~11 cm precisión), reduce payload adicional ~40%.
- `LEFT JOIN`: comunas sin datos en el año/subgrupos seleccionados aparecen con `tasa_agregada = 0`.
- `taxonomy_version` filtrado por año para evitar doble-conteo si el ETL se re-ejecuta.
- **Semántica de `tasa_agregada`**: `SUM(tasa_100k)` es válido solo si los subgrupos son eventos mutuamente excluyentes (no hay individuo contado en dos subgrupos). Para selección multi-subgrupo, el frontend debe mostrar `frecuencia_total` como métrica primaria del coropleta y `tasa_agregada` como métrica secundaria en el tooltip, con nota aclaratoria.
- Deuda técnica opcional: migrar a `ST_AsMVT` si se agregan geometrías de manzanas/cuadrantes.

---

## Script de migración (`load_comunas.py`)

```
backend/etl/cead/
└── load_comunas.py   # carga única: BCN GeoJSON → PostGIS
```

**Fuente de geometrías:** BCN / IDE Chile (SUBDERE).
- Descargar desde `https://www.bcn.cl/siit/mapas_vectoriales` → "División Político Administrativa" → formato Shapefile o GeoJSON.
- **CRS**: el archivo BCN típicamente viene en EPSG:32719 (UTM 19S) o PSAD56. Reprojectar a EPSG:4326 (WGS84) con `geopandas`: `gdf.to_crs(epsg=4326)`.
- Documentar en el script la URL exacta descargada y la fecha (los límites comunales cambian con nuevas leyes).

**Pasos del script:**

```python
# load_comunas.py (pseudocódigo)
import geopandas as gpd
import psycopg2

gdf = gpd.read_file("comunas_bcn.shp")           # o .geojson
gdf = gdf.to_crs(epsg=4326)                       # reprojectar si necesario
gdf["geom_simplified"] = gdf.geometry.simplify(   # simplificar antes de insertar
    tolerance=0.001, preserve_topology=True
)
# Normalizar CUT: BCN usa 5 dígitos, CEAD usa 4 o 5 sin leading zero
gdf["cut_cead"] = gdf["CUT"].astype(str).str.lstrip("0")

# Insertar en comunas via psycopg2
# ... INSERT INTO comunas (cut, nombre, region_id, geom) VALUES ...
```

**Después de la migración:**
```bash
python backend/etl/cead/load_comunas.py
python -c "from etl.cead.consolidator import CeadConsolidator; CeadConsolidator(db_url=DATABASE_URL).run()"
# Crear índice
psql $DATABASE_URL -c "CREATE INDEX idx_cead_filtros ON cead_hechos (comuna_id, anio, subgrupo_id);"
```

---

## Backend FastAPI

### Estructura

```
backend/api/
├── main.py           # FastAPI app, GZipMiddleware, CORS, lifespan
├── database.py       # pool asyncpg, dependency inject
├── routers/
│   └── cead.py       # GET /mapa/cead y GET /cead/filtros
└── schemas/
    └── cead.py       # Pydantic MapaResponse, FiltrosResponse
```

### Middleware requerido

```python
from fastapi.middleware.gzip import GZipMiddleware
app.add_middleware(GZipMiddleware, minimum_size=1000)
```
Crítico para cumplir el target de carga < 2s: comprime la respuesta GeoJSON ~70%.

### Endpoints

#### `GET /api/v1/mapa/cead`

| Parámetro | Tipo | Requerido | Validación |
|-----------|------|-----------|------------|
| `anio` | `int` | Sí | `ge=2005, le=2030` |
| `subgrupos` | `str` (CSV) | Sí | lista no vacía de IDs válidos |

**Respuesta 200:**
```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": { "type": "MultiPolygon", "coordinates": [...] },
      "properties": {
        "cut": "13101",
        "nombre": "Santiago",
        "tasa_agregada": 70.5,
        "frecuencia_total": 484.0
      }
    }
  ]
}
```

#### `GET /api/v1/cead/filtros`

**Respuesta 200** (los 7 subgrupos completos):
```json
{
  "anios": [2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024],
  "subgrupos": [
    { "id": "40101", "nombre": "Tráfico de sustancias" },
    { "id": "40102", "nombre": "Microtráfico de sustancias" },
    { "id": "40103", "nombre": "Elaboración o producción de sustancias" },
    { "id": "40104", "nombre": "Otras infracciones a la ley de drogas" },
    { "id": "70201", "nombre": "Consumo de drogas en la vía pública" },
    { "id": "70202", "nombre": "Porte de drogas" },
    { "id": "70204", "nombre": "Consumo de alcohol en la vía pública" }
  ]
}
```

### Reglas de implementación

- Pool `asyncpg` creado en `lifespan` de FastAPI, no por request
- `DATABASE_URL` desde variable de entorno (`.env`), nunca hardcodeado. Neon requiere `?sslmode=require&channel_binding=require`
- CORS: `allow_origins=["*"]` en dev, restringir a dominio en prod
- Versiones recomendadas: `asyncpg>=0.29`, `fastapi>=0.115`

---

## Frontend React + TypeScript

### Stack y versiones

| Librería | Versión | Rol |
|----------|---------|-----|
| Vite | `^6` | Build tool |
| React | `^18` | UI |
| TypeScript | `^5` | Tipado |
| `maplibre-gl` | `^4` | Motor WebGL del mapa |
| `react-map-gl` | `^8` | Wrapper declarativo (v8 = compatible con MapLibre 3/4) |
| `shadcn/ui` | latest | Componentes UI (Radix + Tailwind) |
| `framer-motion` | `^11` | Animación bottom sheet |
| Tailwind CSS | `^3` | Estilos, glassmorfismo |
| Tremor | `^3` | KPI cards (preparado para Sub-proyecto C) |

> **Advertencia de compatibilidad:** `react-map-gl` v7 apunta a Mapbox GL JS. Usar **v8** con `maplibre-gl` v4. Verificar `peer dependencies` al instalar.

### Estructura

```
frontend/src/
├── components/
│   ├── MapaCEAD.tsx          # mapa full-viewport, capa fill coropleta
│   ├── FilterPanel.tsx       # bottom sheet (mobile) / sidebar (desktop)
│   ├── SubgrupoCheckbox.tsx  # checkbox individual con label
│   └── ComunaTooltip.tsx     # popup glassmorfismo al hover/tap
├── hooks/
│   └── useCeadMapa.ts        # fetch con AbortController, debounce 300ms
├── lib/
│   └── colorScale.ts         # escala cuantil 5 tramos → expresión MapLibre
└── App.tsx
```

### UX Mobile-First

- **Mapa**: `height: 100dvh`, full-width, siempre visible
- **Mobile**: bottom sheet con 3 snap points:
  - Colapsado: `64px` (handle visible + label de filtros activos)
  - Medio: `40dvh` (filtros visibles sin scroll)
  - Abierto: `85dvh` (scroll dentro del panel)
- **Desktop** (≥768px): panel lateral `bg-white/60 backdrop-blur-md border border-white/20 rounded-xl`
- **Tooltip** al hover/tap: nombre de comuna, `frecuencia_total` (primaria), `tasa_agregada` (secundaria con nota)
- **Loading state**: opacidad del mapa al 50% con spinner centrado durante el fetch
- **Error state**: toast en esquina superior con mensaje y botón "reintentar"

### Escala de color y expresión MapLibre

`colorScale.ts` calcula 5 breaks cuantiles sobre los valores de `frecuencia_total` de todas las features, luego construye una expresión `step` de MapLibre:

```typescript
// colorScale.ts
const PALETTE = ['#e0f2fe', '#7dd3fc', '#3b82f6', '#1d4ed8', '#1e3a8a']
const NO_DATA = '#f1f5f9'

export function buildStepExpression(features: GeoJSON.Feature[]): maplibregl.ExpressionSpecification {
  const values = features
    .map(f => f.properties?.frecuencia_total as number)
    .filter(v => v > 0)
    .sort((a, b) => a - b)

  const breaks = [0.2, 0.4, 0.6, 0.8].map(q =>
    values[Math.floor(q * values.length)]
  )

  return [
    'step', ['get', 'frecuencia_total'],
    NO_DATA,
    0.001, PALETTE[0],
    breaks[0], PALETTE[1],
    breaks[1], PALETTE[2],
    breaks[2], PALETTE[3],
    breaks[3], PALETTE[4],
  ]
}
```

La expresión se reconstruye en cada fetch dentro de `useCeadMapa` y se pasa como prop al layer de MapLibre.

### Flujo de datos

```
FilterPanel (año + subgrupos[])
    │ setState
    ▼
useCeadMapa
    ├─ debounce 300ms
    ├─ AbortController (cancela fetch previo en re-render)
    ├─ GET /api/v1/mapa/cead?anio=X&subgrupos=Y,Z
    └─ returns: { geojson, colorExpression, isLoading, error }
         │
         ▼
MapaCEAD
    ├─ Source: GeoJSON FeatureCollection
    └─ Layer fill:
         paint['fill-color'] = colorExpression (step sobre frecuencia_total)
         paint['fill-opacity'] = 0.75
         paint['fill-outline-color'] = '#94a3b8'
```

### Estética "Futuristic Light Mode"

- Fondo principal: `bg-slate-50` (`#f8fafc`), no blanco puro
- Glassmorfismo en paneles: `backdrop-blur-md bg-white/60 border border-white/20`
- Tipografía: Inter o Geist, números grandes de alto contraste para KPIs
- Micro-interacciones: Framer Motion en snap del bottom sheet; transición suave al cambiar capa de color (`transition: ['fill-color'] 300ms`)

---

## Deuda técnica (fuera de alcance)

- Cache en Redis/Upstash para el endpoint `/mapa/cead` (respuesta ~estática por combinación año+subgrupos)
- Migrar a `ST_AsMVT` si se necesitan geometrías de manzanas/cuadrantes
- Tests de integración para los endpoints FastAPI

---

## Criterios de éxito

- [ ] Mapa carga en < 2s en conexión 4G (GZipMiddleware + ST_Simplify)
- [ ] Cambiar filtros actualiza el mapa en < 500ms (índice compuesto DB)
- [ ] 346 comunas visibles sin pérdida de frames en dispositivo móvil mid-range
- [ ] JOIN comunas ↔ cead_hechos devuelve exactamente 346 features (validar en migración)
- [ ] 0 nombres de imputados en la base de datos (solo metadata estadística)
