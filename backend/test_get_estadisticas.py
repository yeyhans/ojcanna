"""
Prueba el endpoint real get_estadisticas_delictuales.php con parámetros correctos.
Primero obtiene la tabla HTML (descarga=false) para ver columnas,
luego intenta el Excel (sin descarga field).
"""
import asyncio
import re
import httpx
import openpyxl
from io import BytesIO

URL = "https://cead.minsegpublica.gob.cl/wp-content/themes/gobcl-wp-master/data/get_estadisticas_delictuales.php"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
    "X-Requested-With": "XMLHttpRequest",
    "Referer": "https://cead.minsegpublica.gob.cl/estadisticas-delictuales/",
}

# Parámetros base: Santiago, 2024, Tráfico de sustancias, ambos tipo caso
BASE = {
    "seleccion":          "2",       # porDelito
    "medida":             "2",       # 2=Tasa (mapa: val==1→Frecuencia, else→Tasa)
    "tipoVal":            "1,2",     # Denuncias + Detenciones combinadas
    "anio":               "2024",
    "trimestre":          "0",
    "mes":                "0",
    "mes_nombres":        "",
    "region":             "13",
    "region_nombres":     "Región Metropolitana",
    "provincia":          "131",
    "provincias_nombres": "Santiago",
    "comuna":             "13101",
    "comuna_nombres":     "Santiago",
    "familia":            "4",
    "familia_nombres":    "Delitos asociados a drogas",
    "grupo":              "401",
    "grupo_nombres":      "Crímenes y simples delitos ley de drogas",
    "subgrupo":           "40101",
    "subgrupo_nombres":   "Tráfico de sustancias",
}


async def main():
    async with httpx.AsyncClient() as client:
        # 1. Tabla HTML (descarga=false)
        print("=== HTML table (descarga=false) ===")
        payload_html = {**BASE, "descarga": "false"}
        resp = await client.post(URL, data=payload_html, headers=HEADERS, timeout=30)
        html = resp.text[:3000]
        print(f"Status: {resp.status_code}, size: {len(resp.text)}")
        print(f"Content-Type: {resp.headers.get('content-type')}")
        print(html[:1500])

        # 2. Extraer cabeceras de la tabla HTML
        th_matches = re.findall(r'<th[^>]*>(.*?)</th>', html, re.DOTALL)
        if th_matches:
            print("\n=== Cabeceras de tabla HTML ===")
            for th in th_matches:
                clean = re.sub(r'<[^>]+>', '', th).strip()
                if clean:
                    print(f"  - {clean!r}")

        # 3. Excel: sin campo descarga (form POST)
        print("\n=== Excel download (sin descarga field) ===")
        payload_excel = dict(BASE)
        # Para arrays el form usa nombre[] con split por coma
        for k in ["anio", "trimestre", "mes", "region", "provincia", "comuna", "familia", "grupo", "subgrupo"]:
            payload_excel[k + "[]"] = payload_excel.pop(k)
        resp2 = await client.post(URL, data=payload_excel, headers=HEADERS, timeout=30)
        ct = resp2.headers.get('content-type', '')
        print(f"Status: {resp2.status_code}, size: {len(resp2.content)}, Content-Type: {ct}")
        print(f"Primeros bytes: {resp2.content[:80]}")

        if b'PK' in resp2.content[:10]:
            wb = openpyxl.load_workbook(BytesIO(resp2.content), read_only=True)
            ws = wb.active
            rows = list(ws.iter_rows(values_only=True))
            print(f"\n  Filas: {len(rows)}")
            for r in rows[:5]:
                print(f"  {r}")

        # 4. Probar medida=1 (Frecuencia)
        print("\n=== HTML table medida=1 (Frecuencia) ===")
        payload_freq = {**BASE, "medida": "1", "descarga": "false"}
        resp3 = await client.post(URL, data=payload_freq, headers=HEADERS, timeout=30)
        print(f"Status: {resp3.status_code}, size: {len(resp3.text)}")
        th3 = re.findall(r'<th[^>]*>(.*?)</th>', resp3.text[:3000], re.DOTALL)
        for th in th3:
            clean = re.sub(r'<[^>]+>', '', th).strip()
            if clean:
                print(f"  - {clean!r}")


asyncio.run(main())
