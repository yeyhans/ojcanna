"""
Prueba variantes de parámetros hasta obtener datos reales.
También parsea el HTML-como-Excel que ya recibimos.
"""
import asyncio
import re
import httpx

URL = "https://cead.minsegpublica.gob.cl/wp-content/themes/gobcl-wp-master/data/get_estadisticas_delictuales.php"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
    "X-Requested-With": "XMLHttpRequest",
    "Referer": "https://cead.minsegpublica.gob.cl/estadisticas-delictuales/",
}


def parse_html_table(html: str):
    """Extrae filas de una tabla HTML."""
    rows = []
    for tr in re.findall(r'<tr[^>]*>(.*?)</tr>', html, re.DOTALL):
        cells = re.findall(r'<t[hd][^>]*>(.*?)</t[hd]>', tr, re.DOTALL)
        cells = [re.sub(r'<[^>]+>', '', c).strip() for c in cells]
        if any(cells):
            rows.append(cells)
    return rows


async def try_payload(client, label, data):
    resp = await client.post(URL, data=data, headers=HEADERS, timeout=30)
    ct = resp.headers.get('content-type', '')
    size = len(resp.content)
    text = resp.text
    # Count data rows
    rows = parse_html_table(text)
    data_rows = [r for r in rows if any(c and c != '' for c in r)]
    # Check dexp2 hidden values
    dexp_vals = dict(re.findall(r'id="(dexp2_\w+)"\s+value="([^"]*)"', text))
    print(f"\n[{label}] size={size}, rows={len(data_rows)}, dexp2_anio={dexp_vals.get('dexp2_anio','?')!r}, dexp2_familia={dexp_vals.get('dexp2_familia','?')!r}")
    if data_rows:
        for r in data_rows[:5]:
            print(f"  {r}")
    return text, data_rows


async def main():
    async with httpx.AsyncClient() as client:
        # Variante 1: arrays con [] (como la forma Excel)
        await try_payload(client, "arrays[]", {
            "seleccion": "2", "medida": "2", "tipoVal": "1,2",
            "descarga": "false",
            "anio[]": "2024", "trimestre[]": "0", "mes[]": "0",
            "region[]": "13", "provincia[]": "131", "comuna[]": "13101",
            "familia[]": "4", "grupo[]": "401", "subgrupo[]": "40101",
            "region_nombres[]": "Región Metropolitana",
            "familia_nombres[]": "Delitos asociados a drogas",
            "grupo_nombres[]": "Crímenes y simples delitos ley de drogas",
            "subgrupo_nombres[]": "Tráfico de sustancias",
            "comuna_nombres[]": "Santiago",
        })

        # Variante 2: sin subgrupo (todos los delitos de la familia)
        await try_payload(client, "sin subgrupo", {
            "seleccion": "2", "medida": "2", "tipoVal": "1,2",
            "descarga": "false",
            "anio[]": "2024", "trimestre[]": "0", "mes[]": "0",
            "region[]": "13", "provincia[]": "131", "comuna[]": "13101",
            "familia[]": "4",
        })

        # Variante 3: seleccion=1 (unidadTerritorial) con subgrupo
        await try_payload(client, "seleccion=1", {
            "seleccion": "1", "medida": "2", "tipoVal": "1,2",
            "descarga": "false",
            "anio[]": "2024", "trimestre[]": "0", "mes[]": "0",
            "region[]": "13", "provincia[]": "131", "comuna[]": "13101",
            "familia[]": "4", "grupo[]": "401", "subgrupo[]": "40101",
        })

        # Variante 4: Qué pasa si no hay datos 2024 para ese subgrupo — probar 2023
        await try_payload(client, "anio=2023 arrays[]", {
            "seleccion": "2", "medida": "2", "tipoVal": "1,2",
            "descarga": "false",
            "anio[]": "2023", "trimestre[]": "0", "mes[]": "0",
            "region[]": "13", "provincia[]": "131", "comuna[]": "13101",
            "familia[]": "4", "grupo[]": "401", "subgrupo[]": "40101",
        })

        # Variante 5: Región entera sin filtro de commune
        await try_payload(client, "solo region 13", {
            "seleccion": "2", "medida": "2", "tipoVal": "1,2",
            "descarga": "false",
            "anio[]": "2024", "trimestre[]": "0", "mes[]": "0",
            "region[]": "13",
            "familia[]": "4", "grupo[]": "401",
        })

        # Variante 6: sin descarga (Excel) con arrays[]
        print("\n=== Excel con arrays[] ===")
        resp = await client.post(URL, data={
            "seleccion": "2", "medida": "2", "tipoVal": "1,2",
            "anio[]": "2024", "trimestre[]": "0", "mes[]": "0",
            "region[]": "13", "provincia[]": "131", "comuna[]": "13101",
            "familia[]": "4", "grupo[]": "401", "subgrupo[]": "40101",
        }, headers=HEADERS, timeout=30)
        ct = resp.headers.get('content-type', '')
        rows = parse_html_table(resp.text)
        data_rows = [r for r in rows if any(c and c != '' for c in r)]
        print(f"  size={len(resp.content)}, ct={ct!r}, rows={len(data_rows)}")
        for r in data_rows[:8]:
            print(f"  {r}")


asyncio.run(main())
