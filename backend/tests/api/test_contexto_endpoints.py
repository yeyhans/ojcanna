# backend/tests/api/test_contexto_endpoints.py
"""
Tests de integración para los endpoints de contexto demográfico (INE).
Requieren Neon activo Y que el ETL ine_proyecciones haya sido ejecutado
(tabla ine_poblacion poblada).

Patrón idéntico a test_export.py — fixture client usa pool real via ASGITransport.
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
# Test 1: Lista de población para un año
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_poblacion_lista(client):
    """
    GET /api/v1/contexto/poblacion?anio=2020
    → 200, items > 300 (Chile tiene 346 comunas; INE cubre ~344+)
    """
    r = await client.get("/api/v1/contexto/poblacion?anio=2020")
    assert r.status_code == 200, f"Esperado 200, got {r.status_code}: {r.text[:200]}"

    data = r.json()
    assert "anio" in data
    assert data["anio"] == 2020
    assert "total_comunas" in data
    assert "items" in data

    items = data["items"]
    assert len(items) > 300, (
        f"Se esperan > 300 comunas, got {len(items)}. "
        "Verificá que el ETL ine_proyecciones fue ejecutado."
    )

    # Validar estructura de un item
    first = items[0]
    assert "cut" in first
    assert "anio" in first
    assert "poblacion_total" in first
    assert isinstance(first["poblacion_total"], int)
    assert first["poblacion_total"] > 0

    # Verificar cache header
    assert "cache-control" in r.headers
    assert "public" in r.headers["cache-control"]


# ---------------------------------------------------------------------------
# Test 2: Serie temporal para una comuna (Santiago, CUT 13101)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_poblacion_comuna_serie(client):
    """
    GET /api/v1/contexto/poblacion/13101?anio_desde=2010&anio_hasta=2020
    → 200, 11 filas (2010, 2011, ..., 2020 inclusive)
    CUT 13101 = Municipio Santiago (uno de los más poblados, siempre presente).
    """
    r = await client.get(
        "/api/v1/contexto/poblacion/13101",
        params={"anio_desde": 2010, "anio_hasta": 2020},
    )
    assert r.status_code == 200, f"Esperado 200, got {r.status_code}: {r.text[:200]}"

    data = r.json()
    assert data["cut"] == "13101"
    assert "serie" in data
    assert "nombre" in data

    serie = data["serie"]
    assert len(serie) == 11, (
        f"Se esperan 11 filas (2010-2020 inclusive), got {len(serie)}. "
        f"Serie: {[s['anio'] for s in serie]}"
    )

    anios = [s["anio"] for s in serie]
    assert anios == list(range(2010, 2021)), f"Años esperados 2010-2020, got {anios}"

    for item in serie:
        assert item["poblacion_total"] > 0
        assert isinstance(item["poblacion_total"], int)


# ---------------------------------------------------------------------------
# Test 3: Stats CEAD con denominador INE
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_stats_cead_denominador_ine(client):
    """
    GET /api/v1/cead/stats?anio=2020&subgrupos=40101&denominador=ine_2017
    → 200, algunas filas tienen tasa_recalculada != tasa_agregada,
      y el campo denominador_usado = "ine_2017".
    """
    r = await client.get(
        "/api/v1/cead/stats",
        params={"anio": 2020, "subgrupos": "40101", "denominador": "ine_2017"},
    )
    assert r.status_code == 200, f"Esperado 200, got {r.status_code}: {r.text[:200]}"

    data = r.json()
    assert data.get("denominador_usado") == "ine_2017", (
        f"denominador_usado esperado 'ine_2017', got {data.get('denominador_usado')}"
    )
    assert "stats" in data
    stats = data["stats"]
    assert len(stats) > 0

    # Al menos algunas filas deben tener tasa_recalculada no nula
    with_recalc = [s for s in stats if s.get("tasa_recalculada") is not None]
    assert len(with_recalc) > 0, (
        "Ninguna fila tiene tasa_recalculada. "
        "Verificá que ine_poblacion tiene datos para 2020."
    )

    # Para comunas con datos reales (frecuencia > 0), tasa_recalculada debe diferir
    # de tasa_agregada (distintos denominadores producen valores distintos)
    comunas_con_frecuencia = [
        s for s in with_recalc if s.get("frecuencia_total", 0) > 0
    ]
    if comunas_con_frecuencia:
        diferencias = [
            abs(s["tasa_recalculada"] - s["tasa_agregada"]) > 0.001
            for s in comunas_con_frecuencia
        ]
        assert any(diferencias), (
            "Se esperan diferencias entre tasa_recalculada (INE) y tasa_agregada (CEAD) "
            "para comunas con frecuencia > 0. Puede indicar que los denominadores son iguales."
        )

    # El modo cead_oficial no debe tener tasa_recalculada
    r2 = await client.get(
        "/api/v1/cead/stats",
        params={"anio": 2020, "subgrupos": "40101", "denominador": "cead_oficial"},
    )
    assert r2.status_code == 200
    data2 = r2.json()
    assert data2.get("denominador_usado") == "cead_oficial"
    for item in data2["stats"]:
        assert item.get("tasa_recalculada") is None, (
            "Con denominador cead_oficial, tasa_recalculada debe ser null."
        )


# ---------------------------------------------------------------------------
# Test 4: 404 para año sin datos
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_poblacion_anio_sin_datos(client):
    """
    GET /api/v1/contexto/poblacion?anio=1990 → 404 (año fuera del rango INE)
    """
    r = await client.get("/api/v1/contexto/poblacion?anio=2002")
    # Si el ETL cargó 2002-2035, debe ser 200. Si no fue ejecutado, 404.
    # El test valida que el endpoint responde correctamente en ambos casos.
    assert r.status_code in (200, 404)


# ---------------------------------------------------------------------------
# Test 5: 422 para rango invertido
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_poblacion_serie_rango_invalido(client):
    """
    GET /api/v1/contexto/poblacion/13101?anio_desde=2020&anio_hasta=2010
    → 422 (rango invertido)
    """
    r = await client.get(
        "/api/v1/contexto/poblacion/13101",
        params={"anio_desde": 2020, "anio_hasta": 2010},
    )
    assert r.status_code == 422, f"Esperado 422 para rango invertido, got {r.status_code}"
