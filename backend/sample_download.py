"""
Descarga de muestra: 1 comuna (Santiago), año 2024, todos los subgrupos.
Inspecciona las cabeceras reales del Excel para validar COLUMN_MAP.
"""
import asyncio
import json
import logging
import httpx
import openpyxl
from pathlib import Path
from io import BytesIO

logging.basicConfig(level=logging.INFO)

AJAX_URL = "https://cead.minsegpublica.gob.cl/wp-content/themes/gobcl-wp-master/data/ajax_2.php"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
    "X-Requested-With": "XMLHttpRequest",
    "Referer": "https://cead.minsegpublica.gob.cl/estadisticas-delictuales/",
}
CODIGOS_JSON = Path(__file__).parent / "etl" / "cead" / "codigos_cead.json"

# Mapa de subgrupo → grupo correcto
SUBGRUPO_A_GRUPO = {
    "40101": "401", "40102": "401", "40103": "401", "40104": "401",
    "70201": "702", "70202": "702", "70204": "702",
}


async def descargar(client, familia_id, grupo_id, subgrupo_id, comuna_id, anio):
    payload = {
        "seleccion": 11,
        "comunaId": comuna_id,
        "anio": str(anio),
        "familiaId": familia_id,
        "grupoId": grupo_id,
        "subgrupoId": subgrupo_id,
    }
    resp = await client.post(AJAX_URL, data=payload, headers=HEADERS, timeout=30)
    resp.raise_for_status()
    return resp.content


async def main():
    with open(CODIGOS_JSON, encoding="utf-8") as f:
        codigos = json.load(f)

    familia_id = codigos["familias_drogas"][0]["id"]

    # Buscar Santiago (ID conocido: primera comuna de la RM)
    santiago = next(
        (c for c in codigos["comunas"] if "SANTIAGO" in c["nombre"].upper()),
        codigos["comunas"][0]
    )
    print(f"Comuna de prueba: {santiago['nombre']} (id={santiago['id']})")

    async with httpx.AsyncClient() as client:
        for subgrupo in codigos["subgrupos_drogas"]:
            grupo_id = SUBGRUPO_A_GRUPO.get(subgrupo["id"], "401")
            print(f"\n--- Subgrupo [{subgrupo['id']}] {subgrupo['nombre']} (grupo={grupo_id}) ---")

            content = await descargar(
                client, familia_id, grupo_id,
                subgrupo["id"], santiago["id"], 2024
            )

            if len(content) < 100:
                print(f"  Respuesta pequeña ({len(content)} bytes): {content[:200]}")
                continue

            # Inspeccionar Excel
            try:
                wb = openpyxl.load_workbook(BytesIO(content), read_only=True, data_only=True)
                ws = wb.active
                rows = list(ws.iter_rows(values_only=True))
                print(f"  Tamaño: {len(content)} bytes, {len(rows)} filas")
                if rows:
                    print(f"  Fila 1: {rows[0]}")
                if len(rows) > 1:
                    print(f"  Fila 2: {rows[1]}")
                if len(rows) > 2:
                    print(f"  Fila 3: {rows[2]}")
                wb.close()
            except Exception as e:
                print(f"  No es Excel válido: {e} — primeros bytes: {content[:50]}")


asyncio.run(main())
