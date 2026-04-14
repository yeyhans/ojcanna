# backend/api/routers/pjud.py
"""
Endpoints PJud — agregados estadísticos de sentencias Ley 20.000.

IMPORTANTE (privacidad by design):
  - NO se expone `texto_anonimizado` completo por este router (ni aunque exista).
  - NO se expone `pjud_audit` en NINGUNA circunstancia por este router.
  - Sólo counts y breakdowns — compatible con `dpp.py` / `pdi.py` / `fiscalia.py`.

Mes 2 extendido: proporcionalidad (gramaje vs pena), por tribunal, por región,
distribución de veredictos. Todos usan DISTINCT ON (sentencia_id) para tomar
la última versión del extractor por cada sentencia.
"""
from __future__ import annotations

import asyncpg
from fastapi import APIRouter, Depends, Query

from api.database import get_pool
from api.schemas.pjud import (
    PjudFiltrosResponse,
    PjudProporcionalidadPunto,
    PjudProporcionalidadResponse,
    PjudPorRegionResponse,
    PjudPorTribunalResponse,
    PjudRegionStats,
    PjudResumenMateria,
    PjudResumenResponse,
    PjudResumenTribunal,
    PjudStatsResponse,
    PjudTribunalStats,
    PjudVeredictoItem,
    PjudVeredictosResponse,
)

router = APIRouter(prefix="/api/v1/pjud", tags=["pjud"])


_FILTROS_ANIOS_SQL = "SELECT DISTINCT anio FROM pjud_sentencias ORDER BY anio"
_FILTROS_MATERIAS_SQL = """
SELECT DISTINCT materia
FROM pjud_sentencias
WHERE materia IS NOT NULL AND materia <> ''
ORDER BY materia
"""
_FILTROS_FUENTES_SQL = "SELECT DISTINCT fuente FROM pjud_sentencias ORDER BY fuente"

_STATS_SQL = """
SELECT
    COUNT(*)::int                                              AS total,
    COUNT(*) FILTER (WHERE texto_anonimizado <> '')::int       AS con_texto,
    COUNT(*) FILTER (WHERE texto_anonimizado = '')::int        AS metadata_only,
    COUNT(DISTINCT tribunal_id)::int                           AS tribunales,
    COUNT(DISTINCT materia)::int                               AS materias
FROM pjud_sentencias
WHERE anio = $1
"""

_RESUMEN_POR_TRIBUNAL_SQL = """
SELECT tribunal_id, MAX(tribunal_nombre) AS tribunal_nombre, COUNT(*)::int AS total
FROM pjud_sentencias
WHERE anio = $1
GROUP BY tribunal_id
ORDER BY total DESC NULLS LAST
LIMIT 50
"""

_RESUMEN_POR_MATERIA_SQL = """
SELECT materia, COUNT(*)::int AS total
FROM pjud_sentencias
WHERE anio = $1
GROUP BY materia
ORDER BY total DESC NULLS LAST
LIMIT 50
"""

_RESUMEN_TOTAL_SQL = """
SELECT COUNT(*)::int AS total FROM pjud_sentencias WHERE anio = $1
"""


# ---------------------------------------------------------------------------
# Mes 2 — extracciones: CTE con DISTINCT ON (sentencia_id) para última versión.
# ---------------------------------------------------------------------------
#
# El patrón se reutiliza en 4 queries: proporcionalidad, por_tribunal,
# por_region, veredictos. Cada sentencia puede tener múltiples corridas de
# extractores (rule-v1, llm-v1, etc.); tomamos siempre la última por
# extractor_version DESC.

_PROPORCIONALIDAD_SQL = """
WITH latest_ext AS (
    SELECT DISTINCT ON (sentencia_id)
        sentencia_id, extractor_version, gramaje_g, pena_meses, veredicto, tipo_delito
    FROM pjud_extracciones
    ORDER BY sentencia_id, extractor_version DESC
)
SELECT
    s.id::text                      AS sentencia_id,
    e.gramaje_g::float              AS gramaje_g,
    e.pena_meses                    AS pena_meses,
    e.veredicto                     AS veredicto,
    e.tipo_delito                   AS tipo_delito
FROM pjud_sentencias s
JOIN latest_ext e ON e.sentencia_id = s.id
WHERE s.anio = $1
  AND e.gramaje_g IS NOT NULL
  AND e.pena_meses IS NOT NULL
ORDER BY e.gramaje_g
LIMIT 5000
"""

_POR_TRIBUNAL_SQL = """
WITH latest_ext AS (
    SELECT DISTINCT ON (sentencia_id)
        sentencia_id, veredicto
    FROM pjud_extracciones
    ORDER BY sentencia_id, extractor_version DESC
)
SELECT
    s.tribunal_id,
    MAX(s.tribunal_nombre)                                        AS tribunal_nombre,
    COUNT(*)::int                                                 AS total,
    COUNT(*) FILTER (WHERE e.veredicto = 'condena')::int          AS condenas,
    COUNT(*) FILTER (WHERE e.veredicto = 'absolucion')::int       AS absoluciones,
    COUNT(*) FILTER (WHERE e.veredicto = 'sobreseimiento')::int   AS sobreseimientos,
    COUNT(*) FILTER (WHERE e.veredicto = 'salida_alternativa')::int AS salidas_alternativas,
    COUNT(*) FILTER (WHERE e.veredicto IS NULL OR e.veredicto NOT IN
                    ('condena','absolucion','sobreseimiento','salida_alternativa'))::int AS otros
FROM pjud_sentencias s
LEFT JOIN latest_ext e ON e.sentencia_id = s.id
WHERE s.anio = $1
GROUP BY s.tribunal_id
ORDER BY total DESC NULLS LAST
LIMIT 100
"""

_POR_REGION_SQL = """
WITH latest_ext AS (
    SELECT DISTINCT ON (sentencia_id)
        sentencia_id, veredicto
    FROM pjud_extracciones
    ORDER BY sentencia_id, extractor_version DESC
)
SELECT
    s.region_id,
    COUNT(*)::int                                                 AS total,
    COUNT(*) FILTER (WHERE e.veredicto = 'condena')::int          AS condenas,
    COUNT(*) FILTER (WHERE e.veredicto = 'absolucion')::int       AS absoluciones,
    COUNT(*) FILTER (WHERE e.veredicto = 'sobreseimiento')::int   AS sobreseimientos,
    COUNT(*) FILTER (WHERE e.veredicto = 'salida_alternativa')::int AS salidas_alternativas,
    COUNT(*) FILTER (WHERE e.veredicto IS NULL OR e.veredicto NOT IN
                    ('condena','absolucion','sobreseimiento','salida_alternativa'))::int AS otros
FROM pjud_sentencias s
LEFT JOIN latest_ext e ON e.sentencia_id = s.id
WHERE s.anio = $1
GROUP BY s.region_id
ORDER BY total DESC NULLS LAST
"""

_VEREDICTOS_SQL = """
WITH latest_ext AS (
    SELECT DISTINCT ON (e.sentencia_id)
        e.sentencia_id, e.veredicto, s.anio
    FROM pjud_extracciones e
    JOIN pjud_sentencias s ON s.id = e.sentencia_id
    WHERE s.anio = $1
    ORDER BY e.sentencia_id, e.extractor_version DESC
)
SELECT
    veredicto,
    COUNT(*)::int AS total
FROM latest_ext
GROUP BY veredicto
ORDER BY total DESC NULLS LAST
"""


# Nombres de regiones de Chile (ID INE → nombre)
_REGION_NOMBRES = {
    "15": "Arica y Parinacota",
    "1": "Tarapacá",
    "2": "Antofagasta",
    "3": "Atacama",
    "4": "Coquimbo",
    "5": "Valparaíso",
    "13": "Metropolitana",
    "6": "Libertador B. O'Higgins",
    "7": "Maule",
    "16": "Ñuble",
    "8": "Biobío",
    "9": "Araucanía",
    "14": "Los Ríos",
    "10": "Los Lagos",
    "11": "Aysén",
    "12": "Magallanes",
}


def _empty_filtros() -> PjudFiltrosResponse:
    return PjudFiltrosResponse(anios=[], materias=[], fuentes=[])


def _empty_stats(anio: int) -> PjudStatsResponse:
    return PjudStatsResponse(
        anio=anio,
        total_sentencias=0,
        total_con_texto=0,
        total_metadata_only=0,
        total_tribunales=0,
        total_materias=0,
    )


def _empty_resumen(anio: int) -> PjudResumenResponse:
    return PjudResumenResponse(
        anio=anio, total=0, por_tribunal=[], por_materia=[],
    )


@router.get("/filtros", response_model=PjudFiltrosResponse)
async def pjud_filtros(
    pool: asyncpg.Pool = Depends(get_pool),
) -> PjudFiltrosResponse:
    """Años, materias y fuentes disponibles en la tabla pjud_sentencias."""
    async with pool.acquire() as conn:
        try:
            anios_rows = await conn.fetch(_FILTROS_ANIOS_SQL)
            materias_rows = await conn.fetch(_FILTROS_MATERIAS_SQL)
            fuentes_rows = await conn.fetch(_FILTROS_FUENTES_SQL)
        except asyncpg.exceptions.UndefinedTableError:
            return _empty_filtros()

    return PjudFiltrosResponse(
        anios=[r["anio"] for r in anios_rows],
        materias=[r["materia"] for r in materias_rows],
        fuentes=[r["fuente"] for r in fuentes_rows],
    )


@router.get("/stats", response_model=PjudStatsResponse)
async def pjud_stats(
    anio: int = Query(..., ge=2024, le=2035),
    pool: asyncpg.Pool = Depends(get_pool),
) -> PjudStatsResponse:
    """Conteos globales de sentencias para un año."""
    async with pool.acquire() as conn:
        try:
            row = await conn.fetchrow(_STATS_SQL, anio)
        except asyncpg.exceptions.UndefinedTableError:
            return _empty_stats(anio)

    if not row or (row["total"] or 0) == 0:
        return _empty_stats(anio)

    return PjudStatsResponse(
        anio=anio,
        total_sentencias=int(row["total"] or 0),
        total_con_texto=int(row["con_texto"] or 0),
        total_metadata_only=int(row["metadata_only"] or 0),
        total_tribunales=int(row["tribunales"] or 0),
        total_materias=int(row["materias"] or 0),
    )


@router.get("/resumen", response_model=PjudResumenResponse)
async def pjud_resumen(
    anio: int = Query(..., ge=2024, le=2035),
    pool: asyncpg.Pool = Depends(get_pool),
) -> PjudResumenResponse:
    """Breakdown por tribunal y materia (top 50 cada uno)."""
    async with pool.acquire() as conn:
        try:
            total_row = await conn.fetchrow(_RESUMEN_TOTAL_SQL, anio)
            trib_rows = await conn.fetch(_RESUMEN_POR_TRIBUNAL_SQL, anio)
            mat_rows = await conn.fetch(_RESUMEN_POR_MATERIA_SQL, anio)
        except asyncpg.exceptions.UndefinedTableError:
            return _empty_resumen(anio)

    total = int(total_row["total"] or 0) if total_row else 0
    if total == 0:
        return _empty_resumen(anio)

    return PjudResumenResponse(
        anio=anio,
        total=total,
        por_tribunal=[
            PjudResumenTribunal(
                tribunal_id=r["tribunal_id"],
                tribunal_nombre=r["tribunal_nombre"],
                total=int(r["total"] or 0),
            )
            for r in trib_rows
        ],
        por_materia=[
            PjudResumenMateria(
                materia=r["materia"],
                total=int(r["total"] or 0),
            )
            for r in mat_rows
        ],
    )


# ---------------------------------------------------------------------------
# Mes 2 — endpoints extendidos
# ---------------------------------------------------------------------------


@router.get("/proporcionalidad", response_model=PjudProporcionalidadResponse)
async def pjud_proporcionalidad(
    anio: int = Query(..., ge=2024, le=2035),
    pool: asyncpg.Pool = Depends(get_pool),
) -> PjudProporcionalidadResponse:
    """
    Scatter: gramaje (g) vs pena (meses), una sentencia por punto.

    Usa DISTINCT ON (sentencia_id) extractor_version DESC para tomar la
    extracción más reciente. Filtra solo sentencias con AMBOS campos presentes.
    """
    async with pool.acquire() as conn:
        try:
            rows = await conn.fetch(_PROPORCIONALIDAD_SQL, anio)
        except asyncpg.exceptions.UndefinedTableError:
            return PjudProporcionalidadResponse(anio=anio, total_puntos=0, puntos=[])

    puntos = [
        PjudProporcionalidadPunto(
            sentencia_id=str(r["sentencia_id"]),
            gramaje_g=float(r["gramaje_g"]),
            pena_meses=int(r["pena_meses"]),
            veredicto=r["veredicto"],
            tipo_delito=r["tipo_delito"],
        )
        for r in rows
    ]
    return PjudProporcionalidadResponse(
        anio=anio, total_puntos=len(puntos), puntos=puntos,
    )


@router.get("/por-tribunal", response_model=PjudPorTribunalResponse)
async def pjud_por_tribunal(
    anio: int = Query(..., ge=2024, le=2035),
    pool: asyncpg.Pool = Depends(get_pool),
) -> PjudPorTribunalResponse:
    """GROUP BY tribunal_id: conteos totales + desglose de veredictos."""
    async with pool.acquire() as conn:
        try:
            rows = await conn.fetch(_POR_TRIBUNAL_SQL, anio)
        except asyncpg.exceptions.UndefinedTableError:
            return PjudPorTribunalResponse(anio=anio, tribunales=[])

    tribunales = [
        PjudTribunalStats(
            tribunal_id=r["tribunal_id"],
            tribunal_nombre=r["tribunal_nombre"],
            total=int(r["total"] or 0),
            condenas=int(r["condenas"] or 0),
            absoluciones=int(r["absoluciones"] or 0),
            sobreseimientos=int(r["sobreseimientos"] or 0),
            salidas_alternativas=int(r["salidas_alternativas"] or 0),
            otros=int(r["otros"] or 0),
        )
        for r in rows
    ]
    return PjudPorTribunalResponse(anio=anio, tribunales=tribunales)


@router.get("/por-region", response_model=PjudPorRegionResponse)
async def pjud_por_region(
    anio: int = Query(..., ge=2024, le=2035),
    pool: asyncpg.Pool = Depends(get_pool),
) -> PjudPorRegionResponse:
    """GROUP BY region_id: conteos totales + desglose de veredictos."""
    async with pool.acquire() as conn:
        try:
            rows = await conn.fetch(_POR_REGION_SQL, anio)
        except asyncpg.exceptions.UndefinedTableError:
            return PjudPorRegionResponse(anio=anio, regiones=[])

    regiones = [
        PjudRegionStats(
            region_id=r["region_id"],
            region_nombre=_REGION_NOMBRES.get(r["region_id"] or "", r["region_id"]),
            total=int(r["total"] or 0),
            condenas=int(r["condenas"] or 0),
            absoluciones=int(r["absoluciones"] or 0),
            sobreseimientos=int(r["sobreseimientos"] or 0),
            salidas_alternativas=int(r["salidas_alternativas"] or 0),
            otros=int(r["otros"] or 0),
        )
        for r in rows
    ]
    return PjudPorRegionResponse(anio=anio, regiones=regiones)


@router.get("/veredictos", response_model=PjudVeredictosResponse)
async def pjud_veredictos(
    anio: int = Query(..., ge=2024, le=2035),
    pool: asyncpg.Pool = Depends(get_pool),
) -> PjudVeredictosResponse:
    """Distribución nacional de veredictos (última versión del extractor por sentencia)."""
    async with pool.acquire() as conn:
        try:
            rows = await conn.fetch(_VEREDICTOS_SQL, anio)
        except asyncpg.exceptions.UndefinedTableError:
            return PjudVeredictosResponse(
                anio=anio, total_con_veredicto=0, distribucion=[],
            )

    total = sum(int(r["total"] or 0) for r in rows if r["veredicto"] is not None)
    distribucion = []
    for r in rows:
        tot = int(r["total"] or 0)
        porcentaje = (tot / total * 100.0) if total > 0 and r["veredicto"] else 0.0
        distribucion.append(
            PjudVeredictoItem(
                veredicto=r["veredicto"],
                total=tot,
                porcentaje=round(porcentaje, 2),
            )
        )
    return PjudVeredictosResponse(
        anio=anio, total_con_veredicto=total, distribucion=distribucion,
    )
