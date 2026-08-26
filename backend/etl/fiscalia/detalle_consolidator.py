# backend/etl/fiscalia/detalle_consolidator.py
"""
Consolidador de las hojas del Boletín Anual de Fiscalía que `consolidator.py`
no cubre.

El boletín trae 62 hojas; el pipeline original usa 4 (TB3.1/TB3.2 → ingresos,
TB4.1/TB4.2 → términos). Este módulo suma cuatro más, todas verificadas sobre
el boletín 2025 el 2026-08-25:

    TB6.2   Términos aplicados por región y categoría de delitos
            → tipos de término reales (sentencia condenatoria, absolutoria,
              sobreseimientos, suspensión condicional, acuerdo reparatorio,
              archivo provisional, decisión de no perseverar…).
              Es el equivalente Fiscalía de las formas de término de la DPP.

    TB9     Juicios orales realizados por región y categoría de delito
            → lo más cercano a etapa judicial disponible sin PJud.

    TB7     Tiempos promedio de tramitación (días) por región y categoría
            → eje de duración del proceso, separado en salida judicial y
              salida no judicial (son promedios: NO se suman entre sí).

    TB5.2.1 Imputados conocidos por categoría de delitos, sexo y tramo etario
            → demografía de imputados. Publicada SOLO a nivel nacional.

NO se ingiere TB11 (audiencias de formalización): se publica por región pero sin
categoría de delito, así que no permite aislar Ley 20.000. Imputarla violaría la
política anti-imputación (FUENTES.md §7).

Estructuras verificadas (índices 0-based, boletín 2025):

  TB7  / TB3.1 / TB4.1 : header regiones fila 6, categoría en col 1, datos desde col 3
  TB9  / TB5.2.1       : categoría en col 0, datos desde col 2
  TB6.2                : bloques por categoría; la categoría aparece en col 0 en la
                         primera fila del bloque y col 1 lleva el tipo de término.
                         El header de regiones se repite antes de cada bloque.

Cada hoja publica DOS bloques para la misma categoría: valores absolutos y,
más abajo, la misma tabla en porcentajes (fracciones 0<v<1). El segundo bloque
se descarta con `_safe_num(..., enteros=True)`, salvo en TB7 donde ambos bloques
son conteos reales (salida judicial / salida no judicial) y se distinguen por
posición.

Regla dura: si una hoja o categoría no aparece, se loguea warning y se SKIPPEA.
Nunca se inventa ni se interpola un valor.
"""
import logging
import re
from pathlib import Path

import pandas as pd
from sqlalchemy import create_engine, text

from etl.common.base_consolidator import staging_upsert
from etl.fiscalia.config import DELITO_LEY_DROGAS, RAW_DATA_DIR
from etl.fiscalia.consolidator import (
    CATEGORIA_DROGAS_OFICIAL,
    REGION_NOMBRE,
    RM_ZONAL_HEADERS,
    ROMAN_TO_REGION_ID,
    _normalize,
)

logger = logging.getLogger(__name__)

FUENTE = "fiscalia-boletin-anual"

INSERT_COLUMNS = [
    "anio",
    "metrica",
    "region_id",
    "region_nombre",
    "categoria_delito",
    "dimension",
    "subdimension",
    "valor",
    "unidad",
    "fuente",
]

# Filas de TB6.2 que son agregados calculados, no tipos de término atómicos.
# Se excluyen para que sumar la tabla no cuente doble.
TB62_AGREGADOS = ("SUBTOTAL", "TOTAL POR")

# Grupos de término en TB6.2, en el orden en que aparecen. El grupo activo
# cambia cada vez que se cruza el SUBTOTAL correspondiente.
TB62_GRUPOS = ["salida_judicial", "salida_no_judicial", "otros_terminos"]

# Columnas de TB5.2.1 → (sexo, tramo etario). Verificado en el boletín 2025:
# fila 7 lleva el sexo y fila 8 el tramo. Los "Subtotal" se omiten porque son
# la suma de las columnas anteriores.
TB521_COLUMNAS: dict[int, tuple[str, str]] = {
    2: ("Mujer", "Menor de edad"),
    3: ("Mujer", "Mayor de edad"),
    4: ("Mujer", "Sin información"),
    7: ("Hombre", "Menor de edad"),
    8: ("Hombre", "Mayor de edad"),
    9: ("Hombre", "Sin información"),
    12: ("Sin información", "Sin información"),
    14: ("Persona jurídica", "No aplica"),
}

# Columna con el total de imputados de la fila — sólo para control de cuadratura.
TOTAL_COL_TB521 = 16


def _safe_num(v: object, *, enteros: bool = True) -> float | None:
    """
    Convierte una celda en número.

    Con `enteros=True` rechaza fracciones 0<v<1 y decimales: son la tabla de
    porcentajes que Fiscalía superpone bajo la de valores absolutos.
    Con `enteros=False` acepta decimales (promedios de días).
    """
    if v is None:
        return None
    if isinstance(v, bool):
        return None
    if isinstance(v, (int, float)):
        if pd.isna(v):
            return None
        if enteros and (0 < float(v) < 1 or float(v) != int(v)):
            return None
        return float(v)
    s = _normalize(v).replace(",", "").replace(" ", "")
    if not s or s.lower() in {"nan", "-", "—", "n/a", "s/i"}:
        return None
    try:
        f = float(s)
    except (ValueError, TypeError):
        return None
    if enteros and (0 < f < 1 or f != int(f)):
        return None
    return f


def _region_cols(row: pd.Series) -> dict[int, str]:
    """{col_index: region_id} desde una fila de header en numeración romana."""
    out: dict[int, str] = {}
    rm_upper = {h.upper() for h in RM_ZONAL_HEADERS}
    for col_idx, val in row.items():
        if pd.isna(val):
            continue
        label = _normalize(val).upper()
        if label in ROMAN_TO_REGION_ID:
            out[int(col_idx)] = ROMAN_TO_REGION_ID[label]
        elif label in rm_upper:
            out[int(col_idx)] = "13"  # Metropolitana viene subdividida en 4 zonales
    return out


def _zonal_label(row: pd.Series, col_idx: int) -> str:
    """Etiqueta original de la columna (p. ej. 'RM SUR') para trazabilidad."""
    return _normalize(row.iloc[col_idx]).upper()


def _agregar_por_region(pares: list[tuple[str, float]]) -> dict[str, float]:
    """
    Suma los valores por region_id.

    Necesario porque Fiscalía publica la Metropolitana como cuatro fiscalías
    zonales (RM CN / OR / OCC / SUR) que mapean todas a region_id="13": sin
    sumarlas, el índice único de la tabla conservaría sólo una de las cuatro.
    Aplica SOLO a conteos. Los promedios no se suman (ver dias_tramitacion).
    """
    out: dict[str, float] = {}
    for region_id, valor in pares:
        out[region_id] = out.get(region_id, 0.0) + valor
    return out


def _find_header_row(df: pd.DataFrame, before_row: int | None = None) -> int | None:
    """
    Fila de header de regiones. Si `before_row` viene, busca hacia atrás desde
    ahí — TB6.2 repite el header antes de cada bloque de categoría.
    """
    rango = range(before_row, -1, -1) if before_row is not None else range(len(df))
    for r in rango:
        if len(_region_cols(df.iloc[r])) >= 8:
            return r
    return None


def _rows_categoria(df: pd.DataFrame, col: int) -> list[int]:
    """Índices de fila donde `col` es exactamente la categoría de drogas."""
    if df.shape[1] <= col:
        return []
    target = CATEGORIA_DROGAS_OFICIAL.upper()
    return [
        int(idx)
        for idx, val in df.iloc[:, col].items()
        if pd.notna(val) and _normalize(val).upper() == target
    ]


def _fila(
    anio: int,
    metrica: str,
    region_id: str | None,
    dimension: str | None,
    subdimension: str | None,
    valor: float,
    unidad: str,
) -> dict:
    return {
        "anio": anio,
        "metrica": metrica,
        "region_id": region_id,
        "region_nombre": REGION_NOMBRE.get(region_id) if region_id else None,
        "categoria_delito": DELITO_LEY_DROGAS,
        "dimension": dimension,
        "subdimension": subdimension,
        "valor": valor,
        "unidad": unidad,
        "fuente": FUENTE,
    }


# ---------------------------------------------------------------------------
# TB9 — juicios orales por región
# ---------------------------------------------------------------------------
def _extract_juicios_orales(df: pd.DataFrame, anio: int) -> list[dict]:
    filas = _rows_categoria(df, col=0)
    if not filas:
        logger.warning("  TB9: categoría de drogas no encontrada — skip")
        return []

    header = _find_header_row(df)
    if header is None:
        logger.warning("  TB9: sin fila de header de regiones — skip")
        return []
    cols = _region_cols(df.iloc[header])

    # Sólo el primer bloque: el segundo es la tabla de porcentajes.
    row = df.iloc[filas[0]]
    pares: list[tuple[str, float]] = []
    for col_idx, region_id in cols.items():
        v = _safe_num(row.iloc[col_idx], enteros=True)
        if v is not None:
            pares.append((region_id, v))

    return [
        _fila(anio, "juicios_orales", region_id, None, None, v, "juicios")
        for region_id, v in sorted(
            _agregar_por_region(pares).items(), key=lambda kv: int(kv[0])
        )
    ]


# ---------------------------------------------------------------------------
# TB7 — tiempos promedio de tramitación (días)
# ---------------------------------------------------------------------------
def _extract_dias_tramitacion(df: pd.DataFrame, anio: int) -> list[dict]:
    filas = _rows_categoria(df, col=1)
    if not filas:
        logger.warning("  TB7: categoría de drogas no encontrada — skip")
        return []

    header = _find_header_row(df)
    if header is None:
        logger.warning("  TB7: sin fila de header de regiones — skip")
        return []
    cols = _region_cols(df.iloc[header])

    # Dos bloques REALES (no porcentajes): salida judicial y no judicial.
    # Son promedios — jamás se suman entre sí.
    #
    # La Metropolitana llega como cuatro fiscalías zonales. A diferencia de los
    # conteos, estos valores NO pueden agregarse: promediar cuatro promedios sin
    # el volumen de causas de cada zonal daría un número que no existe en la
    # fuente. Se guardan las cuatro filas por separado, distinguidas en
    # `subdimension` con su etiqueta original; el resto de las regiones lleva
    # subdimension NULL.
    vias = ["salida_judicial", "salida_no_judicial"]
    header_row = df.iloc[header]
    out: list[dict] = []
    for i, fila_idx in enumerate(filas[: len(vias)]):
        via = vias[i]
        for col_idx, region_id in cols.items():
            v = _safe_num(df.iloc[fila_idx].iloc[col_idx], enteros=False)
            if v is None or v <= 0:
                continue
            zonal = _zonal_label(header_row, col_idx) if region_id == "13" else None
            out.append(
                _fila(anio, "dias_tramitacion", region_id, via, zonal, round(v, 1), "dias")
            )
    if len(filas) > len(vias):
        logger.warning(
            f"  TB7: {len(filas)} bloques de categoría, se esperaban {len(vias)} — "
            "se ignoran los sobrantes"
        )
    return out


# ---------------------------------------------------------------------------
# TB6.2 — tipos de término por región
# ---------------------------------------------------------------------------
def _extract_tipos_termino(df: pd.DataFrame, anio: int) -> list[dict]:
    inicios = _rows_categoria(df, col=0)
    if not inicios:
        logger.warning("  TB6.2: categoría de drogas no encontrada — skip")
        return []

    inicio = inicios[0]
    header = _find_header_row(df, before_row=inicio)
    if header is None:
        logger.warning("  TB6.2: sin header de regiones antes del bloque — skip")
        return []
    cols = _region_cols(df.iloc[header])

    out: list[dict] = []
    grupo_idx = 0
    # El bloque corre desde la fila de la categoría hasta su "TOTAL POR ...".
    for r in range(inicio, min(inicio + 40, len(df))):
        etiqueta_raw = df.iloc[r, 1] if df.shape[1] > 1 else None
        if pd.isna(etiqueta_raw):
            continue
        etiqueta = _normalize(etiqueta_raw).upper()

        if etiqueta.startswith("TOTAL POR"):
            break
        if etiqueta.startswith("SUBTOTAL"):
            # Cierra el grupo actual y pasa al siguiente.
            grupo_idx = min(grupo_idx + 1, len(TB62_GRUPOS) - 1)
            continue
        if any(etiqueta.startswith(a) for a in TB62_AGREGADOS):
            continue

        grupo = TB62_GRUPOS[grupo_idx]
        fila_datos = df.iloc[r]
        pares: list[tuple[str, float]] = []
        for col_idx, region_id in cols.items():
            v = _safe_num(fila_datos.iloc[col_idx], enteros=True)
            if v is not None:
                pares.append((region_id, v))

        tipo = _normalize(etiqueta_raw)
        out.extend(
            _fila(anio, "tipo_termino", region_id, tipo, grupo, v, "causas")
            for region_id, v in sorted(
                _agregar_por_region(pares).items(), key=lambda kv: int(kv[0])
            )
        )
    return out


# ---------------------------------------------------------------------------
# TB5.2.1 — imputados por sexo y tramo etario (NACIONAL, sin región)
# ---------------------------------------------------------------------------
def _extract_demografia(df: pd.DataFrame, anio: int) -> list[dict]:
    filas = _rows_categoria(df, col=0)
    if not filas:
        logger.warning("  TB5.2.1: categoría de drogas no encontrada — skip")
        return []

    # Primer bloque: valores absolutos. El segundo es porcentajes.
    row = df.iloc[filas[0]]
    out: list[dict] = []
    for col_idx, (sexo, tramo) in TB521_COLUMNAS.items():
        if df.shape[1] <= col_idx:
            continue
        v = _safe_num(row.iloc[col_idx], enteros=True)
        if v is None:
            continue
        out.append(_fila(anio, "imputados_demografia", None, sexo, tramo, v, "imputados"))

    # Control de cuadratura contra el total que publica la propia hoja (col 16).
    # No corrige nada: sólo avisa. En el boletín 2025 el subtotal de hombres
    # (23.852) no cuadra con sus componentes (23.851) — inconsistencia de la
    # fuente, verificada el 2026-08-25. En 2024 cuadra exacto.
    if df.shape[1] > TOTAL_COL_TB521:
        oficial = _safe_num(row.iloc[TOTAL_COL_TB521], enteros=True)
        propio = sum(f["valor"] for f in out)
        if oficial is not None and abs(oficial - propio) > 0:
            logger.warning(
                f"  TB5.2.1 ({anio}): el desglose suma {propio:.0f} y el total "
                f"publicado es {oficial:.0f} (diferencia {oficial - propio:+.0f}). "
                "Se conserva el desglose sin ajustar."
            )
    return out


EXTRACTORES = {
    "TB6.2": ("tipo_termino", _extract_tipos_termino),
    "TB9": ("juicios_orales", _extract_juicios_orales),
    "TB7": ("dias_tramitacion", _extract_dias_tramitacion),
    "TB5.2.1": ("imputados_demografia", _extract_demografia),
}


def _parse_boletin(path: Path, anio: int) -> pd.DataFrame:
    logger.info(f"Parseando detalle de {path.name} (año {anio})")
    engine = "openpyxl" if path.suffix.lower() == ".xlsx" else "xlrd"
    xl = pd.ExcelFile(path, engine=engine)

    all_rows: list[dict] = []
    for sheet, (metrica, extractor) in EXTRACTORES.items():
        if sheet not in xl.sheet_names:
            logger.warning(f"  Hoja '{sheet}' no existe en {path.name} — skip")
            continue
        df = xl.parse(sheet, header=None)
        rows = extractor(df, anio)
        if rows:
            logger.info(f"  {sheet} → métrica '{metrica}': {len(rows)} filas")
            all_rows.extend(rows)
        else:
            logger.warning(f"  {sheet} → métrica '{metrica}': sin datos extraíbles")

    return pd.DataFrame(all_rows) if all_rows else pd.DataFrame()


class FiscaliaDetalleConsolidator:
    """Lee las hojas con dimensiones del boletín y carga a `fiscalia_detalle`."""

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
            df = _parse_boletin(path, int(m.group(1)))
            if not df.empty:
                dfs.append(df)

        if not dfs:
            logger.warning("Sin detalle consolidado.")
            return pd.DataFrame()

        full = pd.concat(dfs, ignore_index=True)
        logger.info(f"Total filas de detalle: {len(full)}")
        for metrica, grupo in full.groupby("metrica"):
            logger.info(f"  {metrica}: {len(grupo)} filas")

        if self.db_url:
            self._load_to_postgres(full)
        return full

    def _load_to_postgres(self, df: pd.DataFrame) -> None:
        engine = create_engine(self.db_url)

        with engine.begin() as conn:
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS fiscalia_detalle (
                    id                 SERIAL PRIMARY KEY,
                    anio               SMALLINT NOT NULL,
                    metrica            VARCHAR(40) NOT NULL,
                    region_id          VARCHAR(3),
                    region_nombre      VARCHAR(80),
                    categoria_delito   VARCHAR(100) NOT NULL,
                    dimension          VARCHAR(80),
                    subdimension       VARCHAR(80),
                    valor              NUMERIC,
                    unidad             VARCHAR(20) NOT NULL,
                    fuente             VARCHAR(50) NOT NULL DEFAULT 'fiscalia-boletin-anual',
                    descargado_en      TIMESTAMPTZ DEFAULT NOW()
                )
            """))
            conn.execute(text("""
                CREATE UNIQUE INDEX IF NOT EXISTS uq_fiscalia_detalle
                ON fiscalia_detalle (
                    anio, metrica, COALESCE(region_id,''), categoria_delito,
                    COALESCE(dimension,''), COALESCE(subdimension,'')
                )
            """))
            conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_fiscalia_detalle_metrica_anio
                ON fiscalia_detalle (metrica, anio)
            """))

        df["anio"] = pd.to_numeric(df["anio"], errors="coerce").astype("Int64")
        df["valor"] = pd.to_numeric(df["valor"], errors="coerce")

        staging_upsert(
            df=df,
            engine=engine,
            target_table="fiscalia_detalle",
            insert_columns=INSERT_COLUMNS,
            conflict_columns=[
                "anio",
                "metrica",
                "region_id",
                "categoria_delito",
                "dimension",
                "subdimension",
            ],
            staging_table="fiscalia_detalle_staging",
        )
