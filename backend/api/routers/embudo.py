# backend/api/routers/embudo.py
"""
Embudo del Punitivismo — cruce CEAD (policial) + PDI (investigativa) +
DPP (defensorial) + PJud (judicial Ley 20.000).

Granularidad real:
- CEAD: comunal (subgrupos drogas)
- PDI: regional (datosgob_seguridad)
- DPP: regional (dpp_causas)
- PJud: comunal/regional (pjud_sentencias) — Fase E, MVP metadata-only

Distribución a nivel comunal cuando la fuente es regional:
    n_comuna = n_region * (n_cead_comuna / n_cead_region)

Documentado al usuario via `es_aproximacion=True` y `nota_metodologica`.
"""
from __future__ import annotations

import asyncpg
from fastapi import APIRouter, Depends, HTTPException, Query

from api.database import get_pool
from api.schemas.embudo import (
    EmbudoComunaResponse,
    EmbudoRankingItem,
    EmbudoRankingResponse,
    EmbudoSankeyResponse,
    EtapaEmbudo,
    SankeyFlujo,
    SankeyNodo,
)

router = APIRouter(prefix="/api/v1/embudo", tags=["embudo"])


# ---------------------------------------------------------------------------
# SQL (todos retornan 0 si la tabla no tiene datos del año pedido)
# ---------------------------------------------------------------------------

# CEAD: subgrupos drogas (todos los relacionados con Ley 20.000).
# Subgrupo IDs según `etl/cead/codigos_cead.json` — usamos todos los del grupo
# "Ley de Drogas" filtrando por nombre que contenga "drog" o "estupefac".
_SQL_CEAD_COMUNAL = """
SELECT COALESCE(SUM(frecuencia)::int, 0) AS total
FROM cead_hechos
WHERE anio = $1
  AND comuna_id = $2
  AND (
    grupo_id = '401'                 -- Ley de Drogas (tráfico, microtráfico, producción, otras)
    OR subgrupo_id IN ('70201','70202')  -- Consumo en vía pública + Porte
  )
"""

_SQL_CEAD_REGIONAL = """
SELECT COALESCE(SUM(frecuencia)::int, 0) AS total
FROM cead_hechos h
JOIN comunas c ON c.cut = h.comuna_id
WHERE h.anio = $1
  AND c.region_id = $2
  AND (
    h.grupo_id = '401'
    OR h.subgrupo_id IN ('70201','70202')
  )
"""

_SQL_CEAD_NACIONAL = """
SELECT COALESCE(SUM(frecuencia)::int, 0) AS total
FROM cead_hechos
WHERE anio = $1
  AND (
    grupo_id = '401'
    OR subgrupo_id IN ('70201','70202')
  )
"""

# PDI: filtrar por categorías Ley 20.000 (datos.gob.cl)
_SQL_PDI_REGIONAL = """
SELECT COALESCE(SUM(frecuencia)::int, 0) AS total
FROM datosgob_seguridad
WHERE anio = $1
  AND region_id = $2
  AND (categoria ILIKE '%20.000%' OR categoria ILIKE '%droga%')
"""

_SQL_PDI_NACIONAL = """
SELECT COALESCE(SUM(frecuencia)::int, 0) AS total
FROM datosgob_seguridad
WHERE anio = $1
  AND (categoria ILIKE '%20.000%' OR categoria ILIKE '%droga%')
"""

# DPP: causas con tipo_delito de drogas
_SQL_DPP_REGIONAL = """
SELECT COALESCE(SUM(n_causas)::int, 0) AS total
FROM dpp_causas
WHERE anio = $1
  AND region_id = $2
  AND tipo_delito ILIKE '%droga%'
"""

_SQL_DPP_NACIONAL = """
SELECT COALESCE(SUM(n_causas)::int, 0) AS total
FROM dpp_causas
WHERE anio = $1
  AND tipo_delito ILIKE '%droga%'
"""

# PJud: sentencias Ley 20.000 — comunal y regional vía join con comunas
_SQL_PJUD_COMUNAL = """
SELECT COUNT(*)::int AS total
FROM pjud_sentencias
WHERE anio = $1 AND comuna_id = $2
"""

_SQL_PJUD_REGIONAL = """
SELECT COUNT(*)::int AS total
FROM pjud_sentencias
WHERE anio = $1 AND region_id = $2
"""

_SQL_PJUD_NACIONAL = """
SELECT COUNT(*)::int AS total
FROM pjud_sentencias
WHERE anio = $1
"""

_SQL_COMUNA = """
SELECT cut, nombre, region_id
FROM comunas WHERE cut = $1
"""

# Ranking: top comunas por ratio policial→judicial
_SQL_RANKING_BASE = """
WITH cead_comuna AS (
  SELECT comuna_id, SUM(frecuencia)::int AS n
  FROM cead_hechos
  WHERE anio = $1
    AND (
      grupo_id = '401'
      OR subgrupo_id IN ('70201','70202')
    )
  GROUP BY comuna_id
),
pjud_comuna AS (
  SELECT comuna_id, COUNT(*)::int AS n
  FROM pjud_sentencias
  WHERE anio = $1
  GROUP BY comuna_id
)
SELECT
  c.cut         AS comuna_id,
  c.nombre      AS comuna_nombre,
  c.region_id,
  cc.n          AS n_policial,
  COALESCE(pc.n, 0) AS n_judicial
FROM cead_comuna cc
JOIN comunas c ON c.cut = cc.comuna_id
LEFT JOIN pjud_comuna pc ON pc.comuna_id = c.cut
WHERE cc.n > 0
ORDER BY cc.n DESC
LIMIT 50
"""


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


async def _fetch_int(pool: asyncpg.Pool, sql: str, *args) -> int:
    """Ejecuta una query escalar; tolera tablas inexistentes devolviendo 0."""
    try:
        async with pool.acquire() as conn:
            row = await conn.fetchrow(sql, *args)
            return int(row["total"]) if row else 0
    except asyncpg.exceptions.UndefinedTableError:
        return 0


def _proporcional(n_region: int, n_cead_comuna: int, n_cead_region: int) -> int:
    """Distribución proporcional regional → comunal usando pesos CEAD."""
    if n_cead_region <= 0 or n_region <= 0:
        return 0
    return int(round(n_region * (n_cead_comuna / n_cead_region)))


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.get("", response_model=EmbudoComunaResponse)
async def embudo(
    anio: int = Query(..., ge=2005, le=2030),
    comuna_id: str | None = Query(default=None, max_length=6),
    pool: asyncpg.Pool = Depends(get_pool),
):
    """4 etapas del embudo. Si comuna_id es None, retorna agregado nacional."""

    if comuna_id:
        async with pool.acquire() as conn:
            row = await conn.fetchrow(_SQL_COMUNA, comuna_id)
        if not row:
            raise HTTPException(404, f"Comuna {comuna_id} no encontrada")
        comuna_nombre = row["nombre"]
        region_id = row["region_id"]
    else:
        comuna_nombre = None
        region_id = None

    # Etapa 1 - Policial (CEAD comunal o nacional)
    if comuna_id:
        n_policial = await _fetch_int(pool, _SQL_CEAD_COMUNAL, anio, comuna_id)
        nivel_pol = "comunal"
        aprox_pol = False
    else:
        n_policial = await _fetch_int(pool, _SQL_CEAD_NACIONAL, anio)
        nivel_pol = "nacional"
        aprox_pol = False

    # Pesos para distribución proporcional regional → comunal
    if comuna_id and region_id:
        n_cead_region = await _fetch_int(pool, _SQL_CEAD_REGIONAL, anio, region_id)
    else:
        n_cead_region = 0

    # Etapa 2 - Investigativa (PDI regional → comunal proporcional)
    if comuna_id and region_id:
        n_pdi_region = await _fetch_int(pool, _SQL_PDI_REGIONAL, anio, region_id)
        n_invest = _proporcional(n_pdi_region, n_policial, n_cead_region)
        nivel_inv = "regional"
        aprox_inv = True
        nota_inv = "Distribuido desde región vía pesos CEAD comunales."
    else:
        n_invest = await _fetch_int(pool, _SQL_PDI_NACIONAL, anio)
        nivel_inv = "nacional"
        aprox_inv = False
        nota_inv = None

    # Etapa 3 - Defensorial (DPP regional → comunal proporcional)
    if comuna_id and region_id:
        n_dpp_region = await _fetch_int(pool, _SQL_DPP_REGIONAL, anio, region_id)
        n_defens = _proporcional(n_dpp_region, n_policial, n_cead_region)
        nivel_def = "regional"
        aprox_def = True
        nota_def = "Distribuido desde región DPP vía pesos CEAD comunales."
    else:
        n_defens = await _fetch_int(pool, _SQL_DPP_NACIONAL, anio)
        nivel_def = "nacional"
        aprox_def = False
        nota_def = None

    # Etapa 4 - Judicial (PJud comunal directo si existe, sino regional proporcional)
    if comuna_id:
        n_judicial = await _fetch_int(pool, _SQL_PJUD_COMUNAL, anio, comuna_id)
        if n_judicial == 0 and region_id:
            n_pjud_region = await _fetch_int(pool, _SQL_PJUD_REGIONAL, anio, region_id)
            n_judicial = _proporcional(n_pjud_region, n_policial, n_cead_region)
            aprox_jud = True
            nota_jud = "PJud sin sentencias comunales — distribución proporcional desde región."
        else:
            aprox_jud = False
            nota_jud = "Sentencias PJud directas en la comuna."
        nivel_jud = "comunal"
    else:
        n_judicial = await _fetch_int(pool, _SQL_PJUD_NACIONAL, anio)
        nivel_jud = "nacional"
        aprox_jud = False
        nota_jud = None

    etapas = [
        EtapaEmbudo(
            etapa="policial",
            fuente="CEAD",
            label="Detenciones policiales",
            n_casos=n_policial,
            nivel_real=nivel_pol,
            es_aproximacion=aprox_pol,
        ),
        EtapaEmbudo(
            etapa="investigativa",
            fuente="PDI",
            label="Investigaciones PDI",
            n_casos=n_invest,
            nivel_real=nivel_inv,
            es_aproximacion=aprox_inv,
            nota_metodologica=nota_inv,
        ),
        EtapaEmbudo(
            etapa="defensorial",
            fuente="DPP",
            label="Causas Defensoría",
            n_casos=n_defens,
            nivel_real=nivel_def,
            es_aproximacion=aprox_def,
            nota_metodologica=nota_def,
        ),
        EtapaEmbudo(
            etapa="judicial",
            fuente="PJud",
            label="Sentencias PJud (Ley 20.000)",
            n_casos=n_judicial,
            nivel_real=nivel_jud,
            es_aproximacion=aprox_jud,
            nota_metodologica=nota_jud,
        ),
    ]

    tasa = (n_judicial / n_policial * 100) if n_policial > 0 else None

    return EmbudoComunaResponse(
        anio=anio,
        comuna_id=comuna_id,
        comuna_nombre=comuna_nombre,
        region_id=region_id,
        etapas=etapas,
        tasa_atricion_pct=tasa,
    )


@router.get("/ranking", response_model=EmbudoRankingResponse)
async def embudo_ranking(
    anio: int = Query(..., ge=2005, le=2030),
    pool: asyncpg.Pool = Depends(get_pool),
):
    """Top 50 comunas por volumen policial + ratio detención/sentencia."""

    try:
        async with pool.acquire() as conn:
            rows = await conn.fetch(_SQL_RANKING_BASE, anio)
    except asyncpg.exceptions.UndefinedTableError:
        rows = []

    items = [
        EmbudoRankingItem(
            comuna_id=r["comuna_id"],
            comuna_nombre=r["comuna_nombre"],
            region_id=r["region_id"],
            n_policial=r["n_policial"],
            n_judicial=r["n_judicial"],
            ratio_policial_judicial=(
                r["n_judicial"] / r["n_policial"] if r["n_policial"] > 0 else 0.0
            ),
        )
        for r in rows
    ]
    return EmbudoRankingResponse(anio=anio, items=items)


@router.get("/sankey", response_model=EmbudoSankeyResponse)
async def embudo_sankey(
    anio: int = Query(..., ge=2005, le=2030),
    comuna_id: str | None = Query(default=None, max_length=6),
    pool: asyncpg.Pool = Depends(get_pool),
):
    """
    Estructura para Diagrama de Sankey UNODC: 4 nodos secuenciales
    (policial → investigativa → defensorial → judicial) + 3 flujos.
    """
    base = await embudo(anio=anio, comuna_id=comuna_id, pool=pool)

    nodos = [
        SankeyNodo(
            id=e.etapa,
            label=e.label,
            fuente=e.fuente,
            etapa=e.etapa,
            n_casos=e.n_casos,
        )
        for e in base.etapas
    ]

    flujos: list[SankeyFlujo] = []
    for i in range(len(base.etapas) - 1):
        src = base.etapas[i]
        tgt = base.etapas[i + 1]
        flujos.append(
            SankeyFlujo(
                source=src.etapa,
                target=tgt.etapa,
                value=tgt.n_casos,
                perdida=tgt.n_casos < src.n_casos,
            )
        )

    nota = (
        "Diagrama de Sankey según estándares UNODC. Las etapas regionales (PDI, DPP) "
        "son distribuidas proporcionalmente entre comunas usando pesos relativos del "
        "CEAD. PJud requiere texto completo (pendiente SAIP) — actualmente metadata-only."
    )

    return EmbudoSankeyResponse(
        anio=anio,
        comuna_id=comuna_id,
        nodos=nodos,
        flujos=flujos,
        nota_metodologica=nota,
    )
