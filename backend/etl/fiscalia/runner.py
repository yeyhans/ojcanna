# backend/etl/fiscalia/runner.py
"""
CLI orquestador del pipeline Fiscalía.

Uso:
    cd backend
    ./venv/Scripts/python.exe -m etl.fiscalia.runner --db-url $DATABASE_URL

Flujo:
    1. Descarga boletines anuales Fiscalía (idempotente — 30 días caché).
    2. Parsea XLS/XLSX extrayendo filas Ley 20.000 × 16 regiones × 3 métricas.
    3. Upsert a tabla `fiscalia_boletin` con ON CONFLICT DO NOTHING.
"""
import argparse
import logging
import os
import sys
from pathlib import Path

from dotenv import load_dotenv

from etl.fiscalia.consolidator import FiscaliaConsolidator
from etl.fiscalia.downloader import download_boletines_anuales

load_dotenv(Path(__file__).resolve().parent.parent.parent / ".env")


def main() -> None:
    parser = argparse.ArgumentParser(description="ETL Fiscalía Nacional (Ley 20.000)")
    parser.add_argument(
        "--db-url",
        default=os.getenv("DATABASE_URL"),
        help="URL PostgreSQL (default: $DATABASE_URL desde backend/.env)",
    )
    parser.add_argument(
        "--skip-download",
        action="store_true",
        help="No descargar, solo consolidar archivos ya en data/fiscalia/",
    )
    args = parser.parse_args()

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(message)s",
    )

    if not args.skip_download:
        print("=== 1. Descarga boletines Fiscalía ===")
        download_boletines_anuales()

    print("\n=== 2. Consolidar → PostgreSQL ===")
    if not args.db_url:
        print("ERROR: DATABASE_URL no definido. Usá --db-url o backend/.env", file=sys.stderr)
        sys.exit(1)

    consolidator = FiscaliaConsolidator(db_url=args.db_url)
    df = consolidator.run()

    if df.empty:
        print("\n⚠ Sin datos consolidados. Revisá logs anteriores.")
        sys.exit(2)

    print(f"\n✓ ETL Fiscalía completado: {len(df)} filas procesadas")
    print(f"  Años cubiertos: {sorted(df['anio'].unique())}")
    print(f"  Regiones: {df['region_id'].nunique()} distintas")
    print(f"  Métricas: {sorted(df['tipo_metrica'].unique())}")


if __name__ == "__main__":
    main()
