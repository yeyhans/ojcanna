# backend/etl/pdi/downloader.py
"""Descarga los archivos XLS de estadísticas PDI desde datos.gob.cl."""
import logging
from pathlib import Path

import httpx
from tenacity import retry, stop_after_attempt, wait_exponential

from etl.pdi.config import PDI_XLS_FILES, RAW_DATA_DIR, HTTP_TIMEOUT, MAX_RETRIES

logger = logging.getLogger(__name__)


class PdiDownloader:
    def __init__(self, raw_dir: Path = RAW_DATA_DIR):
        self.raw_dir = raw_dir
        self.raw_dir.mkdir(parents=True, exist_ok=True)

    @retry(stop=stop_after_attempt(MAX_RETRIES), wait=wait_exponential(min=2, max=10))
    def _download(self, client: httpx.Client, url: str, dest: Path) -> None:
        resp = client.get(url, timeout=HTTP_TIMEOUT, follow_redirects=True)
        resp.raise_for_status()
        dest.write_bytes(resp.content)
        logger.info(f"Descargado {dest.name} ({len(resp.content) / 1024:.0f} KB)")

    def run(self) -> list[Path]:
        descargados: list[Path] = []
        with httpx.Client(headers={"User-Agent": "Mozilla/5.0"}) as client:
            for (anio, tipo), url in PDI_XLS_FILES.items():
                dest = self.raw_dir / f"pdi_{anio}_{tipo}.xls"
                if dest.exists():
                    logger.info(f"Ya existe {dest.name}. Omitido.")
                    descargados.append(dest)
                    continue
                try:
                    self._download(client, url, dest)
                    descargados.append(dest)
                except Exception as e:
                    logger.error(f"Error descargando {dest.name}: {e}")
        return descargados
