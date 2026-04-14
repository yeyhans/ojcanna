# backend/api/schemas/contexto.py
"""Schemas Pydantic v2 para los endpoints de contexto demográfico (INE)."""
from pydantic import BaseModel


class PoblacionItem(BaseModel):
    cut: str
    nombre: str | None
    anio: int
    poblacion_total: int


class PoblacionListResponse(BaseModel):
    anio: int
    total_comunas: int
    items: list[PoblacionItem]


class PoblacionSerieItem(BaseModel):
    anio: int
    poblacion_total: int


class PoblacionSerieResponse(BaseModel):
    cut: str
    nombre: str | None
    anio_desde: int
    anio_hasta: int
    serie: list[PoblacionSerieItem]
