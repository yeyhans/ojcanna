# backend/etl/fiscalia/consolidator.py
"""
Consolidador profesional del Boletín Estadístico Fiscalía Nacional.

Estructura real verificada (boletines anuales 2024 y 2025):

  Hoja IND   — índice con los nombres de todas las tablas numeradas (TB1..TB26).
  Hoja TB3.1 — "Delitos ingresados por imputados conocidos por región y categoría".
  Hoja TB3.2 — "... por imputados desconocidos por región y categoría".
  Hoja TB4.1 — "Delitos terminados por imputados conocidos por región y categoría".
  Hoja TB4.2 — "... por imputados desconocidos por región y categoría".
  Hoja TB6.2 — "Términos aplicados por región y categoría de delitos".

  Estructura de TB3.1 / TB3.2 / TB4.1 / TB4.2:

    Row 6  : header de regiones en numeración romana
             col 1 = "CATEGORÍA DE DELITOS"
             col 3..17 = I, II, III, IV, V, VI, VII, VIII, IX, X, XI, XII, XIV, XV, XVI
             col 18..21 = "RM CN", "RM OR", "RM OCC", "RM SUR"  (Metropolitana zonal)
             col 23 = "Total Nacional"

    Row 17 : categoría "DELITOS LEY DE DROGAS" (IC — imputado conocido)
    Row 44 : categoría "DELITOS LEY DE DROGAS" (ID — imputado desconocido, si existe)

  La Metropolitana aparece dividida en 4 fiscalías regionales zonales —
  sumamos las 4 como region_id="13".

Reglas:
  * Ley 20.000 se identifica por la categoría literal "DELITOS LEY DE DROGAS"
    (NO por texto libre — es la clase oficial del Ministerio Público).
  * IC + ID se suman en n_causas para tener el total de delitos ingresados/terminados.
  * Si una hoja no existe o la categoría no aparece, se loguea warning y se
    SKIPPEA esa métrica — NUNCA se inventa un valor.
"""
import logging
import re
from pathlib import Path

import pandas as pd
from sqlalchemy import create_engine, text

from etl.common.base_consolidator import staging_upsert
from etl.fiscalia.config import (
    DELITO_LEY_DROGAS,
    ORGANISMO,
    RAW_DATA_DIR,
)

logger = logging.getLogger(__name__)

# La categoría literal que publica Fiscalía (NO es "Ley 20.000" textual).
CATEGORIA_DROGAS_OFICIAL = "DELITOS LEY DE DROGAS"

# Mapeo numeración romana → region_id (VARCHAR, consistente con DPP)
ROMAN_TO_REGION_ID: dict[str, str] = {
    "I": "1",
    "II": "2",
    "III": "3",
    "IV": "4",
    "V": "5",
    "VI": "6",
    "VII": "7",
    "VIII": "8",
    "IX": "9",
    "X": "10",
    "XI": "11",
    "XII": "12",
    # XIII se representa como las 4 zonales RM — agregamos aparte.
    "XIV": "14",
    "XV": "15",
    "XVI": "16",
}

# Región Metropolitana zonal (Fiscalía la publica subdividida)
RM_ZONAL_HEADERS = {"RM CN", "RM OR", "RM OCC", "RM SUR"}

REGION_NOMBRE: dict[str, str] = {
    "1": "Tarapacá",
    "2": "Antofagasta",
    "3": "Atacama",
    "4": "Coquimbo",
    "5": "Valparaíso",
    "6": "O'Higgins",
    "7": "Maule",
    "8": "Biobío",
    "9": "La Araucanía",
    "10": "Los Lagos",
    "11": "Aysén",
    "12": "Magallanes",
    "13": "Metropolitana",
    "14": "Los Ríos",
    "15": "Arica y Parinacota",
    "16": "Ñuble",
}

# Hojas por métrica — mapping explícito (verificado en boletines 2024/2025)
HOJAS_POR_METRICA: dict[str, list[str]] = {
    "ingresos": ["TB3.1", "TB3.2"],       # IC + ID
    "terminos": ["TB4.1", "TB4.2"],       # IC + ID
}

# Header de regiones vive en la fila 6 (índice 0-based) — verificado.
HEADER_ROW_REGIONES = 6

INSERT_COLUMNS = [
    "anio",
    "region_id",
    "region_nombre",
    "categoria_delito",
    "tipo_metrica",
    "n_causas",
    "fuente",
]


def _normalize(v: object) -> str:
    return re.sub(r"\s+", " ", str(v)).strip()


def _safe_int(v: object) -> int | None:
    """
    Convierte una celda Fiscalía en entero.

    Fiscalía publica dos tablas superpuestas en la misma hoja: la tabla de
    valores absolutos (filas 8–30 típicamente) y una tabla de porcentajes
    (filas 35–55) donde el valor es un float 0 < v < 1 (ej 0.041537 = 4.15%).

    Rechazamos cualquier valor no-entero o fracción < 1 — son porcentajes,
    no conteos de causas.
    """
    if v is None:
        return None
    if isinstance(v, float):
        if pd.isna(v):
            return None
        if 0 < v < 1 or v != int(v):
            # porcentaje o decimal — no es una cuenta de causas
            return None
        return int(v)
    if isinstance(v, int):
        return int(v)
    # strings: permitimos solo enteros puros (con o sin separador de miles)
    s = _normalize(v).replace(",", "").replace(" ", "")
    if not s or s.lower() in {"nan", "-", "—", "n/a"}:
        return None
    if "." in s:
        # string con decimales — descartar (es porcentaje o tasa)
        return None
    try:
        return int(s)
    except (ValueError, TypeError):
        return None


def _build_region_column_map(header_row: pd.Series) -> dict[int, str]:
    """
    Recorre la fila de header y devuelve {col_index: region_id}.
    Colapsa RM CN+OR+OCC+SUR en region_id="13".
    """
    mapping: dict[int, str] = {}
    for col_idx, val in header_row.items():
        if pd.isna(val):
            continue
        label = _normalize(val).upper()
        if label in ROMAN_TO_REGION_ID:
            mapping[int(col_idx)] = ROMAN_TO_REGION_ID[label]
        elif label in {h.upper() for h in RM_ZONAL_HEADERS}:
            mapping[int(col_idx)] = "13"  # Metropolitana agregada
    return mapping


def _find_drogas_rows(df: pd.DataFrame) -> list[int]:
    """
    Devuelve los índices de fila cuya columna 1 contiene exactamente
    la categoría oficial DELITOS LEY DE DROGAS (puede aparecer varias veces
    por tipo de imputado — IC/ID).
    """
    target = CATEGORIA_DROGAS_OFICIAL.upper()
    out: list[int] = []
    for idx, val in df.iloc[:, 1].items():
        if pd.isna(val):
            continue
        if _normalize(val).upper() == target:
            out.append(int(idx))
    return out


def _extract_metric(
    xl: pd.ExcelFile,
    anio: int,
    sheets: list[str],
    tipo_metrica: str,
) -> list[dict]:
    """
    Extrae {region_id → sum(n_causas)} desde las hojas indicadas
    (ej. TB3.1 + TB3.2 para sumar IC+ID) y devuelve filas normalizadas.
    """
    totales: dict[str, int] = {}  # region_id → acumulado
    hojas_leidas = 0

    for sheet in sheets:
        if sheet not in xl.sheet_names:
            logger.warning(f"  Hoja '{sheet}' no existe en el archivo — skip")
            continue
        df = xl.parse(sheet, header=None)

        if len(df) <= HEADER_ROW_REGIONES:
            logger.warning(f"  Hoja '{sheet}' demasiado corta — skip")
            continue

        region_cols = _build_region_column_map(df.iloc[HEADER_ROW_REGIONES])
        if not region_cols:
            logger.warning(f"  Hoja '{sheet}' sin columnas región reconocibles — skip")
            continue

        drogas_rows = _find_drogas_rows(df)
        if not drogas_rows:
            logger.warning(
                f"  Hoja '{sheet}': categoría '{CATEGORIA_DROGAS_OFICIAL}' no encontrada — skip"
            )
            continue

        hojas_leidas += 1
        for drow_idx in drogas_rows:
            row = df.iloc[drow_idx]
            for col_idx, region_id in region_cols.items():
                n = _safe_int(row.iloc[col_idx])
                if n is None:
                    continue
                totales[region_id] = totales.get(region_id, 0) + n

    if hojas_leidas == 0:
        return []

    return [
        {
            "anio": anio,
            "region_id": region_id,
            "region_nombre": REGION_NOMBRE.get(region_id, region_id),
            "categoria_delito": DELITO_LEY_DROGAS,
            "tipo_metrica": tipo_metrica,
            "n_causas": n,
            "fuente": "fiscalia-boletin-anual",
        }
        for region_id, n in sorted(totales.items(), key=lambda kv: int(kv[0]))
    ]


def _parse_boletin(path: Path, anio: int) -> pd.DataFrame:
    """Lee un boletín anual Fiscalía y devuelve un DataFrame listo para DB."""
    logger.info(f"Parseando {path.name} (año {anio})")

    engine = "openpyxl" if path.suffix.lower() == ".xlsx" else "xlrd"
    xl = pd.ExcelFile(path, engine=engine)

    all_rows: list[dict] = []
    for tipo_metrica, hojas in HOJAS_POR_METRICA.items():
        rows = _extract_metric(xl, anio, hojas, tipo_metrica)
        if not rows:
            logger.warning(f"  Métrica '{tipo_metrica}' sin datos extraíbles")
        else:
            logger.info(f"  Métrica '{tipo_metrica}': {len(rows)} regiones extraídas")
        all_rows.extend(rows)

    if not all_rows:
        return pd.DataFrame()

    return pd.DataFrame(all_rows)


class FiscaliaConsolidator:
    """Orquesta lectura de múltiples boletines y carga a PostgreSQL."""

    def __init__(self, db_url: str | None = None, raw_dir: Path = RAW_DATA_DIR):
        self.db_url = db_url
        self.raw_dir = raw_dir

    def run(self) -> pd.DataFrame:
        files = sorted(self.raw_dir.glob("fiscalia_boletin_anual_*"))
        if not files:
            logger.warning(f"Sin archivos en {self.raw_dir}. Corré downloader primero.")
            return pd.DataFrame()

        dfs: list[pd.DataFrame] = []
        for path in files:
            m = re.search(r"fiscalia_boletin_anual_(\d{4})", path.stem)
            if not m:
                logger.warning(f"Nombre inesperado: {path.name} — skip")
                continue
            anio = int(m.group(1))
            df = _parse_boletin(path, anio)
            if not df.empty:
                dfs.append(df)
                logger.info(f"  → {len(df)} filas extraídas de {path.name}")

        if not dfs:
            logger.warning("Sin datos consolidados. Revisá estructura de XLS.")
            return pd.DataFrame()

        full_df = pd.concat(dfs, ignore_index=True)
        logger.info(f"Total filas a cargar: {len(full_df)}")
        logger.info(f"  Organismo: {ORGANISMO}")
        logger.info(f"  Fuente oficial: https://www.fiscaliadechile.cl/persecucion-penal/estadisticas")

        if self.db_url:
            self._load_to_postgres(full_df)

        return full_df

    def _load_to_postgres(self, df: pd.DataFrame) -> None:
        engine = create_engine(self.db_url)

        with engine.begin() as conn:
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS fiscalia_boletin (
                    id                  SERIAL PRIMARY KEY,
                    anio                SMALLINT NOT NULL,
                    region_id           VARCHAR(3) NOT NULL,
                    region_nombre       VARCHAR(80),
                    categoria_delito    VARCHAR(100) NOT NULL,
                    tipo_metrica        VARCHAR(30) NOT NULL,
                    n_causas            INTEGER,
                    fuente              VARCHAR(50) NOT NULL DEFAULT 'fiscalia-boletin-anual',
                    descargado_en       TIMESTAMPTZ DEFAULT NOW()
                )
            """))
            conn.execute(text("""
                CREATE UNIQUE INDEX IF NOT EXISTS uq_fiscalia_boletin
                ON fiscalia_boletin (anio, region_id, categoria_delito, tipo_metrica)
            """))

        # Asegurar tipos numéricos para que to_sql cree columnas INTEGER
        df["anio"] = pd.to_numeric(df["anio"], errors="coerce").astype("Int64")
        df["n_causas"] = pd.to_numeric(df["n_causas"], errors="coerce").astype("Int64")

        staging_upsert(
            df=df,
            engine=engine,
            target_table="fiscalia_boletin",
            insert_columns=INSERT_COLUMNS,
            conflict_columns=["anio", "region_id", "categoria_delito", "tipo_metrica"],
            staging_table="fiscalia_boletin_staging",
        )
