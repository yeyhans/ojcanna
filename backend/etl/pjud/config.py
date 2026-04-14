# backend/etl/pjud/config.py
"""
Configuración del ETL PJud (Poder Judicial) — Fase E.

Fuentes:
  - Portal Unificado de Sentencias: https://www.pjud.cl/portal-unificado-sentencias
    Scraping con Playwright, materias Ley 20.000 (arts. 1, 3, 4, 8).
  - SAIP institucional: dataset estructurado enviado por PJud tras solicitud
    amparada en Compromiso N° 5 del 6to Plan de Estado Abierto.

Marco normativo:
  - Acta 164-2024 de la Corte Suprema (vigencia 2025-01-01): permite publicación
    de sentencias íntegras o anonimizadas desde el Buscador de Jurisprudencia.
    Cobertura viable del observatorio: 2024-2025 en adelante.
  - Ley 19.628 de Protección de la Vida Privada: obliga anonimización de RUT,
    nombres y domicilios antes de persistir en base de datos.

Arquitectura D6-B: dos capas (pública + auditoría admin con HMAC salado).
"""
from pathlib import Path

# --- Rutas ---
BASE_DIR = Path(__file__).resolve().parents[2]   # backend/
RAW_DATA_DIR = BASE_DIR / "data" / "pjud"
RAW_DATA_DIR.mkdir(parents=True, exist_ok=True)

# --- URLs ---
# Hub estático Apache redirige a app Laravel en juris.pjud.cl
PJUD_PORTAL_BASE = "https://juris.pjud.cl"
# URL real del buscador de Sentencias Penales (descubierto 2026-04)
PORTAL_UNIFICADO_URL = "https://juris.pjud.cl/busqueda?Sentencias_Penales"
# Endpoints AJAX descubiertos en /busqueda (Laravel + Vue.js)
BUSCAR_SENTENCIAS_ENDPOINT = "/busqueda/buscar_sentencias"
DETALLE_SENTENCIA_ENDPOINT = "/busqueda/pagina_detalle_sentencia"
ARBOL_JSON_ENDPOINT = "/busqueda/arbol_json"
RECAPTCHA_VALIDATE_ENDPOINT = "/biscolab-recaptcha/validate"

# reCAPTCHA v3 site key (pública, visible en HTML del buscador)
RECAPTCHA_SITE_KEY = "6Lf5adcZAAAAAGCJfAo8YQ2jb6uYZ2VE-AwHnUmk"
RECAPTCHA_ACTION = "homepage"

# Buscadores disponibles. Para Ley 20.000 el principal es Sentencias_Penales.
BUSCADORES_PJUD = [
    "Corte_Suprema",
    "Sentencias_Penales",
    "Sentencias_Laborales",
    "Civiles",
]
DEFAULT_BUSCADOR = "Sentencias_Penales"

# Materias (submaterias relacionadas con drogas, se descubren via arbol_json).
# Mantener como hint; el filtro primario es tipo_norma + num_norma.
MATERIAS_LEY_20000 = [
    "Tráfico ilícito de estupefacientes",
    "Microtráfico",
    "Porte",
    "Consumo personal exclusivo",
    "Cultivo",
]

# --- Cobertura temporal ---
# Acta 164-2024 entra en vigencia 2025-01-01. Sentencias anteriores requieren SAIP.
ANIO_INICIO_ACTA_164 = 2025
ANIOS_SCRAPER = [2025]   # Extender año a año conforme cierren periodos

# --- Filtros Ley 20.000 en el buscador PJud ---
# Artículos 1 (tráfico), 3 (microtráfico), 4 (porte), 8 (justificación médica).
# El Portal usa códigos de materia propios; el mapeo exacto se descubre en Mes 1.
LEY_20000_ARTICULOS = [1, 3, 4, 8]
LEY_20000_MATERIA_KEYWORDS = [
    "Ley 20.000",
    "Ley N° 20.000",
    "Ley N°20.000",
    "tráfico ilícito de estupefacientes",
    "microtráfico",
    "porte de cannabis",
    "consumo personal exclusivo",
]

# --- Anonimización ---
# Versión del pipeline de anonimización. Incrementar al cambiar spaCy/regex.
ANONIMIZADOR_VERSION = "spacy-regex-v1"

# Modelo spaCy a cargar (requiere python -m spacy download es_core_news_lg)
SPACY_MODEL = "es_core_news_lg"

# --- Extractores ---
# Versión del pipeline rule-based que escribe en pjud_extracciones.extractor_version.
EXTRACTOR_RULE_VERSION = "rule-v1"
EXTRACTOR_LLM_VERSION = "llm-v1"   # Futuro: few-shot GPT-4o / Claude

# --- HTTP / Scraping ---
HTTP_TIMEOUT = 60
MAX_RETRIES = 3
# Delay respetuoso entre requests al Portal (segundos). No agresivo: auditoría cívica.
SCRAPE_DELAY_SECONDS = 2.5
USER_AGENT = "Observatorio-Judicial-Cannabico/1.0 (auditoria civica; contacto pendiente)"

# --- Mapeo tribunal → región/comuna ---
# Los tribunales PJud tienen jurisdicción territorial. Mapeo se completa en Mes 1
# tras observar qué tribunales aparecen en el scrape inicial.
TRIBUNAL_REGION_MAP: dict[str, str] = {
    # "Juzgado de Garantía de Arica": "15",
    # ... (poblar conforme aparezcan tribunales en datos reales)
}

# --- Auditoría / Ley 19.628 ---
# Nombre de variable de entorno con la sal HMAC. NUNCA hardcodear.
AUDIT_SALT_ENV_VAR = "PJUD_AUDIT_SALT"
