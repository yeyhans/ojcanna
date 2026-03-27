# backend/etl/dpp/consolidator.py
"""
Lee los XLSX de la DPP y extrae datos de "Delitos Ley de Drogas".

Estructura real verificada (2020-2024):
  - Hoja "Delitos": datos NACIONALES por tipo de delito.
      Col 0: nombre delito, Col 1: n_ingresos, Col 3: n_terminos
  - Hoja "Delitos FT": datos NACIONALES por tipo de delito × forma de término.
      Col 0: nombre, Col 1: Absolución, Col 3: Condena, Col 5: Derivación,
      Col 7: Facultativos Fiscalía, Col 9: Otras formas, Col 11: Salida Alternativa

LIMITACIÓN: El Excel DPP no cruza región × tipo de delito.
Los datos se almacenan con region_id=NULL (nivel nacional).
El router /mapa/dpp distribuye el total nacional proporcionalmente por región
usando los totales de "Ingresos Terminos DR".
"""
import logging
import re
from pathlib import Path

import pandas as pd
from sqlalchemy import create_engine, text

from etl.dpp.config import RAW_DATA_DIR, DELITO_DROGAS_LABEL
from etl.common.base_consolidator import staging_upsert

logger = logging.getLogger(__name__)

SHEET_DELITOS    = "Delitos"
SHEET_DELITOS_FT = "Delitos FT"
SHEET_INGRESOS   = "Ingresos Terminos DR"

# Mapeo nombre de columna en "Delitos FT" → índice de columna (count, no %)
# Par (count, %): Absolución=1,2 | Condena=3,4 | Derivación=5,6 | Facultativos=7,8 | Otras=9,10 | Salida Alt=11,12
FT_OUTCOMES = {
    "Absolución":               1,
    "Condena":                  3,
    "Derivación":               5,
    "Facultativos de Fiscalía": 7,
    "Otras formas de término":  9,
    "Salida Alternativa":       11,
}

INSERT_COLUMNS = [
    "anio", "region_id", "region_nombre",
    "tipo_delito", "tipo_termino",
    "n_causas", "n_imputados",
]


def _normalize(v: object) -> str:
    return re.sub(r"\s+", " ", str(v)).strip()


def _safe_int(v: object) -> int | None:
    try:
        return int(float(_normalize(v).replace(",", ".")))
    except (ValueError, TypeError):
        return None


def _find_drug_row(df: pd.DataFrame) -> int | None:
    """Devuelve el índice de la fila cuyo col-0 contiene DELITO_DROGAS_LABEL."""
    label = DELITO_DROGAS_LABEL.lower()
    for idx, row in df.iterrows():
        if label in _normalize(row.iloc[0]).lower():
            return int(str(idx))
    return None


def _parse_delitos(xl: pd.ExcelFile, anio: int) -> list[dict]:
    """
    Hoja "Delitos": extrae ingresos y términos nacionales para Ley de Drogas.
    Estructura: Col0=nombre, Col1=n_ingresos, Col2=%, Col3=n_terminos, Col4=%, ...
    """
    rows: list[dict] = []
    if SHEET_DELITOS not in xl.sheet_names:
        return rows

    df = xl.parse(SHEET_DELITOS, header=None, dtype=str)
    drug_idx = _find_drug_row(df)
    if drug_idx is None:
        logger.warning(f"  '{DELITO_DROGAS_LABEL}' no encontrado en hoja '{SHEET_DELITOS}'")
        return rows

    row = df.iloc[drug_idx]
    n_ingresos = _safe_int(row.iloc[1]) if len(row) > 1 else None
    n_terminos = _safe_int(row.iloc[3]) if len(row) > 3 else None

    if n_ingresos is not None:
        rows.append({
            "anio": anio, "region_id": None, "region_nombre": "Nacional",
            "tipo_delito": DELITO_DROGAS_LABEL, "tipo_termino": "Ingresos",
            "n_causas": n_ingresos, "n_imputados": None,
        })
    if n_terminos is not None:
        rows.append({
            "anio": anio, "region_id": None, "region_nombre": "Nacional",
            "tipo_delito": DELITO_DROGAS_LABEL, "tipo_termino": "Términos",
            "n_causas": n_terminos, "n_imputados": None,
        })

    logger.info(f"  'Delitos': ingresos={n_ingresos}, términos={n_terminos}")
    return rows


def _parse_delitos_ft(xl: pd.ExcelFile, anio: int) -> list[dict]:
    """
    Hoja "Delitos FT": extrae el desglose nacional de términos por forma
    (Absolución, Condena, Derivación, etc.) para Ley de Drogas.
    """
    rows: list[dict] = []
    if SHEET_DELITOS_FT not in xl.sheet_names:
        return rows

    df = xl.parse(SHEET_DELITOS_FT, header=None, dtype=str)
    drug_idx = _find_drug_row(df)
    if drug_idx is None:
        return rows

    row = df.iloc[drug_idx]
    for outcome_name, col_idx in FT_OUTCOMES.items():
        if col_idx >= len(row):
            continue
        n = _safe_int(row.iloc[col_idx])
        if n is not None and n > 0:
            rows.append({
                "anio": anio, "region_id": None, "region_nombre": "Nacional",
                "tipo_delito": DELITO_DROGAS_LABEL, "tipo_termino": outcome_name,
                "n_causas": n, "n_imputados": None,
            })

    logger.info(f"  'Delitos FT': {len(rows)} formas de término extraídas")
    return rows


def _parse_ingresos_dr(xl: pd.ExcelFile, anio: int) -> list[dict]:
    """
    Hoja "Ingresos Terminos DR": extrae ingresos totales (todos los delitos) por región.
    Sirve para calcular el peso proporcional regional cuando se distribuye
    el total nacional de drogas en el mapa.
    Col estructura: [0]=Región, [1]=Ingresos imputados, [3]=Términos imputados,
                    [5]=Tasa, [6]=Ingresos delitos, [8]=Términos delitos
    """
    rows: list[dict] = []
    if SHEET_INGRESOS not in xl.sheet_names:
        return rows

    df = xl.parse(SHEET_INGRESOS, header=None, dtype=str)

    # Detectar filas con nombres de regiones (tienen valores numéricos en cols 1+)
    from etl.dpp.config import REGION_ID_MAP
    for _, row in df.iterrows():
        region_nombre = _normalize(row.iloc[0])
        if not region_nombre or region_nombre.lower() in ("nan", "región", ""):
            continue

        region_id = None
        for key, rid in REGION_ID_MAP.items():
            if key.lower() in region_nombre.lower() or region_nombre.lower() in key.lower():
                region_id = rid
                break
        if region_id is None:
            continue

        n_ingresos = _safe_int(row.iloc[1]) if len(row) > 1 else None
        if n_ingresos is None or n_ingresos <= 0:
            continue

        rows.append({
            "anio": anio, "region_id": region_id, "region_nombre": region_nombre,
            "tipo_delito": "Todos los delitos (peso regional)",
            "tipo_termino": "Ingresos",
            "n_causas": n_ingresos, "n_imputados": None,
        })

    logger.info(f"  'Ingresos Terminos DR': {len(rows)} regiones")
    return rows


def _parse_xlsx(xlsx_path: Path, anio: int) -> pd.DataFrame:
    import warnings
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        xl = pd.ExcelFile(xlsx_path, engine="openpyxl")

    all_rows: list[dict] = []
    all_rows.extend(_parse_delitos(xl, anio))
    all_rows.extend(_parse_delitos_ft(xl, anio))
    all_rows.extend(_parse_ingresos_dr(xl, anio))

    return pd.DataFrame(all_rows) if all_rows else pd.DataFrame()


class DppConsolidator:
    def __init__(self, raw_dir: Path = RAW_DATA_DIR, db_url: str | None = None):
        self.raw_dir = raw_dir
        self.db_url = db_url

    def run(self, anios: list[int] | None = None) -> pd.DataFrame:
        xlsx_files = sorted(self.raw_dir.glob("dpp_*.xlsx"))
        if not xlsx_files:
            logger.warning(f"No se encontraron archivos XLSX en {self.raw_dir}.")
            return pd.DataFrame()

        dfs: list[pd.DataFrame] = []
        for xlsx_path in xlsx_files:
            try:
                anio = int(xlsx_path.stem.split("_")[1])
            except (IndexError, ValueError):
                logger.warning(f"Nombre inesperado: {xlsx_path.name}. Omitido.")
                continue

            if anios is not None and anio not in anios:
                continue

            logger.info(f"Procesando {xlsx_path.name} (año {anio})...")
            df = _parse_xlsx(xlsx_path, anio)
            if not df.empty:
                dfs.append(df)
                logger.info(f"  → {len(df)} filas extraídas")
            else:
                logger.warning(f"  Sin datos extraídos de {xlsx_path.name}.")

        if not dfs:
            logger.warning("No se encontraron datos en ningún XLSX.")
            return pd.DataFrame()

        full_df = pd.concat(dfs, ignore_index=True)
        logger.info(f"Total filas a cargar: {len(full_df)}")

        if self.db_url:
            self._cargar_postgresql(full_df)

        return full_df

    def _cargar_postgresql(self, df: pd.DataFrame) -> None:
        engine = create_engine(self.db_url)

        with engine.begin() as conn:
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS dpp_causas (
                    id               SERIAL PRIMARY KEY,
                    anio             SMALLINT NOT NULL,
                    region_id        VARCHAR(3),
                    region_nombre    VARCHAR(80),
                    comuna_id        VARCHAR(6),
                    tipo_delito      VARCHAR(150) NOT NULL,
                    tipo_termino     VARCHAR(100),
                    n_causas         INTEGER,
                    n_imputados      INTEGER,
                    fuente           VARCHAR(50) NOT NULL DEFAULT 'DPP-SIGDP',
                    descargado_en    TIMESTAMPTZ DEFAULT NOW()
                )
            """))
            conn.execute(text("""
                CREATE UNIQUE INDEX IF NOT EXISTS uq_dpp_causas
                ON dpp_causas (anio, COALESCE(region_id,''), tipo_delito, COALESCE(tipo_termino,''))
            """))

        for col in INSERT_COLUMNS:
            if col not in df.columns:
                df[col] = None

        # Asegurar tipos correctos para que to_sql cree columnas INTEGER, no TEXT
        import pandas as pd
        df["anio"]       = pd.to_numeric(df["anio"],       errors="coerce").astype("Int64")
        df["n_causas"]   = pd.to_numeric(df["n_causas"],   errors="coerce").astype("Int64")
        df["n_imputados"] = pd.to_numeric(df["n_imputados"], errors="coerce").astype("Int64")

        staging_upsert(
            df=df,
            engine=engine,
            target_table="dpp_causas",
            insert_columns=INSERT_COLUMNS,
            conflict_columns=["anio", "tipo_delito", "tipo_termino"],
            staging_table="dpp_causas_staging",
        )
