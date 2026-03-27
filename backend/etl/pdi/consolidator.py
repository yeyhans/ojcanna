# backend/etl/pdi/consolidator.py
"""
Lee los XLS de la PDI, filtra filas de Ley de Drogas y carga en datosgob_seguridad.

Estructura esperada del XLS PDI (datos.gob.cl):
  - Fila 0 o 1: encabezados de regiones (columnas = regiones)
  - Columna 0: tipo de delito/falta
  - Valores: conteos enteros por región

  El script detecta automáticamente la fila de encabezados y la columna
  de etiquetas de delito.
"""
import logging
import re
from pathlib import Path

import pandas as pd
from sqlalchemy import create_engine, text

from etl.pdi.config import RAW_DATA_DIR, DRUG_KEYWORDS, REGION_ID_MAP
from etl.common.base_consolidator import staging_upsert

logger = logging.getLogger(__name__)

INSERT_COLUMNS = ["anio", "comuna_id", "categoria", "subcategoria", "frecuencia", "fuente"]


def _normalize(s: object) -> str:
    return re.sub(r"\s+", " ", str(s)).strip()


def _is_drug_row(label: str) -> bool:
    lower = label.lower()
    return any(kw in lower for kw in DRUG_KEYWORDS)


def _find_header_and_data(df: pd.DataFrame) -> tuple[int, int]:
    """
    Retorna (header_row_idx, data_start_row_idx).
    Busca la fila que contiene nombres de regiones como encabezado.
    """
    for i, row in df.iterrows():
        vals = [_normalize(v).lower() for v in row]
        if sum(1 for r in ["arica", "tarapacá", "valparaíso", "maule", "biobío"] if any(r in v for v in vals)) >= 2:
            return int(str(i)), int(str(i)) + 1
    return 0, 1


def _parse_xls(path: Path, anio: int, tipo: str) -> pd.DataFrame:
    try:
        df_raw = pd.read_excel(path, header=None, dtype=str)
    except Exception as e:
        logger.error(f"Error leyendo {path.name}: {e}")
        return pd.DataFrame()

    header_idx, data_start = _find_header_and_data(df_raw)
    header_row = df_raw.iloc[header_idx]
    data = df_raw.iloc[data_start:].reset_index(drop=True)

    rows: list[dict] = []

    for _, row in data.iterrows():
        label = _normalize(row.iloc[0])
        if not label or label.lower() in ("nan", "total", ""):
            continue
        if not _is_drug_row(label):
            continue

        for col_i in range(1, len(header_row)):
            col_name = _normalize(header_row.iloc[col_i])
            if not col_name or col_name.lower() == "total":
                continue

            region_id = None
            for key, rid in REGION_ID_MAP.items():
                if key.lower() in col_name.lower() or col_name.lower() in key.lower():
                    region_id = rid
                    break

            if region_id is None:
                continue

            raw_val = row.iloc[col_i]
            try:
                frecuencia = float(str(raw_val).replace(",", ".").replace(" ", ""))
            except (ValueError, TypeError):
                frecuencia = None

            if frecuencia is None:
                continue

            rows.append({
                "anio": anio,
                "comuna_id": None,       # datos PDI son regionales
                "region_id": region_id,  # columna extra para JOIN
                "categoria": label,
                "subcategoria": tipo,
                "frecuencia": frecuencia,
                "fuente": "PDI-datos.gob.cl",
            })

    logger.info(f"  {path.name}: {len(rows)} filas de drogas extraídas")
    return pd.DataFrame(rows)


class PdiConsolidator:
    def __init__(self, raw_dir: Path = RAW_DATA_DIR, db_url: str | None = None):
        self.raw_dir = raw_dir
        self.db_url = db_url

    def run(self) -> pd.DataFrame:
        xls_files = sorted(self.raw_dir.glob("pdi_*.xls"))
        if not xls_files:
            logger.warning(f"No se encontraron archivos XLS en {self.raw_dir}.")
            return pd.DataFrame()

        dfs: list[pd.DataFrame] = []
        for xls_path in xls_files:
            # Nombre: pdi_2024_delitos.xls → anio=2024, tipo="delitos"
            parts = xls_path.stem.split("_")
            try:
                anio = int(parts[1])
                tipo = parts[2] if len(parts) > 2 else "general"
            except (IndexError, ValueError):
                logger.warning(f"Nombre inesperado: {xls_path.name}. Omitido.")
                continue

            df = _parse_xls(xls_path, anio, tipo)
            if not df.empty:
                dfs.append(df)

        if not dfs:
            logger.warning("Sin datos de drogas en archivos PDI.")
            return pd.DataFrame()

        full_df = pd.concat(dfs, ignore_index=True)
        logger.info(f"Total filas PDI: {len(full_df)}")

        if self.db_url:
            self._cargar_postgresql(full_df)

        return full_df

    def _cargar_postgresql(self, df: pd.DataFrame) -> None:
        engine = create_engine(self.db_url)

        with engine.begin() as conn:
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS datosgob_seguridad (
                    id            SERIAL PRIMARY KEY,
                    anio          SMALLINT NOT NULL,
                    comuna_id     VARCHAR(6),
                    region_id     VARCHAR(3),
                    categoria     VARCHAR(150) NOT NULL,
                    subcategoria  VARCHAR(150),
                    frecuencia    NUMERIC(12, 4),
                    tasa_100k     NUMERIC(10, 4),
                    fuente        VARCHAR(50) NOT NULL DEFAULT 'datos.gob.cl',
                    descargado_en TIMESTAMPTZ DEFAULT NOW()
                )
            """))
            conn.execute(text("""
                CREATE UNIQUE INDEX IF NOT EXISTS uq_datosgob_seguridad
                ON datosgob_seguridad (anio, COALESCE(region_id, ''), categoria, COALESCE(subcategoria, ''))
            """))

        # Asegurar tipos correctos para evitar type mismatch en staging
        df["anio"]      = pd.to_numeric(df["anio"],      errors="coerce").astype("Int64")
        df["frecuencia"] = pd.to_numeric(df["frecuencia"], errors="coerce")

        load_cols = [c for c in INSERT_COLUMNS + ["region_id"] if c in df.columns]
        staging_upsert(
            df=df,
            engine=engine,
            target_table="datosgob_seguridad",
            insert_columns=load_cols,
            conflict_columns=["anio", "categoria"],
            staging_table="datosgob_seguridad_staging",
        )
