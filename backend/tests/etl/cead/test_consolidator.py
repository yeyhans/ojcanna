# backend/tests/etl/cead/test_consolidator.py
import json

import pandas as pd

from etl.cead.config import TAXONOMY_2024, TAXONOMY_LEGACY
from etl.cead.consolidator import CeadConsolidator


def _row(**overrides) -> dict:
    """Fila con la forma que CeadExtractor escribe en el checkpoint JSONL."""
    row = {
        "anio": 2024,
        "region_id": "13",
        "provincia_id": "131",
        "comuna_id": "13101",
        "comuna_nombre": "Santiago",
        "subgrupo_id": "40101",
        "subgrupo_nombre": "Microtráfico de sustancias",
        "grupo_id": "401",
        "familia_id": "4",
        "tasa_100k": 15.3,
        "frecuencia": 42,
        "tipo_caso": "Casos Policiales",
        "taxonomy_version": TAXONOMY_2024,
    }
    row.update(overrides)
    return row


def _write_jsonl(path, lines: list) -> None:
    """Escribe dicts como JSON y strings tal cual (para simular líneas corruptas)."""
    with open(path, "w", encoding="utf-8") as f:
        for line in lines:
            f.write((line if isinstance(line, str) else json.dumps(line, ensure_ascii=False)) + "\n")


def test_normaliza_tipos_desde_jsonl(tmp_path):
    cp = tmp_path / "checkpoint.jsonl"
    _write_jsonl(cp, [_row(anio="2024", frecuencia="42", tasa_100k="15.3")])

    df = CeadConsolidator(checkpoint_path=cp).run()

    assert len(df) == 1
    assert str(df["anio"].dtype) == "Int16"
    assert df["anio"].iloc[0] == 2024
    assert df["frecuencia"].iloc[0] == 42
    assert df["tasa_100k"].iloc[0] == 15.3


def test_preserva_taxonomy_version_del_extractor(tmp_path):
    cp = tmp_path / "checkpoint.jsonl"
    _write_jsonl(cp, [
        _row(anio=2020, taxonomy_version=TAXONOMY_LEGACY),
        _row(anio=2024, taxonomy_version=TAXONOMY_2024),
    ])

    df = CeadConsolidator(checkpoint_path=cp).run()

    por_anio = dict(zip(df["anio"].astype(int), df["taxonomy_version"]))
    assert por_anio == {2020: TAXONOMY_LEGACY, 2024: TAXONOMY_2024}


def test_filas_sin_clave_primaria_descartadas(tmp_path):
    cp = tmp_path / "checkpoint.jsonl"
    _write_jsonl(cp, [
        _row(),
        _row(anio=None),
        _row(comuna_id=None),
        _row(subgrupo_id=None),
        _row(anio="no-es-un-anio"),
    ])

    df = CeadConsolidator(checkpoint_path=cp).run()

    assert len(df) == 1
    assert df["comuna_id"].iloc[0] == "13101"


def test_valores_no_numericos_quedan_nulos_sin_descartar_la_fila(tmp_path):
    cp = tmp_path / "checkpoint.jsonl"
    _write_jsonl(cp, [_row(frecuencia=None, tasa_100k="s/i")])

    df = CeadConsolidator(checkpoint_path=cp).run()

    assert len(df) == 1
    assert pd.isna(df["frecuencia"].iloc[0])
    assert pd.isna(df["tasa_100k"].iloc[0])


def test_linea_jsonl_invalida_se_ignora(tmp_path):
    cp = tmp_path / "checkpoint.jsonl"
    _write_jsonl(cp, [_row(), "{esto no es json", "", _row(comuna_id="13102")])

    df = CeadConsolidator(checkpoint_path=cp).run()

    assert sorted(df["comuna_id"]) == ["13101", "13102"]


def test_checkpoint_inexistente_devuelve_vacio(tmp_path):
    df = CeadConsolidator(checkpoint_path=tmp_path / "no-existe.jsonl").run()

    assert df.empty
