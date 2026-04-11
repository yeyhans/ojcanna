# backend/api/routers/cead.py
import hashlib
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
    StatsItem,
    StatsResponse,
    SubgrupoItem,
)
from etl.cead.config import CODIGOS_JSON, TAXONOMY_2024, TAXONOMY_CUTOFF_YEAR, TAXONOMY_LEGACY

router = APIRouter(prefix="/api/v1", tags=["cead"])

# IDs de subgrupos válidos (cargados una vez al iniciar)
_CODIGOS: dict = json.loads(Path(CODIGOS_JSON).read_text(encoding="utf-8"))
SUBGRUPOS_VALIDOS: dict[str, str] = {
    s["id"]: s["nombre"] for s in _CODIGOS["subgrupos_drogas"]
}

# Cache de FeatureCollection serializado (legacy /mapa/cead), keyed por (anio, frozenset(subgrupo_ids))
_RESPONSE_CACHE: dict[tuple, bytes] = {}

# Cache de stats (solo datos numéricos, sin geometrías), keyed por (anio, frozenset(subgrupo_ids))
_STATS_CACHE: dict[tuple, bytes] = {}

# Cache del body serializado de geometrías (FeatureCollection sin properties),
# inmutable durante toda la vida del proceso. Se calcula la primera vez que
# alguien pide /cead/geometrias o desde prewarm_cache.
_GEOM_BODY_CACHE: bytes | None = None

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


def build_geom_body(geom_cache: dict[str, dict]) -> bytes:
    """Serializa las geometrías como FeatureCollection inmutable y devuelve los bytes.

    Sólo `cut` va en `properties` — el merge con stats se hace client-side.
    El cuerpo resultante es estático: se cachea para siempre en `_GEOM_BODY_CACHE`.
    """
    global _GEOM_BODY_CACHE
    if _GEOM_BODY_CACHE is not None:
        return _GEOM_BODY_CACHE
    features = [
        {
            "type": "Feature",
            "geometry": geom,
            "properties": {"cut": cut},
        }
        for cut, geom in geom_cache.items()
    ]
    body = json.dumps({"type": "FeatureCollection", "features": features}).encode()
    _GEOM_BODY_CACHE = body
    return body


async def prewarm_cache(pool: asyncpg.Pool, geom_cache: dict[str, dict]) -> None:
    """Pre-calienta los caches de stats y geometrías para el año más reciente.

    Así el primer usuario real recibe bytes ya serializados desde memoria,
    sin esperar la query a Neon + serialización Pydantic.
    """
    try:
        # 1. Pre-calentar el body de geometrías (estático para toda la sesión).
        geom_body = build_geom_body(geom_cache)
        print(f"[prewarm] geometrías serializadas: {len(geom_body):,} bytes")

        # 2. Pre-calentar stats del último año + todos los subgrupos.
        async with pool.acquire() as conn:
            row = await conn.fetchrow("SELECT MAX(anio) AS anio FROM cead_hechos")
        if row is None or row["anio"] is None:
            return
        anio: int = row["anio"]
        subgrupo_ids = list(SUBGRUPOS_VALIDOS.keys())
        cache_key = (anio, frozenset(subgrupo_ids))
        if cache_key in _STATS_CACHE:
            print(f"[prewarm] Stats ya en caché: año {anio}. Nada que hacer.")
            return
        taxonomy = TAXONOMY_2024 if anio >= TAXONOMY_CUTOFF_YEAR else TAXONOMY_LEGACY
        async with pool.acquire() as conn:
            rows = await conn.fetch(_MAPA_SQL, anio, subgrupo_ids, taxonomy)
        stats = [
            StatsItem(
                cut=row["cut"],
                nombre=row["nombre"],
                tasa_agregada=float(row["tasa_agregada"]),
                frecuencia_total=float(row["frecuencia_total"]),
            )
            for row in rows
        ]
        body = StatsResponse(
            anio=anio, subgrupos=subgrupo_ids, stats=stats
        ).model_dump_json().encode()
        _STATS_CACHE[cache_key] = body
        print(
            f"[prewarm] Stats caché calentado: año {anio}, "
            f"{len(subgrupo_ids)} subgrupos, {len(body):,} bytes"
        )
    except Exception as exc:  # noqa: BLE001
        print(f"[prewarm] Error (no crítico): {exc}")


# DEPRECATED: usar /api/v1/cead/geometrias + /api/v1/cead/stats. Mantenido por
# compatibilidad — el frontend nuevo no debería llamar este endpoint.
@router.get("/mapa/cead", response_model=FeatureCollection, deprecated=True)
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
        return _build_response(_RESPONSE_CACHE[cache_key], anio, request)

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
    return _build_response(body, anio, request)


def _build_response(body: bytes, anio: int, request: Request) -> Response:
    current_year = datetime.now().year
    max_age = 3600 if anio >= current_year else 86400
    etag = f'"{hashlib.md5(body, usedforsecurity=False).hexdigest()}"'

    # Si el cliente ya tiene esta versión → 304 sin body (0 bytes transferidos)
    if request.headers.get("If-None-Match") == etag:
        return Response(
            status_code=304,
            headers={"ETag": etag, "Cache-Control": f"public, max-age={max_age}"},
        )

    return Response(
        content=body,
        media_type="application/json",
        headers={
            "Cache-Control": f"public, max-age={max_age}",
            "ETag": etag,
        },
    )


@router.get("/cead/geometrias", response_model=FeatureCollection)
async def cead_geometrias(request: Request) -> Response:
    """Devuelve las 344 geometrías como FeatureCollection con `properties.cut` únicamente.

    Es estático: cambia sólo cuando se actualiza la tabla `comunas` y se reinicia
    el proceso. El frontend lo descarga una vez por sesión y lo cruza con
    `/cead/stats` (o sus equivalentes DPP/PDI) en el cliente.
    """
    geom_cache: dict[str, dict] = request.app.state.geom_cache
    body = build_geom_body(geom_cache)
    etag = f'"{hashlib.md5(body, usedforsecurity=False).hexdigest()}"'
    if request.headers.get("If-None-Match") == etag:
        return Response(
            status_code=304,
            headers={
                "ETag": etag,
                "Cache-Control": "public, max-age=31536000, immutable",
            },
        )
    return Response(
        content=body,
        media_type="application/json",
        headers={
            "Cache-Control": "public, max-age=31536000, immutable",
            "ETag": etag,
        },
    )


@router.get("/cead/stats", response_model=StatsResponse)
async def cead_stats(
    request: Request,
    anio: int = Query(..., ge=2005, le=2030, description="Año a consultar"),
    subgrupos: str = Query(
        ..., description="IDs de subgrupos separados por coma, ej: 40101,40102"
    ),
    pool: asyncpg.Pool = Depends(get_pool),
) -> Response:
    """Devuelve sólo `[{cut, nombre, tasa_agregada, frecuencia_total}]` para la
    combinación de año y subgrupos. Sin geometrías → payload ~10–20 KB en vez de
    ~500 KB–1 MB del legacy `/mapa/cead`."""
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
    if cache_key in _STATS_CACHE:
        return _build_response(_STATS_CACHE[cache_key], anio, request)

    taxonomy = TAXONOMY_2024 if anio >= TAXONOMY_CUTOFF_YEAR else TAXONOMY_LEGACY
    async with pool.acquire() as conn:
        rows = await conn.fetch(_MAPA_SQL, anio, subgrupo_ids, taxonomy)

    stats = [
        StatsItem(
            cut=row["cut"],
            nombre=row["nombre"],
            tasa_agregada=float(row["tasa_agregada"]),
            frecuencia_total=float(row["frecuencia_total"]),
        )
        for row in rows
    ]
    body = StatsResponse(
        anio=anio, subgrupos=subgrupo_ids, stats=stats
    ).model_dump_json().encode()
    _STATS_CACHE[cache_key] = body
    return _build_response(body, anio, request)


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
