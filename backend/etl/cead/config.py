# backend/etl/cead/config.py
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent  # backend/

# Portal CEAD
CEAD_BASE_URL = "https://cead.minsegpublica.gob.cl"
CEAD_AJAX_URL = f"{CEAD_BASE_URL}/wp-content/themes/gobcl-wp-master/data/ajax_2.php"
CEAD_PORTAL_URL = f"{CEAD_BASE_URL}/estadisticas-delictuales/"

# Seleccion codes
SEL_REGION = 1
SEL_PROVINCIA = 2
SEL_COMUNA = 3
SEL_ANIO = 6
SEL_TRIMESTRE = 7
SEL_MES = 8
SEL_FAMILIA = 9
SEL_GRUPO = 10
SEL_SUBGRUPO = 11

# Años disponibles
ANIO_INICIO = 2005
ANIO_FIN = 2025

# Archivos de referencia
CODIGOS_JSON = BASE_DIR / "etl" / "cead" / "codigos_cead.json"
RAW_DATA_DIR = BASE_DIR / "data" / "raw"
CHECKPOINT_FILE = BASE_DIR / "data" / "checkpoint.jsonl"
LOG_FILE = BASE_DIR / "logs" / "cead_etl.log"

# HTTP
HTTP_TIMEOUT = 30.0
MAX_CONCURRENT_REQUESTS = 5
MAX_RETRIES = 3

# Taxonomía
TAXONOMY_LEGACY = "DMCS_legacy"
TAXONOMY_2024 = "Taxonomia_2024"
TAXONOMY_CUTOFF_YEAR = 2024
