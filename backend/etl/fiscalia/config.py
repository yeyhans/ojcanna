# backend/etl/fiscalia/config.py
"""
Configuración del pipeline Fiscalía — Ministerio Público.

Boletines estadísticos oficiales publicados en:
  https://www.fiscaliadechile.cl/persecucion-penal/estadisticas

URLs directas verificadas (WebFetch abril 2026).
"""
from pathlib import Path

# Directorio raw donde se guardan los XLS/XLSX descargados
RAW_DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data" / "fiscalia"
RAW_DATA_DIR.mkdir(parents=True, exist_ok=True)

# Boletines anuales — URLs oficiales, verificadas
BOLETINES = {
    2024: "https://www.fiscaliadechile.cl/sites/default/files/documentos/Boletin_Anual__2024.xls",
    2025: "https://www.fiscaliadechile.cl/sites/default/files/documentos/Bolet%C3%ADn_Anual_2025-20260101_v1.xlsx",
}

# Boletín semestral (complementario — se ingiere como "tipo_periodo=semestral")
BOLETIN_PRIMER_SEMESTRE_2025 = (
    "https://www.fiscaliadechile.cl/sites/default/files/documentos/"
    "Boletin_institucional_enero_junio_2025_20250703_v1.xlsx"
)

# Etiqueta del delito que nos interesa (categoría Fiscalía)
DELITO_LEY_DROGAS = "Ley 20.000"

# Fuente oficial pública (para exhibir al usuario)
FUENTE_URL = "https://www.fiscaliadechile.cl/persecucion-penal/estadisticas"
ORGANISMO = "Fiscalía Nacional · Ministerio Público"

# Regiones Chile — mapeo nombre publicado por Fiscalía → ID ISO 3166-2 CL-XX
# Fiscalía usa los nombres completos; nosotros normalizamos contra el formato
# que ya usa DPP (VARCHAR(3) numérico de 1 a 16).
REGION_ID_MAP = {
    "Arica y Parinacota": "15",
    "Tarapacá": "1",
    "Antofagasta": "2",
    "Atacama": "3",
    "Coquimbo": "4",
    "Valparaíso": "5",
    "O'Higgins": "6",
    "Maule": "7",
    "Ñuble": "16",
    "Biobío": "8",
    "La Araucanía": "9",
    "Los Ríos": "14",
    "Los Lagos": "10",
    "Aysén": "11",
    "Magallanes": "12",
    "Metropolitana": "13",
}
