# backend/api/schemas/cead.py
from typing import Any, Literal

from pydantic import BaseModel


class SubgrupoItem(BaseModel):
    id: str
    nombre: str


class FiltrosResponse(BaseModel):
    anios: list[int]
    subgrupos: list[SubgrupoItem]


class FeatureProperties(BaseModel):
    cut: str
    nombre: str
    tasa_agregada: float
    frecuencia_total: float


class Feature(BaseModel):
    type: Literal["Feature"] = "Feature"
    geometry: dict[str, Any]
    properties: FeatureProperties


class FeatureCollection(BaseModel):
    type: Literal["FeatureCollection"] = "FeatureCollection"
    features: list[Feature]
