# backend/etl/cead/consolidator.py
"""
Fase 3: Lee los archivos Excel descargados, normaliza columnas,
añade taxonomy_version y carga en PostgreSQL con upsert seguro.
"""
import logging
from pathlib import Path

import pandas as pd
from sqlalchemy import create_engine, text

from etl.cead.config import (
    RAW_DATA_DIR,
    TAXONOMY_LEGACY,
    TAXONOMY_2024,
    TAXONOMY_CUTOFF_YEAR,
)

logger = logging.getLogger(__name__)

# Mapeo flexible de columnas: nombres posibles → nombre normalizado
COLUMN_MAP = {
    "region": ["Region", "Región", "region", "región"],
    "provincia": ["Provincia", "provincia"],
    "comuna": ["Comuna", "comuna"],
    "anio": ["Anio", "Año", "anio", "año"],
    "mes": ["Mes", "mes"],
    "subgrupo": ["Subgrupo", "subgrupo"],
    "grupo": ["Grupo", "grupo"],
    "familia": ["Familia", "familia"],
    "tipo_caso": ["Tipo", "tipo", "TipoCaso"],
    "frecuencia": ["Frecuencia", "frecuencia", "Casos"],
    "tasa_100k": ["Tasa", "tasa", "Tasa100k"],
}


class CeadConsolidator:
    def __init__(self, raw_dir: Path = RAW_DATA_DIR, db_url: str | None = None):
        self.raw_dir = raw_dir
        self.db_url = db_url

    def _normalizar(self, df: pd.DataFrame, anio: int) -> pd.DataFrame:
        """Renombra columnas, añade taxonomy_version y descarta filas vacías."""
        rename = {}
        for target, candidates in COLUMN_MAP.items():
            for c in candidates:
                if c in df.columns:
                    rename[c] = target
                    break
        df = df.rename(columns=rename)

        # Si el Excel no tiene columna 'anio', se inyecta desde el nombre del archivo
        if "anio" not in df.columns:
            df["anio"] = anio

        required = ["comuna", "anio"]
        df = df.dropna(subset=[c for c in required if c in df.columns])
        if df.empty:
            return df

        df["taxonomy_version"] = TAXONOMY_2024 if anio >= TAXONOMY_CUTOFF_YEAR else TAXONOMY_LEGACY
        return df

    def _leer_excel(self, path: Path) -> pd.DataFrame | None:
        try:
            # El año está codificado en el nombre del archivo: ANIO_comunaId_subgrupoId.xlsx
            anio = int(path.stem.split("_")[0])
            df = pd.read_excel(path)
            return self._normalizar(df, anio)
        except Exception as e:
            logger.error(f"Error leyendo {path.name}: {e}")
            return None

    def run(self) -> pd.DataFrame:
        archivos = list(self.raw_dir.glob("*.xlsx"))
        logger.info(f"Consolidando {len(archivos)} archivos Excel...")

        frames = []
        for archivo in archivos:
            df = self._leer_excel(archivo)
            if df is not None and not df.empty:
                frames.append(df)

        if not frames:
            logger.warning("No se encontraron datos para consolidar.")
            return pd.DataFrame()

        consolidado = pd.concat(frames, ignore_index=True)
        logger.info(f"Total filas consolidadas: {len(consolidado)}")

        if self.db_url:
            self._cargar_postgresql(consolidado)

        return consolidado

    def _cargar_postgresql(self, df: pd.DataFrame) -> None:
        engine = create_engine(self.db_url)
        with engine.begin() as conn:
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS cead_hechos (
                    id               SERIAL PRIMARY KEY,
                    anio             SMALLINT NOT NULL,
                    mes              SMALLINT,
                    region_cod       VARCHAR(3),
                    provincia_cod    VARCHAR(5),
                    comuna_cod       VARCHAR(6) NOT NULL,
                    comuna_nombre    VARCHAR(100) NOT NULL,
                    subgrupo         VARCHAR(100),
                    grupo            VARCHAR(100),
                    familia          VARCHAR(100),
                    tipo_caso        VARCHAR(20),
                    frecuencia       INTEGER,
                    tasa_100k        NUMERIC(10,4),
                    taxonomy_version VARCHAR(20) NOT NULL,
                    descargado_en    TIMESTAMPTZ DEFAULT NOW(),
                    UNIQUE (anio, mes, comuna_cod, subgrupo, tipo_caso, taxonomy_version)
                )
            """))
        # Usar staging + ON CONFLICT DO NOTHING para evitar duplicados en re-ejecuciones
        df.to_sql("cead_hechos_staging", engine, if_exists="replace", index=False)
        with engine.begin() as conn:
            conn.execute(text("""
                INSERT INTO cead_hechos (anio, mes, region_cod, provincia_cod, comuna_cod,
                    comuna_nombre, subgrupo, grupo, familia, tipo_caso, frecuencia, tasa_100k, taxonomy_version)
                SELECT anio, mes, region_cod, provincia_cod, comuna_cod,
                    comuna_nombre, subgrupo, grupo, familia, tipo_caso, frecuencia, tasa_100k, taxonomy_version
                FROM cead_hechos_staging
                ON CONFLICT (anio, mes, comuna_cod, subgrupo, tipo_caso, taxonomy_version) DO NOTHING
            """))
            conn.execute(text("DROP TABLE IF EXISTS cead_hechos_staging"))
        logger.info(f"Cargadas {len(df)} filas en cead_hechos (ON CONFLICT DO NOTHING)")
