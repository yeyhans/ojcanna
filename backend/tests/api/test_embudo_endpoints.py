# backend/tests/api/test_embudo_endpoints.py
"""
Tests de integración para el endpoint del Embudo del Punitivismo.
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
    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url=BASE) as c:
            yield c
    finally:
        await app.state.pool.close()


@pytest.mark.asyncio
async def test_ranking_items_expose_peso_regional_pct(client):
    r = await client.get("/api/v1/embudo/ranking?anio=2024")
    assert r.status_code == 200
    data = r.json()
    assert "items" in data
    assert len(data["items"]) > 0

    for item in data["items"]:
        assert "peso_regional_pct" in item
        assert "es_estimado" in item
        assert item["es_estimado"] is True
        # 0 es válido cuando la región de la comuna no tiene datos DPP para el
        # año consultado (COALESCE a 0 en la SQL); en el resto de los casos
        # debe ser una fracción del peso nacional (0, 1].
        assert 0 <= item["peso_regional_pct"] <= 1

    # El peso regional es constante por región (mismo valor repetido para todas
    # las comunas de una región). Entre las regiones que sí tienen datos DPP,
    # cada peso debe ser estrictamente positivo.
    pesos_por_region = {item["region_id"]: item["peso_regional_pct"] for item in data["items"]}
    assert any(v > 0 for v in pesos_por_region.values())
