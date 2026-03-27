# backend/api/schemas/dpp.py
"""
Schemas Pydantic para los endpoints de la DPP.
"""
from typing import Any, Literal

from pydantic import BaseModel


class DppFiltrosResponse(BaseModel):
    anios: list[int]


# --- Mapa (GeoJSON) ---

class DppFeatureProperties(BaseModel):
    cut: str
    nombre: str
    region_id: str
    n_causas: float
    tiene_datos: bool


class DppFeature(BaseModel):
    type: Literal["Feature"] = "Feature"
    geometry: dict[str, Any]
    properties: DppFeatureProperties


class DppFeatureCollection(BaseModel):
    type: Literal["FeatureCollection"] = "FeatureCollection"
    features: list[DppFeature]


# --- Analytics ---

class FormaTermino(BaseModel):
    nombre: str
    n_causas: int
    porcentaje: float


class DppResumenResponse(BaseModel):
    anio: int
    total_ingresos: int
    total_terminos: int
    ratio_terminos: float          # terminos / ingresos
    formas_termino: list[FormaTermino]


class DppSeriePunto(BaseModel):
    anio: int
    ingresos: int
    terminos: int


class DppSerieResponse(BaseModel):
    datos: list[DppSeriePunto]


class DppRegion(BaseModel):
    region_id: str
    region_nombre: str
    n_ingresos: int


class DppRegionesResponse(BaseModel):
    anio: int
    regiones: list[DppRegion]
