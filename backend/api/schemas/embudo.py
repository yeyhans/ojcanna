# backend/api/schemas/embudo.py
"""
Schemas para el endpoint del Embudo del Punitivismo.
Agrega datos de múltiples fuentes para una misma comuna y año.
"""
from pydantic import BaseModel


class EtapaEmbudo(BaseModel):
    etapa: str             # "detenciones_policiales", "causas_defensor", etc.
    fuente: str            # "CEAD", "DPP", "PDI"
    total: float
    disponible: bool       # False si la fuente no tiene datos para esa combinación


class EmbudoComunaResponse(BaseModel):
    anio: int
    comuna_id: str
    comuna_nombre: str
    region_id: str
    etapas: list[EtapaEmbudo]


class RankingItem(BaseModel):
    comuna_id: str
    nombre: str
    region_id: str
    detenciones: float
    causas_defensor: float
    ratio: float           # causas_defensor / detenciones (0-1, indica selectividad)
    peso_regional_pct: float  # peso de la región dentro de la distribución nacional DPP ([0-1], 0 si la región no tiene datos DPP)
    es_estimado: bool = True  # causas_defensor siempre es una estimación por distribución proporcional


class EmbudoRankingResponse(BaseModel):
    anio: int
    items: list[RankingItem]
