# backend/etl/cead/extractor.py
"""
Fase 2: Extracción masiva de datos del portal CEAD usando httpx async.
Llama a get_estadisticas_delictuales.php (el endpoint real de datos),
itera sobre comunas × años × subgrupos, y persiste resultados en JSONL.
"""
import html as html_mod
import json
import logging
import re
import asyncio
from pathlib import Path

import httpx
from tenacity import retry, stop_after_attempt, wait_exponential

from etl.cead.config import (
    CEAD_DATA_URL,
    CEAD_PORTAL_URL,
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
    SUBGRUPO_GRUPO_MAP,
)
from etl.cead.models import CodigosMap

logger = logging.getLogger(__name__)

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
    "X-Requested-With": "XMLHttpRequest",
    "Referer": CEAD_PORTAL_URL,
}

FAMILIA_ID = "4"
FAMILIA_NOMBRE = "Delitos asociados a drogas"


def _get_region_provincia(comuna_id: str) -> tuple[str, str]:
    """Deriva (region_id, provincia_id) del código de comuna (4 o 5 dígitos)."""
    c = str(comuna_id)
    if len(c) == 5:      # región de 2 dígitos (10-16): e.g. "13101"
        return c[:2], c[:3]
    elif len(c) == 4:    # región de 1 dígito (1-9): e.g. "3102"
        return c[0], c[:2]
    return "", ""


def _parse_valor(html_text: str, subgrupo_nombre: str) -> str | None:
    """
    Extrae el valor numérico de la fila que coincide con el nombre del subgrupo.
    El portal retorna HTML con entidades (Tr&aacute;fico → Tráfico).
    """
    for tr in re.findall(r'<tr[^>]*>(.*?)</tr>', html_text, re.DOTALL):
        cells = re.findall(r'<t[hd][^>]*>(.*?)</t[hd]>', tr, re.DOTALL)
        cells = [re.sub(r'<[^>]+>', '', c).strip() for c in cells]
        if len(cells) >= 2 and cells[0].strip():
            name_clean = re.sub(r'\s+', ' ', html_mod.unescape(cells[0])).strip().lower()
            sg_clean = subgrupo_nombre.strip().lower()
            if sg_clean in name_clean or name_clean in sg_clean:
                return html_mod.unescape(cells[1]).strip()
    return None


def _to_float(raw: str | None) -> float | None:
    """Convierte '14,3' → 14.3. Retorna None si vacío o inválido."""
    if not raw:
        return None
    try:
        return float(raw.replace(".", "").replace(",", "."))
    except (ValueError, AttributeError):
        return None


class Checkpoint:
    def __init__(self, path: Path):
        self.path = path
        self._done: set[tuple] = set()
        self._cargar()

    def _cargar(self) -> None:
        if self.path.exists():
            with open(self.path, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line:
                        try:
                            d = json.loads(line)
                            self._done.add((d["comuna_id"], str(d["anio"]), d["subgrupo_id"]))
                        except (KeyError, json.JSONDecodeError):
                            pass

    def ya_descargado(self, comuna_id: str, anio: int, subgrupo_id: str) -> bool:
        return (comuna_id, str(anio), subgrupo_id) in self._done

    def guardar(self, row: dict) -> None:
        self._done.add((row["comuna_id"], str(row["anio"]), row["subgrupo_id"]))
        with open(self.path, "a", encoding="utf-8") as f:
            f.write(json.dumps(row, ensure_ascii=False) + "\n")


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
        pendientes = []
        for comuna in self.codigos.comunas:
            for anio in anios:
                for subgrupo in self.codigos.subgrupos_drogas:
                    if not self.checkpoint.ya_descargado(comuna.id, anio, subgrupo.id):
                        pendientes.append((comuna, anio, subgrupo))
        return pendientes

    @retry(stop=stop_after_attempt(MAX_RETRIES), wait=wait_exponential(min=1, max=8))
    async def _post_data(self, client: httpx.AsyncClient, payload: dict) -> str:
        resp = await client.post(CEAD_DATA_URL, data=payload, headers=HEADERS, timeout=HTTP_TIMEOUT)
        resp.raise_for_status()
        return resp.text

    async def _descargar_uno(
        self,
        sem: asyncio.Semaphore,
        client: httpx.AsyncClient,
        comuna,
        anio: int,
        subgrupo,
    ) -> None:
        async with sem:
            grupo_id = SUBGRUPO_GRUPO_MAP.get(subgrupo.id, "401")
            region_id, provincia_id = _get_region_provincia(comuna.id)

            base_payload = {
                "seleccion": "2",
                "tipoVal": "1,2",
                "anio[]": str(anio),
                "comuna[]": comuna.id,
                "familia[]": FAMILIA_ID,
                "familia_nombres[]": FAMILIA_NOMBRE,
                "grupo[]": grupo_id,
                "subgrupo[]": subgrupo.id,
                "subgrupo_nombres[]": subgrupo.nombre,
                "descarga": "false",
            }

            try:
                # Tasa (medida=2)
                html_tasa = await self._post_data(client, {**base_payload, "medida": "2"})
                tasa_raw = _parse_valor(html_tasa, subgrupo.nombre)

                # Frecuencia (medida=1)
                html_freq = await self._post_data(client, {**base_payload, "medida": "1"})
                freq_raw = _parse_valor(html_freq, subgrupo.nombre)

                row = {
                    "anio": anio,
                    "region_id": region_id,
                    "provincia_id": provincia_id,
                    "comuna_id": comuna.id,
                    "comuna_nombre": comuna.nombre,
                    "subgrupo_id": subgrupo.id,
                    "subgrupo_nombre": subgrupo.nombre,
                    "grupo_id": grupo_id,
                    "familia_id": FAMILIA_ID,
                    "tasa_100k": _to_float(tasa_raw),
                    "frecuencia": _to_float(freq_raw),
                    "tipo_caso": "Casos Policiales",
                    "taxonomy_version": self._taxonomy_version(anio),
                }
                self.checkpoint.guardar(row)
                logger.debug(f"OK: {comuna.id} {anio} {subgrupo.id} tasa={tasa_raw} freq={freq_raw}")

            except Exception as e:
                logger.error(f"FALLO: {comuna.id} {anio} {subgrupo.id}: {e}")

    async def run(self, anios: list[int] | None = None) -> None:
        if anios is None:
            anios = list(range(ANIO_INICIO, ANIO_FIN + 1))

        pendientes = self._pendientes(anios)
        logger.info(f"Combinaciones pendientes: {len(pendientes)}")

        sem = asyncio.Semaphore(MAX_CONCURRENT_REQUESTS)
        async with httpx.AsyncClient(follow_redirects=True) as client:
            # Obtener cookie de sesión del portal
            await client.get(CEAD_PORTAL_URL, headers={"User-Agent": HEADERS["User-Agent"]}, timeout=30)

            tasks = [
                self._descargar_uno(sem, client, c, a, s)
                for c, a, s in pendientes
            ]
            await asyncio.gather(*tasks)

        logger.info("Extracción completada.")
