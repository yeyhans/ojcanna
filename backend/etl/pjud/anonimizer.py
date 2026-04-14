# backend/etl/pjud/anonimizer.py
"""
Anonimizador de texto de sentencias PJud — Ley 19.628.

Implementación real Mes 2:
  1. Regex determinístico para RUT chileno (rápido y seguro).
  2. Regex para direcciones (calle/avenida/pasaje/camino + número).
  3. spaCy NER (es_core_news_lg o fallback _sm) para PER / LOC / ORG.
  4. Whitelist de tribunales (no se anonimizan nombres de tribunales públicos).

El contrato es compatible con el placeholder Mes 1 — la firma `anonimize(texto)`
retorna el mismo `AnonymizedResult`. Los llamadores existentes no requieren cambios.

Modelo se carga lazy (singleton) en el primer uso para evitar pagar el costo de
inicialización de spaCy en procesos que no anonimizan (ej. tests de API).
"""
from __future__ import annotations

import logging
import re
from dataclasses import dataclass, field
from functools import lru_cache
from typing import Optional

from etl.pjud.config import ANONIMIZADOR_VERSION, SPACY_MODEL, TRIBUNAL_REGION_MAP

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Regexes deterministas
# ---------------------------------------------------------------------------

# RUT chileno: 7-8 dígitos + guión + dígito verificador (acepta K).
# Formatos aceptados: 12345678-9, 12.345.678-9, 1.234.567-K
RUT_REGEX = re.compile(r"\b\d{1,2}\.?\d{3}\.?\d{3}-[\dkK]\b")

# Direcciones: calle / avenida / av. / pasaje / psje. / camino / ruta + nombre + número.
# Acepta tildes y Ñ en el nombre.
DOMICILIO_REGEX = re.compile(
    r"\b(?:calle|avenida|av\.|pasaje|psje\.|camino|ruta)\s+"
    r"[A-ZÁÉÍÓÚÑa-záéíóúñ][A-ZÁÉÍÓÚÑa-záéíóúñ0-9\s\.]{2,60}?"
    r"\s+(?:N[°º]\s*)?\d{1,5}\b",
    re.IGNORECASE,
)

# Tribunales whitelisted: patrones que NO queremos anonimizar aunque spaCy los marque ORG.
# Incluye los del TRIBUNAL_REGION_MAP + patrones genéricos de órganos públicos.
TRIBUNAL_PATTERNS = [
    re.compile(r"Corte Suprema", re.IGNORECASE),
    re.compile(r"Corte de Apelaciones(?:\s+de\s+[A-ZÁÉÍÓÚÑa-záéíóúñ\s]+)?", re.IGNORECASE),
    re.compile(r"Juzgado de Garantía(?:\s+de\s+[A-ZÁÉÍÓÚÑa-záéíóúñ\s]+)?", re.IGNORECASE),
    re.compile(r"Tribunal de Juicio Oral(?:\s+en\s+lo\s+Penal)?(?:\s+de\s+[A-ZÁÉÍÓÚÑa-záéíóúñ\s]+)?", re.IGNORECASE),
    re.compile(r"Ministerio Público", re.IGNORECASE),
    re.compile(r"Defensoría Penal Pública", re.IGNORECASE),
    re.compile(r"Fiscalía(?:\s+Local(?:\s+de\s+[A-ZÁÉÍÓÚÑa-záéíóúñ\s]+)?)?", re.IGNORECASE),
    re.compile(r"Policía de Investigaciones(?:\s+de\s+Chile)?", re.IGNORECASE),
    re.compile(r"Carabineros(?:\s+de\s+Chile)?", re.IGNORECASE),
]


def _is_tribunal(text: str) -> bool:
    """True si el string matchea cualquier patrón de órgano público whitelisted."""
    for pat in TRIBUNAL_PATTERNS:
        if pat.search(text):
            return True
    # También cubrir el mapa explícito
    if text.strip() in TRIBUNAL_REGION_MAP:
        return True
    return False


# ---------------------------------------------------------------------------
# Dataclass resultado
# ---------------------------------------------------------------------------


@dataclass
class AnonymizedResult:
    """Resultado del proceso de anonimización."""

    texto: str
    entidades_detectadas: dict[str, int] = field(default_factory=dict)
    diff_bytes: int = 0
    anonimizador_version: str = ANONIMIZADOR_VERSION


# ---------------------------------------------------------------------------
# Carga lazy del modelo spaCy
# ---------------------------------------------------------------------------


@lru_cache(maxsize=1)
def _load_nlp():
    """Carga spaCy singleton. Intenta es_core_news_lg, fallback a _sm."""
    try:
        import spacy  # type: ignore
    except ImportError as e:
        raise RuntimeError(
            "spaCy no está instalado. Ejecutar: "
            "`./venv/Scripts/python.exe -m pip install spacy`"
        ) from e

    try:
        nlp = spacy.load(SPACY_MODEL, disable=["parser", "lemmatizer"])
        logger.info("spaCy cargado: %s", SPACY_MODEL)
        return nlp
    except OSError:
        logger.warning(
            "Modelo %s no disponible, intentando fallback es_core_news_sm",
            SPACY_MODEL,
        )
        try:
            nlp = spacy.load("es_core_news_sm", disable=["parser", "lemmatizer"])
            logger.info("spaCy fallback cargado: es_core_news_sm")
            return nlp
        except OSError as e:
            raise RuntimeError(
                "No hay modelo spaCy español disponible. Ejecutar: "
                "`./venv/Scripts/python.exe -m spacy download es_core_news_lg` "
                "o `... es_core_news_sm` como fallback."
            ) from e


# ---------------------------------------------------------------------------
# API pública
# ---------------------------------------------------------------------------


def anonimize(texto: str) -> AnonymizedResult:
    """
    Anonimiza un texto de sentencia según Ley 19.628.

    Pipeline:
      1. Regex RUT → [RUT]
      2. Regex domicilios → [DOMICILIO]
      3. spaCy NER: PER → [PERSONA], LOC → [LUGAR], ORG → [ORGANIZACION]
         (excepto tribunales públicos que quedan intactos).

    Parameters
    ----------
    texto : str
        Texto original de la sentencia (contiene datos sensibles).

    Returns
    -------
    AnonymizedResult
        Texto limpio + contador de entidades detectadas + diff_bytes.
    """
    if not texto:
        return AnonymizedResult(
            texto="",
            entidades_detectadas={},
            diff_bytes=0,
            anonimizador_version=ANONIMIZADOR_VERSION,
        )

    entidades = {"RUT": 0, "DOM": 0, "PER": 0, "LOC": 0, "ORG": 0}
    t = texto

    # 1. RUT primero (determinístico, rápido)
    t, n = RUT_REGEX.subn("[RUT]", t)
    entidades["RUT"] = n

    # 2. Domicilios (antes de spaCy para evitar que marque LOC dentro de la dirección)
    t, n = DOMICILIO_REGEX.subn("[DOMICILIO]", t)
    entidades["DOM"] = n

    # 3. Proteger nombres de tribunales / órganos públicos con un marcador temporal
    # antes de que spaCy NER los pueda etiquetar como LOC/ORG incorrectamente.
    # Los restauramos al final.
    protected_spans: list[str] = []

    def _protect(match):
        idx = len(protected_spans)
        protected_spans.append(match.group(0))
        # Marcador único y opaco para spaCy (no debería clasificar como entidad)
        return f"TRIBPROT{idx:04d}XTRIBPROT"

    for pat in TRIBUNAL_PATTERNS:
        t = pat.sub(_protect, t)

    # 4. spaCy NER sobre texto con tribunales protegidos
    try:
        nlp = _load_nlp()
    except RuntimeError as e:
        logger.warning(
            "NER deshabilitado (spaCy no disponible): %s. "
            "Continuando sólo con regex RUT+domicilio.", e,
        )
        # Restaurar tribunales protegidos aunque no hubo NER
        for idx, orig in enumerate(protected_spans):
            t = t.replace(f"TRIBPROT{idx:04d}XTRIBPROT", orig)
        return AnonymizedResult(
            texto=t,
            entidades_detectadas=entidades,
            diff_bytes=len(texto) - len(t),
            anonimizador_version=ANONIMIZADOR_VERSION + "-noner",
        )

    doc = nlp(t)
    replacements: list[tuple[int, int, str]] = []

    for ent in doc.ents:
        # Saltar los marcadores protegidos por si spaCy los etiquetó
        if "TRIBPROT" in ent.text:
            continue
        if ent.label_ == "PER":
            replacements.append((ent.start_char, ent.end_char, "[PERSONA]"))
            entidades["PER"] += 1
        elif ent.label_ == "LOC":
            replacements.append((ent.start_char, ent.end_char, "[LUGAR]"))
            entidades["LOC"] += 1
        elif ent.label_ == "ORG":
            # Whitelist: si es tribunal / órgano público, NO reemplazar
            if _is_tribunal(ent.text):
                continue
            replacements.append((ent.start_char, ent.end_char, "[ORG]"))
            entidades["ORG"] += 1

    # Aplicar reemplazos de atrás hacia adelante (no desfasa índices)
    for start, end, placeholder in sorted(replacements, key=lambda r: -r[0]):
        t = t[:start] + placeholder + t[end:]

    # 5. Restaurar los tribunales protegidos a su texto original
    for idx, orig in enumerate(protected_spans):
        t = t.replace(f"TRIBPROT{idx:04d}XTRIBPROT", orig)

    return AnonymizedResult(
        texto=t,
        entidades_detectadas=entidades,
        diff_bytes=len(texto) - len(t),
        anonimizador_version=ANONIMIZADOR_VERSION,
    )
