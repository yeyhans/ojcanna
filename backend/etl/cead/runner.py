# backend/etl/cead/runner.py
"""
Orquestador del pipeline ETL CEAD.
Ejecuta las 3 fases en secuencia:
  1. mapper.py   → captura códigos del portal (solo si no existe codigos_cead.json)
  2. extractor.py → descarga masiva de datos
  3. consolidator.py → normaliza y carga en PostgreSQL
"""
import asyncio
import logging
from pathlib import Path

from rich.logging import RichHandler

from etl.cead.config import CODIGOS_JSON, LOG_FILE
from etl.cead.mapper import run_mapper, validar_subgrupos
from etl.cead.extractor import CeadExtractor
from etl.cead.consolidator import CeadConsolidator


def setup_logging():
    LOG_FILE.parent.mkdir(parents=True, exist_ok=True)
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(name)s %(levelname)s %(message)s",
        handlers=[
            RichHandler(rich_tracebacks=True),
            logging.FileHandler(LOG_FILE, encoding="utf-8"),
        ],
    )


async def main(db_url: str | None = None, remap: bool = False):
    setup_logging()
    logger = logging.getLogger("runner")

    # Fase 1: Mapper (solo si no existe el JSON o se fuerza remap)
    if remap or not CODIGOS_JSON.exists():
        logger.info("=== FASE 1: Mapeando códigos del portal CEAD ===")
        codigos = await run_mapper()
        validar_subgrupos(codigos)  # Aborta si faltan subgrupos requeridos
        logger.info(f"Comunas capturadas: {len(codigos.get('comunas', []))}")
    else:
        if not CODIGOS_JSON.exists():
            raise FileNotFoundError(
                f"codigos_cead.json no encontrado en {CODIGOS_JSON}. "
                "Ejecutar con --remap para generar el archivo primero."
            )
        logger.info(f"Fase 1 omitida — usando {CODIGOS_JSON}")

    # Fase 2: Extractor
    logger.info("=== FASE 2: Extracción masiva ===")
    extractor = CeadExtractor()
    await extractor.run()

    # Fase 3: Consolidador
    logger.info("=== FASE 3: Consolidación → PostgreSQL ===")
    consolidator = CeadConsolidator(db_url=db_url)
    df = consolidator.run()
    logger.info(f"Pipeline completado. Filas totales: {len(df)}")


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="ETL CEAD — Observatorio Cannábico")
    parser.add_argument("--db-url", default=None, help="PostgreSQL connection URL")
    parser.add_argument("--remap", action="store_true", help="Forzar re-captura de códigos")
    args = parser.parse_args()

    asyncio.run(main(db_url=args.db_url, remap=args.remap))
