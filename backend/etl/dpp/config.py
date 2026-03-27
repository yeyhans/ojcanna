# backend/etl/dpp/config.py
"""
Configuración para el ETL de la Defensoría Penal Pública (DPP).
Fuente: https://www.dpp.cl/pag/116/627/estadisticas
Formato: XLSX — 48 hojas por año, cobertura 2020-2024.
Granularidad: REGIONAL (16 Oficinas Regionales de Defensa, no comunal).
"""
from pathlib import Path

# --- Rutas ---
BASE_DIR = Path(__file__).resolve().parents[2]   # backend/
RAW_DATA_DIR = BASE_DIR / "data" / "dpp"
RAW_DATA_DIR.mkdir(parents=True, exist_ok=True)

# --- URLs de descarga directa ---
DPP_BASE_URL = "https://www.dpp.cl"

# Archivos XLSX por año (URLs verificadas en 2026-03)
DPP_XLSX_FILES: dict[int, str] = {
    2020: "/resources/upload/dfd1854afd8d69e52e2ff76c5b7c960e.xlsx",
    2021: "/resources/upload/68bbe2345b534143e39732b8f4870eb1.xlsx",
    2022: "/resources/upload/e3edb59cb21761a9001988bcdb18d74c.xlsx",
    2023: "/resources/upload/51bf67b31ac83cc35a41bc5fc9b34079.xlsx",
    2024: "/resources/upload/7b0b60fd419b2663ea7540b5bc280ffc.xlsx",
}

ANIOS_DISPONIBLES = sorted(DPP_XLSX_FILES.keys())   # [2020, 2021, 2022, 2023, 2024]

# --- Nombres de hojas relevantes ---
# "Ingresos Terminos DR" → ingresos y términos por Oficina Regional de Defensa
# "Delitos FT"           → delitos con formas de término (usado como fallback)
SHEET_INGRESOS_DR = "Ingresos Terminos DR"
SHEET_DELITOS_FT  = "Delitos FT"
SHEET_DELITOS     = "Delitos"

# Término exacto para filtrar filas de Ley 20.000
DELITO_DROGAS_LABEL = "Delitos Ley de Drogas"

# --- Mapeo Oficina Regional DPP → region_id (formato CEAD: sin zero-padding) ---
# El Excel usa los nombres de las Oficinas Regionales de Defensa
REGION_ID_MAP: dict[str, str] = {
    "Arica y Parinacota":                     "15",
    "Tarapacá":                               "1",
    "Antofagasta":                            "2",
    "Atacama":                                "3",
    "Coquimbo":                               "4",
    "Valparaíso":                             "5",
    "Libertador Bernardo O'Higgins":          "6",
    "O'Higgins":                              "6",   # alias corto
    "Maule":                                  "7",
    "Ñuble":                                  "16",
    "Biobío":                                 "8",
    "La Araucanía":                           "9",
    "Los Ríos":                               "14",
    "Los Lagos":                              "10",
    "Aysén":                                  "11",
    "Magallanes y Antártica Chilena":         "12",
    "Magallanes":                             "12",  # alias corto
    # La región Metropolitana está dividida en Norte y Sur en el Excel
    "Metropolitana Norte":                    "13",
    "Metropolitana Sur":                      "13",
    "Metropolitana":                          "13",
}

# HTTP
HTTP_TIMEOUT = 60
MAX_RETRIES  = 3
