"""
Script de diagnóstico: imprime el contenido crudo de las hojas clave
del Excel DPP para entender la estructura real antes de parsear.

Uso:
    python -m etl.dpp.inspect_xlsx
"""
import sys
from pathlib import Path

import pandas as pd

RAW_DIR = Path(__file__).resolve().parents[2] / "data" / "dpp"
SHEETS_TO_INSPECT = ["Ingresos Terminos DR", "Delitos FT (2)", "Delitos FT", "Delitos"]
MAX_ROWS = 60   # cuántas filas mostrar por hoja


def inspect(xlsx_path: Path) -> None:
    print(f"\n{'='*70}")
    print(f"Archivo: {xlsx_path.name}")
    print(f"{'='*70}")

    xl = pd.ExcelFile(xlsx_path, engine="openpyxl")
    print(f"Hojas totales ({len(xl.sheet_names)}): {xl.sheet_names}\n")

    for sheet in SHEETS_TO_INSPECT:
        if sheet not in xl.sheet_names:
            print(f"  [HOJA '{sheet}' NO EXISTE]\n")
            continue

        df = xl.parse(sheet, header=None, dtype=str)
        print(f"--- Hoja: '{sheet}' ({df.shape[0]} filas × {df.shape[1]} cols) ---")

        for i, row in df.iterrows():
            if i >= MAX_ROWS:
                print(f"  ... (truncado en fila {MAX_ROWS})")
                break
            # Solo imprimir filas no completamente vacías
            vals = [str(v).strip() for v in row if str(v).strip() not in ("", "nan", "None")]
            if vals:
                print(f"  [{i:03d}] {' | '.join(vals[:10])}")
        print()


def main() -> None:
    xlsx_files = sorted(RAW_DIR.glob("dpp_*.xlsx"))
    if not xlsx_files:
        print(f"No se encontraron archivos en {RAW_DIR}")
        sys.exit(1)

    # Inspeccionar solo el primero (todos tienen la misma estructura)
    inspect(xlsx_files[0])
    print(f"\nTip: si necesitas inspeccionar otro año, edita este script.")


if __name__ == "__main__":
    main()
