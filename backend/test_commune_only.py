"""
Verifica que solo la commune ID es suficiente para obtener datos.
"""
import asyncio
import html as html_mod
import re
import httpx

PORTAL = "https://cead.minsegpublica.gob.cl/estadisticas-delictuales/"
URL = "https://cead.minsegpublica.gob.cl/wp-content/themes/gobcl-wp-master/data/get_estadisticas_delictuales.php"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
    "X-Requested-With": "XMLHttpRequest",
    "Referer": PORTAL,
}


def parse_value(html: str, subgrupo_nombre: str) -> str | None:
    """Extrae el valor de la fila que contiene el nombre del subgrupo."""
    for tr in re.findall(r'<tr[^>]*>(.*?)</tr>', html, re.DOTALL):
        cells = re.findall(r'<t[hd][^>]*>(.*?)</t[hd]>', tr, re.DOTALL)
        cells = [re.sub(r'<[^>]+>', '', c).strip() for c in cells]
        if len(cells) >= 2 and cells[0].strip():  # nombre no vacío
            # Unescape HTML entities (&aacute; → á, &emsp; → ' ', etc.)
            raw = html_mod.unescape(cells[0])
            name_clean = re.sub(r'\s+', ' ', raw).strip().lower()
            sg_clean = subgrupo_nombre.strip().lower()
            if sg_clean in name_clean or name_clean in sg_clean:
                return html_mod.unescape(cells[1])
    return None


async def get_value(client, anio, comuna_id, subgrupo_id, subgrupo_nombre, grupo_id, medida="2"):
    resp = await client.post(URL, data={
        "seleccion": "2", "medida": medida, "tipoVal": "1,2",
        "anio[]": str(anio),
        "comuna[]": str(comuna_id),
        "familia[]": "4",
        "grupo[]": grupo_id,
        "subgrupo[]": subgrupo_id,
        "subgrupo_nombres[]": subgrupo_nombre,
        "descarga": "false",
    }, headers=HEADERS, timeout=30)
    return parse_value(resp.text, subgrupo_nombre)


async def main():
    async with httpx.AsyncClient(follow_redirects=True) as client:
        await client.get(PORTAL, headers={"User-Agent": HEADERS["User-Agent"]}, timeout=30)

        # Test 1: comuna only (no region/provincia)
        print("=== Test 1: Solo comuna, sin region/provincia ===")
        for anio in [2024, 2023, 2020, 2010]:
            val = await get_value(client, anio, "13101", "40101", "Tráfico de sustancias", "401")
            print(f"  Santiago {anio}: {val}")

        # Test 2: varios subgrupos para Santiago 2024
        print("\n=== Test 2: Todos subgrupos Santiago 2024 ===")
        subgrupos = [
            ("40101", "Tráfico de sustancias", "401"),
            ("40102", "Microtráfico de sustancias", "401"),
            ("40103", "Elaboración o producción de sustancias", "401"),
            ("40104", "Otras infracciones a la ley de drogas", "401"),
            ("70201", "Consumo de drogas en la vía pública", "702"),
            ("70202", "Porte de drogas", "702"),
            ("70204", "Consumo de alcohol en la vía pública", "702"),
        ]
        for sg_id, sg_nombre, gr_id in subgrupos:
            val = await get_value(client, 2024, "13101", sg_id, sg_nombre, gr_id)
            print(f"  [{sg_id}] {sg_nombre}: {val}")

        # Test 3: algunas comunas distintas
        print("\n=== Test 3: Otras comunas 2024, Tráfico ===")
        comunas = [("13101", "Santiago"), ("13120", "Maipú"), ("01101", "Iquique"), ("8101", "Concepción")]
        for c_id, c_name in comunas:
            val = await get_value(client, 2024, c_id, "40101", "Tráfico de sustancias", "401")
            print(f"  {c_name} ({c_id}): {val}")

        # Test 4: frecuencia vs tasa
        print("\n=== Test 4: Frecuencia vs Tasa para Santiago 2024 ===")
        val_freq = await get_value(client, 2024, "13101", "40101", "Tráfico de sustancias", "401", medida="1")
        val_tasa = await get_value(client, 2024, "13101", "40101", "Tráfico de sustancias", "401", medida="2")
        print(f"  Frecuencia: {val_freq}")
        print(f"  Tasa:       {val_tasa}")


asyncio.run(main())
