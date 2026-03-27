# backend/etl/common/base_consolidator.py
"""
Utilidad compartida para cargar DataFrames en PostgreSQL usando el patrón
staging-table + INSERT ON CONFLICT DO NOTHING, que garantiza idempotencia.
"""
import logging

import pandas as pd
from sqlalchemy import text

logger = logging.getLogger(__name__)


def staging_upsert(
    df: pd.DataFrame,
    engine,
    target_table: str,
    insert_columns: list[str],
    conflict_columns: list[str],
    staging_table: str | None = None,
) -> int:
    """
    Carga ``df`` en ``target_table`` de forma idempotente:
    1. Escribe a una tabla temporal (staging).
    2. INSERT INTO target ... SELECT ... FROM staging ON CONFLICT DO NOTHING.
    3. Elimina la tabla temporal.

    Retorna el número de filas en el DataFrame (no las insertadas realmente,
    porque ON CONFLICT DO NOTHING no reporta duplicados con SQLAlchemy sync).
    """
    if df.empty:
        logger.warning(f"DataFrame vacío — nada que cargar en {target_table}.")
        return 0

    if staging_table is None:
        staging_table = f"{target_table}_staging"

    cols = ", ".join(insert_columns)

    df[insert_columns].to_sql(staging_table, engine, if_exists="replace", index=False)

    # ON CONFLICT DO NOTHING sin especificar columnas funciona con cualquier
    # índice UNIQUE de la tabla, incluidos los que usan expresiones COALESCE.
    with engine.begin() as conn:
        conn.execute(text(f"""
            INSERT INTO {target_table} ({cols})
            SELECT {cols} FROM {staging_table}
            ON CONFLICT DO NOTHING
        """))
        conn.execute(text(f"DROP TABLE IF EXISTS {staging_table}"))

    logger.info(f"Cargadas {len(df)} filas en {target_table} (ON CONFLICT DO NOTHING)")
    return len(df)
