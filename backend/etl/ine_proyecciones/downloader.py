# backend/etl/ine_proyecciones/downloader.py
"""
Descarga el XLSX de Proyecciones de Población Comunal INE (base Censo 2017).
Idempotente: si el archivo existe y tiene menos de CACHE_MAX_DAYS días, omite
la descarga para no saturar el servidor del INE.
"""
import logging
import time
from pathlib import Path

import httpx
import tenacity

from etl.ine_proyecciones.config import (
    CACHE_MAX_DAYS,
    DATA_DIR,
    HTTP_TIMEOUT,
    INE_PROYECCIONES_URL,
    MAX_RETRIES,
    XLSX_FILENAME,
)

logger = logging.getLogger(__name__)


def _file_is_fresh(path: Path, max_days: int) -> bool:
    """True si el archivo existe y fue modificado hace menos de max_days días."""
    if not path.exists():
        return False
    age_days = (time.time() - path.stat().st_mtime) / 86400
    return age_days < max_days


@tenacity.retry(
    stop=tenacity.stop_after_attempt(MAX_RETRIES),
    wait=tenacity.wait_exponential(multiplier=1, min=2, max=30),
    reraise=True,
)
async def download_ine_proyecciones(dest_path: Path | None = None) -> Path:
    """
    Descarga el XLSX de proyecciones comunales INE a ``dest_path``.

    Si ``dest_path`` es None, usa ``DATA_DIR / XLSX_FILENAME``.
    Si el archivo ya existe y es fresco (< CACHE_MAX_DAYS días), lo retorna
    directamente sin volver a descargar.

    Returns
    -------
    Path
        Ruta al archivo descargado (o existente en caché).
    """
    if dest_path is None:
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        dest_path = DATA_DIR / XLSX_FILENAME

    if _file_is_fresh(dest_path, CACHE_MAX_DAYS):
        logger.info(
            f"Archivo fresco encontrado en {dest_path} "
            f"(< {CACHE_MAX_DAYS} días). Omitiendo descarga."
        )
        return dest_path

    logger.info(f"Descargando XLSX desde: {INE_PROYECCIONES_URL}")
    logger.info(f"Destino: {dest_path}")

    async with httpx.AsyncClient(
        timeout=HTTP_TIMEOUT,
        follow_redirects=True,
        headers={"User-Agent": "ObservatorioJudicialCannabico/1.0 (investigacion-civica)"},
    ) as client:
        async with client.stream("GET", INE_PROYECCIONES_URL) as response:
            response.raise_for_status()
            total = int(response.headers.get("content-length", 0))
            downloaded = 0
            with open(dest_path, "wb") as f:
                async for chunk in response.aiter_bytes(chunk_size=65536):
                    f.write(chunk)
                    downloaded += len(chunk)

    size_mb = dest_path.stat().st_size / (1024 * 1024)
    logger.info(f"Descarga completa: {size_mb:.1f} MB → {dest_path}")
    return dest_path
