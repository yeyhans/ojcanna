#!/usr/bin/env python3
"""
Migración única: carga geometrías comunales desde GADM Chile (nivel 3)
a la tabla `comunas` en Neon PostgreSQL/PostGIS.

Fuente de geometrías: GADM v4.1 Chile level-3
  https://geodata.ucdavis.edu/gadm/gadm4.1/json/gadm41_CHL_3.json
  CRS nativa: EPSG:4326 (WGS84) — no requiere reproyección.

Matching: GADM usa nombres sin espacios ni tildes (NAME_3).
  Se normalizan los nombres CEAD para matchear.
  Excepciones manuales documentadas abajo.

Limitación conocida: GADM v4.1 no incluye las comunas
  'Pozo Almonte' (id=1401) ni 'Antártica' (id=12202).
  Estas quedarán sin geometría en la tabla (292 y 147 filas en cead_hechos).
"""
import argparse
import json
import logging
import os
import re
import unicodedata
from pathlib import Path

import geopandas as gpd
import psycopg2
from dotenv import load_dotenv
from psycopg2.extras import execute_values

# Cargar DATABASE_URL desde backend/.env
_ENV_PATH = Path(__file__).resolve().parent.parent.parent / ".env"
load_dotenv(_ENV_PATH)

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")

BASE_DIR = Path(__file__).resolve().parent.parent.parent
CODIGOS_JSON = BASE_DIR / "etl" / "cead" / "codigos_cead.json"
GADM_FILE = BASE_DIR / "data" / "geo" / "comunas_bcn" / "gadm41_CHL_3.geojson"

# Tolerancia de simplificación (~100m, reduce payload de ~5MB a ~800KB)
SIMPLIFY_TOLERANCE = 0.001

# Mapeo manual: nombre_CEAD_normalizado → nombre_GADM_normalizado
# Necesario donde el mismo municipio tiene distinto nombre oficial en cada fuente
MANUAL_MAP: dict[str, str] = {
    "lacalera": "calera",       # CEAD="La Calera", GADM="Calera"
    "paiguano": "paihuano",     # CEAD="Paiguano",  GADM="Paihuano"
}


def _normalizar(s: str) -> str:
    """Elimina tildes, espacios y caracteres no-alfanuméricos, lowercase."""
    s = unicodedata.normalize("NFD", str(s))
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return re.sub(r"[^a-z0-9]", "", s.lower())


def cargar_comunas(db_url: str) -> None:
    if not GADM_FILE.exists():
        raise FileNotFoundError(f"GeoJSON GADM no encontrado: {GADM_FILE}")

    # 1. Cargar GADM
    logger.info("Cargando GADM GeoJSON...")
    gdf = gpd.read_file(GADM_FILE)
    logger.info(f"  CRS: {gdf.crs} | Filas: {len(gdf)}")

    # Simplificar geometría ANTES de insertar (reduce payload ~80%)
    logger.info(f"Simplificando geometrías (tolerance={SIMPLIFY_TOLERANCE})...")
    gdf["geometry"] = gdf["geometry"].simplify(
        tolerance=SIMPLIFY_TOLERANCE, preserve_topology=True
    )

    # Índice GADM por nombre normalizado
    gadm_by_norm: dict[str, gpd.GeoSeries] = {
        _normalizar(r["NAME_3"]): r for _, r in gdf.iterrows()
    }

    # 2. Cargar catálogo CEAD
    with open(CODIGOS_JSON, encoding="utf-8") as f:
        codigos = json.load(f)
    cead_comunas = codigos["comunas"]  # [{id, nombre}]
    logger.info(f"Comunas en CEAD: {len(cead_comunas)}")

    # 3. Construir filas para INSERT
    rows: list[tuple] = []
    sin_match: list[str] = []

    for c in cead_comunas:
        cead_id = c["id"]
        cead_nombre = c["nombre"]
        norm_cead = _normalizar(cead_nombre)

        # Aplicar mapeo manual si corresponde
        gadm_norm = MANUAL_MAP.get(norm_cead, norm_cead)

        gadm_row = gadm_by_norm.get(gadm_norm)
        if gadm_row is None:
            sin_match.append(f"  '{cead_nombre}' (id={cead_id})")
            continue

        # Extraer región desde NAME_1 de GADM (solo para referencia)
        region_id = None  # No tenemos CUT de región confiable desde GADM

        # Serializar geometría a GeoJSON string
        geom_geojson = gadm_row["geometry"].__geo_interface__
        geom_str = json.dumps(geom_geojson)

        rows.append((cead_id, cead_nombre, region_id, geom_str))

    if sin_match:
        logger.warning(f"Comunas CEAD SIN geometría ({len(sin_match)}):")
        for s in sin_match:
            logger.warning(s)

    logger.info(f"Comunas con geometría: {len(rows)}/{len(cead_comunas)}")

    # 4. Insertar en PostgreSQL
    logger.info("Insertando en tabla 'comunas'...")
    with psycopg2.connect(db_url) as conn:
        conn.autocommit = False
        with conn.cursor() as cur:
            # Limpiar tabla antes de reinsertar (idempotente)
            cur.execute("DELETE FROM comunas")

            execute_values(
                cur,
                """
                INSERT INTO comunas (cut, nombre, region_id, geom)
                VALUES %s
                """,
                rows,
                template="""(
                    %s, %s, %s,
                    ST_Multi(ST_GeomFromGeoJSON(%s))
                )""",
            )
        conn.commit()

    logger.info(f"OK: {len(rows)} comunas insertadas.")

    # 5. Crear índice sobre cead_hechos (si ya existe la tabla)
    logger.info("Creando índice idx_cead_filtros en cead_hechos (si existe)...")
    with psycopg2.connect(db_url) as conn:
        conn.autocommit = True
        with conn.cursor() as cur:
            cur.execute("""
                SELECT to_regclass('public.cead_hechos')
            """)
            if cur.fetchone()[0] is not None:
                cur.execute("""
                    CREATE INDEX IF NOT EXISTS idx_cead_filtros
                    ON cead_hechos (comuna_id, anio, subgrupo_id)
                """)
                logger.info("  Índice creado/verificado.")
            else:
                logger.info("  cead_hechos aún no existe; índice se creará después.")


def main() -> None:
    parser = argparse.ArgumentParser(description="Carga geometrías comunales en PostGIS")
    parser.add_argument(
        "--db-url",
        default=os.getenv("DATABASE_URL"),
        help="URL de conexión PostgreSQL",
    )
    args = parser.parse_args()

    if not args.db_url:
        raise SystemExit("ERROR: DATABASE_URL no definido. Usa --db-url o configura backend/.env")

    cargar_comunas(args.db_url)


if __name__ == "__main__":
    main()
