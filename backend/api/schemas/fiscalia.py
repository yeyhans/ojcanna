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


# ---------------------------------------------------------------------------
# Tabla fiscalia_detalle — hojas del boletín con dimensiones (TB6.2, TB9, TB7,
# TB5.2.1). Ver etl/fiscalia/detalle_consolidator.py.
# ---------------------------------------------------------------------------

# --- Tipos de término (TB6.2) ---

class FiscaliaTipoTermino(BaseModel):
    tipo: str
    """Nombre oficial del término, tal como lo publica Fiscalía."""
    grupo: str
    """salida_judicial | salida_no_judicial | otros_terminos"""
    n_causas: int
    porcentaje: float


class FiscaliaTerminosResponse(BaseModel):
    anio: int
    total_terminos: int
    tipos: list[FiscaliaTipoTermino]
    """Sólo términos atómicos: los subtotales de la fuente se excluyen."""


# --- Juicios orales (TB9) ---

class FiscaliaJuicioRegion(BaseModel):
    region_id: str
    region_nombre: str
    juicios_orales: int


class FiscaliaJuiciosResponse(BaseModel):
    anio: int
    total_nacional: int
    regiones: list[FiscaliaJuicioRegion]


# --- Tiempos de tramitación (TB7) ---

class FiscaliaTramitacionRegion(BaseModel):
    region_id: str
    region_nombre: str
    zonal: str | None = None
    """Etiqueta zonal de la Metropolitana. Fiscalía publica 4 fiscalías RM y
    estos valores son promedios: no se agregan para no inventar una cifra."""
    dias_salida_judicial: float | None = None
    dias_salida_no_judicial: float | None = None


class FiscaliaTramitacionResponse(BaseModel):
    anio: int
    unidad: str = "dias"
    regiones: list[FiscaliaTramitacionRegion]


# --- Demografía de imputados (TB5.2.1) ---

class FiscaliaDemografiaItem(BaseModel):
    sexo: str
    tramo_etario: str
    n_imputados: int


class FiscaliaDemografiaResponse(BaseModel):
    anio: int
    total_imputados: int
    granularidad: str = "nacional"
    """La fuente no desagrega esta tabla por región y no se distribuye."""
    items: list[FiscaliaDemografiaItem]
