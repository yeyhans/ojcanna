# backend/etl/pjud/downloader.py
"""
Descarga metadata de sentencias Ley 20.000 desde el buscador Sentencias_Penales.

MVP Mes 1: SOLO metadata del listado JSON (rol, tribunal, fecha, materia).
El texto completo de cada sentencia requiere autenticación institucional
(endpoint `/busqueda/pagina_detalle_sentencia` devuelve HTML "requiere login"
sin cuenta habilitada). Esa vía queda pendiente para Mes 2 + solicitud SAIP.

Estrategia de paginación:
  - Rol fijo: 20 filas por request (tradeoff entre presión al servidor y latencia)
  - offset_paginacion incremental
  - Detenerse cuando `cantidad_total` se agota o `--limit` se alcanza
  - Delay SCRAPE_DELAY_SECONDS entre requests (manejado por `PjudSession`)
"""
from __future__ import annotations

import logging
from datetime import date
from typing import Any

from etl.pjud.config import DEFAULT_BUSCADOR
from etl.pjud.models import PjudSearchResult
from etl.pjud.session import PjudCaptchaError, PjudSession

logger = logging.getLogger(__name__)

# Tamaño de página en requests al Portal
PAGE_SIZE = 20
# Límite duro de páginas para evitar corridas infinitas en bugs de parseo
MAX_PAGES = 500


def _build_filtros_ley_20000(anio: int) -> dict[str, Any]:
    """Construye el payload `filtros` para un año de Ley 20.000."""
    return {
        "rol": "",
        "era": "",
        "fec_desde": f"{anio}-01-01",
        "fec_hasta": f"{anio}-12-31",
        "tipo_norma": "Ley",
        "num_norma": "20000",
        "num_art": "",
        "num_inciso": "",
        "todas": "",
        "algunas": "",
        "excluir": "",
        "literal": "",
        "proximidad": "",
        "distancia": "",
        "analisis_s": "11",
        "submaterias": "",
        "facetas_seleccionadas": [],
        "filtros_omnibox": "",
        "ids_comunas_seleccionadas_mapa": [],
    }


def _parse_item(item: dict[str, Any]) -> PjudSearchResult | None:
    """
    Convierte un item del listado JSON en `PjudSearchResult`.

    El shape exacto del listado varía por deployment (Laravel serializa keys en
    formato inconsistente). Intenta múltiples nombres de campo.
    """
    try:
        rol = item.get("rol") or item.get("Rol") or item.get("ROL")
        fecha_raw = (
            item.get("fecha")
            or item.get("fec_sentencia")
            or item.get("fec_sentencia_sup_dt")
        )
        if not rol or not fecha_raw:
            logger.debug("Item sin rol/fecha, ignorando: %s", list(item.keys())[:10])
            return None

        # Fecha puede venir como "2025-05-12" o "2025-05-12T00:00:00Z"
        if isinstance(fecha_raw, str):
            fecha = date.fromisoformat(fecha_raw.split("T")[0])
        else:
            fecha = fecha_raw

        return PjudSearchResult(
            id=str(item.get("id") or item.get("id_sentencia") or rol),
            rol=str(rol),
            fecha=fecha,
            tribunal=item.get("tribunal") or item.get("nombre_tribunal"),
            tribunal_id=(
                str(item["id_tribunal"]) if item.get("id_tribunal") else None
            ),
            materia=item.get("materia") or item.get("submateria"),
            url_detalle=(
                f"/busqueda/pagina_detalle_sentencia?k={item['k']}"
                if item.get("k") else None
            ),
        )
    except (ValueError, KeyError, TypeError) as e:
        logger.warning("Ítem descartado por parse error: %s", e)
        return None


async def buscar_sentencias_ley_20000(
    session: PjudSession,
    anio: int,
    limit: int | None = None,
    id_buscador: str = DEFAULT_BUSCADOR,
) -> list[PjudSearchResult]:
    """
    Descarga metadata de sentencias Ley 20.000 de un año específico.

    Parameters
    ----------
    session : PjudSession
        Sesión Playwright ya inicializada (reCAPTCHA + CSRF listos).
    anio : int
        Año a filtrar (fec_desde/fec_hasta).
    limit : int | None
        Máximo de resultados. None = todos los que devuelva cantidad_total.
    id_buscador : str
        Buscador a usar (default Sentencias_Penales).

    Returns
    -------
    list[PjudSearchResult]
        Metadata parseada. Lista vacía si el buscador no devuelve resultados o
        si el Portal bloquea la sesión.
    """
    filtros = _build_filtros_ley_20000(anio)
    results: list[PjudSearchResult] = []
    offset = 0
    page = 0

    logger.info(
        "Iniciando scrape Ley 20.000 | anio=%s limit=%s buscador=%s",
        anio, limit, id_buscador,
    )

    while page < MAX_PAGES:
        try:
            payload = await session.post_buscar_sentencias(
                filtros=filtros,
                id_buscador=id_buscador,
                offset=offset,
                filas=PAGE_SIZE,
            )
        except PjudCaptchaError as e:
            logger.error("reCAPTCHA/rate limit bloqueó el scrape: %s", e)
            return results  # best-effort: devolvemos lo que alcanzamos

        # Normalizar shape de respuesta: el Portal puede devolver
        # {items: [...], cantidad_total: N} o {data: [...], total: N}
        items = (
            payload.get("items")
            or payload.get("data")
            or payload.get("sentencias")
            or []
        )
        total = int(
            payload.get("cantidad_total")
            or payload.get("total")
            or payload.get("numero_total_resultados")
            or 0
        )

        if not items:
            logger.info(
                "Respuesta sin items | page=%s offset=%s total=%s keys=%s",
                page, offset, total, list(payload.keys())[:10],
            )
            break

        for raw_item in items:
            parsed = _parse_item(raw_item)
            if parsed:
                results.append(parsed)
                if limit and len(results) >= limit:
                    logger.info("Limit alcanzado (%s)", limit)
                    return results

        offset += PAGE_SIZE
        page += 1

        if total and offset >= total:
            logger.info("Agotados resultados | total=%s offset=%s", total, offset)
            break

    logger.info("Scrape completado | resultados=%s páginas=%s", len(results), page)
    return results
