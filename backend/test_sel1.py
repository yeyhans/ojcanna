"""
Prueba seleccion=1 (unidadTerritorial): muestra comunas como filas.
Si funciona, una sola llamada por año/subgrupo da datos de TODAS las comunas.
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


async def try_it(client, label, data, show_all=False):
    resp = await client.post(URL, data=data, headers=HEADERS, timeout=30)
    ct = resp.headers.get('content-type', '')
    rows = parse_table(resp.text)
    real_rows = [r for r in rows if any(c.strip() and c != '&nbsp;' for c in r)]
    print(f"\n{'='*60}")
    print(f"[{label}] size={len(resp.content)}, ct={ct[:40]!r}, total_rows={len(real_rows)}")
    limit = len(real_rows) if show_all else 25
    for r in real_rows[:limit]:
        print(f"  {r}")
    if len(real_rows) > limit:
        print(f"  ... ({len(real_rows) - limit} más)")


async def main():
    async with httpx.AsyncClient() as client:
        # 1. seleccion=1, anio[], sin filtro territorial (nacional)
        await try_it(client, "sel=1, anio[]=2024, nacional", {
            "seleccion": "1", "medida": "2", "tipoVal": "1,2", "descarga": "false",
            "anio[]": "2024", "trimestre[]": "0", "mes[]": "0",
            "familia[]": "4", "grupo[]": "401", "subgrupo[]": "40101",
            "subgrupo_nombres[]": "Tráfico de sustancias",
        })

        # 2. seleccion=1 sin grupo/subgrupo
        await try_it(client, "sel=1, solo familia[]", {
            "seleccion": "1", "medida": "2", "tipoVal": "1,2", "descarga": "false",
            "anio[]": "2024", "trimestre[]": "0", "mes[]": "0",
            "familia[]": "4",
        })

        # 3. seleccion=2 sin filtro territorial, ver si retorna algo
        await try_it(client, "sel=2, anio[]=2024, nacional", {
            "seleccion": "2", "medida": "2", "tipoVal": "1,2", "descarga": "false",
            "anio[]": "2024", "trimestre[]": "0", "mes[]": "0",
            "familia[]": "4", "grupo[]": "401",
        })

        # 4. Excel sel=1 — ¿retorna tabla de comunas?
        await try_it(client, "Excel sel=1, anio[]=2024", {
            "seleccion": "1", "medida": "2", "tipoVal": "1,2",
            "anio[]": "2024", "trimestre[]": "0", "mes[]": "0",
            "familia[]": "4", "grupo[]": "401", "subgrupo[]": "40101",
            "subgrupo_nombres[]": "Tráfico de sustancias",
        }, show_all=True)


asyncio.run(main())
