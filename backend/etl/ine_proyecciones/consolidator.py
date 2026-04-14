# backend/etl/ine_proyecciones/consolidator.py
"""
Consolida el XLSX de Proyecciones de Población Comunal INE en PostgreSQL.

Estructura real verificada del XLSX INE (base Censo 2017):
  Una sola hoja: 'Est. y Proy. de Pob. Comunal'
  Header en fila 0 (primera fila).

  Columnas:
    Region, Nombre Region, Provincia, Nombre Provincia,
    Comuna (CUT), Nombre Comuna,
    Sexo (1=Hombre / 2=Mujer),
    Edad (grupos 0..99 o similar),
    Poblacion 2002, Poblacion 2003, ..., Poblacion 2035

  ~56052 filas = 346 comunas × 2 sexos × ~81 grupos de edad

Estrategia:
  - Agrupar por (CUT, Nombre) sumando los dos sexos y todas las edades.
  - Resultado: 346 comunas × 34 años = ~11764 filas.
  - Long format: (cut, nombre, anio, poblacion_total).
"""
import logging
import warnings
from pathlib import Path

import pandas as pd
from sqlalchemy import create_engine

from etl.common.base_consolidator import staging_upsert
from etl.ine_proyecciones.config import ANIOS_COMPLETOS

logger = logging.getLogger(__name__)

TARGET_TABLE = "ine_poblacion"
INSERT_COLUMNS = ["cut", "nombre", "anio", "poblacion_total", "fuente"]
FUENTE = "ine_proyecciones_2017"

# Prefijo de columnas de año en el XLSX
_COL_PREFIX = "Poblacion "


def _normalize_cut(val) -> str:
    """
    Normaliza el CUT comunal a str sin zero-padding.
    INE lo entrega como str '1101', '13101', etc.
    CEAD usa el mismo formato — solo forzar str limpio.
    """
    if val is None:
        return ""
    try:
        return str(int(float(str(val).strip())))
    except (ValueError, TypeError):
        return str(val).strip()


def load_xlsx(path: Path) -> pd.DataFrame:
    """
    Lee el XLSX del INE y retorna un DataFrame en long format:
    [cut (str), nombre (str), anio (int), poblacion_total (int)]

    El archivo tiene una fila por (comuna, sexo, grupo_de_edad).
    Se suman todos los sexos y edades por (cut, año) para obtener
    la población total comunal.
    """
    logger.info(f"Leyendo XLSX: {path} ({path.stat().st_size / 1024:.0f} KB)")

    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        df_raw = pd.read_excel(
            path,
            sheet_name=0,       # única hoja
            header=0,           # fila 0 es el encabezado real
            dtype=str,          # leer todo como str para evitar coerciones
            engine="openpyxl",
        )

    logger.info(f"Shape raw: {df_raw.shape}")
    logger.info(f"Columnas: {list(df_raw.columns[:12])}")

    # Identificar columnas de año (tienen prefijo "Poblacion XXXX")
    year_cols: dict[int, str] = {}
    for col in df_raw.columns:
        col_str = str(col).strip()
        if col_str.startswith(_COL_PREFIX):
            try:
                year = int(col_str.replace(_COL_PREFIX, "").strip())
                if 2002 <= year <= 2035:
                    year_cols[year] = col_str
            except ValueError:
                pass

    if not year_cols:
        raise ValueError(
            f"No se encontraron columnas con prefijo '{_COL_PREFIX}' en el XLSX. "
            f"Columnas disponibles: {list(df_raw.columns[:20])}"
        )
    logger.info(f"Anos detectados: {sorted(year_cols.keys())}")

    # Identificar columna CUT y nombre
    # Columna 4 = 'Comuna', columna 5 = 'Nombre Comuna' (verificado)
    cut_col = "Comuna"
    nombre_col = "Nombre Comuna"

    if cut_col not in df_raw.columns:
        # Fallback por posición
        cut_col = df_raw.columns[4]
        logger.warning(f"Columna 'Comuna' no encontrada. Usando '{cut_col}'")
    if nombre_col not in df_raw.columns:
        nombre_col = df_raw.columns[5]
        logger.warning(f"Columna 'Nombre Comuna' no encontrada. Usando '{nombre_col}'")

    # Normalizar CUT
    df_raw["_cut"] = df_raw[cut_col].apply(_normalize_cut)

    # Filtrar filas con CUT válido (4-5 dígitos numéricos)
    mask = df_raw["_cut"].str.match(r"^\d{4,5}$", na=False)
    df_valid = df_raw[mask].copy()

    discarded = len(df_raw) - len(df_valid)
    logger.info(
        f"Filas con CUT valido: {len(df_valid)} de {len(df_raw)} "
        f"({discarded} filas de encabezados/totales descartadas)"
    )

    if df_valid.empty:
        raise ValueError(
            f"Ninguna fila tiene CUT valido. "
            f"Valores en '{cut_col}': {df_raw[cut_col].unique()[:10]}"
        )

    # Convertir columnas de año a numérico
    for col in year_cols.values():
        df_valid[col] = pd.to_numeric(df_valid[col], errors="coerce")

    # Agrupar por (cut, nombre) sumando sexos + edades
    agg_cols = {col: "sum" for col in year_cols.values()}
    # Para nombre: tomar el primero (es igual para todas las filas de esa comuna)
    agg_cols[nombre_col] = "first"

    df_grouped = df_valid.groupby("_cut", as_index=False).agg(agg_cols)
    comunas_unicas = len(df_grouped)
    logger.info(f"Comunas unicas tras agrupacion: {comunas_unicas}")

    # Filtrar solo los años objetivo (alineados con CEAD)
    target_year_cols = {y: year_cols[y] for y in ANIOS_COMPLETOS if y in year_cols}
    logger.info(f"Anos a cargar: {sorted(target_year_cols.keys())}")

    # Melt a long format
    df_long = df_grouped.melt(
        id_vars=["_cut", nombre_col],
        value_vars=list(target_year_cols.values()),
        var_name="_col_anio",
        value_name="_pob",
    )

    # Mapear nombre de columna → año numérico
    col_to_year = {v: k for k, v in target_year_cols.items()}
    df_long["anio"] = df_long["_col_anio"].map(col_to_year).astype(int)

    # Descartar filas con población nula
    df_long = df_long[df_long["_pob"].notna() & (df_long["_pob"] > 0)].copy()

    df_result = pd.DataFrame({
        "cut": df_long["_cut"].astype(str),
        "nombre": df_long[nombre_col].astype(str).str.strip(),
        "anio": df_long["anio"].astype(int),
        "poblacion_total": df_long["_pob"].astype(int),
        "fuente": FUENTE,
    }).sort_values(["cut", "anio"]).reset_index(drop=True)

    anios_cubiertos = sorted(df_result["anio"].unique())
    logger.info(
        f"DataFrame final: {len(df_result)} filas | "
        f"{df_result['cut'].nunique()} comunas | "
        f"anios: {anios_cubiertos[0]}-{anios_cubiertos[-1]}"
    )

    # Estadísticas por año
    counts = df_result.groupby("anio").size()
    for anio, n in counts.items():
        logger.info(f"  {anio}: {n:>4} comunas")

    return df_result


async def consolidate(db_url: str, xlsx_path: Path) -> int:
    """
    Carga el DataFrame de proyecciones en ``ine_poblacion`` via staging_upsert.

    Returns
    -------
    int
        Número de filas en el DataFrame procesado.
    """
    df = load_xlsx(xlsx_path)

    engine = create_engine(db_url)
    rows_loaded = staging_upsert(
        df=df,
        engine=engine,
        target_table=TARGET_TABLE,
        insert_columns=INSERT_COLUMNS,
        conflict_columns=["cut", "anio", "fuente"],
        staging_table=f"{TARGET_TABLE}_staging",
    )

    engine.dispose()
    return rows_loaded
