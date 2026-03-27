# backend/etl/pdi/config.py
"""
Configuración para el ETL de estadísticas de la PDI (Policía de Investigaciones).
Fuente: datos.gob.cl — dataset 5373dac4-a77a-48b2-9a8b-9cef7311f941
Formato: XLS — delitos investigados por región.
Granularidad: REGIONAL (15 regiones, no comunal).
"""
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[2]   # backend/
RAW_DATA_DIR = BASE_DIR / "data" / "pdi"
RAW_DATA_DIR.mkdir(parents=True, exist_ok=True)

# URLs directas de descarga (verificadas en 2026-03)
PDI_XLS_FILES: dict[tuple[int, str], str] = {
    (2024, "delitos"):   "https://datos.gob.cl/dataset/5373dac4-a77a-48b2-9a8b-9cef7311f941/resource/26633482-466b-40f8-bb0d-024f2e95c960/download/cantidad-de-delitos-y-faltas-investigadas-2024.xls",
    (2024, "denuncias"): "https://datos.gob.cl/dataset/5373dac4-a77a-48b2-9a8b-9cef7311f941/resource/74688cb0-4622-438f-8d53-dd5cff398557/download/cantidad-de-denuncias-art-18-2024.xls",
    (2024, "victimas"):  "https://datos.gob.cl/dataset/5373dac4-a77a-48b2-9a8b-9cef7311f941/resource/63e21a08-b8e1-4a3e-9a01-8991a32be9df/download/cantidad-de-victimas-art-18-2024.xls",
}

# Términos para filtrar filas de Ley de Drogas en los archivos PDI
# Nota: los XLS PDI usan "ley Nº 20.000" (con Nº), por eso se usa "20.000" solo
DRUG_KEYWORDS = [
    "ley de drogas",
    "20.000",           # "Crímenes y simples delitos contenidos en la ley Nº 20.000"
    "ley 20000",
    "trafico",
    "tráfico",
    "microtráfico",
    "microtrafico",
    "de drogas en la vía",  # "Consumo de alcohol y de drogas en la vía pública"
    "porte de drogas",
]

# Mapeo nombre de región (columna del XLS) → region_id formato CEAD
REGION_ID_MAP: dict[str, str] = {
    "Arica y Parinacota":                     "15",
    "Tarapacá":                               "1",
    "Antofagasta":                            "2",
    "Atacama":                                "3",
    "Coquimbo":                               "4",
    "Valparaíso":                             "5",
    "Libertador Bernardo O'Higgins":          "6",
    "O'Higgins":                              "6",
    "Maule":                                  "7",
    "Ñuble":                                  "16",
    "Biobío":                                 "8",
    "La Araucanía":                           "9",
    "Los Ríos":                               "14",
    "Los Lagos":                              "10",
    "Aysén":                                  "11",
    "Magallanes y la Antártida Chilena":      "12",
    "Magallanes":                             "12",
    "Región Metropolitana de Santiago":       "13",
    "Metropolitana":                          "13",
}

HTTP_TIMEOUT = 60
MAX_RETRIES  = 3
