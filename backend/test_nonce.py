"""
Busca nonce/token en el portal y lo incluye en la petición.
También imprime HTML crudo de la respuesta para ver mensajes de error ocultos.
"""
import asyncio
import re
import httpx

PORTAL = "https://cead.minsegpublica.gob.cl/estadisticas-delictuales/"
URL    = "https://cead.minsegpublica.gob.cl/wp-content/themes/gobcl-wp-master/data/get_estadisticas_delictuales.php"
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"


async def main():
    async with httpx.AsyncClient(follow_redirects=True) as client:
        # 1. Obtener portal y buscar nonce, token, o cualquier variable de seguridad
        print("Fetching portal HTML...")
        resp = await client.get(PORTAL, headers={"User-Agent": UA}, timeout=30)
        html = resp.text
        print(f"Portal size: {len(html)} bytes, cookies: {dict(client.cookies)}")

        # Buscar nonces y variables JS
        print("\n=== Variables JS inline relevantes ===")
        for pattern in [r'nonce["\s:=]+["\']([^"\']+)', r'_wpnonce["\s:=]+["\']([^"\']+)',
                        r'security["\s:=]+["\']([^"\']+)', r'token["\s:=]+["\']([^"\']+)',
                        r'var\s+\w*[Nn]once\w*\s*=\s*["\']([^"\']+)',
                        r'\"nonce\":\"([^\"]+)\"']:
            matches = re.findall(pattern, html)
            if matches:
                print(f"  {pattern[:40]}: {matches[:3]}")

        # 2. Imprimir HTML crudo de get_estadisticas_delictuales.php
        print("\n=== HTML crudo de PHP (primeros 3000 chars) ===")
        resp2 = await client.post(URL, data={
            "seleccion": "1", "medida": "2", "tipoVal": "1,2",
            "descarga": "false",
            "anio[]": "2023", "trimestre[]": "0", "mes[]": "0",
            "familia[]": "4", "grupo[]": "401", "subgrupo[]": "40101",
        }, headers={
            "User-Agent": UA,
            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
            "X-Requested-With": "XMLHttpRequest",
            "Referer": PORTAL,
        }, timeout=30)
        print(resp2.text[:3000])

        # 3. Buscar en el JS inline cómo se construyen region_id, anio_id, etc.
        print("\n=== Construcción de anio_id, region_id en JS ===")
        for kw in ["anio_id", "region_id", "familia_id", "var anio", "getValues", "multiselect"]:
            for m in re.finditer(re.escape(kw), html):
                start = max(0, m.start() - 5)
                end = min(len(html), m.end() + 200)
                snippet = html[start:end].replace('\n', ' ').strip()
                if len(snippet) < 300:
                    print(f"  [{kw}]: {snippet}")


asyncio.run(main())
