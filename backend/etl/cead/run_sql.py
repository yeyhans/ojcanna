#!/usr/bin/env python3
"""
Ejecuta un archivo SQL contra la base de datos PostgreSQL.
Uso: python etl/cead/run_sql.py etl/cead/sql/001_create_comunas.sql
"""
import argparse
import os
import sys
from pathlib import Path

import psycopg2
from dotenv import load_dotenv

# Cargar DATABASE_URL desde backend/.env si existe
load_dotenv(Path(__file__).resolve().parent.parent.parent / ".env")


def run_sql_file(sql_path: Path, db_url: str) -> None:
    sql = sql_path.read_text(encoding="utf-8")
    with psycopg2.connect(db_url) as conn:
        conn.autocommit = True
        with conn.cursor() as cur:
            cur.execute(sql)
    print(f"OK: {sql_path.name}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Ejecuta un archivo SQL en PostgreSQL")
    parser.add_argument("sql_file", help="Ruta al archivo .sql")
    parser.add_argument("--db-url", default=os.getenv("DATABASE_URL"), help="URL de conexión PostgreSQL")
    args = parser.parse_args()

    if not args.db_url:
        print("ERROR: DATABASE_URL no definido. Usa --db-url o configura backend/.env", file=sys.stderr)
        sys.exit(1)

    sql_path = Path(args.sql_file)
    if not sql_path.exists():
        print(f"ERROR: archivo no encontrado: {sql_path}", file=sys.stderr)
        sys.exit(1)

    run_sql_file(sql_path, args.db_url)


if __name__ == "__main__":
    main()
