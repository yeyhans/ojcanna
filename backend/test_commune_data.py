"""
Verifica que commune[] da datos al nivel de comuna.
También construye el mapping commune→province→region desde #territorial-select.
"""
import asyncio
import re
import httpx

PORTAL = "https://cead.minsegpublica.gob.cl/estadisticas-delictuales/"
URL = "https://cead.minsegpublica.gob.cl/wp-content/themes/gobcl-wp-master/data/get_estadisticas_delictuales.php"
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
HEADERS = {
    "User-Agent": UA,
    "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
    "X-Requested-With": "XMLHttpRequest",
    "Referer": PORTAL,
}

KNOWN_REGION_IDS = {"99","15","1","2","3","4","5","13","6","7","16","8","9","14","10","11","12"}


def parse_rows(html):
    rows = []
    for tr in re.findall(r'<tr[^>]*>(.*?)</tr>', html, re.DOTALL):
        cells = re.findall(r'<t[hd][^>]*>(.*?)</t[hd]>', tr, re.DOTALL)
        cells = [re.sub(r'<[^>]+>', '', c).strip() for c in cells]
        if any(c and c != '&nbsp;' for c in cells):
            rows.append(cells)
    return rows


def build_territorial_map(portal_html):
    """Construye commune_id → {province_id, region_id} desde #territorial-select."""
    # Extraer todas las opciones de territorial-select
    m = re.search(r'<select[^>]*id=["\']territorial-select["\'][^>]*>(.*?)</select>',
                  portal_html, re.DOTALL)
    if not m:
        return {}
    options = re.findall(r'<option[^>]*value=["\']([^"\']+)["\'][^>]*>(.*?)</option>',
                         m.group(1), re.DOTALL)

    mapping = {}
    current_region = None
    current_province = None

    for val, text in options:
        val = val.strip()
        text = re.sub(r'<[^>]+>', '', text).strip()
        if not val or val == "99":
            continue
        if val in KNOWN_REGION_IDS:
            current_region = val
            current_province = None
        elif len(val) <= 3 and val not in KNOWN_REGION_IDS:
            # Province (2-3 digit code, not a region)
            current_province = val
        elif len(val) >= 4:
            # Commune
            mapping[val] = {
                "nombre": text,
                "provincia_id": current_province or "",
                "region_id": current_region or "",
            }
    return mapping


async def main():
    async with httpx.AsyncClient(follow_redirects=True) as client:
        # Obtener portal
        resp_portal = await client.get(PORTAL, headers={"User-Agent": UA}, timeout=30)
        portal_html = resp_portal.text

    # 1. Construir mapa territorial
    print("=== Construyendo mapa territorial ===")
    tmap = build_territorial_map(portal_html)
    print(f"Comunas mapeadas: {len(tmap)}")
    # Mostrar algunas de RM
    rm_comunas = {k: v for k, v in tmap.items() if v["region_id"] == "13"}
    print(f"Comunas en Región Metropolitana: {len(rm_comunas)}")
    for k, v in list(rm_comunas.items())[:5]:
        print(f"  {k}: {v}")

    async with httpx.AsyncClient(follow_redirects=True) as client:
        await client.get(PORTAL, headers={"User-Agent": UA}, timeout=30)

        # 2. Probar con comuna específica (Santiago 13101)
        com = tmap.get("13101", {})
        print(f"\n=== Datos para Santiago (13101): {com} ===")
        resp = await client.post(URL, data={
            "seleccion": "2", "medida": "1", "tipoVal": "1,2",
            "anio[]": "2024",
            "region[]": com.get("region_id", "13"),
            "region_nombres[]": "Región Metropolitana",
            "provincia[]": com.get("provincia_id", "131"),
            "provincias_nombres[]": "Provincia de Santiago",
            "comuna[]": "13101",
            "comuna_nombres[]": com.get("nombre", "Santiago"),
            "familia[]": "4",
            "familia_nombres[]": "Delitos asociados a drogas",
            "grupo[]": "401",
            "grupo_nombres[]": "Crímenes y simples delitos ley de drogas",
            "subgrupo[]": "40101",
            "subgrupo_nombres[]": "Tráfico de sustancias",
            "descarga": "false",
        }, headers=HEADERS, timeout=30)
        rows = parse_rows(resp.text)
        print(f"Rows: {rows}")

        # 3. Probar medida=2 (tasa)
        print("\n=== Tasa (medida=2) para Santiago ===")
        resp2 = await client.post(URL, data={
            "seleccion": "2", "medida": "2", "tipoVal": "1,2",
            "anio[]": "2024",
            "region[]": "13", "region_nombres[]": "Región Metropolitana",
            "provincia[]": "131", "provincias_nombres[]": "Provincia de Santiago",
            "comuna[]": "13101", "comuna_nombres[]": "Santiago",
            "familia[]": "4", "familia_nombres[]": "Delitos asociados a drogas",
            "grupo[]": "401", "grupo_nombres[]": "Crímenes y simples delitos ley de drogas",
            "subgrupo[]": "40101", "subgrupo_nombres[]": "Tráfico de sustancias",
            "descarga": "false",
        }, headers=HEADERS, timeout=30)
        rows2 = parse_rows(resp2.text)
        print(f"Rows: {rows2}")

        # 4. Probar año 2023 (legacy taxonomy)
        print("\n=== Año 2023 (legacy), Santiago ===")
        resp3 = await client.post(URL, data={
            "seleccion": "2", "medida": "2", "tipoVal": "1,2",
            "anio[]": "2023",
            "region[]": "13", "region_nombres[]": "Región Metropolitana",
            "provincia[]": "131", "provincias_nombres[]": "Provincia de Santiago",
            "familia[]": "4", "familia_nombres[]": "Delitos asociados a drogas",
            "grupo[]": "401", "grupo_nombres[]": "Crímenes y simples delitos ley de drogas",
            "subgrupo[]": "40101", "subgrupo_nombres[]": "Tráfico de sustancias",
            "descarga": "false",
        }, headers=HEADERS, timeout=30)
        rows3 = parse_rows(resp3.text)
        print(f"Rows: {rows3}")


asyncio.run(main())
