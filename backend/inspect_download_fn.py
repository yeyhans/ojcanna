"""
Extrae el código JavaScript de descargarExcel() y el AJAX a get_estadisticas_delictuales.php
"""
import asyncio
import re
import httpx

PORTAL_URL = "https://cead.minsegpublica.gob.cl/estadisticas-delictuales/"
HEADERS = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}


async def main():
    async with httpx.AsyncClient(follow_redirects=True) as client:
        resp = await client.get(PORTAL_URL, headers=HEADERS, timeout=30)
        html = resp.text

    # Buscar función descargarExcel y su contexto completo
    idx = html.find("descargarExcel")
    if idx >= 0:
        print("=== Contexto descargarExcel (±2000 chars) ===")
        print(html[max(0, idx-100):idx+2000])

    # Buscar el bloque AJAX de get_estadisticas_delictuales.php
    print("\n=== Todos los bloques que mencionan get_estadisticas_delictuales ===")
    for m in re.finditer(r'get_estadisticas_delictuales', html):
        start = max(0, m.start() - 200)
        end = min(len(html), m.end() + 800)
        print(f"\n--- match en posición {m.start()} ---")
        print(html[start:end])
        print("---")


asyncio.run(main())
