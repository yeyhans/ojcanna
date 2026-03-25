"""
Prueba variantes de region/commune y muestra todos los rows del Excel.
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


def parse_table(html):
    rows = []
    for tr in re.findall(r'<tr[^>]*>(.*?)</tr>', html, re.DOTALL):
        cells = re.findall(r'<t[hd][^>]*>(.*?)</t[hd]>', tr, re.DOTALL)
        cells = [re.sub(r'<[^>]+>', '', c).strip() for c in cells]
        rows.append(cells)
    return rows


def get_dexp(html):
    return dict(re.findall(r'id="(dexp2_\w+)"\s+value="([^"]*)"', html))


async def test(client, label, data):
    resp = await client.post(URL, data=data, headers=HEADERS, timeout=30)
    ct = resp.headers.get('content-type', '')
    dexp = get_dexp(resp.text)
    rows = parse_table(resp.text)
    data_rows = [r for r in rows if any(c.strip() and c != '&nbsp;' for c in r)]
    print(f"\n{'='*50}")
    print(f"[{label}] size={len(resp.content)}, ct={ct[:40]!r}")
    print(f"  dexp2: anio={dexp.get('dexp2_anio','?')!r}, region={dexp.get('dexp2_region','?')!r}, "
          f"provincia={dexp.get('dexp2_provincia','?')!r}, familia={dexp.get('dexp2_familia','?')!r}, "
          f"subgrupo={dexp.get('dexp2_subgrupo','?')!r}")
    for r in data_rows[:25]:
        print(f"  {r}")


async def main():
    async with httpx.AsyncClient() as client:
        # 1. Mostrar todos los rows del Excel que ya funciona (sin descarga)
        print("=== Excel completo - ver todas las filas ===")
        resp = await client.post(URL, data={
            "seleccion": "2", "medida": "2", "tipoVal": "1,2",
            "anio[]": "2024", "trimestre[]": "0", "mes[]": "0",
            "region[]": "13", "provincia[]": "131", "comuna[]": "13101",
            "familia[]": "4", "grupo[]": "401", "subgrupo[]": "40101",
            "subgrupo_nombres[]": "Tráfico de sustancias",
        }, headers=HEADERS, timeout=30)
        rows = parse_table(resp.text)
        dexp = get_dexp(resp.text)
        print(f"dexp2: {dexp}")
        for i, r in enumerate(rows):
            print(f"  fila {i}: {r}")

        # 2. region como string (sin [])
        await test(client, "region=str, anio[]=arr", {
            "seleccion": "2", "medida": "2", "tipoVal": "1,2", "descarga": "false",
            "anio[]": "2024", "trimestre[]": "0", "mes[]": "0",
            "region": "13", "provincia": "131", "comuna": "13101",
            "familia[]": "4", "grupo[]": "401", "subgrupo[]": "40101",
        })

        # 3. Todo como strings (formato AJAX original)
        await test(client, "todo string (AJAX puro)", {
            "seleccion": "2", "medida": "2", "tipoVal": "1,2", "descarga": "false",
            "anio": "2024", "trimestre": "0", "mes": "0",
            "region": "13", "provincia": "131", "comuna": "13101",
            "familia": "4", "grupo": "401", "subgrupo": "40101",
        })

        # 4. Mixto: anio/familia/grupo/subgrupo como [] pero region/prov/comuna como string
        await test(client, "mixto", {
            "seleccion": "2", "medida": "2", "tipoVal": "1,2", "descarga": "false",
            "anio[]": "2024", "trimestre[]": "0", "mes[]": "0",
            "region": "13", "provincia": "131", "comuna": "13101",
            "familia[]": "4", "grupo[]": "401", "subgrupo[]": "40101",
        })

        # 5. Excel del mixto (sin descarga field)
        await test(client, "Excel mixto (sin descarga)", {
            "seleccion": "2", "medida": "2", "tipoVal": "1,2",
            "anio[]": "2024", "trimestre[]": "0", "mes[]": "0",
            "region": "13", "provincia": "131", "comuna": "13101",
            "familia[]": "4", "grupo[]": "401", "subgrupo[]": "40101",
        })


asyncio.run(main())
