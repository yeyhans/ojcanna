# backend/etl/pjud/runner.py
"""
CLI del ETL PJud — MVP Mes 1 (metadata-only).

Orquesta:
    PjudSession (Playwright + reCAPTCHA)
      → buscar_sentencias_ley_20000 (metadata del listado)
        → upsert_sentencia_metadata (4 tablas, sin pjud_audit)

Uso típico:
    python -m etl.pjud.runner --anio 2025 --limit 10 --db-url $DATABASE_URL

Si reCAPTCHA bloquea, el runner termina con exit code 0 y logs claros —
NO inventa datos ni hace fake-inserts. Los intentos quedan registrados en
pjud_download_log con status='rate_limited' para reintento.
"""
from __future__ import annotations

import argparse
import asyncio
import logging
import os
import sys
from datetime import datetime
from pathlib import Path

import asyncpg
from dotenv import load_dotenv

from etl.pjud.consolidator import log_download_failure, upsert_sentencia_metadata
from etl.pjud.downloader import buscar_sentencias_ley_20000
from etl.pjud.hmac_util import AuditSaltMissingError, get_salt
from etl.pjud.session import PjudCaptchaError, PjudSession

# Cargar .env desde backend/
load_dotenv(Path(__file__).resolve().parents[2] / ".env")


def _setup_logging() -> Path:
    logs_dir = Path(__file__).resolve().parents[2] / "logs"
    logs_dir.mkdir(parents=True, exist_ok=True)
    log_path = logs_dir / f"pjud_runner_{datetime.now():%Y%m%d_%H%M%S}.log"

    root = logging.getLogger()
    root.setLevel(logging.INFO)
    # Evitar duplicar handlers si se invoca dos veces en el mismo proceso
    root.handlers.clear()

    fmt = logging.Formatter(
        "%(asctime)s [%(levelname)s] %(name)s :: %(message)s",
        datefmt="%H:%M:%S",
    )
    fh = logging.FileHandler(log_path, encoding="utf-8")
    fh.setFormatter(fmt)
    fh.setLevel(logging.INFO)

    sh = logging.StreamHandler(sys.stdout)
    sh.setFormatter(fmt)
    sh.setLevel(logging.INFO)

    root.addHandler(fh)
    root.addHandler(sh)

    # Playwright es verboso — bajarle el nivel
    logging.getLogger("playwright").setLevel(logging.WARNING)
    return log_path


async def run_portal(anio: int, limit: int | None, db_url: str, headless: bool) -> int:
    """
    Ejecuta la corrida metadata-only.

    Returns
    -------
    int
        Exit code. 0 = éxito (aunque sean 0 filas si reCAPTCHA bloqueó).
    """
    log = logging.getLogger("pjud.runner")

    # Fail-fast si falta la sal — aunque MVP no la use, la reglamos como
    # requerimiento operacional para detectar config incompleta temprano.
    try:
        get_salt()
        log.info("PJUD_AUDIT_SALT configurada (OK)")
    except AuditSaltMissingError as e:
        log.error("Sal HMAC no configurada: %s", e)
        return 1

    log.info(
        "Iniciando corrida PJud | anio=%s limit=%s headless=%s",
        anio, limit, headless,
    )

    pool = await asyncpg.create_pool(db_url, min_size=1, max_size=4, ssl="require")
    processed = 0
    auth_blocked = 0

    try:
        try:
            async with PjudSession(headless=headless) as session:
                results = await buscar_sentencias_ley_20000(
                    session=session, anio=anio, limit=limit,
                )
        except PjudCaptchaError as e:
            log.error("reCAPTCHA bloqueó la sesión inicial: %s", e)
            # Exit 0 — no es un bug del código, es un gate del Portal.
            # Registrar 0 sentencias procesadas.
            results = []

        log.info("Listado recibido | %d resultados", len(results))

        for result in results:
            try:
                info = await upsert_sentencia_metadata(pool, result)
                if info["inserted"]:
                    processed += 1
                else:
                    auth_blocked += 1
            except Exception as e:  # noqa: BLE001
                log.exception("Falló persistencia | rol=%s : %s", result.rol, e)
                try:
                    await log_download_failure(
                        pool,
                        rol=result.rol,
                        tribunal_id=result.tribunal_id or "",
                        status="pdf_error",
                        url_origen=result.url_detalle,
                    )
                except Exception as log_err:  # noqa: BLE001
                    log.exception("Fallback log_download_failure falló: %s", log_err)

    finally:
        await pool.close()

    log.info(
        "Fin de corrida | nuevas=%d ya_existentes=%d total_listados=%d",
        processed, auth_blocked, len(results) if results else 0,
    )

    if not results:
        log.warning(
            "Cero resultados. Causas probables: "
            "(1) reCAPTCHA v3 rechazó la sesión (Portal devolvió 500/429), "
            "(2) el año no tiene sentencias Ley 20.000 en el corpus público, "
            "(3) cambio de shape en el JSON del listado (ver logs DEBUG)."
        )

    return 0


def main() -> int:
    log_path = _setup_logging()
    log = logging.getLogger("pjud.runner")
    log.info("Logs en %s", log_path)

    parser = argparse.ArgumentParser(
        prog="pjud-runner",
        description="ETL PJud MVP Mes 1 (metadata-only)",
    )
    parser.add_argument("--source", choices=["portal", "saip"], default="portal")
    parser.add_argument("--anio", type=int, required=True)
    parser.add_argument("--limit", type=int, default=None)
    parser.add_argument(
        "--db-url", default=os.environ.get("DATABASE_URL"),
        help="Connection string Postgres (default: $DATABASE_URL)",
    )
    parser.add_argument(
        "--headless", action="store_true",
        help="Playwright headless. Por defecto headful — recomendado para reCAPTCHA.",
    )
    args = parser.parse_args()

    if args.source == "saip":
        log.error("SAIP importer no implementado en Mes 1. Usar --source portal.")
        return 2

    if not args.db_url:
        log.error("DATABASE_URL no definida (env ni --db-url)")
        return 1

    return asyncio.run(run_portal(
        anio=args.anio,
        limit=args.limit,
        db_url=args.db_url,
        headless=args.headless,
    ))


if __name__ == "__main__":
    sys.exit(main())
