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
from playwright.async_api import async_playwright

from etl.cead.config import (
    CEAD_PORTAL_URL,
    CEAD_AJAX_URL,
    CODIGOS_JSON,
)

logger = logging.getLogger(__name__)

# Los 7 subgrupos de drogas que el observatorio requiere capturar
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
    """Verifica que todos los subgrupos requeridos fueron capturados.

    Lanza ValueError si alguno falta — esto aborta el pipeline antes de
    la extracción masiva para evitar datos incompletos silenciosos.
    """
    capturados = {s["nombre"] for s in codigos.get("subgrupos_drogas", [])}
    faltantes = SUBGRUPOS_REQUERIDOS - capturados
    if faltantes:
        raise ValueError(
            f"Subgrupos requeridos NO capturados en codigos_cead.json: {faltantes}\n"
            "Revisar selectores DOM en mapper.py o usar HTTP directo via DevTools Network."
        )
    logger.info("✓ Todos los 7 subgrupos requeridos están presentes en codigos_cead.json")


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
