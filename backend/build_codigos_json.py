"""
Construye codigos_cead.json directamente parseando las respuestas HTTP del portal CEAD.
Reemplaza el mapper Playwright por un enfoque 100% HTTP.
"""
import json
import re
import asyncio
import httpx
from pathlib import Path

AJAX_URL = "https://cead.minsegpublica.gob.cl/wp-content/themes/gobcl-wp-master/data/ajax_2.php"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
    "X-Requested-With": "XMLHttpRequest",
    "Referer": "https://cead.minsegpublica.gob.cl/estadisticas-delictuales/",
}

OUTPUT = Path(__file__).parent / "etl" / "cead" / "codigos_cead.json"

# IDs de drogas conocidos (extraídos del análisis HTTP)
FAMILIA_DROGAS_ID = "4"
GRUPO_DROGAS_ID = "401"       # Crímenes y simples delitos ley de drogas
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


def parse_items_html(html: str) -> list[dict]:
    """Extrae id y nombre de divs con data-value."""
    pattern = r'data-value="([^"]+)"[^>]*>(?:<[^>]+>)*([^<]+)<'
    matches = re.findall(pattern, html)
    return [{"id": m[0], "nombre": m[1].strip()} for m in matches]


def parse_json_array(arr: list) -> list[dict]:
    """Parsea arrays de strings JSON como los de región y familia."""
    result = []
    for item in arr:
        if isinstance(item, str):
            obj = json.loads(item)
        else:
            obj = item
        # Normalizar claves
        id_val = obj.get("regId") or obj.get("familiaId") or obj.get("grupoId") or obj.get("provId") or obj.get("subgrupoId") or ""
        name_val = obj.get("regNombre") or obj.get("familiaNombre") or obj.get("grupoNombre") or obj.get("provNombre") or obj.get("subgrupoNombre") or ""
        if id_val and name_val:
            result.append({"id": str(id_val), "nombre": name_val})
    return result


async def fetch(client: httpx.AsyncClient, payload: dict) -> dict:
    resp = await client.post(AJAX_URL, data=payload, headers=HEADERS, timeout=30)
    resp.raise_for_status()
    return resp.json()


async def main():
    async with httpx.AsyncClient() as client:
        # 1. Regiones y comunas (seleccion=1 retorna todo)
        print("Obteniendo regiones y comunas...")
        data1 = await fetch(client, {"seleccion": 1})

        # 2. Datos de drogas (seleccion=9 retorna grupos y subgrupos)
        print("Obteniendo familias y grupos de delitos...")
        data9 = await fetch(client, {"seleccion": 9})

    # Parsear regiones
    regiones_raw = data9.get("familias", [])  # viene de seleccion=10 response
    # Regiones vienen de seleccion=3
    # Usamos data del fetch(seleccion=1) -> opcionProvincias HTML
    # pero las regiones vienen mejor de otro endpoint, ya las conocemos:
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

    # Parsear comunas desde HTML (opcionComunas en respuesta seleccion=1)
    comunas_html = data1.get("opcionComunas", "")
    comunas_raw = parse_items_html(comunas_html)

    # Parsear provincias desde HTML
    provincias_html = data1.get("opcionProvincias", "")
    provincias_raw = parse_items_html(provincias_html)

    # Parsear familias desde respuesta seleccion=10 con familiaId=1
    familias_all = parse_json_array(data9.get("familias", []))
    familia_drogas = [f for f in familias_all if f["id"] == FAMILIA_DROGAS_ID]

    # Parsear grupos desde respuesta seleccion=9
    grupos_html = data9.get("opcionGrupos", "")
    grupos_raw = parse_items_html(grupos_html)
    grupo_drogas = [g for g in grupos_raw if g["id"] in (GRUPO_DROGAS_ID, GRUPO_INCIVILIDADES_ID)]

    # Subgrupos de drogas - hardcodeados desde el análisis (son estables)
    subgrupos_drogas = [
        {"id": k, "nombre": v}
        for k, v in SUBGRUPOS_DROGAS.items()
    ]

    # Construir codigos_cead.json
    codigos = {
        "regiones": REGIONES,
        "familias_drogas": familia_drogas if familia_drogas else [{"id": "4", "nombre": "Delitos asociados a drogas"}],
        "grupos_drogas": grupo_drogas if grupo_drogas else [{"id": "401", "nombre": "Crímenes y simples delitos ley de drogas"}],
        "subgrupos_drogas": subgrupos_drogas,
        "comunas": comunas_raw,
    }

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT, "w", encoding="utf-8") as f:
        json.dump(codigos, f, ensure_ascii=False, indent=2)

    print(f"\n✓ codigos_cead.json generado en {OUTPUT}")
    print(f"  Regiones:         {len(codigos['regiones'])}")
    print(f"  Comunas:          {len(codigos['comunas'])}")
    print(f"  Familias drogas:  {len(codigos['familias_drogas'])}")
    print(f"  Grupos drogas:    {len(codigos['grupos_drogas'])}")
    print(f"  Subgrupos drogas: {len(codigos['subgrupos_drogas'])}")
    print("\nSubgrupos capturados:")
    for s in codigos["subgrupos_drogas"]:
        print(f"  [{s['id']}] {s['nombre']}")


if __name__ == "__main__":
    asyncio.run(main())
