# backend/etl/cead/mapper.py
"""
Fase 1: Extrae los códigos internos del portal CEAD via HTTP directo.
Parsea las respuestas AJAX (HTML + JSON) para obtener IDs de regiones,
comunas y categorías delictuales de drogas.

Ejecutar solo una vez (o cuando la taxonomía del portal cambie).
"""
import json
import re
import logging
import asyncio
import httpx
from pathlib import Path

from etl.cead.config import (
    CEAD_AJAX_URL,
    CODIGOS_JSON,
)

logger = logging.getLogger(__name__)

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
    "X-Requested-With": "XMLHttpRequest",
    "Referer": "https://cead.minsegpublica.gob.cl/estadisticas-delictuales/",
}

# IDs de drogas confirmados via ingeniería inversa del portal CEAD
FAMILIA_DROGAS_ID = "4"
GRUPO_DROGAS_ID = "401"         # Crímenes y simples delitos ley de drogas
GRUPO_INCIVILIDADES_ID = "702"  # Consumo de alcohol y drogas en vía pública

SUBGRUPOS_DROGAS = {
    "40101": "Tráfico de sustancias",
    "40102": "Microtráfico de sustancias",
    "40103": "Elaboración o producción de sustancias",
    "40104": "Otras infracciones a la ley de drogas",
    "70201": "Consumo de drogas en la vía pública",
    "70202": "Porte de drogas",
    "70204": "Consumo de alcohol en la vía pública",
}

REGIONES = [
    {"id": "99", "nombre": "TOTAL PAÍS"},
    {"id": "15", "nombre": "Región de Arica y Parinacota"},
    {"id": "1", "nombre": "Región de Tarapacá"},
    {"id": "2", "nombre": "Región de Antofagasta"},
    {"id": "3", "nombre": "Región de Atacama"},
    {"id": "4", "nombre": "Región de Coquimbo"},
    {"id": "5", "nombre": "Región de Valparaíso"},
    {"id": "13", "nombre": "Región Metropolitana"},
    {"id": "6", "nombre": "Región del Lib. Bernardo O'Higgins"},
    {"id": "7", "nombre": "Región del Maule"},
    {"id": "16", "nombre": "Región de Ñuble"},
    {"id": "8", "nombre": "Región del Biobío"},
    {"id": "9", "nombre": "Región de La Araucanía"},
    {"id": "14", "nombre": "Región de Los Ríos"},
    {"id": "10", "nombre": "Región de Los Lagos"},
    {"id": "11", "nombre": "Región de Aysén"},
    {"id": "12", "nombre": "Región de Magallanes"},
]

# Los 7 subgrupos de drogas que el observatorio requiere capturar
SUBGRUPOS_REQUERIDOS = {
    "Tráfico de sustancias",
    "Microtráfico de sustancias",
    "Elaboración o producción de sustancias",
    "Otras infracciones a la ley de drogas",
    "Consumo de drogas en la vía pública",
    "Porte de drogas",
    "Consumo de alcohol en la vía pública",
}


def _parse_items_html(html: str) -> list[dict]:
    """Extrae id y nombre de divs con data-value del HTML del portal."""
    pattern = r'data-value="([^"]+)"[^>]*>(?:<[^>]+>)*([^<]+)<'
    matches = re.findall(pattern, html)
    return [{"id": m[0], "nombre": m[1].strip()} for m in matches]


def _parse_json_array(arr: list) -> list[dict]:
    """Parsea arrays mixtos (strings JSON u objetos) como los de familias."""
    result = []
    for item in arr:
        obj = json.loads(item) if isinstance(item, str) else item
        id_val = (
            obj.get("familiaId") or obj.get("grupoId")
            or obj.get("regId") or obj.get("provId")
            or obj.get("subgrupoId") or ""
        )
        name_val = (
            obj.get("familiaNombre") or obj.get("grupoNombre")
            or obj.get("regNombre") or obj.get("provNombre")
            or obj.get("subgrupoNombre") or ""
        )
        if id_val and name_val:
            result.append({"id": str(id_val), "nombre": name_val})
    return result


async def _fetch(client: httpx.AsyncClient, payload: dict) -> dict:
    resp = await client.post(CEAD_AJAX_URL, data=payload, headers=HEADERS, timeout=30)
    resp.raise_for_status()
    return resp.json()


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
            "Verificar IDs en mapper.py o re-ejecutar build_codigos_json.py."
        )
    logger.info("✓ Todos los 7 subgrupos requeridos están presentes en codigos_cead.json")


async def run_mapper() -> dict:
    """Extrae códigos del portal CEAD via HTTP y persiste codigos_cead.json."""
    async with httpx.AsyncClient() as client:
        logger.info("Obteniendo regiones y comunas (seleccion=1)...")
        data1 = await _fetch(client, {"seleccion": 1})

        logger.info("Obteniendo familias y grupos (seleccion=9)...")
        data9 = await _fetch(client, {"seleccion": 9})

    # Comunas y provincias desde HTML
    comunas = _parse_items_html(data1.get("opcionComunas", ""))
    logger.info(f"Capturadas {len(comunas)} comunas")

    # Familias (solo la de drogas)
    familias_all = _parse_json_array(data9.get("familias", []))
    familias_drogas = [f for f in familias_all if f["id"] == FAMILIA_DROGAS_ID]
    if not familias_drogas:
        familias_drogas = [{"id": FAMILIA_DROGAS_ID, "nombre": "Delitos asociados a drogas"}]

    # Grupos (solo los de drogas)
    grupos_html = data9.get("opcionGrupos", "")
    grupos_all = _parse_items_html(grupos_html)
    grupos_drogas = [g for g in grupos_all if g["id"] in (GRUPO_DROGAS_ID, GRUPO_INCIVILIDADES_ID)]
    if not grupos_drogas:
        grupos_drogas = [{"id": GRUPO_DROGAS_ID, "nombre": "Crímenes y simples delitos ley de drogas"}]

    # Subgrupos — hardcodeados (IDs confirmados via ingeniería inversa)
    subgrupos_drogas = [{"id": k, "nombre": v} for k, v in SUBGRUPOS_DROGAS.items()]

    codigos = {
        "regiones": REGIONES,
        "familias_drogas": familias_drogas,
        "grupos_drogas": grupos_drogas,
        "subgrupos_drogas": subgrupos_drogas,
        "comunas": comunas,
    }

    CODIGOS_JSON.parent.mkdir(parents=True, exist_ok=True)
    with open(CODIGOS_JSON, "w", encoding="utf-8") as f:
        json.dump(codigos, f, ensure_ascii=False, indent=2)
    logger.info(f"Códigos guardados en {CODIGOS_JSON}")

    return codigos
