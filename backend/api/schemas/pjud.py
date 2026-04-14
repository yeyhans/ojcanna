# backend/api/schemas/pjud.py
"""
Schemas Pydantic v2 para endpoints PJud.

IMPORTANTE: Los endpoints públicos NUNCA exponen `texto_anonimizado` completo ni
la tabla `pjud_audit`. Sólo agregados (counts, breakdowns por tribunal/región).
"""
from __future__ import annotations

from typing import Optional

from pydantic import BaseModel


# ---------------------------------------------------------------------------
# Básicos Mes 1
# ---------------------------------------------------------------------------


class PjudFiltrosResponse(BaseModel):
    """Años y materias disponibles en pjud_sentencias."""

    anios: list[int]
    materias: list[str]
    fuentes: list[str]


class PjudStatsResponse(BaseModel):
    """Stats agregadas para un año (sin texto completo)."""

    anio: int
    total_sentencias: int
    total_con_texto: int          # texto_anonimizado != ""
    total_metadata_only: int      # texto_anonimizado == "" (MVP Mes 1)
    total_tribunales: int
    total_materias: int


class PjudResumenTribunal(BaseModel):
    tribunal_id: Optional[str] = None
    tribunal_nombre: Optional[str] = None
    total: int


class PjudResumenMateria(BaseModel):
    materia: Optional[str] = None
    total: int


class PjudResumenResponse(BaseModel):
    """Breakdown por tribunal y materia para un año."""

    anio: int
    total: int
    por_tribunal: list[PjudResumenTribunal]
    por_materia: list[PjudResumenMateria]


# ---------------------------------------------------------------------------
# Mes 2 — endpoints extendidos (requieren pjud_extracciones)
# ---------------------------------------------------------------------------


class PjudProporcionalidadPunto(BaseModel):
    """Un punto en el scatter gramaje vs pena (anónimo: sólo números)."""

    sentencia_id: str              # UUID como string (tracking, NO leak)
    gramaje_g: float
    pena_meses: int
    veredicto: Optional[str] = None
    tipo_delito: Optional[str] = None


class PjudProporcionalidadResponse(BaseModel):
    anio: int
    total_puntos: int
    puntos: list[PjudProporcionalidadPunto]


class PjudTribunalStats(BaseModel):
    tribunal_id: Optional[str] = None
    tribunal_nombre: Optional[str] = None
    total: int
    condenas: int
    absoluciones: int
    sobreseimientos: int
    salidas_alternativas: int
    otros: int


class PjudPorTribunalResponse(BaseModel):
    anio: int
    tribunales: list[PjudTribunalStats]


class PjudRegionStats(BaseModel):
    region_id: Optional[str] = None
    region_nombre: Optional[str] = None
    total: int
    condenas: int
    absoluciones: int
    sobreseimientos: int
    salidas_alternativas: int
    otros: int


class PjudPorRegionResponse(BaseModel):
    anio: int
    regiones: list[PjudRegionStats]


class PjudVeredictoItem(BaseModel):
    veredicto: Optional[str] = None
    total: int
    porcentaje: float


class PjudVeredictosResponse(BaseModel):
    """Distribución nacional de veredictos (último extractor_version por sentencia)."""

    anio: int
    total_con_veredicto: int
    distribucion: list[PjudVeredictoItem]
