# backend/etl/pjud/models.py
"""
Modelos Pydantic del pipeline PJud.

Refleja el schema SQL de 005_create_pjud_tables.sql:
  - PjudSentencia      → tabla pjud_sentencias (capa pública)
  - PjudExtraccion     → tabla pjud_extracciones (variables estructuradas)
  - DownloadLogEntry   → tabla pjud_download_log (idempotencia scraper)
  - PjudAuditEntry     → tabla pjud_audit (admin-only, HMAC salado)
"""
from datetime import date, datetime
from typing import Annotated, Literal, Optional
from uuid import UUID

from pydantic import BaseModel, Field

Veredicto = Literal["condena", "absolucion", "sobreseimiento", "salida_alternativa"]
TipoDelito = Literal["trafico", "microtrafico", "porte", "consumo"]
TipoCultivo = Literal["indoor", "outdoor", "sin_cultivo"]
Fuente = Literal["portal_unificado", "saip"]
DownloadStatus = Literal[
    "ok", "pdf_error", "not_found", "ocr_required", "rate_limited"
]


class PjudSentencia(BaseModel):
    """Sentencia anonimizada. NUNCA contiene RUT, nombres ni domicilios."""

    id: UUID
    rol: Annotated[str, Field(max_length=40)]
    tribunal_id: Optional[Annotated[str, Field(max_length=10)]] = None
    tribunal_nombre: Optional[str] = None
    comuna_id: Optional[Annotated[str, Field(max_length=6)]] = None
    region_id: Optional[Annotated[str, Field(max_length=3)]] = None
    fecha_sentencia: date
    materia: Optional[str] = None
    fuente: Fuente = "portal_unificado"
    texto_anonimizado: str
    anonimizador_version: str
    idioma: str = "es"
    ocr_required: bool = False


class PjudExtraccion(BaseModel):
    """Variables estructuradas extraídas por rules o LLM."""

    sentencia_id: UUID
    extractor_version: str
    gramaje_g: Optional[float] = None
    thc_pct: Optional[float] = None
    tipo_cultivo: Optional[TipoCultivo] = None
    receta_medica: Optional[bool] = None
    tipo_delito: Optional[TipoDelito] = None
    veredicto: Optional[Veredicto] = None
    pena_meses: Optional[int] = None
    atipicidad_consumo_personal: Optional[bool] = None
    confianza: Optional[Annotated[float, Field(ge=0.0, le=1.0)]] = None


class DownloadLogEntry(BaseModel):
    """Estado de descarga del scraper Portal Unificado."""

    rol: Annotated[str, Field(max_length=40)]
    tribunal_id: str = ""
    url_origen: Optional[str] = None
    status: DownloadStatus
    intentos: int = 0
    last_attempted: Optional[datetime] = None


class PjudAuditEntry(BaseModel):
    """Capa de auditoría: HMAC salado del texto original. Admin-only."""

    sentencia_id: UUID
    texto_hmac: Annotated[str, Field(min_length=64, max_length=64)]
    anonimizacion_diff_bytes: Optional[int] = None
    entidades_detectadas: dict[str, int] = Field(default_factory=dict)


class PjudSearchResult(BaseModel):
    """
    Metadata de sentencia parseada desde la respuesta JSON de
    `POST /busqueda/buscar_sentencias`.

    NO contiene texto completo — sólo identificadores y atributos visibles en
    el listado público (rol, tribunal, fecha, materia). El texto íntegro del
    fallo requiere autenticación institucional (detalle_sentencia).
    """

    id: str                                 # id interno del Portal (para detalle)
    rol: str
    fecha: date
    tribunal: Optional[str] = None
    tribunal_id: Optional[str] = None
    materia: Optional[str] = None
    url_detalle: Optional[str] = None       # k= base64 encoded (sólo visible con auth)


class RawSentenciaScraped(BaseModel):
    """
    Estado intermedio post-scraping, pre-anonimización.

    IMPORTANTE: instancias de esta clase contienen datos sensibles (RUT, nombres)
    y deben vivir SOLO en memoria. Nunca serializar a disco ni a base de datos.
    """

    rol: str
    tribunal_id: Optional[str] = None
    tribunal_nombre: Optional[str] = None
    fecha_sentencia: date
    materia: Optional[str] = None
    url_origen: str
    texto_original: str          # ⚠️ datos sensibles — no persistir
    formato: Literal["pdf", "html"] = "pdf"
    bytes_pdf: Optional[bytes] = None   # ⚠️ tampoco persistir

    class Config:
        # Marca explícita: este modelo no debe serializarse a JSON de salida
        arbitrary_types_allowed = True
