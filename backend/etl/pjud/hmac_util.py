# backend/etl/pjud/hmac_util.py
"""
HMAC-SHA256 salado para la capa de auditoría admin-only.

Cumple Ley 19.628 (Protección de la Vida Privada): permite verificar que una
sentencia previamente procesada vuelve a producir el mismo texto anonimizado
SIN necesidad de almacenar el texto original en ningún lado.

La sal privada (`PJUD_AUDIT_SALT`) se lee exclusivamente de variable de entorno
y falla con excepción ruidosa si no está configurada. NUNCA hardcodear ni loguear.
"""
from __future__ import annotations

import hashlib
import hmac
import os

from etl.pjud.config import AUDIT_SALT_ENV_VAR


class AuditSaltMissingError(RuntimeError):
    """Se intentó computar/verificar un HMAC sin sal configurada."""


def get_salt() -> bytes:
    """
    Retorna la sal privada como bytes UTF-8.

    Raises
    ------
    AuditSaltMissingError
        Si la variable de entorno no está definida o es cadena vacía.
    """
    salt = os.environ.get(AUDIT_SALT_ENV_VAR)
    if not salt:
        raise AuditSaltMissingError(
            f"{AUDIT_SALT_ENV_VAR} no configurado. "
            f"Definir en backend/.env (openssl rand -hex 32) antes de ejecutar el runner PJud."
        )
    return salt.encode("utf-8")


def compute_audit_hmac(texto_original: str) -> str:
    """
    Retorna hex(HMAC-SHA256(texto_original, salt)) — 64 chars.

    Parameters
    ----------
    texto_original : str
        Texto crudo de la sentencia (contiene RUT/nombres — vive sólo en memoria).

    Returns
    -------
    str
        64 caracteres hex en minúsculas.
    """
    salt = get_salt()
    digest = hmac.new(salt, texto_original.encode("utf-8"), hashlib.sha256)
    return digest.hexdigest()


def verify_hmac(texto_original: str, expected_hmac: str) -> bool:
    """Comparación en tiempo constante (resistente a timing attacks)."""
    return hmac.compare_digest(compute_audit_hmac(texto_original), expected_hmac)
