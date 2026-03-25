# backend/api/routers/cead.py
import json
from pathlib import Path

import asyncpg
from fastapi import APIRouter, Depends, HTTPException, Query

from api.database import get_pool
from api.schemas.cead import (
    Feature,
    FeatureCollection,
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

# Query central: LEFT JOIN comunas + cead_hechos
_MAPA_SQL = """
SELECT
    c.cut,
    c.nombre,
    ST_AsGeoJSON(c.geom, 6)::text        AS geometry_json,
    COALESCE(SUM(h.tasa_100k),  0)       AS tasa_agregada,
    COALESCE(SUM(h.frecuencia), 0)       AS frecuencia_total
FROM comunas c
LEFT JOIN cead_hechos h
    ON  c.cut          = h.comuna_id
    AND h.anio         = $1
    AND h.subgrupo_id  = ANY($2::text[])
    AND h.taxonomy_version = $3
GROUP BY c.cut, c.nombre, c.geom
ORDER BY c.cut
"""


@router.get("/mapa/cead", response_model=FeatureCollection)
async def mapa_cead(
    anio: int = Query(..., ge=2005, le=2030, description="Año a consultar"),
    subgrupos: str = Query(..., description="IDs de subgrupos separados por coma, ej: 40101,40102"),
    pool: asyncpg.Pool = Depends(get_pool),
) -> FeatureCollection:
    """Devuelve un GeoJSON FeatureCollection con las 344 comunas coloreadas
    según la suma de frecuencia/tasa para el año y subgrupos seleccionados."""

    subgrupo_ids = [s.strip() for s in subgrupos.split(",") if s.strip()]
    if not subgrupo_ids:
        raise HTTPException(status_code=422, detail="Se requiere al menos un subgrupo_id")

    invalidos = [s for s in subgrupo_ids if s not in SUBGRUPOS_VALIDOS]
    if invalidos:
        raise HTTPException(
            status_code=422,
            detail=f"subgrupo_id inválido: {invalidos}. Válidos: {list(SUBGRUPOS_VALIDOS)}",
        )

    taxonomy = TAXONOMY_2024 if anio >= TAXONOMY_CUTOFF_YEAR else TAXONOMY_LEGACY

    async with pool.acquire() as conn:
        rows = await conn.fetch(_MAPA_SQL, anio, subgrupo_ids, taxonomy)

    features = [
        Feature(
            geometry=json.loads(row["geometry_json"]),
            properties=FeatureProperties(
                cut=row["cut"],
                nombre=row["nombre"],
                tasa_agregada=float(row["tasa_agregada"]),
                frecuencia_total=float(row["frecuencia_total"]),
            ),
        )
        for row in rows
    ]
    return FeatureCollection(features=features)


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
