"""
Prueba: cookies + distintos años para encontrar dónde hay datos reales.
"""
import asyncio
import re
import httpx

PORTAL = "https://cead.minsegpublica.gob.cl/estadisticas-delictuales/"
URL = "https://cead.minsegpublica.gob.cl/wp-content/themes/gobcl-wp-master/data/get_estadisticas_delictuales.php"
HEADERS_AJAX = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
    "X-Requested-With": "XMLHttpRequest",
    "Referer": PORTAL,
}


def count_data_rows(html):
    """Cuenta filas de datos reales (no metadata ni encabezados)."""
    rows = []
    for tr in re.findall(r'<tr[^>]*>(.*?)</tr>', html, re.DOTALL):
        cells = re.findall(r'<t[hd][^>]*>(.*?)</t[hd]>', tr, re.DOTALL)
        cells = [re.sub(r'<[^>]+>', '', c).strip() for c in cells]
        if any(c and c != '&nbsp;' for c in cells):
            rows.append(cells)
    return rows


async def main():
    async with httpx.AsyncClient(follow_redirects=True) as client:
        # 1. GET portal para obtener cookies de sesión
        print("Obteniendo cookies del portal...")
        await client.get(PORTAL, headers={"User-Agent": HEADERS_AJAX["User-Agent"]}, timeout=30)
        print(f"Cookies: {dict(client.cookies)}")

        # 2. Probar distintos años con subgrupo 40101 (new taxonomy)
        print("\n=== Probando subgrupo=40101 por año (2019-2024) ===")
        for anio in ["2019", "2020", "2021", "2022", "2023", "2024"]:
            resp = await client.post(URL, data={
                "seleccion": "1", "medida": "2", "tipoVal": "1,2",
                "descarga": "false",
                "anio[]": anio, "trimestre[]": "0", "mes[]": "0",
                "familia[]": "4", "grupo[]": "401", "subgrupo[]": "40101",
            }, headers=HEADERS_AJAX, timeout=30)
            rows = count_data_rows(resp.text)
            print(f"  {anio}: {len(resp.content)} bytes, {len(rows)} rows → {rows[:3]}")

        # 3. Probar seleccion=2 (porDelito) distintos años — quizás muestra todos los subgrupos
        print("\n=== seleccion=2, familia=4, sin subgrupo (todos los delitos) ===")
        for anio in ["2022", "2023", "2024"]:
            resp = await client.post(URL, data={
                "seleccion": "2", "medida": "2", "tipoVal": "1,2",
                "descarga": "false",
                "anio[]": anio, "trimestre[]": "0", "mes[]": "0",
                "familia[]": "4",
            }, headers=HEADERS_AJAX, timeout=30)
            rows = count_data_rows(resp.text)
            print(f"  {anio}: {len(resp.content)} bytes, {len(rows)} rows → {rows[:3]}")

        # 4. Probar sin ningún filtro de delito — ¿devuelve datos?
        print("\n=== Sin filtro de delito, anio=2023 ===")
        resp = await client.post(URL, data={
            "seleccion": "1", "medida": "2", "tipoVal": "1,2",
            "descarga": "false",
            "anio[]": "2023", "trimestre[]": "0", "mes[]": "0",
        }, headers=HEADERS_AJAX, timeout=30)
        rows = count_data_rows(resp.text)
        print(f"  {len(resp.content)} bytes, {len(rows)} rows → {rows[:5]}")

        # 5. Excel sin filtro, ver si trae algo con cookies
        print("\n=== Excel sin filtro delito, anio=2023 ===")
        resp = await client.post(URL, data={
            "seleccion": "1", "medida": "2", "tipoVal": "1,2",
            "anio[]": "2023", "trimestre[]": "0", "mes[]": "0",
        }, headers=HEADERS_AJAX, timeout=30)
        rows = count_data_rows(resp.text)
        print(f"  {len(resp.content)} bytes, {len(rows)} rows")
        for r in rows[:15]:
            print(f"  {r}")


asyncio.run(main())
