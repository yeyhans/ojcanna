"""
Mapper alternativo via HTTP directo (sin Playwright).
Llama al endpoint ajax_2.php con distintos valores de 'seleccion'
para descubrir los IDs internos de regiones, comunas y categorías.
"""
import json
import asyncio
import httpx

AJAX_URL = "https://cead.minsegpublica.gob.cl/wp-content/themes/gobcl-wp-master/data/ajax_2.php"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
    "X-Requested-With": "XMLHttpRequest",
    "Referer": "https://cead.minsegpublica.gob.cl/estadisticas-delictuales/",
}


async def post(client: httpx.AsyncClient, payload: dict) -> list | dict | None:
    try:
        resp = await client.post(AJAX_URL, data=payload, headers=HEADERS, timeout=30)
        resp.raise_for_status()
        text = resp.text.strip()
        if not text or text in ("0", "false", "null", ""):
            return None
        return resp.json()
    except Exception as e:
        print(f"  ERROR payload={payload}: {e}")
        return None


async def main():
    async with httpx.AsyncClient() as client:
        print("=== Probando seleccion=1 (regiones) ===")
        data = await post(client, {"seleccion": 1})
        print(json.dumps(data[:3] if isinstance(data, list) else data, ensure_ascii=False, indent=2))

        print("\n=== Probando seleccion=9 (familias delito) ===")
        data = await post(client, {"seleccion": 9})
        print(json.dumps(data[:5] if isinstance(data, list) else data, ensure_ascii=False, indent=2))

        print("\n=== Probando seleccion=6 (años) ===")
        data = await post(client, {"seleccion": 6})
        print(json.dumps(data[:3] if isinstance(data, list) else data, ensure_ascii=False, indent=2))

        # Si obtuvimos regiones, probar comunas de la primera región
        print("\n=== Probando seleccion=3 con rId=1 (comunas región 1) ===")
        data = await post(client, {"seleccion": 3, "rId": 1})
        print(json.dumps(data[:3] if isinstance(data, list) else data, ensure_ascii=False, indent=2))

        print("\n=== Probando seleccion=10 con familiaId=1 (grupos) ===")
        data = await post(client, {"seleccion": 10, "familiaId": 1})
        print(json.dumps(data[:5] if isinstance(data, list) else data, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    asyncio.run(main())
