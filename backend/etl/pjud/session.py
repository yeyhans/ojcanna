# backend/etl/pjud/session.py
"""
Sesión Playwright async contra el Portal Unificado PJud.

Responsabilidades:
  - Lanzar browser Chromium (headful por defecto — reCAPTCHA v3 necesita perfil real)
  - Navegar al buscador Sentencias_Penales
  - Esperar que Laravel+grecaptcha emitan GET /biscolab-recaptcha/validate (marca sesión humana)
  - Capturar CSRF token (`<meta name="csrf-token">`) y cookies F5/PHPSESSID/XSRF-TOKEN
  - Exponer método `post_buscar_sentencias()` que ejecuta `fetch` desde el contexto
    ya autenticado del browser (reutiliza cookies automáticamente)

Diseño MVP Mes 1:
  - Se captura SÓLO el listado (metadata). El detalle vía `pagina_detalle_sentencia`
    requiere autenticación institucional y se deja fuera del alcance.
  - Si reCAPTCHA no se resuelve (score < 0.5, headless detectado, etc.), el método
    `post_buscar_sentencias` recibirá HTTP 500 — se maneja como `rate_limited`.
"""
from __future__ import annotations

import asyncio
import json
import logging
from contextlib import asynccontextmanager
from typing import Any, AsyncIterator, Optional

from playwright.async_api import (
    Browser,
    BrowserContext,
    Page,
    async_playwright,
)

from etl.pjud.config import (
    BUSCAR_SENTENCIAS_ENDPOINT,
    PJUD_PORTAL_BASE,
    PORTAL_UNIFICADO_URL,
    RECAPTCHA_VALIDATE_ENDPOINT,
    SCRAPE_DELAY_SECONDS,
    USER_AGENT,
)

# playwright-stealth: opcional, mejora tasa de éxito contra reCAPTCHA v3.
# Si la lib no está instalada o falla en Windows, el scraper sigue funcionando
# sin stealth (sólo se loguea warning).
try:
    from playwright_stealth import Stealth  # v2.x API
    _STEALTH_AVAILABLE = True
except ImportError:
    try:
        # API alternativa v1.x
        from playwright_stealth import stealth_async as _stealth_async  # type: ignore
        _STEALTH_AVAILABLE = True
        Stealth = None  # type: ignore
    except ImportError:
        _STEALTH_AVAILABLE = False
        Stealth = None  # type: ignore
        _stealth_async = None  # type: ignore

logger = logging.getLogger(__name__)


class PjudCaptchaError(RuntimeError):
    """reCAPTCHA v3 bloqueó la sesión — score insuficiente o challenge fallido."""


class PjudSession:
    """
    Sesión Playwright autenticada contra juris.pjud.cl.

    Uso:
        async with PjudSession(headless=False) as sess:
            data = await sess.post_buscar_sentencias(filtros, offset=0, filas=20)

    Atributos públicos:
        csrf_token : str — token _token que debe acompañar cada POST
        page       : Page — página Playwright ya en estado "buscador abierto"
    """

    def __init__(self, headless: bool = False, timeout_ms: int = 20000):
        self.headless = headless
        self.timeout_ms = timeout_ms
        self._pw = None
        self.browser: Optional[Browser] = None
        self.context: Optional[BrowserContext] = None
        self.page: Optional[Page] = None
        self.csrf_token: Optional[str] = None
        self._captcha_passed: bool = False

    async def __aenter__(self) -> "PjudSession":
        self._pw = await async_playwright().start()
        self.browser = await self._pw.chromium.launch(
            headless=self.headless,
            args=["--disable-blink-features=AutomationControlled"],
        )
        self.context = await self.browser.new_context(
            user_agent=USER_AGENT,
            locale="es-CL",
            timezone_id="America/Santiago",
            viewport={"width": 1366, "height": 768},
        )
        self.page = await self.context.new_page()

        # Aplicar stealth patches antes de navegar — reduce probabilidad de
        # que reCAPTCHA v3 detecte automatización (navigator.webdriver, etc.)
        if _STEALTH_AVAILABLE:
            try:
                if Stealth is not None:
                    # API v2.x: stealth = Stealth(); await stealth.apply_stealth_async(page)
                    stealth = Stealth()
                    await stealth.apply_stealth_async(self.page)
                    logger.info("playwright-stealth v2 aplicado a la página")
                elif _stealth_async is not None:
                    await _stealth_async(self.page)  # type: ignore
                    logger.info("playwright-stealth v1 aplicado a la página")
            except Exception as e:
                logger.warning("playwright-stealth falló en apply (%s); continuando sin stealth", e)
        else:
            logger.info("playwright-stealth no disponible, usando args básicos anti-detección")

        await self._bootstrap()
        return self

    async def __aexit__(self, exc_type, exc, tb):
        try:
            if self.context:
                await self.context.close()
            if self.browser:
                await self.browser.close()
        finally:
            if self._pw:
                await self._pw.stop()

    async def _bootstrap(self) -> None:
        """Carga página del buscador, espera reCAPTCHA validate, captura CSRF."""
        logger.info("Navegando a %s", PORTAL_UNIFICADO_URL)

        # Escucha respuestas de /biscolab-recaptcha/validate para confirmar score OK
        captcha_future: asyncio.Future = asyncio.get_event_loop().create_future()

        def _on_response(response):
            if RECAPTCHA_VALIDATE_ENDPOINT in response.url and not captcha_future.done():
                captcha_future.set_result(response.status)

        self.page.on("response", _on_response)

        try:
            await self.page.goto(
                PORTAL_UNIFICADO_URL,
                wait_until="domcontentloaded",
                timeout=self.timeout_ms,
            )
        except Exception as e:
            logger.error("Falló navegación inicial al Portal PJud: %s", e)
            raise

        # Esperar reCAPTCHA validate (máx 15s) — si no aparece, el buscador
        # igualmente puede funcionar si hay cookie previa.
        try:
            status = await asyncio.wait_for(captcha_future, timeout=15.0)
            self._captcha_passed = (status == 200)
            logger.info("reCAPTCHA validate respondió HTTP %s", status)
        except asyncio.TimeoutError:
            logger.warning(
                "No se detectó fetch a /biscolab-recaptcha/validate en 15s. "
                "Continuando — si el backend bloquea, los POST devolverán 500."
            )
            self._captcha_passed = False

        # Extraer CSRF
        try:
            self.csrf_token = await self.page.get_attribute(
                'meta[name="csrf-token"]', "content", timeout=5000
            )
        except Exception:
            self.csrf_token = None

        if not self.csrf_token:
            raise RuntimeError(
                "CSRF token (meta[name=csrf-token]) no encontrado en la página. "
                "Probablemente el layout del buscador cambió."
            )

        logger.info(
            "Sesión PJud lista | CSRF=%s... | captcha_passed=%s",
            self.csrf_token[:8], self._captcha_passed,
        )

    async def post_buscar_sentencias(
        self,
        filtros: dict[str, Any],
        id_buscador: str = "Sentencias_Penales",
        offset: int = 0,
        filas: int = 20,
        orden: str = "relevancia",
    ) -> dict[str, Any]:
        """
        Ejecuta POST /busqueda/buscar_sentencias desde el contexto browser.

        Reutiliza cookies + _token automáticamente.

        Raises
        ------
        PjudCaptchaError
            Si HTTP 500 (típicamente reCAPTCHA rechazado).
        RuntimeError
            Si la respuesta no es JSON parseable.
        """
        if not self.csrf_token:
            raise RuntimeError("Sesión no inicializada (csrf_token vacío)")

        url = f"{PJUD_PORTAL_BASE}{BUSCAR_SENTENCIAS_ENDPOINT}"

        # Ejecuta fetch desde el browser para aprovechar cookies httpOnly
        js = """
        async ({url, token, id_buscador, filtros, offset, filas, orden}) => {
            const fd = new FormData();
            fd.append('_token', token);
            fd.append('id_buscador', id_buscador);
            fd.append('filtros', JSON.stringify(filtros));
            fd.append('numero_filas_paginacion', String(filas));
            fd.append('offset_paginacion', String(offset));
            fd.append('orden', orden);
            fd.append('personalizacion', 'false');
            const r = await fetch(url, {
                method: 'POST',
                body: fd,
                headers: { 'X-CSRF-TOKEN': token, 'X-Requested-With': 'XMLHttpRequest' },
                credentials: 'include',
            });
            return { status: r.status, text: await r.text() };
        }
        """

        result = await self.page.evaluate(
            js,
            {
                "url": url,
                "token": self.csrf_token,
                "id_buscador": id_buscador,
                "filtros": filtros,
                "offset": offset,
                "filas": filas,
                "orden": orden,
            },
        )

        # Rate limiting respetuoso
        await asyncio.sleep(SCRAPE_DELAY_SECONDS)

        status = result["status"]
        body = result["text"]

        if status == 500:
            raise PjudCaptchaError(
                "HTTP 500 desde buscar_sentencias. "
                "Causa típica: reCAPTCHA v3 rechazó la sesión (score bajo) "
                "o el token caducó. Reintentar con sesión nueva."
            )
        if status == 429:
            raise PjudCaptchaError("HTTP 429 — rate limit F5 BIG-IP, pausar scraper")
        if status >= 400:
            raise RuntimeError(f"buscar_sentencias HTTP {status}: {body[:300]}")

        try:
            return json.loads(body)
        except json.JSONDecodeError as e:
            raise RuntimeError(
                f"Respuesta no-JSON de buscar_sentencias (status={status}): "
                f"{body[:300]}"
            ) from e


@asynccontextmanager
async def pjud_session(
    headless: bool = False,
    timeout_ms: int = 20000,
) -> AsyncIterator[PjudSession]:
    """Helper async context manager — equivalente a `async with PjudSession()`."""
    session = PjudSession(headless=headless, timeout_ms=timeout_ms)
    await session.__aenter__()
    try:
        yield session
    finally:
        await session.__aexit__(None, None, None)
