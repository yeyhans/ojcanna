# backend/etl/pjud/consolidator.py
"""
Persistencia de metadata PJud en las 4 tablas (pjud_sentencias, pjud_extracciones,
pjud_download_log; pjud_audit queda sin tocar en MVP Mes 1 porque no hay texto
original que hashear).

MVP Mes 1:
  - Inserta metadata del listado con `texto_anonimizado = ""` y
    `anonimizador_version = "metadata-only-v1"`, `ocr_required = TRUE`.
  - NO toca `pjud_audit` (sin texto original no hay HMAC computable).
  - Registra en `pjud_download_log` con status `auth_required` o `ok` según caso.
  - Inserta fila vacía en `pjud_extracciones` con `extractor_version='rule-v1'`
    y `confianza=0.0` para marcar "sentencia procesada sin extracción aún".
  - Todo ON CONFLICT DO NOTHING para garantizar idempotencia.

Mes 2:
  - Cuando se obtenga el texto completo (SAIP o auth), re-correr anonimización,
    actualizar `texto_anonimizado` + escribir `pjud_audit`.
"""
from __future__ import annotations

import json
import logging
import uuid
from typing import Any

import asyncpg

from etl.pjud.config import EXTRACTOR_RULE_VERSION
from etl.pjud.models import PjudSearchResult

logger = logging.getLogger(__name__)


# Status sentinela nuevo: metadata visible pero texto requiere auth
AUTH_REQUIRED_STATUS = "auth_required"


_INSERT_SENTENCIA_SQL = """
INSERT INTO pjud_sentencias
    (id, rol, tribunal_id, tribunal_nombre, fecha_sentencia,
     materia, fuente, texto_anonimizado, anonimizador_version,
     idioma, ocr_required)
VALUES ($1, $2, $3, $4, $5,
        $6, $7, $8, $9,
        'es', TRUE)
ON CONFLICT (rol, COALESCE(tribunal_id, ''), fecha_sentencia) DO NOTHING
RETURNING id
"""

_INSERT_EXTRACCION_STUB_SQL = """
INSERT INTO pjud_extracciones
    (sentencia_id, extractor_version, confianza)
VALUES ($1, $2, 0.0)
ON CONFLICT (sentencia_id, extractor_version) DO NOTHING
"""

_UPSERT_DOWNLOAD_LOG_SQL = """
INSERT INTO pjud_download_log
    (rol, tribunal_id, url_origen, status, intentos, last_attempted)
VALUES ($1, $2, $3, $4, 1, NOW())
ON CONFLICT (rol, tribunal_id) DO UPDATE
SET status         = EXCLUDED.status,
    url_origen     = COALESCE(EXCLUDED.url_origen, pjud_download_log.url_origen),
    intentos       = pjud_download_log.intentos + 1,
    last_attempted = NOW()
"""


async def _sentencia_already_inserted(
    conn: asyncpg.Connection,
    rol: str,
    tribunal_id: str,
    fecha,
) -> str | None:
    """Retorna id uuid como str si la sentencia ya existe en pjud_sentencias."""
    row = await conn.fetchrow(
        """SELECT id FROM pjud_sentencias
           WHERE rol = $1
             AND COALESCE(tribunal_id, '') = $2
             AND fecha_sentencia = $3""",
        rol, tribunal_id or "", fecha,
    )
    return str(row["id"]) if row else None


async def upsert_sentencia_metadata(
    pool: asyncpg.Pool,
    result: PjudSearchResult,
    url_origen: str | None = None,
) -> dict[str, Any]:
    """
    Inserta metadata de una sentencia en las 3 tablas (sin pjud_audit).

    Returns
    -------
    dict
        {"sentencia_id": str|None, "inserted": bool, "status": str}
    """
    sentencia_id = uuid.uuid4()
    url = url_origen or result.url_detalle

    async with pool.acquire() as conn:
        async with conn.transaction():
            # INSERT sentencia con texto vacío y anonimizador metadata-only
            row = await conn.fetchrow(
                _INSERT_SENTENCIA_SQL,
                sentencia_id,
                result.rol,
                result.tribunal_id,
                result.tribunal,
                result.fecha,
                result.materia,
                "portal_unificado",
                "",                          # texto_anonimizado vacío (sin contenido)
                "metadata-only-v1",          # anonimizador_version
            )

            if row is None:
                # Conflicto: la sentencia ya existe — buscar su id y sólo actualizar log
                existing_id = await _sentencia_already_inserted(
                    conn, result.rol,
                    result.tribunal_id or "",
                    result.fecha,
                )
                logger.info(
                    "Sentencia ya existente (rol=%s tribunal=%s fecha=%s)",
                    result.rol, result.tribunal_id, result.fecha,
                )
                # Actualizar download_log
                await conn.execute(
                    _UPSERT_DOWNLOAD_LOG_SQL,
                    result.rol,
                    result.tribunal_id or "",
                    url,
                    AUTH_REQUIRED_STATUS,
                )
                return {
                    "sentencia_id": existing_id,
                    "inserted": False,
                    "status": AUTH_REQUIRED_STATUS,
                }

            sentencia_id_final = row["id"]

            # Extracción stub (marca "procesada pero sin señal")
            await conn.execute(
                _INSERT_EXTRACCION_STUB_SQL,
                sentencia_id_final,
                EXTRACTOR_RULE_VERSION,
            )

            # Download log
            await conn.execute(
                _UPSERT_DOWNLOAD_LOG_SQL,
                result.rol,
                result.tribunal_id or "",
                url,
                AUTH_REQUIRED_STATUS,
            )

    logger.info(
        "Metadata persisted | id=%s rol=%s tribunal=%s fecha=%s",
        sentencia_id_final, result.rol, result.tribunal_id, result.fecha,
    )
    return {
        "sentencia_id": str(sentencia_id_final),
        "inserted": True,
        "status": AUTH_REQUIRED_STATUS,
    }


async def log_download_failure(
    pool: asyncpg.Pool,
    rol: str,
    tribunal_id: str,
    status: str,
    url_origen: str | None = None,
) -> None:
    """
    Registra un fallo de descarga (reCAPTCHA, 429, not_found) SIN crear sentencia.

    Útil cuando el listado no se pudo leer — permite reintentar en próxima corrida.
    """
    async with pool.acquire() as conn:
        await conn.execute(
            _UPSERT_DOWNLOAD_LOG_SQL,
            rol, tribunal_id or "", url_origen, status,
        )
    logger.warning("download_log failure | rol=%s status=%s", rol, status)
