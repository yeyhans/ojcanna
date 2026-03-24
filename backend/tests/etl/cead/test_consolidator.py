# backend/tests/etl/cead/test_consolidator.py
import pytest
import pandas as pd
from io import BytesIO

from etl.cead.consolidator import CeadConsolidator
from etl.cead.config import TAXONOMY_LEGACY, TAXONOMY_2024


def _make_excel(rows: list[dict]) -> bytes:
    """Crea un Excel en memoria con las columnas del CEAD."""
    df = pd.DataFrame(rows)
    buf = BytesIO()
    df.to_excel(buf, index=False)
    return buf.getvalue()


@pytest.fixture
def sample_excel_2024():
    return _make_excel([
        {
            "Region": "Metropolitana de Santiago",
            "Provincia": "Santiago",
            "Comuna": "Santiago",
            "Anio": 2024,
            "Mes": 3,
            "Subgrupo": "Microtráfico de sustancias",
            "Grupo": "Crímenes y simples delitos ley de drogas",
            "Familia": "Delitos asociados a drogas",
            "Tipo": "Denuncias",
            "Frecuencia": 42,
            "Tasa": 15.3,
        }
    ])


def test_normalizar_columnas(sample_excel_2024):
    consolidator = CeadConsolidator.__new__(CeadConsolidator)
    df = pd.read_excel(BytesIO(sample_excel_2024))
    result = consolidator._normalizar(df, anio=2024)
    assert "taxonomy_version" in result.columns
    assert result["taxonomy_version"].iloc[0] == TAXONOMY_2024


def test_taxonomy_legacy_pre2024():
    consolidator = CeadConsolidator.__new__(CeadConsolidator)
    df = pd.DataFrame([{
        "Region": "Valparaíso", "Provincia": "Valparaíso",
        "Comuna": "Valparaíso", "Anio": 2020, "Mes": None,
        "Subgrupo": "Ley de drogas", "Grupo": None, "Familia": None,
        "Tipo": "Detenciones", "Frecuencia": 10, "Tasa": 5.0,
    }])
    result = consolidator._normalizar(df, anio=2020)
    assert result["taxonomy_version"].iloc[0] == TAXONOMY_LEGACY


def test_filas_invalidas_descartadas():
    consolidator = CeadConsolidator.__new__(CeadConsolidator)
    df = pd.DataFrame([
        {"Region": None, "Provincia": None, "Comuna": None,
         "Anio": None, "Mes": None, "Subgrupo": None,
         "Grupo": None, "Familia": None, "Tipo": None,
         "Frecuencia": None, "Tasa": None},
    ])
    result = consolidator._normalizar(df, anio=2024)
    assert len(result) == 0


def test_anio_inyectado_desde_filename():
    """Si el Excel no tiene columna Anio, el valor se inyecta desde el nombre del archivo."""
    consolidator = CeadConsolidator.__new__(CeadConsolidator)
    df = pd.DataFrame([{
        "Region": "Santiago", "Provincia": "Santiago",
        "Comuna": "Santiago", "Mes": 1,
        "Subgrupo": "Porte de drogas", "Grupo": None, "Familia": None,
        "Tipo": "Denuncias", "Frecuencia": 5, "Tasa": 2.1,
        # Sin columna "Anio"
    }])
    result = consolidator._normalizar(df, anio=2022)
    assert "anio" in result.columns
    assert result["anio"].iloc[0] == 2022
