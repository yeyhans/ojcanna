"""
Extrae los valores de los inputs ocultos dexp* y el bloque completo del AJAX
a get_estadisticas_delictuales.php para entender los parámetros exactos.
"""
import asyncio
import re
import httpx

PORTAL_URL = "https://cead.minsegpublica.gob.cl/estadisticas-delictuales/"
HEADERS = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}

GET_URL = "get_estadisticas_delictuales.php"


async def main():
    async with httpx.AsyncClient(follow_redirects=True) as client:
        resp = await client.get(PORTAL_URL, headers=HEADERS, timeout=30)
        html = resp.text

    # 1. Todos los inputs con id que contengan "dexp"
    print("=== Inputs con id=dexp* ===")
    for m in re.finditer(r'<input[^>]*id=["\']dexp[^"\']*["\'][^>]*/?>|<input[^>]*/?>',  html):
        tag = m.group(0)
        if 'dexp' in tag:
            print(tag[:300])

    # 2. El bloque AJAX completo de get_estadisticas_delictuales.php (vista tabla)
    idx = html.find(GET_URL)
    while idx >= 0:
        block_start = html.rfind("jQuery.ajax", 0, idx)
        block_end = html.find("});", idx) + 3
        if block_start >= 0:
            print(f"\n=== AJAX block (pos {block_start}) ===")
            print(html[block_start:min(block_end, block_start + 2000)])
        idx = html.find(GET_URL, idx + 1)

    # 3. Buscar tipo_estadistica y medida
    print("\n=== tipo_estadistica, medida, tipoVal ===")
    for kw in ["tipo_estadistica", "valorTipo", "valor_medida", "medida"]:
        for m in re.finditer(re.escape(kw), html):
            start = max(0, m.start() - 20)
            end = min(len(html), m.end() + 200)
            snippet = html[start:end].strip()
            if len(snippet) < 250:
                print(f"  [{kw}]: {snippet}")

asyncio.run(main())
