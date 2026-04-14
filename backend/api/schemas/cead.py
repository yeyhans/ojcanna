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


# Stats split: solo datos numéricos (las geometrías van por /cead/geometrias)
class StatsItem(BaseModel):
    cut: str
    nombre: str
    tasa_agregada: float
    frecuencia_total: float
    # Solo presente cuando denominador=ine_2017; None si no hay match en ine_poblacion
    tasa_recalculada: float | None = None


class StatsResponse(BaseModel):
    anio: int
    subgrupos: list[str]
    denominador_usado: str = "cead_oficial"
    stats: list[StatsItem]
