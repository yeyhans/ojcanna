# backend/api/routers/fiscalia.py
"""
Endpoints del Ministerio Público (Fiscalía Nacional).

Datos oficiales: https://www.fiscaliadechile.cl/persecucion-penal/estadisticas
Categoría oficial: "DELITOS LEY DE DROGAS" (agrupa Ley 20.000).
Granularidad: regional (16 regiones de Chile).
"""
import asyncpg
from fastapi import APIRouter, Depends, HTTPException, Query

from api.database import get_pool
from api.schemas.fiscalia import (
    FiscaliaFiltrosResponse,
    FiscaliaRegion,
    FiscaliaRegionesResponse,
    FiscaliaResumenResponse,
    FiscaliaSeriePunto,
    FiscaliaSerieResponse,
)

router = APIRouter(prefix="/api/v1/fiscalia", tags=["fiscalia"])


_ANIOS_SQL = "SELECT DISTINCT anio FROM fiscalia_boletin ORDER BY anio"

_RESUMEN_SQL = """
SELECT tipo_metrica, SUM(n_causas)::int AS total
FROM fiscalia_boletin
WHERE anio = $1
GROUP BY tipo_metrica
"""

_SERIE_SQL = """
SELECT anio,
       SUM(CASE WHEN tipo_metrica = 'ingresos' THEN n_causas END)::int AS ingresos,
       SUM(CASE WHEN tipo_metrica = 'terminos' THEN n_causas END)::int AS terminos
FROM fiscalia_boletin
GROUP BY anio
ORDER BY anio
"""

_REGIONES_SQL = """
SELECT
    region_id,
    MAX(region_nombre) AS region_nombre,
    SUM(CASE WHEN tipo_metrica = 'ingresos' THEN n_causas END)::int AS ingresos,
    SUM(CASE WHEN tipo_metrica = 'terminos' THEN n_causas END)::int AS terminos
FROM fiscalia_boletin
WHERE anio = $1
GROUP BY region_id
ORDER BY ingresos DESC NULLS LAST
"""

# Cachés simples (datos históricos = estables hasta que el ETL los actualice)
_RESUMEN_CACHE: dict[int, FiscaliaResumenResponse] = {}
_SERIE_CACHE: FiscaliaSerieResponse | None = None
_REGIONES_CACHE: dict[int, FiscaliaRegionesResponse] = {}


@router.get("/filtros", response_model=FiscaliaFiltrosResponse)
async def fiscalia_filtros(
    pool: asyncpg.Pool = Depends(get_pool),
) -> FiscaliaFiltrosResponse:
    """Años disponibles en la tabla fiscalia_boletin."""
    async with pool.acquire() as conn:
        try:
            rows = await conn.fetch(_ANIOS_SQL)
        except asyncpg.exceptions.UndefinedTableError:
            return FiscaliaFiltrosResponse(anios=[])
    return FiscaliaFiltrosResponse(anios=[r["anio"] for r in rows])


@router.get("/resumen", response_model=FiscaliaResumenResponse)
async def fiscalia_resumen(
    anio: int = Query(..., ge=2020, le=2030),
    pool: asyncpg.Pool = Depends(get_pool),
) -> FiscaliaResumenResponse:
    """Totales nacionales (suma 16 regiones) de ingresos y términos."""
    if anio in _RESUMEN_CACHE:
        return _RESUMEN_CACHE[anio]

    async with pool.acquire() as conn:
        rows = await conn.fetch(_RESUMEN_SQL, anio)

    if not rows:
        raise HTTPException(
            404,
            f"Sin datos Fiscalía para {anio}. "
            "Corré el ETL: python -m etl.fiscalia.runner --db-url $DATABASE_URL",
        )

    data = {r["tipo_metrica"]: r["total"] for r in rows}
    ingresos = int(data.get("ingresos") or 0)
    terminos = int(data.get("terminos") or 0)

    result = FiscaliaResumenResponse(
        anio=anio,
        total_ingresos=ingresos,
        total_terminos=terminos,
        ratio_terminos=round(terminos / ingresos, 3) if ingresos > 0 else 0.0,
    )
    _RESUMEN_CACHE[anio] = result
    return result


@router.get("/serie", response_model=FiscaliaSerieResponse)
async def fiscalia_serie(
    pool: asyncpg.Pool = Depends(get_pool),
) -> FiscaliaSerieResponse:
    """Serie temporal nacional (ingresos vs términos por año)."""
    global _SERIE_CACHE
    if _SERIE_CACHE is not None:
        return _SERIE_CACHE

    async with pool.acquire() as conn:
        try:
            rows = await conn.fetch(_SERIE_SQL)
        except asyncpg.exceptions.UndefinedTableError:
            return FiscaliaSerieResponse(datos=[])

    _SERIE_CACHE = FiscaliaSerieResponse(datos=[
        FiscaliaSeriePunto(
            anio=r["anio"],
            ingresos=int(r["ingresos"] or 0),
            terminos=int(r["terminos"] or 0),
        )
        for r in rows
    ])
    return _SERIE_CACHE


@router.get("/regiones", response_model=FiscaliaRegionesResponse)
async def fiscalia_regiones(
    anio: int = Query(..., ge=2020, le=2030),
    pool: asyncpg.Pool = Depends(get_pool),
) -> FiscaliaRegionesResponse:
    """Breakdown por las 16 regiones (ingresos + términos)."""
    if anio in _REGIONES_CACHE:
        return _REGIONES_CACHE[anio]

    async with pool.acquire() as conn:
        rows = await conn.fetch(_REGIONES_SQL, anio)

    if not rows:
        raise HTTPException(404, f"Sin datos Fiscalía regionales para {anio}")

    result = FiscaliaRegionesResponse(
        anio=anio,
        regiones=[
            FiscaliaRegion(
                region_id=r["region_id"],
                region_nombre=r["region_nombre"],
                ingresos=int(r["ingresos"] or 0),
                terminos=int(r["terminos"] or 0),
            )
            for r in rows
        ],
    )
    _REGIONES_CACHE[anio] = result
    return result
