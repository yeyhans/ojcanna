"""
Sondea el portal CEAD para encontrar el parámetro correcto de descarga.
Prueba seleccion=12..20 y variantes de accion/tipo.
"""
import asyncio
import json
import httpx

AJAX_URL = "https://cead.minsegpublica.gob.cl/wp-content/themes/gobcl-wp-master/data/ajax_2.php"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
    "X-Requested-With": "XMLHttpRequest",
    "Referer": "https://cead.minsegpublica.gob.cl/estadisticas-delictuales/",
}

# Parámetros de filtro completos para Santiago 2024, subgrupo 40101
BASE_PAYLOAD = {
    "region": "13",
    "provincia": "131",
    "comunaId": "13101",
    "anio": "2024",
    "familiaId": "4",
    "grupoId": "401",
    "subgrupoId": "40101",
    "trimestre": "0",
    "mes": "0",
    "tipoCaso": "0",
}


async def post(client, payload):
    resp = await client.post(AJAX_URL, data=payload, headers=HEADERS, timeout=30)
    ct = resp.headers.get("content-type", "")
    size = len(resp.content)
    first = resp.content[:80]
    return ct, size, first


async def main():
    async with httpx.AsyncClient() as client:
        # 1. Probar seleccion=12..20
        print("=== Probando seleccion 12..20 ===")
        for sel in range(12, 21):
            payload = {**BASE_PAYLOAD, "seleccion": sel}
            ct, size, first = await post(client, payload)
            print(f"  seleccion={sel}: content-type={ct!r}, size={size}, first={first}")

        # 2. Probar con accion/tipo de descarga comunes
        print("\n=== Probando variantes de accion ===")
        for accion in ["descargar", "download", "export", "excel", "exportar"]:
            payload = {**BASE_PAYLOAD, "seleccion": 11, "accion": accion}
            ct, size, first = await post(client, payload)
            print(f"  accion={accion!r}: content-type={ct!r}, size={size}, first={first}")

        # 3. Probar seleccion=11 con tipo/formato
        print("\n=== Probando seleccion=11 + tipo/formato ===")
        for extra_key, extra_val in [("tipo", "excel"), ("formato", "xlsx"), ("export", "1"), ("download", "1")]:
            payload = {**BASE_PAYLOAD, "seleccion": 11, extra_key: extra_val}
            ct, size, first = await post(client, payload)
            print(f"  {extra_key}={extra_val!r}: content-type={ct!r}, size={size}, first={first}")

        # 4. Ver qué retorna seleccion=11 completo (¿tiene link de descarga?)
        print("\n=== Respuesta completa seleccion=11 ===")
        payload = {**BASE_PAYLOAD, "seleccion": 11}
        resp = await client.post(AJAX_URL, data=payload, headers=HEADERS, timeout=30)
        text = resp.text[:2000]
        print(text)


asyncio.run(main())
