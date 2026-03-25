# backend/api/routers/cead.py
import json
from datetime import datetime
from pathlib import Path

import asyncpg
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from starlette.responses import Response

from api.database import get_pool
from api.schemas.cead import (
    FeatureCollection,
    Feature,
    FeatureProperties,
    FiltrosResponse,
    SubgrupoItem,
)
from etl.cead.config import CODIGOS_JSON, TAXONOMY_2024, TAXONOMY_CUTOFF_YEAR, TAXONOMY_LEGACY

router = APIRouter(prefix="/api/v1", tags=["cead"])

# IDs de subgrupos válidos (cargados una vez al iniciar)
_CODIGOS: dict = json.loads(Path(CODIGOS_JSON).read_text(encoding="utf-8"))
SUBGRUPOS_VALIDOS: dict[str, str] = {
    s["id"]: s["nombre"] for s in _CODIGOS["subgrupos_drogas"]
}

# Cache de respuestas JSON serializadas, keyed por (anio, frozenset(subgrupo_ids))
_RESPONSE_CACHE: dict[tuple, bytes] = {}

# Query central: solo datos estadísticos — geometrías vienen del geom_cache
_MAPA_SQL = """
SELECT
    c.cut,
    c.nombre,
    COALESCE(SUM(h.tasa_100k),  0) AS tasa_agregada,
    COALESCE(SUM(h.frecuencia), 0) AS frecuencia_total
FROM comunas c
LEFT JOIN cead_hechos h
    ON  c.cut         = h.comuna_id
    AND h.anio        = $1
    AND h.subgrupo_id = ANY($2::text[])
    AND h.taxonomy_version = $3
GROUP BY c.cut, c.nombre
ORDER BY c.cut
"""

# Query para cargar geometrías al arrancar (precisión 4 decimales ~11m)
_GEOM_SQL = "SELECT cut, ST_AsGeoJSON(geom, 4)::text AS geom FROM comunas ORDER BY cut"


async def load_geom_cache(pool: asyncpg.Pool) -> dict[str, dict]:
    """Carga las 344 geometrías una sola vez al iniciar la app."""
    async with pool.acquire() as conn:
        rows = await conn.fetch(_GEOM_SQL)
    return {row["cut"]: json.loads(row["geom"]) for row in rows}


@router.get("/mapa/cead", response_model=FeatureCollection)
async def mapa_cead(
    request: Request,
    anio: int = Query(..., ge=2005, le=2030, description="Año a consultar"),
    subgrupos: str = Query(..., description="IDs de subgrupos separados por coma, ej: 40101,40102"),
    pool: asyncpg.Pool = Depends(get_pool),
) -> Response:
    subgrupo_ids = [s.strip() for s in subgrupos.split(",") if s.strip()]
    if not subgrupo_ids:
        raise HTTPException(status_code=422, detail="Se requiere al menos un subgrupo_id")

    invalidos = [s for s in subgrupo_ids if s not in SUBGRUPOS_VALIDOS]
    if invalidos:
        raise HTTPException(
            status_code=422,
            detail=f"subgrupo_id inválido: {invalidos}. Válidos: {list(SUBGRUPOS_VALIDOS)}",
        )

    cache_key = (anio, frozenset(subgrupo_ids))

    if cache_key in _RESPONSE_CACHE:
        return _build_response(_RESPONSE_CACHE[cache_key], anio)

    taxonomy = TAXONOMY_2024 if anio >= TAXONOMY_CUTOFF_YEAR else TAXONOMY_LEGACY
    geom_cache: dict[str, dict] = request.app.state.geom_cache

    async with pool.acquire() as conn:
        rows = await conn.fetch(_MAPA_SQL, anio, subgrupo_ids, taxonomy)

    features = [
        Feature(
            geometry=geom_cache.get(row["cut"], {}),
            properties=FeatureProperties(
                cut=row["cut"],
                nombre=row["nombre"],
                tasa_agregada=float(row["tasa_agregada"]),
                frecuencia_total=float(row["frecuencia_total"]),
            ),
        )
        for row in rows
    ]
    body = FeatureCollection(features=features).model_dump_json().encode()
    _RESPONSE_CACHE[cache_key] = body
    return _build_response(body, anio)


def _build_response(body: bytes, anio: int) -> Response:
    current_year = datetime.now().year
    max_age = 3600 if anio >= current_year else 86400
    return Response(
        content=body,
        media_type="application/json",
        headers={"Cache-Control": f"public, max-age={max_age}"},
    )


@router.get("/cead/filtros", response_model=FiltrosResponse)
async def cead_filtros(
    pool: asyncpg.Pool = Depends(get_pool),
) -> FiltrosResponse:
    """Devuelve los años disponibles y el catálogo de 7 subgrupos."""
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            "SELECT DISTINCT anio FROM cead_hechos ORDER BY anio"
        )

    anios = [r["anio"] for r in rows]
    subgrupos = [
        SubgrupoItem(id=sid, nombre=nombre)
        for sid, nombre in SUBGRUPOS_VALIDOS.items()
    ]
    return FiltrosResponse(anios=anios, subgrupos=subgrupos)
