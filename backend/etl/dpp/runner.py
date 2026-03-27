# backend/etl/dpp/runner.py
"""
Orquestador del ETL de la Defensoría Penal Pública.

Uso:
    python -m etl.dpp.runner --db-url postgresql://...
    python -m etl.dpp.runner --db-url $DATABASE_URL --anios 2023 2024
    python -m etl.dpp.runner --only-download   # solo descarga, sin cargar a DB
"""
import argparse
import logging
import sys
from pathlib import Path

from rich.logging import RichHandler

logging.basicConfig(
    level=logging.INFO,
    format="%(message)s",
    handlers=[RichHandler(rich_tracebacks=True)],
)
logger = logging.getLogger(__name__)


def main() -> None:
    parser = argparse.ArgumentParser(description="ETL DPP — Defensoría Penal Pública")
    parser.add_argument("--db-url", help="URL de conexión a PostgreSQL")
    parser.add_argument(
        "--anios", nargs="*", type=int,
        help="Años a procesar (default: todos los disponibles)"
    )
    parser.add_argument(
        "--only-download", action="store_true",
        help="Solo descargar archivos XLSX, sin cargar a la base de datos"
    )
    args = parser.parse_args()

    if not args.only_download and not args.db_url:
        logger.error("Se requiere --db-url (o usar --only-download para solo descargar).")
        sys.exit(1)

    # Fase 1: Descargar
    logger.info("=== Fase 1: Descarga de archivos XLSX ===")
    from etl.dpp.downloader import DppDownloader
    downloader = DppDownloader()
    descargados = downloader.run(anios=args.anios)
    logger.info(f"Archivos disponibles: {len(descargados)}")

    if args.only_download:
        logger.info("Modo --only-download. ETL finalizado.")
        return

    # Fase 2: Consolidar en PostgreSQL
    logger.info("=== Fase 2: Consolidación en PostgreSQL ===")
    from etl.dpp.consolidator import DppConsolidator
    consolidator = DppConsolidator(db_url=args.db_url)
    df = consolidator.run(anios=args.anios)

    if df.empty:
        logger.warning("No se cargaron datos. Verificar estructura del XLSX.")
    else:
        logger.info(f"ETL completado. Filas procesadas: {len(df)}")


if __name__ == "__main__":
    main()
