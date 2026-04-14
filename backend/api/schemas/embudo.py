# backend/api/schemas/embudo.py
"""
Schemas Pydantic v2 del Embudo del Punitivismo (4 etapas).

Etapas: policial (CEAD comunal) → investigativa (PDI regional) → defensorial
(DPP regional) → judicial (PJud Fase E, ≥2025).

PJud y DPP/PDI son regionales — la distribución a nivel comunal usa pesos
relativos del CEAD. Es una aproximación metodológica (declarada al usuario).
"""
from __future__ import annotations

from typing import Optional

from pydantic import BaseModel


class EtapaEmbudo(BaseModel):
    """Una etapa del flujo penal."""

    etapa: str                          # 'policial' | 'investigativa' | 'defensorial' | 'judicial'
    fuente: str                         # 'CEAD' | 'PDI' | 'DPP' | 'PJud'
    label: str                          # legible UI
    n_casos: int
    nivel_real: str                     # 'comunal' | 'regional' | 'nacional'
    es_aproximacion: bool               # true si proviene de distribución proporcional
    nota_metodologica: Optional[str] = None


class EmbudoComunaResponse(BaseModel):
    """Embudo para una comuna específica (o nacional si comuna_id es None)."""

    anio: int
    comuna_id: Optional[str] = None
    comuna_nombre: Optional[str] = None
    region_id: Optional[str] = None
    etapas: list[EtapaEmbudo]
    tasa_atricion_pct: Optional[float] = None   # judicial / policial * 100


class EmbudoRankingItem(BaseModel):
    comuna_id: str
    comuna_nombre: str
    region_id: Optional[str] = None
    n_policial: int
    n_judicial: int                     # condenas PJud (proporcional)
    ratio_policial_judicial: float      # 0.0 - 1.0


class EmbudoRankingResponse(BaseModel):
    anio: int
    items: list[EmbudoRankingItem]


class SankeyNodo(BaseModel):
    id: str
    label: str
    fuente: str
    etapa: str
    n_casos: int


class SankeyFlujo(BaseModel):
    source: str                         # node id
    target: str                         # node id
    value: int
    perdida: bool = False               # true si target < source (caídas del embudo)


class EmbudoSankeyResponse(BaseModel):
    """Estructura para Diagrama de Sankey UNODC del flujo penal Ley 20.000."""

    anio: int
    comuna_id: Optional[str] = None
    nodos: list[SankeyNodo]
    flujos: list[SankeyFlujo]
    nota_metodologica: str
