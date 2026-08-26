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
    FiscaliaDemografiaItem,
    FiscaliaDemografiaResponse,
    FiscaliaFiltrosResponse,
    FiscaliaJuicioRegion,
    FiscaliaJuiciosResponse,
    FiscaliaRegion,
    FiscaliaRegionesResponse,
    FiscaliaResumenResponse,
    FiscaliaSeriePunto,
    FiscaliaSerieResponse,
    FiscaliaTerminosResponse,
    FiscaliaTipoTermino,
    FiscaliaTramitacionRegion,
    FiscaliaTramitacionResponse,
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


# ---------------------------------------------------------------------------
# Tabla fiscalia_detalle — hojas del boletín con dimensiones.
#
# Todas estas rutas devuelven una respuesta vacía (no 404) si la tabla aún no
# existe: el ETL de detalle es posterior al de boletín y un despliegue puede
# tener uno sin el otro.
# ---------------------------------------------------------------------------

_TERMINOS_SQL = """
SELECT dimension AS tipo,
       subdimension AS grupo,
       SUM(valor)::int AS n_causas
FROM fiscalia_detalle
WHERE metrica = 'tipo_termino' AND anio = $1
GROUP BY dimension, subdimension
ORDER BY n_causas DESC
"""

_JUICIOS_SQL = """
SELECT region_id, MAX(region_nombre) AS region_nombre, SUM(valor)::int AS juicios
FROM fiscalia_detalle
WHERE metrica = 'juicios_orales' AND anio = $1
GROUP BY region_id
ORDER BY juicios DESC
"""

_TRAMITACION_SQL = """
SELECT region_id,
       MAX(region_nombre) AS region_nombre,
       subdimension AS zonal,
       MAX(CASE WHEN dimension = 'salida_judicial' THEN valor END) AS judicial,
       MAX(CASE WHEN dimension = 'salida_no_judicial' THEN valor END) AS no_judicial
FROM fiscalia_detalle
WHERE metrica = 'dias_tramitacion' AND anio = $1
GROUP BY region_id, subdimension
ORDER BY region_id, subdimension NULLS FIRST
"""

_DEMOGRAFIA_SQL = """
SELECT dimension AS sexo, subdimension AS tramo, SUM(valor)::int AS n
FROM fiscalia_detalle
WHERE metrica = 'imputados_demografia' AND anio = $1
GROUP BY dimension, subdimension
ORDER BY n DESC
"""


@router.get("/terminos", response_model=FiscaliaTerminosResponse)
async def fiscalia_terminos(
    anio: int = Query(..., ge=2020, le=2030),
    pool: asyncpg.Pool = Depends(get_pool),
) -> FiscaliaTerminosResponse:
    """
    Cómo terminan las causas de Ley 20.000 según el Ministerio Público.

    Fuente: hoja TB6.2 del boletín anual. Es el equivalente persecutor de las
    formas de término que publica la Defensoría, y permite contrastar ambas.
    Sólo términos atómicos — los subtotales de la fuente se descartan en el ETL
    para que la suma no cuente doble.
    """
    async with pool.acquire() as conn:
        try:
            rows = await conn.fetch(_TERMINOS_SQL, anio)
        except asyncpg.exceptions.UndefinedTableError:
            return FiscaliaTerminosResponse(anio=anio, total_terminos=0, tipos=[])

    total = sum(int(r["n_causas"] or 0) for r in rows)
    return FiscaliaTerminosResponse(
        anio=anio,
        total_terminos=total,
        tipos=[
            FiscaliaTipoTermino(
                tipo=r["tipo"],
                grupo=r["grupo"] or "otros_terminos",
                n_causas=int(r["n_causas"] or 0),
                porcentaje=round(100 * int(r["n_causas"] or 0) / total, 1) if total else 0.0,
            )
            for r in rows
        ],
    )


@router.get("/juicios-orales", response_model=FiscaliaJuiciosResponse)
async def fiscalia_juicios_orales(
    anio: int = Query(..., ge=2020, le=2030),
    pool: asyncpg.Pool = Depends(get_pool),
) -> FiscaliaJuiciosResponse:
    """
    Juicios orales realizados por región en causas de Ley 20.000 (hoja TB9).

    Es la aproximación más cercana a la etapa judicial disponible mientras el
    dataset del Poder Judicial siga bloqueado.
    """
    async with pool.acquire() as conn:
        try:
            rows = await conn.fetch(_JUICIOS_SQL, anio)
        except asyncpg.exceptions.UndefinedTableError:
            return FiscaliaJuiciosResponse(anio=anio, total_nacional=0, regiones=[])

    return FiscaliaJuiciosResponse(
        anio=anio,
        total_nacional=sum(int(r["juicios"] or 0) for r in rows),
        regiones=[
            FiscaliaJuicioRegion(
                region_id=r["region_id"],
                region_nombre=r["region_nombre"] or r["region_id"],
                juicios_orales=int(r["juicios"] or 0),
            )
            for r in rows
        ],
    )


@router.get("/tramitacion", response_model=FiscaliaTramitacionResponse)
async def fiscalia_tramitacion(
    anio: int = Query(..., ge=2020, le=2030),
    pool: asyncpg.Pool = Depends(get_pool),
) -> FiscaliaTramitacionResponse:
    """
    Días promedio de tramitación por región y vía de salida (hoja TB7).

    La Metropolitana llega desagregada en sus cuatro fiscalías zonales y se
    devuelve así: son promedios, y agregarlos sin el volumen de causas de cada
    zonal produciría una cifra que no existe en la fuente.
    """
    async with pool.acquire() as conn:
        try:
            rows = await conn.fetch(_TRAMITACION_SQL, anio)
        except asyncpg.exceptions.UndefinedTableError:
            return FiscaliaTramitacionResponse(anio=anio, regiones=[])

    return FiscaliaTramitacionResponse(
        anio=anio,
        regiones=[
            FiscaliaTramitacionRegion(
                region_id=r["region_id"],
                region_nombre=r["region_nombre"] or r["region_id"],
                zonal=r["zonal"],
                dias_salida_judicial=float(r["judicial"]) if r["judicial"] is not None else None,
                dias_salida_no_judicial=(
                    float(r["no_judicial"]) if r["no_judicial"] is not None else None
                ),
            )
            for r in rows
        ],
    )


@router.get("/demografia", response_model=FiscaliaDemografiaResponse)
async def fiscalia_demografia(
    anio: int = Query(..., ge=2020, le=2030),
    pool: asyncpg.Pool = Depends(get_pool),
) -> FiscaliaDemografiaResponse:
    """
    Imputados conocidos por sexo y tramo etario (hoja TB5.2.1).

    Única fuente operativa del observatorio con demografía de imputados en
    causas de Ley 20.000. La fuente la publica sólo a nivel nacional y no se
    distribuye a regiones.
    """
    async with pool.acquire() as conn:
        try:
            rows = await conn.fetch(_DEMOGRAFIA_SQL, anio)
        except asyncpg.exceptions.UndefinedTableError:
            return FiscaliaDemografiaResponse(anio=anio, total_imputados=0, items=[])

    return FiscaliaDemografiaResponse(
        anio=anio,
        total_imputados=sum(int(r["n"] or 0) for r in rows),
        items=[
            FiscaliaDemografiaItem(
                sexo=r["sexo"],
                tramo_etario=r["tramo"] or "Sin información",
                n_imputados=int(r["n"] or 0),
            )
            for r in rows
        ],
    )
