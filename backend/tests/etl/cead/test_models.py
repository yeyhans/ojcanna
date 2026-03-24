# backend/tests/etl/cead/test_models.py
import pytest
from pydantic import ValidationError
from etl.cead.models import CeadHecho, CodigosMap


def test_cead_hecho_valido():
    hecho = CeadHecho(
        anio=2024,
        mes=3,
        region_cod="13",
        provincia_cod="131",
        comuna_cod="13101",
        comuna_nombre="Santiago",
        subgrupo="Microtráfico de sustancias",
        grupo="Crímenes y simples delitos ley de drogas",
        familia="Delitos asociados a drogas",
        tipo_caso="Denuncias",
        frecuencia=42,
        tasa_100k=15.3,
        taxonomy_version="Taxonomia_2024",
    )
    assert hecho.anio == 2024
    assert hecho.tasa_100k == 15.3


def test_cead_hecho_taxonomy_invalida():
    with pytest.raises(ValidationError):
        CeadHecho(
            anio=2020,
            mes=None,
            region_cod="13",
            provincia_cod="131",
            comuna_cod="13101",
            comuna_nombre="Santiago",
            taxonomy_version="INVALIDA",  # debe fallar
        )


def test_cead_hecho_mes_opcional():
    hecho = CeadHecho(
        anio=2020,
        mes=None,  # dato anual, sin mes
        region_cod="13",
        provincia_cod="131",
        comuna_cod="13101",
        comuna_nombre="Santiago",
        taxonomy_version="DMCS_legacy",
    )
    assert hecho.mes is None


def test_codigos_map_estructura():
    data = {
        "regiones": [{"id": "1", "nombre": "Tarapacá"}],
        "familias_drogas": [{"id": "5", "nombre": "Delitos asociados a drogas"}],
        "subgrupos_drogas": [{"id": "12", "nombre": "Microtráfico de sustancias"}],
        "comunas": [{"id": "1101", "nombre": "Iquique", "region_id": "1", "provincia_id": "11"}],
    }
    codigos = CodigosMap(**data)
    assert len(codigos.regiones) == 1
    assert codigos.familias_drogas[0].nombre == "Delitos asociados a drogas"
