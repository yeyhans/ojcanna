"""
Prueba el payload EXACTO capturado del navegador.
"""
import asyncio
import re
import httpx

URL = "https://cead.minsegpublica.gob.cl/wp-content/themes/gobcl-wp-master/data/get_estadisticas_delictuales.php"
PORTAL = "https://cead.minsegpublica.gob.cl/estadisticas-delictuales/"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
    "X-Requested-With": "XMLHttpRequest",
    "Referer": PORTAL,
}

# Payload EXACTO del navegador
PAYLOAD_EXACT = {
    "medida":                "1",       # ← clave: era 2, el navegador usa 1
    "tipoVal":               "1,2",
    "anio[]":                "2024",
    "region[]":              "13",
    "region_nombres[]":      "Región Metropolitana",
    "provincia[]":           "131",
    "provincias_nombres[]":  "Provincia de Santiago",
    "familia[]":             "4",
    "familia_nombres[]":     "Delitos asociados a drogas",
    "grupo[]":               "401",
    "grupo_nombres[]":       "Crímenes y simples delitos ley de drogas",
    "subgrupo[]":            "40101",
    "subgrupo_nombres[]":    "Tráfico de sustancias",
    "seleccion":             "2",
    "descarga":              "false",
}


def parse_all_rows(html):
    rows = []
    for tr in re.findall(r'<tr[^>]*>(.*?)</tr>', html, re.DOTALL):
        cells = re.findall(r'<t[hd][^>]*>(.*?)</t[hd]>', tr, re.DOTALL)
        cells = [re.sub(r'<[^>]+>', '', c).strip() for c in cells]
        if any(c and c != '&nbsp;' for c in cells):
            rows.append(cells)
    return rows


async def main():
    async with httpx.AsyncClient(follow_redirects=True) as client:
        # Obtener cookie
        await client.get(PORTAL, headers={"User-Agent": HEADERS["User-Agent"]}, timeout=30)

        # 1. HTML table
        print("=== HTML table (payload exacto) ===")
        resp = await client.post(URL, data=PAYLOAD_EXACT, headers=HEADERS, timeout=30)
        rows = parse_all_rows(resp.text)
        print(f"size={len(resp.content)}, rows={len(rows)}")
        for r in rows[:15]:
            print(f"  {r}")

        # 2. Excel (sin descarga)
        print("\n=== Excel (sin descarga field) ===")
        payload_excel = {k: v for k, v in PAYLOAD_EXACT.items() if k != "descarga"}
        resp2 = await client.post(URL, data=payload_excel, headers=HEADERS, timeout=30)
        ct = resp2.headers.get('content-type', '')
        rows2 = parse_all_rows(resp2.text)
        print(f"size={len(resp2.content)}, ct={ct[:50]!r}, rows={len(rows2)}")
        for r in rows2[:30]:
            print(f"  {r}")

        # 3. Probar seleccion=1 (unidadTerritorial) — ¿da comunas?
        print("\n=== seleccion=1 (comunas como filas) ===")
        payload_s1 = {**PAYLOAD_EXACT, "seleccion": "1"}
        resp3 = await client.post(URL, data=payload_s1, headers=HEADERS, timeout=30)
        rows3 = parse_all_rows(resp3.text)
        print(f"size={len(resp3.content)}, rows={len(rows3)}")
        for r in rows3[:20]:
            print(f"  {r}")


asyncio.run(main())
