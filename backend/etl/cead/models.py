# backend/etl/cead/models.py
from typing import Optional, Literal, Annotated
from pydantic import BaseModel, Field

TaxonomyVersion = Literal["DMCS_legacy", "Taxonomia_2024"]


class CeadHecho(BaseModel):
    anio: Annotated[int, Field(ge=2005, le=2030)]
    mes: Optional[Annotated[int, Field(ge=1, le=12)]] = None
    region_cod: str
    provincia_cod: str
    comuna_cod: str
    comuna_nombre: str
    subgrupo: Optional[str] = None
    grupo: Optional[str] = None
    familia: Optional[str] = None
    tipo_caso: Optional[str] = None
    frecuencia: Optional[Annotated[int, Field(ge=0)]] = None
    tasa_100k: Optional[float] = None
    taxonomy_version: TaxonomyVersion


class CodigoItem(BaseModel):
    id: str
    nombre: str


class ComunaItem(BaseModel):
    id: str
    nombre: str
    region_id: str = ""
    provincia_id: str = ""


class CodigosMap(BaseModel):
    regiones: list[CodigoItem]
    familias_drogas: list[CodigoItem]
    # grupos_drogas puede estar ausente en respuestas del portal CEAD
    # (es un nivel intermedio que no siempre se retorna); se usa [] como fallback seguro
    grupos_drogas: list[CodigoItem] = []
    subgrupos_drogas: list[CodigoItem]
    comunas: list[ComunaItem]
