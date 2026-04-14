# backend/etl/fiscalia/downloader.py
"""
Descarga idempotente de los boletines de la Fiscalía Nacional.

No re-descarga si el archivo local existe y es más nuevo que 30 días —
evita golpear el servidor oficial en cada corrida.
"""
import logging
import time
from pathlib import Path

import httpx
from tenacity import retry, stop_after_attempt, wait_exponential

from etl.fiscalia.config import (
    BOLETINES,
    BOLETIN_PRIMER_SEMESTRE_2025,
    RAW_DATA_DIR,
)

logger = logging.getLogger(__name__)

THIRTY_DAYS_SEC = 30 * 24 * 3600


@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=20))
def _download_file(url: str, dest: Path) -> Path:
    """Descarga un archivo con streaming + reintentos exponenciales."""
    logger.info(f"Descargando {url} → {dest.name}")
    with httpx.Client(timeout=120, follow_redirects=True) as client:
        with client.stream("GET", url) as response:
            response.raise_for_status()
            with open(dest, "wb") as f:
                for chunk in response.iter_bytes(chunk_size=64 * 1024):
                    f.write(chunk)
    logger.info(f"  OK ({dest.stat().st_size:,} bytes)")
    return dest


def _needs_refresh(path: Path) -> bool:
    if not path.exists():
        return True
    age = time.time() - path.stat().st_mtime
    return age > THIRTY_DAYS_SEC


def download_boletines_anuales() -> dict[int, Path]:
    """Descarga los boletines anuales configurados. Retorna {anio: path}."""
    paths: dict[int, Path] = {}
    for anio, url in BOLETINES.items():
        ext = ".xls" if url.endswith(".xls") else ".xlsx"
        dest = RAW_DATA_DIR / f"fiscalia_boletin_anual_{anio}{ext}"
        if _needs_refresh(dest):
            _download_file(url, dest)
        else:
            logger.info(f"  Cache hit: {dest.name} (<30 días)")
        paths[anio] = dest
    return paths


def download_boletin_semestral() -> Path:
    """Descarga el boletín 1er semestre 2025 (complementario)."""
    dest = RAW_DATA_DIR / "fiscalia_boletin_1sem_2025.xlsx"
    if _needs_refresh(dest):
        _download_file(BOLETIN_PRIMER_SEMESTRE_2025, dest)
    return dest


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    download_boletines_anuales()
    download_boletin_semestral()
