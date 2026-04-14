# backend/api/routers/contexto.py
"""
Endpoints de contexto demográfico — proyecciones de población comunal INE.

Rutas:
  GET /api/v1/contexto/poblacion?anio=
      → lista [{cut, nombre, anio, poblacion_total}] ordenado por cut.
  GET /api/v1/contexto/poblacion/{cut}?anio_desde=2005&anio_hasta=2025
      → serie temporal de una comuna.

Cache: public, max-age=3600 (datos estables, cambian solo al re-ejecutar el ETL).
"""

import asyncpg
from fastapi import APIRouter, Depends, HTTPException, Query
from starlette.responses import Response

from api.database import get_pool
from api.schemas.contexto import (
    PoblacionItem,
    PoblacionListResponse,
    PoblacionSerieItem,
    PoblacionSerieResponse,
)

router = APIRouter(prefix="/api/v1/contexto", tags=["contexto"])

_CACHE_HEADER = "public, max-age=3600"


@router.get(
    "/poblacion",
    response_model=PoblacionListResponse,
    summary="Población comunal INE para un año",
)
async def poblacion_por_anio(
    anio: int = Query(..., ge=2002, le=2035, description="Año de la proyección (2002-2035)"),
    pool: asyncpg.Pool = Depends(get_pool),
) -> Response:
    """
    Retorna la proyección de población de todas las comunas disponibles
    para el año solicitado, ordenadas por CUT.

    Fuente: INE — Estimaciones y Proyecciones 2002-2035, base Censo 2017.
    """
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT cut, nombre, anio, poblacion_total
            FROM ine_poblacion
            WHERE anio = $1
            ORDER BY cut
            """,
            anio,
        )

    if not rows:
        raise HTTPException(
            status_code=404,
            detail=(
                f"No hay datos de población para el año {anio}. "
                "Verificá que el ETL ine_proyecciones fue ejecutado."
            ),
        )

    items = [
        PoblacionItem(
            cut=row["cut"],
            nombre=row["nombre"],
            anio=row["anio"],
            poblacion_total=row["poblacion_total"],
        )
        for row in rows
    ]

    body = PoblacionListResponse(
        anio=anio,
        total_comunas=len(items),
        items=items,
    ).model_dump_json().encode()

    return Response(
        content=body,
        media_type="application/json",
        headers={"Cache-Control": _CACHE_HEADER},
    )


@router.get(
    "/poblacion/{cut}",
    response_model=PoblacionSerieResponse,
    summary="Serie temporal de población para una comuna",
)
async def poblacion_serie_comuna(
    cut: str,
    anio_desde: int = Query(2005, ge=2002, le=2035, description="Año inicial (inclusive)"),
    anio_hasta: int = Query(2025, ge=2002, le=2035, description="Año final (inclusive)"),
    pool: asyncpg.Pool = Depends(get_pool),
) -> Response:
    """
    Retorna la serie temporal de proyecciones de población para una comuna
    identificada por su CUT (sin zero-padding, ej: '13101' para Santiago).
    """
    if anio_desde > anio_hasta:
        raise HTTPException(
            status_code=422,
            detail=f"anio_desde ({anio_desde}) debe ser <= anio_hasta ({anio_hasta})",
        )

    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT cut, nombre, anio, poblacion_total
            FROM ine_poblacion
            WHERE cut = $1
              AND anio BETWEEN $2 AND $3
            ORDER BY anio
            """,
            cut,
            anio_desde,
            anio_hasta,
        )

    if not rows:
        raise HTTPException(
            status_code=404,
            detail=(
                f"No hay datos para CUT '{cut}' en el rango {anio_desde}-{anio_hasta}. "
                "Verificá el CUT (sin zero-padding) y que el ETL fue ejecutado."
            ),
        )

    nombre = rows[0]["nombre"]
    serie = [
        PoblacionSerieItem(anio=row["anio"], poblacion_total=row["poblacion_total"])
        for row in rows
    ]

    body = PoblacionSerieResponse(
        cut=cut,
        nombre=nombre,
        anio_desde=anio_desde,
        anio_hasta=anio_hasta,
        serie=serie,
    ).model_dump_json().encode()

    return Response(
        content=body,
        media_type="application/json",
        headers={"Cache-Control": _CACHE_HEADER},
    )
