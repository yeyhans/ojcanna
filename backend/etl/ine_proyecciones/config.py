# backend/etl/ine_proyecciones/config.py
"""
Configuración del pipeline ETL — Proyecciones de Población Comunal INE (base 2017).
Fuente: https://www.ine.gob.cl/estadisticas-por-tema/demografia-y-poblacion/proyecciones-de-poblacion
"""
import pathlib

INE_PROYECCIONES_URL = (
    "https://www.ine.gob.cl/docs/default-source/proyecciones-de-poblacion"
    "/cuadros-estadisticos/base-2017/estimaciones-y-proyecciones-2002-2035-comunas.xlsx"
)

# Rango alineado con CEAD (2005-2025)
ANIOS_OBJETIVO = list(range(2005, 2026))

# Todos los años disponibles en el XLSX (2002-2035)
ANIOS_COMPLETOS = list(range(2002, 2036))

DATA_DIR = pathlib.Path(__file__).parent.parent.parent / "data" / "ine"
XLSX_FILENAME = "proyecciones_comunas.xlsx"

# HTTP
HTTP_TIMEOUT = 120.0
MAX_RETRIES = 3

# Días antes de re-descargar el archivo (idempotencia)
CACHE_MAX_DAYS = 30
