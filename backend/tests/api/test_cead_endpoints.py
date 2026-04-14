# backend/tests/api/test_cead_endpoints.py
"""
Tests de integración para los endpoints de la API CEAD.
Requieren conexión a la base de datos Neon (tests de integración, no unitarios).
"""
import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

from api.database import create_pool
from api.main import app

BASE = "http://test"


@pytest_asyncio.fixture
async def client():
    # Inicializar el pool manualmente (lifespan no se dispara en ASGITransport)
    app.state.pool = await create_pool()
    # geom_cache requerido por endpoints /mapa/cead deprecados
    from api.routers.cead import load_geom_cache
    app.state.geom_cache = await load_geom_cache(app.state.pool)
    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url=BASE) as c:
            yield c
    finally:
        await app.state.pool.close()


@pytest.mark.asyncio
async def test_health(client):
    r = await client.get("/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}


@pytest.mark.asyncio
async def test_filtros_estructura(client):
    r = await client.get("/api/v1/cead/filtros")
    assert r.status_code == 200
    data = r.json()
    assert "anios" in data
    assert "subgrupos" in data
    assert len(data["subgrupos"]) == 7
    ids = {s["id"] for s in data["subgrupos"]}
    assert ids == {"40101", "40102", "40103", "40104", "70201", "70202", "70204"}


@pytest.mark.asyncio
async def test_filtros_anios(client):
    r = await client.get("/api/v1/cead/filtros")
    data = r.json()
    assert len(data["anios"]) > 0
    assert all(isinstance(a, int) for a in data["anios"])
    assert 2024 in data["anios"]


@pytest.mark.asyncio
async def test_mapa_feature_collection(client):
    r = await client.get("/api/v1/mapa/cead?anio=2024&subgrupos=40101")
    assert r.status_code == 200
    data = r.json()
    assert data["type"] == "FeatureCollection"
    assert "features" in data
    # Debe tener 344 comunas (346 menos 2 sin geometría GADM)
    assert len(data["features"]) == 344


@pytest.mark.asyncio
async def test_mapa_feature_estructura(client):
    r = await client.get("/api/v1/mapa/cead?anio=2024&subgrupos=40102")
    data = r.json()
    f = data["features"][0]
    assert f["type"] == "Feature"
    assert "geometry" in f
    assert f["geometry"]["type"] in ("MultiPolygon", "Polygon")
    props = f["properties"]
    assert "cut" in props and "nombre" in props
    assert "tasa_agregada" in props and "frecuencia_total" in props
    assert isinstance(props["frecuencia_total"], (int, float))


@pytest.mark.asyncio
async def test_mapa_multi_subgrupo(client):
    r = await client.get("/api/v1/mapa/cead?anio=2024&subgrupos=40101,40102,40103")
    assert r.status_code == 200
    assert len(r.json()["features"]) == 344


@pytest.mark.asyncio
async def test_mapa_anio_invalido(client):
    r = await client.get("/api/v1/mapa/cead?anio=1999&subgrupos=40101")
    assert r.status_code == 422


@pytest.mark.asyncio
async def test_mapa_subgrupo_invalido(client):
    r = await client.get("/api/v1/mapa/cead?anio=2024&subgrupos=99999")
    assert r.status_code == 422


@pytest.mark.asyncio
async def test_mapa_sin_subgrupos(client):
    r = await client.get("/api/v1/mapa/cead?anio=2024&subgrupos=")
    assert r.status_code == 422
