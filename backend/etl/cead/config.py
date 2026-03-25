# backend/etl/cead/config.py
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent  # backend/

# Portal CEAD
CEAD_BASE_URL = "https://cead.minsegpublica.gob.cl"
CEAD_AJAX_URL = f"{CEAD_BASE_URL}/wp-content/themes/gobcl-wp-master/data/ajax_2.php"
CEAD_PORTAL_URL = f"{CEAD_BASE_URL}/estadisticas-delictuales/"
# Endpoint real de descarga de datos (get_estadisticas_delictuales.php)
CEAD_DATA_URL = f"{CEAD_BASE_URL}/wp-content/themes/gobcl-wp-master/data/get_estadisticas_delictuales.php"

# Mapa subgrupo → grupo (confirmado via ingeniería inversa del portal)
SUBGRUPO_GRUPO_MAP: dict[str, str] = {
    "40101": "401", "40102": "401", "40103": "401", "40104": "401",
    "70201": "702", "70202": "702", "70204": "702",
}

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
