# backend/etl/cead/consolidator.py
"""
Fase 3: Lee el JSONL de checkpoint (datos crudos extraídos por el extractor),
normaliza tipos y carga en PostgreSQL con upsert seguro.
"""
import json
import logging
from pathlib import Path

import pandas as pd
from sqlalchemy import create_engine, text

from etl.cead.config import CHECKPOINT_FILE

logger = logging.getLogger(__name__)

# Columnas esperadas del JSONL (producidas por CeadExtractor)
EXPECTED_COLS = [
    "anio", "region_id", "provincia_id", "comuna_id", "comuna_nombre",
    "subgrupo_id", "subgrupo_nombre", "grupo_id", "familia_id",
    "tasa_100k", "frecuencia", "tipo_caso", "taxonomy_version",
]


class CeadConsolidator:
    def __init__(self, checkpoint_path: Path = CHECKPOINT_FILE, db_url: str | None = None):
        self.checkpoint_path = checkpoint_path
        self.db_url = db_url

    def _leer_jsonl(self) -> pd.DataFrame:
        rows = []
        with open(self.checkpoint_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line:
                    try:
                        rows.append(json.loads(line))
                    except json.JSONDecodeError as e:
                        logger.warning(f"Línea JSONL inválida: {e}")
        df = pd.DataFrame(rows)
        if df.empty:
            return df

        # Tipos
        df["anio"] = pd.to_numeric(df["anio"], errors="coerce").astype("Int16")
        df["frecuencia"] = pd.to_numeric(df.get("frecuencia"), errors="coerce")
        df["tasa_100k"] = pd.to_numeric(df.get("tasa_100k"), errors="coerce")

        # Descartar filas sin claves primarias
        df = df.dropna(subset=["anio", "comuna_id", "subgrupo_id"])
        return df

    def run(self) -> pd.DataFrame:
        if not self.checkpoint_path.exists():
            logger.warning(f"Checkpoint no encontrado: {self.checkpoint_path}")
            return pd.DataFrame()

        df = self._leer_jsonl()
        logger.info(f"Total filas en JSONL: {len(df)}")

        if df.empty:
            logger.warning("No se encontraron datos para consolidar.")
            return df

        if self.db_url:
            self._cargar_postgresql(df)

        return df

    def _cargar_postgresql(self, df: pd.DataFrame) -> None:
        engine = create_engine(self.db_url)
        with engine.begin() as conn:
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS cead_hechos (
                    id               SERIAL PRIMARY KEY,
                    anio             SMALLINT NOT NULL,
                    region_id        VARCHAR(3),
                    provincia_id     VARCHAR(5),
                    comuna_id        VARCHAR(6) NOT NULL,
                    comuna_nombre    VARCHAR(100) NOT NULL,
                    subgrupo_id      VARCHAR(10) NOT NULL,
                    subgrupo_nombre  VARCHAR(100),
                    grupo_id         VARCHAR(10),
                    familia_id       VARCHAR(10),
                    tipo_caso        VARCHAR(30),
                    frecuencia       NUMERIC(12,4),
                    tasa_100k        NUMERIC(10,4),
                    taxonomy_version VARCHAR(20) NOT NULL,
                    descargado_en    TIMESTAMPTZ DEFAULT NOW(),
                    UNIQUE (anio, comuna_id, subgrupo_id, tipo_caso, taxonomy_version)
                )
            """))

        df.to_sql("cead_hechos_staging", engine, if_exists="replace", index=False)
        with engine.begin() as conn:
            conn.execute(text("""
                INSERT INTO cead_hechos (
                    anio, region_id, provincia_id, comuna_id, comuna_nombre,
                    subgrupo_id, subgrupo_nombre, grupo_id, familia_id,
                    tipo_caso, frecuencia, tasa_100k, taxonomy_version
                )
                SELECT
                    anio, region_id, provincia_id, comuna_id, comuna_nombre,
                    subgrupo_id, subgrupo_nombre, grupo_id, familia_id,
                    tipo_caso, frecuencia, tasa_100k, taxonomy_version
                FROM cead_hechos_staging
                ON CONFLICT (anio, comuna_id, subgrupo_id, tipo_caso, taxonomy_version) DO NOTHING
            """))
            conn.execute(text("DROP TABLE IF EXISTS cead_hechos_staging"))
        logger.info(f"Cargadas {len(df)} filas en cead_hechos (ON CONFLICT DO NOTHING)")
