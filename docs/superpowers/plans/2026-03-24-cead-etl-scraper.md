# CEAD ETL Scraper — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir el pipeline ETL que descarga automáticamente las estadísticas de Ley de Drogas desde el portal CEAD para las 346 comunas de Chile (2005–2025) y las carga en PostgreSQL con trazabilidad de versión taxonómica.

**Architecture:** Pipeline de 3 fases: (1) Playwright intercepta el tráfico de red del portal CEAD para mapear los IDs internos dinámicos y guardarlos en JSON; (2) httpx asíncrono itera sobre todas las combinaciones comuna×año×subgrupo y descarga los datos; (3) pandas normaliza y carga en PostgreSQL con campo `taxonomy_version` para manejar el quiebre metodológico 2024.

**Tech Stack:** Python 3.10+, venv, Playwright, httpx, tenacity, pandas, SQLAlchemy, psycopg2, pytest, pydantic

---

## File Map

| Archivo | Responsabilidad |
|---|---|
| `backend/requirements.txt` | Dependencias Python del proyecto |
| `backend/etl/cead/config.py` | URLs, rutas, constantes de configuración |
| `backend/etl/cead/models.py` | Esquemas Pydantic para validar filas descargadas |
| `backend/etl/cead/mapper.py` | Fase 1: Playwright → intercepta red → `codigos_cead.json` |
| `backend/etl/cead/extractor.py` | Fase 2: httpx async → descarga masiva con checkpoint |
| `backend/etl/cead/consolidator.py` | Fase 3: pandas → normaliza → carga PostgreSQL |
| `backend/etl/cead/runner.py` | Orquestador Fase 1→2→3 |
| `backend/etl/cead/__init__.py` | Package marker |
| `backend/tests/etl/cead/test_models.py` | Tests de validación Pydantic |
| `backend/tests/etl/cead/test_extractor.py` | Tests del extractor (httpx mockeado) |
| `backend/tests/etl/cead/test_consolidator.py` | Tests del consolidador (DataFrames de prueba) |
| `backend/data/raw/.gitkeep` | Directorio para archivos descargados |
| `backend/logs/.gitkeep` | Directorio para logs |

---

## Task 1: Entorno Python con venv

**Files:**
- Create: `backend/requirements.txt`
- Create: `backend/.gitignore`

- [ ] **Step 1: Crear directorio base del backend**

```bash
mkdir -p backend/etl/cead backend/tests/etl/cead backend/data/raw backend/logs
touch backend/etl/__init__.py backend/etl/cead/__init__.py
touch backend/tests/__init__.py backend/tests/etl/__init__.py backend/tests/etl/cead/__init__.py
touch backend/data/raw/.gitkeep backend/logs/.gitkeep
```

- [ ] **Step 2: Crear el venv**

```bash
cd backend
python -m venv venv
```

- [ ] **Step 3: Crear `requirements.txt`**

```text
# Scraping
playwright==1.44.0
httpx==0.27.0
tenacity==8.3.0

# Data
pandas==2.2.2
openpyxl==3.1.2
pydantic==2.7.1

# Database
sqlalchemy==2.0.30
psycopg2-binary==2.9.9

# Testing
pytest==8.2.0
pytest-asyncio==0.23.7
respx==0.21.1

# Logging
rich==13.7.1
```

- [ ] **Step 4: Instalar dependencias**

```bash
# Desde backend/
venv/Scripts/pip install -r requirements.txt   # Windows
# o: venv/bin/pip install -r requirements.txt  # Linux/Mac

# Instalar browsers de Playwright
venv/Scripts/playwright install chromium
```

- [ ] **Step 5: Crear `.gitignore` del backend**

```gitignore
venv/
__pycache__/
*.pyc
.env
data/raw/
logs/
*.log
```

- [ ] **Step 6: Verificar instalación**

```bash
venv/Scripts/python -c "import playwright, httpx, pandas, pydantic; print('OK')"
```
Resultado esperado: `OK`

- [ ] **Step 7: Commit**

```bash
git add backend/requirements.txt backend/.gitignore backend/etl/ backend/tests/ backend/data/ backend/logs/
git commit -m "chore: scaffold backend ETL structure with venv"
```

---

## Task 2: Configuración y constantes (`config.py`)

**Files:**
- Create: `backend/etl/cead/config.py`

- [ ] **Step 1: Crear `config.py`**

```python
# backend/etl/cead/config.py
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent  # backend/

# Portal CEAD
CEAD_BASE_URL = "https://cead.minsegpublica.gob.cl"
CEAD_AJAX_URL = f"{CEAD_BASE_URL}/wp-content/themes/gobcl-wp-master/data/ajax_2.php"
CEAD_PORTAL_URL = f"{CEAD_BASE_URL}/estadisticas-delictuales/"

# Seleccion codes
SEL_REGION = 1
SEL_PROVINCIA = 2
SEL_COMUNA = 3
SEL_ANIO = 6
SEL_TRIMESTRE = 7
SEL_MES = 8
SEL_FAMILIA = 9
SEL_GRUPO = 10
SEL_SUBGRUPO = 11

# Años disponibles
ANIO_INICIO = 2005
ANIO_FIN = 2025

# Archivos de referencia
CODIGOS_JSON = BASE_DIR / "etl" / "cead" / "codigos_cead.json"
RAW_DATA_DIR = BASE_DIR / "data" / "raw"
CHECKPOINT_FILE = BASE_DIR / "data" / "checkpoint.jsonl"
LOG_FILE = BASE_DIR / "logs" / "cead_etl.log"

# HTTP
HTTP_TIMEOUT = 30.0
MAX_CONCURRENT_REQUESTS = 5
MAX_RETRIES = 3

# Taxonomía
TAXONOMY_LEGACY = "DMCS_legacy"
TAXONOMY_2024 = "Taxonomia_2024"
TAXONOMY_CUTOFF_YEAR = 2024
```

- [ ] **Step 2: Verificar imports**

```bash
venv/Scripts/python -c "from etl.cead.config import CEAD_AJAX_URL, CODIGOS_JSON; print(CEAD_AJAX_URL)"
```

- [ ] **Step 3: Commit**

```bash
git add backend/etl/cead/config.py
git commit -m "feat(cead): add configuration constants"
```

---

## Task 3: Modelos Pydantic con TDD (`models.py`)

**Files:**
- Create: `backend/etl/cead/models.py`
- Create: `backend/tests/etl/cead/test_models.py`

- [ ] **Step 1: Escribir test fallido**

```python
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
```

- [ ] **Step 2: Correr test — debe fallar**

```bash
cd backend
venv/Scripts/pytest tests/etl/cead/test_models.py -v
```
Resultado esperado: `ERROR` — `ModuleNotFoundError: No module named 'etl.cead.models'`

- [ ] **Step 3: Implementar `models.py`**

```python
# backend/etl/cead/models.py
from typing import Optional, Literal
from pydantic import BaseModel

TaxonomyVersion = Literal["DMCS_legacy", "Taxonomia_2024"]


class CeadHecho(BaseModel):
    anio: int
    mes: Optional[int] = None
    region_cod: str
    provincia_cod: str
    comuna_cod: str
    comuna_nombre: str
    subgrupo: Optional[str] = None
    grupo: Optional[str] = None
    familia: Optional[str] = None
    tipo_caso: Optional[str] = None
    frecuencia: Optional[int] = None
    tasa_100k: Optional[float] = None
    taxonomy_version: TaxonomyVersion


class CodigoItem(BaseModel):
    id: str
    nombre: str


class ComunaItem(BaseModel):
    id: str
    nombre: str
    region_id: str
    provincia_id: str


class CodigosMap(BaseModel):
    regiones: list[CodigoItem]
    familias_drogas: list[CodigoItem]
    grupos_drogas: list[CodigoItem] = []
    subgrupos_drogas: list[CodigoItem]
    comunas: list[ComunaItem]
```

- [ ] **Step 4: Correr test — debe pasar**

```bash
venv/Scripts/pytest tests/etl/cead/test_models.py -v
```
Resultado esperado: `4 passed`

- [ ] **Step 5: Commit**

```bash
git add backend/etl/cead/models.py backend/tests/etl/cead/test_models.py
git commit -m "feat(cead): add Pydantic models with tests"
```

---

## Task 4: Mapper Playwright — Fase 1 (`mapper.py`)

El mapper usa Playwright para abrir el portal, interactuar con el formulario y capturar mediante intercepción de red los IDs internos de regiones, provincias, comunas y categorías de drogas.

**Files:**
- Create: `backend/etl/cead/mapper.py`

- [ ] **Step 1: Crear `mapper.py`**

```python
# backend/etl/cead/mapper.py
"""
Fase 1: Usa Playwright para interceptar el tráfico AJAX del portal CEAD
y extraer los códigos internos (IDs) de regiones, provincias, comunas
y categorías delictuales de drogas.

Ejecutar solo una vez (o cuando la taxonomía del portal cambie).
"""
import json
import logging
import asyncio
from pathlib import Path
from playwright.async_api import async_playwright, Request

from etl.cead.config import (
    CEAD_PORTAL_URL,
    CEAD_AJAX_URL,
    CODIGOS_JSON,
    SEL_REGION,
    SEL_PROVINCIA,
    SEL_COMUNA,
    SEL_FAMILIA,
    SEL_GRUPO,
    SEL_SUBGRUPO,
)

logger = logging.getLogger(__name__)


class CeadMapper:
    def __init__(self):
        self._captured: dict = {
            "regiones": [],
            "provincias": [],
            "comunas": [],
            "familias_drogas": [],
            "grupos_drogas": [],
            "subgrupos_drogas": [],
        }

    async def _handle_response(self, response) -> None:
        """Intercepta respuestas AJAX y extrae datos de listas."""
        if CEAD_AJAX_URL not in response.url:
            return
        try:
            data = await response.json()
        except Exception:
            return

        # El portal retorna arrays de objetos con distintas claves según seleccion
        if isinstance(data, list) and data:
            first = data[0]
            if "rId" in first or "regId" in first:
                self._captured["regiones"] = data
                logger.info(f"Capturadas {len(data)} regiones")
            elif "provId" in first:
                self._captured["provincias"].extend(data)
            elif "comunaId" in first or "comId" in first:
                self._captured["comunas"].extend(data)
            elif "familiaId" in first:
                self._captured["familias_drogas"] = data
                logger.info(f"Capturadas {len(data)} familias")
            elif "grupoId" in first:
                self._captured["grupos_drogas"] = data
            elif "subgrupoId" in first or "subgrupoDelId" in first:
                self._captured["subgrupos_drogas"].extend(data)

    async def run(self) -> dict:
        """Abre el portal CEAD y navega para capturar todos los códigos."""
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page()
            page.on("response", lambda r: asyncio.create_task(self._handle_response(r)))

            logger.info("Navegando al portal CEAD...")
            await page.goto(CEAD_PORTAL_URL, wait_until="networkidle")

            # 1. Disparar carga de regiones haciendo click en el selector de territorio
            await page.click("text=Territorio")
            await page.wait_for_timeout(2000)

            # 2. Iterar TODAS las regiones para capturar provincias y comunas
            region_items = await page.query_selector_all("[data-rid], [data-regid]")
            logger.info(f"Encontrados {len(region_items)} elementos de región en DOM")
            for item in region_items:  # Iterar las 16 regiones completas
                await item.click()
                await page.wait_for_timeout(800)

            # 3. Disparar carga de familias de drogas
            await page.click("text=Tipo de delito")
            await page.wait_for_timeout(2000)

            await browser.close()

        codigos = self._normalizar()
        self._guardar(codigos)
        return codigos

    def _normalizar(self) -> dict:
        """Normaliza los datos capturados al esquema CodigosMap."""
        def to_item(obj: dict, id_keys: list, name_keys: list) -> dict:
            id_val = next((str(obj[k]) for k in id_keys if k in obj), "")
            name_val = next((obj[k] for k in name_keys if k in obj), "")
            return {"id": id_val, "nombre": name_val}

        return {
            "regiones": [
                to_item(r, ["rId", "regId"], ["rNombre", "regNombre", "nombre"])
                for r in self._captured["regiones"]
            ],
            "familias_drogas": [
                to_item(f, ["familiaId"], ["familiaNombre", "nombre"])
                for f in self._captured["familias_drogas"]
            ],
            "grupos_drogas": [
                to_item(g, ["grupoId"], ["grupoNombre", "nombre"])
                for g in self._captured["grupos_drogas"]
            ],
            "subgrupos_drogas": [
                to_item(s, ["subgrupoId", "subgrupoDelId"], ["subgrupoNombre", "nombre"])
                for s in self._captured["subgrupos_drogas"]
            ],
            "comunas": [
                {
                    "id": str(c.get("comunaId") or c.get("comId", "")),
                    "nombre": c.get("comunaNombre") or c.get("nombre", ""),
                    "region_id": str(c.get("rId") or c.get("regId", "")),
                    "provincia_id": str(c.get("provId", "")),
                }
                for c in self._captured["comunas"]
            ],
        }

    def _guardar(self, codigos: dict) -> None:
        CODIGOS_JSON.parent.mkdir(parents=True, exist_ok=True)
        with open(CODIGOS_JSON, "w", encoding="utf-8") as f:
            json.dump(codigos, f, ensure_ascii=False, indent=2)
        logger.info(f"Códigos guardados en {CODIGOS_JSON}")


async def run_mapper() -> dict:
    mapper = CeadMapper()
    return await mapper.run()
```

- [ ] **Step 2: Verificar import**

```bash
cd backend
venv/Scripts/python -c "from etl.cead.mapper import CeadMapper; print('OK')"
```
Resultado esperado: `OK`

- [ ] **Step 3: Commit**

```bash
git add backend/etl/cead/mapper.py
git commit -m "feat(cead): add Playwright mapper for portal code capture (Phase 1)"
```

---

## Task 5: Extractor httpx async — Fase 2 (`extractor.py`) con TDD

**Files:**
- Create: `backend/etl/cead/extractor.py`
- Create: `backend/tests/etl/cead/test_extractor.py`

- [ ] **Step 1: Escribir tests fallidos**

```python
# backend/tests/etl/cead/test_extractor.py
import json
import pytest
import pytest_asyncio
from pathlib import Path
from unittest.mock import AsyncMock, patch, MagicMock

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
    assert len(combinaciones) == 0  # ya descargado, no debe quedar nada pendiente
```

- [ ] **Step 2: Correr tests — deben fallar**

```bash
venv/Scripts/pytest tests/etl/cead/test_extractor.py -v
```
Resultado esperado: `ERROR` — `ModuleNotFoundError`

- [ ] **Step 3: Implementar `extractor.py`**

```python
# backend/etl/cead/extractor.py
"""
Fase 2: Extracción masiva de datos del portal CEAD usando httpx async.
Itera sobre todas las combinaciones: comunas × años × subgrupos de drogas.
Usa checkpoint para reanudar si el proceso se interrumpe.
"""
import json
import logging
import asyncio
from pathlib import Path
from datetime import datetime

import httpx
from tenacity import retry, stop_after_attempt, wait_exponential

from etl.cead.config import (
    CEAD_AJAX_URL,
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
)
from etl.cead.models import CodigosMap

logger = logging.getLogger(__name__)


class Checkpoint:
    def __init__(self, path: Path):
        self.path = path
        self._descargados: set = set()
        self._cargar()

    def _cargar(self):
        if self.path.exists():
            with open(self.path, "r") as f:
                for line in f:
                    d = json.loads(line.strip())
                    self._descargados.add((d["comuna_id"], d["anio"], d["subgrupo_id"]))

    def ya_descargado(self, comuna_id: str, anio: str, subgrupo_id: str) -> bool:
        return (comuna_id, anio, subgrupo_id) in self._descargados

    def marcar(self, comuna_id: str, anio: str, subgrupo_id: str) -> None:
        self._descargados.add((comuna_id, anio, subgrupo_id))
        with open(self.path, "a") as f:
            f.write(json.dumps({"comuna_id": comuna_id, "anio": anio, "subgrupo_id": subgrupo_id}) + "\n")


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
        """Retorna lista de (comuna, anio, subgrupo) aún no descargadas."""
        pendientes = []
        for comuna in self.codigos.comunas:
            for anio in anios:
                for subgrupo in self.codigos.subgrupos_drogas:
                    if not self.checkpoint.ya_descargado(comuna.id, str(anio), subgrupo.id):
                        pendientes.append((comuna, anio, subgrupo))
        return pendientes

    @retry(stop=stop_after_attempt(MAX_RETRIES), wait=wait_exponential(min=1, max=8))
    async def _post_cead(self, client: httpx.AsyncClient, payload: dict) -> bytes:
        resp = await client.post(CEAD_AJAX_URL, data=payload, timeout=HTTP_TIMEOUT)
        resp.raise_for_status()
        return resp.content

    async def _descargar_uno(
        self,
        sem: asyncio.Semaphore,
        client: httpx.AsyncClient,
        comuna,
        anio: int,
        subgrupo,
    ) -> None:
        async with sem:
            grupo_id = self.codigos.grupos_drogas[0].id if self.codigos.grupos_drogas else ""
            if not grupo_id:
                logger.warning("grupos_drogas vacío en codigos_cead.json — enviando grupoId vacío")
            payload = {
                "seleccion": 11,  # nivel subgrupo
                "comunaId": comuna.id,
                "anio": str(anio),
                "familiaId": self.codigos.familias_drogas[0].id,
                "grupoId": grupo_id,
                "subgrupoId": subgrupo.id,
            }
            try:
                content = await self._post_cead(client, payload)
                filename = f"{anio}_{comuna.id}_{subgrupo.id}.xlsx"
                (self.raw_dir / filename).write_bytes(content)
                self.checkpoint.marcar(comuna.id, str(anio), subgrupo.id)
                logger.debug(f"OK: {filename}")
            except Exception as e:
                logger.error(f"FALLO: comuna={comuna.id} anio={anio} subgrupo={subgrupo.id}: {e}")

    async def run(self, anios: list[int] | None = None) -> None:
        if anios is None:
            anios = list(range(ANIO_INICIO, ANIO_FIN + 1))

        pendientes = self._pendientes(anios)
        logger.info(f"Combinaciones pendientes: {len(pendientes)}")

        sem = asyncio.Semaphore(MAX_CONCURRENT_REQUESTS)
        async with httpx.AsyncClient() as client:
            tasks = [
                self._descargar_uno(sem, client, c, a, s)
                for c, a, s in pendientes
            ]
            await asyncio.gather(*tasks)

        logger.info("Extracción completada.")
```

- [ ] **Step 4: Correr tests — deben pasar**

```bash
venv/Scripts/pytest tests/etl/cead/test_extractor.py -v
```
Resultado esperado: `4 passed`

- [ ] **Step 5: Commit**

```bash
git add backend/etl/cead/extractor.py backend/tests/etl/cead/test_extractor.py
git commit -m "feat(cead): add async httpx extractor with checkpoint (Phase 2)"
```

---

## Task 6: Consolidador pandas → PostgreSQL — Fase 3 (`consolidator.py`) con TDD

**Files:**
- Create: `backend/etl/cead/consolidator.py`
- Create: `backend/tests/etl/cead/test_consolidator.py`

- [ ] **Step 1: Escribir tests fallidos**

```python
# backend/tests/etl/cead/test_consolidator.py
import pytest
import pandas as pd
from io import BytesIO
from unittest.mock import patch, MagicMock

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
```

- [ ] **Step 2: Correr tests — deben fallar**

```bash
venv/Scripts/pytest tests/etl/cead/test_consolidator.py -v
```
Resultado esperado: `ERROR` — `ModuleNotFoundError`

- [ ] **Step 3: Implementar `consolidator.py`**

```python
# backend/etl/cead/consolidator.py
"""
Fase 3: Lee los archivos Excel descargados, normaliza columnas,
añade taxonomy_version y carga en PostgreSQL.
"""
import logging
from pathlib import Path

import pandas as pd
from sqlalchemy import create_engine, text

from etl.cead.config import (
    RAW_DATA_DIR,
    TAXONOMY_LEGACY,
    TAXONOMY_2024,
    TAXONOMY_CUTOFF_YEAR,
)

logger = logging.getLogger(__name__)

# Mapeo flexible de columnas: nombres posibles → nombre normalizado
COLUMN_MAP = {
    "region": ["Region", "Región", "region", "región"],
    "provincia": ["Provincia", "provincia"],
    "comuna": ["Comuna", "comuna"],
    "anio": ["Anio", "Año", "anio", "año"],
    "mes": ["Mes", "mes"],
    "subgrupo": ["Subgrupo", "subgrupo"],
    "grupo": ["Grupo", "grupo"],
    "familia": ["Familia", "familia"],
    "tipo_caso": ["Tipo", "tipo", "TipoCaso"],
    "frecuencia": ["Frecuencia", "frecuencia", "Casos"],
    "tasa_100k": ["Tasa", "tasa", "Tasa100k"],
}


class CeadConsolidator:
    def __init__(self, raw_dir: Path = RAW_DATA_DIR, db_url: str | None = None):
        self.raw_dir = raw_dir
        self.db_url = db_url

    def _normalizar(self, df: pd.DataFrame, anio: int) -> pd.DataFrame:
        """Renombra columnas, añade taxonomy_version y descarta filas vacías."""
        rename = {}
        for target, candidates in COLUMN_MAP.items():
            for c in candidates:
                if c in df.columns:
                    rename[c] = target
                    break
        df = df.rename(columns=rename)

        # Si el Excel no tiene columna 'anio', se usa el valor del nombre de archivo
        if "anio" not in df.columns:
            df["anio"] = anio

        required = ["comuna", "anio"]
        df = df.dropna(subset=[c for c in required if c in df.columns])
        if df.empty:
            return df

        df["taxonomy_version"] = TAXONOMY_2024 if anio >= TAXONOMY_CUTOFF_YEAR else TAXONOMY_LEGACY
        return df

    def _leer_excel(self, path: Path) -> pd.DataFrame | None:
        try:
            # El año está codificado en el nombre del archivo: ANIO_comunaId_subgrupoId.xlsx
            anio = int(path.stem.split("_")[0])
            df = pd.read_excel(path)
            return self._normalizar(df, anio)
        except Exception as e:
            logger.error(f"Error leyendo {path.name}: {e}")
            return None

    def run(self) -> pd.DataFrame:
        archivos = list(self.raw_dir.glob("*.xlsx"))
        logger.info(f"Consolidando {len(archivos)} archivos Excel...")

        frames = []
        for archivo in archivos:
            df = self._leer_excel(archivo)
            if df is not None and not df.empty:
                frames.append(df)

        if not frames:
            logger.warning("No se encontraron datos para consolidar.")
            return pd.DataFrame()

        consolidado = pd.concat(frames, ignore_index=True)
        logger.info(f"Total filas consolidadas: {len(consolidado)}")

        if self.db_url:
            self._cargar_postgresql(consolidado)

        return consolidado

    def _cargar_postgresql(self, df: pd.DataFrame) -> None:
        engine = create_engine(self.db_url)
        with engine.begin() as conn:
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS cead_hechos (
                    id               SERIAL PRIMARY KEY,
                    anio             SMALLINT NOT NULL,
                    mes              SMALLINT,
                    region_cod       VARCHAR(3),
                    provincia_cod    VARCHAR(5),
                    comuna_cod       VARCHAR(6) NOT NULL,
                    comuna_nombre    VARCHAR(100) NOT NULL,
                    subgrupo         VARCHAR(100),
                    grupo            VARCHAR(100),
                    familia          VARCHAR(100),
                    tipo_caso        VARCHAR(20),
                    frecuencia       INTEGER,
                    tasa_100k        NUMERIC(10,4),
                    taxonomy_version VARCHAR(20) NOT NULL,
                    descargado_en    TIMESTAMPTZ DEFAULT NOW(),
                    UNIQUE (anio, mes, comuna_cod, subgrupo, tipo_caso, taxonomy_version)
                )
            """))
        # Usar tabla temporal + INSERT ... ON CONFLICT DO NOTHING para evitar duplicados en re-ejecuciones
        df.to_sql("cead_hechos_staging", engine, if_exists="replace", index=False)
        with engine.begin() as conn:
            conn.execute(text("""
                INSERT INTO cead_hechos (anio, mes, region_cod, provincia_cod, comuna_cod,
                    comuna_nombre, subgrupo, grupo, familia, tipo_caso, frecuencia, tasa_100k, taxonomy_version)
                SELECT anio, mes, region_cod, provincia_cod, comuna_cod,
                    comuna_nombre, subgrupo, grupo, familia, tipo_caso, frecuencia, tasa_100k, taxonomy_version
                FROM cead_hechos_staging
                ON CONFLICT (anio, mes, comuna_cod, subgrupo, tipo_caso, taxonomy_version) DO NOTHING
            """))
            conn.execute(text("DROP TABLE IF EXISTS cead_hechos_staging"))
        logger.info(f"Cargadas {len(df)} filas en cead_hechos (ON CONFLICT DO NOTHING)")
```

- [ ] **Step 4: Correr tests — deben pasar**

```bash
venv/Scripts/pytest tests/etl/cead/test_consolidator.py -v
```
Resultado esperado: `3 passed`

- [ ] **Step 5: Commit**

```bash
git add backend/etl/cead/consolidator.py backend/tests/etl/cead/test_consolidator.py
git commit -m "feat(cead): add pandas consolidator with taxonomy versioning (Phase 3)"
```

---

## Task 7: Orquestador (`runner.py`) y configuración de logging

**Files:**
- Create: `backend/etl/cead/runner.py`

- [ ] **Step 1: Crear `runner.py`**

```python
# backend/etl/cead/runner.py
"""
Orquestador del pipeline ETL CEAD.
Ejecuta las 3 fases en secuencia:
  1. mapper.py   → captura códigos del portal (solo si no existe codigos_cead.json)
  2. extractor.py → descarga masiva de datos
  3. consolidator.py → normaliza y carga en PostgreSQL
"""
import asyncio
import logging
import sys
from pathlib import Path

from rich.logging import RichHandler

from etl.cead.config import CODIGOS_JSON, LOG_FILE
from etl.cead.mapper import run_mapper
from etl.cead.extractor import CeadExtractor
from etl.cead.consolidator import CeadConsolidator


def setup_logging():
    LOG_FILE.parent.mkdir(parents=True, exist_ok=True)
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(name)s %(levelname)s %(message)s",
        handlers=[
            RichHandler(rich_tracebacks=True),
            logging.FileHandler(LOG_FILE, encoding="utf-8"),
        ],
    )


async def main(db_url: str | None = None, remap: bool = False):
    setup_logging()
    logger = logging.getLogger("runner")

    # Fase 1: Mapper (solo si no existe el JSON o se fuerza remap)
    if remap or not CODIGOS_JSON.exists():
        logger.info("=== FASE 1: Mapeando códigos del portal CEAD ===")
        from etl.cead.mapper import validar_subgrupos
        codigos = await run_mapper()
        validar_subgrupos(codigos)  # Aborta si faltan subgrupos requeridos
        logger.info(f"Comunas capturadas: {len(codigos.get('comunas', []))}")
    else:
        if not CODIGOS_JSON.exists():
            raise FileNotFoundError(f"codigos_cead.json no encontrado: {CODIGOS_JSON}. Ejecutar con --remap.")
        logger.info(f"Fase 1 omitida — usando {CODIGOS_JSON}")

    # Fase 2: Extractor
    logger.info("=== FASE 2: Extracción masiva ===")
    extractor = CeadExtractor()
    await extractor.run()

    # Fase 3: Consolidador
    logger.info("=== FASE 3: Consolidación → PostgreSQL ===")
    consolidator = CeadConsolidator(db_url=db_url)
    df = consolidator.run()
    logger.info(f"Pipeline completado. Filas totales: {len(df)}")


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="ETL CEAD — Observatorio Cannábico")
    parser.add_argument("--db-url", default=None, help="PostgreSQL connection URL")
    parser.add_argument("--remap", action="store_true", help="Forzar re-captura de códigos")
    args = parser.parse_args()

    asyncio.run(main(db_url=args.db_url, remap=args.remap))
```

- [ ] **Step 2: Verificar import**

```bash
venv/Scripts/python -c "from etl.cead.runner import main; print('OK')"
```
Resultado esperado: `OK`

- [ ] **Step 3: Correr suite completa de tests**

```bash
venv/Scripts/pytest tests/ -v
```
Resultado esperado: Todos los tests en verde.

- [ ] **Step 4: Commit**

```bash
git add backend/etl/cead/runner.py
git commit -m "feat(cead): add ETL orchestrator runner with logging"
```

---

## Task 8: Prueba de humo del Mapper (ejecución real)

Este paso requiere conexión real al portal CEAD. Su propósito es validar que la intercepción de red funciona y ajustar los selectores DOM si el portal ha cambiado.

- [ ] **Step 1: Ejecutar el mapper en modo debug**

```bash
cd backend
venv/Scripts/python -c "
import asyncio, logging, json
logging.basicConfig(level=logging.DEBUG)
from etl.cead.mapper import run_mapper
codigos = asyncio.run(run_mapper())
print(json.dumps(codigos, ensure_ascii=False, indent=2)[:2000])
"
```

- [ ] **Step 2: Validar que los 7 subgrupos requeridos están capturados**

Ejecutar la validación programática:

```python
# backend/etl/cead/mapper.py — agregar esta función al final del archivo
SUBGRUPOS_REQUERIDOS = {
    "Tráfico de sustancias",
    "Microtráfico de sustancias",
    "Elaboración o producción de sustancias",  # incluye Cultivo
    "Otras infracciones a la ley de drogas",
    "Consumo de alcohol y drogas en la vía pública",
    "Consumo de drogas en la vía pública",
    "Porte de drogas",
}

def validar_subgrupos(codigos: dict) -> None:
    capturados = {s["nombre"] for s in codigos.get("subgrupos_drogas", [])}
    faltantes = SUBGRUPOS_REQUERIDOS - capturados
    if faltantes:
        raise ValueError(f"Subgrupos requeridos NO capturados: {faltantes}")
    logger.info("✓ Todos los subgrupos requeridos están presentes.")
```

Luego en `runner.py`, llamar `validar_subgrupos(codigos)` después de `run_mapper()` antes de pasar a Fase 2.

Verificar conteos básicos:
- `regiones`: 16 elementos
- `familias_drogas`: al menos 1 elemento
- `subgrupos_drogas`: al menos 7 elementos
- `comunas`: ~346 elementos

**Si el JSON contiene listas vacías o faltan subgrupos:**
- Opción A (selectores DOM): Abrir DevTools → Inspeccionar el panel de filtros → actualizar los selectores `[data-rid]` en `mapper.py`
- Opción B (HTTP directo — más robusto): Usar DevTools → pestaña Network → filtrar por `ajax_2.php` → copiar la petición como cURL → replicarla con `httpx` directamente, sin Playwright, y poblar `codigos_cead.json` manualmente.

- [ ] **Step 3: Commit del JSON capturado**

```bash
git add backend/etl/cead/codigos_cead.json
git commit -m "data: add captured CEAD portal codes (mapper output)"
```

---

## Task 9: Prueba de descarga de muestra (1 comuna, 1 año)

Antes de la descarga masiva completa, validar con una muestra pequeña.

- [ ] **Step 1: Descarga de prueba — 1 comuna, solo 2024**

```bash
cd backend
venv/Scripts/python -c "
import asyncio, logging
logging.basicConfig(level=logging.INFO)
from etl.cead.extractor import CeadExtractor
extractor = CeadExtractor()
# Limitar a 1 sola comuna para prueba
extractor.codigos.comunas = extractor.codigos.comunas[:1]
asyncio.run(extractor.run(anios=[2024]))
"
```

- [ ] **Step 2: Inspeccionar el Excel descargado**

```bash
venv/Scripts/python -c "
import pandas as pd
from pathlib import Path
archivos = list(Path('data/raw').glob('*.xlsx'))
print(f'Archivos: {len(archivos)}')
if archivos:
    df = pd.read_excel(archivos[0])
    print(df.columns.tolist())
    print(df.head())
"
```

Documentar las columnas reales del Excel aquí. Si difieren del modelo, actualizar `COLUMN_MAP` en `consolidator.py`.

- [ ] **Step 3: Probar consolidador sobre la muestra**

```bash
venv/Scripts/python -c "
import logging
logging.basicConfig(level=logging.INFO)
from etl.cead.consolidator import CeadConsolidator
c = CeadConsolidator()
df = c.run()
print(df.dtypes)
print(df.head())
"
```

- [ ] **Step 4: Commit de ajustes al COLUMN_MAP si fue necesario**

```bash
git add backend/etl/cead/consolidator.py
git commit -m "fix(cead): adjust column mapping from real Excel inspection"
```

---

## Task 10: Descarga masiva completa

Una vez validada la muestra, ejecutar el pipeline completo.

- [ ] **Step 1: Ejecutar pipeline completo (sin carga a PostgreSQL)**

```bash
cd backend
venv/Scripts/python -m etl.cead.runner
```

El proceso es largo (~346 comunas × 21 años). El checkpoint garantiza que se puede interrumpir y reanudar.

- [ ] **Step 2: Verificar totales**

```bash
venv/Scripts/python -c "
from pathlib import Path
archivos = list(Path('data/raw').glob('*.xlsx'))
print(f'Total archivos descargados: {len(archivos)}')
"
```

- [ ] **Step 3: Consolidar y revisar estadísticas finales**

```bash
venv/Scripts/python -c "
import logging
logging.basicConfig(level=logging.INFO)
from etl.cead.consolidator import CeadConsolidator
c = CeadConsolidator()
df = c.run()
print(df['taxonomy_version'].value_counts())
print(df['anio'].value_counts().sort_index())
print(df['subgrupo'].value_counts())
"
```

- [ ] **Step 4: Commit del checkpoint final**

```bash
git add backend/data/checkpoint.jsonl
git commit -m "data: add completed download checkpoint"
```
