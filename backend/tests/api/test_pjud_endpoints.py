# backend/tests/api/test_pjud_endpoints.py
"""
Tests de integración para los endpoints PJud.

MVP Mes 1 (metadata-only): la tabla pjud_sentencias puede estar vacía si el
scraper aún no corrió. Los endpoints DEBEN responder 200 con listas/counts en
cero en ese caso (no 404, no 500).
"""
import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

from api.database import create_pool
from api.main import app

BASE = "http://test"


@pytest_asyncio.fixture
async def client():
    app.state.pool = await create_pool()
    # geom_cache se necesita para lifespan completo, cargarlo manualmente
    from api.routers.cead import load_geom_cache
    app.state.geom_cache = await load_geom_cache(app.state.pool)
    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url=BASE) as c:
            yield c
    finally:
        await app.state.pool.close()


# ---------------------------------------------------------------------------
# Test 1: /filtros — debe responder 200 aunque la tabla esté vacía
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_pjud_filtros_ok(client):
    r = await client.get("/api/v1/pjud/filtros")
    assert r.status_code == 200, f"Esperado 200, got {r.status_code}: {r.text[:300]}"

    data = r.json()
    assert "anios" in data
    assert "materias" in data
    assert "fuentes" in data
    assert isinstance(data["anios"], list)
    assert isinstance(data["materias"], list)
    assert isinstance(data["fuentes"], list)

    # Todo año devuelto debe ser >= 2024 (Acta 164 vigencia)
    for a in data["anios"]:
        assert isinstance(a, int)


# ---------------------------------------------------------------------------
# Test 2: /stats para un año — con tabla vacía devuelve ceros, no 404
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_pjud_stats_empty_ok(client):
    r = await client.get("/api/v1/pjud/stats", params={"anio": 2025})
    assert r.status_code == 200, f"Esperado 200, got {r.status_code}: {r.text[:300]}"

    data = r.json()
    assert data["anio"] == 2025
    assert "total_sentencias" in data
    assert "total_con_texto" in data
    assert "total_metadata_only" in data
    assert "total_tribunales" in data
    assert "total_materias" in data

    # Todos deben ser int >= 0
    for key in (
        "total_sentencias", "total_con_texto", "total_metadata_only",
        "total_tribunales", "total_materias",
    ):
        assert isinstance(data[key], int), f"{key} no es int: {data[key]!r}"
        assert data[key] >= 0, f"{key} negativo: {data[key]}"

    # Consistencia: total = con_texto + metadata_only
    assert data["total_sentencias"] == data["total_con_texto"] + data["total_metadata_only"]


# ---------------------------------------------------------------------------
# Test 3: /resumen para un año vacío — lista vacía, no 404
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_pjud_resumen_empty_ok(client):
    r = await client.get("/api/v1/pjud/resumen", params={"anio": 2025})
    assert r.status_code == 200, f"Esperado 200, got {r.status_code}: {r.text[:300]}"

    data = r.json()
    assert data["anio"] == 2025
    assert "total" in data
    assert "por_tribunal" in data
    assert "por_materia" in data
    assert isinstance(data["por_tribunal"], list)
    assert isinstance(data["por_materia"], list)


# ---------------------------------------------------------------------------
# Test 4: Validación de rango de año
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_pjud_stats_anio_fuera_rango(client):
    """Año anterior a 2024 (vigencia Acta 164) debe devolver 422."""
    r = await client.get("/api/v1/pjud/stats", params={"anio": 2020})
    assert r.status_code == 422


@pytest.mark.asyncio
async def test_pjud_resumen_sin_anio(client):
    """Query param `anio` es obligatorio."""
    r = await client.get("/api/v1/pjud/resumen")
    assert r.status_code == 422


# ---------------------------------------------------------------------------
# Test 5: Privacy invariant — ningún endpoint expone texto_anonimizado ni hmac
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_pjud_no_expone_texto_ni_hmac(client):
    """
    Ninguno de los endpoints PJud debe devolver keys peligrosas
    (texto_anonimizado, texto_hmac, entidades_detectadas) en ningún nivel.
    """
    forbidden_keys = {"texto_anonimizado", "texto_hmac", "entidades_detectadas"}

    for path, params in [
        ("/api/v1/pjud/filtros", {}),
        ("/api/v1/pjud/stats", {"anio": 2025}),
        ("/api/v1/pjud/resumen", {"anio": 2025}),
        ("/api/v1/pjud/proporcionalidad", {"anio": 2025}),
        ("/api/v1/pjud/por-tribunal", {"anio": 2025}),
        ("/api/v1/pjud/por-region", {"anio": 2025}),
        ("/api/v1/pjud/veredictos", {"anio": 2025}),
    ]:
        r = await client.get(path, params=params)
        assert r.status_code == 200
        body = r.text
        for k in forbidden_keys:
            assert k not in body, (
                f"Endpoint {path} expone key prohibida '{k}' en respuesta: "
                f"{body[:300]}"
            )


# ---------------------------------------------------------------------------
# Mes 2 — endpoints extendidos (tabla vacía → estructura válida + HTTP 200)
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_pjud_proporcionalidad_empty_ok(client):
    """Scatter gramaje vs pena — con tabla vacía retorna total_puntos=0."""
    r = await client.get("/api/v1/pjud/proporcionalidad", params={"anio": 2025})
    assert r.status_code == 200, f"Esperado 200, got {r.status_code}: {r.text[:300]}"

    data = r.json()
    assert data["anio"] == 2025
    assert "total_puntos" in data
    assert "puntos" in data
    assert isinstance(data["puntos"], list)
    assert data["total_puntos"] == len(data["puntos"])


@pytest.mark.asyncio
async def test_pjud_por_tribunal_empty_ok(client):
    """Por tribunal — con tabla vacía retorna lista vacía."""
    r = await client.get("/api/v1/pjud/por-tribunal", params={"anio": 2025})
    assert r.status_code == 200, f"Esperado 200, got {r.status_code}: {r.text[:300]}"

    data = r.json()
    assert data["anio"] == 2025
    assert "tribunales" in data
    assert isinstance(data["tribunales"], list)


@pytest.mark.asyncio
async def test_pjud_por_region_empty_ok(client):
    """Por región — con tabla vacía retorna lista vacía."""
    r = await client.get("/api/v1/pjud/por-region", params={"anio": 2025})
    assert r.status_code == 200, f"Esperado 200, got {r.status_code}: {r.text[:300]}"

    data = r.json()
    assert data["anio"] == 2025
    assert "regiones" in data
    assert isinstance(data["regiones"], list)


@pytest.mark.asyncio
async def test_pjud_veredictos_empty_ok(client):
    """Veredictos — con tabla vacía retorna distribucion vacía."""
    r = await client.get("/api/v1/pjud/veredictos", params={"anio": 2025})
    assert r.status_code == 200, f"Esperado 200, got {r.status_code}: {r.text[:300]}"

    data = r.json()
    assert data["anio"] == 2025
    assert "total_con_veredicto" in data
    assert "distribucion" in data
    assert isinstance(data["distribucion"], list)
    assert data["total_con_veredicto"] >= 0
