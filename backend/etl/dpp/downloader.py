# backend/etl/dpp/downloader.py
"""
Descarga los archivos XLSX de la DPP para cada año disponible.
No requiere scraping — las URLs son directas y estables.
"""
import logging
from pathlib import Path

import httpx
from tenacity import retry, stop_after_attempt, wait_exponential

from etl.dpp.config import (
    DPP_BASE_URL,
    DPP_XLSX_FILES,
    RAW_DATA_DIR,
    HTTP_TIMEOUT,
    MAX_RETRIES,
)

logger = logging.getLogger(__name__)


class DppDownloader:
    def __init__(self, raw_dir: Path = RAW_DATA_DIR):
        self.raw_dir = raw_dir
        self.raw_dir.mkdir(parents=True, exist_ok=True)

    @retry(stop=stop_after_attempt(MAX_RETRIES), wait=wait_exponential(min=2, max=10))
    def _download_file(self, client: httpx.Client, url: str, dest: Path) -> None:
        resp = client.get(url, timeout=HTTP_TIMEOUT, follow_redirects=True)
        resp.raise_for_status()
        dest.write_bytes(resp.content)
        logger.info(f"Descargado {dest.name} ({len(resp.content) / 1024:.0f} KB)")

    def run(self, anios: list[int] | None = None) -> list[Path]:
        """
        Descarga los XLSX para cada año en ``anios``.
        Omite los ya descargados. Retorna lista de rutas descargadas.
        """
        if anios is None:
            anios = sorted(DPP_XLSX_FILES.keys())

        descargados: list[Path] = []

        with httpx.Client(headers={"User-Agent": "Mozilla/5.0"}) as client:
            for anio in anios:
                if anio not in DPP_XLSX_FILES:
                    logger.warning(f"Año {anio} no tiene URL configurada. Omitido.")
                    continue

                dest = self.raw_dir / f"dpp_{anio}.xlsx"
                if dest.exists():
                    logger.info(f"Ya existe {dest.name}. Omitido.")
                    descargados.append(dest)
                    continue

                url = DPP_BASE_URL + DPP_XLSX_FILES[anio]
                try:
                    self._download_file(client, url, dest)
                    descargados.append(dest)
                except Exception as e:
                    logger.error(f"Error descargando año {anio}: {e}")

        return descargados
