# backend/etl/pjud/extractor.py
"""
Extractor rule-based v1 para variables estructuradas de sentencias PJud.

Variables extraídas (todas opcionales):
  - gramaje_g        : peso en gramos de cannabis/marihuana
  - veredicto        : condena | absolucion | sobreseimiento | salida_alternativa
  - pena_meses       : total de meses de presidio/reclusión (años * 12 + meses)
  - tipo_delito      : trafico | microtrafico | porte | consumo
  - receta_medica    : bool — ¿se invoca Art. 8 Ley 20.000 o Ley 21.575?
  - atipicidad_consumo_personal : bool — ¿absuelve por consumo personal exclusivo?

Todas las regex son case-insensitive. Los contenidos pueden venir con acentos
(Unicode directo) o sin acentos (legacy PDF OCR). Se usan alternativas para
ambas formas.

Retorna un `PjudExtraccion` con `extractor_version="rule-v1"` y `confianza`
proporcional al número de señales positivas encontradas.
"""
from __future__ import annotations

import re
from typing import Optional
from uuid import UUID, uuid4

from etl.pjud.config import EXTRACTOR_RULE_VERSION
from etl.pjud.models import PjudExtraccion, Veredicto, TipoDelito

# ---------------------------------------------------------------------------
# Regex — compilados una sola vez (re es thread-safe)
# ---------------------------------------------------------------------------

# Gramaje: "12 gramos de cannabis", "12,5 g de marihuana", "2 kilos de cannabis"
RE_GRAMAJE = re.compile(
    r"(\d+(?:[.,]\d+)?)\s*"
    r"(kilos?|kgs?|gramos?|grs?|g)\.?\s+"
    r"(?:de\s+)?"
    r"(?:cannabis|marihuana|marij?uana|mota|yerba|hierba)",
    re.IGNORECASE,
)

# Veredicto — cada patrón corresponde a un valor del Literal
RE_CONDENA = re.compile(
    r"\b(?:se\s+)?condena(?:d[oa]s?)?\b",
    re.IGNORECASE,
)
RE_ABSOLUCION = re.compile(
    r"\b(?:se\s+)?absuelve(?:n)?|absuelt[oa]s?|absolución\b|absolucion\b",
    re.IGNORECASE,
)
RE_SOBRESEIMIENTO = re.compile(
    r"\bsobresé|sobresee|sobreseimient|sobreseer\b",
    re.IGNORECASE,
)
RE_SALIDA_ALT = re.compile(
    r"\bsuspensión\s+condicional|suspension\s+condicional|acuerdo\s+reparatorio|"
    r"salida\s+alternativa\b",
    re.IGNORECASE,
)

# Pena: "tres años de presidio", "5 años y 1 día de presidio", "541 días"
# Captura (años?, meses?, días?) en cualquier orden posterior a presidio/reclusión
RE_PENA_COMPLETA = re.compile(
    r"(?:presidio|prisión|prision|reclusión|reclusion)\s+"
    r"(?:menor|mayor)?\s*"
    r"(?:en\s+su\s+grado\s+[a-záéíóú]+\s+)?"
    r"(?:a|de|por)?\s*"
    r"(?:(\d+)\s*años?)?"
    r"(?:\s*(?:,|y)\s*(\d+)\s*meses?)?"
    r"(?:\s*(?:,|y)\s*(\d+)\s*días?)?",
    re.IGNORECASE,
)
# Alternativa: "X años de presidio"
RE_PENA_ANIOS = re.compile(
    r"(\d+)\s*años?\s+(?:y\s+\d+\s*(?:meses|días)?\s+)?(?:de\s+)?"
    r"(?:presidio|prisión|prision|reclusión|reclusion)",
    re.IGNORECASE,
)
RE_PENA_MESES = re.compile(
    r"(\d+)\s*meses?\s+(?:de\s+)?"
    r"(?:presidio|prisión|prision|reclusión|reclusion)",
    re.IGNORECASE,
)

# Tipo de delito
RE_MICROTRAFICO = re.compile(
    r"\bmicrotráfic|microtrafic\b|artículo\s+4|art\.?\s+4",
    re.IGNORECASE,
)
RE_TRAFICO = re.compile(
    r"\btráfico\s+(?:il[ií]cito\s+)?de\s+estupefacientes|tráfico\b|trafico\b|"
    r"artículo\s+(?:3|1)|art\.?\s+(?:3|1)",
    re.IGNORECASE,
)
RE_PORTE = re.compile(
    r"\bporte\s+(?:il[ií]cito\s+)?de\s+(?:droga|estupefaciente|cannabis|marihuana)\b",
    re.IGNORECASE,
)
RE_CONSUMO = re.compile(
    r"\bconsumo\s+(?:personal\s+)?(?:exclusivo)?|uso\s+personal\b",
    re.IGNORECASE,
)

# Receta médica / justificación clínica
RE_RECETA = re.compile(
    r"\breceta\s+médica|receta\s+medica|prescripción\s+médica|prescripcion\s+medica|"
    r"art[íi]culo\s+8|art\.?\s+8|ley\s+21\.575|ley\s+21575",
    re.IGNORECASE,
)

# Atipicidad por consumo personal exclusivo (causa de absolución del Art. 4)
RE_ATIPICIDAD = re.compile(
    r"\bconsumo\s+personal\s+exclusivo|atipicidad|conducta\s+atípica|"
    r"no\s+constituye\s+delito|falta\s+de\s+tipicidad\b",
    re.IGNORECASE,
)


# ---------------------------------------------------------------------------
# Funciones públicas
# ---------------------------------------------------------------------------


def extract_gramaje(texto: str) -> Optional[float]:
    """Extrae gramaje total en gramos. Convierte kilos→gramos si aplica."""
    if not texto:
        return None
    m = RE_GRAMAJE.search(texto)
    if not m:
        return None
    try:
        raw = m.group(1).replace(",", ".")
        cantidad = float(raw)
    except (ValueError, AttributeError):
        return None

    unidad = (m.group(2) or "").lower()
    if unidad.startswith("kilo") or unidad.startswith("kg"):
        return cantidad * 1000.0
    return cantidad


def extract_veredicto(texto: str) -> Optional[Veredicto]:
    """Veredicto principal. Prioridad: condena > absolucion > sobreseimiento > salida_alt."""
    if not texto:
        return None
    # Chequear en orden de prioridad (condena > otros), pero si sólo hay "absuelve" es absolucion.
    tiene_condena = bool(RE_CONDENA.search(texto))
    tiene_absolucion = bool(RE_ABSOLUCION.search(texto))
    tiene_sobreseimiento = bool(RE_SOBRESEIMIENTO.search(texto))
    tiene_salida = bool(RE_SALIDA_ALT.search(texto))

    # Si coexisten condena + absolucion, prevalece el que aparezca después (la parte resolutiva suele ir al final)
    if tiene_condena and tiene_absolucion:
        pos_cond = (RE_CONDENA.search(texto) or re.match("", "")).start() if tiene_condena else -1
        pos_abs = (RE_ABSOLUCION.search(texto) or re.match("", "")).start() if tiene_absolucion else -1
        return "condena" if pos_cond > pos_abs else "absolucion"
    if tiene_condena:
        return "condena"
    if tiene_absolucion:
        return "absolucion"
    if tiene_sobreseimiento:
        return "sobreseimiento"
    if tiene_salida:
        return "salida_alternativa"
    return None


def extract_pena_meses(texto: str) -> Optional[int]:
    """
    Convierte la pena privativa a meses totales.
    Intenta primero el patrón completo (años+meses+días), luego fallbacks.
    """
    if not texto:
        return None

    # Patrón 1: "X años de presidio"
    m = RE_PENA_ANIOS.search(texto)
    if m:
        try:
            anios = int(m.group(1))
            return anios * 12
        except (ValueError, AttributeError):
            pass

    # Patrón 2: "X meses de presidio"
    m = RE_PENA_MESES.search(texto)
    if m:
        try:
            return int(m.group(1))
        except (ValueError, AttributeError):
            pass

    # Patrón 3: "presidio menor en grado X y Y años / meses / días"
    m = RE_PENA_COMPLETA.search(texto)
    if m:
        anios = int(m.group(1)) if m.group(1) else 0
        meses = int(m.group(2)) if m.group(2) else 0
        dias = int(m.group(3)) if m.group(3) else 0
        if anios or meses or dias:
            return anios * 12 + meses + (1 if dias >= 15 else 0)

    return None


def extract_tipo_delito(texto: str) -> Optional[TipoDelito]:
    """Clasificación heurística del tipo de delito Ley 20.000."""
    if not texto:
        return None
    # Orden: microtrafico > trafico > porte > consumo (microtrafico es especialización de trafico)
    if RE_MICROTRAFICO.search(texto):
        return "microtrafico"
    if RE_TRAFICO.search(texto):
        return "trafico"
    if RE_PORTE.search(texto):
        return "porte"
    if RE_CONSUMO.search(texto):
        return "consumo"
    return None


def extract_receta_medica(texto: str) -> bool:
    """True si la sentencia menciona receta/prescripción médica o Art. 8 / Ley 21.575."""
    if not texto:
        return False
    return bool(RE_RECETA.search(texto))


def extract_atipicidad(texto: str) -> bool:
    """True si se invoca consumo personal exclusivo / atipicidad."""
    if not texto:
        return False
    return bool(RE_ATIPICIDAD.search(texto))


def extract_all(texto: str, sentencia_id: Optional[UUID] = None) -> PjudExtraccion:
    """
    Ejecuta todas las extracciones y retorna un `PjudExtraccion`.

    Confianza = fracción de señales que dieron match positivo (entre 0 y 1).
    """
    sid = sentencia_id or uuid4()

    gramaje = extract_gramaje(texto)
    veredicto = extract_veredicto(texto)
    pena = extract_pena_meses(texto)
    tipo_d = extract_tipo_delito(texto)
    receta = extract_receta_medica(texto)
    atipicidad = extract_atipicidad(texto)

    # Heurística de confianza: cuántos de 6 campos principales sí encontramos
    señales = [
        gramaje is not None,
        veredicto is not None,
        pena is not None,
        tipo_d is not None,
        receta,
        atipicidad,
    ]
    confianza = sum(señales) / len(señales) if señales else 0.0

    return PjudExtraccion(
        sentencia_id=sid,
        extractor_version=EXTRACTOR_RULE_VERSION,
        gramaje_g=gramaje,
        thc_pct=None,
        tipo_cultivo=None,
        receta_medica=receta if receta or atipicidad else None,
        tipo_delito=tipo_d,
        veredicto=veredicto,
        pena_meses=pena,
        atipicidad_consumo_personal=atipicidad if (atipicidad or receta) else None,
        confianza=round(confianza, 2),
    )
