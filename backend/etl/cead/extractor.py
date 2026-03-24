# backend/etl/cead/extractor.py
"""
Fase 2: Extracción masiva de datos del portal CEAD usando httpx async.
Itera sobre todas las combinaciones: comunas × años × subgrupos de drogas.
Usa checkpoint para reanudar si el proceso se interrumpe.
"""
import json
import logging
import asyncio
from pathlib import Path

import httpx
from tenacity import retry, stop_after_attempt, wait_exponential

from etl.cead.config import (
    CEAD_AJAX_URL,
    CODIGOS_JSON,
    RAW_DATA_DIR,
    CHECKPOINT_FILE,
    HTTP_TIMEOUT,
    MAX_CONCURRENT_REQUESTS,
    MAX_RETRIES,
    ANIO_INICIO,
    ANIO_FIN,
    TAXONOMY_LEGACY,
    TAXONOMY_2024,
    TAXONOMY_CUTOFF_YEAR,
)
from etl.cead.models import CodigosMap

logger = logging.getLogger(__name__)


class Checkpoint:
    def __init__(self, path: Path):
        self.path = path
        self._descargados: set = set()
        self._cargar()

    def _cargar(self):
        if self.path.exists():
            with open(self.path, "r") as f:
                for line in f:
                    line = line.strip()
                    if line:
                        d = json.loads(line)
                        self._descargados.add((d["comuna_id"], d["anio"], d["subgrupo_id"]))

    def ya_descargado(self, comuna_id: str, anio: str, subgrupo_id: str) -> bool:
        return (comuna_id, anio, subgrupo_id) in self._descargados

    def marcar(self, comuna_id: str, anio: str, subgrupo_id: str) -> None:
        self._descargados.add((comuna_id, anio, subgrupo_id))
        with open(self.path, "a") as f:
            f.write(json.dumps({"comuna_id": comuna_id, "anio": anio, "subgrupo_id": subgrupo_id}) + "\n")


class CeadExtractor:
    def __init__(
        self,
        codigos_path: Path = CODIGOS_JSON,
        checkpoint_path: Path = CHECKPOINT_FILE,
        raw_dir: Path = RAW_DATA_DIR,
    ):
        self.raw_dir = raw_dir
        self.raw_dir.mkdir(parents=True, exist_ok=True)
        self.checkpoint = Checkpoint(checkpoint_path)

        with open(codigos_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        self.codigos = CodigosMap(**data)

    def _taxonomy_version(self, anio: int) -> str:
        return TAXONOMY_2024 if anio >= TAXONOMY_CUTOFF_YEAR else TAXONOMY_LEGACY

    def _pendientes(self, anios: list[int]) -> list[tuple]:
        """Retorna lista de (comuna, anio, subgrupo) aún no descargadas."""
        pendientes = []
        for comuna in self.codigos.comunas:
            for anio in anios:
                for subgrupo in self.codigos.subgrupos_drogas:
                    if not self.checkpoint.ya_descargado(comuna.id, str(anio), subgrupo.id):
                        pendientes.append((comuna, anio, subgrupo))
        return pendientes

    @retry(stop=stop_after_attempt(MAX_RETRIES), wait=wait_exponential(min=1, max=8))
    async def _post_cead(self, client: httpx.AsyncClient, payload: dict) -> bytes:
        resp = await client.post(CEAD_AJAX_URL, data=payload, timeout=HTTP_TIMEOUT)
        resp.raise_for_status()
        return resp.content

    async def _descargar_uno(
        self,
        sem: asyncio.Semaphore,
        client: httpx.AsyncClient,
        comuna,
        anio: int,
        subgrupo,
    ) -> None:
        async with sem:
            grupo_id = self.codigos.grupos_drogas[0].id if self.codigos.grupos_drogas else ""
            if not grupo_id:
                logger.warning("grupos_drogas vacío en codigos_cead.json — enviando grupoId vacío")
            payload = {
                "seleccion": 11,  # nivel subgrupo
                "comunaId": comuna.id,
                "anio": str(anio),
                "familiaId": self.codigos.familias_drogas[0].id,
                "grupoId": grupo_id,
                "subgrupoId": subgrupo.id,
            }
            try:
                content = await self._post_cead(client, payload)
                filename = f"{anio}_{comuna.id}_{subgrupo.id}.xlsx"
                (self.raw_dir / filename).write_bytes(content)
                self.checkpoint.marcar(comuna.id, str(anio), subgrupo.id)
                logger.debug(f"OK: {filename}")
            except Exception as e:
                logger.error(f"FALLO: comuna={comuna.id} anio={anio} subgrupo={subgrupo.id}: {e}")

    async def run(self, anios: list[int] | None = None) -> None:
        if anios is None:
            anios = list(range(ANIO_INICIO, ANIO_FIN + 1))

        pendientes = self._pendientes(anios)
        logger.info(f"Combinaciones pendientes: {len(pendientes)}")

        sem = asyncio.Semaphore(MAX_CONCURRENT_REQUESTS)
        async with httpx.AsyncClient() as client:
            tasks = [
                self._descargar_uno(sem, client, c, a, s)
                for c, a, s in pendientes
            ]
            await asyncio.gather(*tasks)

        logger.info("Extracción completada.")
