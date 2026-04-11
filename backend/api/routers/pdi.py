# backend/api/routers/pdi.py
"""
Endpoints para estadísticas PDI (datos.gob.cl).
Granularidad regional: comunas coloreadas según su región.
"""
from datetime import datetime

import asyncpg
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from starlette.responses import Response

from api.database import get_pool
from api.schemas.pdi import (
    PdiFeature,
    PdiFeatureCollection,
    PdiFeatureProperties,
    PdiFiltrosResponse,
    PdiResumenResponse,
    PdiCategoria,
    PdiRegionesResponse,
    PdiRegionItem,
    PdiSerieResponse,
    PdiSeriePunto,
    PdiStatsItem,
    PdiStatsResponse,
)

router = APIRouter(prefix="/api/v1", tags=["pdi"])

# Cache de FeatureCollection serializado (legacy /mapa/pdi)
_RESPONSE_CACHE: dict[tuple, bytes] = {}

# Cache de stats (sin geometrías)
_STATS_CACHE: dict[tuple, bytes] = {}

_MAPA_SQL = """
SELECT
    c.cut,
    c.nombre,
    c.region_id,
    COALESCE(SUM(d.frecuencia), 0)::float AS frecuencia,
    (MAX(d.frecuencia) IS NOT NULL)       AS tiene_datos
FROM comunas c
LEFT JOIN datosgob_seguridad d
    ON  c.region_id    = d.region_id
    AND d.anio         = $1
    AND d.categoria    ILIKE $2
GROUP BY c.cut, c.nombre, c.region_id
ORDER BY c.cut
"""

_ANIOS_SQL = "SELECT DISTINCT anio FROM datosgob_seguridad ORDER BY anio"
_CATS_SQL  = "SELECT DISTINCT categoria FROM datosgob_seguridad ORDER BY categoria"


# DEPRECATED: usar /api/v1/cead/geometrias + /api/v1/pdi/stats. Mantenido por compat.
@router.get("/mapa/pdi", response_model=PdiFeatureCollection, deprecated=True)
async def mapa_pdi(
    request: Request,
    anio: int = Query(..., ge=2020, le=2030),
    categoria: str = Query(..., description="Categoría de delito (ej: 'Tráfico de drogas')"),
    pool: asyncpg.Pool = Depends(get_pool),
) -> Response:
    cache_key = (anio, categoria.lower())
    if cache_key in _RESPONSE_CACHE:
        return _build_response(_RESPONSE_CACHE[cache_key], anio)

    geom_cache: dict[str, dict] = request.app.state.geom_cache

    async with pool.acquire() as conn:
        rows = await conn.fetch(_MAPA_SQL, anio, f"%{categoria}%")

    if not rows:
        raise HTTPException(
            status_code=404,
            detail=f"Sin datos PDI para año {anio} y categoría '{categoria}'. "
                   "Ejecuta: python -m etl.pdi.runner --db-url $DATABASE_URL"
        )

    features = [
        PdiFeature(
            geometry=geom_cache.get(row["cut"], {}),
            properties=PdiFeatureProperties(
                cut=row["cut"],
                nombre=row["nombre"],
                region_id=row["region_id"],
                frecuencia=float(row["frecuencia"]),
                tiene_datos=bool(row["tiene_datos"]),
            ),
        )
        for row in rows
    ]
    body = PdiFeatureCollection(features=features).model_dump_json().encode()
    _RESPONSE_CACHE[cache_key] = body
    return _build_response(body, anio)


def _build_response(body: bytes, anio: int) -> Response:
    max_age = 3600 if anio >= datetime.now().year else 86400
    return Response(
        content=body,
        media_type="application/json",
        headers={"Cache-Control": f"public, max-age={max_age}"},
    )


@router.get("/pdi/stats", response_model=PdiStatsResponse)
async def pdi_stats(
    anio: int = Query(..., ge=2020, le=2030),
    categoria: str = Query(..., description="Categoría de delito (ej: 'Tráfico de drogas')"),
    pool: asyncpg.Pool = Depends(get_pool),
) -> Response:
    """Devuelve sólo `[{cut, region_id, frecuencia, tiene_datos}]`. Sin geometrías:
    el frontend cruza con `/cead/geometrias` (compartido entre CEAD/DPP/PDI)."""
    cache_key = (anio, categoria.lower())
    if cache_key in _STATS_CACHE:
        return _build_response(_STATS_CACHE[cache_key], anio)

    async with pool.acquire() as conn:
        rows = await conn.fetch(_MAPA_SQL, anio, f"%{categoria}%")

    if not rows:
        raise HTTPException(
            status_code=404,
            detail=f"Sin datos PDI para año {anio} y categoría '{categoria}'. "
                   "Ejecuta: python -m etl.pdi.runner --db-url $DATABASE_URL",
        )

    stats = [
        PdiStatsItem(
            cut=row["cut"],
            nombre=row["nombre"],
            region_id=row["region_id"],
            frecuencia=float(row["frecuencia"]),
            tiene_datos=bool(row["tiene_datos"]),
        )
        for row in rows
    ]
    body = PdiStatsResponse(
        anio=anio, categoria=categoria, stats=stats
    ).model_dump_json().encode()
    _STATS_CACHE[cache_key] = body
    return _build_response(body, anio)


@router.get("/pdi/filtros", response_model=PdiFiltrosResponse)
async def pdi_filtros(pool: asyncpg.Pool = Depends(get_pool)) -> PdiFiltrosResponse:
    async with pool.acquire() as conn:
        anio_rows = await conn.fetch(_ANIOS_SQL)
        cat_rows  = await conn.fetch(_CATS_SQL)
    return PdiFiltrosResponse(
        anios=[r["anio"] for r in anio_rows],
        categorias=[r["categoria"] for r in cat_rows],
    )


# ─── Analytics endpoints ────────────────────────────────────────────────────

_RESUMEN_SQL = """
SELECT categoria, subcategoria, SUM(frecuencia)::float AS total
FROM datosgob_seguridad
WHERE anio = $1
GROUP BY categoria, subcategoria
ORDER BY total DESC
"""

_REGIONES_SQL = """
SELECT d.region_id,
       COALESCE(
           (SELECT r.region_nombre FROM dpp_causas r WHERE r.region_id = d.region_id AND r.region_nombre IS NOT NULL LIMIT 1),
           d.region_id
       ) AS region_nombre,
       d.frecuencia::float AS frecuencia
FROM datosgob_seguridad d
WHERE d.anio = $1
  AND d.categoria ILIKE $2
  AND d.subcategoria ILIKE $3
ORDER BY d.frecuencia DESC
"""

_SERIE_SQL = """
SELECT anio, categoria, subcategoria, SUM(frecuencia)::float AS total
FROM datosgob_seguridad
GROUP BY anio, categoria, subcategoria
ORDER BY anio, total DESC
"""

# Region names from comunas table as fallback
_REGION_NAMES_SQL = "SELECT DISTINCT region_id, nombre FROM comunas ORDER BY region_id"

_RESUMEN_CACHE: dict[int, PdiResumenResponse] = {}
_REGIONES_CACHE: dict[tuple, PdiRegionesResponse] = {}
_SERIE_PDI_CACHE: PdiSerieResponse | None = None


@router.get("/pdi/resumen", response_model=PdiResumenResponse)
async def pdi_resumen(
    anio: int = Query(..., ge=2020, le=2030),
    pool: asyncpg.Pool = Depends(get_pool),
) -> PdiResumenResponse:
    """Totales nacionales PDI por categoría para un año."""
    if anio in _RESUMEN_CACHE:
        return _RESUMEN_CACHE[anio]

    async with pool.acquire() as conn:
        rows = await conn.fetch(_RESUMEN_SQL, anio)

    if not rows:
        from fastapi import HTTPException
        raise HTTPException(404, f"Sin datos PDI para {anio}")

    result = PdiResumenResponse(
        anio=anio,
        categorias=[
            PdiCategoria(
                categoria=r["categoria"],
                subcategoria=r["subcategoria"],
                total_nacional=r["total"],
            )
            for r in rows
        ],
    )
    _RESUMEN_CACHE[anio] = result
    return result


@router.get("/pdi/regiones", response_model=PdiRegionesResponse)
async def pdi_regiones(
    anio: int = Query(..., ge=2020, le=2030),
    categoria: str = Query(...),
    subcategoria: str = Query("delitos"),
    pool: asyncpg.Pool = Depends(get_pool),
) -> PdiRegionesResponse:
    """Distribución regional PDI para una categoría y año."""
    cache_key = (anio, categoria.lower(), subcategoria.lower())
    if cache_key in _REGIONES_CACHE:
        return _REGIONES_CACHE[cache_key]

    async with pool.acquire() as conn:
        rows = await conn.fetch(_REGIONES_SQL, anio, f"%{categoria}%", f"%{subcategoria}%")

    result = PdiRegionesResponse(
        anio=anio,
        categoria=categoria,
        subcategoria=subcategoria,
        regiones=[
            PdiRegionItem(
                region_id=r["region_id"],
                region_nombre=r["region_nombre"],
                frecuencia=r["frecuencia"],
            )
            for r in rows
        ],
    )
    _REGIONES_CACHE[cache_key] = result
    return result


@router.get("/pdi/serie", response_model=PdiSerieResponse)
async def pdi_serie(pool: asyncpg.Pool = Depends(get_pool)) -> PdiSerieResponse:
    """Serie temporal PDI (todos los años y categorías disponibles)."""
    global _SERIE_PDI_CACHE
    if _SERIE_PDI_CACHE is not None:
        return _SERIE_PDI_CACHE

    async with pool.acquire() as conn:
        rows = await conn.fetch(_SERIE_SQL)

    _SERIE_PDI_CACHE = PdiSerieResponse(datos=[
        PdiSeriePunto(
            anio=r["anio"],
            categoria=r["categoria"],
            subcategoria=r["subcategoria"],
            total=r["total"],
        )
        for r in rows
    ])
    return _SERIE_PDI_CACHE
