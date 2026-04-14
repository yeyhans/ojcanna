# backend/etl/ine_proyecciones/runner.py
"""
Orquestador del ETL de Proyecciones de Población Comunal INE (base Censo 2017).

Uso:
    python -m etl.ine_proyecciones.runner --db-url $DATABASE_URL
    python -m etl.ine_proyecciones.runner --db-url $DATABASE_URL --only-download
    python -m etl.ine_proyecciones.runner --db-url $DATABASE_URL --inspect-only
"""
import argparse
import asyncio
import logging
import sys

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[logging.StreamHandler()],
)
logger = logging.getLogger(__name__)


async def _run(args) -> None:
    from etl.ine_proyecciones.config import DATA_DIR, XLSX_FILENAME
    from etl.ine_proyecciones.downloader import download_ine_proyecciones

    # Fase 1: Descargar
    logger.info("=== Fase 1: Descarga XLSX INE Proyecciones Comunales ===")
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    dest = DATA_DIR / XLSX_FILENAME
    xlsx_path = await download_ine_proyecciones(dest)
    logger.info(f"Archivo disponible: {xlsx_path} ({xlsx_path.stat().st_size / 1024:.0f} KB)")


    if args.only_download:
        logger.info("Modo --only-download. ETL finalizado.")
        return

    if args.inspect_only:
        # Solo explorar estructura sin cargar a BD
        logger.info("=== Modo --inspect-only: explorando estructura XLSX ===")
        from etl.ine_proyecciones.consolidator import load_xlsx
        df = load_xlsx(xlsx_path)
        print(f"\nDataFrame resultante: {len(df)} filas")
        print(f"Columnas: {list(df.columns)}")
        print(f"Comunas únicas: {df['cut'].nunique()}")
        print(f"Años cubiertos: {sorted(df['anio'].unique())}")
        print(f"\nMuestra (5 filas):\n{df.sample(min(5, len(df))).to_string(index=False)}")
        return

    if not args.db_url:
        logger.error("Se requiere --db-url (o usar --only-download / --inspect-only).")
        sys.exit(1)

    # Fase 2: Consolidar en PostgreSQL
    logger.info("=== Fase 2: Consolidación en PostgreSQL ===")
    from etl.ine_proyecciones.consolidator import consolidate
    rows = await consolidate(args.db_url, xlsx_path)

    logger.info(f"ETL completado. Total filas procesadas: {rows}")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="ETL INE Proyecciones de Población Comunal (base Censo 2017)"
    )
    parser.add_argument(
        "--db-url",
        default=None,
        help="URL de conexión a PostgreSQL (ej: postgresql+psycopg2://...)"
    )
    parser.add_argument(
        "--only-download",
        action="store_true",
        help="Solo descargar el XLSX, sin cargar a la base de datos"
    )
    parser.add_argument(
        "--inspect-only",
        action="store_true",
        help="Descargar y explorar la estructura del XLSX sin cargar a BD"
    )
    args = parser.parse_args()

    if not args.only_download and not args.inspect_only and not args.db_url:
        logger.error(
            "Se requiere --db-url para cargar datos. "
            "Usa --only-download o --inspect-only para explorar sin BD."
        )
        sys.exit(1)

    asyncio.run(_run(args))


if __name__ == "__main__":
    main()
