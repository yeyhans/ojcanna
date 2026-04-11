# backend/api/routers/dpp.py
"""
Endpoints para los datos de la Defensoría Penal Pública (DPP).

Granularidad regional: las comunas se colorean según la suma de causas
Ley 20.000 de la región a la que pertenecen.
"""
import json
from datetime import datetime

import asyncpg
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from starlette.responses import Response

from api.database import get_pool
from api.schemas.dpp import (
    DppFeature,
    DppFeatureCollection,
    DppFeatureProperties,
    DppFiltrosResponse,
    DppResumenResponse,
    DppSerieResponse,
    DppSeriePunto,
    DppRegionesResponse,
    DppRegion,
    DppStatsItem,
    DppStatsResponse,
    FormaTermino,
)

router = APIRouter(prefix="/api/v1", tags=["dpp"])

# Cache de FeatureCollection serializado (legacy /mapa/dpp), keyed por anio
_RESPONSE_CACHE: dict[int, bytes] = {}

# Cache de stats (sin geometrías), keyed por anio
_STATS_CACHE: dict[int, bytes] = {}

# Consulta principal: une comunas con dpp_causas a nivel regional
# Todas las comunas de la misma región reciben el mismo n_causas
_MAPA_SQL = """
SELECT
    c.cut,
    c.nombre,
    c.region_id,
    COALESCE(SUM(d.n_causas), 0)::float  AS n_causas,
    (MAX(d.n_causas) IS NOT NULL)        AS tiene_datos
FROM comunas c
LEFT JOIN dpp_causas d
    ON  c.region_id = d.region_id
    AND d.anio      = $1
GROUP BY c.cut, c.nombre, c.region_id
ORDER BY c.cut
"""

_ANIOS_SQL = "SELECT DISTINCT anio FROM dpp_causas ORDER BY anio"


# DEPRECATED: usar /api/v1/cead/geometrias + /api/v1/dpp/stats. Mantenido por compat.
@router.get("/mapa/dpp", response_model=DppFeatureCollection, deprecated=True)
async def mapa_dpp(
    request: Request,
    anio: int = Query(..., ge=2020, le=2030, description="Año a consultar"),
    pool: asyncpg.Pool = Depends(get_pool),
) -> Response:
    if anio in _RESPONSE_CACHE:
        return _build_response(_RESPONSE_CACHE[anio], anio)

    geom_cache: dict[str, dict] = request.app.state.geom_cache

    async with pool.acquire() as conn:
        rows = await conn.fetch(_MAPA_SQL, anio)

    if not rows:
        raise HTTPException(
            status_code=404,
            detail=f"No hay datos DPP para el año {anio}. "
                   "Ejecuta el ETL: python -m etl.dpp.runner --db-url $DATABASE_URL"
        )

    features = [
        DppFeature(
            geometry=geom_cache.get(row["cut"], {}),
            properties=DppFeatureProperties(
                cut=row["cut"],
                nombre=row["nombre"],
                region_id=row["region_id"],
                n_causas=float(row["n_causas"]),
                tiene_datos=bool(row["tiene_datos"]),
            ),
        )
        for row in rows
    ]
    body = DppFeatureCollection(features=features).model_dump_json().encode()
    _RESPONSE_CACHE[anio] = body
    return _build_response(body, anio)


def _build_response(body: bytes, anio: int) -> Response:
    max_age = 3600 if anio >= datetime.now().year else 86400
    return Response(
        content=body,
        media_type="application/json",
        headers={"Cache-Control": f"public, max-age={max_age}"},
    )


@router.get("/dpp/stats", response_model=DppStatsResponse)
async def dpp_stats(
    anio: int = Query(..., ge=2020, le=2030, description="Año a consultar"),
    pool: asyncpg.Pool = Depends(get_pool),
) -> Response:
    """Devuelve sólo `[{cut, region_id, n_causas, tiene_datos}]`. Sin geometrías:
    el frontend cruza con `/cead/geometrias` (compartido entre CEAD/DPP/PDI)."""
    if anio in _STATS_CACHE:
        return _build_response(_STATS_CACHE[anio], anio)

    async with pool.acquire() as conn:
        rows = await conn.fetch(_MAPA_SQL, anio)

    if not rows:
        raise HTTPException(
            status_code=404,
            detail=f"No hay datos DPP para el año {anio}. "
                   "Ejecuta el ETL: python -m etl.dpp.runner --db-url $DATABASE_URL",
        )

    stats = [
        DppStatsItem(
            cut=row["cut"],
            nombre=row["nombre"],
            region_id=row["region_id"],
            n_causas=float(row["n_causas"]),
            tiene_datos=bool(row["tiene_datos"]),
        )
        for row in rows
    ]
    body = DppStatsResponse(anio=anio, stats=stats).model_dump_json().encode()
    _STATS_CACHE[anio] = body
    return _build_response(body, anio)


@router.get("/dpp/filtros", response_model=DppFiltrosResponse)
async def dpp_filtros(
    pool: asyncpg.Pool = Depends(get_pool),
) -> DppFiltrosResponse:
    """Años disponibles en la tabla dpp_causas."""
    async with pool.acquire() as conn:
        rows = await conn.fetch(_ANIOS_SQL)
    return DppFiltrosResponse(anios=[r["anio"] for r in rows])


# ─── Analytics endpoints ────────────────────────────────────────────────────

_RESUMEN_SQL = """
SELECT tipo_termino, n_causas
FROM dpp_causas
WHERE anio = $1 AND region_id IS NULL
ORDER BY tipo_termino
"""

_SERIE_SQL = """
SELECT anio,
       MAX(CASE WHEN tipo_termino = 'Ingresos' THEN n_causas END)  AS ingresos,
       MAX(CASE WHEN tipo_termino = 'Términos'  THEN n_causas END)  AS terminos
FROM dpp_causas
WHERE region_id IS NULL
GROUP BY anio
ORDER BY anio
"""

_REGIONES_SQL = """
SELECT region_id, region_nombre, n_causas
FROM dpp_causas
WHERE anio = $1
  AND tipo_delito = 'Todos los delitos (peso regional)'
  AND tipo_termino = 'Ingresos'
  AND region_id IS NOT NULL
ORDER BY n_causas DESC
"""

# Simple in-memory caches para analytics (datos estáticos históricos)
_RESUMEN_CACHE: dict[int, DppResumenResponse] = {}
_SERIE_CACHE: DppSerieResponse | None = None
_REGIONES_CACHE: dict[int, DppRegionesResponse] = {}

FORMAS_TERMINO = {"Absolución", "Condena", "Derivación",
                  "Facultativos de Fiscalía", "Otras formas de término", "Salida Alternativa"}


@router.get("/dpp/resumen", response_model=DppResumenResponse)
async def dpp_resumen(
    anio: int = Query(..., ge=2020, le=2030),
    pool: asyncpg.Pool = Depends(get_pool),
) -> DppResumenResponse:
    """Resumen nacional DPP para un año: ingresos, términos y desglose por forma de término."""
    if anio in _RESUMEN_CACHE:
        return _RESUMEN_CACHE[anio]

    async with pool.acquire() as conn:
        rows = await conn.fetch(_RESUMEN_SQL, anio)

    if not rows:
        from fastapi import HTTPException
        raise HTTPException(404, f"Sin datos DPP para {anio}")

    data = {r["tipo_termino"]: r["n_causas"] for r in rows}
    ingresos = data.get("Ingresos", 0) or 0
    terminos = data.get("Términos", 0) or 0
    total_formas = sum(v for k, v in data.items() if k in FORMAS_TERMINO and v)

    formas = []
    for nombre in sorted(FORMAS_TERMINO):
        n = data.get(nombre, 0) or 0
        if n > 0:
            formas.append(FormaTermino(
                nombre=nombre,
                n_causas=n,
                porcentaje=round(n / total_formas * 100, 1) if total_formas > 0 else 0.0,
            ))
    formas.sort(key=lambda x: -x.n_causas)

    result = DppResumenResponse(
        anio=anio,
        total_ingresos=ingresos,
        total_terminos=terminos,
        ratio_terminos=round(terminos / ingresos, 3) if ingresos > 0 else 0.0,
        formas_termino=formas,
    )
    _RESUMEN_CACHE[anio] = result
    return result


@router.get("/dpp/serie", response_model=DppSerieResponse)
async def dpp_serie(pool: asyncpg.Pool = Depends(get_pool)) -> DppSerieResponse:
    """Serie temporal de ingresos y términos DPP (todos los años disponibles)."""
    global _SERIE_CACHE
    if _SERIE_CACHE is not None:
        return _SERIE_CACHE

    async with pool.acquire() as conn:
        rows = await conn.fetch(_SERIE_SQL)

    _SERIE_CACHE = DppSerieResponse(datos=[
        DppSeriePunto(
            anio=r["anio"],
            ingresos=r["ingresos"] or 0,
            terminos=r["terminos"] or 0,
        )
        for r in rows
    ])
    return _SERIE_CACHE


@router.get("/dpp/regiones", response_model=DppRegionesResponse)
async def dpp_regiones(
    anio: int = Query(..., ge=2020, le=2030),
    pool: asyncpg.Pool = Depends(get_pool),
) -> DppRegionesResponse:
    """Peso regional de imputados (todos los delitos) para el año dado."""
    if anio in _REGIONES_CACHE:
        return _REGIONES_CACHE[anio]

    async with pool.acquire() as conn:
        rows = await conn.fetch(_REGIONES_SQL, anio)

    result = DppRegionesResponse(
        anio=anio,
        regiones=[
            DppRegion(
                region_id=r["region_id"],
                region_nombre=r["region_nombre"],
                n_ingresos=r["n_causas"] or 0,
            )
            for r in rows
        ],
    )
    _REGIONES_CACHE[anio] = result
    return result
