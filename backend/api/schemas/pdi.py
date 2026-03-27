# backend/api/schemas/pdi.py
from typing import Any, Literal
from pydantic import BaseModel


class PdiFiltrosResponse(BaseModel):
    anios: list[int]
    categorias: list[str]


# --- Mapa (GeoJSON) ---

class PdiFeatureProperties(BaseModel):
    cut: str
    nombre: str
    region_id: str
    frecuencia: float
    tiene_datos: bool


class PdiFeature(BaseModel):
    type: Literal["Feature"] = "Feature"
    geometry: dict[str, Any]
    properties: PdiFeatureProperties


class PdiFeatureCollection(BaseModel):
    type: Literal["FeatureCollection"] = "FeatureCollection"
    features: list[PdiFeature]


# --- Analytics ---

class PdiCategoria(BaseModel):
    categoria: str
    subcategoria: str
    total_nacional: float


class PdiResumenResponse(BaseModel):
    anio: int
    categorias: list[PdiCategoria]


class PdiRegionItem(BaseModel):
    region_id: str
    region_nombre: str
    frecuencia: float


class PdiRegionesResponse(BaseModel):
    anio: int
    categoria: str
    subcategoria: str
    regiones: list[PdiRegionItem]


class PdiSeriePunto(BaseModel):
    anio: int
    categoria: str
    subcategoria: str
    total: float


class PdiSerieResponse(BaseModel):
    datos: list[PdiSeriePunto]
