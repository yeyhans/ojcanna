"""
Inspecciona el HTML y JS del portal CEAD para encontrar el endpoint de descarga.
"""
import asyncio
import re
import httpx

PORTAL_URL = "https://cead.minsegpublica.gob.cl/estadisticas-delictuales/"
HEADERS = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}


async def main():
    async with httpx.AsyncClient(follow_redirects=True) as client:
        # 1. Buscar en la página principal
        resp = await client.get(PORTAL_URL, headers=HEADERS, timeout=30)
        html = resp.text

        print("=== Scripts y links relacionados con descarga/excel ===")
        for line in html.splitlines():
            line_lower = line.lower()
            if any(kw in line_lower for kw in ["excel", "descargar", "download", "export", "xlsx", "php", "ajax"]):
                print(line.strip()[:200])

        # 2. Extraer URLs de scripts JS embebidos
        print("\n=== URLs de scripts JS ===")
        js_urls = re.findall(r'src=["\']([^"\']+\.js[^"\']*)["\']', html)
        for url in js_urls:
            if not url.startswith("http"):
                url = "https://cead.minsegpublica.gob.cl" + url
            print(url)

        # 3. Buscar en el JS principal del tema por 'descargar', 'ajax', 'excel'
        print("\n=== Buscando en scripts JS relacionados ===")
        for url in js_urls:
            if not url.startswith("http"):
                url = "https://cead.minsegpublica.gob.cl" + url
            if any(kw in url.lower() for kw in ["estadistic", "cead", "custom", "main", "app"]):
                try:
                    js_resp = await client.get(url, headers=HEADERS, timeout=20)
                    js_text = js_resp.text
                    lines = js_text.splitlines()
                    for i, line in enumerate(lines):
                        if any(kw in line.lower() for kw in ["excel", "descargar", "download", "ajax_"]):
                            ctx_start = max(0, i - 1)
                            ctx_end = min(len(lines), i + 3)
                            print(f"\n  [{url}] línea ~{i}:")
                            for ctx_line in lines[ctx_start:ctx_end]:
                                print(f"    {ctx_line[:200]}")
                except Exception as e:
                    print(f"  Error fetching {url}: {e}")


asyncio.run(main())
