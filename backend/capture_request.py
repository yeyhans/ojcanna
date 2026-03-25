"""
Usa Playwright para navegar el portal CEAD, seleccionar filtros,
y capturar el request exacto a get_estadisticas_delictuales.php.
"""
import asyncio
import json
import urllib.parse
from playwright.async_api import async_playwright

PORTAL = "https://cead.minsegpublica.gob.cl/estadisticas-delictuales/"
TARGET_URL = "get_estadisticas_delictuales.php"

captured = []


async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)  # visible para depurar
        context = await browser.new_context()
        page = await context.new_page()

        # Interceptar requests a get_estadisticas_delictuales.php
        async def on_request(request):
            if TARGET_URL in request.url:
                print(f"\n[REQUEST] {request.url}")
                print(f"  method: {request.method}")
                body = request.post_data
                if body:
                    params = urllib.parse.parse_qs(body)
                    print("  PAYLOAD:")
                    for k, v in sorted(params.items()):
                        print(f"    {k}: {v}")
                    captured.append(params)

        page.on("request", on_request)

        print("Cargando portal...")
        await page.goto(PORTAL, wait_until="networkidle", timeout=60000)
        print(f"Portal cargado. Title: {await page.title()}")

        # Esperar que el tree-multiselect esté listo
        await page.wait_for_timeout(2000)

        # Ver qué hay en el DOM del tree-multiselect territorial
        print("\n=== Checkboxes del multiselect territorial (primeros 20) ===")
        checkboxes = await page.query_selector_all(".tree-multiselect input[type=checkbox]")
        print(f"Total checkboxes en DOM: {len(checkboxes)}")
        for i, cb in enumerate(checkboxes[:20]):
            label = await cb.evaluate("el => el.closest('.section')?.querySelector('.title')?.textContent || el.value || '?'")
            val = await cb.get_attribute("value")
            print(f"  [{i}] value={val!r} label={label!r}")

        # Intentar selección directa via JavaScript en #territorial-select
        print("\n=== Intentando selección directa via JS ===")
        # Seleccionar Santiago (ID=13101) en el territorial select
        result = await page.evaluate("""
            () => {
                // Buscar la opción de Santiago en territorial-select
                const sel = document.getElementById('territorial-select');
                if (!sel) return 'territorial-select NOT FOUND';
                const options = Array.from(sel.options);
                const santiago = options.find(o => o.value === '13101' || o.text.includes('Santiago'));
                if (santiago) return `Found: value=${santiago.value} text=${santiago.text}`;
                return `Not found. First 5: ${options.slice(0,5).map(o=>o.value+':'+o.text).join(', ')}`;
            }
        """)
        print(f"  {result}")

        # Intentar click en el checkbox correspondiente a Santiago
        print("\n=== Buscando label Santiago en la UI ===")
        santiago_labels = await page.query_selector_all("text=Santiago")
        print(f"  Elementos con texto 'Santiago': {len(santiago_labels)}")
        for el in santiago_labels[:5]:
            tag = await el.evaluate("el => el.tagName + ' class=' + el.className")
            print(f"  {tag}")

        # Esperar interacción del usuario o timeout
        print("\n\nPor favor navega manualmente en el navegador:")
        print("1. Selecciona 'Región Metropolitana' → Santiago")
        print("2. Selecciona año 2024")
        print("3. Selecciona 'Delitos asociados a drogas' → 'Tráfico de sustancias'")
        print("4. Haz click en 'Buscar'")
        print("Esperando request (60 segundos)...")

        # Esperar hasta que se capture el request o timeout
        for _ in range(60):
            await asyncio.sleep(1)
            if captured:
                break

        if captured:
            print("\n\n=== PAYLOAD CAPTURADO ===")
            print(json.dumps({k: v for k, v in captured[0].items()}, ensure_ascii=False, indent=2))
        else:
            print("No se capturó ningún request. Cerrando...")

        await browser.close()


asyncio.run(main())
