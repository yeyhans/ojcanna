# backend/etl/fiscalia/runner.py
"""
CLI orquestador del pipeline Fiscalía.

Uso:
    cd backend
    ./venv/Scripts/python.exe -m etl.fiscalia.runner --db-url $DATABASE_URL

Flujo:
    1. Descarga boletines anuales Fiscalía (idempotente — 30 días caché).
    2. Parsea XLS/XLSX extrayendo filas Ley 20.000 × 16 regiones × 2 métricas
       (ingresos y términos) → tabla `fiscalia_boletin`.
    3. Parsea las hojas con dimensiones (TB6.2, TB9, TB7, TB5.2.1)
       → tabla `fiscalia_detalle`.
    4. Ambos upserts usan ON CONFLICT DO NOTHING (reruns idempotentes).
"""
import argparse
import logging
import os
import sys
from pathlib import Path

from dotenv import load_dotenv

from etl.fiscalia.consolidator import FiscaliaConsolidator
from etl.fiscalia.detalle_consolidator import FiscaliaDetalleConsolidator
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

    # La consola de Windows usa cp1252 y un print con caracteres fuera de ese
    # juego (flechas, checks, tildes en algunos casos) aborta el ETL entero con
    # UnicodeEncodeError. Forzamos UTF-8 en la salida cuando el stream lo permite.
    for stream in (sys.stdout, sys.stderr):
        reconfigure = getattr(stream, "reconfigure", None)
        if reconfigure is not None:
            reconfigure(encoding="utf-8", errors="replace")

    if not args.skip_download:
        print("=== 1. Descarga boletines Fiscalía ===")
        download_boletines_anuales()

    print("\n=== 2. Consolidar agregado → fiscalia_boletin ===")
    if not args.db_url:
        print("ERROR: DATABASE_URL no definido. Usá --db-url o backend/.env", file=sys.stderr)
        sys.exit(1)

    consolidator = FiscaliaConsolidator(db_url=args.db_url)
    df = consolidator.run()

    if df.empty:
        print("\n⚠ Sin datos consolidados. Revisá logs anteriores.")
        sys.exit(2)

    print(f"\n✓ fiscalia_boletin: {len(df)} filas procesadas")
    print(f"  Años cubiertos: {sorted(df['anio'].unique())}")
    print(f"  Regiones: {df['region_id'].nunique()} distintas")
    print(f"  Métricas: {sorted(df['tipo_metrica'].unique())}")

    # Paso 3: hojas con dimensiones. No aborta el ETL si falla — el agregado
    # de fiscalia_boletin ya quedó cargado y es lo que sostiene los KPI base.
    print("\n=== 3. Consolidar detalle → fiscalia_detalle ===")
    detalle = FiscaliaDetalleConsolidator(db_url=args.db_url).run()

    if detalle.empty:
        print("⚠ Sin detalle consolidado (revisá si el boletín cambió de estructura).")
    else:
        print(f"\n✓ fiscalia_detalle: {len(detalle)} filas procesadas")
        for metrica, grupo in detalle.groupby("metrica"):
            print(f"  {metrica}: {len(grupo)} filas")


if __name__ == "__main__":
    main()
