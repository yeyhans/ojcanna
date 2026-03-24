# backend/etl/cead/models.py
from typing import Optional, Literal
from pydantic import BaseModel

TaxonomyVersion = Literal["DMCS_legacy", "Taxonomia_2024"]


class CeadHecho(BaseModel):
    anio: int
    mes: Optional[int] = None
    region_cod: str
    provincia_cod: str
    comuna_cod: str
    comuna_nombre: str
    subgrupo: Optional[str] = None
    grupo: Optional[str] = None
    familia: Optional[str] = None
    tipo_caso: Optional[str] = None
    frecuencia: Optional[int] = None
    tasa_100k: Optional[float] = None
    taxonomy_version: TaxonomyVersion


class CodigoItem(BaseModel):
    id: str
    nombre: str


class ComunaItem(BaseModel):
    id: str
    nombre: str
    region_id: str
    provincia_id: str


class CodigosMap(BaseModel):
    regiones: list[CodigoItem]
    familias_drogas: list[CodigoItem]
    grupos_drogas: list[CodigoItem] = []
    subgrupos_drogas: list[CodigoItem]
    comunas: list[ComunaItem]
