# backend/tests/etl/cead/test_extractor.py
import json
import pytest
from pathlib import Path

from etl.cead.extractor import CeadExtractor, Checkpoint
from etl.cead.config import TAXONOMY_LEGACY, TAXONOMY_2024


@pytest.fixture
def sample_codigos(tmp_path):
    data = {
        "regiones": [{"id": "13", "nombre": "Metropolitana"}],
        "familias_drogas": [{"id": "5", "nombre": "Delitos asociados a drogas"}],
        "grupos_drogas": [{"id": "10", "nombre": "Crímenes y simples delitos ley de drogas"}],
        "subgrupos_drogas": [{"id": "20", "nombre": "Microtráfico de sustancias"}],
        "comunas": [{"id": "13101", "nombre": "Santiago", "region_id": "13", "provincia_id": "131"}],
    }
    f = tmp_path / "codigos_cead.json"
    f.write_text(json.dumps(data))
    return f


def test_checkpoint_guarda_y_verifica(tmp_path):
    cp = Checkpoint(tmp_path / "cp.jsonl")
    key = ("13101", "2024", "20")
    assert not cp.ya_descargado(*key)
    cp.marcar(*key)
    assert cp.ya_descargado(*key)


def test_taxonomy_version_por_anio():
    extractor = CeadExtractor.__new__(CeadExtractor)
    assert extractor._taxonomy_version(2023) == TAXONOMY_LEGACY
    assert extractor._taxonomy_version(2024) == TAXONOMY_2024
    assert extractor._taxonomy_version(2025) == TAXONOMY_2024


@pytest.mark.asyncio
async def test_extractor_salta_descargados(sample_codigos, tmp_path):
    """El extractor no vuelve a descargar combinaciones ya registradas en checkpoint."""
    cp_file = tmp_path / "cp.jsonl"
    cp = Checkpoint(cp_file)
    cp.marcar("13101", "2024", "20")

    extractor = CeadExtractor(codigos_path=sample_codigos, checkpoint_path=cp_file, raw_dir=tmp_path)
    combinaciones = extractor._pendientes([2024])
    # La única combinación (13101, 2024, 20) ya está en checkpoint, no debe quedar pendiente
    assert combinaciones == []
