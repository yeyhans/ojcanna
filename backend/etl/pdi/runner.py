# backend/etl/pdi/runner.py
"""
Orquestador del ETL PDI.

Uso:
    python -m etl.pdi.runner --db-url $DATABASE_URL
    python -m etl.pdi.runner --only-download
"""
import argparse
import logging
import sys

from rich.logging import RichHandler

logging.basicConfig(
    level=logging.INFO,
    format="%(message)s",
    handlers=[RichHandler(rich_tracebacks=True)],
)
logger = logging.getLogger(__name__)


def main() -> None:
    parser = argparse.ArgumentParser(description="ETL PDI — datos.gob.cl")
    parser.add_argument("--db-url", help="URL de conexión a PostgreSQL")
    parser.add_argument("--only-download", action="store_true")
    args = parser.parse_args()

    if not args.only_download and not args.db_url:
        logger.error("Se requiere --db-url.")
        sys.exit(1)

    logger.info("=== Fase 1: Descarga XLS PDI ===")
    from etl.pdi.downloader import PdiDownloader
    descargados = PdiDownloader().run()
    logger.info(f"Archivos: {len(descargados)}")

    if args.only_download:
        return

    logger.info("=== Fase 2: Consolidación ===")
    from etl.pdi.consolidator import PdiConsolidator
    df = PdiConsolidator(db_url=args.db_url).run()
    logger.info(f"ETL completado. Filas: {len(df)}")


if __name__ == "__main__":
    main()
