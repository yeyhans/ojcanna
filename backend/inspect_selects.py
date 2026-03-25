"""
Extrae los elementos <select> del portal para ver los values reales
de regiones, años y el flujo de selección.
"""
import asyncio
import re
import httpx

PORTAL = "https://cead.minsegpublica.gob.cl/estadisticas-delictuales/"
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"


async def main():
    async with httpx.AsyncClient(follow_redirects=True) as client:
        resp = await client.get(PORTAL, headers={"User-Agent": UA}, timeout=30)
        html = resp.text

    # Buscar todos los <select> con sus options
    print("=== Todos los <select> en la página ===")
    for m in re.finditer(r'<select([^>]*)>(.*?)</select>', html, re.DOTALL):
        attrs = m.group(1)
        inner = m.group(2)
        # Extraer id/name
        id_match   = re.search(r'id=["\']([^"\']+)["\']', attrs)
        name_match = re.search(r'name=["\']([^"\']+)["\']', attrs)
        sel_id   = id_match.group(1)   if id_match   else "?"
        sel_name = name_match.group(1) if name_match else "?"

        options = re.findall(r'<option[^>]*value=["\']([^"\']*)["\'][^>]*>(.*?)</option>', inner, re.DOTALL)
        options = [(v, re.sub(r'<[^>]+>', '', t).strip()) for v, t in options]

        print(f"\n<select id={sel_id!r} name={sel_name!r}>  ({len(options)} options)")
        for v, t in options[:10]:
            print(f"  value={v!r}  text={t[:60]!r}")
        if len(options) > 10:
            print(f"  ... {len(options)-10} más")

    # Buscar script que llama a ajax_2.php con seleccion=3 (comunas) o seleccion=6 (años)
    print("\n\n=== Llamadas a ajax_2.php con seleccion= ===")
    for m in re.finditer(r'seleccion.*?:\s*["\']?(\d+)["\']?', html):
        start = max(0, m.start()-50)
        end   = min(len(html), m.end()+100)
        print(html[start:end].replace('\n','').strip()[:200])


asyncio.run(main())
