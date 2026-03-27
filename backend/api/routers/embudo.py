# backend/api/routers/embudo.py
"""
Endpoint del Embudo del Punitivismo.
Agrega datos de CEAD + DPP + PDI para visualizar las etapas de persecución
por comuna y año: detenciones → causas en defensoría → investigaciones PDI.
"""
import asyncpg
from fastapi import APIRouter, Depends, HTTPException, Query
from api.database import get_pool
from api.schemas.embudo import (
    EmbudoComunaResponse,
    EmbudoRankingResponse,
    EtapaEmbudo,
    RankingItem,
)
from etl.cead.config import TAXONOMY_2024, TAXONOMY_CUTOFF_YEAR, TAXONOMY_LEGACY

router = APIRouter(prefix="/api/v1", tags=["embudo"])

# Subgrupos de tráfico/microtráfico (excluye consumo en vía pública y porte)
_SUBGRUPOS_TRAFICO = ["40101", "40102", "40103", "40104"]

_CEAD_SQL = """
SELECT COALESCE(SUM(h.frecuencia), 0)::float AS total
FROM cead_hechos h
WHERE h.comuna_id       = $1
  AND h.anio            = $2
  AND h.subgrupo_id     = ANY($3::text[])
  AND h.taxonomy_version = $4
"""

_DPP_REGION_SQL = """
-- Estima causas de drogas para la región de la comuna usando pesos proporcionales.
WITH peso_region AS (
    SELECT SUM(n_causas)::float AS peso
    FROM dpp_causas
    WHERE anio = $2
      AND region_id = (SELECT region_id FROM comunas WHERE cut = $1 LIMIT 1)
      AND tipo_delito = 'Todos los delitos (peso regional)'
),
peso_total AS (
    SELECT SUM(n_causas)::float AS total
    FROM dpp_causas
    WHERE anio = $2 AND tipo_delito = 'Todos los delitos (peso regional)'
),
nacional AS (
    SELECT COALESCE(n_causas, 0)::float AS causas_drogas
    FROM dpp_causas
    WHERE anio = $2 AND tipo_delito = 'Delitos Ley de Drogas'
      AND tipo_termino = 'Ingresos' AND region_id IS NULL
    LIMIT 1
)
SELECT
    COALESCE((pr.peso / NULLIF(pt.total, 0)) * n.causas_drogas, 0)::float AS total,
    pr.peso IS NOT NULL AS tiene_datos
FROM peso_region pr, peso_total pt, nacional n
"""

_PDI_REGION_SQL = """
SELECT COALESCE(SUM(d.frecuencia), 0)::float AS total,
       MAX(d.frecuencia) IS NOT NULL          AS tiene_datos
FROM datosgob_seguridad d
JOIN comunas c ON c.region_id = d.region_id
WHERE c.cut = $1
  AND d.anio = $2
"""

_COMUNA_INFO_SQL = """
SELECT cut, nombre, region_id FROM comunas WHERE cut = $1
"""

_RANKING_SQL = """
-- Los datos DPP de drogas son nacionales (region_id IS NULL).
-- Se distribuyen proporcionalmente por región usando los pesos de "Ingresos Terminos DR".
-- Luego, por comuna, proporcionalmente según las detenciones de la región.
-- Resultado: ratio = causas_region / det_region (constante por región).
WITH cead AS (
    SELECT h.comuna_id,
           COALESCE(SUM(h.frecuencia), 0)::float AS detenciones
    FROM cead_hechos h
    WHERE h.anio            = $1
      AND h.subgrupo_id     = ANY($2::text[])
      AND h.taxonomy_version = $3
    GROUP BY h.comuna_id
),
cead_region AS (
    -- Total detenciones por región (para distribución proporcional)
    SELECT c.region_id,
           SUM(ce.detenciones)::float AS det_region
    FROM cead ce
    JOIN comunas c ON c.cut = ce.comuna_id
    GROUP BY c.region_id
),
dpp_pesos AS (
    -- Peso relativo de cada región (total imputados / total nacional)
    SELECT d.region_id,
           SUM(d.n_causas)::float AS peso_region
    FROM dpp_causas d
    WHERE d.anio         = $1
      AND d.tipo_delito  = 'Todos los delitos (peso regional)'
      AND d.tipo_termino = 'Ingresos'
      AND d.region_id   IS NOT NULL
    GROUP BY d.region_id
),
dpp_total_nacional AS (
    SELECT COALESCE(d.n_causas, 0)::float AS causas_drogas
    FROM dpp_causas d
    WHERE d.anio         = $1
      AND d.tipo_delito  = 'Delitos Ley de Drogas'
      AND d.tipo_termino = 'Ingresos'
      AND d.region_id   IS NULL
    LIMIT 1
),
causas_por_region AS (
    -- Causas drogas estimadas por región = nacional × (peso_region / suma_pesos)
    SELECT dp.region_id,
           (dp.peso_region / NULLIF(SUM(dp.peso_region) OVER (), 0)) * tn.causas_drogas AS causas_region
    FROM dpp_pesos dp, dpp_total_nacional tn
),
causas_por_comuna AS (
    -- Por comuna: proporcional a las detenciones dentro de la región
    SELECT ce.comuna_id,
           ce.detenciones,
           CASE
               WHEN COALESCE(cr.det_region, 0) > 0
               THEN COALESCE(cpr.causas_region, 0) * (ce.detenciones / cr.det_region)
               ELSE 0
           END AS causas_estimadas
    FROM cead ce
    JOIN comunas c       ON c.cut        = ce.comuna_id
    LEFT JOIN cead_region cr  ON cr.region_id = c.region_id
    LEFT JOIN causas_por_region cpr ON cpr.region_id = c.region_id
)
SELECT
    co.cut         AS comuna_id,
    co.nombre,
    co.region_id,
    cc.detenciones,
    cc.causas_estimadas                                                   AS causas_defensor,
    CASE
        WHEN cc.detenciones > 0 THEN cc.causas_estimadas / cc.detenciones
        ELSE 0
    END AS ratio
FROM causas_por_comuna cc
JOIN comunas co ON co.cut = cc.comuna_id
WHERE cc.detenciones > 0
ORDER BY detenciones DESC
LIMIT 50
"""


@router.get("/embudo", response_model=EmbudoComunaResponse)
async def embudo_comuna(
    anio: int = Query(..., ge=2020, le=2030),
    comuna_id: str = Query(..., description="Código CUT de la comuna (sin zero-padding)"),
    pool: asyncpg.Pool = Depends(get_pool),
) -> EmbudoComunaResponse:
    """
    Retorna el embudo del punitivismo para una comuna y año específicos.
    Incluye datos de todas las fuentes disponibles.
    """
    taxonomy = TAXONOMY_2024 if anio >= TAXONOMY_CUTOFF_YEAR else TAXONOMY_LEGACY

    async with pool.acquire() as conn:
        info = await conn.fetchrow(_COMUNA_INFO_SQL, comuna_id)
        if not info:
            raise HTTPException(status_code=404, detail=f"Comuna {comuna_id} no encontrada.")

        cead_row = await conn.fetchrow(_CEAD_SQL, comuna_id, anio, _SUBGRUPOS_TRAFICO, taxonomy)
        dpp_row  = await conn.fetchrow(_DPP_REGION_SQL, comuna_id, anio)
        pdi_row  = await conn.fetchrow(_PDI_REGION_SQL, comuna_id, anio)

    etapas = [
        EtapaEmbudo(
            etapa="detenciones_policiales",
            fuente="CEAD",
            total=float(cead_row["total"] if cead_row else 0),
            disponible=True,
        ),
        EtapaEmbudo(
            etapa="causas_defensor",
            fuente="DPP",
            total=float(dpp_row["total"] if dpp_row else 0),
            disponible=bool(dpp_row["tiene_datos"] if dpp_row else False),
        ),
        EtapaEmbudo(
            etapa="investigaciones_pdi",
            fuente="PDI",
            total=float(pdi_row["total"] if pdi_row else 0),
            disponible=bool(pdi_row["tiene_datos"] if pdi_row else False),
        ),
    ]

    return EmbudoComunaResponse(
        anio=anio,
        comuna_id=info["cut"],
        comuna_nombre=info["nombre"],
        region_id=info["region_id"],
        etapas=etapas,
    )


@router.get("/embudo/ranking", response_model=EmbudoRankingResponse)
async def embudo_ranking(
    anio: int = Query(..., ge=2020, le=2030),
    pool: asyncpg.Pool = Depends(get_pool),
) -> EmbudoRankingResponse:
    """
    Top 50 comunas por ratio causas_DPP / detenciones_CEAD para un año dado.
    Comunas con ratio alto tienen relativamente más causas que detenciones (menor filtro).
    """
    taxonomy = TAXONOMY_2024 if anio >= TAXONOMY_CUTOFF_YEAR else TAXONOMY_LEGACY

    async with pool.acquire() as conn:
        rows = await conn.fetch(_RANKING_SQL, anio, _SUBGRUPOS_TRAFICO, taxonomy)

    items = [
        RankingItem(
            comuna_id=r["comuna_id"],
            nombre=r["nombre"],
            region_id=r["region_id"],
            detenciones=float(r["detenciones"]),
            causas_defensor=float(r["causas_defensor"]),
            ratio=float(r["ratio"]),
        )
        for r in rows
    ]

    return EmbudoRankingResponse(anio=anio, items=items)
