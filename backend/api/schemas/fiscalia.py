# backend/api/schemas/fiscalia.py
"""
Schemas Pydantic v2 para endpoints Fiscalía Nacional · Ministerio Público.

Granularidad regional (16 regiones — RM agregada desde 4 zonales del boletín).
"""
from pydantic import BaseModel


class FiscaliaFiltrosResponse(BaseModel):
    anios: list[int]


# --- Resumen nacional ---

class FiscaliaResumenResponse(BaseModel):
    anio: int
    total_ingresos: int
    total_terminos: int
    ratio_terminos: float   # terminos / ingresos


# --- Serie temporal ---

class FiscaliaSeriePunto(BaseModel):
    anio: int
    ingresos: int
    terminos: int


class FiscaliaSerieResponse(BaseModel):
    datos: list[FiscaliaSeriePunto]


# --- Breakdown regional ---

class FiscaliaRegion(BaseModel):
    region_id: str
    region_nombre: str
    ingresos: int
    terminos: int


class FiscaliaRegionesResponse(BaseModel):
    anio: int
    regiones: list[FiscaliaRegion]
