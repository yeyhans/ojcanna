# backend/etl/common/checkpoint.py
"""
Checkpoint genérico basado en JSONL para ETL resumibles.
Cada fuente de datos instancia Checkpoint con sus propios key_fields.
"""
import json
import logging
from pathlib import Path

logger = logging.getLogger(__name__)


class Checkpoint:
    """
    Persiste filas descargadas en un archivo JSONL y lleva registro
    de cuáles combinaciones ya fueron procesadas (evita re-descargas).

    Uso:
        cp = Checkpoint(path, key_fields=("comuna_id", "anio", "subgrupo_id"))
        if not cp.ya_descargado(comuna_id="13101", anio=2024, subgrupo_id="40101"):
            row = fetch(...)
            cp.guardar(row)
    """

    def __init__(self, path: Path, key_fields: tuple[str, ...]):
        self.path = path
        self.key_fields = key_fields
        self._done: set[tuple] = set()
        self._cargar()

    def _make_key(self, d: dict) -> tuple:
        return tuple(str(d[f]) for f in self.key_fields)

    def _cargar(self) -> None:
        if not self.path.exists():
            return
        with open(self.path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    d = json.loads(line)
                    self._done.add(self._make_key(d))
                except (KeyError, json.JSONDecodeError) as e:
                    logger.warning(f"Línea JSONL ignorada: {e}")

    def ya_descargado(self, **kwargs) -> bool:
        key = tuple(str(kwargs[f]) for f in self.key_fields)
        return key in self._done

    def guardar(self, row: dict) -> None:
        self._done.add(self._make_key(row))
        with open(self.path, "a", encoding="utf-8") as f:
            f.write(json.dumps(row, ensure_ascii=False) + "\n")

    def __len__(self) -> int:
        return len(self._done)
